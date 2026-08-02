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
    decode_sidecar_packet_line, encode_packet_line, is_absolute_path_shape, is_safe_token,
    AgentProjectionEvent, BootstrapLimits, BootstrapPayload, BootstrapProvider, BootstrapResume,
    BudgetStopReason, BudgetTurnLimit, BudgetView, CancelReason, PacketPayload, ProductPacket,
    ProtocolErrorCode, ResumeKind, Terminal, WorkspaceCapability, MAX_API_KEY_BYTES,
    MAX_CASE_ROOT_BYTES, MAX_MODEL_ID_BYTES, MAX_TEXT_BYTES, MAX_TURNS_LIMIT, MAX_USD_LIMIT,
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
    /// 同一 logical session 已有 live 写者（单写者独占锁被占，R8）。
    SessionActive,
    /// bootstrap/config 闭集非法：在 journal 与 spawn 之前拒（R2）。
    InvalidConfig(&'static str),
    /// prompt 文本不合闭集：在 `user_prompted` append 之前拒（R3）。
    InvalidPrompt(&'static str),
    /// 不可恢复的 runtime fault（nonzero exit / signal / 超时，R6）。
    Runtime(pi_loop_journal::RuntimeFailureCode),
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
            HostError::SessionActive => "session_active",
            HostError::InvalidConfig(_) => "invalid_config",
            HostError::InvalidPrompt(_) => "invalid_prompt",
            HostError::Runtime(_) => "runtime",
            HostError::InvalidRef => "invalid_ref",
            HostError::Spawn(_) => "spawn",
        }
    }
}

