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
    self, container_dir, is_safe_container_token, sync_directory, AuthorizationDecision,
    AuthorizationDenyCode, EffectStartedPayload, EffectSucceededPayload, Journal, JournalError,
    JournalPayload, JournalRecord, JournalType, SessionFailureCause, SessionInterruptReason,
    SessionProjection, SessionResumedPayload, SessionStartedPayload, TargetTriple,
    ToolProposedPayload, PI_LOOP_DIR,
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
    BudgetStopReason, BudgetTurnLimit, BudgetView, CancelReason, HostDeniedCode, HostFailureCode,
    HostResultOutcome, HostResultPayload, HostResultValue, PacketPayload, PacketRejection,
    ListEntry, ProductPacket, ProductToolName, ProtocolErrorCode, ResumeKind, Terminal,
    TerminalFailureCode, WorkspaceCapability, WorkspaceHostRequest, WorkspaceOperation,
    WorkspaceRequestArguments, WriteDisposition, MAX_API_KEY_BYTES, MAX_CASE_ROOT_BYTES,
    MAX_MODEL_ID_BYTES, MAX_TEXT_BYTES, MAX_TURNS_LIMIT, MAX_USD_LIMIT,
};

/// ready 握手必须逐值等于这张表（次序即判据：Node 侧按字典序归一后出包）。
///
/// `PI-WRITE-HOST-1` ⑤ 加入 `workspace_write`：它只表示「本会话可以**申请** workspace write
/// host operation」，不表示预先批准——逐次授权仍在 `WriteDecisionDriver`（ADR-022 六-C）。
/// `PI-WORKSPACE-READ-1` 加入 `workspace_read`：同理只是申请权，服务 `exists/read_file/list`
/// 三枚 env 内部操作，**不**新增模型工具。次序即判据（Node 侧按字典序归一后出包）。
const EXPECTED_CAPABILITIES: &[WorkspaceCapability] = &[
    WorkspaceCapability::CaseRead,
    WorkspaceCapability::WorkspaceRead,
    WorkspaceCapability::WorkspaceWrite,
];

/// `proposalHash` 的域分隔串（ADR-022 六-B.2）。它与 Node 侧
/// `WORKSPACE_WRITE_PROPOSAL_DOMAIN` 是同一枚字面量的两份；两侧由
/// `packages/pi-lane/fixtures/write-session-wire-v1.jsonl` 这枚双端 golden 钉在一起，
/// 任一侧单独漂移都会让对端的 golden 判据当场红。
const WORKSPACE_WRITE_PROPOSAL_DOMAIN: &str = "courtwork.pi.workspace_write.v1";

/// 读面 `proposalHash` 的域分隔串（ADR-022 六-B.2 read 行）。与写面**不同值**，故两族提案
/// hash 结构性不可互冒：把一枚写提案的 hash 搬到读请求上，这里重算即不符。
const WORKSPACE_READ_PROPOSAL_DOMAIN: &str = "courtwork.pi.workspace_read.v1";

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
/// 这些值最终都要过 `encode_packet_line` 的同一套闭集判据。**历史上**那是 spawn 之后的事：
/// 首轮实现会为一份 `maxTurns=0` 的配置先落 `session_started`、再起一枚进程，最后才由
/// encoder 报 `invalid_schema`。判据前移到入参层，错的配置一步都走不动。
///
/// 1R 只补了下界，上界仍漏：`maxTurns=13`、`maxUsd=100001`、257 字节 `modelId` 三者
/// 都走到 spawn 之后才由 encoder 拦下（复验 blocker 2）。三枚上界的冻结值直接取
/// `pi_loop_protocol` 的常量，不在此另抄一份——两谱各抄一次就各自漂移。
///
/// PI-HOST-LOOP-1R3 D1 按**族**收口：前两轮各按验收报告点名的实例补门，于是每轮都被
/// 下一位验收者在同族里找到另一枚。凡进入 host→sidecar 方向、在 `pi_loop_protocol`
/// 有冻结上界或非空/形状要求的入参，一律在此一次收齐。
///
/// **今日的次序不再是「encoder 在 spawn 之后」**：1R6 起 exact packet 在任何 journal
/// append 与 spawn 之前就真编出来（见 `encode_outbound_line`），1R7 起连 `load_session`
/// 的 durable 修复也退到编码之后（见 `PlannedSession`）。encoder 的同名检查因此不是
/// 「最后一道」而是**同一批判据的第二遍**，前置门留着的理由只剩文案归属
/// （`modelId 不得含 NUL` 好过 `invalid_schema`）。1R3 那套「清单与源码扫描的双向自证」
/// 已按 1R6 H2 整体退役；今日的自证是 `bounded_input_manifest` 的行为反例，加上
/// 违规电池驱动完整入口的普适不变量（`Err ⇒ 副作用恰零`）。
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

// ── 编码-先于-效果 ──────────────────────────────────────────────────────────

/// 编码失败时给出的 codec 通用文案。**零字段回显**：key、物理案件根与任何入参值一个字节
/// 都不进错误（本模块红线 2）——`PacketRejection.reason` 会带上字段标签与实况，故一律丢弃，
/// 只保留具名 code 与这句静态文案。
const CONFIG_NOT_ENCODABLE: &str = "配置无法编成 bootstrap packet";
const PROMPT_NOT_ENCODABLE: &str = "prompt 无法编成 packet";

/// 一行**已经编成字节**的出包：seq 与 bytes 同时定下，发送端只搬运、不再构造。
///
/// PI-HOST-LOOP-1R6 §零裁定一。1R3→1R5 三轮做的是同一件事的手工版：把 codec 的每一条
/// wire 判据在 host 前置门里再抄一遍，再拿扫描器盯住两谱同步。三轮同败于同一处——
/// 在富语言里用文本模式枚举语义构造，合法拼写无穷，枚举器的种群谓词永远追不上。
///
/// 改道后不再有「同步」这件事：**先真编码，再产生任何效果**。codec 成为唯一校验真源，
/// 今日与未来的每一条 wire 判据都自动排在 journal append 与 spawn 之前，需要同步的账
/// 结构性消失。既有前置门一枚不撤：它们给出带字段归属的文案（`modelId 不得含 NUL`
/// 好过 `invalid_schema`），且 caseRoot 的 lstat、容器 token 的目录路径用途等**非 wire**
/// 判据本来就不在 codec 辖内。
struct OutboundLine {
    seq: u64,
    bytes: Vec<u8>,
}

/// 把「将要发出的那一行」在任何效果之前真编出来。
///
/// `outbound_seq` 是**编码时**的已发计数，编出来的 seq 恒为它 +1；发送端照搬这枚 seq，
/// 不重算、不重编——验过的那一份与发出去的那一份因此是同一份字节。
fn encode_outbound_line(
    outbound_seq: u64,
    session_id: &str,
    request_id: Option<&str>,
    payload: PacketPayload,
) -> Result<OutboundLine, PacketRejection> {
    let seq = outbound_seq + 1;
    let packet = ProductPacket {
        seq,
        session_id: Some(session_id.to_string()),
        request_id: request_id.map(str::to_string),
        payload,
    };
    let bytes = encode_packet_line(&packet)?;
    Ok(OutboundLine { seq, bytes })
}

/// codec 拒绝 → 具名 host 拒绝的唯一映射点（config 侧 / prompt 侧各一枚）。
///
/// `PacketRejection.reason` 带字段标签与实况，一律**丢弃**：这条路上的入参正是 apiKey 与
/// 物理案件根，回显一个字节都不行（本模块红线 2）。因此签名吃掉整枚 rejection、只交出
/// 闭集 code 与静态文案；具名 code 不得退化成通用 `protocol`——那会把「配置错」说成
/// 「协议错」，也让调用方分不出该改配置还是该报故障。
fn config_codec_refusal(_rejection: PacketRejection) -> HostError {
    HostError::InvalidConfig(CONFIG_NOT_ENCODABLE)
}

fn prompt_codec_refusal(_rejection: PacketRejection) -> HostError {
    HostError::InvalidPrompt(PROMPT_NOT_ENCODABLE)
}

// ── workspace write 的 effect 接缝（PI-WRITE-HOST-1 ③）──────────────────────

/// 一枚 workspace write 的**计划**：字段全部来自已过 wire 判据的 `host_request`。
///
/// 物理坐标一个字节都不在其中——物理根永不进 journal、wire 与模型（ADR-022 六-C）。
pub(crate) struct WorkspaceWritePlan {
    pub(crate) operation_id: String,
    /// wire 上没有这一枚（`host_request` 恰 `{operationId,proposalHash,capability,arguments}`）；
    /// 唯一真源是本 leg 已 durable 的 `tool_started`，见 {@link PiLoopHost::serve_host_request}。
    pub(crate) tool_call_id: String,
    pub(crate) logical_path: String,
    pub(crate) proposal_hash: String,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
    /// 正文只在内存里活着：journal 只记逻辑路径 / hash / byteLength / outcome。
    pub(crate) content: String,
}

/// 逐次授权的结论（核心不变量 3：授权属用户）。
pub(crate) enum WriteAuthorization {
    Approved,
    Denied(AuthorizationDenyCode),
}

/// effect 的三态结局（ADR-022 六-C）。
pub(crate) enum EffectOutcome {
    Succeeded,
    Failed(HostFailureCode),
    /// replace 已被调用而结果无法自证：既不能声称回滚，也不得复用授权自动重试。
    Uncertain,
}

/// workspace write 的注入座。
///
/// ④ 之后 `probe`/`perform` 的真件是 {@link crate::pi_loop_workspace::WorkspaceFsHost}；
/// `decide` 的真源仍在注入座之外——真件把它转交 {@link WriteDecisionDriver}，
/// 缺 driver 即 `policy_denied`（ADR-022 六-C 明禁「用 session always-allow 冒充产品授权」），
/// 真 driver（GUI 或 headless 验收）属⑤。
pub(crate) trait WorkspaceWriteHost {
    /// 授权**前**的在场判定：目标已在 ⇒ `Overwritten`，否则 `Created`（ADR-022 六-C）。
    ///
    /// ④ 按 ③回执 §六.6 放宽为 `Result`：真件的 symlink / not_directory / is_directory /
    /// invalid_path / unsupported_file_type / unsupported_filesystem / io 都是真实可达的失败分支。
    /// **纯读**：`probe` 一个字节都不许动——建目录同样是物理 mutation，只能排在
    /// `effect_started` 之后。
    fn probe(&mut self, plan: &WorkspaceWritePlan) -> Result<WriteDisposition, HostFailureCode>;

    /// 逐次授权。
    fn decide(&mut self, plan: &WorkspaceWritePlan, action: WriteDisposition)
        -> WriteAuthorization;

    /// 真实落盘。`Succeeded` 的语义是「④ 的全部物理屏障已过」，不是「rename 返回了 0」。
    fn perform(&mut self, plan: &WorkspaceWritePlan, action: WriteDisposition) -> EffectOutcome;
}

/// workspace 读的注入座（`PI-WORKSPACE-READ-1`）。
///
/// 与 {@link WorkspaceWriteHost} 分列两枚 trait 而不是并进一枚：读**没有** probe/decide/perform
/// 三段——它没有 effect，也就没有可授权的对象。合成一枚会逼出「读的 decide 恒 Approved」
/// 这种恒真桩，那正是 ADR-022 六-C 明禁的「用恒批准冒充授权」的形状。
pub(crate) trait WorkspaceReadHost {
    fn exists(&mut self, logical_path: &str) -> Result<bool, HostFailureCode>;
    /// 回 `(content, byteLength)`；`byteLength` 是 UTF-8 实长，由真件从正文自算。
    fn read_file(&mut self, logical_path: &str) -> Result<(String, u64), HostFailureCode>;
    fn list(&mut self, logical_path: &str) -> Result<Vec<ListEntry>, HostFailureCode>;
}

/// 逐次授权的真源座（ADR-022 六-C：授权属用户）。
///
/// **非加不可**：④ 把 production 的 `write_host` 从 `None` 换成真件的那一刻，`decide` 必须
/// 有一个答案。硬编码 `Approved` 就是 ADR 明禁的「用 session always-allow 冒充产品授权」，
/// 而把 `decide` 留在 `WorkspaceWriteHost` 上又会让真件无处安放外部决定。故立此一枚座：
/// 缺席 ⇒ `policy_denied` fail-closed，⑤／headless 验收装真件。
pub(crate) trait WriteDecisionDriver {
    fn decide(&mut self, plan: &WorkspaceWritePlan, action: WriteDisposition)
        -> WriteAuthorization;
}

/// 出站结果的四支构造器。逐支只吃计划与结局，不碰 `self`——「编出来的那一份」
/// 与「落账的那一份」因此只有一处取值来源。
fn write_success_payload(plan: &WorkspaceWritePlan, action: WriteDisposition) -> HostResultPayload {
    HostResultPayload {
        operation_id: plan.operation_id.clone(),
        capability: WorkspaceCapability::WorkspaceWrite,
        operation: WorkspaceOperation::Write,
        outcome: HostResultOutcome::Ok(HostResultValue::Write {
            logical_path: plan.logical_path.clone(),
            disposition: action,
            content_sha256: plan.content_sha256.clone(),
            byte_length: plan.byte_length,
        }),
    }
}

fn write_denied_payload(plan: &WorkspaceWritePlan, code: HostDeniedCode) -> HostResultPayload {
    HostResultPayload {
        operation_id: plan.operation_id.clone(),
        capability: WorkspaceCapability::WorkspaceWrite,
        operation: WorkspaceOperation::Write,
        outcome: HostResultOutcome::Denied {
            code,
            message: code.message().to_string(),
        },
    }
}

fn write_failed_payload(plan: &WorkspaceWritePlan, code: HostFailureCode) -> HostResultPayload {
    HostResultPayload {
        operation_id: plan.operation_id.clone(),
        capability: WorkspaceCapability::WorkspaceWrite,
        operation: WorkspaceOperation::Write,
        outcome: HostResultOutcome::Failed {
            code,
            message: code.message().to_string(),
        },
    }
}

/// `uncertain` 的文案与终态表同源：`effect_uncertain` 的 prompt 终态用的就是这一句，
/// 两处各抄一份就会各自漂移。
fn write_uncertain_payload(plan: &WorkspaceWritePlan) -> HostResultPayload {
    HostResultPayload {
        operation_id: plan.operation_id.clone(),
        capability: WorkspaceCapability::WorkspaceWrite,
        operation: WorkspaceOperation::Write,
        outcome: HostResultOutcome::Uncertain {
            message: TerminalFailureCode::EffectUncertain.message().to_string(),
        },
    }
}

