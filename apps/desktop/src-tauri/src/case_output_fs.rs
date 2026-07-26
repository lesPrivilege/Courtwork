//! CONTRACT-OUTPUT-TRUTH-1：案件产出目录的**唯一**安全实现。
//!
//! 本模块是本票 Rust 面的全部——dirfd 锚定、no-follow 打开、`*at` 系列调用、流式 SHA-256、
//! 原子 no-replace 发布与可注入 syscall seam 全住这里；`lib.rs` 只留 command 与 wiring。
//!
//! **为什么必须走 dirfd 而不是路径**：按路径解析会在「校验」与「使用」之间留下窗口——校验完
//! `产出/` 是真目录之后、打开目标之前，它可以被换成 symlink。把 case root 与 `产出/` 各锚成一个
//! 文件描述符，之后全部相对该 fd 用单段文件名操作，攻击者换掉路径上的任何一环都不会改变我们
//! 已经握住的那个目录。这是 `secure_output_dir` 的 canonicalize 做不到的。
//!
//! **平台**：production 强实现只在 macOS 编译，消费 `O_NOFOLLOW_ANY`（拒绝路径上**任一**环节
//! 是符号链接，而不只是最后一段）。非 macOS target 必须继续编译，但固定返回 typed
//! `failed/unavailable`——不得以 `canonicalize`/路径重开/`rename` 或较弱的 no-follow 另造
//! fallback：弱实现会让「本平台不支持」悄悄变成「本平台安全性更低」。

use serde::Serialize;
use std::path::Path;

/// 失败原因闭集。与 renderer 的 `CaseOutputFailureReason` 逐字同形。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CaseOutputFailureReason {
    /// 系统/TCC 或用户拒绝。
    Denied,
    /// grant 失效。
    Revoked,
    /// 路径逃逸、产出目录或目标是 symlink / 非实体文件。
    OutOfScope,
    /// 卷不可达、普通 IO / hash / link / sync 失败，以及本平台无强实现。
    Unavailable,
    /// 非法文件名或非 DOCX 输入。
    InvalidInput,
}

/// `statDocx` 的结果联合。`missing` 是**明确确认不存在**，不是失败。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CaseOutputStatResult {
    Missing,
    Found {
        #[serde(rename = "byteLength")]
        byte_length: u64,
        sha256: String,
    },
    Failed {
        reason: CaseOutputFailureReason,
    },
}

/// `writeDocxNoReplace` 的结果联合。`exists` 是发布时目标已在（EEXIST），零覆盖。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CaseOutputWriteResult {
    Written {
        #[serde(rename = "byteLength")]
        byte_length: u64,
    },
    Exists,
    Failed {
        reason: CaseOutputFailureReason,
    },
}

/// 产出目录名。单层、固定，绝不由调用方拼接。
pub const OUTPUT_DIR_NAME: &str = "产出";

/// 文件名闭口：必须是单段、`.docx`、非 `.`/`..`，且不含任何分隔符或 NUL。
///
/// NUL 单独挡：C 字符串在第一个 NUL 处截断，`"a\0.docx"` 会被内核看成 `"a"`——
/// 校验与实际操作对象就此错位。
pub fn validate_single_docx_name(file_name: &str) -> Result<(), CaseOutputFailureReason> {
    if file_name.is_empty()
        || file_name == "."
        || file_name == ".."
        || file_name.contains('/')
        || file_name.contains('\\')
        || file_name.contains('\0')
    {
        return Err(CaseOutputFailureReason::InvalidInput);
    }
    if !file_name.to_lowercase().ends_with(".docx") {
        return Err(CaseOutputFailureReason::InvalidInput);
    }
    Ok(())
}

/// DOCX 输入闭口：ZIP 容器魔数。非 docx 输入属 `invalid_input`，不是 IO 失败。
pub fn validate_docx_bytes(bytes: &[u8]) -> Result<(), CaseOutputFailureReason> {
    if bytes.starts_with(b"PK") {
        Ok(())
    } else {
        Err(CaseOutputFailureReason::InvalidInput)
    }
}

