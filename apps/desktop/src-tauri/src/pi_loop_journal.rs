//! PI-HOST-LOOP-1 §二.3 / §二.6 / §二.7：app-data 单一 loop journal 的耐久层。
//!
//! 物理落点固定为 `app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl`（ADR-022 六-B），
//! 一行一枚 envelope。本模块承担四件事，并且**只**承担这四件：
//!
//! 1. **envelope 六规则 + 十九型 payload 闭集**。payload 里没有自由 `JsonValue`：effect 家族
//!    （5–10 号）本票不真实生成，但 decoder/replay/fold 一样按逐字段闭集实现——
//!    「尚未发 effect」不是把它留成自由 JSON 的理由。
//! 2. **append + `sync_all` 之后才允许发布**。屏障在这里：调用方拿到 `Ok` 才可以对外投影，
//!    任何 append/sync 失败都必须让 outward publish 停在 0。
//! 3. **partial-tail 截断 vs LF-complete quarantine 的分界**。只有**最后一条未以 LF 结束**的
//!    字节可以截到前一枚 durable LF；已经带 LF 的坏记录一律整份原子搬进 quarantine，
//!    不自动修、不覆盖、不续跑。这条分界最容易被写松，故两侧都留了定向反例。
//! 4. **fold / replay**：session 状态、leg、prior 三值、累计预算、requestId 去重，
//!    以及 ADR-022 六-B 的五步 crash fold。
//!
//! 唯一可确定性补写的半对：journal 最后一条完整记录恰为合法 `agent_event(turn_finished)`
//! 而缺同 request/turn 的 `turn_usage_recorded`。缺口不在尾端、已有重复或不匹配 usage、
//! terminal 已在其后，都**不是** partial-tail，整份 quarantine。

#![allow(dead_code)]

use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::os::unix::fs::MetadataExt;
use std::os::unix::io::AsRawFd;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::pi_loop_protocol::{
    closed_record, format_js_number, pick, read_agent_event_payload, read_boolean,
    read_budget_view, read_enum, read_integer, read_non_negative_number,
    read_nullable_non_negative_number, read_safe_token, read_sha256_hex, read_string, read_usage,
    reject, require_object, scan_json, write_agent_event, write_budget_view, write_json_string,
    AgentProjectionEvent, BudgetStopReason, BudgetTurnLimit, BudgetUsdLimit, BudgetView,
    CancelReason, CodecResult, HostFailureCode, JsonNode, ProtocolErrorCode, TerminalError,
    TerminalFailureCode, TurnStopReason, TurnUsage, WorkspaceCapability, WriteDisposition,
    MAX_SAFE_INTEGER, MAX_TERMINAL_MESSAGE_BYTES, MAX_TEXT_BYTES,
};

/// 容器根目录名。`loop/` 是 ADR-019 的逻辑容器子档，物理上属 ADR-005 的 app-data 状态平面，
/// **不是**用户案件根里的可见文件夹。
pub(crate) const PI_LOOP_DIR: &str = "pi-loop";
pub(crate) const QUARANTINE_DIR: &str = "quarantine";
pub(crate) const JOURNAL_SCHEMA_VERSION: u64 = 1;

pub(crate) const ROUTE_ID: &str = "node22-runtime-sealed-cjs-v1";
pub(crate) const NODE_VERSION: &str = "22.23.1";
/// 本票 sidecar 只看得见虚拟根；物理案件根永不进 journal。
pub(crate) const LOGICAL_CASE_ROOT: &str = "/case";
pub(crate) const PROMPT_ID: &str = "case-read-v1";
pub(crate) const PROVIDER_ID: &str = "deepseek";
/// `session_resumed.startedEventId` 恒指向首枚记录。
pub(crate) const STARTED_EVENT_ID: &str = "event_1";

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

closed_enum!(TargetTriple {
    Aarch64AppleDarwin => "aarch64-apple-darwin",
    X8664AppleDarwin => "x86_64-apple-darwin",
});

closed_enum!(SessionInterruptReason {
    SidecarEnded => "sidecar_ended",
    LifecycleTimeout => "lifecycle_timeout",
});

closed_enum!(CostCoverage { Known => "known", Unknown => "unknown" });

closed_enum!(RuntimeFailureCode {
    ProductSidecarError => "product_sidecar_error",
    UnexpectedEof => "unexpected_eof",
    NonzeroExit => "nonzero_exit",
    Signal => "signal",
    StderrLimit => "stderr_limit",
    LifecycleTimeout => "lifecycle_timeout",
});

closed_enum!(AuthorizationDecision { Approved => "approved", Denied => "denied" });

closed_enum!(AuthorizationDenyCode { UserDenied => "user_denied", PolicyDenied => "policy_denied" });

closed_enum!(JournalType {
    SessionStarted => "session_started",
    SessionResumed => "session_resumed",
    UserPrompted => "user_prompted",
    AgentEvent => "agent_event",
    ToolProposed => "tool_proposed",
    AuthorizationDecided => "authorization_decided",
    EffectStarted => "effect_started",
    EffectSucceeded => "effect_succeeded",
    EffectFailed => "effect_failed",
    EffectUncertain => "effect_uncertain",
    TurnUsageRecorded => "turn_usage_recorded",
    PromptCompleted => "prompt_completed",
    PromptFailed => "prompt_failed",
    PromptCanceled => "prompt_canceled",
    PromptBudgetStopped => "prompt_budget_stopped",
    SessionCompleted => "session_completed",
    SessionBudgetStopped => "session_budget_stopped",
    SessionFailed => "session_failed",
    SessionInterrupted => "session_interrupted",
});

impl JournalType {
    /// `operationId` 只在这六型出现，其余 envelope 必须**没有**该 key。
    fn carries_operation_id(self) -> bool {
        matches!(
            self,
            JournalType::ToolProposed
                | JournalType::AuthorizationDecided
                | JournalType::EffectStarted
                | JournalType::EffectSucceeded
                | JournalType::EffectFailed
                | JournalType::EffectUncertain
        )
    }

    /// session 级事件 `requestId:null`；prompt/turn/agent/effect 事件回对应 request。
    fn session_scoped(self) -> bool {
        matches!(
            self,
            JournalType::SessionStarted
                | JournalType::SessionResumed
                | JournalType::SessionCompleted
                | JournalType::SessionBudgetStopped
                | JournalType::SessionFailed
                | JournalType::SessionInterrupted
        )
    }

    pub(crate) fn is_session_terminal(self) -> bool {
        matches!(
            self,
            JournalType::SessionCompleted
                | JournalType::SessionBudgetStopped
                | JournalType::SessionFailed
        )
    }

    pub(crate) fn is_prompt_terminal(self) -> bool {
        matches!(
            self,
            JournalType::PromptCompleted
                | JournalType::PromptFailed
                | JournalType::PromptCanceled
                | JournalType::PromptBudgetStopped
        )
    }
}

