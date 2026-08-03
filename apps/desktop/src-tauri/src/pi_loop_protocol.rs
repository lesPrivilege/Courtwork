//! PI-HOST-LOOP-1 §三 Rust 段：产品 stdio wire 的 **Rust closed codec**（ADR-022 六-B.1/六-B.2）。
//!
//! 这是 `packages/pi-lane/src/product-protocol.ts` 的独立 expected-side，不是它的移植。
//! 两侧共用的唯一真源是 tracked `packages/pi-lane/fixtures/product-wire-v1.jsonl`：Node 侧对每行
//! 逐向 decode + canonical re-encode，Rust 侧以 `include_bytes!` 读**同一 blob** 做同一件事。
//! 任一侧自造 fixture 再验证自己都是零区分力，所以这里绝不生成样本，只消费那一份。
//!
//! 三条与 `serde_json` 不可调和、因而必须自研扫描器的契约：
//! 1. **任一层重复 member 必须拒**。`serde_json` 默认后者覆盖前者。
//! 2. **integer 必须按原始 lexeme 判定**。`1e2` / `01` / `-0` / `1.0` 都不是合法整数 lexeme，
//!    先 parse 后看值等于 100 就已经晚了。
//! 3. **canonical re-encode 必须与 `JSON.stringify` 逐字节相同**。字段序即构造序，
//!    数值按 ECMAScript `Number::toString` 输出——`serde_json` 的 Map 序与浮点格式都不保证这一点。
//!
//! 拒收理由 `reason` 只由本文件的字面量与契约字段名拼成：入参值（含未知 member 名、secret、
//! 物理路径）永不进入 reason，否则 `protocol_error.message` 就成了回显面。

#![allow(dead_code)]

use std::fmt::Write as _;

// ── 契约常量（ADR-022 六-B，与 TS 侧逐值同源）────────────────────────────────

pub(crate) const PROTOCOL_VERSION: u64 = 1;
/// 单 packet **连结尾 LF 在内**的字节上限。
pub(crate) const MAX_PACKET_BYTES: usize = 1_048_576;
pub(crate) const LINE_DELIMITER: u8 = 0x0a;
pub(crate) const MAX_TEXT_BYTES: usize = 131_072;
pub(crate) const MAX_DELTA_BYTES: usize = 65_536;
pub(crate) const MAX_LIST_ENTRIES: usize = 2_000;
pub(crate) const MAX_SEGMENT_BYTES: usize = 255;
pub(crate) const MAX_LOGICAL_PATH_BYTES: usize = 1_024;
pub(crate) const MAX_CASE_ROOT_BYTES: usize = 4_096;
pub(crate) const MAX_MODEL_ID_BYTES: usize = 256;
pub(crate) const MAX_API_KEY_BYTES: usize = 8_192;
pub(crate) const MAX_TERMINAL_MESSAGE_BYTES: usize = 1_024;
pub(crate) const MAX_HOST_ERROR_MESSAGE_BYTES: usize = 4_096;
pub(crate) const MAX_TURNS_LIMIT: u64 = 12;
pub(crate) const MAX_USD_LIMIT: f64 = 100_000.0;
pub(crate) const MAX_JSON_DEPTH: usize = 32;
/// `Number.MAX_SAFE_INTEGER`。
pub(crate) const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

/// `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`——全部 wire ID 共用。
pub(crate) fn is_safe_token(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.is_empty() || bytes.len() > 128 {
        return false;
    }
    if !bytes[0].is_ascii_alphanumeric() {
        return false;
    }
    bytes[1..]
        .iter()
        .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'-')
}

/// 小写 64 位 hex。
pub(crate) fn is_sha256_hex(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

/// 声明为 integer 的 JSON number lexeme 闭集 `0|[1-9][0-9]*`。
fn is_integer_lexeme(lexeme: &str) -> bool {
    let bytes = lexeme.as_bytes();
    match bytes {
        [b'0'] => true,
        [first, rest @ ..] if (b'1'..=b'9').contains(first) => {
            rest.iter().all(|byte| byte.is_ascii_digit())
        }
        _ => false,
    }
}

// ── 闭集标量 ─────────────────────────────────────────────────────────────────

macro_rules! closed_enum {
    ($name:ident { $($variant:ident => $text:literal),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
        pub(crate) enum $name { $($variant),+ }

        impl $name {
            pub(crate) const ALL: &'static [$name] = &[$($name::$variant),+];

            pub(crate) fn as_str(self) -> &'static str {
                match self { $($name::$variant => $text),+ }
            }

            pub(crate) fn parse(value: &str) -> Option<$name> {
                match value { $($text => Some($name::$variant),)+ _ => None }
            }
        }
    };
}

closed_enum!(ProtocolErrorCode {
    InvalidJson => "invalid_json",
    PacketTooLarge => "packet_too_large",
    InvalidSchema => "invalid_schema",
    UnsupportedVersion => "unsupported_version",
    UnknownType => "unknown_type",
    SeqMismatch => "seq_mismatch",
    SessionMismatch => "session_mismatch",
    RequestMismatch => "request_mismatch",
    StateViolation => "state_violation",
    DuplicateId => "duplicate_id",
});

closed_enum!(WorkspaceCapability {
    CaseRead => "case_read",
    WorkspaceRead => "workspace_read",
    WorkspaceWrite => "workspace_write",
});

closed_enum!(ProductToolName {
    Read => "read",
    Glob => "glob",
    Grep => "grep",
    Write => "write",
});

closed_enum!(ToolOutcome {
    Succeeded => "succeeded",
    Denied => "denied",
    Failed => "failed",
    Uncertain => "uncertain",
});

closed_enum!(TurnStopReason {
    Stop => "stop",
    Length => "length",
    Tool => "tool",
    Aborted => "aborted",
    Error => "error",
    Unknown => "unknown",
});

closed_enum!(CancelReason { User => "user", Host => "host" });

closed_enum!(HostResultStatus {
    Ok => "ok",
    Denied => "denied",
    Failed => "failed",
    Uncertain => "uncertain",
});

closed_enum!(WorkspaceOperation {
    Write => "write",
    Exists => "exists",
    ReadFile => "read_file",
    List => "list",
});

closed_enum!(ResumeKind { Fresh => "fresh", AfterInterruption => "after_interruption" });

closed_enum!(HostDeniedCode { UserDenied => "user_denied", PolicyDenied => "policy_denied" });

closed_enum!(HostFailureCode {
    InvalidPath => "invalid_path",
    NotFound => "not_found",
    NotDirectory => "not_directory",
    IsDirectory => "is_directory",
    SymlinkForbidden => "symlink_forbidden",
    LimitExceeded => "limit_exceeded",
    HashMismatch => "hash_mismatch",
    StateChanged => "state_changed",
    UnsupportedFileType => "unsupported_file_type",
    UnsupportedFilesystem => "unsupported_filesystem",
    Io => "io",
    Aborted => "aborted",
    Interrupted => "interrupted",
});

closed_enum!(TerminalFailureCode {
    ProviderError => "provider_error",
    HostError => "host_error",
    BudgetUnknown => "budget_unknown",
    EffectUncertain => "effect_uncertain",
    UpstreamEventUnsupported => "upstream_event_unsupported",
    InvalidState => "invalid_state",
    Unknown => "unknown",
});

impl TerminalFailureCode {
    /// 七枚终态文案的**唯一** Rust 真源（PI-HOST-LOOP-1 §二.3 表）。
    ///
    /// crash fold 自造 `prompt_failed` 时逐字用它；不得从退出码、stderr 或 OS error 拼 message。
    /// 与 TS 侧同一表的逐字相等由 golden fixture 承担（`golden_covers_seven_terminal_messages`）。
    pub(crate) fn message(self) -> &'static str {
        match self {
            TerminalFailureCode::ProviderError => "provider 调用失败，本轮未能完成",
            TerminalFailureCode::HostError => "宿主操作失败，本轮未能完成",
            TerminalFailureCode::BudgetUnknown => "已启用金额限额，但存在费用未知的回合",
            TerminalFailureCode::EffectUncertain => "目标可能已是完整新版本，落盘无法证明",
            TerminalFailureCode::UpstreamEventUnsupported => "上游事件序列不在投影闭集内",
            TerminalFailureCode::InvalidState => "状态机收到不合法的状态转移",
            TerminalFailureCode::Unknown => "未归类的失败",
        }
    }

    /// retryability 闭集：只有 provider/host error 可重试。
    pub(crate) fn may_retry(self) -> bool {
        matches!(
            self,
            TerminalFailureCode::ProviderError | TerminalFailureCode::HostError
        )
    }
}

closed_enum!(BudgetTurnLimit { Open => "open", Reached => "reached" });

closed_enum!(BudgetUsdLimit {
    Disabled => "disabled",
    Open => "open",
    Reached => "reached",
    Unknown => "unknown",
});

closed_enum!(BudgetStopReason { Turns => "turns", Usd => "usd" });

closed_enum!(WriteDisposition { Created => "created", Overwritten => "overwritten" });

closed_enum!(ListEntryKind { File => "file", Directory => "directory", Symlink => "symlink" });

