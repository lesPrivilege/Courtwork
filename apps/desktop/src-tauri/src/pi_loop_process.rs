//! PI-HOST-LOOP-1 §二.4 / §二.5：Route A 双件 preflight、clean child 与全部 lifecycle deadline。
//!
//! 三条不肯让步的边界：
//!
//! 1. **expected-side 是编译期的**。tracked `src-tauri/pi-sidecar/route-manifest.json` 以 `include_bytes!`
//!    编进 host binary；运行时 resource manifest 必须先与它 **byte-identical**，才轮到 closed decode。
//!    绝不从 runtime/CJS 实物重算一份 manifest 再把自报值当 expected——那样 hash 门就只是在
//!    证明「文件等于它自己」。
//! 2. **spawn 调用点只出现一次，且直接住在 {@link spawn_verified_sidecar} 里**。
//!    ADR-018 的 dynamic-spawn 行按 exact expression / enclosing function / anchor / count 四项
//!    双向匹配；把它搬进任何 helper 或 command factory 都必须触红。
//! 3. **除活动 prompt / provider stream 本体外，全部 child I/O 与 lifecycle wait 都有界**。
//!    那一处例外是 ADR 明写的；其余每一段等待都带具名 deadline，超时按 `lifecycle_timeout` 收束。

#![allow(dead_code)]

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read, Write};
use std::os::unix::fs::{DirBuilderExt, MetadataExt, PermissionsExt};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sha2::{Digest, Sha256};

use crate::pi_loop_journal::TargetTriple;
use crate::pi_loop_protocol::{
    closed_record, is_sha256_hex, pick, read_boolean, read_enum, read_integer, read_string, reject,
    scan_json_document, CodecResult, JsonNode, ProtocolErrorCode, MAX_PACKET_BYTES,
    MAX_SAFE_INTEGER,
};

// ── deadline 与上限（§二.5 逐值）─────────────────────────────────────────────

/// 每枚 host→child 完整 packet 的 write+flush 上界。
pub(crate) const PACKET_WRITE_DEADLINE: Duration = Duration::from_millis(5_000);
/// bootstrap → ready。
pub(crate) const BOOTSTRAP_READY_DEADLINE: Duration = Duration::from_millis(30_000);
/// cancel → prompt terminal。
pub(crate) const CANCEL_TERMINAL_DEADLINE: Duration = Duration::from_millis(15_000);
/// idle shutdown → shutdown terminal。
pub(crate) const SHUTDOWN_TERMINAL_DEADLINE: Duration = Duration::from_millis(15_000);
/// fatal/shutdown terminal → EOF + exit。
pub(crate) const TERMINAL_EXIT_DEADLINE: Duration = Duration::from_millis(15_000);
/// SIGTERM 之后的 grace。
pub(crate) const SIGTERM_GRACE: Duration = Duration::from_millis(5_000);
/// SIGKILL 之后的 kill-confirm。
pub(crate) const KILL_CONFIRM_DEADLINE: Duration = Duration::from_millis(5_000);
/// 每 leg 的 stderr 上限；原文只活在受限内存/test seam。
pub(crate) const STDERR_LIMIT_BYTES: usize = 65_536;
/// child 的 cwd：app-data 内的固定非案件目录。
pub(crate) const RUNTIME_CWD_DIR: &str = "pi-loop-runtime";
/// runtime 的 externalBin basename；packaged 只从 current executable sibling 解析。
pub(crate) const RUNTIME_BASENAME: &str = "pi-sidecar";
/// resource 子目录名，恰含 route manifest 与 sidecar.cjs 两件。
///
/// 前缀刻意**不叫** `pi-sidecar`：tauri-build 在 dev 把 `Contents/MacOS` 与 `Contents/Resources`
/// 展平进同一个 `target/<profile>/`，externalBin 基名要占文件名、resource 前缀要占同名目录，
/// 同名之下二者不能并存（实测 `File exists (os error 17)`）。改用与 journal `pi-loop`、
/// cwd `pi-loop-runtime` 同族的名字，也避开 sibling 禁形 `pi-sidecar-*`。票面 §二.4 已订正。
pub(crate) const RESOURCE_DIR_NAME: &str = "pi-loop-resources";
pub(crate) const MANIFEST_BASENAME: &str = "route-manifest.json";
pub(crate) const BUNDLE_BASENAME: &str = "sidecar.cjs";

/// **编译期 expected-side**：tracked 真源直接编进 host binary。
pub(crate) const EXPECTED_ROUTE_MANIFEST: &[u8] =
    include_bytes!("../pi-sidecar/route-manifest.json");

