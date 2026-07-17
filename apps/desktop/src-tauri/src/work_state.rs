//! WORK-HOST-1：Tauri/Rust WorkState opaque-blob 宿主（ADR-010 决定二的生产宿主）。
//!
//! 契约红线（opaque 纪律）：
//! - 宿主只存/取 case-scoped 的**不透明字节**，绝不解析 Work 事件或法律 schema——信封校验、
//!   事件状态机与 CAS 重试全在 TS runtime（`work-state-store.ts`），Rust 只管 blob。
//! - `version` 由宿主在 CAS 成功时铸造为不透明、单调递增的 generation，与信封内 `revision` 相互独立，
//!   随文件持久、跨进程重启仍单调；只做等值比较，调用方不解析（不得用 mtime/hash/revision 冒充）。
//! - 落盘格式：`<generation>\n<envelope-bytes>`（与 Node 参考实现 `work-state-host-file.ts` 逐字节同构，
//!   同一份信封换宿主可互读）。generation 是 ASCII 十进制；换行后是原样 opaque bytes。
//! - 原子替换是唯一耐久原语：同目录临时文件 → 写全 → `File::sync_all`（macOS 上 Rust std 内部经
//!   `fcntl(F_FULLFSYNC)`，见 `library/std/src/sys/pal/unix/fs.rs` 的 `os_fsync`）→ `rename` 原子切换 →
//!   目录项 `sync_all`（ADR-010 决定二「同目录临时文件落盘、rename 与目录项落盘」三段）。`rename` 全有全无，
//!   任何时刻 target 都是某个完整版本 → 恢复窗口 = 至多 1 次在途 CAS，无需 WAL（measurement 已证）。
//!   真机 `F_FULLFSYNC` 实际发生的证据由真机试点步骤复核（fs_usage/dtrace），不以库名替代（ADR-010 决定二）。
//! - 大小上限是信任边界的防御纵深（primary 闸在 TS store）：软 4 MiB 逾越发显式告警但继续；
//!   硬 16 MiB 逾越 fail-closed 拒写、旧版本原地不动（结构化错误，绝不静默丢历史或换设计）。
//! - 扁平存放 `<work_state_dir>/<caseId>__<sessionId>.env`（沿 material_store.rs 扁平先例，app-data 内）；
//!   caseId/sessionId 防御性 `safe_token` 校验，阻断路径穿越/符号链接逃逸（真实 id 恒为安全 token）。
//! - 纯逻辑注入 `dir` 参数，可无宿主直接单测；AppHandle 取用留在 `lib.rs`。
//!
//! v1 单机、单写者产品语义：CAS 拒绝陈旧 `expectedVersion`（真实 resume/崩溃恢复场景的败者），
//! 不设 OS 级锁——多写者是就绪图明确拒绝项（同 Node 参考实现与 `work-state-store.ts` 契约）。

use serde::Serialize;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

/// 软告警上限（4 MiB）：越过发显式告警但继续工作。与 `envelope.ts` `SOFT_ENVELOPE_LIMIT_BYTES` 一致。
pub const SOFT_LIMIT_BYTES: usize = 4 * 1024 * 1024;
/// 硬上限（16 MiB）：越过 fail-closed 拒写。与 `envelope.ts` `HARD_ENVELOPE_LIMIT_BYTES` 一致。
pub const HARD_LIMIT_BYTES: usize = 16 * 1024 * 1024;

/// 临时文件序列，保证同进程并发写者的 tmp 名唯一（配合 pid + nanos）。
static TMP_SEQ: AtomicU64 = AtomicU64::new(0);

/// 宿主操作失败闭集（内部；命令层映射为 `Result<_, String>` 或 CAS 结果）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WorkStateError {
    /// caseId/sessionId 非安全 token（防御性；真实 id 恒安全）。
    InvalidRef,
    /// 逾越硬上限，fail-closed 拒写（旧版本原地不动）。
    TooLarge { bytes: usize },
    /// 底层 I/O 失败或帧结构损坏（缺 generation 分隔符等），fail-closed。
    Io(String),
}

impl WorkStateError {
    /// 命令层用户可读消息（不泄漏绝对路径）。
    pub fn message(&self) -> String {
        match self {
            WorkStateError::InvalidRef => "Work 状态引用非法".to_string(),
            WorkStateError::TooLarge { bytes } => format!(
                "Work 状态信封 {bytes} 字节超过硬上限 {HARD_LIMIT_BYTES} 字节——拒写，另立 ADR 前不得换设计"
            ),
            WorkStateError::Io(detail) => format!("Work 状态持久失败：{detail}"),
        }
    }
}

