import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// HOST-AUTH-LITE + CASE-ROOT-1 边界守卫：
// - renderer 只见 opaque grantId + label，绝无绝对路径通道（含案件根：无 folderPath、无绝对 caseRoot）；
// - HostAuthPort 经 composition root 注入，非模块 singleton；
// - 失败分类是闭集四值；
// - 无 demo 回落；
// - webkitdirectory 生产入口退役（ADR-010 决定四禁令），扫描生产源码零出现。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

/** 递归收集 src/ 下的生产 .ts/.tsx（排除 *.test.* / *.spec.*）。 */
function collectProductionSources(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectProductionSources(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const [port, browser, tauri, panel, app, main, rust, lib, caseTypes, caseScope, newCaseDialog, caseOutput] =
  await Promise.all([
    read('src/host/host-auth-port.ts'),
    read('src/host/browser-host-auth.ts'),
    read('src/host/tauri-host-auth.ts'),
    read('src/host/HostAccessPanel.tsx'),
    read('src/App.tsx'),
    read('src/main.tsx'),
    read('src-tauri/src/host_auth.rs'),
    read('src-tauri/src/lib.rs'),
    read('src/case/types.ts'),
    read('src/case/case-scope.ts'),
    read('src/case/NewCaseDialog.tsx'),
    read('src/output/case-output-client.ts'),
  ]);

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// ── 闭集失败分类（renderer 与 Rust 同词）──────────────────────────────
requireMatch(
  port,
  /export type HostAuthReason =\s*'denied' \| 'revoked' \| 'unavailable' \| 'out_of_scope';/,
  'HostAuthReason 必须是 denied|revoked|unavailable|out_of_scope 闭集',
);
requireMatch(
  port,
  /HOST_AUTH_REASONS =\s*\['denied', 'revoked', 'unavailable', 'out_of_scope'\] as const/,
  'HOST_AUTH_REASONS 闭集清单缺失或漂移',
);
for (const reason of ['denied', 'revoked', 'unavailable', 'out_of_scope']) {
  requireMatch(port, new RegExp(`\\b${reason}:`), `HOST_AUTH_REASON_COPY 缺 ${reason} 文案`);
}
requireMatch(
  rust,
  /enum HostAuthReason \{\s*[^}]*Denied,[^}]*Revoked,[^}]*Unavailable,[^}]*OutOfScope,/s,
  'Rust HostAuthReason 闭集四值缺失或漂移',
);

// ── 绝对路径不得进入 renderer 可见状态 ────────────────────────────────
const rendererFiles = [
  ['host-auth-port.ts', port],
  ['browser-host-auth.ts', browser],
  ['tauri-host-auth.ts', tauri],
  ['HostAccessPanel.tsx', panel],
];
for (const [name, source] of rendererFiles) {
  forbidMatch(source, /absolutePath|caseRoot|app_data_dir/, `${name} 不得出现绝对路径通道`);
}
// 对外 HostGrant 只含 grantId + label
requireMatch(
  port,
  /export interface HostGrant \{\s*grantId: string;\s*label: string;\s*\}/,
  '对外 HostGrant 只允许 grantId + label',
);
// Rust 对外 HostGrant（pub struct）不得携带 path；含 path 的记录 struct 必须非 pub
const publicGrant = rust.match(/pub struct HostGrant \{[^}]*\}/s)?.[0] ?? '';
requireMatch(publicGrant, /grant_id: String/, 'Rust pub HostGrant 缺 grant_id');
requireMatch(publicGrant, /label: String/, 'Rust pub HostGrant 缺 label');
forbidMatch(publicGrant, /\bpath\b/, 'Rust 对外 HostGrant 不得携带绝对路径字段');
forbidMatch(rust, /pub struct GrantRecordEntry/, '含绝对路径的 GrantRecordEntry 必须非 pub（不出宿主）');