// ── manifest ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ArtifactDigest {
    pub(crate) bytes: u64,
    pub(crate) sha256: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ManifestTarget {
    pub(crate) target_triple: TargetTriple,
    pub(crate) macho_arch: String,
    pub(crate) source_archive_filename: String,
    pub(crate) source_archive: ArtifactDigest,
    pub(crate) runtime: ArtifactDigest,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct RouteManifest {
    pub(crate) bundle_resource_relative_path: String,
    pub(crate) bundle: ArtifactDigest,
    pub(crate) targets: Vec<ManifestTarget>,
}

impl RouteManifest {
    pub(crate) fn target(&self, triple: TargetTriple) -> Option<&ManifestTarget> {
        self.targets
            .iter()
            .find(|target| target.target_triple == triple)
    }
}

fn read_artifact(members: &[(String, JsonNode)], owner: &str) -> CodecResult<ArtifactDigest> {
    // bytes 都是**正** safe integer：0 / null / TODO / placeholder 一律拒。
    let bytes = read_integer(pick(members, "bytes", owner)?, "bytes", 1, MAX_SAFE_INTEGER)?;
    let sha256 = read_string(pick(members, "sha256", owner)?, "sha256", 64)?;
    if !is_sha256_hex(&sha256) {
        return reject(ProtocolErrorCode::InvalidSchema, "sha256 必须是小写 64 hex");
    }
    Ok(ArtifactDigest { bytes, sha256 })
}

/// 顶层恰含 `schemaVersion/routeId/nodeVersion/useCodeCache/bundle/targets`；
/// targets 恰两行且按 `targetTriple` UTF-8 升序，缺/多/重复/乱序均拒。
pub(crate) fn decode_route_manifest(bytes: &[u8]) -> CodecResult<RouteManifest> {
    let Ok(text) = std::str::from_utf8(bytes) else {
        return reject(
            ProtocolErrorCode::InvalidJson,
            "route manifest 不是合法 UTF-8",
        );
    };
    let node = scan_json_document(text)?;
    let members = closed_record(
        &node,
        "route manifest",
        &[
            "schemaVersion",
            "routeId",
            "nodeVersion",
            "useCodeCache",
            "bundle",
            "targets",
        ],
    )?;
    read_integer(
        pick(members, "schemaVersion", "manifest")?,
        "schemaVersion",
        1,
        1,
    )?;
    read_enum(pick(members, "routeId", "manifest")?, "routeId", |value| {
        (value == crate::pi_loop_journal::ROUTE_ID).then_some(())
    })?;
    read_enum(
        pick(members, "nodeVersion", "manifest")?,
        "nodeVersion",
        |value| (value == crate::pi_loop_journal::NODE_VERSION).then_some(()),
    )?;
    if read_boolean(pick(members, "useCodeCache", "manifest")?, "useCodeCache")? {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "本路线 useCodeCache 恒为 false",
        );
    }

    let bundle_members = closed_record(
        pick(members, "bundle", "manifest")?,
        "bundle",
        &["resourceRelativePath", "bytes", "sha256"],
    )?;
    let bundle_resource_relative_path = read_string(
        pick(bundle_members, "resourceRelativePath", "bundle")?,
        "resourceRelativePath",
        256,
    )?;
    if bundle_resource_relative_path != format!("{RESOURCE_DIR_NAME}/{BUNDLE_BASENAME}") {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "bundle.resourceRelativePath 不是冻结落点",
        );
    }
    let bundle = read_artifact(bundle_members, "bundle")?;

    let JsonNode::Array(items) = pick(members, "targets", "manifest")? else {
        return reject(ProtocolErrorCode::InvalidSchema, "targets 必须是 array");
    };
    if items.len() != 2 {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "targets 恰两行，缺一多一都拒",
        );
    }
    let mut targets = Vec::with_capacity(2);
    for item in items {
        let target_members = closed_record(
            item,
            "target",
            &["targetTriple", "machoArch", "sourceArchive", "runtime"],
        )?;
        let target_triple = read_enum(
            pick(target_members, "targetTriple", "target")?,
            "targetTriple",
            TargetTriple::parse,
        )?;
        let macho_arch = read_string(
            pick(target_members, "machoArch", "target")?,
            "machoArch",
            32,
        )?;
        let expected_arch = match target_triple {
            TargetTriple::Aarch64AppleDarwin => "arm64",
            TargetTriple::X8664AppleDarwin => "x86_64",
        };
        if macho_arch != expected_arch {
            return reject(
                ProtocolErrorCode::InvalidSchema,
                "machoArch 与 targetTriple 不符",
            );
        }
        let archive_members = closed_record(
            pick(target_members, "sourceArchive", "target")?,
            "sourceArchive",
            &["filename", "bytes", "sha256"],
        )?;
        let source_archive_filename = read_string(
            pick(archive_members, "filename", "sourceArchive")?,
            "filename",
            256,
        )?;
        let source_archive = read_artifact(archive_members, "sourceArchive")?;

        let runtime_members = closed_record(
            pick(target_members, "runtime", "target")?,
            "runtime",
            &["externalBinBasename", "bytes", "sha256"],
        )?;
        read_enum(
            pick(runtime_members, "externalBinBasename", "runtime")?,
            "externalBinBasename",
            |value| (value == RUNTIME_BASENAME).then_some(()),
        )?;
        let runtime = read_artifact(runtime_members, "runtime")?;

        targets.push(ManifestTarget {
            target_triple,
            macho_arch,
            source_archive_filename,
            source_archive,
            runtime,
        });
    }
    if targets[0].target_triple.as_str() >= targets[1].target_triple.as_str() {
        return reject(
            ProtocolErrorCode::InvalidSchema,
            "targets 必须按 targetTriple 升序且不重复",
        );
    }

    Ok(RouteManifest {
        bundle_resource_relative_path,
        bundle,
        targets,
    })
}

