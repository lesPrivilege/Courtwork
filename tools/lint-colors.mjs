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
if (bad) { console.error(`lint-colors: ${bad} 处颜色字面量位于 tier:S 之外`); process.exit(1); }
console.log(`lint-colors: ok (${files.length} files)`);
