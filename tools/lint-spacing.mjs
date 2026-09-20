#!/usr/bin/env node
// Token discipline lint（G3 · gui-grammar-convergence-20260919）。两条检查，只看 CSS 的字面事实：
//   RULE 1 · 间距（margin* / padding* / gap / row-gap / column-gap，含简写多值与逻辑属性）
//     的每个长度必须是 `0`、`auto`、一个 var(--…) 引用、一条 px 字面量只与 var()/相对单位
//     相乘相加的 calc()/min()/max()/clamp() 表达式、一个含 var() 或相对单位的百分号/em/lh/
//     vw/vh/dvh/env() 表达式，或一条登记在下面 REGISTERED 表里的原始 px（selector + 具体值）。
//     1–3px（正负）算光学/发丝级偏移，全局放行，不逐条登记（本文件档头这一条规则本身就是文档）。
//   RULE 2 · font-size 的每个值必须是 var(--text-*)、`inherit`、em/lh 相对值，或登记在
//     REGISTERED_FONT 表里的显示级例外（ui-composition-standard 允许的页面 hero 25–32、
//     greeting、弹窗标题 20，以及少数非文字层级角色，如头像字形）。
//
// 游离数值一律拒绝：间距与字号都是有限的语义角色表，不是每个组件各自的口味。确有不
// 建立在角色上的数值，先在下面的登记表里写下它是什么、为什么，再写进样式表——与
// lint-shapes / lint-materials 的登记表同一个做法。
// 用法：node tools/lint-spacing.mjs [files...]；无参数时扫描 app/web/**/*.css（跳过 skins）。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "vendor" || name === "node_modules" || name === "skins") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.css$/.test(name)) out.push(p);
  }
  return out;
}
const files = args.length ? args : walk(join(root, "app/web"));

const SPACING_PROPS = new Set([
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "margin-inline", "margin-block", "margin-inline-start", "margin-inline-end",
  "margin-block-start", "margin-block-end",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "padding-inline", "padding-block", "padding-inline-start", "padding-inline-end",
  "padding-block-start", "padding-block-end",
  "gap", "row-gap", "column-gap",
]);

/* RULE 1 登记表：selector（rule 的任一逗号分支）+ 具体 px 字面量（含符号）→ 理由。
   1–3px 发丝/光学偏移不在这里：那条是全局规则，见档头。 */
