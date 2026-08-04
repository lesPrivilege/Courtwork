//! PI-WRITE-HOST-1 ④：workspace write 的**真件**——cap-std capability 根、逐段 no-follow
//! 下降、`TempFile` 私有同目录写入、`replace` 就位与平台持久化屏障。
//!
//! 三条本模块红线：
//!
//! 1. **物理坐标只活在本模块内部**。逻辑路径、`HostFailureCode` 与 journal 都不带物理根；
//!    本模块的错误类型因此恰是闭集 `HostFailureCode`，没有一处会把路径拼进去。
//! 2. **`effect_started` 之前零物理 mutation**。`probe` 是纯读：它连 workspace 根都不建，
//!    缺目录一律读成「目标不存在 ⇒ created」。建目录、建 temp、replace 全在 `perform`。
//! 3. **ambient 只有一处**。capability 必须从某处起头；全模块唯一的 ambient 取得点带
//!    `AMBIENT-ROOT` 具名理由行，并由 {@link tests::ambient_and_mutation_surface_is_fail_closed}
//!    的 fail-closed 扫描器逐行清账——未登记的 `std::fs` 调用一律判红。
//!
//! ### cap-std 的担保边界（PREFLIGHT §一，措辞不得改写）
//!
//! 上游自陈 "cap-std is not a sandbox for untrusted Rust code"——防的是恶意**路径名**，
//! 不防恶意 Rust 代码。保证是「链接解析不逃出 capability root」，**不是**「root 内链接
//! 一律不跟随」。因此：
//!
//! - `open_dir_nofollow` **只管末段**（上游 doc：路径*命名*一个 symlink 时失败）。中间段的
//!   no-follow 由本模块逐段下降自行编排，属**自研义务**，不得宣称为上游保证。
//! - macOS 后端是**用户态逐组件解析器**（无 `openat2`/`RESOLVE_BENEATH`、无
//!   `O_RESOLVE_BENEATH`）。swap-race 因此**必须**由本模块「持 fd ＋ 逐段重开」收口，
//!   不得指望上游原子性。
//!
//! ### `TempFile` 私有性的取法（探针实测在先，2026-08-04，macOS/APFS，umask 0o022）
//!
//! | 观察 | 实测值 |
//! |---|---|
//! | `TempFile::new` 权限 | **0o644**——对所有用户可读，PREFLIGHT 发现③ 的风险在本机真实成立 |
//! | `TempFile::new_anonymous` 权限 | 0o000 |
//! | `TempFile::new_anonymous` 返回类型 | **`cap_std::fs::File`**，非 `TempFile`；目录里 0 项 |
//! | 不设权限时 `replace` 后最终权限 | **0o644**（上游 doc 自称 "default to read-only" 在本平台不成立） |
//! | `new` ＋ `set_permissions(0o600)` ＋ `replace` 后最终权限 | **0o600** |
//!
//! macOS 无 `O_TMPFILE`，`new_anonymous` 走的是「建后即 `unlink`」回退路径：文件没有名字，
//! 返回类型也没有 `replace`——**结构性无法用于就位路径**。取法因此被实测钉死为
//! `TempFile::new` ＋ **写入正文之前**显式 `set_permissions(0o600)`：创建到收紧之间的窗口里
//! 文件恒为空。`replace` 是同目录 `rename` 直接就位（上游 `impl_replace` 结构性满足
//! no-remove-then-rename），仍由 {@link tests::replace_is_a_same_directory_rename_never_remove_then_rename}
//! 锁死防改写。
//!
//! ### 归因不靠 errno（探针实测）
//!
//! `open_dir_nofollow` 对 symlink 与对普通文件返回**同一个** `NotADirectory`。用 errno 区分
//! 「路径含链接」与「中间段不是目录」结构性做不到，故本模块一律：**`open_dir_nofollow` 作门
//! （fail-closed），`symlink_metadata` 只用来报理由**。理由查不实也绝不放行。

#![allow(dead_code)]

use std::io::Write;
use std::path::{Path, PathBuf};

use cap_fs_ext::{DirExt, FollowSymlinks, OpenOptionsFollowExt}; // READ-NOFOLLOW：OpenOptions 的 follow 扩展
use cap_std::fs::{
    Dir, DirBuilder, DirBuilderExt, MetadataExt as CapMetadataExt, Permissions, PermissionsExt,
};
use cap_std::fs::OpenOptions; // READ-NOFOLLOW：读面末段以 FollowSymlinks::No 打开，见扫描器第二之二条
use cap_tempfile::TempFile;

use crate::pi_loop::{
    EffectOutcome, WorkspaceReadHost, WorkspaceWriteHost, WorkspaceWritePlan, WriteAuthorization,
    WriteDecisionDriver,
};
use crate::pi_loop_journal::sha256_hex;
use crate::pi_loop_protocol::{
    HostFailureCode, ListEntry, ListEntryKind, WriteDisposition, MAX_LOGICAL_PATH_BYTES,
    MAX_SEGMENT_BYTES, MAX_TEXT_BYTES,
};

/// `/workspace` 的物理根一级：`app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`
/// （ADR-022 六-C）。命名先例取 `pi-loop` 的 {@link crate::pi_loop_journal::PI_LOOP_DIR}。
pub(crate) const PI_WORKSPACES_DIR: &str = "pi-workspaces";

/// workspace 目录与 runtime cwd 一样只对当前用户开放。
const WORKSPACE_DIR_MODE: u32 = 0o700;

/// temp 与最终工作稿的权限：**私有**。探针实测 `TempFile::new` 默认 0o644，故必须显式收紧。
const WORKSPACE_FILE_MODE: u32 = 0o600;

/// 能兑现 `F_FULLFSYNC` 级持久化屏障的本地文件系统闭集。
///
/// 闭集而非黑名单：未知类型一律判 `unsupported_filesystem` 并在**任何物理 mutation 之前**拒绝
/// （总纲不变量 4：静默降级零容忍——不允许「不知道能不能 durable 就先写了再说」）。
const DURABLE_FILESYSTEMS: &[&str] = &["apfs", "hfs"];

/// ADR-022 六-B.2 的保留设备名（大小写不敏感，带扩展名也拒）。
const RESERVED_DEVICE_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// ADR-022 六-B.2 的 segment 禁用字符。`/` 已是分隔符，单列在此是为了让「segment 内不得
/// 再出现分隔符」在闭集里也显式成立。
const FORBIDDEN_SEGMENT_CHARS: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// workspace write 的 basename 后缀（ASCII 大小写不敏感），且 `.md` 前至少一个字符。
const MARKDOWN_SUFFIX: &str = ".md";

// ── 逻辑路径 grammar（ADR-022 六-B.2 的 Rust 防御门）─────────────────────────

/// 已过 grammar 的逻辑路径：父段序列 ＋ basename。
///
/// wire 的 `read_logical_path` 只判「非空 ＋ ≤1024 bytes」；grammar 的其余全部条款是本模块的
/// 防御门（ADR-022 六-B.2：「若畸形 request 仍到 Rust，Rust 防御门以同 code 拒绝且零 effect」）。
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct WritePathPlan {
    pub(crate) parents: Vec<String>,
    pub(crate) basename: String,
}

/// 逐条兑现 ADR-022 六-B.2。语法违规一律 `invalid_path`；**只有** `.md` 那一条走
/// `unsupported_file_type`（ADR 明文：Node gate 与 Rust 防御门同 code）。
pub(crate) fn parse_write_path(logical: &str) -> Result<WritePathPlan, HostFailureCode> {
    if logical.is_empty() || logical.len() > MAX_LOGICAL_PATH_BYTES {
        return Err(HostFailureCode::InvalidPath);
    }
    // 绝对路径、backslash、Windows drive 与 UNC 都在下面的 segment 闭集里被同一批规则拒：
    // 前导 `/` 产生空段；`\` 与 `:` 在禁用字符表内。此处不另设并行判据（两谱各抄一份就漂移）。
    let mut segments: Vec<String> = Vec::new();
    for segment in logical.split('/') {
        check_segment(segment)?;
        segments.push(segment.to_string());
    }
    let basename = segments.pop().expect("split 至少产出一段");
    check_markdown_basename(&basename)?;
    Ok(WritePathPlan {
        parents: segments,
        basename,
    })
}

fn check_segment(segment: &str) -> Result<(), HostFailureCode> {
    if segment.is_empty() || segment.len() > MAX_SEGMENT_BYTES {
        return Err(HostFailureCode::InvalidPath);
    }
    if segment == "." || segment == ".." {
        return Err(HostFailureCode::InvalidPath);
    }
    for unit in segment.chars() {
        // 控制字符与 DEL。
        if (unit as u32) < 0x20 || unit == '\u{7f}' {
            return Err(HostFailureCode::InvalidPath);
        }
        if FORBIDDEN_SEGMENT_CHARS.contains(&unit) {
            return Err(HostFailureCode::InvalidPath);
        }
    }
    if segment.ends_with(' ') || segment.ends_with('.') {
        return Err(HostFailureCode::InvalidPath);
    }
    let stem = segment.split('.').next().unwrap_or(segment);
    if RESERVED_DEVICE_NAMES
        .iter()
        .any(|reserved| reserved.eq_ignore_ascii_case(stem))
    {
        return Err(HostFailureCode::InvalidPath);
    }
    Ok(())
}

/// ADR-022 六-B.2：basename 按 ASCII 大小写不敏感必须以 `.md` 结尾，且 `.md` 前至少有一个字符
/// （basename 恰为 `.md` 非法）。这是 `PI-WRITE-PROOF-1` 验收遗留的那一条，RECON 已批按 ADR 补门。
fn check_markdown_basename(basename: &str) -> Result<(), HostFailureCode> {
    let bytes = basename.as_bytes();
    let suffix = MARKDOWN_SUFFIX.as_bytes();
    if bytes.len() <= suffix.len() {
        return Err(HostFailureCode::UnsupportedFileType);
    }
    let tail = &bytes[bytes.len() - suffix.len()..];
    if !tail.eq_ignore_ascii_case(suffix) {
        return Err(HostFailureCode::UnsupportedFileType);
    }
    Ok(())
}

/// ADR-022 六-B.2：`list` 的根在 wire 上恰写作 `"."`。
pub(crate) const WORKSPACE_LIST_ROOT: &str = ".";

/// ADR-022 六-B.2：`list` 只列直接子项、最多 2,000 项；超限 `limit_exceeded`，不静默少列。
pub(crate) const MAX_LIST_ENTRIES: usize = 2000;

/// 已过 grammar 的**读**路径。`basename` 为 `None` 恰表示 workspace 根本身（只服务 `list`）。
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct ReadPathPlan {
    pub(crate) parents: Vec<String>,
    pub(crate) basename: Option<String>,
}

/// 读面 grammar：与 {@link parse_write_path} 共用同一套 segment 闭集，差别恰两条——
/// 读面**不要求** `.md`（要 list 目录、要 exists 任意条目），且认 `"."` 这枚 list 根。
///
/// `allow_root` 由调用方按操作给：ADR 的例外只给了 `list` 一枚，`exists`/`read_file`
/// 拿到根一律 `invalid_path`（不外扩例外，也不把「根是不是文件」留给下游猜）。
pub(crate) fn parse_read_path(
    logical: &str,
    allow_root: bool,
) -> Result<ReadPathPlan, HostFailureCode> {
    if logical.is_empty() || logical.len() > MAX_LOGICAL_PATH_BYTES {
        return Err(HostFailureCode::InvalidPath);
    }
    if logical == WORKSPACE_LIST_ROOT {
        if !allow_root {
            return Err(HostFailureCode::InvalidPath);
        }
        return Ok(ReadPathPlan {
            parents: Vec::new(),
            basename: None,
        });
    }
    let mut segments: Vec<String> = Vec::new();
    for segment in logical.split('/') {
        check_segment(segment)?;
        segments.push(segment.to_string());
    }
    let basename = segments.pop().expect("split 至少产出一段");
    Ok(ReadPathPlan {
        parents: segments,
        basename: Some(basename),
    })
}

// ── 文件系统能力前置 ────────────────────────────────────────────────────────