// ── payload ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct SessionStartedPayload {
    pub(crate) route_manifest_sha256: String,
    pub(crate) target_triple: TargetTriple,
    pub(crate) grant_id: String,
    pub(crate) model_id: String,
    pub(crate) max_turns: u64,
    pub(crate) max_usd: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct SessionResumedPayload {
    pub(crate) previous_leg: u64,
    pub(crate) prior_observed_turns: u64,
    pub(crate) prior_turns: u64,
    pub(crate) prior_usd: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ToolProposedPayload {
    pub(crate) tool_call_id: String,
    pub(crate) logical_path: String,
    pub(crate) proposal_hash: String,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
    pub(crate) action: WriteDisposition,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct EffectStartedPayload {
    pub(crate) tool_call_id: String,
    pub(crate) logical_path: String,
    pub(crate) proposal_hash: String,
    pub(crate) action: WriteDisposition,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct EffectSucceededPayload {
    pub(crate) tool_call_id: String,
    pub(crate) logical_path: String,
    pub(crate) disposition: WriteDisposition,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum SessionFailureCause {
    Prompt { prompt_event_id: String },
    Protocol { code: ProtocolErrorCode },
    Runtime { code: RuntimeFailureCode },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum JournalPayload {
    SessionStarted(SessionStartedPayload),
    SessionResumed(SessionResumedPayload),
    UserPrompted {
        text: String,
    },
    AgentEvent(AgentProjectionEvent),
    ToolProposed(ToolProposedPayload),
    AuthorizationDecided {
        tool_call_id: String,
        decision: AuthorizationDecision,
        code: Option<AuthorizationDenyCode>,
    },
    EffectStarted(EffectStartedPayload),
    EffectSucceeded(EffectSucceededPayload),
    EffectFailed {
        tool_call_id: String,
        code: HostFailureCode,
    },
    EffectUncertain {
        tool_call_id: String,
    },
    TurnUsageRecorded {
        turn: u64,
        counted_toward_turn_limit: bool,
        usage: TurnUsage,
        stop_reason: TurnStopReason,
    },
    PromptCompleted {
        budget: BudgetView,
    },
    PromptFailed {
        error: TerminalError,
        budget: BudgetView,
    },
    PromptCanceled {
        reason: CancelReason,
        budget: BudgetView,
    },
    PromptBudgetStopped {
        budget: BudgetView,
    },
    SessionCompleted,
    SessionBudgetStopped {
        prompt_event_id: String,
        budget: BudgetView,
    },
    SessionFailed {
        cause: SessionFailureCause,
    },
    SessionInterrupted {
        reason: SessionInterruptReason,
        cost_coverage: CostCoverage,
    },
}

impl JournalPayload {
    pub(crate) fn journal_type(&self) -> JournalType {
        match self {
            JournalPayload::SessionStarted(_) => JournalType::SessionStarted,
            JournalPayload::SessionResumed(_) => JournalType::SessionResumed,
            JournalPayload::UserPrompted { .. } => JournalType::UserPrompted,
            JournalPayload::AgentEvent(_) => JournalType::AgentEvent,
            JournalPayload::ToolProposed(_) => JournalType::ToolProposed,
            JournalPayload::AuthorizationDecided { .. } => JournalType::AuthorizationDecided,
            JournalPayload::EffectStarted(_) => JournalType::EffectStarted,
            JournalPayload::EffectSucceeded(_) => JournalType::EffectSucceeded,
            JournalPayload::EffectFailed { .. } => JournalType::EffectFailed,
            JournalPayload::EffectUncertain { .. } => JournalType::EffectUncertain,
            JournalPayload::TurnUsageRecorded { .. } => JournalType::TurnUsageRecorded,
            JournalPayload::PromptCompleted { .. } => JournalType::PromptCompleted,
            JournalPayload::PromptFailed { .. } => JournalType::PromptFailed,
            JournalPayload::PromptCanceled { .. } => JournalType::PromptCanceled,
            JournalPayload::PromptBudgetStopped { .. } => JournalType::PromptBudgetStopped,
            JournalPayload::SessionCompleted => JournalType::SessionCompleted,
            JournalPayload::SessionBudgetStopped { .. } => JournalType::SessionBudgetStopped,
            JournalPayload::SessionFailed { .. } => JournalType::SessionFailed,
            JournalPayload::SessionInterrupted { .. } => JournalType::SessionInterrupted,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct JournalRecord {
    pub(crate) event_id: String,
    pub(crate) seq: u64,
    pub(crate) container_id: String,
    pub(crate) session_id: String,
    pub(crate) leg: u64,
    pub(crate) request_id: Option<String>,
    pub(crate) operation_id: Option<String>,
    pub(crate) recorded_at: u64,
    pub(crate) payload: JournalPayload,
}

impl JournalRecord {
    pub(crate) fn journal_type(&self) -> JournalType {
        self.payload.journal_type()
    }
}

// ── 编码 ─────────────────────────────────────────────────────────────────────

struct Obj<'a> {
    out: &'a mut String,
    first: bool,
}

impl<'a> Obj<'a> {
    fn start(out: &'a mut String) -> Self {
        out.push('{');
        Obj { out, first: true }
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
        self.out.push_str(&value.to_string());
    }
    fn boolean(&mut self, key: &str, value: bool) {
        self.key(key);
        self.out.push_str(if value { "true" } else { "false" });
    }
    fn nullable_integer(&mut self, key: &str, value: Option<u64>) {
        self.key(key);
        match value {
            Some(inner) => self.out.push_str(&inner.to_string()),
            None => self.out.push_str("null"),
        }
    }
    fn nullable_number(&mut self, key: &str, value: Option<f64>) {
        self.key(key);
        match value {
            Some(inner) => self.out.push_str(&format_js_number(inner)),
            None => self.out.push_str("null"),
        }
    }
    fn nullable_string(&mut self, key: &str, value: Option<&str>) {
        self.key(key);
        match value {
            Some(inner) => write_json_string(self.out, inner),
            None => self.out.push_str("null"),
        }
    }
    fn finish(self) {
        self.out.push('}');
    }
}

fn write_payload(out: &mut String, payload: &JournalPayload) {
    match payload {
        JournalPayload::SessionStarted(started) => {
            let mut object = Obj::start(out);
            object.string("routeId", ROUTE_ID);
            object.string("routeManifestSha256", &started.route_manifest_sha256);
            object.string("nodeVersion", NODE_VERSION);
            object.string("targetTriple", started.target_triple.as_str());
            object.string("grantId", &started.grant_id);
            object.string("caseRoot", LOGICAL_CASE_ROOT);
            object.string("promptId", PROMPT_ID);
            object.key("provider");
            {
                let mut provider = Obj::start(object.out);
                provider.string("id", PROVIDER_ID);
                provider.string("modelId", &started.model_id);
                provider.finish();
            }
            object.key("limits");
            {
                let mut limits = Obj::start(object.out);
                limits.integer("maxTurns", started.max_turns);
                limits.nullable_number("maxUsd", started.max_usd);
                limits.finish();
            }
            object.key("capabilities");
            object.out.push('[');
            write_json_string(object.out, WorkspaceCapability::CaseRead.as_str());
            object.out.push(']');
            object.finish();
        }
        JournalPayload::SessionResumed(resumed) => {
            let mut object = Obj::start(out);
            object.string("startedEventId", STARTED_EVENT_ID);
            object.integer("previousLeg", resumed.previous_leg);
            object.integer("priorObservedTurns", resumed.prior_observed_turns);
            object.integer("priorTurns", resumed.prior_turns);
            object.nullable_number("priorUsd", resumed.prior_usd);
            object.string("messageContext", "empty");
            object.finish();
        }
        JournalPayload::UserPrompted { text } => {
            let mut object = Obj::start(out);
            object.string("text", text);
            object.finish();
        }
        JournalPayload::AgentEvent(event) => write_agent_event(out, event),
        JournalPayload::ToolProposed(proposed) => {
            let mut object = Obj::start(out);
            object.string("toolCallId", &proposed.tool_call_id);
            object.string("toolName", "write");
            object.string("capability", WorkspaceCapability::WorkspaceWrite.as_str());
            object.string("logicalPath", &proposed.logical_path);
            object.string("proposalHash", &proposed.proposal_hash);
            object.string("contentSha256", &proposed.content_sha256);
            object.integer("byteLength", proposed.byte_length);
            object.string("action", proposed.action.as_str());
            object.finish();
        }
        JournalPayload::AuthorizationDecided {
            tool_call_id,
            decision,
            code,
        } => {
            let mut object = Obj::start(out);
            object.string("toolCallId", tool_call_id);
            object.string("decision", decision.as_str());
            object.nullable_string("code", code.map(AuthorizationDenyCode::as_str));
            object.finish();
        }
        JournalPayload::EffectStarted(started) => {
            let mut object = Obj::start(out);
            object.string("toolCallId", &started.tool_call_id);
            object.string("logicalPath", &started.logical_path);
            object.string("proposalHash", &started.proposal_hash);
            object.string("action", started.action.as_str());
            object.string("contentSha256", &started.content_sha256);
            object.integer("byteLength", started.byte_length);
            object.finish();
        }
        JournalPayload::EffectSucceeded(succeeded) => {
            let mut object = Obj::start(out);
            object.string("toolCallId", &succeeded.tool_call_id);
            object.string("logicalPath", &succeeded.logical_path);
            object.string("disposition", succeeded.disposition.as_str());
            object.string("contentSha256", &succeeded.content_sha256);
            object.integer("byteLength", succeeded.byte_length);
            object.finish();
        }
        JournalPayload::EffectFailed { tool_call_id, code } => {
            let mut object = Obj::start(out);
            object.string("toolCallId", tool_call_id);
            object.string("code", code.as_str());
            object.finish();
        }
        JournalPayload::EffectUncertain { tool_call_id } => {
            let mut object = Obj::start(out);
            object.string("toolCallId", tool_call_id);
            object.string("code", "durability_unknown");
            object.finish();
        }
        JournalPayload::TurnUsageRecorded {
            turn,
            counted_toward_turn_limit,
            usage,
            stop_reason,
        } => {
            let mut object = Obj::start(out);
            object.integer("turn", *turn);
            object.boolean("countedTowardTurnLimit", *counted_toward_turn_limit);
            object.key("usage");
            {
                let mut inner = Obj::start(object.out);
                inner.nullable_integer("inputTokens", usage.input_tokens);
                inner.nullable_integer("outputTokens", usage.output_tokens);
                inner.nullable_integer("cacheReadTokens", usage.cache_read_tokens);
                inner.nullable_integer("cacheWriteTokens", usage.cache_write_tokens);
                inner.nullable_number("costUsd", usage.cost_usd);
                inner.finish();
            }
            object.string("stopReason", stop_reason.as_str());
            object.finish();
        }
        JournalPayload::PromptCompleted { budget } => {
            let mut object = Obj::start(out);
            object.string("status", "completed");
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        JournalPayload::PromptFailed { error, budget } => {
            let mut object = Obj::start(out);
            object.string("status", "failed");
            object.key("error");
            {
                let mut inner = Obj::start(object.out);
                inner.string("code", error.code.as_str());
                inner.string("message", &error.message);
                inner.boolean("retryable", error.retryable);
                inner.finish();
            }
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        JournalPayload::PromptCanceled { reason, budget } => {
            let mut object = Obj::start(out);
            object.string("status", "canceled");
            object.string("reason", reason.as_str());
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        JournalPayload::PromptBudgetStopped { budget } => {
            let mut object = Obj::start(out);
            object.string("status", "budget_stopped");
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        JournalPayload::SessionCompleted => {
            let mut object = Obj::start(out);
            object.string("reason", "host_shutdown");
            object.finish();
        }
        JournalPayload::SessionBudgetStopped {
            prompt_event_id,
            budget,
        } => {
            let mut object = Obj::start(out);
            object.string("promptEventId", prompt_event_id);
            object.key("budget");
            write_budget_view(object.out, budget);
            object.finish();
        }
        JournalPayload::SessionFailed { cause } => {
            let mut object = Obj::start(out);
            object.key("cause");
            {
                let mut inner = Obj::start(object.out);
                match cause {
                    SessionFailureCause::Prompt { prompt_event_id } => {
                        inner.string("kind", "prompt");
                        inner.string("promptEventId", prompt_event_id);
                    }
                    SessionFailureCause::Protocol { code } => {
                        inner.string("kind", "protocol");
                        inner.string("code", code.as_str());
                    }
                    SessionFailureCause::Runtime { code } => {
                        inner.string("kind", "runtime");
                        inner.string("code", code.as_str());
                    }
                }
                inner.finish();
            }
            object.finish();
        }
        JournalPayload::SessionInterrupted {
            reason,
            cost_coverage,
        } => {
            let mut object = Obj::start(out);
            object.string("reason", reason.as_str());
            object.string("costCoverage", cost_coverage.as_str());
            object.finish();
        }
    }
}

/// envelope 顶层字段序即契约序；`operationId` 只在六型出现，其余连 key 都不许有。
pub(crate) fn encode_record(record: &JournalRecord) -> Vec<u8> {
    let mut text = String::new();
    {
        let mut object = Obj::start(&mut text);
        object.integer("schemaVersion", JOURNAL_SCHEMA_VERSION);
        object.string("eventId", &record.event_id);
        object.integer("seq", record.seq);
        object.string("containerId", &record.container_id);
        object.string("sessionId", &record.session_id);
        object.integer("leg", record.leg);
        object.nullable_string("requestId", record.request_id.as_deref());
        if let Some(operation_id) = record.operation_id.as_deref() {
            object.string("operationId", operation_id);
        }
        object.string("type", record.journal_type().as_str());
        object.integer("recordedAt", record.recorded_at);
        object.key("payload");
        write_payload(object.out, &record.payload);
        object.finish();
    }
    let mut bytes = text.into_bytes();
    bytes.push(b'\n');
    bytes
}

// ── 解码 ─────────────────────────────────────────────────────────────────────

fn expect_literal(node: &JsonNode, label: &str, literal: &'static str) -> CodecResult<()> {
    read_enum(node, label, |value| (value == literal).then_some(()))
}

fn read_session_started(node: &JsonNode) -> CodecResult<SessionStartedPayload> {
    let members = closed_record(
        node,
        "session_started payload",
        &[
            "routeId",
            "routeManifestSha256",
            "nodeVersion",
            "targetTriple",
            "grantId",
            "caseRoot",
            "promptId",
            "provider",
            "limits",
            "capabilities",
        ],
    )?;
    expect_literal(
        pick(members, "routeId", "session_started")?,
        "routeId",
        ROUTE_ID,
    )?;
    let route_manifest_sha256 = read_sha256_hex(
        pick(members, "routeManifestSha256", "session_started")?,
        "routeManifestSha256",
    )?;
    expect_literal(
        pick(members, "nodeVersion", "session_started")?,
        "nodeVersion",
        NODE_VERSION,
    )?;
    let target_triple = read_enum(
        pick(members, "targetTriple", "session_started")?,
        "targetTriple",
        TargetTriple::parse,
    )?;
    let grant_id = read_safe_token(pick(members, "grantId", "session_started")?, "grantId")?;
    expect_literal(
        pick(members, "caseRoot", "session_started")?,
        "caseRoot",
        LOGICAL_CASE_ROOT,
    )?;
    expect_literal(
        pick(members, "promptId", "session_started")?,
        "promptId",
        PROMPT_ID,
    )?;

    let provider = closed_record(
        pick(members, "provider", "session_started")?,
        "provider",
        &["id", "modelId"],
    )?;
    expect_literal(
        pick(provider, "id", "provider")?,
        "provider.id",
        PROVIDER_ID,
    )?;
    let model_id = read_string(
        pick(provider, "modelId", "provider")?,
        "provider.modelId",
        256,
    )?;
    if model_id.trim().is_empty() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "provider.modelId trim 后不得为空",
        );
    }

    let limits = closed_record(
        pick(members, "limits", "session_started")?,
        "limits",
        &["maxTurns", "maxUsd"],
    )?;
    let max_turns = read_integer(
        pick(limits, "maxTurns", "limits")?,
        "limits.maxTurns",
        1,
        12,
    )?;
    let max_usd_node = pick(limits, "maxUsd", "limits")?;
    let max_usd = if matches!(max_usd_node, JsonNode::Null) {
        None
    } else {
        Some(read_non_negative_number(
            max_usd_node,
            "limits.maxUsd",
            true,
            Some(100_000.0),
        )?)
    };

    let JsonNode::Array(items) = pick(members, "capabilities", "session_started")? else {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "capabilities 必须是 array",
        );
    };
    if items.len() != 1
        || read_enum(&items[0], "capabilities[]", WorkspaceCapability::parse)?
            != WorkspaceCapability::CaseRead
    {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本票 capabilities 恰为 ['case_read']",
        );
    }

    Ok(SessionStartedPayload {
        route_manifest_sha256,
        target_triple,
        grant_id,
        model_id,
        max_turns,
        max_usd,
    })
}

fn read_session_resumed(node: &JsonNode) -> CodecResult<SessionResumedPayload> {
    let members = closed_record(
        node,
        "session_resumed payload",
        &[
            "startedEventId",
            "previousLeg",
            "priorObservedTurns",
            "priorTurns",
            "priorUsd",
            "messageContext",
        ],
    )?;
    expect_literal(
        pick(members, "startedEventId", "session_resumed")?,
        "startedEventId",
        STARTED_EVENT_ID,
    )?;
    expect_literal(
        pick(members, "messageContext", "session_resumed")?,
        "messageContext",
        "empty",
    )?;
    Ok(SessionResumedPayload {
        previous_leg: read_integer(
            pick(members, "previousLeg", "session_resumed")?,
            "previousLeg",
            1,
            MAX_SAFE_INTEGER,
        )?,
        prior_observed_turns: read_integer(
            pick(members, "priorObservedTurns", "session_resumed")?,
            "priorObservedTurns",
            0,
            MAX_SAFE_INTEGER,
        )?,
        prior_turns: read_integer(
            pick(members, "priorTurns", "session_resumed")?,
            "priorTurns",
            0,
            MAX_SAFE_INTEGER,
        )?,
        prior_usd: read_nullable_non_negative_number(
            pick(members, "priorUsd", "session_resumed")?,
            "priorUsd",
        )?,
    })
}

fn read_terminal_error(node: &JsonNode) -> CodecResult<TerminalError> {
    let members = closed_record(
        node,
        "prompt_failed error",
        &["code", "message", "retryable"],
    )?;
    let code = read_enum(
        pick(members, "code", "error")?,
        "error.code",
        TerminalFailureCode::parse,
    )?;
    let message = read_string(
        pick(members, "message", "error")?,
        "error.message",
        MAX_TERMINAL_MESSAGE_BYTES,
    )?;
    let retryable = read_boolean(pick(members, "retryable", "error")?, "error.retryable")?;
    if retryable && !code.may_retry() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本 failed code 属不可重试闭集，retryable 必须为 false",
        );
    }
    // 七枚终态文案是唯一表；journal 读回来的也必须逐字相同，
    // 否则 replay 就成了「历史文案可以自由漂移」。
    if message != code.message() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "prompt_failed message 必须逐字等于该 code 的唯一文案",
        );
    }
    Ok(TerminalError {
        code,
        message,
        retryable,
    })
}

/// `eventId` 恰为 `event_<seq十进制>`；这里只验形状，与 seq 的对齐在 envelope 层。
fn read_event_id(node: &JsonNode) -> CodecResult<String> {
    let JsonNode::Str(value) = node else {
        return reject(ProtocolErrorCode::InvalidSchema, "eventId 必须是字符串");
    };
    let Some(digits) = value.strip_prefix("event_") else {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "eventId 必须形如 event_<seq>",
        );
    };
    if digits.is_empty()
        || (digits.len() > 1 && digits.starts_with('0'))
        || !digits.bytes().all(|byte| byte.is_ascii_digit())
    {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "eventId 的 seq 必须是规范十进制",
        );
    }
    Ok(value.clone())
}

fn read_payload(journal_type: JournalType, node: &JsonNode) -> CodecResult<JournalPayload> {
    Ok(match journal_type {
        JournalType::SessionStarted => JournalPayload::SessionStarted(read_session_started(node)?),
        JournalType::SessionResumed => JournalPayload::SessionResumed(read_session_resumed(node)?),
        JournalType::UserPrompted => {
            let members = closed_record(node, "user_prompted payload", &["text"])?;
            let text = read_string(
                pick(members, "text", "user_prompted")?,
                "text",
                MAX_TEXT_BYTES,
            )?;
            if text.trim().is_empty() {
                return reject(
                    ProtocolErrorCode::InvalidSchema,
                    "user_prompted.text trim 后不得为空",
                );
            }
            JournalPayload::UserPrompted { text }
        }
        JournalType::AgentEvent => JournalPayload::AgentEvent(read_agent_event_payload(node)?),
        JournalType::ToolProposed => {
            let members = closed_record(
                node,
                "tool_proposed payload",
                &[
                    "toolCallId",
                    "toolName",
                    "capability",
                    "logicalPath",
                    "proposalHash",
                    "contentSha256",
                    "byteLength",
                    "action",
                ],
            )?;
            expect_literal(
                pick(members, "toolName", "tool_proposed")?,
                "toolName",
                "write",
            )?;
            expect_literal(
                pick(members, "capability", "tool_proposed")?,
                "capability",
                "workspace_write",
            )?;
            JournalPayload::ToolProposed(ToolProposedPayload {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "tool_proposed")?,
                    "toolCallId",
                )?,
                logical_path: read_string(
                    pick(members, "logicalPath", "tool_proposed")?,
                    "logicalPath",
                    1_024,
                )?,
                proposal_hash: read_sha256_hex(
                    pick(members, "proposalHash", "tool_proposed")?,
                    "proposalHash",
                )?,
                content_sha256: read_sha256_hex(
                    pick(members, "contentSha256", "tool_proposed")?,
                    "contentSha256",
                )?,
                byte_length: read_integer(
                    pick(members, "byteLength", "tool_proposed")?,
                    "byteLength",
                    0,
                    MAX_TEXT_BYTES as u64,
                )?,
                action: read_enum(
                    pick(members, "action", "tool_proposed")?,
                    "action",
                    WriteDisposition::parse,
                )?,
            })
        }
        JournalType::AuthorizationDecided => {
            let members = closed_record(
                node,
                "authorization_decided payload",
                &["toolCallId", "decision", "code"],
            )?;
            let decision = read_enum(
                pick(members, "decision", "authorization_decided")?,
                "decision",
                AuthorizationDecision::parse,
            )?;
            let code_node = pick(members, "code", "authorization_decided")?;
            let code = if matches!(code_node, JsonNode::Null) {
                None
            } else {
                Some(read_enum(code_node, "code", AuthorizationDenyCode::parse)?)
            };
            // approved↔null，denied↔非 null。
            if (decision == AuthorizationDecision::Approved) != code.is_none() {
                return reject(
                    ProtocolErrorCode::InvalidSchema,
                    "approved 必须携 code:null，denied 必须携具名 code",
                );
            }
            JournalPayload::AuthorizationDecided {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "authorization_decided")?,
                    "toolCallId",
                )?,
                decision,
                code,
            }
        }
        JournalType::EffectStarted => {
            let members = closed_record(
                node,
                "effect_started payload",
                &[
                    "toolCallId",
                    "logicalPath",
                    "proposalHash",
                    "action",
                    "contentSha256",
                    "byteLength",
                ],
            )?;
            JournalPayload::EffectStarted(EffectStartedPayload {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "effect_started")?,
                    "toolCallId",
                )?,
                logical_path: read_string(
                    pick(members, "logicalPath", "effect_started")?,
                    "logicalPath",
                    1_024,
                )?,
                proposal_hash: read_sha256_hex(
                    pick(members, "proposalHash", "effect_started")?,
                    "proposalHash",
                )?,
                action: read_enum(
                    pick(members, "action", "effect_started")?,
                    "action",
                    WriteDisposition::parse,
                )?,
                content_sha256: read_sha256_hex(
                    pick(members, "contentSha256", "effect_started")?,
                    "contentSha256",
                )?,
                byte_length: read_integer(
                    pick(members, "byteLength", "effect_started")?,
                    "byteLength",
                    0,
                    MAX_TEXT_BYTES as u64,
                )?,
            })
        }
        JournalType::EffectSucceeded => {
            let members = closed_record(
                node,
                "effect_succeeded payload",
                &[
                    "toolCallId",
                    "logicalPath",
                    "disposition",
                    "contentSha256",
                    "byteLength",
                ],
            )?;
            JournalPayload::EffectSucceeded(EffectSucceededPayload {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "effect_succeeded")?,
                    "toolCallId",
                )?,
                logical_path: read_string(
                    pick(members, "logicalPath", "effect_succeeded")?,
                    "logicalPath",
                    1_024,
                )?,
                disposition: read_enum(
                    pick(members, "disposition", "effect_succeeded")?,
                    "disposition",
                    WriteDisposition::parse,
                )?,
                content_sha256: read_sha256_hex(
                    pick(members, "contentSha256", "effect_succeeded")?,
                    "contentSha256",
                )?,
                byte_length: read_integer(
                    pick(members, "byteLength", "effect_succeeded")?,
                    "byteLength",
                    0,
                    MAX_TEXT_BYTES as u64,
                )?,
            })
        }
        JournalType::EffectFailed => {
            let members = closed_record(node, "effect_failed payload", &["toolCallId", "code"])?;
            JournalPayload::EffectFailed {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "effect_failed")?,
                    "toolCallId",
                )?,
                code: read_enum(
                    pick(members, "code", "effect_failed")?,
                    "code",
                    HostFailureCode::parse,
                )?,
            }
        }
        JournalType::EffectUncertain => {
            let members = closed_record(node, "effect_uncertain payload", &["toolCallId", "code"])?;
            expect_literal(
                pick(members, "code", "effect_uncertain")?,
                "code",
                "durability_unknown",
            )?;
            JournalPayload::EffectUncertain {
                tool_call_id: read_safe_token(
                    pick(members, "toolCallId", "effect_uncertain")?,
                    "toolCallId",
                )?,
            }
        }
        JournalType::TurnUsageRecorded => {
            let members = closed_record(
                node,
                "turn_usage_recorded payload",
                &["turn", "countedTowardTurnLimit", "usage", "stopReason"],
            )?;
            let turn = read_integer(
                pick(members, "turn", "turn_usage_recorded")?,
                "turn",
                1,
                MAX_SAFE_INTEGER,
            )?;
            let counted_toward_turn_limit = read_boolean(
                pick(members, "countedTowardTurnLimit", "turn_usage_recorded")?,
                "countedTowardTurnLimit",
            )?;
            let usage = read_usage(pick(members, "usage", "turn_usage_recorded")?)?;
            let stop_reason = read_enum(
                pick(members, "stopReason", "turn_usage_recorded")?,
                "stopReason",
                TurnStopReason::parse,
            )?;
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
            JournalPayload::TurnUsageRecorded {
                turn,
                counted_toward_turn_limit,
                usage,
                stop_reason,
            }
        }
        JournalType::PromptCompleted => {
            let members = closed_record(node, "prompt_completed payload", &["status", "budget"])?;
            expect_literal(
                pick(members, "status", "prompt_completed")?,
                "status",
                "completed",
            )?;
            JournalPayload::PromptCompleted {
                budget: read_budget_view(pick(members, "budget", "prompt_completed")?)?,
            }
        }
        JournalType::PromptFailed => {
            let members = closed_record(
                node,
                "prompt_failed payload",
                &["status", "error", "budget"],
            )?;
            expect_literal(
                pick(members, "status", "prompt_failed")?,
                "status",
                "failed",
            )?;
            JournalPayload::PromptFailed {
                error: read_terminal_error(pick(members, "error", "prompt_failed")?)?,
                budget: read_budget_view(pick(members, "budget", "prompt_failed")?)?,
            }
        }
        JournalType::PromptCanceled => {
            let members = closed_record(
                node,
                "prompt_canceled payload",
                &["status", "reason", "budget"],
            )?;
            expect_literal(
                pick(members, "status", "prompt_canceled")?,
                "status",
                "canceled",
            )?;
            JournalPayload::PromptCanceled {
                reason: read_enum(
                    pick(members, "reason", "prompt_canceled")?,
                    "reason",
                    CancelReason::parse,
                )?,
                budget: read_budget_view(pick(members, "budget", "prompt_canceled")?)?,
            }
        }
        JournalType::PromptBudgetStopped => {
            let members =
                closed_record(node, "prompt_budget_stopped payload", &["status", "budget"])?;
            expect_literal(
                pick(members, "status", "prompt_budget_stopped")?,
                "status",
                "budget_stopped",
            )?;
            JournalPayload::PromptBudgetStopped {
                budget: read_budget_view(pick(members, "budget", "prompt_budget_stopped")?)?,
            }
        }
        JournalType::SessionCompleted => {
            let members = closed_record(node, "session_completed payload", &["reason"])?;
            expect_literal(
                pick(members, "reason", "session_completed")?,
                "reason",
                "host_shutdown",
            )?;
            JournalPayload::SessionCompleted
        }
        JournalType::SessionBudgetStopped => {
            let members = closed_record(
                node,
                "session_budget_stopped payload",
                &["promptEventId", "budget"],
            )?;
            JournalPayload::SessionBudgetStopped {
                prompt_event_id: read_event_id(pick(
                    members,
                    "promptEventId",
                    "session_budget_stopped",
                )?)?,
                budget: read_budget_view(pick(members, "budget", "session_budget_stopped")?)?,
            }
        }
        JournalType::SessionFailed => {
            let members = closed_record(node, "session_failed payload", &["cause"])?;
            let cause_node = pick(members, "cause", "session_failed")?;
            let probe = require_object(cause_node, "cause")?;
            let kind: &'static str = read_enum(
                pick(probe, "kind", "cause")?,
                "cause.kind",
                |value| match value {
                    "prompt" => Some("prompt"),
                    "protocol" => Some("protocol"),
                    "runtime" => Some("runtime"),
                    _ => None,
                },
            )?;
            let cause = match kind {
                "prompt" => {
                    let cause_members =
                        closed_record(cause_node, "cause", &["kind", "promptEventId"])?;
                    SessionFailureCause::Prompt {
                        prompt_event_id: read_event_id(pick(
                            cause_members,
                            "promptEventId",
                            "cause",
                        )?)?,
                    }
                }
                "protocol" => {
                    let cause_members = closed_record(cause_node, "cause", &["kind", "code"])?;
                    SessionFailureCause::Protocol {
                        code: read_enum(
                            pick(cause_members, "code", "cause")?,
                            "cause.code",
                            ProtocolErrorCode::parse,
                        )?,
                    }
                }
                _ => {
                    let cause_members = closed_record(cause_node, "cause", &["kind", "code"])?;
                    SessionFailureCause::Runtime {
                        code: read_enum(
                            pick(cause_members, "code", "cause")?,
                            "cause.code",
                            RuntimeFailureCode::parse,
                        )?,
                    }
                }
            };
            JournalPayload::SessionFailed { cause }
        }
        JournalType::SessionInterrupted => {
            let members = closed_record(
                node,
                "session_interrupted payload",
                &["reason", "costCoverage"],
            )?;
            JournalPayload::SessionInterrupted {
                reason: read_enum(
                    pick(members, "reason", "session_interrupted")?,
                    "reason",
                    SessionInterruptReason::parse,
                )?,
                cost_coverage: read_enum(
                    pick(members, "costCoverage", "session_interrupted")?,
                    "costCoverage",
                    CostCoverage::parse,
                )?,
            }
        }
    })
}