/// journal 侧的拒绝 code → wire 侧的拒绝 code。两枚闭集逐值同名，映射手写不派生：
/// 日后任一侧加成员，这里当场编译不过，不会静默压扁。
fn denied_code_on_wire(code: AuthorizationDenyCode) -> HostDeniedCode {
    match code {
        AuthorizationDenyCode::UserDenied => HostDeniedCode::UserDenied,
        AuthorizationDenyCode::PolicyDenied => HostDeniedCode::PolicyDenied,
    }
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
    /// 本 leg 里**尚未收束**的那一枚 write tool call（③）。`host_request` 的 wire 上没有
    /// `toolCallId`，四段账又逐枚要它——这是它的唯一真源。认领即消费（一 tc 一 op）。
    active_tool_call: Option<String>,
    /// workspace write 的真件座。production 恒 `None`：④ 才装 cap-std 落盘件，
    /// ③ 不拿脚本座冒充成功（总纲不变量 4）。
    write_host: Option<Box<dyn WorkspaceWriteHost>>,
    /// workspace 读的真件座（`PI-WORKSPACE-READ-1`）。与 `write_host` 分列两枚：
    /// 读臂不碰授权、不落账，两座各自可注入、各自可缺席。
    read_host: Option<Box<dyn WorkspaceReadHost>>,
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

    /// **测试专用**：换掉构造点装上的真件（换脚本座，或置 `None` 以保留 0.4 门的反例）。
    /// production 没有 setter：`write_host` 恒由构造点装真件。
    #[cfg(test)]
    fn install_write_host(&mut self, host: Option<Box<dyn WorkspaceWriteHost>>) {
        self.write_host = host;
    }

    #[cfg(test)]
    fn install_read_host(&mut self, host: Option<Box<dyn WorkspaceReadHost>>) {
        self.read_host = host;
    }

    /// **测试专用**：把 `workspace_write` 从本次握手结果里撤掉。
    ///
    /// ⑤ 之后握手闭集恒含它（`EXPECTED_CAPABILITIES` 逐值比对，谈不成就根本起不来 leg），
    /// 于是 `serve_host_request` 的 0.1 能力门在产品线上再也无法由真实握手证否。撤销这一枚
    /// 正是为了让那道门**仍有可被证否的形态**：撤掉之后来一枚 write 请求，
    /// 若 0.1 不在，它就会一路走到真实 effect。③ 期的 `grant_workspace_write` 由此反向取代。
    #[cfg(test)]
    fn revoke_workspace_write(&mut self) {
        self.capabilities
            .retain(|capability| *capability != WorkspaceCapability::WorkspaceWrite);
    }

    /// **测试专用**：把 `workspace_read` 从本次握手结果里撤掉。
    ///
    /// 与 {@link PiLoopHost::revoke_workspace_write} 同一条理由：`PI-WORKSPACE-READ-1` 之后
    /// 握手闭集恒含 `workspace_read`，0.1 能力门对读也再不能由真实握手证否。撤掉它之后来一枚
    /// 读请求，若 0.1 不在，它就会一路走到真实文件读取。
    #[cfg(test)]
    fn revoke_workspace_read(&mut self) {
        self.capabilities
            .retain(|capability| *capability != WorkspaceCapability::WorkspaceRead);
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
    /// 7. ready 且 capability 逐值等于 `EXPECTED_CAPABILITIES`，否则落
    ///    `session_failed{protocol,state_violation}`。
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

        // 4. journal **读/计划相**（先取单写者锁，再读字节、内存跳过 partial tail、结构校验与
        //    quarantine 判定，算出唯一 usage 补写与五步 crash fold 的修复计划与投影）。
        //
        //    PI-HOST-LOOP-1R7 §零裁定一：这一相**零 journal 内容写入**。物理截断、usage
        //    补写与 crash fold 的落盘全部推迟到 `planned.apply()`，它排在 5.5 编码成功之后。
        //    1R6 已经把编码排在本函数自己的 append 之前，但 `load_session` 自身会写盘，恢复
        //    既有会话时三项担保因此不成立（复验实测 journal 558 B → 790 B 而 spawn/wire 均零）。
        //    此后任何一条 Err 出口（closed 门、resume 漂移具名拒、codec 拒）都让计划随
        //    `PlannedSession` 一起弃置，账本原状重现；下一次成功的 start 重算同一计划。
        let planned = pi_loop_journal::plan_session(
            app_data_dir,
            &config.container_id,
            &config.session_id,
            SessionInterruptReason::SidecarEnded,
        )?;
        let projection = planned.projection().clone();

        if projection.is_closed() {
            return Err(HostError::SessionClosed);
        }

        let started;
        let leg;
        // 5. fresh / resume 各自的开场记录。**先定内容、后落账**：落账动作统一挪到编码
        //    之后（下一段），两条路的判定顺序与文本一字未动。
        let opening;
        match projection.started.clone() {
            None => {
                leg = 1;
                started = SessionStartedPayload {
                    route_manifest_sha256: pair.manifest_sha256().to_string(),
                    target_triple: pair.target_triple(),
                    grant_id: config.grant_id.clone(),
                    // 裁定A：记当刻真值。capabilities 取的是本会话**必须**谈成的那一张表
                    // ——第 7 步 ready 若不逐值等于它，leg 当场以 StateViolation 收束，
                    // 故「记下的」与「谈成的」在任何能继续往下跑的路径上恒等。
                    prompt_id: pi_loop_journal::CURRENT_PROMPT_ID.to_string(),
                    model_id: config.model_id.clone(),
                    max_turns: config.max_turns,
                    max_usd: config.max_usd,
                    capabilities: EXPECTED_CAPABILITIES.to_vec(),
                };
                opening = JournalPayload::SessionStarted(started.clone());
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
                opening = JournalPayload::SessionResumed(SessionResumedPayload {
                    previous_leg: projection.leg,
                    // prior 三值必须由本 journal fold；绝不重置，也不把 null 恢复成 0。
                    prior_observed_turns: projection.prior_observed_turns,
                    prior_turns: projection.prior_turns,
                    prior_usd: projection.prior_usd,
                    // Gate D：记 resumed leg 的**当刻**身份，与 fresh 路的 `session_started`
                    // （上文 :763/:767）同源同理。旧档 `session_started` 声称的旧值不再顶名新
                    // leg 的实况——第 7 步 ready 若不逐值等于 `EXPECTED_CAPABILITIES`，leg 当场
                    // 以 StateViolation 收束，故「记下的」与「谈成的」在任何能往下跑的路径上恒等。
                    prompt_id: pi_loop_journal::CURRENT_PROMPT_ID.to_string(),
                    capabilities: EXPECTED_CAPABILITIES.to_vec(),
                });
            }
        }

        // 5.5 编码-先于-效果（PI-HOST-LOOP-1R6 H1）。首枚 bootstrap 的**成品字节**在
        //     `session_started` / `session_resumed` 落账与 spawn 之前就编出来：codec 的
        //     每一条 wire 判据自此天然排在效果之前，不再需要在前置门里抄第二份。
        //     编码失败以 `invalid_config` 收场，只带 codec 通用文案、零值回显。
        //
        //     resume 三值取**落账前**的投影：`fold` 对 `session_resumed` 只改 leg /
        //     leg_open / interrupted，prior 三值一字不动，故与旧写法（落账后再 fold）
        //     逐值相同；`started` 的 limits 在 fresh 路来自 config、在 resume 路已被
        //     `limits 漂移` 门锁成与 config 相等。
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
                prior_observed_turns: projection.prior_observed_turns,
                prior_turns: projection.prior_turns,
                prior_usd: projection.prior_usd,
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
                max_turns: started.max_turns,
                max_usd: started.max_usd,
            },
            resume,
        });
        // bootstrap 是本 leg 的首枚出包：编码时的已发计数恒为 0，编出来的 seq 恒为 1。
        let bootstrap_line = encode_outbound_line(0, &config.session_id, None, bootstrap)
            .map_err(config_codec_refusal)?;

        // 6. durable → cwd → spawn → bootstrap。恢复计划在这里、也只在这里落盘：编码之前
        //    它还只是一组值（1R7 §零裁定一）。
        let loaded = planned.apply()?;
        let mut journal = loaded.journal;
        let lock = loaded.lock;
        let mut records = loaded.records;
        journal.set_leg(leg);
        records.push(journal.append(None, None, opening)?);

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
            active_tool_call: None,
            // ④：production 从此有真件；⑤：握手也谈成了 `workspace_write`；
            // `PI-WORKSPACE-READ-1`：握手再谈成 `workspace_read`，读件同批装上。
            //
            // 两道产品闸的现况**如实登记**：
            // - 0.1 能力门：`workspace_write` 与 `workspace_read` 都已进闭集，故它不再挡这两枚。
            //   它挡的是**本次握手没谈成**的任何 capability——可证否形态由
            //   `revoke_workspace_write` 与 `revoke_workspace_read` 两枚反例保留，
            //   不随能力到位而失去覆盖。
            // - 逐次授权：production **至今没有 decision driver**（GUI/headless 验收才注入），
            //   故真件的 `decide` 恒 `policy_denied`——产品线上的 write 因此仍零 effect，
            //   且是显式拒绝、显式落账，不是静默跳过。硬编码 `Approved` 属 ADR-022 六-C 明禁。
            //   **读没有这一道**：读不是 effect，没有可授权的对象；它的边界全在容器与 grammar。
            write_host: Some(Box::new(crate::pi_loop_workspace::WorkspaceFsHost::new(
                app_data_dir,
                &config.container_id,
                &config.session_id,
            ))),
            read_host: Some(Box::new(crate::pi_loop_workspace::WorkspaceFsHost::new(
                app_data_dir,
                &config.container_id,
                &config.session_id,
            ))),
            closed: false,
        };

        // 发的就是 5.5 验过的那一份字节，不重编。
        host.write_encoded(bootstrap_line)?;

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

    /// 发一行**已编好**的字节。seq 由编码时定下，这里只认领，不重算也不重编。
    fn write_encoded(&mut self, line: OutboundLine) -> Result<(), HostError> {
        self.outbound_seq = line.seq;
        let leg = self
            .leg_handle
            .as_mut()
            .ok_or(HostError::Process(ProcessFault::UnexpectedEof))?;
        leg.write_packet(&line.bytes).map_err(HostError::Process)
    }

    /// 出站 `host_result` 的**唯一**编码入口（PI-WRITE-HOST-1 ②，偿 PI-HOST-LOOP-1R3 D1 表①
    /// 登记的五枚前向债：`read_host_result_payload`×3、`read_list_entry`、`read_logical_path`）。
    ///
    /// 与 `send` 分成两相，因为这条路上编码与发送之间**有**效果：`tool_proposed`/
    /// `effect_started` 的 durable append、真实落盘、三态收束都排在中间。故只交出
    /// 已编好的 `OutboundLine`，由调用方在效果全部完成后 `write_encoded` 照搬同一份字节。
    ///
    /// 本函数只吃 `&self`：不落账、不发包、不推进 `outbound_seq`——「Err ⇒ 副作用恰零」
    /// 在这一枚上是**结构性**的，行为轴断言（D1 出站探针）另判，防的是日后有人改成
    /// `&mut self` 顺手做事。
    ///
    /// 拒绝映射同 `send`：`PacketRejection.reason` 带字段标签与实况，一律丢弃，
    /// 只留闭集 `ProtocolErrorCode`——逻辑路径与正文一个字节都不进错误（本模块红线 2）。
    fn encode_host_result(
        &self,
        request_id: &str,
        payload: HostResultPayload,
    ) -> Result<OutboundLine, HostError> {
        encode_outbound_line(
            self.outbound_seq,
            &self.session_id,
            Some(request_id),
            PacketPayload::HostResult(payload),
        )
        .map_err(|rejection| HostError::Protocol(rejection.code))
    }

    /// `encode_host_result` 在 `pump` 里的落点：编不出来就是协议级故障。
    ///
    /// 既然这一枚 `host_result` 答不出来，本 session 也就走不下去，故按 `pump` 既有形显式落
    /// `session_failed{protocol,code}` 并回收 leg——不静默继续，也不留一枚永不收束的 operation。
    fn encode_or_fail(
        &mut self,
        request_id: &str,
        payload: HostResultPayload,
    ) -> Result<OutboundLine, HostError> {
        match self.encode_host_result(request_id, payload) {
            Ok(line) => Ok(line),
            Err(HostError::Protocol(code)) => Err(self.fail_protocol(code)),
            Err(other) => Err(other),
        }
    }

    /// cancel / shutdown 的出包：两相同形（先编码后发送），只是这两条路上编码与发送之间
    /// 本来就没有任何效果，故合成一枚。
    fn send(&mut self, request_id: Option<&str>, payload: PacketPayload) -> Result<(), HostError> {
        let line = encode_outbound_line(self.outbound_seq, &self.session_id, request_id, payload)
            .map_err(|rejection| HostError::Protocol(rejection.code))?;
        self.write_encoded(line)
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

        // 编码-先于-效果（H1）：整枚 prompt packet 的成品字节先编出来，`user_prompted`
        // 落账、requestId 认领与发包都排在它之后。编码失败沿 prompt 侧具名 code，
        // 只带 codec 通用文案，requestId 不占用。
        let line = encode_outbound_line(
            self.outbound_seq,
            &self.session_id,
            Some(request_id),
            PacketPayload::Prompt {
                text: text.to_string(),
            },
        )
        .map_err(prompt_codec_refusal)?;

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

        // 发的就是上面验过的那一份字节，不重编。
        self.write_encoded(line)?;
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
                    // 写侧序号门（PI-HOST-JOURNAL-1 ②）：与读侧 `validate_records` 同真源，
                    // `turn_finished` 必须逐一递增。坏序号在 append 前拒绝——坏事件零落盘，
                    // 失败经 `fail_protocol` 显式落账；否则本机会 durable 写入自家读侧必拒的
                    // 记录，下次 start 整档 quarantine。
                    if let AgentProjectionEvent::TurnFinished { turn, .. } = &event {
                        if !pi_loop_journal::turn_finished_follows(
                            self.projection.prior_observed_turns,
                            *turn,
                        ) {
                            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
                        }
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
                    // 活动 write tool call 的唯一真源（PI-WRITE-HOST-1 ③）：`host_request` 的
                    // wire 上没有 `toolCallId`，四段账逐枚要它。只认 `write`——别的工具不经
                    // 宿主 effect，替它们记一枚只会让 `host_request` 找到不该找的主。
                    match &event {
                        AgentProjectionEvent::ToolStarted {
                            tool_call_id,
                            tool_name: ProductToolName::Write,
                        } => {
                            self.active_tool_call = Some(tool_call_id.clone());
                        }
                        AgentProjectionEvent::ToolFinished { tool_call_id, .. }
                            if self.active_tool_call.as_deref() == Some(tool_call_id.as_str()) =>
                        {
                            self.active_tool_call = None;
                        }
                        _ => {}
                    }
                    self.published.push(HostEvent::Agent(event));
                }
                PacketPayload::HostRequest(request) => {
                    if packet.request_id.as_deref() != Some(request_id) {
                        return Err(self.fail_protocol(ProtocolErrorCode::RequestMismatch));
                    }
                    self.serve_host_request(request_id, request)?;
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

    /// ADR-022 六-B.2 的 `proposalHash`。
    ///
    /// ```text
    /// proposalHash = sha256(frame(domain) || frame(sessionId) || frame(requestId)
    ///                       || frame(operationId) || frame(logicalPath)
    ///                       || frame(byteLength 十进制) || frame(contentSha256))
    /// frame(x)     = u32be(UTF8(x).byteLength) || UTF8(x)
    /// ```
    ///
    /// 长度前缀在场，故任何一枚字段的边界都不可能被另一枚吞掉——「拼串」式的域混淆
    /// （`a|bc` 与 `ab|c`）在这一形上结构性不成立。
    fn workspace_write_proposal_hash(
        session_id: &str,
        request_id: &str,
        plan: &WorkspaceWritePlan,
    ) -> String {
        let byte_length = plan.byte_length.to_string();
        let mut bytes = Vec::new();
        for field in [
            WORKSPACE_WRITE_PROPOSAL_DOMAIN,
            session_id,
            request_id,
            plan.operation_id.as_str(),
            plan.logical_path.as_str(),
            byte_length.as_str(),
            plan.content_sha256.as_str(),
        ] {
            bytes.extend_from_slice(&(field.len() as u32).to_be_bytes());
            bytes.extend_from_slice(field.as_bytes());
        }
        pi_loop_journal::sha256_hex(&bytes)
    }

    /// `host_request` 臂：一枚 workspace write 的四段落账（PI-WRITE-HOST-1 ③）。
    ///
    /// 次序即语义（ADR-022 六-C），前一步不过就绝不走到后一步：
    ///
    /// 0. 四道门——能力、参数族、活动 tool call、真件座。任一不成立即 `state_violation`，
    ///    零落账、零效果、零出包；
    /// 1. 在场判定 → 派生 `created|overwritten` 静态动作标签；
    /// 2. **编码先于效果**：成功行的整枚 packet 在任何 append 与任何效果之前真编出来。
    ///    codec 是唯一校验真源，今日与未来的每一条 wire 判据都因此排在 journal、effect
    ///    与发包之前（1R6 §零裁定一）；
    /// 3. `tool_proposed` → `authorization_decided`。被拒即在此收束，`effect_started` 不落；
    /// 4. 授权后、effect 前**再次**在场判定：动作已变则 `state_changed` 且零写；
    /// 5. `effect_started` append + `sync_all` 成功才允许进入 effect——它是第一次真实写入
    ///    之前的最后一道 durable 屏障（票面判据：失败即零 temp / 零 replace）；
    /// 6. 三态逐枚 durable 收束；
    /// 7. 终态记录 durable 之后才发包，且成功那一行发的就是第 2 步验过的同一份字节。
    fn serve_host_request(
        &mut self,
        request_id: &str,
        request: WorkspaceHostRequest,
    ) -> Result<(), HostError> {
        // 0.1 能力门：只服务本次握手**真的谈成**的那几枚。不拿编译期 expected 洗白，也不认
        //     请求自报。⑤ 与 `PI-WORKSPACE-READ-1` 之后 `workspace_write`／`workspace_read`
        //     都已在闭集内，本门对这两枚不再是产品线上的挡板（挡 write 的是逐次授权那一道）；
        //     它挡的是本次握手**没谈成**的任何 capability。可证否形态由
        //     `revoke_workspace_write` 与 `revoke_workspace_read` 两枚反例保留，
        //     不随能力到位而失去覆盖。
        if !self.capabilities.contains(&request.capability) {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }
        // 0.2 按 capability 分叉。闭集恰两枚，两枚都已实装；将来若再添一枚而此处未跟上，
        //     它会落到下面的 `else` 上被**显式**拒，不静默跳过（1R5 判例：unknown → 跳过是病根）。
        if request.capability == WorkspaceCapability::WorkspaceRead {
            return self.serve_read_request(request_id, request);
        }
        if request.capability != WorkspaceCapability::WorkspaceWrite {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }
        let WorkspaceRequestArguments::Write(arguments) = request.arguments else {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        };
        // 0.3 一 tc 一 op。`toolCallId` 不在 wire 上，唯一真源是本 leg 已 durable 的
        //     `tool_started`；认领即消费，同一枚 tool call 的第二枚 host_request 因此当场无主。
        let Some(tool_call_id) = self.active_tool_call.take() else {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        };
        // 0.4 真件座。④ 之后构造点恒装真件，本门于产品线上因此结构性不可达；保留为
        //     fail-closed 兜底——缺件一律显式拒，绝不静默跳过或拿脚本座冒充成功。
        if self.write_host.is_none() {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }

        let plan = WorkspaceWritePlan {
            operation_id: request.operation_id,
            tool_call_id,
            logical_path: arguments.logical_path,
            proposal_hash: request.proposal_hash,
            content_sha256: arguments.content_sha256,
            byte_length: arguments.byte_length,
            content: arguments.content,
        };

        // 0.5 `proposalHash` 由**本侧重算**，不认对端自报（ADR-022 六-B.2 明文「Rust 必须
        //     重算」）。它绑定 session/request/operation 三枚 id 与逻辑路径、长度、内容 hash：
        //     任一枚被篡改，这里当场不符，请求**从未成为提案**，effect 恰零次。
        //     与④ 的**内容** hash 重算是两枚不同的 hash：那一枚挡在授权之后、replace 之前，
        //     这一枚挡在提案之前，两者不互相顶名（`proposal_hash_and_content_hash_are_two_different_gates`）。
        let recomputed = Self::workspace_write_proposal_hash(&self.session_id, request_id, &plan);
        if recomputed != plan.proposal_hash {
            return self.settle_failed(request_id, &plan, HostFailureCode::HashMismatch);
        }

        // 1. 在场判定（④ 起是 capability `Dir` 的实测）。它自己就能失败：grammar、symlink、
        //    目录、不支持的文件系统都在这一步现形。**从未成为提案**的请求因此在这里收束——
        //    `tool_proposed` 不落，effect 恰零次（ADR-022 六-B.2：Rust 防御门以同 code 拒绝且零
        //    effect）。
        let action = match self.effector().probe(&plan) {
            Ok(action) => action,
            Err(code) => return self.settle_failed(request_id, &plan, code),
        };

        // 2. 编码-先于-效果。这一枚 `OutboundLine` 一直捏在手里，直到第 7 步原样发出。
        let success_line = self.encode_or_fail(request_id, write_success_payload(&plan, action))?;

        // 3. 第一、二段账。
        self.append_effect_record(
            request_id,
            &plan,
            JournalPayload::ToolProposed(ToolProposedPayload {
                tool_call_id: plan.tool_call_id.clone(),
                logical_path: plan.logical_path.clone(),
                proposal_hash: plan.proposal_hash.clone(),
                content_sha256: plan.content_sha256.clone(),
                byte_length: plan.byte_length,
                action,
            }),
        )?;

        let (decision, deny_code) = match self.effector().decide(&plan, action) {
            WriteAuthorization::Approved => (AuthorizationDecision::Approved, None),
            WriteAuthorization::Denied(code) => (AuthorizationDecision::Denied, Some(code)),
        };
        self.append_effect_record(
            request_id,
            &plan,
            JournalPayload::AuthorizationDecided {
                tool_call_id: plan.tool_call_id.clone(),
                decision,
                code: deny_code,
            },
        )?;
        if let Some(code) = deny_code {
            // 未获授权就在此收束：`effect_started` 不落，effect 恰零次。
            let line = self.encode_or_fail(
                request_id,
                write_denied_payload(&plan, denied_code_on_wire(code)),
            )?;
            return self.write_encoded(line);
        }

        // 4. 授权后、effect 前再判一次在场：动作已变则零写。这一枚同时是 swap-race 的收口
        //    ——授权与 effect 之间被换成 symlink 的父段在这里以 `symlink_forbidden` 现形，
        //    而不是被压成笼统的 `state_changed`。
        match self.effector().probe(&plan) {
            Ok(again) if again == action => {}
            Ok(_) => return self.settle_failed(request_id, &plan, HostFailureCode::StateChanged),
            Err(code) => return self.settle_failed(request_id, &plan, code),
        }

        // 5. 第一次真实写入之前的最后一道 durable 屏障。
        self.append_effect_record(
            request_id,
            &plan,
            JournalPayload::EffectStarted(EffectStartedPayload {
                tool_call_id: plan.tool_call_id.clone(),
                logical_path: plan.logical_path.clone(),
                proposal_hash: plan.proposal_hash.clone(),
                action,
                content_sha256: plan.content_sha256.clone(),
                byte_length: plan.byte_length,
            }),
        )?;

        // 6. 真实 effect。
        match self.effector().perform(&plan, action) {
            EffectOutcome::Succeeded => {
                self.append_effect_record(
                    request_id,
                    &plan,
                    JournalPayload::EffectSucceeded(EffectSucceededPayload {
                        tool_call_id: plan.tool_call_id.clone(),
                        logical_path: plan.logical_path.clone(),
                        disposition: action,
                        content_sha256: plan.content_sha256.clone(),
                        byte_length: plan.byte_length,
                    }),
                )?;
                // 7. 发的就是第 2 步验过的那一份字节，不重编。
                self.write_encoded(success_line)
            }
            EffectOutcome::Failed(code) => self.settle_failed(request_id, &plan, code),
            EffectOutcome::Uncertain => self.settle_uncertain(request_id, &plan),
        }
    }

    /// 读面 `proposalHash`（ADR-022 六-B.2 read 行）。域串换、frame 机制同。
    ///
    /// `operation` 在拼接里**不可省**：省掉它，同一路径上的 `exists` 与 `read_file` 得到同一枚
    /// hash，把请求改成另一种操作就无从判定。
    fn workspace_read_proposal_hash(
        session_id: &str,
        request_id: &str,
        operation_id: &str,
        operation: WorkspaceOperation,
        logical_path: &str,
    ) -> String {
        let mut bytes = Vec::new();
        for field in [
            WORKSPACE_READ_PROPOSAL_DOMAIN,
            session_id,
            request_id,
            operation_id,
            operation.as_str(),
            logical_path,
        ] {
            bytes.extend_from_slice(&(field.len() as u32).to_be_bytes());
            bytes.extend_from_slice(field.as_bytes());
        }
        pi_loop_journal::sha256_hex(&bytes)
    }

    /// `host_request` 的读臂（`PI-WORKSPACE-READ-1`）。与写臂**三处结构性不同**，逐条有由：
    ///
    /// 1. **`active_tool_call` 只 peek 不 take**。写是「一 tc 一 op」；而一次 `glob` 要逐层
    ///    `list`，同一枚 tool call 因此会发多枚读 operation。Node 状态机侧已按此设计
    ///    （read 系工具的 tool call 在 `host_result` 收束后回到 `started`）；这里若照写臂
    ///    认领即消费，第二枚读请求就会当场无主。
    /// 2. **零 journal 记录**。四段账（proposed/authorized/started/settled）描述的是一次
    ///    **effect** 的生命周期；读没有 effect，落一笔账等于把「读过什么」写进持久档——
    ///    正文与读取轨迹都不该进 journal（ADR-022 六-C）。十九型 payload 闭集因此零变化。
    /// 3. **零授权**。没有 effect 就没有可授权的对象；边界全在 capability、grammar 与容器。
    fn serve_read_request(
        &mut self,
        request_id: &str,
        request: WorkspaceHostRequest,
    ) -> Result<(), HostError> {
        let WorkspaceRequestArguments::Read(arguments) = request.arguments else {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        };
        // 读同样必须归属于一枚在场的 tool call：会话里没有活动工具却来读，是状态违约。
        if self.active_tool_call.is_none() {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }
        if self.read_host.is_none() {
            return Err(self.fail_protocol(ProtocolErrorCode::StateViolation));
        }

        // 本侧重算，不认对端自报（ADR-022 六-B.2「Rust 必须重算」）。
        let recomputed = Self::workspace_read_proposal_hash(
            &self.session_id,
            request_id,
            &request.operation_id,
            arguments.operation,
            &arguments.logical_path,
        );
        if recomputed != request.proposal_hash {
            return self.settle_read_failed(
                request_id,
                &request.operation_id,
                arguments.operation,
                HostFailureCode::HashMismatch,
            );
        }

        let reader = self
            .read_host
            .as_mut()
            .expect("上面已判读件座非空")
            .as_mut();
        let outcome = match arguments.operation {
            WorkspaceOperation::Exists => reader
                .exists(&arguments.logical_path)
                .map(|exists| HostResultValue::Exists {
                    logical_path: arguments.logical_path.clone(),
                    exists,
                }),
            WorkspaceOperation::ReadFile => {
                reader
                    .read_file(&arguments.logical_path)
                    .map(|(content, byte_length)| HostResultValue::ReadFile {
                        content_sha256: pi_loop_journal::sha256_hex(content.as_bytes()),
                        logical_path: arguments.logical_path.clone(),
                        content,
                        byte_length,
                    })
            }
            WorkspaceOperation::List => {
                reader
                    .list(&arguments.logical_path)
                    .map(|entries| HostResultValue::List {
                        logical_path: arguments.logical_path.clone(),
                        entries,
                    })
            }
            // decoder 已锁死「`workspace_read` 的 operation 不得为 write」，此支不可达；
            // 仍显式拒，不用 `unreachable!` 把一条协议漂移变成 panic。
            WorkspaceOperation::Write => {
                return Err(self.fail_protocol(ProtocolErrorCode::StateViolation))
            }
        };

        match outcome {
            Ok(value) => {
                let line = self.encode_or_fail(
                    request_id,
                    HostResultPayload {
                        operation_id: request.operation_id,
                        capability: WorkspaceCapability::WorkspaceRead,
                        operation: arguments.operation,
                        outcome: HostResultOutcome::Ok(value),
                    },
                )?;
                self.write_encoded(line)
            }
            Err(code) => self.settle_read_failed(
                request_id,
                &request.operation_id,
                arguments.operation,
                code,
            ),
        }
    }

    /// 读的失败收束：**只发包，不落账**（读没有 effect）。文案仍出自 `HostFailureCode` 单表，
    /// 不拼路径、不转发 OS error。
    fn settle_read_failed(
        &mut self,
        request_id: &str,
        operation_id: &str,
        operation: WorkspaceOperation,
        code: HostFailureCode,
    ) -> Result<(), HostError> {
        let line = self.encode_or_fail(
            request_id,
            HostResultPayload {
                operation_id: operation_id.to_string(),
                capability: WorkspaceCapability::WorkspaceRead,
                operation,
                outcome: HostResultOutcome::Failed {
                    code,
                    message: code.message().to_string(),
                },
            },
        )?;
        self.write_encoded(line)
    }

    /// 真件座的取用点。0.4 已判非空，故此处 `expect` 不是宽容而是断言。
    fn effector(&mut self) -> &mut dyn WorkspaceWriteHost {
        self.write_host
            .as_mut()
            .expect("0.4 已判真件座非空")
            .as_mut()
    }

    /// 四段账的落账口：**append + `sync_all` 成功**才认领内存账本与投影。
    /// 失败一律经 `?` 逸出，调用方因此绝不会走到下一步——effect 与出包都排在它之后。
    fn append_effect_record(
        &mut self,
        request_id: &str,
        plan: &WorkspaceWritePlan,
        payload: JournalPayload,
    ) -> Result<(), HostError> {
        let record = self
            .journal
            .append(Some(request_id), Some(&plan.operation_id), payload)?;
        self.records.push(record);
        self.projection = pi_loop_journal::fold(&self.records);
        Ok(())
    }

    /// `effect_failed` 收束：先 durable，再发包。
    fn settle_failed(
        &mut self,
        request_id: &str,
        plan: &WorkspaceWritePlan,
        code: HostFailureCode,
    ) -> Result<(), HostError> {
        self.append_effect_record(
            request_id,
            plan,
            JournalPayload::EffectFailed {
                tool_call_id: plan.tool_call_id.clone(),
                code,
            },
        )?;
        let line = self.encode_or_fail(request_id, write_failed_payload(plan, code))?;
        self.write_encoded(line)
    }

    /// `effect_uncertain` 收束。ADR-022 六-C：落账成功才可回 `status:'uncertain'`；
    /// **该记录自身无法 durable 时宿主立即终止 sidecar leg**——不留一枚既没落账、
    /// 对端又还在等的 operation。
    fn settle_uncertain(
        &mut self,
        request_id: &str,
        plan: &WorkspaceWritePlan,
    ) -> Result<(), HostError> {
        if let Err(error) = self.append_effect_record(
            request_id,
            plan,
            JournalPayload::EffectUncertain {
                tool_call_id: plan.tool_call_id.clone(),
            },
        ) {
            self.reclaim_leg();
            return Err(error);
        }
        let line = self.encode_or_fail(request_id, write_uncertain_payload(plan))?;
        self.write_encoded(line)
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
    use crate::pi_loop_journal::{
        decode_record, journal_path, EffectStartedPayload, QUARANTINE_DIR,
    };
    use crate::pi_loop_process::{
        BUNDLE_BASENAME, EXPECTED_ROUTE_MANIFEST, MANIFEST_BASENAME, RESOURCE_DIR_NAME,
        RUNTIME_BASENAME,
    };
    use crate::pi_loop_protocol::{
        BudgetStopReason, BudgetTurnLimit, BudgetUsdLimit, BudgetView, HostFailureCode,
        HostResultOutcome, HostResultValue, ListEntry, ListEntryKind, ProductToolName,
        ProtocolErrorPayload, TerminalError, TerminalFailureCode, ToolOutcome, TurnStopReason,
        TurnUsage, WorkspaceHostRequest, WorkspaceOperation, WorkspaceRequestArguments,
        WorkspaceWriteArguments, WriteDisposition, MAX_HOST_ERROR_MESSAGE_BYTES, MAX_LIST_ENTRIES,
        MAX_LOGICAL_PATH_BYTES, MAX_PACKET_BYTES, MAX_SEGMENT_BYTES,
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                capabilities: vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ]
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

    /// 裁定A 写侧：`session_started` 记的必须是**当刻真值**。
    ///
    /// 判据不是「等于某个常量」，而是**内一致**：记录里的 capabilities 逐值等于本会话
    /// `capabilities()` 的实收握手集，promptId 等于本线在跑的 prompt 身份。两谱一旦分叉，
    /// durable 记录就是一句与事实不符的话——总纲不变量 4 与 6 都不许它悄悄成立。
    #[test]
    fn session_started_records_the_prompt_and_capabilities_actually_in_force() {
        let h = harness("started-truth");
        let (host, _log, _) = start_with(
            &h,
            vec![VecDeque::from(vec![ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            )])],
        );
        let host = host.expect("启动成功");
        let journal_text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");

        // 实收握手集 → 记录里应有的那一串。expected 由**实收值**渲染，不抄常量表。
        let recorded = format!(
            "\"capabilities\":[{}]",
            host.capabilities()
                .iter()
                .map(|capability| format!("\"{}\"", capability.as_str()))
                .collect::<Vec<_>>()
                .join(",")
        );
        assert!(
            journal_text.contains(&recorded),
            "journal 必须记实收握手集 {recorded}，实得 {journal_text}"
        );
        assert!(
            journal_text.contains("\"promptId\":\"md-work-v1\""),
            "journal 必须记在跑的 prompt 身份，实得 {journal_text}"
        );
        assert!(
            !journal_text.contains("case-read-v1"),
            "⑤ 之后本线不再跑 case-read-v1，记录里不得出现它"
        );
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                    ready(
                        1,
                        vec![
                            WorkspaceCapability::CaseRead,
                            WorkspaceCapability::WorkspaceRead,
                            WorkspaceCapability::WorkspaceWrite,
                        ],
                    ),
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

    /// PI-HOST-JOURNAL-1 ②：写侧序号门。sidecar 首腿自报 `turn:2`（合法值 1）时，
    /// pump 必须在 append 前拒绝——坏事件与其 usage 第二笔零落盘，失败经 `fail_protocol`
    /// 显式落账；否则本机 durable 写入自家读侧 `validate_records` 必拒的记录，
    /// 下次 start 整档 quarantine。
    #[test]
    fn counterexample_out_of_order_turn_is_refused_before_append() {
        let h = harness("ordinal-gate");
        let (host, _, _) = start_with(
            &h,
            vec![VecDeque::from(vec![
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                        turn: 2,
                        counted_toward_turn_limit: true,
                        usage: known_usage(0.01),
                        stop_reason: TurnStopReason::Stop,
                    }),
                ),
            ])],
        );
        let mut host = host.expect("启动成功");
        let error = host.prompt("req-1", "问一句").expect_err("跳号必须拒");
        assert!(
            matches!(
                &error,
                HostError::Protocol(ProtocolErrorCode::StateViolation)
            ),
            "须 StateViolation，实得 {error:?}"
        );
        let footprint = journal_footprint(&h.app_data);
        let records: Vec<JournalRecord> = footprint
            .iter()
            .flat_map(|(_, bytes)| decode_bytes(bytes))
            .collect();
        assert!(
            records.iter().all(|record| !matches!(
                record.journal_type(),
                JournalType::AgentEvent | JournalType::TurnUsageRecorded
            )),
            "坏序号事件与 usage 第二笔必须零落盘"
        );
        assert!(
            records
                .iter()
                .any(|record| matches!(record.journal_type(), JournalType::SessionFailed)),
            "失败必须显式落账"
        );
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                // Gate D：resumed leg 记当刻实收，不是旧档声称的旧值。
                prompt_id: pi_loop_journal::CURRENT_PROMPT_ID.to_string(),
                capabilities: EXPECTED_CAPABILITIES.to_vec(),
            }),
            "跨 leg 不重置、不把 null 恢复成 0；身份记当刻实收"
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                        prompt_id: pi_loop_journal::CURRENT_PROMPT_ID.to_string(),
                        model_id: "deepseek-v4-flash".to_string(),
                        max_turns: 12,
                        max_usd: None,
                        capabilities: EXPECTED_CAPABILITIES.to_vec(),
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
                capabilities: vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                capabilities: vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
                capabilities: vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
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
        VecDeque::from(vec![ready(
            1,
            vec![
                WorkspaceCapability::CaseRead,
                WorkspaceCapability::WorkspaceRead,
                WorkspaceCapability::WorkspaceWrite,
            ],
        )])
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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

    /// 出站 `host_result` 的一枚反例（PI-WRITE-HOST-1 ② 新增的**第五形态**）。
    ///
    /// 前四种全是**入站**（配置、凭证、prompt 正文、prompt header），判的是「别人交进来的
    /// 值」；五枚前向债判的是「本机将要发出去的值」。构造器统一吃一枚规模参数：
    ///
    /// - `cap: Some(n)` —— 边界对：`make(n)` 必须编得出、`make(n + 1)` 必须被拒。唯一变量是
    ///   那 1 字节/1 条，于是「其实是别的原因红了」（framing 撞 `MAX_PACKET_BYTES`、
    ///   sha 形状不对、闭集键漏字段…）被结构性排除。上界值只从 protocol 常量取，
    ///   测试里不另抄数字。
    /// - `cap: None` —— 纯负例（空串等没有「恰好合法」的对偶），只判拒，参数取 0。
    struct HostResultCase {
        label: &'static str,
        cap: Option<usize>,
        make: fn(usize) -> HostResultPayload,
    }

    /// 清单行的驱动方式。五种入口对应五条时序，双轴断言各自不同。
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
        /// **出站** `host_result`（PI-WRITE-HOST-1 ②）：已起 leg 之后驱动
        /// `encode_host_result`，五轴＝盘上 journal bytes、内存账本、出包数、
        /// `outbound_seq` 全不变，且拒绝理由不回显被判值。
        HostResult(Vec<HostResultCase>),
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

    // ── 出站 host_result 的反例构造器（PI-WRITE-HOST-1 ②）──────────────────────
    //
    // 五枚前向债的受判面各在一枚 value/error 形状里，故按形状分四支构造器；每支只留
    // 被判那一枚字段可变，其余字段恒取闭集内合法值——被判的因此永远只有一枚输入。

    const PROBE_SHA: &str = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

    fn write_ok_result(logical_path: String) -> HostResultPayload {
        HostResultPayload {
            operation_id: "op_1_1".to_string(),
            capability: WorkspaceCapability::WorkspaceWrite,
            operation: WorkspaceOperation::Write,
            outcome: HostResultOutcome::Ok(HostResultValue::Write {
                logical_path,
                disposition: WriteDisposition::Created,
                content_sha256: PROBE_SHA.to_string(),
                byte_length: 10,
            }),
        }
    }

    fn read_file_ok_result(content: String) -> HostResultPayload {
        let byte_length = content.len() as u64;
        HostResultPayload {
            operation_id: "op_1_1".to_string(),
            capability: WorkspaceCapability::WorkspaceRead,
            operation: WorkspaceOperation::ReadFile,
            outcome: HostResultOutcome::Ok(HostResultValue::ReadFile {
                logical_path: "纪要.md".to_string(),
                content,
                content_sha256: PROBE_SHA.to_string(),
                byte_length,
            }),
        }
    }

    fn list_ok_result(entries: Vec<ListEntry>) -> HostResultPayload {
        HostResultPayload {
            operation_id: "op_1_1".to_string(),
            capability: WorkspaceCapability::WorkspaceRead,
            operation: WorkspaceOperation::List,
            outcome: HostResultOutcome::Ok(HostResultValue::List {
                logical_path: "子目录".to_string(),
                entries,
            }),
        }
    }

    fn list_entry(name: String) -> ListEntry {
        ListEntry {
            name,
            kind: ListEntryKind::File,
            byte_length: Some(10),
            mtime_ms: Some(1_700_000_000_000),
        }
    }

    fn failed_result(message: String) -> HostResultPayload {
        HostResultPayload {
            operation_id: "op_1_1".to_string(),
            capability: WorkspaceCapability::WorkspaceWrite,
            operation: WorkspaceOperation::Write,
            outcome: HostResultOutcome::Failed {
                code: HostFailureCode::Io,
                message,
            },
        }
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
            // ── 五枚前向债（PI-HOST-LOOP-1R3 D1 表① 登记，本票开工偿）──────────
            //
            // 表①原文：`read_host_result_payload`×3、`read_list_entry`、`read_logical_path`
            // 的出站面共 5 行「本票 ready capability 恰 ['case_read']，宿主一枚 host_result
            // 都不生成；PI-WRITE-HOST-1 开工时须连同前置门一并补」。
            //
            // 偿形循 1R6 裁定：**不再补第二份手工前置门**。出站 host_result 与 prompt 同走
            // `encode_outbound_line`——codec 是唯一校验真源，五枚 wire 判据因此结构性排在
            // journal append、真实落盘与发包之前。下面五行补的是这条结构性担保的**行为
            // 反例**：判据在不在、拒得准不准、拒的那一轮有没有副作用，逐行现场实测。
            //
            // 拒绝 code 一律 `protocol`（同 `send` 既有映射，`PacketRejection.reason` 丢弃）。
            // `protocol` 是粗粒度的——`packet_too_large` 与 `invalid_schema` 同压成它，故每行
            // 另带 cap 处的正向对照，把「其实是别的原因红了」排除在外（见 `HostResultCase`）。
            BoundedInput {
                input: "host_result.value.logicalPath",
                site: "encode_host_result",
                judgments: &["MAX_LOGICAL_PATH_BYTES", "non_empty"],
                code: "protocol",
                probe: BoundedProbe::HostResult(vec![
                    HostResultCase {
                        label: "上界 ±1 字节",
                        cap: Some(MAX_LOGICAL_PATH_BYTES),
                        make: |size| write_ok_result("p".repeat(size)),
                    },
                    HostResultCase {
                        label: "空串",
                        cap: None,
                        make: |_| write_ok_result(String::new()),
                    },
                ]),
            },
            BoundedInput {
                input: "host_result.value.entries[].name",
                site: "encode_host_result",
                judgments: &["MAX_SEGMENT_BYTES", "non_empty"],
                code: "protocol",
                probe: BoundedProbe::HostResult(vec![
                    HostResultCase {
                        label: "上界 ±1 字节",
                        cap: Some(MAX_SEGMENT_BYTES),
                        make: |size| list_ok_result(vec![list_entry("n".repeat(size))]),
                    },
                    HostResultCase {
                        label: "空串",
                        cap: None,
                        make: |_| list_ok_result(vec![list_entry(String::new())]),
                    },
                ]),
            },
            BoundedInput {
                input: "host_result.value.entries",
                site: "encode_host_result",
                judgments: &["MAX_LIST_ENTRIES"],
                code: "protocol",
                probe: BoundedProbe::HostResult(vec![HostResultCase {
                    label: "上界 ±1 条",
                    cap: Some(MAX_LIST_ENTRIES),
                    // 条目名恒 1 字节：2001 条也只有约 120 KB，离 1 MiB framing 还远，
                    // 于是被判的确实是条目数上界，不是 packet 尺寸。
                    make: |size| {
                        list_ok_result((0..size).map(|_| list_entry("n".to_string())).collect())
                    },
                }]),
            },
            BoundedInput {
                input: "host_result.value.content",
                site: "encode_host_result",
                judgments: &["MAX_TEXT_BYTES"],
                code: "protocol",
                probe: BoundedProbe::HostResult(vec![HostResultCase {
                    label: "上界 ±1 字节",
                    cap: Some(MAX_TEXT_BYTES),
                    // `byteLength` 由构造器按实长给出，故 cap 处 `byteLength == content.len()`
                    // 的交叉门也照样过——+1 那一枚红的是 content 上界本身。
                    make: |size| read_file_ok_result("c".repeat(size)),
                }]),
            },
            BoundedInput {
                input: "host_result.error.message",
                site: "encode_host_result",
                judgments: &["MAX_HOST_ERROR_MESSAGE_BYTES"],
                code: "protocol",
                probe: BoundedProbe::HostResult(vec![HostResultCase {
                    label: "上界 ±1 字节",
                    cap: Some(MAX_HOST_ERROR_MESSAGE_BYTES),
                    make: |size| failed_result("m".repeat(size)),
                }]),
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
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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

    /// 出站 host_result 族反例驱动（PI-WRITE-HOST-1 ② 第五形态）：具名 code ＋ **五轴**
    /// 零副作用——盘上 journal bytes 逐字节不变、内存账本不增、出包一枚不发、
    /// `outbound_seq` 不推进、拒绝理由不回显逻辑路径与正文。
    ///
    /// 带 `cap` 的行另跑 cap 处的正向对照：同一枚构造器、同一条路径，只差 1 字节/1 条。
    /// 没有它，「+1 被拒」这条读数与「这形状根本编不出来」在读数上同形。
    fn host_result_axis_probe(row: &BoundedInput, cases: &[HostResultCase]) {
        let h = harness("d1-host-result");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let host = host.expect("出站清单驱动前须先起 leg");
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读 journal");
        let records_before = host.records().len();
        let writes_before = log.lock().expect("日志未中毒").written.len();
        let seq_before = host.outbound_seq;

        for case in cases {
            if let Some(cap) = case.cap {
                let line = host
                    .encode_host_result("req-probe", (case.make)(cap))
                    .unwrap_or_else(|error| {
                        panic!(
                            "{}/{}：cap 处必须编得出，否则 +1 的红说明不了是这一枚上界（实得 {error:?}）",
                            row.input, case.label
                        )
                    });
                assert_eq!(
                    line.seq,
                    seq_before + 1,
                    "{}/{}：编码只定 seq，不认领",
                    row.input,
                    case.label
                );
            }
            let over = case.cap.map(|cap| cap + 1).unwrap_or(0);
            let error = host
                .encode_host_result("req-probe", (case.make)(over))
                .err()
                .unwrap_or_else(|| panic!("{}/{} 必须被拒", row.input, case.label));
            assert_eq!(
                error.code(),
                row.code,
                "{}/{} 须以 {} 拒绝，实得 {error:?}",
                row.input,
                case.label,
                row.code
            );
            // `protocol` 太粗：`packet_too_large` 与闭集违规同压成它。出站族一律要求
            // `invalid_schema`——撞到 framing 上限即红，红得不对也算没红。
            assert_eq!(
                error,
                HostError::Protocol(ProtocolErrorCode::InvalidSchema),
                "{}/{}：拒绝理由必须恰是闭集违规",
                row.input,
                case.label
            );
            assert_eq!(
                fs::read(&path).expect("读 journal"),
                before,
                "{}/{}：盘上 journal bytes 必须逐字节不变",
                row.input,
                case.label
            );
            assert_eq!(
                host.records().len(),
                records_before,
                "{}/{}：内存账本也不得增长",
                row.input,
                case.label
            );
            assert_eq!(
                log.lock().expect("日志未中毒").written.len(),
                writes_before,
                "{}/{}：拒绝须先于发包，出包一枚都不许多",
                row.input,
                case.label
            );
            assert_eq!(
                host.outbound_seq, seq_before,
                "{}/{}：被拒的一轮不得推进 outbound_seq",
                row.input, case.label
            );
            assert_no_echo(
                &error,
                &["sk-in-memory-only", "纪要.md", "子目录"],
                &format!("{}/{}", row.input, case.label),
            );
        }
    }

    /// ① 清单每行都在 journal append 与 spawn 之前以具名 code 拒绝，且零副作用。
    #[test]
    fn counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn() {
        // 清单塌缩守卫（PI-WRITE-HOST-1 ②）：本测试的判据**就是**清单本身，删行即静默失覆盖
        // ——「删空」与「全通过」在读数上同形。出站族按 1R3 D1 表① 的五枚前向债钉死条数，
        // 入站族只留总数下限（既有 11 行，未来收紧只许加不许减）。
        let manifest = bounded_input_manifest();
        let outbound = manifest
            .iter()
            .filter(|row| matches!(row.probe, BoundedProbe::HostResult(_)))
            .count();
        assert_eq!(
            outbound, 5,
            "出站清单必须恰 5 行（`read_host_result_payload`×3、`read_list_entry`、\
             `read_logical_path`），实为 {outbound}"
        );
        assert!(
            manifest.len() >= 16,
            "清单只剩 {} 行：入站 11 行 ＋ 出站 5 行是下限",
            manifest.len()
        );

        for row in manifest {
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
                BoundedProbe::HostResult(cases) => host_result_axis_probe(&row, cases),
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

    // ── ② 普适不变量探针（PI-HOST-LOOP-1R6 §零裁定二）─────────────────────────
    //
    // 1R3 用 `MAX_*` 常量名单、1R4 用判据函数名单、1R5 用 `return Err(` 字面量，三代装置
    // 同败于同一处：**在富语言里用文本模式枚举语义构造**。1R5 复验只把票面点名的那道门
    // 写成 `return Err::<(), HostError>(…)`，扫描集、清账表、行为反例与整套 pi-loop 全部
    // 假绿。第七个更聪明的模式不会赢。
    //
    // 本装置改判**结果**、不判**形状**：逐字段 × 逐违规类驱动完整 `start` / `prompt` 入口，
    // 只断言一条普适不变量——**Err ⇒ 副作用恰零**（spawn 零、journal 字节零增、内存账本
    // 零增、出包零、requestId 不占用）。它不读源码一个字；任何位置、任何拼写的门，只要
    // 拒绝了电池里的输入而副作用已经发生，即红。
    //
    // 担保边界（如实声明，承 §零）：wire 判据的前置由 `encode_outbound_line` 结构性成立
    // ——codec 是唯一校验真源，今日与未来每一条 wire 判据都自动排在效果之前，不再需要
    // 「codec 规则」与「前置门」之间的同步账。非 wire 判据（caseRoot 的 lstat、容器 token
    // 的目录路径用途）靠显式门 ＋ D1 清单的 34 枚行为反例。未来若有人在 journal 之后
    // **故意**新增非 wire 拒绝门且其输入不在电池内，本装置不宣称能证——那由电池广度、
    // 两相结构的代码形状与独立验收承担，不再假装文本扫描能证。

    /// 电池一行：字段 × 违规类 × 驱动方式。
    struct Violation {
        field: &'static str,
        class: String,
        drive: ViolationDrive,
    }

    enum ViolationDrive {
        /// 变一枚 `StartConfig` 字符串字段，驱动完整 `start`。
        Config(fn(&mut StartConfig, &str), String),
        /// 变一枚 `StartConfig` 数值 limit（没有字符串违规类可套），驱动完整 `start`。
        ConfigNumber(fn(&mut StartConfig)),
        /// 变 Keychain 解析结果，驱动完整 `start`。
        Credential(String),
        /// 已起 leg 之后驱动完整 `prompt`：变正文，header 恒合法。
        PromptText(String),
        /// 已起 leg 之后驱动完整 `prompt`：变 header `requestId`，正文恒合法。
        PromptRequestId(String),
        /// **状态域**：在一份既有可恢复 journal 上驱动完整 `start`（PI-HOST-LOOP-1R7 J2）。
        Recovery(SessionShape, RecoveryTrigger),
        /// **效果域**（PI-WRITE-HOST-1 ②）：已起 leg 之后驱动完整 `encode_host_result`，
        /// 把违规串塞进出站结果的一枚字符串字段。前五种驱动全是**入站**方向，
        /// 「Err ⇒ 副作用恰零」在出站面此前一枚样本都没有。
        HostResult(fn(&str) -> HostResultPayload, String),
        /// 效果域的**规模轴**：条目数没有字符串违规类可套，单独按条数驱动。
        HostResultScale(fn(usize) -> HostResultPayload, usize),
    }

    // ── recovery 状态域（PI-HOST-LOOP-1R7 J2）─────────────────────────────────
    //
    // 1R6 的 142 行电池只枚举**值域**（非法值 × 字段），且每一行都从 fresh harness 起步；
    // 带 durable 修复的载入分支因此结构性照不到——「142 行全绿」与「该分支从未被测」
    // 同时为真（1R6 复验 blocker 的成因）。本族补的是**状态域**：既有可恢复 journal 的
    // 五类形状 × 两类拒绝触发。两类触发各有分工：`ResumeDrift` 的拒绝点在载入**之后**，
    // 正是本轮裁定要挡的那一类；`ConfigViolation` 沿用电池既有违规值，拒绝点在载入
    // **之前**，防的是未来有人把入参门后移到载入之后。

    #[derive(Clone, Copy)]
    enum SessionShape {
        /// 末行未以 LF 结束：载入本该物理截断。
        PartialTail,
        /// 尾端 `turn_finished` 缺 `turn_usage_recorded`：载入本该补写唯一一枚。
        MissingUsageTail,
        /// leg 已开、无 active prompt：crash fold 步骤 5 本该追加 `session_interrupted`。
        /// 这一枚是 1R6 复验反例的原形。
        OpenIdleLeg,
        /// active prompt ＋ maxUsd 已启用：crash fold 步骤 3/4 本该追加 `prompt_failed`
        /// ＋ `session_failed` 两枚，且后者逐值引用前者的 `promptEventId`。
        ActivePromptBudget,
        /// `effect_started` 无三态收束：crash fold 步骤 2 本该先派生 uncertain 再关闭链。
        DanglingEffect,
    }

    impl SessionShape {
        /// 逐形状独立成族：电池的「整族一枚都没被拒即恒真」守卫因此逐形状生效。
        fn field(self) -> &'static str {
            match self {
                SessionShape::PartialTail => "recovery.partialTail",
                SessionShape::MissingUsageTail => "recovery.missingUsageTail",
                SessionShape::OpenIdleLeg => "recovery.openIdleLeg",
                SessionShape::ActivePromptBudget => "recovery.activePromptBudget",
                SessionShape::DanglingEffect => "recovery.danglingEffect",
            }
        }

        /// 该形状载入时**必然**会产生的那一枚修复痕迹——控制组据此证明种子非空跑。
        fn repair_marker(self) -> JournalType {
            match self {
                SessionShape::PartialTail | SessionShape::OpenIdleLeg => {
                    JournalType::SessionInterrupted
                }
                SessionShape::MissingUsageTail => JournalType::TurnUsageRecorded,
                SessionShape::ActivePromptBudget => JournalType::PromptFailed,
                SessionShape::DanglingEffect => JournalType::EffectUncertain,
            }
        }
    }

    const RECOVERY_SHAPES: [SessionShape; 5] = [
        SessionShape::PartialTail,
        SessionShape::MissingUsageTail,
        SessionShape::OpenIdleLeg,
        SessionShape::ActivePromptBudget,
        SessionShape::DanglingEffect,
    ];

    #[derive(Clone, Copy)]
    enum RecoveryTrigger {
        /// resume 漂移具名拒：拒绝点在载入之后。
        ResumeDrift,
        /// 电池既有违规值（`modelId` 含 NUL）：拒绝点在载入之前。
        ConfigViolation,
    }

    /// crash 窗留下的半行：无 LF 结尾，载入本该把它物理截掉。
    const PARTIAL_TAIL: &[u8] = b"{\"eventId\":\"event_9\",\"seq\":9,\"contain";

    fn seeded_started(max_usd: Option<f64>) -> SessionStartedPayload {
        SessionStartedPayload {
            route_manifest_sha256: crate::pi_loop_process::sha256_bytes(EXPECTED_ROUTE_MANIFEST),
            target_triple: TargetTriple::Aarch64AppleDarwin,
            grant_id: "grant-1".to_string(),
            prompt_id: pi_loop_journal::CURRENT_PROMPT_ID.to_string(),
            model_id: "deepseek-v4-flash".to_string(),
            max_turns: 12,
            max_usd,
            capabilities: EXPECTED_CAPABILITIES.to_vec(),
        }
    }

    /// 造一份**可恢复**的既有 journal：不是 malformed、不进 quarantine，载入必然要修复。
    fn seed_session(h: &Harness, shape: SessionShape) {
        let max_usd = match shape {
            SessionShape::ActivePromptBudget => Some(1.0),
            _ => None,
        };
        let mut loaded = pi_loop_journal::load_session(
            &h.app_data,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("建种子 journal");
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(seeded_started(max_usd)),
            )
            .expect("session_started");
        let prompt = |journal: &mut Journal| {
            journal
                .append(
                    Some("req-1"),
                    None,
                    JournalPayload::UserPrompted {
                        text: "问".to_string(),
                    },
                )
                .expect("user_prompted");
        };
        match shape {
            SessionShape::PartialTail | SessionShape::OpenIdleLeg => {}
            SessionShape::MissingUsageTail => {
                prompt(journal);
                journal
                    .append(
                        Some("req-1"),
                        None,
                        JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                            turn: 1,
                            counted_toward_turn_limit: true,
                            usage: known_usage(0.25),
                            stop_reason: TurnStopReason::Stop,
                        }),
                    )
                    .expect("turn_finished");
            }
            SessionShape::ActivePromptBudget => prompt(journal),
            SessionShape::DanglingEffect => {
                prompt(journal);
                journal
                    .append(
                        Some("req-1"),
                        Some("op_1_1"),
                        JournalPayload::EffectStarted(EffectStartedPayload {
                            tool_call_id: "tc_1_1".to_string(),
                            logical_path: "纪要.md".to_string(),
                            proposal_hash:
                                "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                                    .to_string(),
                            action: WriteDisposition::Created,
                            content_sha256:
                                "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
                                    .to_string(),
                            byte_length: 10,
                        }),
                    )
                    .expect("effect_started");
            }
        }
        // 交出单写者锁：接手的那一次 start 必须能独占。
        drop(loaded);
        if matches!(shape, SessionShape::PartialTail) {
            let path = journal_path(&h.app_data, "cnt-1", "sess-1");
            let mut bytes = fs::read(&path).expect("读种子 journal");
            bytes.extend_from_slice(PARTIAL_TAIL);
            fs::write(&path, bytes).expect("写半行");
        }
    }

    fn decode_bytes(bytes: &[u8]) -> Vec<JournalRecord> {
        bytes
            .split(|byte| *byte == b'\n')
            .filter(|line| !line.is_empty())
            .filter_map(|line| decode_record(line).ok())
            .collect()
    }

    /// 「修复未应用」：逐形状的特征痕迹必须不在盘上。字节相等已蕴含它，但这一层**不靠**
    /// 字节断言活着——把字节断言放宽或换掉 harness 时，它仍单独判红。
    fn assert_repair_not_applied(shape: SessionShape, bytes: &[u8], context: &str) {
        if matches!(shape, SessionShape::PartialTail) {
            assert!(
                bytes.ends_with(PARTIAL_TAIL),
                "{context}：partial tail 已被物理截断"
            );
        }
        let records = decode_bytes(bytes);
        let marker = shape.repair_marker();
        assert_eq!(
            records
                .iter()
                .filter(|record| record.journal_type() == marker)
                .count(),
            0,
            "{context}：被拒的一轮已把 {} 落账",
            marker.as_str()
        );
    }

    /// 驱动一次「既有可恢复会话」上的完整 `start`；被拒即断言六轴零副作用。
    fn universal_recovery_start_case(
        shape: SessionShape,
        trigger: RecoveryTrigger,
        context: &str,
    ) -> bool {
        let h = harness("uni-recovery");
        seed_session(&h, shape);
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before_bytes = fs::read(&path).expect("读 pre-start snapshot");
        let before_records = decode_bytes(&before_bytes);
        let before = journal_footprint(&h.app_data);

        let mut config = h.config.clone();
        let canary = match trigger {
            RecoveryTrigger::ResumeDrift => {
                config.grant_id = "grant-9".to_string();
                String::new()
            }
            RecoveryTrigger::ConfigViolation => {
                config.model_id = "a\u{0}b".to_string();
                config.model_id.clone()
            }
        };
        let case_root = h.case_root.to_string_lossy().into_owned();
        let (result, log, spawns) = start_probe(
            &h,
            config,
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let refused = match &result {
            Err(error) => {
                assert_eq!(
                    spawns, 0,
                    "{context}：被拒的 start 不得 spawn（实得 {error:?}）"
                );
                assert_eq!(
                    log.lock().expect("日志未中毒").written.len(),
                    0,
                    "{context}：被拒的 start 不得出包（实得 {error:?}）"
                );
                let after_bytes = fs::read(&path).expect("读 start 之后的 journal");
                assert!(
                    after_bytes == before_bytes,
                    "{context}：被拒的一轮改写了既有 journal（{} B → {} B，实得 {error:?}）",
                    before_bytes.len(),
                    after_bytes.len()
                );
                assert_journal_bytes_unchanged(&before, &journal_footprint(&h.app_data), context);
                let after_records = decode_bytes(&after_bytes);
                assert_eq!(
                    after_records.len(),
                    before_records.len(),
                    "{context}：被拒的一轮增了 durable 记录（实得 {error:?}）"
                );
                assert_eq!(
                    pi_loop_journal::fold(&after_records).request_ids,
                    pi_loop_journal::fold(&before_records).request_ids,
                    "{context}：被拒的一轮占用了 requestId（实得 {error:?}）"
                );
                assert_repair_not_applied(shape, &after_bytes, context);
                assert_no_echo(error, &["sk-in-memory-only", &case_root, &canary], context);
                // 行为归属（G3 同义复扫的读数面）：这一行实际拒于哪一枚具名 code。
                eprintln!(
                    "电池 {context}：拒于 {}（{} B 原样）",
                    error.code(),
                    after_bytes.len()
                );
                true
            }
            Ok(_) => false,
        };
        drop(result);
        refused
    }

    fn set_container_id(config: &mut StartConfig, value: &str) {
        config.container_id = value.to_string();
    }
    fn set_session_id(config: &mut StartConfig, value: &str) {
        config.session_id = value.to_string();
    }
    fn set_grant_id(config: &mut StartConfig, value: &str) {
        config.grant_id = value.to_string();
    }
    fn set_case_root(config: &mut StartConfig, value: &str) {
        config.case_root = PathBuf::from(value);
    }
    fn set_model_id(config: &mut StartConfig, value: &str) {
        config.model_id = value.to_string();
    }
    fn zero_max_turns(config: &mut StartConfig) {
        config.max_turns = 0;
    }
    fn over_max_turns(config: &mut StartConfig) {
        config.max_turns = MAX_TURNS_LIMIT + 1;
    }
    fn huge_max_turns(config: &mut StartConfig) {
        config.max_turns = u64::MAX;
    }
    fn zero_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(0.0);
    }
    fn negative_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(-1.0);
    }
    fn nan_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(f64::NAN);
    }
    fn infinite_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(f64::INFINITY);
    }
    fn negative_infinite_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(f64::NEG_INFINITY);
    }
    fn over_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(MAX_USD_LIMIT + 1.0);
    }
    fn far_over_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(MAX_USD_LIMIT * 1e6);
    }
    fn subnormal_max_usd(config: &mut StartConfig) {
        config.max_usd = Some(f64::MIN_POSITIVE);
    }

    // ── 效果域的四支出站构造器（PI-WRITE-HOST-1 ②）────────────────────────────
    //
    // 与 D1 出站清单同源（同一批 `*_ok_result` 构造器），只是这里由电池逐类灌违规串：
    // D1 判「拒得准不准」，电池判「拒的那一轮有没有副作用」，两层不互相顶名。

    fn result_logical_path(value: &str) -> HostResultPayload {
        write_ok_result(value.to_string())
    }
    fn result_entry_name(value: &str) -> HostResultPayload {
        list_ok_result(vec![list_entry(value.to_string())])
    }
    fn result_content(value: &str) -> HostResultPayload {
        read_file_ok_result(value.to_string())
    }
    fn result_error_message(value: &str) -> HostResultPayload {
        failed_result(value.to_string())
    }
    fn result_entries_of(size: usize) -> HostResultPayload {
        list_ok_result((0..size).map(|_| list_entry("n".to_string())).collect())
    }

    /// SafeToken 的字节上界没有 `MAX_*` 常量可 import——直接**问判据函数本人**：
    /// 由 `is_safe_token` 逐长探出上界，测试里因此不存在第二份 `128`（两谱各抄一次
    /// 就各自漂移，这正是 1R3/1R4 栽过的形）。
    fn safe_token_limit() -> usize {
        let mut limit = 0;
        for length in 1..=1024 {
            if is_safe_token(&"a".repeat(length)) {
                limit = length;
            }
        }
        assert!(limit > 0, "SafeToken 上界探测失败：判据对任何长度都不放行");
        limit
    }

    /// 字符串违规类闭集。上界一律取**传入的 protocol 常量 +1 字节**，不在测试里另抄数字。
    fn string_violations(limit: usize) -> Vec<(&'static str, String)> {
        vec![
            ("空串", String::new()),
            ("纯空白", " \t \u{3000}".to_string()),
            ("含 NUL", "a\u{0}b".to_string()),
            ("含 C0 控制字符", "a\u{1}b".to_string()),
            ("含 DEL", "a\u{7f}b".to_string()),
            ("含 LF 分隔符", "a\nb".to_string()),
            ("含 CR", "a\rb".to_string()),
            ("含 TAB", "a\tb".to_string()),
            ("含双引号", "a\"b".to_string()),
            ("含反斜杠", "a\\b".to_string()),
            ("含 U+2028 行分隔", "a\u{2028}b".to_string()),
            ("含路径分隔符", "a/b".to_string()),
            ("含空格", "a b".to_string()),
            ("首字符非字母数字", "-ab".to_string()),
            ("lone-surrogate 转义文本", "a\\ud800b".to_string()),
            ("超上界 +1 字节", "a".repeat(limit + 1)),
        ]
    }

    fn violation_battery() -> Vec<Violation> {
        let token_limit = safe_token_limit();
        let mut battery: Vec<Violation> = Vec::new();

        for (field, setter) in [
            (
                "containerId",
                set_container_id as fn(&mut StartConfig, &str),
            ),
            ("sessionId", set_session_id as fn(&mut StartConfig, &str)),
            ("grantId", set_grant_id as fn(&mut StartConfig, &str)),
        ] {
            for (class, value) in string_violations(token_limit) {
                battery.push(Violation {
                    field,
                    class: class.to_string(),
                    drive: ViolationDrive::Config(setter, value),
                });
            }
        }

        for (class, value) in string_violations(MAX_MODEL_ID_BYTES) {
            battery.push(Violation {
                field: "provider.modelId",
                class: class.to_string(),
                drive: ViolationDrive::Config(set_model_id, value),
            });
        }

        // caseRoot 的内容违规类挂在合法绝对前缀之后，否则整族都先撞 shape 门、内容判据
        // 一条都到不了。shape 违规另立三行。
        for (class, value) in string_violations(MAX_CASE_ROOT_BYTES) {
            battery.push(Violation {
                field: "caseRoot",
                class: format!("{class}（绝对前缀）"),
                drive: ViolationDrive::Config(set_case_root, format!("/{value}")),
            });
        }
        for (class, value) in [
            ("空串", ""),
            ("相对路径", "案卷/相对"),
            ("单段相对名", "案卷"),
        ] {
            battery.push(Violation {
                field: "caseRoot",
                class: class.to_string(),
                drive: ViolationDrive::Config(set_case_root, value.to_string()),
            });
        }

        for (class, value) in string_violations(MAX_API_KEY_BYTES) {
            battery.push(Violation {
                field: "provider.apiKey",
                class: class.to_string(),
                drive: ViolationDrive::Credential(value),
            });
        }

        for (class, setter) in [
            ("0", zero_max_turns as fn(&mut StartConfig)),
            ("上界 +1", over_max_turns),
            ("u64::MAX", huge_max_turns),
        ] {
            battery.push(Violation {
                field: "limits.maxTurns",
                class: class.to_string(),
                drive: ViolationDrive::ConfigNumber(setter),
            });
        }
        for (class, setter) in [
            ("0", zero_max_usd as fn(&mut StartConfig)),
            ("负数", negative_max_usd),
            ("NaN", nan_max_usd),
            ("+inf", infinite_max_usd),
            ("-inf", negative_infinite_max_usd),
            ("上界 +1", over_max_usd),
            ("上界 ×1e6", far_over_max_usd),
            ("次正规最小正数", subnormal_max_usd),
        ] {
            battery.push(Violation {
                field: "limits.maxUsd",
                class: class.to_string(),
                drive: ViolationDrive::ConfigNumber(setter),
            });
        }

        for (class, value) in string_violations(MAX_TEXT_BYTES) {
            battery.push(Violation {
                field: "prompt.text",
                class: class.to_string(),
                drive: ViolationDrive::PromptText(value),
            });
        }
        for (class, value) in string_violations(token_limit) {
            battery.push(Violation {
                field: "prompt.requestId",
                class: class.to_string(),
                drive: ViolationDrive::PromptRequestId(value),
            });
        }

        // 效果域：出站 host_result 的五枚前向债字段 × 违规类（PI-WRITE-HOST-1 ②）。
        // 上界一律取传入的 protocol 常量 +1 字节，测试里不另抄数字。
        for (field, make, limit) in [
            (
                "host_result.value.logicalPath",
                result_logical_path as fn(&str) -> HostResultPayload,
                MAX_LOGICAL_PATH_BYTES,
            ),
            (
                "host_result.value.entries[].name",
                result_entry_name,
                MAX_SEGMENT_BYTES,
            ),
            ("host_result.value.content", result_content, MAX_TEXT_BYTES),
            (
                "host_result.error.message",
                result_error_message,
                MAX_HOST_ERROR_MESSAGE_BYTES,
            ),
        ] {
            for (class, value) in string_violations(limit) {
                battery.push(Violation {
                    field,
                    class: class.to_string(),
                    drive: ViolationDrive::HostResult(make, value),
                });
            }
        }
        for (class, size) in [
            ("空列表", 0),
            ("上界", MAX_LIST_ENTRIES),
            ("上界 +1 条", MAX_LIST_ENTRIES + 1),
            ("上界 ×2 条", MAX_LIST_ENTRIES * 2),
        ] {
            battery.push(Violation {
                field: "host_result.value.entries",
                class: class.to_string(),
                drive: ViolationDrive::HostResultScale(result_entries_of, size),
            });
        }

        // 状态域：既有可恢复 journal 的五类形状 × 两类拒绝触发（PI-HOST-LOOP-1R7 J2）。
        for shape in RECOVERY_SHAPES {
            for (class, trigger) in [
                (
                    "resume 漂移具名拒（载入之后）",
                    RecoveryTrigger::ResumeDrift,
                ),
                (
                    "modelId 含 NUL（载入之前）",
                    RecoveryTrigger::ConfigViolation,
                ),
            ] {
                battery.push(Violation {
                    field: shape.field(),
                    class: class.to_string(),
                    drive: ViolationDrive::Recovery(shape, trigger),
                });
            }
        }

        battery
    }

    struct LiteralKey(String);
    impl CredentialPort for LiteralKey {
        fn resolve(&self) -> Result<String, HostError> {
            Ok(self.0.clone())
        }
    }

    /// journal 树下**全部文件**的 (相对路径, 字节) 足迹。比「那一枚固定坐标的文件」紧：
    /// containerId/sessionId 被变异时，按固定坐标去看的断言本来就恒真，等于没判。
    fn journal_footprint(app_data: &Path) -> Vec<(String, Vec<u8>)> {
        fn walk(root: &Path, dir: &Path, rows: &mut Vec<(String, Vec<u8>)>) {
            let Ok(entries) = fs::read_dir(dir) else {
                return;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk(root, &path, rows);
                } else if let Ok(bytes) = fs::read(&path) {
                    rows.push((
                        path.strip_prefix(root)
                            .unwrap_or(&path)
                            .to_string_lossy()
                            .into_owned(),
                        bytes,
                    ));
                }
            }
        }
        let root = app_data.join(PI_LOOP_DIR);
        let mut rows = Vec::new();
        walk(&root, &root, &mut rows);
        rows.sort();
        rows
    }

    /// 「journal 字节零增」：既有文件逐字节不变，新出现的文件必须是零字节，总字节数不增。
    /// 只判字节、不判目录存在——`load_session` 会先建目录与空 journal 再做后续判定，
    /// 那不是 durable 记录；被判的是**盘上多没多出一个字节**。
    fn assert_journal_bytes_unchanged(
        before: &[(String, Vec<u8>)],
        after: &[(String, Vec<u8>)],
        context: &str,
    ) {
        for (name, bytes) in before {
            let found = after
                .iter()
                .find(|(candidate, _)| candidate == name)
                .unwrap_or_else(|| panic!("{context}：既有 journal 文件 {name} 消失了"));
            assert_eq!(
                &found.1, bytes,
                "{context}：既有 journal 文件 {name} 被改写"
            );
        }
        for (name, bytes) in after {
            if before.iter().any(|(candidate, _)| candidate == name) {
                continue;
            }
            assert!(
                bytes.is_empty(),
                "{context}：被拒的一轮在 journal 树里写下了 {} 字节（{name}）",
                bytes.len()
            );
        }
        let total =
            |rows: &[(String, Vec<u8>)]| rows.iter().map(|(_, bytes)| bytes.len()).sum::<usize>();
        assert_eq!(
            total(after),
            total(before),
            "{context}：journal 树总字节数必须零增"
        );
    }

    /// 被拒的错误里不得回显入参值（本模块红线 2）。空串不判——`contains("")` 恒真。
    fn assert_no_echo(error: &HostError, canaries: &[&str], context: &str) {
        let rendered = format!("{error:?}");
        for canary in canaries {
            if canary.is_empty() {
                continue;
            }
            assert!(
                !rendered.contains(canary),
                "{context}：拒绝理由回显了入参值（{rendered}）"
            );
        }
    }

    /// 驱动一次完整 `start`；被拒即断言四轴零副作用。返回「这一枚是否被拒」。
    fn universal_start_case(
        h: &Harness,
        config: StartConfig,
        credentials: &dyn CredentialPort,
        canaries: &[&str],
        context: &str,
    ) -> bool {
        let before = journal_footprint(&h.app_data);
        let (result, log, spawns) = start_probe(
            h,
            config,
            vec![ready_leg()],
            ExitOutcome::Code(0),
            credentials,
        );
        let refused = match &result {
            Err(error) => {
                assert_eq!(
                    spawns, 0,
                    "{context}：被拒的 start 不得 spawn（实得 {error:?}）"
                );
                assert_eq!(
                    log.lock().expect("日志未中毒").written.len(),
                    0,
                    "{context}：被拒的 start 不得出包（实得 {error:?}）"
                );
                assert_journal_bytes_unchanged(&before, &journal_footprint(&h.app_data), context);
                assert_no_echo(error, canaries, context);
                true
            }
            Ok(_) => false,
        };
        drop(result);
        refused
    }

    /// 已起 leg 之后驱动一次完整 `prompt`；被拒即断言四轴零副作用。
    fn universal_prompt_case(
        tag: &str,
        request_id: &str,
        text: &str,
        canaries: &[&str],
        context: &str,
    ) -> bool {
        let h = harness(tag);
        let terminal = PacketPayload::Terminal(Terminal::Completed {
            budget: open_budget(0, Some(0.0)),
        });
        let mut inbox = vec![ready(
            1,
            vec![
                WorkspaceCapability::CaseRead,
                WorkspaceCapability::WorkspaceRead,
                WorkspaceCapability::WorkspaceWrite,
            ],
        )];
        // 合法 requestId 才脚本得出应答行；不可编码的 requestId 必然在发包前就被拒，
        // 这一枚应答永远用不上。
        if let Some(line) = optional_sidecar_line(2, Some(request_id), terminal) {
            inbox.push(line);
        }
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(inbox)],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("电池驱动 prompt 前须先起 leg");
        let before = journal_footprint(&h.app_data);
        let records_before = host.records().len();
        let writes_before = log.lock().expect("日志未中毒").written.len();
        match host.prompt(request_id, text) {
            Err(error) => {
                assert_journal_bytes_unchanged(&before, &journal_footprint(&h.app_data), context);
                assert_eq!(
                    host.records().len(),
                    records_before,
                    "{context}：被拒的 prompt 不得增内存账本（实得 {error:?}）"
                );
                assert_eq!(
                    log.lock().expect("日志未中毒").written.len(),
                    writes_before,
                    "{context}：被拒的 prompt 不得出包（实得 {error:?}）"
                );
                assert!(
                    !host.projection.request_ids.contains(request_id),
                    "{context}：被拒的 prompt 不得占用 requestId（实得 {error:?}）"
                );
                assert_no_echo(&error, canaries, context);
                true
            }
            Ok(_) => false,
        }
    }

    /// 已起 leg 之后驱动一次完整 `encode_host_result`；被拒即断言五轴零副作用。
    ///
    /// 出站方向的「零副作用」今日是**结构性**的（`&self` 拿不到可变态），但断言照旧逐轴写
    /// 死：结构性成立是今天的实现事实，不是契约担保——日后有人把签名改成 `&mut self`
    /// 顺手落账，这一族必须当场红。
    fn universal_host_result_case(
        payload: HostResultPayload,
        canaries: &[&str],
        context: &str,
    ) -> bool {
        let h = harness("uni-host-result");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let host = host.expect("电池驱动出站结果前须先起 leg");
        let before = journal_footprint(&h.app_data);
        let records_before = host.records().len();
        let writes_before = log.lock().expect("日志未中毒").written.len();
        let seq_before = host.outbound_seq;
        match host.encode_host_result("req-probe", payload) {
            Err(error) => {
                assert_journal_bytes_unchanged(&before, &journal_footprint(&h.app_data), context);
                assert_eq!(
                    host.records().len(),
                    records_before,
                    "{context}：被拒的出站结果不得增内存账本（实得 {error:?}）"
                );
                assert_eq!(
                    log.lock().expect("日志未中毒").written.len(),
                    writes_before,
                    "{context}：被拒的出站结果不得出包（实得 {error:?}）"
                );
                assert_eq!(
                    host.outbound_seq, seq_before,
                    "{context}：被拒的出站结果不得推进 outbound_seq（实得 {error:?}）"
                );
                assert_no_echo(&error, canaries, context);
                true
            }
            Ok(_) => false,
        }
    }

    fn optional_sidecar_line(
        seq: u64,
        request: Option<&str>,
        payload: PacketPayload,
    ) -> Option<Scripted> {
        let packet = ProductPacket {
            seq,
            session_id: Some("sess-1".to_string()),
            request_id: request.map(str::to_string),
            payload,
        };
        let mut line = encode_packet_line(&packet).ok()?;
        line.pop();
        Some(Scripted::Line(line))
    }

    /// ② 普适不变量：**任何**被拒的 host 输入都必须零副作用——不问门在哪、叫什么、怎么拼。
    #[test]
    fn universal_invariant_refused_host_input_leaves_zero_side_effects() {
        let battery = violation_battery();
        let mut refused: std::collections::BTreeMap<&'static str, usize> =
            std::collections::BTreeMap::new();
        let mut accepted: std::collections::BTreeMap<&'static str, usize> =
            std::collections::BTreeMap::new();

        for row in &battery {
            let context = format!("{}/{}", row.field, row.class);
            let hit = match &row.drive {
                ViolationDrive::Config(setter, value) => {
                    let h = harness("uni-config");
                    let mut config = h.config.clone();
                    setter(&mut config, value);
                    let case_root = h.case_root.to_string_lossy().into_owned();
                    universal_start_case(
                        &h,
                        config,
                        &FixedKey,
                        &["sk-in-memory-only", &case_root, value],
                        &context,
                    )
                }
                ViolationDrive::ConfigNumber(setter) => {
                    let h = harness("uni-config-number");
                    let mut config = h.config.clone();
                    setter(&mut config);
                    let case_root = h.case_root.to_string_lossy().into_owned();
                    universal_start_case(
                        &h,
                        config,
                        &FixedKey,
                        &["sk-in-memory-only", &case_root],
                        &context,
                    )
                }
                ViolationDrive::Credential(value) => {
                    let h = harness("uni-credential");
                    let config = h.config.clone();
                    let case_root = h.case_root.to_string_lossy().into_owned();
                    universal_start_case(
                        &h,
                        config,
                        &LiteralKey(value.clone()),
                        &[&case_root, value],
                        &context,
                    )
                }
                ViolationDrive::PromptText(value) => universal_prompt_case(
                    "uni-prompt-text",
                    "req-probe",
                    value,
                    &["sk-in-memory-only", value],
                    &context,
                ),
                ViolationDrive::PromptRequestId(value) => universal_prompt_case(
                    "uni-prompt-request",
                    value,
                    "合法一问",
                    &["sk-in-memory-only", value],
                    &context,
                ),
                ViolationDrive::Recovery(shape, trigger) => {
                    universal_recovery_start_case(*shape, *trigger, &context)
                }
                ViolationDrive::HostResult(make, value) => {
                    universal_host_result_case(make(value), &["sk-in-memory-only", value], &context)
                }
                ViolationDrive::HostResultScale(make, size) => {
                    universal_host_result_case(make(*size), &["sk-in-memory-only"], &context)
                }
            };
            *(if hit {
                refused.entry(row.field)
            } else {
                accepted.entry(row.field)
            })
            .or_insert(0) += 1;
        }

        // 靶未打空守卫，三层。**枚举塌缩与全通过在读数上同形**（承在案判例「静默零＝空枚举
        // 与全通过同形，枚举为空一律硬失败」）：把电池删空、把字段删剩一枚、把拒绝全变成
        // 放行，三种动作在没有下面这三道断言时都是一片绿。
        let fields: std::collections::BTreeSet<&'static str> =
            battery.iter().map(|row| row.field).collect();
        // 三枚全局下限随电池增长同步抬高（PI-WRITE-HOST-1 ②：142→152→220 枚 / 15→20 字段
        // / 拒 126 枚）。不抬高就等于「删掉整个效果域仍旧全绿」——下限留在旧刻度上，
        // 新族的塌缩只剩族内那一道守卫接得住，全局这一层等于没判。
        assert!(
            battery.len() >= 200,
            "电池只剩 {} 枚：枚举塌缩与全通过同形，一律硬失败",
            battery.len()
        );
        assert!(
            fields.len() >= 18,
            "电池只覆盖 {} 枚字段：host 方向输入面塌缩",
            fields.len()
        );
        assert!(
            refused.values().sum::<usize>() >= 115,
            "全电池只拒了 {} 枚：不是收紧了，就是入口被绕开了",
            refused.values().sum::<usize>()
        );
        // 状态域的塌缩守卫（1R7 J2）：「recovery 族被删空」与「本来就没有」读数同形。
        let recovery_rows = battery
            .iter()
            .filter(|row| matches!(row.drive, ViolationDrive::Recovery(..)))
            .count();
        assert!(
            recovery_rows >= 8,
            "recovery 族只剩 {recovery_rows} 行：状态域塌缩，带修复的载入分支又照不到了"
        );
        let recovery_fields: std::collections::BTreeSet<&'static str> = battery
            .iter()
            .filter(|row| matches!(row.drive, ViolationDrive::Recovery(..)))
            .map(|row| row.field)
            .collect();
        assert!(
            recovery_fields.len() >= 4,
            "recovery 族只覆盖 {} 类 journal 形状",
            recovery_fields.len()
        );
        // 效果域的塌缩守卫（PI-WRITE-HOST-1 ②）：五枚前向债一枚字段都不许掉队。
        // 「host_result 族被删空」与「本来就没有出站样本」在读数上同形——恰是这五行
        // 在 HOST-LOOP 全程为债的成因（彼时 ready capability 恰 `['case_read']`，出站 host_result
        // 一枚都不生成；⑤ 谈成 `workspace_write` 之后才有真样本，守卫因此更要在场）。
        let host_result_rows = battery
            .iter()
            .filter(|row| {
                matches!(
                    row.drive,
                    ViolationDrive::HostResult(..) | ViolationDrive::HostResultScale(..)
                )
            })
            .count();
        assert!(
            host_result_rows >= 60,
            "效果域只剩 {host_result_rows} 行：出站面塌缩，五枚前向债又照不到了"
        );
        let host_result_fields: std::collections::BTreeSet<&'static str> = battery
            .iter()
            .filter(|row| {
                matches!(
                    row.drive,
                    ViolationDrive::HostResult(..) | ViolationDrive::HostResultScale(..)
                )
            })
            .map(|row| row.field)
            .collect();
        assert_eq!(
            host_result_fields.len(),
            5,
            "效果域必须恰覆盖五枚前向债字段，实为 {host_result_fields:?}"
        );
        for field in &fields {
            assert!(
                refused.get(field).copied().unwrap_or(0) > 0,
                "{field}：整族违规一枚都没被拒，本族断言恒真"
            );
        }
        for field in &fields {
            eprintln!(
                "电池 {field}：拒 {} / 放行 {}",
                refused.get(field).copied().unwrap_or(0),
                accepted.get(field).copied().unwrap_or(0)
            );
        }
        eprintln!(
            "电池合计 {} 枚：拒 {} / 放行 {}",
            battery.len(),
            refused.values().sum::<usize>(),
            accepted.values().sum::<usize>()
        );

        // 对照：闭集内的输入照常起 leg、照常问得出一句——上面全族不是恒红。
        let h = harness("uni-control");
        let (result, log, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
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
        let mut host = result.expect("对照必须能起");
        assert_eq!(spawns, 1);
        host.prompt("req-ok", "合法一问").expect("对照必须问得通");
        assert_eq!(log.lock().expect("日志未中毒").written.len(), 2);
    }

    /// recovery 族的对照组：五类种子**确有**修复可做，且修复在 start 成功时照常落盘。
    ///
    /// 没有这一枚，`assert_repair_not_applied` 有一半机会是恒真——种子若本来就不需要修复，
    /// 「修复未应用」当然成立（承在案判例「静默零＝空枚举与全通过同形」）。第二段是
    /// 1R7 first-red ① 的绿形另一半：拒绝时的「逐字节不变」不是靠不做修复换来的。
    #[test]
    fn recovery_seeds_all_carry_a_repair_and_a_successful_start_applies_it() {
        for shape in RECOVERY_SHAPES {
            let h = harness("recovery-control");
            seed_session(&h, shape);
            let path = journal_path(&h.app_data, "cnt-1", "sess-1");
            let before = fs::read(&path).expect("读种子 journal");
            let loaded = pi_loop_journal::load_session(
                &h.app_data,
                "cnt-1",
                "sess-1",
                SessionInterruptReason::SidecarEnded,
            )
            .expect("载入必须成功——种子是可恢复形，不是 malformed");
            let marker = shape.repair_marker();
            assert!(
                loaded
                    .records
                    .iter()
                    .any(|record| record.journal_type() == marker),
                "{}：种子无修复可做，本形状的「修复未应用」断言恒真",
                shape.field()
            );
            drop(loaded);
            let after = fs::read(&path).expect("读修复后的 journal");
            assert!(
                after != before,
                "{}：修复没有落盘，对照本身失效",
                shape.field()
            );
        }

        // 绿形对照：同一份 open idle leg journal，配置不漂移时 start 成功，
        // 恢复计划与开场记录照常落盘，且既有字节只许被追加、不许被改写。
        let h = harness("recovery-green");
        seed_session(&h, SessionShape::OpenIdleLeg);
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读种子 journal");
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let host = result.expect("不漂移必须能起第二 leg");
        assert_eq!(spawns, 1);
        let after = fs::read(&path).expect("读起 leg 之后的 journal");
        assert!(after.starts_with(&before), "既有字节只许追加，不许改写");
        let types: Vec<JournalType> = decode_bytes(&after)
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            types,
            vec![
                JournalType::SessionStarted,
                JournalType::SessionInterrupted,
                JournalType::SessionResumed
            ],
            "恢复计划与开场记录都必须落盘，次序恰为：既有 → crash fold → resume"
        );
        drop(host);
    }

    /// characterization：`reclaim_after_fault` **保持立即 apply**（1R7 §零担保边界）。
    ///
    /// 它是已运行会话的故障收账，fold 本身就是目的效果，不适用 encode-before-effect——
    /// 分相 API 允许调用方选择 apply 时机，但不得为凑不变量把这条路也改成延迟。把它改成
    /// 延迟 apply（只 plan 不落盘）即在这里当场红。
    #[test]
    fn reclaim_after_fault_lands_the_crash_fold_on_disk_immediately() {
        let h = harness("reclaim-characterization");
        let (host, _, _) = start_with(&h, vec![ready_leg()]);
        let mut host = host.expect("启动");
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读起 leg 之后的 journal");
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收");
        // 不 drop host、不再经任何门：盘上此刻就必须有 session_interrupted。
        let after = fs::read(&path).expect("读收账之后的 journal");
        assert!(
            after.starts_with(&before) && after.len() > before.len(),
            "故障收账必须当场落盘（{} B → {} B）",
            before.len(),
            after.len()
        );
        assert_eq!(
            decode_bytes(&after)
                .iter()
                .map(JournalRecord::journal_type)
                .collect::<Vec<JournalType>>(),
            vec![JournalType::SessionStarted, JournalType::SessionInterrupted]
        );
        // 内存投影与盘上真值同步。
        assert!(
            host.projection().interrupted,
            "收账后投影必须已 interrupted"
        );
    }

    /// H1 的编码失败出口：**具名 code ＋ 零值回显**。
    ///
    /// codec 拒绝这一路上的入参正是 apiKey 与物理案件根，两者都不许露出一个字节；具名
    /// code 也不得退化成通用 `protocol`——那会把「配置错」说成「协议错」。期望侧手写
    /// 字面量，不从被测常量派生。
    #[test]
    fn a_codec_refusal_surfaces_as_a_named_refusal_without_echoing_the_input() {
        let key_canary = "sk-canary-Z9Q4M7";
        let root_canary = "/案卷-canary-Z9Q4M7";
        let rejection = encode_outbound_line(
            0,
            "sess-1",
            None,
            PacketPayload::Bootstrap(BootstrapPayload {
                container_id: "cnt-1".to_string(),
                grant_id: "grant-1".to_string(),
                case_root: root_canary.to_string(),
                provider: BootstrapProvider {
                    // NUL 是 wire 字符串闭集判据，codec 必拒；这里要的正是那一枚拒绝。
                    model_id: "m\u{0}x".to_string(),
                    api_key: key_canary.to_string(),
                },
                limits: BootstrapLimits {
                    max_turns: 12,
                    max_usd: None,
                },
                resume: BootstrapResume {
                    kind: ResumeKind::Fresh,
                    leg: 1,
                    prior_observed_turns: 0,
                    prior_turns: 0,
                    prior_usd: Some(0.0),
                },
            }),
        )
        .err()
        .expect("含 NUL 的 modelId 必须编不出来");
        // 前提校验：codec 自己的理由**确实**带字段实况——否则「不回显」这一条恒真。
        assert!(
            !rejection.reason.trim().is_empty(),
            "codec 拒绝理由不该是空串，否则零回显断言恒真"
        );

        let config_error = config_codec_refusal(rejection);
        assert_eq!(config_error.code(), "invalid_config");
        let rendered = format!("{config_error:?}");
        assert!(
            !rendered.contains(key_canary),
            "配置侧拒绝回显了 apiKey：{rendered}"
        );
        assert!(
            !rendered.contains(root_canary),
            "配置侧拒绝回显了物理案件根：{rendered}"
        );

        let prompt_rejection = encode_outbound_line(
            0,
            "sess-1",
            Some("req-1"),
            PacketPayload::Prompt {
                text: format!("{key_canary}\u{0}"),
            },
        )
        .err()
        .expect("含 NUL 的 prompt 必须编不出来");
        let prompt_error = prompt_codec_refusal(prompt_rejection);
        assert_eq!(prompt_error.code(), "invalid_prompt");
        assert!(
            !format!("{prompt_error:?}").contains(key_canary),
            "prompt 侧拒绝回显了正文"
        );
    }

    /// H1 的字节身份：**验过的那一份**与**发出去的那一份**是同一份字节。
    ///
    /// 期望侧独立重编 exact packet（seq / sessionId / requestId / payload 全部手写字面量，
    /// 不从被测结构派生），与真正写进 leg 的那两行逐字节比对。发送路径若改成重编码而与
    /// 验过的那一份不等——改 seq、改字段、改顺序、少一个 LF——这一枚即红。
    #[test]
    fn the_bytes_validated_before_the_effect_are_the_bytes_put_on_the_wire() {
        let h = harness("h1-bytes");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![VecDeque::from(vec![
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
                sidecar_line(
                    2,
                    Some("req-1"),
                    PacketPayload::Terminal(Terminal::Completed {
                        budget: open_budget(0, Some(0.0)),
                    }),
                ),
            ])],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("对照 leg 必须起得来");
        host.prompt("req-1", "一问")
            .expect("合法 prompt 必须走得通");

        let expected_bootstrap = encode_packet_line(&ProductPacket {
            seq: 1,
            session_id: Some("sess-1".to_string()),
            request_id: None,
            payload: PacketPayload::Bootstrap(BootstrapPayload {
                container_id: "cnt-1".to_string(),
                grant_id: "grant-1".to_string(),
                case_root: h.case_root.to_string_lossy().into_owned(),
                provider: BootstrapProvider {
                    model_id: "deepseek-v4-flash".to_string(),
                    api_key: "sk-in-memory-only".to_string(),
                },
                limits: BootstrapLimits {
                    max_turns: 12,
                    max_usd: None,
                },
                resume: BootstrapResume {
                    kind: ResumeKind::Fresh,
                    leg: 1,
                    prior_observed_turns: 0,
                    prior_turns: 0,
                    prior_usd: Some(0.0),
                },
            }),
        })
        .expect("期望侧 bootstrap 可编码");
        let expected_prompt = encode_packet_line(&ProductPacket {
            seq: 2,
            session_id: Some("sess-1".to_string()),
            request_id: Some("req-1".to_string()),
            payload: PacketPayload::Prompt {
                text: "一问".to_string(),
            },
        })
        .expect("期望侧 prompt 可编码");

        let written = log.lock().expect("日志未中毒").written.clone();
        assert_eq!(written.len(), 2, "本例恰两枚出包");
        assert_eq!(
            written[0], expected_bootstrap,
            "bootstrap 出线字节须与效果之前验过的那一份逐字节相同"
        );
        assert_eq!(
            written[1], expected_prompt,
            "prompt 出线字节须与效果之前验过的那一份逐字节相同"
        );
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
                     `read_safe_token` 收口；出站 `host_result` 原样回同一枚，而③ 的 \
                     `serve_host_request` 先编码后落账，故那一枚同样排在 journal、effect \
                     与发包之前由 codec 判——不另立第二道会漂移的门",
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

    // ── ④ `host_request` 臂：四段落账（PI-WRITE-HOST-1 ③）──────────────────────

    const TOOL_CALL: &str = "tc_1_1";
    const OPERATION: &str = "op_1_1";
    const WRITE_CONTENT: &str = "0123456789";

    /// ③ 期的脚本请求：`contentSha256` 是脚本座认得的哨兵（脚本座不重算内容），
    /// 但 `proposalHash` 自⑥ 起必须是真值——它绑定的正是这一枚**自报的** `contentSha256`。
    fn scripted_proposal_hash(logical_path: &str, content: &str) -> String {
        expected_proposal_hash(
            "courtwork.pi.workspace_write.v1",
            "sess-1",
            "req-1",
            OPERATION,
            logical_path,
            content.len() as u64,
            PROBE_SHA,
        )
    }

    fn write_request_packet(logical_path: &str, content: &str) -> PacketPayload {
        PacketPayload::HostRequest(WorkspaceHostRequest {
            operation_id: OPERATION.to_string(),
            proposal_hash: scripted_proposal_hash(logical_path, content),
            capability: WorkspaceCapability::WorkspaceWrite,
            arguments: WorkspaceRequestArguments::Write(WorkspaceWriteArguments {
                logical_path: logical_path.to_string(),
                content: content.to_string(),
                content_sha256: PROBE_SHA.to_string(),
                byte_length: content.len() as u64,
            }),
        })
    }

    fn tool_started_line(seq: u64) -> Scripted {
        tool_started_line_for(seq, "req-1")
    }

    /// requestId 参数化版：同一 logical session 内 requestId 不可复用，跨腿的脚本因此要换枚。
    fn tool_started_line_for(seq: u64, request_id: &str) -> Scripted {
        sidecar_line(
            seq,
            Some(request_id),
            PacketPayload::AgentEvent(AgentProjectionEvent::ToolStarted {
                tool_call_id: TOOL_CALL.to_string(),
                tool_name: ProductToolName::Write,
            }),
        )
    }

    fn tool_finished_line(seq: u64) -> Scripted {
        tool_finished_line_for(seq, "req-1")
    }

    fn tool_finished_line_for(seq: u64, request_id: &str) -> Scripted {
        sidecar_line(
            seq,
            Some(request_id),
            PacketPayload::AgentEvent(AgentProjectionEvent::ToolFinished {
                tool_call_id: TOOL_CALL.to_string(),
                tool_name: ProductToolName::Write,
                outcome: ToolOutcome::Succeeded,
            }),
        )
    }

    fn completed_line(seq: u64) -> Scripted {
        completed_line_for(seq, "req-1")
    }

    fn completed_line_for(seq: u64, request_id: &str) -> Scripted {
        sidecar_line(
            seq,
            Some(request_id),
            PacketPayload::Terminal(Terminal::Completed {
                budget: open_budget(0, Some(0.0)),
            }),
        )
    }

    /// 一枚完整的 write 回合：`tool_started → host_request → tool_finished → completed`。
    fn write_leg() -> VecDeque<Scripted> {
        VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(
                3,
                Some("req-1"),
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
            tool_finished_line(4),
            completed_line(5),
        ])
    }

    /// 脚本化的 workspace write 真件座。三枚方法各留一份**调用现场快照**：
    /// 每次调用当刻盘上 journal 的字节数与已发包数——「effect 排在 durable 之后」
    /// 因此是读数，不是宣称。
    struct ScriptedWriteHost {
        disposition: WriteDisposition,
        /// 第二次在场判定的结果；`None` ⇒ 与第一次相同（动作未变）。
        reprobe: Option<WriteDisposition>,
        /// 第 n 次在场判定改判失败（1 起数）。④ 起 `probe` 可失败，臂必须把这枚 code
        /// 原样带到出站；`None` ⇒ 两次都成功。
        probe_error: Option<(usize, HostFailureCode)>,
        authorization: fn() -> WriteAuthorization,
        outcome: fn() -> EffectOutcome,
        journal: PathBuf,
        log: Arc<Mutex<WriteHostLog>>,
    }

    #[derive(Default)]
    struct WriteHostLog {
        probes: usize,
        decisions: usize,
        performs: usize,
        /// 每次 `perform` 当刻盘上 journal 的**完整字节**。「effect 排在 durable 之后」
        /// 因此是从盘上读回来的读数，不是宣称。
        journal_at_perform: Vec<Vec<u8>>,
    }

    impl ScriptedWriteHost {
        fn new(h: &Harness) -> ScriptedWriteHost {
            ScriptedWriteHost {
                disposition: WriteDisposition::Created,
                reprobe: None,
                probe_error: None,
                authorization: || WriteAuthorization::Approved,
                outcome: || EffectOutcome::Succeeded,
                journal: journal_path(&h.app_data, "cnt-1", "sess-1"),
                log: Arc::new(Mutex::new(WriteHostLog::default())),
            }
        }
    }

    impl WorkspaceWriteHost for ScriptedWriteHost {
        fn probe(
            &mut self,
            _plan: &WorkspaceWritePlan,
        ) -> Result<WriteDisposition, HostFailureCode> {
            let mut log = self.log.lock().expect("日志未中毒");
            log.probes += 1;
            let round = log.probes;
            drop(log);
            if let Some((at, code)) = self.probe_error {
                if at == round {
                    return Err(code);
                }
            }
            Ok(if round >= 2 {
                self.reprobe.unwrap_or(self.disposition)
            } else {
                self.disposition
            })
        }
        fn decide(
            &mut self,
            _plan: &WorkspaceWritePlan,
            _action: WriteDisposition,
        ) -> WriteAuthorization {
            self.log.lock().expect("日志未中毒").decisions += 1;
            (self.authorization)()
        }
        fn perform(
            &mut self,
            _plan: &WorkspaceWritePlan,
            _action: WriteDisposition,
        ) -> EffectOutcome {
            let bytes = fs::read(&self.journal).unwrap_or_default();
            let mut log = self.log.lock().expect("日志未中毒");
            log.performs += 1;
            log.journal_at_perform.push(bytes);
            drop(log);
            (self.outcome)()
        }
    }

    /// 起 leg（⑤ 之后握手当场就谈成 `workspace_write`），再把真件换成脚本座。
    /// ③ 期那一枚 `grant_workspace_write` 已随真实握手退役。
    fn armed_host(
        h: &Harness,
        legs: Vec<VecDeque<Scripted>>,
        write_host: ScriptedWriteHost,
    ) -> (PiLoopHost, Arc<Mutex<LegLog>>, Arc<Mutex<WriteHostLog>>) {
        let (host, log, _) =
            start_probe(h, h.config.clone(), legs, ExitOutcome::Code(0), &FixedKey);
        let mut host = host.expect("启动");
        let effect_log = Arc::clone(&write_host.log);
        host.install_write_host(Some(Box::new(write_host)));
        (host, log, effect_log)
    }

    fn record_types(records: &[JournalRecord]) -> Vec<JournalType> {
        records.iter().map(JournalRecord::journal_type).collect()
    }

    /// effect 六型。手写字面量，不从被测结构派生（承 D1 体例）。
    fn is_effect_type(journal_type: JournalType) -> bool {
        matches!(
            journal_type,
            JournalType::ToolProposed
                | JournalType::AuthorizationDecided
                | JournalType::EffectStarted
                | JournalType::EffectSucceeded
                | JournalType::EffectFailed
                | JournalType::EffectUncertain
        )
    }

    /// 已发出的最后一枚出包解回 `host_result`；没有出包即 `None`。
    fn last_host_result(log: &Arc<Mutex<LegLog>>) -> Option<HostResultPayload> {
        let written = log.lock().expect("日志未中毒").written.clone();
        let line = written.last()?.clone();
        let packet = decode_host_packet_for_test(&line)?;
        match packet.payload {
            PacketPayload::HostResult(payload) => Some(payload),
            _ => None,
        }
    }

    fn host_result_count(log: &Arc<Mutex<LegLog>>) -> usize {
        log.lock()
            .expect("日志未中毒")
            .written
            .iter()
            .filter(|line| {
                matches!(
                    decode_host_packet_for_test(line).map(|packet| packet.payload),
                    Some(PacketPayload::HostResult(_))
                )
            })
            .count()
    }

    fn decode_host_packet_for_test(line: &[u8]) -> Option<ProductPacket> {
        let mut body = line.to_vec();
        if body.last() == Some(&b'\n') {
            body.pop();
        }
        crate::pi_loop_protocol::decode_host_packet_line(&body).ok()
    }

    /// **首红装置**（RECON §born-red 复用装置）：HEAD 的 `pump` 没有 `HostRequest` 臂，
    /// 脚本化的 `host_request` 落进 `_ => fail_protocol(StateViolation)` 兜底。
    ///
    /// 绿形锁的是四段账的**逐值**内容与次序，不只是「有几条」。
    #[test]
    fn counterexample_scripted_host_request_is_served_not_dropped_into_the_fallback() {
        let h = harness("write-arm-born-red");
        let (mut host, log, effects) =
            armed_host(&h, vec![write_leg()], ScriptedWriteHost::new(&h));
        let terminal = host
            .prompt("req-1", "写一份纪要")
            .expect("host_request 必须由本臂服务，而不是掉进兜底");
        assert!(matches!(terminal, Terminal::Completed { .. }));

        assert_eq!(
            record_types(host.records()),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectSucceeded,
                JournalType::AgentEvent,
                JournalType::PromptCompleted,
            ],
            "四段账次序恰为 tool_proposed → authorization_decided → effect_started → effect_succeeded"
        );
        // 四段全部挂同一 request 与同一 operation（ADR-022 六-C：全链必须回同一 request）。
        for record in host
            .records()
            .iter()
            .filter(|record| is_effect_type(record.journal_type()))
        {
            assert_eq!(record.request_id.as_deref(), Some("req-1"));
            assert_eq!(record.operation_id.as_deref(), Some(OPERATION));
        }
        assert_eq!(
            host.records()[3].payload,
            JournalPayload::ToolProposed(ToolProposedPayload {
                tool_call_id: TOOL_CALL.to_string(),
                logical_path: "纪要.md".to_string(),
                proposal_hash: scripted_proposal_hash("纪要.md", WRITE_CONTENT),
                content_sha256: PROBE_SHA.to_string(),
                byte_length: WRITE_CONTENT.len() as u64,
                action: WriteDisposition::Created,
            }),
        );
        assert_eq!(
            host.records()[4].payload,
            JournalPayload::AuthorizationDecided {
                tool_call_id: TOOL_CALL.to_string(),
                decision: AuthorizationDecision::Approved,
                code: None,
            },
        );

        // 出站：恰一枚 host_result，逐值等于计划。
        assert_eq!(host_result_count(&log), 1);
        assert_eq!(
            last_host_result(&log).expect("必须发出 host_result"),
            HostResultPayload {
                operation_id: OPERATION.to_string(),
                capability: WorkspaceCapability::WorkspaceWrite,
                operation: WorkspaceOperation::Write,
                outcome: HostResultOutcome::Ok(HostResultValue::Write {
                    logical_path: "纪要.md".to_string(),
                    disposition: WriteDisposition::Created,
                    content_sha256: PROBE_SHA.to_string(),
                    byte_length: WRITE_CONTENT.len() as u64,
                }),
            }
        );
        // 正文一个字节都不进 journal（ADR-022 六-C：只记逻辑路径 / hash / byteLength / outcome）。
        let text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(!text.contains(WRITE_CONTENT), "正文不得落进 journal");

        let effects = effects.lock().expect("日志未中毒");
        assert_eq!(
            (effects.probes, effects.decisions, effects.performs),
            (2, 1, 1)
        );
        // effect 那一刻，`effect_started` 已经在盘上——durable-before-effect 是读数，不是宣称。
        assert_eq!(
            record_types(&decode_bytes(&effects.journal_at_perform[0])),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
            ],
            "真实落盘发生时，四段账的前三段必须已经 durable"
        );
    }

    /// 票面判据：`effect_started` 的 append + `sync_all` 失败 ⇒ **零 temp、零 replace**。
    ///
    /// 三枚屏障逐枚注入（`tool_proposed` / `authorization_decided` / `effect_started`）：
    /// 任一枚落不住，`perform` 都必须恰 0 次，出站 `host_result` 也一枚不发。
    /// 只测 `effect_started` 一枚是不够的——前两枚落不住却照样 effect，同样是
    /// 「授权未 durable 就动手」。
    #[test]
    fn counterexample_any_durable_barrier_failure_leaves_the_effect_at_zero() {
        for (fail_from, barrier) in [
            (4_u64, JournalType::ToolProposed),
            (5, JournalType::AuthorizationDecided),
            (6, JournalType::EffectStarted),
        ] {
            let h = harness("write-barrier");
            let (mut host, log, effects) =
                armed_host(&h, vec![write_leg()], ScriptedWriteHost::new(&h));
            host.journal.inject_append_failure_from(fail_from);
            let error = host
                .prompt("req-1", "写一份纪要")
                .expect_err("屏障落不住必须拒");
            assert_eq!(error.code(), "journal", "{barrier:?}：实得 {error:?}");
            assert_eq!(
                effects.lock().expect("日志未中毒").performs,
                0,
                "{barrier:?} 落不住时 effect 必须恰 0 次"
            );
            assert_eq!(
                host_result_count(&log),
                0,
                "{barrier:?} 落不住时 host_result 一枚都不许发"
            );
            let types = record_types(&decode_bytes(
                &fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"),
            ));
            assert!(
                !types.contains(&barrier),
                "{barrier:?}：失败那一枚不得留在盘上，实得 {types:?}"
            );
        }
    }

    /// 终态记录 durable **之后**才发包：`effect_succeeded` 落不住时，effect 已经做了，
    /// 但对端一个字节都收不到——不得出现「账上没有、对端却当成功」的一轮。
    #[test]
    fn counterexample_host_result_waits_for_the_terminal_record_to_be_durable() {
        let h = harness("write-terminal-durable");
        let (mut host, log, effects) =
            armed_host(&h, vec![write_leg()], ScriptedWriteHost::new(&h));
        host.journal.inject_append_failure_from(7);
        let error = host
            .prompt("req-1", "写一份纪要")
            .expect_err("终态落不住必须拒");
        assert_eq!(error.code(), "journal", "实得 {error:?}");
        assert_eq!(
            effects.lock().expect("日志未中毒").performs,
            1,
            "effect 已经发生——本枚判的正是它之后的那一步"
        );
        assert_eq!(host_result_count(&log), 0, "终态没落住就不许发包");
    }

    /// `SessionShape::DanglingEffect` 的**首份真数据**（PI-WRITE-HOST-1 ③ 票面第三项）：
    /// 盘上那枚 `effect_started` 由生产臂写出，不是手工种进去的。
    ///
    /// crash fold 步骤 2 因此必须：先派生 `effect_uncertain`，再
    /// `prompt_failed(effect_uncertain, retryable:false)` → `session_failed`；
    /// 不猜 succeeded/failed、不复用授权自动重试。随后该 logical session 永久关闭。
    #[test]
    fn dangling_effect_written_by_the_real_arm_folds_to_uncertain_and_closes_the_session() {
        let h = harness("write-dangling");
        let (mut host, _, effects) = armed_host(&h, vec![write_leg()], ScriptedWriteHost::new(&h));
        host.journal.inject_append_failure_from(7);
        host.prompt("req-1", "写一份纪要")
            .expect_err("终态落不住必须拒");
        assert_eq!(effects.lock().expect("日志未中毒").performs, 1);
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = record_types(&decode_bytes(&fs::read(&path).expect("读")));
        assert_eq!(
            before.last(),
            Some(&JournalType::EffectStarted),
            "前置条件：盘上恰停在无收束的 effect_started，实得 {before:?}"
        );
        // 交出单写者锁。
        drop(host);

        let loaded = pi_loop_journal::load_session(
            &h.app_data,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("载入必须成功——这是可恢复形，不是 malformed");
        assert_eq!(
            record_types(&loaded.records),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectUncertain,
                JournalType::PromptFailed,
                JournalType::SessionFailed,
            ],
            "crash fold 步骤 2：先派生 uncertain 再走同一关闭链"
        );
        let derived = &loaded.records[6];
        assert_eq!(
            derived.payload,
            JournalPayload::EffectUncertain {
                tool_call_id: TOOL_CALL.to_string(),
            },
            "派生的 uncertain 必须认领同一枚 toolCallId"
        );
        assert_eq!(derived.request_id.as_deref(), Some("req-1"));
        assert_eq!(derived.operation_id.as_deref(), Some(OPERATION));
        let JournalPayload::PromptFailed { error, .. } = &loaded.records[7].payload else {
            panic!("第八枚必须是 prompt_failed，实得 {:?}", loaded.records[7]);
        };
        assert_eq!(error.code, TerminalFailureCode::EffectUncertain);
        assert!(!error.retryable, "effect_uncertain 不得自动重试");
        drop(loaded);

        // 修复已落盘，且该 logical session 自此永久关闭。
        assert_eq!(
            record_types(&decode_bytes(&fs::read(&path).expect("读"))).len(),
            9
        );
        let (result, _, spawns) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        assert!(
            matches!(result, Err(HostError::SessionClosed)),
            "session_failed 之后不得再起 leg"
        );
        assert_eq!(spawns, 0);
    }

    /// 四道门逐枚：拒绝一律 `state_violation`，且 effect 恰 0 次、`host_result` 一枚不发。
    ///
    /// `PI-WORKSPACE-READ-1` 之后「读操作未实装」这一格**已不成立**（读臂真的在服务），
    /// 原位换成「读能力未谈成」：0.1 能力门对读的可证否形态由 `revoke_workspace_read` 保留，
    /// 与写那一格同构。撤掉之后来一枚读请求，若 0.1 不在，它会一路走到真实文件读取。
    #[test]
    fn counterexample_host_request_gates_refuse_before_any_effect() {
        // (label, 本次握手撤掉哪一枚能力, 是否装真件, 是否先来一枚 tool_started, 请求)
        //
        // 握手闭集恒含 `workspace_write`／`workspace_read`，故两格「能力未谈成」都改由显式
        // 撤销构造——0.1 门的反例因此不因能力到位而失去覆盖。
        let read_request_packet = || {
            PacketPayload::HostRequest(WorkspaceHostRequest {
                operation_id: OPERATION.to_string(),
                proposal_hash: PROBE_SHA.to_string(),
                capability: WorkspaceCapability::WorkspaceRead,
                arguments: WorkspaceRequestArguments::Read(
                    crate::pi_loop_protocol::WorkspaceReadArguments {
                        operation: WorkspaceOperation::List,
                        logical_path: "子目录".to_string(),
                    },
                ),
            })
        };
        let cases: Vec<(&str, Option<WorkspaceCapability>, bool, bool, PacketPayload)> = vec![
            (
                "写能力未谈成",
                Some(WorkspaceCapability::WorkspaceWrite),
                true,
                true,
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
            (
                "读能力未谈成",
                Some(WorkspaceCapability::WorkspaceRead),
                true,
                true,
                read_request_packet(),
            ),
            (
                "无活动 tool call",
                None,
                true,
                false,
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
            (
                "读的无活动 tool call",
                None,
                true,
                false,
                read_request_packet(),
            ),
            (
                "真件座缺席",
                None,
                false,
                true,
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
        ];

        for (label, revoke, install, tool_started, request) in cases {
            let h = harness("write-gate");
            let mut leg = vec![ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            )];
            let mut seq = 2;
            if tool_started {
                leg.push(tool_started_line(seq));
                seq += 1;
            }
            leg.push(sidecar_line(seq, Some("req-1"), request));
            let (host, log, _) = start_probe(
                &h,
                h.config.clone(),
                vec![VecDeque::from(leg)],
                ExitOutcome::Code(0),
                &FixedKey,
            );
            let mut host = host.expect("启动");
            let write_host = ScriptedWriteHost::new(&h);
            let effects = Arc::clone(&write_host.log);
            match revoke {
                Some(WorkspaceCapability::WorkspaceWrite) => host.revoke_workspace_write(),
                Some(WorkspaceCapability::WorkspaceRead) => host.revoke_workspace_read(),
                Some(_) | None => {}
            }
            // ④ 起构造点恒装真件，故「真件座缺席」这一格必须**显式置 `None`**——
            // 0.4 门的反例因此仍然咬得住，不因真件到位而悄悄失去覆盖。
            host.install_write_host(if install {
                Some(Box::new(write_host) as Box<dyn WorkspaceWriteHost>)
            } else {
                None
            });
            let error = host
                .prompt("req-1", "写一份纪要")
                .expect_err(&format!("{label}：门不成立必须拒"));
            assert_eq!(
                error,
                HostError::Protocol(ProtocolErrorCode::StateViolation),
                "{label}：实得 {error:?}"
            );
            assert_eq!(
                effects.lock().expect("日志未中毒").probes,
                0,
                "{label}：被拒的一轮连在场判定都不许做"
            );
            assert_eq!(host_result_count(&log), 0, "{label}：不许发 host_result");
            let types = record_types(&decode_bytes(
                &fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"),
            ));
            assert!(
                !types.iter().copied().any(is_effect_type),
                "{label}：effect 六型一枚都不许落账，实得 {types:?}"
            );
            assert!(
                types.contains(&JournalType::SessionFailed),
                "{label}：失败必须显式落账"
            );
        }
    }

    /// 一 tc 一 op：同一枚 tool call 的第二枚 `host_request` 当场无主可认。
    #[test]
    fn counterexample_one_tool_call_serves_at_most_one_operation() {
        let h = harness("write-one-op");
        let leg = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(
                3,
                Some("req-1"),
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
            sidecar_line(
                4,
                Some("req-1"),
                write_request_packet("纪要.md", WRITE_CONTENT),
            ),
        ]);
        let (mut host, log, effects) = armed_host(&h, vec![leg], ScriptedWriteHost::new(&h));
        let error = host
            .prompt("req-1", "写一份纪要")
            .expect_err("同一 tool call 的第二枚 operation 必须拒");
        assert_eq!(
            error,
            HostError::Protocol(ProtocolErrorCode::StateViolation)
        );
        assert_eq!(
            effects.lock().expect("日志未中毒").performs,
            1,
            "第一枚照常服务，第二枚才是被判的那一枚"
        );
        assert_eq!(host_result_count(&log), 1);
    }

    /// 三态收束 ＋ 未获授权 ＋ 授权后状态已变，逐形态锁「哪一枚记录、哪一种 status」。
    #[test]
    fn write_arm_settles_each_outcome_on_its_own_record_and_status() {
        struct Case {
            label: &'static str,
            reprobe: Option<WriteDisposition>,
            authorization: fn() -> WriteAuthorization,
            outcome: fn() -> EffectOutcome,
            performs: usize,
            tail: Vec<JournalType>,
            result: HostResultOutcome,
        }
        let cases = vec![
            Case {
                label: "succeeded",
                reprobe: None,
                authorization: || WriteAuthorization::Approved,
                outcome: || EffectOutcome::Succeeded,
                performs: 1,
                tail: vec![JournalType::EffectStarted, JournalType::EffectSucceeded],
                result: HostResultOutcome::Ok(HostResultValue::Write {
                    logical_path: "纪要.md".to_string(),
                    disposition: WriteDisposition::Created,
                    content_sha256: PROBE_SHA.to_string(),
                    byte_length: WRITE_CONTENT.len() as u64,
                }),
            },
            Case {
                label: "failed",
                reprobe: None,
                authorization: || WriteAuthorization::Approved,
                outcome: || EffectOutcome::Failed(HostFailureCode::Io),
                performs: 1,
                tail: vec![JournalType::EffectStarted, JournalType::EffectFailed],
                result: HostResultOutcome::Failed {
                    code: HostFailureCode::Io,
                    message: HostFailureCode::Io.message().to_string(),
                },
            },
            Case {
                label: "uncertain",
                reprobe: None,
                authorization: || WriteAuthorization::Approved,
                outcome: || EffectOutcome::Uncertain,
                performs: 1,
                tail: vec![JournalType::EffectStarted, JournalType::EffectUncertain],
                result: HostResultOutcome::Uncertain {
                    message: TerminalFailureCode::EffectUncertain.message().to_string(),
                },
            },
            Case {
                label: "denied",
                reprobe: None,
                authorization: || WriteAuthorization::Denied(AuthorizationDenyCode::UserDenied),
                outcome: || panic!("未获授权就不该走到 effect"),
                performs: 0,
                tail: vec![JournalType::AuthorizationDecided],
                result: HostResultOutcome::Denied {
                    code: HostDeniedCode::UserDenied,
                    message: HostDeniedCode::UserDenied.message().to_string(),
                },
            },
            Case {
                label: "授权后状态已变",
                reprobe: Some(WriteDisposition::Overwritten),
                authorization: || WriteAuthorization::Approved,
                outcome: || panic!("动作已变就必须零写"),
                performs: 0,
                tail: vec![JournalType::AuthorizationDecided, JournalType::EffectFailed],
                result: HostResultOutcome::Failed {
                    code: HostFailureCode::StateChanged,
                    message: HostFailureCode::StateChanged.message().to_string(),
                },
            },
        ];

        for case in cases {
            let h = harness("write-outcome");
            let mut write_host = ScriptedWriteHost::new(&h);
            write_host.reprobe = case.reprobe;
            write_host.authorization = case.authorization;
            write_host.outcome = case.outcome;
            let (mut host, log, effects) = armed_host(&h, vec![write_leg()], write_host);
            host.prompt("req-1", "写一份纪要")
                .unwrap_or_else(|error| panic!("{}：本形态必须走得通，实得 {error:?}", case.label));
            assert_eq!(
                effects.lock().expect("日志未中毒").performs,
                case.performs,
                "{}：effect 次数",
                case.label
            );
            let types = record_types(host.records());
            let tail_start = types
                .windows(case.tail.len())
                .position(|window| window == case.tail.as_slice());
            assert!(
                tail_start.is_some(),
                "{}：账本里找不到 {:?}，实得 {types:?}",
                case.label,
                case.tail
            );
            assert!(
                !types.contains(&JournalType::EffectSucceeded) || case.label == "succeeded",
                "{}：只有 succeeded 一形态可以落 effect_succeeded",
                case.label
            );
            assert!(
                case.performs == 1 || !types.contains(&JournalType::EffectStarted),
                "{}：零写的形态不得留下 effect_started",
                case.label
            );
            assert_eq!(host_result_count(&log), 1, "{}：出站恰一枚", case.label);
            assert_eq!(
                last_host_result(&log)
                    .expect("必须发出 host_result")
                    .outcome,
                case.result,
                "{}：出站 status 与账本必须同一结论",
                case.label
            );
        }
    }

    /// ADR-022 六-C：`effect_uncertain` 自身落不住 ⇒ 宿主**立即终止 sidecar leg**。
    /// 不留一枚既没落账、对端又还在等的 operation。
    #[test]
    fn counterexample_undurable_uncertain_terminates_the_leg_at_once() {
        let h = harness("write-uncertain-undurable");
        let mut write_host = ScriptedWriteHost::new(&h);
        write_host.outcome = || EffectOutcome::Uncertain;
        let (mut host, log, effects) = armed_host(&h, vec![write_leg()], write_host);
        host.journal.inject_append_failure_from(7);
        let error = host
            .prompt("req-1", "写一份纪要")
            .expect_err("uncertain 落不住必须拒");
        assert_eq!(error.code(), "journal", "实得 {error:?}");
        assert_eq!(effects.lock().expect("日志未中毒").performs, 1);
        assert_eq!(host_result_count(&log), 0, "落不住就不许回 uncertain");
        assert!(
            log.lock().expect("日志未中毒").terminated,
            "leg 必须当场终止"
        );
        assert!(host.closed, "leg 已交出，本 Host 不得再被当作 live 写者");
    }

    // ── ④ 真件端到端：cap-std 落盘、屏障与防御门在**臂上**的读数 ──────────────

    /// ADR-022 六-B.2 的 `proposalHash`，**在测试里独立重写一遍**——不 import 生产件的
    /// 那一份，否则「重算」与「被重算的东西」同源，判据零区分力。
    ///
    /// 七枚 frame 的次序即契约：domain、sessionId、requestId、operationId、logicalPath、
    /// byteLength（十进制文本）、contentSha256。
    fn expected_proposal_hash(
        domain: &str,
        session_id: &str,
        request_id: &str,
        operation_id: &str,
        logical_path: &str,
        byte_length: u64,
        content_sha256: &str,
    ) -> String {
        let mut bytes = Vec::new();
        for field in [
            domain,
            session_id,
            request_id,
            operation_id,
            logical_path,
            &byte_length.to_string(),
            content_sha256,
        ] {
            bytes.extend_from_slice(&(field.len() as u32).to_be_bytes());
            bytes.extend_from_slice(field.as_bytes());
        }
        pi_loop_journal::sha256_hex(&bytes)
    }

    /// 本 harness 恒定的三枚 id：`sess-1` / `req-1` / `op_1_1`。
    fn harness_proposal_hash(logical_path: &str, content: &str) -> String {
        expected_proposal_hash(
            "courtwork.pi.workspace_write.v1",
            "sess-1",
            "req-1",
            OPERATION,
            logical_path,
            content.len() as u64,
            &pi_loop_journal::sha256_hex(content.as_bytes()),
        )
    }

    /// 真件的 host_request：`contentSha256` 取正文真值（真件重算，PROBE_SHA 过不了）；
    /// `proposalHash` 亦取真值——⑥ 之后宿主对它同样重算，自报的假值一律 `hash_mismatch`。
    fn real_write_request_packet(logical_path: &str, content: &str) -> PacketPayload {
        real_write_request_with_hash(
            logical_path,
            content,
            &harness_proposal_hash(logical_path, content),
        )
    }

    fn real_write_request_with_hash(
        logical_path: &str,
        content: &str,
        proposal_hash: &str,
    ) -> PacketPayload {
        real_write_request_full(
            logical_path,
            content,
            &pi_loop_journal::sha256_hex(content.as_bytes()),
            proposal_hash,
        )
    }

    /// 两枚 hash 各自可独立指定——`contentSha256` 与 `proposalHash` 是**两枚不同的 hash**，
    /// 分开喂才能让「谁在挡」这件事有区分力。
    fn real_write_request_full(
        logical_path: &str,
        content: &str,
        content_sha256: &str,
        proposal_hash: &str,
    ) -> PacketPayload {
        PacketPayload::HostRequest(WorkspaceHostRequest {
            operation_id: OPERATION.to_string(),
            proposal_hash: proposal_hash.to_string(),
            capability: WorkspaceCapability::WorkspaceWrite,
            arguments: WorkspaceRequestArguments::Write(WorkspaceWriteArguments {
                logical_path: logical_path.to_string(),
                content: content.to_string(),
                content_sha256: content_sha256.to_string(),
                byte_length: content.len() as u64,
            }),
        })
    }

    fn real_write_leg(logical_path: &str, content: &str) -> VecDeque<Scripted> {
        real_write_leg_with(real_write_request_packet(logical_path, content))
    }

    fn real_write_leg_with(request: PacketPayload) -> VecDeque<Scripted> {
        VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(3, Some("req-1"), request),
            tool_finished_line(4),
            completed_line(5),
        ])
    }

    /// 逐次授权的脚本 driver。`decide` 恰跑在两次在场判定**之间**，故 `before` 是臂上真实的
    /// 「授权后、effect 前」窗口——不是模拟的时序。
    struct ScriptedDecision {
        approve: bool,
        before: Option<Box<dyn FnMut()>>,
    }

    impl WriteDecisionDriver for ScriptedDecision {
        fn decide(
            &mut self,
            _plan: &WorkspaceWritePlan,
            _action: WriteDisposition,
        ) -> WriteAuthorization {
            if let Some(hook) = self.before.as_mut() {
                hook();
            }
            if self.approve {
                WriteAuthorization::Approved
            } else {
                WriteAuthorization::Denied(AuthorizationDenyCode::UserDenied)
            }
        }
    }

    fn real_armed_host(
        h: &Harness,
        legs: Vec<VecDeque<Scripted>>,
        decision: Option<ScriptedDecision>,
    ) -> (PiLoopHost, Arc<Mutex<LegLog>>) {
        let (host, log, _) =
            start_probe(h, h.config.clone(), legs, ExitOutcome::Code(0), &FixedKey);
        let mut host = host.expect("启动");
        // 构造点装的就是真件；这里只在需要时补一枚 decision driver（⑤ 的真 driver 落点）。
        if let Some(decision) = decision {
            host.install_write_host(Some(Box::new(
                crate::pi_loop_workspace::WorkspaceFsHost::new(
                    &h.app_data,
                    &h.config.container_id,
                    &h.config.session_id,
                )
                .with_decision_driver(Box::new(decision)),
            )));
        }
        (host, log)
    }

    fn workspace_root(h: &Harness) -> PathBuf {
        h.app_data
            .join(crate::pi_loop_workspace::PI_WORKSPACES_DIR)
            .join(&h.config.container_id)
            .join(&h.config.session_id)
    }

    /// 端到端：四段账 ＋ **真字节**落进 `app_data_dir()/pi-workspaces/<c>/<s>/`，
    /// 出站 `host_result` 与盘上事实逐值同一结论，正文一个字节都不进 journal。
    /// ── 读臂（`PI-WORKSPACE-READ-1`）──
    ///
    /// 一枚读请求。`proposal_hash` 由**本测试独立重算**——不调生产那一枚函数，
    /// 否则「本侧重算」这条判据就是被测代码自证。
    fn read_request_packet(
        operation_id: &str,
        operation: WorkspaceOperation,
        logical_path: &str,
    ) -> PacketPayload {
        let mut bytes = Vec::new();
        for field in [
            "courtwork.pi.workspace_read.v1",
            "sess-1",
            "req-1",
            operation_id,
            operation.as_str(),
            logical_path,
        ] {
            bytes.extend_from_slice(&(field.len() as u32).to_be_bytes());
            bytes.extend_from_slice(field.as_bytes());
        }
        PacketPayload::HostRequest(WorkspaceHostRequest {
            operation_id: operation_id.to_string(),
            proposal_hash: pi_loop_journal::sha256_hex(&bytes),
            capability: WorkspaceCapability::WorkspaceRead,
            arguments: WorkspaceRequestArguments::Read(
                crate::pi_loop_protocol::WorkspaceReadArguments {
                    operation,
                    logical_path: logical_path.to_string(),
                },
            ),
        })
    }

    fn read_request_packet_for(
        request_id: &str,
        operation_id: &str,
        operation: WorkspaceOperation,
        logical_path: &str,
    ) -> PacketPayload {
        let mut bytes = Vec::new();
        for field in [
            "courtwork.pi.workspace_read.v1",
            "sess-1",
            request_id,
            operation_id,
            operation.as_str(),
            logical_path,
        ] {
            bytes.extend_from_slice(&(field.len() as u32).to_be_bytes());
            bytes.extend_from_slice(field.as_bytes());
        }
        PacketPayload::HostRequest(WorkspaceHostRequest {
            operation_id: operation_id.to_string(),
            proposal_hash: pi_loop_journal::sha256_hex(&bytes),
            capability: WorkspaceCapability::WorkspaceRead,
            arguments: WorkspaceRequestArguments::Read(
                crate::pi_loop_protocol::WorkspaceReadArguments {
                    operation,
                    logical_path: logical_path.to_string(),
                },
            ),
        })
    }

    fn host_results(log: &Arc<Mutex<LegLog>>) -> Vec<HostResultPayload> {
        log.lock()
            .expect("日志未中毒")
            .written
            .iter()
            .filter_map(|line| match decode_host_packet_for_test(line)?.payload {
                PacketPayload::HostResult(payload) => Some(payload),
                _ => None,
            })
            .collect()
    }

    /// 票面闭环的 Rust 那一半：write → 批准 → 真落盘 → **同 leg 内**逐字节回读。
    ///
    /// 三件同时钉住：回读的 content/hash/byteLength 与写入那一枚逐值相同；读**不落一笔账**
    /// （记录序与纯写那一枚逐型相同）；物理根不进 host_result 也不进 journal。
    #[test]
    fn real_read_arm_returns_the_bytes_the_write_arm_landed() {
        let h = harness("real-readback");
        let content = "# 纪要\n真件落盘\n第二行\n";
        let leg = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(
                3,
                Some("req-1"),
                real_write_request_packet("notes/会议纪要.md", content),
            ),
            tool_finished_line(4),
            tool_started_line(5),
            sidecar_line(
                6,
                Some("req-1"),
                read_request_packet("op-read-1", WorkspaceOperation::ReadFile, "notes/会议纪要.md"),
            ),
            tool_finished_line(7),
            completed_line(8),
        ]);
        let (mut host, log) = real_armed_host(
            &h,
            vec![leg],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        let terminal = host.prompt("req-1", "写完再回读").expect("闭环必须走得通");
        assert!(matches!(terminal, Terminal::Completed { .. }));

        let results = host_results(&log);
        assert_eq!(results.len(), 2, "写一枚、读一枚，各恰一次");
        assert_eq!(
            results[1].outcome,
            HostResultOutcome::Ok(HostResultValue::ReadFile {
                logical_path: "notes/会议纪要.md".to_string(),
                content: content.to_string(),
                content_sha256: pi_loop_journal::sha256_hex(content.as_bytes()),
                byte_length: content.len() as u64,
            }),
            "回读必须逐字节等于写入那一份",
        );

        // 读**零落账**：记录序与纯写那一枚逐型相同，一笔都不多。
        assert_eq!(
            record_types(host.records()),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectSucceeded,
                JournalType::AgentEvent,
                JournalType::AgentEvent,
                JournalType::AgentEvent,
                JournalType::PromptCompleted,
            ],
        );
        let text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(!text.contains("真件落盘"), "回读的正文同样不得落进 journal");
        assert!(
            !text.contains(&h.app_data.to_string_lossy().to_string()),
            "物理根不得进 journal"
        );
    }

    /// 一枚 tool call **可以**服务多枚读 operation（写是「一 tc 一 op」，读不是）。
    ///
    /// 这正是读臂只 peek 不 take `active_tool_call` 的判据：照写臂认领即消费，
    /// 第二枚读请求会当场无主，而一次 `glob` 恰恰要逐层 `list`。
    #[test]
    fn read_arm_serves_many_operations_under_one_tool_call() {
        let h = harness("read-multi-op");
        let content = "正文\n";
        let leg = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(
                3,
                Some("req-1"),
                real_write_request_packet("子目录/稿.md", content),
            ),
            tool_finished_line(4),
            tool_started_line(5),
            // 同一枚 tool call 里连发三枚读：list 根、list 子目录、read_file。
            sidecar_line(
                6,
                Some("req-1"),
                read_request_packet("op-read-1", WorkspaceOperation::List, "."),
            ),
            sidecar_line(
                7,
                Some("req-1"),
                read_request_packet("op-read-2", WorkspaceOperation::List, "子目录"),
            ),
            sidecar_line(
                8,
                Some("req-1"),
                read_request_packet("op-read-3", WorkspaceOperation::Exists, "子目录/稿.md"),
            ),
            tool_finished_line(9),
            completed_line(10),
        ]);
        let (mut host, log) = real_armed_host(
            &h,
            vec![leg],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        host.prompt("req-1", "写完逐层列").expect("多枚读必须都被服务");

        let results = host_results(&log);
        assert_eq!(results.len(), 4, "一写三读，四枚 host_result 一个不少");
        assert_eq!(
            results[1].outcome,
            HostResultOutcome::Ok(HostResultValue::List {
                logical_path: ".".to_string(),
                entries: vec![ListEntry {
                    name: "子目录".to_string(),
                    kind: crate::pi_loop_protocol::ListEntryKind::Directory,
                    byte_length: None,
                    mtime_ms: results_list_mtime(&results[1]),
                }],
            }),
        );
        assert_eq!(
            results[3].outcome,
            HostResultOutcome::Ok(HostResultValue::Exists {
                logical_path: "子目录/稿.md".to_string(),
                exists: true,
            }),
        );
    }

    /// `mtimeMs` 是真实文件时间，不能写死；只从被测结果里取出来做结构对照。
    fn results_list_mtime(payload: &HostResultPayload) -> Option<u64> {
        match &payload.outcome {
            HostResultOutcome::Ok(HostResultValue::List { entries, .. }) => {
                entries.first().and_then(|entry| entry.mtime_ms)
            }
            _ => None,
        }
    }

    /// 读的 `proposalHash` 由**本侧重算**：五枚被绑字段各改一枚，都必须当场不符。
    ///
    /// 决定性判据不是「回了 failed」，而是**读件一次都没被碰**——不符的请求从未成为一次读取。
    #[test]
    fn counterexample_read_proposal_hash_is_recomputed_and_binds_every_read_field() {
        // (label, 改后的请求)：operationId／operation／logicalPath 三枚直接换值；
        // sessionId／requestId 两枚由臂上下文固定，改它们等价于换一枚 hash，故以裸错 hash 代表。
        let cases: Vec<(&str, PacketPayload)> = vec![
            (
                "operationId 被换",
                match read_request_packet("op-read-1", WorkspaceOperation::List, ".") {
                    PacketPayload::HostRequest(mut request) => {
                        request.operation_id = "op-read-9".to_string();
                        PacketPayload::HostRequest(request)
                    }
                    other => other,
                },
            ),
            (
                "operation 被换",
                match read_request_packet("op-read-1", WorkspaceOperation::List, ".") {
                    PacketPayload::HostRequest(mut request) => {
                        request.arguments = WorkspaceRequestArguments::Read(
                            crate::pi_loop_protocol::WorkspaceReadArguments {
                                operation: WorkspaceOperation::Exists,
                                logical_path: ".".to_string(),
                            },
                        );
                        PacketPayload::HostRequest(request)
                    }
                    other => other,
                },
            ),
            (
                "logicalPath 被换",
                match read_request_packet("op-read-1", WorkspaceOperation::List, ".") {
                    PacketPayload::HostRequest(mut request) => {
                        request.arguments = WorkspaceRequestArguments::Read(
                            crate::pi_loop_protocol::WorkspaceReadArguments {
                                operation: WorkspaceOperation::List,
                                logical_path: "别处".to_string(),
                            },
                        );
                        PacketPayload::HostRequest(request)
                    }
                    other => other,
                },
            ),
            (
                "域串被换（写域冒充读域）",
                match read_request_packet("op-read-1", WorkspaceOperation::List, ".") {
                    PacketPayload::HostRequest(mut request) => {
                        request.proposal_hash = scripted_proposal_hash(".", "");
                        PacketPayload::HostRequest(request)
                    }
                    other => other,
                },
            ),
        ];

        for (label, request) in cases {
            let h = harness("read-hash");
            let leg = VecDeque::from(vec![
                ready(
                    1,
                    vec![
                        WorkspaceCapability::CaseRead,
                        WorkspaceCapability::WorkspaceRead,
                        WorkspaceCapability::WorkspaceWrite,
                    ],
                ),
                tool_started_line(2),
                sidecar_line(3, Some("req-1"), request),
                tool_finished_line(4),
                completed_line(5),
            ]);
            let (mut host, log) = real_armed_host(&h, vec![leg], None);
            host.prompt("req-1", "读一读").expect("hash 不符只收束这一枚，不炸 leg");
            let results = host_results(&log);
            assert_eq!(results.len(), 1, "{label}：恰一枚 host_result");
            assert!(
                matches!(
                    results[0].outcome,
                    HostResultOutcome::Failed {
                        code: HostFailureCode::HashMismatch,
                        ..
                    }
                ),
                "{label}：实得 {:?}",
                results[0].outcome,
            );
            // 决定性：workspace 根一个字节都没被建出来——不符的请求从未成为一次读取。
            assert!(
                !workspace_root(&h).exists(),
                "{label}：hash 不符不许触到文件系统"
            );
        }
    }

    /// 读面的失败文案与结果里没有物理坐标，且不跟随 symlink。
    #[test]
    fn read_arm_refuses_symlinks_and_never_leaks_physical_paths() {
        let h = harness("read-symlink");
        let content = "正文\n";
        let leg = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(3, Some("req-1"), real_write_request_packet("稿.md", content)),
            tool_finished_line(4),
            tool_started_line(5),
            sidecar_line(
                6,
                Some("req-1"),
                read_request_packet("op-read-1", WorkspaceOperation::ReadFile, "外链.md"),
            ),
            tool_finished_line(7),
            completed_line(8),
        ]);
        let (mut host, log) = real_armed_host(
            &h,
            vec![leg],
            Some(ScriptedDecision {
                approve: true,
                // 授权窗口里把一枚 symlink 放进 workspace 根：读到它必须拒，不跟随。
                before: Some(Box::new({
                    let root = workspace_root(&h);
                    move || {
                        if root.exists() && !root.join("外链.md").exists() {
                            let _ = std::os::unix::fs::symlink("/etc/hosts", root.join("外链.md"));
                        }
                    }
                })),
            }),
        );
        host.prompt("req-1", "读一读外链").expect("拒绝只收束这一枚");

        let results = host_results(&log);
        let last = results.last().expect("必有结果");
        let physical = h.app_data.to_string_lossy().to_string();
        match &last.outcome {
            HostResultOutcome::Failed { code, message } => {
                assert!(
                    matches!(
                        code,
                        HostFailureCode::SymlinkForbidden | HostFailureCode::NotFound
                    ),
                    "实得 {code:?}",
                );
                assert!(!message.contains(&physical), "错误文案不得含物理根");
                assert!(!message.contains("/etc/hosts"), "错误文案不得含链接目标");
            }
            other => panic!("symlink 必须拒，实得 {other:?}"),
        }
    }

    /// 票面判据三：`session_interrupted → session_resumed` 之后，**新 sidecar leg** 仍能
    /// 回读旧 leg 写下的文件。
    ///
    /// workspace 的延续性不靠任何续传机制，而是 `pi-workspaces/<containerId>/<sessionId>/`
    /// 这一枚物理坐标只由 container/session 决定、与 leg 无关。故这一条要证的恰是：
    /// 换了 leg（新进程、pi messages 从空开始）之后，同一 logical session 的读仍落回同一棵树。
    #[test]
    fn a_new_leg_after_interruption_reads_back_what_the_previous_leg_wrote() {
        let h = harness("read-resume");
        let content = "# 跨腿\n第一腿写下的\n";
        let first = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line(2),
            sidecar_line(
                3,
                Some("req-1"),
                real_write_request_packet("notes/跨腿.md", content),
            ),
            tool_finished_line(4),
            completed_line(5),
        ]);
        let (mut host, _) = real_armed_host(
            &h,
            vec![first],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        host.prompt("req-1", "写一份").expect("第一腿必须写成");
        // 第一腿以中断收场：journal 落 `session_interrupted`，workspace 留在盘上。
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收第一腿");
        drop(host);

        // 第二腿：新进程、新 leg，只读回上一腿写下的那份字节。
        let second = VecDeque::from(vec![
            ready(
                1,
                vec![
                    WorkspaceCapability::CaseRead,
                    WorkspaceCapability::WorkspaceRead,
                    WorkspaceCapability::WorkspaceWrite,
                ],
            ),
            tool_started_line_for(2, "req-2"),
            sidecar_line(
                3,
                Some("req-2"),
                read_request_packet_for(
                    "req-2",
                    "op-read-1",
                    WorkspaceOperation::ReadFile,
                    "notes/跨腿.md",
                ),
            ),
            tool_finished_line_for(4, "req-2"),
            completed_line_for(5, "req-2"),
        ]);
        let (mut resumed, log) = real_armed_host(&h, vec![second], None);
        // requestId 在同一 logical session 内不可复用，故第二腿换一枚。
        resumed.prompt("req-2", "回读上一腿写的").expect("第二腿必须读得到");

        let results = host_results(&log);
        assert_eq!(results.len(), 1, "第二腿恰一枚读结果");
        assert_eq!(
            results[0].outcome,
            HostResultOutcome::Ok(HostResultValue::ReadFile {
                logical_path: "notes/跨腿.md".to_string(),
                content: content.to_string(),
                content_sha256: pi_loop_journal::sha256_hex(content.as_bytes()),
                byte_length: content.len() as u64,
            }),
            "新 leg 必须逐字节读回旧 leg 写下的内容",
        );
        // 对照：leg 确实换了（journal 里有中断与续起的痕迹），不是同一腿接着跑。
        let types = record_types(resumed.records());
        assert!(
            types.contains(&JournalType::SessionInterrupted)
                && types.contains(&JournalType::SessionResumed),
            "前置：必须真的经过 interrupted → resumed，实得 {types:?}"
        );
    }

    #[test]
    fn real_write_host_lands_bytes_and_settles_the_four_stage_ledger() {
        let h = harness("real-write");
        let content = "# 纪要\n真件落盘\n";
        let (mut host, log) = real_armed_host(
            &h,
            vec![real_write_leg("notes/会议纪要.md", content)],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        let terminal = host.prompt("req-1", "写一份纪要").expect("真件必须走得通");
        assert!(matches!(terminal, Terminal::Completed { .. }));

        assert_eq!(
            record_types(host.records()),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectSucceeded,
                JournalType::AgentEvent,
                JournalType::PromptCompleted,
            ],
        );
        let target = workspace_root(&h).join("notes").join("会议纪要.md");
        assert_eq!(fs::read_to_string(&target).expect("回读真字节"), content);
        assert_eq!(
            last_host_result(&log)
                .expect("必须发出 host_result")
                .outcome,
            HostResultOutcome::Ok(HostResultValue::Write {
                logical_path: "notes/会议纪要.md".to_string(),
                disposition: WriteDisposition::Created,
                content_sha256: pi_loop_journal::sha256_hex(content.as_bytes()),
                byte_length: content.len() as u64,
            }),
        );
        // journal 只记逻辑路径 / hash / byteLength / outcome：正文与**物理根**都不许进去。
        let text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(!text.contains("真件落盘"), "正文不得落进 journal");
        assert!(
            !text.contains(crate::pi_loop_workspace::PI_WORKSPACES_DIR),
            "物理根不得落进 journal"
        );
        assert!(!text.contains(&h.app_data.to_string_lossy().into_owned()));
    }

    // ── PI-HEADLESS-HARNESS-1 组件B：headless 合成 harness ────────────────────
    //
    // 真 pi Agent（pi-ai faux / 可插拔 provider）↔ 真 stdio wire ↔ 真
    // `WorkspaceFsHost`(注入 `ScriptedApprove`) ↔ 真 disk，并可 restart/resume 新 leg。
    // **两注入点即 production 偏离**：provider（headless bundle 内，faux 不触网／真验收换
    // DeepSeek）与 decision driver（此处 `ScriptedDecision`，ADR-022 六-C 明令显式注入）。
    // 其余 wire/host/journal/disk/restart 全走 production 代码路径。
    //
    // 这不是新写 plumbing，而是把既有 plumbing 打包成可驱动的合成：spawn 复用
    // `ProcessSpawner`→`spawn_verified_sidecar`，pair 用 `for_lifecycle_test`（headless bundle
    // 不进任何冻结 manifest），host 复用 `real_write_host_lands_bytes` 那套真件与断言。
    // `PI-BASE-HEADLESS-ACCEPT` 由此驱动六格：改 faux 脚本／换真 DeepSeek provider（headless
    // 配置的 `provider` 字段）＋按格取 journal/bytes 证据，restart 沿 `reclaim_after_fault` 先例。

    /// 定位 headless 合成的两枚制品：冻结 Node runtime 与 headless bundle。缺件以指路信息
    /// 硬失败（承 `snapshot_e2e` 体例，绝不静默跳过——那会让「合成不成立」伪装成绿）。
    fn headless_artifacts() -> (PathBuf, PathBuf) {
        let repo = Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(3)
            .expect("仓库根")
            .to_path_buf();
        let triple = crate::pi_loop_process::host_target_triple().expect("本机 target 在闭集内");
        let node = repo.join(format!(
            "packages/pi-lane/dist/product-sidecar/pi-sidecar-{}",
            triple.as_str()
        ));
        let bundle = repo.join("packages/pi-lane/dist/headless-sidecar/headless-sidecar.cjs");
        assert!(
            node.exists(),
            "缺冻结 Node {}——先跑 build:product-sidecar",
            node.display()
        );
        assert!(
            bundle.exists(),
            "缺 headless bundle {}——先跑 build:headless-sidecar",
            bundle.display()
        );
        (node, bundle)
    }

    /// 把 faux headless 配置写进 sidecar 的 cwd（`app_data/pi-loop-runtime`）。宿主
    /// `env_clear()`＋固定 argv 拉起 sidecar，faux 脚本只能走 cwd 文件——这是 faux 注入点的
    /// 落地形，wire/host/journal 一字未借。真验收改 `provider:"deepseek"` 即走真模型。
    fn write_headless_faux_config(app_data: &Path, script: serde_json::Value) {
        let cwd = app_data.join(crate::pi_loop_process::RUNTIME_CWD_DIR);
        fs::create_dir_all(&cwd).expect("建 runtime cwd");
        let config = serde_json::json!({ "provider": "faux", "script": script });
        fs::write(
            cwd.join("headless-config.json"),
            serde_json::to_vec(&config).expect("序列化 headless 配置"),
        )
        .expect("写 headless 配置");
    }

    /// headless leg 的组合根：真 headless sidecar ＋ 注入 `ScriptedApprove` 的真
    /// `WorkspaceFsHost`。`approve:false` 时用于验收面（逐次授权拒绝）；smoke 走 `true`。
    fn start_headless_leg(h: &Harness, node: &Path, bundle: &Path, approve: bool) -> PiLoopHost {
        let pair = VerifiedRoutePair::for_lifecycle_test(node.to_path_buf(), bundle.to_path_buf());
        let mut host = PiLoopHost::start_with_pair(
            &h.app_data,
            pair,
            h.config.clone(),
            &FixedKey,
            &mut ProcessSpawner,
        )
        .expect("headless leg 起得来");
        // 构造点已装 driver-less 真件；这里补上显式 decision driver（ADR-022 六-C 落点），
        // 读件座保持不动（读无 effect、无可授权对象）。
        host.install_write_host(Some(Box::new(
            crate::pi_loop_workspace::WorkspaceFsHost::new(
                &h.app_data,
                &h.config.container_id,
                &h.config.session_id,
            )
            .with_decision_driver(Box::new(ScriptedDecision {
                approve,
                before: None,
            })),
        )));
        host
    }

    /// 组件B 冒烟：**一** write→approve→byte-identical-read-back ＋ **一** restart→read-back，
    /// 全链真跑（真 Agent／真 wire／真 host／真 disk）。六格总验属 `PI-BASE-HEADLESS-ACCEPT`。
    #[test]
    fn headless_smoke_write_approve_readback_then_restart_readback() {
        let (node, bundle) = headless_artifacts();
        let h = harness("headless-smoke");
        fs::write(
            h.case_root.join("备忘.md"),
            "# 备忘\n合同编号 HT-2024-081\n",
        )
        .expect("写案件材料");
        let content = "# 简报\n合同编号 HT-2024-081（源自 /case/备忘.md）。\n";

        // ── leg 1：真 Agent read /case → write /workspace → 逐次授权（ScriptedApprove）→ 落盘 ──
        //
        // byte-identical read-back 由 harness 从盘上回读核验（下方 `fs::read_to_string == content`）。
        // **不**让 Agent 读 /workspace 回读：那条路今日被 §移交 的 active_tool_call 缺口挡住
        // （workspace_read host op 恒 StateViolation），已由
        // `headless_workspace_readback_currently_stateviolations__blocker` 机器钉住。
        write_headless_faux_config(
            &h.app_data,
            serde_json::json!([
                { "kind": "tool", "name": "read", "args": { "path": "/case/备忘.md" } },
                { "kind": "tool", "name": "write", "args": { "path": "简报.md", "content": content } },
                { "kind": "text", "text": "已写入 /workspace/简报.md。" },
            ]),
        );
        let mut host = start_headless_leg(&h, &node, &bundle, true);
        assert_eq!(host.capabilities(), EXPECTED_CAPABILITIES);
        let terminal = host
            .prompt(
                "req-1",
                "把 /case/备忘.md 的合同编号写成 /workspace/简报.md",
            )
            .expect("leg1 prompt 必须走得通");
        assert!(
            matches!(terminal, Terminal::Completed { .. }),
            "leg1 必须 Completed，实得 {terminal:?}"
        );

        // byte-identical：写进去的字节原样落在 app-data 的 workspace 根上。
        let target = workspace_root(&h).join("简报.md");
        assert_eq!(
            fs::read_to_string(&target).expect("回读盘上真字节"),
            content,
            "write 必须逐字节落盘"
        );
        // 四段账齐备（tool_proposed → authorization_decided → effect_started → effect_succeeded）。
        let leg1_types = record_types(host.records());
        for want in [
            JournalType::ToolProposed,
            JournalType::AuthorizationDecided,
            JournalType::EffectStarted,
            JournalType::EffectSucceeded,
        ] {
            assert!(
                leg1_types.contains(&want),
                "leg1 缺 {want:?}：{leg1_types:?}"
            );
        }
        // 正文与物理根都不进 journal。
        let jtext =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(
            !jtext.contains("源自 /case/备忘.md"),
            "正文不得落进 journal"
        );
        assert!(
            !jtext.contains(crate::pi_loop_workspace::PI_WORKSPACES_DIR),
            "物理根不得落进 journal"
        );

        // 第一腿以中断收场，workspace 留在盘上。
        host.reclaim_after_fault(SessionInterruptReason::SidecarEnded)
            .expect("回收 leg1");
        drop(host);

        // ── restart：新 sidecar leg（新进程、新 leg）上真 Agent 再跑一轮 ──
        // leg2 的 Agent 读 /case（直读，不经 host op）并收尾；写下的 /workspace 字节由 harness
        // 从盘上核验仍在（跨 restart 持久）。同样避开被缺口挡住的 /workspace agent 回读。
        write_headless_faux_config(
            &h.app_data,
            serde_json::json!([
                { "kind": "tool", "name": "read", "args": { "path": "/case/备忘.md" } },
                { "kind": "text", "text": "已在新 leg 上继续。" },
            ]),
        );
        let mut resumed = start_headless_leg(&h, &node, &bundle, true);
        let terminal2 = resumed
            .prompt("req-2", "在新 leg 上确认在跑")
            .expect("leg2 prompt 必须走得通");
        assert!(
            matches!(terminal2, Terminal::Completed { .. }),
            "leg2 必须 Completed，实得 {terminal2:?}"
        );
        // 跨 restart 字节仍在：harness 从盘上逐字节回读（byte-identical read-back）。
        assert_eq!(
            fs::read_to_string(&target).expect("restart 后回读"),
            content,
            "restart 后字节必须仍逐字节一致"
        );
        // 真的经过 interrupted → resumed，不是同一腿接着跑。
        let leg2_types = record_types(resumed.records());
        assert!(
            leg2_types.contains(&JournalType::SessionInterrupted)
                && leg2_types.contains(&JournalType::SessionResumed),
            "必须真经过 interrupted → resumed：{leg2_types:?}"
        );
        // Gate D（组件A）在真 resume 上兑现：session_resumed 记实收身份。
        let jtext2 =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(jtext2.contains(r#""type":"session_resumed""#));
        assert!(
            jtext2.contains(r#""promptId":"md-work-v1""#),
            "session_resumed 必须记 resumed leg 的实收 promptId（Gate D）"
        );
        resumed.shutdown().ok();
    }

    /// **移交 `PI-BASE-HEADLESS-ACCEPT` 的 [需架构拍板] 阻断项，机器钉住。**
    ///
    /// 真 Agent 经 read/glob/grep 工具读 **/workspace**（一枚 `workspace_read` host op）今日恒
    /// `StateViolation`：`active_tool_call` 只在 `ToolStarted{tool_name: Write}` 落一枚
    /// （本文件 `pump` 里 `ProductToolName::Write` 那一臂），读工具的 `tool_started` 不落它，
    /// 于是 `serve_read_request` 的「读须归属一枚在场 tool call」判据当场翻 StateViolation。
    /// PI-WORKSPACE-READ-1 的 Rust 门全部以 **Write** tool_started 假冒
    /// （`tool_started_line_for` → `ProductToolName::Write`），故此缺口从未被既有门照到——
    /// 本 harness 首次以**真** read 工具触到它（判例：既有测试只桩住 seam 一侧）。
    ///
    /// 它挡住 HEADLESS-ACCEPT 六格里凡涉 /workspace agent 回读的三格（3/4/5）。修法属核状态机
    /// 语义（active_tool_call 由 write-only 扩到「凡能发 host op 的工具」，write 取、read peek），
    /// 超出本票 Gate D＋harness 的授权面，故**上浮不自修**。
    ///
    /// 本测试断言**当前坏态**：一旦转绿（读回读走通），即缺口已修——须删本测试并在
    /// 六格里放开 /workspace agent 回读。
    #[test]
    fn headless_workspace_readback_currently_stateviolations_blocker() {
        let (node, bundle) = headless_artifacts();
        let h = harness("headless-readback-blocker");
        fs::write(h.case_root.join("备忘.md"), "x\n").expect("案件材料");
        write_headless_faux_config(
            &h.app_data,
            serde_json::json!([
                { "kind": "tool", "name": "write", "args": { "path": "稿.md", "content": "y\n" } },
                { "kind": "tool", "name": "read", "args": { "path": "/workspace/稿.md" } },
                { "kind": "text", "text": "读回" },
            ]),
        );
        let mut host = start_headless_leg(&h, &node, &bundle, true);
        let outcome = host.prompt("req-1", "写后经 read 工具回读 /workspace");
        assert!(
            matches!(
                outcome,
                Err(HostError::Protocol(ProtocolErrorCode::StateViolation))
            ),
            "钉住当前坏态：真 read 工具读 /workspace 应 StateViolation（缺口未修），实得 {outcome:?}。\
             转绿＝缺口已修，删本测试并放开六格 /workspace 回读"
        );
        // 缺口在读之前：写已落盘，回读那一步才被挡（effect 与 read op 分属两段）。
        assert_eq!(
            fs::read_to_string(workspace_root(&h).join("稿.md")).expect("写已落盘"),
            "y\n"
        );
    }

    /// 票面：**畸形 request 到 Rust ⇒ 同 code 拒绝且零 effect**（ADR-022 六-B.2）。
    ///
    /// 从未成为提案的请求在第 1 步就收束：`tool_proposed`/`effect_started` 一枚都不落，
    /// workspace 物理根**根本不存在**——`probe` 是纯读，这一层因此是盘上读数。
    #[test]
    fn counterexample_malformed_requests_are_refused_with_zero_effect() {
        let cases = [
            ("纪要.txt", HostFailureCode::UnsupportedFileType),
            (".md", HostFailureCode::UnsupportedFileType),
            ("/绝对.md", HostFailureCode::InvalidPath),
            ("../越界.md", HostFailureCode::InvalidPath),
            ("a\\b.md", HostFailureCode::InvalidPath),
        ];
        for (logical, expected) in cases {
            let h = harness("real-malformed");
            let (mut host, log) = real_armed_host(
                &h,
                vec![real_write_leg(logical, "正文")],
                Some(ScriptedDecision {
                    approve: true,
                    before: None,
                }),
            );
            host.prompt("req-1", "写一份纪要").unwrap_or_else(|error| {
                panic!("{logical}：防御门拒绝不是协议失败，实得 {error:?}")
            });

            let types = record_types(host.records());
            assert!(
                !types.contains(&JournalType::ToolProposed)
                    && !types.contains(&JournalType::EffectStarted),
                "{logical}：从未成为提案的请求不得落 tool_proposed / effect_started，实得 {types:?}"
            );
            assert!(
                types.contains(&JournalType::EffectFailed),
                "{logical}：拒绝必须显式落账，实得 {types:?}"
            );
            assert_eq!(
                last_host_result(&log)
                    .expect("必须发出 host_result")
                    .outcome,
                HostResultOutcome::Failed {
                    code: expected,
                    message: expected.message().to_string(),
                },
                "{logical}：拒绝理由必须恰是 {expected:?}"
            );
            assert!(
                !h.app_data
                    .join(crate::pi_loop_workspace::PI_WORKSPACES_DIR)
                    .exists(),
                "{logical}：被拒的一轮不得留下任何物理痕迹"
            );
        }
    }

    // ── ⑥ 拍板C：`proposalHash` 由 Rust 重算（ADR-022 六-B.2）────────────────────

    /// 篡改被绑定的**任一**字段 ⇒ `hash_mismatch` 且零 effect。
    ///
    /// 构造法：wire 上的每一枚字段都留**真值**，只把 `proposalHash` 算在一枚**被篡改过**的
    /// 字段上。于是唯一不符的就是这一枚 hash——别的门一概轮不到，红来自它自己。
    /// 七枚 frame（domain ＋ 六字段）逐枚各一例：任何一枚不进 hash，对应那一行当场绿。
    #[test]
    fn counterexample_proposal_hash_is_recomputed_and_binds_every_bound_field() {
        const DOMAIN: &str = "courtwork.pi.workspace_write.v1";
        let content = "正文";
        let logical = "纪要.md";
        let content_sha = pi_loop_journal::sha256_hex(content.as_bytes());
        let truth = (
            DOMAIN,
            "sess-1",
            "req-1",
            OPERATION,
            logical,
            content.len() as u64,
            content_sha.as_str(),
        );

        let tampered: [(&str, String); 7] = [
            (
                "domain",
                expected_proposal_hash(
                    "courtwork.pi.workspace_write.v2",
                    truth.1,
                    truth.2,
                    truth.3,
                    truth.4,
                    truth.5,
                    truth.6,
                ),
            ),
            (
                "sessionId",
                expected_proposal_hash(
                    truth.0, "sess-2", truth.2, truth.3, truth.4, truth.5, truth.6,
                ),
            ),
            (
                "requestId",
                expected_proposal_hash(
                    truth.0, truth.1, "req-2", truth.3, truth.4, truth.5, truth.6,
                ),
            ),
            (
                "operationId",
                expected_proposal_hash(
                    truth.0, truth.1, truth.2, "op_1_2", truth.4, truth.5, truth.6,
                ),
            ),
            (
                "logicalPath",
                expected_proposal_hash(
                    truth.0,
                    truth.1,
                    truth.2,
                    truth.3,
                    "别的.md",
                    truth.5,
                    truth.6,
                ),
            ),
            (
                "byteLength",
                expected_proposal_hash(
                    truth.0,
                    truth.1,
                    truth.2,
                    truth.3,
                    truth.4,
                    truth.5 + 1,
                    truth.6,
                ),
            ),
            (
                "contentSha256",
                expected_proposal_hash(
                    truth.0,
                    truth.1,
                    truth.2,
                    truth.3,
                    truth.4,
                    truth.5,
                    &pi_loop_journal::sha256_hex("别的正文".as_bytes()),
                ),
            ),
        ];

        let honest = harness_proposal_hash(logical, content);
        for (field, hash) in tampered {
            assert_ne!(hash, honest, "{field}：变异靶必须真的换出另一枚 hash");
            let h = harness("proposal-hash");
            let (mut host, log) = real_armed_host(
                &h,
                vec![real_write_leg_with(real_write_request_with_hash(
                    logical, content, &hash,
                ))],
                Some(ScriptedDecision {
                    approve: true,
                    before: None,
                }),
            );
            host.prompt("req-1", "写一份纪要")
                .unwrap_or_else(|error| panic!("{field}：hash 不符不是协议失败，实得 {error:?}"));

            assert_eq!(
                last_host_result(&log)
                    .expect("必须发出 host_result")
                    .outcome,
                HostResultOutcome::Failed {
                    code: HostFailureCode::HashMismatch,
                    message: HostFailureCode::HashMismatch.message().to_string(),
                },
                "{field}：拒绝理由必须恰是 hash_mismatch"
            );
            let types = record_types(host.records());
            assert!(
                !types.contains(&JournalType::ToolProposed)
                    && !types.contains(&JournalType::EffectStarted),
                "{field}：hash 不符的请求从未成为提案，实得 {types:?}"
            );
            assert!(
                !h.app_data
                    .join(crate::pi_loop_workspace::PI_WORKSPACES_DIR)
                    .exists(),
                "{field}：被拒的一轮不得留下任何物理痕迹"
            );
        }
    }

    /// 两枚 hash 不互相顶名：`proposalHash` 挡在提案**之前**，内容 hash 挡在授权**之后**。
    ///
    /// 语料是同一形失配（正文与自报 `contentSha256` 不符），差别只在 `proposalHash` 算在
    /// 哪一边：算在自报值上就过得了提案门、被④ 的内容 hash 拦在 effect 前，账上因此有完整
    /// 四段前三段；算在真值上则连提案都不是。两条路 code 同为 `hash_mismatch`，**账本形态不同**
    /// ——这正是「不顶名」的可观测判据。
    #[test]
    fn proposal_hash_and_content_hash_are_two_different_gates() {
        let content = "正文";
        let logical = "纪要.md";
        let lying_sha = pi_loop_journal::sha256_hex("并不是这段正文".as_bytes());

        // A：proposalHash 算在**自报的** contentSha256 上 ⇒ 提案门放行，内容 hash 拦下。
        let consistent = expected_proposal_hash(
            "courtwork.pi.workspace_write.v1",
            "sess-1",
            "req-1",
            OPERATION,
            logical,
            content.len() as u64,
            &lying_sha,
        );
        let h = harness("two-hashes-a");
        let (mut host, log) = real_armed_host(
            &h,
            vec![real_write_leg_with(real_write_request_full(
                logical,
                content,
                &lying_sha,
                &consistent,
            ))],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        host.prompt("req-1", "写一份纪要").expect("不是协议失败");
        assert_eq!(
            record_types(host.records()),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectFailed,
                JournalType::AgentEvent,
                JournalType::PromptCompleted,
            ],
            "内容 hash 那一道在授权与 effect 之后，前三段账必须都在"
        );
        assert_eq!(
            last_host_result(&log).expect("有出包").outcome,
            HostResultOutcome::Failed {
                code: HostFailureCode::HashMismatch,
                message: HostFailureCode::HashMismatch.message().to_string(),
            },
        );

        // B：同一份语料，proposalHash 算在**正文真值**上 ⇒ 连提案都不是。
        let h = harness("two-hashes-b");
        let (mut host, _log) = real_armed_host(
            &h,
            vec![real_write_leg_with(real_write_request_full(
                logical,
                content,
                &lying_sha,
                &harness_proposal_hash(logical, content),
            ))],
            Some(ScriptedDecision {
                approve: true,
                before: None,
            }),
        );
        host.prompt("req-1", "写一份纪要").expect("不是协议失败");
        assert_eq!(
            record_types(host.records()),
            vec![
                JournalType::SessionStarted,
                JournalType::UserPrompted,
                JournalType::AgentEvent,
                JournalType::EffectFailed,
                JournalType::AgentEvent,
                JournalType::PromptCompleted,
            ],
            "proposalHash 那一道排在提案之前，四段账一段都不该有"
        );
    }

    /// production 形态：真件在场、能力谈成，但**没有 decision driver** ⇒ `policy_denied`。
    /// 授权二段落账、effect 恰零次、workspace 物理根不存在。
    #[test]
    fn real_write_host_without_a_decision_driver_denies_and_writes_nothing() {
        let h = harness("real-nodriver");
        let (mut host, log) = real_armed_host(&h, vec![real_write_leg("纪要.md", "正文")], None);
        // ⑤ 复核点：能力**已经谈成**，0.1 门因此不再是挡板；挡住这一轮的恰是逐次授权那一道。
        // 两件事不能互相顶名——若此处的能力反而没谈成，下面的 denied 就成了「门 A 的绿冒充门 B」。
        assert!(
            host.capabilities()
                .contains(&WorkspaceCapability::WorkspaceWrite),
            "本例必须跑在能力已谈成的路径上，实得 {:?}",
            host.capabilities()
        );
        host.prompt("req-1", "写一份纪要")
            .expect("拒绝不是协议失败");

        let types = record_types(host.records());
        assert!(types.contains(&JournalType::ToolProposed));
        assert!(
            !types.contains(&JournalType::EffectStarted),
            "未获授权就不许落 effect_started，实得 {types:?}"
        );
        assert_eq!(
            last_host_result(&log)
                .expect("必须发出 host_result")
                .outcome,
            HostResultOutcome::Denied {
                code: HostDeniedCode::PolicyDenied,
                message: HostDeniedCode::PolicyDenied.message().to_string(),
            },
        );
        assert!(!h
            .app_data
            .join(crate::pi_loop_workspace::PI_WORKSPACES_DIR)
            .exists());
    }

    /// swap race 在**臂**上的收口：授权与 effect 之间父段被换成指向外部的 symlink。
    /// 第 4 步的二次在场判定必须以 `symlink_forbidden` 现形——不是被压成笼统的
    /// `state_changed`，也不是照写不误。
    #[test]
    fn counterexample_segment_swapped_between_authorization_and_effect_refuses_with_zero_write() {
        let h = harness("real-swap");
        let outside = h.app_data.parent().expect("父").join("outside");
        fs::create_dir_all(&outside).expect("建外部目录");
        let notes = workspace_root(&h).join("notes");
        fs::create_dir_all(&notes).expect("预建父段");

        let swap_at = notes.clone();
        let outside_for_hook = outside.clone();
        let (mut host, log) = real_armed_host(
            &h,
            vec![real_write_leg("notes/纪要.md", "机密正文")],
            Some(ScriptedDecision {
                approve: true,
                before: Some(Box::new(move || {
                    fs::remove_dir(&swap_at).expect("移走真目录");
                    std::os::unix::fs::symlink(&outside_for_hook, &swap_at).expect("换成链接");
                })),
            }),
        );
        host.prompt("req-1", "写一份纪要")
            .expect("拒绝不是协议失败");

        let types = record_types(host.records());
        assert!(
            !types.contains(&JournalType::EffectStarted),
            "零写的形态不得留下 effect_started，实得 {types:?}"
        );
        assert_eq!(
            last_host_result(&log)
                .expect("必须发出 host_result")
                .outcome,
            HostResultOutcome::Failed {
                code: HostFailureCode::SymlinkForbidden,
                message: HostFailureCode::SymlinkForbidden.message().to_string(),
            },
            "被换成链接的父段必须以 symlink_forbidden 现形"
        );
        let outside_entries: Vec<_> = fs::read_dir(&outside)
            .expect("列外部目录")
            .map(|entry| entry.expect("项").file_name())
            .collect();
        assert!(
            outside_entries.is_empty(),
            "一个字节都不许落到链接目标里，实得 {outside_entries:?}"
        );
    }

    /// 移交②（PI-WRITE-HOST-1 ②回执 §八.2）：list 结果**逐字段合法 ≠ 一定装得下**。
    /// `MAX_LIST_ENTRIES=2000` × `MAX_SEGMENT_BYTES=255` 越 `MAX_PACKET_BYTES=1 MiB`，
    /// 唯一出站入口必须以 `packet_too_large` **显式**拒，零静默截断。
    ///
    /// 两道补正让「红得准」立得住：
    /// 1. 拒绝理由必须恰是 `PacketTooLarge`——压成 `InvalidSchema` 说明红的是别的判据；
    /// 2. 正向对照取同族、同上限、只把条数降到装得下，解回来的条目数与名字长度逐值不变
    ///    ——静默截断在这一枚上会当场现形。
    #[test]
    fn counterexample_oversized_list_result_is_refused_by_framing_not_truncated() {
        let h = harness("list-framing");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![ready_leg()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let host = host.expect("启动");
        let path = journal_path(&h.app_data, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读 journal");
        let writes_before = log.lock().expect("日志未中毒").written.len();
        let seq_before = host.outbound_seq;

        // 逐字段全部踩在上限内：条数恰 2000、每枚名字恰 255 UTF-8 字节。
        // 取 U+0001 是本包 SPEC 九点名的 encoded-packet worst case——1 字节的字符编成
        // `\u0001` 六字符，raw cap 之内照样把 1 MiB framing 撞破。
        let oversized = list_ok_result(
            (0..MAX_LIST_ENTRIES)
                .map(|_| list_entry("\u{1}".repeat(MAX_SEGMENT_BYTES)))
                .collect(),
        );
        let error = host
            .encode_host_result("req-probe", oversized)
            .err()
            .unwrap_or_else(|| panic!("装不下就必须拒"));
        assert_eq!(
            error,
            HostError::Protocol(ProtocolErrorCode::PacketTooLarge),
            "拒绝理由必须恰是 framing 上限，实得 {error:?}"
        );
        assert_eq!(fs::read(&path).expect("读 journal"), before);
        assert_eq!(log.lock().expect("日志未中毒").written.len(), writes_before);
        assert_eq!(host.outbound_seq, seq_before);

        // 正向对照：同族、同字段上限，只把条数降到装得下——逐值原样回得来，零截断。
        let entries = 512;
        let line = host
            .encode_host_result(
                "req-probe",
                list_ok_result(
                    (0..entries)
                        .map(|_| list_entry("\u{1}".repeat(MAX_SEGMENT_BYTES)))
                        .collect(),
                ),
            )
            .expect("装得下就必须编得出");
        assert!(line.bytes.len() <= MAX_PACKET_BYTES);
        let packet = decode_host_packet_for_test(&line.bytes).expect("自家 decoder 必须收得下");
        let PacketPayload::HostResult(payload) = packet.payload else {
            panic!("出包必须是 host_result");
        };
        let HostResultOutcome::Ok(HostResultValue::List { entries: back, .. }) = payload.outcome
        else {
            panic!("出包必须是 list ok");
        };
        assert_eq!(back.len(), entries, "条目数不得被截断");
        assert!(
            back.iter()
                .all(|entry| entry.name.len() == MAX_SEGMENT_BYTES),
            "条目名不得被截断"
        );
    }

    // ── ⑥ 双端 golden：同一逻辑会话的两端字节谱 ────────────────────────────────
    //
    // 两枚 tracked fixture，**任一侧都不得生成后再验证自己**：
    //
    // - `write-session-wire-v1.jsonl` 的 sidecar→host 段由 Node 侧真跑产出，本侧独立复验
    //   （codec 双向唯一 ＋ `proposalHash` 本侧重算 ＋ 真件落盘）；host→sidecar 段由本侧
    //   产出，Node 侧消费。bootstrap 行**不入 golden**：它携带机器本地案件根与内存 key，
    //   两者都不许冻进 tracked 文件。
    // - `write-session-journal-v1.jsonl` 由本侧产出，Node 侧复验其中的跨端常量
    //   （`promptId`／`capabilities`／逻辑路径形态）。
    //
    // 跨端钉子恰在这里合拢：Node 侧的 `PRODUCT_PROMPT_ID`／`PRODUCT_CAPABILITIES`／
    // `WORKSPACE_WRITE_PROPOSAL_DOMAIN` 与本侧的 `CURRENT_PROMPT_ID`／
    // `EXPECTED_CAPABILITIES`／`WORKSPACE_WRITE_PROPOSAL_DOMAIN` 是同物的两份，
    // 任一侧单独漂移都会让对端的判据当场红。

    const WIRE_GOLDEN: &[u8] =
        include_bytes!("../../../../packages/pi-lane/fixtures/write-session-wire-v1.jsonl");
    const JOURNAL_GOLDEN: &[u8] =
        include_bytes!("../../../../packages/pi-lane/fixtures/write-session-journal-v1.jsonl");

    fn golden_lines(bytes: &[u8]) -> Vec<Vec<u8>> {
        let mut lines = Vec::new();
        let mut start = 0;
        for (index, byte) in bytes.iter().enumerate() {
            if *byte == b'\n' {
                lines.push(bytes[start..index].to_vec());
                start = index + 1;
            }
        }
        assert_eq!(
            start,
            bytes.len(),
            "golden 每行必须以 LF 结束，末行不得缺 LF"
        );
        assert!(!lines.is_empty(), "golden 不得为空");
        lines
    }

    /// golden 的会话身份。写死在此、不从 golden 反推——反推就等于让被测数据自证。
    const GOLDEN_SESSION: &str = "sess-1";
    const GOLDEN_REQUEST: &str = "req-1";
    const GOLDEN_PROMPT: &str = "写一份纪要";
    const GOLDEN_PATH: &str = "纪要.md";

    /// 分向：本侧**消费**的是 sidecar 方向解得开的那些行，**产出**的是 host 方向那些行。
    /// 「恰一个方向解得开」同批断言——两向都成或都不成都说明两侧不再看同一份契约。
    fn split_wire_golden() -> (Vec<Vec<u8>>, Vec<Vec<u8>>) {
        let mut inbound = Vec::new();
        let mut outbound = Vec::new();
        for line in golden_lines(WIRE_GOLDEN) {
            let as_sidecar = crate::pi_loop_protocol::decode_sidecar_packet_line(&line).is_ok();
            let as_host = decode_host_packet_for_test(&line).is_some();
            assert!(
                as_sidecar ^ as_host,
                "每行恰一个方向解得开：{}",
                String::from_utf8_lossy(&line)
            );
            if as_sidecar {
                inbound.push(line);
            } else {
                outbound.push(line);
            }
        }
        (inbound, outbound)
    }

    /// 端到端：把 golden 的 sidecar 段原样喂进臂，本侧产出的每一枚出包与 golden 的
    /// host 段**逐字节**相同，盘上真落字节与 golden 自报的 hash/长度逐值一致。
    #[test]
    fn dual_end_golden_wire_session_matches_on_the_host_side() {
        let (inbound, outbound) = split_wire_golden();
        assert_eq!(inbound.len(), 8, "sidecar→host 段行数");
        assert_eq!(
            outbound.len(),
            2,
            "host→sidecar 段行数（bootstrap 不入 golden）"
        );

        let h = harness("dual-golden");
        let (host, log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![inbound.iter().cloned().map(Scripted::Line).collect()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("golden 的 ready 必须能起");
        host.install_write_host(Some(Box::new(
            crate::pi_loop_workspace::WorkspaceFsHost::new(
                &h.app_data,
                &h.config.container_id,
                &h.config.session_id,
            )
            .with_decision_driver(Box::new(ScriptedDecision {
                approve: true,
                before: None,
            })),
        )));
        let terminal = host
            .prompt(GOLDEN_REQUEST, GOLDEN_PROMPT)
            .expect("golden 会话必须走得通");
        assert!(matches!(terminal, Terminal::Completed { .. }));

        // 本侧产出的出包：bootstrap（不入 golden）＋ prompt ＋ host_result。
        let written = log.lock().expect("日志未中毒").written.clone();
        assert_eq!(written.len(), 3, "出包数：bootstrap / prompt / host_result");
        assert!(
            String::from_utf8_lossy(&written[0]).contains("\"type\":\"bootstrap\""),
            "首枚出包是 bootstrap"
        );
        for (index, expected) in outbound.iter().enumerate() {
            let mut want = expected.clone();
            want.push(b'\n');
            assert_eq!(
                String::from_utf8_lossy(&written[index + 1]),
                String::from_utf8_lossy(&want),
                "本侧第 {} 枚出包必须与 golden 逐字节相同",
                index + 1
            );
        }

        // 盘上真字节：golden 自报的 contentSha256／byteLength 是对它的**独立**复算。
        let landed = fs::read(workspace_root(&h).join(GOLDEN_PATH)).expect("回读真字节");
        let request = inbound
            .iter()
            .find_map(|line| {
                match crate::pi_loop_protocol::decode_sidecar_packet_line(line)
                    .expect("golden 行合契约")
                    .payload
                {
                    PacketPayload::HostRequest(request) => Some(request),
                    _ => None,
                }
            })
            .expect("golden 必须含一枚 host_request");
        let WorkspaceRequestArguments::Write(arguments) = &request.arguments else {
            panic!("golden 的 host_request 必须是 write");
        };
        assert_eq!(
            pi_loop_journal::sha256_hex(&landed),
            arguments.content_sha256,
            "盘上字节的 hash 必须等于 golden 自报值"
        );
        assert_eq!(landed.len() as u64, arguments.byte_length);
        assert_eq!(arguments.logical_path, GOLDEN_PATH);

        // 跨端钉子：Node 侧算的 proposalHash 必须等于本侧按 ADR-022 六-B.2 独立重算的那一枚。
        assert_eq!(
            expected_proposal_hash(
                "courtwork.pi.workspace_write.v1",
                GOLDEN_SESSION,
                GOLDEN_REQUEST,
                &request.operation_id,
                &arguments.logical_path,
                arguments.byte_length,
                &arguments.content_sha256,
            ),
            request.proposal_hash,
            "两端的 proposalHash 必须逐值相同"
        );

        // 双根：wire 上恒是**裸**逻辑路径——`/case` 与 `/workspace` 一个都不许上 wire。
        for line in golden_lines(WIRE_GOLDEN) {
            let text = String::from_utf8(line).expect("golden 是 UTF-8");
            assert!(!text.contains("/case/"), "wire 不得带 /case 前缀：{text}");
            assert!(
                !text.contains("/workspace/") || text.contains("assistant_text_delta"),
                "wire 不得带 /workspace 前缀：{text}"
            );
        }
    }

    /// journal 侧 golden：四段账序与 `session_started` 的裁定A 真值逐字节固定。
    ///
    /// 两枚**环境派生**字段按名替换后再比字节，各自另有直接断言，不靠 golden 兜：
    /// `recordedAt`（真实 wall clock）与 `routeManifestSha256`（随 sidecar 制品变）。
    #[test]
    fn dual_end_golden_journal_ledger_matches_byte_for_byte() {
        let (inbound, _) = split_wire_golden();
        let h = harness("dual-golden-journal");
        let (host, _log, _) = start_probe(
            &h,
            h.config.clone(),
            vec![inbound.iter().cloned().map(Scripted::Line).collect()],
            ExitOutcome::Code(0),
            &FixedKey,
        );
        let mut host = host.expect("启动");
        host.install_write_host(Some(Box::new(
            crate::pi_loop_workspace::WorkspaceFsHost::new(
                &h.app_data,
                &h.config.container_id,
                &h.config.session_id,
            )
            .with_decision_driver(Box::new(ScriptedDecision {
                approve: true,
                before: None,
            })),
        )));
        host.prompt(GOLDEN_REQUEST, GOLDEN_PROMPT).expect("走得通");

        let expected: Vec<JournalRecord> = golden_lines(JOURNAL_GOLDEN)
            .iter()
            .map(|line| {
                let record = pi_loop_journal::decode_record(line).expect("golden 行必须解得开");
                let mut reencoded = pi_loop_journal::encode_record(&record);
                reencoded.pop();
                assert_eq!(
                    String::from_utf8_lossy(&reencoded),
                    String::from_utf8_lossy(line),
                    "golden 行必须 canonical 往返"
                );
                record
            })
            .collect();

        let live = host.records().to_vec();

        // recordedAt 单调不减、且都是真时钟（非 0）——这是它被排除在字节比对之外的代价，
        // 故在此单独证。
        let mut last = 0;
        for record in &live {
            assert!(record.recorded_at > 0, "recordedAt 必须是真时钟");
            assert!(record.recorded_at >= last, "recordedAt 必须非递减");
            last = record.recorded_at;
        }
        // routeManifestSha256 是对已验证 bytes 的重算值——同样单独证。
        let live_manifest = crate::pi_loop_process::sha256_bytes(EXPECTED_ROUTE_MANIFEST);

        for want in &expected {
            let found = live
                .iter()
                .find(|record| record.event_id == want.event_id)
                .unwrap_or_else(|| {
                    panic!(
                        "golden 点名的 {} 不在实跑账里：实得 {:?}",
                        want.event_id,
                        record_types(&live)
                    )
                });
            let mut normalized = found.clone();
            normalized.recorded_at = want.recorded_at;
            if let JournalPayload::SessionStarted(started) = &mut normalized.payload {
                assert_eq!(
                    started.route_manifest_sha256, live_manifest,
                    "routeManifestSha256 只能是对已验证 bytes 的重算值"
                );
                started.route_manifest_sha256.clone_from(
                    &match &want.payload {
                        JournalPayload::SessionStarted(golden) => golden,
                        _ => panic!("golden 同位必须也是 session_started"),
                    }
                    .route_manifest_sha256,
                );
            }
            let mut want_line = pi_loop_journal::encode_record(want);
            want_line.pop();
            let mut live_line = pi_loop_journal::encode_record(&normalized);
            live_line.pop();
            assert_eq!(
                String::from_utf8_lossy(&live_line),
                String::from_utf8_lossy(&want_line),
                "{} 必须与 golden 逐字节相同",
                want.event_id
            );
        }

        // 四段账序在实跑账里恰按此次序、且恰一次。
        let effects: Vec<JournalType> = record_types(&live)
            .into_iter()
            .filter(|journal_type| is_effect_type(*journal_type))
            .collect();
        assert_eq!(
            effects,
            vec![
                JournalType::ToolProposed,
                JournalType::AuthorizationDecided,
                JournalType::EffectStarted,
                JournalType::EffectSucceeded,
            ],
        );

        // journal 只记逻辑路径：物理根、正文、app-data 绝对路径一概不进。
        let text =
            String::from_utf8(fs::read(journal_path(&h.app_data, "cnt-1", "sess-1")).expect("读"))
                .expect("UTF-8");
        assert!(!text.contains("合同编号"), "正文不得落进 journal");
        assert!(!text.contains(crate::pi_loop_workspace::PI_WORKSPACES_DIR));
        assert!(!text.contains(&h.app_data.to_string_lossy().into_owned()));
        assert!(
            text.contains("\"caseRoot\":\"/case\""),
            "journal 里唯一的根是虚拟案件根"
        );
    }
}