// ── payload ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct BootstrapProvider {
    pub(crate) model_id: String,
    pub(crate) api_key: String,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct BootstrapLimits {
    pub(crate) max_turns: u64,
    pub(crate) max_usd: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct BootstrapResume {
    pub(crate) kind: ResumeKind,
    pub(crate) leg: u64,
    pub(crate) prior_observed_turns: u64,
    pub(crate) prior_turns: u64,
    pub(crate) prior_usd: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct BootstrapPayload {
    pub(crate) container_id: String,
    pub(crate) grant_id: String,
    pub(crate) case_root: String,
    pub(crate) provider: BootstrapProvider,
    pub(crate) limits: BootstrapLimits,
    pub(crate) resume: BootstrapResume,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct TurnUsage {
    pub(crate) input_tokens: Option<u64>,
    pub(crate) output_tokens: Option<u64>,
    pub(crate) cache_read_tokens: Option<u64>,
    pub(crate) cache_write_tokens: Option<u64>,
    pub(crate) cost_usd: Option<f64>,
}

impl TurnUsage {
    pub(crate) fn all_unknown() -> Self {
        TurnUsage {
            input_tokens: None,
            output_tokens: None,
            cache_read_tokens: None,
            cache_write_tokens: None,
            cost_usd: None,
        }
    }

    pub(crate) fn is_all_unknown(&self) -> bool {
        self.input_tokens.is_none()
            && self.output_tokens.is_none()
            && self.cache_read_tokens.is_none()
            && self.cache_write_tokens.is_none()
            && self.cost_usd.is_none()
    }
}

/// `AgentProjectionEvent` 闭集（ADR-022 六-B.1）。journal 的 `agent_event` payload 直接复用它。
#[derive(Debug, Clone, PartialEq)]
pub(crate) enum AgentProjectionEvent {
    AssistantTextDelta {
        delta: String,
    },
    AssistantReasoningDelta {
        delta: String,
    },
    ToolStarted {
        tool_call_id: String,
        tool_name: ProductToolName,
    },
    ToolProgress {
        tool_call_id: String,
        tool_name: ProductToolName,
    },
    ToolFinished {
        tool_call_id: String,
        tool_name: ProductToolName,
        outcome: ToolOutcome,
    },
    TurnFinished {
        turn: u64,
        counted_toward_turn_limit: bool,
        usage: TurnUsage,
        stop_reason: TurnStopReason,
    },
}

impl AgentProjectionEvent {
    pub(crate) fn kind(&self) -> &'static str {
        match self {
            AgentProjectionEvent::AssistantTextDelta { .. } => "assistant_text_delta",
            AgentProjectionEvent::AssistantReasoningDelta { .. } => "assistant_reasoning_delta",
            AgentProjectionEvent::ToolStarted { .. } => "tool_started",
            AgentProjectionEvent::ToolProgress { .. } => "tool_progress",
            AgentProjectionEvent::ToolFinished { .. } => "tool_finished",
            AgentProjectionEvent::TurnFinished { .. } => "turn_finished",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct BudgetView {
    pub(crate) turns: u64,
    pub(crate) usd: Option<f64>,
    pub(crate) turn_limit: BudgetTurnLimit,
    pub(crate) usd_limit: BudgetUsdLimit,
    pub(crate) stop_reason: Option<BudgetStopReason>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct TerminalError {
    pub(crate) code: TerminalFailureCode,
    pub(crate) message: String,
    pub(crate) retryable: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Terminal {
    Completed {
        budget: BudgetView,
    },
    BudgetStopped {
        budget: BudgetView,
    },
    Canceled {
        reason: CancelReason,
        budget: BudgetView,
    },
    Failed {
        error: TerminalError,
        budget: BudgetView,
    },
    Shutdown,
}

impl Terminal {
    pub(crate) fn status(&self) -> &'static str {
        match self {
            Terminal::Completed { .. } => "completed",
            Terminal::BudgetStopped { .. } => "budget_stopped",
            Terminal::Canceled { .. } => "canceled",
            Terminal::Failed { .. } => "failed",
            Terminal::Shutdown => "shutdown",
        }
    }

    pub(crate) fn budget(&self) -> Option<&BudgetView> {
        match self {
            Terminal::Completed { budget }
            | Terminal::BudgetStopped { budget }
            | Terminal::Canceled { budget, .. }
            | Terminal::Failed { budget, .. } => Some(budget),
            Terminal::Shutdown => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct WorkspaceWriteArguments {
    pub(crate) logical_path: String,
    pub(crate) content: String,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct WorkspaceReadArguments {
    /// `exists | read_file | list`；`write` 由 decoder 拒。
    pub(crate) operation: WorkspaceOperation,
    pub(crate) logical_path: String,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum WorkspaceRequestArguments {
    Write(WorkspaceWriteArguments),
    Read(WorkspaceReadArguments),
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct WorkspaceHostRequest {
    pub(crate) operation_id: String,
    pub(crate) proposal_hash: String,
    pub(crate) capability: WorkspaceCapability,
    pub(crate) arguments: WorkspaceRequestArguments,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ListEntry {
    pub(crate) name: String,
    pub(crate) kind: ListEntryKind,
    pub(crate) byte_length: Option<u64>,
    pub(crate) mtime_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum HostResultValue {
    Write {
        logical_path: String,
        disposition: WriteDisposition,
        content_sha256: String,
        byte_length: u64,
    },
    Exists {
        logical_path: String,
        exists: bool,
    },
    ReadFile {
        logical_path: String,
        content: String,
        content_sha256: String,
        byte_length: u64,
    },
    List {
        logical_path: String,
        entries: Vec<ListEntry>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum HostResultOutcome {
    Ok(HostResultValue),
    Denied {
        code: HostDeniedCode,
        message: String,
    },
    Failed {
        code: HostFailureCode,
        message: String,
    },
    Uncertain {
        message: String,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct HostResultPayload {
    pub(crate) operation_id: String,
    pub(crate) capability: WorkspaceCapability,
    pub(crate) operation: WorkspaceOperation,
    pub(crate) outcome: HostResultOutcome,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ProtocolErrorPayload {
    pub(crate) code: ProtocolErrorCode,
    pub(crate) message: String,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum PacketPayload {
    Bootstrap(BootstrapPayload),
    Prompt {
        text: String,
    },
    Cancel {
        reason: CancelReason,
    },
    HostResult(HostResultPayload),
    Shutdown,
    Ready {
        capabilities: Vec<WorkspaceCapability>,
    },
    AgentEvent(AgentProjectionEvent),
    HostRequest(WorkspaceHostRequest),
    Terminal(Terminal),
    ProtocolError(ProtocolErrorPayload),
}

impl PacketPayload {
    pub(crate) fn type_name(&self) -> &'static str {
        match self {
            PacketPayload::Bootstrap(_) => "bootstrap",
            PacketPayload::Prompt { .. } => "prompt",
            PacketPayload::Cancel { .. } => "cancel",
            PacketPayload::HostResult(_) => "host_result",
            PacketPayload::Shutdown => "shutdown",
            PacketPayload::Ready { .. } => "ready",
            PacketPayload::AgentEvent(_) => "agent_event",
            PacketPayload::HostRequest(_) => "host_request",
            PacketPayload::Terminal(_) => "terminal",
            PacketPayload::ProtocolError(_) => "protocol_error",
        }
    }

    pub(crate) fn direction(&self) -> Direction {
        match self {
            PacketPayload::Bootstrap(_)
            | PacketPayload::Prompt { .. }
            | PacketPayload::Cancel { .. }
            | PacketPayload::HostResult(_)
            | PacketPayload::Shutdown => Direction::Host,
            _ => Direction::Sidecar,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ProductPacket {
    pub(crate) seq: u64,
    pub(crate) session_id: Option<String>,
    pub(crate) request_id: Option<String>,
    pub(crate) payload: PacketPayload,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Direction {
    Host,
    Sidecar,
}

pub(crate) const HOST_PACKET_TYPES: &[&str] =
    &["bootstrap", "prompt", "cancel", "host_result", "shutdown"];
pub(crate) const SIDECAR_PACKET_TYPES: &[&str] = &[
    "ready",
    "agent_event",
    "host_request",
    "terminal",
    "protocol_error",
];

// ── 拒收 ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct PacketRejection {
    pub(crate) code: ProtocolErrorCode,
    pub(crate) reason: String,
}

pub(crate) type CodecResult<T> = Result<T, PacketRejection>;

pub(crate) fn reject<T>(code: ProtocolErrorCode, reason: &str) -> CodecResult<T> {
    Err(PacketRejection {
        code,
        reason: reason.to_string(),
    })
}

fn reject_field<T>(code: ProtocolErrorCode, label: &str, tail: &str) -> CodecResult<T> {
    Err(PacketRejection {
        code,
        reason: format!("{label} {tail}"),
    })
}

// ── 严格 JSON 扫描器 ─────────────────────────────────────────────────────────

/// 保留 member 插入序与 number 原始 lexeme 的 JSON 树。
#[derive(Debug, Clone, PartialEq)]
pub(crate) enum JsonNode {
    Object(Vec<(String, JsonNode)>),
    Array(Vec<JsonNode>),
    Str(String),
    Number { lexeme: String, value: f64 },
    Bool(bool),
    Null,
}

impl JsonNode {
    fn kind_is_null(&self) -> bool {
        matches!(self, JsonNode::Null)
    }
}

struct Scanner<'a> {
    text: &'a [u8],
    index: usize,
    depth: usize,
    /// wire 行只收 SP/TAB 作 token 间空白（LF 是 delimiter，放行裸 CR 等于接受一个
    /// 作为行终止符时被明令拒绝的字节）；**文件**形态（route manifest）才额外收 LF/CR。
    allow_newline_whitespace: bool,
}

impl<'a> Scanner<'a> {
    fn peek(&self) -> Option<u8> {
        self.text.get(self.index).copied()
    }

    fn skip_whitespace(&mut self) {
        while let Some(byte) = self.peek() {
            let newline = byte == 0x0a || byte == 0x0d;
            if byte == 0x20 || byte == 0x09 || (newline && self.allow_newline_whitespace) {
                self.index += 1;
            } else {
                break;
            }
        }
    }

    fn scan_hex4(&mut self) -> CodecResult<u32> {
        if self.index + 4 > self.text.len() {
            return reject(
                ProtocolErrorCode::InvalidJson,
                "JSON `\\u` 转义必须是四位 hex",
            );
        }
        let slice = &self.text[self.index..self.index + 4];
        let mut value = 0_u32;
        for byte in slice {
            let digit = match byte {
                b'0'..=b'9' => byte - b'0',
                b'a'..=b'f' => byte - b'a' + 10,
                b'A'..=b'F' => byte - b'A' + 10,
                _ => {
                    return reject(
                        ProtocolErrorCode::InvalidJson,
                        "JSON `\\u` 转义必须是四位 hex",
                    );
                }
            };
            value = value * 16 + u32::from(digit);
        }
        self.index += 4;
        Ok(value)
    }

    fn scan_string(&mut self) -> CodecResult<String> {
        self.index += 1; // 起始引号
        let mut out = String::new();
        loop {
            let Some(byte) = self.peek() else {
                return reject(ProtocolErrorCode::InvalidJson, "JSON 字符串未闭合");
            };
            match byte {
                b'"' => {
                    self.index += 1;
                    break;
                }
                b'\\' => {
                    self.index += 1;
                    let Some(escape) = self.peek() else {
                        return reject(ProtocolErrorCode::InvalidJson, "JSON 字符串未闭合");
                    };
                    self.index += 1;
                    let decoded = match escape {
                        b'"' => '"',
                        b'\\' => '\\',
                        b'/' => '/',
                        b'b' => '\u{0008}',
                        b'f' => '\u{000c}',
                        b'n' => '\n',
                        b'r' => '\r',
                        b't' => '\t',
                        b'u' => {
                            let unit = self.scan_hex4()?;
                            // wire 字符串必须是 Unicode scalar 序列：lone surrogate 一律拒。
                            if (0xd800..=0xdbff).contains(&unit) {
                                if self.peek() != Some(b'\\')
                                    || self.text.get(self.index + 1).copied() != Some(b'u')
                                {
                                    return reject(
                                        ProtocolErrorCode::InvalidSchema,
                                        "wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列",
                                    );
                                }
                                self.index += 2;
                                let low = self.scan_hex4()?;
                                if !(0xdc00..=0xdfff).contains(&low) {
                                    return reject(
                                        ProtocolErrorCode::InvalidSchema,
                                        "wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列",
                                    );
                                }
                                let combined = 0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00);
                                char::from_u32(combined).unwrap_or('\u{fffd}')
                            } else if (0xdc00..=0xdfff).contains(&unit) || unit == 0 {
                                // 落单的 low surrogate 与 `\u0000` 同属一条门：wire 字符串
                                // 必须是不含 NUL 的 Unicode scalar 序列。
                                return reject(
                                    ProtocolErrorCode::InvalidSchema,
                                    "wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列",
                                );
                            } else {
                                char::from_u32(unit).unwrap_or('\u{fffd}')
                            }
                        }
                        _ => {
                            return reject(
                                ProtocolErrorCode::InvalidJson,
                                "JSON 字符串含契约外转义",
                            );
                        }
                    };
                    out.push(decoded);
                }
                byte if byte < 0x20 => {
                    return reject(
                        ProtocolErrorCode::InvalidJson,
                        "JSON 字符串含未转义控制字符",
                    );
                }
                _ => {
                    // 输入已经过 fatal UTF-8 解码，这里按 char 边界推进即可。
                    let rest = std::str::from_utf8(&self.text[self.index..])
                        .expect("scanner 输入已通过 fatal UTF-8 解码");
                    let ch = rest.chars().next().expect("非空");
                    out.push(ch);
                    self.index += ch.len_utf8();
                }
            }
        }
        Ok(out)
    }

    fn scan_number(&mut self) -> CodecResult<JsonNode> {
        let start = self.index;
        if self.peek() == Some(b'-') {
            self.index += 1;
        }
        match self.peek() {
            Some(b'0') => self.index += 1,
            Some(byte) if byte.is_ascii_digit() => {
                while self.peek().is_some_and(|b| b.is_ascii_digit()) {
                    self.index += 1;
                }
            }
            _ => return reject(ProtocolErrorCode::InvalidJson, "JSON number 不合语法"),
        }
        if self.peek() == Some(b'.') {
            self.index += 1;
            if !self.peek().is_some_and(|b| b.is_ascii_digit()) {
                return reject(
                    ProtocolErrorCode::InvalidJson,
                    "JSON number 的小数部分缺数字",
                );
            }
            while self.peek().is_some_and(|b| b.is_ascii_digit()) {
                self.index += 1;
            }
        }
        if matches!(self.peek(), Some(b'e') | Some(b'E')) {
            self.index += 1;
            if matches!(self.peek(), Some(b'+') | Some(b'-')) {
                self.index += 1;
            }
            if !self.peek().is_some_and(|b| b.is_ascii_digit()) {
                return reject(
                    ProtocolErrorCode::InvalidJson,
                    "JSON number 的指数部分缺数字",
                );
            }
            while self.peek().is_some_and(|b| b.is_ascii_digit()) {
                self.index += 1;
            }
        }
        let lexeme = std::str::from_utf8(&self.text[start..self.index])
            .expect("number lexeme 恒为 ASCII")
            .to_string();
        let value = lexeme.parse::<f64>().unwrap_or(f64::NAN);
        Ok(JsonNode::Number { lexeme, value })
    }

    fn scan_literal(&mut self, literal: &[u8], node: JsonNode) -> CodecResult<JsonNode> {
        if self.text.len() < self.index + literal.len()
            || &self.text[self.index..self.index + literal.len()] != literal
        {
            return reject(ProtocolErrorCode::InvalidJson, "JSON 字面量不合语法");
        }
        self.index += literal.len();
        Ok(node)
    }

    fn scan_object(&mut self) -> CodecResult<JsonNode> {
        self.depth += 1;
        if self.depth > MAX_JSON_DEPTH {
            return reject(ProtocolErrorCode::InvalidJson, "JSON 嵌套超过深度上限");
        }
        self.index += 1;
        let mut members: Vec<(String, JsonNode)> = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(b'}') {
            self.index += 1;
            self.depth -= 1;
            return Ok(JsonNode::Object(members));
        }
        loop {
            self.skip_whitespace();
            if self.peek() != Some(b'"') {
                return reject(
                    ProtocolErrorCode::InvalidJson,
                    "JSON object 的 member 名必须是字符串",
                );
            }
            let key = self.scan_string()?;
            if members.iter().any(|(existing, _)| existing == &key) {
                return reject(
                    ProtocolErrorCode::InvalidJson,
                    "JSON object 出现重复 member（任一层皆拒）",
                );
            }
            self.skip_whitespace();
            if self.peek() != Some(b':') {
                return reject(
                    ProtocolErrorCode::InvalidJson,
                    "JSON object 的 member 缺少冒号",
                );
            }
            self.index += 1;
            let value = self.scan_value()?;
            members.push((key, value));
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => {
                    self.index += 1;
                }
                Some(b'}') => {
                    self.index += 1;
                    self.depth -= 1;
                    return Ok(JsonNode::Object(members));
                }
                _ => return reject(ProtocolErrorCode::InvalidJson, "JSON object 未正确闭合"),
            }
        }
    }

    fn scan_array(&mut self) -> CodecResult<JsonNode> {
        self.depth += 1;
        if self.depth > MAX_JSON_DEPTH {
            return reject(ProtocolErrorCode::InvalidJson, "JSON 嵌套超过深度上限");
        }
        self.index += 1;
        let mut items = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(b']') {
            self.index += 1;
            self.depth -= 1;
            return Ok(JsonNode::Array(items));
        }
        loop {
            items.push(self.scan_value()?);
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => {
                    self.index += 1;
                }
                Some(b']') => {
                    self.index += 1;
                    self.depth -= 1;
                    return Ok(JsonNode::Array(items));
                }
                _ => return reject(ProtocolErrorCode::InvalidJson, "JSON array 未正确闭合"),
            }
        }
    }

    fn scan_value(&mut self) -> CodecResult<JsonNode> {
        self.skip_whitespace();
        match self.peek() {
            None => reject(
                ProtocolErrorCode::InvalidJson,
                "JSON 在期待值的位置提前结束",
            ),
            Some(b'{') => self.scan_object(),
            Some(b'[') => self.scan_array(),
            Some(b'"') => Ok(JsonNode::Str(self.scan_string()?)),
            Some(b't') => self.scan_literal(b"true", JsonNode::Bool(true)),
            Some(b'f') => self.scan_literal(b"false", JsonNode::Bool(false)),
            Some(b'n') => self.scan_literal(b"null", JsonNode::Null),
            _ => self.scan_number(),
        }
    }
}

fn scan_with(text: &str, allow_newline_whitespace: bool) -> CodecResult<JsonNode> {
    let mut scanner = Scanner {
        text: text.as_bytes(),
        index: 0,
        depth: 0,
        allow_newline_whitespace,
    };
    let value = scanner.scan_value()?;
    scanner.skip_whitespace();
    if scanner.index != scanner.text.len() {
        return reject(
            ProtocolErrorCode::InvalidJson,
            "只允许一个 JSON 值，其后出现多余内容",
        );
    }
    Ok(value)
}

/// 严格 JSON 扫描（**行**形态）：重复 member 拒、number 保留 lexeme、只收 SP/TAB 空白。
/// wire packet 与 journal record 都走它。
pub(crate) fn scan_json(text: &str) -> CodecResult<JsonNode> {
    scan_with(text, false)
}

/// 严格 JSON 扫描（**文件**形态）：同上，但额外把 LF/CR 当 token 间空白。
/// 只供 route manifest 这类 tracked 文档；wire 与 journal 一律不得改走这条。
pub(crate) fn scan_json_document(text: &str) -> CodecResult<JsonNode> {
    scan_with(text, true)
}

// ── record / 标量读取器（journal 复用）───────────────────────────────────────

pub(crate) fn require_object<'a>(
    node: &'a JsonNode,
    label: &str,
) -> CodecResult<&'a Vec<(String, JsonNode)>> {
    match node {
        JsonNode::Object(members) => Ok(members),
        _ => reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "必须是 JSON object",
        ),
    }
}

/// `additionalProperties:false` 的落地：字段集必须与契约**逐字相同**，多一个少一个都拒。
pub(crate) fn closed_record<'a>(
    node: &'a JsonNode,
    label: &str,
    keys: &[&str],
) -> CodecResult<&'a Vec<(String, JsonNode)>> {
    let members = require_object(node, label)?;
    if members.len() != keys.len() {
        return reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "的字段集必须与契约逐字相同（additionalProperties:false）",
        );
    }
    for key in keys {
        if !members.iter().any(|(name, _)| name == key) {
            return reject_field(
                ProtocolErrorCode::InvalidSchema,
                label,
                "缺少契约字段或含契约外字段",
            );
        }
    }
    Ok(members)
}

pub(crate) fn pick<'a>(
    members: &'a [(String, JsonNode)],
    key: &str,
    label: &str,
) -> CodecResult<&'a JsonNode> {
    members
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, node)| node)
        .ok_or_else(|| PacketRejection {
            code: ProtocolErrorCode::InvalidSchema,
            reason: format!("{label} 缺少契约字段"),
        })
}

pub(crate) fn read_string(node: &JsonNode, label: &str, max_bytes: usize) -> CodecResult<String> {
    match node {
        JsonNode::Str(value) => {
            if value.len() > max_bytes {
                return reject_field(
                    ProtocolErrorCode::InvalidSchema,
                    label,
                    "超过 UTF-8 字节上限",
                );
            }
            Ok(value.clone())
        }
        _ => reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是字符串"),
    }
}

pub(crate) fn read_non_empty_string(
    node: &JsonNode,
    label: &str,
    max_bytes: usize,
) -> CodecResult<String> {
    let value = read_string(node, label, max_bytes)?;
    if value.is_empty() {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "不得为空");
    }
    Ok(value)
}

pub(crate) fn read_enum<T: Copy>(
    node: &JsonNode,
    label: &str,
    parse: impl Fn(&str) -> Option<T>,
) -> CodecResult<T> {
    match node {
        JsonNode::Str(value) => parse(value.as_str()).ok_or_else(|| PacketRejection {
            code: ProtocolErrorCode::InvalidSchema,
            reason: format!("{label} 不在契约闭集内"),
        }),
        _ => reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是字符串"),
    }
}

pub(crate) fn read_safe_token(node: &JsonNode, label: &str) -> CodecResult<String> {
    match node {
        JsonNode::Str(value) if is_safe_token(value) => Ok(value.clone()),
        JsonNode::Str(_) => reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "不满足 SafeToken 形状",
        ),
        _ => reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "必须是 SafeToken 字符串",
        ),
    }
}

pub(crate) fn read_sha256_hex(node: &JsonNode, label: &str) -> CodecResult<String> {
    match node {
        JsonNode::Str(value) if is_sha256_hex(value) => Ok(value.clone()),
        JsonNode::Str(_) => reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "必须是小写 64 位 hex",
        ),
        _ => reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是字符串"),
    }
}

pub(crate) fn read_boolean(node: &JsonNode, label: &str) -> CodecResult<bool> {
    match node {
        JsonNode::Bool(value) => Ok(*value),
        _ => reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是 boolean"),
    }
}

/// integer lexical gate：只收 `0|[1-9][0-9]*`，再按字段范围收口；不先 parse 后 coerce。
pub(crate) fn read_integer(node: &JsonNode, label: &str, min: u64, max: u64) -> CodecResult<u64> {
    let JsonNode::Number { lexeme, .. } = node else {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是整数");
    };
    if !is_integer_lexeme(lexeme) {
        return reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "的 JSON number lexeme 不是规范非负整数",
        );
    }
    let Ok(value) = lexeme.parse::<u64>() else {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "超出安全整数范围");
    };
    if value > MAX_SAFE_INTEGER {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "超出安全整数范围");
    }
    if value < min || value > max {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "超出契约范围");
    }
    Ok(value)
}