pub(crate) fn decode_record(line: &[u8]) -> CodecResult<JournalRecord> {
    let Ok(text) = std::str::from_utf8(line) else {
        return reject(ProtocolErrorCode::InvalidJson, "journal 行不是合法 UTF-8");
    };
    let node = scan_json(text)?;
    let probe = require_object(&node, "journal record")?;
    let journal_type = read_enum(
        pick(probe, "type", "journal record")?,
        "type",
        JournalType::parse,
    )?;

    let mut keys: Vec<&str> = vec![
        "schemaVersion",
        "eventId",
        "seq",
        "containerId",
        "sessionId",
        "leg",
        "requestId",
        "type",
        "recordedAt",
        "payload",
    ];
    if journal_type.carries_operation_id() {
        keys.push("operationId");
    }
    let members = closed_record(&node, "journal record", &keys)?;

    read_integer(
        pick(members, "schemaVersion", "journal record")?,
        "schemaVersion",
        1,
        1,
    )?;
    let seq = read_integer(
        pick(members, "seq", "journal record")?,
        "seq",
        1,
        MAX_SAFE_INTEGER,
    )?;
    let event_id = read_event_id(pick(members, "eventId", "journal record")?)?;
    if event_id != format!("event_{seq}") {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "eventId 必须恰为 event_<seq十进制>",
        );
    }
    let container_id = read_safe_token(
        pick(members, "containerId", "journal record")?,
        "containerId",
    )?;
    let session_id = read_safe_token(pick(members, "sessionId", "journal record")?, "sessionId")?;
    let leg = read_integer(
        pick(members, "leg", "journal record")?,
        "leg",
        1,
        MAX_SAFE_INTEGER,
    )?;
    let recorded_at = read_integer(
        pick(members, "recordedAt", "journal record")?,
        "recordedAt",
        0,
        MAX_SAFE_INTEGER,
    )?;

    let request_node = pick(members, "requestId", "journal record")?;
    let request_id = if matches!(request_node, JsonNode::Null) {
        None
    } else {
        Some(read_safe_token(request_node, "requestId")?)
    };
    if journal_type.session_scoped() != request_id.is_none() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "session 级事件 requestId 必须为 null，其余必须回对应 request",
        );
    }

    let operation_id = if journal_type.carries_operation_id() {
        Some(read_safe_token(
            pick(members, "operationId", "journal record")?,
            "operationId",
        )?)
    } else {
        None
    };

    let payload = read_payload(journal_type, pick(members, "payload", "journal record")?)?;

    Ok(JournalRecord {
        event_id,
        seq,
        container_id,
        session_id,
        leg,
        request_id,
        operation_id,
        recorded_at,
        payload,
    })
}

// ── 目录与耐久原语 ───────────────────────────────────────────────────────────

#[derive(Debug)]
pub(crate) enum JournalError {
    /// container/session token 不是 SafeToken。
    InvalidRef,
    /// 底层 I/O 失败（含 append/sync/rename），fail-closed。绝不携带物理路径。
    Io(&'static str),
    /// journal 结构/身份/次序坏了且已 LF 结束——整份 quarantine 后拒绝续跑。
    Quarantined {
        reason: &'static str,
        target_sha256: String,
    },
    /// quarantine 本身失败：目标已存在、路径不是 owned regular directory 等，一律 fail closed。
    QuarantineRefused(&'static str),
    /// 同一 logical session 已有 live 写者持有独占 advisory lock（PI-HOST-LOOP-1R R8）。
    SessionActive,
}

impl JournalError {
    pub(crate) fn code(&self) -> &'static str {
        match self {
            JournalError::InvalidRef => "invalid_ref",
            JournalError::Io(_) => "io",
            JournalError::Quarantined { .. } => "quarantined",
            JournalError::QuarantineRefused(_) => "quarantine_refused",
            JournalError::SessionActive => "session_active",
        }
    }
}

fn io(context: &'static str) -> JournalError {
    JournalError::Io(context)
}

pub(crate) fn container_dir(root: &Path, container_id: &str) -> PathBuf {
    root.join(PI_LOOP_DIR).join(container_id)
}

pub(crate) fn journal_path(root: &Path, container_id: &str, session_id: &str) -> PathBuf {
    container_dir(root, container_id).join(format!("{session_id}.jsonl"))
}

pub(crate) fn is_safe_container_token(token: &str) -> bool {
    crate::pi_loop_protocol::is_safe_token(token)
}

/// 每级都必须 lstat 为 **owned regular directory、非 symlink**。
/// 这是 quarantine 与 delete 的共同前置：路径上任一环节被换成链接就整条拒绝。
pub(crate) fn assert_owned_directory(path: &Path) -> Result<(), JournalError> {
    let metadata = fs::symlink_metadata(path).map_err(|_| io("lstat 目录失败"))?;
    if metadata.file_type().is_symlink() {
        return Err(JournalError::QuarantineRefused("路径上出现 symlink"));
    }
    if !metadata.is_dir() {
        return Err(JournalError::QuarantineRefused("路径上出现非目录实体"));
    }
    // SAFETY: `geteuid` 无参数、无副作用、恒成功。
    let euid = unsafe { libc::geteuid() };
    if metadata.uid() != euid {
        return Err(JournalError::QuarantineRefused("目录不属当前用户"));
    }
    Ok(())
}

pub(crate) fn sync_directory(path: &Path) -> Result<(), JournalError> {
    let handle = File::open(path).map_err(|_| io("打开目录失败"))?;
    handle.sync_all().map_err(|_| io("同步目录项失败"))
}

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let mut out = String::with_capacity(64);
    for byte in hasher.finalize() {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

// ── 单写者独占锁（PI-HOST-LOOP-1R R8）───────────────────────────────────────

/// session 锁文件的后缀。锁文件与 journal 同级同名，住在既有
/// `app_data_dir()/pi-loop/<containerId>/` 层级内，不新增顶层目录。
pub(crate) const SESSION_LOCK_SUFFIX: &str = ".lock";

pub(crate) fn session_lock_path(root: &Path, container_id: &str, session_id: &str) -> PathBuf {
    container_dir(root, container_id).join(format!("{session_id}.jsonl{SESSION_LOCK_SUFFIX}"))
}

/// 同一 logical session 的 journal 的 OS 级独占 advisory lock，随 Host 持有至 teardown。
///
/// 用 `flock` 而不是 `fcntl` 记录锁：`fcntl` 锁按**进程**归属，同进程的第二把总能拿到，
/// 对「同一宿主里起第二枚 Host」零区分力；`flock` 按 **open file description** 归属，
/// 同进程不同 fd 之间同样冲突——第二枚 Host 因此拿不到，正是本条要的语义。
///
/// 锁文件本身只是句柄载体：它的路径与内容都**不进**模型、journal 或 error 正文。
#[derive(Debug)]
pub(crate) struct SessionLock {
    handle: File,
}

impl SessionLock {
    /// 非阻塞取锁。已被别的 open file description 持有即 {@link JournalError::SessionActive}。
    fn acquire(path: &Path) -> Result<SessionLock, JournalError> {
        let handle = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)
            .map_err(|_| io("打开 session 锁失败"))?;
        // SAFETY: 只对本函数刚打开、且由返回值独占持有的 fd 调用 flock，无别名。
        if unsafe { libc::flock(handle.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            let errno = std::io::Error::last_os_error().raw_os_error();
            return match errno {
                Some(libc::EWOULDBLOCK) => Err(JournalError::SessionActive),
                _ => Err(io("取 session 锁失败")),
            };
        }
        Ok(SessionLock { handle })
    }

    /// 探测某 session 当前是否有 live 写者。取得即立刻释放，不改任何字节。
    fn probe(path: &Path) -> Result<bool, JournalError> {
        match SessionLock::acquire(path) {
            Ok(lock) => {
                drop(lock);
                Ok(false)
            }
            Err(JournalError::SessionActive) => Ok(true),
            Err(other) => Err(other),
        }
    }
}

impl Drop for SessionLock {
    fn drop(&mut self) {
        // SAFETY: fd 由本结构独占持有；close 也会隐式解锁，这里显式解一次让语义可读。
        unsafe {
            libc::flock(self.handle.as_raw_fd(), libc::LOCK_UN);
        }
    }
}

/// 某 container 下是否仍有 live session。`delete_container` 的 active 判定由此而来，
/// 与单写者锁**同源**——不另立进程内登记册，那会是第二个可漂移的真源。
pub(crate) fn container_has_live_session(
    root: &Path,
    container_id: &str,
) -> Result<bool, JournalError> {
    let container = container_dir(root, container_id);
    let entries = match fs::read_dir(&container) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => return Err(io("枚举 container 失败")),
    };
    for entry in entries {
        let path = entry.map_err(|_| io("枚举 container 项失败"))?.path();
        let is_lock = path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.ends_with(SESSION_LOCK_SUFFIX));
        if is_lock && SessionLock::probe(&path)? {
            return Ok(true);
        }
    }
    Ok(false)
}

// ── Journal 句柄 ─────────────────────────────────────────────────────────────

