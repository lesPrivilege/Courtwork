// SchemaParts 单源门（SKIN-B4）。权威：就绪图「SVG 记号解耦预留」三条 +
// `site/SPEC.md` B5 节（件库首场，5 枚 symbol）+ 迁移 Plan 裁决 C-4。
//
// 三条预留的机器形态——书面约定升格为机器事实：
//   ① **站/稿/壳共用单源**：壳侧记号几何必须与站面件库**逐字节相等**。这是「回迁 R2 时零重绘」
//      的唯一可验形式；两侧各画一份即使当下长得一样，也已经是两个源。
//   ② **原生 SVG、按 token 名消费不带值**：symbol 内不得出现任何字面色值，一律 currentColor；
//      色由消费点的 CSS `color` 决定，故换宗即换色、记号本身不带宗。
//   ③ **C-4 记号不择纸温**：双主题渲染一致属记号契约（运行时那半住 e2e，此处锁静态前提）。
//
// 记号不经 icon 门（B0 速裁：线级组不经 icon 门，扩门另拍板），故本门是记号系的唯一静态守卫。

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const repo = path.resolve(root, '..', '..');
const shellPath = path.join(root, 'src/icons/schema-parts.tsx');
const failures = [];
if (!existsSync(shellPath)) {
  console.error('SchemaParts 单源门：壳侧件库 src/icons/schema-parts.tsx 不存在——记号系未回迁');
  process.exit(1);
}
const shell = readFileSync(shellPath, 'utf8');
const site = readFileSync(path.join(repo, 'site/index.html'), 'utf8');

/** 取出所有 <symbol id> → 归一化几何（折叠空白、剥 JSX 与 HTML 的写法差异）。 */
const symbolsOf = (text) => {
  const out = new Map();
  for (const match of text.matchAll(/<symbol\s+([^>]*)>([\s\S]*?)<\/symbol>/g)) {
    const id = match[1].match(/id="([^"]+)"/)?.[1];
    if (!id) continue;
    const attrs = match[1]
      .replace(/id="[^"]*"/, '')
      .replace(/preserveAspectRatio="[^"]*"/, (m) => m) // 保留：它影响渲染
      .trim();
    const geometry = `${attrs}|${match[2]}`
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')  // JSX 注释
      .replace(/<!--[\s\S]*?-->/g, '')        // HTML 注释
      .replace(/strokeWidth=/g, 'stroke-width=')
      .replace(/strokeLinecap=/g, 'stroke-linecap=')
      .replace(/\s+/g, ' ')
      .trim();
    out.set(id, geometry);
  }
  return out;
};

const shellMarks = symbolsOf(shell);
const siteMarks = symbolsOf(site);

if (siteMarks.size === 0) failures.push('站面件库读不到 symbol——单源比对失去参照，先查 site/index.html');

// ── ① 单源：壳侧每一枚必须在站面存在且几何逐字相等 ──────────────────────────
for (const [id, geometry] of shellMarks) {
  const reference = siteMarks.get(id);
  if (reference === undefined) {
    failures.push(`单源破裂：壳侧 ${id} 在站面件库无对应件——记号只许有一个源，壳不得自造`);
    continue;
  }
  if (reference !== geometry) {
    failures.push(`单源漂移：${id} 几何与站面不一致\n  站 = ${reference}\n  壳 = ${geometry}`);
  }
}
// 站面有而壳侧无：允许（壳未必消费全部件），但登记出来，避免「以为回迁全了」。
const notMigrated = [...siteMarks.keys()].filter((id) => !shellMarks.has(id));

// ── ② 不带值：记号内零字面色 ────────────────────────────────────────────────
for (const [id, geometry] of shellMarks) {
  const literal = geometry.match(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8}|rgba?\([^"]*\)|[a-z]+)"/g) ?? [];
  for (const decl of literal) {
    if (/"(currentColor|none)"/.test(decl)) continue;
    failures.push(`记号带值：${id} 出现字面色 ${decl}——须一律 currentColor，色由消费点给`);
  }
  if (/gradient|filter=|box-shadow/i.test(geometry)) {
    failures.push(`记号越界画法：${id} 含 gradient/filter/shadow（记号系零渐变零阴影）`);
  }
}

// ── ③ 消费点：壳侧记号必须经 <use href="#..."> 消费，不得就地内联复制几何 ────
const srcRoot = path.join(root, 'src');
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(target);
  }
  return out;
};
for (const file of walk(srcRoot)) {
  if (file.endsWith('schema-parts.tsx')) continue;
  const text = readFileSync(file, 'utf8');
  for (const [id, geometry] of shellMarks) {
    const shape = geometry.match(/d="([^"]+)"/)?.[1];
    if (shape && text.includes(shape)) {
      failures.push(`记号就地内联：${path.relative(root, file)} 复制了 ${id} 的几何——须经 <use href="#${id}"> 消费`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `SchemaParts 单源门通过：壳侧 ${shellMarks.size} 枚与站面件库逐字相等 · 零字面色（全 currentColor）· 零内联复制`
  + (notMigrated.length ? ` · 站面另有未回迁件 ${notMigrated.join('/')}（登记非缺陷）` : ''),
);
