import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(root, 'src');
const main = await readFile(path.join(srcRoot, 'main.tsx'), 'utf8');
const app = await readFile(path.join(srcRoot, 'App.tsx'), 'utf8');

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

console.log('AUDIT-SEAL-2 credential hooks and dead-parameter boundaries passed');