const REGISTERED_SPACE = [
  ["button", "padding", "5px", "控件解剖：按钮 padding 5×10（type-density-constraints 已裁）"],
  ["button", "padding", "10px", "控件解剖：按钮 padding 5×10（type-density-constraints 已裁）"],
  [".project-toggle", "padding", "6px", "chrome 6/8 节奏"],
  [".session-mode-tag", "margin-left", "6px", "chrome 6/8 节奏"],
  [".home-intro", "margin-bottom", "40px", "Home intro 块底部留白，与 --content-inset 数值巧合但角色不同（那是 Chat 内容列的水平内距）"],
  [".message-header > .icon-only", "margin", "-6px", "图标光学对齐偏移，量级取 6/8 节奏而非发丝"],
  [".user-message-actions time", "margin-right", "6px", "chrome 6/8 节奏"],
  [".context-tab", "padding", "6px", "chrome 6/8 节奏"],
  [".context-chip", "gap", "6px", "chrome 6/8 节奏"],
  [".composer-model", "padding", "6px", "chrome 6/8 节奏"],
  [".home-composer-context .home-choice-select", "padding", "6px", "chrome 6/8 节奏"],
  [".draft-status", "padding-bottom", "6px", "chrome 6/8 节奏"],
  [".retained-source-summary", "gap", "6px", "chrome 6/8 节奏"],
  [".retained-version-entry", "padding", "6px", "chrome 6/8 节奏"],
  [".settings-form label", "gap", "6px", "label↔field 6/8 节奏"],
  ["input", "padding", "10px", "控件解剖：输入框行内 padding 10，与按钮同一水平节奏"],
  [".connection-paths .segment", "padding", "6px", "segment 6/8 节奏"],
  [".ui-tooltip", "padding", "6px", "chrome 6/8 节奏"],
  [".permission-mode", "padding", "6px", "chrome 6/8 节奏"],
  [".context-row", "padding", "6px", "chrome 6/8 节奏"],
  [".repository-path-details > summary", "padding", "6px", "chrome 6/8 节奏"],
  [".connection-popover .segment", "padding", "6px", "segment 6/8 节奏"],
  [".settings-row .segment", "padding", "6px", "segment 6/8 节奏"],
  [".segment", "padding", "6px", "segment 6/8 节奏"],
  [".runtime-scope-tab", "padding", "6px", "tab 6/8 节奏"],
  [".runtime-switch", "gap", "6px", "chrome 6/8 节奏"],
  [".runtime-subtab", "padding", "6px", "tab 6/8 节奏"],
  [".composer-project", "padding", "6px", "chrome 6/8 节奏"],
  [".rail-open", "padding", "6px", "chrome 6/8 节奏"],
  [".settings-tab", "padding", "6px", "tab 6/8 节奏"],
  [".attention-workspace", "padding", "48px", "页面底部留白，与 --band-top 数值巧合但角色不同（那是顶部 chrome 带高）"],
  [".chat-page", "padding", "48px", "页面底部留白，与 --band-top 数值巧合但角色不同"],
  [".attention-reading-empty", "padding", "72px", "空态居中留白，产品取值，非布局 gutter 角色"],
  [".attention-detail-head", "padding-right", "104px", "为绝对定位的返回控件（.attention-list-back）预留水平空间，非间距刻度或布局 gutter"],
  [".attention-workspace", "padding", "40px", "窄屏 attention-workspace 底部安全留白，与 --content-inset 数值巧合但角色不同"],
  [".attention-preview-label", "padding", "6px", "chrome 6/8 节奏"],
  [".attention-suggestions button", "padding", "6px", "chrome 6/8 节奏"],
  [".attention-agent-empty", "padding", "48px", "空态居中留白，产品取值，非布局 gutter 角色"],
  [".attention-agent-status > p", "margin", "6px", "chrome 6/8 节奏"],
  [".attention-agent-composer", "gap", "6px", "chrome 6/8 节奏"],
  [".attention-agent-composer", "padding", "6px", "chrome 6/8 节奏"],
  [".runtime-package-resources label", "padding", "6px", "chrome 6/8 节奏"],
  ["[data-package-editor] > label > span", "margin-bottom", "6px", "label↔field 6/8 节奏"],
  [".model-picker-current .eyebrow", "margin", "6px", "chrome 6/8 节奏"],
  [".model-picker-current .form-help", "margin", "6px", "chrome 6/8 节奏"],
  [".usage-heatmap", "gap", "6px", "chrome 6/8 节奏"],
  [".usage-stacked-chart", "gap", "6px", "chrome 6/8 节奏"],
  [".usage-series-label::before", "margin-right", "6px", "chrome 6/8 节奏"],
  [".usage-controls", "gap", "6px", "chrome 6/8 节奏"],
  [".spark-chip-row", "gap", "6px", "chrome 6/8 节奏"],
  [".spark-chip-row", "margin-top", "6px", "chrome 6/8 节奏"],
  [".spark-controls", "gap", "6px", "chrome 6/8 节奏"],
  [".assistant-message-actions", "margin-top", "6px", "chrome 6/8 节奏"],
  [".project-tag", "padding", "6px", "chrome 6/8 节奏"],
  [".command-option", "padding", "6px", "chrome 6/8 节奏"],
  [".account-identity", "padding", "6px", "chrome 6/8 节奏"],
  [".presentation-inline", "gap", "6px", "chrome 6/8 节奏"],
  [".nav-history-notice", "margin", "6px", "chrome 6/8 节奏"],
  [".markdown-reader__outline-link", "padding", "6px", "chrome 6/8 节奏"],
  [".markdown-reader__block :is(th", "padding", "6px", "table cell 6/8 节奏"],
];

