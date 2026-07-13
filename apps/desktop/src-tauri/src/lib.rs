//! 凭证探针 + 钥匙串读写（FIX-KC-1 / F3 单条目形制）。
//! secret/source 值永不入日志、错误消息或序列化字段。

use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::{Once, OnceLock, RwLock};

/// 发行包 service；dev（debug_assertions）加 `.dev` 后缀，避免污染发行 ACL（F6）。
#[cfg(debug_assertions)]
const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider.dev";
#[cfg(not(debug_assertions))]
const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider";

/// F3（docs/55 拍板）：单条目形制——source 标记与 secret 合存一个条目，
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
/// 最近一次成功探针确认的 base URL。chat 转发只从此 Rust 侧可信状态取目标，
/// WebView 的转发入参无权另行选择 host。
static VERIFIED_PROVIDER_BASE_URL: OnceLock<RwLock<Option<String>>> = OnceLock::new();

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
            Self::NoEntry
            | Self::PlatformOther { .. }
            | Self::EntryBuilder
            | Self::Unknown => "钥匙串授权未通过，请重试或重新填写",
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
    for code in [-128, -25293, -25315, -25308, -61, -25291, -25292, -25294, -25295] {
        let needle = code.to_string();
        if text.split(|c: char| !c.is_ascii_digit() && c != '-').any(|t| t == needle) {
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

fn trace_op(
    op: KeychainOp,
    account: &str,
    ok: bool,
    fail_kind: Option<KeychainFailKind>,
) {
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
            trace_op(KeychainOp::Delete, account, true, Some(KeychainFailKind::NoEntry));
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
fn secret_from_stored(read: ReadCredential) -> Result<(CredentialSource, String), CredentialStatus> {
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderProbeInput {
    provider_id: String,
    base_url: String,
    model_id: String,
    #[serde(default)]
    reasoning_body: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderProbeStatus {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<CredentialSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure_message: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    fail_kind: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    models: Option<Vec<String>>,
    model_discovery: &'static str,
}

fn provider_failed(source: Option<CredentialSource>, kind: &'static str, message: &'static str) -> ProviderProbeStatus {
    ProviderProbeStatus { phase: "failed", source, failure_message: Some(message), fail_kind: Some(kind), models: None, model_discovery: "unsupported" }
}

fn classify_http_failure(source: CredentialSource, status: reqwest::StatusCode) -> ProviderProbeStatus {
    match status.as_u16() {
        401 | 403 => provider_failed(Some(source), "auth_failed", "访问凭证未通过服务商验证，请检查后重试"),
        404 => provider_failed(Some(source), "endpoint", "服务地址无法完成请求，请检查 Base URL"),
        429 => provider_failed(Some(source), "rate_limited", "服务商暂时限制了请求，请稍后重试"),
        400 | 422 => provider_failed(Some(source), "model", "当前模型不可用，请从模型列表选择或手动填写"),
        _ => provider_failed(Some(source), "invalid_response", "服务商返回了无法识别的响应，请稍后重试"),
    }
}

async fn probe_provider_endpoint(input: ProviderProbeInput, secret: String, source: CredentialSource) -> ProviderProbeStatus {
    let base = input.base_url.trim().trim_end_matches('/');
    if base.is_empty() || input.model_id.trim().is_empty() {
        return provider_failed(Some(source), "endpoint", "请填写 Base URL 和模型名");
    }
    let client = match reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build() {
        Ok(client) => client,
        Err(_) => return provider_failed(Some(source), "platform", "暂时无法验证连接，请重试"),
    };
    let models_response = client.get(format!("{base}/models")).bearer_auth(&secret).send().await;
    let mut models = None;
    let mut discovery = "unsupported";
    if let Ok(response) = models_response {
        if response.status() == reqwest::StatusCode::UNAUTHORIZED || response.status() == reqwest::StatusCode::FORBIDDEN {
            return classify_http_failure(source, response.status());
        }
        if response.status().is_success() {
            let payload = response.json::<serde_json::Value>().await.ok();
            models = payload.and_then(|value| value.get("data").and_then(|data| data.as_array()).map(|items| {
                items.iter().filter_map(|item| item.get("id").and_then(|id| id.as_str()).map(str::to_owned)).collect::<Vec<_>>()
            })).filter(|items| !items.is_empty());
            if models.is_some() { discovery = "available"; }
        }
    }

    let mut body = serde_json::Map::new();
    body.insert("model".into(), serde_json::Value::String(input.model_id));
    body.insert("messages".into(), serde_json::json!([{"role":"user","content":"Hi"}]));
    body.insert("max_tokens".into(), serde_json::json!(1));
    body.insert("stream".into(), serde_json::json!(false));
    body.extend(input.reasoning_body);
    let smoke = client.post(format!("{base}/chat/completions")).bearer_auth(&secret).json(&body).send().await;
    match smoke {
        Ok(response) if response.status().is_success() => ProviderProbeStatus {
            phase: "connected", source: Some(source), failure_message: None, fail_kind: None,
            models, model_discovery: discovery,
        },
        Ok(response) => classify_http_failure(source, response.status()),
        Err(error) if error.is_timeout() => provider_failed(Some(source), "timeout", "服务商响应超时，请稍后重试"),
        Err(_) => provider_failed(Some(source), "network", "暂时无法连接服务商，请检查网络后重试"),
    }
}

// ─── Chat 转发（GOAL-1 链路批：chat 面真 API）────────────────────────────────
// 窄面代理：仅 `/chat/completions` 对话补全语义。请求体由 TS/core 组装（quirk 与
// 结构化降级链复用 packages/core），key 唯一注入点在此——JS 侧永不见明文，与
// validate_provider_connection 同风险面同审计口径（PRV-1 主张 1）。

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatForwardInput {
    url: String,
    body: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatForwardOutput {
    status: u16,
    body: String,
}

fn verified_provider_base_url_store() -> &'static RwLock<Option<String>> {
    VERIFIED_PROVIDER_BASE_URL.get_or_init(|| RwLock::new(None))
}

fn set_verified_provider_base_url(base_url: Option<&str>) {
    if let Ok(mut stored) = verified_provider_base_url_store().write() {
        *stored = base_url.map(|value| value.trim().trim_end_matches('/').to_owned());
    }
}

fn verified_provider_base_url() -> Option<String> {
    verified_provider_base_url_store().read().ok()?.clone()
}

/// 仅放行已验证 base URL 的同 origin、固定 `/chat/completions` 子路径。
/// custom provider 不走中央域名枚举：成功探针后同样进入 Rust 可信状态。
fn chat_forward_url_allowed(url: &str, verified_base_url: &str) -> bool {
    let Ok(target) = reqwest::Url::parse(url) else {
        return false;
    };
    let Ok(base) = reqwest::Url::parse(verified_base_url) else {
        return false;
    };
    if !matches!(target.scheme(), "http" | "https")
        || !matches!(base.scheme(), "http" | "https")
        || target.scheme() != base.scheme()
        || target.host_str() != base.host_str()
        || target.port_or_known_default() != base.port_or_known_default()
        || !target.username().is_empty()
        || target.password().is_some()
        || target.query().is_some()
        || target.fragment().is_some()
        || !base.username().is_empty()
        || base.password().is_some()
        || base.query().is_some()
        || base.fragment().is_some()
    {
        return false;
    }
    let expected_path = format!("{}/chat/completions", base.path().trim_end_matches('/'));
    target.path() == expected_path
}

/// secret 参数化的转发体（mock TCP 可测）；HTTP 状态原样透传，
/// 错误消息零技术概念（F4 口径），且永不包含 URL/body/secret。
async fn forward_chat_request(url: &str, body: String, secret: &str) -> Result<ChatForwardOutput, String> {
    let client = reqwest::Client::builder()
        // 比 core 侧 120s race 更长的兜底：让 TS 侧先超时，保持分型出口唯一
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|_| "暂时无法发起请求，请重试".to_string())?;
    let response = client
        .post(url)
        .bearer_auth(secret)
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "服务商响应超时，请稍后重试".to_string()
            } else {
                "暂时无法连接服务商，请检查网络后重试".to_string()
            }
        })?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|_| "服务商返回了无法识别的响应，请稍后重试".to_string())?;
    Ok(ChatForwardOutput { status, body })
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
    let metadata = fs::symlink_metadata(&output_dir).map_err(|_| "无法读取案件产出目录".to_string())?;
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
    let output_dir = secure_output_dir(case_root, true)?
        .ok_or_else(|| "无法创建案件产出目录".to_string())?;
    let target = output_dir.join(file_name);
    if target.exists() {
        let metadata = fs::symlink_metadata(&target).map_err(|_| "无法检查既有 Word 产物".to_string())?;
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
        file.write_all(bytes).map_err(|_| "无法写入 Word 产物".to_string())?;
        file.sync_all().map_err(|_| "无法同步 Word 产物".to_string())?;
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
async fn provider_chat_request(input: ChatForwardInput) -> Result<ChatForwardOutput, String> {
    trace_startup_once();
    let verified_base_url = verified_provider_base_url()
        .ok_or_else(|| "请先验证服务连接".to_string())?;
    if !chat_forward_url_allowed(&input.url, &verified_base_url) {
        return Err("仅支持已验证服务的对话补全请求".to_string());
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
    forward_chat_request(&input.url, input.body, &secret).await
}

#[tauri::command]
async fn validate_provider_connection(input: ProviderProbeInput) -> Result<ProviderProbeStatus, String> {
    let _provider_id = &input.provider_id; // 仅诊断标识；路由完全由声明生成的 input 驱动。
    // 每次换配置先撤销旧准入；只有新配置真探针成功后才登记。
    set_verified_provider_base_url(None);
    match active_secret() {
        Ok((source, secret)) => {
            let base_url = input.base_url.clone();
            let status = probe_provider_endpoint(input, secret, source).await;
            if status.phase == "connected" {
                set_verified_provider_base_url(Some(&base_url));
            }
            Ok(status)
        }
        Err(status) => Ok(ProviderProbeStatus {
            phase: status.phase, source: status.source, failure_message: status.failure_message,
            fail_kind: status.fail_kind, models: None, model_discovery: "unsupported",
        }),
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
fn provider_credential_status() -> Result<CredentialStatus, String> {
    credential_status()
}

#[tauri::command]
fn save_provider_credential(
    source: CredentialSource,
    value: String,
) -> Result<CredentialStatus, String> {
    trace_startup_once();
    // 换凭证后必须重新验证 provider；旧 host 准入不能沿用。
    set_verified_provider_base_url(None);
    let value = value.trim();
    if value.is_empty() {
        let status = failed(Some(source), "凭证不能为空", None);
        trace_status_exit("save_provider_credential", &status, Some("validate"));
        return Ok(status);
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
                return Ok(status);
            }
            StoredCredential::Pasted { secret: value.to_owned() }
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
                return Ok(status);
            }
            match std::env::var(value) {
                Err(_) => {
                    let status = failed(
                        Some(CredentialSource::Environment),
                        "电脑中未找到该凭证名称，请检查后重试",
                        None,
                    );
                    trace_status_exit("save_provider_credential", &status, Some("env_resolve"));
                    return Ok(status);
                }
                Ok(resolved) if resolved.trim().is_empty() => {
                    let status = failed(
                        Some(CredentialSource::Environment),
                        "电脑中的凭证为空，请检查后重试",
                        None,
                    );
                    trace_status_exit("save_provider_credential", &status, Some("env_resolve"));
                    return Ok(status);
                }
                Ok(_) => {}
            }
            // 不把 env 名写入日志；名字只进钥匙串条目 JSON
            StoredCredential::Environment { name: value.to_owned() }
        }
    };

    // F2 语义照旧：delete → set 整组重写，强制当前身份新建 ACL（F3 下仅一个条目）
    let payload = match serde_json::to_string(&stored) {
        Ok(payload) => payload,
        Err(_) => {
            let status = failed(Some(source), "钥匙串授权未通过，请重试或重新填写", Some("platform"));
            trace_status_exit("save_provider_credential", &status, Some("serialize"));
            return Ok(status);
        }
    };
    if let Err(kind) = rewrite_password(CREDENTIAL_ACCOUNT, &payload) {
        let status = failed_keychain(Some(source), kind);
        trace_status_exit("save_provider_credential", &status, Some("rewrite"));
        return Ok(status);
    }

    // F3 清账：legacy 双条目静默 delete（不读 data 不弹窗）。失败仅 trace 不阻塞——
    // 新条目已写成，凭证可用；残留旧条目由下次 save/clear 再清。
    let _ = delete_credential_ignore_missing(LEGACY_SOURCE_ACCOUNT);
    let _ = delete_credential_ignore_missing(LEGACY_SECRET_ACCOUNT);

    let status = credential_status()?;
    trace_status_exit("save_provider_credential", &status, Some("reprobe"));
    Ok(status)
}

#[tauri::command]
fn clear_provider_credential() -> Result<CredentialStatus, String> {
    trace_startup_once();
    set_verified_provider_base_url(None);
    for account in [CREDENTIAL_ACCOUNT, LEGACY_SOURCE_ACCOUNT, LEGACY_SECRET_ACCOUNT] {
        if let Err(kind) = delete_credential_ignore_missing(account) {
            let status = failed_keychain(None, kind);
            trace_status_exit("clear_provider_credential", &status, Some("delete"));
            return Ok(status);
        }
    }
    let status = pending();
    trace_status_exit("clear_provider_credential", &status, None);
    Ok(status)
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
            write_case_output_docx,
            case_output_docx_exists,
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
    fn status_payload_contains_no_secret_field() {
        let status = connected(CredentialSource::Pasted);
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert_eq!(serialized, r#"{"phase":"connected","source":"pasted"}"#);
        assert!(!serialized.contains("secret"));
        assert!(!serialized.contains("value"));
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
        let status = probe_provider_endpoint(
            ProviderProbeInput {
                provider_id: "deepseek".into(), base_url: format!("http://{address}/v1"),
                model_id: "mock-law-model".into(),
                reasoning_body: serde_json::from_value(serde_json::json!({"thinking": {"type": "enabled"}})).unwrap(),
            },
            "never-log-this-secret".into(), CredentialSource::Pasted,
        ).await;
        server.join().expect("mock server");
        assert_eq!(status.phase, "connected");
        assert_eq!(status.model_discovery, "available");
        assert_eq!(status.models, Some(vec!["mock-law-model".into()]));
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
        assert_eq!(classify_os_status(-25315), KeychainFailKind::NoAccessForItem);
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
        assert_eq!(
            parse_os_status_from_text("error code -25293"),
            Some(-25293)
        );
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

    // ─── F3 单条目形制（docs/55 拍板：单条目/不迁移/清账收尾）───────────────

    #[test]
    fn stored_credential_wire_shape_roundtrips() {
        let pasted = serde_json::to_string(&StoredCredential::Pasted { secret: "sk-abcdefgh".into() })
            .expect("serialize pasted");
        assert_eq!(pasted, r#"{"source":"pasted","secret":"sk-abcdefgh"}"#);
        let env = serde_json::to_string(&StoredCredential::Environment { name: "COURTWORK_KEY".into() })
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
        assert_eq!(corrupt.failure_message, Some("凭证格式不正确，请检查后重新填写"));

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

        let env_missing = status_from_stored(ReadCredential::Stored(StoredCredential::Environment {
            name: "COURTWORK_F3_TEST_ENV_ABSENT".into(),
        }));
        assert_eq!(env_missing.phase, "failed");
    }

    #[test]
    fn secret_from_stored_yields_secret_or_honest_status() {
        let (source, secret) = secret_from_stored(ReadCredential::Stored(StoredCredential::Pasted {
            secret: "sk-abcdefgh".into(),
        }))
        .expect("pasted secret");
        assert!(matches!(source, CredentialSource::Pasted));
        assert_eq!(secret, "sk-abcdefgh");

        let pending_status = secret_from_stored(ReadCredential::Missing).expect_err("missing → pending");
        assert_eq!(pending_status.phase, "pending");
        let corrupt_status = secret_from_stored(ReadCredential::Corrupt).expect_err("corrupt → failed");
        assert_eq!(corrupt_status.phase, "failed");
    }

    #[test]
    fn chat_forward_url_narrow_gate() {
        let deepseek = "https://api.deepseek.com/v1";
        assert!(chat_forward_url_allowed(
            "https://api.deepseek.com/v1/chat/completions",
            deepseek,
        ));
        assert!(!chat_forward_url_allowed(
            "https://attacker.example/v1/chat/completions",
            deepseek,
        ));
        assert!(!chat_forward_url_allowed("https://api.deepseek.com/v1/models", deepseek));
        assert!(!chat_forward_url_allowed(
            "https://api.deepseek.com/v1/chat/completions?x=1",
            deepseek,
        ));
        assert!(!chat_forward_url_allowed("file:///etc/passwd/chat/completions", deepseek));
        assert!(!chat_forward_url_allowed("", deepseek));

        // custom provider 不按中央域名表裁剪；只绑定用户刚刚验证成功的完整 base URL。
        let custom = "http://127.0.0.1:9/custom/v1";
        assert!(chat_forward_url_allowed(
            "http://127.0.0.1:9/custom/v1/chat/completions",
            custom,
        ));
        assert!(!chat_forward_url_allowed(
            "http://127.0.0.1:10/custom/v1/chat/completions",
            custom,
        ));
    }

    #[tokio::test]
    async fn forward_chat_request_passes_status_and_body_through() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock endpoint");
        let address = listener.local_addr().expect("mock address");
        let server = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().expect("accept request");
            let mut request = vec![0_u8; 8192];
            let read = socket.read(&mut request).expect("read request");
            let text = String::from_utf8_lossy(&request[..read]);
            assert!(text.starts_with("POST /v1/chat/completions"));
            assert!(text.contains("authorization: Bearer test-secret-never-logged")
                || text.contains("Authorization: Bearer test-secret-never-logged"));
            assert!(text.contains("\"stream\":true"));
            let body = "data: {\"choices\":[{\"delta\":{\"content\":\"x\"}}]}\n\ndata: [DONE]\n";
            write!(socket, "HTTP/1.1 429 Too Many Requests\r\ncontent-type: text/event-stream\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}", body.len(), body).expect("write response");
        });
        let output = forward_chat_request(
            &format!("http://{address}/v1/chat/completions"),
            r#"{"model":"m","stream":true}"#.into(),
            "test-secret-never-logged",
        )
        .await
        .expect("forward should pass HTTP result through");
        server.join().expect("mock server");
        // 状态与 body 原样透传：分型判断归 TS/core 一处（出口唯一）
        assert_eq!(output.status, 429);
        assert!(output.body.contains("[DONE]"));
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

        let artifact = write_case_output_docx_impl(&root, "答辩意见.docx", docx)
            .expect("write output");
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
