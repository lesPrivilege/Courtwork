#!/usr/bin/env node
// 对比度表：对每个 skin × 宗，解析 tier:S 与 tier:R，计算文字/非文字角色对默认底面的 WCAG 比值。
// 用法：node tools/contrast-report.mjs > evidence/wk7/contrast.md ；退出码 1 表示有角色低于门槛。
import { readFileSync } from "node:fs";
const root = new URL("..", import.meta.url).pathname;
const base = readFileSync(`${root}app/web/styles.css`, "utf8");
const skins = { "lead-gray": base, "gray-steel": base + "\n" + readFileSync(`${root}app/web/skins/gray-steel.css`, "utf8") };
function blocks(css, selector) {
  const out = {};
  const re = new RegExp(selector.replace(/[[\]().:*+?]/g, "\\$&") + "\\s*\\{([^}]*)\\}", "g");
  for (const m of css.matchAll(re)) for (const d of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}
function resolve(vars, v) { let s = v, n = 0; while (/var\(--/.test(s) && n++ < 10) s = s.replace(/var\(--([\w-]+)\)/g, (_, k) => vars[k] ?? "?"); return s; }
function hex(c) { c = c.trim(); if (!/^#/.test(c)) return null; let h = c.slice(1); if (h.length === 3) h = [...h].map((x) => x + x).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function lum([r, g, b]) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(a, b) { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); }
const pairs = [
  ["ink", "panel", 4.5], ["ink", "float", 4.5], ["ink", "frame", 4.5], ["muted-strong", "frame", 4.5], ["muted-strong", "panel", 4.5], ["muted-strong", "float", 4.5],
  ["muted", "panel", 3], ["accent-ink", "panel", 4.5], ["accent-ink", "float", 4.5],
  ["on-accent", "accent", 4.5], ["on-accent", "accent-strong", 4.5], ["danger", "panel", 4.5], ["success", "panel", 4.5],
  ["focus", "panel", 3], ["focus", "float", 3], ["ink", "hover", 4.5], ["ink", "selected", 4.5], ["ink", "accent-soft", 4.5],
  ["danger", "danger-soft", 4.5],
  ["attention-review", "panel", 4.5], ["attention-review", "float", 4.5],
];
let fail = 0;
console.log("# WK7 对比度表（WCAG 2.x 相对亮度）\n\n生成：`node tools/contrast-report.mjs`。门槛：文字 4.5:1，非文字 3:1。边线（line / line-strong）不作为控件的唯一指示（输入有焦点环），不设门槛，见 color-governance §2。\n");
for (const [skin, css] of Object.entries(skins)) {
  const R = blocks(css, ":root");
  for (const scheme of ["light", "dark"]) {
    let S = scheme === "light" ? R : { ...R, ...blocks(css, ':root[data-theme="dark"]') };
    if (scheme === "dark") S = { ...S, ...blocks(css, 'html[data-theme="dark"]') };
    if (skin === "lead-gray") {
      S = { ...S, ...blocks(css, 'html:not([data-skin="custom"]):not([data-skin="gray-steel"])') };
    }
    console.log(`## ${skin} · ${scheme}\n\n| 角色 | 底面 | 比值 | 门槛 | 结果 |\n|---|---|---:|---:|---|`);
    for (const [fg, bg, min] of [...pairs, ...(skin === "lead-gray" ? [["muted-strong", "panel-muted", 4.5]] : [])]) {
      const a = hex(resolve(S, S[fg] ?? "")), b = hex(resolve(S, S[bg] ?? ""));
      if (!a || !b) { console.log(`| ${fg} | ${bg} | 无法解析 | ${min} | 跳过 |`); continue; }
      const r = ratio(a, b); const ok = r >= min; if (!ok) fail++;
      console.log(`| ${fg} | ${bg} | ${r.toFixed(2)} | ${min} | ${ok ? "通过" : "**低于门槛**"} |`);
    }
    console.log("");
  }
}
if (fail) { console.error(`contrast-report: ${fail} 项低于门槛`); process.exit(1); }