/// 单 session 的 append-only 句柄。**发布前必须 append + `sync_all`**：本类型就是那条屏障。
#[derive(Debug)]
pub(crate) struct Journal {
    root: PathBuf,
    container_id: String,
    session_id: String,
    file: Option<File>,
    next_seq: u64,
    leg: u64,
    last_recorded_at: u64,
    /// 时钟注入面：production 恒为 `None`（走真实 wall clock），测试用它锁定 recordedAt。
    clock: Option<u64>,
    /// **测试专用**耐久失败注入：production 没有 setter，恒为 `None`。
    /// mid-stream 的 `sync_all` 失败在便携层面造不出来，只能由这个 seam 证明
    /// 「append/sync 失败 → outward publish 为 0」。
    fail_append_from: Option<u64>,
}

impl Journal {
    pub(crate) fn container_id(&self) -> &str {
        &self.container_id
    }
    pub(crate) fn session_id(&self) -> &str {
        &self.session_id
    }
    pub(crate) fn leg(&self) -> u64 {
        self.leg
    }
    pub(crate) fn next_seq(&self) -> u64 {
        self.next_seq
    }
    pub(crate) fn path(&self) -> PathBuf {
        journal_path(&self.root, &self.container_id, &self.session_id)
    }

    #[cfg(test)]
    pub(crate) fn inject_append_failure_from(&mut self, seq: u64) {
        self.fail_append_from = Some(seq);
    }

    pub(crate) fn set_leg(&mut self, leg: u64) {
        self.leg = leg;
    }

    fn now_millis(&self) -> u64 {
        if let Some(fixed) = self.clock {
            return fixed.max(self.last_recorded_at);
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|delta| delta.as_millis())
            .unwrap_or(0);
        let clamped = u64::try_from(now)
            .unwrap_or(MAX_SAFE_INTEGER)
            .min(MAX_SAFE_INTEGER);
        // recordedAt 只承诺按 journal 次序**非递减**；系统时钟回拨不得让它倒退。
        clamped.max(self.last_recorded_at)
    }

    /// 纯构造：按当前 `next_seq` / `leg` / 时钟做出**将要落盘的那一枚 record**。
    /// 不写盘、不动计数——`eventId` 与 `seq` 的对应关系只有这一处，计划相与落账相同源。
    fn stage(
        &self,
        request_id: Option<&str>,
        operation_id: Option<&str>,
        payload: JournalPayload,
    ) -> JournalRecord {
        let seq = self.next_seq;
        JournalRecord {
            event_id: format!("event_{seq}"),
            seq,
            container_id: self.container_id.clone(),
            session_id: self.session_id.clone(),
            leg: self.leg,
            request_id: request_id.map(str::to_string),
            operation_id: operation_id.map(str::to_string),
            recorded_at: self.now_millis(),
            payload,
        }
    }

    /// 认领一枚已 stage 的 record：只前移内存计数，不写盘。
    /// 计划相靠它连续 stage 出多枚**互相引用**的 record（如 `promptEventId`）。
    fn claim(&mut self, record: &JournalRecord) {
        self.next_seq = record.seq + 1;
        self.last_recorded_at = record.recorded_at;
    }

    /// 把一枚已 stage 的 record 落盘并 `sync_all`。
    fn write_staged(&mut self, record: &JournalRecord) -> Result<(), JournalError> {
        if self.fail_append_from.is_some_and(|from| record.seq >= from) {
            return Err(io("注入的 append 失败"));
        }
        let line = encode_record(record);
        let file = self
            .file
            .as_mut()
            .ok_or(JournalError::Io("journal 句柄已关闭"))?;
        file.write_all(&line).map_err(|_| io("写入 journal 失败"))?;
        // 屏障：macOS 上 Rust std 的 `sync_all` 走 `fcntl(F_FULLFSYNC)`（同 work_state.rs 之注）。
        file.sync_all().map_err(|_| io("同步 journal 失败"))?;
        Ok(())
    }

    /// append 一枚 record 并 `sync_all`。返回 `Ok` 之前调用方**不得**对外发布任何东西。
    ///
    /// 写盘失败时计数一枚都不前移——失败的那一枚 seq 留给下一次。
    pub(crate) fn append(
        &mut self,
        request_id: Option<&str>,
        operation_id: Option<&str>,
        payload: JournalPayload,
    ) -> Result<JournalRecord, JournalError> {
        let record = self.stage(request_id, operation_id, payload);
        self.write_staged(&record)?;
        self.claim(&record);
        Ok(record)
    }

    /// 计划相的 append：**只**构造并认领，落盘留给 `PlannedSession::apply`。
    fn plan_append(
        &mut self,
        request_id: Option<&str>,
        operation_id: Option<&str>,
        payload: JournalPayload,
    ) -> JournalRecord {
        let record = self.stage(request_id, operation_id, payload);
        self.claim(&record);
        record
    }
}

// ── 载入、校验、补写与 fold ─────────────────────────────────────────────────

#[derive(Debug)]
pub(crate) struct LoadedJournal {
    pub(crate) journal: Journal,
    /// 单写者独占锁。调用方必须持有它直到 teardown——放掉即交出写权（R8）。
    pub(crate) lock: SessionLock,
    pub(crate) records: Vec<JournalRecord>,
    pub(crate) projection: SessionProjection,
    /// 本次载入是否截断过 partial tail（诊断用，不进 journal）。
    pub(crate) truncated_partial_tail: bool,
    /// 本次载入是否补写过唯一的 turn usage 半对。
    pub(crate) repaired_turn_usage: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ActivePrompt {
    pub(crate) request_id: String,
    pub(crate) prompt_event_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct SessionProjection {
    pub(crate) started: Option<SessionStartedPayload>,
    /// 最后一枚已开的 leg。
    pub(crate) leg: u64,
    pub(crate) next_seq: u64,
    pub(crate) last_recorded_at: u64,
    /// observed upstream turn ordinal 的最大值。
    pub(crate) prior_observed_turns: u64,
    /// 只数 `countedTowardTurnLimit:true`。
    pub(crate) prior_turns: u64,
    /// 任一回合费用未知即为 `None`；`None` 绝不得被恢复成 0。
    pub(crate) prior_usd: Option<f64>,
    pub(crate) request_ids: HashSet<String>,
    pub(crate) session_terminal: Option<JournalType>,
    pub(crate) leg_open: bool,
    pub(crate) active_prompt: Option<ActivePrompt>,
    /// 最后一枚 leg 关闭是 `session_interrupted`——resume 的前置。
    pub(crate) interrupted: bool,
}

impl SessionProjection {
    fn empty() -> Self {
        SessionProjection {
            started: None,
            leg: 0,
            next_seq: 1,
            last_recorded_at: 0,
            prior_observed_turns: 0,
            prior_turns: 0,
            prior_usd: Some(0.0),
            request_ids: HashSet::new(),
            session_terminal: None,
            leg_open: false,
            active_prompt: None,
            interrupted: false,
        }
    }

    pub(crate) fn is_closed(&self) -> bool {
        self.session_terminal.is_some()
    }
}

fn open_append(path: &Path) -> Result<File, JournalError> {
    OpenOptions::new()
        .append(true)
        .create(true)
        .open(path)
        .map_err(|_| io("打开 journal 失败"))
}

fn ensure_owned_directory(path: &Path) -> Result<(), JournalError> {
    match fs::symlink_metadata(path) {
        Ok(_) => assert_owned_directory(path),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            fs::create_dir(path).map_err(|_| io("创建 quarantine 目录失败"))?;
            sync_directory(path)?;
            assert_owned_directory(path)
        }
        Err(_) => Err(io("lstat quarantine 目录失败")),
    }
}

/// 已 LF 结束的坏 journal：整份原子搬进
/// `pi-loop/<containerId>/quarantine/<sessionId>/<sha256-of-original-bytes>.jsonl`。
///
/// 次序即语义：关 active handle → 逐级 lstat owned regular dir → 建目录并 sync → 目标不存在 →
/// rename → 重开目标并 sync → sync 两级 parent（另加 container，因为 rename 也从那里摘掉了目录项）。
/// 目标已存在同样 fail closed，绝不覆盖。
fn quarantine_session(
    root: &Path,
    container_id: &str,
    session_id: &str,
    handle: &mut Option<File>,
    original: &[u8],
    reason: &'static str,
) -> JournalError {
    // 先关闭 active handle：仍持有可写 fd 时搬文件，等于允许搬走之后还能写回去。
    *handle = None;

    let container = container_dir(root, container_id);
    if let Err(error) = assert_owned_directory(&container) {
        return error;
    }
    let quarantine_root = container.join(QUARANTINE_DIR);
    if let Err(error) = ensure_owned_directory(&quarantine_root) {
        return error;
    }
    let session_root = quarantine_root.join(session_id);
    if let Err(error) = ensure_owned_directory(&session_root) {
        return error;
    }

    let digest = sha256_hex(original);
    let target = session_root.join(format!("{digest}.jsonl"));
    if fs::symlink_metadata(&target).is_ok() {
        return JournalError::QuarantineRefused("quarantine 目标已存在，拒绝覆盖");
    }

    let source = journal_path(root, container_id, session_id);
    if fs::rename(&source, &target).is_err() {
        return JournalError::QuarantineRefused("quarantine rename 失败");
    }
    match File::open(&target) {
        Ok(file) => {
            if file.sync_all().is_err() {
                return JournalError::QuarantineRefused("quarantine 目标同步失败");
            }
        }
        Err(_) => return JournalError::QuarantineRefused("quarantine 目标重开失败"),
    }
    for parent in [&session_root, &quarantine_root, &container] {
        if let Err(error) = sync_directory(parent) {
            return error;
        }
    }
    JournalError::Quarantined {
        reason,
        target_sha256: digest,
    }
}

struct StructureProblem(&'static str);

/// envelope 六规则 + 身份/leg/request/次序校验。返回 `Err` 即整份 quarantine。
fn validate_records(
    records: &[JournalRecord],
    container_id: &str,
    session_id: &str,
) -> Result<(), StructureProblem> {
    let mut last_recorded_at = 0_u64;
    let mut leg = 0_u64;
    let mut leg_open = false;
    let mut session_closed = false;
    let mut seen_requests: HashSet<String> = HashSet::new();
    let mut open_requests: HashSet<String> = HashSet::new();
    // resume 的 prior 三值要与**前序**记录的 fold 逐值比对，故边走边算一份同口径的 fold
    // （与 {@link fold} 同序、同运算，因此浮点也逐位相同）。
    let mut observed_turns = 0_u64;
    let mut counted_turns = 0_u64;
    let mut usd_total = 0.0_f64;
    let mut cost_known = true;
    // observed upstream turn 的连续性游标（PI-HOST-LOOP-1R2 C3）。0 表示尚未观察到任何回合。
    let mut last_observed_turn = 0_u64;

    for (expected_seq, record) in (1_u64..).zip(records.iter()) {
        if session_closed {
            return Err(StructureProblem("session 终态之后仍有记录"));
        }
        if record.seq != expected_seq {
            return Err(StructureProblem("event seq 必须从 1 起逐枚递增"));
        }
        if record.event_id != format!("event_{}", record.seq) {
            return Err(StructureProblem("eventId 必须恰为 event_<seq>"));
        }
        if record.container_id != container_id || record.session_id != session_id {
            return Err(StructureProblem("身份漂移：container/session 与请求不符"));
        }
        if record.recorded_at < last_recorded_at {
            return Err(StructureProblem("recordedAt 必须按 journal 次序非递减"));
        }

        let journal_type = record.journal_type();
        match &record.payload {
            JournalPayload::SessionStarted(_) => {
                if record.seq != 1 || record.leg != 1 {
                    return Err(StructureProblem("session_started 只能是 leg 1 的首枚记录"));
                }
                leg = 1;
                leg_open = true;
            }
            JournalPayload::SessionResumed(resumed) => {
                if leg_open {
                    return Err(StructureProblem("上一 leg 未闭合就出现 session_resumed"));
                }
                if record.leg != leg + 1 || resumed.previous_leg != leg {
                    return Err(StructureProblem("resume 的 leg 必须恰为 previous+1"));
                }
                // 只核 previousLeg 是不够的：prior 三值同样是耐久真值，篡改任一枚都能把
                // 累计预算改小、把已用满的 session 洗成还能跑（R8 之前的 R7 病灶）。
                let prior_usd = if cost_known { Some(usd_total) } else { None };
                if resumed.prior_observed_turns != observed_turns
                    || resumed.prior_turns != counted_turns
                    || resumed.prior_usd != prior_usd
                {
                    return Err(StructureProblem(
                        "session_resumed 的 prior 三值必须逐值等于前序 fold",
                    ));
                }
                leg = record.leg;
                leg_open = true;
            }
            _ => {
                if !leg_open {
                    return Err(StructureProblem("leg 未开就出现事件"));
                }
                if record.leg != leg {
                    return Err(StructureProblem("记录的 leg 与当前 leg 不符"));
                }
            }
        }

        if let Some(request_id) = record.request_id.as_deref() {
            if journal_type == JournalType::UserPrompted {
                // 跨 leg 的 requestId 去重由持有 durable journal 的这一侧独占。
                if !seen_requests.insert(request_id.to_string()) {
                    return Err(StructureProblem("同一 requestId 在 logical session 内重复"));
                }
                open_requests.insert(request_id.to_string());
            } else if !open_requests.contains(request_id) {
                return Err(StructureProblem("事件引用了未开启或已终结的 request"));
            }
            if journal_type.is_prompt_terminal() {
                open_requests.remove(request_id);
            }
        }

        // observed upstream turn 必须自 1 起、跨 prompt/leg 逐枚 +1（PI-HOST-LOOP-1R2 C3）。
        //
        // 耐久序对每个回合是**双笔**：先 `agent_event.turn_finished`，再同 turn 的
        // `turn_usage_recorded`。故连续性钉在前一笔，配对钉在后一笔；等值、倒退、跳号
        // 与「usage 先于其 turn_finished 出现」都不是任何 crash 窗能产生的历史。
        // 1R 只对 turn 取 `max()`，倒序 `2 → 1` 与孤儿 usage 因此都被当成可恢复 session。
        match &record.payload {
            JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished { turn, .. }) => {
                if *turn != last_observed_turn + 1 {
                    return Err(StructureProblem(
                        "observed turn 必须自 1 起跨 prompt/leg 逐枚递增",
                    ));
                }
                last_observed_turn = *turn;
            }
            JournalPayload::TurnUsageRecorded { turn, .. } if *turn != last_observed_turn => {
                return Err(StructureProblem(
                    "turn_usage_recorded 未接在同 turn 的 turn_finished 之后",
                ));
            }
            _ => {}
        }

        // 与 {@link fold} 逐字同口径地累计，供下一枚 `session_resumed` 逐值比对。
        match &record.payload {
            JournalPayload::TurnUsageRecorded {
                turn,
                counted_toward_turn_limit,
                usage,
                ..
            } => {
                observed_turns = observed_turns.max(*turn);
                if *counted_toward_turn_limit {
                    counted_turns += 1;
                }
                match usage.cost_usd {
                    None => cost_known = false,
                    Some(cost) => usd_total += cost,
                }
            }
            JournalPayload::SessionInterrupted { cost_coverage, .. }
                if *cost_coverage == CostCoverage::Unknown =>
            {
                cost_known = false;
            }
            _ => {}
        }

        if journal_type.is_session_terminal() {
            session_closed = true;
            leg_open = false;
        }
        if journal_type == JournalType::SessionInterrupted {
            leg_open = false;
        }

        last_recorded_at = record.recorded_at;
    }
    Ok(())
}

/// 半对判定：返回需要补写的尾端 `turn_finished`（若有），否则 `Err` 表示整份 quarantine。
type TurnUsageRepair = (String, AgentProjectionEvent);

/// 双向闭合（PI-HOST-LOOP-1R2 C3）。
///
/// 1R 只从 `turn_finished` 单向找 usage：缺 usage 的尾端 `turn_finished` 是可确定性补写的
/// crash 半对，这一支已经正确。反过来的孤儿 usage——有 `turn_usage_recorded` 而无同
/// request/turn 的 `turn_finished`——却完全没有判据，于是被静默接受。它不是任何 crash 窗
/// 能产生的形态（耐久序是先 event 后 usage），故**没有**补写窗，一律 quarantine。
fn plan_turn_usage_repair(
    records: &[JournalRecord],
) -> Result<Option<TurnUsageRepair>, StructureProblem> {
    for record in records.iter() {
        let JournalPayload::TurnUsageRecorded { turn, .. } = &record.payload else {
            continue;
        };
        let request_id = record.request_id.as_deref().unwrap_or_default();
        let paired = records.iter().any(|candidate| {
            candidate.request_id.as_deref().unwrap_or_default() == request_id
                && matches!(
                    &candidate.payload,
                    JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                        turn: other, ..
                    }) if other == turn
                )
        });
        if !paired {
            return Err(StructureProblem(
                "turn_usage_recorded 没有同 request/turn 的 turn_finished",
            ));
        }
    }

    let mut repair: Option<TurnUsageRepair> = None;
    for (index, record) in records.iter().enumerate() {
        let JournalPayload::AgentEvent(event) = &record.payload else {
            continue;
        };
        let AgentProjectionEvent::TurnFinished { turn, .. } = event else {
            continue;
        };
        let request_id = record.request_id.clone().unwrap_or_default();
        let rows: Vec<&JournalRecord> = records
            .iter()
            .filter(|candidate| {
                candidate.request_id.as_deref() == Some(request_id.as_str())
                    && matches!(
                        &candidate.payload,
                        JournalPayload::TurnUsageRecorded { turn: other, .. } if other == turn
                    )
            })
            .collect();
        if rows.len() > 1 {
            return Err(StructureProblem(
                "同一 request/turn 出现重复 turn_usage_recorded",
            ));
        }
        if let Some(row) = rows.first() {
            let JournalPayload::TurnUsageRecorded {
                turn: row_turn,
                counted_toward_turn_limit: row_counted,
                usage: row_usage,
                stop_reason: row_stop,
            } = &row.payload
            else {
                unreachable!("过滤已锁定类型");
            };
            let AgentProjectionEvent::TurnFinished {
                turn: event_turn,
                counted_toward_turn_limit: event_counted,
                usage: event_usage,
                stop_reason: event_stop,
            } = event
            else {
                unreachable!("过滤已锁定类型");
            };
            if row_turn != event_turn
                || row_counted != event_counted
                || row_usage != event_usage
                || row_stop != event_stop
            {
                return Err(StructureProblem(
                    "turn_usage_recorded 与同 request 的 turn_finished 不逐值相等",
                ));
            }
            continue;
        }
        // 缺口只有在**最后一条完整记录**上才是可确定性补写的半对。
        if index != records.len() - 1 {
            return Err(StructureProblem(
                "缺 usage 的 turn_finished 不在尾端，不是 partial-tail",
            ));
        }
        repair = Some((request_id, event.clone()));
    }
    Ok(repair)
}

