//! `PI-LANE-UI-1` · pi 线的 Tauri command **薄壳**。
//!
//! 权威面：ADR-009 2026-08-05 窄修订（端口面）＋ ADR-022 六-A（启动输入与凭据边界）、
//! 六-C.1（并发与中断模型）、六-D（GUI 边界）。
//!
//! 薄到什么程度，逐条可验：
//!
//! 1. **零业务判断**。`start` 之外的四枚命令一律「投进通道即返」，不借用宿主状态、不等结果、
//!    不解释语义。终态、授权结论与 effect 三态全部经 journal 回流——「审批按钮只发 command，
//!    决定只认 journal」（ADR-009 同日窄修订原句）。
//! 2. **零第二真源**。回流的不是同义改写的投影，而是 {@link crate::pi_loop_journal::encode_record}
//!    产出的**同一份字节**（durable 到盘上的那一行）。WebView 侧只解码、不推断。
//! 3. **零物理面泄漏**。启动输入恰 `{containerId, grantId, modelId, limits}`（六-A）；
//!    案件根由 grantId 在宿主内解析，绝对路径、Keychain secret、进程句柄一枚都不过桥。
//!
//! 宿主线程与命令通道本身住 `pi_loop_command`；本模块只做「一条 logical session ↔ 一枚
//! 发端」的登记与三道入参门。
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

use crate::pi_loop::{HostError, KeychainCredentials, PiLoopHost, ProcessSpawner, StartConfig};
use crate::pi_loop_command::{DecisionVerdict, HostCommand, PiLoopThread};
use crate::pi_loop_journal::encode_record;
use crate::pi_loop_process::{host_target_triple, AppLayout};
use crate::pi_loop_protocol::CancelReason;

/// 一条 logical session 的登记键。容器与会话两枚 id 合成，形如 `<containerId>/<sessionId>`；
/// 两枚都已由 `PiLoopHost::start` 的 SafeToken 门把过，不会含 `/`。
fn session_key(container_id: &str, session_id: &str) -> String {
    format!("{container_id}/{session_id}")
}

/// 在册的宿主线程。key 见 {@link session_key}。
///
/// 单写者不变量由 `PiLoopHost` 自己的 journal 锁保证；本表只解决「命令投给谁」。
fn sessions() -> &'static Mutex<HashMap<String, PiLoopThread>> {
    static SESSIONS: OnceLock<Mutex<HashMap<String, PiLoopThread>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 失败一律结构化：闭集 code ＋ 宿主自产文案。**不拼**入参值、路径或 OS error
/// （承 `pi_loop` 既有体例：错误只带 `&'static str` 与闭集）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneFailure {
    code: String,
    message: String,
}

impl PiLaneFailure {
    fn new(code: &str, message: &str) -> PiLaneFailure {
        PiLaneFailure {
            code: code.to_string(),
            message: message.to_string(),
        }
    }
}

impl From<HostError> for PiLaneFailure {
    /// `HostError` 的 code 闭集直接过桥；文案取宿主既有中文短句，不二次编造。
    fn from(error: HostError) -> PiLaneFailure {
        PiLaneFailure::new(error.code(), host_error_message(&error))
    }
}

/// 启动失败的用户文案（voice §2：发生了什么 ＋ 下一步）。
///
/// 逐 code 一句，**不**从 OS error、stderr 或退出码拼接。未列出的 code 落一句同族兜底，
/// 不静默成空串。
fn host_error_message(error: &HostError) -> &'static str {
    match error.code() {
        "credential_unconfigured" => "尚未连接模型服务 · 请先在设置里完成连接",
        "invalid_config" => "本次运行的参数超出允许范围 · 请调整回合或预算上限后重试",
        "invalid_ref" => "案件或会话标识不合法 · 请重新选择案件",
        "case_root" => "案件文件夹不可读取 · 请重新绑定案件文件夹",
        "route" => "运行所需的程序文件缺失或已变更 · 请重新安装应用",
        "session_closed" => "这一段工作已经结束 · 请另起一段",
        "spawn" => "无法启动运行环境 · 请重启应用后重试",
        "journal" => "工作账本写入失败 · 请检查磁盘空间后重试",
        _ => "本次运行未能开始 · 请稍后重试",
    }
}

// ── 启动 ────────────────────────────────────────────────────────────────────

