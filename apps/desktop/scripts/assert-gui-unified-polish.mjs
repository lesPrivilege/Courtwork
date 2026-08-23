// GUI-UNIFIED-POLISH-1 门（批准行 GUP-A01 / GUP-S01）。
// 权威：apps/desktop/specs/GUI-UNIFIED-POLISH-1.md、docs/design/tokens.json。
//
// 排印字阶与行高由排印门④（assert-typography.mjs）承担，本门不重复。
// 本门只锁本票独有的结构事实：
//   A01-① 对话列不小于检视栏——双栏权重必须同值，`.9fr / 1.25fr` 那种把主面压小的配比触红；
//   A01-② 场景线层级接线——案件题走 title 档且不再以 60% 截断，面题走 titleSm 档；
//   A01-③ 空态三枚主动作带可见标签（GOP-C02 icon-only 律的受裁窄化）；
//   S01-① 数据面量度由内容定——矩阵 max-content + 标识列不截断，时间线来源列给足量度、事件列折行；
//   S01-② 图谱可读下限——label 字栈同功能轨，自动适配不得把字缩到 12px 以下。
// 另附一道通用守卫：CSS 自定义属性不得引用未声明的名字（未声明即整条声明失效，静默无边无底）。

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tokens = JSON.parse(readFileSync(path.resolve(root, '..', '..', 'docs', 'design', 'tokens.json'), 'utf8'));
const css = readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const graphTheme = readFileSync(path.join(root, 'src/workbench/graph-theme.ts'), 'utf8');
const graphPanel = readFileSync(path.join(root, 'src/verticals/legal/GraphPanel.tsx'), 'utf8');
const piPanel = readFileSync(path.join(root, 'src/pi/PiLanePanel.tsx'), 'utf8');
// GOP-C02 icon-only 律的窄化名单，与 PiLanePanel.dom.test.ts 同名同序。
const EMPTY_STATE_ACTIONS = ['pi-bind-folder', 'pi-open-model-settings', 'pi-start'];
const failures = [];