/// 纯 fold：不落盘，只从已 durable 记录导出投影。
pub(crate) fn fold(records: &[JournalRecord]) -> SessionProjection {
    let mut projection = SessionProjection::empty();
    let mut cost_known = true;
    let mut usd_total = 0.0_f64;

    for record in records {
        projection.next_seq = record.seq + 1;
        projection.last_recorded_at = record.recorded_at;
        if let Some(request_id) = record.request_id.as_deref() {
            projection.request_ids.insert(request_id.to_string());
        }
        match &record.payload {
            JournalPayload::SessionStarted(started) => {
                projection.started = Some(started.clone());
                projection.leg = record.leg;
                projection.leg_open = true;
                projection.interrupted = false;
            }
            JournalPayload::SessionResumed(_) => {
                projection.leg = record.leg;
                projection.leg_open = true;
                projection.interrupted = false;
            }
            JournalPayload::UserPrompted { .. } => {
                projection.active_prompt = Some(ActivePrompt {
                    request_id: record.request_id.clone().unwrap_or_default(),
                    prompt_event_id: record.event_id.clone(),
                });
            }
            JournalPayload::TurnUsageRecorded {
                turn,
                counted_toward_turn_limit,
                usage,
                ..
            } => {
                projection.prior_observed_turns = projection.prior_observed_turns.max(*turn);
                if *counted_toward_turn_limit {
                    projection.prior_turns += 1;
                }
                match usage.cost_usd {
                    // 费用未知的回合不得伪记为零，只能把累计传染为 null。
                    None => cost_known = false,
                    Some(cost) => usd_total += cost,
                }
            }
            JournalPayload::SessionInterrupted { cost_coverage, .. } => {
                if *cost_coverage == CostCoverage::Unknown {
                    cost_known = false;
                }
                projection.leg_open = false;
                projection.active_prompt = None;
                projection.interrupted = true;
            }
            _ => {}
        }

        let journal_type = record.journal_type();
        if journal_type.is_prompt_terminal() {
            projection.active_prompt = None;
        }
        if journal_type.is_session_terminal() {
            projection.session_terminal = Some(journal_type);
            projection.leg_open = false;
            projection.active_prompt = None;
            projection.interrupted = false;
        }
    }

    projection.prior_usd = if cost_known { Some(usd_total) } else { None };
    projection
}

/// 恢复计划：读/计划相算出的**值**，一个字节都还没落盘。
///
/// PI-HOST-LOOP-1R7 §零裁定一。1R6 把 wire 判据的前置从「文本同步」升成「结构性成立」，
/// 但两相边界切在 `load_session()` **之后**——病根不是又一道漏抄的门，而是**读取既有账本
/// 与修复既有账本混居同一函数**：读是纯的，修是 durable effect。于是任何「先校验后效果」
/// 的排序担保都只对 fresh 路径成立，恢复既有会话时截断/补写/crash fold 照样先落盘
/// （1R6 复验实测 journal 558 B → 790 B 而 spawn/wire 均零）。
///
/// 分相之后：读/计划相只读字节、内存跳过 partial tail、解码校验、把全部修复算成**值**；
/// 落盘留给 `PlannedSession::apply`，由调用方决定时机。计划被弃置时账本原状重现，
/// 下一次成功的 start 重算同一计划——幂等由 `leg_open` 闸门既证。
#[derive(Debug)]
pub(crate) struct RecoveryPlan {
    /// 物理截断的目标长度；`None` 表示没有 partial tail 要截。
    truncate_to: Option<u64>,
    /// 唯一 usage 补写 ＋ 五步 crash fold 的全部追加，按落盘次序。
    appends: Vec<JournalRecord>,
    repaired_turn_usage: bool,
}

impl RecoveryPlan {
    pub(crate) fn is_empty(&self) -> bool {
        self.truncate_to.is_none() && self.appends.is_empty()
    }

    pub(crate) fn appends(&self) -> &[JournalRecord] {
        &self.appends
    }
}

/// 读/计划相的产物：单写者锁已在手、字节已读、计划已算，**journal 内容零写入**。
#[derive(Debug)]
pub(crate) struct PlannedSession {
    journal: Journal,
    lock: SessionLock,
    /// 既有完整记录 ＋ 计划记录。`apply` 之后即为盘上真值。
    records: Vec<JournalRecord>,
    /// 对 `records` 的折叠。`apply` 后重折叠逐值相同。
    projection: SessionProjection,
    truncated_partial_tail: bool,
    plan: RecoveryPlan,
}

impl PlannedSession {
    pub(crate) fn projection(&self) -> &SessionProjection {
        &self.projection
    }

    pub(crate) fn records(&self) -> &[JournalRecord] {
        &self.records
    }

    pub(crate) fn plan(&self) -> &RecoveryPlan {
        &self.plan
    }

    /// durable apply 相：逐条落盘既定计划，交出可续写的句柄。
    ///
    /// 次序即语义：先物理截断，再按计划次序逐枚 append + `sync_all`。
    pub(crate) fn apply(self) -> Result<LoadedJournal, JournalError> {
        let PlannedSession {
            mut journal,
            lock,
            records,
            projection,
            truncated_partial_tail,
            plan,
        } = self;
        if let Some(complete_len) = plan.truncate_to {
            let path = journal.path();
            let file = OpenOptions::new()
                .write(true)
                .open(&path)
                .map_err(|_| io("打开 journal 以截断失败"))?;
            file.set_len(complete_len)
                .map_err(|_| io("截断 partial tail 失败"))?;
            file.sync_all()
                .map_err(|_| io("同步截断后的 journal 失败"))?;
            drop(file);
            sync_directory(&container_dir(&journal.root, &journal.container_id))?;
        }
        for record in &plan.appends {
            journal.write_staged(record)?;
        }
        Ok(LoadedJournal {
            journal,
            lock,
            records,
            projection,
            truncated_partial_tail,
            repaired_turn_usage: plan.repaired_turn_usage,
        })
    }
}

/// 打开（或新建）某 session 的 journal，执行 partial-tail 截断、结构校验、唯一 usage 补写与
/// 五步 crash fold，返回可续写的句柄与投影。全套完成并 sync 之前不得启动 sidecar。
///
/// 读/计划与 durable apply 一次做完。**以修复本身为目的**的收账路径（`reclaim_after_fault`）
/// 用这一枚；要把效果排在自己某道门之后的调用方改用 `plan_session`（1R7 §零裁定一）。
pub(crate) fn load_session(
    root: &Path,
    container_id: &str,
    session_id: &str,
    interrupt_reason: SessionInterruptReason,
) -> Result<LoadedJournal, JournalError> {
    plan_session_locked(root, container_id, session_id, interrupt_reason, None)?.apply()
}

/// 已持锁者的重入入口（`PiLoopHost::reclaim_after_fault`）：交回**同一把**锁继续用。
///
/// 不走「先放再取」：`flock` 在同进程的不同 fd 之间也冲突，放了再取会自锁；
/// 即便不自锁，那个窗口也等于把写权对外开了一条缝。
pub(crate) fn load_session_holding(
    root: &Path,
    container_id: &str,
    session_id: &str,
    interrupt_reason: SessionInterruptReason,
    lock: SessionLock,
) -> Result<LoadedJournal, JournalError> {
    plan_session_locked(root, container_id, session_id, interrupt_reason, Some(lock))?.apply()
}

/// 只做读/计划相：取单写者锁、读字节、内存跳过 partial tail、解码校验、算出修复计划与
/// 投影。**零 journal 内容写入**；落盘由调用方在自己的门全过之后调 `apply` 触发。
pub(crate) fn plan_session(
    root: &Path,
    container_id: &str,
    session_id: &str,
    interrupt_reason: SessionInterruptReason,
) -> Result<PlannedSession, JournalError> {
    plan_session_locked(root, container_id, session_id, interrupt_reason, None)
}

fn plan_session_locked(
    root: &Path,
    container_id: &str,
    session_id: &str,
    interrupt_reason: SessionInterruptReason,
    held: Option<SessionLock>,
) -> Result<PlannedSession, JournalError> {
    if !is_safe_container_token(container_id) || !is_safe_container_token(session_id) {
        return Err(JournalError::InvalidRef);
    }
    let container = container_dir(root, container_id);
    fs::create_dir_all(&container).map_err(|_| io("创建容器目录失败"))?;
    assert_owned_directory(&container)?;
    // 单写者门在**任何读写之前**：被拒的 Host 因此零 journal 变化、零 spawn（R8）。
    let lock = match held {
        Some(lock) => lock,
        None => SessionLock::acquire(&session_lock_path(root, container_id, session_id))?,
    };
    let path = journal_path(root, container_id, session_id);

    let existing = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
        Err(_) => return Err(io("读取 journal 失败")),
    };

    // 只有**最后一条未以 LF 结束**的 partial bytes 可以截到前一枚 durable LF。
    //
    // 物理截断本身对解析**不必要**：下面的解码唯一输入是内存切片 `existing[..complete_len]`。
    // 故这里只把截断长度算成计划值，落盘留给 `apply`（1R7 §零裁定一）。
    let complete_len = match existing.iter().rposition(|byte| *byte == b'\n') {
        Some(index) => index + 1,
        None => 0,
    };
    let truncated_partial_tail = complete_len != existing.len();
    let truncate_to = truncated_partial_tail.then_some(complete_len as u64);
    let complete = existing[..complete_len].to_vec();

    let mut handle = Some(open_append(&path)?);

    let mut records: Vec<JournalRecord> = Vec::new();
    let mut lines = 0_usize;
    for line in complete.split(|byte| *byte == b'\n') {
        if line.is_empty() {
            continue;
        }
        lines += 1;
        match decode_record(line) {
            Ok(record) => records.push(record),
            Err(_) => {
                return Err(quarantine_session(
                    root,
                    container_id,
                    session_id,
                    &mut handle,
                    &complete,
                    "已 LF 结束的记录不合 schema",
                ));
            }
        }
    }
    if lines != complete.iter().filter(|byte| **byte == b'\n').count() {
        return Err(quarantine_session(
            root,
            container_id,
            session_id,
            &mut handle,
            &complete,
            "journal 含空行",
        ));
    }

    if let Err(problem) = validate_records(&records, container_id, session_id) {
        return Err(quarantine_session(
            root,
            container_id,
            session_id,
            &mut handle,
            &complete,
            problem.0,
        ));
    }

    let repair = match plan_turn_usage_repair(&records) {
        Ok(repair) => repair,
        Err(problem) => {
            return Err(quarantine_session(
                root,
                container_id,
                session_id,
                &mut handle,
                &complete,
                problem.0,
            ));
        }
    };

    let projection = fold(&records);
    let mut journal = Journal {
        root: root.to_path_buf(),
        container_id: container_id.to_string(),
        session_id: session_id.to_string(),
        file: handle,
        next_seq: projection.next_seq,
        leg: projection.leg.max(1),
        last_recorded_at: projection.last_recorded_at,
        clock: None,
        fail_append_from: None,
    };

    let mut planned: Vec<JournalRecord> = Vec::new();
    let mut repaired_turn_usage = false;
    if let Some((request_id, event)) = repair {
        let AgentProjectionEvent::TurnFinished {
            turn,
            counted_toward_turn_limit,
            usage,
            stop_reason,
        } = event
        else {
            unreachable!("只可能是 turn_finished");
        };
        // 逐值从已 durable payload 生成；不重问 provider，也不从 session 计数反推。
        let record = journal.plan_append(
            Some(&request_id),
            None,
            JournalPayload::TurnUsageRecorded {
                turn,
                counted_toward_turn_limit,
                usage,
                stop_reason,
            },
        );
        planned.push(record.clone());
        records.push(record);
        repaired_turn_usage = true;
    }

    let projection = fold(&records);
    journal.next_seq = projection.next_seq;
    journal.leg = projection.leg.max(1);
    journal.last_recorded_at = projection.last_recorded_at;

    // 全套结构检查通过后才可计划 crash fold。
    let appended = plan_crash_fold(&mut journal, &records, &projection, interrupt_reason);
    planned.extend(appended.iter().cloned());
    records.extend(appended);
    // 投影以「既有完整记录 ＋ 计划记录」内存折叠得出——apply 之后重折叠逐值相同。
    let projection = fold(&records);
    journal.next_seq = projection.next_seq;
    journal.leg = projection.leg.max(1);
    journal.last_recorded_at = projection.last_recorded_at;

    Ok(PlannedSession {
        journal,
        lock,
        records,
        projection,
        truncated_partial_tail,
        plan: RecoveryPlan {
            truncate_to,
            appends: planned,
            repaired_turn_usage,
        },
    })
}