/// 已打开 dirfd 的文件系统类型名。只读，只吃 fd——不接受路径，也不枚举 mount 表。
fn filesystem_type(dir: &Dir) -> Result<String, HostFailureCode> {
    use std::os::fd::AsRawFd;
    let mut buffer: libc::statfs = unsafe { std::mem::zeroed() };
    // SAFETY: `dir` 在整个调用期间存活，故 raw fd 有效；`buffer` 是本栈帧上按 `statfs`
    // 尺寸零初始化的可写内存。`fstatfs` 只读取 fd 的挂载信息，不改动任何文件系统状态。
    let rc = unsafe { libc::fstatfs(dir.as_raw_fd(), &mut buffer) };
    if rc != 0 {
        return Err(HostFailureCode::Io);
    }
    let name: Vec<u8> = buffer
        .f_fstypename
        .iter()
        .take_while(|unit| **unit != 0)
        .map(|unit| *unit as u8)
        .collect();
    String::from_utf8(name).map_err(|_| HostFailureCode::Io)
}

/// 闭集判定。未知类型 ⇒ 不支持（fail-closed）。
pub(crate) fn filesystem_is_durable(fstype: &str) -> bool {
    DURABLE_FILESYSTEMS.contains(&fstype)
}

fn require_durable_filesystem(dir: &Dir) -> Result<(), HostFailureCode> {
    if filesystem_is_durable(&filesystem_type(dir)?) {
        Ok(())
    } else {
        Err(HostFailureCode::UnsupportedFilesystem)
    }
}

// ── 逐段下降 ────────────────────────────────────────────────────────────────

/// 打开一枚**单段**子目录。
///
/// `open_dir_nofollow` 是门；`symlink_metadata` 只用来把失败翻译成闭集理由。理由查不实
/// （例如竞态里被换回普通目录）也**绝不放行**——一律 `io`。
fn open_child_dir(dir: &Dir, segment: &str) -> Result<Option<Dir>, HostFailureCode> {
    match dir.open_dir_nofollow(segment) {
        Ok(child) => Ok(Some(child)),
        Err(_) => match dir.symlink_metadata(segment) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(_) => Err(HostFailureCode::Io),
            Ok(metadata) if metadata.file_type().is_symlink() => {
                Err(HostFailureCode::SymlinkForbidden)
            }
            Ok(metadata) if !metadata.is_dir() => Err(HostFailureCode::NotDirectory),
            Ok(_) => Err(HostFailureCode::Io),
        },
    }
}

/// 建**一段**目录再重开。`create_dir_all` 一次吞多段会把中间段的 no-follow 判定整个跳过，
/// 故这里只允许单段；建成后先同步父目录项（ADR-010 决定二，先例见
/// {@link crate::pi_loop_journal::sync_directory} 与 `PI-HOST-JOURNAL-1` 的目录项修复），
/// 再以 `open_dir_nofollow` 重开——重开是「持 fd」的起点，不是复述。
fn ensure_child_dir(dir: &Dir, segment: &str) -> Result<Dir, HostFailureCode> {
    if let Some(child) = open_child_dir(dir, segment)? {
        return Ok(child);
    }
    let mut builder = DirBuilder::new();
    builder.recursive(false);
    builder.mode(WORKSPACE_DIR_MODE);
    match dir.create_dir_with(segment, &builder) {
        Ok(()) => {}
        // 并发的另一枚写者抢先建成同一段：目录已在场即视同建成，随后的重开仍走同一道门。
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(_) => return Err(HostFailureCode::Io),
    }
    sync_dir(dir)?;
    open_child_dir(dir, segment)?.ok_or(HostFailureCode::Io)
}

/// 目录项屏障：对已打开的 dirfd 做 `sync_all`。macOS 上 `File::sync_all` 即
/// `fcntl(F_FULLFSYNC)`（在案先例 `WORK-HOST-1`），故零 crate 即可拿到 full barrier。
fn sync_dir(dir: &Dir) -> Result<(), HostFailureCode> {
    dir.try_clone()
        .map_err(|_| HostFailureCode::Io)?
        .into_std_file()
        .sync_all()
        .map_err(|_| HostFailureCode::Io)
}

// ── 真件 ────────────────────────────────────────────────────────────────────

/// **测试专用**的效果窗口回调（见 `WorkspaceFsHost::window`）。
#[cfg(test)]
type WriteWindow = Box<dyn FnMut(&Dir)>;

/// workspace write 的真件座。
///
/// capability 根**惰性**取得：`start` 序一字不动，落盘件的构造是纯值拷贝、零 I/O。
pub(crate) struct WorkspaceFsHost {
    app_data_dir: PathBuf,
    container_id: String,
    session_id: String,
    /// `app_data_dir` 的 capability，全模块唯一 ambient 取得的产物，取一次即记住。
    base: Option<Dir>,
    /// 逐次授权的真源。缺席 ⇒ `policy_denied`（ADR-022 六-C 明禁「用 session always-allow
    /// 冒充产品授权」）。⑤／headless 验收装真 driver。
    decision: Option<Box<dyn WriteDecisionDriver>>,
    /// **测试专用**：temp 已 sync、replace 尚未发生的那一瞬；测试拿着父目录 capability
    /// 在此制造**真实**故障（把目标名换成非空目录、把父段换成 symlink）。体例沿用
    /// {@link crate::pi_loop_journal::Journal::inject_append_failure_from}。
    #[cfg(test)]
    window: Option<WriteWindow>,
    /// **测试专用**：目录项屏障失败。本机不可构造真实的 `fsync` 失败，故以标志位驱动
    /// 「replace 已成功、后续屏障不可自证」那一条 uncertain 支。
    #[cfg(test)]
    fail_parent_sync: bool,
}

impl WorkspaceFsHost {
    /// 纯值构造：零 I/O、零 mutation。`start` 序因此不受影响（R7 恢复分相不回退）。
    pub(crate) fn new(app_data_dir: &Path, container_id: &str, session_id: &str) -> Self {
        Self {
            app_data_dir: app_data_dir.to_path_buf(),
            container_id: container_id.to_string(),
            session_id: session_id.to_string(),
            base: None,
            decision: None,
            #[cfg(test)]
            window: None,
            #[cfg(test)]
            fail_parent_sync: false,
        }
    }

    /// ⑤／headless 验收在此装真 decision driver。production 至今没有 driver，故
    /// `decide` 恒 `policy_denied`。
    pub(crate) fn with_decision_driver(mut self, driver: Box<dyn WriteDecisionDriver>) -> Self {
        self.decision = Some(driver);
        self
    }

    /// **测试专用**：拿到 temp 已 durable、replace 尚未发生那一瞬的父目录 capability。
    /// 用来制造**真实**故障（换目标名为非空目录、把父段换成 symlink），不是模拟返回码。
    #[cfg(test)]
    fn inject_window(&mut self, window: WriteWindow) {
        self.window = Some(window);
    }

    /// **测试专用**：目录项屏障失败。真实的 `fsync` 失败在本机不可构造，故只此一处以标志位
    /// 驱动；`replace` 失败那一支走的是上面 `inject_window` 造出来的**真**故障。
    #[cfg(test)]
    fn inject_parent_sync_failure(&mut self) {
        self.fail_parent_sync = true;
    }

    /// `app_data_dir` 的 capability。**全模块唯一的 ambient 取得点。**
    ///
    /// 三道自研前置，缺一不可：
    ///
    /// 1. 逐级 `lstat`：`app_data_dir` 自身与它的每一级 parent 都必须是非 symlink 的目录
    ///    ——这是「root **外** symlink 父段」那一道；capability 模型对自己头顶的路径零担保。
    /// 2. ambient 取得。
    /// 3. `dev`/`ino` 复核：取得的 fd 必须就是第 1 步 `lstat` 过的那一枚 inode。1 与 2 之间的
    ///    swap 窗口由此关闭（macOS 无内核 beneath，只能靠持 fd 后回证）。
    fn base(&mut self) -> Result<&Dir, HostFailureCode> {
        if self.base.is_none() {
            let expected = lstat_owned_directory_chain(&self.app_data_dir)?;
            // AMBIENT-ROOT：capability 必须从某处起头，这是全模块唯一的起头处。上面第 1 步
            // 已逐级 lstat，下面第 3 步以 dev/ino 回证同一枚 inode；此行之外任何 ambient 取得
            // 都由 fail-closed 扫描器判红。
            let opened = Dir::open_ambient_dir(&self.app_data_dir, cap_std::ambient_authority())
                .map_err(|_| HostFailureCode::Io)?;
            let actual = opened.dir_metadata().map_err(|_| HostFailureCode::Io)?;
            if (actual.dev(), actual.ino()) != expected {
                return Err(HostFailureCode::Io);
            }
            require_durable_filesystem(&opened)?;
            self.base = Some(opened);
        }
        Ok(self.base.as_ref().expect("刚刚已置位"))
    }

    /// session 根的三段：`pi-workspaces/<containerId>/<sessionId>`。
    ///
    /// `create` 为假时纯读——缺任一段即 `Ok(None)`，一个字节都不动（`probe` 走这一支）。
    fn session_root(&mut self, create: bool) -> Result<Option<Dir>, HostFailureCode> {
        let container_id = self.container_id.clone();
        let session_id = self.session_id.clone();
        let mut dir = self.base()?.try_clone().map_err(|_| HostFailureCode::Io)?;
        for segment in [
            PI_WORKSPACES_DIR,
            container_id.as_str(),
            session_id.as_str(),
        ] {
            dir = if create {
                ensure_child_dir(&dir, segment)?
            } else {
                match open_child_dir(&dir, segment)? {
                    Some(child) => child,
                    None => return Ok(None),
                }
            };
        }
        Ok(Some(dir))
    }

    /// 逻辑路径的父段下降。持 fd 逐段重开——中间段在下降**之后**被换成 symlink 也改不了
    /// 已经握在手里的那一枚 inode（macOS 无内核 beneath，这是唯一的收口手法）。
    fn descend(
        root: Dir,
        parents: &[String],
        create: bool,
    ) -> Result<Option<Dir>, HostFailureCode> {
        let mut dir = root;
        for segment in parents {
            dir = if create {
                ensure_child_dir(&dir, segment)?
            } else {
                match open_child_dir(&dir, segment)? {
                    Some(child) => child,
                    None => return Ok(None),
                }
            };
        }
        Ok(Some(dir))
    }