fn io_err(context: &str, error: &std::io::Error) -> WorkStateError {
    WorkStateError::Io(format!("{context}（{}）", error.kind()))
}

/// 读回复（wire，camelCase）：`{found:false}` 或 `{found:true,version,bytes}`。
/// 与 TS `WorkStateHostPort.read` 的联合 `{found:false}|{found:true;version;bytes}` 逐字段对应。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadReply {
    pub found: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
}

impl ReadReply {
    fn not_found() -> Self {
        ReadReply { found: false, version: None, bytes: None }
    }
    fn found(version: String, bytes: Vec<u8>) -> Self {
        ReadReply { found: true, version: Some(version), bytes: Some(bytes) }
    }
}

/// 提交回复（wire，camelCase）：`{applied,version}`。与 TS `compareAndSwap` 返回逐字段对应。
/// 败者 `applied=false`，`version` 为宿主当前 generation（`""` 表示当前无 blob）。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitReply {
    pub applied: bool,
    pub version: String,
}

/// 提交核心结果（内部，比 wire 多带软告警位供命令层显式呈现）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommitOutcome {
    /// 赢者：铸造新 generation 并已原子落盘；`soft_limit_warning` 标记逾越软上限。
    Applied { version: String, soft_limit_warning: bool },
    /// 败者：`expectedVersion` 与宿主当前不符，未写（不覆盖赢者）。
    Rejected { current_version: String },
}

/// 安全文件名 token：单一 normal 组件，拒空、`.`、`..`、路径分隔、`..` 子串与超长。
/// caseId=grantId（`grant-…`）、sessionId=`randomUUID()`（hex+连字符）恒为安全 token；此处仍防御性校验。
fn safe_token(token: &str) -> bool {
    !token.is_empty()
        && token.len() <= 128
        && token != "."
        && token != ".."
        && !token.contains("..")
        && token
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
}

/// (caseId, sessionId) → 扁平 `.env` 路径；任一 token 非法 → `None`（调用方 fail-closed）。
fn path_for(dir: &Path, case_id: &str, session_id: &str) -> Option<PathBuf> {
    if !safe_token(case_id) || !safe_token(session_id) {
        return None;
    }
    Some(dir.join(format!("{case_id}__{session_id}.env")))
}

struct Framed {
    version: String,
    bytes: Vec<u8>,
}

/// 读帧：文件缺失 → `Ok(None)`；缺 generation 分隔符或非法 → `Err`（fail-closed，绝不当作 fresh 覆盖）。
fn read_framed(target: &Path) -> Result<Option<Framed>, WorkStateError> {
    let raw = match fs::read(target) {
        Ok(raw) => raw,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(io_err("读取 Work 状态文件失败", &error)),
    };
    let Some(nl) = raw.iter().position(|&b| b == b'\n') else {
        return Err(WorkStateError::Io("Work 状态文件缺少 generation 分隔符（帧损坏）".to_string()));
    };
    let version = String::from_utf8(raw[..nl].to_vec())
        .map_err(|_| WorkStateError::Io("Work 状态 generation 非 UTF-8（帧损坏）".to_string()))?;
    if version.is_empty() {
        return Err(WorkStateError::Io("Work 状态 generation 为空（帧损坏）".to_string()));
    }
    Ok(Some(Framed { version, bytes: raw[nl + 1..].to_vec() }))
}

