//! 凭证探针 + 钥匙串读写（FIX-KC-1 / F3 单条目形制）。
//! secret/source 值永不入日志、错误消息或序列化字段。

use futures_util::StreamExt;
use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, Once, OnceLock, RwLock};

/// 发行包 service；dev（debug_assertions）加 `.dev` 后缀，避免污染发行 ACL（F6）。
#[cfg(debug_assertions)]
const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider.dev";
#[cfg(not(debug_assertions))]
const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider";

/// 凭证安全裁决（docs/decisions/ADR-005-data-security.md）：source 标记与 secret 合存一个条目，
/// status/active_secret 每轮只触发一次受 ACL 保护的读取（弹窗 2→1）。
const CREDENTIAL_ACCOUNT: &str = "credential";
/// FIX-KC-1 时代的双条目（legacy）。不迁移读取（读取即弹窗，违 F3 本意）；
/// save/clear 时静默 delete 清账（delete 不读 data 不弹窗）。
const LEGACY_SOURCE_ACCOUNT: &str = "active-source";
const LEGACY_SECRET_ACCOUNT: &str = "provider-secret";
const MIN_PASTED_LEN: usize = 8;
const TRACE_ENV: &str = "COURTWORK_CRED_TRACE";
const LOG_DIR_NAME: &str = "cn.courtwork.desktop";
const LOG_FILE_NAME: &str = "credential-probe.log";
const LOG_ROTATE_BYTES: u64 = 1024 * 1024;

static STARTUP_TRACE: Once = Once::new();
/// 最近一次成功探针绑定；进程重启即回到 unverified，且只绑定 catalog provider/model。
static VERIFIED_PROVIDER: OnceLock<RwLock<Option<VerifiedProvider>>> = OnceLock::new();
static CHAT_CANCELLATIONS: OnceLock<Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>> =
    OnceLock::new();
static PROVIDER_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

// ─── macOS 原生窗口按钮磁吸锚（LAUNCH 壳层审计）────────────────────────────

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WindowControlsAnchor {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowControlsMetrics {
    group_width: f64,
    button_height: f64,
}

#[derive(Debug, Clone, Copy)]
struct NativeButtonGeometry {
    x: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Copy)]
struct NativeButtonTarget {
    center_x: f64,
    center_y: f64,
}

fn plan_window_controls(
    anchor: WindowControlsAnchor,
    buttons: &[NativeButtonGeometry],
) -> Result<(WindowControlsMetrics, Vec<NativeButtonTarget>), String> {
    let anchor_values = [anchor.x, anchor.y, anchor.width, anchor.height];
    if anchor_values.iter().any(|value| !value.is_finite())
        || anchor.x < 0.0
        || anchor.y < 0.0
        || anchor.width <= 0.0
        || anchor.height <= 0.0
        || anchor.x + anchor.width > 16_384.0
        || anchor.y + anchor.height > 16_384.0
    {
        return Err("窗口按钮锚框无效".into());
    }
    if buttons.len() != 3
        || buttons.iter().any(|button| {
            !button.x.is_finite()
                || !button.width.is_finite()
                || !button.height.is_finite()
                || button.width <= 0.0
                || button.height <= 0.0
        })
    {
        return Err("未取得完整的 macOS 窗口按钮组".into());
    }

    let group_min_x = buttons
        .iter()
        .map(|button| button.x)
        .fold(f64::INFINITY, f64::min);
    let group_max_x = buttons
        .iter()
        .map(|button| button.x + button.width)
        .fold(f64::NEG_INFINITY, f64::max);
    let metrics = WindowControlsMetrics {
        group_width: group_max_x - group_min_x,
        button_height: buttons
            .iter()
            .map(|button| button.height)
            .fold(0.0, f64::max),
    };
    let group_left = anchor.x + (anchor.width - metrics.group_width) / 2.0;
    let center_y = anchor.y + anchor.height / 2.0;
    let targets = buttons
        .iter()
        .map(|button| NativeButtonTarget {
            center_x: group_left + (button.x - group_min_x) + button.width / 2.0,
            center_y,
        })
        .collect();
    Ok((metrics, targets))
}

#[tauri::command]
fn sync_macos_window_controls(
    window: tauri::WebviewWindow,
    anchor: WindowControlsAnchor,
) -> Result<WindowControlsMetrics, String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::{NSView, NSWindow, NSWindowButton};
        use objc2_foundation::NSPoint;

        // Tauri 同步 command 运行在主线程；只取得 NSWindow 已有标准按钮，不重画、不替换 target/action。
        let native = window
            .ns_window()
            .map_err(|_| "无法取得 macOS 窗口".to_string())?;
        let native_window: &NSWindow = unsafe { &*native.cast() };
        let buttons = [
            NSWindowButton::CloseButton,
            NSWindowButton::MiniaturizeButton,
            NSWindowButton::ZoomButton,
        ]
        .into_iter()
        .map(|kind| {
            native_window
                .standardWindowButton(kind)
                .ok_or_else(|| "未取得 macOS 标准窗口按钮".to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;
        let geometry = buttons
            .iter()
            .map(|button| {
                let frame = button.frame();
                NativeButtonGeometry {
                    x: frame.origin.x,
                    width: frame.size.width,
                    height: frame.size.height,
                }
            })
            .collect::<Vec<_>>();
        let (metrics, targets) = plan_window_controls(anchor, &geometry)?;
        let content_view = native_window
            .contentView()
            .ok_or_else(|| "无法取得 macOS 内容视图".to_string())?;
        let content_bounds = content_view.bounds();

        for (button, target) in buttons.iter().zip(targets) {
            let superview =
                unsafe { button.superview() }.ok_or_else(|| "macOS 窗口按钮未挂载".to_string())?;
            let content_y = if content_view.isFlipped() {
                target.center_y
            } else {
                content_bounds.size.height - target.center_y
            };
            let local_center = superview.convertPoint_fromView(
                NSPoint::new(target.center_x, content_y),
                Some(&content_view as &NSView),
            );
            let frame = button.frame();
            button.setFrameOrigin(NSPoint::new(
                local_center.x - frame.size.width / 2.0,
                local_center.y - frame.size.height / 2.0,
            ));
        }
        return Ok(metrics);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, anchor);
        Err("当前平台没有 macOS 窗口按钮".into())
    }
}

// ─── 内部枚举（DBG-2.1 / F4）───────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeychainOp {
    Get,
    Set,
    Delete,
    EntryNew,
}

impl KeychainOp {
    fn as_str(self) -> &'static str {
        match self {
            Self::Get => "get",
            Self::Set => "set",
            Self::Delete => "delete",
            Self::EntryNew => "entry_new",
        }
    }
}

/// 钥匙串失败分型（内部 + 诊断导出 wire name）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeychainFailKind {
    NoEntry,
    UserCanceled,
    AuthFailed,
    NoAccessForItem,
    InteractionNotAllowed,
    NoStorageAccess,
    PlatformOther { os_status: Option<i32> },
    EntryBuilder,
    Unknown,
}

impl KeychainFailKind {
    /// 诊断/序列化枚举值（无密钥、闭合集合）。
    fn wire_name(self) -> &'static str {
        match self {
            Self::UserCanceled => "user_canceled",
            Self::AuthFailed => "auth_failed",
            Self::NoAccessForItem | Self::InteractionNotAllowed | Self::NoStorageAccess => {
                "acl_denied"
            }
            Self::NoEntry => "missing",
            Self::PlatformOther { .. } | Self::EntryBuilder | Self::Unknown => "platform",
        }
    }

    /// 对外零技术概念文案（F4）。
    fn user_message(self) -> &'static str {
        match self {
            Self::UserCanceled => "需要允许访问安全凭证库才能连接",
            Self::AuthFailed => "无法解锁电脑的安全凭证库，请确认钥匙串密码后重试",
            Self::NoAccessForItem | Self::InteractionNotAllowed | Self::NoStorageAccess => {
                "凭证库访问未授权，请重新完成连接；若刚更新过应用，请删除旧凭证后重试"
            }
            Self::NoEntry | Self::PlatformOther { .. } | Self::EntryBuilder | Self::Unknown => {
                "钥匙串授权未通过，请重试或重新填写"
            }
        }
    }

    fn os_status(self) -> Option<i32> {
        match self {
            Self::UserCanceled => Some(-128),
            Self::AuthFailed => Some(-25293),
            Self::NoAccessForItem => Some(-25315),
            Self::InteractionNotAllowed => Some(-25308),
            Self::PlatformOther { os_status } => os_status,
            _ => None,
        }
    }
}