    /// 末段在场判定。**不跟随**：末段是 symlink 即拒，绝不去看它指向谁。
    fn inspect_target(dir: &Dir, basename: &str) -> Result<WriteDisposition, HostFailureCode> {
        match dir.symlink_metadata(basename) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(WriteDisposition::Created)
            }
            Err(_) => Err(HostFailureCode::Io),
            Ok(metadata) if metadata.file_type().is_symlink() => {
                Err(HostFailureCode::SymlinkForbidden)
            }
            Ok(metadata) if metadata.is_dir() => Err(HostFailureCode::IsDirectory),
            Ok(_) => Ok(WriteDisposition::Overwritten),
        }
    }

    /// 屏障次序（ADR-022 六-C）。前一步不过就绝不走到后一步：
    ///
    /// ```text
    /// 1 内容 hash 重算            ── 不符即 hash_mismatch，零 mutation
    /// 2 capability 根 ＋ 文件系统闭集 ── 不支持即 unsupported_filesystem，零 mutation
    /// 3 session 根三段（建 + 目录项 sync + 重开）
    /// 4 逻辑父段逐段（建 + 目录项 sync + 重开）
    /// 5 末段复核（symlink / 目录 一律拒）
    /// 6 TempFile::new → set_permissions(0o600) → write_all → flush → sync_all   【屏障①】
    ///     ── 6 及以前任一失败 ⇒ failed：replace 未被调用，目标可证零变化
    /// 7 replace(basename)：同目录 rename 直接就位
    ///     ── 失败 ⇒ uncertain（见 §replace 失败的裁法）
    /// 8 父目录项 sync                                                          【屏障②】
    ///     ── 失败 ⇒ uncertain：replace 已成功，屏障不可自证
    /// 9 Succeeded ── 臂随后落 effect_succeeded                                 【屏障③】
    /// ```
    ///
    /// `EffectOutcome::Succeeded` 的语义因此恰是「屏障①②全部已过」，臂再兑现屏障③；
    /// 三道全过才发 `host_result`。
    ///
    /// ### `replace` 失败的裁法（如实声明，取保守支）
    ///
    /// ADR-022 六-C 只把 `effect_failed` 许给「replace **调用前**失败且可证明目标未变」。
    /// `rename` 返回错误时目标**通常**未变，但 POSIX 对 `EIO` 明文留了口子，而本仓在案判例
    /// 「归因不能靠 errno」禁止按 errno 分叉。故此处取保守支：**`replace` 的任何失败一律
    /// `uncertain`**——既不声称回滚，也不复用授权重试。
    fn write_through_barriers(
        &mut self,
        plan: &WorkspaceWritePlan,
    ) -> Result<(), (bool, HostFailureCode)> {
        // 1. 内容 hash 重算（ADR-022 六-B.2：Rust 必须重算）。
        let parsed = parse_write_path(&plan.logical_path).map_err(before)?;
        if sha256_hex(plan.content.as_bytes()) != plan.content_sha256
            || plan.byte_length != plan.content.len() as u64
        {
            return Err(before(HostFailureCode::HashMismatch));
        }
        // 2–3. capability 根与 session 根。
        let root = self
            .session_root(true)
            .map_err(before)?
            .ok_or_else(|| before(HostFailureCode::Io))?;
        require_durable_filesystem(&root).map_err(before)?;
        // 4. 逻辑父段。
        let parent = Self::descend(root, &parsed.parents, true)
            .map_err(before)?
            .ok_or_else(|| before(HostFailureCode::Io))?;
        // 5. 末段复核。
        Self::inspect_target(&parent, &parsed.basename).map_err(before)?;
        // 6. 私有 temp ＋ 内容 ＋ 屏障①。
        let mut temp = TempFile::new(&parent).map_err(|_| before(HostFailureCode::Io))?;
        temp.as_file()
            .set_permissions(Permissions::from_mode(WORKSPACE_FILE_MODE))
            .map_err(|_| before(HostFailureCode::Io))?;
        temp.write_all(plan.content.as_bytes())
            .map_err(|_| before(HostFailureCode::Io))?;
        temp.flush().map_err(|_| before(HostFailureCode::Io))?;
        temp.as_file()
            .sync_all()
            .map_err(|_| before(HostFailureCode::Io))?;
        #[cfg(test)]
        if let Some(window) = self.window.as_mut() {
            window(&parent);
        }
        // 7. 就位。
        temp.replace(&parsed.basename)
            .map_err(|_| after(HostFailureCode::Io))?;
        // 8. 目录项屏障②。
        #[cfg(test)]
        if self.fail_parent_sync {
            return Err(after(HostFailureCode::Io));
        }
        sync_dir(&parent).map_err(after)?;
        Ok(())
    }
}

/// replace **之前**的失败：目标可证零变化 ⇒ `effect_failed`。
fn before(code: HostFailureCode) -> (bool, HostFailureCode) {
    (false, code)
}

/// replace **之时或之后**的失败：目标未变不可自证 ⇒ `effect_uncertain`。
fn after(code: HostFailureCode) -> (bool, HostFailureCode) {
    (true, code)
}

/// `app_data_dir` 自身与每一级 parent 的 `lstat` 链，返回 `app_data_dir` 的 `(dev, ino)`。
///
/// 体例与 {@link crate::pi_loop_process::ensure_runtime_cwd} 的祖先扫描同形：任一级是
/// symlink 或不是目录即整条拒。这是 capability 根**头顶**那一段的唯一守卫。
fn lstat_owned_directory_chain(path: &Path) -> Result<(u64, u64), HostFailureCode> {
    use std::os::unix::fs::MetadataExt;
    let mut ancestors: Vec<&Path> = path.ancestors().collect();
    ancestors.reverse();
    let mut identity = None;
    for ancestor in ancestors {
        let metadata = std::fs::symlink_metadata(ancestor).map_err(|_| HostFailureCode::Io)?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(HostFailureCode::SymlinkForbidden);
        }
        identity = Some((metadata.dev(), metadata.ino()));
    }
    identity.ok_or(HostFailureCode::Io)
}

impl WorkspaceWriteHost for WorkspaceFsHost {
    /// 纯读：一个字节都不动。缺 workspace 根、缺父段都读成「目标不存在 ⇒ created」——
    /// 建目录是 mutation，必须排在 `effect_started` 之后（ADR-022 六-C）。
    fn probe(&mut self, plan: &WorkspaceWritePlan) -> Result<WriteDisposition, HostFailureCode> {
        let parsed = parse_write_path(&plan.logical_path)?;
        let Some(root) = self.session_root(false)? else {
            return Ok(WriteDisposition::Created);
        };
        let Some(parent) = Self::descend(root, &parsed.parents, false)? else {
            return Ok(WriteDisposition::Created);
        };
        Self::inspect_target(&parent, &parsed.basename)
    }

    /// 没有 decision driver 就是**没有授权**。缺件即 `policy_denied`，不自动放行。
    fn decide(
        &mut self,
        plan: &WorkspaceWritePlan,
        action: WriteDisposition,
    ) -> WriteAuthorization {
        match self.decision.as_mut() {
            Some(driver) => driver.decide(plan, action),
            None => WriteAuthorization::Denied(
                crate::pi_loop_journal::AuthorizationDenyCode::PolicyDenied,
            ),
        }
    }

    fn perform(&mut self, plan: &WorkspaceWritePlan, _action: WriteDisposition) -> EffectOutcome {
        match self.write_through_barriers(plan) {
            Ok(()) => EffectOutcome::Succeeded,
            Err((false, code)) => EffectOutcome::Failed(code),
            Err((true, _)) => EffectOutcome::Uncertain,
        }
    }
}

/// 读面真件（`PI-WORKSPACE-READ-1`）。
///
/// 三条与写面共享、不另起一套（STAGE4 移交 5 明写「读侧票直接沿用同两枚函数」）：
/// capability 根的取得与 `dev`/`ino` 回证、`session_root` 三段、`descend` 逐段 no-follow。
/// 读面自己只多两件事：末段以 `FollowSymlinks::No` 打开，以及 UTF-8 fail-closed。
///
/// **零 mutation**：`session_root(false)`／`descend(.., false)` 全程纯读，缺目录即
/// 「不存在」，绝不因为一次读而把 workspace 目录建出来。
impl WorkspaceReadHost for WorkspaceFsHost {
    fn exists(&mut self, logical_path: &str) -> Result<bool, HostFailureCode> {
        let parsed = parse_read_path(logical_path, false)?;
        let basename = parsed.basename.as_ref().ok_or(HostFailureCode::InvalidPath)?;
        let Some(root) = self.session_root(false)? else {
            return Ok(false);
        };
        let Some(parent) = Self::descend(root, &parsed.parents, false)? else {
            return Ok(false);
        };
        match parent.symlink_metadata(basename) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err(HostFailureCode::Io),
            // 末段是 symlink：**不跟随**，也不谎称不存在——两者是不同的事实。
            Ok(metadata) if metadata.file_type().is_symlink() => {
                Err(HostFailureCode::SymlinkForbidden)
            }
            Ok(_) => Ok(true),
        }
    }

    fn read_file(&mut self, logical_path: &str) -> Result<(String, u64), HostFailureCode> {
        let parsed = parse_read_path(logical_path, false)?;
        let basename = parsed.basename.as_ref().ok_or(HostFailureCode::InvalidPath)?;
        let root = self.session_root(false)?.ok_or(HostFailureCode::NotFound)?;
        let parent =
            Self::descend(root, &parsed.parents, false)?.ok_or(HostFailureCode::NotFound)?;
        match parent.symlink_metadata(basename) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Err(HostFailureCode::NotFound)
            }
            Err(_) => return Err(HostFailureCode::Io),
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err(HostFailureCode::SymlinkForbidden)
            }
            Ok(metadata) if metadata.is_dir() => return Err(HostFailureCode::IsDirectory),
            Ok(_) => {}
        }
        // `symlink_metadata` 只报理由；门是这一枚 `FollowSymlinks::No` 的打开。
        let mut options = OpenOptions::new(); // READ-NOFOLLOW：唯一构造点
        options.read(true);
        options.follow(FollowSymlinks::No);
        let mut file = parent
            .open_with(basename, &options)
            .map_err(|_| HostFailureCode::Io)?;
        let metadata = file.metadata().map_err(|_| HostFailureCode::Io)?;
        // 上限先于读取：不把超限文件整个吸进内存再拒。
        if metadata.len() > MAX_TEXT_BYTES as u64 {
            return Err(HostFailureCode::LimitExceeded);
        }
        let mut bytes = Vec::new();
        std::io::Read::read_to_end(&mut file, &mut bytes).map_err(|_| HostFailureCode::Io)?;
        // 读取与 stat 之间可能变长；再判一次，越限一律拒。
        if bytes.len() > MAX_TEXT_BYTES {
            return Err(HostFailureCode::LimitExceeded);
        }
        // **UTF-8 fail-closed**：`from_utf8_lossy` 会把坏字节换成 U+FFFD，那是静默改写正文
        // ——回读双验会连带失效（hash 对的是被改写后的字节）。workspace 只承载本协议写入的
        // UTF-8 Markdown，故非 UTF-8 是真实异常，如实拒。
        let content = String::from_utf8(bytes).map_err(|_| HostFailureCode::Io)?;
        let byte_length = content.len() as u64;
        Ok((content, byte_length))
    }

    fn list(&mut self, logical_path: &str) -> Result<Vec<ListEntry>, HostFailureCode> {
        let parsed = parse_read_path(logical_path, true)?;
        let Some(root) = self.session_root(false)? else {
            // 根尚未建出来（本 session 一次都没写过）：空目录是事实，不是错误。
            return if parsed.basename.is_none() {
                Ok(Vec::new())
            } else {
                Err(HostFailureCode::NotFound)
            };
        };
        let parent =
            Self::descend(root, &parsed.parents, false)?.ok_or(HostFailureCode::NotFound)?;
        let directory = match &parsed.basename {
            None => parent,
            Some(basename) => match open_child_dir(&parent, basename)? {
                Some(child) => child,
                None => return Err(HostFailureCode::NotFound),
            },
        };

        let mut entries: Vec<ListEntry> = Vec::new();
        for item in directory.entries().map_err(|_| HostFailureCode::Io)? {
            let item = item.map_err(|_| HostFailureCode::Io)?;
            let name = item
                .file_name()
                .into_string()
                .map_err(|_| HostFailureCode::InvalidPath)?;
            // 目录里真实存在的名字仍须过一次 grammar：不合规的名字不投影出去
            // （与 `/case` 容器同口径），也不把它算进上限。
            if check_segment(&name).is_err() {
                continue;
            }
            let metadata = item.metadata().map_err(|_| HostFailureCode::Io)?;
            let file_type = metadata.file_type();
            let kind = if file_type.is_symlink() {
                ListEntryKind::Symlink
            } else if file_type.is_dir() {
                ListEntryKind::Directory
            } else {
                ListEntryKind::File
            };
            entries.push(ListEntry {
                // wire 契约：`byteLength` 只对 file 有值，其余恒 `null`。
                byte_length: if kind == ListEntryKind::File {
                    Some(metadata.len())
                } else {
                    None
                },
                mtime_ms: metadata
                    .modified()
                    .ok()
                    .and_then(|at| at.into_std().duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|since| since.as_millis() as u64),
                name,
                kind,
            });
        }
        // ADR-022 六-B.2：按 UTF-8 name 升序。`sort_by` 而非 `sort_unstable_by`——
        // 名字唯一，两者等价，取稳定序少一处「取决于实现」。
        entries.sort_by(|left, right| left.name.as_bytes().cmp(right.name.as_bytes()));
        if entries.len() > MAX_LIST_ENTRIES {
            return Err(HostFailureCode::LimitExceeded);
        }
        Ok(entries)
    }
}

// ── viewer 查询面（ADR-022 六-D，`PI-WORKSPACE-READ-1`）────────────────────────

/// `openWorkspaceMarkdown` 的失败闭集（ADR-022 六-D 逐字）。
///
/// 与 {@link HostFailureCode} 分列：那一枚是**模型面**的 wire 闭集，这一枚是 **WebView 面**的。
/// 两者成员相近但受众不同，合成一枚会让「给模型看的理由」与「给用户看的理由」共用一份措辞，
/// 将来任一侧调文案都会误伤另一侧。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum WorkspaceViewError {
    SessionMismatch,
    InvalidPath,
    NotFound,
    IsDirectory,
    SymlinkForbidden,
    LimitExceeded,
    UnsupportedFileType,
    Io,
}

