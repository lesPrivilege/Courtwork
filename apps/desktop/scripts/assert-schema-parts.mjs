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

// ── ⑨ JSX 属性式：件库住 TSX，属性必须是 React 认的驼峰式 ────────────────────
// 单源比对靠归一化跨过了站（HTML kebab）与壳（JSX camel）的写法差异，代价是它**看不见**
// 壳侧误用 kebab——而 React 会当场拒收并 console.error，只有 ux1 的运行时错误守卫会偶然逮到。
// 这里把它变成必然：站面照旧 kebab（那是 HTML），壳侧一律 camel。
for (const kebab of shell.match(/\b(?:stroke|fill|clip|font|text|marker|stop)-[a-z-]+=/g) ?? []) {
  failures.push(`件库属性式错：src/icons/schema-parts.tsx 用了 HTML 式 ${kebab.slice(0, -1)}——`
    + 'JSX 须用驼峰式，否则 React 拒收该属性并报 Invalid DOM property');
}

// ── ⑧ 件库纯度：几何只许住在 symbol 里 ─────────────────────────────────────
// icon 门的内联禁令为记号系剥出了两个口子（`<use>` 引用与本件库文件）。件库那个口子若不封，
// 「不经 icon 门」就成了「随便画」。故此处补上：件库内除 <symbol> 外零几何元素——
// 剥掉所有 symbol 之后，剩下的只该是 <svg> 壳与注释。
const GEOMETRY = /<(path|rect|circle|ellipse|polygon|polyline|line|image|text)\b/;
const shellOutsideSymbols = shell.replace(/<symbol[\s\S]*?<\/symbol>/g, '');
if (GEOMETRY.test(shellOutsideSymbols)) {
  failures.push('件库不纯：src/icons/schema-parts.tsx 的 symbol 之外出现几何元素——'
    + '记号几何只许住在 symbol 里（icon 门为件库开的口子以此封住）');
}

// ── ④ 消费登记（克制审计的机器形态）────────────────────────────────────────
// B4 消费半的裁决口径是「指认业务语义，答不出不上」。**不上也要登记**——沉默的未消费件
// 与沉默的裸线同病（B3「答不出即不换」判例）：不登记就无从复核当初为何不上。
// 故每枚记号必须**恰占其一**：要么在 src 有 <use href="#id"> 消费点，要么在下表带理由登记。
// 双向锁：登记为不上的件一旦有人接线 → 红（逼着改登记并过审计）；新件既无消费又未登记 → 红。
const UNCONSUMED = {
  'mark-rule': '结构分隔在壳侧已由 B3 的 CSS 文武线全额承担（主界 8 / 次界 105）；'
    + 'SVG 界行在壳内无独有辖区。唯二 CSS 画不到的面（.view-tabs / .settings-nav 两个滚动容器，'
    + 'B3 已具名退次界）需加包裹元素，属版式改动，越出记号批。**记号管携语义的标记点，线级管结构分隔**',
  'mark-emphasis': '壳内「强调」无独立数据信号：可强调之处（高危 / 未核验 / 未落点 / 逐条确认）'
    + '已分别由语义色与徽章编码，圈点落上去只是同一事实的第二遍编码；'
    + '而「用户自行圈点」（收藏、标记要处）产品未建模，无数据即无形。**答不出即不上**',
  'mark-seam': '壳内无文书接缝语义面。唯一同名件 `.rail-seam-toggle` 是右栏折叠控件，'
    + '非「骑缝以证接缝未被掉包」之义，借形即误用',
};
const consumers = new Map([...shellMarks.keys()].map((id) => [id, []]));
for (const file of walk(srcRoot)) {
  const text = readFileSync(file, 'utf8');
  for (const id of shellMarks.keys()) {
    if (new RegExp(`href=[{"'\`][^"'\`}]*#${id}\\b`).test(text)) consumers.get(id).push(path.relative(root, file));
  }
}
for (const [id, files] of consumers) {
  const registered = id in UNCONSUMED;
  if (files.length === 0 && !registered) {
    failures.push(`记号未消费亦未登记：${id} 既无 <use href="#${id}"> 消费点，也不在未消费登记表内`
      + '——克制审计的结论无论是上还是不上，都必须留痕');
  }
  if (files.length > 0 && registered) {
    failures.push(`未消费登记已失效：${id} 已被 ${files.join('/')} 消费，请从 UNCONSUMED 移除并补克制审计留痕`);
  }
}

