#!/usr/bin/env node
// Shape 治理 lint（WK-128 ④ 静态那一层；派单 EX-CS1 §6）。一条检查，只看 CSS 的字面事实：
//   `border-radius` 的取值必须是六个 token 之一、显式 0、或一条由 token 派生的表达式
//   （`calc(var(--radius-*) ± Npx)`，可包在 `max()` 里表达公理的下限）。
// 游离数值（`50%`、`6px`、`10px`、某个组件私有的圆角）一律拒绝：圆角是有限的语义
// 角色表，不是每个组件各自的口味。确有非派生形状的（例如带尖角的气泡），先在下面的
// 登记表里写下它是什么、为什么，再写进样式表——与 lint-materials 的登记表同一个做法。
//
// 嵌套关系（R_child = max(R_min, R_parent − inset)）**不做**静态检查：选择器反推不出
// DOM 父子，inset 是布局事实。它由 evidence/fe05a/shape-checks.mjs 在真实渲染上量
// （SHAPE-*），这是 EX-CS1 §6 规则 2 的结论。
// 用法：node tools/lint-shapes.mjs [files...]；无参数时扫描 app/web/**/*.css。
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

/* 六个语义角色。`--radius` 是 `--radius-control` 的别名，一并接受。 */
const TOKENS = new Set([
  "--radius", "--radius-small", "--radius-control", "--radius-card",
  "--radius-container", "--radius-pill",
]);
/* 登记表：非 token、非派生，但形状本身是产品事实的少数几处。表外的游离值一律拒绝。 */
const REGISTERED = new Map([
  [
    ".user-message-content",
    "用户消息气泡：三个圆角 + 一个收窄的尾角，方向本身是这条消息属于谁的记号（WK-94）；" +
      "尾角 6 = --radius-control − 2，另外三角是气泡自己的形状，不属于容器角色表",
  ],
]);

const norm = (sel) => sel.replace(/\s+/g, " ").trim();
const problems = [];
const circles = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  /* 注释按行保留换行，行号才指得回原文。 */
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineOf = (index) => clean.slice(0, index).split("\n").length;
  const where = (index) => `${relative(root, file)}:${lineOf(index)}`;

  const rules = [];
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = norm(rule[1].split(/[{}]/).pop());
    if (!head || head.startsWith("@")) continue;
    rules.push({
      selectors: head.split(",").map(norm),
      body: rule[2],
      index: rule.index,
      /* 声明自己的行号，不是规则起头的行号：报错要指得回那一行。 */
      bodyStart: rule.index + rule[0].indexOf("{") + 1,
    });
  }

  for (const rule of rules) {
    for (const declaration of rule.body.matchAll(/(?<![-\w])border(?:-[a-z]+)*-radius\s*:\s*([^;]+)/g)) {
      const value = declaration[1].trim();
      const at = rule.bodyStart + declaration.index;
      const registered = rule.selectors.find((selector) => REGISTERED.has(selector));
      if (registered) continue;
      /* 一条声明可以有多个角（`8px 8px 0 0`），逐段判；括号内的空格不切。 */
      const parts = [];
      let depth = 0;
      let current = "";
      for (const character of value.split("/")[0].trim()) {
        if (character === "(") depth += 1;
        if (character === ")") depth -= 1;
        if (/\s/.test(character) && depth === 0) {
          if (current) parts.push(current);
          current = "";
          continue;
        }
        current += character;
      }
      if (current) parts.push(current);
      for (const part of parts) {
        if (/^0(px|rem|em)?$/.test(part)) continue;
        const tokens = [...part.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
        /* 派生式里可以出现别的 token —— 内缩本来就是间距事实（`--panel-padding`）；
           要求的是这一段至少建立在一个形状角色之上，而不是凭空一个数字。 */
        const shaped = /^(max|min|clamp|calc|var)\(/.test(part);
        if (shaped && tokens.some((token) => TOKENS.has(token))) continue;
        if (shaped) {
          problems.push(`${where(at)}: ${rule.selectors[0]} 的 border-radius 不建立在任何形状角色上：${part}`);
          continue;
        }
        if (/%$/.test(part)) {
          problems.push(
            `${where(at)}: ${rule.selectors[0]} 用 ${part} 表达满弧；满弧写 var(--radius-pill)（WK-128 ③）`,
          );
          continue;
        }
        problems.push(
          `${where(at)}: ${rule.selectors[0]} 的 border-radius 是游离值 ${part}；` +
            `改用 token、写成 calc(var(--radius-*) ± Npx) 的派生式，或先进 lint-shapes 的登记表`,
        );
      }
      if (/var\(\s*--radius-pill\s*\)/.test(value))
        circles.push(`${where(at)} ${rule.selectors.join(", ")}`);
    }
  }
}

for (const problem of problems) console.log(problem);
if (problems.length) {
  console.error(`lint-shapes: ${problems.length} 处违反 WK-128`);
  process.exit(1);
}
console.log(`lint-shapes: ok (${files.length} files · token / 0 / 派生式三种取值)`);
console.log(`lint-shapes: 满弧登记 ${circles.length} 处（人工复核 isolated / prominent，见 WK-128 ⑦）：`);
for (const circle of circles) console.log(`  ${circle}`);