pub(crate) fn read_nullable_integer(
    node: &JsonNode,
    label: &str,
    min: u64,
) -> CodecResult<Option<u64>> {
    if node.kind_is_null() {
        return Ok(None);
    }
    read_integer(node, label, min, MAX_SAFE_INTEGER).map(Some)
}

/// 非负有限数：lexeme 带负号（含 `-0`）一律拒，指数溢出到 Infinity 也拒。
pub(crate) fn read_non_negative_number(
    node: &JsonNode,
    label: &str,
    exclusive_min: bool,
    max: Option<f64>,
) -> CodecResult<f64> {
    let JsonNode::Number { lexeme, value } = node else {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是数值");
    };
    if lexeme.starts_with('-') {
        return reject_field(
            ProtocolErrorCode::InvalidSchema,
            label,
            "不得为负数或 negative zero",
        );
    }
    if !value.is_finite() {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是有限数");
    }
    if exclusive_min && *value <= 0.0 {
        return reject_field(ProtocolErrorCode::InvalidSchema, label, "必须大于 0");
    }
    if let Some(limit) = max {
        if *value > limit {
            return reject_field(ProtocolErrorCode::InvalidSchema, label, "超出契约上限");
        }
    }
    Ok(*value)
}

pub(crate) fn read_nullable_non_negative_number(
    node: &JsonNode,
    label: &str,
) -> CodecResult<Option<f64>> {
    if node.kind_is_null() {
        return Ok(None);
    }
    read_non_negative_number(node, label, false, None).map(Some)
}

pub(crate) fn read_array<'a>(
    node: &'a JsonNode,
    label: &str,
    max_items: usize,
) -> CodecResult<&'a Vec<JsonNode>> {
    match node {
        JsonNode::Array(items) => {
            if items.len() > max_items {
                return reject_field(ProtocolErrorCode::InvalidSchema, label, "超过条目上限");
            }
            Ok(items)
        }
        _ => reject_field(ProtocolErrorCode::InvalidSchema, label, "必须是 array"),
    }
}

fn read_logical_path(node: &JsonNode, label: &str) -> CodecResult<String> {
    read_non_empty_string(node, label, MAX_LOGICAL_PATH_BYTES)
}