/// prompt terminal 的预算**真值**：对已 durable 的 `turn_usage_recorded` fold 得出（R4）。
/// sidecar 自报只作 parity 对照，不是真源。
pub(crate) fn budget_of(
    records: &[JournalRecord],
    max_turns: u64,
    max_usd: Option<f64>,
) -> BudgetView {
    budget_from(&fold(records), max_turns, max_usd)
}

fn budget_from(projection: &SessionProjection, max_turns: u64, max_usd: Option<f64>) -> BudgetView {
    let turn_limit = if projection.prior_turns >= max_turns {
        BudgetTurnLimit::Reached
    } else {
        BudgetTurnLimit::Open
    };
    let usd_limit = match (max_usd, projection.prior_usd) {
        (None, _) => BudgetUsdLimit::Disabled,
        (Some(_), None) => BudgetUsdLimit::Unknown,
        (Some(limit), Some(usd)) => {
            if usd >= limit {
                BudgetUsdLimit::Reached
            } else {
                BudgetUsdLimit::Open
            }
        }
    };
    let usd = if usd_limit == BudgetUsdLimit::Unknown {
        None
    } else {
        projection.prior_usd
    };
    BudgetView {
        turns: projection.prior_turns,
        usd,
        turn_limit,
        usd_limit,
        stop_reason: None,
    }
}

enum PendingSessionClose {
    BudgetStopped {
        prompt_event_id: String,
        budget: BudgetView,
    },
    Failed {
        prompt_event_id: String,
    },
}

/// 步骤 1 的判定：最后一枚 prompt terminal 是否要求 session 关闭而 session 尚未关闭。
fn pending_session_close(records: &[JournalRecord]) -> Option<PendingSessionClose> {
    let mut pending: Option<PendingSessionClose> = None;
    for record in records {
        match &record.payload {
            JournalPayload::PromptBudgetStopped { budget } => {
                pending = Some(PendingSessionClose::BudgetStopped {
                    prompt_event_id: record.event_id.clone(),
                    budget: budget.clone(),
                });
            }
            JournalPayload::PromptFailed { error, .. } => {
                // 只有 `provider_error|host_error + retryable:true` 不顺便关闭 session。
                pending = if error.retryable {
                    None
                } else {
                    Some(PendingSessionClose::Failed {
                        prompt_event_id: record.event_id.clone(),
                    })
                };
            }
            JournalPayload::PromptCompleted { .. } | JournalPayload::PromptCanceled { .. } => {
                pending = None;
            }
            _ => {
                if record.journal_type().is_session_terminal() {
                    pending = None;
                }
            }
        }
    }
    pending
}

/// 步骤 2：dangling effect。已见 `effect_uncertain` 而其 request 尚无 prompt terminal，
/// 或见 `effect_started` 而无三态收束——后者先追加派生 `effect_uncertain` 再走同一关闭链。
fn dangling_effect(records: &[JournalRecord]) -> Option<(String, Option<(String, String)>)> {
    let mut terminated: HashSet<&str> = HashSet::new();
    for record in records {
        if record.journal_type().is_prompt_terminal() {
            if let Some(request_id) = record.request_id.as_deref() {
                terminated.insert(request_id);
            }
        }
    }
    // 已 durable 的 effect_uncertain 优先。
    for record in records {
        if let JournalPayload::EffectUncertain { .. } = &record.payload {
            let request_id = record.request_id.clone().unwrap_or_default();
            if !terminated.contains(request_id.as_str()) {
                return Some((request_id, None));
            }
        }
    }
    for record in records {
        let JournalPayload::EffectStarted(started) = &record.payload else {
            continue;
        };
        let request_id = record.request_id.clone().unwrap_or_default();
        let settled = records.iter().any(|candidate| {
            candidate.request_id.as_deref() == Some(request_id.as_str())
                && match &candidate.payload {
                    JournalPayload::EffectSucceeded(succeeded) => {
                        succeeded.tool_call_id == started.tool_call_id
                    }
                    JournalPayload::EffectFailed { tool_call_id, .. }
                    | JournalPayload::EffectUncertain { tool_call_id } => {
                        *tool_call_id == started.tool_call_id
                    }
                    _ => false,
                }
        });
        if !settled && !terminated.contains(request_id.as_str()) {
            return Some((
                request_id,
                Some((
                    started.tool_call_id.clone(),
                    record.operation_id.clone().unwrap_or_default(),
                )),
            ));
        }
    }
    None
}

/// ADR-022 六-B 的**五步固定次序**。步骤 1–4 产生的 session terminal 永久关闭 logical session；
/// 步骤 4 的 maxUsd-null interrupted 与步骤 5 只关闭当前 leg。
///
/// 只**计划**、不落盘（1R7 §零裁定一）：全部 append 点走 `plan_append`，因此本函数不再有
/// I/O 失败面。逐值与旧写法相同——`eventId` 由同一处的 `stage` 按 `seq` 定，故步骤 2/3/4
/// 里「后一枚引用前一枚 `promptEventId`」的交叉引用同样成立。
fn plan_crash_fold(
    journal: &mut Journal,
    records: &[JournalRecord],
    projection: &SessionProjection,
    interrupt_reason: SessionInterruptReason,
) -> Vec<JournalRecord> {
    let mut appended = Vec::new();
    let Some(started) = projection.started.as_ref() else {
        return appended;
    };
    if projection.is_closed() {
        return appended;
    }
    let (max_turns, max_usd) = (started.max_turns, started.max_usd);

    // 步骤 1：先补半闭合终态。已有 prompt terminal 时后续步骤不得再造第二枚。
    if let Some(pending) = pending_session_close(records) {
        let record = match pending {
            PendingSessionClose::BudgetStopped {
                prompt_event_id,
                budget,
            } => journal.plan_append(
                None,
                None,
                JournalPayload::SessionBudgetStopped {
                    prompt_event_id,
                    budget,
                },
            ),
            PendingSessionClose::Failed { prompt_event_id } => journal.plan_append(
                None,
                None,
                JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Prompt { prompt_event_id },
                },
            ),
        };
        appended.push(record);
        return appended;
    }

    // 步骤 2：dangling effect。本票不真实生成 effect 家族（PI-WRITE-HOST-1 才首次激活），
    // 但 replay 一侧必须按同一链条收束，不得猜 succeeded/failed、复用授权或自动重试。
    if let Some((request_id, derive)) = dangling_effect(records) {
        if let Some((tool_call_id, operation_id)) = derive {
            appended.push(journal.plan_append(
                Some(&request_id),
                Some(&operation_id),
                JournalPayload::EffectUncertain { tool_call_id },
            ));
        }
        let code = TerminalFailureCode::EffectUncertain;
        let budget = budget_from(projection, max_turns, max_usd);
        let prompt = journal.plan_append(
            Some(&request_id),
            None,
            JournalPayload::PromptFailed {
                error: TerminalError {
                    code,
                    message: code.message().to_string(),
                    retryable: false,
                },
                budget,
            },
        );
        let prompt_event_id = prompt.event_id.clone();
        appended.push(prompt);
        appended.push(journal.plan_append(
            None,
            None,
            JournalPayload::SessionFailed {
                cause: SessionFailureCause::Prompt { prompt_event_id },
            },
        ));
        return appended;
    }

    // 步骤 3/4：active prompt 的预算。
    if let Some(active) = projection.active_prompt.clone() {
        let mut budget = budget_from(projection, max_turns, max_usd);
        let coverage_unknown = max_usd.is_some() && projection.prior_usd.is_none();
        if coverage_unknown {
            budget.usd_limit = BudgetUsdLimit::Unknown;
            budget.usd = None;
            appended.extend(plan_close_with_budget_unknown(
                journal,
                &active.request_id,
                budget,
            ));
            return appended;
        }
        if budget.turn_limit == BudgetTurnLimit::Reached
            || budget.usd_limit == BudgetUsdLimit::Reached
        {
            budget.stop_reason = Some(if budget.turn_limit == BudgetTurnLimit::Reached {
                BudgetStopReason::Turns
            } else {
                BudgetStopReason::Usd
            });
            let prompt = journal.plan_append(
                Some(&active.request_id),
                None,
                JournalPayload::PromptBudgetStopped {
                    budget: budget.clone(),
                },
            );
            let prompt_event_id = prompt.event_id.clone();
            appended.push(prompt);
            appended.push(journal.plan_append(
                None,
                None,
                JournalPayload::SessionBudgetStopped {
                    prompt_event_id,
                    budget,
                },
            ));
            return appended;
        }
        // 步骤 4：预算仍 open。v1 没有 provider-start ack，保守视为可能已付费。
        if max_usd.is_some() {
            let mut unknown = budget;
            unknown.usd_limit = BudgetUsdLimit::Unknown;
            unknown.usd = None;
            appended.extend(plan_close_with_budget_unknown(
                journal,
                &active.request_id,
                unknown,
            ));
            return appended;
        }
        appended.push(journal.plan_append(
            None,
            None,
            JournalPayload::SessionInterrupted {
                reason: interrupt_reason,
                cost_coverage: CostCoverage::Unknown,
            },
        ));
        return appended;
    }

    // 步骤 5：leg 已开、无 session/leg-close、也没有 active prompt（含 ready 前 crash 与 idle crash）。
    if projection.leg_open {
        let coverage = if projection.prior_usd.is_some() {
            CostCoverage::Known
        } else {
            CostCoverage::Unknown
        };
        appended.push(journal.plan_append(
            None,
            None,
            JournalPayload::SessionInterrupted {
                reason: interrupt_reason,
                cost_coverage: coverage,
            },
        ));
    }
    appended
}

