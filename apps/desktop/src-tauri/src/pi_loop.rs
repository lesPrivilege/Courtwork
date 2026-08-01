//! PI-HOST-LOOP-1 §二.1–§二.7：crate-private `PiLoopHost`——fresh / resume 全序与容器原语。
//!
//! 本票**不新增** Tauri invoke command、event channel、frontend type 或 React consumer；
//! 这里只提供 crate 内部构造与 headless integration driver 的入口。
//! start / prompt / cancel / resume / replay / delete 的 WebView adapter 由 `PI-LANE-UI-1` 另冻。
//!
//! 三条贯穿全序的红线：
//!
//! 1. **durable-before-publish**。fresh 的 `session_started`、resume 的 `session_resumed` 都在
//!    **spawn 之前**落账；每枚 outward event 先落同义 journal（`turn_finished` 两笔），
//!    两笔都 `sync_all` 之后才允许对外发布。append/sync 失败 ⇒ outward publish 恒为 0。
//! 2. **secret 与物理案件根只活在内存**。二者只在首枚 bootstrap packet 里交给 sidecar，
//!    绝不进入 argv、环境、journal、错误或诊断字符串——本模块的错误类型因此只带
//!    `&'static str` 与闭集 code，没有一处会把入参值拼进去。
//! 3. **终态文案只有一张表**。补终态时逐字用 `TerminalFailureCode::message()`；
//!    不得从退出码、stderr 或 OS error 拼 message。

#![allow(dead_code)]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use crate::pi_loop_journal::{
    self, container_dir, is_safe_container_token, sync_directory, Journal, JournalError,
    JournalPayload, JournalRecord, JournalType, SessionFailureCause, SessionInterruptReason,
    SessionProjection, SessionResumedPayload, SessionStartedPayload, TargetTriple, PI_LOOP_DIR,
};
use crate::pi_loop_process::{
    ensure_runtime_cwd, preflight_route_pair, spawn_verified_sidecar, AppLayout, ExitOutcome,
    ProcessFault, ReadOutcome, RouteError, SidecarProcess, VerifiedRoutePair,
    BOOTSTRAP_READY_DEADLINE, CANCEL_TERMINAL_DEADLINE, SHUTDOWN_TERMINAL_DEADLINE,
    TERMINAL_EXIT_DEADLINE,
};
use crate::pi_loop_protocol::{
    decode_sidecar_packet_line, encode_packet_line, is_safe_token, AgentProjectionEvent,
    BootstrapLimits, BootstrapPayload, BootstrapProvider, BootstrapResume, CancelReason,
    PacketPayload, ProductPacket, ProtocolErrorCode, ResumeKind, Terminal, WorkspaceCapability,
};

/// 本票 ready 恰宣告这一枚能力。
const EXPECTED_CAPABILITIES: &[WorkspaceCapability] = &[WorkspaceCapability::CaseRead];

// ── 错误闭集 ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum HostError {
    /// Keychain 里没有用户显式保存的存档：即使固定环境变量存在也**零自动回落**。
    CredentialUnconfigured,
    /// 案件根不可用（不存在 / 非目录 / symlink）。永不携带物理路径。
    CaseRoot(&'static str),
    Route(RouteError),
    Journal(&'static str),
    Process(ProcessFault),
    /// logical session 已有终态，后续 bootstrap 必拒。
    SessionClosed,
    /// resume 前置不成立或配置漂移。
    ResumeRefused(&'static str),
    /// 收到 schema 合法但与契约不符的 sidecar 行为。
    Protocol(ProtocolErrorCode),
    /// container 仍有 live session/leg。
    ContainerActive,
    InvalidRef,
    Spawn(&'static str),
}

impl HostError {
    pub(crate) fn code(&self) -> &'static str {
        match self {
            HostError::CredentialUnconfigured => "credential_unconfigured",
            HostError::CaseRoot(_) => "case_root",
            HostError::Route(_) => "route",
            HostError::Journal(_) => "journal",
            HostError::Process(_) => "process",
            HostError::SessionClosed => "session_closed",
            HostError::ResumeRefused(_) => "resume_refused",
            HostError::Protocol(_) => "protocol",
            HostError::ContainerActive => "container_active",
            HostError::InvalidRef => "invalid_ref",
            HostError::Spawn(_) => "spawn",
        }
    }
}

impl From<JournalError> for HostError {
    fn from(error: JournalError) -> Self {
        HostError::Journal(error.code())
    }
}

// ── 凭证消费面 ──────────────────────────────────────────────────────────────

/// 只消费 Keychain 中由用户**显式保存**的存档。
///
/// `StoredCredential::Environment{name}` 可按既有 `active_secret()` 当场解析用户具名环境变量；
/// 但没有这条存档时，即使 `DEEPSEEK_API_KEY` 存在也必须保持未配置——不扫描、不猜测、不回落。
pub(crate) trait CredentialPort {
    fn resolve(&self) -> Result<String, HostError>;
}

/// production：直接复用 lib.rs 既有的单次受保护读取，不另开第二条凭证路径。
pub(crate) struct KeychainCredentials;

impl CredentialPort for KeychainCredentials {
    fn resolve(&self) -> Result<String, HostError> {
        match crate::active_secret() {
            Ok((_source, secret)) if !secret.trim().is_empty() => Ok(secret),
            _ => Err(HostError::CredentialUnconfigured),
        }
    }
}

// ── leg 通道（production = 真进程；测试 = scripted）────────────────────────

pub(crate) trait SidecarLeg {
    fn write_packet(&mut self, line: &[u8]) -> Result<(), ProcessFault>;
    fn read_packet(&mut self, deadline: Option<Duration>, window: &'static str) -> ReadOutcome;
    fn close_stdin(&mut self);
    fn terminate(&mut self) -> Result<ExitOutcome, ProcessFault>;
    fn wait_exit(&mut self, deadline: Duration) -> ExitOutcome;
}

impl SidecarLeg for SidecarProcess {
    fn write_packet(&mut self, line: &[u8]) -> Result<(), ProcessFault> {
        SidecarProcess::write_packet(self, line)
    }
    fn read_packet(&mut self, deadline: Option<Duration>, window: &'static str) -> ReadOutcome {
        SidecarProcess::read_packet(self, deadline, window)
    }
    fn close_stdin(&mut self) {
        SidecarProcess::close_stdin(self);
    }
    fn terminate(&mut self) -> Result<ExitOutcome, ProcessFault> {
        SidecarProcess::terminate(self)
    }
    fn wait_exit(&mut self, deadline: Duration) -> ExitOutcome {
        SidecarProcess::wait_exit(self, deadline)
    }
}

/// leg 的创建面。production 恒为 {@link spawn_verified_sidecar}；
/// 测试注入 scripted leg，以便对 deadline / 违约 / crash 做定向反例。
pub(crate) trait LegSpawner {
    fn spawn(
        &mut self,
        pair: &VerifiedRoutePair,
        cwd: &Path,
    ) -> Result<Box<dyn SidecarLeg>, HostError>;
}

pub(crate) struct ProcessSpawner;

impl LegSpawner for ProcessSpawner {
    fn spawn(
        &mut self,
        pair: &VerifiedRoutePair,
        cwd: &Path,
    ) -> Result<Box<dyn SidecarLeg>, HostError> {
        let child = spawn_verified_sidecar(pair, cwd)
            .map_err(|_| HostError::Spawn("无法创建 sidecar 进程"))?;
        Ok(Box::new(SidecarProcess::attach(child)))
    }
}

// ── 对外投影 ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum HostEvent {
    Ready {
        capabilities: Vec<WorkspaceCapability>,
    },
    Agent(AgentProjectionEvent),
    PromptTerminal(Terminal),
    SessionTerminal(JournalType),
}

// ── 活跃容器登记（delete_container 的 fail-closed 前置）────────────────────

fn active_containers() -> &'static Mutex<Vec<String>> {
    static ACTIVE: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    ACTIVE.get_or_init(|| Mutex::new(Vec::new()))
}

fn mark_active(container_id: &str) {
    active_containers()
        .lock()
        .expect("登记未中毒")
        .push(container_id.to_string());
}

fn unmark_active(container_id: &str) {
    let mut guard = active_containers().lock().expect("登记未中毒");
    if let Some(index) = guard.iter().position(|entry| entry == container_id) {
        guard.remove(index);
    }
}

fn is_active(container_id: &str) -> bool {
    active_containers()
        .lock()
        .expect("登记未中毒")
        .iter()
        .any(|entry| entry == container_id)
}

// ── 启动配置 ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub(crate) struct StartConfig {
    pub(crate) container_id: String,
    pub(crate) session_id: String,
    pub(crate) grant_id: String,
    /// **物理**案件根。只活在内存与首枚 bootstrap；journal 里恒为 `/case`。
    pub(crate) case_root: PathBuf,
    pub(crate) model_id: String,
    pub(crate) max_turns: u64,
    pub(crate) max_usd: Option<f64>,
}