/// 只做形状判定：POSIX 绝对、Windows drive 或 UNC。真实存在性与规范化归宿主。
///
/// `pub(crate)` 是为了让 host 侧的 bootstrap 前置门直接 import 同一枚判据
/// （PI-HOST-LOOP-1R3 D1）——两谱各抄一份形状规则就各自漂移。
pub(crate) fn is_absolute_path_shape(value: &str) -> bool {
    if value.starts_with('/') || value.starts_with("\\\\") {
        return true;
    }
    let bytes = value.as_bytes();
    bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && (bytes[2] == b'\\' || bytes[2] == b'/')
}

// ── payload 校验 ─────────────────────────────────────────────────────────────

fn read_bootstrap_payload(node: &JsonNode) -> CodecResult<BootstrapPayload> {
    let members = closed_record(
        node,
        "bootstrap payload",
        &[
            "containerId",
            "grantId",
            "caseRoot",
            "provider",
            "limits",
            "resume",
        ],
    )?;
    let container_id = read_safe_token(pick(members, "containerId", "bootstrap")?, "containerId")?;
    let grant_id = read_safe_token(pick(members, "grantId", "bootstrap")?, "grantId")?;
    let case_root = read_non_empty_string(
        pick(members, "caseRoot", "bootstrap")?,
        "caseRoot",
        MAX_CASE_ROOT_BYTES,
    )?;
    if !is_absolute_path_shape(&case_root) {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "caseRoot 必须是平台绝对路径",
        );
    }

    let provider_members = closed_record(
        pick(members, "provider", "bootstrap")?,
        "provider",
        &["id", "modelId", "apiKey"],
    )?;
    read_enum(
        pick(provider_members, "id", "provider")?,
        "provider.id",
        |value| {
            if value == "deepseek" {
                Some(())
            } else {
                None
            }
        },
    )?;
    let model_id = read_string(
        pick(provider_members, "modelId", "provider")?,
        "provider.modelId",
        MAX_MODEL_ID_BYTES,
    )?;
    if model_id.trim().is_empty() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "provider.modelId trim 后不得为空",
        );
    }
    let api_key = read_non_empty_string(
        pick(provider_members, "apiKey", "provider")?,
        "provider.apiKey",
        MAX_API_KEY_BYTES,
    )?;

    let limit_members = closed_record(
        pick(members, "limits", "bootstrap")?,
        "limits",
        &["maxTurns", "maxUsd"],
    )?;
    let max_turns = read_integer(
        pick(limit_members, "maxTurns", "limits")?,
        "limits.maxTurns",
        1,
        MAX_TURNS_LIMIT,
    )?;
    let max_usd_node = pick(limit_members, "maxUsd", "limits")?;
    let max_usd = if max_usd_node.kind_is_null() {
        None
    } else {
        Some(read_non_negative_number(
            max_usd_node,
            "limits.maxUsd",
            true,
            Some(MAX_USD_LIMIT),
        )?)
    };

    let resume_members = closed_record(
        pick(members, "resume", "bootstrap")?,
        "resume",
        &[
            "kind",
            "leg",
            "priorObservedTurns",
            "priorTurns",
            "priorUsd",
        ],
    )?;
    let kind = read_enum(
        pick(resume_members, "kind", "resume")?,
        "resume.kind",
        ResumeKind::parse,
    )?;
    let leg = read_integer(
        pick(resume_members, "leg", "resume")?,
        "resume.leg",
        1,
        MAX_SAFE_INTEGER,
    )?;
    let prior_observed_turns = read_integer(
        pick(resume_members, "priorObservedTurns", "resume")?,
        "resume.priorObservedTurns",
        0,
        MAX_SAFE_INTEGER,
    )?;
    let prior_turns = read_integer(
        pick(resume_members, "priorTurns", "resume")?,
        "resume.priorTurns",
        0,
        MAX_SAFE_INTEGER,
    )?;
    let prior_usd = read_nullable_non_negative_number(
        pick(resume_members, "priorUsd", "resume")?,
        "resume.priorUsd",
    )?;

    // 以下四条是「单包即可判定」的自洽门。跨 leg 的精确 fold 与 previous+1 归 Rust journal。
    if kind == ResumeKind::Fresh {
        if leg != 1 || prior_observed_turns != 0 || prior_turns != 0 || prior_usd != Some(0.0) {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "fresh 必须是 leg:1 且 prior 三项全零",
            );
        }
    } else {
        if leg < 2 {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "after_interruption 的 leg 至少为 2",
            );
        }
        if prior_observed_turns < prior_turns {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "priorObservedTurns 不得小于 priorTurns",
            );
        }
    }
    if max_usd.is_some() && prior_usd.is_none() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "maxUsd 已启用时 priorUsd 不得为未知",
        );
    }
    if prior_turns >= max_turns {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "历史 counted turns 已达 maxTurns，不得启动新 leg",
        );
    }
    if let (Some(limit), Some(prior)) = (max_usd, prior_usd) {
        if prior >= limit {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "历史费用已达 maxUsd，不得启动新 leg",
            );
        }
    }

    Ok(BootstrapPayload {
        container_id,
        grant_id,
        case_root,
        provider: BootstrapProvider { model_id, api_key },
        limits: BootstrapLimits { max_turns, max_usd },
        resume: BootstrapResume {
            kind,
            leg,
            prior_observed_turns,
            prior_turns,
            prior_usd,
        },
    })
}

fn read_prompt_payload(node: &JsonNode) -> CodecResult<String> {
    let members = closed_record(node, "prompt payload", &["text"])?;
    let text = read_string(
        pick(members, "text", "prompt")?,
        "prompt.text",
        MAX_TEXT_BYTES,
    )?;
    if text.trim().is_empty() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "prompt.text trim 后不得为空",
        );
    }
    Ok(text)
}

fn read_write_arguments(node: &JsonNode) -> CodecResult<WorkspaceWriteArguments> {
    let members = closed_record(
        node,
        "workspace_write arguments",
        &["logicalPath", "content", "contentSha256", "byteLength"],
    )?;
    let logical_path = read_logical_path(
        pick(members, "logicalPath", "arguments")?,
        "arguments.logicalPath",
    )?;
    let content = read_string(
        pick(members, "content", "arguments")?,
        "arguments.content",
        MAX_TEXT_BYTES,
    )?;
    let content_sha256 = read_sha256_hex(
        pick(members, "contentSha256", "arguments")?,
        "arguments.contentSha256",
    )?;
    let byte_length = read_integer(
        pick(members, "byteLength", "arguments")?,
        "arguments.byteLength",
        0,
        MAX_TEXT_BYTES as u64,
    )?;
    if byte_length != content.len() as u64 {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "arguments.byteLength 必须等于 content 的 UTF-8 实长",
        );
    }
    Ok(WorkspaceWriteArguments {
        logical_path,
        content,
        content_sha256,
        byte_length,
    })
}

fn read_read_arguments(node: &JsonNode) -> CodecResult<WorkspaceReadArguments> {
    let members = closed_record(
        node,
        "workspace_read arguments",
        &["operation", "logicalPath"],
    )?;
    let operation = read_enum(
        pick(members, "operation", "arguments")?,
        "arguments.operation",
        |value| match value {
            "exists" => Some(WorkspaceOperation::Exists),
            "read_file" => Some(WorkspaceOperation::ReadFile),
            "list" => Some(WorkspaceOperation::List),
            _ => None,
        },
    )?;
    let logical_path = read_logical_path(
        pick(members, "logicalPath", "arguments")?,
        "arguments.logicalPath",
    )?;
    Ok(WorkspaceReadArguments {
        operation,
        logical_path,
    })
}

fn read_host_request_payload(node: &JsonNode) -> CodecResult<WorkspaceHostRequest> {
    let members = closed_record(
        node,
        "host_request payload",
        &["operationId", "proposalHash", "capability", "arguments"],
    )?;
    let operation_id =
        read_safe_token(pick(members, "operationId", "host_request")?, "operationId")?;
    let proposal_hash = read_sha256_hex(
        pick(members, "proposalHash", "host_request")?,
        "proposalHash",
    )?;
    let capability = read_enum(
        pick(members, "capability", "host_request")?,
        "host_request.capability",
        |value| match value {
            "workspace_write" => Some(WorkspaceCapability::WorkspaceWrite),
            "workspace_read" => Some(WorkspaceCapability::WorkspaceRead),
            _ => None,
        },
    )?;
    let arguments_node = pick(members, "arguments", "host_request")?;
    let arguments = if capability == WorkspaceCapability::WorkspaceWrite {
        WorkspaceRequestArguments::Write(read_write_arguments(arguments_node)?)
    } else {
        WorkspaceRequestArguments::Read(read_read_arguments(arguments_node)?)
    };
    Ok(WorkspaceHostRequest {
        operation_id,
        proposal_hash,
        capability,
        arguments,
    })
}

fn read_list_entry(node: &JsonNode) -> CodecResult<ListEntry> {
    let members = closed_record(
        node,
        "list entry",
        &["name", "kind", "byteLength", "mtimeMs"],
    )?;
    let name = read_non_empty_string(
        pick(members, "name", "entry")?,
        "entry.name",
        MAX_SEGMENT_BYTES,
    )?;
    let kind = read_enum(
        pick(members, "kind", "entry")?,
        "entry.kind",
        ListEntryKind::parse,
    )?;
    let byte_length =
        read_nullable_integer(pick(members, "byteLength", "entry")?, "entry.byteLength", 0)?;
    let mtime_ms = read_nullable_integer(pick(members, "mtimeMs", "entry")?, "entry.mtimeMs", 0)?;
    if kind == ListEntryKind::File && byte_length.is_none() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "file 条目必须给出 byteLength",
        );
    }
    if kind != ListEntryKind::File && byte_length.is_some() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "directory/symlink 条目的 byteLength 必须为 null",
        );
    }
    Ok(ListEntry {
        name,
        kind,
        byte_length,
        mtime_ms,
    })
}

