//! MATERIAL-INGRESS-1：材料元数据宿主持久 + 原件再读（ADR-010 决定四）。
//!
//! 契约红线：
//! - 原件永远只读、原地不动（grant root 之下）；本模块只持久元数据到 app-data，绝不写用户案件目录。
//! - 磁盘记录含来源 provenance（grantId/relativePath），但对 renderer 的投影 [`MaterialWire`]
//!   严格 source-neutral：剥离 grantId/relativePath，wire 永不携带路径（ADR-010 决定四）。
//! - 跨 case 引用 fail-closed：按 (caseId, materialId) 取记录，caseId 不匹配即当作不存在/越权。
//! - ReadingView 派生内容（reading-view 在 TS 侧确定性产生）随元数据一并持久；哈希比对与再派生
//!   由 TS 独占（Rust 不理解 reading-view 语义），本模块只做记录 CAS 与按 provenance 再读原件字节。
//! - 纯逻辑注入 `materials_dir`/`grant_store` 参数，可无宿主直接单测；AppHandle 取用留在 `lib.rs`。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::host_auth::{self, HostAuthReason, ReadOutcome};

/// 文本层块（引用公证基底），由 reading-view 段落 1:1 派生（TS 计算，本模块只搬运持久）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialBlock {
    pub block_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub page: Option<u32>,
    pub text: String,
    pub range_base: u32,
    pub text_layer_version: String,
}

/// 磁盘记录（app-data 内，含 provenance grantId/relativePath；**永不入 renderer wire**）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRecord {
    pub material_id: String,
    pub case_id: String,
    /// 来源授权引用（provenance，宿主独占）。
    pub grant_id: String,
    /// 原件在 grant root 下的相对寻址（provenance，宿主独占；再读原件字节即用此）。
    pub relative_path: String,
    pub file_name: String,
    pub media_type: String,
    pub byte_length: u64,
    pub content_sha256: String,
    pub reading_view_version: String,
    pub reading_view_sha256: String,
    pub reading_markdown: String,
    pub blocks: Vec<MaterialBlock>,
    /// ready | needs_ocr | rejected（枚举语义由 TS 裁定，本模块不解析 reading-view）。
    pub status: String,
}

/// 对 renderer 的 source-neutral 投影：剥离 grantId/relativePath provenance。
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialWire {
    pub material_id: String,
    pub case_id: String,
    pub file_name: String,
    pub media_type: String,
    pub byte_length: u64,
    pub content_sha256: String,
    pub reading_view_version: String,
    pub reading_view_sha256: String,
    pub reading_markdown: String,
    pub blocks: Vec<MaterialBlock>,
    pub status: String,
}

impl MaterialRecord {
    fn to_wire(&self) -> MaterialWire {
        MaterialWire {
            material_id: self.material_id.clone(),
            case_id: self.case_id.clone(),
            file_name: self.file_name.clone(),
            media_type: self.media_type.clone(),
            byte_length: self.byte_length,
            content_sha256: self.content_sha256.clone(),
            reading_view_version: self.reading_view_version.clone(),
            reading_view_sha256: self.reading_view_sha256.clone(),
            reading_markdown: self.reading_markdown.clone(),
            blocks: self.blocks.clone(),
            status: self.status.clone(),
        }
    }
}

/// 安全文件名 token：单一 normal 组件，拒空、`.`、`..`、路径分隔、`..` 子串与超长。
/// materialId 由 TS 铸造为安全 token（`mat-…`）；此处仍防御性校验，杜绝越权写别处。
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

fn atomic_write_string(target: &Path, payload: &str) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|_| "无法创建材料记录目录".to_string())?;
    }
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let temporary = target.with_extension(format!("{}.tmp", nonce));
    fs::write(&temporary, payload).map_err(|_| "无法写入材料记录".to_string())?;
    fs::rename(&temporary, target).map_err(|_| {
        let _ = fs::remove_file(&temporary);
        "无法提交材料记录".to_string()
    })?;
    Ok(())
}

/// 原子持久一条材料记录到 `<materials_dir>/<materialId>.json`。materialId 非法 token → 显式错误。
pub fn put_material(materials_dir: &Path, record: &MaterialRecord) -> Result<(), String> {
    if !safe_token(&record.material_id) {
        return Err("材料标识非法".to_string());
    }
    let payload = serde_json::to_string(record).map_err(|_| "无法序列化材料记录".to_string())?;
    let target = materials_dir.join(format!("{}.json", record.material_id));
    atomic_write_string(&target, &payload)
}