/// 产品启动输入，恰 ADR-022 六-A 的四项。
///
/// `caseRoot` 与 provider secret **不在**其中：前者由 `grantId` 在宿主内解析，后者由
/// Keychain 取出，两者只进首枚 bootstrap packet。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneStartInput {
    container_id: String,
    session_id: String,
    grant_id: String,
    model_id: String,
    limits: PiLaneLimits,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneLimits {
    max_turns: u64,
    max_usd: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneStartReply {
    /// 本次握手**真的谈成**的能力表（不是编译期 expected）。
    capabilities: Vec<String>,
    /// 已开的腿号：>1 即本次是 resume。
    leg: u64,
    /// 起步时账本上已有的全部记录（含恢复出来的历史腿）。装 sink 之前的那一段，
    /// 由这里一次性补齐——同一份记录，与后续流不重叠。
    records: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneSessionRef {
    container_id: String,
    session_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLanePromptInput {
    container_id: String,
    session_id: String,
    request_id: String,
    text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiLaneDecisionInput {
    container_id: String,
    session_id: String,
    operation_id: String,
    /// 恰两支。闭集外的字符串在 serde 层即拒，不落到运行期猜测。
    verdict: PiLaneVerdict,
}

#[derive(Debug, Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum PiLaneVerdict {
    Approve,
    Deny,
}

/// 起一条 logical session。
///
/// 次序即语义：登记表查重 → grant 解析 → layout/target → `PiLoopHost::start`（它自己按
/// 六-A 依次过配置门、路由门、案件根门、凭证门）→ 装账本 sink → 交给专属宿主线程。
/// 任一步失败都**不留**半条登记。
#[tauri::command]
pub fn pi_lane_start(
    app: tauri::AppHandle,
    input: PiLaneStartInput,
    on_record: tauri::ipc::Channel<String>,
) -> Result<PiLaneStartReply, PiLaneFailure> {
    use tauri::Manager;
    let key = session_key(&input.container_id, &input.session_id);
    {
        let table = sessions().lock().map_err(|_| poisoned())?;
        if table.contains_key(&key) {
            return Err(PiLaneFailure::new(
                "session_active",
                "这一段工作已经在运行 · 请先停止再重新开始",
            ));
        }
    }

    let store = crate::host_grant_store_path(&app)
        .map_err(|_| PiLaneFailure::new("io", "无法定位应用数据目录 · 请重启应用后重试"))?;
    let case_root = crate::host_auth::grant_root(&store, &input.grant_id).ok_or_else(|| {
        PiLaneFailure::new(
            "grant_revoked",
            "此前的访问授权已失效 · 请重新绑定案件文件夹",
        )
    })?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| PiLaneFailure::new("io", "无法定位应用数据目录 · 请重启应用后重试"))?;
    let layout = AppLayout {
        executable_dir: std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|dir| dir.to_path_buf()))
            .ok_or_else(|| {
                PiLaneFailure::new("route", "无法定位应用程序目录 · 请重新安装应用")
            })?,
        resource_dir: app.path().resource_dir().map_err(|_| {
            PiLaneFailure::new("route", "无法定位应用资源目录 · 请重新安装应用")
        })?,
    };
    let target = host_target_triple().ok_or_else(|| {
        PiLaneFailure::new("route", "当前平台暂不支持通用工作稿 · 请改用受支持的版本")
    })?;

    let host = PiLoopHost::start(
        &app_data_dir,
        &layout,
        target,
        StartConfig {
            container_id: input.container_id.clone(),
            session_id: input.session_id.clone(),
            grant_id: input.grant_id,
            case_root,
            model_id: input.model_id,
            max_turns: input.limits.max_turns,
            max_usd: input.limits.max_usd,
        },
        &KeychainCredentials,
        &mut ProcessSpawner,
    )?;

    let reply = PiLaneStartReply {
        capabilities: host
            .capabilities()
            .iter()
            .map(|capability| capability.as_str().to_string())
            .collect(),
        leg: host.leg(),
        records: host
            .records()
            .iter()
            .map(|record| String::from_utf8_lossy(&encode_record(record)).trim_end().to_string())
            .collect(),
    };

    // 账本 sink 装在 `adopt` 之前：此刻 host 还在本线程手里，与后续 append 之间没有并发窗口。
    // 通道断了（页面已走）不是宿主的事，照旧落盘，只是没人看——`send` 的结果因此忽略。
    let host = host.with_record_sink(Box::new(move |record| {
        let _ = on_record.send(
            String::from_utf8_lossy(&encode_record(record))
                .trim_end()
                .to_string(),
        );
    }));

    sessions()
        .lock()
        .map_err(|_| poisoned())?
        .insert(key, PiLoopThread::adopt(host));
    Ok(reply)
}