fn read_host_result_payload(node: &JsonNode) -> CodecResult<HostResultPayload> {
    let probe = require_object(node, "host_result payload")?;
    let status = read_enum(
        pick(probe, "status", "host_result")?,
        "host_result.status",
        HostResultStatus::parse,
    )?;
    let members = closed_record(
        node,
        "host_result payload",
        &[
            "operationId",
            "capability",
            "operation",
            "status",
            if status == HostResultStatus::Ok {
                "value"
            } else {
                "error"
            },
        ],
    )?;

    let operation_id =
        read_safe_token(pick(members, "operationId", "host_result")?, "operationId")?;
    let capability = read_enum(
        pick(members, "capability", "host_result")?,
        "host_result.capability",
        |value| match value {
            "workspace_write" => Some(WorkspaceCapability::WorkspaceWrite),
            "workspace_read" => Some(WorkspaceCapability::WorkspaceRead),
            _ => None,
        },
    )?;
    let operation = read_enum(
        pick(members, "operation", "host_result")?,
        "host_result.operation",
        WorkspaceOperation::parse,
    )?;

    if capability == WorkspaceCapability::WorkspaceWrite && operation != WorkspaceOperation::Write {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "workspace_write 的 operation 固定为 write",
        );
    }
    if capability == WorkspaceCapability::WorkspaceRead && operation == WorkspaceOperation::Write {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "workspace_read 的 operation 不得为 write",
        );
    }
    if status == HostResultStatus::Uncertain && capability != WorkspaceCapability::WorkspaceWrite {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "uncertain 只允许 workspace write",
        );
    }

    if status != HostResultStatus::Ok {
        let error_members = closed_record(
            pick(members, "error", "host_result")?,
            "host_result error",
            &["code", "message"],
        )?;
        let message = read_string(
            pick(error_members, "message", "error")?,
            "error.message",
            MAX_HOST_ERROR_MESSAGE_BYTES,
        )?;
        let code_node = pick(error_members, "code", "error")?;
        let outcome = match status {
            HostResultStatus::Denied => HostResultOutcome::Denied {
                code: read_enum(code_node, "error.code", HostDeniedCode::parse)?,
                message,
            },
            HostResultStatus::Failed => HostResultOutcome::Failed {
                code: read_enum(code_node, "error.code", HostFailureCode::parse)?,
                message,
            },
            _ => {
                read_enum(code_node, "error.code", |value| {
                    if value == "durability_unknown" {
                        Some(())
                    } else {
                        None
                    }
                })?;
                HostResultOutcome::Uncertain { message }
            }
        };
        return Ok(HostResultPayload {
            operation_id,
            capability,
            operation,
            outcome,
        });
    }

    let value_node = pick(members, "value", "host_result")?;
    let value = if capability == WorkspaceCapability::WorkspaceWrite {
        let value_members = closed_record(
            value_node,
            "write ok value",
            &["logicalPath", "disposition", "contentSha256", "byteLength"],
        )?;
        HostResultValue::Write {
            logical_path: read_logical_path(
                pick(value_members, "logicalPath", "value")?,
                "value.logicalPath",
            )?,
            disposition: read_enum(
                pick(value_members, "disposition", "value")?,
                "value.disposition",
                WriteDisposition::parse,
            )?,
            content_sha256: read_sha256_hex(
                pick(value_members, "contentSha256", "value")?,
                "value.contentSha256",
            )?,
            byte_length: read_integer(
                pick(value_members, "byteLength", "value")?,
                "value.byteLength",
                0,
                MAX_TEXT_BYTES as u64,
            )?,
        }
    } else if operation == WorkspaceOperation::Exists {
        let value_members =
            closed_record(value_node, "exists ok value", &["logicalPath", "exists"])?;
        HostResultValue::Exists {
            logical_path: read_logical_path(
                pick(value_members, "logicalPath", "value")?,
                "value.logicalPath",
            )?,
            exists: read_boolean(pick(value_members, "exists", "value")?, "value.exists")?,
        }
    } else if operation == WorkspaceOperation::ReadFile {
        let value_members = closed_record(
            value_node,
            "read_file ok value",
            &["logicalPath", "content", "contentSha256", "byteLength"],
        )?;
        let content = read_string(
            pick(value_members, "content", "value")?,
            "value.content",
            MAX_TEXT_BYTES,
        )?;
        let byte_length = read_integer(
            pick(value_members, "byteLength", "value")?,
            "value.byteLength",
            0,
            MAX_TEXT_BYTES as u64,
        )?;
        if byte_length != content.len() as u64 {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "value.byteLength 必须等于 content 的 UTF-8 实长",
            );
        }
        HostResultValue::ReadFile {
            logical_path: read_logical_path(
                pick(value_members, "logicalPath", "value")?,
                "value.logicalPath",
            )?,
            content,
            content_sha256: read_sha256_hex(
                pick(value_members, "contentSha256", "value")?,
                "value.contentSha256",
            )?,
            byte_length,
        }
    } else {
        let value_members =
            closed_record(value_node, "list ok value", &["logicalPath", "entries"])?;
        let entries_node = read_array(
            pick(value_members, "entries", "value")?,
            "value.entries",
            MAX_LIST_ENTRIES,
        )?;
        let mut entries = Vec::with_capacity(entries_node.len());
        for entry in entries_node {
            entries.push(read_list_entry(entry)?);
        }
        HostResultValue::List {
            logical_path: read_logical_path(
                pick(value_members, "logicalPath", "value")?,
                "value.logicalPath",
            )?,
            entries,
        }
    };

    Ok(HostResultPayload {
        operation_id,
        capability,
        operation,
        outcome: HostResultOutcome::Ok(value),
    })
}

fn read_ready_payload(node: &JsonNode) -> CodecResult<Vec<WorkspaceCapability>> {
    let members = closed_record(node, "ready payload", &["capabilities"])?;
    let items = read_array(
        pick(members, "capabilities", "ready")?,
        "ready.capabilities",
        WorkspaceCapability::ALL.len(),
    )?;
    let mut capabilities = Vec::with_capacity(items.len());
    for item in items {
        capabilities.push(read_enum(
            item,
            "ready.capabilities[]",
            WorkspaceCapability::parse,
        )?);
    }
    for index in 1..capabilities.len() {
        if capabilities[index - 1].as_str() >= capabilities[index].as_str() {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "ready.capabilities 必须去重并按字典序升序",
            );
        }
    }
    Ok(capabilities)
}

pub(crate) fn read_usage(node: &JsonNode) -> CodecResult<TurnUsage> {
    let members = closed_record(
        node,
        "turn usage",
        &[
            "inputTokens",
            "outputTokens",
            "cacheReadTokens",
            "cacheWriteTokens",
            "costUsd",
        ],
    )?;
    Ok(TurnUsage {
        input_tokens: read_nullable_integer(
            pick(members, "inputTokens", "usage")?,
            "usage.inputTokens",
            0,
        )?,
        output_tokens: read_nullable_integer(
            pick(members, "outputTokens", "usage")?,
            "usage.outputTokens",
            0,
        )?,
        cache_read_tokens: read_nullable_integer(
            pick(members, "cacheReadTokens", "usage")?,
            "usage.cacheReadTokens",
            0,
        )?,
        cache_write_tokens: read_nullable_integer(
            pick(members, "cacheWriteTokens", "usage")?,
            "usage.cacheWriteTokens",
            0,
        )?,
        cost_usd: read_nullable_non_negative_number(
            pick(members, "costUsd", "usage")?,
            "usage.costUsd",
        )?,
    })
}

pub(crate) fn read_agent_event_payload(node: &JsonNode) -> CodecResult<AgentProjectionEvent> {
    let probe = require_object(node, "agent_event payload")?;
    let kind = read_enum(
        pick(probe, "kind", "agent_event")?,
        "agent_event.kind",
        |value| match value {
            "assistant_text_delta" => Some(0_u8),
            "assistant_reasoning_delta" => Some(1),
            "tool_started" => Some(2),
            "tool_progress" => Some(3),
            "tool_finished" => Some(4),
            "turn_finished" => Some(5),
            _ => None,
        },
    )?;

    if kind <= 1 {
        let members = closed_record(node, "delta event", &["kind", "delta"])?;
        let delta = read_non_empty_string(
            pick(members, "delta", "event")?,
            "event.delta",
            MAX_DELTA_BYTES,
        )?;
        return Ok(if kind == 0 {
            AgentProjectionEvent::AssistantTextDelta { delta }
        } else {
            AgentProjectionEvent::AssistantReasoningDelta { delta }
        });
    }

    if kind == 2 || kind == 3 {
        let members = closed_record(node, "tool event", &["kind", "toolCallId", "toolName"])?;
        let tool_call_id =
            read_safe_token(pick(members, "toolCallId", "event")?, "event.toolCallId")?;
        let tool_name = read_enum(
            pick(members, "toolName", "event")?,
            "event.toolName",
            ProductToolName::parse,
        )?;
        return Ok(if kind == 2 {
            AgentProjectionEvent::ToolStarted {
                tool_call_id,
                tool_name,
            }
        } else {
            AgentProjectionEvent::ToolProgress {
                tool_call_id,
                tool_name,
            }
        });
    }

    if kind == 4 {
        let members = closed_record(
            node,
            "tool_finished event",
            &["kind", "toolCallId", "toolName", "outcome"],
        )?;
        return Ok(AgentProjectionEvent::ToolFinished {
            tool_call_id: read_safe_token(
                pick(members, "toolCallId", "event")?,
                "event.toolCallId",
            )?,
            tool_name: read_enum(
                pick(members, "toolName", "event")?,
                "event.toolName",
                ProductToolName::parse,
            )?,
            outcome: read_enum(
                pick(members, "outcome", "event")?,
                "event.outcome",
                ToolOutcome::parse,
            )?,
        });
    }

    let members = closed_record(
        node,
        "turn_finished event",
        &[
            "kind",
            "turn",
            "countedTowardTurnLimit",
            "usage",
            "stopReason",
        ],
    )?;
    let turn = read_integer(
        pick(members, "turn", "event")?,
        "event.turn",
        1,
        MAX_SAFE_INTEGER,
    )?;
    let counted_toward_turn_limit = read_boolean(
        pick(members, "countedTowardTurnLimit", "event")?,
        "event.countedTowardTurnLimit",
    )?;
    let usage = read_usage(pick(members, "usage", "event")?)?;
    let stop_reason = read_enum(
        pick(members, "stopReason", "event")?,
        "event.stopReason",
        TurnStopReason::parse,
    )?;

    // 上游合成的零不采信：aborted/error 的回合既不计入限额，usage 也必须全 null。
    let interrupted =
        stop_reason == TurnStopReason::Aborted || stop_reason == TurnStopReason::Error;
    if counted_toward_turn_limit == interrupted {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "aborted/error 回合固定不计入 turn 限额，其余 stopReason 固定计入",
        );
    }
    if interrupted && !usage.is_all_unknown() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "aborted/error 回合的 usage 字段必须全部为 null",
        );
    }

    Ok(AgentProjectionEvent::TurnFinished {
        turn,
        counted_toward_turn_limit,
        usage,
        stop_reason,
    })
}

pub(crate) fn read_budget_view(node: &JsonNode) -> CodecResult<BudgetView> {
    let members = closed_record(
        node,
        "budget",
        &["turns", "usd", "turnLimit", "usdLimit", "stopReason"],
    )?;
    let stop_reason_node = pick(members, "stopReason", "budget")?;
    Ok(BudgetView {
        turns: read_integer(
            pick(members, "turns", "budget")?,
            "budget.turns",
            0,
            MAX_SAFE_INTEGER,
        )?,
        usd: read_nullable_non_negative_number(pick(members, "usd", "budget")?, "budget.usd")?,
        turn_limit: read_enum(
            pick(members, "turnLimit", "budget")?,
            "budget.turnLimit",
            BudgetTurnLimit::parse,
        )?,
        usd_limit: read_enum(
            pick(members, "usdLimit", "budget")?,
            "budget.usdLimit",
            BudgetUsdLimit::parse,
        )?,
        stop_reason: if stop_reason_node.kind_is_null() {
            None
        } else {
            Some(read_enum(
                stop_reason_node,
                "budget.stopReason",
                BudgetStopReason::parse,
            )?)
        },
    })
}

/// Terminal 是可单包验证的优先级投影；这里不猜 bootstrap 阈值，
/// 但绝不接受已经与 ADR-022 六-B.1 优先级相矛盾的组合。
fn validate_terminal_budget(
    status: &str,
    budget: &BudgetView,
    failure_code: Option<TerminalFailureCode>,
) -> CodecResult<()> {
    if budget.usd_limit == BudgetUsdLimit::Unknown && budget.usd.is_some() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "usdLimit 为 unknown 时 usd 必须为 null",
        );
    }
    if matches!(
        budget.usd_limit,
        BudgetUsdLimit::Open | BudgetUsdLimit::Reached
    ) && budget.usd.is_none()
    {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "已知金额限额状态必须携带已知 usd",
        );
    }

    if status == "budget_stopped" {
        if budget.usd_limit == BudgetUsdLimit::Unknown {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "budget_stopped 不得携带 unknown usdLimit",
            );
        }
        if budget.turn_limit == BudgetTurnLimit::Reached {
            if budget.stop_reason != Some(BudgetStopReason::Turns) {
                return reject(
                    ProtocolErrorCode::InvalidSchema,
                    "turnLimit reached 的 budget_stopped 必须以 turns 停止",
                );
            }
            return Ok(());
        }
        if budget.usd_limit != BudgetUsdLimit::Reached
            || budget.stop_reason != Some(BudgetStopReason::Usd)
        {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "非 turn reached 的 budget_stopped 必须由 usd reached 停止",
            );
        }
        return Ok(());
    }

    if status == "failed" && failure_code == Some(TerminalFailureCode::BudgetUnknown) {
        if budget.usd_limit != BudgetUsdLimit::Unknown {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "failed budget_unknown 必须携带 unknown usdLimit",
            );
        }
        return Ok(());
    }
    if status == "failed" && failure_code == Some(TerminalFailureCode::EffectUncertain) {
        return Ok(());
    }

    if budget.turn_limit == BudgetTurnLimit::Reached
        || budget.usd_limit == BudgetUsdLimit::Reached
        || budget.usd_limit == BudgetUsdLimit::Unknown
    {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "此 terminal 不得绕过 effect/budget 优先级",
        );
    }
    Ok(())
}