/// 加载磁盘记录（token 非法或缺失/损坏 → None，诚实报「无此记录」，绝不 fatal）。
fn load_record(materials_dir: &Path, material_id: &str) -> Option<MaterialRecord> {
    if !safe_token(material_id) {
        return None;
    }
    let path = materials_dir.join(format!("{material_id}.json"));
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

/// 按 (caseId, materialId) 取 source-neutral 投影。跨 case 不匹配 → None（fail-closed）。
pub fn get_material(materials_dir: &Path, case_id: &str, material_id: &str) -> Option<MaterialWire> {
    let record = load_record(materials_dir, material_id)?;
    if record.case_id != case_id {
        return None; // 跨 case fail-closed：case A 的 materialId 在 case B 视作不存在
    }
    Some(record.to_wire())
}

/// provider 前漂移/删除检测的字节源：按 provenance 再读原件。
/// 记录缺失 → revoked；跨 case → out_of_scope；否则委托 host_auth 作用域内读（删除/卸载 → unavailable）。
pub fn read_original(
    grant_store: &Path,
    materials_dir: &Path,
    case_id: &str,
    material_id: &str,
) -> ReadOutcome {
    let Some(record) = load_record(materials_dir, material_id) else {
        return ReadOutcome::Failed {
            reason: HostAuthReason::Revoked,
        };
    };
    if record.case_id != case_id {
        return ReadOutcome::Failed {
            reason: HostAuthReason::OutOfScope,
        };
    }
    host_auth::read_in_grant(grant_store, &record.grant_id, &record.relative_path)
}

/// 列本 case 的材料 source-neutral 投影（重启后原件列表真源）；目录缺失/损坏项跳过，不 fatal。
pub fn list_materials(materials_dir: &Path, case_id: &str) -> Vec<MaterialWire> {
    let Ok(read) = fs::read_dir(materials_dir) else {
        return Vec::new();
    };
    let mut out: Vec<MaterialWire> = Vec::new();
    for item in read.flatten() {
        let path = item.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(record) = serde_json::from_str::<MaterialRecord>(&raw) {
                if record.case_id == case_id {
                    out.push(record.to_wire());
                }
            }
        }
    }
    out.sort_by(|a, b| a.material_id.cmp(&b.material_id));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn temp_dir(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "courtwork-material-{tag}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&base).expect("create temp dir");
        base
    }

    fn sample_record(material_id: &str, case_id: &str, grant_id: &str, relative: &str) -> MaterialRecord {
        MaterialRecord {
            material_id: material_id.into(),
            case_id: case_id.into(),
            grant_id: grant_id.into(),
            relative_path: relative.into(),
            file_name: "合同.md".into(),
            media_type: "text/markdown".into(),
            byte_length: 8,
            content_sha256: "abc123".into(),
            reading_view_version: "reading-view-material@1".into(),
            reading_view_sha256: "def456".into(),
            reading_markdown: "# 合同".into(),
            blocks: vec![MaterialBlock {
                block_id: "0".into(),
                page: None,
                text: "合同".into(),
                range_base: 0,
                text_layer_version: "source-text@1+deadbeef".into(),
            }],
            status: "ready".into(),
        }
    }

    #[test]
    fn put_then_get_round_trips_source_neutral() {
        let dir = temp_dir("roundtrip");
        let record = sample_record("mat-1", "case-a", "grant-a", "材料/合同.md");
        put_material(&dir, &record).expect("put");
        let wire = get_material(&dir, "case-a", "mat-1").expect("get");
        assert_eq!(wire.material_id, "mat-1");
        assert_eq!(wire.status, "ready");
        assert_eq!(wire.reading_markdown, "# 合同");
        // wire 剥离 provenance：无 grantId/relativePath/绝对路径
        let serialized = serde_json::to_string(&wire).expect("serialize wire");
        assert!(!serialized.contains("grantId"), "wire 泄漏 grantId");
        assert!(!serialized.contains("relativePath"), "wire 泄漏 relativePath");
        assert!(!serialized.contains("grant-a"));
        assert!(!serialized.contains("材料/"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn get_cross_case_is_none_fail_closed() {
        let dir = temp_dir("cross-case");
        put_material(&dir, &sample_record("mat-1", "case-a", "grant-a", "合同.md")).expect("put");
        // case B 用 case A 的 materialId → fail-closed（视作不存在）
        assert!(get_material(&dir, "case-b", "mat-1").is_none());
        // 本 case 正常可取
        assert!(get_material(&dir, "case-a", "mat-1").is_some());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn get_unknown_material_is_none() {
        let dir = temp_dir("unknown");
        assert!(get_material(&dir, "case-a", "mat-nope").is_none());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn safe_token_rejects_traversal_on_put_and_get() {
        let dir = temp_dir("token");
        let mut evil = sample_record("../evil", "case-a", "grant-a", "合同.md");
        evil.material_id = "../evil".into();
        assert!(put_material(&dir, &evil).is_err(), "traversal materialId 必须拒绝");
        assert!(get_material(&dir, "case-a", "../evil").is_none());
        assert!(get_material(&dir, "case-a", "..").is_none());
        // 目录内未落任何越权文件
        assert!(!dir.parent().unwrap().join("evil.json").exists());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn corrupt_record_is_none_not_fatal() {
        let dir = temp_dir("corrupt");
        fs::write(dir.join("mat-x.json"), b"not-json{{{").expect("write corrupt");
        assert!(get_material(&dir, "case-a", "mat-x").is_none());
        assert!(list_materials(&dir, "case-a").is_empty());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_materials_filters_by_case_and_survives_restart() {
        let dir = temp_dir("list");
        put_material(&dir, &sample_record("mat-1", "case-a", "grant-a", "1.md")).expect("put1");
        put_material(&dir, &sample_record("mat-2", "case-a", "grant-a", "2.md")).expect("put2");
        put_material(&dir, &sample_record("mat-3", "case-b", "grant-b", "3.md")).expect("put3");
        // 重启即新读磁盘（无内存态）：case A 仅见自己两件，case B 一件
        let case_a: Vec<String> = list_materials(&dir, "case-a")
            .into_iter()
            .map(|m| m.material_id)
            .collect();
        assert_eq!(case_a, vec!["mat-1".to_string(), "mat-2".to_string()]);
        assert_eq!(list_materials(&dir, "case-b").len(), 1);
        // list 投影亦 source-neutral
        let serialized = serde_json::to_string(&list_materials(&dir, "case-a")).expect("serialize");
        assert!(!serialized.contains("grantId"));
        assert!(!serialized.contains("relativePath"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_original_returns_bytes_then_fails_on_delete_and_cross_case() {
        // 端到端 provenance 再读：授权真实 grant → 落原件 → put 记录 → 再读命中；
        // 删原件 → unavailable；跨 case → out_of_scope；记录缺失 → revoked。
        let base = temp_dir("read-original");
        let grant_root = base.join("case-folder");
        fs::create_dir_all(&grant_root).expect("grant root");
        fs::write(grant_root.join("合同.md"), b"contract-bytes").expect("original");
        let grant_store = base.join("host-grants.json");
        let grant = match host_auth::authorize_from_pick(&grant_store, Some(grant_root.clone()), 1, 1) {
            host_auth::AuthorizeOutcome::Granted { grant } => grant,
            host_auth::AuthorizeOutcome::Failed { reason } => panic!("grant: {reason:?}"),
        };
        let materials_dir = base.join("materials");
        let record = sample_record("mat-1", "case-a", &grant.grant_id, "合同.md");
        put_material(&materials_dir, &record).expect("put");

        // 命中：字节即原件
        match read_original(&grant_store, &materials_dir, "case-a", "mat-1") {
            ReadOutcome::Read { bytes } => assert_eq!(bytes, b"contract-bytes"),
            ReadOutcome::Failed { reason } => panic!("expected read, got {reason:?}"),
        }
        // 跨 case → out_of_scope（绝不返回别案原件）
        assert!(matches!(
            read_original(&grant_store, &materials_dir, "case-b", "mat-1"),
            ReadOutcome::Failed {
                reason: HostAuthReason::OutOfScope
            }
        ));
        // 记录缺失 → revoked
        assert!(matches!(
            read_original(&grant_store, &materials_dir, "case-a", "mat-nope"),
            ReadOutcome::Failed {
                reason: HostAuthReason::Revoked
            }
        ));
        // 原件被删 → unavailable（显式失败，非静默）
        fs::remove_file(grant_root.join("合同.md")).expect("delete original");
        assert!(matches!(
            read_original(&grant_store, &materials_dir, "case-a", "mat-1"),
            ReadOutcome::Failed {
                reason: HostAuthReason::Unavailable
            }
        ));
        fs::remove_dir_all(&base).ok();
    }
}
