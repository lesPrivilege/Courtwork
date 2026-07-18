import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(root, 'src');
const [main, app, credentialClient, connectionClient, credentialForm, settingsPage, rust] = await Promise.all([
  readFile(path.join(srcRoot, 'main.tsx'), 'utf8'),
  readFile(path.join(srcRoot, 'App.tsx'), 'utf8'),
  readFile(path.join(srcRoot, 'credentials/client.ts'), 'utf8'),
  readFile(path.join(srcRoot, 'provider/connection-client.ts'), 'utf8'),
  readFile(path.join(srcRoot, 'credentials/CredentialForm.tsx'), 'utf8'),
  readFile(path.join(srcRoot, 'settings/SettingsPage.tsx'), 'utf8'),
  readFile(path.join(root, 'src-tauri/src/lib.rs'), 'utf8'),
]);

const failures = [];
const hookNames = ['installCredentialTestHooks', 'installProviderConnectionTestHooks'];
const guardBody = main.match(
  /if \(import\.meta\.env\.DEV && import\.meta\.env\.VITE_COURTWORK_E2E === '1'\) \{([\s\S]*?)\n\}/,
)?.[1] ?? '';

async function sourceFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(target);
  }
  return files;
}

if (!guardBody) failures.push('credential/providerConnection hooks 缺 DEV+E2E 双门');
for (const hookName of hookNames) {
  if (!guardBody.includes(`${hookName}();`)) {
    failures.push(`${hookName} 必须只在 DEV+E2E 双门内安装`);
  }
  const callCount = [...main.matchAll(new RegExp(`^\\s*${hookName}\\(\\);`, 'gm'))].length;
  if (callCount !== 1) failures.push(`${hookName} 在 main.tsx 必须恰有一个受门调用，实际 ${callCount}`);
}

for (const file of await sourceFiles(srcRoot)) {
  if (file === path.join(srcRoot, 'main.tsx')) continue;
  const source = await readFile(file, 'utf8');
  for (const hookName of hookNames) {
    if (new RegExp(`^\\s*${hookName}\\(\\);`, 'm').test(source)) {
      failures.push(`${path.relative(srcRoot, file)} 不得安装 ${hookName}；生产组合根只允许 main.tsx`);
    }
  }
}

// KEY-PERSIST-1：启动恢复只能把 stored 交给既有真 probe；不得把「可读」直接当 ready。
const startupRestore = app.slice(
  app.indexOf('// KEY-PERSIST-1：钥匙串可读仍只是 stored'),
  app.indexOf("window.addEventListener('courtwork-credential-probe'"),
);
for (const marker of [
  "status.credential.phase !== 'stored'",
  'setCredentialProbed(true)',
  "connection: { phase: 'verifying' }",
  'providerConnectionClient.validate(modelConfig, status)',
]) {
  if (!startupRestore.includes(marker)) failures.push(`启动恢复缺 ${marker}`);
}
if (/credential\.phase\s*===\s*['"]stored['"][\s\S]{0,160}connection:\s*\{\s*phase:\s*['"]ready['"]/.test(startupRestore)) {
  failures.push('启动恢复不得把 stored 直接乐观提升为 ready');
}

// 测试预置只允许在双门安装函数内消费；生产 status 路径不得直接读 window 测试全局。
const hookInstaller = credentialClient.slice(
  credentialClient.indexOf('export function installCredentialTestHooks'),
  credentialClient.indexOf('function normalizeStatus'),
);
const statusMethod = credentialClient.slice(
  credentialClient.indexOf('async status()'),
  credentialClient.indexOf('async save('),
);
if (!hookInstaller.includes('__CW_FORCE_CREDENTIAL__')) failures.push('credential E2E seed 必须由双门 hook 安装函数消费');
if (statusMethod.includes('__CW_FORCE_CREDENTIAL__')) failures.push('生产 credential status 不得直读 E2E window seed');
if ((credentialClient.match(/\)\.__CW_FORCE_CREDENTIAL__/g) ?? []).length !== 1) failures.push('credential E2E seed 属性读取必须恰好一个');

// 不变量 8：前端凭证链不得持久、记录或通过 CustomEvent detail 携带输入值。
const frontendCredentialBoundary = [credentialClient, connectionClient, credentialForm, settingsPage].join('\n');
for (const forbidden of ['localStorage', 'sessionStorage', 'console.log', 'console.info', 'console.warn', 'console.error']) {
  if (frontendCredentialBoundary.includes(forbidden)) failures.push(`前端凭证链禁止 ${forbidden}`);
}
if (/CustomEvent\([^)]*\{\s*detail\s*:/.test(frontendCredentialBoundary)) failures.push('凭证事件不得携带 detail/secret');
if (/invoke(?:<[^>]+>)?\(['"](?:read|get)_[^'"]*(?:credential|secret|key)/i.test(frontendCredentialBoundary)) {
  failures.push('WebView 不得新增凭证明文读取命令');
}

// Settings 必须正交显示「已保存」与连接态，并把清除接到既有宿主 command。
for (const marker of ['settings-credential-storage', 'settings-clear-credential', 'credentialClient.clear()']) {
  if (!settingsPage.includes(marker)) failures.push(`Settings 凭证管理缺 ${marker}`);
}
for (const account of ['CREDENTIAL_ACCOUNT', 'LEGACY_SOURCE_ACCOUNT', 'LEGACY_SECRET_ACCOUNT']) {
  if (!rust.includes(account)) failures.push(`Rust 清除目标缺 ${account}`);
}
if (!rust.includes('clear_all_credential_accounts(delete_credential_ignore_missing)')) {
  failures.push('Rust clear command 必须消费可测试的三条目删除核心');
}

const handleChatSend = app.slice(app.indexOf('const handleChatSend ='), app.indexOf('const stopChatTurn ='));
if (!/const handleChatSend = \(payload: ComposerSendPayload\) =>/.test(handleChatSend)) {
  failures.push('handleChatSend 必须移除未消费的 workContextSegment 参数');
}
if (handleChatSend.includes('workContextSegment')) {
  failures.push('handleChatSend 内不得残留 workContextSegment 死透传');
}

if (failures.length > 0) {
  console.error(`AUDIT-SEAL-2 credential/demo boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('AUDIT-SEAL-2 + KEY-PERSIST-1 credential persistence/security boundaries passed');