pub(crate) fn read_terminal_payload(node: &JsonNode) -> CodecResult<Terminal> {
    let probe = require_object(node, "terminal payload")?;
    let status: &'static str = read_enum(
        pick(probe, "status", "terminal")?,
        "terminal.status",
        |value| match value {
            "completed" => Some("completed"),
            "budget_stopped" => Some("budget_stopped"),
            "canceled" => Some("canceled"),
            "failed" => Some("failed"),
            "shutdown" => Some("shutdown"),
            _ => None,
        },
    )?;

    if status == "shutdown" {
        closed_record(node, "shutdown terminal", &["status"])?;
        return Ok(Terminal::Shutdown);
    }

    if status == "canceled" {
        let members = closed_record(node, "canceled terminal", &["status", "reason", "budget"])?;
        let budget = read_budget_view(pick(members, "budget", "terminal")?)?;
        if budget.stop_reason.is_some() {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "非 budget terminal 的 budget.stopReason 必须为 null",
            );
        }
        validate_terminal_budget(status, &budget, None)?;
        return Ok(Terminal::Canceled {
            reason: read_enum(
                pick(members, "reason", "terminal")?,
                "terminal.reason",
                CancelReason::parse,
            )?,
            budget,
        });
    }

    if status == "failed" {
        let members = closed_record(node, "failed terminal", &["status", "error", "budget"])?;
        let error_members = closed_record(
            pick(members, "error", "terminal")?,
            "terminal error",
            &["code", "message", "retryable"],
        )?;
        let budget = read_budget_view(pick(members, "budget", "terminal")?)?;
        if budget.stop_reason.is_some() {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "非 budget terminal 的 budget.stopReason 必须为 null",
            );
        }
        let code = read_enum(
            pick(error_members, "code", "error")?,
            "error.code",
            TerminalFailureCode::parse,
        )?;
        validate_terminal_budget(status, &budget, Some(code))?;
        let retryable = read_boolean(
            pick(error_members, "retryable", "error")?,
            "error.retryable",
        )?;
        if retryable && !code.may_retry() {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "本 failed code 属不可重试闭集，retryable 必须为 false",
            );
        }
        return Ok(Terminal::Failed {
            error: TerminalError {
                code,
                message: read_string(
                    pick(error_members, "message", "error")?,
                    "error.message",
                    MAX_TERMINAL_MESSAGE_BYTES,
                )?,
                retryable,
            },
            budget,
        });
    }

    let members = closed_record(node, "terminal", &["status", "budget"])?;
    let budget = read_budget_view(pick(members, "budget", "terminal")?)?;
    if status == "budget_stopped" {
        if budget.stop_reason.is_none() {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "budget_stopped 必须给出 budget.stopReason",
            );
        }
    } else if budget.stop_reason.is_some() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "非 budget terminal 的 budget.stopReason 必须为 null",
        );
    }
    validate_terminal_budget(status, &budget, None)?;
    Ok(if status == "budget_stopped" {
        Terminal::BudgetStopped { budget }
    } else {
        Terminal::Completed { budget }
    })
}

fn read_protocol_error_payload(node: &JsonNode) -> CodecResult<ProtocolErrorPayload> {
    let members = closed_record(
        node,
        "protocol_error payload",
        &["code", "message", "fatal"],
    )?;
    let fatal = read_boolean(
        pick(members, "fatal", "protocol_error")?,
        "protocol_error.fatal",
    )?;
    if !fatal {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "protocol_error.fatal 恒为 true",
        );
    }
    Ok(ProtocolErrorPayload {
        code: read_enum(
            pick(members, "code", "protocol_error")?,
            "protocol_error.code",
            ProtocolErrorCode::parse,
        )?,
        message: read_string(
            pick(members, "message", "protocol_error")?,
            "protocol_error.message",
            MAX_TERMINAL_MESSAGE_BYTES,
        )?,
    })
}

// ── packet 组装 ──────────────────────────────────────────────────────────────

const NULL_REQUEST_TYPES: &[&str] = &["bootstrap", "ready", "shutdown"];

fn decode_packet_node(node: &JsonNode, direction: Direction) -> CodecResult<ProductPacket> {
    let members = closed_record(
        node,
        "packet",
        &[
            "protocolVersion",
            "seq",
            "sessionId",
            "requestId",
            "type",
            "payload",
        ],
    )?;

    let version_node = pick(members, "protocolVersion", "packet")?;
    match version_node {
        JsonNode::Number { lexeme, value } => {
            if !is_integer_lexeme(lexeme) {
                return reject(
                    ProtocolErrorCode::InvalidSchema,
                    "protocolVersion 必须是规范整数",
                );
            }
            if *value != PROTOCOL_VERSION as f64 {
                return reject(
                    ProtocolErrorCode::UnsupportedVersion,
                    "protocolVersion 不是本协议版本",
                );
            }
        }
        _ => {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "protocolVersion 必须是规范整数",
            )
        }
    }

    let seq = read_integer(pick(members, "seq", "packet")?, "seq", 1, MAX_SAFE_INTEGER)?;

    let JsonNode::Str(type_name) = pick(members, "type", "packet")? else {
        return reject(ProtocolErrorCode::InvalidSchema, "type 必须是字符串");
    };
    let allowed = match direction {
        Direction::Host => HOST_PACKET_TYPES,
        Direction::Sidecar => SIDECAR_PACKET_TYPES,
    };
    if !allowed.contains(&type_name.as_str()) {
        return reject(ProtocolErrorCode::UnknownType, "type 不在本方向的闭集内");
    }

    let session_node = pick(members, "sessionId", "packet")?;
    let session_id = if session_node.kind_is_null() {
        None
    } else {
        Some(read_safe_token(session_node, "sessionId")?)
    };
    if session_id.is_none() && type_name != "protocol_error" {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "sessionId:null 只允许 bootstrap 未成立时的 protocol_error",
        );
    }

    let request_node = pick(members, "requestId", "packet")?;
    let request_id = if request_node.kind_is_null() {
        None
    } else {
        Some(read_safe_token(request_node, "requestId")?)
    };

    if NULL_REQUEST_TYPES.contains(&type_name.as_str()) && request_id.is_some() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本 type 的 requestId 必须为 null",
        );
    }

    let payload_node = pick(members, "payload", "packet")?;
    let payload = match type_name.as_str() {
        "bootstrap" => PacketPayload::Bootstrap(read_bootstrap_payload(payload_node)?),
        "prompt" => PacketPayload::Prompt {
            text: read_prompt_payload(payload_node)?,
        },
        "cancel" => {
            let cancel_members = closed_record(payload_node, "cancel payload", &["reason"])?;
            PacketPayload::Cancel {
                reason: read_enum(
                    pick(cancel_members, "reason", "cancel")?,
                    "cancel.reason",
                    CancelReason::parse,
                )?,
            }
        }
        "host_result" => PacketPayload::HostResult(read_host_result_payload(payload_node)?),
        "shutdown" => {
            let shutdown_members = closed_record(payload_node, "shutdown payload", &["reason"])?;
            read_enum(
                pick(shutdown_members, "reason", "shutdown")?,
                "shutdown.reason",
                |value| {
                    if value == "host_shutdown" {
                        Some(())
                    } else {
                        None
                    }
                },
            )?;
            PacketPayload::Shutdown
        }
        "ready" => PacketPayload::Ready {
            capabilities: read_ready_payload(payload_node)?,
        },
        "agent_event" => PacketPayload::AgentEvent(read_agent_event_payload(payload_node)?),
        "host_request" => PacketPayload::HostRequest(read_host_request_payload(payload_node)?),
        "terminal" => PacketPayload::Terminal(read_terminal_payload(payload_node)?),
        _ => PacketPayload::ProtocolError(read_protocol_error_payload(payload_node)?),
    };

    // requestId 有无由 type（terminal 视 status）决定。
    let requires_request = match &payload {
        PacketPayload::Prompt { .. }
        | PacketPayload::Cancel { .. }
        | PacketPayload::HostResult(_)
        | PacketPayload::AgentEvent(_)
        | PacketPayload::HostRequest(_) => true,
        PacketPayload::Terminal(terminal) => !matches!(terminal, Terminal::Shutdown),
        _ => false,
    };
    if requires_request && request_id.is_none() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本 type 的 requestId 不得为 null",
        );
    }
    if matches!(&payload, PacketPayload::Terminal(Terminal::Shutdown)) && request_id.is_some() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本 type 的 requestId 必须为 null",
        );
    }
    if !matches!(payload, PacketPayload::ProtocolError(_)) && session_id.is_none() {
        return reject(ProtocolErrorCode::InvalidSchema, "sessionId 不得为 null");
    }

    Ok(ProductPacket {
        seq,
        session_id,
        request_id,
        payload,
    })
}

// ── canonical encoder ────────────────────────────────────────────────────────

/// `JSON.stringify` 的字符串转义：控制字符走固定短转义或小写 `\u00xx`，非 ASCII 原样出。
pub(crate) fn write_json_string(out: &mut String, value: &str) {
    out.push('"');
    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{0008}' => out.push_str("\\b"),
            '\u{000c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            ch if (ch as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", ch as u32);
            }
            ch => out.push(ch),
        }
    }
    out.push('"');
}

/// ECMAScript `Number::toString(x, 10)` 的十进制投影。
///
/// Rust 的 `{}` 与 JS 一样输出**最短可回读**十进制，区别只在指数区间：JS 在
/// `|x| >= 1e21` 或 `0 < |x| < 1e-6` 时改用 `1e+21` / `1e-7` 形，Rust 则一路铺平。
/// 不对齐这一段，canonical re-encode 就会在极端 cost 值上与 TS 分叉。
pub(crate) fn format_js_number(value: f64) -> String {
    if value == 0.0 {
        return "0".to_string();
    }
    let abs = value.abs();
    if !(1e-6..1e21).contains(&abs) {
        let mut text = format!("{value:e}");
        if let Some(position) = text.find('e') {
            if text.as_bytes().get(position + 1) != Some(&b'-') {
                text.insert(position + 1, '+');
            }
        }
        return text;
    }
    format!("{value}")
}

struct ObjectWriter<'a> {
    out: &'a mut String,
    first: bool,
}

impl<'a> ObjectWriter<'a> {
    fn start(out: &'a mut String) -> Self {
        out.push('{');
        ObjectWriter { out, first: true }
    }

    fn key(&mut self, key: &str) {
        if self.first {
            self.first = false;
        } else {
            self.out.push(',');
        }
        write_json_string(self.out, key);
        self.out.push(':');
    }

    fn string(&mut self, key: &str, value: &str) {
        self.key(key);
        write_json_string(self.out, value);
    }

    fn integer(&mut self, key: &str, value: u64) {
        self.key(key);
        let _ = write!(self.out, "{value}");
    }

    fn nullable_integer(&mut self, key: &str, value: Option<u64>) {
        self.key(key);
        match value {
            Some(inner) => {
                let _ = write!(self.out, "{inner}");
            }
            None => self.out.push_str("null"),
        }
    }

    fn number(&mut self, key: &str, value: f64) {
        self.key(key);
        self.out.push_str(&format_js_number(value));
    }