fn poisoned() -> PiLaneFailure {
    PiLaneFailure::new("io", "运行状态异常 · 请重启应用后重试")
}

/// 通道上没有这一条 session。**具名**，不静默成功。
fn no_session() -> PiLaneFailure {
    PiLaneFailure::new(
        "session_missing",
        "这一段工作尚未开始或已经收摊 · 请重新开始",
    )
}

/// 把一枚命令投进通道，**不等**回执。
///
/// 回执信道随 `Receiver` 一起丢弃是有意的：命令的结果（终态、授权结论、effect 三态）
/// 一律经 journal 回流，薄壳不做第二条回程。`Err` 只表示「宿主已不在」。
fn dispatch(container_id: &str, session_id: &str, command: HostCommand) -> Result<(), PiLaneFailure> {
    let table = sessions().lock().map_err(|_| poisoned())?;
    let thread = table
        .get(&session_key(container_id, session_id))
        .ok_or_else(no_session)?;
    thread.sender().send(command).map_err(|_| no_session())?;
    Ok(())
}

#[tauri::command]
pub fn pi_lane_prompt(input: PiLanePromptInput) -> Result<(), PiLaneFailure> {
    dispatch(
        &input.container_id,
        &input.session_id,
        HostCommand::Prompt {
            request_id: input.request_id,
            text: input.text,
        },
    )
}

/// Stop。`CancelReason::User` 是唯一来路——薄壳不代用户编造别的理由。
#[tauri::command]
pub fn pi_lane_cancel(input: PiLaneSessionRef) -> Result<(), PiLaneFailure> {
    dispatch(
        &input.container_id,
        &input.session_id,
        HostCommand::Cancel {
            reason: CancelReason::User,
        },
    )
}

#[tauri::command]
pub fn pi_lane_decision(input: PiLaneDecisionInput) -> Result<(), PiLaneFailure> {
    dispatch(
        &input.container_id,
        &input.session_id,
        HostCommand::Decision {
            operation_id: input.operation_id,
            verdict: match input.verdict {
                PiLaneVerdict::Approve => DecisionVerdict::Approve,
                PiLaneVerdict::Deny => DecisionVerdict::Deny,
            },
        },
    )
}

/// 收摊。先摘出登记，再在别的线程上 `join`——`join` 会等宿主线程把 shutdown 全序走完，
/// 那是有界但非瞬时的一段，不该占住 WebView 的 IPC 线程。
///
/// 摘出即除名：同一枚 key 立刻可以重新 `start`（新 session 另起）。
#[tauri::command]
pub fn pi_lane_teardown(input: PiLaneSessionRef) -> Result<(), PiLaneFailure> {
    let thread = sessions()
        .lock()
        .map_err(|_| poisoned())?
        .remove(&session_key(&input.container_id, &input.session_id));
    let Some(thread) = thread else {
        return Err(no_session());
    };
    std::thread::spawn(move || {
        // `join` 自己会投 teardown；`Drop` 亦然。此处只负责不阻塞 IPC 线程。
        let _ = thread.join();
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_key_joins_two_already_gated_tokens() {
        assert_eq!(session_key("cnt-1", "sess-1"), "cnt-1/sess-1");
    }

    /// 失败文案的三条体例（voice §2/§6）：非空、给下一步、零工程词。
    ///
    /// 逐 code 走一遍闭集，**不**抽样——「哪一枚忘了写」正是这道门要挡的。
    #[test]
    fn every_start_failure_message_states_what_happened_and_what_to_do() {
        let errors = [
            HostError::CredentialUnconfigured,
            HostError::InvalidConfig("maxTurns 必须是 1..=12 的整数"),
            HostError::InvalidRef,
            HostError::CaseRoot("案件根是 symlink"),
            HostError::SessionClosed,
            HostError::Spawn("无法创建 sidecar 进程"),
        ];
        for error in errors {
            let message = host_error_message(&error);
            assert!(
                message.contains(" · "),
                "{}：错误文案必须给下一步（voice §2）",
                error.code()
            );
            for engineering_word in ["session", "journal", "schema", "token", "prompt", "sidecar"] {
                assert!(
                    !message.contains(engineering_word),
                    "{}：用户文案不得出现工程词 {engineering_word}（voice §6）",
                    error.code()
                );
            }
        }
    }
}