impl std::fmt::Debug for PiLoopHost {
    /// 只投影闭集事实：物理路径、secret 与 leg 句柄一律不进 Debug 输出。
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("PiLoopHost")
            .field("leg", &self.leg)
            .field("records", &self.records.len())
            .field("published", &self.published.len())
            .field("closed", &self.closed)
            .finish()
    }
}

pub(crate) struct PiLoopHost {
    app_data_dir: PathBuf,
    container_id: String,
    session_id: String,
    journal: Journal,
    records: Vec<JournalRecord>,
    projection: SessionProjection,
    started: SessionStartedPayload,
    leg: u64,
    outbound_seq: u64,
    inbound_seq: u64,
    leg_handle: Option<Box<dyn SidecarLeg>>,
    capabilities: Vec<WorkspaceCapability>,
    published: Vec<HostEvent>,
    active_request: Option<String>,
    closed: bool,
}

impl Drop for PiLoopHost {
    fn drop(&mut self) {
        if let Some(mut leg) = self.leg_handle.take() {
            let _ = leg.terminate();
        }
        unmark_active(&self.container_id);
    }
}

impl PiLoopHost {
    pub(crate) fn leg(&self) -> u64 {
        self.leg
    }
    pub(crate) fn published(&self) -> &[HostEvent] {
        &self.published
    }
    pub(crate) fn records(&self) -> &[JournalRecord] {
        &self.records
    }
    pub(crate) fn projection(&self) -> &SessionProjection {
        &self.projection
    }
    pub(crate) fn capabilities(&self) -> &[WorkspaceCapability] {
        &self.capabilities
    }

    /// fresh / resume 全序。次序即语义，前一步不过就绝不走到后一步：
    ///
    /// 1. 凭证（无存档即未配置，零自动回落）；
    /// 2. 物理案件根（存在、目录、非 symlink）；
    /// 3. route pair preflight（编译期 expected → closed decode → 双件逐值）；
    /// 4. journal 载入 + partial-tail / quarantine / 唯一补写 / 五步 crash fold；
    /// 5. fresh 落 `session_started`、resume 逐类漂移门后落 `session_resumed`——**都在 spawn 之前**；
    /// 6. runtime cwd → spawn → bootstrap（caseRoot 与 key 只在此入内存）；
    /// 7. ready 且 capability 恰为 `['case_read']`，否则落 `session_failed{protocol,state_violation}`。
    pub(crate) fn start(
        app_data_dir: &Path,
        layout: &AppLayout,
        target: TargetTriple,
        config: StartConfig,
        credentials: &dyn CredentialPort,
        spawner: &mut dyn LegSpawner,
    ) -> Result<PiLoopHost, HostError> {
        let mut resolve_pair = || preflight_route_pair(layout, target).map_err(HostError::Route);
        Self::start_inner(
            app_data_dir,
            &mut resolve_pair,
            config,
            credentials,
            spawner,
        )
    }

    /// 已有 verified pair 时的入口（headless driver 与生命周期测试用）。
    /// 它不放宽任何一道门：route pair 的实物核验由 {@link preflight_route_pair} 独立承担。
    pub(crate) fn start_with_pair(
        app_data_dir: &Path,
        pair: VerifiedRoutePair,
        config: StartConfig,
        credentials: &dyn CredentialPort,
        spawner: &mut dyn LegSpawner,
    ) -> Result<PiLoopHost, HostError> {
        let mut resolve_pair = || Ok(pair.clone());
        Self::start_inner(
            app_data_dir,
            &mut resolve_pair,
            config,
            credentials,
            spawner,
        )
    }