/// 从 OSStatus 映射分型（单测入口）。
fn classify_os_status(code: i32) -> KeychainFailKind {
    match code {
        -128 => KeychainFailKind::UserCanceled,
        -25293 => KeychainFailKind::AuthFailed,
        -25315 => KeychainFailKind::NoAccessForItem,
        -25308 => KeychainFailKind::InteractionNotAllowed,
        -61 | -25291 | -25292 | -25294 | -25295 => KeychainFailKind::NoStorageAccess,
        other => KeychainFailKind::PlatformOther {
            os_status: Some(other),
        },
    }
}

/// 从 Display/Debug 文本解析 OSStatus（security-framework 常见 `error code -N`）。
fn parse_os_status_from_text(text: &str) -> Option<i32> {
    // "error code -25293"
    if let Some(idx) = text.find("error code ") {
        let rest = &text[idx + "error code ".len()..];
        let num: String = rest
            .chars()
            .take_while(|c| *c == '-' || c.is_ascii_digit())
            .collect();
        if let Ok(code) = num.parse::<i32>() {
            return Some(code);
        }
    }
    // Debug: "code: NonZeroI32(-25293)" or "code: -25293"
    for marker in ["NonZeroI32(", "code: "] {
        if let Some(idx) = text.find(marker) {
            let rest = &text[idx + marker.len()..];
            let num: String = rest
                .chars()
                .skip_while(|c| *c == ' ')
                .take_while(|c| *c == '-' || c.is_ascii_digit())
                .collect();
            if let Ok(code) = num.parse::<i32>() {
                if code < 0 || marker == "NonZeroI32(" {
                    return Some(code);
                }
            }
        }
    }
    // 已知 OSStatus 作为独立 token
    for code in [
        -128, -25293, -25315, -25308, -61, -25291, -25292, -25294, -25295,
    ] {
        let needle = code.to_string();
        if text
            .split(|c: char| !c.is_ascii_digit() && c != '-')
            .any(|t| t == needle)
        {
            return Some(code);
        }
    }
    None
}

fn extract_os_status_from_error(err: &(dyn std::error::Error + 'static)) -> Option<i32> {
    let mut current: Option<&(dyn std::error::Error + 'static)> = Some(err);
    while let Some(e) = current {
        let debug = format!("{e:?}");
        if let Some(code) = parse_os_status_from_text(&debug) {
            return Some(code);
        }
        let display = e.to_string();
        if let Some(code) = parse_os_status_from_text(&display) {
            return Some(code);
        }
        current = e.source();
    }
    None
}

fn classify_keyring_error(err: &KeyringError) -> KeychainFailKind {
    match err {
        KeyringError::NoEntry => KeychainFailKind::NoEntry,
        KeyringError::NoStorageAccess(inner) => {
            if let Some(code) = extract_os_status_from_error(inner.as_ref()) {
                let classified = classify_os_status(code);
                // 保留 NoStorageAccess 桶当码不在更细表时
                match classified {
                    KeychainFailKind::PlatformOther { .. } => KeychainFailKind::NoStorageAccess,
                    other => other,
                }
            } else {
                KeychainFailKind::NoStorageAccess
            }
        }
        KeyringError::PlatformFailure(inner) => {
            if let Some(code) = extract_os_status_from_error(inner.as_ref()) {
                classify_os_status(code)
            } else {
                KeychainFailKind::PlatformOther { os_status: None }
            }
        }
        _ => {
            let text = err.to_string();
            if let Some(code) = parse_os_status_from_text(&text) {
                classify_os_status(code)
            } else {
                KeychainFailKind::Unknown
            }
        }
    }
}

// ─── Trace（DBG-2.1）────────────────────────────────────────────────────────

fn trace_enabled() -> bool {
    matches!(
        std::env::var(TRACE_ENV).as_deref(),
        Ok("1") | Ok("true") | Ok("TRUE") | Ok("yes") | Ok("YES")
    )
}

fn log_dir() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(PathBuf::from(home).join("Library/Logs").join(LOG_DIR_NAME))
}

fn log_path() -> Option<PathBuf> {
    Some(log_dir()?.join(LOG_FILE_NAME))
}

/// 构造一行 JSON（永不含 secret/source 值/env 值）；供单测断言红线。
fn build_trace_line(fields: &[(&str, TraceValue)]) -> String {
    let mut parts = Vec::with_capacity(fields.len() + 1);
    parts.push(format!(
        "\"ts\":{}",
        serde_json::to_string(&chrono_like_now()).unwrap_or_else(|_| "\"\"".into())
    ));
    for (k, v) in fields {
        // 防御：键名禁止敏感词
        let key = *k;
        if key_looks_sensitive(key) {
            continue;
        }
        let rendered = match v {
            TraceValue::Str(s) => serde_json::to_string(s).unwrap_or_else(|_| "\"\"".into()),
            TraceValue::Bool(b) => b.to_string(),
            TraceValue::Int(i) => i.to_string(),
        };
        parts.push(format!("\"{key}\":{rendered}"));
    }
    format!("{{{}}}", parts.join(","))
}

fn key_looks_sensitive(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    lower.contains("secret")
        || lower.contains("password")
        || lower == "value"
        || lower == "key"
        || lower.contains("apikey")
        || lower.contains("api_key")
        || lower.contains("token")
}

enum TraceValue {
    Str(String),
    Bool(bool),
    Int(i64),
}

fn chrono_like_now() -> String {
    // 无 chrono 依赖：RFC3339-ish via system time
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn rotate_log_if_needed(path: &std::path::Path) {
    if let Ok(meta) = fs::metadata(path) {
        if meta.len() >= LOG_ROTATE_BYTES {
            let bak = path.with_extension("log.1");
            let _ = fs::remove_file(&bak);
            let _ = fs::rename(path, &bak);
        }
    }
}

fn write_trace_line(line: &str) {
    if !trace_enabled() {
        return;
    }
    let Some(path) = log_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    rotate_log_if_needed(&path);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "{line}");
    }
    // 同步一份到 stderr，便于 `COURTWORK_CRED_TRACE=1` 终端采集
    eprintln!("[courtwork-cred] {line}");
}

fn trace_event(fields: &[(&str, TraceValue)]) {
    write_trace_line(&build_trace_line(fields));
}

fn trace_op(op: KeychainOp, account: &str, ok: bool, fail_kind: Option<KeychainFailKind>) {
    let mut fields = vec![
        ("event", TraceValue::Str("keychain_op".into())),
        ("op", TraceValue::Str(op.as_str().into())),
        ("account", TraceValue::Str(account.into())),
        ("service", TraceValue::Str(CREDENTIAL_SERVICE.into())),
        ("ok", TraceValue::Bool(ok)),
    ];
    if let Some(kind) = fail_kind {
        fields.push(("fail_kind", TraceValue::Str(kind.wire_name().into())));
        if let Some(code) = kind.os_status() {
            fields.push(("os_status", TraceValue::Int(code as i64)));
        }
    }
    trace_event(&fields);
}

fn codesign_snapshot(exe: &std::path::Path) -> (Option<String>, Option<String>, Option<String>) {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("codesign")
            .args(["-dv", "--verbose=4"])
            .arg(exe)
            .output()
            .ok();
        let text = output
            .map(|o| String::from_utf8_lossy(&o.stderr).into_owned())
            .unwrap_or_default();
        let mut cdhash = None;
        let mut signature = None;
        let mut team = None;
        for line in text.lines() {
            if let Some(rest) = line.strip_prefix("CDHash=") {
                cdhash = Some(rest.trim().to_string());
            } else if let Some(rest) = line.strip_prefix("Signature=") {
                signature = Some(rest.trim().to_string());
            } else if let Some(rest) = line.strip_prefix("TeamIdentifier=") {
                team = Some(rest.trim().to_string());
            }
        }
        return (cdhash, signature, team);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = exe;
        (None, None, None)
    }
}

fn trace_startup_once() {
    STARTUP_TRACE.call_once(|| {
        if !trace_enabled() {
            return;
        }
        let exe = std::env::current_exe()
            .ok()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|| "unknown".into());
        let exe_path = std::env::current_exe().ok();
        let (cdhash, signature, team) = exe_path
            .as_ref()
            .map(|p| codesign_snapshot(p))
            .unwrap_or((None, None, None));
        let profile = if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        };
        let mut fields = vec![
            ("event", TraceValue::Str("startup".into())),
            ("service", TraceValue::Str(CREDENTIAL_SERVICE.into())),
            ("build_profile", TraceValue::Str(profile.into())),
            ("exe_path", TraceValue::Str(exe)),
            ("bundle_id", TraceValue::Str("cn.courtwork.desktop".into())),
        ];
        if let Some(h) = cdhash {
            fields.push(("app_cdhash", TraceValue::Str(h)));
        }
        if let Some(s) = signature {
            fields.push(("signature", TraceValue::Str(s)));
        }
        if let Some(t) = team {
            fields.push(("team_id", TraceValue::Str(t)));
        }
        trace_event(&fields);
    });
}

// ─── 凭证状态 ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum CredentialSource {
    Pasted,
    Environment,
}