// ── HostAuthPort 经 composition root 注入，非模块 singleton ────────────
requireMatch(app, /hostAuth: HostAuthPort/, 'AppProps 必须要求注入的 HostAuthPort');
requireMatch(app, /hostAuth=\{hostAuth\}/, 'App 必须把注入的 hostAuth 透传给 Settings');
forbidMatch(
  app,
  /createTauriHostAuth|createBrowserHostAuth/,
  'App 不得自行构造宿主授权适配器（须由 composition root 注入）',
);
requireMatch(main, /createTauriHostAuth\(/, 'main composition root 必须构造 Tauri 宿主授权适配器');
requireMatch(main, /createBrowserHostAuth\(/, 'main 必须在非 Tauri 环境构造 browser 樁');
requireMatch(main, /hostAuth=\{hostAuth\}/, 'main 必须显式注入 hostAuth');
requireMatch(
  main,
  /VITE_COURTWORK_E2E === '1'[\s\S]*installHostAuthTestHooks\(\)/,
  'host-auth 测试 hook 必须仅在 DEV+E2E 装配',
);

// ── 无 demo 回落，无静态 Tauri 依赖泄漏 ───────────────────────────────
requireMatch(
  browser,
  /authorize:\s*\{ status: 'failed', reason: 'denied' \}/,
  'browser 樁默认必须是诚实 denied，不得 demo 回落',
);
for (const [name, source] of [
  ['host-auth-port.ts', port],
  ['browser-host-auth.ts', browser],
  ['HostAccessPanel.tsx', panel],
]) {
  forbidMatch(source, /@courtwork\/demo-data|from ['"]\.\.?\/demo\//, `${name} 不得依赖 demo`);
  forbidMatch(source, /from ['"]@tauri-apps\//, `${name} 不得静态依赖 @tauri-apps（只允许 tauri 适配器动态 import）`);
}
requireMatch(tauri, /import\(['"]@tauri-apps\/api\/core['"]\)/, 'tauri 适配器必须动态 import @tauri-apps');

// ── Rust 命令注册齐备 ─────────────────────────────────────────────────
for (const command of ['host_authorize_folder', 'host_list_grants', 'host_read_file', 'host_write_file']) {
  requireMatch(lib, new RegExp(`${command},`), `lib.rs invoke_handler 必须注册 ${command}`);
}

// ── CASE-ROOT-1：案件根是 opaque grantId 引用，renderer/wire 零绝对路径 ─────
// CaseSummary 退役 folderPath 字段，改持 opaque grantId；注入 folderPath/绝对路径字段即红。
forbidMatch(caseTypes, /folderPath\s*[?:]/, 'CaseSummary 不得携带 folderPath（绝对路径字段已退役）');
forbidMatch(caseTypes, /\bcaseRoot\s*[?:]|absolutePath\s*[?:]/, 'CaseSummary 不得携带 caseRoot/absolutePath 绝对路径字段');
requireMatch(caseTypes, /grantId\?: string/, 'CaseSummary 必须以 opaque grantId 承载案件根引用');
// 案件根解析返回 opaque 绑定，不再返回绝对路径；resolveCaseRoot 必须退役。
requireMatch(caseScope, /export function resolveCaseBinding/, 'case-scope 必须以 resolveCaseBinding 提供 opaque 绑定');
forbidMatch(caseScope, /export function resolveCaseRoot/, 'resolveCaseRoot（绝对路径解析）必须退役');
// case 输出客户端只按 opaque 绑定寻址，不出现绝对路径/caseRoot 通道。
forbidMatch(caseOutput, /absolutePath|caseRoot/, 'case-output-client 不得出现绝对路径/caseRoot 通道');
requireMatch(caseOutput, /CaseBinding/, 'case-output-client 必须按 opaque CaseBinding 寻址');
// 新建案件经注入的宿主授权取文件夹，不自造浏览器 file/目录控件。
forbidMatch(newCaseDialog, /type="file"|webkitdirectory/, 'NewCaseDialog 不得用浏览器 file/目录控件（须经 hostAuth picker）');
requireMatch(newCaseDialog, /onAuthorizeFolder/, 'NewCaseDialog 必须经注入的 onAuthorizeFolder（hostAuth）取授权');

// ── webkitdirectory 生产入口退役防回归：扫描 src/ 生产源码零出现 ───────────
for (const file of collectProductionSources(path.join(root, 'src'))) {
  if (readFileSync(file, 'utf8').includes('webkitdirectory')) {
    failures.push(`webkitdirectory 生产入口必须退役（命中 ${path.relative(root, file)}）`);
  }
}

if (failures.length > 0) {
  console.error(`HOST-AUTH-LITE boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('HOST-AUTH-LITE boundary checks passed');