    fn start_inner(
        app_data_dir: &Path,
        resolve_pair: &mut dyn FnMut() -> Result<VerifiedRoutePair, HostError>,
        config: StartConfig,
        credentials: &dyn CredentialPort,
        spawner: &mut dyn LegSpawner,
    ) -> Result<PiLoopHost, HostError> {
        if !is_safe_container_token(&config.container_id)
            || !is_safe_container_token(&config.session_id)
            || !is_safe_token(&config.grant_id)
        {
            return Err(HostError::InvalidRef);
        }

        // 1. 凭证：解析出的 key 只进内存，child 环境仍严格为空。
        let api_key = credentials.resolve()?;

        // 2. 物理案件根：只在这里被看见一次，此后只以 `/case` 出现。
        let metadata = fs::symlink_metadata(&config.case_root)
            .map_err(|_| HostError::CaseRoot("案件根不可 lstat"))?;
        if metadata.file_type().is_symlink() {
            return Err(HostError::CaseRoot("案件根是 symlink"));
        }
        if !metadata.is_dir() {
            return Err(HostError::CaseRoot("案件根不是目录"));
        }

        // 3. route pair preflight——早于 journal 与 spawn。
        let pair = resolve_pair()?;

        // 4. journal 载入（内含 partial-tail 截断、quarantine、唯一补写与五步 crash fold）。
        let loaded = pi_loop_journal::load_session(
            app_data_dir,
            &config.container_id,
            &config.session_id,
            SessionInterruptReason::SidecarEnded,
        )?;
        let mut journal = loaded.journal;
        let mut records = loaded.records;
        let projection = loaded.projection;

        if projection.is_closed() {
            return Err(HostError::SessionClosed);
        }

        let started;
        let leg;
        // 5. fresh / resume：两条路都在 spawn 之前 durable。
        match projection.started.clone() {
            None => {
                leg = 1;
                journal.set_leg(leg);
                started = SessionStartedPayload {
                    route_manifest_sha256: pair.manifest_sha256().to_string(),
                    target_triple: pair.target_triple(),
                    grant_id: config.grant_id.clone(),
                    model_id: config.model_id.clone(),
                    max_turns: config.max_turns,
                    max_usd: config.max_usd,
                };
                records.push(journal.append(
                    None,
                    None,
                    JournalPayload::SessionStarted(started.clone()),
                )?);
            }
            Some(historic) => {
                // 逐类漂移门全部在 spawn 之前。
                if !projection.interrupted {
                    return Err(HostError::ResumeRefused(
                        "上一 leg 未以 session_interrupted 收束",
                    ));
                }
                if historic.grant_id != config.grant_id {
                    return Err(HostError::ResumeRefused("grant 漂移"));
                }
                if historic.model_id != config.model_id {
                    return Err(HostError::ResumeRefused("model 漂移"));
                }
                if historic.max_turns != config.max_turns || historic.max_usd != config.max_usd {
                    return Err(HostError::ResumeRefused("limits 漂移"));
                }
                if historic.route_manifest_sha256 != pair.manifest_sha256() {
                    return Err(HostError::ResumeRefused("route manifest 漂移"));
                }
                if historic.target_triple != pair.target_triple() {
                    return Err(HostError::ResumeRefused("target 漂移"));
                }
                if historic.max_usd.is_some() && projection.prior_usd.is_none() {
                    return Err(HostError::ResumeRefused("maxUsd 已启用而历史费用未知"));
                }
                if projection.prior_turns >= historic.max_turns {
                    return Err(HostError::ResumeRefused("历史 counted turns 已达 maxTurns"));
                }
                started = historic;
                leg = projection.leg + 1;
                journal.set_leg(leg);
                records.push(journal.append(
                    None,
                    None,
                    JournalPayload::SessionResumed(SessionResumedPayload {
                        previous_leg: projection.leg,
                        // prior 三值必须由本 journal fold；绝不重置，也不把 null 恢复成 0。
                        prior_observed_turns: projection.prior_observed_turns,
                        prior_turns: projection.prior_turns,
                        prior_usd: projection.prior_usd,
                    }),
                )?);
            }
        }

        // 6. cwd → spawn → bootstrap。
        let cwd = ensure_runtime_cwd(app_data_dir).map_err(HostError::Route)?;
        let leg_handle = spawner.spawn(&pair, &cwd)?;
        mark_active(&config.container_id);

        let projection = pi_loop_journal::fold(&records);
        let mut host = PiLoopHost {
            app_data_dir: app_data_dir.to_path_buf(),
            container_id: config.container_id.clone(),
            session_id: config.session_id.clone(),
            journal,
            records,
            projection,
            started,
            leg,
            outbound_seq: 0,
            inbound_seq: 0,
            leg_handle: Some(leg_handle),
            capabilities: Vec::new(),
            published: Vec::new(),
            active_request: None,
            closed: false,
        };

        let resume = if leg == 1 {
            BootstrapResume {
                kind: ResumeKind::Fresh,
                leg,
                prior_observed_turns: 0,
                prior_turns: 0,
                prior_usd: Some(0.0),
            }
        } else {
            BootstrapResume {
                kind: ResumeKind::AfterInterruption,
                leg,
                prior_observed_turns: host.projection.prior_observed_turns,
                prior_turns: host.projection.prior_turns,
                prior_usd: host.projection.prior_usd,
            }
        };
        let bootstrap = PacketPayload::Bootstrap(BootstrapPayload {
            container_id: config.container_id.clone(),
            grant_id: config.grant_id.clone(),
            // 物理案件根**只**在这一枚 packet 里出现。
            case_root: config.case_root.to_string_lossy().into_owned(),
            provider: BootstrapProvider {
                model_id: config.model_id.clone(),
                api_key,
            },
            limits: BootstrapLimits {
                max_turns: host.started.max_turns,
                max_usd: host.started.max_usd,
            },
            resume,
        });
        host.send(None, bootstrap)?;

        // 7. ready 窗有界；capability 漂移在**首 prompt 之前**收束。
        let packet = host.expect_packet(Some(BOOTSTRAP_READY_DEADLINE), "bootstrap→ready")?;
        let PacketPayload::Ready { capabilities } = packet.payload else {
            return Err(host.fail_protocol(ProtocolErrorCode::StateViolation));
        };
        if capabilities.as_slice() != EXPECTED_CAPABILITIES {
            // 不新增自由 `capability_mismatch` code，也不拿 spawn 前的 expected 洗白实收漂移。
            return Err(host.fail_protocol(ProtocolErrorCode::StateViolation));
        }
        host.capabilities = capabilities.clone();
        host.published.push(HostEvent::Ready { capabilities });
        Ok(host)
    }

    fn send(&mut self, request_id: Option<&str>, payload: PacketPayload) -> Result<(), HostError> {
        self.outbound_seq += 1;
        let packet = ProductPacket {
            seq: self.outbound_seq,
            session_id: Some(self.session_id.clone()),
            request_id: request_id.map(str::to_string),
            payload,
        };
        let line =
            encode_packet_line(&packet).map_err(|rejection| HostError::Protocol(rejection.code))?;
        let leg = self
            .leg_handle
            .as_mut()
            .ok_or(HostError::Process(ProcessFault::UnexpectedEof))?;
        leg.write_packet(&line).map_err(HostError::Process)
    }

    fn expect_packet(
        &mut self,
        deadline: Option<Duration>,
        window: &'static str,
    ) -> Result<ProductPacket, HostError> {
        let leg = self
            .leg_handle
            .as_mut()
            .ok_or(HostError::Process(ProcessFault::UnexpectedEof))?;
        let packet = match leg.read_packet(deadline, window) {
            ReadOutcome::Line(line) => decode_sidecar_packet_line(&line)
                .map_err(|rejection| HostError::Protocol(rejection.code))?,
            ReadOutcome::Eof => return Err(HostError::Process(ProcessFault::UnexpectedEof)),
            ReadOutcome::Fault(fault) => return Err(HostError::Process(fault)),
        };
        // 每方向的 seq 从 1 严格递增；跳号/重复一律 fatal，不做宽松兼容。
        self.inbound_seq += 1;
        if packet.seq != self.inbound_seq {
            return Err(self.fail_protocol(ProtocolErrorCode::SeqMismatch));
        }
        Ok(packet)
    }

    /// capability 漂移与其他协议违约：落 `session_failed{protocol,code}` 并回收 leg。
    fn fail_protocol(&mut self, code: ProtocolErrorCode) -> HostError {
        match self.journal.append(
            None,
            None,
            JournalPayload::SessionFailed {
                cause: SessionFailureCause::Protocol { code },
            },
        ) {
            Ok(record) => {
                self.records.push(record);
                self.projection = pi_loop_journal::fold(&self.records);
                self.published
                    .push(HostEvent::SessionTerminal(JournalType::SessionFailed));
            }
            Err(error) => return HostError::from(error),
        }
        self.reclaim_leg();
        HostError::Protocol(code)
    }

    fn reclaim_leg(&mut self) {
        self.closed = true;
        if let Some(mut leg) = self.leg_handle.take() {
            let _ = leg.terminate();
        }
    }

    /// `user_prompted` durable 之后才发 prompt；随后泵事件直到 prompt terminal。
    ///
    /// 活动 prompt / provider stream **本体**不设总时限（ADR 明写的唯一例外），
    /// stdout reader 在该区间持续等事件。
    pub(crate) fn prompt(&mut self, request_id: &str, text: &str) -> Result<Terminal, HostError> {
        if self.closed {
            return Err(HostError::SessionClosed);
        }
        if !is_safe_token(request_id) {
            return Err(HostError::InvalidRef);
        }
        // 跨 leg 的 requestId 去重由持有 durable journal 的这一侧独占。
        if self.projection.request_ids.contains(request_id) {
            return Err(HostError::ResumeRefused(
                "requestId 在本 logical session 内已用过",
            ));
        }

        let record = self.journal.append(
            Some(request_id),
            None,
            JournalPayload::UserPrompted {
                text: text.to_string(),
            },
        )?;
        self.records.push(record);
        self.projection = pi_loop_journal::fold(&self.records);
        self.active_request = Some(request_id.to_string());

        self.send(
            Some(request_id),
            PacketPayload::Prompt {
                text: text.to_string(),
            },
        )?;
        self.pump(request_id, None, "prompt")
    }

    /// cancel → prompt terminal 有界。
    pub(crate) fn cancel(&mut self, reason: CancelReason) -> Result<Terminal, HostError> {
        let Some(request_id) = self.active_request.clone() else {
            return Err(HostError::Protocol(ProtocolErrorCode::StateViolation));
        };
        self.send(Some(&request_id), PacketPayload::Cancel { reason })?;
        self.pump(
            &request_id,
            Some(CANCEL_TERMINAL_DEADLINE),
            "cancel→terminal",
        )
    }