// ── route pair preflight ────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum RouteError {
    /// 运行时 manifest 与编译期 expected bytes 不同——最先触发，早于任何解码与 hash 计算。
    ManifestBytesDrift,
    ManifestInvalid(&'static str),
    ArtifactMissing(&'static str),
    /// 不是 regular file，或路径末段是 symlink。
    ArtifactNotRegular(&'static str),
    ArtifactBytes(&'static str),
    ArtifactSha(&'static str),
    /// resource 目录多件、或 executable sibling 出现第二枚 sidecar 候选。
    ExtraCandidate(&'static str),
    /// cwd 建立失败（root 或某级 parent 不是 regular non-symlink directory）。
    RuntimeCwd(&'static str),
    Io(&'static str),
}

impl RouteError {
    pub(crate) fn code(&self) -> &'static str {
        match self {
            RouteError::ManifestBytesDrift => "manifest_bytes_drift",
            RouteError::ManifestInvalid(_) => "manifest_invalid",
            RouteError::ArtifactMissing(_) => "artifact_missing",
            RouteError::ArtifactNotRegular(_) => "artifact_not_regular",
            RouteError::ArtifactBytes(_) => "artifact_bytes",
            RouteError::ArtifactSha(_) => "artifact_sha",
            RouteError::ExtraCandidate(_) => "extra_candidate",
            RouteError::RuntimeCwd(_) => "runtime_cwd",
            RouteError::Io(_) => "io",
        }
    }
}

/// headless / 测试可注入的 app layout。production 由 current executable 与 Tauri `resource_dir()`
/// 给出；无论哪一路都零本机 Node、零 PATH、零 repo、零 fixture、零 SEA fallback。
#[derive(Debug, Clone)]
pub(crate) struct AppLayout {
    pub(crate) executable_dir: PathBuf,
    pub(crate) resource_dir: PathBuf,
}

/// preflight 通过后才存在的凭据。字段私有：除 {@link preflight_route_pair} 外没有生产构造路径。
#[derive(Debug, Clone)]
pub(crate) struct VerifiedRoutePair {
    runtime_path: PathBuf,
    sidecar_cjs_path: PathBuf,
    manifest_sha256: String,
    target_triple: TargetTriple,
}

impl VerifiedRoutePair {
    /// journal `session_started.routeManifestSha256` 的唯一来源：对**已验证与编译期 expected
    /// byte-identical** 的 runtime manifest 原始 bytes 重算所得。不接受调用方、自报或旧值。
    pub(crate) fn manifest_sha256(&self) -> &str {
        &self.manifest_sha256
    }
    pub(crate) fn target_triple(&self) -> TargetTriple {
        self.target_triple
    }
    pub(crate) fn runtime_path(&self) -> &Path {
        &self.runtime_path
    }
    pub(crate) fn sidecar_cjs_path(&self) -> &Path {
        &self.sidecar_cjs_path
    }

    /// 生命周期/回收测试用的构造面：真跑 spawn/deadline/SIGTERM 需要一枚**可执行**的双件，
    /// 而冻结真值指向 112 MiB 的官方 Node，不可能在单测内合成。
    /// 它只造 pair 本身，绝不放宽 {@link preflight_route_pair} 的任何一道门。
    #[cfg(test)]
    pub(crate) fn for_lifecycle_test(runtime_path: PathBuf, sidecar_cjs_path: PathBuf) -> Self {
        VerifiedRoutePair {
            runtime_path,
            sidecar_cjs_path,
            manifest_sha256: sha256_bytes(EXPECTED_ROUTE_MANIFEST),
            target_triple: TargetTriple::Aarch64AppleDarwin,
        }
    }
}

pub(crate) fn sha256_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let mut out = String::with_capacity(64);
    for byte in hasher.finalize() {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

fn sha256_file(path: &Path) -> Result<(u64, String), RouteError> {
    let mut file = File::open(path).map_err(|_| RouteError::Io("打开制品失败"))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; 1 << 16];
    let mut total = 0_u64;
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|_| RouteError::Io("读取制品失败"))?;
        if read == 0 {
            break;
        }
        total += read as u64;
        hasher.update(&buffer[..read]);
    }
    let mut digest = String::with_capacity(64);
    for byte in hasher.finalize() {
        digest.push_str(&format!("{byte:02x}"));
    }
    Ok((total, digest))
}

/// regular file、非 symlink、bytes 与 SHA 逐值。任一不符即 fail-closed。
fn verify_artifact(
    path: &Path,
    expected: &ArtifactDigest,
    label: &'static str,
) -> Result<(), RouteError> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err(RouteError::ArtifactMissing(label));
        }
        Err(_) => return Err(RouteError::Io("lstat 制品失败")),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(RouteError::ArtifactNotRegular(label));
    }
    if metadata.len() != expected.bytes {
        return Err(RouteError::ArtifactBytes(label));
    }
    let (bytes, digest) = sha256_file(path)?;
    if bytes != expected.bytes {
        return Err(RouteError::ArtifactBytes(label));
    }
    if digest != expected.sha256 {
        return Err(RouteError::ArtifactSha(label));
    }
    Ok(())
}

/// 「extra」按**位置**判断：resource `pi-loop-resources/` 恰含 manifest 与 `sidecar.cjs`；
/// current executable sibling 目录可以有主程序等其他包内文件，但不得出现第二枚
/// `pi-sidecar-*` / route-prefixed sidecar 候选。绝不把整个 `Contents/MacOS` 当成两件闭集。
fn assert_closed_candidates(layout: &AppLayout) -> Result<(), RouteError> {
    let resource = layout.resource_dir.join(RESOURCE_DIR_NAME);
    let mut names: Vec<String> = Vec::new();
    for entry in fs::read_dir(&resource).map_err(|_| RouteError::Io("读取 resource 目录失败"))?
    {
        let entry = entry.map_err(|_| RouteError::Io("枚举 resource 目录失败"))?;
        names.push(entry.file_name().to_string_lossy().into_owned());
    }
    names.sort();
    let mut expected = vec![MANIFEST_BASENAME.to_string(), BUNDLE_BASENAME.to_string()];
    expected.sort();
    if names != expected {
        return Err(RouteError::ExtraCandidate(
            "resource pi-loop-resources/ 不是两件闭集",
        ));
    }

    let mut candidates = 0_usize;
    for entry in
        fs::read_dir(&layout.executable_dir).map_err(|_| RouteError::Io("读取可执行目录失败"))?
    {
        let entry = entry.map_err(|_| RouteError::Io("枚举可执行目录失败"))?;
        if entry
            .file_name()
            .to_string_lossy()
            .starts_with(RUNTIME_BASENAME)
        {
            candidates += 1;
        }
    }
    if candidates != 1 {
        return Err(RouteError::ExtraCandidate(
            "executable sibling 不是唯一 sidecar 候选",
        ));
    }
    Ok(())
}

/// 双件 pair preflight。次序即语义：
/// resource manifest bytes ≡ 编译期 expected → closed decode → 候选闭集 → 双件逐值。
/// 全部通过之前不得 spawn、不得读 Keychain、不得写 journal。
pub(crate) fn preflight_route_pair(
    layout: &AppLayout,
    target: TargetTriple,
) -> Result<VerifiedRoutePair, RouteError> {
    let manifest_path = layout
        .resource_dir
        .join(RESOURCE_DIR_NAME)
        .join(MANIFEST_BASENAME);
    let manifest_meta = match fs::symlink_metadata(&manifest_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err(RouteError::ArtifactMissing("route manifest"));
        }
        Err(_) => return Err(RouteError::Io("lstat manifest 失败")),
    };
    if manifest_meta.file_type().is_symlink() || !manifest_meta.is_file() {
        return Err(RouteError::ArtifactNotRegular("route manifest"));
    }
    let manifest_bytes =
        fs::read(&manifest_path).map_err(|_| RouteError::Io("读取 manifest 失败"))?;
    // expected-side 是编译期的：先证 byte-identical，再谈解码。
    if manifest_bytes != EXPECTED_ROUTE_MANIFEST {
        return Err(RouteError::ManifestBytesDrift);
    }
    let manifest = decode_route_manifest(&manifest_bytes)
        .map_err(|_| RouteError::ManifestInvalid("route manifest 不合闭集"))?;

    assert_closed_candidates(layout)?;

    let Some(entry) = manifest.target(target) else {
        return Err(RouteError::ManifestInvalid("manifest 缺本机 target"));
    };

    let runtime_path = layout.executable_dir.join(RUNTIME_BASENAME);
    verify_artifact(&runtime_path, &entry.runtime, "runtime")?;
    let sidecar_cjs_path = layout
        .resource_dir
        .join(RESOURCE_DIR_NAME)
        .join(BUNDLE_BASENAME);
    verify_artifact(&sidecar_cjs_path, &manifest.bundle, "sidecar.cjs")?;

    Ok(VerifiedRoutePair {
        runtime_path,
        sidecar_cjs_path,
        // 只对**已验证与编译期 expected byte-identical** 的原始 bytes 重算。
        manifest_sha256: sha256_bytes(&manifest_bytes),
        target_triple: target,
    })
}

/// 本机 target。非 macOS 与非双架构一律没有可用 target，preflight 必拒。
pub(crate) fn host_target_triple() -> Option<TargetTriple> {
    if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        Some(TargetTriple::Aarch64AppleDarwin)
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        Some(TargetTriple::X8664AppleDarwin)
    } else {
        None
    }
}

/// child 的 cwd：`app_data_dir()/pi-loop-runtime`，mode 0700。
/// root 与各级 parent 都须是 regular directory、非 symlink；失败一律 pre-spawn。
/// cwd 不得是 case / workspace / resource 目录。
pub(crate) fn ensure_runtime_cwd(app_data_dir: &Path) -> Result<PathBuf, RouteError> {
    let mut ancestors: Vec<&Path> = app_data_dir.ancestors().collect();
    ancestors.reverse();
    for ancestor in ancestors {
        let metadata = fs::symlink_metadata(ancestor)
            .map_err(|_| RouteError::RuntimeCwd("cwd 的某级 parent 不可 lstat"))?;
        if metadata.file_type().is_symlink() {
            return Err(RouteError::RuntimeCwd("cwd 的某级 parent 是 symlink"));
        }
        if !metadata.is_dir() {
            return Err(RouteError::RuntimeCwd("cwd 的某级 parent 不是目录"));
        }
    }
    let cwd = app_data_dir.join(RUNTIME_CWD_DIR);
    match fs::symlink_metadata(&cwd) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return Err(RouteError::RuntimeCwd("runtime cwd 不是 regular directory"));
            }
            fs::set_permissions(&cwd, fs::Permissions::from_mode(0o700))
                .map_err(|_| RouteError::RuntimeCwd("无法收紧 runtime cwd 权限"))?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            fs::DirBuilder::new()
                .mode(0o700)
                .create(&cwd)
                .map_err(|_| RouteError::RuntimeCwd("无法创建 runtime cwd"))?;
        }
        Err(_) => return Err(RouteError::RuntimeCwd("runtime cwd 不可 lstat")),
    }
    let metadata =
        fs::symlink_metadata(&cwd).map_err(|_| RouteError::RuntimeCwd("runtime cwd 不可 lstat"))?;
    if metadata.permissions().mode() & 0o777 != 0o700 {
        return Err(RouteError::RuntimeCwd("runtime cwd 权限不是 0700"));
    }
    // SAFETY: `geteuid` 无参数、无副作用、恒成功。
    if metadata.uid() != unsafe { libc::geteuid() } {
        return Err(RouteError::RuntimeCwd("runtime cwd 不属当前用户"));
    }
    Ok(cwd)
}