#[cfg(target_os = "macos")]
mod imp {
    use super::{
        validate_docx_bytes, validate_single_docx_name, CaseOutputFailureReason,
        CaseOutputStatResult, CaseOutputWriteResult, OUTPUT_DIR_NAME,
    };
    use sha2::{Digest, Sha256};
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    use std::path::Path;
    use std::sync::atomic::{AtomicU64, Ordering};

    /// macOS 专属：拒绝路径上**任一**环节是符号链接。`O_NOFOLLOW` 只管最后一段，不够。
    const O_NOFOLLOW_ANY: libc::c_int = 0x2000_0000;

    /// 目录打开标志：只读、必须是目录、全路径 no-follow、不成为控制终端。
    const DIR_FLAGS: libc::c_int =
        libc::O_RDONLY | libc::O_DIRECTORY | libc::O_CLOEXEC | O_NOFOLLOW_ANY;

    /// 拥有所有权的文件描述符：Drop 即 close，任何提前 return 都不漏 fd。
    struct OwnedFd(libc::c_int);

    impl OwnedFd {
        fn raw(&self) -> libc::c_int {
            self.0
        }
    }

    impl Drop for OwnedFd {
        fn drop(&mut self) {
            if self.0 >= 0 {
                // close 的失败无处上报，也无从补救；这里只保证不泄漏。
                unsafe { libc::close(self.0) };
            }
        }
    }

    fn cstring(bytes: &[u8]) -> Result<CString, CaseOutputFailureReason> {
        CString::new(bytes).map_err(|_| CaseOutputFailureReason::InvalidInput)
    }

    fn errno() -> libc::c_int {
        std::io::Error::last_os_error()
            .raw_os_error()
            .unwrap_or(libc::EIO)
    }

    /// errno → 闭集。`ELOOP`/`ENOTDIR` 是 no-follow 拒绝的信号，属越界而非 IO 抖动。
    fn reason_for(err: libc::c_int) -> CaseOutputFailureReason {
        match err {
            libc::EACCES | libc::EPERM => CaseOutputFailureReason::Denied,
            libc::ELOOP | libc::ENOTDIR | libc::EMLINK => CaseOutputFailureReason::OutOfScope,
            _ => CaseOutputFailureReason::Unavailable,
        }
    }

    /// 把 case root 锚成 dirfd。root 本身不可达/不是目录/路径含 symlink 一律拒。
    fn open_case_root(case_root: &Path) -> Result<OwnedFd, CaseOutputFailureReason> {
        let path = cstring(case_root.as_os_str().as_bytes())?;
        let fd = unsafe { libc::open(path.as_ptr(), DIR_FLAGS) };
        if fd < 0 {
            let err = errno();
            return Err(if err == libc::ENOENT {
                CaseOutputFailureReason::Revoked
            } else {
                reason_for(err)
            });
        }
        Ok(OwnedFd(fd))
    }

    /// 相对 case-root dirfd 打开 `产出/`。**不 mkdir**——建目录只属 deliver。
    fn open_output_dir(root: &OwnedFd) -> Result<Option<OwnedFd>, CaseOutputFailureReason> {
        let name = cstring(OUTPUT_DIR_NAME.as_bytes())?;
        let fd = unsafe { libc::openat(root.raw(), name.as_ptr(), DIR_FLAGS) };
        if fd < 0 {
            let err = errno();
            if err == libc::ENOENT {
                return Ok(None);
            }
            return Err(reason_for(err));
        }
        Ok(Some(OwnedFd(fd)))
    }

