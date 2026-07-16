import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// MATERIAL-INGRESS-1 边界守卫（ADR-010 决定四）：
// - MaterialRef / StoredMaterial / Rust MaterialWire 严格 source-neutral：wire 不携带绝对/相对路径
//   与来源 provenance（grantId/relativePath），经 materialId 引用；
// - 来源 provenance 只住宿主：磁盘记录 MaterialRecord 含 grantId/relativePath，但 material_get/list 的
//   对外投影是 MaterialWire（剥离 provenance）；
// - MaterialStore 经 composition root 注入，非模块 singleton；浏览器桩仅 DEV+E2E 装配；
// - provider 前阻断原因是闭集（漂移/删除/需 OCR/跨 case…）且有可见文案，无 demo 回落；
// - demo 案不走生产 store（双向隔离）；哈希用 Web Crypto（浏览器壳可打包），不 node:crypto。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [ref, store, sha256, tauriHost, rust, lib, app, main, materialsZone] = await Promise.all([
  read('src/material/material-ref.ts'),
  read('src/material/material-store.ts'),
  read('src/material/sha256.ts'),
  read('src/material/tauri-material-host.ts'),
  read('src-tauri/src/material_store.rs'),
  read('src-tauri/src/lib.rs'),
  read('src/App.tsx'),
  read('src/main.tsx'),
  read('src/system/MaterialsZone.tsx'),
]);

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// ── MaterialRef / StoredMaterial source-neutral（无路径/provenance 字段）──────
const refBody = ref.match(/export interface MaterialRef \{([\s\S]*?)\}/)?.[1] ?? '';
requireMatch(ref, /export interface MaterialRef \{/, 'MaterialRef 类型缺失');
for (const banned of ['grantId', 'relativePath', 'absolutePath', 'folderPath']) {
  if (new RegExp(`\\b${banned}\\b`).test(refBody)) {
    failures.push(`MaterialRef 不得携带来源/路径字段 ${banned}（source-neutral 红线）`);
  }
}
if (/[^a-zA-Z]path[^a-zA-Z]|\bpath\b/i.test(refBody)) {
  failures.push('MaterialRef 不得携带任何 path 字段（经 materialId 引用）');
}
const storedBody = ref.match(/export interface StoredMaterial extends MaterialRef \{([\s\S]*?)\}/)?.[1] ?? '';
requireMatch(ref, /export interface StoredMaterial extends MaterialRef/, 'StoredMaterial 类型缺失');
for (const banned of ['grantId', 'relativePath', 'absolutePath', 'folderPath']) {
  if (new RegExp(`\\b${banned}\\b`).test(storedBody)) {
    failures.push(`StoredMaterial 不得携带来源/路径字段 ${banned}`);
  }
}

// ── provider 前阻断原因闭集 + 可见文案 ────────────────────────────────
for (const reason of [
  'content_drift',
  'reading_drift',
  'unavailable',
  'revoked',
  'out_of_scope',
  'needs_ocr',
  'rejected',
  'not_found',
]) {
  requireMatch(ref, new RegExp(`\\b${reason}\\b`), `MaterialBlockReason 闭集缺 ${reason}`);
  requireMatch(ref, new RegExp(`${reason}:`), `MATERIAL_BLOCK_REASON_COPY 缺 ${reason} 文案`);
}

// ── Rust 对外投影 MaterialWire 剥离 provenance；含 provenance 的记录不入 get/list ─────
const wireStruct = rust.match(/pub struct MaterialWire \{[\s\S]*?\n\}/)?.[0] ?? '';
requireMatch(wireStruct, /material_id: String/, 'Rust MaterialWire 缺 material_id');
for (const banned of ['grant_id', 'relative_path']) {
  forbidMatch(wireStruct, new RegExp(`\\b${banned}\\b`), `Rust MaterialWire 不得携带来源 provenance ${banned}`);
}
// 磁盘记录含 provenance（宿主独占）——存在即证明 provenance 有落点但不入 wire。
requireMatch(rust, /struct MaterialRecord \{[\s\S]*?grant_id: String,[\s\S]*?relative_path: String,/, 'MaterialRecord 必须持 grantId/relativePath provenance（宿主侧）');
// 对外命令只回 MaterialWire，绝不回携带 provenance 的 MaterialRecord。
requireMatch(lib, /fn material_get\([\s\S]*?-> Result<Option<material_store::MaterialWire>/, 'material_get 必须回 source-neutral MaterialWire');
requireMatch(lib, /fn material_list\([\s\S]*?-> Result<Vec<material_store::MaterialWire>/, 'material_list 必须回 source-neutral MaterialWire');
// 跨 case fail-closed：get/read_original 按 case_id 匹配。
requireMatch(rust, /if record\.case_id != case_id/, 'material_store 必须跨 case fail-closed（case_id 不匹配即拒）');

// ── Rust 命令注册齐备 ─────────────────────────────────────────────────
for (const command of ['host_list_dir', 'material_put', 'material_get', 'material_list', 'material_read_original']) {
  requireMatch(lib, new RegExp(`${command},`), `lib.rs invoke_handler 必须注册 ${command}`);
}

// ── MaterialStore 经 composition root 注入，非模块 singleton ────────────
requireMatch(app, /materialStore: MaterialStore/, 'AppProps 必须要求注入的 MaterialStore');
forbidMatch(app, /new MaterialStore\(|createTauriMaterialHost|createBrowserMaterialHost/, 'App 不得自行构造 MaterialStore/适配器（须由 composition root 注入）');
requireMatch(main, /new MaterialStore\(/, 'main composition root 必须构造 MaterialStore');
requireMatch(main, /createTauriMaterialHost\(/, 'main 必须在 Tauri 环境构造 Tauri 材料宿主');
requireMatch(main, /createBrowserMaterialHost\(/, 'main 必须在非 Tauri 环境构造 browser 内存宿主');
requireMatch(main, /materialStore=\{materialStore\}/, 'main 必须显式注入 materialStore');
requireMatch(main, /VITE_COURTWORK_E2E === '1'[\s\S]*installMaterialHostTestHooks\(\)/, 'material 测试 hook 必须仅在 DEV+E2E 装配');

// ── demo 双向隔离：ingest 与 resolveForProvider 拒绝 demo 案 ────────────
requireMatch(store, /isDemoCaseId/, 'material-store 必须以 isDemoCaseId 阻断 demo 案（双向隔离）');
const ingestBody = store.match(/async ingest\([\s\S]*?\n {2}\}/)?.[0] ?? '';
requireMatch(ingestBody, /isDemoCaseId\(caseId\)/, 'ingest 必须拒绝 demo 案');
const resolveBody = store.match(/async resolveForProvider\([\s\S]*?\n {2}\}/)?.[0] ?? '';
requireMatch(resolveBody, /isDemoCaseId\(caseId\)/, 'resolveForProvider 必须拒绝 demo 案');

// ── 无 demo 依赖；哈希浏览器安全；tauri 适配器动态 import ────────────────
for (const [name, source] of [
  ['material-ref.ts', ref],
  ['material-store.ts', store],
  ['sha256.ts', sha256],
  ['MaterialsZone.tsx', materialsZone],
]) {
  forbidMatch(source, /@courtwork\/demo-data|from ['"]\.\.?\/demo\//, `${name} 不得依赖 demo`);
}
forbidMatch(sha256, /from ['"]node:crypto['"]|require\(['"]node:crypto|createHash\(/, 'sha256 必须用 Web Crypto（浏览器壳可打包），不得 import node:crypto/createHash');
requireMatch(sha256, /crypto\.subtle\.digest\('SHA-256'/, 'sha256 必须用 crypto.subtle 真 SHA-256');
requireMatch(tauriHost, /import\(['"]@tauri-apps\/api\/core['"]\)/, 'tauri 材料适配器必须动态 import @tauri-apps');
forbidMatch(store, /from ['"]@tauri-apps\//, 'material-store 不得静态依赖 @tauri-apps');
// 原件区只读、source-neutral（无绝对路径/provenance 通道）。
forbidMatch(materialsZone, /absolutePath|relativePath|caseRoot|grantId/, 'MaterialsZone 不得出现路径/provenance 通道');
requireMatch(materialsZone, /data-readonly="true"/, 'MaterialsZone 必须标记只读（原件只读红线）');

if (failures.length > 0) {
  console.error(`MATERIAL-INGRESS-1 boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MATERIAL-INGRESS-1 boundary checks passed');