impl WorkspaceViewError {
    pub(crate) fn code(self) -> &'static str {
        match self {
            WorkspaceViewError::SessionMismatch => "session_mismatch",
            WorkspaceViewError::InvalidPath => "invalid_path",
            WorkspaceViewError::NotFound => "not_found",
            WorkspaceViewError::IsDirectory => "is_directory",
            WorkspaceViewError::SymlinkForbidden => "symlink_forbidden",
            WorkspaceViewError::LimitExceeded => "limit_exceeded",
            WorkspaceViewError::UnsupportedFileType => "unsupported_file_type",
            WorkspaceViewError::Io => "io",
        }
    }

    /// 文案的**唯一**真源，体例同 {@link HostFailureCode::message}：宿主自产、不拼路径、
    /// 不转发 OS error，且逐条远短于 ADR 的 1,024 UTF-8 bytes 上限。
    pub(crate) fn message(self) -> &'static str {
        match self {
            WorkspaceViewError::SessionMismatch => "会话标识不合法，拒绝打开",
            WorkspaceViewError::InvalidPath => "逻辑路径不在工作稿语法闭集内",
            WorkspaceViewError::NotFound => "目标不存在",
            WorkspaceViewError::IsDirectory => "目标是目录，不是工作稿文件",
            WorkspaceViewError::SymlinkForbidden => "路径含符号链接，工作稿根内不跟随",
            WorkspaceViewError::LimitExceeded => "工作稿超过可查看的大小上限",
            WorkspaceViewError::UnsupportedFileType => "只接受 Markdown 工作稿",
            WorkspaceViewError::Io => "工作稿读取失败",
        }
    }
}

/// 模型面 code → viewer 面 code。手写不派生：两枚闭集的成员本就不是一一对应
/// （viewer 没有 `hash_mismatch`／`state_changed`／`aborted`；模型面没有 `session_mismatch`）。
fn view_error_from(code: HostFailureCode) -> WorkspaceViewError {
    match code {
        HostFailureCode::InvalidPath => WorkspaceViewError::InvalidPath,
        HostFailureCode::NotFound => WorkspaceViewError::NotFound,
        HostFailureCode::NotDirectory => WorkspaceViewError::NotFound,
        HostFailureCode::IsDirectory => WorkspaceViewError::IsDirectory,
        HostFailureCode::SymlinkForbidden => WorkspaceViewError::SymlinkForbidden,
        HostFailureCode::LimitExceeded => WorkspaceViewError::LimitExceeded,
        HostFailureCode::UnsupportedFileType => WorkspaceViewError::UnsupportedFileType,
        // 其余成员在读路径上不可达（它们只属写臂）；不静默映射成某个「像样」的理由。
        _ => WorkspaceViewError::Io,
    }
}

/// `openWorkspaceMarkdown` 的返回值。**没有物理路径字段**——WebView 见不到物理坐标。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct WorkspaceMarkdownView {
    pub(crate) logical_path: String,
    pub(crate) content: String,
    pub(crate) content_sha256: String,
    pub(crate) byte_length: u64,
}

/// 容器/会话 id 的 token 闭集：它们要成为物理路径的**段**，故语法必须与 wire 的
/// `SafeToken` 同宽——放宽一格就等于给 viewer 开一条模型面没有的路径构造口。
fn is_safe_container_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_SEGMENT_BYTES
        && value
            .chars()
            .all(|unit| unit.is_ascii_alphanumeric() || unit == '-' || unit == '_')
}