    /// deliver 专用：经 case-root dirfd `mkdirat` 建单层产出目录，EEXIST 后仍按 no-follow 重开。
    fn ensure_output_dir(root: &OwnedFd) -> Result<OwnedFd, CaseOutputFailureReason> {
        if let Some(existing) = open_output_dir(root)? {
            return Ok(existing);
        }
        let name = cstring(OUTPUT_DIR_NAME.as_bytes())?;
        let made = unsafe { libc::mkdirat(root.raw(), name.as_ptr(), 0o700) };
        if made < 0 {
            let err = errno();
            if err != libc::EEXIST {
                return Err(reason_for(err));
            }
        }
        // EEXIST 之后**重新**按 no-follow 规则打开：竞态里刚被塞进来的 symlink 必须在此被拒。
        open_output_dir(root)?.ok_or(CaseOutputFailureReason::Unavailable)
    }

    /// 从**同一打开句柄**核验 regular file、读长度并流式 SHA-256。
    /// 禁止 `symlink_metadata → 按路径另读`：那是两次解析，中间可换。
    fn stat_and_hash(dir: &OwnedFd, file_name: &str) -> Result<CaseOutputStatResult, CaseOutputFailureReason> {
        let name = cstring(file_name.as_bytes())?;
        let flags = libc::O_RDONLY | libc::O_CLOEXEC | libc::O_NOFOLLOW;
        let fd = unsafe { libc::openat(dir.raw(), name.as_ptr(), flags) };
        if fd < 0 {
            let err = errno();
            if err == libc::ENOENT {
                return Ok(CaseOutputStatResult::Missing);
            }
            return Err(reason_for(err));
        }
        let file = OwnedFd(fd);

        let mut st: libc::stat = unsafe { std::mem::zeroed() };
        if unsafe { libc::fstat(file.raw(), &mut st) } < 0 {
            return Err(reason_for(errno()));
        }
        if st.st_mode & libc::S_IFMT != libc::S_IFREG {
            return Err(CaseOutputFailureReason::OutOfScope);
        }

        let mut hasher = Sha256::new();
        let mut buffer = vec![0_u8; 64 * 1024];
        let mut total: u64 = 0;
        loop {
            let read = unsafe {
                libc::read(
                    file.raw(),
                    buffer.as_mut_ptr() as *mut libc::c_void,
                    buffer.len(),
                )
            };
            if read < 0 {
                return Err(reason_for(errno()));
            }
            if read == 0 {
                break;
            }
            let read = read as usize;
            hasher.update(&buffer[..read]);
            total += read as u64;
        }
        Ok(CaseOutputStatResult::Found {
            byte_length: total,
            sha256: format!("{:x}", hasher.finalize()),
        })
    }

    static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

    fn temp_name() -> String {
        let seq = TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
        format!(".courtwork-{}-{}.tmp", std::process::id(), seq)
    }

    /// 原子 no-replace 发布：exclusive temp 写满 + fsync → `linkat` 到目标 → `unlinkat` temp。
    ///
    /// **绝不 fallback rename**：`rename` 会静默覆盖已有目标，那正是本票要退役的行为。
    /// `linkat` 的 EEXIST 是「目标已在」的确定信号，不是错误。
    fn publish(
        dir: &OwnedFd,
        file_name: &str,
        bytes: &[u8],
    ) -> Result<CaseOutputWriteResult, CaseOutputFailureReason> {
        let temp = temp_name();
        let temp_c = cstring(temp.as_bytes())?;
        let target_c = cstring(file_name.as_bytes())?;

        let flags = libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL | libc::O_CLOEXEC | libc::O_NOFOLLOW;
        let fd = unsafe { libc::openat(dir.raw(), temp_c.as_ptr(), flags, 0o600) };
        if fd < 0 {
            return Err(reason_for(errno()));
        }

        let cleanup = |dir: &OwnedFd, temp: &CString| {
            unsafe { libc::unlinkat(dir.raw(), temp.as_ptr(), 0) };
        };

        let write_and_sync = || -> Result<(), CaseOutputFailureReason> {
            let file = OwnedFd(fd);
            let mut written = 0_usize;
            while written < bytes.len() {
                let n = unsafe {
                    libc::write(
                        file.raw(),
                        bytes[written..].as_ptr() as *const libc::c_void,
                        bytes.len() - written,
                    )
                };
                if n < 0 {
                    return Err(reason_for(errno()));
                }
                if n == 0 {
                    return Err(CaseOutputFailureReason::Unavailable);
                }
                written += n as usize;
            }
            // 先把内容落稳再发布：发布后崩溃也不会留下一个半截的目标文件。
            if unsafe { libc::fsync(file.raw()) } < 0 {
                return Err(reason_for(errno()));
            }
            Ok(())
        };

        if let Err(reason) = write_and_sync() {
            cleanup(dir, &temp_c);
            return Err(reason);
        }

        let linked = unsafe {
            libc::linkat(
                dir.raw(),
                temp_c.as_ptr(),
                dir.raw(),
                target_c.as_ptr(),
                0,
            )
        };
        if linked < 0 {
            let err = errno();
            cleanup(dir, &temp_c);
            if err == libc::EEXIST {
                return Ok(CaseOutputWriteResult::Exists);
            }
            // 卷不支持 hard link（EOPNOTSUPP/EXDEV 等）同样是失败，不许退回 rename。
            return Err(reason_for(err));
        }

        // 目标已经建立。此后任何失败都是 **effect unknown**——目标可能已在，调用方必须重新 stat。
        if unsafe { libc::unlinkat(dir.raw(), temp_c.as_ptr(), 0) } < 0 {
            return Err(CaseOutputFailureReason::Unavailable);
        }
        if unsafe { libc::fsync(dir.raw()) } < 0 {
            return Err(CaseOutputFailureReason::Unavailable);
        }
        Ok(CaseOutputWriteResult::Written {
            byte_length: bytes.len() as u64,
        })
    }