const ruleBody = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^{}]*)\\}`))?.[1];
};

// ── A01-① 对话列不小于检视栏 ───────────────────────────────────────────────
// 两列并置时 chat 取 .9fr、schema 取 1.25fr（RP-2.3 遗留）意味着主面恒比检视栏小 39%。
// 本门只断言「两者同权重」，不锁具体数字——将来若产品要把对话列做得更宽，加宽不触红，压小才触红。
for (const [name, body] of Object.entries({
  '.workspace 三栏': ruleBody('.workspace') ?? css.match(/grid-template-columns: minmax\(var\(--rail-left-min\)[^;]*;/)?.[0],
})) {
  if (!body) { failures.push(`A01-①：找不到 ${name} 的列定义`); continue; }
  const weights = [...body.matchAll(/minmax\(var\((--chat-min|--schema-min)\),\s*([\d.]+)fr\)/g)];
  const chat = weights.find((m) => m[1] === '--chat-min')?.[2];
  const schema = weights.find((m) => m[1] === '--schema-min')?.[2];
  if (!chat || !schema) { failures.push(`A01-①：${name} 未同时给出 chat/schema 权重`); continue; }
  if (Number(chat) < Number(schema)) {
    failures.push(`A01-①对话列量度：${name} chat=${chat}fr < schema=${schema}fr——主面被压小于检视栏`);
  }
}

// ── A01-② 场景线层级接线 ──────────────────────────────────────────────────
const titlebarTitle = ruleBody('.chat-titlebar .chat-case-title');
if (!titlebarTitle) failures.push('A01-②：找不到 .chat-titlebar .chat-case-title');
else {
  if (!/font-size:\s*var\(--type-title-size\)/.test(titlebarTitle)) {
    failures.push('A01-②案件题：.chat-titlebar .chat-case-title 未走 --type-title-size（标题轨 title 档）');
  }
  const maxWidth = titlebarTitle.match(/max-width:\s*([^;]+);/)?.[1]?.trim();
  if (maxWidth !== '100%') {
    failures.push(`A01-②案件题：max-width = ${maxWidth ?? '(缺)'}，应为 100%——60% 会把可完整显示的案件题截断`);
  }
}
const panelHeadTitle = ruleBody('.panel-head h2');
if (!panelHeadTitle) failures.push('A01-②：找不到 .panel-head h2');
else if (!/font-size:\s*var\(--type-title-sm-size\)/.test(panelHeadTitle)) {
  failures.push('A01-②面题：.panel-head h2 未走 --type-title-sm-size');
}

// ── A01-③ 空态主动作带可见标签 ────────────────────────────────────────────
// 与 GOP-C02 的冲突已由架构角色于 2026-08-23 裁定：GOP-C02 的 icon-only 律**窄化**——
// 继续管辖密集 chrome，让出空态三枚。窄化边界同时锁在两处：本门锁「这三枚必须带标签」，
// PiLanePanel.dom.test.ts 锁「除带 .pi-empty-action 者外一律不得渲文字」。
// 两门反向咬合，任一枚新按钮想渲文字都得先自证是空态动作。
for (const testId of EMPTY_STATE_ACTIONS) {
  const block = piPanel.match(new RegExp(`<button[\\s\\S]{0,400}?data-testid="${testId}"[\\s\\S]{0,600}?</button>`));
  if (!block) { failures.push(`A01-③：找不到空态主动作 ${testId}`); continue; }
  if (/pi-button-icon/.test(block[0])) {
    failures.push(`A01-③空态标签：${testId} 仍是 pi-button-icon 裸图标钮`);
  }
  if (!/pi-empty-action/.test(block[0])) {
    failures.push(`A01-③空态标签：${testId} 未接 .pi-empty-action——豁免按 class 认，不接即不在窄化范围内`);
  }
  if (!/\{PI_COPY\.\w+Action\}<\/span>/.test(block[0])) {
    failures.push(`A01-③空态标签：${testId} 未渲染可见动作标签（须为 PI_COPY 既有词条，不新铸文案）`);
  }
}
if (!ruleBody('.pi-empty-action')) failures.push('A01-③：styles.css 缺 .pi-empty-action 规则');

// ── S01-① 数据面量度由内容定 ──────────────────────────────────────────────
const matrixTable = ruleBody('.matrix-wrap table');
if (!matrixTable) failures.push('S01-①：找不到 .matrix-wrap table');
else {
  if (/table-layout:\s*fixed/.test(matrixTable)) {
    failures.push('S01-①矩阵量度：table-layout 回到 fixed——列宽会摊平到面宽，与内容无关，全格 ellipsis 即由此而来');
  }
  if (!/width:\s*max-content/.test(matrixTable)) {
    failures.push('S01-①矩阵量度：.matrix-wrap table 未取 width: max-content');
  }
}
const matrixIdCol = ruleBody('.matrix-wrap th:first-child');
if (!matrixIdCol) failures.push('S01-①：找不到 .matrix-wrap th:first-child');
else if (/text-overflow:\s*ellipsis/.test(matrixIdCol)) {
  failures.push('S01-①标识列：.matrix-wrap th:first-child 仍带 ellipsis——标识列是行的身份，截断即无从分辨文书');
}
const timelineGrid = ruleBody('.timeline-grid');
if (!timelineGrid) failures.push('S01-①：找不到 .timeline-grid');
else {
  const cols = timelineGrid.match(/grid-template-columns:\s*([^;]+);/)?.[1] ?? '';
  const sourceCol = Number(cols.trim().split(/\s+/).pop()?.replace('px', ''));
  // 实测真实来源文件名 p90 = 125px、max = 137px；下限取 144px 留一格 padding。
  if (!(sourceCol >= 144)) {
    failures.push(`S01-①来源列：时间线末列 = ${cols.trim().split(/\s+/).pop()}，实测内容最宽 137px，须 >= 144px`);
  }
}
// 事件列不设「不截断」门：折行破密度律（de-slop 锁 dense-row 28–34px），
// 逐行 grid 又无法按内容对齐列宽。本门只锁起量不得再退回 260px 档。
{
  const cols = (timelineGrid ?? '').match(/grid-template-columns:\s*([^;]+);/)?.[1] ?? '';
  const eventMin = Number(cols.match(/minmax\((\d+)px/)?.[1]);
  if (!(eventMin >= 420)) {
    failures.push(`S01-①事件列：起量 = ${eventMin || '(缺)'}px，须 >= 420px`);
  }
}

// ── S01-② 图谱可读下限 ────────────────────────────────────────────────────
const uiStack = tokens.typography?.family?.ui?.value ?? '';
const declaredStack = graphTheme.match(/labelFontFamily:\s*'([^']+)'/)?.[1] ?? '';
const norm = (v) => v.replace(/\s+/g, ' ').replace(/'/g, '"').trim();
if (norm(declaredStack) !== norm(uiStack)) {
  failures.push(`S01-②图谱字栈：graph-theme labelFontFamily 与功能轨不同源\n  graph = ${declaredStack}\n  token = ${uiStack}`);
}
const labelMinPx = Number(graphTheme.match(/labelMinPx:\s*(\d+)/)?.[1]);
const metaFloor = tokens.typography?.scale?.meta?.size;
if (labelMinPx !== metaFloor) {
  failures.push(`S01-②可读下限：labelMinPx = ${labelMinPx ?? '(缺)'}，应等于 scale.meta.size = ${metaFloor}`);
}
if (!/graphMinFitZoom\s*=\s*graphTypography\.labelMinPx\s*\/\s*graphTypography\.labelFontSize/.test(graphTheme)) {
  failures.push('S01-②可读下限：graphMinFitZoom 未由 labelMinPx / labelFontSize 派生——写死即与字号脱钩');
}
const fitSites = [...graphPanel.matchAll(/fitView\(\{[^}]*\}, false\);/g)];
if (fitSites.length === 0) failures.push('S01-②可读下限：GraphPanel 找不到 fitView 调用点');
for (const site of fitSites) {
  const after = graphPanel.slice(site.index, site.index + 260);
  if (!/getZoom\(\) < graphMinFitZoom/.test(after)) {
    failures.push('S01-②可读下限：某处 fitView 之后未夹住 graphMinFitZoom——自动适配会把 label 缩到下限以下');
  }
}

// ── 附 · CSS 自定义属性不得悬空 ───────────────────────────────────────────
// 未声明的名字令整条声明失效：`border: 1px solid var(--border-subtle)` 无边、
// `accent-color: var(--action-primary)` 回落浏览器默认蓝。二者都是无声的。
// 运行时注入的名字走具名登记——它们由组件 style 属性赋值，静态扫不到声明点。
const RUNTIME_INJECTED = new Set([
  '--collapse-lines', '--collapse-max', '--preview-marker-position',
  '--preview-scroll-progress', '--split-ratio',
]);
const sourceFiles = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(target, out);
    else if (/\.(css|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(target);
  }
  return out;
};
const files = sourceFiles(path.join(root, 'src'));
const declared = new Set();
for (const file of files) {
  if (!file.endsWith('.css')) continue;
  for (const m of readFileSync(file, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
}
for (const file of files) {
  const rel = path.relative(root, file);
  for (const m of readFileSync(file, 'utf8').matchAll(/var\(\s*(--[\w-]+)/g)) {
    const name = m[1];
    if (declared.has(name) || RUNTIME_INJECTED.has(name)) continue;
    failures.push(`附·悬空变量：${rel} 引用未声明的 ${name}——整条声明静默失效`);
  }
}

if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exit(1);
}
console.log(
  `GUI-UNIFIED-POLISH 门通过：A01 三条（列量度 · 层级接线 · 空态标签）· S01 两条（数据面量度 · 图谱可读下限）· 悬空变量 0（运行时注入具名登记 ${RUNTIME_INJECTED.size} 枚）`,
);
