use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider";
const SOURCE_ACCOUNT: &str = "active-source";
const SECRET_ACCOUNT: &str = "provider-secret";

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum CredentialSource {
    Pasted,
    Environment,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CredentialStatus {
    configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<CredentialSource>,
}

fn entry(account: &str) -> Result<Entry, String> {
    Entry::new(CREDENTIAL_SERVICE, account)
        .map_err(|_| "无法访问系统安全凭证库".to_string())
}

fn read_source() -> Result<Option<String>, String> {
    match entry(SOURCE_ACCOUNT)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(_) => Err("无法读取凭证配置".to_string()),
    }
}

fn credential_status() -> Result<CredentialStatus, String> {
    let source = read_source()?;
    let status = match source.as_deref() {
        Some("pasted") => CredentialStatus {
            configured: entry(SECRET_ACCOUNT)?.get_password().is_ok(),
            source: Some(CredentialSource::Pasted),
        },
        Some(value) if value.starts_with("environment:") => CredentialStatus {
            configured: true,
            source: Some(CredentialSource::Environment),
        },
        _ => CredentialStatus { configured: false, source: None },
    };
    Ok(status)
}

#[tauri::command]
fn provider_credential_status() -> Result<CredentialStatus, String> {
    credential_status()
}

#[tauri::command]
fn save_provider_credential(source: CredentialSource, value: String) -> Result<CredentialStatus, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("凭证不能为空".to_string());
    }

    match source {
        CredentialSource::Pasted => {
            entry(SECRET_ACCOUNT)?.set_password(value)
                .map_err(|_| "无法安全保存凭证".to_string())?;
            entry(SOURCE_ACCOUNT)?.set_password("pasted")
                .map_err(|_| "无法保存凭证来源".to_string())?;
        }
        CredentialSource::Environment => {
            if !value.bytes().enumerate().all(|(index, byte)| {
                byte == b'_' || byte.is_ascii_uppercase() || (index > 0 && byte.is_ascii_digit())
            }) {
                return Err("凭证名称格式不正确".to_string());
            }
            let resolved = std::env::var(value).map_err(|_| "电脑中未找到该凭证名称".to_string())?;
            if resolved.trim().is_empty() {
                return Err("电脑中的凭证为空".to_string());
            }
            entry(SOURCE_ACCOUNT)?.set_password(&format!("environment:{value}"))
                .map_err(|_| "无法保存凭证来源".to_string())?;
            if let Err(error) = entry(SECRET_ACCOUNT)?.delete_credential() {
                if !matches!(error, KeyringError::NoEntry) {
                    return Err("无法更新凭证来源".to_string());
                }
            }
        }
    }

    credential_status()
}

#[tauri::command]
fn clear_provider_credential() -> Result<CredentialStatus, String> {
    for account in [SOURCE_ACCOUNT, SECRET_ACCOUNT] {
        if let Err(error) = entry(account)?.delete_credential() {
            if !matches!(error, KeyringError::NoEntry) {
                return Err("无法移除凭证".to_string());
            }
        }
    }
    Ok(CredentialStatus { configured: false, source: None })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // F-3：仅注册 opener 的 open/reveal 动词；任意 shell 执行不在能力面。
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            provider_credential_status,
            save_provider_credential,
            clear_provider_credential,
        ])
        .run(tauri::generate_context!())
        .expect("Courtwork 桌面应用启动失败");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_payload_contains_no_secret_field() {
        let status = CredentialStatus { configured: true, source: Some(CredentialSource::Pasted) };
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert_eq!(serialized, r#"{"configured":true,"source":"pasted"}"#);
        assert!(!serialized.contains("secret"));
        assert!(!serialized.contains("value"));
    }
}