// ── ⑤ 朱印前向守卫（同 assert-signature-line 的落定数据律，覆盖记号路径）──────
// 朱是印记色不是装饰：`line.settled` 那条守卫管色，本条管形。凡消费落定章框廓之处，
// 其所在文件必须携落定处置数据；且字面 + 计算两条路径同守（承首段判例：字面扫描只是子集）。
for (const file of consumers.get('mark-seal-frame') ?? []) {
  const text = readFileSync(path.join(root, file), 'utf8');
  if (!/confirmed|disposition|settled[A-Z]|resolution/i.test(text)) {
    failures.push(`落定章未绑落定处置数据：${file} 消费了 mark-seal-frame 却不含任何落定数据态`);
  }
}

// ── ⑥ 仪式预算唯一处（奖级 #3 的机器形态）──────────────────────────────────
// 「全站唯一仪式」若只写在文档里就是无声的乐观。`--motion-seal` 存在的唯一理由是让这句话
// 可断言：恰声明一次、恰一处消费、消费者恰为落定章，且 reduce 下显式停。
const cssPath = path.join(root, 'src/styles.css');
const shellCss = readFileSync(cssPath, 'utf8');
if (consumers.get('mark-seal-frame')?.length) {
  const declared = [...shellCss.matchAll(/--motion-seal\s*:/g)].length;
  if (declared !== 1) failures.push(`仪式预算 --motion-seal 被声明 ${declared} 次（须恰一次）`);
  const users = [...shellCss.matchAll(/([^{}]+)\{([^}]*var\(--motion-seal\)[^}]*)\}/g)].map((m) => m[1].trim().split('\n').pop().trim());
  if (users.length !== 1 || !users[0].startsWith('.settle-seal')) {
    failures.push(`仪式预算非唯一处：var(--motion-seal) 的消费者为 [${users.join(' | ')}]，须恰一条且为 .settle-seal`);
  }
  // 花括号配平取 reduce 块（正则截段会把单行块与多行块混读，进而误判「已停摆」）。
  const reduceScopes = [];
  for (const open of shellCss.matchAll(/@media\s*\([^)]*prefers-reduced-motion:\s*reduce[^)]*\)\s*\{/g)) {
    let depth = 1;
    let cursor = open.index + open[0].length;
    while (depth > 0 && cursor < shellCss.length) {
      if (shellCss[cursor] === '{') depth += 1;
      if (shellCss[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    reduceScopes.push(shellCss.slice(open.index, cursor));
  }
  if (!reduceScopes.some((scope) => /\.settle-seal\s*\{[^}]*animation:\s*none/.test(scope))) {
    failures.push('落定章未在 prefers-reduced-motion 下显式停摆（全局 .01ms 兜底不算——仪式必须可完全关掉）');
  }
}

// ── ⑦ 新语义两件的数据绑定前向守卫（B4 票面③，两件本批不落地）──────────────
// 「时间轴节点形状＝执行者」「图谱边样式＝事实等级」是原型盘点采纳的两件新语义。本批探明
// **不落地的原因不在画法在数据**：G6 逐元素 style 覆写是现用法（`nodes[].style.labelText`），
// 边线型分档零新扩展即可画；但 `TimelineEvent` 无执行者字段（只有 `partyIds` 当事人关联，
// 当事人≠执行者），`PartyEdge` 无事实等级字段（`grade` 是面板级 prop 不是逐边属性）。
// 从 `partyIds[0]` 推执行者、从 `relationType` 文案猜等级，正是这两处 schema 注释各自点名
// 禁止的「UI 零推断」。
//
// 故守卫两向：
//   正向——**无数据之形即违例**：这两处逐元素的形状/线型变化只许绑各自的语义字段族；
//         该族当前为空，故任何逐元素形状/线型变化一律红。
//   反向——**前向红卫**：schema 一旦长出该字段，本条即红，逼着把欠下的视觉投影补上。
//         不留无声的乐观（同「登记不是豁免」）。
//
// 字段名以架构 2026-07-19 裁定一为准：`TimelineEvent.executor` / `PartyEdge.factTier`
// （沿 ADR-003 词汇），补字段走独立契约单 **LEGAL-FIELD-1**，两件视觉投影挂该单后置。
// 词表另留同族别名，防的是换个名绕过守卫——**红卫认的是语义不是那一个字符串**。
const SEMANTIC_FIELDS = [
  {
    what: '时间轴节点形状＝执行者',
    schema: 'packages/legal/src/schemas/timeline.ts',
    block: /const TimelineEventSchema = z\.object\(\{([\s\S]*?)\n\}\);/,
    field: /^(actor|executor|performer|operator|actorIds?|executedBy)$/i,
    surfaces: ['src/workbench/Panels.tsx'],
    vocabulary: /\bdata-shape=|\bnodeShape\b|\bmarkerShape\b/,
  },
  {
    what: '图谱边样式＝事实等级（ADR-003 事实等级的视觉投影）',
    schema: 'packages/legal/src/schemas/party-graph.ts',
    block: /const PartyEdgeSchema = z\.object\(\{([\s\S]*?)\n\}\);/,
    field: /^(factTier|tier|grade|evidenceTier|evidenceGrade|factLevel|strength)$/i,
    surfaces: ['src/workbench/GraphPanel.tsx', 'src/workbench/graph-theme.ts'],
    vocabulary: /\blineDash\b|\bedgeShape\b/,
  },
];
for (const rule of SEMANTIC_FIELDS) {
  const source = readFileSync(path.join(repo, rule.schema), 'utf8');
  const body = source.match(rule.block)?.[1];
  if (body === undefined) {
    failures.push(`前向守卫失参照：${rule.schema} 未解析出目标 schema 块——守卫不得在读不到 schema 时静默放行`);
    continue;
  }
  const declared = [...body.matchAll(/^\s{2}(?:\/\*\*[\s\S]*?\*\/\s*)?([A-Za-z][\w]*)\s*:/gm)].map((m) => m[1]);
  const semantic = declared.filter((name) => rule.field.test(name));
  if (semantic.length) {
    failures.push(`前向红卫触发：${rule.schema} 已长出语义字段 ${semantic.join('/')}，`
      + `「${rule.what}」的视觉投影是 B4 记下的欠账，请补上并撤除本条`);
  }
  for (const surface of rule.surfaces) {
    const text = readFileSync(path.join(root, surface), 'utf8');
    for (const line of text.split('\n')) {
      if (!rule.vocabulary.test(line)) continue;
      if (semantic.some((name) => new RegExp(`\\b${name}\\b`).test(line))) continue;
      failures.push(`无数据之形：${surface} 出现逐元素形状/线型变化却未绑语义字段——`
        + `「${rule.what}」的数据源在 schema 上尚不存在，从既有字段推形即 UI 推断\n  ${line.trim()}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
const consumed = [...consumers].filter(([, files]) => files.length).map(([id]) => id);
console.log(
  `SchemaParts 单源门通过：壳侧 ${shellMarks.size} 枚与站面件库逐字相等 · 零字面色（全 currentColor）· 零内联复制`
  + ` · 消费 ${consumed.length} 枚（${consumed.join('/')}）· 未消费登记 ${Object.keys(UNCONSUMED).length} 枚`
  + (notMigrated.length ? ` · 站面另有未回迁件 ${notMigrated.join('/')}（登记非缺陷）` : ''),
);
