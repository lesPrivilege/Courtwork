import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateIsolationBinding } from './isolation-binding-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');

const adrPath = path.join(repositoryRoot, 'docs', 'decisions', 'ADR-018-execution-isolation-and-sandbox.md');
const evidencePath = path.join(repositoryRoot, 'docs', 'engineering', 'sandbox-probe-1.md');
const hostSourceDir = path.join(repositoryRoot, 'apps', 'desktop', 'src-tauri', 'src');

const adrText = fs.readFileSync(adrPath, 'utf8');
const evidenceText = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : null;
const sources = Object.fromEntries(
  fs
    .readdirSync(hostSourceDir)
    .filter((file) => file.endsWith('.rs'))
    .map((file) => [
      path.posix.join('apps/desktop/src-tauri/src', file),
      fs.readFileSync(path.join(hostSourceDir, file), 'utf8'),
    ]),
);

if (Object.keys(sources).length === 0) {
  console.error('isolation-binding: 宿主源码目录扫不到任何 .rs——扫描面失效，按红处理');
  process.exit(1);
}

/** pi lane 的 Node 侧扫描面（ADR-022 修订记录 2026-07-27 随 `PI-LANE-1` 扩入）。 */
const piLaneSourceDir = path.join(repositoryRoot, 'packages', 'pi-lane', 'src');

function collectTypeScriptSources(directory, relativePrefix) {
  const collected = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      Object.assign(collected, collectTypeScriptSources(absolute, relative));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      collected[relative] = fs.readFileSync(absolute, 'utf8');
    }
  }
  return collected;
}

const nodeSources = fs.existsSync(piLaneSourceDir)
  ? collectTypeScriptSources(piLaneSourceDir, 'packages/pi-lane/src')
  : {};

if (Object.keys(nodeSources).length === 0) {
  console.error(
    'isolation-binding: packages/pi-lane/src 扫不到任何 .ts——pi lane 扫描面失效，按红处理。' +
      '该包若已退役，须同批把本扫描面与 nodePrimitiveLedger 一并销号，不得让判据静默空转。',
  );
  process.exit(1);
}

const { contract, failures } = validateIsolationBinding({ adrText, evidenceText, sources, nodeSources });

if (failures.length > 0) {
  console.error(`isolation-binding failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log(
  `isolation-binding passed（当期等级 \`${contract.currentLevel}\`；闭集 ${contract.levels.join(' < ')}；` +
    `扫描 ${Object.keys(sources).length} 份宿主源码、${Object.keys(nodeSources).length} 份 pi lane 源码）`,
);
