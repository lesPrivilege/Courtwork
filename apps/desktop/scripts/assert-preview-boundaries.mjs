import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'src');

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(path.join(dir, entry.name))
    : [path.join(dir, entry.name)]))).flat().filter((file) => /\.(ts|tsx)$/.test(file));
}

const utilityFiles = await files(path.join(root, 'rail'));
const rendererFiles = await files(path.join(root, 'preview', 'renderers'));
const failures = [];

for (const file of utilityFiles) {
  if (/from\s+['"][^'"]*preview\/renderers/.test(await readFile(file, 'utf8'))) failures.push(`${file}: utility -> renderer import`);
}
for (const file of rendererFiles) {
  if (/from\s+['"][^'"]*\/rail\//.test(await readFile(file, 'utf8'))) failures.push(`${file}: renderer -> rail import`);
}

const host = await readFile(path.join(root, 'preview', 'PreviewHost.tsx'), 'utf8');
if (/(法律|案件|卷宗|合同|风险|修订)/.test(host)) failures.push('PreviewHost.tsx: host contains domain semantics');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Preview host/import boundaries: OK');