/// 探针驱动三态：pending / connected / failed（D-1）。
/// 序列化字段仅 phase/source/failureMessage/failKind，永不含 secret。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CredentialStatus {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<CredentialSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure_message: Option<&'static str>,
    /// F4：user_canceled | auth_failed | acl_denied | missing | platform
    #[serde(skip_serializing_if = "Option::is_none")]
    fail_kind: Option<&'static str>,
}

fn entry(account: &str) -> Result<Entry, KeychainFailKind> {
    match Entry::new(CREDENTIAL_SERVICE, account) {
        Ok(e) => {
            trace_op(KeychainOp::EntryNew, account, true, None);
            Ok(e)
        }
        Err(_) => {
            let kind = KeychainFailKind::EntryBuilder;
            trace_op(KeychainOp::EntryNew, account, false, Some(kind));
            Err(kind)
        }
    }
}

fn get_password(account: &str) -> Result<String, KeychainFailKind> {
    let e = entry(account)?;
    match e.get_password() {
        Ok(v) => {
            trace_op(KeychainOp::Get, account, true, None);
            Ok(v)
        }
        Err(err) => {
            let kind = classify_keyring_error(&err);
            trace_op(KeychainOp::Get, account, false, Some(kind));
            Err(kind)
        }
    }
}

fn delete_credential_ignore_missing(account: &str) -> Result<(), KeychainFailKind> {
    let e = entry(account)?;
    match e.delete_credential() {
        Ok(()) => {
            trace_op(KeychainOp::Delete, account, true, None);
            Ok(())
        }
        Err(KeyringError::NoEntry) => {
            trace_op(
                KeychainOp::Delete,
                account,
                true,
                Some(KeychainFailKind::NoEntry),
            );
            Ok(())
        }
        Err(err) => {
            let kind = classify_keyring_error(&err);
            trace_op(KeychainOp::Delete, account, false, Some(kind));
            Err(kind)
        }
    }
}

/// F2：delete（忽略 NoEntry）→ set，强制当前身份新建 ACL。
fn rewrite_password(account: &str, value: &str) -> Result<(), KeychainFailKind> {
    delete_credential_ignore_missing(account)?;
    let e = entry(account)?;
    match e.set_password(value) {
        Ok(()) => {
            trace_op(KeychainOp::Set, account, true, None);
            Ok(())
        }
        Err(err) => {
            let kind = classify_keyring_error(&err);
            trace_op(KeychainOp::Set, account, false, Some(kind));
            Err(kind)
        }
    }
}

/// F3 单条目存储形制。serde tag 生成 `{"source":"pasted","secret":"…"}` /
/// `{"source":"environment","name":"…"}`——source 语义与 wire 契约（CredentialStatus.source）
/// 保持同词，TS 侧零改动。
#[derive(Serialize, Deserialize)]
#[serde(tag = "source", rename_all = "snake_case")]
enum StoredCredential {
    Pasted { secret: String },
    Environment { name: String },
}

/// 单条目读取三态：缺失（未配置）/ 在库 / 损坏（JSON 不可解析——诚实报格式错，重存即修复）。
enum ReadCredential {
    Missing,
    Stored(StoredCredential),
    Corrupt,
}

fn read_credential() -> Result<ReadCredential, KeychainFailKind> {
    match get_password(CREDENTIAL_ACCOUNT) {
        Ok(raw) => Ok(serde_json::from_str::<StoredCredential>(&raw)
            .map(ReadCredential::Stored)
            .unwrap_or(ReadCredential::Corrupt)),
        Err(KeychainFailKind::NoEntry) => Ok(ReadCredential::Missing),
        Err(kind) => Err(kind),
    }
}

fn pending() -> CredentialStatus {
    CredentialStatus {
        phase: "pending",
        source: None,
        failure_message: None,
        fail_kind: None,
    }
}

fn connected(source: CredentialSource) -> CredentialStatus {
    CredentialStatus {
        phase: "connected",
        source: Some(source),
        failure_message: None,
        fail_kind: None,
    }
}

fn failed(
    source: Option<CredentialSource>,
    message: &'static str,
    fail_kind: Option<&'static str>,
) -> CredentialStatus {
    CredentialStatus {
        phase: "failed",
        source,
        failure_message: Some(message),
        fail_kind,
    }
}

fn failed_keychain(source: Option<CredentialSource>, kind: KeychainFailKind) -> CredentialStatus {
    failed(source, kind.user_message(), Some(kind.wire_name()))
}

/// 存储形制 → 探针三态（纯函数，单测直测）。任何格式/解析问题 → failed，绝不乐观 connected。
fn status_from_stored(read: ReadCredential) -> CredentialStatus {
    match read {
        ReadCredential::Missing => pending(),
        ReadCredential::Corrupt => failed(None, "凭证格式不正确，请检查后重新填写", None),
        ReadCredential::Stored(StoredCredential::Pasted { secret }) => {
            let trimmed = secret.trim();
            if trimmed.is_empty() || trimmed.len() < MIN_PASTED_LEN {
                failed(
                    Some(CredentialSource::Pasted),
                    "凭证格式不正确，请检查后重新填写",
                    None,
                )
            } else {
                connected(CredentialSource::Pasted)
            }
        }
        ReadCredential::Stored(StoredCredential::Environment { name }) => {
            if name.is_empty() {
                return failed(
                    Some(CredentialSource::Environment),
                    "凭证格式不正确，请检查后重新填写",
                    None,
                );
            }
            match std::env::var(&name) {
                Ok(resolved) if !resolved.trim().is_empty() => {
                    connected(CredentialSource::Environment)
                }
                Ok(_) => failed(
                    Some(CredentialSource::Environment),
                    "电脑中的凭证为空，请检查后重试",
                    None,
                ),
                Err(_) => failed(
                    Some(CredentialSource::Environment),
                    "电脑中未找到该凭证名称，请检查后重试",
                    None,
                ),
            }
        }
    }
}

/// 读取 + 格式校验（F3：单次受保护读取）。
fn credential_status() -> Result<CredentialStatus, String> {
    trace_startup_once();
    let status = match read_credential() {
        Ok(read) => status_from_stored(read),
        Err(kind) => {
            let status = failed_keychain(None, kind);
            trace_status_exit("credential_status", &status, Some("read_credential"));
            return Ok(status);
        }
    };
    trace_status_exit("credential_status", &status, None);
    Ok(status)
}

/// 存储形制 → 可用 secret（纯函数）。
fn secret_from_stored(
    read: ReadCredential,
) -> Result<(CredentialSource, String), CredentialStatus> {
    match read {
        ReadCredential::Missing => Err(pending()),
        ReadCredential::Corrupt => Err(failed(None, "凭证格式不正确，请检查后重新填写", None)),
        ReadCredential::Stored(StoredCredential::Pasted { secret }) => {
            Ok((CredentialSource::Pasted, secret))
        }
        ReadCredential::Stored(StoredCredential::Environment { name }) => std::env::var(&name)
            .map(|secret| (CredentialSource::Environment, secret))
            .map_err(|_| {
                failed(
                    Some(CredentialSource::Environment),
                    "电脑中未找到该凭证名称，请检查后重试",
                    None,
                )
            }),
    }
}

