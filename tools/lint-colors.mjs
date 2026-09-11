#!/usr/bin/env node
// 色彩三层治理 lint：颜色字面量只允许出现在标为 tier:S 的块内。
// 用法：node tools/lint-colors.mjs [files...]；无参数时扫描 app/web/**/*.{css,mjs,html}。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "vendor" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|mjs|html)$/.test(name)) out.push(p);
  }
  return out;
}
const files = args.length ? args : walk(join(root, "app/web"));
const literal = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color)\(|(?<![\w-])(?:white|black)(?![\w-])/;
const exempt = /mask-image|rgba\(var\(--alpha-|\/\*.*\*\/\s*$|^\s*\/\/|^\s*\*|white-space|color-scheme/;
let bad = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let inS = false;
  lines.forEach((line, i) => {
    if (/tier:S/.test(line)) inS = true;
    if (/tier:R|tier:U/.test(line)) inS = false;
    if (inS) return;
    if (exempt.test(line)) return;
    if (literal.test(line)) {
      bad += 1;
      console.log(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
    }
  });
}
/* 第二项检查（WK-69 / color-governance §7）：区域背景只允许引用高度层 role。
   界面只有四个高度层，取色由层级决定，区域不单独取色，所以 background /
   background-color 的值只能是层 role（frame / panel / panel-muted / float）、层内
   的交互态（hover / selected / pressed）、稀缺色的 soft 底、glass（L2 的半透明变体）、
   L3 的 scrim / backdrop，或者根本不着色（transparent / none / inherit /
   currentColor）。控件实心与数据标记不是"区域"，逐条登记在 FILL 表内，新增一处就必须
   在这里写下它是什么。 */
const LEVEL_BACKGROUNDS = new Set([
  "--frame", "--panel", "--panel-muted", "--float",
  "--hover", "--selected", "--pressed",
  "--accent", "--accent-strong", "--accent-soft", "--accent-ink",
  "--danger-soft", "--success-soft",
  "--glass", "--glass-muted", "--scrim", "--backdrop",
]);
const KEYWORDS = /^(transparent|none|inherit|currentColor|initial|unset)$/;
/* 登记的非区域填充：选择器 → 它是什么。只有实心控件与数据标记可以入表。 */
const FILL = new Map([
  [".usage-rank-bar", "VS-03 interval reported-token rank uses the existing usage series roles"],
  [".request-timing-bar", "VS-03 measured host interval, not a surface background"],
  [".request-timing-marker", "VS-03 measured first-output/text marker, including forced colors"],
  ...[0,1,2,3,4].map(level => [`.usage-heat.level-${level}`, "Reported token intensity; retained-scope data mark, outside review themes"]),
  [".usage-stacked-bar button", "Configured model token series; exact values/table and native forced-colors fallback"],
  [".usage-series-label::before", "Categorical model legend mark, paired with text and exact table"],
  ...[1, 2, 3, 4].map(level => [` .home-heatmap-cell[data-level="${level}"]`.trim(), "UTC retained-run count intensity; sequential data role, never review attention"]),
  [".runtime-switch input:checked::before", "Control accent: the on-state track of an authoritative switch (Astra 2026-09-11); not a surface"],
  [".runtime-switch input:checked:not(:disabled):hover::before", "Control accent hover on the same on-state track"],
  [".runtime-switch input:disabled::before", "Unavailable pair: pale track of a switch the contract disabled"],
  [".segmented:disabled", "Unavailable pair: pale track of a disabled segmented control"],
  [".diff-add-word", "Single-red change grammar: solid block only on words that are new (diff-view.mjs); not a surface, not danger"],
  ["#send-button", "圆形主控件的实心填充"],
  ["#cancel-run-button", "同槽的 Stop，实心填充"],
  ["#send-button:hover", "同上，按压态"],
  ["#cancel-run-button:hover", "同上，按压态"],
  ["#send-button:active", "同上，按压态"],
  ["#send-button:disabled", "同上，禁用态"],
  ["#cancel-run-button:active", "同上，按压态"],
  [".runtime-switch input::after", "开关滑块"],
  [".runtime-switch input:disabled::after", "开关滑块（禁用）"],
  [".context-bar-segment", "上下文用量的数据条"],
  ['.context-bar-segment[data-step="1"]', "同上，第 2 档"],
  ['.context-bar-segment[data-step="2"]', "同上，第 3 档"],
  ['.context-bar-segment[data-step="3"]', "同上，第 4 档"],
  ['.context-bar-segment[data-step="4"]', "同上，第 5 档"],
  // WO-WK10b 第一段：同一条规则，选择器随 WK-57 行解剖改名（summary 现在有
  // .flow-title 与 .flow-meta 两个 span，渐变只落在标题上）。豁免理由不变。
  [
    ".activity-group.is-working > summary > .flow-title",
    "background-clip: text 的文字渐变",
  ],
]);
const norm = (sel) => sel.replace(/\s+/g, " ").trim();
function levelCheck(file, text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const violations = [];
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = norm(rule[1].split(/[{}]/).pop()).split(",").map(norm);
    for (const decl of rule[2].matchAll(/(?<![-\w])(background|background-color)\s*:\s*([^;]+)/g)) {
      const value = decl[2].trim();
      const vars = [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
      const ok = vars.length
        ? vars.every((v) => LEVEL_BACKGROUNDS.has(v))
        : KEYWORDS.test(value);
      if (ok) continue;
      if (selectors.every((sel) => FILL.has(sel))) continue;
      const line = clean.slice(0, decl.index + rule.index).split("\n").length;
      violations.push(`${relative(root, file)}:${line}: ${selectors.join(", ")} { ${decl[0].trim()} }`);
    }
  }
  return violations;
}
let level = 0;
for (const file of files) {
  if (!/\.(css|mjs)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  const body = /\.mjs$/.test(file)
    ? [...text.matchAll(/`([^`]*background[^`]*)`/g)].map((m) => `x{${m[1]}}`).join("\n")
    : text;
  for (const v of levelCheck(file, body)) { level += 1; console.log(v); }
}
if (bad) console.error(`lint-colors: ${bad} 处颜色字面量位于 tier:S 之外`);
if (level) console.error(`lint-colors: ${level} 处区域背景未引用高度层 role（WK-69）`);
if (bad || level) process.exit(1);
console.log(`lint-colors: ok (${files.length} files · 字面量与高度层两项)`);