/// GUI 后续消费的窄只读查询面（ADR-022 六-D）。**双验**：
///
/// 1. session：`containerId`/`sessionId` 各过 token 闭集，不合即 `session_mismatch`，
///    一个字节都不碰文件系统；
/// 2. path：同一套 workspace grammar，外加 `.md` 强制（viewer 只看 Markdown）；
/// 3. UTF-8 与 131,072 bytes 上限由读件自己兑现（与模型面同一条路径，不另写一份）；
/// 4. hash 由**本函数从当前正文重算**——它因此可能与已落账的 succeeded hash 不同，
///    那正是 UI 要显示「当前内容已不同于已确认版本」的依据（ADR-022 六-D）。本层只给事实，
///    不做比对，也不把正文写回 journal。
pub(crate) fn open_workspace_markdown(
    app_data_dir: &Path,
    container_id: &str,
    session_id: &str,
    logical_path: &str,
) -> Result<WorkspaceMarkdownView, WorkspaceViewError> {
    if !is_safe_container_token(container_id) || !is_safe_container_token(session_id) {
        return Err(WorkspaceViewError::SessionMismatch);
    }
    // `.md` 门先于任何 I/O：非 Markdown 连读都不读。
    let parsed = parse_read_path(logical_path, false).map_err(view_error_from)?;
    let basename = parsed
        .basename
        .as_ref()
        .ok_or(WorkspaceViewError::InvalidPath)?;
    check_markdown_basename(basename).map_err(view_error_from)?;

    let mut host = WorkspaceFsHost::new(app_data_dir, container_id, session_id);
    let (content, byte_length) = WorkspaceReadHost::read_file(&mut host, logical_path)
        .map_err(view_error_from)?;
    Ok(WorkspaceMarkdownView {
        content_sha256: sha256_hex(content.as_bytes()),
        logical_path: logical_path.to_string(),
        content,
        byte_length,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pi_loop_journal::{sha256_hex, AuthorizationDenyCode};
    use std::collections::BTreeSet;
    use std::os::unix::fs::PermissionsExt as StdPermissionsExt;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::{Arc, Mutex};

    static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

    struct Bench {
        root: PathBuf,
        app_data: PathBuf,
    }

    /// 临时根一律 `canonicalize`：macOS 的 `/var` 是指向 `/private/var` 的 symlink，
    /// 而本模块的祖先扫描逐级拒 symlink（体例同 `pi_loop_process` 既有测试）。
    fn bench(tag: &str) -> Bench {
        let root = std::env::temp_dir().join(format!(
            "courtwork-pi-ws-{tag}-{}-{}",
            std::process::id(),
            TEMP_SEQ.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&root).expect("建临时根");
        let root = std::fs::canonicalize(&root).expect("规范化");
        let app_data = root.join("app-data");
        std::fs::create_dir_all(&app_data).expect("建 app-data");
        Bench { root, app_data }
    }

    const CONTAINER: &str = "cnt-1";
    const SESSION: &str = "sess-1";

    impl Bench {
        fn host(&self) -> WorkspaceFsHost {
            WorkspaceFsHost::new(&self.app_data, CONTAINER, SESSION)
        }
        fn workspace(&self) -> PathBuf {
            self.app_data
                .join(PI_WORKSPACES_DIR)
                .join(CONTAINER)
                .join(SESSION)
        }
    }

    fn plan(logical: &str, content: &str) -> WorkspaceWritePlan {
        WorkspaceWritePlan {
            operation_id: "op_1_1".to_string(),
            tool_call_id: "tc_1_1".to_string(),
            logical_path: logical.to_string(),
            proposal_hash: sha256_hex(b"proposal"),
            content_sha256: sha256_hex(content.as_bytes()),
            byte_length: content.len() as u64,
            content: content.to_string(),
        }
    }

    fn mode_of(path: &Path) -> u32 {
        use std::os::unix::fs::MetadataExt;
        std::fs::symlink_metadata(path).expect("lstat").mode() & 0o777
    }

    /// 进程 umask 的无副作用测法（体例照抄 cap-tempfile 自家测试）。
    fn process_umask(dir: &Path) -> u32 {
        use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
        let probe = dir.join(".umask-probe");
        let mut options = std::fs::OpenOptions::new();
        options.read(true).write(true).create_new(true).mode(0o777);
        let file = options.open(&probe).expect("建 umask 探针");
        let mode = file.metadata().expect("stat").mode();
        drop(file);
        std::fs::remove_file(&probe).ok();
        !mode & 0o777
    }

    struct Approve;
    impl WriteDecisionDriver for Approve {
        fn decide(
            &mut self,
            _plan: &WorkspaceWritePlan,
            _action: WriteDisposition,
        ) -> WriteAuthorization {
            WriteAuthorization::Approved
        }
    }

    fn perform_ok(host: &mut WorkspaceFsHost, plan: &WorkspaceWritePlan) {
        let action = host.probe(plan).expect("probe 必须过");
        match host.perform(plan, action) {
            EffectOutcome::Succeeded => {}
            EffectOutcome::Failed(code) => panic!("落盘必须成功，实得 failed({code:?})"),
            EffectOutcome::Uncertain => panic!("落盘必须成功，实得 uncertain"),
        }
    }

    fn failure_of(outcome: EffectOutcome) -> Option<HostFailureCode> {
        match outcome {
            EffectOutcome::Failed(code) => Some(code),
            _ => None,
        }
    }

    // ── grammar（ADR-022 六-B.2 的 Rust 防御门）──────────────────────────────

    /// 逐条闭集反例。**红得准**：每一枚都断言恰是哪一枚 code——`invalid_path` 与
    /// `unsupported_file_type` 互相顶名就说明红的是别的判据。
    #[test]
    fn counterexample_write_path_grammar_refuses_every_closed_violation() {
        let over_segment = format!("{}.md", "a".repeat(MAX_SEGMENT_BYTES));
        let over_total = format!("{}/x.md", vec!["abcd"; 300].join("/"));
        let cases: Vec<(&str, String, HostFailureCode)> = vec![
            ("空串", String::new(), HostFailureCode::InvalidPath),
            ("绝对路径", "/纪要.md".into(), HostFailureCode::InvalidPath),
            ("尾部空段", "a/.md/".into(), HostFailureCode::InvalidPath),
            ("中间空段", "a//b.md".into(), HostFailureCode::InvalidPath),
            ("单点段", "./a.md".into(), HostFailureCode::InvalidPath),
            ("双点段", "../a.md".into(), HostFailureCode::InvalidPath),
            (
                "中间双点段",
                "a/../b.md".into(),
                HostFailureCode::InvalidPath,
            ),
            ("backslash", "a\\b.md".into(), HostFailureCode::InvalidPath),
            (
                "windows drive",
                "C:/a.md".into(),
                HostFailureCode::InvalidPath,
            ),
            ("UNC", "\\\\srv\\a.md".into(), HostFailureCode::InvalidPath),
            ("冒号", "a:b.md".into(), HostFailureCode::InvalidPath),
            ("尖括号", "a<b.md".into(), HostFailureCode::InvalidPath),
            ("竖线", "a|b.md".into(), HostFailureCode::InvalidPath),
            ("问号", "a?b.md".into(), HostFailureCode::InvalidPath),
            ("星号", "a*b.md".into(), HostFailureCode::InvalidPath),
            ("双引号", "a\"b.md".into(), HostFailureCode::InvalidPath),
            (
                "控制字符",
                "a\u{1}b.md".into(),
                HostFailureCode::InvalidPath,
            ),
            ("换行", "a\nb.md".into(), HostFailureCode::InvalidPath),
            ("DEL", "a\u{7f}b.md".into(), HostFailureCode::InvalidPath),
            ("段尾空格", "a /b.md".into(), HostFailureCode::InvalidPath),
            ("段尾点", "a./b.md".into(), HostFailureCode::InvalidPath),
            (
                "保留名 CON",
                "CON/a.md".into(),
                HostFailureCode::InvalidPath,
            ),
            (
                "保留名带扩展",
                "nul.txt/a.md".into(),
                HostFailureCode::InvalidPath,
            ),
            (
                "保留名 lpt9",
                "a/LpT9.md".into(),
                HostFailureCode::InvalidPath,
            ),
            ("段超 255", over_segment, HostFailureCode::InvalidPath),
            ("总长超 1024", over_total, HostFailureCode::InvalidPath),
            // `.md` 那一条是**另一枚 code**（ADR-022 六-B.2：Node gate 与 Rust 防御门同 code）。
            (
                "非 md",
                "纪要.txt".into(),
                HostFailureCode::UnsupportedFileType,
            ),
            (
                "无扩展",
                "纪要".into(),
                HostFailureCode::UnsupportedFileType,
            ),
            (
                "basename 恰 .md",
                ".md".into(),
                HostFailureCode::UnsupportedFileType,
            ),
            (
                "父段恰 .md",
                "a/.md".into(),
                HostFailureCode::UnsupportedFileType,
            ),
            (
                "md 在中段",
                "a.md/b.txt".into(),
                HostFailureCode::UnsupportedFileType,
            ),
        ];
        for (label, logical, expected) in cases {
            let actual = parse_write_path(&logical).err();
            assert_eq!(
                actual,
                Some(expected),
                "{label}：拒绝理由必须恰是 {expected:?}，实得 {actual:?}"
            );
        }

        // 正向对照：合法形态必须**解得出**，否则上面整族的红是「什么都拒」的假红。
        let ok: Vec<(&str, Vec<&str>, &str)> = vec![
            ("纪要.md", vec![], "纪要.md"),
            ("notes/会议纪要.md", vec!["notes"], "会议纪要.md"),
            ("a/b/c/d.MD", vec!["a", "b", "c"], "d.MD"),
            ("a.b.md", vec![], "a.b.md"),
            ("CONSOLE.md", vec![], "CONSOLE.md"),
            ("x .md", vec![], "x .md"),
            // ADR-022 六-B.2 的闭集只禁 `.`/`..` 两枚整段，`...md` 与 `..md` 都是合法 segment
            // 且 `.md` 前有字符——如实登记，不擅自收紧。
            ("...md", vec![], "...md"),
        ];
        for (logical, parents, basename) in ok {
            let parsed = parse_write_path(logical)
                .unwrap_or_else(|code| panic!("{logical} 必须合法，实得 {code:?}"));
            assert_eq!(
                parsed,
                WritePathPlan {
                    parents: parents.iter().map(|s| s.to_string()).collect(),
                    basename: basename.to_string(),
                },
                "{logical}"
            );
        }
    }

    // ── probe 纯读 ＋ 在场判定 ───────────────────────────────────────────────

    /// `probe` 一个字节都不许动：workspace 物理根在 `probe` 之后仍**不存在**。
    /// 建目录也是物理 mutation，只能排在 `effect_started` 之后（ADR-022 六-C）。
    #[test]
    fn counterexample_probe_is_pure_read_and_creates_nothing() {
        let b = bench("probe-pure");
        let mut host = b.host();
        assert_eq!(
            host.probe(&plan("notes/纪要.md", "正文")),
            Ok(WriteDisposition::Created)
        );
        assert!(
            !b.app_data.join(PI_WORKSPACES_DIR).exists(),
            "probe 不得建出 workspace 根"
        );
        let entries: Vec<_> = std::fs::read_dir(&b.app_data)
            .expect("列 app-data")
            .map(|e| e.expect("项").file_name())
            .collect();
        assert!(
            entries.is_empty(),
            "probe 之后 app-data 必须仍为空，实得 {entries:?}"
        );
    }

    /// `created|overwritten` 是真 capability `Dir` 的在场查询，不是脚本常量。
    #[test]
    fn disposition_comes_from_a_real_capability_lookup() {
        let b = bench("disposition");
        let mut host = b.host();
        let subject = plan("notes/纪要.md", "第一版");
        assert_eq!(host.probe(&subject), Ok(WriteDisposition::Created));
        perform_ok(&mut host, &subject);
        assert_eq!(host.probe(&subject), Ok(WriteDisposition::Overwritten));

        let sibling = plan("notes/别的.md", "x");
        assert_eq!(
            host.probe(&sibling),
            Ok(WriteDisposition::Created),
            "同目录的另一枚仍是 created"
        );
        // 目标是目录 ⇒ 显式拒，不当成 overwritten。
        std::fs::create_dir(b.workspace().join("notes").join("目录.md")).expect("建同名目录");
        assert_eq!(
            host.probe(&plan("notes/目录.md", "x")),
            Err(HostFailureCode::IsDirectory)
        );
    }

    // ── 落盘正例：内容、权限、目录 mode、嵌套 Unicode 路径 ────────────────────

    #[test]
    fn write_lands_private_bytes_under_the_session_root() {
        let b = bench("land");
        let mut host = b.host();
        let subject = plan("notes/会议纪要.md", "# 纪要\n第一版\n");
        perform_ok(&mut host, &subject);

        let target = b.workspace().join("notes").join("会议纪要.md");
        assert_eq!(
            std::fs::read_to_string(&target).expect("回读"),
            subject.content
        );
        assert_eq!(mode_of(&target), WORKSPACE_FILE_MODE, "工作稿必须私有");
        for dir in [
            b.app_data.join(PI_WORKSPACES_DIR),
            b.app_data.join(PI_WORKSPACES_DIR).join(CONTAINER),
            b.workspace(),
            b.workspace().join("notes"),
        ] {
            assert_eq!(mode_of(&dir), WORKSPACE_DIR_MODE, "{dir:?} 目录必须 0700");
        }

        // 覆盖式重写：同一枚逻辑路径整体替换，目录里恒恰一枚。
        let second = plan("notes/会议纪要.md", "# 纪要\n第二版更长一些\n");
        perform_ok(&mut host, &second);
        assert_eq!(
            std::fs::read_to_string(&target).expect("回读"),
            second.content
        );
        assert_eq!(mode_of(&target), WORKSPACE_FILE_MODE);
        let siblings: Vec<_> = std::fs::read_dir(b.workspace().join("notes"))
            .expect("列")
            .map(|e| e.expect("项").file_name())
            .collect();
        assert_eq!(
            siblings.len(),
            1,
            "replace 之后不得留 temp 残留，实得 {siblings:?}"
        );
    }

    /// **宽权限 temp 必红**。`replace` 是 rename，最终权限就是 temp 的权限，故直接读最终件。
    ///
    /// 这一枚自带**区分力自证**：同目录同时量一份「不收紧时上游会给什么」的对照
    /// （`0o666 & !umask`）。若本机 umask 恰好让二者相等，本测试**硬失败**并说明原因——
    /// 静默零区分力与全通过同形，一律硬失败（在案判例）。
    #[test]
    fn counterexample_temp_permissions_are_narrowed_not_left_to_umask() {
        let b = bench("temp-perm");
        let umask = process_umask(&b.root);
        let upstream_default = 0o666 & !umask;
        assert_ne!(
            upstream_default, WORKSPACE_FILE_MODE,
            "本机 umask=0o{umask:03o} 使「不收紧」与「收紧」同形，本判据零区分力"
        );
        assert_ne!(
            upstream_default & 0o077,
            0,
            "本机 umask=0o{umask:03o} 下上游默认本就不对外开放，本判据零区分力"
        );

        let mut host = b.host();
        let subject = plan("私密.md", "secret-ish");
        perform_ok(&mut host, &subject);
        assert_eq!(
            mode_of(&b.workspace().join("私密.md")),
            WORKSPACE_FILE_MODE,
            "上游 TempFile::new 默认 0o{upstream_default:03o}——不显式收紧就会对外可读"
        );
    }

    /// `replace` 是**同目录 rename**：旧 inode 被换掉、临时名消失、目录里从头到尾没有过
    /// 「先删再改名」的中间态（remove-then-rename 零出现）。
    #[test]
    fn replace_is_a_same_directory_rename_never_remove_then_rename() {
        use std::os::unix::fs::MetadataExt;
        let b = bench("rename-shape");
        let mut host = b.host();
        let first = plan("纪要.md", "第一版");
        perform_ok(&mut host, &first);
        let target = b.workspace().join("纪要.md");
        let old_ino = std::fs::symlink_metadata(&target).expect("lstat").ino();

        // 旧版本被一个已打开的句柄占着：POSIX rename 之后旧句柄仍读得到**完整旧版**，
        // 新读者只见新版——「无 delete-share 占用保旧文件」的 POSIX 等价面。
        let held = std::fs::File::open(&target).expect("占住旧版本");
        let second = plan("纪要.md", "第二版");
        perform_ok(&mut host, &second);

        let mut held_bytes = String::new();
        {
            use std::io::Read;
            let mut held = held;
            held.read_to_string(&mut held_bytes).expect("旧句柄仍可读");
        }
        assert_eq!(held_bytes, first.content, "旧句柄必须仍见完整旧版本");
        assert_eq!(
            std::fs::read_to_string(&target).expect("回读"),
            second.content
        );
        assert_ne!(
            std::fs::symlink_metadata(&target).expect("lstat").ino(),
            old_ino,
            "就位必须换 inode——原地改写不是原子替换"
        );
    }

    // ── symlink 三面：root 外父段、root 内父段、末段 ──────────────────────────

    /// **root 外**：capability 根**头顶**那一段被换成 symlink，整条拒、零 effect。
    /// capability 模型对自己头顶的路径零担保，这一道只能自研。
    #[test]
    fn counterexample_symlink_above_the_capability_root_is_refused() {
        let b = bench("outer-symlink");
        let real = b.root.join("real-data");
        std::fs::create_dir_all(real.join("app-data")).expect("建真根");
        std::os::unix::fs::symlink(&real, b.root.join("linked")).expect("建 symlink");
        let mut host =
            WorkspaceFsHost::new(&b.root.join("linked").join("app-data"), CONTAINER, SESSION);

        let subject = plan("纪要.md", "正文");
        assert_eq!(host.probe(&subject), Err(HostFailureCode::SymlinkForbidden));
        assert_eq!(
            failure_of(host.perform(&subject, WriteDisposition::Created)),
            Some(HostFailureCode::SymlinkForbidden)
        );
        assert!(
            !real.join("app-data").join(PI_WORKSPACES_DIR).exists(),
            "被拒的一轮不得留下任何物理痕迹"
        );
    }

    /// **root 内指向 root 内**的链接：父段与末段各一枚。
    ///
    /// 这一族与下一枚（指向 root 外）**分工不同，不可互相顶名**：指向 root 外的链接会先撞上
    /// cap-std 自己的 root confinement，`open_dir_nofollow` 换成跟随版的 `open_dir` 照样被拒
    /// ——变异实测 M④3 首轮**假绿**正是被这一层遮住的。只有链接的两端都在 root 内，
    /// 「不跟随」才是本仓薄层自己在起作用（ADR-022 六-D 措辞：cap-std 的保证是
    /// 「链接解析不逃出 capability root」，**不是**「root 内链接一律不跟随」）。
    #[test]
    fn counterexample_symlinks_within_the_root_are_still_never_followed() {
        let b = bench("inroot-symlink");
        let mut host = b.host();
        perform_ok(&mut host, &plan("别处/原件.md", "root 内原件"));
        let inside = b.workspace().join("别处");

        // 父段：workspace 内的一枚目录链接，指向同一 root 内的另一枚目录。
        //
        // 链接内容必须是**相对**的：cap-std 的解析器对绝对目标一律直接拒（它没法把绝对路径
        // 放回 capability root 里解）。用绝对目标写这一枚，跟随版的 `open_dir` 同样会失败，
        // 判据就退化成零区分力——M④3 首轮假绿的第二层遮蔽正是这一条。
        std::os::unix::fs::symlink("别处", b.workspace().join("notes")).expect("建父段链接");
        let nested = plan("notes/原件.md", "覆盖企图");
        assert_eq!(host.probe(&nested), Err(HostFailureCode::SymlinkForbidden));
        assert_eq!(
            failure_of(host.perform(&nested, WriteDisposition::Overwritten)),
            Some(HostFailureCode::SymlinkForbidden)
        );

        // 末段：workspace 内的一枚文件链接，指向同一 root 内的另一枚文件（同样取相对目标）。
        std::os::unix::fs::symlink("别处/原件.md", b.workspace().join("别名.md"))
            .expect("建末段链接");
        let alias = plan("别名.md", "覆盖企图");
        assert_eq!(host.probe(&alias), Err(HostFailureCode::SymlinkForbidden));
        assert_eq!(
            failure_of(host.perform(&alias, WriteDisposition::Overwritten)),
            Some(HostFailureCode::SymlinkForbidden)
        );

        assert_eq!(
            std::fs::read_to_string(inside.join("原件.md")).expect("回读原件"),
            "root 内原件",
            "链接目标必须零变化"
        );
        let landed: Vec<_> = std::fs::read_dir(&inside)
            .expect("列")
            .map(|entry| entry.expect("项").file_name())
            .collect();
        assert_eq!(landed.len(), 1, "链接目标目录不得多出文件，实得 {landed:?}");
    }

    /// **root 内父段与末段指向 root 外**：链接一律不跟随，链接指向的目标零变化。
    #[test]
    fn counterexample_symlinks_inside_the_root_are_never_followed() {
        let b = bench("inner-symlink");
        let outside = b.root.join("outside");
        std::fs::create_dir_all(&outside).expect("建外部目录");
        std::fs::write(outside.join("会议纪要.md"), "外部原件").expect("建外部原件");

        let mut host = b.host();
        // 先让 session 根真实存在（写一枚无关文件），再种链接。
        perform_ok(&mut host, &plan("种子.md", "seed"));

        // 父段是 symlink。
        std::os::unix::fs::symlink(&outside, b.workspace().join("notes")).expect("建父段链接");
        let nested = plan("notes/会议纪要.md", "覆盖企图");
        assert_eq!(host.probe(&nested), Err(HostFailureCode::SymlinkForbidden));
        assert_eq!(
            failure_of(host.perform(&nested, WriteDisposition::Overwritten)),
            Some(HostFailureCode::SymlinkForbidden)
        );

        // 末段是 symlink。
        std::os::unix::fs::symlink(outside.join("会议纪要.md"), b.workspace().join("别名.md"))
            .expect("建末段链接");
        let alias = plan("别名.md", "覆盖企图");
        assert_eq!(host.probe(&alias), Err(HostFailureCode::SymlinkForbidden));
        assert_eq!(
            failure_of(host.perform(&alias, WriteDisposition::Overwritten)),
            Some(HostFailureCode::SymlinkForbidden)
        );

        assert_eq!(
            std::fs::read_to_string(outside.join("会议纪要.md")).expect("回读外部原件"),
            "外部原件",
            "链接目标必须零变化"
        );
        let outside_entries: Vec<_> = std::fs::read_dir(&outside)
            .expect("列外部目录")
            .map(|e| e.expect("项").file_name())
            .collect();
        assert_eq!(
            outside_entries.len(),
            1,
            "外部目录不得多出任何文件，实得 {outside_entries:?}"
        );
    }

    /// **swap race**（结构性必需：macOS 无内核 beneath 原语）。
    ///
    /// temp 已 durable、`replace` 尚未发生的那一瞬把父段整枚换成指向外部的 symlink：
    /// 字节必须落进**下降时握住的那一枚 inode**，外部目标零文件。
    #[test]
    fn counterexample_swapping_a_segment_mid_effect_cannot_redirect_the_bytes() {
        use std::os::unix::fs::MetadataExt;
        let b = bench("swap-race");
        let outside = b.root.join("outside");
        std::fs::create_dir_all(&outside).expect("建外部目录");

        let mut host = b.host();
        perform_ok(&mut host, &plan("notes/占位.md", "seed"));
        let held_ino = std::fs::symlink_metadata(b.workspace().join("notes"))
            .expect("lstat")
            .ino();

        let workspace = b.workspace();
        let outside_for_window = outside.clone();
        host.inject_window(Box::new(move |_parent| {
            // 真实的段替换：原目录改名让位，同名处换成指向外部的 symlink。
            std::fs::rename(workspace.join("notes"), workspace.join("notes-moved")).expect("移开");
            std::os::unix::fs::symlink(&outside_for_window, workspace.join("notes"))
                .expect("换成链接");
        }));

        let subject = plan("notes/纪要.md", "机密正文");
        let action = host.probe(&subject).expect("probe 过");
        assert!(matches!(
            host.perform(&subject, action),
            EffectOutcome::Succeeded
        ));

        // 字节落在原 inode 上（现名 notes-moved），外部目标一枚文件都没有。
        let landed = b.workspace().join("notes-moved").join("纪要.md");
        assert_eq!(
            std::fs::symlink_metadata(b.workspace().join("notes-moved"))
                .expect("lstat")
                .ino(),
            held_ino,
            "落点必须是下降时握住的那一枚 inode"
        );
        assert_eq!(
            std::fs::read_to_string(&landed).expect("回读"),
            subject.content
        );
        let outside_entries: Vec<_> = std::fs::read_dir(&outside)
            .expect("列外部目录")
            .map(|e| e.expect("项").file_name())
            .collect();
        assert!(
            outside_entries.is_empty(),
            "swap 不得把字节改道到外部，实得 {outside_entries:?}"
        );
    }

    // ── 跨容器 ──────────────────────────────────────────────────────────────

    /// 同一枚逻辑路径在两个 container 下互不可见、互不覆盖；
    /// 且 `..` 形 container token 由 cap-std 自己的 root confinement 结构性拒
    /// （探针实测：`open_dir_nofollow("../x")` ⇒ `PermissionDenied`）。
    #[test]
    fn counterexample_containers_cannot_reach_each_other() {
        let b = bench("cross-container");
        let mut a_host = WorkspaceFsHost::new(&b.app_data, "cnt-a", "sess-1");
        let mut b_host = WorkspaceFsHost::new(&b.app_data, "cnt-b", "sess-1");
        perform_ok(&mut a_host, &plan("纪要.md", "甲容器"));
        perform_ok(&mut b_host, &plan("纪要.md", "乙容器"));
        let root = b.app_data.join(PI_WORKSPACES_DIR);
        assert_eq!(
            std::fs::read_to_string(root.join("cnt-a").join("sess-1").join("纪要.md")).expect("甲"),
            "甲容器"
        );
        assert_eq!(
            std::fs::read_to_string(root.join("cnt-b").join("sess-1").join("纪要.md")).expect("乙"),
            "乙容器"
        );
        // 同容器不同 session 同样互不串。
        let mut a2 = WorkspaceFsHost::new(&b.app_data, "cnt-a", "sess-2");
        perform_ok(&mut a2, &plan("纪要.md", "甲容器第二会话"));
        assert_eq!(
            std::fs::read_to_string(root.join("cnt-a").join("sess-1").join("纪要.md")).expect("甲"),
            "甲容器",
            "第二会话不得改写第一会话"
        );

        // 逃逸形 token：cap-std 的 root confinement 结构性拒，一个字节都不落在 app-data 之外。
        let mut escape = WorkspaceFsHost::new(&b.app_data, "..", "sess-1");
        let subject = plan("纪要.md", "逃逸企图");
        assert_eq!(escape.probe(&subject), Err(HostFailureCode::Io));
        assert_eq!(
            failure_of(escape.perform(&subject, WriteDisposition::Created)),
            Some(HostFailureCode::Io)
        );
        assert!(
            !b.root.join("纪要.md").exists() && !b.app_data.join("纪要.md").exists(),
            "逃逸形 token 不得在 capability 根之外落下任何字节"
        );
    }

    // ── 屏障与三态 ──────────────────────────────────────────────────────────

    /// 内容 hash 由 Rust **重算**（ADR-022 六-B.2）；不符即 `hash_mismatch` 且零落盘。
    #[test]
    fn counterexample_content_hash_is_recomputed_before_any_mutation() {
        let b = bench("hash");
        let mut host = b.host();
        let mut subject = plan("纪要.md", "真正文");
        subject.content_sha256 = sha256_hex("别的正文".as_bytes());
        assert_eq!(
            failure_of(host.perform(&subject, WriteDisposition::Created)),
            Some(HostFailureCode::HashMismatch)
        );
        assert!(
            !b.app_data.join(PI_WORKSPACES_DIR).exists(),
            "hash 不符的一轮零 mutation"
        );

        let mut wrong_len = plan("纪要.md", "真正文");
        wrong_len.byte_length += 1;
        assert_eq!(
            failure_of(host.perform(&wrong_len, WriteDisposition::Created)),
            Some(HostFailureCode::HashMismatch)
        );
        assert!(!b.app_data.join(PI_WORKSPACES_DIR).exists());
    }

    /// `replace` 之**时**失败 ⇒ `uncertain`（保守支：既不声称回滚，也不复用授权重试）；
    /// `replace` 之**后**的目录项屏障失败同样 ⇒ `uncertain`。
    ///
    /// 前者是**真实**故障：窗口里把目标名换成非空目录，`rename` 当场失败。
    #[test]
    fn barrier_failures_at_or_after_replace_settle_uncertain() {
        // 一：replace 之时（真故障）。
        let b = bench("uncertain-at-replace");
        let mut host = b.host();
        perform_ok(&mut host, &plan("占位.md", "seed"));
        let workspace = b.workspace();
        host.inject_window(Box::new(move |_parent| {
            let blocker = workspace.join("纪要.md");
            std::fs::create_dir(&blocker).expect("把目标名换成目录");
            std::fs::write(blocker.join("child"), b"x").expect("让它非空");
        }));
        let subject = plan("纪要.md", "正文");
        let action = host.probe(&subject).expect("probe 过");
        assert!(
            matches!(host.perform(&subject, action), EffectOutcome::Uncertain),
            "replace 失败必须落 uncertain，不得伪 failed"
        );

        // 二：replace 之后的目录项屏障。
        let b2 = bench("uncertain-after-replace");
        let mut host2 = b2.host();
        host2.inject_parent_sync_failure();
        let subject2 = plan("纪要.md", "正文");
        let action2 = host2.probe(&subject2).expect("probe 过");
        assert!(matches!(
            host2.perform(&subject2, action2),
            EffectOutcome::Uncertain
        ));
        // uncertain 明示「目标可能已是完整新版本」——事实上它就是。
        assert_eq!(
            std::fs::read_to_string(b2.workspace().join("纪要.md")).expect("回读"),
            subject2.content
        );
    }

    /// `replace` **之前**的失败一律 `failed`，且目标可证零变化、temp 零残留。
    #[test]
    fn counterexample_failures_before_replace_leave_the_target_and_directory_untouched() {
        let b = bench("before-replace");
        let mut host = b.host();
        let first = plan("纪要.md", "第一版");
        perform_ok(&mut host, &first);

        // 父目录只读 ⇒ temp 建不出来。
        let workspace = b.workspace();
        std::fs::set_permissions(&workspace, std::fs::Permissions::from_mode(0o500))
            .expect("收紧父目录");
        let second = plan("纪要.md", "第二版");
        let outcome = failure_of(host.perform(&second, WriteDisposition::Overwritten));
        std::fs::set_permissions(
            &workspace,
            std::fs::Permissions::from_mode(WORKSPACE_DIR_MODE),
        )
        .expect("还原");
        assert_eq!(outcome, Some(HostFailureCode::Io));
        assert_eq!(
            std::fs::read_to_string(workspace.join("纪要.md")).expect("回读"),
            first.content,
            "replace 之前失败必须可证目标零变化"
        );
        let entries: Vec<_> = std::fs::read_dir(&workspace)
            .expect("列")
            .map(|e| e.expect("项").file_name())
            .collect();
        assert_eq!(
            entries.len(),
            1,
            "失败的一轮不得留 temp 残留，实得 {entries:?}"
        );
    }

    // ── 文件系统能力前置 ────────────────────────────────────────────────────

    /// `unsupported_filesystem` 在**任何物理 mutation 之前**判定，判据是闭集而非黑名单：
    /// 未知类型一律不支持。
    #[test]
    fn unsupported_filesystem_is_a_closed_set_decided_before_any_mutation() {
        for durable in DURABLE_FILESYSTEMS {
            assert!(filesystem_is_durable(durable), "{durable}");
        }
        for unknown in [
            "nfs",
            "smbfs",
            "webdav",
            "exfat",
            "msdos",
            "ftp",
            "osxfusefs",
            "",
            "APFS",
            "apfs2",
        ] {
            assert!(
                !filesystem_is_durable(unknown),
                "{unknown}：未知文件系统一律判不支持"
            );
        }

        // 活体读数：本机 app-data 所在卷必须真的在闭集内，否则上面的表是空转。
        let b = bench("fstype");
        let mut host = b.host();
        let observed = filesystem_type(host.base().expect("取根")).expect("读文件系统类型");
        assert!(
            filesystem_is_durable(&observed),
            "本机 app-data 卷实测 {observed:?} 不在闭集内——本族反例在此环境零区分力"
        );
    }

    // ── 授权 ────────────────────────────────────────────────────────────────

    /// 没有 decision driver 就是**没有授权**：真件缺件即 `policy_denied`，绝不自动放行。
    #[test]
    fn counterexample_missing_decision_driver_denies_instead_of_approving() {
        let b = bench("decide");
        let mut bare = b.host();
        let subject = plan("纪要.md", "正文");
        assert!(matches!(
            bare.decide(&subject, WriteDisposition::Created),
            WriteAuthorization::Denied(AuthorizationDenyCode::PolicyDenied)
        ));

        let mut driven = b.host().with_decision_driver(Box::new(Approve));
        assert!(matches!(
            driven.decide(&subject, WriteDisposition::Created),
            WriteAuthorization::Approved
        ));
    }

    // ── runtime cwd 不落 workspace ──────────────────────────────────────────

    /// `ensure_runtime_cwd` 的 cwd 与 workspace 物理根互不包含（ADR-022 六-C：
    /// cwd 不得是 case / workspace / resource 目录）。
    #[test]
    fn runtime_cwd_never_lands_inside_the_workspace_root() {
        use crate::pi_loop_process::{ensure_runtime_cwd, RUNTIME_CWD_DIR};
        assert_ne!(RUNTIME_CWD_DIR, PI_WORKSPACES_DIR);
        assert!(!RUNTIME_CWD_DIR.starts_with(PI_WORKSPACES_DIR));
        assert!(!PI_WORKSPACES_DIR.starts_with(RUNTIME_CWD_DIR));

        let b = bench("cwd");
        let mut host = b.host();
        perform_ok(&mut host, &plan("纪要.md", "正文"));
        let cwd = ensure_runtime_cwd(&b.app_data).expect("建 cwd");
        let workspaces = b.app_data.join(PI_WORKSPACES_DIR);
        assert!(
            !cwd.starts_with(&workspaces),
            "cwd 落进了 workspace：{cwd:?}"
        );
        assert!(
            !workspaces.starts_with(&cwd),
            "workspace 落进了 cwd：{workspaces:?}"
        );
    }

    // ── 并发 reader ─────────────────────────────────────────────────────────

    /// 并发 reader 只见完整旧版或完整新版，永不见半版（ADR-022 六-C）。
    #[test]
    fn concurrent_readers_only_ever_see_the_old_or_the_new_version() {
        let b = bench("concurrent");
        let mut host = b.host();
        let old = "旧".repeat(4096);
        let new = "新".repeat(8192);
        perform_ok(&mut host, &plan("纪要.md", &old));

        let target = b.workspace().join("纪要.md");
        let stop = Arc::new(Mutex::new(false));
        let seen: Arc<Mutex<BTreeSet<String>>> = Arc::new(Mutex::new(BTreeSet::new()));
        let reader = {
            let (target, stop, seen) = (target.clone(), Arc::clone(&stop), Arc::clone(&seen));
            std::thread::spawn(move || loop {
                if let Ok(bytes) = std::fs::read(&target) {
                    seen.lock()
                        .expect("未中毒")
                        .insert(String::from_utf8_lossy(&bytes).into_owned());
                }
                if *stop.lock().expect("未中毒") {
                    return;
                }
            })
        };
        for round in 0..40 {
            let content = if round % 2 == 0 {
                new.clone()
            } else {
                old.clone()
            };
            perform_ok(&mut host, &plan("纪要.md", &content));
        }
        *stop.lock().expect("未中毒") = true;
        reader.join().expect("reader 收束");

        let seen = seen.lock().expect("未中毒");
        assert!(!seen.is_empty(), "reader 一次都没读到，本判据零区分力");
        for observed in seen.iter() {
            assert!(
                observed == &old || observed == &new,
                "reader 见到了既非旧版也非新版的 {} 字节",
                observed.len()
            );
        }
    }

    // ── 真 SIGKILL 崩溃窗 ───────────────────────────────────────────────────

    const CRASH_BLOCKS: usize = 8192; // 8 字节一块 ⇒ 64 KiB 完整帧
    const CRASH_FRAME_BYTES: u64 = (CRASH_BLOCKS * 8) as u64;

    /// 第 `generation` 代的确定性载荷：整帧由同一枚 8 字节十进制代号铺满。
    /// 撕裂 ⇒ 长度不对，或帧内出现两个代号。
    fn crash_payload(generation: u64) -> String {
        format!("{:08}", generation % 100_000_000).repeat(CRASH_BLOCKS)
    }

    /// 崩溃编排的 writer 子进程：只有被置了环境变量时才进入无限写循环，直到被 SIGKILL。
    /// 普通 `cargo test` 运行下即刻空转返回（体例照抄 `work_state::tests::crash_writer_child`）。
    #[test]
    fn workspace_crash_writer_child() {
        let Ok(dir) = std::env::var("COURTWORK_PI_WS_CRASH_DIR") else {
            return;
        };
        let app_data = PathBuf::from(dir);
        let mut host = WorkspaceFsHost::new(&app_data, CONTAINER, SESSION);
        let mut generation = 1_u64;
        loop {
            let content = crash_payload(generation);
            let subject = plan("纪要.md", &content);
            let action = host.probe(&subject).expect("child probe");
            let _ = host.perform(&subject, action);
            generation += 1;
        }
    }

    /// 真 SIGKILL 铺在 temp 写、`sync_all`、`replace` 与目录项屏障构成的整个窗口上：
    /// 崩溃恢复后目标必须恰是**某一代的完整帧**，永不是半帧。
    ///
    /// 采样-杀点编排承 `work_state` 在案手法：紧循环轮询目标尺寸——**唯有非原子直写**
    /// 会让目标本身短于完整帧；原子替换下这一事件不可能发生，故「观测到子完整帧尺寸」
    /// 是确定性红证，不靠运气。
    #[test]
    fn counterexample_real_sigkills_never_leave_a_torn_workspace_file() {
        use std::os::unix::process::ExitStatusExt;
        use std::process::{Command, Stdio};
        use std::time::{Duration, Instant};

        let self_exe = std::env::current_exe().expect("current_exe");
        let trials = 12;
        let deadline = Duration::from_secs(5);
        let mut killed_by_signal = 0_u64;
        let mut partial_observations = 0_u64;
        let mut recovered = 0_u64;

        for trial in 0..trials {
            let b = bench(&format!("crash-{trial}"));
            let target = b.workspace().join("纪要.md");
            let mut child = Command::new(&self_exe)
                .arg("pi_loop_workspace::tests::workspace_crash_writer_child")
                .arg("--exact")
                .env("COURTWORK_PI_WS_CRASH_DIR", &b.app_data)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("spawn writer child");

            let started = Instant::now();
            let mut rounds = 0_u64;
            loop {
                if let Ok(metadata) = std::fs::metadata(&target) {
                    if metadata.len() < CRASH_FRAME_BYTES {
                        partial_observations += 1;
                        break;
                    }
                    rounds += 1;
                    if rounds >= 3 {
                        break;
                    }
                }
                if started.elapsed() >= deadline {
                    break;
                }
                std::thread::yield_now();
            }
            let _ = child.kill();
            let status = child.wait().expect("wait child");
            if status.signal() == Some(9) {
                killed_by_signal += 1;
            }

            // 恢复：目标要么还不存在（第一代都没落住），要么恰是某一代的完整帧。
            match std::fs::read_to_string(&target) {
                Err(_) => {}
                Ok(bytes) => {
                    recovered += 1;
                    assert_eq!(
                        bytes.len() as u64,
                        CRASH_FRAME_BYTES,
                        "trial {trial}：崩溃后目标不是完整帧"
                    );
                    let head: String = bytes.chars().take(8).collect();
                    assert_eq!(
                        bytes,
                        head.repeat(CRASH_BLOCKS),
                        "trial {trial}：帧内混了两代——原子替换被破坏"
                    );
                }
            }
        }
        assert_eq!(
            partial_observations, 0,
            "并发采样咬到了子完整帧尺寸：目标被非原子地直写"
        );
        assert!(
            killed_by_signal >= trials - 1,
            "真 SIGKILL 必须真的投递：{killed_by_signal}"
        );
        assert!(
            recovered >= 1,
            "至少一轮要真的写出过完整帧，否则本判据零区分力"
        );
    }

    // ── 读面与 viewer（PI-WORKSPACE-READ-1）──────────────────────────────────

    /// 落一份真文件再走真读件：三枚 wire 值都从**当前正文**自算，不复述写入时的自报值。
    fn land(bench: &Bench, logical: &str, content: &str) {
        let mut host = bench.host().with_decision_driver(Box::new(AlwaysApprove));
        assert!(
            matches!(
                host.perform(&plan(logical, content), WriteDisposition::Created),
                EffectOutcome::Succeeded
            ),
            "前置：写入必须成功"
        );
    }

    struct AlwaysApprove;
    impl WriteDecisionDriver for AlwaysApprove {
        fn decide(
            &mut self,
            _plan: &WorkspaceWritePlan,
            _action: WriteDisposition,
        ) -> WriteAuthorization {
            WriteAuthorization::Approved
        }
    }

    #[test]
    fn read_file_returns_the_landed_bytes_and_fails_closed_on_non_utf8() {
        let bench = bench("read-file");
        let content = "# 纪要\n第一条：合同编号 HT-2024-081\n";
        land(&bench, "notes/会议纪要.md", content);

        let mut host = bench.host();
        let (read, byte_length) =
            WorkspaceReadHost::read_file(&mut host, "notes/会议纪要.md").expect("必须读得到");
        assert_eq!(read, content, "逐字节回读");
        assert_eq!(byte_length, content.len() as u64);

        // 非 UTF-8 **不**做 lossy 替换：那会把正文静默改写，回读双验也随之失效。
        std::fs::write(bench.workspace().join("坏.md"), [0xff, 0xfe, 0x00]).expect("造坏字节");
        assert_eq!(
            WorkspaceReadHost::read_file(&mut host, "坏.md"),
            Err(HostFailureCode::Io),
            "非 UTF-8 必须 fail-closed，不得回 U+FFFD"
        );
    }

    #[test]
    fn read_face_is_pure_and_never_creates_the_workspace_root() {
        let bench = bench("read-pure");
        let mut host = bench.host();
        // 一次都没写过：三枚读操作都不许把目录建出来。
        assert_eq!(WorkspaceReadHost::exists(&mut host, "任意.md"), Ok(false));
        assert_eq!(WorkspaceReadHost::list(&mut host, "."), Ok(Vec::new()));
        assert_eq!(
            WorkspaceReadHost::read_file(&mut host, "任意.md"),
            Err(HostFailureCode::NotFound)
        );
        assert!(
            !bench.workspace().exists(),
            "读是纯读：workspace 根一个字节都不许因读而出现"
        );
    }

    #[test]
    fn list_is_direct_children_only_sorted_by_utf8_name() {
        let bench = bench("read-list");
        land(&bench, "乙.md", "b\n");
        land(&bench, "甲.md", "a\n");
        land(&bench, "子目录/丙.md", "c\n");

        let mut host = bench.host();
        let entries = WorkspaceReadHost::list(&mut host, ".").expect("列根");
        assert_eq!(
            entries.iter().map(|entry| entry.name.as_str()).collect::<Vec<_>>(),
            vec!["乙.md", "子目录", "甲.md"],
            "只列直接子项，按 UTF-8 name 升序"
        );
        // `byteLength` 只对 file 有值（wire 契约）。
        for entry in &entries {
            match entry.kind {
                ListEntryKind::File => assert!(entry.byte_length.is_some()),
                _ => assert!(entry.byte_length.is_none()),
            }
        }
    }

    #[test]
    fn read_face_does_not_follow_symlinks_at_any_segment() {
        let bench = bench("read-symlink");
        land(&bench, "真件.md", "x\n");
        let root = bench.workspace();
        std::os::unix::fs::symlink("/etc/hosts", root.join("外链.md")).expect("造末段链接");
        std::fs::create_dir(bench.root.join("别处")).expect("造界外目录");
        std::os::unix::fs::symlink(bench.root.join("别处"), root.join("链目录")).expect("造中间段链接");

        let mut host = bench.host();
        assert_eq!(
            WorkspaceReadHost::read_file(&mut host, "外链.md"),
            Err(HostFailureCode::SymlinkForbidden),
            "末段是链接：拒，且绝不去看它指向谁"
        );
        assert_eq!(
            WorkspaceReadHost::exists(&mut host, "外链.md"),
            Err(HostFailureCode::SymlinkForbidden),
            "exists 同样不许把链接读成「在」或「不在」"
        );
        assert_eq!(
            WorkspaceReadHost::read_file(&mut host, "链目录/任意.md"),
            Err(HostFailureCode::SymlinkForbidden),
            "中间段是链接：同样拒"
        );
    }

    /// 两个 session 各有自己的 workspace 根：一个读不到另一个的文件。
    #[test]
    fn sessions_do_not_read_through_to_each_other() {
        let bench = bench("read-isolation");
        land(&bench, "机密.md", "只属本 session\n");

        let mut other = WorkspaceFsHost::new(&bench.app_data, CONTAINER, "sess-2");
        assert_eq!(WorkspaceReadHost::exists(&mut other, "机密.md"), Ok(false));
        assert_eq!(
            WorkspaceReadHost::read_file(&mut other, "机密.md"),
            Err(HostFailureCode::NotFound),
        );
        let mut other_container = WorkspaceFsHost::new(&bench.app_data, "cnt-2", SESSION);
        assert_eq!(
            WorkspaceReadHost::exists(&mut other_container, "机密.md"),
            Ok(false)
        );
    }

    #[test]
    fn viewer_returns_current_bytes_with_a_recomputed_hash() {
        let bench = bench("viewer-ok");
        let first = "# 初稿\n";
        land(&bench, "简报.md", first);
        let view = open_workspace_markdown(&bench.app_data, CONTAINER, SESSION, "简报.md")
            .expect("必须打得开");
        assert_eq!(view.logical_path, "简报.md");
        assert_eq!(view.content, first);
        assert_eq!(view.content_sha256, sha256_hex(first.as_bytes()));
        assert_eq!(view.byte_length, first.len() as u64);

        // 覆盖之后再看：hash 跟着**当前**正文走，不复述上一次落账的那一枚。
        let second = "# 二稿\n多了一行\n";
        land(&bench, "简报.md", second);
        let again = open_workspace_markdown(&bench.app_data, CONTAINER, SESSION, "简报.md")
            .expect("必须打得开");
        assert_eq!(again.content_sha256, sha256_hex(second.as_bytes()));
        assert_ne!(again.content_sha256, view.content_sha256, "两稿必不同 hash");
    }

    #[test]
    fn viewer_double_gate_refuses_bad_session_and_bad_path_with_zero_leakage() {
        let bench = bench("viewer-gate");
        land(&bench, "简报.md", "正文\n");
        std::fs::create_dir_all(bench.workspace().join("子目录")).expect("造目录");

        let cases: Vec<(&str, &str, &str, &str, WorkspaceViewError)> = vec![
            ("容器 id 越界", "../逃逸", SESSION, "简报.md", WorkspaceViewError::SessionMismatch),
            ("会话 id 越界", CONTAINER, "sess/1", "简报.md", WorkspaceViewError::SessionMismatch),
            ("会话 id 为空", CONTAINER, "", "简报.md", WorkspaceViewError::SessionMismatch),
            ("路径含 ..", CONTAINER, SESSION, "../简报.md", WorkspaceViewError::InvalidPath),
            ("非 Markdown", CONTAINER, SESSION, "简报.txt", WorkspaceViewError::UnsupportedFileType),
            ("basename 恰为 .md", CONTAINER, SESSION, ".md", WorkspaceViewError::UnsupportedFileType),
            ("不存在", CONTAINER, SESSION, "没有.md", WorkspaceViewError::NotFound),
            // 目录名不以 `.md` 结尾，故先被 Markdown 门拦下——顺序即语义，如实登记实际拒因。
            ("目录名不是 Markdown", CONTAINER, SESSION, "子目录", WorkspaceViewError::UnsupportedFileType),
        ];
        let physical = bench.app_data.to_string_lossy().to_string();
        for (label, container, session, logical, expected) in cases {
            let result = open_workspace_markdown(&bench.app_data, container, session, logical);
            assert_eq!(result, Err(expected), "{label}");
            let message = expected.message();
            assert!(!message.contains(&physical), "{label}：文案不得含物理根");
            assert!(
                message.len() <= 1024,
                "{label}：文案不得越 ADR 的 1,024 bytes 上限"
            );
        }
    }

    /// viewer 的 session 门必须在**任何 I/O 之前**：坏 token 不许把目录建出来，也不许触盘。
    #[test]
    fn viewer_session_gate_runs_before_touching_the_filesystem() {
        let bench = bench("viewer-gate-order");
        assert_eq!(
            open_workspace_markdown(&bench.app_data, "cnt/1", "sess-1", "简报.md"),
            Err(WorkspaceViewError::SessionMismatch)
        );
        assert!(
            !bench.app_data.join(PI_WORKSPACES_DIR).exists(),
            "session 门不成立时一个目录都不许建"
        );
    }

    #[test]
    fn viewer_refuses_oversized_markdown() {
        let bench = bench("viewer-cap");
        let big = "あ".repeat(MAX_TEXT_BYTES); // 每字 3 bytes，稳超上限
        land(&bench, "巨稿.md", &big);
        assert_eq!(
            open_workspace_markdown(&bench.app_data, CONTAINER, SESSION, "巨稿.md"),
            Err(WorkspaceViewError::LimitExceeded)
        );
    }

    // ── ambient / mutation 面的 fail-closed 静态门 ───────────────────────────

    /// PREFLIGHT §ambient 逃逸口穷举（种子照抄上游 `ambient-authority` 的 clippy 禁用清单）。
    const FORBIDDEN_CONSTRUCTS: &[&str] = &[
        "open_parent_dir",
        "from_std_file",
        "TempDir::new",
        "tempdir(",
        "create_ambient_dir_all",
        "create_dir_all",
        "canonicalize",
        "remove_file",
        "remove_dir",
        "hard_link",
        "read_link",
        "File::create",
        "File::open",
        "set_len",
        "new_anonymous",
    ];

    /// 唯一允许出现的 ambient 取得构件——且只许出现在带 `AMBIENT-ROOT` 的具名理由行上。
    const AMBIENT_CONSTRUCTS: &[&str] = &["open_ambient_dir", "ambient_authority"];

    /// `OpenOptions` 从 {@link FORBIDDEN_CONSTRUCTS} 移到这里（`PI-WORKSPACE-READ-1`）。
    ///
    /// 它当初被整体禁掉，是因为写路径**只**该经 `TempFile` + `replace`，任何自造 open 都会
    /// 绕开屏障。读路径没有屏障可绕，但它需要**比默认更强**的一件事：以
    /// `FollowSymlinks::No` 打开末段——这正是本模块「门是 nofollow 打开、`symlink_metadata`
    /// 只报理由」那条doctrine 在文件层的兑现。换成 `Dir::open` 反而更弱（cap-std 只保证不
    /// 逃出 root，不保证 root 内不跟随），故取「保留最强原语 + 具名登记」而非「换弱原语过门」。
    ///
    /// 约束与 ambient 同形：只许出现在带 `READ-NOFOLLOW` 的具名理由行上，且**恰三处**
    /// （两枚 `use` 引入 + 一枚构造）。多一处、少一处、或落在没有理由行的位置，一律红。
    const NOFOLLOW_OPEN_CONSTRUCTS: &[&str] = &["OpenOptions"];
    const NOFOLLOW_OPEN_SITES: usize = 3;

    /// 唯一登记的 `std::fs::` 调用：只读 `lstat`。其余任何 `fs::` 出现都判红——
    /// **不是**白名单允许清单，而是「未登记即红」的 fail-closed 枚举（承 1R5 判例：
    /// 名字清单换材质仍是白名单，病根是 unknown ⇒ 跳过）。
    const REGISTERED_STD_FS: &[&str] = &["std::fs::symlink_metadata("];

    fn production_lines() -> Vec<(usize, String)> {
        let source = include_str!("pi_loop_workspace.rs");
        let cut = source
            .find("\n#[cfg(test)]\nmod tests {")
            .expect("必须找得到测试段的起点——找不到说明扫描面已经漂移");
        source[..cut]
            .lines()
            .enumerate()
            .map(|(index, line)| (index + 1, line.to_string()))
            // 注释行没有可执行代码；本模块的 doc 注释大量引用这些构件名，逐字扫描会全员误伤。
            // 只排「整行注释」，行尾注释仍留在扫描面内（保守方向）。
            .filter(|(_, line)| !line.trim_start().starts_with("//"))
            .collect()
    }

    #[test]
    fn ambient_and_mutation_surface_is_fail_closed() {
        let lines = production_lines();
        assert!(lines.len() > 150, "扫描面塌缩：只剩 {} 行", lines.len());

        // 一：禁用构件恰零出现。
        for construct in FORBIDDEN_CONSTRUCTS {
            let hits: Vec<usize> = lines
                .iter()
                .filter(|(_, line)| line.contains(construct))
                .map(|(number, _)| *number)
                .collect();
            assert!(
                hits.is_empty(),
                "禁用构件 {construct} 出现在生产段 {hits:?}"
            );
        }

        // 二：ambient 只许住在具名理由行上，且恰一处取得点。
        let mut ambient_lines: Vec<usize> = Vec::new();
        for (number, line) in &lines {
            if AMBIENT_CONSTRUCTS
                .iter()
                .any(|construct| line.contains(construct))
            {
                assert!(
                    line.contains("AMBIENT-ROOT") || line.contains("cap_std::ambient_authority()"),
                    "第 {number} 行的 ambient 构件没有具名理由：{line}"
                );
                ambient_lines.push(*number);
            }
        }
        assert_eq!(
            ambient_lines.len(),
            1,
            "ambient 取得点必须恰一处，实得 {ambient_lines:?}"
        );

        // 二之二：no-follow 打开只许住在具名理由行上，且恰三处。
        let mut nofollow_lines: Vec<usize> = Vec::new();
        for (number, line) in &lines {
            if NOFOLLOW_OPEN_CONSTRUCTS
                .iter()
                .any(|construct| line.contains(construct))
            {
                assert!(
                    line.contains("READ-NOFOLLOW"),
                    "第 {number} 行的 OpenOptions 没有具名理由：{line}"
                );
                nofollow_lines.push(*number);
            }
        }
        assert_eq!(
            nofollow_lines.len(),
            NOFOLLOW_OPEN_SITES,
            "no-follow 打开点必须恰 {NOFOLLOW_OPEN_SITES} 处，实得 {nofollow_lines:?}"
        );

        // 三：`fs::` 调用逐处清账；未登记即红。
        let mut unregistered: Vec<(usize, String)> = Vec::new();
        for (number, line) in &lines {
            if !line.contains("fs::") {
                continue;
            }
            // `cap_std::fs::` / `cap_fs_ext` 是 capability 面，本条只清 std 面。
            let std_hits = line
                .match_indices("std::fs::")
                .filter(|(at, _)| *at == 0 || !line[..*at].ends_with("cap_"));
            for (at, _) in std_hits {
                let registered = REGISTERED_STD_FS
                    .iter()
                    .any(|allowed| line[at..].starts_with(allowed));
                if !registered {
                    unregistered.push((*number, line.trim().to_string()));
                }
            }
        }
        assert!(
            unregistered.is_empty(),
            "未登记的 std::fs 调用：{unregistered:?}"
        );

        // 四：唯一登记项确实在场——清单为空与全通过同形，一律硬失败。
        let lstat_hits = lines
            .iter()
            .filter(|(_, line)| line.contains(REGISTERED_STD_FS[0]))
            .count();
        assert_eq!(lstat_hits, 1, "登记的只读 lstat 必须恰一处");
    }

    /// macOS 面**不可构造**的两项，如实登记为记录性边界而不是伪装成绿：
    ///
    /// - Windows junction / mount point / name-surrogate reparse point：概念不在本平台存在。
    ///   本模块对它们的处置与 symlink 同源（`open_dir_nofollow` 作门、末段一律不跟随），
    ///   实证须在 Windows 宿主上另做。
    /// - `fsync` 真实失败：本机无法构造，故目录项屏障那一支由具名 `#[cfg(test)]` 标志驱动。
    #[test]
    fn platform_boundaries_are_registered_not_faked() {
        let platform = std::env::consts::OS;
        assert_ne!(
            platform, "windows",
            "本记录只对 macOS 成立；移植到 Windows 时 junction/reparse 反例必须真做"
        );
        assert_eq!(
            platform, "macos",
            "本模块的 swap-race 收口手法以「无内核 beneath 原语」为前提"
        );
    }
}