// ── spawn ───────────────────────────────────────────────────────────────────

/// 全 crate **唯一**的 sidecar 进程创建点。
///
/// ADR-018 的 dynamic row 按 `{capability:'pi-product-sidecar',
/// programExpression:'verified_runtime_path', enclosingFunction:'spawn_verified_sidecar',
/// requiredLevel:'none', anchor:'apps/desktop/src-tauri/src/pi_loop_process.rs', exactCount:1}`
/// 双向匹配：改变量名、拼接、helper 包裹、搬进 command factory 或再开第二枚 spawn 都必须触红。
///
/// - `env_clear()`：child env 严格为空，不留「必要变量」口子；
/// - argv 恰 `[verifiedRuntimePath, verifiedSidecarCjsPath]`，无其他 flag；
/// - cwd 恰为已核验的 `app_data_dir()/pi-loop-runtime`。
pub(crate) fn spawn_verified_sidecar(
    pair: &VerifiedRoutePair,
    cwd: &Path,
) -> std::io::Result<Child> {
    let verified_runtime_path = pair.runtime_path.clone();
    Command::new(verified_runtime_path)
        .arg(&pair.sidecar_cjs_path)
        .current_dir(cwd)
        .env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
}

// ── 进程通道 ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ProcessFault {
    /// 具名 deadline 超时。
    LifecycleTimeout(&'static str),
    /// child 的 stdout 提前 EOF（含 EOF 前未见 LF 的 partial packet）。
    UnexpectedEof,
    /// 单行超过 packet framing 上限。
    PacketTooLarge,
    /// stderr 越过每 leg 上限。
    StderrLimit,
    /// SIGKILL 之后仍未确认回收。
    KillUnconfirmed,
    Io(&'static str),
}

#[derive(Debug)]
pub(crate) enum ReadOutcome {
    Line(Vec<u8>),
    Eof,
    Fault(ProcessFault),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ExitOutcome {
    Code(i32),
    Signal(i32),
    /// deadline 内未见退出。
    Pending,
}

/// stderr 账：对外只给 byte count 与 hash；原文只活在受限内存/test seam，
/// 不写 journal / log / error / UI。
#[derive(Debug, Default)]
pub(crate) struct StderrLedger {
    bytes: AtomicUsize,
    overflowed: AtomicBool,
    captured: Mutex<Vec<u8>>,
}

impl StderrLedger {
    pub(crate) fn bytes(&self) -> usize {
        self.bytes.load(Ordering::Relaxed)
    }
    pub(crate) fn overflowed(&self) -> bool {
        self.overflowed.load(Ordering::Relaxed)
    }
    pub(crate) fn digest(&self) -> String {
        let captured = self.captured.lock().expect("stderr 缓冲未中毒");
        sha256_bytes(&captured)
    }
    #[cfg(test)]
    pub(crate) fn captured_len(&self) -> usize {
        self.captured.lock().expect("stderr 缓冲未中毒").len()
    }
}

enum ReadItem {
    Line(Vec<u8>),
    Eof,
    Fault(ProcessFault),
}

/// 已 spawn 的 sidecar leg：读写各一条线程，全部等待都带具名 deadline。
pub(crate) struct SidecarProcess {
    child: Child,
    pid: i32,
    stdout_rx: Receiver<ReadItem>,
    write_tx: Option<Sender<Vec<u8>>>,
    write_ack_rx: Receiver<Result<(), ProcessFault>>,
    stderr: Arc<StderrLedger>,
    exited: Option<ExitOutcome>,
}

impl SidecarProcess {
    pub(crate) fn attach(mut child: Child) -> SidecarProcess {
        let pid = child.id() as i32;
        let stdout = child.stdout.take().expect("stdout 已 piped");
        let stderr = child.stderr.take().expect("stderr 已 piped");
        let mut stdin = child.stdin.take().expect("stdin 已 piped");

        let (stdout_tx, stdout_rx) = mpsc::channel::<ReadItem>();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            loop {
                let mut line = Vec::new();
                match reader.read_until(b'\n', &mut line) {
                    Ok(0) => {
                        let _ = stdout_tx.send(ReadItem::Eof);
                        return;
                    }
                    Ok(_) => {
                        if line.len() > MAX_PACKET_BYTES {
                            let _ = stdout_tx.send(ReadItem::Fault(ProcessFault::PacketTooLarge));
                            return;
                        }
                        if line.last() != Some(&b'\n') {
                            // EOF 前未见 LF 的 partial packet 一律拒。
                            let _ = stdout_tx.send(ReadItem::Fault(ProcessFault::UnexpectedEof));
                            return;
                        }
                        line.pop();
                        if stdout_tx.send(ReadItem::Line(line)).is_err() {
                            return;
                        }
                    }
                    Err(_) => {
                        let _ =
                            stdout_tx.send(ReadItem::Fault(ProcessFault::Io("读取 stdout 失败")));
                        return;
                    }
                }
            }
        });

        let ledger = Arc::new(StderrLedger::default());
        let stderr_ledger = Arc::clone(&ledger);
        std::thread::spawn(move || {
            let mut reader = stderr;
            let mut buffer = [0_u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) | Err(_) => return,
                    Ok(read) => {
                        let total = stderr_ledger.bytes.fetch_add(read, Ordering::Relaxed) + read;
                        let mut captured =
                            stderr_ledger.captured.lock().expect("stderr 缓冲未中毒");
                        let room = STDERR_LIMIT_BYTES.saturating_sub(captured.len());
                        if room > 0 {
                            captured.extend_from_slice(&buffer[..read.min(room)]);
                        }
                        drop(captured);
                        if total > STDERR_LIMIT_BYTES {
                            stderr_ledger.overflowed.store(true, Ordering::Relaxed);
                        }
                    }
                }
            }
        });

        let (write_tx, write_rx) = mpsc::channel::<Vec<u8>>();
        let (ack_tx, write_ack_rx) = mpsc::channel::<Result<(), ProcessFault>>();
        std::thread::spawn(move || {
            while let Ok(line) = write_rx.recv() {
                let result = stdin
                    .write_all(&line)
                    .and_then(|()| stdin.flush())
                    .map_err(|_| ProcessFault::Io("写入 stdin 失败"));
                if ack_tx.send(result).is_err() {
                    return;
                }
            }
        });

        SidecarProcess {
            child,
            pid,
            stdout_rx,
            write_tx: Some(write_tx),
            write_ack_rx,
            stderr: ledger,
            exited: None,
        }
    }

    pub(crate) fn stderr(&self) -> &Arc<StderrLedger> {
        &self.stderr
    }

    /// 每枚完整 packet 的 write+flush 以 5,000 ms 为界；超时按 `lifecycle_timeout` 收束。
    pub(crate) fn write_packet(&mut self, line: &[u8]) -> Result<(), ProcessFault> {
        let Some(sender) = self.write_tx.as_ref() else {
            return Err(ProcessFault::Io("stdin 已关闭"));
        };
        sender
            .send(line.to_vec())
            .map_err(|_| ProcessFault::Io("写线程已退出"))?;
        match self.write_ack_rx.recv_timeout(PACKET_WRITE_DEADLINE) {
            Ok(result) => result,
            Err(RecvTimeoutError::Timeout) => {
                Err(ProcessFault::LifecycleTimeout("packet write+flush"))
            }
            Err(RecvTimeoutError::Disconnected) => Err(ProcessFault::Io("写线程已退出")),
        }
    }

    /// 关 stdin（对 child 是 EOF）。
    pub(crate) fn close_stdin(&mut self) {
        self.write_tx = None;
    }

    /// 读一枚 packet。`deadline` 为 `None` 表示这一段没有总时限——
    /// 那是 ADR 明写的**唯一**例外：活动 prompt / provider stream 本体。
    pub(crate) fn read_packet(
        &mut self,
        deadline: Option<Duration>,
        window: &'static str,
    ) -> ReadOutcome {
        if self.stderr.overflowed() {
            return ReadOutcome::Fault(ProcessFault::StderrLimit);
        }
        let received = match deadline {
            Some(limit) => match self.stdout_rx.recv_timeout(limit) {
                Ok(item) => item,
                Err(RecvTimeoutError::Timeout) => {
                    return if self.stderr.overflowed() {
                        ReadOutcome::Fault(ProcessFault::StderrLimit)
                    } else {
                        ReadOutcome::Fault(ProcessFault::LifecycleTimeout(window))
                    };
                }
                Err(RecvTimeoutError::Disconnected) => ReadItem::Eof,
            },
            None => match self.stdout_rx.recv() {
                Ok(item) => item,
                Err(_) => ReadItem::Eof,
            },
        };
        if self.stderr.overflowed() {
            return ReadOutcome::Fault(ProcessFault::StderrLimit);
        }
        match received {
            ReadItem::Line(line) => ReadOutcome::Line(line),
            ReadItem::Eof => ReadOutcome::Eof,
            ReadItem::Fault(fault) => ReadOutcome::Fault(fault),
        }
    }

    /// 在 deadline 内等自然退出。
    pub(crate) fn wait_exit(&mut self, deadline: Duration) -> ExitOutcome {
        if let Some(outcome) = self.exited {
            return outcome;
        }
        let start = Instant::now();
        loop {
            match self.child.try_wait() {
                Ok(Some(status)) => {
                    let outcome = classify_status(&status);
                    self.exited = Some(outcome);
                    return outcome;
                }
                Ok(None) => {}
                Err(_) => return ExitOutcome::Pending,
            }
            if start.elapsed() >= deadline {
                return ExitOutcome::Pending;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    /// 违例回收：先 SIGTERM、grace 5,000 ms，再 SIGKILL、kill-confirm 5,000 ms。
    ///
    /// SIGTERM 必须由既有 `libc::kill(pid, SIGTERM)` 完成；`Child::kill()` 只可用于 SIGKILL，
    /// 不得改用外部 `/bin/kill` 或新增 spawn。kill-confirm 失败也必须具名。
    pub(crate) fn terminate(&mut self) -> Result<ExitOutcome, ProcessFault> {
        if let Some(outcome) = self.exited {
            return Ok(outcome);
        }
        self.write_tx = None;
        // SAFETY: `kill` 只对本进程 spawn 出来的 pid 发信号，无内存副作用。
        unsafe { libc::kill(self.pid, libc::SIGTERM) };
        if let outcome @ (ExitOutcome::Code(_) | ExitOutcome::Signal(_)) =
            self.wait_exit(SIGTERM_GRACE)
        {
            return Ok(outcome);
        }
        let _ = self.child.kill();
        match self.wait_exit(KILL_CONFIRM_DEADLINE) {
            ExitOutcome::Pending => Err(ProcessFault::KillUnconfirmed),
            outcome => Ok(outcome),
        }
    }
}

fn classify_status(status: &std::process::ExitStatus) -> ExitOutcome {
    use std::os::unix::process::ExitStatusExt;
    match status.signal() {
        Some(signal) => ExitOutcome::Signal(signal),
        None => ExitOutcome::Code(status.code().unwrap_or(-1)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicU64;

    static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

    fn temp_dir(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-pi-route-{tag}-{}-{}",
            std::process::id(),
            TEMP_SEQ.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&base).expect("建临时目录");
        // macOS 的 `/var` 是指向 `/private/var` 的 symlink，而 `ensure_runtime_cwd` 逐级拒
        // symlink parent（production 的 `~/Library/Application Support/...` 本就无链）。
        // 这里先规范化，免得测的是临时目录的实现细节而不是那道门。
        fs::canonicalize(&base).expect("规范化临时目录")
    }

    fn layout_with_manifest(root: &Path, manifest: &[u8]) -> AppLayout {
        let executable_dir = root.join("MacOS");
        let resource_dir = root.join("Resources");
        fs::create_dir_all(&executable_dir).expect("建可执行目录");
        fs::create_dir_all(resource_dir.join(RESOURCE_DIR_NAME)).expect("建 resource 目录");
        fs::write(
            resource_dir.join(RESOURCE_DIR_NAME).join(MANIFEST_BASENAME),
            manifest,
        )
        .expect("写 manifest");
        fs::write(
            resource_dir.join(RESOURCE_DIR_NAME).join(BUNDLE_BASENAME),
            b"// not the bundle",
        )
        .expect("写 cjs");
        fs::write(executable_dir.join(RUNTIME_BASENAME), b"not the runtime").expect("写 runtime");
        AppLayout {
            executable_dir,
            resource_dir,
        }
    }

    fn compact_manifest() -> String {
        std::str::from_utf8(EXPECTED_ROUTE_MANIFEST)
            .expect("UTF-8")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("")
    }

    #[test]
    fn compiled_manifest_decodes_and_matches_the_frozen_truth_table() {
        let manifest =
            decode_route_manifest(EXPECTED_ROUTE_MANIFEST).expect("编译期 manifest 合法");
        // bundle 身份是 product source 的函数：PI-HOST-LOOP-1R 的 N1–N3 改了
        // `product-case-env.ts` / `product-runtime.ts`，sealed CJS 因此换了字节与 SHA。
        // 双方由 `product-main.test.ts` 的跨侧门逐值锁死，不许只改一边。
        assert_eq!(manifest.bundle.bytes, 523_057);
        assert_eq!(
            manifest.bundle.sha256,
            "b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d"
        );
        assert_eq!(
            manifest.bundle_resource_relative_path,
            "pi-loop-resources/sidecar.cjs"
        );
        assert_eq!(manifest.targets.len(), 2);

        let arm = manifest
            .target(TargetTriple::Aarch64AppleDarwin)
            .expect("有 arm64 行");
        assert_eq!(arm.macho_arch, "arm64");
        assert_eq!(
            arm.source_archive_filename,
            "node-v22.23.1-darwin-arm64.tar.gz"
        );
        assert_eq!(arm.source_archive.bytes, 50_067_502);
        assert_eq!(
            arm.source_archive.sha256,
            "ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953"
        );
        assert_eq!(arm.runtime.bytes, 112_928_848);
        assert_eq!(
            arm.runtime.sha256,
            "2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d"
        );

        let intel = manifest
            .target(TargetTriple::X8664AppleDarwin)
            .expect("有 x86_64 行");
        assert_eq!(intel.macho_arch, "x86_64");
        assert_eq!(
            intel.source_archive_filename,
            "node-v22.23.1-darwin-x64.tar.gz"
        );
        assert_eq!(intel.source_archive.bytes, 51_245_086);
        assert_eq!(
            intel.source_archive.sha256,
            "b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81"
        );
        assert_eq!(intel.runtime.bytes, 115_447_952);
        assert_eq!(
            intel.runtime.sha256,
            "03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b"
        );
        assert!(
            manifest.targets[0].target_triple.as_str() < manifest.targets[1].target_triple.as_str(),
            "targets 按 targetTriple 升序"
        );
    }

    #[test]
    fn counterexample_manifest_shape_drift_goes_red_one_by_one() {
        let compact = compact_manifest();
        assert!(
            decode_route_manifest(compact.as_bytes()).is_ok(),
            "对照：去空白仍是合法 manifest"
        );

        let tail = compact.rfind("]}").expect("有收尾");
        let arm_start = compact
            .find("{\"targetTriple\":\"aarch64")
            .expect("有 arm 行");
        let intel_start = compact
            .find("{\"targetTriple\":\"x86_64")
            .expect("有 intel 行");
        let arm = &compact[arm_start..intel_start - 1];
        let intel = &compact[intel_start..tail];
        let head = &compact[..arm_start];
        let foot = &compact[tail..];

        for (label, mutated) in [
            (
                "extra key",
                compact.replace("{\"schemaVersion\":1,", "{\"extra\":1,\"schemaVersion\":1,"),
            ),
            ("缺字段", compact.replace("\"useCodeCache\":false,", "")),
            ("乱序", format!("{head}{intel},{arm}{foot}")),
            ("重复 target", format!("{head}{arm},{arm}{foot}")),
            ("单 target", format!("{head}{arm}{foot}")),
            ("零字节", compact.replace("\"bytes\":523057", "\"bytes\":0")),
            (
                "大写 SHA",
                compact.replace(
                    "b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d",
                    "B72FE521439022C494477B2D41BC7B230D6AA5DF2BDE8668DBA248D3CBF4107D",
                ),
            ),
            (
                "错 arch",
                compact.replace("\"machoArch\":\"arm64\"", "\"machoArch\":\"x86_64\""),
            ),
            (
                "错版本",
                compact.replace("\"nodeVersion\":\"22.23.1\"", "\"nodeVersion\":\"22.23.0\""),
            ),
            (
                "code cache 打开",
                compact.replace("\"useCodeCache\":false", "\"useCodeCache\":true"),
            ),
            (
                "错 routeId",
                compact.replace(
                    "node22-runtime-sealed-cjs-v1",
                    "node22-runtime-sealed-cjs-v2",
                ),
            ),
            (
                "错 bundle 落点",
                compact.replace(
                    "pi-loop-resources/sidecar.cjs",
                    "pi-loop-resources/sidecar-v2.cjs",
                ),
            ),
        ] {
            assert_ne!(mutated, compact, "{label}：变异必须真的命中");
            assert!(
                decode_route_manifest(mutated.as_bytes()).is_err(),
                "{label} 必须触红"
            );
        }
    }

    #[test]
    fn counterexample_runtime_manifest_must_be_byte_identical_to_the_compiled_expected() {
        let root = temp_dir("bytes-drift");
        // 语义等价但**字节不同**（去掉缩进）的 manifest：closed decode 会过，byte-identical 不会。
        let compact = compact_manifest();
        assert!(
            decode_route_manifest(compact.as_bytes()).is_ok(),
            "对照：它自身合法"
        );

        let layout = layout_with_manifest(&root, compact.as_bytes());
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ManifestBytesDrift,
            "必须在 closed decode 之前就拒"
        );
    }

    #[test]
    fn counterexample_missing_symlink_dir_and_extra_candidates_all_fail_pre_spawn() {
        // 缺 manifest。
        let root = temp_dir("missing");
        let executable_dir = root.join("MacOS");
        let resource_dir = root.join("Resources");
        fs::create_dir_all(&executable_dir).expect("建目录");
        fs::create_dir_all(resource_dir.join(RESOURCE_DIR_NAME)).expect("建目录");
        let layout = AppLayout {
            executable_dir,
            resource_dir,
        };
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin)
                .expect_err("缺件必须拒"),
            RouteError::ArtifactMissing("route manifest")
        );

        // manifest 是 symlink。
        let root = temp_dir("symlink");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        let manifest_path = layout
            .resource_dir
            .join(RESOURCE_DIR_NAME)
            .join(MANIFEST_BASENAME);
        let real = root.join("real-manifest.json");
        fs::rename(&manifest_path, &real).expect("挪走真身");
        std::os::unix::fs::symlink(&real, &manifest_path).expect("建 symlink");
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactNotRegular("route manifest")
        );

        // manifest 是目录。
        let root = temp_dir("dir");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        let manifest_path = layout
            .resource_dir
            .join(RESOURCE_DIR_NAME)
            .join(MANIFEST_BASENAME);
        fs::remove_file(&manifest_path).expect("删文件");
        fs::create_dir(&manifest_path).expect("建同名目录");
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactNotRegular("route manifest")
        );

        // runtime 是 symlink（指向一枚字节数正确的实体也不行）。
        let root = temp_dir("runtime-symlink");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        let runtime_path = layout.executable_dir.join(RUNTIME_BASENAME);
        fs::remove_file(&runtime_path).expect("删");
        std::os::unix::fs::symlink(root.join("nowhere"), &runtime_path).expect("建 symlink");
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactNotRegular("runtime")
        );

        // resource pi-loop-resources/ 多一件。
        let root = temp_dir("extra-resource");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        fs::write(
            layout
                .resource_dir
                .join(RESOURCE_DIR_NAME)
                .join("hitchhiker.cjs"),
            b"x",
        )
        .expect("多塞一件");
        assert!(
            matches!(
                preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin)
                    .expect_err("必须拒"),
                RouteError::ExtraCandidate(_)
            ),
            "resource 目录恰两件"
        );

        // executable sibling：主程序等其他包内文件仍允许，第二枚 sidecar 候选必须拒。
        let root = temp_dir("extra-sibling");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        fs::write(layout.executable_dir.join("Courtwork"), b"main binary").expect("主程序");
        assert!(
            !matches!(
                preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin),
                Err(RouteError::ExtraCandidate(_))
            ),
            "sibling 里的主程序不算第二枚候选（对照）"
        );
        fs::write(
            layout.executable_dir.join("pi-sidecar-x86_64-apple-darwin"),
            b"second",
        )
        .expect("第二枚候选");
        assert!(
            matches!(
                preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin)
                    .expect_err("必须拒"),
                RouteError::ExtraCandidate(_)
            ),
            "第二枚 pi-sidecar-* 必须拒"
        );
    }

    #[test]
    fn counterexample_wrong_bytes_and_wrong_sha_are_distinguished() {
        let root = temp_dir("digest");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        // runtime 实物 bytes 与冻结真值不符。
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactBytes("runtime")
        );

        // 字节对上但 SHA 不对：用冻结长度填一份垃圾。
        let manifest = decode_route_manifest(EXPECTED_ROUTE_MANIFEST).expect("合法");
        let arm = manifest
            .target(TargetTriple::Aarch64AppleDarwin)
            .expect("有行");
        fs::write(
            layout.executable_dir.join(RUNTIME_BASENAME),
            vec![b'x'; arm.runtime.bytes as usize],
        )
        .expect("写等长垃圾");
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactSha("runtime")
        );
    }

    #[test]
    fn counterexample_zero_byte_runtime_stops_at_the_byte_gate() {
        // 「零字节」在 manifest 字段一侧已由 shape drift 覆盖；这里补**实物**一侧。
        // bundle 的零字节形态要求 runtime 先真过 SHA 门（112 MiB 官方件，单测合成不出来），
        // 由 `pi_loop::tests::snapshot_e2e_*` 的实物注入承担。
        let root = temp_dir("zero-runtime");
        let layout = layout_with_manifest(&root, EXPECTED_ROUTE_MANIFEST);
        fs::write(layout.executable_dir.join(RUNTIME_BASENAME), b"").expect("截成零字节");
        assert_eq!(
            preflight_route_pair(&layout, TargetTriple::Aarch64AppleDarwin).expect_err("必须拒"),
            RouteError::ArtifactBytes("runtime"),
            "零字节必须停在 bytes 门，而不是等 SHA 或更晚的 spawn"
        );
    }

    #[test]
    fn partial_line_before_eof_is_reported_as_a_fault_not_as_a_packet() {
        // EOF 之前没见到 LF 的半行不是一枚 packet：wire 一侧没有 journal 那种
        // 「截到前一枚 durable」的说法，只能以 `UnexpectedEof` 收束，绝不投出半行。
        let root = temp_dir("partial");
        let (pair, cwd) = shell_pair(&root, "printf 'partial-without-lf'\nexit 0\n");
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        let outcome = process.read_packet(Some(Duration::from_millis(5_000)), "partial");
        assert!(
            matches!(
                outcome,
                ReadOutcome::Eof | ReadOutcome::Fault(ProcessFault::UnexpectedEof)
            ),
            "半行 + EOF 不得冒充 packet，实得 {outcome:?}"
        );
    }

    #[test]
    fn runtime_cwd_is_created_0700_and_refuses_symlinked_parents() {
        let root = temp_dir("cwd");
        let app_data = root.join("app-data");
        fs::create_dir_all(&app_data).expect("建 app-data");
        let cwd = ensure_runtime_cwd(&app_data).expect("建 cwd");
        assert_eq!(cwd, app_data.join(RUNTIME_CWD_DIR));
        assert_eq!(
            fs::symlink_metadata(&cwd)
                .expect("lstat")
                .permissions()
                .mode()
                & 0o777,
            0o700,
            "cwd 必须是 0700"
        );
        assert_eq!(ensure_runtime_cwd(&app_data).expect("重入"), cwd, "幂等");

        // 某级 parent 是 symlink → pre-spawn 拒。
        let real = root.join("real-app-data");
        fs::create_dir_all(&real).expect("建真目录");
        let linked = root.join("linked-app-data");
        std::os::unix::fs::symlink(&real, &linked).expect("建 symlink");
        assert!(
            matches!(ensure_runtime_cwd(&linked), Err(RouteError::RuntimeCwd(_))),
            "parent 是 symlink 必须 pre-spawn 拒"
        );

        // cwd 本身被换成 symlink → 拒。
        let root = temp_dir("cwd-symlink");
        let app_data = root.join("app-data");
        fs::create_dir_all(&app_data).expect("建 app-data");
        std::os::unix::fs::symlink(&root, app_data.join(RUNTIME_CWD_DIR)).expect("建 symlink");
        assert!(
            matches!(
                ensure_runtime_cwd(&app_data),
                Err(RouteError::RuntimeCwd(_))
            ),
            "cwd 是 symlink 必须拒"
        );
    }

    // ── 真跑 lifecycle：用 `/bin/sh` 当 runtime、脚本当 argv[1] ─────────────

    fn shell_pair(root: &Path, script: &str) -> (VerifiedRoutePair, PathBuf) {
        let script_path = root.join("leg.sh");
        fs::write(&script_path, script).expect("写脚本");
        let cwd = ensure_runtime_cwd(root).expect("建 cwd");
        (
            VerifiedRoutePair::for_lifecycle_test(PathBuf::from("/bin/sh"), script_path),
            cwd,
        )
    }

    fn drain(process: &mut SidecarProcess, deadline: Duration) -> Vec<String> {
        let mut lines = Vec::new();
        loop {
            match process.read_packet(Some(deadline), "test") {
                ReadOutcome::Line(line) => lines.push(String::from_utf8_lossy(&line).into_owned()),
                ReadOutcome::Eof => return lines,
                ReadOutcome::Fault(fault) => panic!("不该有 fault：{fault:?}"),
            }
        }
    }

    #[test]
    fn spawned_child_has_empty_env_exact_argv_and_the_frozen_cwd() {
        // 对照：父进程确实有 HOME，下面「child 看不见」才有区分力。
        assert!(
            std::env::var_os("HOME").is_some(),
            "对照前提：父进程有 HOME"
        );

        let root = temp_dir("clean-child");
        let (pair, cwd) = shell_pair(
            &root,
            "printf '%s\\n' \"argc=$#\" \"arg1=$0\" \"home=${HOME:-<absent>}\" \"pwd=$(pwd)\"\n",
        );
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        let lines = drain(&mut process, Duration::from_millis(5_000));

        assert!(
            lines.contains(&"argc=0".to_string()),
            "argv 恰两枚、无额外 flag：{lines:?}"
        );
        assert!(
            lines.contains(&format!("arg1={}", pair.sidecar_cjs_path().display())),
            "argv[1] 恰为已核验的 sidecar CJS：{lines:?}"
        );
        assert!(
            lines.contains(&"home=<absent>".to_string()),
            "child env 必须严格为空：{lines:?}"
        );
        let expected = fs::canonicalize(&cwd).expect("规范化 cwd");
        assert!(
            lines.iter().any(|line| line
                .strip_prefix("pwd=")
                .and_then(|value| fs::canonicalize(value).ok())
                .is_some_and(|value| value == expected)),
            "cwd 恰为 app-data 下的 pi-loop-runtime：{lines:?}"
        );
        assert_eq!(
            process.wait_exit(Duration::from_millis(5_000)),
            ExitOutcome::Code(0)
        );
    }

    #[test]
    fn bootstrap_ready_window_times_out_by_name() {
        let root = temp_dir("ready-timeout");
        // 永远不出包的 child：ready 窗必须具名超时，而不是挂死。
        let (pair, cwd) = shell_pair(&root, "sleep 30\n");
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        let started = Instant::now();
        let outcome = process.read_packet(Some(Duration::from_millis(300)), "bootstrap→ready");
        assert!(
            started.elapsed() < Duration::from_millis(3_000),
            "必须按 deadline 收束"
        );
        assert!(
            matches!(
                outcome,
                ReadOutcome::Fault(ProcessFault::LifecycleTimeout("bootstrap→ready"))
            ),
            "超时必须具名，实得 {outcome:?}"
        );
        let _ = process.terminate();
    }

    #[test]
    fn sigterm_grace_then_sigkill_confirm_reclaims_a_stubborn_leg() {
        let root = temp_dir("kill");
        // 屏蔽 SIGTERM 的 child：只有 SIGKILL 能收走它，kill-confirm 必须成功且具名。
        // child 把自己的 pid 报出来，回收才可被**实测**——只断言返回值等于
        // `Signal(SIGKILL)` 是零区分力的：把 kill-confirm 整段换成
        // `Ok(ExitOutcome::Signal(SIGKILL))` 也能骗过它（H3-M1 实测）。
        let (pair, cwd) = shell_pair(
            &root,
            "trap '' TERM\nprintf '%s\\n' \"$$\"\nwhile true; do sleep 1; done\n",
        );
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        let ReadOutcome::Line(line) = process.read_packet(Some(Duration::from_millis(5_000)), "up")
        else {
            panic!("对照：child 已经起来了，否则下面测的是空气");
        };
        let pid: i32 = String::from_utf8_lossy(&line)
            .trim()
            .parse()
            .expect("child 报出自己的 pid");
        // SAFETY: `kill(pid, 0)` 只做存在性探测，不投递信号。
        assert_eq!(unsafe { libc::kill(pid, 0) }, 0, "对照：回收之前它确实活着");

        assert_eq!(
            process.terminate().expect("kill-confirm 必须成功"),
            ExitOutcome::Signal(libc::SIGKILL),
            "SIGTERM 被屏蔽后由 SIGKILL 收走"
        );
        // kill-confirm 的语义是「已确认回收」：真等到了 waitpid，pid 才既不活也不是僵尸。
        // 撤掉这一步只能拿到 zombie，`kill(pid,0)` 仍返回 0。
        assert_ne!(
            unsafe { libc::kill(pid, 0) },
            0,
            "terminate 返回时必须已确认回收，不能只是发过信号"
        );
    }

    #[test]
    fn sigterm_alone_reclaims_a_cooperative_leg() {
        let root = temp_dir("sigterm");
        let (pair, cwd) = shell_pair(&root, "printf 'up\\n'\nsleep 30\n");
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        assert!(matches!(
            process.read_packet(Some(Duration::from_millis(5_000)), "up"),
            ReadOutcome::Line(_)
        ));
        let started = Instant::now();
        let outcome = process.terminate().expect("回收成功");
        assert!(
            started.elapsed() < SIGTERM_GRACE,
            "合作的 leg 不该等到 grace 用尽"
        );
        assert!(
            matches!(outcome, ExitOutcome::Signal(_)),
            "SIGTERM 足够时不必升级到 SIGKILL，实得 {outcome:?}"
        );
    }

    #[test]
    fn stderr_over_the_leg_limit_is_named_and_never_leaves_memory() {
        let root = temp_dir("stderr");
        let (pair, cwd) = shell_pair(
            &root,
            "head -c 100000 /dev/zero | tr '\\0' 'E' >&2\nsleep 5\n",
        );
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        let mut saw_fault = false;
        for _ in 0..40 {
            match process.read_packet(Some(Duration::from_millis(200)), "stderr") {
                ReadOutcome::Fault(ProcessFault::StderrLimit) => {
                    saw_fault = true;
                    break;
                }
                ReadOutcome::Eof => break,
                _ => {}
            }
        }
        let _ = process.terminate();
        assert!(saw_fault, "越过 65,536 bytes 必须以 stderr_limit 杀 leg");
        assert!(process.stderr().overflowed());
        assert!(process.stderr().bytes() > STDERR_LIMIT_BYTES);
        // 对外只给 byte count 与 hash；受限缓冲本身也不越上限。
        assert_eq!(process.stderr().digest().len(), 64);
        assert!(process.stderr().captured_len() <= STDERR_LIMIT_BYTES);
    }

    #[test]
    fn eof_before_any_packet_is_reported_as_eof_not_timeout() {
        let root = temp_dir("eof");
        let (pair, cwd) = shell_pair(&root, "exit 3\n");
        let child = spawn_verified_sidecar(&pair, &cwd).expect("spawn");
        let mut process = SidecarProcess::attach(child);
        assert!(matches!(
            process.read_packet(Some(TERMINAL_EXIT_DEADLINE), "terminal→EOF"),
            ReadOutcome::Eof
        ));
        assert_eq!(
            process.wait_exit(Duration::from_millis(5_000)),
            ExitOutcome::Code(3)
        );
    }

    #[test]
    fn deadline_table_matches_the_frozen_values() {
        assert_eq!(PACKET_WRITE_DEADLINE.as_millis(), 5_000);
        assert_eq!(BOOTSTRAP_READY_DEADLINE.as_millis(), 30_000);
        assert_eq!(CANCEL_TERMINAL_DEADLINE.as_millis(), 15_000);
        assert_eq!(SHUTDOWN_TERMINAL_DEADLINE.as_millis(), 15_000);
        assert_eq!(TERMINAL_EXIT_DEADLINE.as_millis(), 15_000);
        assert_eq!(SIGTERM_GRACE.as_millis(), 5_000);
        assert_eq!(KILL_CONFIRM_DEADLINE.as_millis(), 5_000);
        assert_eq!(STDERR_LIMIT_BYTES, 65_536);
    }

    #[test]
    fn spawn_call_site_stays_inside_spawn_verified_sidecar() {
        // 机器门本体属 H3；这里先把「唯一调用点 + 精确表达式」钉在本模块自己的源码上。
        // needle 由片段拼出，免得这条断言自己复现禁形、把计数打成三。
        let source = include_str!("pi_loop_process.rs");
        let needle = format!("{}::new(", "Command");
        assert_eq!(
            source.matches(needle.as_str()).count(),
            1,
            "本模块只允许一枚进程创建点"
        );
        let call = source
            .find(&format!("{needle}verified_runtime_path)"))
            .expect("精确表达式");
        let function = source
            .find("pub(crate) fn spawn_verified_sidecar")
            .expect("函数存在");
        let next_function = source[function + 1..]
            .find("\npub(crate) fn ")
            .map(|offset| function + 1 + offset)
            .unwrap_or(source.len());
        assert!(
            function < call && call < next_function,
            "唯一调用必须直接住在 spawn_verified_sidecar 内，不得被 helper 包裹"
        );
    }
}
