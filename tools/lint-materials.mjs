#!/usr/bin/env node
// 材质治理 lint（WK-101 / WK-102）。两条检查，都只看 CSS 的字面事实：
//   1. `backdrop-filter` 只出现在登记的类名上，且模糊档只能是 --blur-chrome /
//      --blur-transient 两个 token —— 组件不得私有取值，也不得靠 blur 的数值大小
//      表达层级；
//   2. 每一处半透明表面（用了 --glass / --glass-muted 作背景，或声明了
//      backdrop-filter）都有一条 `@media (prefers-reduced-transparency: reduce)`
//      的回退规则，把它落回实色 role。
// 用法：node tools/lint-materials.mjs [files...]；无参数时扫描 app/web/**/*.css。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "vendor" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.css$/.test(name)) out.push(p);
  }
  return out;
}
const files = args.length ? args : walk(join(root, "app/web"));

/* WK-101 的登记表：哪一个类名属于哪一层材质语义。表外的选择器不许有 backdrop-filter，
   新增一处就必须先在这里写下它是 Chrome 还是 Transient —— 侧栏与内容区（L0 / L1）
   永远不入表。 */
const REGISTERED = new Map([
  [".jump-latest-button", { layer: "chrome", blur: "--blur-chrome" }],
  [".context-popover", { layer: "transient", blur: "--blur-transient" }],
]);
/* 闭集：只有这两档，且 saturate() 只许出现在 transient。 */
const BLUR_TOKENS = new Set(["--blur-chrome", "--blur-transient"]);
const REDUCE_QUERY = "prefers-reduced-transparency";
/* 半透明背景的两个 role；用了它们就欠一条回退。 */
const GLASS = /var\(\s*(--glass|--glass-muted)\s*\)/;

const norm = (sel) => sel.replace(/\s+/g, " ").trim();
const problems = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  /* 注释按行保留换行，行号才指得回原文。 */
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineOf = (index) => clean.slice(0, index).split("\n").length;
  const where = (index) => `${relative(root, file)}:${lineOf(index)}`;

  /* @media 块的范围：一条规则是否落在 reduced-transparency 里，由它的起止位置决定。 */
  const reduceRanges = [];
  for (const match of clean.matchAll(/@media[^{]*\{/g)) {
    if (!match[0].includes(REDUCE_QUERY)) continue;
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < clean.length && depth > 0; i++) {
      if (clean[i] === "{") depth += 1;
      else if (clean[i] === "}") depth -= 1;
    }
    reduceRanges.push([match.index, i]);
  }
  const inReduce = (index) =>
    reduceRanges.some(([start, end]) => index >= start && index < end);

  /* 每条规则：选择器 → 声明块。嵌套的 @media 由上面的范围表回答，这里只逐条读规则。 */
  const rules = [];
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = norm(rule[1].split(/[{}]/).pop());
    if (!head || head.startsWith("@")) continue;
    rules.push({
      selectors: head.split(",").map(norm),
      body: rule[2],
      index: rule.index,
    });
  }

  /* ── 检查 1 · backdrop-filter 只在登记类名，且只用两个 token ── */
  for (const rule of rules) {
    const declarations = [
      ...rule.body.matchAll(/(?<![-\w])(?:-webkit-)?backdrop-filter\s*:\s*([^;]+)/g),
    ];
    if (!declarations.length) continue;
    for (const selector of rule.selectors) {
      const entry = REGISTERED.get(selector);
      if (!entry) {
        problems.push(
          `${where(rule.index)}: ${selector} 声明了 backdrop-filter，但不在 WK-101 登记表内`,
        );
        continue;
      }
      for (const declaration of declarations) {
        const value = declaration[1].trim();
        if (value === "none") continue;
        const tokens = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
        if (!tokens.length || tokens.some((token) => !BLUR_TOKENS.has(token)))
          problems.push(
            `${where(rule.index)}: ${selector} 的 blur 不是 --blur-chrome / --blur-transient：${value}`,
          );
        else if (!tokens.includes(entry.blur))
          problems.push(
            `${where(rule.index)}: ${selector} 登记为 ${entry.layer}，应取 ${entry.blur}：${value}`,
          );
        if (/saturate\(/.test(value) && entry.layer !== "transient")
          problems.push(
            `${where(rule.index)}: ${selector} 不是 transient 层，不得用 saturate()`,
          );
      }
    }
  }

  /* ── 检查 2 · 每处半透明表面都有 reduced-transparency 回退 ── */
  const owed = new Map();
  const paid = new Set();
  for (const rule of rules) {
    const translucent =
      GLASS.test(rule.body) ||
      /(?<![-\w])(?:-webkit-)?backdrop-filter\s*:/.test(rule.body);
    if (!translucent) continue;
    for (const selector of rule.selectors)
      if (inReduce(rule.index)) {
        /* 回退本身要说全：既落回实色，也关掉模糊。 */
        const solid = /background\s*:\s*var\(\s*--float\s*\)/.test(rule.body);
        const off = /backdrop-filter\s*:\s*none/.test(rule.body);
        if (solid && off) paid.add(selector);
        else
          problems.push(
            `${where(rule.index)}: ${selector} 的 reduced-transparency 回退不完整（需要 background: var(--float) 与 backdrop-filter: none）`,
          );
      } else if (!owed.has(selector)) owed.set(selector, rule.index);
  }
  for (const [selector, index] of owed)
    if (!paid.has(selector))
      problems.push(
        `${where(index)}: ${selector} 是半透明表面，但没有 @media (${REDUCE_QUERY}: reduce) 回退`,
      );
}

for (const problem of problems) console.log(problem);
if (problems.length) {
  console.error(`lint-materials: ${problems.length} 处违反 WK-101 / WK-102`);
  process.exit(1);
}
console.log(
  `lint-materials: ok (${files.length} files · 登记类名与 reduced-transparency 回退两项)`,
);