    pub fn stat_docx(case_root: &Path, file_name: &str) -> CaseOutputStatResult {
        if let Err(reason) = validate_single_docx_name(file_name) {
            return CaseOutputStatResult::Failed { reason };
        }
        let root = match open_case_root(case_root) {
            Ok(fd) => fd,
            Err(reason) => return CaseOutputStatResult::Failed { reason },
        };
        // inspect 遇产出目录不存在直接 missing，**不得 mkdir**：只读的询问不该有副作用。
        let output = match open_output_dir(&root) {
            Ok(Some(fd)) => fd,
            Ok(None) => return CaseOutputStatResult::Missing,
            Err(reason) => return CaseOutputStatResult::Failed { reason },
        };
        match stat_and_hash(&output, file_name) {
            Ok(result) => result,
            Err(reason) => CaseOutputStatResult::Failed { reason },
        }
    }

    pub fn write_docx_no_replace(
        case_root: &Path,
        file_name: &str,
        bytes: &[u8],
    ) -> CaseOutputWriteResult {
        if let Err(reason) = validate_single_docx_name(file_name) {
            return CaseOutputWriteResult::Failed { reason };
        }
        if let Err(reason) = validate_docx_bytes(bytes) {
            return CaseOutputWriteResult::Failed { reason };
        }
        let root = match open_case_root(case_root) {
            Ok(fd) => fd,
            Err(reason) => return CaseOutputWriteResult::Failed { reason },
        };
        let output = match ensure_output_dir(&root) {
            Ok(fd) => fd,
            Err(reason) => return CaseOutputWriteResult::Failed { reason },
        };
        match publish(&output, file_name, bytes) {
            Ok(result) => result,
            Err(reason) => CaseOutputWriteResult::Failed { reason },
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod imp {
    use super::{
        validate_docx_bytes, validate_single_docx_name, CaseOutputFailureReason,
        CaseOutputStatResult, CaseOutputWriteResult,
    };
    use std::path::Path;

    /// 非 macOS：必须编译，但**只返回 typed `failed/unavailable`**。
    ///
    /// 这里刻意不提供 canonicalize / 路径重开 / rename 的替代实现——弱实现会把
    /// 「本平台没有强保证」悄悄变成「本平台安全性更低」，而调用方无从分辨。
    /// 输入闭口仍然生效：非法文件名/非 docx 在任何平台都是 `invalid_input`。
    pub fn stat_docx(_case_root: &Path, file_name: &str) -> CaseOutputStatResult {
        if let Err(reason) = validate_single_docx_name(file_name) {
            return CaseOutputStatResult::Failed { reason };
        }
        CaseOutputStatResult::Failed {
            reason: CaseOutputFailureReason::Unavailable,
        }
    }

    pub fn write_docx_no_replace(
        _case_root: &Path,
        file_name: &str,
        bytes: &[u8],
    ) -> CaseOutputWriteResult {
        if let Err(reason) = validate_single_docx_name(file_name) {
            return CaseOutputWriteResult::Failed { reason };
        }
        if let Err(reason) = validate_docx_bytes(bytes) {
            return CaseOutputWriteResult::Failed { reason };
        }
        CaseOutputWriteResult::Failed {
            reason: CaseOutputFailureReason::Unavailable,
        }
    }
}

/// 只读询问：产出目录内目标的存在性、长度与 SHA-256。零副作用、零 mkdir。
pub fn stat_docx(case_root: &Path, file_name: &str) -> CaseOutputStatResult {
    imp::stat_docx(case_root, file_name)
}

/// 原子 no-replace 写入。目标已存在即 `exists`，绝不覆盖。
pub fn write_docx_no_replace(
    case_root: &Path,
    file_name: &str,
    bytes: &[u8],
) -> CaseOutputWriteResult {
    imp::write_docx_no_replace(case_root, file_name, bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static SEQ: AtomicU64 = AtomicU64::new(0);

    /// 测试根必须先 canonicalize：macOS 的 `std::env::temp_dir()` 是 `/var/folders/...`，
    /// 而 `/var` 本身就是指向 `/private/var` 的符号链接——`O_NOFOLLOW_ANY` 会（正确地）拒掉它。
    /// 这是**测试装置**适配平台，不是放宽生产判据：生产仍以用户所授权的原样路径打开。
    fn temp_root(label: &str) -> PathBuf {
        let seq = SEQ.fetch_add(1, Ordering::Relaxed);
        let base = std::env::temp_dir()
            .canonicalize()
            .expect("canonical temp dir");
        let root = base.join(format!(
            "courtwork-case-output-{}-{}-{}",
            label,
            std::process::id(),
            seq
        ));
        fs::create_dir_all(&root).expect("temp root");
        root
    }

    const DOCX: &[u8] = b"PK\x03\x04 minimal docx payload";

    #[test]
    fn file_name_closure_rejects_traversal_non_docx_and_nul() {
        for bad in ["", ".", "..", "a/b.docx", "a\\b.docx", "report.pdf", "a\0.docx"] {
            assert_eq!(
                validate_single_docx_name(bad),
                Err(CaseOutputFailureReason::InvalidInput),
                "{bad} 必须被闭口拒绝"
            );
        }
        assert!(validate_single_docx_name("合同审查批注稿-20260311-074123-456-abc.docx").is_ok());
    }

    #[test]
    fn docx_byte_closure_rejects_non_zip() {
        assert_eq!(
            validate_docx_bytes(b"not a zip"),
            Err(CaseOutputFailureReason::InvalidInput)
        );
        assert!(validate_docx_bytes(DOCX).is_ok());
    }

    /// 输入闭口在**任何**平台生效——非 macOS 的弱实现也不许把非法输入报成 IO 失败。
    #[test]
    fn invalid_input_is_platform_independent() {
        let root = temp_root("invalid-input");
        assert!(matches!(
            stat_docx(&root, "报告.pdf"),
            CaseOutputStatResult::Failed {
                reason: CaseOutputFailureReason::InvalidInput
            }
        ));
        assert!(matches!(
            write_docx_no_replace(&root, "../escape.docx", DOCX),
            CaseOutputWriteResult::Failed {
                reason: CaseOutputFailureReason::InvalidInput
            }
        ));
        assert!(matches!(
            write_docx_no_replace(&root, "报告.docx", b"not a zip"),
            CaseOutputWriteResult::Failed {
                reason: CaseOutputFailureReason::InvalidInput
            }
        ));
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn non_macos_returns_typed_unavailable_and_never_touches_disk() {
        let root = temp_root("non-macos");
        assert!(matches!(
            stat_docx(&root, "报告.docx"),
            CaseOutputStatResult::Failed {
                reason: CaseOutputFailureReason::Unavailable
            }
        ));
        assert!(matches!(
            write_docx_no_replace(&root, "报告.docx", DOCX),
            CaseOutputWriteResult::Failed {
                reason: CaseOutputFailureReason::Unavailable
            }
        ));
        // 弱实现零副作用：产出目录不得被建出来。
        assert!(!root.join(OUTPUT_DIR_NAME).exists());
    }

    #[cfg(target_os = "macos")]
    mod macos {
        use super::*;
        use std::os::unix::fs::symlink;

        #[test]
        fn stat_missing_does_not_create_the_output_directory() {
            let root = temp_root("stat-no-mkdir");
            assert_eq!(stat_docx(&root, "报告.docx"), CaseOutputStatResult::Missing);
            // inspect 是只读询问：mkdir 计数必须为 0。
            assert!(
                !root.join(OUTPUT_DIR_NAME).exists(),
                "stat 不得建产出目录"
            );
        }

        #[test]
        fn write_creates_output_dir_then_publishes_and_stat_agrees() {
            let root = temp_root("write-publish");
            let result = write_docx_no_replace(&root, "报告.docx", DOCX);
            assert_eq!(
                result,
                CaseOutputWriteResult::Written {
                    byte_length: DOCX.len() as u64
                }
            );
            let stat = stat_docx(&root, "报告.docx");
            let CaseOutputStatResult::Found { byte_length, sha256 } = stat else {
                panic!("写成后必须 stat 到，实际 {stat:?}");
            };
            assert_eq!(byte_length, DOCX.len() as u64);
            // 与独立算法核对：hash 必须真的是这份内容的 SHA-256。
            use sha2::{Digest, Sha256};
            let expected = format!("{:x}", Sha256::digest(DOCX));
            assert_eq!(sha256, expected);
            // temp 已清理：产出目录里只剩目标。
            let entries: Vec<_> = fs::read_dir(root.join(OUTPUT_DIR_NAME))
                .expect("read output dir")
                .map(|e| e.expect("entry").file_name().to_string_lossy().to_string())
                .collect();
            assert_eq!(entries, vec!["报告.docx".to_string()]);
        }

        #[test]
        fn second_write_returns_exists_and_leaves_the_original_untouched() {
            let root = temp_root("no-replace");
            assert!(matches!(
                write_docx_no_replace(&root, "报告.docx", DOCX),
                CaseOutputWriteResult::Written { .. }
            ));
            let different = b"PK\x03\x04 a different payload entirely";
            assert_eq!(
                write_docx_no_replace(&root, "报告.docx", different),
                CaseOutputWriteResult::Exists,
                "同名目标必须 exists，绝不覆盖"
            );
            let on_disk = fs::read(root.join(OUTPUT_DIR_NAME).join("报告.docx")).expect("read back");
            assert_eq!(on_disk, DOCX, "原目标字节必须一字不变");
            // 失败发布的 temp 也已清理。
            let entries: Vec<_> = fs::read_dir(root.join(OUTPUT_DIR_NAME))
                .expect("read output dir")
                .map(|e| e.expect("entry").file_name().to_string_lossy().to_string())
                .collect();
            assert_eq!(entries, vec!["报告.docx".to_string()]);
        }

        #[test]
        fn output_directory_as_symlink_is_out_of_scope_for_both_operations() {
            let root = temp_root("dir-symlink");
            let elsewhere = temp_root("dir-symlink-target");
            symlink(&elsewhere, root.join(OUTPUT_DIR_NAME)).expect("symlink output dir");
            assert!(
                matches!(
                    stat_docx(&root, "报告.docx"),
                    CaseOutputStatResult::Failed {
                        reason: CaseOutputFailureReason::OutOfScope
                    }
                ),
                "产出目录是 symlink 时 stat 必须 out_of_scope"
            );
            assert!(
                matches!(
                    write_docx_no_replace(&root, "报告.docx", DOCX),
                    CaseOutputWriteResult::Failed {
                        reason: CaseOutputFailureReason::OutOfScope
                    }
                ),
                "产出目录是 symlink 时 write 必须 out_of_scope"
            );
            // 绝不穿透到 symlink 指向的目录去写。
            assert!(!elsewhere.join("报告.docx").exists());
        }

        #[test]
        fn target_as_symlink_is_out_of_scope_and_its_target_is_preserved() {
            let root = temp_root("target-symlink");
            let output = root.join(OUTPUT_DIR_NAME);
            fs::create_dir_all(&output).expect("output dir");
            let victim = temp_root("target-symlink-victim").join("victim.docx");
            fs::write(&victim, b"PK victim must not be touched").expect("victim");
            symlink(&victim, output.join("报告.docx")).expect("symlink target");

            assert!(
                matches!(
                    stat_docx(&root, "报告.docx"),
                    CaseOutputStatResult::Failed {
                        reason: CaseOutputFailureReason::OutOfScope
                    }
                ),
                "目标是 symlink 时 stat 必须 out_of_scope"
            );
            // 目标已存在（即便是 symlink），no-replace 必须 exists，且被指向物一字不动。
            assert_eq!(
                write_docx_no_replace(&root, "报告.docx", DOCX),
                CaseOutputWriteResult::Exists
            );
            assert_eq!(
                fs::read(&victim).expect("victim intact"),
                b"PK victim must not be touched"
            );
        }

        #[test]
        fn output_path_pointing_at_a_regular_file_is_rejected_not_silently_replaced() {
            let root = temp_root("dir-is-file");
            fs::write(root.join(OUTPUT_DIR_NAME), b"not a directory").expect("file at dir path");
            assert!(matches!(
                stat_docx(&root, "报告.docx"),
                CaseOutputStatResult::Failed {
                    reason: CaseOutputFailureReason::OutOfScope
                }
            ));
            assert!(matches!(
                write_docx_no_replace(&root, "报告.docx", DOCX),
                CaseOutputWriteResult::Failed {
                    reason: CaseOutputFailureReason::OutOfScope
                }
            ));
            assert_eq!(
                fs::read(root.join(OUTPUT_DIR_NAME)).expect("still a file"),
                b"not a directory"
            );
        }

        #[test]
        fn missing_case_root_is_revoked_not_unavailable() {
            let root = temp_root("gone");
            fs::remove_dir_all(&root).expect("remove root");
            assert!(matches!(
                stat_docx(&root, "报告.docx"),
                CaseOutputStatResult::Failed {
                    reason: CaseOutputFailureReason::Revoked
                }
            ));
        }

        #[test]
        fn case_root_reached_through_a_symlink_is_rejected_by_nofollow_any() {
            let real = temp_root("nofollow-real");
            let link_parent = temp_root("nofollow-link");
            let link = link_parent.join("linked-root");
            symlink(&real, &link).expect("symlink root");
            // O_NOFOLLOW_ANY：路径上任一环节是 symlink 就拒，不只是最后一段。
            assert!(
                matches!(
                    stat_docx(&link, "报告.docx"),
                    CaseOutputStatResult::Failed {
                        reason: CaseOutputFailureReason::OutOfScope
                    }
                ),
                "经 symlink 抵达的 case root 必须被拒"
            );
            assert!(!real.join(OUTPUT_DIR_NAME).exists());
        }

        #[test]
        fn stat_of_a_directory_named_like_the_target_is_out_of_scope() {
            let root = temp_root("target-is-dir");
            let output = root.join(OUTPUT_DIR_NAME);
            fs::create_dir_all(output.join("报告.docx")).expect("dir named like target");
            assert!(matches!(
                stat_docx(&root, "报告.docx"),
                CaseOutputStatResult::Failed {
                    reason: CaseOutputFailureReason::OutOfScope
                }
            ));
        }
    }
}
