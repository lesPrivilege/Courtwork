// 排印门（SKIN-B2-0）。权威：docs/design/typography-density.md 机器门清单 + docs/design/tokens.json typography.*。
//
// 凡例列的四道门，本文件承其三（第四道「AA 四元联测」是运行时事，住 tests/e2e/typography.spec.ts）：
//   门① 字栈单源——src/ 内每一条 font-family 要么按名消费 token 字栈，要么逐字等于 token 值，
//        要么在 B2-1 迁移清单里具名登记。承 SKIN-B3 判例：不迁的也要具名，新漂移才会红。
//   门② 伪粗体——font-synthesis: none 存在锁 + 文书轨零粗体律（仿宋无原生粗体，伪粗即糊重）。
//   门③ 数据字——tabular-nums 单源，且数据字不得走标题轨（思源宋无 tnum，宣称等宽即静默谎报）。
//
// B2-0 是定值批：消费面置换归 B2-1。故门②③ 的消费面条款现为**前向守卫**——
// 它们锁的是「B2-1 一旦接线，不许接错」，今日无消费面命中不等于门空转（见 mutation 红证）。

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tokens = JSON.parse(readFileSync(path.resolve(root, '..', '..', 'docs', 'design', 'tokens.json'), 'utf8'));
const typo = tokens.typography ?? {};
const failures = [];
const css = readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const manifestPath = path.join(root, 'src/assets/fonts/subset-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));


const sourceFiles = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(target, out);
    else if (/\.(css|tsx?|jsx?)$/.test(entry.name)) out.push(target);
  }
  return out;
};

// ── 门① 字栈单源 ────────────────────────────────────────────────────────────
// B2-1 迁移清单：尚未接线的裸字栈逐条具名登记。清单即 B2-1 的工单范围——
// 迁一条删一条，删空即消费面置换完成。任何**未登记**的新裸字栈立即触红。
const PENDING_MIGRATION = {
  // B2-1：清单即进度条。迁一条删一条，删空即消费面置换完成——现已删空。
  // 空清单不是空门：任何新增的裸字栈仍会因未登记而红（见 mutation）。
};

