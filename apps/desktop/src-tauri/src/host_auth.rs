//! HOST-AUTH-LITE：最小宿主文件授权与失败可见（ADR-010 决定四）。
//!
//! 契约红线：
//! - 绝对路径与授权只住宿主；renderer 只见 opaque `grantId` 与展示 `label`（basename）。
//! - 失败分类是闭集 [`HostAuthReason`]，每类结构化到达 UI，零静默降级、零回落 demo。
//! - 本模块只承载纯逻辑（grant 记录、grant→root 解析、作用域/存活分类、scoped 读写），
//!   全部注入 `store_path`/`root`/`relative` 参数，可无宿主直接单测；系统 picker 与 `AppHandle`
//!   取用等薄封装留在 `lib.rs`。

use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};

/// 授权失败闭集（wire，snake_case）。语义互斥且总覆盖可达文件系统/权限/作用域状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HostAuthReason {
    /// 用户在系统 picker 取消，或 TCC 拒绝授权。
    Denied,
    /// 授权不再持有：grant 记录缺失，或路径存在但被系统拒绝访问。
    Revoked,
    /// 卷卸载或路径不存在，或授权目录当前不可达。
    Unavailable,
    /// 越权路径：绝对、含 `..`、或规范化后逃出 grant root（含符号链接逃逸）。
    OutOfScope,
}

/// 对外 grant（wire，camelCase）：opaque id + 展示 label；**无绝对路径字段**。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostGrant {
    pub grant_id: String,
    pub label: String,
}

