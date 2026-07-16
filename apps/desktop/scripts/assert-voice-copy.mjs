// 文案门（VOICE-SPEC-1）：扫描 apps/desktop/src 的用户文案，对 docs/design/voice.md
// 可机器断言条款（§1 裸确认词 / §3 成功自评 / §6 工程词泄漏）触红。
// 扫描面只取产品 UI 宿主源（.ts/.tsx，排除 *.test.*）；注释与 ${…} 插值已在规则库剔除。
// 反例注入见 assert-voice-copy.test.mjs。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

import { scanVoice } from './voice-copy-lib.mjs';

const root = resolve(import.meta.dirname, '..');
const scanRoot = join(root, 'src');

function collect(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) files.push(full);
  }
  return files;
}

const files = collect(scanRoot);
const sources = files.map((file) => ({ path: relative(root, file), content: readFileSync(file, 'utf8') }));
const failures = scanVoice(sources);

if (failures.length) {
  console.error(`文案门审计失败（${failures.length} 项，voice.md 可机器断言条款）：`);
  for (const f of failures) console.error(`  [${f.rule}] ${f.file}:${f.line} 「${f.value.trim()}」 ${f.message}`);
  process.exit(1);
}
console.log(`文案门通过：扫描 ${files.length} 个 UI 源文件，无裸确认词/成功自评/工程词泄漏`);
