use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

const CREDENTIAL_SERVICE: &str = "cn.courtwork.desktop.provider";
const SOURCE_ACCOUNT: &str = "active-source";
const SECRET_ACCOUNT: &str = "provider-secret";
const MIN_PASTED_LEN: usize = 8;

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum CredentialSource {
    Pasted,
    Environment,
}

/// 探针驱动三态：pending / connected / failed（D-1）。
/// 序列化字段仅 phase/source/failureMessage，永不含 secret。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CredentialStatus {
    phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<CredentialSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure_message: Option<&'static str>,
}

fn entry(account: &str) -> Result<Entry, String> {
    Entry::new(CREDENTIAL_SERVICE, account)
        .map_err(|_| "无法访问系统安全凭证库".to_string())
}

fn read_source() -> Result<Option<String>, String> {
    match entry(SOURCE_ACCOUNT)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(_) => Err("钥匙串授权未通过，请重试或重新填写".to_string()),
    }
}

fn pending() -> CredentialStatus {
    CredentialStatus {
        phase: "pending",
        source: None,
        failure_message: None,
    }
}

fn connected(source: CredentialSource) -> CredentialStatus {
    CredentialStatus {
        phase: "connected",
        source: Some(source),
        failure_message: None,
    }
}

fn failed(source: Option<CredentialSource>, message: &'static str) -> CredentialStatus {
    CredentialStatus {
        phase: "failed",
        source,
        failure_message: Some(message),
    }
}

/// 读取 + 格式校验。任何钥匙串拒绝 / 缺失密钥 → failed，绝不乐观 connected。
fn credential_status() -> Result<CredentialStatus, String> {
    let source = match read_source() {
        Ok(value) => value,
        Err(_) => {
            return Ok(failed(None, "钥匙串授权未通过，请重试或重新填写"));
        }
    };

    match source.as_deref() {
        None => Ok(pending()),
        Some("pasted") => match entry(SECRET_ACCOUNT)?.get_password() {
            Ok(secret) => {
                let trimmed = secret.trim();
                if trimmed.is_empty() || trimmed.len() < MIN_PASTED_LEN {
                    Ok(failed(
                        Some(CredentialSource::Pasted),
                        "凭证格式不正确，请检查后重新填写",
                    ))
                } else {
                    Ok(connected(CredentialSource::Pasted))
                }
            }
            Err(KeyringError::NoEntry) => Ok(pending()),
            Err(_) => Ok(failed(
                Some(CredentialSource::Pasted),
                "钥匙串授权未通过，请重试或重新填写",
            )),
        },
        Some(value) if value.starts_with("environment:") => {
            let name = &value["environment:".len()..];
            if name.is_empty() {
                return Ok(failed(
                    Some(CredentialSource::Environment),
                    "凭证格式不正确，请检查后重新填写",
                ));
            }
            match std::env::var(name) {
                Ok(resolved) if !resolved.trim().is_empty() => {
                    Ok(connected(CredentialSource::Environment))
                }
                Ok(_) => Ok(failed(
                    Some(CredentialSource::Environment),
                    "电脑中的凭证为空，请检查后重试",
                )),
                Err(_) => Ok(failed(
                    Some(CredentialSource::Environment),
                    "电脑中未找到该凭证名称，请检查后重试",
                )),
            }
        }
        _ => Ok(pending()),
    }
}

#[tauri::command]
fn provider_credential_status() -> Result<CredentialStatus, String> {
    credential_status()
}

#[tauri::command]
fn save_provider_credential(source: CredentialSource, value: String) -> Result<CredentialStatus, String> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(failed(Some(source), "凭证不能为空"));
    }

    match source {
        CredentialSource::Pasted => {
            if value.len() < MIN_PASTED_LEN {
                return Ok(failed(
                    Some(CredentialSource::Pasted),
                    "凭证格式不正确，请检查后重新填写",
                ));
            }
            if let Err(_) = entry(SECRET_ACCOUNT)?.set_password(value) {
                return Ok(failed(
                    Some(CredentialSource::Pasted),
                    "钥匙串授权未通过，请重试或重新填写",
                ));
            }
            if let Err(_) = entry(SOURCE_ACCOUNT)?.set_password("pasted") {
                return Ok(failed(
                    Some(CredentialSource::Pasted),
                    "钥匙串授权未通过，请重试或重新填写",
                ));
            }
        }
        CredentialSource::Environment => {
            if !value.bytes().enumerate().all(|(index, byte)| {
                byte == b'_' || byte.is_ascii_uppercase() || (index > 0 && byte.is_ascii_digit())
            }) {
                return Ok(failed(
                    Some(CredentialSource::Environment),
                    "凭证格式不正确，请检查后重新填写",
                ));
            }
            match std::env::var(value) {
                Err(_) => {
                    return Ok(failed(
                        Some(CredentialSource::Environment),
                        "电脑中未找到该凭证名称，请检查后重试",
                    ));
                }
                Ok(resolved) if resolved.trim().is_empty() => {
                    return Ok(failed(
                        Some(CredentialSource::Environment),
                        "电脑中的凭证为空，请检查后重试",
                    ));
                }
                Ok(_) => {}
            }
            if let Err(_) = entry(SOURCE_ACCOUNT)?.set_password(&format!("environment:{value}")) {
                return Ok(failed(
                    Some(CredentialSource::Environment),
                    "钥匙串授权未通过，请重试或重新填写",
                ));
            }
            if let Err(error) = entry(SECRET_ACCOUNT)?.delete_credential() {
                if !matches!(error, KeyringError::NoEntry) {
                    return Ok(failed(
                        Some(CredentialSource::Environment),
                        "钥匙串授权未通过，请重试或重新填写",
                    ));
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
                return Ok(failed(None, "钥匙串授权未通过，请重试或重新填写"));
            }
        }
    }
    Ok(pending())
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
        let status = connected(CredentialSource::Pasted);
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert_eq!(serialized, r#"{"phase":"connected","source":"pasted"}"#);
        assert!(!serialized.contains("secret"));
        assert!(!serialized.contains("value"));
    }

    #[test]
    fn failed_payload_carries_user_facing_message_only() {
        let status = failed(None, "钥匙串授权未通过，请重试或重新填写");
        let serialized = serde_json::to_string(&status).expect("status should serialize");
        assert!(serialized.contains("failed"));
        assert!(serialized.contains("钥匙串授权未通过"));
        assert!(!serialized.contains("Keyring"));
        assert!(!serialized.contains("password"));
    }
}