/// 持久记录条目（宿主内，含绝对路径；只写 app-data 记录文件，**永不入 renderer wire**）。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct GrantRecordEntry {
    grant_id: String,
    path: String,
    label: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum AuthorizeOutcome {
    Granted { grant: HostGrant },
    Failed { reason: HostAuthReason },
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ReadOutcome {
    Read { bytes: Vec<u8> },
    Failed { reason: HostAuthReason },
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum WriteOutcome {
    Wrote { byte_length: usize },
    Failed { reason: HostAuthReason },
}

/// std::io 错误 → 授权失败类。缺失→unavailable；拒绝→revoked；其余罕见 I/O→unavailable。
fn classify_io(error: &std::io::Error) -> HostAuthReason {
    match error.kind() {
        std::io::ErrorKind::NotFound => HostAuthReason::Unavailable,
        std::io::ErrorKind::PermissionDenied => HostAuthReason::Revoked,
        _ => HostAuthReason::Unavailable,
    }
}

/// 词法作用域：只接受由 `Normal` 组件构成的相对路径；拒绝空、绝对、`.`、`..`、前导 `/`。
fn lexical_relative_ok(relative: &str) -> bool {
    if relative.is_empty() {
        return false;
    }
    let path = Path::new(relative);
    if path.is_absolute() {
        return false;
    }
    let mut any = false;
    for component in path.components() {
        if !matches!(component, Component::Normal(_)) {
            return false;
        }
        any = true;
    }
    any
}

enum RequireExisting {
    Yes,
    No,
}

/// grant root + relative → 规范化后的具体 target；越权/不可达按闭集判定。判定顺序即 SPEC 记载。
fn resolve_target(
    root: &Path,
    relative: &str,
    require: RequireExisting,
) -> Result<PathBuf, HostAuthReason> {
    if !lexical_relative_ok(relative) {
        return Err(HostAuthReason::OutOfScope);
    }
    let canonical_root = root.canonicalize().map_err(|error| classify_io(&error))?;
    let root_meta = fs::metadata(&canonical_root).map_err(|error| classify_io(&error))?;
    if !root_meta.is_dir() {
        return Err(HostAuthReason::Unavailable);
    }
    let joined = canonical_root.join(relative);
    match require {
        RequireExisting::Yes => {
            let canonical_target = joined.canonicalize().map_err(|error| classify_io(&error))?;
            if !canonical_target.starts_with(&canonical_root) {
                return Err(HostAuthReason::OutOfScope);
            }
            Ok(canonical_target)
        }
        RequireExisting::No => {
            let parent = joined.parent().ok_or(HostAuthReason::OutOfScope)?;
            let canonical_parent = parent.canonicalize().map_err(|error| classify_io(&error))?;
            if !canonical_parent.starts_with(&canonical_root) {
                return Err(HostAuthReason::OutOfScope);
            }
            let file_name = joined.file_name().ok_or(HostAuthReason::OutOfScope)?;
            Ok(canonical_parent.join(file_name))
        }
    }
}

/// 授权目录内读取（root 注入，纯函数）。
pub fn scoped_read(root: &Path, relative: &str) -> ReadOutcome {
    match resolve_target(root, relative, RequireExisting::Yes) {
        Ok(target) => match fs::read(&target) {
            Ok(bytes) => ReadOutcome::Read { bytes },
            Err(error) => ReadOutcome::Failed {
                reason: classify_io(&error),
            },
        },
        Err(reason) => ReadOutcome::Failed { reason },
    }
}

/// 授权目录内原子写入（root 注入，纯函数）。同目录临时文件落盘后 rename。
pub fn scoped_write(root: &Path, relative: &str, bytes: &[u8]) -> WriteOutcome {
    let target = match resolve_target(root, relative, RequireExisting::No) {
        Ok(target) => target,
        Err(reason) => return WriteOutcome::Failed { reason },
    };
    match atomic_write(&target, bytes) {
        Ok(()) => WriteOutcome::Wrote {
            byte_length: bytes.len(),
        },
        Err(reason) => WriteOutcome::Failed { reason },
    }
}

fn atomic_write(target: &Path, bytes: &[u8]) -> Result<(), HostAuthReason> {
    let parent = target.parent().ok_or(HostAuthReason::OutOfScope)?;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let temporary = parent.join(format!(".courtwork-host-{}-{nonce}.tmp", std::process::id()));
    let result = (|| -> Result<(), HostAuthReason> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|error| classify_io(&error))?;
        file.write_all(bytes)
            .map_err(|error| classify_io(&error))?;
        file.sync_all().map_err(|error| classify_io(&error))?;
        fs::rename(&temporary, target).map_err(|error| classify_io(&error))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

// ─── grant 记录（宿主持久）─────────────────────────────────────────────────

/// 记录缺失或损坏都收敛为空授权集（诚实呈现「无可用授权」，用户重选一次即可；非静默回落 demo）。
fn load_grants(store_path: &Path) -> Vec<GrantRecordEntry> {
    match fs::read_to_string(store_path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_grants(store_path: &Path, grants: &[GrantRecordEntry]) -> Result<(), String> {
    if let Some(parent) = store_path.parent() {
        fs::create_dir_all(parent).map_err(|_| "无法创建授权记录目录".to_string())?;
    }
    let payload = serde_json::to_string(grants).map_err(|_| "无法序列化授权记录".to_string())?;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let temporary = store_path.with_extension(format!("{}.tmp", nonce));
    fs::write(&temporary, payload).map_err(|_| "无法写入授权记录".to_string())?;
    fs::rename(&temporary, store_path).map_err(|_| {
        let _ = fs::remove_file(&temporary);
        "无法提交授权记录".to_string()
    })?;
    Ok(())
}

/// opaque grant id：不编码路径、进程内唯一、跨重启由记录持久（非确定性铸造无碍——记录即真源）。
fn mint_grant_id(seq: u64, nanos: u128) -> String {
    format!("grant-{nanos:x}-{seq:x}")
}

fn label_for(canonical: &Path) -> String {
    canonical
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "已授权文件夹".to_string())
}

/// 系统 picker 选中路径 → 授权。已授权同一目录复用既有 grantId（幂等），否则铸造并持久。
fn register_grant(
    store_path: &Path,
    picked: &Path,
    seq: u64,
    nanos: u128,
) -> Result<HostGrant, HostAuthReason> {
    let canonical = picked.canonicalize().map_err(|error| classify_io(&error))?;
    let meta = fs::metadata(&canonical).map_err(|error| classify_io(&error))?;
    if !meta.is_dir() {
        return Err(HostAuthReason::Unavailable);
    }
    let canonical_str = canonical.to_string_lossy().into_owned();
    let mut grants = load_grants(store_path);
    if let Some(existing) = grants.iter().find(|entry| entry.path == canonical_str) {
        return Ok(HostGrant {
            grant_id: existing.grant_id.clone(),
            label: existing.label.clone(),
        });
    }
    let label = label_for(&canonical);
    let grant_id = mint_grant_id(seq, nanos);
    grants.push(GrantRecordEntry {
        grant_id: grant_id.clone(),
        path: canonical_str,
        label: label.clone(),
    });
    save_grants(store_path, &grants).map_err(|_| HostAuthReason::Unavailable)?;
    Ok(HostGrant { grant_id, label })
}

/// picker 结果 → 授权终态。`None`（取消/TCC 拒绝）→ `denied`。
pub fn authorize_from_pick(
    store_path: &Path,
    pick: Option<PathBuf>,
    seq: u64,
    nanos: u128,
) -> AuthorizeOutcome {
    match pick {
        None => AuthorizeOutcome::Failed {
            reason: HostAuthReason::Denied,
        },
        Some(path) => match register_grant(store_path, &path, seq, nanos) {
            Ok(grant) => AuthorizeOutcome::Granted { grant },
            Err(reason) => AuthorizeOutcome::Failed { reason },
        },
    }
}

/// 已持久授权 → 对外 grant（剥离绝对路径）。重启后 `listGrants` 据此可见。
pub fn public_grants(store_path: &Path) -> Vec<HostGrant> {
    load_grants(store_path)
        .into_iter()
        .map(|entry| HostGrant {
            grant_id: entry.grant_id,
            label: entry.label,
        })
        .collect()
}

/// grantId → 授权 root 绝对路径；未知 grant → `None`（命令层映射为 `revoked`）。
fn resolve_root(store_path: &Path, grant_id: &str) -> Option<PathBuf> {
    load_grants(store_path)
        .into_iter()
        .find(|entry| entry.grant_id == grant_id)
        .map(|entry| PathBuf::from(entry.path))
}

/// CASE-ROOT-1：grantId → 案件根绝对路径的宿主侧解析入口。opaque case ref 即 grantId；
/// 绝对路径只在此（宿主侧）由记录还原，renderer/wire 永不携带。未知 grant → `None`
/// （命令层据此显式失败，绝不静默指向别的路径）。
pub fn grant_root(store_path: &Path, grant_id: &str) -> Option<PathBuf> {
    resolve_root(store_path, grant_id)
}

/// 命令层读入口：grant→root（未知→revoked），再作用域内读。
pub fn read_in_grant(store_path: &Path, grant_id: &str, relative: &str) -> ReadOutcome {
    match resolve_root(store_path, grant_id) {
        Some(root) => scoped_read(&root, relative),
        None => ReadOutcome::Failed {
            reason: HostAuthReason::Revoked,
        },
    }
}

/// 命令层写入口：grant→root（未知→revoked），再作用域内原子写。
pub fn write_in_grant(
    store_path: &Path,
    grant_id: &str,
    relative: &str,
    bytes: &[u8],
) -> WriteOutcome {
    match resolve_root(store_path, grant_id) {
        Some(root) => scoped_write(&root, relative, bytes),
        None => WriteOutcome::Failed {
            reason: HostAuthReason::Revoked,
        },
    }
}

// ─── 作用域内目录枚举（MATERIAL-INGRESS-1：文件夹授权 → 就地入库的文件清单）────────
// 只列单层直接子项、只回文件（跳过子目录、符号链接、以 `.` 起头的隐藏/临时项）；
// relativePath 相对 grant root（与 read/write 同一相对寻址契约，绝不返回绝对路径）。

/// 单个可入库文件项（wire，camelCase）：relativePath 供后续读取寻址，fileName 供展示。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub relative_path: String,
    pub file_name: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ListDirOutcome {
    Listed { entries: Vec<DirEntry> },
    Failed { reason: HostAuthReason },
}

/// 授权目录内单层文件枚举（root 注入，纯函数）。`relative_dir` 为空即 grant root 本身。
/// 只回文件（非目录、非符号链接、非隐藏），结果按 relativePath 稳定排序。
pub fn scoped_list_dir(root: &Path, relative_dir: &str) -> ListDirOutcome {
    let dir = if relative_dir.is_empty() {
        let canonical_root = match root.canonicalize() {
            Ok(path) => path,
            Err(error) => {
                return ListDirOutcome::Failed {
                    reason: classify_io(&error),
                }
            }
        };
        match fs::metadata(&canonical_root) {
            Ok(meta) if meta.is_dir() => canonical_root,
            Ok(_) => {
                return ListDirOutcome::Failed {
                    reason: HostAuthReason::Unavailable,
                }
            }
            Err(error) => {
                return ListDirOutcome::Failed {
                    reason: classify_io(&error),
                }
            }
        }
    } else {
        match resolve_target(root, relative_dir, RequireExisting::Yes) {
            Ok(target) => target,
            Err(reason) => return ListDirOutcome::Failed { reason },
        }
    };
    let read = match fs::read_dir(&dir) {
        Ok(read) => read,
        Err(error) => {
            return ListDirOutcome::Failed {
                reason: classify_io(&error),
            }
        }
    };
    let prefix = relative_dir.trim_end_matches('/');
    let mut entries: Vec<DirEntry> = Vec::new();
    for item in read.flatten() {
        let name = item.file_name().to_string_lossy().into_owned();
        // 跳过隐藏/临时项（含本进程原子写残留 `.courtwork-*.tmp`）。
        if name.starts_with('.') {
            continue;
        }
        let meta = match fs::symlink_metadata(item.path()) {
            Ok(meta) => meta,
            Err(_) => continue,
        };
        // 只回实体文件：符号链接一律排除（不跟随，杜绝逃逸枚举）。
        if meta.file_type().is_symlink() || !meta.is_file() {
            continue;
        }
        let relative_path = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{prefix}/{name}")
        };
        entries.push(DirEntry {
            relative_path,
            file_name: name,
        });
    }
    entries.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    ListDirOutcome::Listed { entries }
}

/// 命令层枚举入口：grant→root（未知→revoked），再作用域内单层文件枚举。
pub fn list_dir_in_grant(store_path: &Path, grant_id: &str, relative_dir: &str) -> ListDirOutcome {
    match resolve_root(store_path, grant_id) {
        Some(root) => scoped_list_dir(&root, relative_dir),
        None => ListDirOutcome::Failed {
            reason: HostAuthReason::Revoked,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-host-auth-{tag}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&base).expect("create temp root");
        base
    }

    fn reason_of_read(outcome: ReadOutcome) -> Option<HostAuthReason> {
        match outcome {
            ReadOutcome::Failed { reason } => Some(reason),
            ReadOutcome::Read { .. } => None,
        }
    }

    fn reason_of_write(outcome: WriteOutcome) -> Option<HostAuthReason> {
        match outcome {
            WriteOutcome::Failed { reason } => Some(reason),
            WriteOutcome::Wrote { .. } => None,
        }
    }

    #[test]
    fn lexical_scope_rejects_absolute_parent_and_empty() {
        assert!(lexical_relative_ok("材料/合同.pdf"));
        assert!(lexical_relative_ok("marker.txt"));
        assert!(!lexical_relative_ok(""));
        assert!(!lexical_relative_ok("/etc/passwd"));
        assert!(!lexical_relative_ok("../escape.txt"));
        assert!(!lexical_relative_ok("sub/../../escape.txt"));
        assert!(!lexical_relative_ok("./relative.txt"));
    }

    #[test]
    fn classify_io_maps_missing_and_denied() {
        assert_eq!(
            classify_io(&std::io::Error::from(std::io::ErrorKind::NotFound)),
            HostAuthReason::Unavailable
        );
        assert_eq!(
            classify_io(&std::io::Error::from(std::io::ErrorKind::PermissionDenied)),
            HostAuthReason::Revoked
        );
        assert_eq!(
            classify_io(&std::io::Error::from(std::io::ErrorKind::Other)),
            HostAuthReason::Unavailable
        );
    }

    #[test]
    fn happy_path_write_then_read_round_trips_within_grant() {
        let root = temp_root("happy");
        // root 层直接写读往返
        let wrote = scoped_write(&root, "access-check.txt", b"host-auth-lite");
        assert!(matches!(wrote, WriteOutcome::Wrote { byte_length } if byte_length == 14));
        match scoped_read(&root, "access-check.txt") {
            ReadOutcome::Read { bytes } => assert_eq!(bytes, b"host-auth-lite"),
            ReadOutcome::Failed { reason } => panic!("expected read, got {reason:?}"),
        }
        // 已存在子目录内写读往返
        fs::create_dir_all(root.join("材料")).expect("subdir");
        let wrote = scoped_write(&root, "材料/notice.txt", b"host-auth-lite");
        assert!(matches!(wrote, WriteOutcome::Wrote { byte_length } if byte_length == 14));
        match scoped_read(&root, "材料/notice.txt") {
            ReadOutcome::Read { bytes } => assert_eq!(bytes, b"host-auth-lite"),
            ReadOutcome::Failed { reason } => panic!("expected read, got {reason:?}"),
        }
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn write_into_missing_subdir_is_unavailable_not_created() {
        // 设计边界：write 不创建中间目录；父目录缺失显式 unavailable，绝不静默建树。
        let root = temp_root("no-mkdir");
        assert_eq!(
            reason_of_write(scoped_write(&root, "缺失子目录/notice.txt", b"x")),
            Some(HostAuthReason::Unavailable)
        );
        assert!(!root.join("缺失子目录").exists());
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn read_missing_file_is_unavailable_not_silent() {
        let root = temp_root("missing");
        assert_eq!(
            reason_of_read(scoped_read(&root, "absent.txt")),
            Some(HostAuthReason::Unavailable)
        );
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn unmounted_or_missing_root_is_unavailable() {
        let root = temp_root("gone");
        let missing_root = root.join("never-existed");
        assert_eq!(
            reason_of_read(scoped_read(&missing_root, "any.txt")),
            Some(HostAuthReason::Unavailable)
        );
        assert_eq!(
            reason_of_write(scoped_write(&missing_root, "any.txt", b"x")),
            Some(HostAuthReason::Unavailable)
        );
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn traversal_relative_is_out_of_scope_and_reads_nothing() {
        let root = temp_root("traversal");
        // 在 root 外落一个秘密文件
        let outside = root.parent().unwrap().join(format!(
            "courtwork-secret-{}.txt",
            std::process::id()
        ));
        fs::write(&outside, b"top-secret").expect("write secret");
        assert_eq!(
            reason_of_read(scoped_read(&root, "../".to_string().as_str())),
            Some(HostAuthReason::OutOfScope)
        );
        let escape = format!("../{}", outside.file_name().unwrap().to_string_lossy());
        assert_eq!(
            reason_of_read(scoped_read(&root, &escape)),
            Some(HostAuthReason::OutOfScope)
        );
        fs::remove_file(&outside).ok();
        fs::remove_dir_all(&root).ok();
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escape_is_out_of_scope() {
        use std::os::unix::fs::symlink;
        let root = temp_root("symlink");
        let outside = root.parent().unwrap().join(format!(
            "courtwork-symtarget-{}.txt",
            std::process::id()
        ));
        fs::write(&outside, b"outside-bytes").expect("write outside");
        // root 内放一个逃逸符号链接
        symlink(&outside, root.join("link.txt")).expect("symlink");
        assert_eq!(
            reason_of_read(scoped_read(&root, "link.txt")),
            Some(HostAuthReason::OutOfScope)
        );
        fs::remove_file(&outside).ok();
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn grant_record_round_trips_and_unknown_resolves_none() {
        let store = temp_root("record").join("host-grants.json");
        let entries = vec![
            GrantRecordEntry {
                grant_id: "grant-a".into(),
                path: "/abs/case-a".into(),
                label: "case-a".into(),
            },
            GrantRecordEntry {
                grant_id: "grant-b".into(),
                path: "/abs/case-b".into(),
                label: "case-b".into(),
            },
        ];
        save_grants(&store, &entries).expect("save");
        let loaded = load_grants(&store);
        assert_eq!(loaded, entries);
        assert!(resolve_root(&store, "grant-a").is_some());
        assert!(resolve_root(&store, "grant-unknown").is_none());
        // public_grants 剥离绝对路径
        let public = public_grants(&store);
        assert_eq!(public.len(), 2);
        let serialized = serde_json::to_string(&public).expect("serialize public");
        assert!(!serialized.contains("/abs/"));
        assert!(serialized.contains("grantId"));
        assert!(serialized.contains("label"));
        fs::remove_dir_all(store.parent().unwrap()).ok();
    }

    #[test]
    fn grant_root_isolates_cases_and_never_reaches_a_sibling_case() {
        // CASE-ROOT-1：两案各自授权 → 各自 grantId 解析出各自根；
        // case A 的 grantId 解析根内的相对寻址永不触达 case B 的路径（out_of_scope 触红）。
        let base = temp_root("case-isolate");
        let root_a = base.join("case-a");
        let root_b = base.join("case-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");
        // case B 内落一份机密，验证 case A 的 grant 无法读到
        fs::write(root_b.join("secret.txt"), b"case-b-secret").expect("secret");

        let store = base.join("host-grants.json");
        let grant_a = match authorize_from_pick(&store, Some(root_a.clone()), 1, 11) {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("grant a: {reason:?}"),
        };
        let grant_b = match authorize_from_pick(&store, Some(root_b.clone()), 2, 22) {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("grant b: {reason:?}"),
        };
        assert_ne!(grant_a.grant_id, grant_b.grant_id);

        // grantId 解析出各自根
        let resolved_a = grant_root(&store, &grant_a.grant_id).expect("root a");
        let resolved_b = grant_root(&store, &grant_b.grant_id).expect("root b");
        assert_eq!(resolved_a, root_a.canonicalize().unwrap());
        assert_eq!(resolved_b, root_b.canonicalize().unwrap());
        assert_ne!(resolved_a, resolved_b);

        // 跨 case 逃逸：case A 的 grant + 指向同级 case B 的相对路径 → out_of_scope
        let escape = format!("../{}/secret.txt", root_b.file_name().unwrap().to_string_lossy());
        assert_eq!(
            reason_of_read(read_in_grant(&store, &grant_a.grant_id, &escape)),
            Some(HostAuthReason::OutOfScope)
        );
        fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn reauthorizing_a_new_folder_keeps_old_grant_pointing_at_its_own_root() {
        // CASE-ROOT-1 重授权：旧 grant 必须稳定指向自己的旧根，绝不因新授权被静默重指到新路径。
        let base = temp_root("reauth");
        let root_old = base.join("old-folder");
        let root_new = base.join("new-folder");
        fs::create_dir_all(&root_old).expect("old");
        fs::create_dir_all(&root_new).expect("new");
        let store = base.join("host-grants.json");

        let old = match authorize_from_pick(&store, Some(root_old.clone()), 1, 1) {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("old: {reason:?}"),
        };
        let new = match authorize_from_pick(&store, Some(root_new.clone()), 2, 2) {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("new: {reason:?}"),
        };
        assert_ne!(old.grant_id, new.grant_id, "不同目录必须铸造不同 grantId");
        // 旧 grantId 仍解析到旧根，新 grantId 解析到新根，互不串扰
        assert_eq!(grant_root(&store, &old.grant_id).unwrap(), root_old.canonicalize().unwrap());
        assert_eq!(grant_root(&store, &new.grant_id).unwrap(), root_new.canonicalize().unwrap());
        fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn corrupt_record_is_empty_not_fatal() {
        let store = temp_root("corrupt").join("host-grants.json");
        fs::write(&store, b"not-json{{{").expect("write corrupt");
        assert!(load_grants(&store).is_empty());
        assert!(public_grants(&store).is_empty());
        fs::remove_dir_all(store.parent().unwrap()).ok();
    }

    #[test]
    fn unknown_grant_reads_and_writes_revoked() {
        let store = temp_root("revoked").join("host-grants.json");
        assert_eq!(
            reason_of_read(read_in_grant(&store, "grant-nope", "x.txt")),
            Some(HostAuthReason::Revoked)
        );
        assert_eq!(
            reason_of_write(write_in_grant(&store, "grant-nope", "x.txt", b"x")),
            Some(HostAuthReason::Revoked)
        );
        fs::remove_dir_all(store.parent().unwrap()).ok();
    }

    fn listed_paths(outcome: ListDirOutcome) -> Vec<String> {
        match outcome {
            ListDirOutcome::Listed { entries } => {
                entries.into_iter().map(|entry| entry.relative_path).collect()
            }
            ListDirOutcome::Failed { reason } => panic!("expected listing, got {reason:?}"),
        }
    }

    #[test]
    fn scoped_list_dir_lists_files_only_and_skips_dirs_symlinks_hidden() {
        let root = temp_root("list");
        fs::write(root.join("合同.md"), b"contract").expect("md");
        fs::write(root.join("清单.txt"), b"list").expect("txt");
        fs::create_dir_all(root.join("子目录")).expect("subdir"); // 目录不入列
        fs::write(root.join(".hidden"), b"x").expect("hidden"); // 隐藏不入列
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let outside = root.parent().unwrap().join(format!(
                "courtwork-listtarget-{}.txt",
                std::process::id()
            ));
            fs::write(&outside, b"outside").expect("outside");
            symlink(&outside, root.join("逃逸.txt")).expect("symlink"); // 符号链接不入列
            let paths = listed_paths(scoped_list_dir(&root, ""));
            assert_eq!(paths, vec!["合同.md".to_string(), "清单.txt".to_string()]);
            fs::remove_file(&outside).ok();
        }
        #[cfg(not(unix))]
        {
            let paths = listed_paths(scoped_list_dir(&root, ""));
            assert_eq!(paths, vec!["合同.md".to_string(), "清单.txt".to_string()]);
        }
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn scoped_list_dir_scopes_a_subdirectory_with_prefixed_relative_paths() {
        let root = temp_root("list-sub");
        fs::create_dir_all(root.join("材料")).expect("subdir");
        fs::write(root.join("材料/证据.md"), b"evidence").expect("md");
        let paths = listed_paths(scoped_list_dir(&root, "材料"));
        assert_eq!(paths, vec!["材料/证据.md".to_string()]);
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn scoped_list_dir_traversal_is_out_of_scope() {
        let root = temp_root("list-escape");
        let outcome = scoped_list_dir(&root, "../");
        assert!(matches!(
            outcome,
            ListDirOutcome::Failed {
                reason: HostAuthReason::OutOfScope
            }
        ));
        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn list_dir_in_grant_unknown_grant_is_revoked() {
        let store = temp_root("list-revoked").join("host-grants.json");
        assert!(matches!(
            list_dir_in_grant(&store, "grant-nope", ""),
            ListDirOutcome::Failed {
                reason: HostAuthReason::Revoked
            }
        ));
        fs::remove_dir_all(store.parent().unwrap()).ok();
    }

    #[test]
    fn authorize_from_pick_denies_on_cancel_and_grants_on_pick() {
        let store = temp_root("authorize").join("host-grants.json");
        let denied = authorize_from_pick(&store, None, 1, 1);
        assert!(matches!(
            denied,
            AuthorizeOutcome::Failed {
                reason: HostAuthReason::Denied
            }
        ));

        let picked = temp_root("picked");
        let granted = authorize_from_pick(&store, Some(picked.clone()), 7, 42);
        let grant = match granted {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("expected grant, got {reason:?}"),
        };
        assert_eq!(grant.label, picked.canonicalize().unwrap().file_name().unwrap().to_string_lossy());
        // grant wire 无绝对路径
        let serialized = serde_json::to_string(&grant).expect("serialize grant");
        assert!(!serialized.contains('/'));
        assert!(serialized.contains("grantId"));

        // 幂等：同目录复用 grantId，读写按 handle 成功往返
        let granted_again = authorize_from_pick(&store, Some(picked.clone()), 9, 99);
        let grant_again = match granted_again {
            AuthorizeOutcome::Granted { grant } => grant,
            AuthorizeOutcome::Failed { reason } => panic!("expected grant, got {reason:?}"),
        };
        assert_eq!(grant_again.grant_id, grant.grant_id);

        let wrote = write_in_grant(&store, &grant.grant_id, "access-check.txt", b"ok");
        assert!(matches!(wrote, WriteOutcome::Wrote { .. }));
        let read = read_in_grant(&store, &grant.grant_id, "access-check.txt");
        assert!(matches!(read, ReadOutcome::Read { bytes } if bytes == b"ok"));

        fs::remove_dir_all(&picked).ok();
        fs::remove_dir_all(store.parent().unwrap()).ok();
    }

    #[test]
    fn outcome_wire_shapes_are_closed_and_tagged() {
        let granted = AuthorizeOutcome::Granted {
            grant: HostGrant {
                grant_id: "g1".into(),
                label: "case".into(),
            },
        };
        assert_eq!(
            serde_json::to_value(granted).unwrap(),
            serde_json::json!({"status":"granted","grant":{"grantId":"g1","label":"case"}})
        );
        let failed = ReadOutcome::Failed {
            reason: HostAuthReason::OutOfScope,
        };
        assert_eq!(
            serde_json::to_value(failed).unwrap(),
            serde_json::json!({"status":"failed","reason":"out_of_scope"})
        );
        for reason in [
            HostAuthReason::Denied,
            HostAuthReason::Revoked,
            HostAuthReason::Unavailable,
            HostAuthReason::OutOfScope,
        ] {
            let value = serde_json::to_value(reason).unwrap();
            assert!(value.is_string());
        }
    }
}