/* RULE 2 登记表：selector + font-size 的确切字面量 → 理由。 */
const REGISTERED_FONT = [
  [".home-intro h2", "calc(28px * var(--text-scale))", "Home 页面 hero，ui-composition-standard 页面 hero 25–32px"],
  [
    ".markdown-body h1",
    "calc(23px * var(--text-scale))",
    "阅读文档 h1（Opus G3 裁定）：文档层级须高于 .markdown-body h2 的 --text-title；属于阅读内容的显示级，不是 chrome 角色",
  ],
  [".home-intro h2", "calc(25px * var(--text-scale))", "Home 页面 hero，窄屏台阶，25 是区间下沿"],
  [".home-composer-intro h2", "clamp(26px, 2.2vw, 32px)", "Home greeting/hero clamp"],
  [".attention-workspace-heading h1", "calc(30px * var(--text-scale))", "页面 hero（Attention workspace）"],
  [".chat-page-heading h1", "calc(30px * var(--text-scale))", "页面 hero（Chat page）"],
  [
    ".attention-workspace-heading h1",
    "calc(24px * var(--text-scale))",
    "页面 hero 窄屏台阶，同一标题在 767px 以下的取值；24 略低于 25 的区间下沿，但是同一 hero 角色的响应式收窄，不是新角色",
  ],
  [".attention-agent-header h2", "20px", "弹窗标题，对齐 .model-picker-header h2 的 20px 约定"],
  [".model-picker-header h2", "20px", "弹窗标题，ui-composition-standard 弹窗标题 20px"],
  [
    ".usage-total",
    "28px",
    "Usage 总量数字（Opus G3 裁定）：每页唯一的汇总数字，显示级强调；不外溢为通用「大号数字」角色",
  ],
  [
    ".usage-total",
    "24px",
    "Usage 总量数字的窄屏台阶（600px 以下），同一裁定",
  ],
  [".home-greeting", "calc(24px * var(--text-scale))", "greeting（ui-composition-standard 命名的显示例外）"],
  [".home-greeting-date", "calc(17px * var(--text-scale))", "greeting 的日期：用户 2026-09-16 裁定的同一行浅字，随 greeting 显示级，不 snap"],
  [".home-composer-intro .home-greeting", "clamp(26px, 2.2vw, 32px)", "greeting，composer 内的变体"],
  [
    ".avatar",
    "calc(var(--avatar-size) * 0.5)",
    "头像字形按 --avatar-size 的比例取字号，不是文字层级角色；含 var() 但不落在任何 --text-* 上，显式登记",
  ],
  [
    ".profile-avatar-row .avatar",
    "32px",
    "72px 大头像的字形覆盖值；沿用 calc(var(--avatar-size) * 0.5) 的公式应为 36，这里调小到 32，非文字层级角色",
  ],
];

const norm = (sel) => sel.replace(/\s+/g, " ").trim();

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function parseRules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineOf = (index) => clean.slice(0, index).split("\n").length;
  const rules = [];
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = norm(rule[1].split(/[{}]/).pop());
    if (!head || head.startsWith("@")) continue;
    rules.push({
      selectors: head.split(",").map(norm),
      body: rule[2],
      bodyStart: rule.index + rule[0].indexOf("{") + 1,
    });
  }
  return { rules, lineOf };
}

const spaceProblems = [];
const fontProblems = [];

/* Luna 4 · var(--space-7) 不是间距刻度上的一档，它只是一个没人定义的名字，
   解析成"无效"后整条声明消失。放行 var() 之前先确认这个名字真的被定义过。 */
const definedTokens = new Set();
for (const file of walk(join(root, "app/web")))
  for (const decl of readFileSync(file, "utf8").matchAll(/(--[\w-]+)\s*:/g))
    definedTokens.add(decl[1]);
/* 有些 token 是量出来的，由 app 在运行时写进 style（--home-lead 等）：它们的定义
   在 .mjs 里，不在样式表里。 */