    fn nullable_number(&mut self, key: &str, value: Option<f64>) {
        self.key(key);
        match value {
            Some(inner) => self.out.push_str(&format_js_number(inner)),
            None => self.out.push_str("null"),
        }
    }

    fn boolean(&mut self, key: &str, value: bool) {
        self.key(key);
        self.out.push_str(if value { "true" } else { "false" });
    }

    fn null(&mut self, key: &str) {
        self.key(key);
        self.out.push_str("null");
    }

    fn nullable_string(&mut self, key: &str, value: Option<&str>) {
        match value {
            Some(inner) => self.string(key, inner),
            None => self.null(key),
        }
    }

    fn finish(self) {
        self.out.push('}');
    }
}

fn write_usage(out: &mut String, usage: &TurnUsage) {
    let mut object = ObjectWriter::start(out);
    object.nullable_integer("inputTokens", usage.input_tokens);
    object.nullable_integer("outputTokens", usage.output_tokens);
    object.nullable_integer("cacheReadTokens", usage.cache_read_tokens);
    object.nullable_integer("cacheWriteTokens", usage.cache_write_tokens);
    object.nullable_number("costUsd", usage.cost_usd);
    object.finish();
}

pub(crate) fn write_agent_event(out: &mut String, event: &AgentProjectionEvent) {
    match event {
        AgentProjectionEvent::AssistantTextDelta { delta }
        | AgentProjectionEvent::AssistantReasoningDelta { delta } => {
            let mut object = ObjectWriter::start(out);
            object.string("kind", event.kind());
            object.string("delta", delta);
            object.finish();
        }
        AgentProjectionEvent::ToolStarted {
            tool_call_id,
            tool_name,
        }
        | AgentProjectionEvent::ToolProgress {
            tool_call_id,
            tool_name,
        } => {
            let mut object = ObjectWriter::start(out);
            object.string("kind", event.kind());
            object.string("toolCallId", tool_call_id);
            object.string("toolName", tool_name.as_str());
            object.finish();
        }
        AgentProjectionEvent::ToolFinished {
            tool_call_id,
            tool_name,
            outcome,
        } => {
            let mut object = ObjectWriter::start(out);
            object.string("kind", event.kind());
            object.string("toolCallId", tool_call_id);
            object.string("toolName", tool_name.as_str());
            object.string("outcome", outcome.as_str());
            object.finish();
        }
        AgentProjectionEvent::TurnFinished {
            turn,
            counted_toward_turn_limit,
            usage,
            stop_reason,
        } => {
            let mut object = ObjectWriter::start(out);
            object.string("kind", event.kind());
            object.integer("turn", *turn);
            object.boolean("countedTowardTurnLimit", *counted_toward_turn_limit);
            object.key("usage");
            write_usage(object.out, usage);
            object.string("stopReason", stop_reason.as_str());
            object.finish();
        }
    }
}

pub(crate) fn write_budget_view(out: &mut String, budget: &BudgetView) {
    let mut object = ObjectWriter::start(out);
    object.integer("turns", budget.turns);
    object.nullable_number("usd", budget.usd);
    object.string("turnLimit", budget.turn_limit.as_str());
    object.string("usdLimit", budget.usd_limit.as_str());
    match budget.stop_reason {
        Some(reason) => object.string("stopReason", reason.as_str()),
        None => object.null("stopReason"),
    }
    object.finish();
}

