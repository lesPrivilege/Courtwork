#!/usr/bin/env node
// 交互语法负规则 lint（WK-140 / WK-146）。三项检查，都只看 app/web 源码的字面事实：
//   1. `running ≠ progress` / `estimate ≠ meter`：不得创建 `progress` / `meter`
//      元素，不得声明 `role="progressbar"` / `role="meter"`，不得出现
//      `aria-valuenow` —— 不确定的执行不画完成度，启发式估算不画余量刻度
//      （`runtime-view.mjs` 的 context 条与两处 railCard 头注已把这条写死，
//      本文件把注释升为检查项）；
//   2. `numeric ≠ slider` 的空集守恒：不得出现 `input` 的 `type` 为 `range`
//      的写法。今日全库无数值输入控件，这条守的是"空集不被悄悄破掉"；
//   3. 登记表：以上任一命中都必须在下面 REGISTERED 表里有一条已裁定的例外，
//      表外一处即失败。**本单交付时该表为空**（EX-PG1 §3 Q1：三项零命中）。
//
// WK-146 只把机械可查的两条负规则放进 lint。`complex ≠ graph`（今日无拓扑对象，
// 不适用）与 `high-risk ≠ confirm dialog`（由 review-projection §6、无 Always allow、
// WK-122 "undo over confirmation" 承担）不进本文件，留作评审判据。因此本文件通过
// **不等于**"四条负规则已全部被代码检验"。
//
// 实现取舍（WK-140 允许的取巧）：只做正则扫描源码字面量，不引 parser、不加依赖。
// 注释里出现这些字样是合法的（现有代码里就有"no progress bar, no percentage"等多处
// 解释性注释），所以先扫出注释区间，再把落在注释里的命中丢弃。区间扫描器认得行注释、
// 块注释与三种字符串（含模板串的 `${}` 嵌套），但**不认正则字面量**：若某天出现一个
// 内含引号的正则，扫描器会错位。错位方向是把注释当代码 → 只会多报，不会漏报，交由人
// 复核，这是 lint 该有的失败方向。
// 第四项（WO-PG-01 复核补，Fable）：`markdown-reader.mjs` 用 `doc.createElement(node.tag)`，
// tag 来自投影而非字面量，正则永远够不着它；守住那条路径的是它自己的闭集
// `ALLOWED_TAGS`。闭集可以字面检查：一旦有人往里加 progress / meter，上面三项会全程
// 沉默。所以本文件也检查闭集本身。
// 扫描面含 `.html`（`lint-colors.mjs` 同样如此）：index.html 里的可见文案"Run in
// progress"不含 `<`，不会被 `<progress` 命中；HTML 只剥 `<!-- -->`，不套 JS 的状态机。
// 用法：node tools/lint-interaction.mjs [files...]；无参数时扫描 app/web/**/*.{mjs,html}。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "vendor" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(?:mjs|html)$/.test(name)) out.push(p);
  }
  return out;
}
const files = args.length ? args : walk(join(root, "app/web"));

/* 三条负规则的闭集。登记表条目的 `rule` 只能取其一。 */
const RULES = new Set([
  "running-not-progress",
  "estimate-not-meter",
  "numeric-not-slider",
]);
/* WK-146 ① 那一组（progress / meter / role / aria-valuenow）的例外，除了指向一条已测量
   的 owner fact，还必须给出 current 与 limit 两个**同口径**的量——没有上限就没有刻度。 */
const NEEDS_SCALE = new Set(["running-not-progress", "estimate-not-meter"]);

/* WK-146 的登记表：哪一处命中是已裁定的例外。键是 `<文件相对路径>:<语义键>`，
   值是 { rule, fact, reason }；rule 取上面闭集，fact 指向一条**已测量**的 owner fact
   （① 组另需 current / limit 同口径），reason 是一句裁定出处。
   **今日为空**：EX-PG1 §3 Q1 清点 `app/web` 对这三项零命中，空表加上"表外一处即失败"
   就是 WK-140 这条裁定的冻结形式。往表里加一行 = 声称有人裁定过这处例外，不是绕过。 */
const REGISTERED = new Map([]);

/* 语义键 → 它属于哪条规则、怎么在字面上认出来、报错怎么说。
   `patterns` 全部对**原始文本**匹配，命中后再按注释区间过滤。 */
