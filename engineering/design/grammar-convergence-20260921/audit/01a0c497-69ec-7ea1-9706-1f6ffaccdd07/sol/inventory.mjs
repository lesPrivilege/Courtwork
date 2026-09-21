#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] || process.cwd());
const out = path.resolve(process.argv[3] || "inventory.json");
const files = ["app/web/styles.css", "app/web/surface-layout.css", "app/web/markdown-reader.css"];
const families = {
  typography: /font|text-|line-height|letter-spacing|reading|heading|title|label|caption|meta/i,
  spacing: /space-|gap|padding|margin|inset|measure|column/i,
  control: /control|button|input|select|tab|target|switch/i,
  glyph: /glyph|icon|svg|viewbox/i,
  header: /header|band-top|titlebar/i,
  toolbar: /toolbar|actions|command/i,
  container: /surface|panel|card|container|radius|border|shadow|reader|document|settings/i,
  motion: /transition|animation|transform|duration|reduced-motion/i,
};
const relevantDecl = /--(?:space|text|control|radius|line|panel|surface|band|column|doc|settings|font|shadow|motion|duration)|(?:font(?:-size|-family|-weight)?|line-height|letter-spacing|gap|padding|margin|min-height|height|width|min-width|max-width|border(?:-radius)?|background|box-shadow|transition|animation|transform)\s*:/i;

const rows = [];
for (const rel of files) {
  const lines = (await readFile(path.join(root, rel), "utf8")).split(/\r?\n/);
  const stack = [];
  let pending = "";
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    let text = lines[i];
    if (inComment) {
      const end = text.indexOf("*/");
      if (end < 0) continue;
      text = text.slice(end + 2);
      inComment = false;
    }
    for (;;) {
      const start = text.indexOf("/*");
      if (start < 0) break;
      const end = text.indexOf("*/", start + 2);
      if (end < 0) { text = text.slice(0, start); inComment = true; break; }
      text = text.slice(0, start) + text.slice(end + 2);
    }
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (trimmed.includes("{") && !trimmed.startsWith("@keyframes")) {
      const head = (pending + " " + trimmed.slice(0, trimmed.indexOf("{"))).trim();
      stack.push(head);
      pending = "";
    } else if (!stack.length && !trimmed.includes(";") && !trimmed.includes("}")) {
      pending += " " + trimmed;
    }
    if (relevantDecl.test(trimmed)) {
      const media = [...stack].reverse().find(value => value.startsWith("@media") || value.startsWith("@container")) || null;
      const selector = [...stack].reverse().find(value => !value.startsWith("@")) || ":root/inherited";
      const categories = Object.entries(families).filter(([, re]) => re.test(`${selector} ${trimmed}`)).map(([name]) => name);
      if (categories.length) rows.push({ file: rel, line: i + 1, selector, media, expression: trimmed.replace(/\s+/g, " "), categories });
    }
    const closes = (text.match(/}/g) || []).length;
    for (let n = 0; n < closes; n++) stack.pop();
  }
}

const tokenRows = rows.filter(row => /^--/.test(row.expression));
const inventory = {
  schemaVersion: 1,
  kind: "bounded-static-source-inventory",
  source: { sha: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), root: "." },
  scope: files,
  caveats: [
    "Static authored CSS only; this is not computed CSS or conformance evidence.",
    "Custom properties may inherit or be overridden later; media/container conditions are recorded from the authored nesting only.",
    "Selector and media fields are heuristic and unverified for multiline selectors nested in at-rules; raw file and line are authoritative. Use verifiedAnchors for the selected measured families.",
    "Rendered viewport, DPR, pointer mode, native zoom, text scaling and optical exceptions require independent browser measurement.",
  ],
  selectorScopeStatus: "heuristic-unverified-except-verifiedAnchors",
  verifiedAnchors: [
    { file: "app/web/styles.css", line: 335, selector: ".skin-contrast-probe, :root", media: null, family: "spacing", expression: "--space-1: 4px; through --space-8: 32px at lines 335–341" },
    { file: "app/web/styles.css", line: 382, selector: ".skin-contrast-probe, :root", media: null, family: "control", expression: "--control: 28px;" },
    { file: "app/web/styles.css", line: 398, selector: ".skin-contrast-probe, :root", media: null, family: "typography", expression: "--text-scale: 1; with text roles at lines 399–406" },
    { file: "app/web/styles.css", line: 537, selector: ".ui-icon", media: null, family: "glyph", expression: "width: 18px; height: 18px;" },
    { file: "app/web/styles.css", line: 5225, selector: ".settings-page-body", media: null, family: "container", expression: "grid-template-columns: var(--settings-nav) minmax(0, 1fr); gap: var(--space-8); padding: var(--space-6) var(--settings-gutter) var(--space-6);" },
    { file: "app/web/styles.css", line: 5250, selector: ".settings-tab", media: null, family: "control", expression: "min-height: var(--control); padding: 6px var(--space-2); font-size: var(--text-label);" },
    { file: "app/web/styles.css", line: 5292, selector: ".settings-sections", media: null, family: "container", expression: "max-width: var(--settings-measure); border: 1px solid var(--line); border-radius: var(--radius-container);" },
    { file: "app/web/styles.css", line: 6402, selector: ".chat-action-row > .icon-only", media: null, family: "control", expression: "width: 32px; min-width: 32px; height: 32px;" },
    { file: "app/web/styles.css", line: 6441, selector: ".chat-action-row > .icon-only", media: "@media (hover: none), (pointer: coarse), (max-width: 767px)", family: "control", expression: "width: 44px; min-width: 44px; height: 44px;" },
    { file: "app/web/surface-layout.css", line: 55, selector: ".surface-header .surface-tabs", media: null, family: "header", expression: "flex: 1 1 auto; overflow-x: auto; overflow-y: hidden;" },
    { file: "app/web/surface-layout.css", line: 63, selector: ".surface-header .toolbar", media: null, family: "toolbar", expression: "flex: none;" },
    { file: "app/web/markdown-reader.css", line: 10, selector: ".markdown-reader__toolbar", media: null, family: "toolbar", expression: "gap: var(--space-2); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line);" },
    { file: "app/web/markdown-reader.css", line: 24, selector: ".markdown-reader__document", media: null, family: "typography", expression: "padding: clamp(var(--space-4), 3vw, var(--space-8)); font-size: var(--text-reading); line-height: 1.6;" }
  ],
  tokenExpressions: tokenRows,
  families: Object.fromEntries(Object.keys(families).map(name => [name, rows.filter(row => row.categories.includes(name))])),
};
await writeFile(out, JSON.stringify(inventory, null, 2) + "\n");
console.log(JSON.stringify({ out, sha: inventory.source.sha, rows: rows.length, byFamily: Object.fromEntries(Object.keys(families).map(name => [name, inventory.families[name].length])) }));