    /// 每枚 outward event 先落同义 journal；`turn_finished` 还须随后落 `turn_usage_recorded`，
    /// **两笔都 sync 之后**才发布。prompt terminal 先落唯一 prompt terminal，
    /// 按 ADR 映射需要 session terminal 时再落第二笔，两笔都完成后才向调用者发布最终投影。
    fn pump(
        &mut self,
        request_id: &str,
        deadline: Option<Duration>,
        window: &'static str,
    ) -> Result<Terminal, HostError> {
        loop {
            let packet = self.expect_packet(deadline, window)?;
            if packet.session_id.as_deref() != Some(self.session_id.as_str()) {
                return Err(self.fail_protocol(ProtocolErrorCode::SessionMismatch));
            }
            match packet.payload {
                PacketPayload::AgentEvent(event) => {
                    if packet.request_id.as_deref() != Some(request_id) {
                        return Err(self.fail_protocol(ProtocolErrorCode::RequestMismatch));
                    }
                    let record = self.journal.append(
                        Some(request_id),
                        None,
                        JournalPayload::AgentEvent(event.clone()),
                    )?;
                    self.records.push(record);
                    if let AgentProjectionEvent::TurnFinished {
                        turn,
                        counted_toward_turn_limit,
                        usage,
                        stop_reason,
                    } = &event
                    {
                        // 第二笔：逐值等于同 request 已落的 `turn_finished`。
                        let usage_row = self.journal.append(
                            Some(request_id),
                            None,
                            JournalPayload::TurnUsageRecorded {
                                turn: *turn,
                                counted_toward_turn_limit: *counted_toward_turn_limit,
                                usage: usage.clone(),
                                stop_reason: *stop_reason,
                            },
                        )?;
                        self.records.push(usage_row);
                    }
                    self.projection = pi_loop_journal::fold(&self.records);
                    self.published.push(HostEvent::Agent(event));
                }
                PacketPayload::Terminal(terminal) => {
                    if matches!(terminal, Terminal::Shutdown) {
                        return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
                    }
                    if packet.request_id.as_deref() != Some(request_id) {
                        return Err(self.fail_protocol(ProtocolErrorCode::RequestMismatch));
                    }
                    self.record_prompt_terminal(request_id, &terminal)?;
                    return Ok(terminal);
                }
                PacketPayload::ProtocolError(error) => return Err(self.fail_protocol(error.code)),
                _ => return Err(self.fail_protocol(ProtocolErrorCode::StateViolation)),
            }
        }
    }

    fn record_prompt_terminal(
        &mut self,
        request_id: &str,
        terminal: &Terminal,
    ) -> Result<(), HostError> {
        let (prompt_payload, session_close) = match terminal {
            Terminal::Completed { budget } => (
                JournalPayload::PromptCompleted {
                    budget: budget.clone(),
                },
                false,
            ),
            Terminal::Canceled { reason, budget } => (
                JournalPayload::PromptCanceled {
                    reason: *reason,
                    budget: budget.clone(),
                },
                false,
            ),
            Terminal::BudgetStopped { budget } => (
                JournalPayload::PromptBudgetStopped {
                    budget: budget.clone(),
                },
                true,
            ),
            Terminal::Failed { error, budget } => (
                JournalPayload::PromptFailed {
                    error: error.clone(),
                    budget: budget.clone(),
                },
                // 只有 `provider_error|host_error + retryable:true` 不顺便关闭 session。
                !error.retryable,
            ),
            Terminal::Shutdown => unreachable!("shutdown terminal 不走 prompt 路径"),
        };
        let prompt_record = self
            .journal
            .append(Some(request_id), None, prompt_payload)?;
        let prompt_event_id = prompt_record.event_id.clone();
        self.records.push(prompt_record);
        self.active_request = None;

        if session_close {
            let payload = match terminal {
                Terminal::BudgetStopped { budget } => JournalPayload::SessionBudgetStopped {
                    prompt_event_id,
                    budget: budget.clone(),
                },
                _ => JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Prompt { prompt_event_id },
                },
            };
            let session_record = self.journal.append(None, None, payload)?;
            let journal_type = session_record.journal_type();
            self.records.push(session_record);
            self.closed = true;
            self.projection = pi_loop_journal::fold(&self.records);
            // 两笔都完成后才向调用者发布最终投影。
            self.published
                .push(HostEvent::PromptTerminal(terminal.clone()));
            self.published
                .push(HostEvent::SessionTerminal(journal_type));
            return Ok(());
        }
        self.projection = pi_loop_journal::fold(&self.records);
        self.published
            .push(HostEvent::PromptTerminal(terminal.clone()));
        Ok(())
    }

    /// idle shutdown → shutdown terminal → EOF + exit，三段各自有界；随后落 `session_completed`。
    pub(crate) fn shutdown(&mut self) -> Result<(), HostError> {
        if self.active_request.is_some() {
            return Err(HostError::Protocol(ProtocolErrorCode::StateViolation));
        }
        self.send(None, PacketPayload::Shutdown)?;
        let packet = self.expect_packet(Some(SHUTDOWN_TERMINAL_DEADLINE), "shutdown→terminal")?;
        if !matches!(packet.payload, PacketPayload::Terminal(Terminal::Shutdown)) {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }
        if let Some(leg) = self.leg_handle.as_mut() {
            leg.close_stdin();
            match leg.read_packet(Some(TERMINAL_EXIT_DEADLINE), "terminal→EOF") {
                ReadOutcome::Eof => {}
                ReadOutcome::Fault(fault) => return Err(HostError::Process(fault)),
                ReadOutcome::Line(_) => {
                    return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
                }
            }
            if leg.wait_exit(TERMINAL_EXIT_DEADLINE) == ExitOutcome::Pending {
                let _ = leg.terminate();
            }
        }
        let record = self
            .journal
            .append(None, None, JournalPayload::SessionCompleted)?;
        let journal_type = record.journal_type();
        self.records.push(record);
        self.projection = pi_loop_journal::fold(&self.records);
        self.closed = true;
        self.published
            .push(HostEvent::SessionTerminal(journal_type));
        self.leg_handle = None;
        unmark_active(&self.container_id);
        Ok(())
    }

    /// 进程异常不直接等于 `session_failed.runtime`：有 active prompt 时先按 ADR crash fold
    /// 取 prompt/budget/effect 终态；安全 open leg 落 `session_interrupted`；
    /// 只有**无可归因 prompt** 的不可恢复 runtime fault 才使用对应 runtime cause。
    pub(crate) fn reclaim_after_fault(
        &mut self,
        reason: SessionInterruptReason,
    ) -> Result<(), HostError> {
        self.reclaim_leg();
        let loaded = pi_loop_journal::load_session(
            &self.app_data_dir,
            &self.container_id,
            &self.session_id,
            reason,
        )?;
        self.records = loaded.records;
        self.projection = loaded.projection;
        self.journal = loaded.journal;
        unmark_active(&self.container_id);
        Ok(())
    }

    /// 无可归因 prompt 的不可恢复 runtime fault：落 `session_failed{runtime,code}`。
    pub(crate) fn fail_runtime(
        &mut self,
        code: pi_loop_journal::RuntimeFailureCode,
    ) -> Result<(), HostError> {
        if self.projection.active_prompt.is_some() {
            return Err(HostError::Protocol(ProtocolErrorCode::StateViolation));
        }
        let record = self.journal.append(
            None,
            None,
            JournalPayload::SessionFailed {
                cause: SessionFailureCause::Runtime { code },
            },
        )?;
        self.records.push(record);
        self.projection = pi_loop_journal::fold(&self.records);
        self.published
            .push(HostEvent::SessionTerminal(JournalType::SessionFailed));
        self.reclaim_leg();
        Ok(())
    }

    /// 容器整删。SafeToken 不合法拒；仍有 live session/leg 时以固定 `container_active` 拒且**零删除**；
    /// 不存在则幂等返回 `false`；存在时先拒非 directory / symlink root，再删该 container 的全部
    /// journal 与 quarantine，sync `pi-loop` parent，返回 `true`。递归删除不跟随内部 symlink。
    pub(crate) fn delete_container(
        app_data_dir: &Path,
        container_id: &str,
    ) -> Result<bool, HostError> {
        if !is_safe_container_token(container_id) {
            return Err(HostError::InvalidRef);
        }
        if is_active(container_id) {
            return Err(HostError::ContainerActive);
        }
        let target = container_dir(app_data_dir, container_id);
        let metadata = match fs::symlink_metadata(&target) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
            Err(_) => return Err(HostError::Journal("lstat container 失败")),
        };
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(HostError::Journal("container root 不是 regular directory"));
        }
        remove_tree_no_follow(&target)?;
        sync_directory(&app_data_dir.join(PI_LOOP_DIR)).map_err(HostError::from)?;
        Ok(true)
    }
}