const CHECKS = [
  {
    key: "progress-element",
    rule: "running-not-progress",
    // el("progress"…) / element('progress'…) / createElement("progress") / 字面 "<progress"
    patterns: [
      /(?<![\w$.])(?:el|element)\s*\(\s*(["'`])progress\1/g,
      /createElement(?:NS)?\s*\([^)]*?(["'`])progress\1/g,
      /<\s*progress\b/g,
    ],
    say: "创建了 progress 元素",
  },
  {
    key: "meter-element",
    rule: "estimate-not-meter",
    patterns: [
      /(?<![\w$.])(?:el|element)\s*\(\s*(["'`])meter\1/g,
      /createElement(?:NS)?\s*\([^)]*?(["'`])meter\1/g,
      /<\s*meter\b/g,
    ],
    say: "创建了 meter 元素",
  },
  {
    key: "role-progressbar",
    rule: "running-not-progress",
    // role: "progressbar" / role="progressbar" / setAttribute("role", "progressbar")
    patterns: [
      /(?<![\w-])role\s*[:=]\s*(["'`])progressbar\1/g,
      /(["'`])role\1\s*,\s*(["'`])progressbar\2/g,
    ],
    say: '声明了 role="progressbar"',
  },
  {
    key: "role-meter",
    rule: "estimate-not-meter",
    patterns: [
      /(?<![\w-])role\s*[:=]\s*(["'`])meter\1/g,
      /(["'`])role\1\s*,\s*(["'`])meter\2/g,
    ],
    say: '声明了 role="meter"',
  },
  {
    key: "aria-valuenow",
    /* WK-146 ③：aria-valuenow 同 ①。它就是 progressbar / meter 共用的那个"当下值落在
       min…max 刻度上的哪里"，没有已测量的上限就不该出现。 */
    rule: "estimate-not-meter",
    patterns: [/aria-valuenow/g],
    say: "出现了 aria-valuenow",
  },
  {
    key: "input-range",
    rule: "numeric-not-slider",
    // type: "range" / type:'range' / type="range" / setAttribute("type","range")
    patterns: [
      /(?<![\w-])type\s*[:=]\s*(["'`])range\1/g,
      /(["'`])type\1\s*,\s*(["'`])range\2/g,
    ],
    say: '出现了 input 的 type="range"',
  },
];

/* 注释区间：行注释、块注释；三种字符串按原样保留（`el("progress")` 的标签名就在串里）。
   模板串的 `${}` 用一个深度栈回到普通状态。不识别正则字面量，见文件头注的取舍说明。 */
function commentRanges(text, isHtml = false) {
  const ranges = [];
  if (isHtml) {
    for (const hit of text.matchAll(/<!--[\s\S]*?-->/g))
      ranges.push([hit.index, hit.index + hit[0].length]);
    return ranges;
  }
  const stack = [];
  let mode = "code";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (mode === "code") {
      if (c === "/" && next === "/") { mode = "line"; start = i; i += 1; }
      else if (c === "/" && next === "*") { mode = "block"; start = i; i += 1; }
      else if (c === "'") mode = "single";
      else if (c === '"') mode = "double";
      else if (c === "`") mode = "template";
      else if (c === "}" && stack.length) mode = stack.pop();
    } else if (mode === "line") {
      if (c === "\n") { ranges.push([start, i]); mode = "code"; }
    } else if (mode === "block") {
      if (c === "*" && next === "/") { ranges.push([start, i + 2]); mode = "code"; i += 1; }
    } else if (mode === "single" || mode === "double") {
      if (c === "\\") i += 1;
      else if (c === (mode === "single" ? "'" : '"')) mode = "code";
      else if (c === "\n") mode = "code"; /* 未闭合的引号不吃掉整个文件。 */
    } else if (mode === "template") {
      if (c === "\\") i += 1;
      else if (c === "`") mode = "code";
      else if (c === "$" && next === "{") { stack.push("template"); mode = "code"; i += 1; }
    }
  }
  if (mode === "line" || mode === "block") ranges.push([start, text.length]);
  return ranges;
}

/* 闭集本身的检查（见文件头注第四项）：名字里带 ALLOWED_TAGS 的字面 Set。 */
const ALLOWLIST = /ALLOWED_TAGS\s*=\s*new Set\(\s*\[([^\]]*)\]/g;
const FORBIDDEN_TAGS = ["progress", "meter"];

const problems = [];
let admitted = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const path = relative(root, file);
  const ranges = commentRanges(text, /\.html$/.test(file));
  const inComment = (index) => ranges.some(([a, b]) => index >= a && index < b);
  const lineOf = (index) => text.slice(0, index).split("\n").length;

  /* 闭集检查：动态 tag 的那条路径由 ALLOWED_TAGS 守，不由上面的正则守。 */
  for (const hit of text.matchAll(ALLOWLIST)) {
    if (inComment(hit.index)) continue;
    const listed = [...hit[1].matchAll(/(["'`])([a-zA-Z0-9-]+)\1/g)].map((m) => m[2]);
    for (const tag of FORBIDDEN_TAGS)
      if (listed.includes(tag))
        problems.push(
          `${path}:${lineOf(hit.index)}: 动态 tag 的闭集 ALLOWED_TAGS 放进了 ${tag}——` +
            `上面三项检查够不着 createElement(变量)，闭集一旦放行就没有第二道门（WK-146）`,
        );
  }

  for (const check of CHECKS) {
    for (const pattern of check.patterns) {
      pattern.lastIndex = 0;
      for (const hit of text.matchAll(pattern)) {
        if (inComment(hit.index)) continue;
        const where = `${path}:${lineOf(hit.index)}`;
        const entry = REGISTERED.get(`${path}:${check.key}`);
        if (!entry) {
          problems.push(
            `${where}: ${check.say}（${check.rule}），但不在 WK-146 登记表内：${hit[0].trim()}`,
          );
          continue;
        }
        /* 登记过的也要看条目本身立不立得住：绕过写成登记的一行同样是绕过。 */
        const flaws = [];
        if (entry.rule !== check.rule)
          flaws.push(`登记的 rule 是 ${entry.rule}，此处属 ${check.rule}`);
        if (!RULES.has(entry.rule)) flaws.push(`rule 不在闭集内：${entry.rule}`);
        if (!entry.fact || !entry.reason)
          flaws.push("条目缺 fact（已测量的 owner fact）或 reason（裁定出处）");
        if (NEEDS_SCALE.has(check.rule) && !(entry.current && entry.limit))
          flaws.push("meter 类例外须给出同口径的 current 与 limit 两个已测量的量");
        if (flaws.length)
          problems.push(`${where}: 登记表条目不成立——${flaws.join("；")}`);
        else admitted += 1;
      }
    }
  }
}

for (const problem of problems) console.log(problem);
if (problems.length) {
  console.error(`lint-interaction: ${problems.length} 处违反 WK-140 / WK-146`);
  process.exit(1);
}
console.log(
  `lint-interaction: ok (${files.length} files · progress/meter、role 与 aria-valuenow、input[type=range]、ALLOWED_TAGS 闭集四项 · 登记例外 ${REGISTERED.size} 条${admitted ? ` · 放行命中 ${admitted} 处` : ""})`,
);