fn active_secret() -> Result<(CredentialSource, String), CredentialStatus> {
    let read = read_credential().map_err(|kind| failed_keychain(None, kind))?;
    secret_from_stored(read)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderCatalog {
    id: String,
    base_url: String,
    models: Vec<String>,
    paths: ProviderCatalogPaths,
}

#[derive(Debug, Deserialize)]
struct ProviderCatalogPaths {
    chat: String,
    models: String,
}

fn embedded_catalog() -> Result<ProviderCatalog, String> {
    let catalog: ProviderCatalog = serde_json::from_str(include_str!(
        "../../../../packages/provider/catalog/deepseek.json"
    ))
    .map_err(|_| "服务商目录无效".to_string())?;
    if catalog.models.is_empty() || catalog.paths.chat.is_empty() || catalog.paths.models.is_empty()
    {
        return Err("服务商目录无效".to_string());
    }
    Ok(catalog)
}

fn catalog_for(provider_id: &str) -> Result<ProviderCatalog, String> {
    let catalog = embedded_catalog()?;
    if catalog.id != provider_id {
        return Err("不支持该服务商".to_string());
    }
    Ok(catalog)
}

fn catalog_url(catalog: &ProviderCatalog, path: &str) -> String {
    format!("{}{}", catalog.base_url.trim_end_matches('/'), path)
}

fn provider_http_client() -> Result<&'static reqwest::Client, String> {
    if let Some(client) = PROVIDER_HTTP_CLIENT.get() {
        return Ok(client);
    }
    let client = reqwest::Client::builder()
        .build()
        .map_err(|_| "暂时无法发起请求".to_string())?;
    let _ = PROVIDER_HTTP_CLIENT.set(client);
    PROVIDER_HTTP_CLIENT
        .get()
        .ok_or_else(|| "暂时无法发起请求".to_string())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProviderProbeInput {
    #[serde(rename = "requestId")]
    _request_id: String,
    provider_id: String,
    model_id: String,
    #[serde(default)]
    reasoning_body: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CredentialReadiness {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<CredentialSource>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionReadiness {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    fail_kind: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure_message: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    models: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    model_discovery: Option<&'static str>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderReadiness {
    credential: CredentialReadiness,
    connection: ConnectionReadiness,
}

#[derive(Debug, Clone)]
struct VerifiedProvider {
    provider_id: String,
    model_id: String,
}

fn verified_provider_store() -> &'static RwLock<Option<VerifiedProvider>> {
    VERIFIED_PROVIDER.get_or_init(|| RwLock::new(None))
}

fn set_verified_provider(binding: Option<VerifiedProvider>) {
    if let Ok(mut stored) = verified_provider_store().write() {
        *stored = binding;
    }
}

fn verified_binding_matches(binding: &VerifiedProvider, provider_id: &str, model_id: &str) -> bool {
    binding.provider_id == provider_id && binding.model_id == model_id
}

fn credential_readiness(status: &CredentialStatus) -> CredentialReadiness {
    CredentialReadiness {
        phase: if status.phase == "connected" {
            "stored"
        } else {
            "absent"
        },
        source: status.source,
    }
}

fn unverified_readiness(status: &CredentialStatus) -> ProviderReadiness {
    ProviderReadiness {
        credential: credential_readiness(status),
        connection: ConnectionReadiness {
            phase: if status.phase == "failed" {
                "failed"
            } else {
                "unverified"
            },
            fail_kind: status.fail_kind.map(|_| "platform"),
            failure_message: status.failure_message,
            models: None,
            model_discovery: None,
        },
    }
}

fn provider_failed(
    source: Option<CredentialSource>,
    kind: &'static str,
    message: &'static str,
) -> ProviderReadiness {
    ProviderReadiness {
        credential: CredentialReadiness {
            phase: if source.is_some() { "stored" } else { "absent" },
            source,
        },
        connection: ConnectionReadiness {
            phase: "failed",
            fail_kind: Some(kind),
            failure_message: Some(message),
            models: None,
            model_discovery: Some("unsupported"),
        },
    }
}

fn classify_http_failure(
    source: CredentialSource,
    status: reqwest::StatusCode,
) -> ProviderReadiness {
    let (kind, _) = classify_transport_status(status.as_u16());
    let message = match kind {
        "auth" => "访问凭证未通过服务商验证，请检查后重试",
        "endpoint" => "服务地址无法完成请求",
        "rate_limit" => "服务商暂时限制了请求，请稍后重试",
        "model" => "当前模型不可用，请重新选择",
        _ => "服务商返回了无法识别的响应，请稍后重试",
    };
    provider_failed(Some(source), kind, message)
}

async fn probe_provider_at(
    input: &ProviderProbeInput,
    catalog: &ProviderCatalog,
    secret: String,
    source: CredentialSource,
) -> ProviderReadiness {
    if input.model_id.trim().is_empty() {
        return provider_failed(Some(source), "model", "请选择模型");
    }
    let client = match provider_http_client() {
        Ok(client) => client,
        Err(_) => return provider_failed(Some(source), "network", "暂时无法验证连接，请重试"),
    };
    let models_response = client
        .get(catalog_url(catalog, &catalog.paths.models))
        .timeout(std::time::Duration::from_secs(20))
        .bearer_auth(&secret)
        .send()
        .await;
    let mut models = None;
    let mut discovery = "unsupported";
    if let Ok(response) = models_response {
        if matches!(response.status().as_u16(), 401 | 403) {
            return classify_http_failure(source, response.status());
        }
        if response.status().is_success() {
            models = response
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|value| {
                    value
                        .get("data")
                        .and_then(|data| data.as_array())
                        .map(|items| {
                            items
                                .iter()
                                .filter_map(|item| {
                                    item.get("id").and_then(|id| id.as_str()).map(str::to_owned)
                                })
                                .collect::<Vec<_>>()
                        })
                })
                .filter(|items| !items.is_empty());
            if models.is_some() {
                discovery = "available";
            }
        }
    }
    let mut body = input.reasoning_body.clone();
    body.insert(
        "model".into(),
        serde_json::Value::String(input.model_id.clone()),
    );
    body.insert(
        "messages".into(),
        serde_json::json!([{"role":"user","content":"Hi"}]),
    );
    body.insert("max_tokens".into(), serde_json::json!(1));
    body.insert("stream".into(), serde_json::json!(false));
    match client
        .post(catalog_url(catalog, &catalog.paths.chat))
        .timeout(std::time::Duration::from_secs(20))
        .bearer_auth(&secret)
        .json(&body)
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => ProviderReadiness {
            credential: CredentialReadiness {
                phase: "stored",
                source: Some(source),
            },
            connection: ConnectionReadiness {
                phase: "ready",
                fail_kind: None,
                failure_message: None,
                models,
                model_discovery: Some(discovery),
            },
        },
        Ok(response) => classify_http_failure(source, response.status()),
        Err(error) if error.is_timeout() => {
            provider_failed(Some(source), "timeout", "服务商响应超时，请稍后重试")
        }
        Err(_) => provider_failed(
            Some(source),
            "network",
            "暂时无法连接服务商，请检查网络后重试",
        ),
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProviderChatInput {
    request_id: String,
    provider_id: String,
    model_id: String,
    #[serde(default)]
    reasoning_body: serde_json::Map<String, serde_json::Value>,
    body: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum ProviderTransportEvent {
    ResponseStarted {
        request_id: String,
        status: u16,
        #[serde(skip_serializing_if = "Option::is_none")]
        content_type: Option<String>,
    },
    Chunk {
        request_id: String,
        bytes: Vec<u8>,
    },
    End {
        request_id: String,
    },
    Failed {
        request_id: String,
        kind: &'static str,
        message: &'static str,
        retryable: bool,
    },
}

fn cancellation_store() -> &'static Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>> {
    CHAT_CANCELLATIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn classify_transport_status(status: u16) -> (&'static str, bool) {
    match status {
        401 | 403 => ("auth", false),
        429 => ("rate_limit", true),
        400 | 422 => ("model", false),
        404 => ("endpoint", false),
        500..=599 => ("endpoint", true),
        _ => ("invalid_response", false),
    }
}

async fn stream_chat_at<F>(url: String, input: &ProviderChatInput, secret: &str, mut emit: F)
where
    F: FnMut(ProviderTransportEvent),
{
    let request_id = input.request_id.clone();
    let mut parsed = match serde_json::from_str::<serde_json::Value>(&input.body) {
        Ok(serde_json::Value::Object(value)) => value,
        _ => {
            emit(ProviderTransportEvent::Failed {
                request_id,
                kind: "protocol",
                message: "请求体无效",
                retryable: false,
            });
            return;
        }
    };
    parsed.extend(input.reasoning_body.clone());
    parsed.insert(
        "model".into(),
        serde_json::Value::String(input.model_id.clone()),
    );
    parsed.insert("stream".into(), serde_json::Value::Bool(true));
    let body = match serde_json::to_string(&parsed) {
        Ok(body) => body,
        Err(_) => {
            emit(ProviderTransportEvent::Failed {
                request_id,
                kind: "protocol",
                message: "请求体无效",
                retryable: false,
            });
            return;
        }
    };
    let client = match provider_http_client() {
        Ok(client) => client,
        Err(_) => {
            emit(ProviderTransportEvent::Failed {
                request_id,
                kind: "network",
                message: "暂时无法发起请求",
                retryable: false,
            });
            return;
        }
    };
    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel();
    if let Ok(mut store) = cancellation_store().lock() {
        store.insert(request_id.clone(), cancel_tx);
    }
    let request = client
        .post(url)
        .timeout(std::time::Duration::from_secs(180))
        .bearer_auth(secret)
        .header("content-type", "application/json")
        .body(body)
        .send();
    let response_result = tokio::select! {
        _ = &mut cancel_rx => {
            emit(ProviderTransportEvent::Failed { request_id: request_id.clone(), kind: "canceled", message: "请求已取消", retryable: false });
            if let Ok(mut store) = cancellation_store().lock() { store.remove(&request_id); }
            return;
        }
        response = request => response,
    };
    let response = match response_result {
        Ok(response) => response,
        Err(error) => {
            let (kind, message) = if error.is_timeout() {
                ("timeout", "服务商响应超时")
            } else {
                ("network", "暂时无法连接服务商")
            };
            emit(ProviderTransportEvent::Failed {
                request_id: request_id.clone(),
                kind,
                message,
                retryable: false,
            });
            if let Ok(mut store) = cancellation_store().lock() {
                store.remove(&request_id);
            }
            return;
        }
    };
    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    emit(ProviderTransportEvent::ResponseStarted {
        request_id: request_id.clone(),
        status,
        content_type,
    });
    if !(200..300).contains(&status) {
        let (kind, retryable) = classify_transport_status(status);
        emit(ProviderTransportEvent::Failed {
            request_id: request_id.clone(),
            kind,
            message: "服务商请求失败",
            retryable,
        });
        if let Ok(mut store) = cancellation_store().lock() {
            store.remove(&request_id);
        }
        return;
    }
    let mut stream = response.bytes_stream();
    loop {
        tokio::select! {
            _ = &mut cancel_rx => {
                emit(ProviderTransportEvent::Failed { request_id: request_id.clone(), kind: "canceled", message: "请求已取消", retryable: false });
                break;
            }
            item = stream.next() => match item {
                Some(Ok(bytes)) => emit(ProviderTransportEvent::Chunk { request_id: request_id.clone(), bytes: bytes.to_vec() }),
                Some(Err(error)) => {
                    let kind = if error.is_timeout() { "timeout" } else { "network" };
                    emit(ProviderTransportEvent::Failed { request_id: request_id.clone(), kind, message: "服务商流读取失败", retryable: false });
                    break;
                }
                None => {
                    emit(ProviderTransportEvent::End { request_id: request_id.clone() });
                    break;
                }
            }
        }
    }
    if let Ok(mut store) = cancellation_store().lock() {
        store.remove(&request_id);
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CaseOutputRefInput {
    case_root: String,
    file_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteCaseOutputInput {
    case_root: String,
    file_name: String,
    bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CaseOutputArtifact {
    absolute_path: String,
    byte_length: usize,
}

fn validate_output_file_name(file_name: &str) -> Result<(), String> {
    let mut components = Path::new(file_name).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err("产出文件名必须是单一文件名".to_string());
    }
    if !file_name.to_ascii_lowercase().ends_with(".docx") {
        return Err("产出文件必须使用 .docx 扩展名".to_string());
    }
    Ok(())
}

fn canonical_case_root(case_root: &Path) -> Result<PathBuf, String> {
    if !case_root.is_absolute() {
        return Err("案件目录必须是绝对路径".to_string());
    }
    case_root
        .canonicalize()
        .map_err(|_| "案件目录不存在或不可访问".to_string())
}

fn secure_output_dir(case_root: &Path, create: bool) -> Result<Option<PathBuf>, String> {
    let canonical_root = canonical_case_root(case_root)?;
    let output_dir = canonical_root.join("产出");
    if !output_dir.exists() {
        if !create {
            return Ok(None);
        }
        fs::create_dir(&output_dir).map_err(|_| "无法创建案件产出目录".to_string())?;
    }
    let metadata =
        fs::symlink_metadata(&output_dir).map_err(|_| "无法读取案件产出目录".to_string())?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("案件产出目录不是安全的实体目录".to_string());
    }
    let canonical_output = output_dir
        .canonicalize()
        .map_err(|_| "无法读取案件产出目录".to_string())?;
    if !canonical_output.starts_with(&canonical_root) {
        return Err("案件产出目录越出案件边界".to_string());
    }
    Ok(Some(canonical_output))
}

fn write_case_output_docx_impl(
    case_root: &Path,
    file_name: &str,
    bytes: &[u8],
) -> Result<CaseOutputArtifact, String> {
    validate_output_file_name(file_name)?;
    if !bytes.starts_with(b"PK") {
        return Err("Word 产物不是合法的 docx 容器".to_string());
    }
    let output_dir =
        secure_output_dir(case_root, true)?.ok_or_else(|| "无法创建案件产出目录".to_string())?;
    let target = output_dir.join(file_name);
    if target.exists() {
        let metadata =
            fs::symlink_metadata(&target).map_err(|_| "无法检查既有 Word 产物".to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("既有 Word 产物不是安全的实体文件".to_string());
        }
    }

    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "系统时钟异常，无法写入 Word 产物".to_string())?
        .as_nanos();
    let temporary = output_dir.join(format!(".courtwork-{}-{nonce}.tmp", std::process::id()));
    let write_result = (|| -> Result<(), String> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|_| "无法创建 Word 产物临时文件".to_string())?;
        file.write_all(bytes)
            .map_err(|_| "无法写入 Word 产物".to_string())?;
        file.sync_all()
            .map_err(|_| "无法同步 Word 产物".to_string())?;
        fs::rename(&temporary, &target).map_err(|_| "无法提交 Word 产物".to_string())?;
        Ok(())
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write_result?;

    Ok(CaseOutputArtifact {
        absolute_path: target.to_string_lossy().into_owned(),
        byte_length: bytes.len(),
    })
}

fn case_output_docx_exists_impl(case_root: &Path, file_name: &str) -> Result<bool, String> {
    validate_output_file_name(file_name)?;
    let Some(output_dir) = secure_output_dir(case_root, false)? else {
        return Ok(false);
    };
    let target = output_dir.join(file_name);
    let metadata = match fs::symlink_metadata(target) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => return Err("无法检查 Word 产物".to_string()),
    };
    Ok(metadata.is_file() && !metadata.file_type().is_symlink())
}

#[tauri::command]
fn write_case_output_docx(input: WriteCaseOutputInput) -> Result<CaseOutputArtifact, String> {
    write_case_output_docx_impl(Path::new(&input.case_root), &input.file_name, &input.bytes)
}

#[tauri::command]
fn case_output_docx_exists(input: CaseOutputRefInput) -> Result<bool, String> {
    case_output_docx_exists_impl(Path::new(&input.case_root), &input.file_name)
}

#[tauri::command]
async fn provider_chat_request(
    input: ProviderChatInput,
    on_event: tauri::ipc::Channel<ProviderTransportEvent>,
) -> Result<(), String> {
    trace_startup_once();
    let catalog = catalog_for(&input.provider_id)?;
    if input.model_id.trim().is_empty() {
        return Err("请选择模型".to_string());
    }
    let verified = verified_provider_store()
        .read()
        .ok()
        .and_then(|value| value.clone())
        .ok_or_else(|| "请先验证服务连接".to_string())?;
    if !verified_binding_matches(&verified, &input.provider_id, &input.model_id) {
        return Err("服务配置已变化，请重新验证".to_string());
    }
    let (_source, secret) = match active_secret() {
        Ok(pair) => pair,
        Err(status) => {
            return Err(status
                .failure_message
                .unwrap_or("凭证不可用，请先完成连接")
                .to_string())
        }
    };
    let url = catalog_url(&catalog, &catalog.paths.chat);
    let mut channel_failed = false;
    stream_chat_at(url, &input, &secret, |event| {
        if on_event.send(event).is_err() {
            channel_failed = true;
        }
    })
    .await;
    if channel_failed {
        Err("无法发送服务商流事件".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn cancel_provider_request(request_id: String) -> Result<(), String> {
    if let Ok(mut store) = cancellation_store().lock() {
        if let Some(cancel) = store.remove(&request_id) {
            let _ = cancel.send(());
        }
    }
    Ok(())
}

#[tauri::command]
async fn validate_provider_connection(
    input: ProviderProbeInput,
) -> Result<ProviderReadiness, String> {
    set_verified_provider(None);
    match active_secret() {
        Ok((source, secret)) => {
            let catalog = match catalog_for(&input.provider_id) {
                Ok(catalog) => catalog,
                Err(_) => return Ok(provider_failed(Some(source), "endpoint", "不支持该服务商")),
            };
            let status = probe_provider_at(&input, &catalog, secret, source).await;
            if status.connection.phase == "ready" {
                set_verified_provider(Some(VerifiedProvider {
                    provider_id: input.provider_id,
                    model_id: input.model_id,
                }));
            }
            Ok(status)
        }
        Err(status) => Ok(unverified_readiness(&status)),
    }
}

fn trace_status_exit(event: &str, status: &CredentialStatus, step: Option<&str>) {
    if !trace_enabled() {
        return;
    }
    let source_kind = match status.source {
        Some(CredentialSource::Pasted) => "pasted",
        Some(CredentialSource::Environment) => "environment",
        None => "none",
    };
    let mut fields = vec![
        ("event", TraceValue::Str(event.into())),
        ("phase", TraceValue::Str(status.phase.into())),
        ("source_kind", TraceValue::Str(source_kind.into())),
    ];
    if let Some(k) = status.fail_kind {
        fields.push(("fail_kind", TraceValue::Str(k.into())));
    }
    if let Some(s) = step {
        fields.push(("which_step", TraceValue::Str(s.into())));
    }
    // 注意：不记录 failure_message 全文也可；记录 wire 足够。此处不记 message 以免与技术栈耦合。
    trace_event(&fields);
}

#[tauri::command]
fn provider_credential_status() -> Result<ProviderReadiness, String> {
    credential_status().map(|status| unverified_readiness(&status))
}

#[tauri::command]
fn save_provider_credential(
    source: CredentialSource,
    value: String,
) -> Result<ProviderReadiness, String> {
    trace_startup_once();
    // 换凭证后必须重新验证 provider；旧 host 准入不能沿用。
    set_verified_provider(None);
    let value = value.trim();
    if value.is_empty() {
        let status = failed(Some(source), "凭证不能为空", None);
        trace_status_exit("save_provider_credential", &status, Some("validate"));
        return Ok(unverified_readiness(&status));
    }

    let stored = match source {
        CredentialSource::Pasted => {
            if value.len() < MIN_PASTED_LEN {
                let status = failed(
                    Some(CredentialSource::Pasted),
                    "凭证格式不正确，请检查后重新填写",
                    None,
                );
                trace_status_exit("save_provider_credential", &status, Some("validate"));
                return Ok(unverified_readiness(&status));
            }
            StoredCredential::Pasted {
                secret: value.to_owned(),
            }
        }
        CredentialSource::Environment => {
            if !value.bytes().enumerate().all(|(index, byte)| {
                byte == b'_' || byte.is_ascii_uppercase() || (index > 0 && byte.is_ascii_digit())
            }) {
                let status = failed(
                    Some(CredentialSource::Environment),
                    "凭证格式不正确，请检查后重新填写",
                    None,
                );
                trace_status_exit("save_provider_credential", &status, Some("validate"));
                return Ok(unverified_readiness(&status));
            }
            match std::env::var(value) {
                Err(_) => {
                    let status = failed(
                        Some(CredentialSource::Environment),
                        "电脑中未找到该凭证名称，请检查后重试",
                        None,
                    );
                    trace_status_exit("save_provider_credential", &status, Some("env_resolve"));
                    return Ok(unverified_readiness(&status));
                }
                Ok(resolved) if resolved.trim().is_empty() => {
                    let status = failed(
                        Some(CredentialSource::Environment),
                        "电脑中的凭证为空，请检查后重试",
                        None,
                    );
                    trace_status_exit("save_provider_credential", &status, Some("env_resolve"));
                    return Ok(unverified_readiness(&status));
                }
                Ok(_) => {}
            }
            // 不把 env 名写入日志；名字只进钥匙串条目 JSON
            StoredCredential::Environment {
                name: value.to_owned(),
            }
        }
    };

    // F2 语义照旧：delete → set 整组重写，强制当前身份新建 ACL（F3 下仅一个条目）
    let payload = match serde_json::to_string(&stored) {
        Ok(payload) => payload,
        Err(_) => {
            let status = failed(
                Some(source),
                "钥匙串授权未通过，请重试或重新填写",
                Some("platform"),
            );
            trace_status_exit("save_provider_credential", &status, Some("serialize"));
            return Ok(unverified_readiness(&status));
        }
    };
    if let Err(kind) = rewrite_password(CREDENTIAL_ACCOUNT, &payload) {
        let status = failed_keychain(Some(source), kind);
        trace_status_exit("save_provider_credential", &status, Some("rewrite"));
        return Ok(unverified_readiness(&status));
    }

    // F3 清账：legacy 双条目静默 delete（不读 data 不弹窗）。失败仅 trace 不阻塞——
    // 新条目已写成，凭证可用；残留旧条目由下次 save/clear 再清。
    let _ = delete_credential_ignore_missing(LEGACY_SOURCE_ACCOUNT);
    let _ = delete_credential_ignore_missing(LEGACY_SECRET_ACCOUNT);

    let status = credential_status()?;
    trace_status_exit("save_provider_credential", &status, Some("reprobe"));
    Ok(unverified_readiness(&status))
}

#[tauri::command]
fn clear_provider_credential() -> Result<ProviderReadiness, String> {
    trace_startup_once();
    set_verified_provider(None);
    for account in [
        CREDENTIAL_ACCOUNT,
        LEGACY_SOURCE_ACCOUNT,
        LEGACY_SECRET_ACCOUNT,
    ] {
        if let Err(kind) = delete_credential_ignore_missing(account) {
            let status = failed_keychain(None, kind);
            trace_status_exit("clear_provider_credential", &status, Some("delete"));
            return Ok(unverified_readiness(&status));
        }
    }
    let status = pending();
    trace_status_exit("clear_provider_credential", &status, None);
    Ok(unverified_readiness(&status))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    trace_startup_once();
    tauri::Builder::default()
        // F-3：仅注册 opener 的 open/reveal 动词；任意 shell 执行不在能力面。
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            provider_credential_status,
            save_provider_credential,
            clear_provider_credential,
            validate_provider_connection,
            provider_chat_request,
            cancel_provider_request,
            write_case_output_docx,
            case_output_docx_exists,
            sync_macos_window_controls,
        ])
        .run(tauri::generate_context!())
        .expect("Courtwork 桌面应用启动失败");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    #[test]
    fn mac_window_controls_follow_anchor_center_and_preserve_native_spacing() {
        let anchor = WindowControlsAnchor {
            x: 13.0,
            y: 8.0,
            width: 54.0,
            height: 32.0,
        };
        let native = [
            NativeButtonGeometry {
                x: 10.0,
                width: 14.0,
                height: 14.0,
            },
            NativeButtonGeometry {
                x: 30.0,
                width: 14.0,
                height: 14.0,
            },
            NativeButtonGeometry {
                x: 50.0,
                width: 14.0,
                height: 14.0,
            },
        ];
        let (metrics, targets) = plan_window_controls(anchor, &native).expect("valid anchor");
        assert_eq!(metrics.group_width, 54.0);
        assert_eq!(metrics.button_height, 14.0);
        assert_eq!(
            targets
                .iter()
                .map(|target| target.center_x)
                .collect::<Vec<_>>(),
            vec![20.0, 40.0, 60.0]
        );
        assert!(targets.iter().all(|target| target.center_y == 24.0));
    }

    #[test]
    fn mac_window_controls_reject_offscreen_or_partial_anchor_input() {
        let native = [NativeButtonGeometry {
            x: 0.0,
            width: 14.0,
            height: 14.0,
        }; 3];
        assert!(plan_window_controls(
            WindowControlsAnchor {
                x: -1.0,
                y: 0.0,
                width: 54.0,
                height: 32.0
            },
            &native,
        )
        .is_err());
        assert!(plan_window_controls(
            WindowControlsAnchor {
                x: 0.0,
                y: 0.0,
                width: 0.0,
                height: 32.0
            },
            &native,
        )
        .is_err());
        assert!(plan_window_controls(
            WindowControlsAnchor {
                x: 0.0,
                y: 0.0,
                width: 54.0,
                height: 32.0
            },
            &native[..2],
        )
        .is_err());
    }

    #[test]
    fn status_payload_contains_no_secret_field() {
        let status = connected(CredentialSource::Pasted);
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert_eq!(serialized, r#"{"phase":"connected","source":"pasted"}"#);
        assert!(!serialized.contains("secret"));
        assert!(!serialized.contains("value"));
    }

    #[test]
    fn readable_credential_is_stored_but_unverified_after_restart() {
        let readiness = unverified_readiness(&connected(CredentialSource::Pasted));
        let value = serde_json::to_value(readiness).expect("readiness wire");
        assert_eq!(value["credential"]["phase"], "stored");
        assert_eq!(value["connection"]["phase"], "unverified");
        assert_ne!(value["connection"]["phase"], "ready");
    }

    #[test]
    fn changing_provider_or_model_invalidates_verified_binding() {
        let binding = VerifiedProvider {
            provider_id: "deepseek".into(),
            model_id: "model-a".into(),
        };
        assert!(verified_binding_matches(&binding, "deepseek", "model-a"));
        assert!(!verified_binding_matches(&binding, "deepseek", "model-b"));
        assert!(!verified_binding_matches(&binding, "arbitrary", "model-a"));
    }

    #[tokio::test]
    async fn mock_endpoint_discovers_models_then_runs_real_one_token_smoke() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock endpoint");
        let address = listener.local_addr().expect("mock address");
        let server = std::thread::spawn(move || {
            for index in 0..2 {
                let (mut socket, _) = listener.accept().expect("accept request");
                let mut request = vec![0_u8; 8192];
                let read = socket.read(&mut request).expect("read request");
                let text = String::from_utf8_lossy(&request[..read]);
                let body = if index == 0 {
                    assert!(text.starts_with("GET /v1/models"));
                    r#"{"data":[{"id":"mock-law-model"}]}"#
                } else {
                    assert!(text.starts_with("POST /v1/chat/completions"));
                    assert!(text.contains("\"max_tokens\":1"));
                    assert!(text.contains("\"thinking\":{\"type\":\"enabled\"}"));
                    r#"{"choices":[{"message":{"content":"x"}}]}"#
                };
                write!(socket, "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}", body.len(), body).expect("write response");
            }
        });
        let input = ProviderProbeInput {
            _request_id: "probe-test".into(),
            provider_id: "deepseek".into(),
            model_id: "mock-law-model".into(),
            reasoning_body: serde_json::from_value(
                serde_json::json!({"thinking": {"type": "enabled"}}),
            )
            .unwrap(),
        };
        let catalog = ProviderCatalog {
            id: "deepseek".into(),
            base_url: format!("http://{address}/v1"),
            models: vec!["mock-law-model".into()],
            paths: ProviderCatalogPaths {
                chat: "/chat/completions".into(),
                models: "/models".into(),
            },
        };
        let status = probe_provider_at(
            &input,
            &catalog,
            "never-log-this-secret".into(),
            CredentialSource::Pasted,
        )
        .await;
        server.join().expect("mock server");
        assert_eq!(status.connection.phase, "ready");
        assert_eq!(status.connection.model_discovery, Some("available"));
        assert_eq!(
            status.connection.models,
            Some(vec!["mock-law-model".into()])
        );
    }

    #[test]
    fn failed_payload_carries_user_facing_message_and_fail_kind() {
        let status = failed_keychain(None, KeychainFailKind::AuthFailed);
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert!(serialized.contains("failed"));
        assert!(serialized.contains("auth_failed"));
        assert!(serialized.contains("无法解锁"));
        assert!(!serialized.contains("Keyring"));
        assert!(!serialized.contains("password"));
        assert!(!serialized.contains("secret"));
    }

    #[test]
    fn classify_os_status_maps_known_codes() {
        assert_eq!(classify_os_status(-128), KeychainFailKind::UserCanceled);
        assert_eq!(classify_os_status(-25293), KeychainFailKind::AuthFailed);
        assert_eq!(
            classify_os_status(-25315),
            KeychainFailKind::NoAccessForItem
        );
        assert_eq!(
            classify_os_status(-25308),
            KeychainFailKind::InteractionNotAllowed
        );
        assert_eq!(classify_os_status(-61), KeychainFailKind::NoStorageAccess);
        assert_eq!(
            classify_os_status(-99999),
            KeychainFailKind::PlatformOther {
                os_status: Some(-99999)
            }
        );
    }

    #[test]
    fn parse_os_status_from_display_and_debug_text() {
        assert_eq!(parse_os_status_from_text("error code -25293"), Some(-25293));
        assert_eq!(
            parse_os_status_from_text("Platform failure: error code -128"),
            Some(-128)
        );
        assert_eq!(
            parse_os_status_from_text("Error { code: NonZeroI32(-25315), message: Some(\"x\") }"),
            Some(-25315)
        );
        assert_eq!(
            parse_os_status_from_text("Couldn't access platform storage: error code -25308"),
            Some(-25308)
        );
    }

    #[test]
    fn wire_names_and_messages_are_zero_tech() {
        assert_eq!(KeychainFailKind::UserCanceled.wire_name(), "user_canceled");
        assert_eq!(KeychainFailKind::AuthFailed.wire_name(), "auth_failed");
        assert_eq!(KeychainFailKind::NoAccessForItem.wire_name(), "acl_denied");
        assert_eq!(KeychainFailKind::NoStorageAccess.wire_name(), "acl_denied");
        assert_eq!(
            KeychainFailKind::PlatformOther { os_status: None }.wire_name(),
            "platform"
        );
        for kind in [
            KeychainFailKind::UserCanceled,
            KeychainFailKind::AuthFailed,
            KeychainFailKind::NoAccessForItem,
        ] {
            let msg = kind.user_message();
            assert!(!msg.to_ascii_lowercase().contains("keyring"));
            assert!(!msg.contains("OSStatus"));
            assert!(!msg.contains("ACL"));
        }
    }

    #[test]
    fn trace_line_never_embeds_secret_fields_or_values() {
        let line = build_trace_line(&[
            ("event", TraceValue::Str("keychain_op".into())),
            ("op", TraceValue::Str("set".into())),
            ("account", TraceValue::Str(CREDENTIAL_ACCOUNT.into())),
            ("service", TraceValue::Str(CREDENTIAL_SERVICE.into())),
            ("ok", TraceValue::Bool(true)),
            // 即使误传敏感键名也应被丢弃
            ("secret", TraceValue::Str("sk-leaked".into())),
            ("password", TraceValue::Str("hunter2".into())),
            ("apiKey", TraceValue::Str("should-not-appear".into())),
        ]);
        assert!(line.contains("\"account\":\"credential\""));
        assert!(line.contains("\"ok\":true"));
        let lower = line.to_ascii_lowercase();
        assert!(!lower.contains("sk-"));
        assert!(!lower.contains("hunter2"));
        assert!(!lower.contains("should-not-appear"));
        // 键名 secret/password 不得出现在 JSON 键位
        assert!(!line.contains("\"secret\""));
        assert!(!line.contains("\"password\""));
        assert!(!line.contains("\"apiKey\""));
    }

    #[test]
    fn trace_disabled_by_default() {
        // 测试进程默认不应开启；若外部环境误开则仍只验证 env 读取语义
        std::env::remove_var(TRACE_ENV);
        assert!(!trace_enabled());
    }

    #[test]
    fn dev_service_suffix_matches_build_profile() {
        #[cfg(debug_assertions)]
        assert!(CREDENTIAL_SERVICE.ends_with(".dev"));
        #[cfg(not(debug_assertions))]
        assert_eq!(CREDENTIAL_SERVICE, "cn.courtwork.desktop.provider");
    }

    #[test]
    fn classify_keyring_no_entry() {
        assert_eq!(
            classify_keyring_error(&KeyringError::NoEntry),
            KeychainFailKind::NoEntry
        );
    }

    // ─── 单条目形制（安全裁决：单条目/不迁移/清账收尾）───────────────

    #[test]
    fn stored_credential_wire_shape_roundtrips() {
        let pasted = serde_json::to_string(&StoredCredential::Pasted {
            secret: "sk-abcdefgh".into(),
        })
        .expect("serialize pasted");
        assert_eq!(pasted, r#"{"source":"pasted","secret":"sk-abcdefgh"}"#);
        let env = serde_json::to_string(&StoredCredential::Environment {
            name: "COURTWORK_KEY".into(),
        })
        .expect("serialize environment");
        assert_eq!(env, r#"{"source":"environment","name":"COURTWORK_KEY"}"#);
        assert!(matches!(
            serde_json::from_str::<StoredCredential>(&pasted).expect("parse pasted"),
            StoredCredential::Pasted { .. }
        ));
        assert!(matches!(
            serde_json::from_str::<StoredCredential>(&env).expect("parse environment"),
            StoredCredential::Environment { .. }
        ));
    }

    #[test]
    fn status_from_stored_covers_probe_matrix() {
        assert_eq!(status_from_stored(ReadCredential::Missing).phase, "pending");

        let corrupt = status_from_stored(ReadCredential::Corrupt);
        assert_eq!(corrupt.phase, "failed");
        assert_eq!(
            corrupt.failure_message,
            Some("凭证格式不正确，请检查后重新填写")
        );

        let short = status_from_stored(ReadCredential::Stored(StoredCredential::Pasted {
            secret: "short".into(),
        }));
        assert_eq!(short.phase, "failed");

        let ok = status_from_stored(ReadCredential::Stored(StoredCredential::Pasted {
            secret: "sk-long-enough".into(),
        }));
        assert_eq!(ok.phase, "connected");
        assert!(matches!(ok.source, Some(CredentialSource::Pasted)));

        let unnamed = status_from_stored(ReadCredential::Stored(StoredCredential::Environment {
            name: String::new(),
        }));
        assert_eq!(unnamed.phase, "failed");

        std::env::set_var("COURTWORK_F3_TEST_ENV", "resolved-secret");
        let env_ok = status_from_stored(ReadCredential::Stored(StoredCredential::Environment {
            name: "COURTWORK_F3_TEST_ENV".into(),
        }));
        assert_eq!(env_ok.phase, "connected");
        std::env::remove_var("COURTWORK_F3_TEST_ENV");

        let env_missing =
            status_from_stored(ReadCredential::Stored(StoredCredential::Environment {
                name: "COURTWORK_F3_TEST_ENV_ABSENT".into(),
            }));
        assert_eq!(env_missing.phase, "failed");
    }

    #[test]
    fn secret_from_stored_yields_secret_or_honest_status() {
        let (source, secret) =
            secret_from_stored(ReadCredential::Stored(StoredCredential::Pasted {
                secret: "sk-abcdefgh".into(),
            }))
            .expect("pasted secret");
        assert!(matches!(source, CredentialSource::Pasted));
        assert_eq!(secret, "sk-abcdefgh");

        let pending_status =
            secret_from_stored(ReadCredential::Missing).expect_err("missing → pending");
        assert_eq!(pending_status.phase, "pending");
        let corrupt_status =
            secret_from_stored(ReadCredential::Corrupt).expect_err("corrupt → failed");
        assert_eq!(corrupt_status.phase, "failed");
    }

    #[test]
    fn embedded_catalog_rejects_arbitrary_provider_ids() {
        assert!(catalog_for("attacker-controlled-provider").is_err());
        let catalog = catalog_for("deepseek").expect("embedded provider");
        assert_eq!(catalog.id, "deepseek");
        assert!(catalog.base_url.starts_with("https://"));
        assert_eq!(classify_transport_status(401), ("auth", false));
        assert_eq!(classify_transport_status(429), ("rate_limit", true));
        assert_eq!(classify_transport_status(503), ("endpoint", true));
    }

    #[test]
    fn chat_input_rejects_arbitrary_url_header_and_key_fields() {
        let base = serde_json::json!({
            "requestId": "r1", "providerId": "deepseek", "modelId": "m",
            "reasoningBody": {}, "body": "{}"
        });
        assert!(serde_json::from_value::<ProviderChatInput>(base.clone()).is_ok());
        for field in ["url", "headers", "apiKey"] {
            let mut forged = base.clone();
            forged
                .as_object_mut()
                .expect("object")
                .insert(field.into(), serde_json::json!("attacker"));
            assert!(
                serde_json::from_value::<ProviderChatInput>(forged).is_err(),
                "must reject {field}"
            );
        }
    }

    #[tokio::test]
    async fn real_mock_stream_preserves_fragmented_utf8_as_raw_transport_frames() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock endpoint");
        let address = listener.local_addr().expect("mock address");
        let server = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().expect("accept request");
            let mut request = vec![0_u8; 8192];
            let read = socket.read(&mut request).expect("read request");
            let text = String::from_utf8_lossy(&request[..read]);
            assert!(text.starts_with("POST /v1/chat/completions"));
            assert!(
                text.contains("authorization: Bearer test-secret-never-logged")
                    || text.contains("Authorization: Bearer test-secret-never-logged")
            );
            assert!(text.contains("\"stream\":true"));
            assert!(text.contains("\"model\":\"deepseek-v4-pro\""));
            assert!(!text.contains("\"model\":\"forged-model\""));
            let body = "data: {\"choices\":[{\"delta\":{\"content\":\"法\"}}]}\n\ndata: [DONE]\n\n"
                .as_bytes();
            write!(socket, "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ncontent-length: {}\r\nconnection: close\r\n\r\n", body.len()).expect("write headers");
            let split = body
                .windows(3)
                .position(|bytes| bytes == "法".as_bytes())
                .expect("Han bytes")
                + 1;
            socket
                .write_all(&body[..split])
                .expect("write first fragment");
            socket.flush().expect("flush first fragment");
            std::thread::sleep(std::time::Duration::from_millis(30));
            socket
                .write_all(&body[split..])
                .expect("write second fragment");
        });
        let input = ProviderChatInput {
            request_id: "fragment-test".into(),
            provider_id: "deepseek".into(),
            model_id: "deepseek-v4-pro".into(),
            reasoning_body: serde_json::from_value(
                serde_json::json!({"model": "forged-model", "stream": false}),
            )
            .expect("forged reasoning map"),
            body: r#"{"messages":[{"role":"user","content":"hi"}],"stream":true}"#.into(),
        };
        let mut events = Vec::new();
        stream_chat_at(
            format!("http://{address}/v1/chat/completions"),
            &input,
            "test-secret-never-logged",
            |event| events.push(event),
        )
        .await;
        server.join().expect("mock server");
        assert!(matches!(
            events.first(),
            Some(ProviderTransportEvent::ResponseStarted { status: 200, .. })
        ));
        assert!(matches!(
            events.last(),
            Some(ProviderTransportEvent::End { .. })
        ));
        let chunks = events
            .iter()
            .filter_map(|event| match event {
                ProviderTransportEvent::Chunk { bytes, .. } => Some(bytes.clone()),
                _ => None,
            })
            .collect::<Vec<_>>();
        assert!(
            chunks.len() >= 2,
            "mock server must exercise fragmented delivery"
        );
        let joined = chunks.into_iter().flatten().collect::<Vec<_>>();
        assert!(String::from_utf8(joined)
            .expect("raw bytes stay valid when joined")
            .contains("法"));
    }

    #[test]
    fn transport_event_wire_shape_is_closed_and_camel_case() {
        let event = ProviderTransportEvent::ResponseStarted {
            request_id: "r1".into(),
            status: 200,
            content_type: Some("text/event-stream".into()),
        };
        assert_eq!(
            serde_json::to_value(event).expect("serialize"),
            serde_json::json!({
                "type": "response_started", "requestId": "r1", "status": 200, "contentType": "text/event-stream"
            })
        );
        let failed = ProviderTransportEvent::Failed {
            request_id: "r1".into(),
            kind: "canceled",
            message: "请求已取消",
            retryable: false,
        };
        let value = serde_json::to_value(failed).expect("serialize failed");
        assert_eq!(value["type"], "failed");
        assert_eq!(value["kind"], "canceled");
        assert!(value.get("url").is_none());
    }

    #[tokio::test]
    async fn cancellation_before_response_headers_emits_one_canceled_terminal() {
        use std::sync::Arc;
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind cancel endpoint");
        let address = listener.local_addr().expect("cancel address");
        let server = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().expect("accept cancel request");
            let mut request = vec![0_u8; 4096];
            let _ = socket.read(&mut request);
            std::thread::sleep(std::time::Duration::from_millis(150));
        });
        let input = ProviderChatInput {
            request_id: "cancel-before-headers".into(),
            provider_id: "deepseek".into(),
            model_id: "deepseek-v4-pro".into(),
            reasoning_body: serde_json::Map::new(),
            body: "{}".into(),
        };
        let events = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&events);
        let task = tokio::spawn(async move {
            stream_chat_at(
                format!("http://{address}/chat/completions"),
                &input,
                "never-log",
                |event| {
                    sink.lock().expect("event lock").push(event);
                },
            )
            .await;
        });
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        if let Ok(mut store) = cancellation_store().lock() {
            let cancel = store
                .remove("cancel-before-headers")
                .expect("request registered before HTTP response");
            let _ = cancel.send(());
        }
        task.await.expect("stream task");
        server.join().expect("cancel server");
        let events = events.lock().expect("events");
        assert_eq!(events.len(), 1);
        assert!(matches!(
            events[0],
            ProviderTransportEvent::Failed {
                kind: "canceled",
                ..
            }
        ));
    }

    #[test]
    fn legacy_accounts_stay_deletable_targets_only() {
        // F3 不迁移：代码中不存在对 legacy 条目的 get 读取路径（读取即弹窗）。
        // 本断言锁常量语义：legacy 名与新名互异且非空，清账目标闭合。
        assert_ne!(CREDENTIAL_ACCOUNT, LEGACY_SOURCE_ACCOUNT);
        assert_ne!(CREDENTIAL_ACCOUNT, LEGACY_SECRET_ACCOUNT);
        assert_eq!(LEGACY_SOURCE_ACCOUNT, "active-source");
        assert_eq!(LEGACY_SECRET_ACCOUNT, "provider-secret");
    }

    #[test]
    fn case_output_write_is_bounded_to_case_output_directory() {
        let docx = include_bytes!("../../../../packages/output/test/fixtures/original.docx");
        let root = std::env::temp_dir().join(format!(
            "courtwork-output-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("create case root");

        let artifact =
            write_case_output_docx_impl(&root, "答辩意见.docx", docx).expect("write output");
        let expected = root
            .canonicalize()
            .expect("canonical case root")
            .join("产出")
            .join("答辩意见.docx");
        assert_eq!(PathBuf::from(artifact.absolute_path), expected);
        assert_eq!(artifact.byte_length, docx.len());
        assert!(case_output_docx_exists_impl(&root, "答辩意见.docx").expect("exists"));
        assert_eq!(fs::read(expected).expect("read output"), docx);

        fs::remove_file(root.join("产出").join("答辩意见.docx")).expect("delete output");
        assert!(!case_output_docx_exists_impl(&root, "答辩意见.docx").expect("deleted"));

        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn case_output_write_rejects_traversal_and_non_docx_names() {
        let root = std::env::temp_dir();
        assert!(write_case_output_docx_impl(&root, "../escape.docx", b"PK").is_err());
        assert!(write_case_output_docx_impl(&root, "nested/a.docx", b"PK").is_err());
        assert!(write_case_output_docx_impl(&root, "/tmp/escape.docx", b"PK").is_err());
        assert!(write_case_output_docx_impl(&root, "report.pdf", b"PK").is_err());
    }
}
