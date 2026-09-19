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
  // Control anatomy (type-density-constraints: 按钮 padding 5×10; field inline 10).
  // A global control metric, ruled by Opus in G3 review: not snapped.
  ["button", "5px", "控件解剖：按钮 padding 5×10（type-density-constraints 已裁）"],
  ["button", "10px", "控件解剖：按钮 padding 5×10（type-density-constraints 已裁）"],
  ["input", "10px", "控件解剖：输入框行内 padding 10，与按钮同一水平节奏"],
  // 6px / -6px · ui-composition-standard 节奏：标签与字段 6/8px（比 --space-2 紧一档的
  // chrome 间距，产品配置，不snap到刻度上）。
  [".project-toggle", "6px", "chrome 6/8 节奏"],
  [".session-mode-tag", "6px", "chrome 6/8 节奏"],
  [".message-header > .icon-only", "-6px", "图标光学对齐偏移，量级取 6/8 节奏而非发丝"],
  [".user-message-actions time", "6px", "chrome 6/8 节奏"],
  [".context-tab", "6px", "chrome 6/8 节奏"],
  [".context-chip", "6px", "chrome 6/8 节奏"],
  [".composer-model", "6px", "chrome 6/8 节奏"],
  [".home-composer-context .home-choice-select", "6px", "chrome 6/8 节奏"],
  [".draft-status", "6px", "chrome 6/8 节奏"],
  [".retained-source-summary", "6px", "chrome 6/8 节奏"],
  [".retained-version-entry", "6px", "chrome 6/8 节奏"],
  [".settings-form label", "6px", "label↔field 6/8 节奏"],
  [".connection-paths .segment", "6px", "segment 6/8 节奏"],
  [".ui-tooltip", "6px", "chrome 6/8 节奏"],
  [".permission-mode", "6px", "chrome 6/8 节奏"],
  [".context-row", "6px", "chrome 6/8 节奏"],
  [".repository-path-details > summary", "6px", "chrome 6/8 节奏"],
  [".connection-popover .segment", "6px", "segment 6/8 节奏"],
  [".settings-row .segment", "6px", "segment 6/8 节奏"],
  [".segment", "6px", "segment 6/8 节奏"],
  [".runtime-scope-tab", "6px", "tab 6/8 节奏"],
  [".runtime-switch", "6px", "chrome 6/8 节奏"],
  [".runtime-subtab", "6px", "tab 6/8 节奏"],
  [".composer-project", "6px", "chrome 6/8 节奏"],
  [".rail-open", "6px", "chrome 6/8 节奏"],
  [".settings-tab", "6px", "tab 6/8 节奏"],
  [".attention-preview-label", "6px", "chrome 6/8 节奏"],
  [".attention-suggestions button", "6px", "chrome 6/8 节奏"],
  [".attention-agent-status > p", "6px", "chrome 6/8 节奏"],
  [".attention-agent-composer", "6px", "chrome 6/8 节奏"],
  [".runtime-package-resources label", "6px", "chrome 6/8 节奏"],
  ["[data-package-editor] > label > span", "6px", "label↔field 6/8 节奏"],
  [".model-picker-current .eyebrow", "6px", "chrome 6/8 节奏"],
  [".model-picker-current .form-help", "6px", "chrome 6/8 节奏"],
  [".usage-heatmap", "6px", "chrome 6/8 节奏"],
  [".usage-stacked-chart", "6px", "chrome 6/8 节奏"],
  [".usage-series-label::before", "6px", "chrome 6/8 节奏"],
  [".usage-controls", "6px", "chrome 6/8 节奏"],
  [".spark-chip-row", "6px", "chrome 6/8 节奏"],
  [".spark-controls", "6px", "chrome 6/8 节奏"],
  [".assistant-message-actions", "6px", "chrome 6/8 节奏"],
  [".project-tag", "6px", "chrome 6/8 节奏"],
  [".command-option", "6px", "chrome 6/8 节奏"],
  [".account-identity", "6px", "chrome 6/8 节奏"],
  [".presentation-inline", "6px", "chrome 6/8 节奏"],
  [".nav-history-notice", "6px", "chrome 6/8 节奏"],
  [".markdown-reader__outline-link", "6px", "chrome 6/8 节奏"],
  [".markdown-reader__block :is(th", "6px", "table cell 6/8 节奏"],
  // ≥40px，不是明确的页面/section 布局 gutter 角色（与 --content-inset / --band-top /
  // --settings-gutter 数值巧合，但语义不同，不复用那些 token）。
  [".home-intro", "40px", "Home intro 块底部留白，与 --content-inset 数值巧合但角色不同（那是 Chat 内容列的水平内距）"],
  [".attention-workspace", "40px", "窄屏 attention-workspace 底部安全留白，与 --content-inset 数值巧合但角色不同"],
  [".attention-workspace", "48px", "页面底部留白，与 --band-top 数值巧合但角色不同（那是顶部 chrome 带高）"],
  [".chat-page", "48px", "页面底部留白，与 --band-top 数值巧合但角色不同"],
  [".attention-agent-empty", "48px", "空态居中留白，产品取值，非布局 gutter 角色"],
  [".attention-reading-empty", "72px", "空态居中留白，产品取值，非布局 gutter 角色"],
  [".attention-detail-head", "104px", "为绝对定位的返回控件（.attention-list-back）预留水平空间，非间距刻度或布局 gutter"],
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
    for (const decl of rule.body.matchAll(/(?<![-\w])([a-z-]+)\s*:\s*([^;]+);/g)) {
      const prop = decl[1];
      const rawValue = decl[2];
      const value = rawValue.trim();
      const at = rule.bodyStart + decl.index + decl[0].length - rawValue.length - 1;
      const where = () => `${relative(root, file)}:${lineOf(at)}`;

      if (SPACING_PROPS.has(prop)) {
        const withoutImportant = value.replace(/!\s*important\s*$/, "").trim();
        for (const part of splitTopLevel(withoutImportant)) {
          if (part === "0" || part === "0px" || part === "auto" || part === "inherit" || part === "normal") continue;
          if (isDerivedOrRelative(part)) continue;
          const m = /^(-?\d+(?:\.\d+)?)px$/.exec(part);
          if (!m) {
            spaceProblems.push(`${where()}: ${rule.selectors[0]} 的 ${prop} 有一个看不懂的值 ${part}`);
            continue;
          }
          const num = parseFloat(m[1]);
          if (Math.abs(num) <= 3) continue; // 全局：1–3px 发丝/光学偏移放行
          const registered = REGISTERED_SPACE.find(
            ([sel, val]) => rule.selectors.includes(sel) && val === part,
          );
          if (registered) continue;
          spaceProblems.push(
            `${where()}: ${rule.selectors[0]} 的 ${prop} 是游离值 ${part}；` +
              `改用 var(--space-*)、写成 calc(...) 的派生式，或先进 lint-spacing 的登记表`,
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