for (const file of readdirSync(join(root, "app/web")).filter((name) => name.endsWith(".mjs")))
  for (const decl of readFileSync(join(root, "app/web", file), "utf8").matchAll(/setProperty\(\s*['"`](--[\w-]+)/g))
    definedTokens.add(decl[1]);
/* var(--x, fallback)：兜底本身就是这条声明真正会用到的值，所以它要按同一套刻度
   受检。只有未定义 token 的兜底是"实际生效的那个值"，但一个写死的 7px 兜底不会因为
   包在 var() 里就变成刻度上的一档（Luna 2026-09-20 第二轮）。 */
function varFallbacks(value) {
  const found = [];
  for (let i = value.indexOf("var("); i !== -1; i = value.indexOf("var(", i + 4)) {
    let depth = 0, comma = -1, end = -1;
    for (let j = i + 3; j < value.length; j++) {
      const ch = value[j];
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (!depth) { end = j; break; } }
      else if (ch === "," && depth === 1 && comma === -1) comma = j;
    }
    if (end === -1) break;
    const name = value.slice(i + 4, comma === -1 ? end : comma).trim();
    const fallback = comma === -1 ? null : value.slice(comma + 1, end).trim();
    found.push({ name, fallback });
  }
  return found;
}
function unknownTokens(value) {
  return varFallbacks(value)
    .filter((entry) => !entry.fallback)
    .map((entry) => entry.name)
    .filter((name) => !definedTokens.has(name));
}

/* 含 var() 或相对单位（%、em、lh、vw、vh、dvh）的 calc()/min()/max()/clamp()/env() 表达式，
   或任意 var() 引用（含 fallback 链），一律放行：这是"已经建立在 token 或相对量上"的那一层，
   不逐条登记。真正需要登记的是游离的 px 字面量本身。 */
function isDerivedOrRelative(part) {
  if (/var\(/.test(part)) return true;
  if (/^(calc|min|max|clamp|env)\(/.test(part) && /(%|em|lh|rem|ch|vw|vh|dvh)/.test(part)) return true;
  if (/^-?\d+(\.\d+)?(%|em|lh|rem|ch|vw|vh|dvh)$/.test(part)) return true;
  return false;
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const { rules, lineOf } = parseRules(text);

  for (const rule of rules) {
    /* Luna 4 · 块内最后一条声明可以省掉分号；漏掉它等于给每条规则留一个后门。 */
    for (const decl of rule.body.matchAll(/(?<![-\w])([a-z-]+)\s*:\s*([^;{}]+?)\s*(?:;|$)/g)) {
      const prop = decl[1];
      const rawValue = decl[2];
      const value = rawValue.trim();
      const at = rule.bodyStart + decl.index + decl[0].length - rawValue.length - 1;
      const where = () => `${relative(root, file)}:${lineOf(at)}`;

      if (SPACING_PROPS.has(prop) || prop === "font-size") {
        const unknown = unknownTokens(value);
        if (unknown.length) {
          const problems = SPACING_PROPS.has(prop) ? spaceProblems : fontProblems;
          problems.push(`${where()}: ${rule.selectors[0]} 的 ${prop} 引用了未定义的 token ${unknown.join(", ")}`);
          continue;
        }
      }

      if (SPACING_PROPS.has(prop)) {
        const withoutImportant = value.replace(/!\s*important\s*$/, "").trim();
        const parts = splitTopLevel(withoutImportant);
        for (const { name, fallback } of varFallbacks(withoutImportant))
          if (fallback) parts.push(...splitTopLevel(fallback).map((part) => ({ part, inFallbackOf: name })));
        for (const entry of parts) {
          const part = typeof entry === "string" ? entry : entry.part;
          const inFallbackOf = typeof entry === "string" ? null : entry.inFallbackOf;
          if (part === "0" || part === "0px" || part === "auto" || part === "inherit" || part === "normal") continue;
          if (isDerivedOrRelative(part) && !inFallbackOf) continue;
          if (inFallbackOf && /var\(/.test(part)) continue;
          const m = /^(-?\d+(?:\.\d+)?)px$/.exec(part);
          if (!m) {
            if (!inFallbackOf) spaceProblems.push(`${where()}: ${rule.selectors[0]} 的 ${prop} 有一个看不懂的值 ${part}`);
            continue;
          }
          const num = parseFloat(m[1]);
          if (Math.abs(num) <= 3) continue; // 全局：1–3px 发丝/光学偏移放行
          /* Luna 4 · 登记是"这个选择器的这个属性的这个值"，不是选择器＋值就通行：
             为 padding 写的理由不替 margin 背书。 */
          const registered = REGISTERED_SPACE.find(
            ([sel, registeredProp, val]) => rule.selectors.includes(sel) && registeredProp === prop && val === part,
          );
          if (registered) continue;
          spaceProblems.push(
            `${where()}: ${rule.selectors[0]} 的 ${prop} 是游离值 ${part}` +
              (inFallbackOf ? `（写在 var(${inFallbackOf}, …) 的兜底里）` : "") +
              `；改用 var(--space-*)、写成 calc(...) 的派生式，或先进 lint-spacing 的登记表`,
          );
        }
      }

      if (prop === "font-size") {
        if (value === "inherit") continue;
        if (/^var\(--text-[\w-]+\)$/.test(value)) continue;
        if (/^-?\d+(\.\d+)?(em|lh)$/.test(value)) continue;
        const registered = REGISTERED_FONT.find(
          ([sel, val]) => rule.selectors.includes(sel) && val === value,
        );
        if (registered) continue;
        fontProblems.push(
          `${where()}: ${rule.selectors[0]} 的 font-size 是游离值 ${value}；` +
            `改用 var(--text-*)，或先进 lint-spacing 的 REGISTERED_FONT 登记表`,
        );
      }
    }
  }
}

const problems = [...spaceProblems, ...fontProblems];
for (const problem of problems) console.log(problem);
if (problems.length) {
  console.error(`lint-spacing: ${problems.length} 处违反 G3 token 治理（间距 ${spaceProblems.length} · 字号 ${fontProblems.length}）`);
  process.exit(1);
}
console.log(
  `lint-spacing: ok (${files.length} files · 间距 var(--space-*)/0/auto/派生式/登记表 · ` +
    `字号 var(--text-*)/inherit/em/登记表；1–3px 全局放行）`,
);
console.log(
  `lint-spacing: 登记表 ${REGISTERED_SPACE.length} 条间距 + ${REGISTERED_FONT.length} 条字号`,
);