impl From<JournalError> for HostError {
    fn from(error: JournalError) -> Self {
        match error {
            // 单写者拒绝是它自己的具名事实，不该被压成一般 journal I/O 失败。
            JournalError::SessionActive => HostError::SessionActive,
            other => HostError::Journal(other.code()),
        }
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

/// bootstrap/config 闭集（PI-HOST-LOOP-1R R2、PI-HOST-LOOP-1R2 C2）。
///
/// 这些值最终都要过 `encode_packet_line` 的同一套闭集判据，但那是**spawn 之后**的事：
/// 首轮实现因此会为一份 `maxTurns=0` 的配置先落 `session_started`、再起一枚进程，
/// 最后才由 encoder 报 `invalid_schema`。判据前移到入参层，错的配置一步都走不动。
///
/// 1R 只补了下界，上界仍漏：`maxTurns=13`、`maxUsd=100001`、257 字节 `modelId` 三者
/// 都走到 spawn 之后才由 encoder 拦下（复验 blocker 2）。三枚上界的冻结值直接取
/// `pi_loop_protocol` 的常量，不在此另抄一份——两谱各抄一次就各自漂移。
///
/// PI-HOST-LOOP-1R3 D1 按**族**收口：前两轮各按验收报告点名的实例补门，于是每轮都被
/// 下一位验收者在同族里找到另一枚。凡进入 host→sidecar 方向、在 `pi_loop_protocol`
/// 有冻结上界或非空/形状要求的入参，一律在此一次收齐；encoder 的同名检查降为纵深防御的
/// **最后一道**。清单与源码扫描的双向自证见 `bounded_input_manifest`。
/// wire 字符串闭集判据（ADR-022 六-B.1）：不得含 NUL。
///
/// PI-HOST-LOOP-1R5 §零裁定一把这道门归入 host 前置（D1 `Fronted`），三轴理由：
/// ① 副作用——NUL 值毒化 durable journal（落下永远发不出去的 `session_started` /
/// `user_prompted`）、白费一枚 spawn、占掉 requestId，正是历轮在杀的「先污染后拒绝」形；
/// ② 语义——config/prompt 存在的唯一目的就是被发送，不可编码即无效输入；
/// ③ 家族——它与上界、非空、形状作用在同一批 host 方向输入上。
///
/// 同一条冻结判据的另一半 **lone surrogate 在 Rust `String` 侧结构性不可达**（`String`
/// 保证 Unicode scalar 序列），故不另设门，以清账表的具名理由行登记。SafeToken 四员
/// 由文法排除 NUL，同样只登记不另设门。`scan_string` 里的同名检查自此降为最后一道防线。
fn is_nul_free(value: &str) -> bool {
    !value.contains('\0')
}

fn validate_start_config(config: &StartConfig) -> Result<(), HostError> {
    if config.max_turns < 1 || config.max_turns > MAX_TURNS_LIMIT {
        return Err(HostError::InvalidConfig("maxTurns 必须是 1..=12 的整数"));
    }
    if let Some(max_usd) = config.max_usd {
        if !max_usd.is_finite() || max_usd <= 0.0 || max_usd > MAX_USD_LIMIT {
            return Err(HostError::InvalidConfig(
                "maxUsd 必须是 (0, 100000] 内的有限数或 null",
            ));
        }
    }
    if config.model_id.trim().is_empty() {
        return Err(HostError::InvalidConfig("modelId 不得为空"));
    }
    // 核**原串**字节：trim 后合法而整串超限的 modelId 一样会被 encoder 后置拒，
    // 而进 wire 的正是原串。这与「trim 后 ≤256」不冲突——原串不超限时 trim 必然也不超。
    if config.model_id.len() > MAX_MODEL_ID_BYTES {
        return Err(HostError::InvalidConfig("modelId 不得超过 256 UTF-8 字节"));
    }
    if !is_nul_free(&config.model_id) {
        return Err(HostError::InvalidConfig("modelId 不得含 NUL"));
    }
    // caseRoot 的非空、长度、NUL-free 与绝对形状都是纯入参判定，**必须先于 lstat**。
    // 1R2 复验实测：4097 字节的案件根在此返回 `Ok(())`，最终以
    // `case_root("案件根不可 lstat")` 收场——拿文件系统外观代替配置门。相对路径更糟，
    // 它可能相对 cwd 解析成功，一路走到 spawn 之后才由 encoder 拦下。
    // 判的是**将要上 wire 的那一串**：`to_string_lossy()` 与 bootstrap 出包同源。
    let case_root = config.case_root.to_string_lossy();
    if case_root.is_empty() {
        return Err(HostError::InvalidConfig("caseRoot 不得为空"));
    }
    if case_root.len() > MAX_CASE_ROOT_BYTES {
        return Err(HostError::InvalidConfig(
            "caseRoot 不得超过 4096 UTF-8 字节",
        ));
    }
    // 含 NUL 的案件根在此之前只会以 `case_root("案件根不可 lstat")` 收场——同样是拿
    // 文件系统外观代替配置门（1R2 复验对 4097 字节案件根的同一判据）。
    if !is_nul_free(&case_root) {
        return Err(HostError::InvalidConfig("caseRoot 不得含 NUL"));
    }
    if !is_absolute_path_shape(&case_root) {
        return Err(HostError::InvalidConfig("caseRoot 必须是平台绝对路径"));
    }
    Ok(())
}

/// 凭证闭集（PI-HOST-LOOP-1R3 D1）。
///
/// key 同样是 host→sidecar 方向的有界输入，判据必须在 journal append 与 spawn 之前兑现。
/// 1R2 复验实测：8193 字节的 key 会先落 `session_started`、再拉起一枚 child，
/// 最后才由 packet encoder 报 `Protocol(InvalidSchema)`——盘上多出一条本不该存在的记录，
/// 还白起了一枚进程。空白判定与 `KeychainCredentials` 既有的 `trim().is_empty()` 同口径。
///
/// 错误只带 `&'static str`：key 本体一个字节都不进 reason（本模块红线 2）。
fn validate_api_key(api_key: &str) -> Result<(), HostError> {
    if api_key.trim().is_empty() {
        return Err(HostError::InvalidConfig("apiKey 不得为空"));
    }
    if api_key.len() > MAX_API_KEY_BYTES {
        return Err(HostError::InvalidConfig("apiKey 不得超过 8192 UTF-8 字节"));
    }
    if !is_nul_free(api_key) {
        return Err(HostError::InvalidConfig("apiKey 不得含 NUL"));
    }
    Ok(())
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
    /// 单写者独占锁：本 Host 是这条 logical session 的唯一写者，直到 teardown（R8）。
    /// `delete_container` 的 active 判定读的就是这把锁，不另立登记册。
    lock: Option<pi_loop_journal::SessionLock>,
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
        // 写权随 Host 一起交出：锁 guard 在字段析构时 `LOCK_UN`。
        self.lock = None;
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

    /// fresh / resume 全序。次序即语义，前一步不过就绝不走到后一步（PI-HOST-LOOP-1R R1/R2）：
    ///
    /// 0. token 与 bootstrap/config 闭集（纯入参，零 I/O；含 caseRoot 的长度与绝对形状）；
    /// 1. route pair preflight（编译期 expected → closed decode → 双件逐值）——**身份门在最前**；
    /// 2. 物理案件根（存在、目录、非 symlink）——长度门已在第 0 步兑现，此处只判实体；
    /// 3. 凭证（无存档即未配置，零自动回落）——Keychain read 必须晚于前两道门；
    ///    解析出的 key 当场过闭集判据，仍在 journal 与 spawn 之前；
    /// 4. journal 载入（含单写者独占锁）+ partial-tail / quarantine / 唯一补写 / 五步 crash fold；
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

        // 0. bootstrap/config 闭集。纯入参判定，零 I/O，故排在所有门之前：非法配置
        //    不该先花掉一次 Keychain read、一条 journal 记录和一枚进程，再由 encoder 兜底。
        validate_start_config(&config)?;

        // 1. route pair preflight——身份门在最前，早于 Keychain read、journal 与 spawn。
        let pair = resolve_pair()?;

        // 2. 物理案件根：只在这里被看见一次，此后只以 `/case` 出现。
        let metadata = fs::symlink_metadata(&config.case_root)
            .map_err(|_| HostError::CaseRoot("案件根不可 lstat"))?;
        if metadata.file_type().is_symlink() {
            return Err(HostError::CaseRoot("案件根是 symlink"));
        }
        if !metadata.is_dir() {
            return Err(HostError::CaseRoot("案件根不是目录"));
        }

        // 3. 凭证：解析出的 key 只进内存，child 环境仍严格为空。
        //    闭集判据紧跟解析、仍在 journal 载入与 spawn 之前——key 是入参层最后一枚
        //    有界 host→sidecar 输入，不能留给 encoder 兜底（1R3 D1）。
        let api_key = credentials.resolve()?;
        validate_api_key(&api_key)?;

        // 4. journal 载入（先取单写者锁，再做 partial-tail 截断、quarantine、唯一补写与五步 crash fold）。
        let loaded = pi_loop_journal::load_session(
            app_data_dir,
            &config.container_id,
            &config.session_id,
            SessionInterruptReason::SidecarEnded,
        )?;
        let mut journal = loaded.journal;
        let lock = loaded.lock;
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

        let projection = pi_loop_journal::fold(&records);
        let mut host = PiLoopHost {
            app_data_dir: app_data_dir.to_path_buf(),
            container_id: config.container_id.clone(),
            session_id: config.session_id.clone(),
            journal,
            lock: Some(lock),
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

    /// 读一枚入包。**任何** fault 都不得经 `?` 直接逸出（PI-HOST-LOOP-1R R5）：
    /// decode 失败、意外 EOF、超限与其他 fault 一律先按已 durable journal 执行 crash fold、
    /// 回收 child、落对应 durable 终态，才停止 outward publish 并返回错误。
    fn expect_packet(
        &mut self,
        deadline: Option<Duration>,
        window: &'static str,
    ) -> Result<ProductPacket, HostError> {
        let outcome = match self.leg_handle.as_mut() {
            Some(leg) => leg.read_packet(deadline, window),
            None => return Err(HostError::Process(ProcessFault::UnexpectedEof)),
        };
        let line = match outcome {
            ReadOutcome::Line(line) => line,
            ReadOutcome::Eof => return Err(self.fail_process(ProcessFault::UnexpectedEof)),
            ReadOutcome::Fault(fault) => return Err(self.fail_process(fault)),
        };
        let packet = match decode_sidecar_packet_line(&line) {
            Ok(packet) => packet,
            Err(rejection) => return Err(self.fail_protocol(rejection.code)),
        };
        // 每方向的 seq 从 1 严格递增；跳号/重复一律 fatal，不做宽松兼容。
        self.inbound_seq += 1;
        if packet.seq != self.inbound_seq {
            return Err(self.fail_protocol(ProtocolErrorCode::SeqMismatch));
        }
        Ok(packet)
    }

    /// 进程侧 fault 的统一出口：先 crash fold（内含回收 child 与落 durable 终态），再具名返回。
    ///
    /// 归因不在这里定：`session_interrupted` 还是 prompt/budget/effect 终态，由
    /// {@link pi_loop_journal::load_session} 的五步 crash fold 按已 durable 的 journal 决定；
    /// 本函数只保证「fold 先于抛」这一条次序。
    fn fail_process(&mut self, fault: ProcessFault) -> HostError {
        let reason = match fault {
            ProcessFault::LifecycleTimeout(_) => SessionInterruptReason::LifecycleTimeout,
            _ => SessionInterruptReason::SidecarEnded,
        };
        if let Err(error) = self.reclaim_after_fault(reason) {
            return error;
        }
        HostError::Process(fault)
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
        // prompt 门**先于** append：首轮把这两条判据留给了 encoder，于是非法 prompt 会先
        // 把 `user_prompted` 写进盘上 journal，再由编码失败收场——盘上多出一条本不该存在的
        // 明文记录，且 requestId 就此被占用（R3）。
        if text.trim().is_empty() {
            return Err(HostError::InvalidPrompt("prompt 文本 trim 后不得为空"));
        }
        if text.len() > MAX_TEXT_BYTES {
            return Err(HostError::InvalidPrompt("prompt 文本超过 131,072 字节上限"));
        }
        if !is_nul_free(text) {
            return Err(HostError::InvalidPrompt("prompt 文本不得含 NUL"));
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

    /// 本 request 的预算**真值**：对已 durable 的 `turn_usage_recorded` fold 得出（R4）。
    /// `budget_stopped` 的 `stopReason` 由同一份 fold 的 limit 状态派生，不抄自报值。
    fn folded_budget(&self, terminal: &Terminal) -> BudgetView {
        let mut budget =
            pi_loop_journal::budget_of(&self.records, self.started.max_turns, self.started.max_usd);
        if matches!(terminal, Terminal::BudgetStopped { .. }) {
            budget.stop_reason = Some(if budget.turn_limit == BudgetTurnLimit::Reached {
                BudgetStopReason::Turns
            } else {
                BudgetStopReason::Usd
            });
        }
        budget
    }

    fn record_prompt_terminal(
        &mut self,
        request_id: &str,
        terminal: &Terminal,
    ) -> Result<(), HostError> {
        // 预算真值归 Rust fold；sidecar 自报只作 parity。逐值漂移即 state_violation 关 leg——
        // 不采信、也不静默用真值覆盖掉（覆盖等于把一次协议违约当成排版问题）。
        let budget = self.folded_budget(terminal);
        let reported = match terminal {
            Terminal::Completed { budget }
            | Terminal::Canceled { budget, .. }
            | Terminal::BudgetStopped { budget }
            | Terminal::Failed { budget, .. } => budget,
            Terminal::Shutdown => unreachable!("shutdown terminal 不走 prompt 路径"),
        };
        if *reported != budget {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }

        let (prompt_payload, session_close) = match terminal {
            Terminal::Completed { .. } => (
                JournalPayload::PromptCompleted {
                    budget: budget.clone(),
                },
                false,
            ),
            Terminal::Canceled { reason, .. } => (
                JournalPayload::PromptCanceled {
                    reason: *reason,
                    budget: budget.clone(),
                },
                false,
            ),
            Terminal::BudgetStopped { .. } => (
                JournalPayload::PromptBudgetStopped {
                    budget: budget.clone(),
                },
                true,
            ),
            Terminal::Failed { error, .. } => (
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
                // session 侧那一笔同样用 Rust 算出的那一份，不回头再取自报值。
                Terminal::BudgetStopped { .. } => JournalPayload::SessionBudgetStopped {
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
        // 阶段一：只与 leg 打交道，取回 EOF 观察与退出结局；借用在此结束。
        let observed = match self.leg_handle.as_mut() {
            None => Ok(None),
            Some(leg) => {
                leg.close_stdin();
                match leg.read_packet(Some(TERMINAL_EXIT_DEADLINE), "terminal→EOF") {
                    ReadOutcome::Eof => {
                        let exit = leg.wait_exit(TERMINAL_EXIT_DEADLINE);
                        if exit == ExitOutcome::Pending {
                            let _ = leg.terminate();
                        }
                        Ok(Some(exit))
                    }
                    ReadOutcome::Fault(fault) => Err(Some(fault)),
                    ReadOutcome::Line(_) => Err(None),
                }
            }
        };
        let exit = match observed {
            Ok(exit) => exit,
            Err(Some(fault)) => return Err(self.fail_process(fault)),
            Err(None) => return Err(self.fail_protocol(ProtocolErrorCode::StateViolation)),
        };

        // 阶段二：出口如实（PI-HOST-LOOP-1R R6）。只有 deadline 内 EOF **且 exit 0** 才是
        // `session_completed`；首轮只特殊处理了 `Pending`，`Code(7)` 与 signal 一路落成
        // completed——把 child 的非正常收场写成了产品的干净收场。
        let runtime_code = match exit {
            None | Some(ExitOutcome::Code(0)) => None,
            Some(ExitOutcome::Code(_)) => Some(pi_loop_journal::RuntimeFailureCode::NonzeroExit),
            Some(ExitOutcome::Signal(_)) => Some(pi_loop_journal::RuntimeFailureCode::Signal),
            Some(ExitOutcome::Pending) => {
                Some(pi_loop_journal::RuntimeFailureCode::LifecycleTimeout)
            }
        };
        if let Some(code) = runtime_code {
            // 走既有 `session_failed{cause:{kind:'runtime',code}}`，不新增 runtime code。
            self.fail_runtime(code)?;
            self.leg_handle = None;
            return Err(HostError::Runtime(code));
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
        // 干净收束后交出写权：这条 logical session 已有终态，不再需要单写者独占。
        self.lock = None;
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
        // 重入自身 journal 时交回**同一把**锁：flock 在同进程的不同 fd 之间也冲突，
        // 「先放再取」既会自锁，也会在窗口里把写权对外开一条缝。
        let held = self
            .lock
            .take()
            .ok_or(HostError::Journal("session 单写者锁已交出"))?;
        let loaded = pi_loop_journal::load_session_holding(
            &self.app_data_dir,
            &self.container_id,
            &self.session_id,
            reason,
            held,
        )?;
        self.records = loaded.records;
        self.projection = loaded.projection;
        self.journal = loaded.journal;
        self.lock = Some(loaded.lock);
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
        // active 判定与单写者锁**同源**（R8）：逐 session 试取同一把 advisory lock，
        // 取不到即仍有 live 写者。进程内登记册已废除——那是第二个可漂移的真源。
        if pi_loop_journal::container_has_live_session(app_data_dir, container_id)? {
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
    use std::sync::{Arc, Mutex};

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

    /// 三道 preflight 门各自独立生效，且全部在 journal 与 spawn 之前。
    ///
    /// **本枚为 PI-HOST-LOOP-1R 重写**（旧名 `credential_and_case_root_gates_run_before_route_journal_and_spawn`）。
    /// 旧形态把「凭证门先于 route 门」当规范编码进了断言——那恰恰是首轮被独立验收判为
    /// 契约级 blocker 的病灶本身。按 1R R1 的正序重写，并且比旧法更紧：每道门单独锁，
    /// 且坏 route 下 Keychain read 计数必须恰 0（旧形态对读了几次凭证没有任何约束）。
    #[test]
    fn route_then_case_root_then_credential_gate_in_order_before_journal_and_spawn() {
        // (一) route pair 不合（测试 layout 的双件是 placeholder）：身份门最先兑现，
        //      且此时**一次 Keychain read 都不许发生**。
        let h = harness("gate-route");
        let reads = Arc::new(AtomicU64::new(0));
        let counting = CountingCredential {
            reads: Arc::clone(&reads),
        };
        assert!(matches!(
            PiLoopHost::start(
                &h.app_data,
                &h.layout,
                TargetTriple::Aarch64AppleDarwin,
                h.config.clone(),
                &counting,
                &mut RefusingSpawner,
            ),
            Err(HostError::Route(_))
        ));
        assert_eq!(
            reads.load(Ordering::SeqCst),
            0,
            "route 门先于 Keychain read"
        );
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "route 门在 journal 之前"
        );

        // (二) route 已验证、案件根是 symlink：根门独立生效，凭证仍不许被读。
        let h = harness("gate-case-root");
        let reads = Arc::new(AtomicU64::new(0));
        let counting = CountingCredential {
            reads: Arc::clone(&reads),
        };
        let linked = h.case_root.parent().expect("有父级").join("linked-case");
        std::os::unix::fs::symlink(&h.case_root, &linked).expect("建 symlink");
        let mut linked_config = h.config.clone();
        linked_config.case_root = linked;
        let (result, _, spawns) = start_probe(
            &h,
            linked_config,
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &counting,
        );
        assert!(
            matches!(result, Err(HostError::CaseRoot(_))),
            "实得 {result:?}"
        );
        assert_eq!(
            reads.load(Ordering::SeqCst),
            0,
            "案件根门也先于 Keychain read"
        );
        assert_eq!(spawns, 0, "案件根门在 spawn 之前");
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "案件根门在 journal 之前"
        );

        // (三) route 与根都过、无存档：即使固定环境变量存在也零自动回落，journal 一行都不写。
        let h = harness("gate-credential");
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &NoCredential,
        );
        assert_eq!(
            result.expect_err("未配置必须拒"),
            HostError::CredentialUnconfigured
        );
        assert_eq!(spawns, 0, "凭证门在 spawn 之前");
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "凭证门在 journal 之前"
        );

        // 对照：三门齐过就起得来，且凭证恰被读一次——上面三条不是恒拒。
        let h = harness("gate-ok");
        let reads = Arc::new(AtomicU64::new(0));
        let counting = CountingCredential {
            reads: Arc::clone(&reads),
        };
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &counting,
        );
        assert!(result.is_ok(), "对照必须能起：{result:?}");
        assert_eq!(reads.load(Ordering::SeqCst), 1);
        assert_eq!(spawns, 1);
        assert!(journal_path(&h.app_data, "cnt-1", "sess-1").exists());
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

    /// **PI-HOST-LOOP-1R 调整**：原形态直接脚本一枚 `turns:12 / usd:0.5 / reached` 的自报
    /// budget，而 journal 里一条 `turn_usage_recorded` 都没有——R4 落地后那正是要被
    /// `state_violation` 关 leg 的漂移形态。本意（「两笔都落账之后才发布最终投影」）不变，
    /// 改为真跑满两个回合把限额**挣**到，自报值与 Rust fold 因此逐值相同。
    #[test]
    fn budget_terminal_writes_both_prompt_and_session_records_before_publishing() {
        let h = harness("budget-terminal");
        let mut config = h.config.clone();
        config.max_turns = 2;
        let budget = BudgetView {
            turns: 2,
            usd: Some(0.5),
            turn_limit: BudgetTurnLimit::Reached,
            usd_limit: BudgetUsdLimit::Disabled,
            stop_reason: Some(BudgetStopReason::Turns),
        };
        let turn = |ordinal: u64| {
            PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                turn: ordinal,
                counted_toward_turn_limit: true,
                usage: known_usage(0.25),
                stop_reason: TurnStopReason::Stop,
            })
        };
        let (host, _, _) = start_config_with(
            &h,
            config,
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, Some("req-1"), turn(1)),
                sidecar_line(3, Some("req-1"), turn(2)),
                sidecar_line(
                    4,
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
    fn counterexample_journal_route_identity_drift_refuses_resume_before_spawn() {
        // `routeManifestSha256` 是 Rust 对已验证 manifest **原始 bytes** 重算的值。
        // 把 journal 里那一枚改成旧值、改成任意其他合法 64 位小写 hex、或改 target，
        // 都必须在 spawn 之前拒——不得拿「反正也是 64 位 hex」放行。
        let h = harness("route-identity");
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

        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let pristine = fs::read_to_string(&path).expect("读 journal");
        let genuine = crate::pi_loop_process::sha256_bytes(EXPECTED_ROUTE_MANIFEST);
        assert!(
            pristine.contains(&genuine),
            "对照：journal 里确实是重算出的那一枚"
        );

        for (label, replacement) in [
            // 旧值：R5 之前的 manifest hash 形态（合法 hex，但不是现行真值）。
            (
                "旧值",
                "0000000000000000000000000000000000000000000000000000000000000001".to_string(),
            ),
            // 任意其他合法 64 位小写 hex。
            (
                "随机合法 hex",
                "7f3c1d9ab2e845760c15af398d24be0173e6c8905fa2143b6d7e08c9152a3b4e".to_string(),
            ),
        ] {
            fs::write(&path, pristine.replace(&genuine, &replacement)).expect("写变异 journal");
            let (result, _, spawns) = start_with(&h, Vec::new());
            assert!(
                matches!(result, Err(HostError::ResumeRefused(_))),
                "{label} 必须拒"
            );
            assert_eq!(spawns, 0, "{label} 必须在 spawn 之前拒");
        }

        // target 漂移同理。
        fs::write(
            &path,
            pristine.replace("aarch64-apple-darwin", "x86_64-apple-darwin"),
        )
        .expect("写 target 变异");
        let (result, _, spawns) = start_with(&h, Vec::new());
        assert!(matches!(result, Err(HostError::ResumeRefused(_))));
        assert_eq!(spawns, 0);

        // 对照：还原后同一配置仍能 resume——上面三枚不是恒红。
        fs::write(&path, &pristine).expect("还原 journal");
        let (ok, _, spawns) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![WorkspaceCapability::CaseRead],
            )])],
        );
        assert!(ok.is_ok(), "对照：未漂移必须能起第二 leg");
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
        //
        // **本段为 PI-HOST-LOOP-1R 重写**：旧形态往进程内登记册里 `mark_active("cnt-a")`，
        // 那份登记册已按 R8 废除（它与真正的写者身份是两个可漂移的真源）。改为真持一把
        // session 单写者锁——`delete_container` 的 active 判定读的就是同一把锁。
        let live = pi_loop_journal::load_session(
            &app_data,
            "cnt-a",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("取 cnt-a 的单写者锁");
        let before_a = fs::read(journal_path(&app_data, "cnt-a", "sess-1")).expect("读 a");
        assert_eq!(
            PiLoopHost::delete_container(&app_data, "cnt-a"),
            Err(HostError::ContainerActive)
        );
        assert_eq!(
            fs::read(journal_path(&app_data, "cnt-a", "sess-1")).expect("读 a"),
            before_a,
            "active 拒必须零 effect"
        );
        assert!(
            !pi_loop_journal::container_has_live_session(&app_data, "cnt-b").expect("探测 cnt-b"),
            "邻居没有 live 写者，判定不得被 cnt-a 带偏"
        );
        drop(live);

        // idle → 整删 journal + quarantine。锁交出后立刻可删，说明上面那条不是恒拒。
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

    // ── H3：headless 集成 driver（真进程 / 真 framing / 真回收）──────────────
    //
    // 上面的全序测试用 scripted leg 把**分支**逼齐；这一段换成真 OS 进程，
    // 走 production 的 `ProcessSpawner` → `spawn_verified_sidecar` → `SidecarProcess`
    // 整条链，证明的是分支之外那些只有真跑才成立的事：argv/env/cwd 实物、
    // packet framing 真的跨管道、durable bytes 真的落盘、真 SIGKILL 之后 fold 出正确终态、
    // 以及 leg 真的被回收。
    //
    // 对端是一枚 `/bin/sh` 应答器。它只负责「是一枚真进程 + 按 host 入包回 canonical
    // product wire」；应答行由 `encode_packet_line` 生成——codec 自身的区分力由 tracked
    // golden（`fixtures/product-wire-v1.jsonl`，Rust/TS 双侧同源核验）独立承担，
    // 这里被测的是 host，不是 codec。

    struct Responder {
        script_path: PathBuf,
        observations: PathBuf,
        inbox: PathBuf,
    }

    impl Responder {
        fn observation(&self, key: &str) -> Option<String> {
            let text = fs::read_to_string(&self.observations).ok()?;
            text.lines()
                .find_map(|line| line.strip_prefix(key).map(str::to_string))
        }
        fn observations_text(&self) -> String {
            fs::read_to_string(&self.observations).unwrap_or_default()
        }
        fn inbox_lines(&self) -> Vec<String> {
            fs::read_to_string(&self.inbox)
                .unwrap_or_default()
                .lines()
                .map(str::to_string)
                .collect()
        }
        /// 应答器把自己的 pid 记在观察面上，回收才可被**实测**而不是靠信。
        fn child_pid(&self) -> i32 {
            self.observation("pid=")
                .expect("应答器已登记 pid")
                .trim()
                .parse()
                .expect("pid 是整数")
        }
    }

    fn wire(seq: u64, request: Option<&str>, payload: PacketPayload) -> String {
        let packet = ProductPacket {
            seq,
            session_id: Some("sess-1".to_string()),
            request_id: request.map(str::to_string),
            payload,
        };
        let mut line = encode_packet_line(&packet).expect("合契约");
        line.pop();
        let text = String::from_utf8(line).expect("UTF-8");
        assert!(
            !text.contains('\''),
            "应答行要嵌进 sh 单引号，测试数据不得自带撇号"
        );
        text
    }

    /// 把若干 canonical 行变成 sh 的 `printf` 序列。
    fn emit(lines: &[String]) -> String {
        lines
            .iter()
            .map(|line| format!("      printf '%s\\n' '{line}'\n"))
            .collect()
    }

    /// `arms`：(入包子串, 命中后要执行的 sh 片段)。
    fn responder(root: &Path, tag: &str, arms: &[(&str, String)]) -> Responder {
        let observations = root.join(format!("{tag}-observations.txt"));
        let inbox = root.join(format!("{tag}-inbox.jsonl"));
        let script_path = root.join(format!("{tag}-responder.sh"));
        let mut script = String::new();
        script.push_str(&format!(
            "OBS='{}'\nIN='{}'\n",
            observations.display(),
            inbox.display()
        ));
        // argv / env / cwd 三面的实物观察，写在处理任何入包之前。
        script.push_str("printf 'argc=%s\\n' \"$#\" > \"$OBS\"\n");
        script.push_str("printf 'arg0=%s\\n' \"$0\" >> \"$OBS\"\n");
        script.push_str("printf 'pwd=%s\\n' \"$(pwd)\" >> \"$OBS\"\n");
        script.push_str("printf 'pid=%s\\n' \"$$\" >> \"$OBS\"\n");
        script.push_str("printf 'env-begin\\n' >> \"$OBS\"\n");
        script.push_str("env >> \"$OBS\"\n");
        script.push_str("printf 'env-end\\n' >> \"$OBS\"\n");
        script.push_str(": > \"$IN\"\n");
        script.push_str("while IFS= read -r line; do\n");
        script.push_str("  printf '%s\\n' \"$line\" >> \"$IN\"\n");
        script.push_str("  case \"$line\" in\n");
        for (needle, body) in arms {
            script.push_str(&format!("    *'{needle}'*)\n"));
            script.push_str(body);
            script.push_str("      ;;\n");
        }
        script.push_str("  esac\ndone\n");
        fs::write(&script_path, script).expect("写应答器");
        Responder {
            script_path,
            observations,
            inbox,
        }
    }

    fn real_pair(responder: &Responder) -> VerifiedRoutePair {
        VerifiedRoutePair::for_lifecycle_test(
            PathBuf::from("/bin/sh"),
            responder.script_path.clone(),
        )
    }

    fn start_real(
        harness: &Harness,
        responder: &Responder,
        credentials: &dyn CredentialPort,
    ) -> Result<PiLoopHost, HostError> {
        PiLoopHost::start_with_pair(
            &harness.app_data,
            real_pair(responder),
            harness.config.clone(),
            credentials,
            &mut ProcessSpawner,
        )
    }

    /// durable 面只认**盘上的 bytes**：逐行核 type，并核最后一枚 byte 是 LF。
    fn journal_types_on_disk(app_data: &Path) -> Vec<String> {
        let bytes = fs::read(journal_path(app_data, "cnt-1", "sess-1")).expect("读 journal");
        assert_eq!(bytes.last(), Some(&b'\n'), "durable 行必须以 LF 收束");
        String::from_utf8(bytes)
            .expect("UTF-8")
            .lines()
            .map(|line| {
                let head = line.find("\"type\":\"").expect("每行都有 type") + 8;
                let tail = line[head..].find('"').expect("type 闭合") + head;
                line[head..tail].to_string()
            })
            .collect()
    }

    /// 条件等待：不赌时长（workflow 判例「异步前置要等条件，不要赌时长」）。
    fn wait_until(deadline: Duration, mut predicate: impl FnMut() -> bool) -> bool {
        let started = std::time::Instant::now();
        while started.elapsed() < deadline {
            if predicate() {
                return true;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        predicate()
    }

    fn process_alive(pid: i32) -> bool {
        // SAFETY: `kill(pid, 0)` 只做存在性探测，不投递信号。
        unsafe { libc::kill(pid, 0) == 0 }
    }

    fn leg_arms(request_id: &str) -> Vec<(&'static str, String)> {
        // fresh leg：prior 三值全零，跑完一个 0.25 的回合后累计恰为 turns=1 / usd=0.25。
        leg_arms_with_terminal_budget(request_id, open_budget(1, Some(0.25)))
    }

    /// 应答器的终态 budget 必须与**当条 logical session 的 fold** 一致（PI-HOST-LOOP-1R R4）。
    /// resume 之后 prior usd 已被 `costCoverage:'unknown'` 毒成 null，真 sidecar 拿到
    /// `priorUsd:null` 的 bootstrap 后也只会回 null——故那一路要另给 budget，
    /// 不能沿用 fresh leg 那份。
    fn leg_arms_with_terminal_budget(
        request_id: &str,
        terminal_budget: BudgetView,
    ) -> Vec<(&'static str, String)> {
        let ready_line = wire(
            1,
            None,
            PacketPayload::Ready {
                capabilities: vec![WorkspaceCapability::CaseRead],
            },
        );
        let prompt_lines = vec![
            wire(
                2,
                Some(request_id),
                PacketPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                    delta: "正在读取 /case/备忘.md".to_string(),
                }),
            ),
            wire(
                3,
                Some(request_id),
                PacketPayload::AgentEvent(AgentProjectionEvent::ToolStarted {
                    tool_call_id: "call-1".to_string(),
                    tool_name: crate::pi_loop_protocol::ProductToolName::Read,
                }),
            ),
            wire(
                4,
                Some(request_id),
                PacketPayload::AgentEvent(AgentProjectionEvent::ToolFinished {
                    tool_call_id: "call-1".to_string(),
                    tool_name: crate::pi_loop_protocol::ProductToolName::Read,
                    outcome: crate::pi_loop_protocol::ToolOutcome::Succeeded,
                }),
            ),
            wire(
                5,
                Some(request_id),
                PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                    turn: 1,
                    counted_toward_turn_limit: true,
                    usage: known_usage(0.25),
                    stop_reason: TurnStopReason::Stop,
                }),
            ),
            wire(
                6,
                Some(request_id),
                PacketPayload::Terminal(Terminal::Completed {
                    budget: terminal_budget,
                }),
            ),
        ];
        let shutdown_line = wire(7, None, PacketPayload::Terminal(Terminal::Shutdown));
        vec![
            ("\"type\":\"bootstrap\"", emit(&[ready_line])),
            ("\"type\":\"prompt\"", emit(&prompt_lines)),
            ("\"type\":\"shutdown\"", emit(&[shutdown_line])),
        ]
    }

    #[test]
    fn headless_driver_runs_a_whole_leg_over_a_real_child_process() {
        let h = harness("real-leg");
        let responder = responder(&h.app_data, "leg", &leg_arms("req-1"));
        let mut host = start_real(&h, &responder, &FixedKey).expect("真跑启动");

        assert_eq!(host.leg(), 1);
        assert_eq!(host.capabilities(), EXPECTED_CAPABILITIES);

        // 真进程的 argv / cwd 实物。
        assert_eq!(responder.observation("argc=").as_deref(), Some("0"));
        assert_eq!(
            responder.observation("arg0=").as_deref(),
            Some(responder.script_path.to_string_lossy().as_ref())
        );
        let expected_cwd =
            fs::canonicalize(h.app_data.join("pi-loop-runtime")).expect("规范化 runtime cwd");
        assert_eq!(
            responder
                .observation("pwd=")
                .and_then(|value| fs::canonicalize(value).ok()),
            Some(expected_cwd)
        );

        let terminal = host.prompt("req-1", "合同编号是多少").expect("prompt 终态");
        assert!(matches!(terminal, Terminal::Completed { .. }));
        host.shutdown().expect("shutdown");

        // 每枚 outward event 先落同义 journal；turn_finished 两笔；terminal 之后才是 session。
        assert_eq!(
            journal_types_on_disk(&h.app_data),
            vec![
                "session_started",
                "user_prompted",
                "agent_event",
                "agent_event",
                "agent_event",
                "agent_event",
                "turn_usage_recorded",
                "prompt_completed",
                "session_completed",
            ],
            "durable bytes 的次序即语义"
        );
        assert_eq!(
            host.records().len(),
            journal_types_on_disk(&h.app_data).len(),
            "内存账本与盘上 bytes 逐条对齐"
        );
        assert_eq!(host.published().len(), 7, "ready + 四枚 agent + 两枚终态");
        assert_eq!(
            host.published().last(),
            Some(&HostEvent::SessionTerminal(JournalType::SessionCompleted))
        );
        assert_eq!(host.projection().prior_turns, 1);
        assert_eq!(host.projection().prior_usd, Some(0.25));

        // 真 child 已随 shutdown 收束。
        assert!(
            wait_until(Duration::from_millis(5_000), || !process_alive(
                responder.child_pid()
            )),
            "shutdown 之后 child 必须已退出"
        );
    }

    #[test]
    fn canary_sweep_over_a_real_child_covers_every_observable_surface() {
        // secret 与物理根取**互异**的可搜字符串：任一面命中都能指名道姓。
        const SECRET: &str = "sk-canary-SECRET-9f2a4c";
        const ROOT_TAG: &str = "canary-ROOT-7b31d5";
        struct CanaryKey;
        impl CredentialPort for CanaryKey {
            fn resolve(&self) -> Result<String, HostError> {
                Ok(SECRET.to_string())
            }
        }

        let mut h = harness("canary");
        let case_root = h.case_root.parent().expect("有父级").join(ROOT_TAG);
        fs::create_dir_all(&case_root).expect("建 canary 案件根");
        h.config.case_root = case_root.clone();

        let mut arms = leg_arms("req-1");
        // stderr 面：child 往 stderr 泼一枚独有 canary，host 任何投影都不得转售它。
        arms[0]
            .1
            .push_str("      printf 'stderr-canary-e11c\\n' >&2\n");
        let responder = responder(&h.app_data, "canary", &arms);
        let mut host = start_real(&h, &responder, &CanaryKey).expect("真跑启动");
        host.prompt("req-1", "读一下材料").expect("prompt 终态");

        let physical = case_root.to_string_lossy().into_owned();
        let inbox = responder.inbox_lines();

        // 面 1–3：argv / env / cwd。
        let observations = responder.observations_text();
        assert!(!observations.contains(SECRET), "argv/env/cwd 面不得有 key");
        assert!(
            !observations.contains(ROOT_TAG),
            "argv/env/cwd 面不得有物理根"
        );
        assert!(!observations.contains("HOME="), "child env 严格为空");
        let env_block = observations
            .split("env-begin\n")
            .nth(1)
            .and_then(|rest| rest.split("env-end").next())
            .expect("env 段存在");
        // `env_clear()` 之后 child env 为空；`PWD`/`SHLVL`/`_` 是 `/bin/sh` 自己进程内设的，
        // 不是从父进程继承来的。真正要证的是「父进程有、child 没有」——`HOME`/`PATH` 即对照。
        assert!(
            std::env::var_os("HOME").is_some() && std::env::var_os("PATH").is_some(),
            "对照前提：父进程确实有 HOME 与 PATH"
        );
        let shell_owned = ["PWD=", "SHLVL=", "_="];
        assert!(
            env_block
                .lines()
                .all(|line| line.is_empty()
                    || shell_owned.iter().any(|prefix| line.starts_with(prefix))),
            "除 shell 自设的三枚外，child env 不得有任何继承变量：{env_block:?}"
        );

        // 面 4：host→child 的 stdout（即 inbox）。只有首枚 bootstrap 可以带，其余一律不得。
        assert!(
            inbox[0].contains(SECRET) && inbox[0].contains(ROOT_TAG),
            "对照：bootstrap 确实带 key 与物理根，否则下面的否定是空的"
        );
        for line in inbox.iter().skip(1) {
            assert!(
                !line.contains(SECRET),
                "bootstrap 之后不得再出现 key：{line}"
            );
            assert!(
                !line.contains(ROOT_TAG),
                "bootstrap 之后不得再出现物理根：{line}"
            );
        }

        // 面 5：child stderr 的原文不得出现在 host 的任何投影里。
        let journal_text =
            fs::read_to_string(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读 journal");
        let published = format!("{:?}", host.published());
        let diagnostic = format!("{host:?}");
        for surface in [&journal_text, &published, &diagnostic] {
            assert!(
                !surface.contains("stderr-canary"),
                "stderr 原文只活在受限内存/test seam"
            );
        }

        // 面 6–8：journal / reply / diagnostic。
        for (name, surface) in [
            ("journal", &journal_text),
            ("reply", &published),
            ("diagnostic", &diagnostic),
        ] {
            assert!(!surface.contains(SECRET), "{name} 面出现了 key");
            assert!(!surface.contains(ROOT_TAG), "{name} 面出现了物理根");
            assert!(!surface.contains(&physical), "{name} 面出现了物理路径");
        }
        assert!(
            journal_text.contains("\"caseRoot\":\"/case\""),
            "journal 里案件根恒为逻辑根"
        );

        // 面 9：error。逼一枚真失败，核错误串同样干净。
        let reused = host
            .prompt("req-1", "再问一次")
            .expect_err("requestId 复用必拒");
        let error_text = format!("{reused:?}");
        assert!(!error_text.contains(SECRET));
        assert!(!error_text.contains(ROOT_TAG));
    }

    #[test]
    fn real_child_killed_mid_prompt_folds_to_interrupted_and_resumes_on_a_new_leg() {
        let h = harness("real-crash");
        let ready_line = wire(
            1,
            None,
            PacketPayload::Ready {
                capabilities: vec![WorkspaceCapability::CaseRead],
            },
        );
        let delta = wire(
            2,
            Some("req-1"),
            PacketPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                delta: "开始读材料".to_string(),
            }),
        );
        // 真 SIGKILL 自注入：prompt 途中进程整枚消失，host 只见 EOF。
        let crash_arms = vec![
            (
                "\"type\":\"bootstrap\"",
                emit(std::slice::from_ref(&ready_line)),
            ),
            (
                "\"type\":\"prompt\"",
                format!("{}      kill -9 $$\n", emit(&[delta])),
            ),
        ];
        let first = responder(&h.app_data, "crash", &crash_arms);
        let mut host = start_real(&h, &first, &FixedKey).expect("leg1 启动");
        assert_eq!(
            host.prompt("req-1", "问第一句").expect_err("child 已死"),
            HostError::Process(ProcessFault::UnexpectedEof)
        );
        // 对照：应答器确实进过 prompt 分支才自杀的，EOF 不是「压根没起来」。
        assert_eq!(
            first.inbox_lines().len(),
            2,
            "bootstrap + prompt 各收到一枚"
        );
        let crashed_pid = first.child_pid();
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("按已 durable journal 做 crash fold");
        // 回收之后 pid 才既不活也不是 zombie——`kill(pid,0)` 对未 reap 的僵尸仍返回 0，
        // 所以这条断言必须放在 reclaim 之后，否则测的是「父进程还没收尸」。
        assert!(
            wait_until(Duration::from_millis(5_000), || !process_alive(crashed_pid)),
            "SIGKILL 之后 leg 必须被回收干净"
        );
        drop(host);

        // 五步 fold：maxUsd 未启用 + active prompt ⇒ 步骤 4 落 session_interrupted。
        assert_eq!(
            journal_types_on_disk(&h.app_data),
            vec![
                "session_started",
                "user_prompted",
                "agent_event",
                "session_interrupted",
            ]
        );
        let journal_text =
            fs::read_to_string(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读");
        assert!(journal_text.contains("\"reason\":\"sidecar_ended\""));
        assert!(journal_text.contains("\"costCoverage\":\"unknown\""));

        // 新 leg：leg=prev+1、prior 三值精确、messageContext 恒为 empty。
        // 终态 budget 用 `usd:null`——上一 leg 的 `costCoverage:'unknown'` 已把累计毒成 null，
        // 拿到 `priorUsd:null` 的真 sidecar 也只会回 null（R4 的 parity 因此成立）。
        let second = responder(
            &h.app_data,
            "resume",
            &leg_arms_with_terminal_budget("req-2", open_budget(1, None)),
        );
        let mut resumed = start_real(&h, &second, &FixedKey).expect("resume 启动");
        assert_eq!(resumed.leg(), 2);
        assert_eq!(
            journal_types_on_disk(&h.app_data)
                .last()
                .map(String::as_str),
            Some("session_resumed")
        );
        let resumed_text =
            fs::read_to_string(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读");
        assert!(resumed_text.contains("\"previousLeg\":1"));
        assert!(resumed_text.contains("\"startedEventId\":\"event_1\""));
        assert!(resumed_text.contains("\"messageContext\":\"empty\""));
        assert!(resumed_text.contains("\"priorObservedTurns\":0"));
        assert!(resumed_text.contains("\"priorTurns\":0"));
        // 被打断的那一回合可能已经付过费：`costCoverage:'unknown'` 把总额毒成 null，
        // prior 三值照 fold 如实带过去，绝不把 null 恢复成 0。
        assert!(resumed_text.contains("\"priorUsd\":null"));
        assert_eq!(resumed.projection().prior_usd, None);

        // 新 leg 的 bootstrap 必须带 after_interruption 与同一 leg 号，且不传旧 messages。
        let bootstrap = &second.inbox_lines()[0];
        assert!(bootstrap.contains("\"kind\":\"after_interruption\""));
        assert!(bootstrap.contains("\"leg\":2"));
        assert!(!bootstrap.contains("messages"));

        // 跨 leg 的 requestId 去重由持 durable journal 的这一侧独占。
        assert!(matches!(
            resumed.prompt("req-1", "拿旧 id 再问"),
            Err(HostError::ResumeRefused(_))
        ));
        resumed.prompt("req-2", "换新 id 再问").expect("新 id 可用");
        assert_eq!(resumed.projection().prior_turns, 1);
    }

    #[test]
    fn ready_capability_drift_reclaims_the_real_child_before_the_first_prompt() {
        let h = harness("real-drift");
        let drifted = wire(
            1,
            None,
            PacketPayload::Ready {
                capabilities: vec![WorkspaceCapability::WorkspaceRead],
            },
        );
        let arms = vec![("\"type\":\"bootstrap\"", emit(&[drifted]))];
        let responder = responder(&h.app_data, "drift", &arms);
        assert_eq!(
            start_real(&h, &responder, &FixedKey).expect_err("capability 漂移必拒"),
            HostError::Protocol(ProtocolErrorCode::StateViolation)
        );
        assert_eq!(
            journal_types_on_disk(&h.app_data),
            vec!["session_started", "session_failed"]
        );
        // 回收是**实测**的：真进程必须不在了。
        assert!(
            wait_until(Duration::from_millis(6_000), || !process_alive(
                responder.child_pid()
            )),
            "漂移之后 leg 必须被真回收"
        );
    }

    #[test]
    fn both_stored_credential_forms_start_a_real_leg_and_none_falls_back_to_the_ambient_env() {
        use crate::{ReadCredential, StoredCredential};

        // 用户显式保存的具名环境变量：`active_secret()` 当场解析。
        std::env::set_var("COURTWORK_PI_LOOP_TEST_KEY", "sk-from-user-named-env");
        // 固定环境变量确实存在——下面「无存档即未配置」才有区分力。
        std::env::set_var("DEEPSEEK_API_KEY", "sk-ambient-must-never-be-used");

        /// 复用 production 的存储形制 → secret 纯函数，不另开第二条凭证路径。
        enum StoredForm {
            Pasted(&'static str),
            Named(&'static str),
            Missing,
        }
        impl CredentialPort for StoredForm {
            fn resolve(&self) -> Result<String, HostError> {
                let read = match self {
                    StoredForm::Pasted(secret) => {
                        ReadCredential::Stored(StoredCredential::Pasted {
                            secret: (*secret).to_string(),
                        })
                    }
                    StoredForm::Named(name) => {
                        ReadCredential::Stored(StoredCredential::Environment {
                            name: (*name).to_string(),
                        })
                    }
                    StoredForm::Missing => ReadCredential::Missing,
                };
                match crate::secret_from_stored(read) {
                    Ok((_source, secret)) if !secret.trim().is_empty() => Ok(secret),
                    _ => Err(HostError::CredentialUnconfigured),
                }
            }
        }

        // 两路都能真起 leg，且 child env 始终为空。
        for (label, stored, expected_key) in [
            (
                "pasted",
                StoredForm::Pasted("sk-pasted-by-user"),
                "sk-pasted-by-user",
            ),
            (
                "environment-name",
                StoredForm::Named("COURTWORK_PI_LOOP_TEST_KEY"),
                "sk-from-user-named-env",
            ),
        ] {
            let h = harness(&format!("cred-{label}"));
            let responder = responder(&h.app_data, label, &leg_arms("req-1"));
            let host = start_real(&h, &responder, &stored)
                .unwrap_or_else(|error| panic!("{label} 必须能起 leg，实得 {error:?}"));
            assert_eq!(host.capabilities(), EXPECTED_CAPABILITIES);
            let bootstrap = &responder.inbox_lines()[0];
            assert!(
                bootstrap.contains(expected_key),
                "{label}：解析出的 key 只经 bootstrap 进内存"
            );
            let observations = responder.observations_text();
            assert!(
                !observations.contains(expected_key) && !observations.contains("DEEPSEEK_API_KEY"),
                "{label}：child env 严格为空，key 绝不经环境传"
            );
            drop(host);
        }

        // 无存档：固定环境变量摆在那儿也零回落，且 journal / spawn 一个都不发生。
        let h = harness("cred-missing");
        assert_eq!(
            PiLoopHost::start_with_pair(
                &h.app_data,
                lifecycle_pair(&h.layout),
                h.config.clone(),
                &StoredForm::Missing,
                &mut RefusingSpawner,
            )
            .expect_err("无存档必须保持未配置"),
            HostError::CredentialUnconfigured
        );
        assert!(!journal_path(&h.app_data, "cnt-1", "sess-1").exists());

        // 生产段静态面：host 侧一处都不读那枚固定环境变量。
        let source = include_str!("pi_loop.rs");
        let production = source
            .split_once("#[cfg(test)]")
            .map(|(head, _)| head)
            .unwrap_or(source);
        assert!(
            !production.contains("var(\"DEEPSEEK") && !production.contains("env::var"),
            "产品 host 不得从环境里捞凭证"
        );

        std::env::remove_var("COURTWORK_PI_LOOP_TEST_KEY");
        std::env::remove_var("DEEPSEEK_API_KEY");
    }

    #[test]
    fn a_packet_after_the_shutdown_terminal_kills_the_leg_instead_of_being_absorbed() {
        // terminal 之后的来包必须杀 leg：`terminal→EOF` 窗里只允许 EOF。
        let h = harness("post-terminal");
        let ready_line = wire(
            1,
            None,
            PacketPayload::Ready {
                capabilities: vec![WorkspaceCapability::CaseRead],
            },
        );
        let shutdown_line = wire(2, None, PacketPayload::Terminal(Terminal::Shutdown));
        let straggler = wire(
            3,
            Some("req-late"),
            PacketPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                delta: "terminal 之后还想说话".to_string(),
            }),
        );
        let arms = vec![
            ("\"type\":\"bootstrap\"", emit(&[ready_line])),
            ("\"type\":\"shutdown\"", emit(&[shutdown_line, straggler])),
        ];
        let responder = responder(&h.app_data, "post-terminal", &arms);
        let mut host = start_real(&h, &responder, &FixedKey).expect("启动");
        assert_eq!(
            host.shutdown().expect_err("terminal 后来包必须杀 leg"),
            HostError::Protocol(ProtocolErrorCode::StateViolation)
        );
        assert_eq!(
            journal_types_on_disk(&h.app_data),
            vec!["session_started", "session_failed"],
            "不得落 session_completed——它没有干净收束"
        );
    }

    /// 冻结 Node v22.23.1 + production sealed CJS 的整机 E2E（票面 §五门 3 的 Rust 侧对应）。
    ///
    /// 它消费独占 `pnpm --filter @courtwork/pi-lane build:product-sidecar` 生成的 112 MiB
    /// 快照，故**显式** `#[ignore]`：`cargo test` 会把它计进 “ignored”，不会静默当成跑过。
    /// 跑法：`cargo test --lib pi_loop::tests::snapshot -- --ignored --nocapture`。
    #[test]
    #[ignore = "需先跑 build:product-sidecar 生成 112MiB verified runtime 快照；见票面 §五门 3"]
    fn snapshot_e2e_runs_the_real_verified_node_through_the_whole_route_preflight() {
        let repository = Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(3)
            .expect("仓库根")
            .to_path_buf();
        let snapshot = repository.join("packages/pi-lane/dist/product-sidecar");
        let triple = crate::pi_loop_process::host_target_triple().expect("本机 target 在闭集内");
        let runtime_source = snapshot.join(format!("pi-sidecar-{}", triple.as_str()));
        assert!(
            runtime_source.exists(),
            "快照缺 {}——先跑 build:product-sidecar",
            runtime_source.display()
        );

        let root = temp_root("snapshot-e2e");
        let app_data = root.join("app-data");
        fs::create_dir_all(&app_data).expect("建 app-data");
        let case_root = root.join("案卷");
        fs::create_dir_all(&case_root).expect("建案件根");
        fs::write(case_root.join("备忘.md"), "合同编号 HT-2024-081\n").expect("写材料");

        // 组装真实 app layout：hard link 省掉 112 MiB 拷贝，bytes 与 inode 都是同一份。
        let executable_dir = root.join("MacOS");
        let resource_dir = root.join("Resources");
        fs::create_dir_all(&executable_dir).expect("建可执行目录");
        fs::create_dir_all(resource_dir.join(RESOURCE_DIR_NAME)).expect("建 resource 目录");
        let link_or_copy = |from: PathBuf, to: PathBuf| {
            if fs::hard_link(&from, &to).is_err() {
                fs::copy(&from, &to).expect("落件");
            }
        };
        link_or_copy(runtime_source, executable_dir.join(RUNTIME_BASENAME));
        link_or_copy(
            snapshot.join(BUNDLE_BASENAME),
            resource_dir.join(RESOURCE_DIR_NAME).join(BUNDLE_BASENAME),
        );
        fs::write(
            resource_dir.join(RESOURCE_DIR_NAME).join(MANIFEST_BASENAME),
            EXPECTED_ROUTE_MANIFEST,
        )
        .expect("写 manifest");

        let layout = AppLayout {
            executable_dir,
            resource_dir,
        };
        let config = StartConfig {
            container_id: "cnt-snap".to_string(),
            session_id: "sess-snap".to_string(),
            grant_id: "grant-1".to_string(),
            case_root,
            model_id: "deepseek-v4-flash".to_string(),
            max_turns: 12,
            max_usd: None,
        };
        // 全序：preflight（实物双件逐值）→ journal durable → spawn → bootstrap → ready。
        // 不发 prompt，因此零网络请求。
        let mut host = PiLoopHost::start(
            &app_data,
            &layout,
            triple,
            config,
            &FixedKey,
            &mut ProcessSpawner,
        )
        .expect("真 Node + production sealed CJS 起得来");
        assert_eq!(host.capabilities(), EXPECTED_CAPABILITIES);
        host.shutdown().expect("shutdown");

        let bytes = fs::read(journal_path(&app_data, "cnt-snap", "sess-snap")).expect("读 journal");
        let text = String::from_utf8(bytes).expect("UTF-8");
        assert!(text.contains("\"routeId\":\"node22-runtime-sealed-cjs-v1\""));
        assert!(text.contains("\"nodeVersion\":\"22.23.1\""));
        assert!(text.contains("session_completed"));
        assert!(
            text.contains(&format!(
                "\"routeManifestSha256\":\"{}\"",
                crate::pi_loop_process::sha256_bytes(EXPECTED_ROUTE_MANIFEST)
            )),
            "journal 记的是对已验证 manifest 原始 bytes 重算的值"
        );

        // ── 只有实物在场才做得出的三枚反例 ──────────────────────────────
        let runtime_file = layout.executable_dir.join(RUNTIME_BASENAME);
        let bundle_file = layout
            .resource_dir
            .join(RESOURCE_DIR_NAME)
            .join(BUNDLE_BASENAME);

        // (1) 错 target：arm 的实物按 x86_64 那一行的冻结真值核，bytes 当场对不上。
        let other = match triple {
            TargetTriple::Aarch64AppleDarwin => TargetTriple::X8664AppleDarwin,
            TargetTriple::X8664AppleDarwin => TargetTriple::Aarch64AppleDarwin,
        };
        assert_eq!(
            crate::pi_loop_process::preflight_route_pair(&layout, other)
                .expect_err("错 target 必拒"),
            RouteError::ArtifactBytes("runtime")
        );

        // (2) 双件交换：把 runtime 与 CJS 的内容对调，两件各自都不再是自己。
        let runtime_bytes = fs::read(&runtime_file).expect("读 runtime");
        let bundle_bytes = fs::read(&bundle_file).expect("读 bundle");
        fs::remove_file(&runtime_file).expect("先移走 hard link");
        fs::remove_file(&bundle_file).expect("先移走 hard link");
        fs::write(&runtime_file, &bundle_bytes).expect("写交换后的 runtime");
        fs::write(&bundle_file, &runtime_bytes).expect("写交换后的 bundle");
        assert_eq!(
            crate::pi_loop_process::preflight_route_pair(&layout, triple).expect_err("交换必拒"),
            RouteError::ArtifactBytes("runtime")
        );

        // (3) bundle 零字节：runtime 先真过 bytes+SHA 两道门，失败点才唯一落在 bundle 上。
        fs::write(&runtime_file, &runtime_bytes).expect("还原 runtime");
        fs::write(&bundle_file, b"").expect("bundle 截成零字节");
        assert_eq!(
            crate::pi_loop_process::preflight_route_pair(&layout, triple).expect_err("零字节必拒"),
            RouteError::ArtifactBytes("sidecar.cjs")
        );

        // 对照：还原后仍能过——上面三枚不是恒红。
        fs::write(&bundle_file, &bundle_bytes).expect("还原 bundle");
        assert!(crate::pi_loop_process::preflight_route_pair(&layout, triple).is_ok());
    }

    // ── PI-HOST-LOOP-1R：首轮独立验收（`314117d`）的八枚 Rust 反例，转为常驻 ─────
    //
    // 形态沿用验收会话：counting credential 与 scripted leg/spawner 只隔离外部 I/O
    // （Keychain、真进程），被判的仍是 production 的 `start_inner` / `prompt` /
    // `expect_packet` / `shutdown` / `load_session` 本体，不复制被判状态机。

    /// R1 的次序探针：任何 route / case-root 失败下，这个计数必须恰 0。
    struct CountingCredential {
        reads: Arc<AtomicU64>,
    }

    impl CredentialPort for CountingCredential {
        fn resolve(&self) -> Result<String, HostError> {
            self.reads.fetch_add(1, Ordering::SeqCst);
            Ok("sk-in-memory-only".to_string())
        }
    }

    /// 与 {@link ScriptedLeg} 同形，只多一件：`wait_exit` 的结局可配置。
    /// R6 要的正是「child 真的以 exit 7 收场」这一位事实。
    struct ExitingLeg {
        inbox: VecDeque<Scripted>,
        log: Arc<Mutex<LegLog>>,
        exit: ExitOutcome,
    }

    impl SidecarLeg for ExitingLeg {
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
            Ok(self.exit)
        }
        fn wait_exit(&mut self, _deadline: Duration) -> ExitOutcome {
            self.exit
        }
    }

    struct ExitingSpawner {
        legs: VecDeque<VecDeque<Scripted>>,
        log: Arc<Mutex<LegLog>>,
        spawns: usize,
        exit: ExitOutcome,
    }

    impl LegSpawner for ExitingSpawner {
        fn spawn(
            &mut self,
            _pair: &VerifiedRoutePair,
            _cwd: &Path,
        ) -> Result<Box<dyn SidecarLeg>, HostError> {
            self.spawns += 1;
            Ok(Box::new(ExitingLeg {
                inbox: self.legs.pop_front().unwrap_or_default(),
                log: Arc::clone(&self.log),
                exit: self.exit,
            }))
        }
    }

    /// 可注入 credential 与 child 退出结局的 `start_with_pair` 入口。
    fn start_probe(
        harness: &Harness,
        config: StartConfig,
        legs: Vec<VecDeque<Scripted>>,
        exit: ExitOutcome,
        credentials: &dyn CredentialPort,
    ) -> (Result<PiLoopHost, HostError>, Arc<Mutex<LegLog>>, usize) {
        let log = Arc::new(Mutex::new(LegLog::default()));
        let mut spawner = ExitingSpawner {
            legs: legs.into_iter().collect(),
            log: Arc::clone(&log),
            spawns: 0,
            exit,
        };
        let result = PiLoopHost::start_with_pair(
            &harness.app_data,
            lifecycle_pair(&harness.layout),
            config,
            credentials,
            &mut spawner,
        );
        (result, log, spawner.spawns)
    }

    fn ready_leg() -> VecDeque<Scripted> {
        VecDeque::from(vec![ready(1, vec![WorkspaceCapability::CaseRead])])
    }

    fn journal_bytes(app_data: &Path, container: &str) -> Vec<u8> {
        fs::read(journal_path(app_data, container, "sess-1")).unwrap_or_default()
    }

    /// R1：preflight 全序恰为 route → case root → credential → durable → cwd → spawn。
    #[test]
    fn counterexample_credential_is_read_only_after_route_and_case_root_pass() {
        // (一) route-pair 坏件（测试 layout 的双件是 placeholder，真 preflight 必拒）。
        let h = harness("r1-route");
        let reads = Arc::new(AtomicU64::new(0));
        let credential = CountingCredential {
            reads: Arc::clone(&reads),
        };
        let error = PiLoopHost::start(
            &h.app_data,
            &h.layout,
            TargetTriple::Aarch64AppleDarwin,
            h.config.clone(),
            &credential,
            &mut RefusingSpawner,
        )
        .expect_err("route 坏件必拒");
        assert!(matches!(error, HostError::Route(_)), "实得 {error:?}");
        assert_eq!(
            reads.load(Ordering::SeqCst),
            0,
            "route 身份门必须先于 Keychain read"
        );
        assert!(
            !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
            "preflight 失败 journal 零字节"
        );

        // (二) route 已验证、案件根是 symlink：credential 仍必须恰 0 次。
        let h = harness("r1-case-root");
        let reads = Arc::new(AtomicU64::new(0));
        let credential = CountingCredential {
            reads: Arc::clone(&reads),
        };
        let linked = h.case_root.parent().expect("有父级").join("linked-case");
        std::os::unix::fs::symlink(&h.case_root, &linked).expect("建 symlink");
        let mut config = h.config.clone();
        config.case_root = linked;
        let (result, _, spawns) =
            start_probe(&h, config, Vec::new(), ExitOutcome::Code(0), &credential);
        assert!(
            matches!(result, Err(HostError::CaseRoot(_))),
            "实得 {result:?}"
        );
        assert_eq!(
            reads.load(Ordering::SeqCst),
            0,
            "case root 门也必须先于 Keychain read"
        );
        assert_eq!(spawns, 0, "preflight 失败 spawn 计数 0");
        assert!(!journal_path(&h.app_data, "cnt-1", "sess-1").exists());

        // 对照：两道门都过时 credential 恰读一次，journal 与 spawn 都发生——上面两条不是恒红。
        let h = harness("r1-ok");
        let reads = Arc::new(AtomicU64::new(0));
        let credential = CountingCredential {
            reads: Arc::clone(&reads),
        };
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &credential,
        );
        assert!(result.is_ok(), "对照必须能起：{result:?}");
        assert_eq!(reads.load(Ordering::SeqCst), 1);
        assert_eq!(spawns, 1);
    }

    /// R2：bootstrap/config 闭集在 journal 与 spawn 之前以具名错误拒绝。
    ///
    /// 上界三行来自 PI-HOST-LOOP-1R2 C2（独立复验 `427f4fa` 的 Blocker 2）：1R 的
    /// `validate_start_config()` 只查下界与非空，`maxTurns=13` 实得 `Protocol(InvalidSchema)`
    /// 且**已 spawn 一次**——错误被拖到 bootstrap 出包时 encoder 的自解码 parity 才发作，
    /// 那时 route 门已过、Keychain 已读、journal 已写、child 已起。
    ///
    /// 断言次序按复验示范：先钉副作用再钉外观。反过来写，外观那枚一失败就把
    /// 「非法配置已经拉起 child」这半个事实盖住了。
    #[test]
    fn counterexample_start_config_closed_set_is_refused_before_journal_and_spawn() {
        type ConfigCase = (&'static str, fn(&mut StartConfig));
        let cases: [ConfigCase; 7] = [
            ("maxTurns=0", |config| config.max_turns = 0),
            ("maxTurns=13", |config| config.max_turns = 13),
            ("maxUsd=0", |config| config.max_usd = Some(0.0)),
            ("maxUsd 负数", |config| config.max_usd = Some(-1.0)),
            ("maxUsd 非有限", |config| config.max_usd = Some(f64::NAN)),
            ("maxUsd=100001", |config| config.max_usd = Some(100_001.0)),
            ("modelId 257 bytes", |config| {
                config.model_id = "m".repeat(257)
            }),
        ];
        for (label, mutate) in cases {
            let h = harness("r2-config");
            let mut config = h.config.clone();
            mutate(&mut config);
            let (result, _, spawns) = start_probe(
                &h,
                config,
                vec![ready_leg()],
                ExitOutcome::Code(0),
                &FixedKey,
            );
            assert_eq!(spawns, 0, "{label}：spawn 计数恰 0");
            assert!(
                !journal_path(&h.app_data, "cnt-1", "sess-1").exists(),
                "{label}：journal 零字节"
            );
            let error = result.expect_err(label);
            assert_eq!(
                error.code(),
                "invalid_config",
                "{label} 须以具名错误拒绝，实得 {error:?}"
            );
        }

        // 对照：闭集内的配置照常起 leg。
        let h = harness("r2-ok");
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        assert!(result.is_ok(), "对照必须能起：{result:?}");
        assert_eq!(spawns, 1);
    }

    /// R3：prompt 的 trim 非空与容量门先于 `user_prompted` append。
    #[test]
    fn counterexample_prompt_gate_runs_before_the_user_prompted_append() {
        let h = harness("r3-prompt");
        let (host, _, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-ok"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(0, Some(0.0)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读 journal");
        let records_before = host.records().len();

        // 「字」是 3 UTF-8 bytes：50,000 枚 = 150,000 bytes > 131,072 上限。
        let oversized = "字".repeat(50_000);
        for (label, request, text) in [
            ("空串", "req-empty", String::new()),
            ("全空白", "req-blank", "  \t \u{3000}\n ".to_string()),
            ("超 131072 字节", "req-huge", oversized),
        ] {
            let error = host.prompt(request, &text).expect_err(label);
            assert_eq!(
                error.code(),
                "invalid_prompt",
                "{label} 须以具名错误拒绝，实得 {error:?}"
            );
            assert_eq!(
                fs::read(&path).expect("读 journal"),
                before,
                "{label}：盘上 journal bytes 必须逐字节不变"
            );
            assert_eq!(
                host.records().len(),
                records_before,
                "{label}：内存账本也不得增长"
            );
        }

        // 对照：合法 prompt 仍走得通——上面三条不是恒红。
        host.prompt("req-ok", "合法一问").expect("合法 prompt");
        assert_eq!(
            journal_types_on_disk(&h.app_data),
            vec!["session_started", "user_prompted", "prompt_completed"]
        );
    }

    /// R4：prompt terminal 的预算真值归 Rust fold，sidecar 自报只作 parity。
    #[test]
    fn counterexample_terminal_budget_comes_from_the_rust_fold_not_the_self_report() {
        let turn = || {
            PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                turn: 1,
                counted_toward_turn_limit: true,
                usage: known_usage(0.25),
                stop_reason: TurnStopReason::Stop,
            })
        };

        // schema 合法但与 journal fold 不符的自报 budget：turns 9 / usd 7.5。
        let h = harness("r4-drift");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, Some("req-1"), turn()),
                sidecar_line(
                    3,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(9, Some(7.5)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        let error = host.prompt("req-1", "问").expect_err("自报漂移必须关 leg");
        assert_eq!(
            error,
            HostError::Protocol(ProtocolErrorCode::StateViolation),
            "逐值漂移按 state_violation 关 leg"
        );
        assert!(log.lock().expect("日志").terminated, "漂移必须回收 leg");
        let types = journal_types_on_disk(&h.app_data);
        assert_eq!(
            types.last().map(String::as_str),
            Some("session_failed"),
            "实得 {types:?}"
        );
        let text = String::from_utf8(journal_bytes(&h.app_data, "cnt-1")).expect("UTF-8");
        assert!(
            !text.contains("\"turns\":9"),
            "sidecar 自报的假 turns 不得落账"
        );
        assert!(!text.contains("7.5"), "sidecar 自报的假 usd 不得落账");

        // 对照：自报与 fold 逐值相同就照常收束，落的是 Rust 算出的那一份。
        let h = harness("r4-parity");
        let (host, _, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, Some("req-1"), turn()),
                sidecar_line(
                    3,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(1, Some(0.25)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        host.prompt("req-1", "问").expect("parity 必须放行");
        let text = String::from_utf8(journal_bytes(&h.app_data, "cnt-1")).expect("UTF-8");
        assert!(text.contains("\"turns\":1"), "落的是 Rust fold 的真值");
    }

    /// R5：decode 失败 / 意外 EOF / fault 必须先 fold + 回收 child，再抛。
    #[test]
    fn counterexample_wire_fault_folds_and_reclaims_before_throwing() {
        // (一) malformed `{`：protocol 族，落 session_failed 并回收 child。
        let h = harness("r5-malformed");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                Scripted::Line(b"{".to_vec()),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        let error = host.prompt("req-1", "问").expect_err("坏包必须失败");
        assert!(matches!(error, HostError::Protocol(_)), "实得 {error:?}");
        assert!(
            log.lock().expect("日志").terminated,
            "fault 必须先回收 child 再抛"
        );
        let types = journal_types_on_disk(&h.app_data);
        assert_eq!(
            types.last().map(String::as_str),
            Some("session_failed"),
            "session 必须有 durable terminal，实得 {types:?}"
        );
        drop(host);

        // (二) 意外 EOF：走 crash fold，落 leg 终态并回收 child。
        let h = harness("r5-eof");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                Scripted::Eof,
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        let error = host.prompt("req-1", "问").expect_err("EOF 必须失败");
        assert_eq!(error, HostError::Process(ProcessFault::UnexpectedEof));
        assert!(
            log.lock().expect("日志").terminated,
            "EOF 也必须先回收 child 再抛"
        );
        let types = journal_types_on_disk(&h.app_data);
        assert_eq!(
            types.last().map(String::as_str),
            Some("session_interrupted"),
            "已 durable 的 journal 必须先 fold，实得 {types:?}"
        );
    }

    /// R6：shutdown 出口如实——只有 deadline 内 EOF + exit 0 才是 `session_completed`。
    #[test]
    fn counterexample_shutdown_exit_status_is_reported_truthfully() {
        let shutdown_leg = || {
            VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(2, None, PacketPayload::Terminal(Terminal::Shutdown)),
                Scripted::Eof,
            ])
        };

        for (label, exit, expected_code) in [
            ("exit 7", ExitOutcome::Code(7), "nonzero_exit"),
            ("SIGTERM", ExitOutcome::Signal(libc::SIGTERM), "signal"),
        ] {
            let h = harness("r6-exit");
            let (host, _, _) =
                start_probe(&h, h.config.clone(), vec![shutdown_leg()], exit, &FixedKey);
            let mut host = host.expect("启动成功");
            let error = host.shutdown().expect_err(label);
            assert_eq!(
                error.code(),
                "runtime",
                "{label} 须以 runtime 族具名，实得 {error:?}"
            );
            let types = journal_types_on_disk(&h.app_data);
            assert_eq!(
                types.last().map(String::as_str),
                Some("session_failed"),
                "{label} 不得落 session_completed，实得 {types:?}"
            );
            let text = String::from_utf8(journal_bytes(&h.app_data, "cnt-1")).expect("UTF-8");
            assert!(
                text.contains(&format!("\"code\":\"{expected_code}\"")),
                "{label} 的 runtime cause 必须具名为 {expected_code}"
            );
            assert!(
                !text.contains("session_completed"),
                "{label} 不得同时留下 completed"
            );
        }

        // 对照：EOF + exit 0 仍落 session_completed——上面两条不是恒红。
        let h = harness("r6-clean");
        let (host, _, _) = start_probe(
            &h,
            h.config.clone(),
            vec![shutdown_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        host.shutdown().expect("干净收束");
        assert_eq!(
            journal_types_on_disk(&h.app_data)
                .last()
                .map(String::as_str),
            Some("session_completed")
        );
    }

    /// R7：`session_resumed` 的 prior 三值逐值等于前序 journal fold。
    #[test]
    fn counterexample_resume_checks_every_prior_value_against_the_preceding_fold() {
        let h = harness("r7-prior");
        let (host, _, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                        turn: 1,
                        counted_toward_turn_limit: true,
                        usage: known_usage(0.25),
                        stop_reason: TurnStopReason::Stop,
                    }),
                ),
                sidecar_line(
                    3,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(1, Some(0.25)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动成功");
        host.prompt("req-1", "问").expect("第一枚 prompt");
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        drop(host);

        // 起第二 leg 落 `session_resumed`，再干净收束，取得可复现的 pristine bytes。
        let (resumed, _, _) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut resumed = resumed.expect("resume 成功");
        resumed
            .reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        drop(resumed);

        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let pristine = fs::read_to_string(&path).expect("读 journal");
        assert!(
            pristine.contains("\"priorObservedTurns\":1,\"priorTurns\":1,\"priorUsd\":0.25"),
            "对照：写下的 prior 三值确实来自 fold"
        );

        for (label, from, to) in [
            ("priorTurns 1→0", "\"priorTurns\":1", "\"priorTurns\":0"),
            (
                "priorObservedTurns 1→9",
                "\"priorObservedTurns\":1",
                "\"priorObservedTurns\":9",
            ),
            ("priorUsd 0.25→0", "\"priorUsd\":0.25", "\"priorUsd\":0"),
            (
                "priorUsd 0.25→null",
                "\"priorUsd\":0.25",
                "\"priorUsd\":null",
            ),
        ] {
            fs::write(&path, pristine.replacen(from, to, 1)).expect("写变异 journal");
            let (result, _, spawns) = start_probe(
                &h,
                h.config.clone(),
                Vec::new(),
                ExitOutcome::Code(0),
                &FixedKey,
            );
            let error = result.expect_err(label);
            assert!(
                matches!(error, HostError::Journal(_)),
                "{label} 须被 validator 拒，实得 {error:?}"
            );
            assert_eq!(spawns, 0, "{label} 必须在 spawn 之前拒");
        }

        // 对照：还原后仍能起下一 leg——上面四枚不是恒红。
        fs::write(&path, &pristine).expect("还原 journal");
        let (ok, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        assert!(ok.is_ok(), "对照：未篡改必须能起下一 leg：{ok:?}");
        assert_eq!(spawns, 1);
    }

    /// R8：同一 logical session 由 OS 级独占 advisory lock 保证单写者。
    #[test]
    fn counterexample_a_second_host_on_a_live_session_is_refused_as_session_active() {
        let h = harness("r8-single-writer");
        let mut config = h.config.clone();
        // 与其余测试的 `cnt-1` 分开：单写者判定不得被同进程别的用例带偏。
        config.container_id = "cnt-r8".to_string();

        let (first, _, _) = start_probe(
            &h,
            config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let first = first.expect("第一枚 Host 启动");
        let path = journal_path(&h.app_data, "cnt-r8", "sess-1");
        let before = fs::read(&path).expect("读 journal");

        let (second, _, spawns) = start_probe(
            &h,
            config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let error = second.expect_err("同一 live session 的第二 Host 必须被拒");
        assert_eq!(
            error.code(),
            "session_active",
            "须以具名 session_active 拒，实得 {error:?}"
        );
        assert_eq!(spawns, 0, "被拒的 Host 零 spawn");
        assert_eq!(
            fs::read(&path).expect("读 journal"),
            before,
            "被拒的 Host 零 journal 变化"
        );

        // `delete_container` 的 active 判定与该锁同源，不得双真源。
        assert_eq!(
            PiLoopHost::delete_container(&h.app_data, "cnt-r8"),
            Err(HostError::ContainerActive)
        );

        // 对照：第一枚交出锁之后，下一枚能起。
        drop(first);
        let (third, _, spawns) = start_probe(
            &h,
            config,
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        assert!(third.is_ok(), "锁释放后必须能起新 leg：{third:?}");
        assert_eq!(spawns, 1);
    }

    // ── D1 覆盖自证（PI-HOST-LOOP-1R3 §二 D1）────────────────────────────────
    //
    // 1R 与 1R2 两轮都按验收报告点名的实例逐条补门，于是每轮都由下一位验收者在同一族里
    // 找到另一枚：C2 补了 `maxTurns/maxUsd/modelId`（1R 报告点的三项），而同批冻结的
    // `caseRoot ≤4096`、`apiKey ≤8192` 无人管，1R2 复验一试即中。本节改按族收口——
    // 手写冻结清单持有整个闭集，并与源码扫描**双向**核对：
    //
    //   ① 清单每行都有 pre-journal/pre-spawn 红例，每例双轴断言（具名外观 + 零副作用）；
    //   ② 清账表登记四模块生产段每一处受验门消费点，新增一道门而不补表即红。
    //
    // 期望侧一律手写字面量：判据名、拒绝 code、消费点归属都不从被测结构或 encoder 派生
    // （承在案判例「被测物不得给自己出考卷」）。
    //
    // 1R4 §零补正：1R3 的扫描轴选了**语法标记**（`MAX_*` 常量），而族定义是**受验输入**。
    // SafeToken 是函数型判据、没有 `MAX_REQUEST_ID_*` 可扫，于是 prompt header 的
    // `requestId` 同时躲过清单（手写漏行）与扫描（轴上不可见）——撤掉它的 production 门，
    // 清单、ledger 与既有 prompt 常驻全部继续绿。本轮把扫描谓词改成与族同宽：
    //
    //   ③ 扫描面 = `MAX_*` 冻结常量 ∪ 函数型格式判据（`is_safe_token` /
    //      `is_safe_container_token` / `is_absolute_path_shape` / `trim_non_empty`）；
    //   ④ 清单与 `pi_loop.rs` 生产段的前置门在 `(site, judgment)` 粒度上**一一对应**——
    //      只按判据名核对撑不住：同一枚 `is_safe_token` 住在两处，撤一处另一处会替它顶名。

    struct ScriptedKey(&'static str, usize);
    impl CredentialPort for ScriptedKey {
        fn resolve(&self) -> Result<String, HostError> {
            Ok(self.0.repeat(self.1))
        }
    }

    /// 一枚 `StartConfig` 反例：标签 + 只改被判那一项的变异。
    type ConfigCounterexample = (&'static str, fn(&mut StartConfig));
    /// 一枚文本反例：标签 + 现造文本（超限串太长，不适合写成 `&'static str` 字面量）。
    type TextCounterexample = (&'static str, fn() -> String);

    /// 清单行的驱动方式。四种入口对应四条时序，双轴断言各自不同。
    enum BoundedProbe {
        /// 纯 `StartConfig` 入参：双轴＝`spawns == 0` 且 app-data 下压根没有 journal 树。
        Config(Vec<ConfigCounterexample>),
        /// 凭证解析结果：同双轴，错值由注入的 `CredentialPort` 给出（单元串 × 重复次数）。
        Credential(Vec<(&'static str, &'static str, usize)>),
        /// 已起 leg 之后的 prompt 文本：三轴＝盘上 journal bytes、内存账本与出包数全不变。
        Prompt(Vec<TextCounterexample>),
        /// 已起 leg 之后的 prompt header `requestId`：文本恒合法，判的只有 header 那一枚。
        /// 三轴同 `Prompt`——`user_prompted` 不许 durable，出包一枚都不许发。
        RequestId(Vec<TextCounterexample>),
    }

    /// 手写冻结清单：输入名 → 生产段消费点（`pi_loop.rs` 内的函数名）→ 判据名（常量或
    /// 格式函数）→ 具名拒绝 code。
    ///
    /// `site` 是 1R4 新增的**源码锚点**：清单行与生产段消费点在
    /// `(pi_loop.rs, site, judgment)` 这一粒度上双向一一对应。只按判据名核对撑不住——
    /// `is_safe_token` 同时住在 `start_inner`（grantId）与 `prompt`（requestId），
    /// 撤掉后者时前者会替它把名字对上（1R3 复验的假绿正是这一形）。
    struct BoundedInput {
        input: &'static str,
        site: &'static str,
        judgments: &'static [&'static str],
        code: &'static str,
        probe: BoundedProbe,
    }

    fn bounded_input_manifest() -> Vec<BoundedInput> {
        vec![
            BoundedInput {
                input: "containerId",
                site: "start_inner",
                judgments: &["is_safe_container_token"],
                code: "invalid_ref",
                probe: BoundedProbe::Config(vec![
                    ("空串", |config| config.container_id = String::new()),
                    ("含路径分隔符", |config| {
                        config.container_id = "cnt/1".to_string()
                    }),
                    ("129 字节", |config| config.container_id = "c".repeat(129)),
                ]),
            },
            BoundedInput {
                input: "sessionId",
                site: "start_inner",
                judgments: &["is_safe_container_token"],
                code: "invalid_ref",
                probe: BoundedProbe::Config(vec![
                    ("空串", |config| config.session_id = String::new()),
                    ("首字符非字母数字", |config| {
                        config.session_id = "-sess".to_string()
                    }),
                    ("129 字节", |config| config.session_id = "s".repeat(129)),
                ]),
            },
            BoundedInput {
                input: "grantId",
                site: "start_inner",
                judgments: &["is_safe_token"],
                code: "invalid_ref",
                probe: BoundedProbe::Config(vec![
                    ("空串", |config| config.grant_id = String::new()),
                    ("含空格", |config| {
                        config.grant_id = "grant 1".to_string()
                    }),
                    ("129 字节", |config| config.grant_id = "g".repeat(129)),
                ]),
            },
            // ADR-022 六-B.1 的 SafeToken 七成员里，`requestId` 是 prompt 公共 header 上
            // 那一枚。1R3 的清单只列了 start 侧三枚，扫描轴又只认 `MAX_*`——SafeToken
            // 是函数型判据、没有 `MAX_REQUEST_ID_*` 可扫，于是它同时躲过两道自证。
            // production 门当时就在（`prompt` 的第二道），但撤掉它整套证据全绿：
            // 「今天恰有一道门」不等于「族被自证覆盖」。
            BoundedInput {
                input: "prompt.requestId",
                site: "prompt",
                judgments: &["is_safe_token"],
                code: "invalid_ref",
                probe: BoundedProbe::RequestId(vec![
                    ("129 字符", || "r".repeat(129)),
                    ("非法字符", || "bad/id".to_string()),
                ]),
            },
            BoundedInput {
                input: "limits.maxTurns",
                site: "validate_start_config",
                judgments: &["MAX_TURNS_LIMIT"],
                code: "invalid_config",
                probe: BoundedProbe::Config(vec![
                    ("0", |config| config.max_turns = 0),
                    ("13", |config| config.max_turns = 13),
                ]),
            },
            BoundedInput {
                input: "limits.maxUsd",
                site: "validate_start_config",
                judgments: &["MAX_USD_LIMIT"],
                code: "invalid_config",
                probe: BoundedProbe::Config(vec![
                    ("0", |config| config.max_usd = Some(0.0)),
                    ("负数", |config| config.max_usd = Some(-1.0)),
                    ("非有限", |config| config.max_usd = Some(f64::NAN)),
                    ("100001", |config| config.max_usd = Some(100_001.0)),
                ]),
            },
            BoundedInput {
                input: "provider.modelId",
                site: "validate_start_config",
                judgments: &["MAX_MODEL_ID_BYTES", "trim_non_empty", "is_nul_free"],
                code: "invalid_config",
                probe: BoundedProbe::Config(vec![
                    ("空串", |config| config.model_id = String::new()),
                    ("全空白", |config| config.model_id = " \t ".to_string()),
                    ("257 字节", |config| config.model_id = "m".repeat(257)),
                    // 1R5 §零裁定一：NUL 归 host 前置。未前置时这一枚会先落 durable
                    // `session_started` 并 spawn 一枚进程，最后才由 bootstrap encoder 拒。
                    ("含 NUL", |config| config.model_id = "m\u{0}x".to_string()),
                ]),
            },
            BoundedInput {
                input: "caseRoot",
                site: "validate_start_config",
                judgments: &["MAX_CASE_ROOT_BYTES", "non_empty", "is_nul_free"],
                code: "invalid_config",
                probe: BoundedProbe::Config(vec![
                    ("空串", |config| config.case_root = PathBuf::from("")),
                    ("4097 字节", |config| {
                        config.case_root = PathBuf::from(format!("/{}", "a".repeat(4096)))
                    }),
                    // 未前置时它以 `case_root("案件根不可 lstat")` 收场——拿文件系统外观
                    // 代替配置门，与 1R2 复验里 4097 字节案件根同病。
                    ("含 NUL", |config| {
                        config.case_root = PathBuf::from("/案卷\u{0}x")
                    }),
                ]),
            },
            BoundedInput {
                input: "caseRoot 绝对形状",
                site: "validate_start_config",
                judgments: &["is_absolute_path_shape"],
                code: "invalid_config",
                probe: BoundedProbe::Config(vec![
                    ("相对路径", |config| {
                        config.case_root = PathBuf::from("案卷/相对")
                    }),
                    ("单段相对名", |config| {
                        config.case_root = PathBuf::from("案卷")
                    }),
                ]),
            },
            BoundedInput {
                input: "provider.apiKey",
                site: "validate_api_key",
                judgments: &["MAX_API_KEY_BYTES", "trim_non_empty", "is_nul_free"],
                code: "invalid_config",
                probe: BoundedProbe::Credential(vec![
                    ("空串", "", 1),
                    ("全空白", " \t ", 1),
                    ("8193 字节", "k", 8193),
                    ("含 NUL", "k\u{0}x", 1),
                ]),
            },
            BoundedInput {
                input: "prompt.text",
                site: "prompt",
                judgments: &["MAX_TEXT_BYTES", "trim_non_empty", "is_nul_free"],
                code: "invalid_prompt",
                probe: BoundedProbe::Prompt(vec![
                    ("空串", String::new),
                    ("全空白", || "  \t \u{3000}\n ".to_string()),
                    // 「字」是 3 UTF-8 bytes：50,000 枚 = 150,000 bytes > 131,072 上限。
                    ("超 131072 字节", || "字".repeat(50_000)),
                    // 未前置时它先落 durable `user_prompted`、占掉 requestId，
                    // 最后才由 prompt encoder 拒（1R4 复验第三行）。
                    ("含 NUL", || "p\u{0}x".to_string()),
                ]),
            },
        ]
    }

    /// 零副作用的容器侧判据：非法输入连 journal 树都不许建出来。
    /// 比「`cnt-1/sess-1` 那一枚文件不存在」更紧——containerId/sessionId 被变异时，
    /// 按固定坐标去看的那条断言本来就恒真，等于没判。
    fn journal_tree_exists(app_data: &Path) -> bool {
        app_data.join(PI_LOOP_DIR).exists()
    }

    /// 已起 leg 之后的 prompt 族反例驱动：具名 code ＋ **三轴**零副作用——盘上 journal
    /// bytes 逐字节不变、内存账本不增、出包一枚不发。`shape` 决定这一行把生成串放进
    /// header `requestId` 还是正文，另一枚恒取合法值，于是被判的永远只有一枚输入。
    fn prompt_axis_probe(
        tag: &str,
        row: &BoundedInput,
        cases: &[TextCounterexample],
        shape: impl Fn(usize, &str) -> (String, String),
    ) {
        let h = harness(tag);
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(1, vec![WorkspaceCapability::CaseRead]),
                sidecar_line(
                    2,
                    Some("req-ok"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(0, Some(0.0)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("prompt 清单驱动前须先起 leg");
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读 journal");
        let records_before = host.records().len();
        let writes_before = log.lock().expect("日志未中毒").written.len();
        for (index, (label, make)) in cases.iter().enumerate() {
            let (request_id, text) = shape(index, &make());
            let error = host
                .prompt(&request_id, &text)
                .expect_err(&format!("{}/{label} 必须被拒", row.input));
            assert_eq!(
                error.code(),
                row.code,
                "{}/{label} 须以 {} 拒绝，实得 {error:?}",
                row.input,
                row.code
            );
            assert_eq!(
                fs::read(&path).expect("读 journal"),
                before,
                "{}/{label}：盘上 journal bytes 必须逐字节不变",
                row.input
            );
            assert_eq!(
                host.records().len(),
                records_before,
                "{}/{label}：内存账本也不得增长",
                row.input
            );
            assert_eq!(
                log.lock().expect("日志未中毒").written.len(),
                writes_before,
                "{}/{label}：拒绝须先于发包，出包一枚都不许多",
                row.input
            );
            // 第四轴（1R5）：被拒的这一轮不得占掉 requestId。1R4 复验实测：含 NUL 的
            // prompt 先落 durable `user_prompted`，requestId 就此被去重集吃掉，同一枚
            // 再也用不了——「先污染后拒绝」在这一族上的具体形态。
            assert!(
                !host.projection.request_ids.contains(request_id.as_str()),
                "{}/{label}：requestId 不得被占用",
                row.input
            );
        }
        host.prompt("req-ok", "合法一问")
            .expect("对照：合法 prompt 仍走得通");
    }

    /// ① 清单每行都在 journal append 与 spawn 之前以具名 code 拒绝，且零副作用。
    #[test]
    fn counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn() {
        for row in bounded_input_manifest() {
            match &row.probe {
                BoundedProbe::Config(cases) => {
                    for (label, mutate) in cases {
                        let h = harness("d1-config");
                        let mut config = h.config.clone();
                        mutate(&mut config);
                        let (result, _, spawns) = start_probe(
                            &h,
                            config,
                            vec![ready_leg()],
                            ExitOutcome::Code(0),
                            &FixedKey,
                        );
                        assert_eq!(spawns, 0, "{}/{label}：spawn 计数恰 0", row.input);
                        assert!(
                            !journal_tree_exists(&h.app_data),
                            "{}/{label}：app-data 下不得留下任何 journal",
                            row.input
                        );
                        let error = result.expect_err(&format!("{}/{label} 必须被拒", row.input));
                        assert_eq!(
                            error.code(),
                            row.code,
                            "{}/{label} 须以 {} 拒绝，实得 {error:?}",
                            row.input,
                            row.code
                        );
                    }
                }
                BoundedProbe::Credential(cases) => {
                    for (label, unit, times) in cases {
                        let h = harness("d1-credential");
                        let (result, _, spawns) = start_probe(
                            &h,
                            h.config.clone(),
                            vec![ready_leg()],
                            ExitOutcome::Code(0),
                            &ScriptedKey(unit, *times),
                        );
                        assert_eq!(spawns, 0, "{}/{label}：spawn 计数恰 0", row.input);
                        assert!(
                            !journal_tree_exists(&h.app_data),
                            "{}/{label}：app-data 下不得留下任何 journal",
                            row.input
                        );
                        let error = result.expect_err(&format!("{}/{label} 必须被拒", row.input));
                        assert_eq!(
                            error.code(),
                            row.code,
                            "{}/{label} 须以 {} 拒绝，实得 {error:?}",
                            row.input,
                            row.code
                        );
                    }
                }
                BoundedProbe::Prompt(cases) => {
                    // 变的是文本，requestId 恒合法。
                    prompt_axis_probe("d1-prompt-text", &row, cases, |index, text| {
                        (format!("req-{index}"), text.to_string())
                    });
                }
                BoundedProbe::RequestId(cases) => {
                    // 变的是 header requestId，文本恒合法——被判的只剩 header 那一枚。
                    prompt_axis_probe("d1-prompt-request", &row, cases, |_index, request_id| {
                        (request_id.to_string(), "合法一问".to_string())
                    });
                }
            }
        }

        // 对照：闭集内的配置 + 闭集内的 key 照常起 leg——上面全部行都不是恒红。
        let h = harness("d1-ok");
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &ScriptedKey("k", 8192),
        );
        assert!(result.is_ok(), "对照必须能起：{result:?}");
        assert_eq!(spawns, 1);
    }

    // ── ③ SafeToken 七成员清账（1R4 E1.3）──────────────────────────────────────
    //
    // ADR-022 六-B.1 明列七枚共用 `SafeToken` 的 ID。1R3 的 D1 清单只收了「今天恰有一道
    // 门、且那道门带 `MAX_*` 常量」的那几枚，于是 `requestId` 整枚失踪。族一旦按 ADR 定义，
    // 全员就必须逐行有交代：要么是 host 方向受验输入（那就得在 D1 清单里指名有行），
    // 要么是宿主自产／反方向校验（那就得写明理由）。不省行——省掉的那一行正是下一位
    // 验收者要找的东西（承 D3 体例）。

    /// 一枚 SafeToken 成员的归属。
    struct SafeTokenMember {
        member: &'static str,
        disposition: SafeTokenDisposition,
    }

    enum SafeTokenDisposition {
        /// host 方向受验输入：指名 D1 清单里前置了它的那一行。
        HostInput(&'static str),
        /// 不走 host 方向前置门，附具名理由。禁止空理由、禁止省行。
        NoHostGate(&'static str),
    }

    /// ADR-022 六-B.1 冻结的七成员。手写字面量，不从任何被测结构派生。
    const ADR_SAFE_TOKEN_MEMBERS: [&str; 7] = [
        "containerId",
        "grantId",
        "sessionId",
        "requestId",
        "operationId",
        "eventId",
        "toolCallId",
    ];

    /// 七成员之外，另两条 host→sidecar 出包上「requestId 现状」的理由行。
    const SAFE_TOKEN_REUSE_ROWS: [&str; 2] = ["cancel.requestId", "shutdown.requestId"];

    fn safe_token_ledger() -> Vec<SafeTokenMember> {
        vec![
            SafeTokenMember {
                member: "containerId",
                disposition: SafeTokenDisposition::HostInput("containerId"),
            },
            SafeTokenMember {
                member: "sessionId",
                disposition: SafeTokenDisposition::HostInput("sessionId"),
            },
            SafeTokenMember {
                member: "grantId",
                disposition: SafeTokenDisposition::HostInput("grantId"),
            },
            SafeTokenMember {
                member: "requestId",
                disposition: SafeTokenDisposition::HostInput("prompt.requestId"),
            },
            SafeTokenMember {
                member: "operationId",
                disposition: SafeTokenDisposition::NoHostGate(
                    "只出现在入站 `host_request` 的 header，由 sidecar 生成、宿主 decode 时经 \
                     `read_safe_token` 收口；同名字段的 host 方向出现在出站 `host_result`，\
                     而本票 ready capability 恰 ['case_read']、宿主一枚都不生成\
                     （前向债已挂 PI-WRITE-HOST-1）",
                ),
            },
            SafeTokenMember {
                member: "eventId",
                disposition: SafeTokenDisposition::NoHostGate(
                    "journal envelope 字段，宿主按 `event_{seq}` 自产、读回时逐值复核；\
                     从不由外部输入，也不进 host→sidecar 出包",
                ),
            },
            SafeTokenMember {
                member: "toolCallId",
                disposition: SafeTokenDisposition::NoHostGate(
                    "只出现在入站 `agent_event` 的 tool 事件，方向是 sidecar→host，\
                     由 decoder 的 `read_safe_token` 收口",
                ),
            },
            SafeTokenMember {
                member: "cancel.requestId",
                disposition: SafeTokenDisposition::NoHostGate(
                    "`cancel` 出包复用 `active_request`——那一枚 requestId 已在 `prompt` 的前置门\
                     过关并落 durable；另立一道门不会更紧，只会多一份可漂移的真源",
                ),
            },
            SafeTokenMember {
                member: "shutdown.requestId",
                disposition: SafeTokenDisposition::NoHostGate(
                    "`shutdown` 出包的 requestId 恒为 null（无 request 归属），没有可判的 SafeToken",
                ),
            },
        ]
    }

    /// ③ 七成员全员在册，且「host 方向受验输入」这一档必须真落在 D1 清单上。
    ///
    /// 这一道把 ADR 的族定义与 D1 清单接起来：清单又由 ②（`(site, judgment)` 双向锁）
    /// 接到生产段消费点。三段接完，「ADR 说是一族」到「源码里真有那道门」才闭合。
    #[test]
    fn safe_token_family_is_fully_accounted_for() {
        let ledger = safe_token_ledger();
        let manifest = bounded_input_manifest();

        for member in ADR_SAFE_TOKEN_MEMBERS {
            assert_eq!(
                ledger.iter().filter(|row| row.member == member).count(),
                1,
                "ADR-022 六-B.1 的 SafeToken 成员 {member} 必须在清账表里恰有一行"
            );
        }

        for row in &ledger {
            assert!(
                ADR_SAFE_TOKEN_MEMBERS.contains(&row.member)
                    || SAFE_TOKEN_REUSE_ROWS.contains(&row.member),
                "{} 既不是 ADR 七成员，也不在冻结的两条理由行里",
                row.member
            );
            match &row.disposition {
                SafeTokenDisposition::HostInput(input) => {
                    let listed = manifest
                        .iter()
                        .find(|entry| entry.input == *input)
                        .unwrap_or_else(|| {
                            panic!(
                                "{} 声称由 D1 清单行 {input} 前置，清单里却没有这一行",
                                row.member
                            )
                        });
                    assert!(
                        listed.judgments.contains(&"is_safe_token")
                            || listed.judgments.contains(&"is_safe_container_token"),
                        "{} 指向的清单行 {input} 判据不是 SafeToken 形状：{:?}",
                        row.member,
                        listed.judgments
                    );
                    assert_eq!(
                        listed.code, "invalid_ref",
                        "{} 指向的清单行 {input} 拒绝 code 必须是 invalid_ref",
                        row.member
                    );
                }
                SafeTokenDisposition::NoHostGate(reason) => {
                    assert!(
                        !reason.trim().is_empty(),
                        "{} 登记为不适用 host 前置门，却没写理由",
                        row.member
                    );
                }
            }
        }

        // 计数冻结：四枚 host 方向受验输入 + 五条理由行（三枚成员 + 两条现状）。
        let host_inputs = ledger
            .iter()
            .filter(|row| matches!(row.disposition, SafeTokenDisposition::HostInput(_)))
            .count();
        assert_eq!(host_inputs, 4, "host 方向受验输入行数");
        assert_eq!(ledger.len() - host_inputs, 5, "不适用另门的理由行数");
    }

    /// 清账表①行：一处**受验门**消费点。
    ///
    /// 1R4 §零把族定义从「语法标记」改回「受验输入」：`judgment` 既可以是 `MAX_*` 冻结常量，
    /// 也可以是 `is_safe_token` 这类格式函数或 `trim_non_empty` 这类非空门。1R3 的扫描轴
    /// 只认前者，于是 SafeToken 家族整体不可见——`requestId` 同时躲过手写清单与源码扫描。
    struct BoundedJudgmentUse {
        module: &'static str,
        function: &'static str,
        judgment: &'static str,
        /// `host→sidecar` / `sidecar→host` / `journal` / `内部`。
        direction: &'static str,
        consumption: Consumption,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum Consumption {
        /// 属 D1 前置闭集：必须在清单里有同名判据行，且在 `pi_loop.rs` 生产段有前置消费点。
        /// 落在 `pi_loop.rs` 的 Fronted 行还须与清单在 `(site, judgment)` 粒度上一一对应。
        Fronted,
        /// 不属前置闭集，附具名理由。禁止空行、禁止省略。
        Other(&'static str),
    }

    fn bounded_judgment_ledger() -> Vec<BoundedJudgmentUse> {
        let host_outbound_unused = Consumption::Other(
            "host_result 是 host→sidecar 出包，但本票 ready capability 恰 ['case_read']，\
             宿主一枚都不生成；PI-WRITE-HOST-1 开工时须连同前置门一并补",
        );
        // 判据函数自身的签名行也落在扫描面内。扫描器不做「这行是定义、跳过它」的聪明省略——
        // 扫描器侧每加一条过滤就多一个藏身处（1R4 §零）。定义行改由本表具名登记。
        let predicate_definition =
            Consumption::Other("判据函数自身的定义签名行，不是任何输入的消费点");
        vec![
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "prompt",
                judgment: "MAX_TEXT_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_api_key",
                judgment: "MAX_API_KEY_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "MAX_CASE_ROOT_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "MAX_MODEL_ID_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "MAX_TURNS_LIMIT",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "MAX_USD_LIMIT",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "decode_record",
                judgment: "MAX_SAFE_INTEGER",
                direction: "journal",
                consumption: Consumption::Other("journal record 的 seq/ts 整数上界，不进 wire"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "now_millis",
                judgment: "MAX_SAFE_INTEGER",
                direction: "journal",
                consumption: Consumption::Other("落账时钟读数封顶，不进 wire"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_payload",
                judgment: "MAX_SAFE_INTEGER",
                direction: "journal",
                consumption: Consumption::Other("journal payload 的整数字段上界，不进 wire"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_payload",
                judgment: "MAX_TEXT_BYTES",
                direction: "journal",
                consumption: Consumption::Other(
                    "读回既有 journal 的 user_prompted 文本；写入侧的同一上界由 `prompt` 前置",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_session_resumed",
                judgment: "MAX_SAFE_INTEGER",
                direction: "journal",
                consumption: Consumption::Other("resume 三值读回时的整数上界，不进 wire"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_terminal_error",
                judgment: "MAX_TERMINAL_MESSAGE_BYTES",
                direction: "journal",
                consumption: Consumption::Other("终态文案取自冻结表，读回时复核长度"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_process.rs",
                function: "attach",
                judgment: "MAX_PACKET_BYTES",
                direction: "sidecar→host",
                consumption: Consumption::Other("child stdout 读行的 framing 上界，不绑单一输入"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_process.rs",
                function: "read_artifact",
                judgment: "MAX_SAFE_INTEGER",
                direction: "内部",
                consumption: Consumption::Other("route manifest 的 bytes 字段整数上界"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "decode_packet_line",
                judgment: "MAX_PACKET_BYTES",
                direction: "内部",
                consumption: Consumption::Other("双向共用的 framing 上界，先于任何解析"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "decode_packet_node",
                judgment: "MAX_SAFE_INTEGER",
                direction: "内部",
                consumption: Consumption::Other("packet 信封 seq 的整数上界，由宿主自增产出"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "encode_packet_line",
                judgment: "MAX_PACKET_BYTES",
                direction: "内部",
                consumption: Consumption::Other(
                    "按编码后实际字节复核 framing；它判的是成品行长度，不是某一枚入参",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_agent_event_payload",
                judgment: "MAX_DELTA_BYTES",
                direction: "sidecar→host",
                consumption: Consumption::Other("只辖入站 agent_event 解码"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_agent_event_payload",
                judgment: "MAX_SAFE_INTEGER",
                direction: "sidecar→host",
                consumption: Consumption::Other("只辖入站 agent_event 解码"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_API_KEY_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_CASE_ROOT_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_MODEL_ID_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_SAFE_INTEGER",
                direction: "host→sidecar",
                consumption: Consumption::Other(
                    "resume 的 leg/priorObservedTurns/priorTurns 由本 journal 的 fold 产出，\
                     不是入参；读回侧已由 journal decode 的同一上界收口",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_TURNS_LIMIT",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "MAX_USD_LIMIT",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_budget_view",
                judgment: "MAX_SAFE_INTEGER",
                direction: "sidecar→host",
                consumption: Consumption::Other("只辖入站 budget 自报值解码"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_host_result_payload",
                judgment: "MAX_HOST_ERROR_MESSAGE_BYTES",
                direction: "host→sidecar",
                consumption: host_outbound_unused,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_host_result_payload",
                judgment: "MAX_LIST_ENTRIES",
                direction: "host→sidecar",
                consumption: host_outbound_unused,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_host_result_payload",
                judgment: "MAX_TEXT_BYTES",
                direction: "host→sidecar",
                consumption: host_outbound_unused,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_integer",
                judgment: "MAX_SAFE_INTEGER",
                direction: "内部",
                consumption: Consumption::Other("通用整数读取器的安全整数封顶，双向共用"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_list_entry",
                judgment: "MAX_SEGMENT_BYTES",
                direction: "host→sidecar",
                consumption: host_outbound_unused,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_logical_path",
                judgment: "MAX_LOGICAL_PATH_BYTES",
                direction: "内部",
                consumption: Consumption::Other(
                    "logicalPath 同时出现在入站 host_request 与出站 host_result；\
                     本票不生成 host_result，入站侧由 decoder 直接收口",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_nullable_integer",
                judgment: "MAX_SAFE_INTEGER",
                direction: "内部",
                consumption: Consumption::Other("通用可空整数读取器，双向共用"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_prompt_payload",
                judgment: "MAX_TEXT_BYTES",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_protocol_error_payload",
                judgment: "MAX_TERMINAL_MESSAGE_BYTES",
                direction: "sidecar→host",
                consumption: Consumption::Other("只辖入站 protocol_error 解码"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_terminal_payload",
                judgment: "MAX_TERMINAL_MESSAGE_BYTES",
                direction: "sidecar→host",
                consumption: Consumption::Other("只辖入站 terminal 解码"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_write_arguments",
                judgment: "MAX_TEXT_BYTES",
                direction: "sidecar→host",
                consumption: Consumption::Other(
                    "只辖入站 host_request 的 workspace_write arguments；本票 capability 不含它",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "scan_array",
                judgment: "MAX_JSON_DEPTH",
                direction: "内部",
                consumption: Consumption::Other("JSON 扫描器的嵌套深度上限，双向共用"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "scan_object",
                judgment: "MAX_JSON_DEPTH",
                direction: "内部",
                consumption: Consumption::Other("JSON 扫描器的嵌套深度上限，双向共用"),
            },
            // ── 函数型判据（1R4 E1.2）───────────────────────────────────────────
            //
            // SafeToken 没有 `MAX_REQUEST_ID_*` 可扫，1R3 的常量轴因此看不见整个家族。
            // 下面这一段与上面的常量段共用同一枚扫描器、同一条生产段边界、同一道
            // 「扫描集 == 清账表」等式：族按受验输入定义，语法标记只是它的投影。
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "start_inner",
                judgment: "is_safe_container_token",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "start_inner",
                judgment: "is_safe_token",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "is_absolute_path_shape",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "trim_non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_api_key",
                judgment: "trim_non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "prompt",
                judgment: "is_safe_token",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "prompt",
                judgment: "trim_non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            // ── NUL 前置（1R5 §零裁定一 + G1）─────────────────────────────────
            //
            // ADR-022 六-B.1 冻结「wire 字符串不得含 NUL 或 lone surrogate」。1R4 之前
            // 这道门只住 `scan_string`：`modelId`/`apiKey` 含 NUL 先落 durable
            // `session_started` 并 spawn，prompt `text` 含 NUL 先落 `user_prompted`
            // 并占掉 requestId，最后才由 encoder 回灌 decoder 拒。四枚自由串就此前置。
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "is_nul_free",
                judgment: "is_nul_free",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "is_nul_free",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_api_key",
                judgment: "is_nul_free",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "prompt",
                judgment: "is_nul_free",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            // ── 裸 `.is_empty()` 非空门（1R5 G3 新轴复扫浮出）──────────────────
            //
            // 旧扫描面只认 `.trim()`，于是 `caseRoot` 的非空门（`case_root.is_empty()`）
            // 既不在扫描集也不在清单里。新轴把裸 `.is_empty()` 一并收进来，四模块生产段
            // 因此浮出六处，逐处在此交代。
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "validate_start_config",
                judgment: "non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_event_id",
                judgment: "non_empty",
                direction: "journal",
                consumption: Consumption::Other(
                    "读回 journal 的 `event_{seq}` 时核数字段非空，宿主自产字段的回读复核",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "load_session_locked",
                judgment: "non_empty",
                direction: "journal",
                consumption: Consumption::Other("partial-tail 截断时跳过空行，不是输入值判据"),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "is_safe_token",
                judgment: "non_empty",
                direction: "内部",
                consumption: Consumption::Other(
                    "SafeToken 文法自带的非空分支，住在判据函数定义体内，不是独立消费点",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_non_empty_string",
                judgment: "non_empty",
                direction: "内部",
                consumption: Consumption::Other(
                    "通用非空字符串读取器，双向共用；host 方向唯一消费点是 bootstrap 的 \
                     caseRoot，其前置门在 `validate_start_config`",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "decode_packet_line",
                judgment: "non_empty",
                direction: "内部",
                consumption: Consumption::Other("空行不是 packet：framing 判据，不绑单一输入"),
            },
            // ── 派生判据函数族浮出的两枚（1R5 G3）─────────────────────────────
            //
            // 判据函数族改由签名派生后，`is_sha256_hex` 与 `is_integer_lexeme` 自动进轴。
            // 两枚都不是 host 方向的用户入参，但按「浮出即入账」逐处交代，不留给下一轮。
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "is_sha256_hex",
                judgment: "is_sha256_hex",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_sha256_hex",
                judgment: "is_sha256_hex",
                direction: "内部",
                consumption: Consumption::Other(
                    "sha256 解码器：被判的摘要由宿主自算（route manifest 与 session_started），\
                     不是任何一枚用户入参",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_process.rs",
                function: "read_artifact",
                judgment: "is_sha256_hex",
                direction: "内部",
                consumption: Consumption::Other(
                    "route manifest 的 artifact 摘要形状门；被判值取自随包冻结件，不是入参",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "is_integer_lexeme",
                judgment: "is_integer_lexeme",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_integer",
                judgment: "is_integer_lexeme",
                direction: "内部",
                consumption: Consumption::Other(
                    "JSON number lexeme 的规范形判据，双向共用；辖的是文本写法而非某一枚输入的值",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "decode_packet_node",
                judgment: "is_integer_lexeme",
                direction: "内部",
                consumption: Consumption::Other(
                    "protocolVersion 的规范整数写法判据；该字段由宿主按冻结常量自产",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "resolve",
                judgment: "trim_non_empty",
                direction: "内部",
                consumption: Consumption::Other(
                    "`KeychainCredentials::resolve` 的「存档为空视同未配置」判定，零自动回落；\
                     上 wire 的同一枚 key 由 `validate_api_key` 前置",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop.rs",
                function: "delete_container",
                judgment: "is_safe_container_token",
                direction: "内部",
                consumption: Consumption::Other(
                    "容器整删的入参门：被判的 token 只用于拼装 app-data 下的目录路径，不上 wire；\
                     同名 token 的 host→sidecar 前置门在 `start_inner`",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "is_safe_container_token",
                judgment: "is_safe_container_token",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "is_safe_container_token",
                judgment: "is_safe_token",
                direction: "内部",
                consumption: Consumption::Other(
                    "`is_safe_container_token` 是 `is_safe_token` 的同名转发定义——容器/会话目录名与\
                     wire ID 共用同一枚 SafeToken 形状；此处不判任何具体输入",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "load_session_locked",
                judgment: "is_safe_container_token",
                direction: "journal",
                consumption: Consumption::Other(
                    "journal 路径拼装前的纵深防御；同一对 token 的前置门在 `start_inner`（清单两行）",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_session_started",
                judgment: "trim_non_empty",
                direction: "journal",
                consumption: Consumption::Other(
                    "读回既有 journal 的 modelId 非空；写入侧的同一判据由 `validate_start_config` 前置",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_journal.rs",
                function: "read_payload",
                judgment: "trim_non_empty",
                direction: "journal",
                consumption: Consumption::Other(
                    "读回既有 journal 的 user_prompted 文本非空；写入侧的同一判据由 `prompt` 前置",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "is_safe_token",
                judgment: "is_safe_token",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "is_absolute_path_shape",
                judgment: "is_absolute_path_shape",
                direction: "内部",
                consumption: predicate_definition,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_safe_token",
                judgment: "is_safe_token",
                direction: "内部",
                consumption: Consumption::Other(
                    "通用 SafeToken 解码器，入站/出站共用；host 方向的每一枚具名 token 都另有前置门",
                ),
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "is_absolute_path_shape",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_bootstrap_payload",
                judgment: "trim_non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
            BoundedJudgmentUse {
                module: "pi_loop_protocol.rs",
                function: "read_prompt_payload",
                judgment: "trim_non_empty",
                direction: "host→sidecar",
                consumption: Consumption::Fronted,
            },
        ]
    }

    /// 本票四模块的生产段源码。扫描面的唯一入口，两条扫描轴共用。
    fn scanned_modules() -> [(&'static str, &'static str); 4] {
        [
            ("pi_loop.rs", include_str!("pi_loop.rs")),
            ("pi_loop_journal.rs", include_str!("pi_loop_journal.rs")),
            ("pi_loop_process.rs", include_str!("pi_loop_process.rs")),
            ("pi_loop_protocol.rs", include_str!("pi_loop_protocol.rs")),
        ]
    }

    /// 生产段边界认 `#[cfg(test)] mod` **module** 边界。
    /// 截到首个 `#[cfg(test)]` 会被 impl 内 test-only 构造器的属性提前一刀切下
    /// （PI-HOST-LOOP-1 §八.2 已就同一形状留过判例）。
    fn production_section(source: &'static str) -> &'static str {
        match source.find("#[cfg(test)]\nmod tests") {
            Some(index) => &source[..index],
            None => source,
        }
    }

    fn function_name(trimmed: &str) -> Option<String> {
        let rest = trimmed
            .strip_prefix("pub(crate) ")
            .or_else(|| trimmed.strip_prefix("pub "))
            .unwrap_or(trimmed);
        let rest = rest.strip_prefix("fn ")?;
        let end = rest.find(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))?;
        Some(rest[..end].to_string())
    }

    /// 行内出现的独立 `MAX_*` 标识符。前一个字节是标识符字符时不算（避免 `FOO_MAX_X`）。
    fn bounded_constants_in(line: &str) -> Vec<String> {
        let bytes = line.as_bytes();
        let mut found = Vec::new();
        let mut cursor = 0;
        while let Some(offset) = line[cursor..].find("MAX_") {
            let start = cursor + offset;
            let boundary = start == 0
                || !(bytes[start - 1].is_ascii_alphanumeric() || bytes[start - 1] == b'_');
            let mut end = start;
            while end < bytes.len()
                && (bytes[end].is_ascii_uppercase()
                    || bytes[end].is_ascii_digit()
                    || bytes[end] == b'_')
            {
                end += 1;
            }
            if boundary {
                found.push(line[start..end].to_string());
            }
            cursor = end.max(start + 4);
        }
        found
    }

    /// 函数型判据族**由签名派生**，不再是手写名单（1R5 §零裁定二：名字清单永久出局）。
    /// 四模块生产段里凡 `fn <name>(… : &str …) -> bool` 的自由函数即属该族——新写一枚
    /// 判据函数自动进轴，它的定义行与每一处调用点都必须在清账表里有行，漏登记即红。
    fn declared_string_predicates(sources: &[(&'static str, &'static str)]) -> Vec<String> {
        let mut names: Vec<String> = Vec::new();
        for (_, source) in sources {
            for line in production_section(source).lines() {
                let trimmed = line.trim_start();
                if trimmed.starts_with("//")
                    || !trimmed.ends_with("-> bool {")
                    || !trimmed.contains(": &str")
                {
                    continue;
                }
                if let Some(name) = function_name(trimmed) {
                    if !names.contains(&name) {
                        names.push(name);
                    }
                }
            }
        }
        names.sort();
        names
    }

    /// 派生结果的冻结对照。期望侧一律手写字面量，不由被测源码派生（承在案判例
    /// 「被测物不得给自己出考卷」）：新增或删掉一枚判据函数都要在这里同步。
    const DECLARED_STRING_PREDICATES: [&str; 6] = [
        "is_absolute_path_shape",
        "is_integer_lexeme",
        "is_nul_free",
        "is_safe_container_token",
        "is_safe_token",
        "is_sha256_hex",
    ];

    /// 「trim 后非空」与「非空」两枚判据没有可取的函数标识符，规范化成这两枚表内名。
    const TRIM_JUDGMENT: &str = "trim_non_empty";
    const NON_EMPTY_JUDGMENT: &str = "non_empty";

    /// 行内出现的函数型判据。判据名按标识符边界匹配；`.trim()` 记 `trim_non_empty`，
    /// 不带 `.trim()` 的裸 `.is_empty()` 记 `non_empty`。
    ///
    /// 认 `.trim()` 而不认 `.trim().is_empty()`：后者一旦被折行就整条看不见，而扫描器
    /// 看不见的门正是 1R3 栽的那一跤。两枚标记都**过度近似**——非门用途的 trim/is_empty
    /// 照样入扫描集，必须在清账表里以 `Other` 具名登记，不得靠收窄扫描面躲开。
    fn bounded_predicates_in(line: &str, predicates: &[String]) -> Vec<String> {
        let bytes = line.as_bytes();
        let is_ident = |byte: u8| byte.is_ascii_alphanumeric() || byte == b'_';
        let mut found = Vec::new();
        for name in predicates {
            let mut cursor = 0;
            while let Some(offset) = line[cursor..].find(name.as_str()) {
                let start = cursor + offset;
                let end = start + name.len();
                let left = start == 0 || !is_ident(bytes[start - 1]);
                let right = end >= bytes.len() || !is_ident(bytes[end]);
                if left && right {
                    found.push(name.clone());
                }
                cursor = end;
            }
        }
        if line.contains(".trim()") {
            found.push(TRIM_JUDGMENT.to_string());
        } else if line.contains(".is_empty()") {
            found.push(NON_EMPTY_JUDGMENT.to_string());
        }
        found
    }

    /// 逐行扫描生产段，产出去重并排序的 `(模块, 函数, 判据)` 三元组。判据＝`MAX_*` 冻结
    /// 常量 ∪ 函数型格式判据——族由**受验输入**定义，两类语法标记都只是它的投影（1R4 §零）。
    ///
    /// 三条扫描规则，都是为了让「谁消费了这道门」有确定含义：
    /// 1. 只记落在某枚函数体内的引用——文件头的 `use` 与 `const` 声明不是消费点；
    /// 2. 注释行整行跳过，否则本表自己的说明文字会把计数打脏；
    /// 3. 顶格 `}` 关闭当前函数，`impl` 内的方法由下一枚 `fn` 顶替。
    ///
    /// 规则之外不再加任何过滤：判据函数自身的签名行照记，由清账表具名登记为定义行。
    fn scan_bounded_judgment_uses(
        module: &'static str,
        source: &'static str,
        predicates: &[String],
    ) -> Vec<(String, String, String)> {
        let mut rows: Vec<(String, String, String)> = Vec::new();
        let mut current: Option<String> = None;
        for line in production_section(source).lines() {
            let trimmed = line.trim_start();
            if trimmed.starts_with("//") {
                continue;
            }
            if let Some(name) = function_name(trimmed) {
                current = Some(name);
            } else if line == "}" {
                current = None;
            }
            let Some(function) = current.clone() else {
                continue;
            };
            for judgment in bounded_constants_in(line)
                .into_iter()
                .chain(bounded_predicates_in(line, predicates))
            {
                let row = (module.to_string(), function.clone(), judgment);
                if !rows.contains(&row) {
                    rows.push(row);
                }
            }
        }
        rows.sort();
        rows
    }

    fn declared_bounded_constants(source: &'static str) -> Vec<String> {
        production_section(source)
            .lines()
            .filter_map(|line| line.trim_start().strip_prefix("pub(crate) const "))
            .filter(|rest| rest.starts_with("MAX_"))
            .map(|rest| rest[..rest.find(':').expect("常量声明带类型标注")].to_string())
            .collect()
    }

    /// ② 清账表与源码双向锁死：encoder 侧新增一道上界而不补表即红；生产段多出一道
    /// 清单外的受验门即红；清单行在生产段找不到同 `(函数, 判据)` 消费点也即红。
    #[test]
    fn bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound() {
        let sources = scanned_modules();
        // 判据函数族先由签名派生，再与冻结字面量核对——1R4 的三枚硬编码函数名就此出局。
        let predicates = declared_string_predicates(&sources);
        let expected_predicates: Vec<String> = DECLARED_STRING_PREDICATES
            .iter()
            .map(|name| name.to_string())
            .collect();
        assert_eq!(
            predicates, expected_predicates,
            "四模块生产段的 `&str -> bool` 判据函数族与冻结清单不符：新写一枚判据函数须同批入册"
        );
        let mut scanned = Vec::new();
        for (module, source) in sources {
            scanned.extend(scan_bounded_judgment_uses(module, source, &predicates));
        }
        scanned.sort();

        let ledger = bounded_judgment_ledger();
        let mut registered: Vec<(String, String, String)> = ledger
            .iter()
            .map(|row| {
                (
                    row.module.to_string(),
                    row.function.to_string(),
                    row.judgment.to_string(),
                )
            })
            .collect();
        registered.sort();
        assert_eq!(
            scanned, registered,
            "生产段的受验门消费点必须与清账表逐行相同：新增一道门就得同时补表并给出归属"
        );

        // 每枚冻结常量至少有一处登记消费点——声明了却无人消费，同样要显式暴露。
        for constant in declared_bounded_constants(include_str!("pi_loop_protocol.rs")) {
            assert!(
                ledger.iter().any(|row| row.judgment == constant),
                "{constant} 在清账表里没有任何消费点"
            );
        }

        // 归属为 Fronted 的判据必须同时满足两件事：清单里有同名判据行，
        // 且在 `pi_loop.rs` 生产段真有前置消费点——只在 encoder 里出现不算前置。
        let manifest = bounded_input_manifest();
        for row in &ledger {
            if row.consumption != Consumption::Fronted {
                continue;
            }
            assert!(
                manifest
                    .iter()
                    .any(|input| input.judgments.contains(&row.judgment)),
                "{} 标为前置闭集，却不在 D1 手写清单里",
                row.judgment
            );
            assert!(
                ledger
                    .iter()
                    .any(|other| other.module == "pi_loop.rs" && other.judgment == row.judgment),
                "{} 标为前置闭集，却在 pi_loop.rs 生产段没有前置消费点",
                row.judgment
            );
        }

        // ── 1R4 E1.2：清单 ↔ 生产段消费点在 `(函数, 判据)` 粒度上双向一一对应 ──────
        //
        // 只按判据名核对撑不住整个族：`is_safe_token` 同时住在 `start_inner`（grantId）与
        // `prompt`（requestId），撤掉后者时前者会替它把名字对上——1R3 复验实测的假绿正是这
        // 一形。改按 `(site, judgment)` 锚定后，撤门必然同时打掉清单行的源码锚点。

        // 正向：清单每行的每一枚判据，都要在 `pi_loop.rs` 生产段的 `site` 里真有消费点。
        for input in &manifest {
            for judgment in input.judgments {
                assert!(
                    ledger.iter().any(|row| row.module == "pi_loop.rs"
                        && row.function == input.site
                        && row.judgment == *judgment
                        && row.consumption == Consumption::Fronted),
                    "清单行 {} 声称由 pi_loop.rs::{} 的 {judgment} 前置，生产段却扫不到这处消费点",
                    input.input,
                    input.site
                );
            }
        }

        // 反向：`pi_loop.rs` 生产段每一道前置门，都要被清单某一行在同一 `site` 上认领。
        for row in &ledger {
            if row.module != "pi_loop.rs" || row.consumption != Consumption::Fronted {
                continue;
            }
            assert!(
                manifest
                    .iter()
                    .any(|input| input.site == row.function
                        && input.judgments.contains(&row.judgment)),
                "pi_loop.rs::{} 的前置门 {} 不在 D1 手写清单里——族闭集不完整",
                row.function,
                row.judgment
            );
        }

        // 清单侧的手写字面量自身也要闭集：拒绝 code 只允许三枚具名值。
        for input in &manifest {
            assert!(
                ["invalid_config", "invalid_ref", "invalid_prompt"].contains(&input.code),
                "{} 的拒绝 code {} 不在既有闭集内",
                input.input,
                input.code
            );
        }

        // ── 1R4 E2：计数冻结 ───────────────────────────────────────────────────
        //
        // 1R3 回执把清单报成「9 行 / 26 枚」、ledger 报成「11 Fronted + 28 Other」，
        // 实数是 10/28 与 12/27——手抄转述的计数没有任何机器约束。四枚数字自此写死在
        // 被测面上：回执引用它们时与源码同源，改一行不改这里必红。
        let counterexamples: usize = manifest
            .iter()
            .map(|input| match &input.probe {
                BoundedProbe::Config(cases) => cases.len(),
                BoundedProbe::Credential(cases) => cases.len(),
                BoundedProbe::Prompt(cases) => cases.len(),
                BoundedProbe::RequestId(cases) => cases.len(),
            })
            .sum();
        let fronted = ledger
            .iter()
            .filter(|row| row.consumption == Consumption::Fronted)
            .count();
        assert_eq!(manifest.len(), 11, "D1 手写清单行数");
        assert_eq!(counterexamples, 34, "D1 常驻反例枚数");
        assert_eq!(fronted, 26, "清账表 Fronted 行数");
        assert_eq!(ledger.len() - fronted, 49, "清账表 Other 行数");
    }

    // ── G2 · fail-closed 扫描（PI-HOST-LOOP-1R5 §零裁定二）───────────────────────
    //
    // 1R3 用常量名单、1R4 用函数名单，两轮同败，病根同一：白名单对 unknown 的处置是
    // **跳过**。终局形态是反置——枚举受审面的**全部拒绝分支**，逐条要求手写表有行；
    // 表里没有的表达式**判红而非跳过**。排除只能是表里的具名理由行，扫描器内不再有
    // 任何跳过型过滤器（每加一条过滤就多一个藏身处）。

    /// 生产段逐行归属的函数名（`None` = 函数体外的文件头 / impl 头 / 类型定义）。
    fn attributed_production_lines(source: &'static str) -> Vec<(Option<String>, &'static str)> {
        let mut rows = Vec::new();
        let mut current: Option<String> = None;
        for line in production_section(source).lines() {
            let trimmed = line.trim_start();
            if !trimmed.starts_with("//") {
                if let Some(name) = function_name(trimmed) {
                    current = Some(name);
                } else if line == "}" {
                    current = None;
                }
            }
            rows.push((current.clone(), line));
        }
        rows
    }

    fn normalize_ws(text: &str) -> String {
        text.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// 截掉行尾注释。字符串字面量里的 `//` 不算注释起点。
    fn strip_trailing_comment(line: &str) -> &str {
        let bytes = line.as_bytes();
        let mut in_string = false;
        let mut index = 0;
        while index < bytes.len() {
            match bytes[index] {
                b'\\' if in_string => index += 1,
                b'"' => in_string = !in_string,
                b'/' if !in_string && bytes.get(index + 1) == Some(&b'/') => return &line[..index],
                _ => {}
            }
            index += 1;
        }
        line
    }

    /// 分支起始行：`if` / `else`（含 `let … else`）/ `match` / match 臂。
    fn is_branch_head(trimmed: &str) -> bool {
        let rest = match trimmed.strip_prefix('}') {
            Some(tail) => tail.trim_start(),
            None => trimmed,
        };
        rest.starts_with("if ")
            || rest.starts_with("else")
            || rest.starts_with("match ")
            || rest.contains("=>")
            || rest.ends_with("else {")
    }

    /// 从 `lines[index]` 的 `from` 字节处起做定界符配平读取，可跨行；字符串字面量内的
    /// 定界符不计数。返回归一化空白后的整段文本。配平不成立时读到生产段末尾——那一串
    /// 必然与手写表对不上，于是仍是红，不是静默跳过。
    fn balanced_from(
        lines: &[(Option<String>, &'static str)],
        index: usize,
        from: usize,
        open: char,
        close: char,
    ) -> String {
        let mut text = String::new();
        let mut depth = 0i32;
        let mut in_string = false;
        let mut escaped = false;
        let mut cursor = index;
        let mut chunk = strip_trailing_comment(lines[index].1)[from..].to_string();
        loop {
            text.push(' ');
            text.push_str(&chunk);
            let mut closed = false;
            for ch in chunk.chars() {
                if escaped {
                    escaped = false;
                    continue;
                }
                if in_string {
                    if ch == '\\' {
                        escaped = true;
                    } else if ch == '"' {
                        in_string = false;
                    }
                    continue;
                }
                if ch == '"' {
                    in_string = true;
                } else if ch == open {
                    depth += 1;
                } else if ch == close {
                    depth -= 1;
                    if depth == 0 {
                        closed = true;
                        break;
                    }
                }
            }
            if closed || cursor + 1 >= lines.len() {
                break;
            }
            cursor += 1;
            chunk = strip_trailing_comment(lines[cursor].1).trim().to_string();
        }
        normalize_ws(&text)
    }

    /// 文本里最后一枚字符串字面量的内容。
    fn last_string_literal(text: &str) -> Option<String> {
        let mut best = None;
        let mut current: Option<String> = None;
        let mut escaped = false;
        for ch in text.chars() {
            match &mut current {
                Some(buffer) => {
                    if escaped {
                        buffer.push(ch);
                        escaped = false;
                    } else if ch == '\\' {
                        buffer.push(ch);
                        escaped = true;
                    } else if ch == '"' {
                        best = Some(buffer.clone());
                        current = None;
                    } else {
                        buffer.push(ch);
                    }
                }
                None => {
                    if ch == '"' {
                        current = Some(String::new());
                    }
                }
            }
        }
        best
    }

    /// `pi_loop.rs` 生产段每一处 `return Err(`：`(函数, 分支头, 拒绝表达式)`。
    ///
    /// 分支头取该行 `return Err(` 之前的同行文本（match 臂形态），为空则回溯到最近一处
    /// 分支起始行并连同其间所有行原样拼接。条件与文案**同时**参与键：改条件、改文案、
    /// 加一道门，三种动作各自都会让扫描集变形。
    fn scan_refusal_branches(source: &'static str) -> Vec<(String, String, String)> {
        let lines = attributed_production_lines(source);
        let mut rows: Vec<(String, String, String)> = Vec::new();
        for index in 0..lines.len() {
            let Some(function) = lines[index].0.clone() else {
                continue;
            };
            let body = strip_trailing_comment(lines[index].1);
            let Some(at) = body.find("return Err(") else {
                continue;
            };
            let expression = balanced_from(&lines, index, at + "return Err".len(), '(', ')');
            let inline = normalize_ws(&body[..at]);
            let guard = if inline.is_empty() {
                let mut probe = index;
                let mut head = None;
                while probe > 0 {
                    probe -= 1;
                    if lines[probe].0.as_deref() != Some(function.as_str()) {
                        break;
                    }
                    let candidate = strip_trailing_comment(lines[probe].1).trim();
                    if candidate.is_empty() {
                        continue;
                    }
                    if is_branch_head(candidate) {
                        head = Some(probe);
                        break;
                    }
                }
                match head {
                    Some(start) => normalize_ws(
                        &lines[start..index]
                            .iter()
                            .map(|(_, line)| strip_trailing_comment(line))
                            .collect::<Vec<_>>()
                            .join(" "),
                    ),
                    None => "<无前置分支头>".to_string(),
                }
            } else {
                inline
            };
            let row = (function, guard, expression);
            if !rows.contains(&row) {
                rows.push(row);
            }
        }
        rows.sort();
        rows
    }

    /// `pi_loop_protocol.rs` 生产段每一处具名拒绝：`(函数, 理由字面量)`。
    ///
    /// 该模块只有三种拒绝构造式：`reject(…)`、`reject_field(…)` 与 `PacketRejection { … }`
    /// 字面量。三者都扫，理由取该段最后一枚字符串字面量。新写一枚判据必然带一句新理由
    /// （或把老理由搬进新函数），两种情形都会让扫描集变形。
    const WIRE_REJECTION_MARKERS: [(&str, char, char); 3] = [
        ("reject_field(", '(', ')'),
        ("reject(", '(', ')'),
        ("PacketRejection {", '{', '}'),
    ];

    fn scan_wire_rejections(source: &'static str) -> Vec<(String, String)> {
        let lines = attributed_production_lines(source);
        let mut rows: Vec<(String, String)> = Vec::new();
        for index in 0..lines.len() {
            let Some(function) = lines[index].0.clone() else {
                continue;
            };
            let body = strip_trailing_comment(lines[index].1);
            let bytes = body.as_bytes();
            let mut cursor = 0;
            while cursor < body.len() {
                let hit = WIRE_REJECTION_MARKERS
                    .iter()
                    .filter_map(|(marker, open, close)| {
                        body[cursor..]
                            .find(marker)
                            .map(|offset| (cursor + offset, *marker, *open, *close))
                    })
                    .min_by_key(|(at, _, _, _)| *at);
                let Some((at, marker, open, close)) = hit else {
                    break;
                };
                cursor = at + marker.len();
                let boundary =
                    at == 0 || !(bytes[at - 1].is_ascii_alphanumeric() || bytes[at - 1] == b'_');
                if !boundary {
                    continue;
                }
                let text = balanced_from(&lines, index, at + marker.len() - 1, open, close);
                let reason =
                    last_string_literal(&text).unwrap_or_else(|| "<无字面理由>".to_string());
                let row = (function.clone(), reason);
                if !rows.contains(&row) {
                    rows.push(row);
                }
            }
        }
        rows.sort();
        rows
    }

    // ── G2.1 · host 前置拒绝分支的 fail-closed 表 ───────────────────────────────

    /// 三枚具名拒绝 code 的构造式。host 前置族**由源码派生**：`pi_loop.rs` 生产段里
    /// 凡返回这三枚之一的函数即属该族，再与冻结清单逐名核对——新写一枚前置函数即红。
    const HOST_REFUSAL_CODES: [&str; 3] = [
        "HostError::InvalidConfig",
        "HostError::InvalidPrompt",
        "HostError::InvalidRef",
    ];

    /// 冻结的 host 前置函数族（按名排序）。1R5 的新轴把 `start_inner` 与
    /// `delete_container` 一并浮出——两者同样返回具名拒绝 code，本轮逐条入账，不留给下一轮。
    const HOST_PREFLIGHT_FAMILY: [&str; 5] = [
        "delete_container",
        "prompt",
        "start_inner",
        "validate_api_key",
        "validate_start_config",
    ];

    /// 一处拒绝分支：函数 + 分支头 + 拒绝表达式 + 归属。三段文本都是手写字面量，
    /// 与生产段扫描集**逐行相等**；表里没有的表达式判红，不是跳过。
    struct RefusalBranch {
        function: &'static str,
        guard: &'static str,
        error: &'static str,
        disposition: BranchDisposition,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum BranchDisposition {
        /// host→sidecar 输入的值判据：指名它在 D1 手写清单里的行（一条分支可判多枚输入）。
        HostInput(&'static [&'static str]),
        /// 不是输入值判据，附具名理由。禁空理由、禁省行——排除只住这里，扫描器内没有过滤器。
        Other(&'static str),
    }

    fn host_refusal_branches() -> Vec<RefusalBranch> {
        let fs_fact =
            "文件系统事实判据（lstat / symlink / 目录类型）：判的是盘上实物，不是入参值；\
             同一枚 caseRoot 的入参层判据由 `validate_start_config` 在此之前收齐";
        let container_delete =
            "容器整删的入参门：被判 token 只用于拼装 app-data 下的目录路径，不上 wire；\
             同名 token 的 host→sidecar 前置门在 `start_inner`（清单两行）";
        let runtime_state =
            "运行时状态门（会话已收束 / 容器仍有 live 写者）：判的是本 host 当前态，不判入参值";
        let dedup = "跨 leg requestId 去重：判的是 durable 投影里的历史，不是入参形状；\
             同一枚 requestId 的形状门是本函数上一道 `is_safe_token`";
        let resume_drift =
            "resume 前置：本 leg 入参与 durable 历史的一致性判据，被判的是两者之差而非入参\
             自身的形状；全部落在 spawn 之前";
        let inbound_shape =
            "入站包形状门：判的是 sidecar 实收的 ready payload 与 capability 自报，\
             方向是 sidecar→host";
        vec![
            RefusalBranch {
                function: "delete_container",
                guard: "Err(_) =>",
                error: "(HostError::Journal(\"lstat container 失败\")),",
                disposition: BranchDisposition::Other(fs_fact),
            },
            RefusalBranch {
                function: "delete_container",
                guard: "if !is_safe_container_token(container_id) {",
                error: "(HostError::InvalidRef);",
                disposition: BranchDisposition::Other(container_delete),
            },
            RefusalBranch {
                function: "delete_container",
                guard: "if metadata.file_type().is_symlink() || !metadata.is_dir() {",
                error: "(HostError::Journal(\"container root 不是 regular directory\"));",
                disposition: BranchDisposition::Other(fs_fact),
            },
            RefusalBranch {
                function: "delete_container",
                guard: "if pi_loop_journal::container_has_live_session(app_data_dir, container_id)? {",
                error: "(HostError::ContainerActive);",
                disposition: BranchDisposition::Other(runtime_state),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if !is_nul_free(text) {",
                error: "(HostError::InvalidPrompt(\"prompt 文本不得含 NUL\"));",
                disposition: BranchDisposition::HostInput(&["prompt.text"]),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if !is_safe_token(request_id) {",
                error: "(HostError::InvalidRef);",
                disposition: BranchDisposition::HostInput(&["prompt.requestId"]),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if self.closed {",
                error: "(HostError::SessionClosed);",
                disposition: BranchDisposition::Other(runtime_state),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if self.projection.request_ids.contains(request_id) {",
                error: "(HostError::ResumeRefused( \"requestId 在本 logical session 内已用过\", ));",
                disposition: BranchDisposition::Other(dedup),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if text.len() > MAX_TEXT_BYTES {",
                error: "(HostError::InvalidPrompt(\"prompt 文本超过 131,072 字节上限\"));",
                disposition: BranchDisposition::HostInput(&["prompt.text"]),
            },
            RefusalBranch {
                function: "prompt",
                guard: "if text.trim().is_empty() {",
                error: "(HostError::InvalidPrompt(\"prompt 文本 trim 后不得为空\"));",
                disposition: BranchDisposition::HostInput(&["prompt.text"]),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if !is_safe_container_token(&config.container_id) || !is_safe_container_token(&config.session_id) || !is_safe_token(&config.grant_id) {",
                error: "(HostError::InvalidRef);",
                disposition: BranchDisposition::HostInput(&["containerId", "sessionId", "grantId"]),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if !metadata.is_dir() {",
                error: "(HostError::CaseRoot(\"案件根不是目录\"));",
                disposition: BranchDisposition::Other(fs_fact),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if !projection.interrupted {",
                error: "(HostError::ResumeRefused( \"上一 leg 未以 session_interrupted 收束\", ));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if capabilities.as_slice() != EXPECTED_CAPABILITIES {",
                error: "(host.fail_protocol(ProtocolErrorCode::StateViolation));",
                disposition: BranchDisposition::Other(inbound_shape),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.grant_id != config.grant_id {",
                error: "(HostError::ResumeRefused(\"grant 漂移\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.max_turns != config.max_turns || historic.max_usd != config.max_usd {",
                error: "(HostError::ResumeRefused(\"limits 漂移\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.max_usd.is_some() && projection.prior_usd.is_none() {",
                error: "(HostError::ResumeRefused(\"maxUsd 已启用而历史费用未知\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.model_id != config.model_id {",
                error: "(HostError::ResumeRefused(\"model 漂移\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.route_manifest_sha256 != pair.manifest_sha256() {",
                error: "(HostError::ResumeRefused(\"route manifest 漂移\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if historic.target_triple != pair.target_triple() {",
                error: "(HostError::ResumeRefused(\"target 漂移\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if metadata.file_type().is_symlink() {",
                error: "(HostError::CaseRoot(\"案件根是 symlink\"));",
                disposition: BranchDisposition::Other(fs_fact),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if projection.is_closed() {",
                error: "(HostError::SessionClosed);",
                disposition: BranchDisposition::Other(runtime_state),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "if projection.prior_turns >= historic.max_turns {",
                error: "(HostError::ResumeRefused(\"历史 counted turns 已达 maxTurns\"));",
                disposition: BranchDisposition::Other(resume_drift),
            },
            RefusalBranch {
                function: "start_inner",
                guard: "let PacketPayload::Ready { capabilities } = packet.payload else {",
                error: "(host.fail_protocol(ProtocolErrorCode::StateViolation));",
                disposition: BranchDisposition::Other(inbound_shape),
            },
            RefusalBranch {
                function: "validate_api_key",
                guard: "if !is_nul_free(api_key) {",
                error: "(HostError::InvalidConfig(\"apiKey 不得含 NUL\"));",
                disposition: BranchDisposition::HostInput(&["provider.apiKey"]),
            },
            RefusalBranch {
                function: "validate_api_key",
                guard: "if api_key.len() > MAX_API_KEY_BYTES {",
                error: "(HostError::InvalidConfig(\"apiKey 不得超过 8192 UTF-8 字节\"));",
                disposition: BranchDisposition::HostInput(&["provider.apiKey"]),
            },
            RefusalBranch {
                function: "validate_api_key",
                guard: "if api_key.trim().is_empty() {",
                error: "(HostError::InvalidConfig(\"apiKey 不得为空\"));",
                disposition: BranchDisposition::HostInput(&["provider.apiKey"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if !is_absolute_path_shape(&case_root) {",
                error: "(HostError::InvalidConfig(\"caseRoot 必须是平台绝对路径\"));",
                disposition: BranchDisposition::HostInput(&["caseRoot 绝对形状"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if !is_nul_free(&case_root) {",
                error: "(HostError::InvalidConfig(\"caseRoot 不得含 NUL\"));",
                disposition: BranchDisposition::HostInput(&["caseRoot"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if !is_nul_free(&config.model_id) {",
                error: "(HostError::InvalidConfig(\"modelId 不得含 NUL\"));",
                disposition: BranchDisposition::HostInput(&["provider.modelId"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if !max_usd.is_finite() || max_usd <= 0.0 || max_usd > MAX_USD_LIMIT {",
                error: "(HostError::InvalidConfig( \"maxUsd 必须是 (0, 100000] 内的有限数或 null\", ));",
                disposition: BranchDisposition::HostInput(&["limits.maxUsd"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if case_root.is_empty() {",
                error: "(HostError::InvalidConfig(\"caseRoot 不得为空\"));",
                disposition: BranchDisposition::HostInput(&["caseRoot"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if case_root.len() > MAX_CASE_ROOT_BYTES {",
                error: "(HostError::InvalidConfig( \"caseRoot 不得超过 4096 UTF-8 字节\", ));",
                disposition: BranchDisposition::HostInput(&["caseRoot"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if config.max_turns < 1 || config.max_turns > MAX_TURNS_LIMIT {",
                error: "(HostError::InvalidConfig(\"maxTurns 必须是 1..=12 的整数\"));",
                disposition: BranchDisposition::HostInput(&["limits.maxTurns"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if config.model_id.len() > MAX_MODEL_ID_BYTES {",
                error: "(HostError::InvalidConfig(\"modelId 不得超过 256 UTF-8 字节\"));",
                disposition: BranchDisposition::HostInput(&["provider.modelId"]),
            },
            RefusalBranch {
                function: "validate_start_config",
                guard: "if config.model_id.trim().is_empty() {",
                error: "(HostError::InvalidConfig(\"modelId 不得为空\"));",
                disposition: BranchDisposition::HostInput(&["provider.modelId"]),
            },
        ]
    }

    /// G2.1：host 前置族的**全部拒绝分支**逐条要求手写表有行；表里没有的表达式判红。
    ///
    /// 1R4 复验用一枚未登记的 `model_id.contains('/')` 证明旧扫描器 false-green——
    /// 那枚结构反例在本轮转成常驻形态：加任何一道未登记的门，扫描集与表就此不等。
    #[test]
    fn host_refusal_branches_are_fail_closed_against_the_source() {
        let scanned = scan_refusal_branches(include_str!("pi_loop.rs"));

        // ① 族由源码派生：凡返回三枚具名拒绝 code 之一的函数即属 host 前置族。
        let mut derived: Vec<String> = Vec::new();
        for (function, _, error) in &scanned {
            if HOST_REFUSAL_CODES.iter().any(|code| error.contains(code))
                && !derived.contains(function)
            {
                derived.push(function.clone());
            }
        }
        derived.sort();
        let frozen: Vec<String> = HOST_PREFLIGHT_FAMILY
            .iter()
            .map(|name| name.to_string())
            .collect();
        assert_eq!(
            derived, frozen,
            "host 前置函数族与冻结清单不符：新写一枚返回具名拒绝 code 的函数须同批入册"
        );

        // ② 族内**全部**拒绝分支与手写表逐行相同。
        let table = host_refusal_branches();
        let mut registered: Vec<(String, String, String)> = table
            .iter()
            .map(|row| {
                (
                    row.function.to_string(),
                    row.guard.to_string(),
                    row.error.to_string(),
                )
            })
            .collect();
        registered.sort();
        let mut in_family: Vec<(String, String, String)> = scanned
            .into_iter()
            .filter(|(function, _, _)| HOST_PREFLIGHT_FAMILY.contains(&function.as_str()))
            .collect();
        in_family.sort();
        assert_eq!(
            in_family, registered,
            "host 前置族的拒绝分支必须与手写表逐行相同：加一道门、改一个条件、改一句文案，\
             三种动作都要同批补表并给出归属"
        );

        // ③ 归属为 host 输入的分支，必须在 D1 清单里有同 `site` 的那一行。
        let manifest = bounded_input_manifest();
        for row in &table {
            match row.disposition {
                BranchDisposition::HostInput(inputs) => {
                    assert!(
                        !inputs.is_empty(),
                        "{}::{} 登记为 host 输入判据，却没指名清单行",
                        row.function,
                        row.guard
                    );
                    for input in inputs {
                        assert!(
                            manifest
                                .iter()
                                .any(|entry| entry.input == *input && entry.site == row.function),
                            "拒绝分支 {}::{} 认领的清单行 {input} 不存在，或它的 site 不是本函数",
                            row.function,
                            row.guard
                        );
                    }
                }
                BranchDisposition::Other(reason) => {
                    assert!(
                        !reason.trim().is_empty(),
                        "{}::{} 登记为非输入值判据，却没写理由",
                        row.function,
                        row.guard
                    );
                }
            }
        }

        // ④ 反向：D1 清单每一行都要被至少一处拒绝分支认领——撤掉生产门，清单行随即失锚。
        for entry in &manifest {
            assert!(
                table.iter().any(|row| matches!(
                    row.disposition,
                    BranchDisposition::HostInput(inputs) if inputs.contains(&entry.input)
                )),
                "D1 清单行 {} 在拒绝分支表里无人认领",
                entry.input
            );
        }

        // ⑤ 计数冻结：回执引用这两枚数字时与源码同源。
        let host_rows = table
            .iter()
            .filter(|row| matches!(row.disposition, BranchDisposition::HostInput(_)))
            .count();
        assert_eq!(table.len(), 36, "host 前置族拒绝分支行数");
        assert_eq!(host_rows, 17, "其中 host 输入值判据行数");
    }

    // ── G2.2 · 协议模块具名 wire 判据的对照面 ───────────────────────────────────
    //
    // ADR-022 六-B.1 的 wire 字符串判据住在 `pi_loop_protocol.rs`：NUL / lone surrogate、
    // 长度、非空、SafeToken、shape、JSON 深度……1R4 之前它们整族不在任何扫描轴上，于是
    // 「`scan_string` 的 `unit == 0`」这道现存格式门既不进 ledger 也不进 manifest。
    // 本表把该模块**全部具名拒绝**逐行收下：`Fronted`（host 侧已有前置门，指名清单行）
    // 或具名理由 `Other`。

    /// 允许出现 `PacketRejection { … }` 字面量的函数闭集。新写一枚拒绝 helper 即红——
    /// 否则它的调用点会整族逃出扫描面（1R3/1R4 两轮栽的正是同一形）。
    const WIRE_REJECTION_LITERAL_SITES: [&str; 4] = ["pick", "read_enum", "reject", "reject_field"];

    /// 一处具名 wire 判据：函数 + 拒绝理由字面量 + 归属。
    struct WireJudgment {
        function: &'static str,
        reason: &'static str,
        disposition: WireDisposition,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum WireDisposition {
        /// 同一判据已在 host 前置：逐对指名 D1 清单行与判据名，附一句归属说明。
        Fronted {
            inputs: &'static [(&'static str, &'static str)],
            note: &'static str,
        },
        /// 不属 host 方向输入值判据，附具名理由。禁空、禁省行。
        Other(&'static str),
    }

    fn wire_judgment_ledger() -> Vec<WireJudgment> {
        let framing = "packet framing 判据：辖成品行的字节形状，双向共用，不绑任何单一输入";
        let envelope = "packet 信封字段判据：protocolVersion/type/sessionId/requestId 由宿主按\
                        冻结常量与方向闭集自产，读回时逐值复核";
        let closed_shape = "契约闭形判据（additionalProperties:false / 缺字段）：辖 packet 的\
                            字段集，不是某一枚输入的值判据";
        let closed_enum = "闭集枚举判据：host 方向的取值由 Rust enum 结构性保证，入站侧由 \
                           decoder 收口";
        let json_lexical = "JSON 词法判据：辖文本写法，不是任何一枚 host 输入的值判据";
        let json_depth = "JSON 嵌套深度：结构约束非输入值判据，双向共用";
        let rust_typed = "JSON 类型判据：host 方向出包由 Rust 类型结构性保证，这一路只对入站\
                          解码有效";
        let inbound_only = "只辖 sidecar→host 入站解码，host 方向不生成该字段";
        let host_outbound_unused = "host_result 是 host→sidecar 出包，但本票 ready capability \
                                    恰 ['case_read']，宿主一枚都不生成；PI-WRITE-HOST-1 开工时\
                                    须连同前置门一并补";
        let list_entries = "array 条目上限：host 方向唯一消费点是 host_result 的 list（本票不\
                            生成），其余为入站解码";
        let derived_resume = "resume 三值由本 journal 的 fold 产出，不是入参；对应的 host 侧拒绝\
                              住在 `start_inner` 的 resume 漂移分支（拒绝分支表逐行有据）";
        let safe_integer = "MAX_SAFE_INTEGER 封顶：host 方向的整数由宿主自增或由 journal fold \
                            派生，不是入参";
        let self_produced_digest = "sha256 由宿主自算（route manifest 与 session_started），\
                                    不是任何一枚用户入参";
        let constructor_definition = "拒绝构造式自身的定义，不判任何输入";

        let case_root_shape_note = "caseRoot 的绝对形状门已在 `validate_start_config` 前置";
        let model_id_trim_note = "modelId 的 trim 非空门已在 `validate_start_config` 前置";
        let prompt_trim_note = "prompt 文本的 trim 非空门已在 `prompt` 前置";
        let non_empty_note = "通用非空读取器；host 方向唯一消费点是 bootstrap 的 caseRoot，\
                              其非空门已在 `validate_start_config` 前置";
        let length_note = "通用带上界字符串读取器，双向共用；host 方向四枚自由串各有前置上界门";
        let safe_token_note = "通用 SafeToken 解码器，入站/出站共用；host 方向四枚具名 token \
                               各有前置门";
        let max_turns_note = "通用整数读取器的契约上下界，双向共用；host 方向唯一带契约区间的\
                              入参是 maxTurns";
        let max_usd_note = "maxUsd 的负值/负零、非有限与上限三态都由 `validate_start_config` 的\
                            同一道前置门覆盖";
        let nul_note = "ADR-022 六-B.1 冻结的 wire 字符串判据。NUL 归 host 前置（1R5 §零裁定一：\
                        副作用、语义、家族三轴）；同一枚理由字面量并管的 **lone surrogate 在 \
                        Rust `String` 侧结构性不可达**——`String` 保证 Unicode scalar 序列，\
                        host 方向永远构造不出这一形，故不另设前置门，以本行具名登记。";

        vec![
            WireJudgment {
                function: "closed_record",
                reason: "的字段集必须与契约逐字相同（additionalProperties:false）",
                disposition: WireDisposition::Other(closed_shape),
            },
            WireJudgment {
                function: "closed_record",
                reason: "缺少契约字段或含契约外字段",
                disposition: WireDisposition::Other(closed_shape),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "单 packet 连结尾 LF 超过字节上限",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "空行不是 packet",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "行不是合法 UTF-8（fatal 解码，不做 U+FFFD 替换）",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "行以 CR 结尾：delimiter 只收单字节 LF，CRLF 不放行",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "行内出现 LF",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_line",
                reason: "行带 UTF-8 BOM",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "protocolVersion 不是本协议版本",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "protocolVersion 必须是规范整数",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "sessionId 不得为 null",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "sessionId:null 只允许 bootstrap 未成立时的 protocol_error",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "type 不在本方向的闭集内",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "type 必须是字符串",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "本 type 的 requestId 不得为 null",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "decode_packet_node",
                reason: "本 type 的 requestId 必须为 null",
                disposition: WireDisposition::Other(envelope),
            },
            WireJudgment {
                function: "encode_packet_line",
                reason: "编码后字节连结尾 LF 超过单 packet 上限",
                disposition: WireDisposition::Other(framing),
            },
            WireJudgment {
                function: "pick",
                reason: "{label} 缺少契约字段",
                disposition: WireDisposition::Other(closed_shape),
            },
            WireJudgment {
                function: "read_agent_event_payload",
                reason: "aborted/error 回合固定不计入 turn 限额，其余 stopReason 固定计入",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_agent_event_payload",
                reason: "aborted/error 回合的 usage 字段必须全部为 null",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_array",
                reason: "必须是 array",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_array",
                reason: "超过条目上限",
                disposition: WireDisposition::Other(list_entries),
            },
            WireJudgment {
                function: "read_boolean",
                reason: "必须是 boolean",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "after_interruption 的 leg 至少为 2",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "caseRoot 必须是平台绝对路径",
                disposition: WireDisposition::Fronted {
                    inputs: &[("caseRoot 绝对形状", "is_absolute_path_shape")],
                    note: case_root_shape_note,
                },
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "fresh 必须是 leg:1 且 prior 三项全零",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "maxUsd 已启用时 priorUsd 不得为未知",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "priorObservedTurns 不得小于 priorTurns",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "provider.modelId trim 后不得为空",
                disposition: WireDisposition::Fronted {
                    inputs: &[("provider.modelId", "trim_non_empty")],
                    note: model_id_trim_note,
                },
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "历史 counted turns 已达 maxTurns，不得启动新 leg",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_bootstrap_payload",
                reason: "历史费用已达 maxUsd，不得启动新 leg",
                disposition: WireDisposition::Other(derived_resume),
            },
            WireJudgment {
                function: "read_enum",
                reason: "{label} 不在契约闭集内",
                disposition: WireDisposition::Other(closed_enum),
            },
            WireJudgment {
                function: "read_enum",
                reason: "必须是字符串",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_host_result_payload",
                reason: "uncertain 只允许 workspace write",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_host_result_payload",
                reason: "value.byteLength 必须等于 content 的 UTF-8 实长",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_host_result_payload",
                reason: "workspace_read 的 operation 不得为 write",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_host_result_payload",
                reason: "workspace_write 的 operation 固定为 write",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_integer",
                reason: "必须是整数",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_integer",
                reason: "的 JSON number lexeme 不是规范非负整数",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "read_integer",
                reason: "超出契约范围",
                disposition: WireDisposition::Fronted {
                    inputs: &[("limits.maxTurns", "MAX_TURNS_LIMIT")],
                    note: max_turns_note,
                },
            },
            WireJudgment {
                function: "read_integer",
                reason: "超出安全整数范围",
                disposition: WireDisposition::Other(safe_integer),
            },
            WireJudgment {
                function: "read_list_entry",
                reason: "directory/symlink 条目的 byteLength 必须为 null",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_list_entry",
                reason: "file 条目必须给出 byteLength",
                disposition: WireDisposition::Other(host_outbound_unused),
            },
            WireJudgment {
                function: "read_non_empty_string",
                reason: "不得为空",
                disposition: WireDisposition::Fronted {
                    inputs: &[("caseRoot", "non_empty")],
                    note: non_empty_note,
                },
            },
            WireJudgment {
                function: "read_non_negative_number",
                reason: "不得为负数或 negative zero",
                disposition: WireDisposition::Fronted {
                    inputs: &[("limits.maxUsd", "MAX_USD_LIMIT")],
                    note: max_usd_note,
                },
            },
            WireJudgment {
                function: "read_non_negative_number",
                reason: "必须大于 0",
                disposition: WireDisposition::Fronted {
                    inputs: &[("limits.maxUsd", "MAX_USD_LIMIT")],
                    note: max_usd_note,
                },
            },
            WireJudgment {
                function: "read_non_negative_number",
                reason: "必须是数值",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_non_negative_number",
                reason: "必须是有限数",
                disposition: WireDisposition::Fronted {
                    inputs: &[("limits.maxUsd", "MAX_USD_LIMIT")],
                    note: max_usd_note,
                },
            },
            WireJudgment {
                function: "read_non_negative_number",
                reason: "超出契约上限",
                disposition: WireDisposition::Fronted {
                    inputs: &[("limits.maxUsd", "MAX_USD_LIMIT")],
                    note: max_usd_note,
                },
            },
            WireJudgment {
                function: "read_prompt_payload",
                reason: "prompt.text trim 后不得为空",
                disposition: WireDisposition::Fronted {
                    inputs: &[("prompt.text", "trim_non_empty")],
                    note: prompt_trim_note,
                },
            },
            WireJudgment {
                function: "read_protocol_error_payload",
                reason: "protocol_error.fatal 恒为 true",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_ready_payload",
                reason: "ready.capabilities 必须去重并按字典序升序",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_safe_token",
                reason: "不满足 SafeToken 形状",
                disposition: WireDisposition::Fronted {
                    inputs: &[
                        ("containerId", "is_safe_container_token"),
                        ("sessionId", "is_safe_container_token"),
                        ("grantId", "is_safe_token"),
                        ("prompt.requestId", "is_safe_token"),
                    ],
                    note: safe_token_note,
                },
            },
            WireJudgment {
                function: "read_safe_token",
                reason: "必须是 SafeToken 字符串",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_sha256_hex",
                reason: "必须是字符串",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_sha256_hex",
                reason: "必须是小写 64 位 hex",
                disposition: WireDisposition::Other(self_produced_digest),
            },
            WireJudgment {
                function: "read_string",
                reason: "必须是字符串",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "read_string",
                reason: "超过 UTF-8 字节上限",
                disposition: WireDisposition::Fronted {
                    inputs: &[
                        ("provider.modelId", "MAX_MODEL_ID_BYTES"),
                        ("caseRoot", "MAX_CASE_ROOT_BYTES"),
                        ("provider.apiKey", "MAX_API_KEY_BYTES"),
                        ("prompt.text", "MAX_TEXT_BYTES"),
                    ],
                    note: length_note,
                },
            },
            WireJudgment {
                function: "read_terminal_payload",
                reason: "budget_stopped 必须给出 budget.stopReason",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_terminal_payload",
                reason: "本 failed code 属不可重试闭集，retryable 必须为 false",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_terminal_payload",
                reason: "非 budget terminal 的 budget.stopReason 必须为 null",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "read_write_arguments",
                reason: "arguments.byteLength 必须等于 content 的 UTF-8 实长",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "reject",
                reason: "<无字面理由>",
                disposition: WireDisposition::Other(constructor_definition),
            },
            WireJudgment {
                function: "reject_field",
                reason: "{label} {tail}",
                disposition: WireDisposition::Other(constructor_definition),
            },
            WireJudgment {
                function: "require_object",
                reason: "必须是 JSON object",
                disposition: WireDisposition::Other(rust_typed),
            },
            WireJudgment {
                function: "scan_array",
                reason: "JSON array 未正确闭合",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_array",
                reason: "JSON 嵌套超过深度上限",
                disposition: WireDisposition::Other(json_depth),
            },
            WireJudgment {
                function: "scan_hex4",
                reason: "JSON `\\\\u` 转义必须是四位 hex",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_literal",
                reason: "JSON 字面量不合语法",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_number",
                reason: "JSON number 不合语法",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_number",
                reason: "JSON number 的小数部分缺数字",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_number",
                reason: "JSON number 的指数部分缺数字",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_object",
                reason: "JSON object 出现重复 member（任一层皆拒）",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_object",
                reason: "JSON object 未正确闭合",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_object",
                reason: "JSON object 的 member 名必须是字符串",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_object",
                reason: "JSON object 的 member 缺少冒号",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_object",
                reason: "JSON 嵌套超过深度上限",
                disposition: WireDisposition::Other(json_depth),
            },
            WireJudgment {
                function: "scan_string",
                reason: "JSON 字符串含契约外转义",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_string",
                reason: "JSON 字符串含未转义控制字符",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_string",
                reason: "JSON 字符串未闭合",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_string",
                reason: "wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列",
                disposition: WireDisposition::Fronted {
                    inputs: &[
                        ("provider.modelId", "is_nul_free"),
                        ("caseRoot", "is_nul_free"),
                        ("provider.apiKey", "is_nul_free"),
                        ("prompt.text", "is_nul_free"),
                    ],
                    note: nul_note,
                },
            },
            WireJudgment {
                function: "scan_value",
                reason: "JSON 在期待值的位置提前结束",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "scan_with",
                reason: "只允许一个 JSON 值，其后出现多余内容",
                disposition: WireDisposition::Other(json_lexical),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "budget_stopped 不得携带 unknown usdLimit",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "failed budget_unknown 必须携带 unknown usdLimit",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "turnLimit reached 的 budget_stopped 必须以 turns 停止",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "usdLimit 为 unknown 时 usd 必须为 null",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "已知金额限额状态必须携带已知 usd",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "此 terminal 不得绕过 effect/budget 优先级",
                disposition: WireDisposition::Other(inbound_only),
            },
            WireJudgment {
                function: "validate_terminal_budget",
                reason: "非 turn reached 的 budget_stopped 必须由 usd reached 停止",
                disposition: WireDisposition::Other(inbound_only),
            },
        ]
    }

    /// G2.2：`pi_loop_protocol.rs` 生产段的**全部具名拒绝**逐条要求本表有行；
    /// 新增一枚具名判据（新理由，或把老理由搬进新函数）不入账即红。
    #[test]
    fn wire_judgment_ledger_covers_every_named_protocol_rejection() {
        let source = include_str!("pi_loop_protocol.rs");

        // ① 拒绝构造式闭集：`PacketRejection { … }` 字面量只许住在冻结的四枚函数里。
        let mut literal_sites: Vec<String> = Vec::new();
        for (owner, line) in attributed_production_lines(source) {
            if !strip_trailing_comment(line).contains("PacketRejection {") {
                continue;
            }
            if let Some(function) = owner {
                if !literal_sites.contains(&function) {
                    literal_sites.push(function);
                }
            }
        }
        literal_sites.sort();
        let frozen: Vec<String> = WIRE_REJECTION_LITERAL_SITES
            .iter()
            .map(|name| name.to_string())
            .collect();
        assert_eq!(
            literal_sites, frozen,
            "新写一枚拒绝构造式即红：否则它的调用点会整族逃出扫描面"
        );

        // ② 全部具名拒绝与手写表逐行相同。
        let scanned = scan_wire_rejections(source);
        let table = wire_judgment_ledger();
        let mut registered: Vec<(String, String)> = table
            .iter()
            .map(|row| (row.function.to_string(), row.reason.to_string()))
            .collect();
        registered.sort();
        assert_eq!(
            scanned, registered,
            "协议模块的具名拒绝必须与对照表逐行相同：新增一枚判据就得同批补表并给出归属"
        );

        // ③ `Fronted` 行必须真落在 D1 清单的 `(input, judgment)` 上，且该行的 site
        //    在 host 前置族内——「已前置」不许只是嘴上说。
        let manifest = bounded_input_manifest();
        for row in &table {
            match row.disposition {
                WireDisposition::Fronted { inputs, note } => {
                    assert!(
                        !inputs.is_empty(),
                        "{}/{} 登记为已前置，却没指名清单行",
                        row.function,
                        row.reason
                    );
                    assert!(
                        !note.trim().is_empty(),
                        "{}/{} 登记为已前置，却没写归属说明",
                        row.function,
                        row.reason
                    );
                    for (input, judgment) in inputs {
                        let entry = manifest
                            .iter()
                            .find(|entry| entry.input == *input)
                            .unwrap_or_else(|| {
                                panic!(
                                    "{}/{} 指名的清单行 {input} 不存在",
                                    row.function, row.reason
                                )
                            });
                        assert!(
                            entry.judgments.contains(judgment),
                            "{}/{} 指名清单行 {input} 由 {judgment} 前置，该行的判据表里却没有它",
                            row.function,
                            row.reason
                        );
                        assert!(
                            HOST_PREFLIGHT_FAMILY.contains(&entry.site),
                            "{}/{} 指名的清单行 {input} 落在 host 前置族之外的 {}",
                            row.function,
                            row.reason,
                            entry.site
                        );
                    }
                }
                WireDisposition::Other(reason) => {
                    assert!(
                        !reason.trim().is_empty(),
                        "{}/{} 登记为非 host 输入值判据，却没写理由",
                        row.function,
                        row.reason
                    );
                }
            }
        }

        // ④ 计数冻结。
        let fronted = table
            .iter()
            .filter(|row| matches!(row.disposition, WireDisposition::Fronted { .. }))
            .count();
        assert_eq!(table.len(), 90, "协议模块具名拒绝行数");
        assert_eq!(fronted, 12, "其中已由 host 前置的行数");
    }
}