/// 递归删除：symlink 只删链接本身，绝不跟随它去删目标。
fn remove_tree_no_follow(path: &Path) -> Result<(), HostError> {
    let metadata =
        fs::symlink_metadata(path).map_err(|_| HostError::Journal("lstat 待删项失败"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return fs::remove_file(path).map_err(|_| HostError::Journal("删除文件失败"));
    }
    for entry in fs::read_dir(path).map_err(|_| HostError::Journal("枚举目录失败"))? {
        let entry = entry.map_err(|_| HostError::Journal("枚举目录项失败"))?;
        remove_tree_no_follow(&entry.path())?;
    }
    fs::remove_dir(path).map_err(|_| HostError::Journal("删除目录失败"))
}

/// replay：从 durable journal 导出内部断点 item。
/// 本票不新增 “break” packet/event——断点只由 `session_interrupted` +
/// `session_resumed.messageContext:'empty'` 投影而来，新 leg 不传旧 pi messages、不暗做摘要。
#[derive(Debug, Clone, PartialEq)]
pub(crate) enum ReplayItem {
    Prompt {
        request_id: String,
        text: String,
    },
    Agent {
        request_id: String,
        event: AgentProjectionEvent,
    },
    PromptTerminal {
        request_id: String,
        journal_type: JournalType,
    },
    ContextBreak,
    SessionTerminal {
        journal_type: JournalType,
    },
}

pub(crate) fn replay(records: &[JournalRecord]) -> Vec<ReplayItem> {
    let mut items = Vec::new();
    for record in records {
        let request_id = record.request_id.clone().unwrap_or_default();
        match &record.payload {
            JournalPayload::UserPrompted { text } => {
                items.push(ReplayItem::Prompt {
                    request_id,
                    text: text.clone(),
                });
            }
            JournalPayload::AgentEvent(event) => {
                items.push(ReplayItem::Agent {
                    request_id,
                    event: event.clone(),
                });
            }
            JournalPayload::SessionInterrupted { .. } => items.push(ReplayItem::ContextBreak),
            _ => {
                let journal_type = record.journal_type();
                if journal_type.is_prompt_terminal() {
                    items.push(ReplayItem::PromptTerminal {
                        request_id,
                        journal_type,
                    });
                } else if journal_type.is_session_terminal() {
                    items.push(ReplayItem::SessionTerminal { journal_type });
                }
            }
        }
    }
    items
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pi_loop_journal::{journal_path, QUARANTINE_DIR};
    use crate::pi_loop_process::{
        BUNDLE_BASENAME, EXPECTED_ROUTE_MANIFEST, MANIFEST_BASENAME, RESOURCE_DIR_NAME,
        RUNTIME_BASENAME,
    };
    use crate::pi_loop_protocol::{
        BudgetStopReason, BudgetTurnLimit, BudgetUsdLimit, BudgetView, ProtocolErrorPayload,
        TerminalError, TerminalFailureCode, TurnStopReason, TurnUsage,
    };
    use std::collections::VecDeque;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;

    static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

    fn temp_root(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-pi-host-{tag}-{}-{}",
            std::process::id(),
            TEMP_SEQ.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&base).expect("建临时根");
        fs::canonicalize(&base).expect("规范化")
    }

    struct FixedKey;
    impl CredentialPort for FixedKey {
        fn resolve(&self) -> Result<String, HostError> {
            Ok("sk-in-memory-only".to_string())
        }
    }

    struct NoCredential;
    impl CredentialPort for NoCredential {
        fn resolve(&self) -> Result<String, HostError> {
            Err(HostError::CredentialUnconfigured)
        }
    }

    enum Scripted {
        Line(Vec<u8>),
        Eof,
        Timeout,
    }

    #[derive(Default)]
    struct LegLog {
        written: Vec<Vec<u8>>,
        terminated: bool,
    }

    struct ScriptedLeg {
        inbox: VecDeque<Scripted>,
        log: Arc<Mutex<LegLog>>,
    }

    impl SidecarLeg for ScriptedLeg {
        fn write_packet(&mut self, line: &[u8]) -> Result<(), ProcessFault> {
            self.log
                .lock()
                .expect("日志未中毒")
                .written
                .push(line.to_vec());
            Ok(())
        }
        fn read_packet(
            &mut self,
            _deadline: Option<Duration>,
            window: &'static str,
        ) -> ReadOutcome {
            match self.inbox.pop_front() {
                Some(Scripted::Line(line)) => ReadOutcome::Line(line),
                Some(Scripted::Eof) | None => ReadOutcome::Eof,
                Some(Scripted::Timeout) => {
                    ReadOutcome::Fault(ProcessFault::LifecycleTimeout(window))
                }
            }
        }
        fn close_stdin(&mut self) {}
        fn terminate(&mut self) -> Result<ExitOutcome, ProcessFault> {
            self.log.lock().expect("日志未中毒").terminated = true;
            Ok(ExitOutcome::Signal(libc::SIGTERM))
        }
        fn wait_exit(&mut self, _deadline: Duration) -> ExitOutcome {
            ExitOutcome::Code(0)
        }
    }

    struct ScriptedSpawner {
        legs: VecDeque<VecDeque<Scripted>>,
        log: Arc<Mutex<LegLog>>,
        spawns: usize,
    }

    impl LegSpawner for ScriptedSpawner {
        fn spawn(
            &mut self,
            _pair: &VerifiedRoutePair,
            _cwd: &Path,
        ) -> Result<Box<dyn SidecarLeg>, HostError> {
            self.spawns += 1;
            let inbox = self.legs.pop_front().unwrap_or_default();
            Ok(Box::new(ScriptedLeg {
                inbox,
                log: Arc::clone(&self.log),
            }))
        }
    }

    struct RefusingSpawner;
    impl LegSpawner for RefusingSpawner {
        fn spawn(
            &mut self,
            _pair: &VerifiedRoutePair,
            _cwd: &Path,
        ) -> Result<Box<dyn SidecarLeg>, HostError> {
            panic!("preflight 未过就不该走到 spawn");
        }
    }

    /// 测试装置的 app layout：manifest 与编译期同一份 bytes，双件是 placeholder。
    /// 真实 preflight 因此必然在双件门失败——那正是 `credential_and_case_root_gates_*` 要的红。
    fn layout(root: &Path) -> AppLayout {
        let executable_dir = root.join("MacOS");
        let resource_dir = root.join("Resources");
        fs::create_dir_all(&executable_dir).expect("建目录");
        fs::create_dir_all(resource_dir.join(RESOURCE_DIR_NAME)).expect("建目录");
        fs::write(
            resource_dir.join(RESOURCE_DIR_NAME).join(MANIFEST_BASENAME),
            EXPECTED_ROUTE_MANIFEST,
        )
        .expect("写 manifest");
        fs::write(
            resource_dir.join(RESOURCE_DIR_NAME).join(BUNDLE_BASENAME),
            b"// placeholder",
        )
        .expect("写 cjs");
        fs::write(executable_dir.join(RUNTIME_BASENAME), b"placeholder").expect("写 runtime");
        AppLayout {
            executable_dir,
            resource_dir,
        }
    }

    struct Harness {
        app_data: PathBuf,
        layout: AppLayout,
        case_root: PathBuf,
        config: StartConfig,
    }

    fn harness(tag: &str) -> Harness {
        let root = temp_root(tag);
        let app_data = root.join("app-data");
        fs::create_dir_all(&app_data).expect("建 app-data");
        let case_root = root.join("案卷");
        fs::create_dir_all(&case_root).expect("建案件根");
        Harness {
            layout: layout(&root),
            case_root: case_root.clone(),
            config: StartConfig {
                container_id: "cnt-1".to_string(),
                session_id: "sess-1".to_string(),
                grant_id: "grant-1".to_string(),
                case_root,
                model_id: "deepseek-v4-flash".to_string(),
                max_turns: 12,
                max_usd: None,
            },
            app_data,
        }
    }

    /// 双件冻结真值指向 112 MiB 的官方 Node，单测内不可能合成；全序测试因此走
    /// `start_with_pair`。route pair 的实物门由 `pi_loop_process` 的定向反例独立承担。
    fn lifecycle_pair(layout: &AppLayout) -> VerifiedRoutePair {
        VerifiedRoutePair::for_lifecycle_test(
            layout.executable_dir.join(RUNTIME_BASENAME),
            layout
                .resource_dir
                .join(RESOURCE_DIR_NAME)
                .join(BUNDLE_BASENAME),
        )
    }

    fn start_with(
        harness: &Harness,
        legs: Vec<VecDeque<Scripted>>,
    ) -> (Result<PiLoopHost, HostError>, Arc<Mutex<LegLog>>, usize) {
        start_config_with(harness, harness.config.clone(), legs)
    }

    fn start_config_with(
        harness: &Harness,
        config: StartConfig,
        legs: Vec<VecDeque<Scripted>>,
    ) -> (Result<PiLoopHost, HostError>, Arc<Mutex<LegLog>>, usize) {
        let log = Arc::new(Mutex::new(LegLog::default()));
        let mut spawner = ScriptedSpawner {
            legs: legs.into_iter().collect(),
            log: Arc::clone(&log),
            spawns: 0,
        };
        let result = PiLoopHost::start_with_pair(
            &harness.app_data,
            lifecycle_pair(&harness.layout),
            config,
            &FixedKey,
            &mut spawner,
        );
        (result, log, spawner.spawns)
    }

    fn sidecar_line(seq: u64, request: Option<&str>, payload: PacketPayload) -> Scripted {
        let packet = ProductPacket {
            seq,
            session_id: Some("sess-1".to_string()),
            request_id: request.map(str::to_string),
            payload,
        };
        let mut line = encode_packet_line(&packet).expect("合契约");
        line.pop();
        Scripted::Line(line)
    }

    fn ready(seq: u64, capabilities: Vec<WorkspaceCapability>) -> Scripted {
        sidecar_line(seq, None, PacketPayload::Ready { capabilities })
    }

    fn open_budget(turns: u64, usd: Option<f64>) -> BudgetView {
        BudgetView {
            turns,
            usd,
            turn_limit: BudgetTurnLimit::Open,
            usd_limit: BudgetUsdLimit::Disabled,
            stop_reason: None,
        }
    }

    fn known_usage(cost: f64) -> TurnUsage {
        TurnUsage {
            input_tokens: Some(10),
            output_tokens: Some(2),
            cache_read_tokens: Some(0),
            cache_write_tokens: Some(0),
            cost_usd: Some(cost),
        }
    }

    #[test]
    fn credential_and_case_root_gates_run_before_route_journal_and_spawn() {
        let h = harness("gates");
        // 无存档：即使固定环境变量存在也零自动回落，且 journal 一行都不写。
        assert_eq!(
            PiLoopHost::start(
                &h.app_data,
                &h.layout,
                TargetTriple::Aarch64AppleDarwin,
                h.config.clone(),
                &NoCredential,
                &mut RefusingSpawner,
            )
            .expect_err("未配置必须拒"),
            HostError::CredentialUnconfigured
        );
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "凭证门在 journal 之前"
        );

        // 案件根是 symlink。
        let linked = h.case_root.parent().expect("有父级").join("linked-case");
        std::os::unix::fs::symlink(&h.case_root, &linked).expect("建 symlink");
        let mut linked_config = h.config.clone();
        linked_config.case_root = linked;
        assert!(matches!(
            PiLoopHost::start(
                &h.app_data,
                &h.layout,
                TargetTriple::Aarch64AppleDarwin,
                linked_config,
                &FixedKey,
                &mut RefusingSpawner,
            ),
            Err(HostError::CaseRoot(_))
        ));
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "案件根门也在 journal 之前"
        );

        // route pair 不合（双件是 placeholder）：spawn 与 journal 都不该发生。
        assert!(matches!(
            PiLoopHost::start(
                &h.app_data,
                &h.layout,
                TargetTriple::Aarch64AppleDarwin,
                h.config.clone(),
                &FixedKey,
                &mut RefusingSpawner,
            ),
            Err(HostError::Route(_))
        ));
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "route 门在 journal 之前"
        );
    }

    #[test]
    fn fresh_start_records_session_started_before_spawn_and_keeps_secrets_out_of_the_journal() {
        let h = harness("fresh");
        let (host, log, spawns) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        let host = host.expect("启动成功");
        assert_eq!(spawns, 1);
        assert_eq!(host.leg(), 1);
        assert_eq!(
            host.records()[0].journal_type(),
            JournalType::SessionStarted
        );
        assert_eq!(host.capabilities(), EXPECTED_CAPABILITIES);
        assert_eq!(
            host.published(),
            &[HostEvent::Ready {
                capabilities: vec![WorkspaceCapability::CaseRead]
            }]
        );

        // ready 之前只发 bootstrap，且**只有它**带物理案件根与 key。
        let written = log.lock().expect("日志").written.clone();
        assert_eq!(written.len(), 1);
        let text = String::from_utf8(written[0].clone()).expect("UTF-8");
        assert!(text.contains("\"type\":\"bootstrap\""));
        let physical = h.case_root.to_string_lossy().into_owned();
        assert!(text.contains(&physical), "对照：bootstrap 确实带物理根");
        assert!(
            text.contains("sk-in-memory-only"),
            "对照：bootstrap 确实带 key"
        );

        // canary：journal 里既没有物理案件根，也没有 key。
        let journal_text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(
            !journal_text.contains("sk-in-memory-only"),
            "key 不得进 journal"
        );
        assert!(
            !journal_text.contains(&physical),
            "物理案件根不得进 journal"
        );
        assert!(
            journal_text.contains("\"caseRoot\":\"/case\""),
            "journal 只记虚拟根"
        );
        // routeManifestSha256 只能是对已验证 bytes 的重算值。
        assert!(journal_text.contains(&format!(
            "\"routeManifestSha256\":\"{}\"",
            crate::pi_loop_process::sha256_bytes(EXPECTED_ROUTE_MANIFEST)
        )));
    }

    #[test]
    fn ready_capability_drift_fails_the_session_with_state_violation_and_reclaims_the_leg() {
        let h = harness("capability-drift");
        let (host, log, _) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            )])],
        );
        assert_eq!(
            host.expect_err("capability 漂移必须拒"),
            HostError::Protocol(ProtocolErrorCode::StateViolation)
        );
        assert!(log.lock().expect("日志").terminated, "leg 必须被回收");

        let loaded = pi_loop_journal::load_session(
            &h.app_data,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("载入");
        assert_eq!(
            loaded.records.last().expect("有记录").payload,
            JournalPayload::SessionFailed {
                cause: SessionFailureCause::Protocol {
                    code: ProtocolErrorCode::StateViolation
                }
            },
            "不新增自由 capability_mismatch code"
        );
        assert!(loaded.projection.is_closed(), "首 prompt 之前就已关闭");
    }

    #[test]
    fn prompt_journals_every_outward_event_and_writes_turn_finished_twice() {
        let h = harness("prompt");
        let event = AgentProjectionEvent::TurnFinished {
            turn: 1,
            counted_toward_turn_limit: true,
            usage: known_usage(0.25),
            stop_reason: TurnStopReason::Stop,
        };
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                        delta: "合同编号是 HT-2024-081。".to_string(),
                    }),
                ),
                sidecar_line(3, Some("req-1"), PacketPayload::AgentEvent(event.clone())),
                sidecar_line(
                    4,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(1, Some(0.25)),
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动成功");
        assert!(matches!(
            host.prompt("req-1", "备忘里的合同编号是多少")
                .expect("prompt 成功"),
            Terminal::Completed { .. }
        ));

        let types: Vec<JournalType> = host
            .records()
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            types,
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::AgentEvent,
                JournalType::TurnUsageRecorded,
                JournalType::PromptCompleted,
            ],
            "turn_finished 必须是双笔，且 user_prompted 早于任何 agent event"
        );
        let AgentProjectionEvent::TurnFinished {
            turn,
            counted_toward_turn_limit,
            usage,
            stop_reason,
        } = &event
        else {
            unreachable!();
        };
        assert_eq!(
            host.records()[4].payload,
            JournalPayload::TurnUsageRecorded {
                turn: *turn,
                counted_toward_turn_limit: *counted_toward_turn_limit,
                usage: usage.clone(),
                stop_reason: *stop_reason,
            },
            "第二笔必须逐值等于同 request 已落的 turn_finished"
        );
        assert_eq!(host.projection().prior_turns, 1);
        assert_eq!(host.projection().prior_usd, Some(0.25));
    }

    #[test]
    fn counterexample_append_failure_leaves_outward_publish_at_zero() {
        // 两处窗口各测一次：seq 2 是 `user_prompted`（prompt 还没发出去），
        // seq 3 是那枚 agent event 本身（prompt 已发、事件已在手里）。
        // 只测前者的话，「先发布再落账」的写法照样全绿——实测过，M3 零红。
        for fail_from in [2_u64, 3] {
            let h = harness("durability");
            let (host, _, _) = start_with(
                &h,
                vec![VecDeque::from(vec![
                    ready(1, vec![WorkspaceCapability::CaseRead]),
                    sidecar_line(
                        2,
                        Some("req-1"),
                        PacketPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                            delta: "这一枚不该被发布".to_string(),
                        }),
                    ),
                ])],
            );
            let mut host = host.expect("启动成功");
            let published_before = host.published().len();
            host.journal.inject_append_failure_from(fail_from);
            assert_eq!(
                host.prompt("req-1", "问一句")
                    .expect_err("耐久失败必须拒")
                    .code(),
                "journal",
                "fail_from={fail_from}"
            );
            assert_eq!(
                host.published().len(),
                published_before,
                "append/sync 失败时 outward publish 必须为 0（fail_from={fail_from}）"
            );
            // journal 也不得留下半条：失败那一枚根本没写进去。
            let text = String::from_utf8(
                fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"),
            )
            .expect("UTF-8");
            assert!(!text.contains("这一枚不该被发布"), "fail_from={fail_from}");
        }
    }

    #[test]
    fn budget_terminal_writes_both_prompt_and_session_records_before_publishing() {
        let h = harness("budget-terminal");
        let budget = BudgetView {
            turns: 12,
            usd: Some(0.5),
            turn_limit: BudgetTurnLimit::Reached,
            usd_limit: BudgetUsdLimit::Disabled,
            stop_reason: Some(BudgetStopReason::Turns),
        };
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::BudgetStopped {
                        budget: budget.clone(),
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动成功");
        host.prompt("req-1", "问一句").expect("terminal");
        let types: Vec<JournalType> = host
            .records()
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            &types[types.len() - 2..],
            &[
                JournalType::PromptBudgetStopped,
                JournalType::SessionBudgetStopped
            ]
        );
        assert_eq!(
            &host.published()[host.published().len() - 2..],
            &[
                HostEvent::PromptTerminal(Terminal::BudgetStopped { budget }),
                HostEvent::SessionTerminal(JournalType::SessionBudgetStopped)
            ],
            "两笔都完成后才发布最终投影"
        );
    }

    #[test]
    fn retryable_provider_error_closes_the_prompt_but_not_the_session() {
        let h = harness("retryable");
        let error = TerminalError {
            code: TerminalFailureCode::ProviderError,
            message: TerminalFailureCode::ProviderError.message().to_string(),
            retryable: true,
        };
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Failed {
                        error,
                        budget: open_budget(0, Some(0.0)),
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动成功");
        host.prompt("req-1", "问一句").expect("terminal");
        assert_eq!(
            host.records().last().expect("有").journal_type(),
            JournalType::PromptFailed
        );
        assert!(
            !host.projection().is_closed(),
            "retryable 的 provider_error 不关闭 session"
        );
        let JournalPayload::PromptFailed {
            error: recorded, ..
        } = &host.records().last().expect("有").payload
        else {
            panic!("必须是 prompt_failed");
        };
        assert_eq!(
            recorded.message,
            TerminalFailureCode::ProviderError.message(),
            "文案逐字来自唯一表"
        );
    }

    #[test]
    fn second_prompt_and_new_leg_never_reset_the_accumulated_budget() {
        let h = harness("resume-budget");
        let turn = |ordinal: u64, cost: f64| {
            PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                turn: ordinal,
                counted_toward_turn_limit: true,
                usage: known_usage(cost),
                stop_reason: TurnStopReason::Stop,
            })
        };
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, Some("req-1"), turn(1, 0.25)),
                sidecar_line(
                    3,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(1, Some(0.25)),
                    }),
                ),
                sidecar_line(4, Some("req-2"), turn(2, 0.5)),
                sidecar_line(
                    5,
                    Some("req-2"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(2, Some(0.75)),
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动成功");
        host.prompt("req-1", "第一问").expect("第一枚");
        assert_eq!(host.projection().prior_turns, 1);
        host.prompt("req-2", "第二问").expect("第二枚");
        // 第二枚 prompt **不重置**累计。
        assert_eq!(host.projection().prior_turns, 2);
        assert_eq!(host.projection().prior_usd, Some(0.75));

        // 同一 requestId 复用必须拒。
        assert!(matches!(
            host.prompt("req-1", "再来一次"),
            Err(HostError::ResumeRefused(_))
        ));

        // 模拟 crash：回收 leg，按 fold 补 session_interrupted。
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        drop(host);

        // resume：leg=previous+1，prior 三值精确 fold。
        let (resumed, log, _) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        let resumed = resumed.expect("resume 成功");
        assert_eq!(resumed.leg(), 2);
        let record = resumed
            .records()
            .iter()
            .rev()
            .find(|record| record.journal_type() == JournalType::SessionResumed)
            .expect("有 session_resumed");
        assert_eq!(
            record.payload,
            JournalPayload::SessionResumed(SessionResumedPayload {
                previous_leg: 1,
                prior_observed_turns: 2,
                prior_turns: 2,
                prior_usd: Some(0.75),
            }),
            "跨 leg 不重置、不把 null 恢复成 0"
        );

        // bootstrap 里的 prior 三值必须与 journal fold 逐值相同。
        let text = String::from_utf8(log.lock().expect("日志").written[0].clone()).expect("UTF-8");
        assert!(text.contains("\"kind\":\"after_interruption\""));
        assert!(text.contains("\"leg\":2"));
        assert!(text.contains("\"priorObservedTurns\":2,\"priorTurns\":2,\"priorUsd\":0.75"));
    }

    #[test]
    fn counterexample_resume_refuses_every_drift_class_before_spawn() {
        let h = harness("resume-drift");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        let mut host = host.expect("启动");
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        drop(host);

        type DriftCase = (&'static str, fn(&mut StartConfig));
        let cases: [DriftCase; 4] = [
            ("grant", |config| config.grant_id = "grant-9".to_string()),
            ("model", |config| {
                config.model_id = "deepseek-v4-pro".to_string()
            }),
            ("maxTurns", |config| config.max_turns = 6),
            ("maxUsd", |config| config.max_usd = Some(1.0)),
        ];
        for (label, mutate) in cases {
            let mut config = h.config.clone();
            mutate(&mut config);
            let (result, _, spawns) = start_config_with(&h, config, Vec::new());
            let error = result.expect_err("必须拒");
            assert!(
                matches!(error, HostError::ResumeRefused(_)),
                "{label} 实得 {error:?}"
            );
            assert_eq!(spawns, 0, "{label} 的漂移必须在 spawn 之前拒");
        }

        // 对照：不漂移就能 resume。
        let (ok, _, spawns) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        assert!(ok.is_ok(), "对照：同一配置必须能起第二 leg");
        assert_eq!(spawns, 1);
    }

    #[test]
    fn shutdown_writes_session_completed_after_terminal_and_eof() {
        let h = harness("shutdown");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, None, PacketPayload::Terminal(Terminal::Shutdown)),
                Scripted::Eof,
            ])],
        );
        let mut host = host.expect("启动成功");
        host.shutdown().expect("shutdown 成功");
        assert_eq!(
            host.records().last().expect("有").journal_type(),
            JournalType::SessionCompleted
        );
        assert_eq!(
            host.published().last(),
            Some(&HostEvent::SessionTerminal(JournalType::SessionCompleted))
        );
        drop(host);

        // logical session 已终态：后续 bootstrap 必拒。
        let (again, _, spawns) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        assert_eq!(again.expect_err("已关闭"), HostError::SessionClosed);
        assert_eq!(spawns, 0, "终态之后连 spawn 都不该发生");
    }

    #[test]
    fn lifecycle_timeout_and_protocol_error_are_named_not_swallowed() {
        // ready 窗超时。
        let h = harness("timeout");
        let (host, _, _) = start_with(&h, vec![VecDeque::from(vec![Scripted::Timeout])]);
        assert_eq!(
            host.expect_err("超时必须具名"),
            HostError::Process(ProcessFault::LifecycleTimeout("bootstrap→ready"))
        );

        // sidecar 首包不是 ready。
        let h = harness("not-ready");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![sidecar_line(
                1,
                None,
                PacketPayload::ProtocolError(ProtocolErrorPayload {
                    code: ProtocolErrorCode::StateViolation,
                    message: "本 leg 的首包必须是 bootstrap".to_string(),
                }),
            )])],
        );
        assert_eq!(
            host.expect_err("非 ready 首包必须拒"),
            HostError::Protocol(ProtocolErrorCode::StateViolation)
        );

        // 入站 seq 跳号。
        let h = harness("seq-gap");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                2,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        assert_eq!(
            host.expect_err("跳号必须拒"),
            HostError::Protocol(ProtocolErrorCode::SeqMismatch)
        );
    }

    #[test]
    fn replay_projects_the_context_break_from_the_journal_alone() {
        let h = harness("replay");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(0, Some(0.0)),
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动");
        host.prompt("req-1", "问一句").expect("terminal");
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        assert_eq!(
            replay(host.records()),
            vec![
                ReplayItem::Prompt {
                    request_id: "req-1".to_string(),
                    text: "问一句".to_string()
                },
                ReplayItem::PromptTerminal {
                    request_id: "req-1".to_string(),
                    journal_type: JournalType::PromptCompleted
                },
                ReplayItem::ContextBreak,
            ],
            "断点只由 journal 投影，不新增 sidecar packet"
        );
    }

    #[test]
    fn delete_container_refuses_active_is_idempotent_and_isolates_neighbours() {
        let root = temp_root("delete");
        let app_data = root.join("app-data");
        for container in ["cnt-a", "cnt-b"] {
            let loaded = pi_loop_journal::load_session(
                &app_data,
                container,
                "sess-1",
                SessionInterruptReason::SidecarEnded,
            )
            .expect("载入");
            let mut journal = loaded.journal;
            journal
                .append(
                    None,
                    None,
                    JournalPayload::SessionStarted(SessionStartedPayload {
                        route_manifest_sha256:
                            "4c09a985f489bbc791686197f44a5303fb1295a657c855d3df679bf776967f6b"
                                .to_string(),
                        target_triple: TargetTriple::Aarch64AppleDarwin,
                        grant_id: "grant-1".to_string(),
                        model_id: "deepseek-v4-flash".to_string(),
                        max_turns: 12,
                        max_usd: None,
                    }),
                )
                .expect("落账");
            let quarantine = container_dir(&app_data, container)
                .join(QUARANTINE_DIR)
                .join("sess-9");
            fs::create_dir_all(&quarantine).expect("建 quarantine");
            fs::write(
                quarantine.join("deadbeef.jsonl"),
                format!("{container} 的隔离件"),
            )
            .expect("写 quarantine");
        }
        let before_b = fs::read(journal_path(&app_data, "cnt-b", "sess-1")).expect("读 b");

        assert_eq!(
            PiLoopHost::delete_container(&app_data, "cnt-missing"),
            Ok(false),
            "不存在即幂等"
        );
        assert_eq!(
            PiLoopHost::delete_container(&app_data, "../escape"),
            Err(HostError::InvalidRef)
        );

        // active → 固定 container_active 且**零删除**。
        mark_active("cnt-a");
        assert_eq!(
            PiLoopHost::delete_container(&app_data, "cnt-a"),
            Err(HostError::ContainerActive)
        );
        assert!(
            journal_path(&app_data, "cnt-a", "sess-1").exists(),
            "active 拒必须零 effect"
        );
        unmark_active("cnt-a");

        // idle → 整删 journal + quarantine。
        assert_eq!(PiLoopHost::delete_container(&app_data, "cnt-a"), Ok(true));
        assert!(!container_dir(&app_data, "cnt-a").exists());
        // 另一 container 逐字节不变。
        assert_eq!(
            fs::read(journal_path(&app_data, "cnt-b", "sess-1")).expect("读 b"),
            before_b
        );
        assert!(container_dir(&app_data, "cnt-b")
            .join(QUARANTINE_DIR)
            .exists());
        assert_eq!(
            PiLoopHost::delete_container(&app_data, "cnt-a"),
            Ok(false),
            "再删仍幂等"
        );
    }

    #[test]
    fn delete_container_never_follows_internal_symlinks() {
        let root = temp_root("delete-symlink");
        let app_data = root.join("app-data");
        let outside = root.join("outside");
        fs::create_dir_all(&outside).expect("建外部目录");
        fs::write(outside.join("keep.txt"), b"must survive").expect("写外部件");

        let container = container_dir(&app_data, "cnt-a");
        fs::create_dir_all(&container).expect("建 container");
        fs::write(container.join("sess-1.jsonl"), b"").expect("写 journal");
        std::os::unix::fs::symlink(&outside, container.join("escape")).expect("建内部 symlink");

        assert_eq!(PiLoopHost::delete_container(&app_data, "cnt-a"), Ok(true));
        assert!(!container.exists(), "container 已整删");
        assert!(
            outside.join("keep.txt").exists(),
            "递归删除不得跟随内部 symlink"
        );
    }
}