pub(crate) fn write_terminal(out: &mut String, terminal: &Terminal) {
    match terminal {
        Terminal::Shutdown => {
            let mut object = ObjectWriter::start(out);
            object.string("status", "shutdown");
            object.finish();
        }
        Terminal::Canceled { reason, budget } => {
            let mut object = ObjectWriter::start(out);
            object.string("status", "canceled");
            object.string("reason", reason.as_str());
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        Terminal::Failed { error, budget } => {
            let mut object = ObjectWriter::start(out);
            object.string("status", "failed");
            object.key("error");
            {
                let mut inner = ObjectWriter::start(object.out);
                inner.string("code", error.code.as_str());
                inner.string("message", &error.message);
                inner.boolean("retryable", error.retryable);
                inner.finish();
            }
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        Terminal::Completed { budget } | Terminal::BudgetStopped { budget } => {
            let mut object = ObjectWriter::start(out);
            object.string("status", terminal.status());
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
    }
}

fn write_host_result(out: &mut String, payload: &HostResultPayload) {
    let mut object = ObjectWriter::start(out);
    object.string("operationId", &payload.operation_id);
    object.string("capability", payload.capability.as_str());
    object.string("operation", payload.operation.as_str());
    match &payload.outcome {
        HostResultOutcome::Ok(value) => {
            object.string("status", "ok");
            object.key("value");
            let mut inner = ObjectWriter::start(object.out);
            match value {
                HostResultValue::Write {
                    logical_path,
                    disposition,
                    content_sha256,
                    byte_length,
                } => {
                    inner.string("logicalPath", logical_path);
                    inner.string("disposition", disposition.as_str());
                    inner.string("contentSha256", content_sha256);
                    inner.integer("byteLength", *byte_length);
                }
                HostResultValue::Exists {
                    logical_path,
                    exists,
                } => {
                    inner.string("logicalPath", logical_path);
                    inner.boolean("exists", *exists);
                }
                HostResultValue::ReadFile {
                    logical_path,
                    content,
                    content_sha256,
                    byte_length,
                } => {
                    inner.string("logicalPath", logical_path);
                    inner.string("content", content);
                    inner.string("contentSha256", content_sha256);
                    inner.integer("byteLength", *byte_length);
                }
                HostResultValue::List {
                    logical_path,
                    entries,
                } => {
                    inner.string("logicalPath", logical_path);
                    inner.key("entries");
                    inner.out.push('[');
                    for (index, entry) in entries.iter().enumerate() {
                        if index > 0 {
                            inner.out.push(',');
                        }
                        let mut item = ObjectWriter::start(inner.out);
                        item.string("name", &entry.name);
                        item.string("kind", entry.kind.as_str());
                        item.nullable_integer("byteLength", entry.byte_length);
                        item.nullable_integer("mtimeMs", entry.mtime_ms);
                        item.finish();
                    }
                    inner.out.push(']');
                }
            }
            inner.finish();
        }
        HostResultOutcome::Denied { code, message } => {
            object.string("status", "denied");
            object.key("error");
            let mut inner = ObjectWriter::start(object.out);
            inner.string("code", code.as_str());
            inner.string("message", message);
            inner.finish();
        }
        HostResultOutcome::Failed { code, message } => {
            object.string("status", "failed");
            object.key("error");
            let mut inner = ObjectWriter::start(object.out);
            inner.string("code", code.as_str());
            inner.string("message", message);
            inner.finish();
        }
        HostResultOutcome::Uncertain { message } => {
            object.string("status", "uncertain");
            object.key("error");
            let mut inner = ObjectWriter::start(object.out);
            inner.string("code", "durability_unknown");
            inner.string("message", message);
            inner.finish();
        }
    }
    object.finish();
}

fn write_payload(out: &mut String, payload: &PacketPayload) {
    match payload {
        PacketPayload::Bootstrap(bootstrap) => {
            let mut object = ObjectWriter::start(out);
            object.string("containerId", &bootstrap.container_id);
            object.string("grantId", &bootstrap.grant_id);
            object.string("caseRoot", &bootstrap.case_root);
            object.key("provider");
            {
                let mut provider = ObjectWriter::start(object.out);
                provider.string("id", "deepseek");
                provider.string("modelId", &bootstrap.provider.model_id);
                provider.string("apiKey", &bootstrap.provider.api_key);
                provider.finish();
            }
            object.key("limits");
            {
                let mut limits = ObjectWriter::start(object.out);
                limits.integer("maxTurns", bootstrap.limits.max_turns);
                limits.nullable_number("maxUsd", bootstrap.limits.max_usd);
                limits.finish();
            }
            object.key("resume");
            {
                let mut resume = ObjectWriter::start(object.out);
                resume.string("kind", bootstrap.resume.kind.as_str());
                resume.integer("leg", bootstrap.resume.leg);
                resume.integer("priorObservedTurns", bootstrap.resume.prior_observed_turns);
                resume.integer("priorTurns", bootstrap.resume.prior_turns);
                resume.nullable_number("priorUsd", bootstrap.resume.prior_usd);
                resume.finish();
            }
            object.finish();
        }
        PacketPayload::Prompt { text } => {
            let mut object = ObjectWriter::start(out);
            object.string("text", text);
            object.finish();
        }
        PacketPayload::Cancel { reason } => {
            let mut object = ObjectWriter::start(out);
            object.string("reason", reason.as_str());
            object.finish();
        }
        PacketPayload::HostResult(payload) => write_host_result(out, payload),
        PacketPayload::Shutdown => {
            let mut object = ObjectWriter::start(out);
            object.string("reason", "host_shutdown");
            object.finish();
        }
        PacketPayload::Ready { capabilities } => {
            let mut object = ObjectWriter::start(out);
            object.key("capabilities");
            object.out.push('[');
            for (index, capability) in capabilities.iter().enumerate() {
                if index > 0 {
                    object.out.push(',');
                }
                write_json_string(object.out, capability.as_str());
            }
            object.out.push(']');
            object.finish();
        }
        PacketPayload::AgentEvent(event) => write_agent_event(out, event),
        PacketPayload::HostRequest(request) => {
            let mut object = ObjectWriter::start(out);
            object.string("operationId", &request.operation_id);
            object.string("proposalHash", &request.proposal_hash);
            object.string("capability", request.capability.as_str());
            object.key("arguments");
            match &request.arguments {
                WorkspaceRequestArguments::Write(arguments) => {
                    let mut inner = ObjectWriter::start(object.out);
                    inner.string("logicalPath", &arguments.logical_path);
                    inner.string("content", &arguments.content);
                    inner.string("contentSha256", &arguments.content_sha256);
                    inner.integer("byteLength", arguments.byte_length);
                    inner.finish();
                }
                WorkspaceRequestArguments::Read(arguments) => {
                    let mut inner = ObjectWriter::start(object.out);
                    inner.string("operation", arguments.operation.as_str());
                    inner.string("logicalPath", &arguments.logical_path);
                    inner.finish();
                }
            }
            object.finish();
        }
        PacketPayload::Terminal(terminal) => write_terminal(out, terminal),
        PacketPayload::ProtocolError(error) => {
            let mut object = ObjectWriter::start(out);
            object.string("code", error.code.as_str());
            object.string("message", &error.message);
            object.boolean("fatal", true);
            object.finish();
        }
    }
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

/// 解一行 packet。`line` 是**不含**结尾 LF 的行内容；framing 预算按 `line + LF` 计。
/// 顺序固定：字节 framing → 行形状 → fatal UTF-8 → 严格 JSON → 闭集校验。
fn decode_packet_line(line: &[u8], direction: Direction) -> CodecResult<ProductPacket> {
    if line.len() + 1 > MAX_PACKET_BYTES {
        return reject(
            ProtocolErrorCode::PacketTooLarge,
            "单 packet 连结尾 LF 超过字节上限",
        );
    }
    if line.is_empty() {
        return reject(ProtocolErrorCode::InvalidJson, "空行不是 packet");
    }
    if line[line.len() - 1] == 0x0d {
        return reject(
            ProtocolErrorCode::InvalidJson,
            "行以 CR 结尾：delimiter 只收单字节 LF，CRLF 不放行",
        );
    }
    if line.len() >= 3 && line[0] == 0xef && line[1] == 0xbb && line[2] == 0xbf {
        return reject(ProtocolErrorCode::InvalidJson, "行带 UTF-8 BOM");
    }
    if line.contains(&LINE_DELIMITER) {
        return reject(ProtocolErrorCode::InvalidJson, "行内出现 LF");
    }
    let Ok(text) = std::str::from_utf8(line) else {
        return reject(
            ProtocolErrorCode::InvalidJson,
            "行不是合法 UTF-8（fatal 解码，不做 U+FFFD 替换）",
        );
    };
    decode_packet_node(&scan_json(text)?, direction)
}

pub(crate) fn decode_host_packet_line(line: &[u8]) -> CodecResult<ProductPacket> {
    decode_packet_line(line, Direction::Host)
}

pub(crate) fn decode_sidecar_packet_line(line: &[u8]) -> CodecResult<ProductPacket> {
    decode_packet_line(line, Direction::Sidecar)
}

/// 编一行 packet：序列化 → **按编码后实际字节**复核 framing → 回灌本 decoder 自检 → 补 LF。
pub(crate) fn encode_packet_line(packet: &ProductPacket) -> CodecResult<Vec<u8>> {
    let mut text = String::new();
    {
        let mut object = ObjectWriter::start(&mut text);
        object.integer("protocolVersion", PROTOCOL_VERSION);
        object.integer("seq", packet.seq);
        object.nullable_string("sessionId", packet.session_id.as_deref());
        object.nullable_string("requestId", packet.request_id.as_deref());
        object.string("type", packet.payload.type_name());
        object.key("payload");
        write_payload(object.out, &packet.payload);
        object.finish();
    }

    let body = text.into_bytes();
    if body.len() + 1 > MAX_PACKET_BYTES {
        return reject(
            ProtocolErrorCode::PacketTooLarge,
            "编码后字节连结尾 LF 超过单 packet 上限",
        );
    }
    // 对端能不能收得下，由同一份 decoder 当场作证，不靠第二份校验器的善意。
    decode_packet_line(&body, packet.payload.direction())?;

    let mut line = body;
    line.push(LINE_DELIMITER);
    Ok(line)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 与 Node 侧共用的 tracked golden。任一侧都不得生成 fixture 后再验证自己。
    const GOLDEN: &[u8] =
        include_bytes!("../../../../packages/pi-lane/fixtures/product-wire-v1.jsonl");

    fn golden_lines() -> Vec<Vec<u8>> {
        let mut lines = Vec::new();
        let mut start = 0;
        for (index, byte) in GOLDEN.iter().enumerate() {
            if *byte == LINE_DELIMITER {
                lines.push(GOLDEN[start..index].to_vec());
                start = index + 1;
            }
        }
        assert_eq!(
            start,
            GOLDEN.len(),
            "golden 必须每行以 LF 结束，末行不得缺 LF"
        );
        lines
    }

    fn decode_either(line: &[u8]) -> (usize, Option<ProductPacket>) {
        let host = decode_host_packet_line(line);
        let sidecar = decode_sidecar_packet_line(line);
        match (host, sidecar) {
            (Ok(packet), Err(_)) => (1, Some(packet)),
            (Err(_), Ok(packet)) => (1, Some(packet)),
            (Ok(_), Ok(_)) => (2, None),
            (Err(_), Err(_)) => (0, None),
        }
    }

    #[test]
    fn golden_every_line_decodes_in_exactly_one_direction_and_reencodes_byte_identical() {
        let lines = golden_lines();
        assert_eq!(lines.len(), 84, "golden 行数变了就说明两侧不再看同一份真源");
        for (index, line) in lines.iter().enumerate() {
            let (successes, packet) = decode_either(line);
            assert_eq!(successes, 1, "第 {} 行必须恰有一个方向解成功", index + 1);
            let packet = packet.expect("恰一方向成功即有 packet");
            let encoded = encode_packet_line(&packet)
                .unwrap_or_else(|error| panic!("第 {} 行重编码失败：{}", index + 1, error.reason));
            let mut expected = line.clone();
            expected.push(LINE_DELIMITER);
            assert_eq!(
                encoded,
                expected,
                "第 {} 行 canonical 重编码与原 bytes 不同",
                index + 1
            );
        }
    }

    #[test]
    fn golden_covers_every_packet_type_and_the_seven_terminal_messages() {
        let lines = golden_lines();
        let packets: Vec<ProductPacket> = lines
            .iter()
            .map(|line| decode_either(line).1.expect("每行恰一方向"))
            .collect();

        for expected in HOST_PACKET_TYPES.iter().chain(SIDECAR_PACKET_TYPES.iter()) {
            assert!(
                packets
                    .iter()
                    .any(|packet| packet.payload.type_name() == *expected),
                "golden 未覆盖 packet type {expected}"
            );
        }

        for code in TerminalFailureCode::ALL {
            assert!(
                packets.iter().any(|packet| matches!(
                    &packet.payload,
                    PacketPayload::Terminal(Terminal::Failed { error, .. })
                        if error.code == *code && error.message == code.message()
                )),
                "golden 未覆盖终态文案 {}",
                code.as_str()
            );
        }
    }

    #[test]
    fn host_and_sidecar_type_sets_are_disjoint() {
        for host in HOST_PACKET_TYPES {
            assert!(
                !SIDECAR_PACKET_TYPES.contains(host),
                "两方向 type 闭集不得相交"
            );
        }
    }

    fn first_line() -> Vec<u8> {
        golden_lines().into_iter().next().expect("golden 非空")
    }

    #[test]
    fn counterexample_crlf_bom_extra_key_and_duplicate_member_all_go_red() {
        let base = first_line();

        let mut crlf = base.clone();
        crlf.push(0x0d);
        assert_eq!(decode_either(&crlf).0, 0, "行尾 CR 必须两向皆拒");

        let mut bom = vec![0xef, 0xbb, 0xbf];
        bom.extend_from_slice(&base);
        assert_eq!(decode_either(&bom).0, 0, "BOM 必须两向皆拒");

        let text = String::from_utf8(base.clone()).expect("golden 是 UTF-8");
        let extra = text.replace(
            "\"type\":\"bootstrap\"",
            "\"extra\":1,\"type\":\"bootstrap\"",
        );
        assert_eq!(
            decode_either(extra.as_bytes()).0,
            0,
            "extra key 必须两向皆拒"
        );

        let duplicated = text.replace("\"seq\":1,", "\"seq\":1,\"seq\":1,");
        assert_eq!(
            decode_either(duplicated.as_bytes()).0,
            0,
            "重复 member 必须两向皆拒"
        );

        let empty: &[u8] = b"";
        assert_eq!(decode_either(empty).0, 0, "空行不是 packet");
    }

    #[test]
    fn counterexample_key_order_and_number_lexeme_drift_break_canonical_bytes() {
        let base = first_line();
        let text = String::from_utf8(base).expect("golden 是 UTF-8");

        // 键序漂移：内容一模一样、只把两枚顶层字段换位。
        let swapped = text.replace(
            "\"seq\":1,\"sessionId\":\"sess-1\"",
            "\"sessionId\":\"sess-1\",\"seq\":1",
        );
        assert_ne!(swapped, text, "换位替换必须真的命中");
        let packet = decode_either(swapped.as_bytes()).1.expect("换位仍可解");
        let encoded = encode_packet_line(&packet).expect("可重编码");
        assert_ne!(
            encoded,
            format!("{swapped}\n").into_bytes(),
            "键序漂移必须让 canonical 判据触红"
        );

        // 数值 lexeme 漂移：`0.5` → `0.50` 仍可解，但重编码不再是同 bytes。
        let usd_line = golden_lines()
            .into_iter()
            .map(|line| String::from_utf8(line).expect("UTF-8"))
            .find(|line| line.contains("\"maxUsd\":0.5"))
            .expect("golden 有 maxUsd:0.5 一行");
        let drifted = usd_line.replace("\"maxUsd\":0.5", "\"maxUsd\":0.50");
        let packet = decode_either(drifted.as_bytes()).1.expect("0.50 仍可解");
        let encoded = encode_packet_line(&packet).expect("可重编码");
        assert_ne!(
            encoded,
            format!("{drifted}\n").into_bytes(),
            "数值 lexeme 漂移必须触红"
        );
        assert_eq!(
            encoded,
            format!("{usd_line}\n").into_bytes(),
            "canonical 形恰是 golden 那一行"
        );
    }

    #[test]
    fn counterexample_integer_lexeme_gate_rejects_exponent_leading_zero_and_negative() {
        // `01` 死在更早一层：JSON number 语法本身不允许前导零，扫描器在 object 未闭合处即报错。
        assert!(
            scan_json("{\"seq\":01}").is_err(),
            "前导零不是合法 JSON number"
        );

        for lexeme in ["1e0", "-1", "1.0", "-0", "1E2", "1.5"] {
            let node = scan_json(&format!("{{\"seq\":{lexeme}}}")).expect("JSON 语法合法");
            let members = require_object(&node, "probe").expect("object");
            let picked = pick(members, "seq", "probe").expect("有 seq");
            assert!(
                read_integer(picked, "seq", 1, MAX_SAFE_INTEGER).is_err(),
                "lexeme {lexeme} 不得当作规范整数"
            );
        }
        let node = scan_json("{\"seq\":9007199254740992}").expect("语法合法");
        let members = require_object(&node, "probe").expect("object");
        assert!(
            read_integer(
                pick(members, "seq", "probe").expect("有"),
                "seq",
                1,
                MAX_SAFE_INTEGER
            )
            .is_err(),
            "超出 MAX_SAFE_INTEGER 必须拒"
        );
    }

    #[test]
    fn counterexample_lone_surrogate_and_nul_escapes_are_rejected() {
        assert!(
            scan_json("\"\\ud83d\"").is_err(),
            "lone high surrogate 必须拒"
        );
        assert!(
            scan_json("\"\\udcce\"").is_err(),
            "lone low surrogate 必须拒"
        );
        assert!(scan_json("\"\\u0000\"").is_err(), "NUL 必须拒");
        let paired = scan_json("\"\\ud83d\\udcce\"").expect("代理对合法");
        assert_eq!(paired, JsonNode::Str("📎".to_string()));
    }

    #[test]
    fn counterexample_terminal_self_consistency_gates_go_red() {
        // budget_stopped 不得携 unknown usdLimit。
        let bad = "{\"protocolVersion\":1,\"seq\":1,\"sessionId\":\"s1\",\"requestId\":\"r1\",\"type\":\"terminal\",\"payload\":{\"status\":\"budget_stopped\",\"budget\":{\"turns\":1,\"usd\":null,\"turnLimit\":\"reached\",\"usdLimit\":\"unknown\",\"stopReason\":\"turns\"}}}";
        assert!(decode_sidecar_packet_line(bad.as_bytes()).is_err());

        // 不可重试闭集不得携 retryable:true。
        let retry = "{\"protocolVersion\":1,\"seq\":1,\"sessionId\":\"s1\",\"requestId\":\"r1\",\"type\":\"terminal\",\"payload\":{\"status\":\"failed\",\"error\":{\"code\":\"invalid_state\",\"message\":\"状态机收到不合法的状态转移\",\"retryable\":true},\"budget\":{\"turns\":1,\"usd\":0,\"turnLimit\":\"open\",\"usdLimit\":\"disabled\",\"stopReason\":null}}}";
        assert!(decode_sidecar_packet_line(retry.as_bytes()).is_err());
    }

    #[test]
    fn js_number_formatting_matches_ecmascript_ranges() {
        assert_eq!(format_js_number(0.0), "0");
        assert_eq!(format_js_number(0.5), "0.5");
        assert_eq!(format_js_number(0.0123), "0.0123");
        assert_eq!(format_js_number(100_000.0), "100000");
        assert_eq!(format_js_number(1e-6), "0.000001");
        assert_eq!(format_js_number(1e-7), "1e-7");
        assert_eq!(format_js_number(1e21), "1e+21");
        assert_eq!(format_js_number(1e20), "100000000000000000000");
    }

    #[test]
    fn oversize_packet_is_rejected_before_parse() {
        let line = vec![b'x'; MAX_PACKET_BYTES];
        let rejection = decode_host_packet_line(&line).expect_err("超限必须拒");
        assert_eq!(rejection.code, ProtocolErrorCode::PacketTooLarge);
    }
}