/// 原子替换写入 `<version>\n<bytes>`：同目录临时文件 → 写全 → F_FULLFSYNC → rename → 目录项 F_FULLFSYNC。
fn atomic_write_framed(dir: &Path, target: &Path, version: &str, bytes: &[u8]) -> Result<(), WorkStateError> {
    fs::create_dir_all(dir).map_err(|error| io_err("创建 Work 状态目录失败", &error))?;
    let nonce = unix_nanos();
    let seq = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
    let tmp = dir.join(format!(".courtwork-work-state-{}-{nonce}-{seq}.tmp", std::process::id()));

    let mut framed = Vec::with_capacity(version.len() + 1 + bytes.len());
    framed.extend_from_slice(version.as_bytes());
    framed.push(b'\n');
    framed.extend_from_slice(bytes);

    let result = (|| -> Result<(), WorkStateError> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp)
            .map_err(|error| io_err("创建 Work 状态临时文件失败", &error))?;
        file.write_all(&framed)
            .map_err(|error| io_err("写入 Work 状态临时文件失败", &error))?;
        // 文件级 F_FULLFSYNC（介质刷盘），保证 rename 前临时文件已耐久落盘。
        file.sync_all()
            .map_err(|error| io_err("同步 Work 状态临时文件失败", &error))?;
        drop(file);
        // rename 原子切换 target（全有全无）。
        fs::rename(&tmp, target)
            .map_err(|error| io_err("提交 Work 状态文件失败", &error))?;
        // 目录项 F_FULLFSYNC，保证新名字本身耐久（ADR-010 决定二「目录项落盘」）。
        let directory = File::open(dir).map_err(|error| io_err("打开 Work 状态目录失败", &error))?;
        directory
            .sync_all()
            .map_err(|error| io_err("同步 Work 状态目录项失败", &error))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

fn unix_nanos() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

// ─── 纯逻辑核心（dir 注入，可无宿主单测）────────────────────────────────────

/// 读取 case-scoped opaque blob。非法 ref → `found:false`（无法寻址即不存在，同 material get 语义）。
/// 帧损坏 → `Err`（fail-closed，绝不静默当作 fresh）。
pub fn read_blob(dir: &Path, case_id: &str, session_id: &str) -> Result<ReadReply, WorkStateError> {
    let Some(target) = path_for(dir, case_id, session_id) else {
        return Ok(ReadReply::not_found());
    };
    match read_framed(&target)? {
        None => Ok(ReadReply::not_found()),
        Some(framed) => Ok(ReadReply::found(framed.version, framed.bytes)),
    }
}

/// whole-envelope CAS。顺序即语义：
/// 硬上限先闸（fail-closed 拒写，旧版本不动）→ ref 校验 → 读当前 generation →
/// 与 `expected_version` 等值比对（不符即败者拒绝，不写）→ 相符则铸造 `current+1` 原子落盘。
pub fn commit_blob(
    dir: &Path,
    case_id: &str,
    session_id: &str,
    expected_version: Option<&str>,
    bytes: &[u8],
) -> Result<CommitOutcome, WorkStateError> {
    if bytes.len() > HARD_LIMIT_BYTES {
        return Err(WorkStateError::TooLarge { bytes: bytes.len() });
    }
    let Some(target) = path_for(dir, case_id, session_id) else {
        return Err(WorkStateError::InvalidRef);
    };
    let current = read_framed(&target)?;
    let current_version = current.as_ref().map(|framed| framed.version.as_str());
    if current_version != expected_version {
        return Ok(CommitOutcome::Rejected {
            current_version: current_version.unwrap_or("").to_string(),
        });
    }
    let next_generation = current
        .as_ref()
        .and_then(|framed| framed.version.parse::<u64>().ok())
        .unwrap_or(0)
        + 1;
    let version = next_generation.to_string();
    atomic_write_framed(dir, &target, &version, bytes)?;
    Ok(CommitOutcome::Applied {
        version,
        soft_limit_warning: bytes.len() > SOFT_LIMIT_BYTES,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::process::ExitStatusExt;
    use std::process::{Command, Stdio};

    const CASE: &str = "grant-abc-1";
    const SESSION: &str = "8a1f0c2e-0000-4000-8000-000000000001";

    fn temp_dir(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-work-state-{tag}-{}-{}",
            std::process::id(),
            unix_nanos()
        ));
        fs::create_dir_all(&base).expect("create temp dir");
        base
    }

    fn commit(dir: &Path, expected: Option<&str>, bytes: &[u8]) -> CommitOutcome {
        commit_blob(dir, CASE, SESSION, expected, bytes).expect("commit ok")
    }

    // ── round-trip / generation ───────────────────────────────────────────

    #[test]
    fn cas_from_null_mints_generation_and_read_returns_exact_bytes() {
        let dir = temp_dir("roundtrip");
        let payload = br#"{"storageVersion":1,"revision":1}"#;
        let outcome = commit(&dir, None, payload);
        let CommitOutcome::Applied { version, soft_limit_warning } = outcome else {
            panic!("expected applied, got {outcome:?}");
        };
        assert!(!soft_limit_warning);
        let reply = read_blob(&dir, CASE, SESSION).expect("read");
        assert!(reply.found);
        assert_eq!(reply.version.as_deref(), Some(version.as_str()));
        // opaque bytes 原样回读（宿主不改一字节）
        assert_eq!(reply.bytes.as_deref(), Some(&payload[..]));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_of_absent_blob_is_not_found() {
        let dir = temp_dir("absent");
        let reply = read_blob(&dir, CASE, SESSION).expect("read");
        assert!(!reply.found);
        assert!(reply.version.is_none());
        assert!(reply.bytes.is_none());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn generation_is_monotonic_and_opaque_ascii() {
        let dir = temp_dir("monotonic");
        let a = commit(&dir, None, b"a");
        let CommitOutcome::Applied { version: v1, .. } = a else { panic!() };
        let b = commit(&dir, Some(&v1), b"b");
        let CommitOutcome::Applied { version: v2, .. } = b else { panic!() };
        assert_eq!(v1, "1");
        assert_eq!(v2, "2");
        // 落盘帧首行即 generation（换行分隔），换行后是原样 bytes
        let target = path_for(&dir, CASE, SESSION).unwrap();
        let raw = fs::read(&target).unwrap();
        assert_eq!(&raw[..2], b"2\n");
        assert_eq!(&raw[2..], b"b");
        fs::remove_dir_all(&dir).ok();
    }

    // ── CAS 竞争败者拒绝 ───────────────────────────────────────────────────

    #[test]
    fn stale_expected_version_is_rejected_without_clobbering_the_winner() {
        let dir = temp_dir("cas-loser");
        let CommitOutcome::Applied { version: v1, .. } = commit(&dir, None, b"v1") else { panic!() };
        // 赢者把 v1 推进到 v2
        let CommitOutcome::Applied { version: v2, .. } = commit(&dir, Some(&v1), b"v2") else { panic!() };
        // 败者仍持陈旧 v1（真实 resume/并发场景）→ 拒绝，不覆盖 v2
        let loser = commit(&dir, Some(&v1), b"loser");
        assert_eq!(loser, CommitOutcome::Rejected { current_version: v2.clone() });
        // 落盘仍是赢者的 v2 bytes
        let reply = read_blob(&dir, CASE, SESSION).expect("read");
        assert_eq!(reply.version.as_deref(), Some(v2.as_str()));
        assert_eq!(reply.bytes.as_deref(), Some(&b"v2"[..]));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn fresh_expected_null_against_existing_blob_is_rejected() {
        let dir = temp_dir("cas-fresh-existing");
        commit(&dir, None, b"seed");
        // 另一路以 expected=null 起新（误以为 fresh）→ 当前已有 blob → 拒绝
        let rejected = commit(&dir, None, b"overwrite");
        assert!(matches!(rejected, CommitOutcome::Rejected { .. }));
        let reply = read_blob(&dir, CASE, SESSION).expect("read");
        assert_eq!(reply.bytes.as_deref(), Some(&b"seed"[..]));
        fs::remove_dir_all(&dir).ok();
    }

    // ── 大小上限：软告警 / 硬拒写 ─────────────────────────────────────────

    #[test]
    fn soft_limit_crossing_still_writes_but_flags_warning() {
        let dir = temp_dir("soft");
        let big = vec![b'E'; SOFT_LIMIT_BYTES + 1];
        let outcome = commit(&dir, None, &big);
        let CommitOutcome::Applied { soft_limit_warning, .. } = outcome else {
            panic!("expected applied, got {outcome:?}");
        };
        assert!(soft_limit_warning, "越过软上限必须置告警位");
        // 仍已落盘（软上限是告警不是拒绝）
        assert!(read_blob(&dir, CASE, SESSION).expect("read").found);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn hard_limit_crossing_is_fail_closed_and_leaves_old_version_intact() {
        let dir = temp_dir("hard");
        // 先落一个小的完好版本
        let CommitOutcome::Applied { version: v1, .. } = commit(&dir, None, b"small-intact") else { panic!() };
        // 逾越硬上限 → 结构化拒写
        let over = vec![b'X'; HARD_LIMIT_BYTES + 1];
        let err = commit_blob(&dir, CASE, SESSION, Some(&v1), &over).expect_err("must reject");
        assert_eq!(err, WorkStateError::TooLarge { bytes: HARD_LIMIT_BYTES + 1 });
        // 旧版本原地不动
        let reply = read_blob(&dir, CASE, SESSION).expect("read");
        assert_eq!(reply.version.as_deref(), Some(v1.as_str()));
        assert_eq!(reply.bytes.as_deref(), Some(&b"small-intact"[..]));
        fs::remove_dir_all(&dir).ok();
    }

    // ── 路径穿越隔离 ───────────────────────────────────────────────────────

    #[test]
    fn traversal_shaped_ref_is_rejected_and_writes_nothing_outside_dir() {
        let dir = temp_dir("traversal");
        // commit 以穿越形 caseId → InvalidRef，且不在别处落文件
        let err = commit_blob(&dir, "../escape", SESSION, None, b"evil").expect_err("reject");
        assert_eq!(err, WorkStateError::InvalidRef);
        let err2 = commit_blob(&dir, CASE, "a/b", None, b"evil").expect_err("reject");
        assert_eq!(err2, WorkStateError::InvalidRef);
        // read 以穿越形 → 诚实 not_found（无法寻址）
        assert!(!read_blob(&dir, "..", SESSION).expect("read").found);
        // 目录父层未落任何越权文件
        assert!(!dir.parent().unwrap().join("escape").exists());
        assert!(fs::read_dir(&dir).unwrap().next().is_none(), "穿越写不得在目录内留任何文件");
        fs::remove_dir_all(&dir).ok();
    }

    // ── 帧损坏 fail-closed（读侧不静默当 fresh）─────────────────────────────

    #[test]
    fn corrupt_frame_missing_separator_is_fail_closed_on_read_and_commit() {
        let dir = temp_dir("corrupt");
        let target = path_for(&dir, CASE, SESSION).unwrap();
        fs::write(&target, b"no-newline-here").expect("write corrupt");
        // 读损坏帧 → Err（绝不返回 found:false 让 store 误当 fresh 覆盖）
        assert!(matches!(read_blob(&dir, CASE, SESSION), Err(WorkStateError::Io(_))));
        // 提交时读到损坏帧 → 同样 Err（不盲目覆盖未知内容）
        assert!(matches!(
            commit_blob(&dir, CASE, SESSION, None, b"x"),
            Err(WorkStateError::Io(_))
        ));
        fs::remove_dir_all(&dir).ok();
    }

    /// 反例守卫：证明崩溃测试的「完整帧」判定非空转——把一个被截断的帧喂给判定，必须识别为损坏。
    /// （atomic 从不产生截断帧；此处手工制造以坐实判定有分辨力，防假绿。）
    #[test]
    fn inspector_detects_a_deliberately_torn_frame() {
        let dir = temp_dir("torn-detect");
        let target = path_for(&dir, CASE, SESSION).unwrap();
        // 完整帧应被接受
        let full = crash_payload(7);
        {
            let mut framed = Vec::new();
            framed.extend_from_slice(b"7\n");
            framed.extend_from_slice(&full);
            fs::write(&target, &framed).unwrap();
        }
        let reply = read_blob(&dir, CASE, SESSION).expect("full frame reads");
        assert!(inspect_complete(&reply), "完整帧必须判为完整");
        // 截断帧（丢尾字节，破坏 sentinel）应被判为损坏
        {
            let mut framed = Vec::new();
            framed.extend_from_slice(b"7\n");
            framed.extend_from_slice(&full[..full.len() - 16]);
            fs::write(&target, &framed).unwrap();
        }
        let torn = read_blob(&dir, CASE, SESSION).expect("read");
        assert!(!inspect_complete(&torn), "截断帧必须判为损坏（否则崩溃测试假绿）");
        fs::remove_dir_all(&dir).ok();
    }

    // ── kill -9 崩溃注入：commit 中被 SIGKILL，旧版本完好、target 恒完整 ──────
    //
    // 复用 WORK-STORE-MEASURE 度量三手法（crash-inject.mjs）：一个 writer 子进程猛写 CAS，
    // 父进程随机延迟后 kill -9，读回 target 判定是否撕裂。原子替换应恒完整（≥20 次真实 SIGKILL 零撕裂）。
    // 子进程即本测试二进制（`current_exe`）以 `--exact` 过滤只跑 `crash_writer_child`，由环境变量触发写循环。

    /// writer 子进程：仅当被崩溃编排 spawn（置环境变量）时进入无限 CAS 写循环，直到被 SIGKILL；
    /// 正常 `cargo test` 运行（无环境变量）即刻空转通过，不干扰其它测试。
    #[test]
    fn crash_writer_child() {
        let Ok(dir) = std::env::var("COURTWORK_WORK_STATE_CRASH_DIR") else {
            return; // 普通测试运行：no-op
        };
        let dir = PathBuf::from(dir);
        // 无限循环：读当前 generation → 猛写下一版本（每版本一次完整原子替换）。永不返回（被 kill）。
        loop {
            let reply = read_blob(&dir, CASE, SESSION).expect("child read");
            let expected = reply.version.clone();
            let rev: u64 = expected.as_deref().and_then(|v| v.parse().ok()).unwrap_or(0);
            let payload = crash_payload(rev + 1);
            let _ = commit_blob(&dir, CASE, SESSION, expected.as_deref(), &payload);
        }
    }

    /// 轮询 target 当前 generation（读失败/缺失记为 0）。
    fn current_generation(dir: &Path) -> u64 {
        read_blob(dir, CASE, SESSION)
            .ok()
            .and_then(|reply| reply.version)
            .and_then(|version| version.parse::<u64>().ok())
            .unwrap_or(0)
    }

    #[test]
    fn crash_injection_atomic_replace_never_tears_across_real_sigkills() {
        let self_exe = std::env::current_exe().expect("current_exe");
        let trials = 24; // ≥20 次真实 SIGKILL
        let mut killed_by_sig = 0;
        let mut max_version_seen = 0u64;

        for trial in 0..trials {
            let dir = temp_dir(&format!("crash-{trial}"));
            // 通过真实 host 播种完整 v1（generation "1"），target 从 t=0 即存在完整帧
            commit(&dir, None, &crash_payload(1));

            let mut child = Command::new(&self_exe)
                .arg("work_state::tests::crash_writer_child")
                .arg("--exact")
                .env("COURTWORK_WORK_STATE_CRASH_DIR", &dir)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("spawn writer child");

            // 先等 writer 越过播种版本（generation≥2）——证明它已真在写，且随后的 kill 命中「已有文件的
            // 原子替换」（生产真实路径），而非 libtest 启动期。5s 安全上限防子进程异常时挂死。
            let mut waited = 0u64;
            while current_generation(&dir) < 2 && waited < 5000 {
                std::thread::sleep(std::time::Duration::from_millis(1));
                waited += 1;
            }
            // 抖动延迟（1–12ms）后 kill，把 SIGKILL 铺在下一次原子替换的不同相位以命中在途写
            let delay_ms = 1 + (unix_nanos() % 12) as u64;
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
            let _ = child.kill(); // Unix：SIGKILL
            let status = child.wait().expect("wait child");
            if status.signal() == Some(9) {
                killed_by_sig += 1;
            }

            // 崩溃后判定：target 必是某个**完整**版本（version 可解析 + bytes == 该版本 payload），绝不撕裂。
            // 旧版本（在途替换的前一版）与新版本都完整 → 恢复窗口 = 至多 1 次在途 CAS。
            let reply = read_blob(&dir, CASE, SESSION)
                .expect("post-kill read must not surface a corrupt frame");
            assert!(reply.found, "trial {trial}: target 消失（原子替换应始终留下完整版本）");
            let n: u64 = reply.version.clone().unwrap().parse().expect("version 可解析为 generation");
            assert!(
                inspect_complete(&reply),
                "trial {trial}: 帧撕裂——version {n} 的 bytes 与该版本 payload 不符（原子替换被破坏）"
            );
            if n > max_version_seen {
                max_version_seen = n;
            }
            fs::remove_dir_all(&dir).ok();
        }

        assert!(killed_by_sig >= 1, "没有任何一轮投递到真实 SIGKILL（编排失效）");
        assert!(
            max_version_seen >= 2,
            "writer 从未推进过版本（未真正演练已有文件的原子替换，崩溃测试形同虚设）"
        );
    }

    /// 崩溃测试 payload：`<version=rev>` 与 bytes 一一对应，尾部 sentinel `__complete` 用于识别截断。
    /// bytes 足够大（~64KiB）以拉宽写窗口，令随机 kill 更可能命中在途写。
    fn crash_payload(rev: u64) -> Vec<u8> {
        let filler = "E".repeat(64 * 1024);
        format!("{{\"storageVersion\":1,\"revision\":{rev},\"filler\":\"{filler}\",\"__complete\":true}}")
            .into_bytes()
    }

    /// 判定读回的帧是否为某个**完整** crash_payload：version 解析为 rev，bytes 必须逐字节等于 payload(rev)。
    /// 截断/撕裂 → bytes 短于或不等于 payload → 判为不完整。
    fn inspect_complete(reply: &ReadReply) -> bool {
        let (Some(version), Some(bytes)) = (reply.version.as_deref(), reply.bytes.as_deref()) else {
            return false;
        };
        let Ok(rev) = version.parse::<u64>() else {
            return false;
        };
        bytes == crash_payload(rev).as_slice()
    }
}