const normalizeStack = (raw) => raw.replace(/\s+/g, ' ').trim().replace(/;$/, '');
const tokenStacks = new Set(Object.values(typo.family ?? {})
  .filter((slot) => slot && typeof slot === 'object' && typeof slot.value === 'string')
  .map((slot) => normalizeStack(slot.value).replace(/'/g, '"')));

const seenPending = new Set();
for (const file of sourceFiles(path.join(root, 'src'))) {
  const rel = path.relative(root, file);
  // @font-face 体内的 font-family 是**别名定义**不是字栈消费——它宣告一个名字，不选用任何字。
  // 其正确性另由上方「@font-face 别名契约」按清单逐件校验，故此处剔除，不是开口子。
  const text = readFileSync(file, 'utf8').replace(/@font-face\s*\{[^}]*\}/g, '');
  for (const match of text.matchAll(/font-family\s*:\s*([^;}\n]+)/g)) {
    const stack = normalizeStack(match[1]);
    if (/^var\(--[\w-]+\)$/.test(stack) || stack === 'inherit') continue; // 已按名消费
    const key = `${rel}|${stack}`;
    if (tokenStacks.has(stack.replace(/'/g, '"'))) continue; // 逐字等于 token 值
    if (key in PENDING_MIGRATION) { seenPending.add(key); continue; }
    failures.push(`门①字栈单源：${rel} 出现未登记的裸字栈 —— ${stack}`);
  }
}
for (const key of Object.keys(PENDING_MIGRATION)) {
  if (!seenPending.has(key)) failures.push(`门①字栈单源：B2-1 迁移清单有陈项，src 已无此字栈 —— ${key}`);
}

// ── 门①附 · CSS 字栈变量单源 + @font-face 别名契约（B2-1 消费面置换随附）────────
// 变量若与 token 漂移，按名消费就成了按名撒谎；@font-face 若漏挂别名，字栈会静默穿透
// 到系统衬线（B2-0 已立契：思源 CN 包内名与 SemiBold 独立族名是两个现成陷阱）。
// 轨 → CSS 变量名走**显式登记**而非按名推导（承 B2-0 判例：line.settled 在壳里叫 --zhu-graphic，
// 推名必推错）。mono 沿用既有 `--mono`：改名要动 40 余个数据区消费点，凡例未要求，不为整齐而动。
const FAMILY_VARS = { title: '--font-title', body: '--font-body', ui: '--font-ui', mono: '--mono' };
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
for (const [slot, varName] of Object.entries(FAMILY_VARS)) {
  const declared = rootBlock.match(new RegExp(`${varName}\\s*:\\s*([^;]+);`))?.[1]?.trim();
  const token = typo.family?.[slot]?.value;
  if (!declared) { failures.push(`字栈变量缺位：${varName} 未在 :root 声明（${slot} 轨）`); continue; }
  if (normalizeStack(declared).replace(/'/g, '"') !== normalizeStack(token ?? '').replace(/'/g, '"')) {
    failures.push(`字栈变量漂移 ${varName}：\n  css   = ${declared}\n  token = ${token ?? '(缺)'}`);
  }
}

const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
const faceOf = (family, weight) => faces.find((body) =>
  new RegExp(`font-family:\\s*'${family}'`).test(body) && new RegExp(`font-weight:\\s*${weight}\\b`).test(body));
for (const entry of manifest.fonts ?? []) {
  const body = faceOf(entry.cssFamily, entry.weight);
  if (!body) {
    failures.push(`@font-face 别名契约破裂：清单件 ${entry.file}（${entry.cssFamily} ${entry.weight}）无对应 @font-face——漏别名即静默穿透系统衬线`);
    continue;
  }
  if (!body.includes(entry.file)) {
    failures.push(`@font-face 指向错件：${entry.cssFamily} ${entry.weight} 未引用 ${entry.file}`);
  }
}

// ── 门② 伪粗体 ──────────────────────────────────────────────────────────────
if (!/font-synthesis\s*:\s*none/.test(css)) {
  failures.push('门②伪粗体：styles.css 丢失 font-synthesis: none 存在锁——中文伪粗会立刻回潮');
}
const doc = typo.track?.document;
if (doc?.weight !== 400) {
  failures.push(`门②伪粗体：文书轨零粗体律破裂——track.document.weight = ${doc?.weight ?? '(缺)'}，应恒为 400`);
}
// 前向守卫：B2-1 接线后，凡消费文书轨的规则不得同时抬字重。
for (const file of sourceFiles(path.join(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const rule of text.matchAll(/\{([^{}]*)\}/g)) {
    const body = rule[1];
    if (!/font-family\s*:\s*var\(--font-body\)/.test(body)) continue;
    const weight = body.match(/font-weight\s*:\s*(\d+)/);
    if (weight && Number(weight[1]) > 400) {
      failures.push(`门②伪粗体：${path.relative(root, file)} 文书轨规则抬到 font-weight ${weight[1]}——仿宋无原生粗体`);
    }
  }
}

// ── 门③ 数据字 ──────────────────────────────────────────────────────────────
if (typo.numeric?.value !== 'tabular-nums' || typo.track?.data?.numeric !== 'tabular-nums') {
  failures.push(`门③数据字：tabular-nums 单源破裂——numeric=${typo.numeric?.value} track.data.numeric=${typo.track?.data?.numeric}`);
}
if (typo.track?.data?.family !== '{typography.family.mono}') {
  failures.push(`门③数据字：数据轨字栈脱离 mono——${typo.track?.data?.family ?? '(缺)'}`);
}
// 前向守卫：标题轨无 tnum（实测 GSUB 无表），在其上宣称等宽即静默谎报对齐律。
for (const file of sourceFiles(path.join(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const rule of text.matchAll(/\{([^{}]*)\}/g)) {
    const body = rule[1];
    if (/font-family\s*:\s*var\(--font-title\)/.test(body) && /font-variant-numeric\s*:\s*tabular-nums/.test(body)) {
      failures.push(`门③数据字：${path.relative(root, file)} 在标题轨上宣称 tabular-nums——思源宋无 tnum，该声明不生效`);
    }
  }
}

// ── 子集清单锚（字体入仓的字节锁）────────────────────────────────────────────
const { createHash } = await import('node:crypto');
for (const entry of manifest.fonts ?? []) {
  const file = path.join(root, 'src/assets/fonts', entry.file);
  const bytes = readFileSync(file);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== entry.woff2Sha256) {
    failures.push(`子集清单锚：${entry.file} 字节漂移——实测 ${digest.slice(0, 16)}… 清单 ${entry.woff2Sha256.slice(0, 16)}…`);
  }
  if (bytes.length !== entry.bytes) {
    failures.push(`子集清单锚：${entry.file} 体积漂移——实测 ${bytes.length} 清单 ${entry.bytes}`);
  }
}
const declaredFamilies = new Set((manifest.fonts ?? []).map((entry) => entry.cssFamily));
// 两条衬线轨各查两件事：入库字族在栈内（否则 B2-1 写了 font-family 却没随包字体，静默穿透系统衬线）；
// 且栈首不是该 CJK 字族——首位必须让给显式拉丁配衬字（编排义务四条之三：不得裸回退）。
for (const slot of ['title', 'body']) {
  const stack = (typo.family?.[slot]?.value ?? '').split(',').map((part) => part.trim().replace(/^'|'$/g, ''));
  const bundled = stack.filter((name) => declaredFamilies.has(name));
  if (bundled.length === 0) {
    failures.push(`子集清单锚：${slot} 轨字栈内无任何入库字族——B2-1 接线会静默穿透到系统衬线`);
  }
  if (declaredFamilies.has(stack[0])) {
    failures.push(`配衬字：${slot} 轨字栈首位是 CJK 字族「${stack[0]}」——拉丁必须由显式配衬字承接，不得裸回退（该 CJK 子集的拉丁为宽体）`);
  }
}

// ── 门④ 字阶在册与行高配对（GUI-UNIFIED-POLISH-1 / GUP-A01）──────────────────
// 门①锁字栈，门④锁字阶。两者同构：要么按名消费已登记变量，要么触红；px 字面量无豁免。
//
// 变量名 → token 槽走**显式登记**而非按名推导（承门①附「推名必推错」判例）：
// `--type-dense-meta-size` 对应槽 meta，`--type-dense-body-size` 对应槽 dense，名不同源。
//
// 行高分两治：12/13 两档行高同为 1.5，由 :root 基线一次承担，规则内不再重复声明；
// 其余五档各自偏离基线，故凡消费其字号者须在同规则配对声明该档行高变量——
// 不配对就意味着字号变了而行距没变，正是本票要消灭的形态。
const SCALE_VARS = {
  meta:    { size: '--type-dense-meta-size' },
  dense:   { size: '--type-dense-body-size' },
  body:    { size: '--type-body-size',       lh: '--type-body-line-height' },
  reading: { size: '--type-reading-size',    lh: '--type-reading-line-height' },
  titleSm: { size: '--type-title-sm-size',   lh: '--type-title-sm-line-height' },
  title:   { size: '--type-title-size',      lh: '--type-title-line-height' },
  display: { size: '--type-display-size',    lh: '--type-display-line-height' },
};
// 文书轨不在 scale 上（track.document 自带仿宋墨量补偿 16/1.75），单独登记单独校。
const DOC_VARS = { size: '--type-document-size', lh: '--type-document-line-height' };
// 控件字号是字阶的具名别名，不是第八第九档：控件轨要按控件高度成对取值，故另立名。
// 别名同样受漂移校验——别名一旦与所指槽脱钩，「按名消费」就退化为又一处散落数值。
const CONTROL_ALIASES = { '--control-font-sm': 'dense', '--control-font-md': 'body' };
// 图标审计页是开发内页（icon-audit.html 独立入口，不随产品壳装配），其排印不承设计契约。
// 具名登记而非静默跳过：新增开发内页须显式入册才能免门。
const NON_PRODUCT_SURFACES = new Set(['src/icons/icon-audit.css']);

const rootDecl = (name) => rootBlock.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();

// ④a 字阶变量不得与 tokens.json 漂移——按名消费的前提是名下值为真。
for (const [slot, vars] of Object.entries(SCALE_VARS)) {
  const step = typo.scale?.[slot];
  if (!step) { failures.push(`门④字阶在册：tokens.json 缺 typography.scale.${slot}`); continue; }
  const size = rootDecl(vars.size);
  if (size !== `${step.size}px`) {
    failures.push(`门④字阶漂移 ${vars.size}（槽 ${slot}）：css = ${size ?? '(缺)'}，token = ${step.size}px`);
  }
  if (!vars.lh) continue;
  const lh = rootDecl(vars.lh);
  if (lh !== String(step.lineHeight)) {
    failures.push(`门④行高漂移 ${vars.lh}（槽 ${slot}）：css = ${lh ?? '(缺)'}，token = ${step.lineHeight}`);
  }
}
{
  const doc = typo.track?.document;
  const size = rootDecl(DOC_VARS.size);
  const lh = rootDecl(DOC_VARS.lh);
  if (size !== `${doc?.readingSize}px`) {
    failures.push(`门④字阶漂移 ${DOC_VARS.size}（文书轨）：css = ${size ?? '(缺)'}，token = ${doc?.readingSize}px`);
  }
  if (lh !== String(doc?.readingLineHeight)) {
    failures.push(`门④行高漂移 ${DOC_VARS.lh}（文书轨）：css = ${lh ?? '(缺)'}，token = ${doc?.readingLineHeight}`);
  }
}

// ④b :root 行高基线——缺此声明则 12/13 两档回落 `normal`，全站行距由字体度量决定而非设计决定。
{
  // 前置的负向断言不可省：`--type-*-line-height` 同样以 line-height 结尾，裸匹配会先命中变量声明。
  const baseline = rootBlock.match(/(?<![-\w])line-height\s*:\s*([^;]+);/)?.[1]?.trim();
  const metaLh = typo.scale?.meta?.lineHeight;
  if (baseline !== String(metaLh)) {
    failures.push(`门④行高基线：:root line-height = ${baseline ?? '(缺)'}，应为 scale.meta.lineHeight = ${metaLh}`);
  }
}

// ④c 字号单源——`font-size` 与 `font` 简写一并扫。px 字面量一律触红，无登记豁免清单：
// 字阶七档加文书轨已覆盖全部在册体裁，需要第八个尺寸即属改 token，不属改消费面。
for (const [alias, slot] of Object.entries(CONTROL_ALIASES)) {
  const declared = rootDecl(alias);
  const expected = `${typo.scale?.[slot]?.size}px`;
  if (declared !== expected) {
    failures.push(`门④字阶别名漂移 ${alias}：css = ${declared ?? '(缺)'}，所指槽 ${slot} = ${expected}`);
  }
}

const SIZE_VAR_NAMES = new Set([
  ...Object.values(SCALE_VARS).map((v) => v.size),
  DOC_VARS.size,
  ...Object.keys(CONTROL_ALIASES),
]);
for (const file of sourceFiles(path.join(root, 'src'))) {
  const rel = path.relative(root, file);
  if (/\.test\.[tj]sx?$/.test(rel)) continue; // 测试内的字面量是断言标的，非消费面
  if (NON_PRODUCT_SURFACES.has(rel)) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/font-size\s*:\s*([^;}\n]+)/g)) {
    const value = m[1].trim();
    if (value === 'inherit') continue;
    const name = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
    if (name && SIZE_VAR_NAMES.has(name)) continue;
    failures.push(`门④字号单源：${rel} font-size 未按名消费字阶 —— ${value}`);
  }
  for (const m of text.matchAll(/(?:^|[;{]\s*)font\s*:\s*([^;}\n]+)/g)) {
    const value = m[1].trim();
    if (value === 'inherit') continue;
    const name = value.match(/var\(\s*(--[\w-]+)\s*\)\s*\//)?.[1];
    if (name && SIZE_VAR_NAMES.has(name)) continue;
    failures.push(`门④字号单源：${rel} font 简写未按名消费字阶 —— ${value}`);
  }
}

// ④d 行高配对——偏离基线的五档加文书轨，字号与行高必须同规则成对出现。
const PAIRED = [...Object.values(SCALE_VARS).filter((v) => v.lh), DOC_VARS];
for (const file of sourceFiles(path.join(root, 'src'))) {
  const rel = path.relative(root, file);
  if (/\.test\.[tj]sx?$/.test(rel)) continue;
  if (NON_PRODUCT_SURFACES.has(rel)) continue;
  const text = readFileSync(file, 'utf8');
  for (const rule of text.matchAll(/\{([^{}]*)\}/g)) {
    const body = rule[1];
    for (const pair of PAIRED) {
      if (!new RegExp(`font-size\\s*:\\s*var\\(\\s*${pair.size}\\s*\\)`).test(body)) continue;
      if (new RegExp(`line-height\\s*:\\s*var\\(\\s*${pair.lh}\\s*\\)`).test(body)) continue;
      // 单行控件按 `line-height: 1` 由控件高度定垂直居中，是显式取值不是缺省。
      // 在册的只有「该档配对变量」与「1」两种；`normal` 与任意字面量仍红——
      // 门④要消灭的是行距由字体度量决定，不是禁止 1。
      if (/line-height\s*:\s*1\s*[;}]/.test(`${body};`)) continue;
      failures.push(`门④行高配对：${rel} 规则消费 ${pair.size} 却未同规则声明 line-height: var(${pair.lh}) 或 1`);
    }
    // 简写形式自带行高，须逐字取该档配对值。
    for (const pair of PAIRED) {
      const m = body.match(new RegExp(`font\\s*:\\s*var\\(\\s*${pair.size}\\s*\\)\\s*/\\s*([^\\s;]+)`));
      if (m && m[1] !== `var(${pair.lh})` && m[1] !== '1') {
        failures.push(`门④行高配对：${rel} font 简写在 ${pair.size} 上取行高 ${m[1]}，应为 var(${pair.lh})`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `排印门通过：门①字栈单源（${seenPending.size} 条 B2-1 待迁具名登记）· 门②伪粗体（synthesis 锁 + 文书轨 ${doc.weight} 单字重）· 门③数据字（tabular 单源 + 标题轨禁令）· 门④字阶在册（七档 + 文书轨，px 字面量零豁免）· 子集锚 ${manifest.fonts.length} 件`,
);