fn plan_close_with_budget_unknown(
    journal: &mut Journal,
    request_id: &str,
    budget: BudgetView,
) -> Vec<JournalRecord> {
    let code = TerminalFailureCode::BudgetUnknown;
    let prompt = journal.plan_append(
        Some(request_id),
        None,
        JournalPayload::PromptFailed {
            error: TerminalError {
                code,
                message: code.message().to_string(),
                retryable: false,
            },
            budget,
        },
    );
    let prompt_event_id = prompt.event_id.clone();
    let session = journal.plan_append(
        None,
        None,
        JournalPayload::SessionFailed {
            cause: SessionFailureCause::Prompt { prompt_event_id },
        },
    );
    vec![prompt, session]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

    fn temp_root(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-pi-loop-{tag}-{}-{}",
            std::process::id(),
            TEMP_SEQ.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&base).expect("建临时根");
        base
    }

    pub(super) fn started_payload() -> SessionStartedPayload {
        SessionStartedPayload {
            route_manifest_sha256:
                "4c09a985f489bbc791686197f44a5303fb1295a657c855d3df679bf776967f6b".to_string(),
            target_triple: TargetTriple::Aarch64AppleDarwin,
            grant_id: "grant-1".to_string(),
            model_id: "deepseek-v4-flash".to_string(),
            max_turns: 12,
            max_usd: None,
        }
    }

    fn open(root: &Path) -> LoadedJournal {
        load_session(
            root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("载入成功")
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
    fn every_journal_type_round_trips_through_the_closed_codec() {
        let budget = BudgetView {
            turns: 1,
            usd: Some(0.0123),
            turn_limit: BudgetTurnLimit::Open,
            usd_limit: BudgetUsdLimit::Open,
            stop_reason: None,
        };
        let reached = BudgetView {
            turns: 12,
            usd: Some(0.5),
            turn_limit: BudgetTurnLimit::Reached,
            usd_limit: BudgetUsdLimit::Open,
            stop_reason: Some(BudgetStopReason::Turns),
        };
        let sha_a = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08".to_string();
        let sha_b = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae".to_string();

        let payloads: Vec<(Option<&str>, Option<&str>, JournalPayload)> = vec![
            (
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            ),
            (
                None,
                None,
                JournalPayload::SessionResumed(SessionResumedPayload {
                    previous_leg: 1,
                    prior_observed_turns: 3,
                    prior_turns: 2,
                    prior_usd: Some(0.5),
                }),
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "读一下备忘".to_string(),
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                    delta: "合同编号是 HT-2024-081。".to_string(),
                }),
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::ToolProposed(ToolProposedPayload {
                    tool_call_id: "tc_1_1".to_string(),
                    logical_path: "纪要.md".to_string(),
                    proposal_hash: sha_a.clone(),
                    content_sha256: sha_b.clone(),
                    byte_length: 10,
                    action: WriteDisposition::Created,
                }),
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::AuthorizationDecided {
                    tool_call_id: "tc_1_1".to_string(),
                    decision: AuthorizationDecision::Approved,
                    code: None,
                },
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::AuthorizationDecided {
                    tool_call_id: "tc_1_1".to_string(),
                    decision: AuthorizationDecision::Denied,
                    code: Some(AuthorizationDenyCode::UserDenied),
                },
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::EffectStarted(EffectStartedPayload {
                    tool_call_id: "tc_1_1".to_string(),
                    logical_path: "纪要.md".to_string(),
                    proposal_hash: sha_a.clone(),
                    action: WriteDisposition::Overwritten,
                    content_sha256: sha_b.clone(),
                    byte_length: 10,
                }),
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::EffectSucceeded(EffectSucceededPayload {
                    tool_call_id: "tc_1_1".to_string(),
                    logical_path: "纪要.md".to_string(),
                    disposition: WriteDisposition::Created,
                    content_sha256: sha_b.clone(),
                    byte_length: 10,
                }),
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::EffectFailed {
                    tool_call_id: "tc_1_1".to_string(),
                    code: HostFailureCode::SymlinkForbidden,
                },
            ),
            (
                Some("req-1"),
                Some("op-1"),
                JournalPayload::EffectUncertain {
                    tool_call_id: "tc_1_1".to_string(),
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::TurnUsageRecorded {
                    turn: 1,
                    counted_toward_turn_limit: true,
                    usage: known_usage(0.0123),
                    stop_reason: TurnStopReason::Stop,
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::PromptCompleted {
                    budget: budget.clone(),
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::PromptFailed {
                    error: TerminalError {
                        code: TerminalFailureCode::ProviderError,
                        message: TerminalFailureCode::ProviderError.message().to_string(),
                        retryable: true,
                    },
                    budget: budget.clone(),
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::PromptCanceled {
                    reason: CancelReason::User,
                    budget,
                },
            ),
            (
                Some("req-1"),
                None,
                JournalPayload::PromptBudgetStopped {
                    budget: reached.clone(),
                },
            ),
            (None, None, JournalPayload::SessionCompleted),
            (
                None,
                None,
                JournalPayload::SessionBudgetStopped {
                    prompt_event_id: "event_7".to_string(),
                    budget: reached,
                },
            ),
            (
                None,
                None,
                JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Prompt {
                        prompt_event_id: "event_3".to_string(),
                    },
                },
            ),
            (
                None,
                None,
                JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Protocol {
                        code: ProtocolErrorCode::StateViolation,
                    },
                },
            ),
            (
                None,
                None,
                JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Runtime {
                        code: RuntimeFailureCode::StderrLimit,
                    },
                },
            ),
            (
                None,
                None,
                JournalPayload::SessionInterrupted {
                    reason: SessionInterruptReason::LifecycleTimeout,
                    cost_coverage: CostCoverage::Unknown,
                },
            ),
        ];

        let mut seen: HashSet<JournalType> = HashSet::new();
        for (index, (request_id, operation_id, payload)) in payloads.into_iter().enumerate() {
            seen.insert(payload.journal_type());
            let record = JournalRecord {
                event_id: format!("event_{}", index + 1),
                seq: index as u64 + 1,
                container_id: "cnt-1".to_string(),
                session_id: "sess-1".to_string(),
                leg: 1,
                request_id: request_id.map(str::to_string),
                operation_id: operation_id.map(str::to_string),
                recorded_at: 1_700_000_000_000 + index as u64,
                payload,
            };
            let encoded = encode_record(&record);
            let decoded = decode_record(&encoded[..encoded.len() - 1])
                .unwrap_or_else(|error| panic!("第 {index} 枚解码失败：{}", error.reason));
            assert_eq!(decoded, record, "第 {index} 枚 round-trip 不等");
            assert_eq!(
                encode_record(&decoded),
                encoded,
                "第 {index} 枚 canonical 重编码不同 bytes"
            );
        }
        assert_eq!(seen.len(), JournalType::ALL.len(), "十九型必须逐枚覆盖");
    }

    #[test]
    fn counterexample_operation_id_only_on_the_six_effect_types() {
        let extra = br#"{"schemaVersion":1,"eventId":"event_1","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":"req-1","operationId":"op-1","type":"agent_event","recordedAt":1,"payload":{"kind":"assistant_text_delta","delta":"x"}}"#;
        assert!(
            decode_record(extra).is_err(),
            "非 effect 型不得带 operationId"
        );

        let missing = br#"{"schemaVersion":1,"eventId":"event_1","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":"req-1","type":"effect_uncertain","recordedAt":1,"payload":{"toolCallId":"tc_1_1","code":"durability_unknown"}}"#;
        assert!(
            decode_record(missing).is_err(),
            "effect 型必须带 operationId"
        );
    }

    #[test]
    fn counterexample_envelope_rules_go_red_one_by_one() {
        // session 级事件必须 requestId:null。
        let scoped = br#"{"schemaVersion":1,"eventId":"event_1","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":"req-1","type":"session_completed","recordedAt":1,"payload":{"reason":"host_shutdown"}}"#;
        assert!(decode_record(scoped).is_err());

        // eventId 必须恰为 event_<seq>。
        let drifted = br#"{"schemaVersion":1,"eventId":"event_2","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":null,"type":"session_completed","recordedAt":1,"payload":{"reason":"host_shutdown"}}"#;
        assert!(decode_record(drifted).is_err());

        // 终态文案漂移一个字即拒。
        let message = r#"{"schemaVersion":1,"eventId":"event_1","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":"req-1","type":"prompt_failed","recordedAt":1,"payload":{"status":"failed","error":{"code":"unknown","message":"未归类的错误","retryable":false},"budget":{"turns":0,"usd":0,"turnLimit":"open","usdLimit":"disabled","stopReason":null}}}"#;
        assert!(decode_record(message.as_bytes()).is_err());

        // caseRoot 必须是虚拟根：任何物理路径都进不了 journal。
        let physical = r#"{"schemaVersion":1,"eventId":"event_1","seq":1,"containerId":"cnt-1","sessionId":"sess-1","leg":1,"requestId":null,"type":"session_started","recordedAt":1,"payload":{"routeId":"node22-runtime-sealed-cjs-v1","routeManifestSha256":"4c09a985f489bbc791686197f44a5303fb1295a657c855d3df679bf776967f6b","nodeVersion":"22.23.1","targetTriple":"aarch64-apple-darwin","grantId":"grant-1","caseRoot":"/Users/x/案卷","promptId":"case-read-v1","provider":{"id":"deepseek","modelId":"deepseek-v4-flash"},"limits":{"maxTurns":12,"maxUsd":null},"capabilities":["case_read"]}}"#;
        assert!(
            decode_record(physical.as_bytes()).is_err(),
            "物理案件根不得进 journal"
        );
    }

    #[test]
    fn append_syncs_before_returning_and_partial_tail_is_truncated_not_quarantined() {
        let root = temp_root("partial");
        let mut loaded = open(&root);
        loaded
            .journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("首枚落账");
        loaded
            .journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问一句".to_string(),
                },
            )
            .expect("prompt 落账");
        drop(loaded);

        // 手工追加一段**未以 LF 结束**的 partial bytes。
        let path = journal_path(&root, "cnt-1", "sess-1");
        let before = fs::read(&path).expect("读原文");
        let mut file = OpenOptions::new()
            .append(true)
            .open(&path)
            .expect("追加打开");
        file.write_all(br#"{"schemaVersion":1,"eventId":"event_3""#)
            .expect("写 partial");
        file.sync_all().expect("同步");
        drop(file);

        let reloaded = open(&root);
        assert!(
            reloaded.truncated_partial_tail,
            "未以 LF 结束的尾段必须被截断"
        );
        let after = fs::read(&path).expect("读回");
        assert!(after.starts_with(&before), "截断只能砍掉 partial 段");
        assert!(after.ends_with(b"\n"), "截断后必须停在 durable LF 上");
        assert!(
            !container_dir(&root, "cnt-1").join(QUARANTINE_DIR).exists(),
            "partial tail 不得触发 quarantine"
        );
    }

    #[test]
    fn counterexample_lf_complete_bad_record_is_quarantined_whole_not_truncated() {
        let root = temp_root("quarantine");
        let mut loaded = open(&root);
        loaded
            .journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("首枚落账");
        drop(loaded);

        let path = journal_path(&root, "cnt-1", "sess-1");
        let original = fs::read(&path).expect("读原文");
        let mut file = OpenOptions::new()
            .append(true)
            .open(&path)
            .expect("追加打开");
        // 这一行**带 LF**，因而绝不属于可截断的 partial tail。
        file.write_all(b"{\"schemaVersion\":1,\"eventId\":\"event_2\"}\n")
            .expect("写坏行");
        file.sync_all().expect("同步");
        drop(file);

        let expected = fs::read(&path).expect("读全文");
        assert_ne!(original, expected, "对照：坏行确实改变了原文");
        let error = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("坏行必须 quarantine");
        let JournalError::Quarantined { target_sha256, .. } = &error else {
            panic!("必须是 Quarantined，实得 {error:?}");
        };
        assert_eq!(
            *target_sha256,
            sha256_hex(&expected),
            "quarantine 文件名恰为原 bytes 的 SHA"
        );
        let target = container_dir(&root, "cnt-1")
            .join(QUARANTINE_DIR)
            .join("sess-1")
            .join(format!("{target_sha256}.jsonl"));
        assert_eq!(
            fs::read(&target).expect("读 quarantine"),
            expected,
            "搬运必须 byte-identical"
        );
        assert!(!path.exists(), "原位不得留下半修好的 journal");

        // 相同目标已存在也 fail closed。
        fs::write(&path, &expected).expect("复原同一份坏 journal");
        let again = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("同名目标已存在必须拒");
        assert!(
            matches!(again, JournalError::QuarantineRefused(_)),
            "同一目标已存在必须 fail closed，实得 {again:?}"
        );
    }

    #[test]
    fn counterexample_append_failure_publishes_nothing() {
        let root = temp_root("append-fail");
        let mut loaded = open(&root);
        loaded.journal.inject_append_failure_from(1);
        let mut published = 0_u32;
        if loaded
            .journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .is_ok()
        {
            published += 1;
        }
        assert_eq!(published, 0, "append/sync 失败时 outward publish 必须为 0");
        assert_eq!(
            fs::read(journal_path(&root, "cnt-1", "sess-1"))
                .expect("读回")
                .len(),
            0,
            "失败不得留下半条记录"
        );
    }

    #[test]
    fn tail_turn_finished_without_usage_is_repaired_exactly_once() {
        let root = temp_root("repair");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
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
        drop(loaded);

        let reloaded = open(&root);
        assert!(reloaded.repaired_turn_usage, "尾端半对必须被补写");
        let rows: Vec<&JournalRecord> = reloaded
            .records
            .iter()
            .filter(|record| record.journal_type() == JournalType::TurnUsageRecorded)
            .collect();
        assert_eq!(rows.len(), 1, "只补一枚");
        assert_eq!(rows[0].request_id.as_deref(), Some("req-1"));
        assert_eq!(rows[0].leg, 1);
        // 补写逐值来自那枚已 durable 的 payload：不重问 provider，也不从 session 计数反推。
        assert_eq!(
            rows[0].payload,
            JournalPayload::TurnUsageRecorded {
                turn: 1,
                counted_toward_turn_limit: true,
                usage: known_usage(0.25),
                stop_reason: TurnStopReason::Stop,
            }
        );
        assert_eq!(reloaded.projection.prior_observed_turns, 1);
        assert_eq!(reloaded.projection.prior_turns, 1);
        // 补写之后才轮到 crash fold：prompt 仍 active 且 maxUsd 为 null，故走步骤 4 的
        // `session_interrupted{costCoverage:'unknown'}`，累计 usd 因此**必须**是 null。
        assert!(matches!(
            reloaded.records.last().map(|record| &record.payload),
            Some(JournalPayload::SessionInterrupted {
                cost_coverage: CostCoverage::Unknown,
                ..
            })
        ));
        assert_eq!(reloaded.projection.prior_usd, None);

        // 幂等：再载一次不得补第二枚。
        // 先交出单写者锁——同一 logical session 不许两个写者并存（PI-HOST-LOOP-1R R8），
        // 「再载一次」因此必须是**接手**，不是并肩。
        drop(reloaded);
        let again = open(&root);
        assert!(!again.repaired_turn_usage, "已补过就不再补");
        assert_eq!(
            again
                .records
                .iter()
                .filter(|record| record.journal_type() == JournalType::TurnUsageRecorded)
                .count(),
            1
        );
    }

    /// PI-HOST-LOOP-1R7 J1：恢复计划是**值**，`apply` 逐条兑现它，两相的投影逐值相同。
    ///
    /// 三件事各自独立判红：① 读/计划相对盘上字节零触碰；② `apply` 之后重折叠 ==
    /// 计划相算出的投影；③ 盘上真值 == 计划记录。把任一条 apply 挪回计划相、或让计划
    /// 与落账各算一次 `eventId`/`seq`，都在这里当场红。
    #[test]
    fn the_recovery_plan_is_a_value_and_apply_reproduces_it_exactly() {
        let root = temp_root("plan-apply");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
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
        drop(loaded);

        // 三类修复同时挂着：物理截断 ＋ usage 补写 ＋ crash fold。
        let path = journal_path(&root, "cnt-1", "sess-1");
        let mut seeded = fs::read(&path).expect("读种子");
        seeded.extend_from_slice(b"{\"eventId\":\"event_9\",\"seq\":9,\"contain");
        fs::write(&path, &seeded).expect("写半行");

        let planned = plan_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect("计划相成功");
        // 对照：本形状确实有修复可计划——否则下面三条断言全是恒真。
        assert!(!planned.plan().is_empty(), "种子无修复可计划，本枚恒真");
        assert_eq!(
            planned.plan().truncate_to,
            Some(seeded.len() as u64 - 37),
            "半行必须被算进截断计划"
        );
        assert_eq!(
            planned
                .plan()
                .appends()
                .iter()
                .map(JournalRecord::journal_type)
                .collect::<Vec<JournalType>>(),
            vec![
                JournalType::TurnUsageRecorded,
                JournalType::SessionInterrupted
            ],
            "计划的追加次序：先唯一 usage 补写，后 crash fold"
        );
        let planned_projection = planned.projection().clone();
        let planned_records = planned.records().to_vec();

        // ① 读/计划相对盘上字节零触碰。
        assert_eq!(
            fs::read(&path).expect("读计划后"),
            seeded,
            "读/计划相不得改一个字节"
        );

        let loaded = planned.apply().expect("apply 成功");
        // ② apply 之后重折叠 == 计划投影（逐值）。
        assert_eq!(fold(&loaded.records), planned_projection);
        assert_eq!(loaded.records, planned_records);
        assert!(loaded.truncated_partial_tail && loaded.repaired_turn_usage);
        drop(loaded);

        // ③ 盘上真值 == 计划记录：`eventId`/`seq`/`leg`/payload 逐值，不是「差不多」。
        let bytes = fs::read(&path).expect("读 apply 后");
        assert!(bytes.ends_with(b"\n"), "半行必须已被物理截断");
        let on_disk: Vec<JournalRecord> = bytes
            .split(|byte| *byte == b'\n')
            .filter(|line| !line.is_empty())
            .map(|line| decode_record(line).expect("盘上每一行都可解码"))
            .collect();
        assert_eq!(on_disk, planned_records);
        assert_eq!(fold(&on_disk), planned_projection);
    }

    #[test]
    fn counterexample_non_tail_missing_usage_is_quarantined() {
        let root = temp_root("non-tail");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
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
        // 缺口之后还有别的记录 → 不再是尾端半对。
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::AgentEvent(AgentProjectionEvent::AssistantTextDelta {
                    delta: "后续".to_string(),
                }),
            )
            .expect("delta");
        drop(loaded);

        let error = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("非尾端缺口必须 quarantine");
        assert!(
            matches!(error, JournalError::Quarantined { .. }),
            "实得 {error:?}"
        );
    }

    #[test]
    fn counterexample_mismatched_usage_row_is_quarantined() {
        let root = temp_root("mismatch");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
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
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::TurnUsageRecorded {
                    turn: 1,
                    counted_toward_turn_limit: true,
                    // 逐值不等：cost 被改了。
                    usage: known_usage(0.26),
                    stop_reason: TurnStopReason::Stop,
                },
            )
            .expect("usage row");
        drop(loaded);

        let error = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("不匹配半对必须 quarantine");
        assert!(
            matches!(error, JournalError::Quarantined { .. }),
            "实得 {error:?}"
        );
    }

    #[test]
    fn crash_fold_step5_appends_session_interrupted_for_idle_open_leg() {
        let root = temp_root("fold5");
        let mut loaded = open(&root);
        loaded
            .journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        drop(loaded);

        let reloaded = open(&root);
        let last = reloaded.records.last().expect("有记录");
        assert_eq!(last.journal_type(), JournalType::SessionInterrupted);
        assert!(!reloaded.projection.leg_open, "leg 已关");
        assert!(
            reloaded.projection.session_terminal.is_none(),
            "只关 leg，不关 logical session"
        );
        assert!(reloaded.projection.interrupted, "resume 的前置成立");
    }

    #[test]
    fn crash_fold_step4_keeps_cost_unknown_when_max_usd_is_null() {
        let root = temp_root("fold4");
        let mut loaded = open(&root);
        loaded
            .journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("session_started");
        loaded
            .journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
        drop(loaded);

        let reloaded = open(&root);
        let last = reloaded.records.last().expect("有记录");
        assert!(
            matches!(
                &last.payload,
                JournalPayload::SessionInterrupted {
                    cost_coverage: CostCoverage::Unknown,
                    ..
                }
            ),
            "maxUsd 为 null 时只落 interrupted 且 coverage unknown，实得 {:?}",
            last.payload
        );
        assert_eq!(
            reloaded.projection.prior_usd, None,
            "累计 usd 必须保持 null，不得回落成 0"
        );
    }

    #[test]
    fn crash_fold_step4_closes_session_with_budget_unknown_when_max_usd_enabled() {
        let root = temp_root("fold4-usd");
        let mut loaded = open(&root);
        let mut started = started_payload();
        started.max_usd = Some(1.0);
        loaded
            .journal
            .append(None, None, JournalPayload::SessionStarted(started))
            .expect("started");
        loaded
            .journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("user_prompted");
        drop(loaded);

        let reloaded = open(&root);
        let types: Vec<JournalType> = reloaded
            .records
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            &types[types.len() - 2..],
            &[JournalType::PromptFailed, JournalType::SessionFailed],
            "maxUsd 启用时必须走 budget_unknown 关闭链"
        );
        let JournalPayload::PromptFailed { error, budget } =
            &reloaded.records[types.len() - 2].payload
        else {
            panic!("倒数第二枚必须是 prompt_failed");
        };
        assert_eq!(error.code, TerminalFailureCode::BudgetUnknown);
        assert_eq!(error.message, TerminalFailureCode::BudgetUnknown.message());
        assert!(!error.retryable);
        assert_eq!(budget.usd_limit, BudgetUsdLimit::Unknown);
        assert!(
            reloaded.projection.is_closed(),
            "logical session 已永久关闭"
        );
    }

    #[test]
    fn crash_fold_step3_stops_on_reached_turn_limit() {
        let root = temp_root("fold3");
        let mut loaded = open(&root);
        let mut started = started_payload();
        started.max_turns = 1;
        loaded
            .journal
            .append(None, None, JournalPayload::SessionStarted(started))
            .expect("started");
        loaded
            .journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("prompt");
        // 双笔耐久序（C3）：turn_finished 在前，逐值相同的 usage 在后。
        loaded
            .journal
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
        loaded
            .journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::TurnUsageRecorded {
                    turn: 1,
                    counted_toward_turn_limit: true,
                    usage: known_usage(0.25),
                    stop_reason: TurnStopReason::Stop,
                },
            )
            .expect("usage");
        drop(loaded);

        let reloaded = open(&root);
        let types: Vec<JournalType> = reloaded
            .records
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            &types[types.len() - 2..],
            &[
                JournalType::PromptBudgetStopped,
                JournalType::SessionBudgetStopped
            ],
            "第 maxTurns 回合已耐久、budget terminal 未发就 crash，必须补成对终态"
        );
        let JournalPayload::SessionBudgetStopped {
            prompt_event_id,
            budget,
        } = &reloaded.records[types.len() - 1].payload
        else {
            panic!("末枚必须是 session_budget_stopped");
        };
        assert_eq!(*prompt_event_id, reloaded.records[types.len() - 2].event_id);
        assert_eq!(budget.stop_reason, Some(BudgetStopReason::Turns));
    }

    #[test]
    fn crash_fold_step1_only_closes_the_session_half() {
        let root = temp_root("fold1");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("prompt");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::PromptFailed {
                    error: TerminalError {
                        code: TerminalFailureCode::InvalidState,
                        message: TerminalFailureCode::InvalidState.message().to_string(),
                        retryable: false,
                    },
                    budget: BudgetView {
                        turns: 0,
                        usd: Some(0.0),
                        turn_limit: BudgetTurnLimit::Open,
                        usd_limit: BudgetUsdLimit::Disabled,
                        stop_reason: None,
                    },
                },
            )
            .expect("prompt_failed");
        drop(loaded);

        let reloaded = open(&root);
        let last = reloaded.records.last().expect("有记录");
        assert!(
            matches!(
                &last.payload,
                JournalPayload::SessionFailed {
                    cause: SessionFailureCause::Prompt { .. }
                }
            ),
            "步骤 1 只补 session 侧那一半，实得 {:?}",
            last.payload
        );
        assert_eq!(
            reloaded
                .records
                .iter()
                .filter(|record| record.journal_type().is_prompt_terminal())
                .count(),
            1,
            "不得造第二枚 prompt terminal"
        );
    }

    #[test]
    fn budget_accumulates_across_prompts_and_never_resets() {
        let root = temp_root("budget");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        for (index, request) in ["req-1", "req-2"].iter().enumerate() {
            journal
                .append(
                    Some(request),
                    None,
                    JournalPayload::UserPrompted {
                        text: "问".to_string(),
                    },
                )
                .expect("prompt");
            // 每个回合的耐久序是双笔：先 turn_finished，再同 turn 的 usage（C3 起为硬约束）。
            journal
                .append(
                    Some(request),
                    None,
                    JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                        turn: index as u64 + 1,
                        counted_toward_turn_limit: true,
                        usage: known_usage(0.25),
                        stop_reason: TurnStopReason::Stop,
                    }),
                )
                .expect("turn_finished");
            journal
                .append(
                    Some(request),
                    None,
                    JournalPayload::TurnUsageRecorded {
                        turn: index as u64 + 1,
                        counted_toward_turn_limit: true,
                        usage: known_usage(0.25),
                        stop_reason: TurnStopReason::Stop,
                    },
                )
                .expect("usage");
            journal
                .append(
                    Some(request),
                    None,
                    JournalPayload::PromptCompleted {
                        budget: BudgetView {
                            turns: index as u64 + 1,
                            usd: Some(0.25 * (index as f64 + 1.0)),
                            turn_limit: BudgetTurnLimit::Open,
                            usd_limit: BudgetUsdLimit::Disabled,
                            stop_reason: None,
                        },
                    },
                )
                .expect("terminal");
        }
        drop(loaded);

        let reloaded = open(&root);
        // 第二枚 prompt **不重置**累计：turns=2、usd=0.5。
        assert_eq!(reloaded.projection.prior_turns, 2);
        assert_eq!(reloaded.projection.prior_observed_turns, 2);
        assert_eq!(reloaded.projection.prior_usd, Some(0.5));
        assert!(reloaded.projection.request_ids.contains("req-1"));
        assert!(reloaded.projection.request_ids.contains("req-2"));
    }

    #[test]
    fn counterexample_unknown_cost_poisons_the_total_to_null() {
        let root = temp_root("poison");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("prompt");
        // 双笔耐久序（C3）：turn_finished 在前，逐值相同的 usage 在后。
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                    turn: 1,
                    counted_toward_turn_limit: false,
                    usage: TurnUsage::all_unknown(),
                    stop_reason: TurnStopReason::Aborted,
                }),
            )
            .expect("turn_finished");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::TurnUsageRecorded {
                    turn: 1,
                    counted_toward_turn_limit: false,
                    usage: TurnUsage::all_unknown(),
                    stop_reason: TurnStopReason::Aborted,
                },
            )
            .expect("usage");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::PromptCanceled {
                    reason: CancelReason::User,
                    budget: BudgetView {
                        turns: 0,
                        usd: None,
                        turn_limit: BudgetTurnLimit::Open,
                        usd_limit: BudgetUsdLimit::Disabled,
                        stop_reason: None,
                    },
                },
            )
            .expect("terminal");
        drop(loaded);

        let reloaded = open(&root);
        assert_eq!(
            reloaded.projection.prior_usd, None,
            "未知费用必须把累计传染为 null"
        );
        assert_eq!(
            reloaded.projection.prior_turns, 0,
            "aborted 回合不计 counted"
        );
        assert_eq!(
            reloaded.projection.prior_observed_turns, 1,
            "observed ordinal 仍要数"
        );
    }

    #[test]
    fn counterexample_seq_gap_identity_drift_and_post_terminal_records_are_quarantined() {
        let base = |seq: u64, container: &str, leg: u64| {
            format!(
                "{{\"schemaVersion\":1,\"eventId\":\"event_{seq}\",\"seq\":{seq},\"containerId\":\"{container}\",\"sessionId\":\"sess-1\",\"leg\":{leg},\"requestId\":\"req-1\",\"type\":\"user_prompted\",\"recordedAt\":{seq},\"payload\":{{\"text\":\"问\"}}}}\n"
            )
        };
        for (tag, second) in [
            ("gap", base(3, "cnt-1", 1)),
            ("identity", base(2, "cnt-9", 1)),
            ("leg", base(2, "cnt-1", 2)),
        ] {
            let root = temp_root(tag);
            let mut loaded = open(&root);
            loaded
                .journal
                .append(
                    None,
                    None,
                    JournalPayload::SessionStarted(started_payload()),
                )
                .expect("started");
            drop(loaded);

            let path = journal_path(&root, "cnt-1", "sess-1");
            let mut text = String::from_utf8(fs::read(&path).expect("读")).expect("UTF-8");
            text.push_str(&second);
            fs::write(&path, text.as_bytes()).expect("写回");

            let error = load_session(
                &root,
                "cnt-1",
                "sess-1",
                SessionInterruptReason::SidecarEnded,
            )
            .expect_err("必须 quarantine");
            assert!(
                matches!(error, JournalError::Quarantined { .. }),
                "{tag} 实得 {error:?}"
            );
        }
    }

    /// PI-HOST-LOOP-1R2 C3（独立复验 `427f4fa` 的 Blocker 3，两枚原形转常驻）。
    ///
    /// 两份历史都已 LF 完整、逐条合 schema、seq 连续，但 observed turn 的次序在真实上游
    /// 下不可能出现：
    ///
    /// - **孤儿 usage**：`turn_usage_recorded` 没有同 request/turn 的 `agent_event.turn_finished`。
    ///   耐久序是「先 turn_finished 再 turn_usage_recorded」双笔，缺前一笔就不是 crash 窗，
    ///   而是一份被改过或半写坏的历史。
    /// - **倒序 ordinal**：完整 pair 的 turn 依次 `2 → 1`。observed turn 须自 1 起、跨
    ///   prompt/leg 逐枚 +1。
    ///
    /// 1R 实得两份都被接受为 `LoadedJournal`（`priorObservedTurns` 分别为 1 与 2）：
    /// `validate_records()` 对 turn 只取 `max()`，`plan_turn_usage_repair()` 只从
    /// `turn_finished` 单向找 usage，没有反向拒绝孤儿。resume 因此能从一份不可能的历史继续。
    #[test]
    fn counterexample_impossible_turn_history_is_quarantined() {
        let turn_finished = |turn: u64| {
            JournalPayload::AgentEvent(AgentProjectionEvent::TurnFinished {
                turn,
                counted_toward_turn_limit: true,
                usage: known_usage(0.25),
                stop_reason: TurnStopReason::Stop,
            })
        };
        let turn_usage = |turn: u64| JournalPayload::TurnUsageRecorded {
            turn,
            counted_toward_turn_limit: true,
            usage: known_usage(0.25),
            stop_reason: TurnStopReason::Stop,
        };
        let completed = |turns: u64, usd: f64| JournalPayload::PromptCompleted {
            budget: BudgetView {
                turns,
                usd: Some(usd),
                turn_limit: BudgetTurnLimit::Open,
                usd_limit: BudgetUsdLimit::Disabled,
                stop_reason: None,
            },
        };

        // 每份历史都是 (requestId, payload) 的完整 LF 序列，直接驱动 `load_session`。
        type Row = (Option<&'static str>, JournalPayload);
        let orphan_usage: Vec<Row> = vec![
            (None, JournalPayload::SessionStarted(started_payload())),
            (
                Some("req-1"),
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            ),
            (Some("req-1"), turn_usage(1)),
            (Some("req-1"), completed(1, 0.25)),
        ];
        let descending: Vec<Row> = vec![
            (None, JournalPayload::SessionStarted(started_payload())),
            (
                Some("req-1"),
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            ),
            (Some("req-1"), turn_finished(2)),
            (Some("req-1"), turn_usage(2)),
            (Some("req-1"), turn_finished(1)),
            (Some("req-1"), turn_usage(1)),
            (Some("req-1"), completed(2, 0.5)),
        ];

        // 第三形态：跨 request 的孤儿 usage。req-2 的 usage 借了 req-1 已观察到的 turn 1，
        // 「turn 与游标相等」这条连续性判据因此放它过去——只有 request/turn 逐枚配对
        // （`plan_turn_usage_repair` 的反向闭合）才拦得住。少了它，这份历史会被当成可恢复
        // session，且 req-2 白得一枚 counted turn。
        let cross_request_orphan: Vec<Row> = vec![
            (None, JournalPayload::SessionStarted(started_payload())),
            (
                Some("req-1"),
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            ),
            (Some("req-1"), turn_finished(1)),
            (Some("req-1"), turn_usage(1)),
            (Some("req-1"), completed(1, 0.25)),
            (
                Some("req-2"),
                JournalPayload::UserPrompted {
                    text: "再问".to_string(),
                },
            ),
            (Some("req-2"), turn_usage(1)),
            (Some("req-2"), completed(2, 0.5)),
        ];

        for (tag, rows) in [
            ("orphan-usage", orphan_usage),
            ("descending", descending),
            ("cross-request-orphan", cross_request_orphan),
        ] {
            let root = temp_root(tag);
            let mut loaded = open(&root);
            for (request, payload) in rows {
                loaded
                    .journal
                    .append(request, None, payload)
                    .unwrap_or_else(|error| panic!("{tag} 落账失败：{error:?}"));
            }
            loaded
                .journal
                .append(
                    None,
                    None,
                    JournalPayload::SessionInterrupted {
                        reason: SessionInterruptReason::SidecarEnded,
                        cost_coverage: CostCoverage::Known,
                    },
                )
                .expect("interrupted");
            drop(loaded);

            let error = load_session(
                &root,
                "cnt-1",
                "sess-1",
                SessionInterruptReason::SidecarEnded,
            )
            .expect_err(tag);
            assert!(
                matches!(error, JournalError::Quarantined { .. }),
                "{tag}：不可能的 turn 历史必须整份 quarantine，实得 {error:?}"
            );
        }

        // 对照：同形但次序可能的历史（1 → 2 逐枚配对）照常载入，故上面不是恒红。
        let root = temp_root("ascending-ok");
        let mut loaded = open(&root);
        for (request, payload) in [
            (None, JournalPayload::SessionStarted(started_payload())),
            (
                Some("req-1"),
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            ),
            (Some("req-1"), turn_finished(1)),
            (Some("req-1"), turn_usage(1)),
            (Some("req-1"), turn_finished(2)),
            (Some("req-1"), turn_usage(2)),
            (Some("req-1"), completed(2, 0.5)),
        ] {
            loaded.journal.append(request, None, payload).expect("落账");
        }
        drop(loaded);
        let reloaded = open(&root);
        assert_eq!(reloaded.projection.prior_observed_turns, 2);
        assert_eq!(reloaded.projection.prior_turns, 2);
    }

    #[test]
    fn counterexample_records_after_session_terminal_are_quarantined() {
        let root = temp_root("after-terminal");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        journal
            .append(None, None, JournalPayload::SessionCompleted)
            .expect("session_completed");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("越界记录");
        drop(loaded);

        let error = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("终态之后仍有记录必须 quarantine");
        assert!(
            matches!(error, JournalError::Quarantined { .. }),
            "实得 {error:?}"
        );
    }

    #[test]
    fn counterexample_cross_leg_request_id_reuse_is_quarantined() {
        let root = temp_root("dup-request");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("prompt");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::PromptCompleted {
                    budget: BudgetView {
                        turns: 0,
                        usd: Some(0.0),
                        turn_limit: BudgetTurnLimit::Open,
                        usd_limit: BudgetUsdLimit::Disabled,
                        stop_reason: None,
                    },
                },
            )
            .expect("terminal");
        // 同一 requestId 再次出现 —— 跨 leg 去重由 journal 独占把关。
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "再问".to_string(),
                },
            )
            .expect("重复 request");
        drop(loaded);

        let error = load_session(
            &root,
            "cnt-1",
            "sess-1",
            SessionInterruptReason::SidecarEnded,
        )
        .expect_err("重复 requestId 必须 quarantine");
        assert!(
            matches!(error, JournalError::Quarantined { .. }),
            "实得 {error:?}"
        );
    }

    #[test]
    fn dangling_effect_started_derives_uncertain_then_closes_the_chain() {
        let root = temp_root("dangling");
        let mut loaded = open(&root);
        let journal = &mut loaded.journal;
        journal
            .append(
                None,
                None,
                JournalPayload::SessionStarted(started_payload()),
            )
            .expect("started");
        journal
            .append(
                Some("req-1"),
                None,
                JournalPayload::UserPrompted {
                    text: "问".to_string(),
                },
            )
            .expect("prompt");
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
        drop(loaded);

        let reloaded = open(&root);
        let types: Vec<JournalType> = reloaded
            .records
            .iter()
            .map(JournalRecord::journal_type)
            .collect();
        assert_eq!(
            &types[types.len() - 3..],
            &[
                JournalType::EffectUncertain,
                JournalType::PromptFailed,
                JournalType::SessionFailed
            ],
            "effect_started 无收束必须先派生 uncertain 再走同一关闭链"
        );
        let JournalPayload::PromptFailed { error, .. } = &reloaded.records[types.len() - 2].payload
        else {
            panic!("倒数第二枚必须是 prompt_failed");
        };
        assert_eq!(error.code, TerminalFailureCode::EffectUncertain);
        assert_eq!(
            error.message,
            TerminalFailureCode::EffectUncertain.message()
        );
    }
}
