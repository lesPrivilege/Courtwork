#!/usr/bin/env node
// Renders the Pages figure of the single-red change language from the product's
// own fixture and row model (app/web/diff-fixture.mjs + diff-view.mjs), so the
// page and Settings speak from one sample. Output is a static SVG with class
// hooks only; colours come from site.css. Every text run carries textLength so
// the word blocks match their words in any monospace face.
//
//   node site/scripts/render-diff-figure.mjs   # writes site/src/assets/figures/change-language.svg
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diffModel, diffSummary } from "../../app/web/diff-view.mjs";
import { DIFF_PREVIEW } from "../../app/web/diff-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "site/src/assets/figures/change-language.svg");

const FS = 12, ADV = FS * 0.6, ROW = 22, X_TEXT = 112, TOP = 44, W = 720;
const rows = diffModel(DIFF_PREVIEW.lines);
const counts = diffSummary(rows);
const H = TOP + rows.length * ROW + 12;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n) => Math.round(n * 10) / 10;
const text = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${f(x)}" y="${f(y)}" font-size="${FS}" textLength="${f(s.length * ADV)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve"${extra}>${esc(s)}</text>`;
const MARK = { context: " ", add: "+", del: "−" };
const out = [];
out.push(`<svg class="fig fig-diff" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="fig-change-language-title fig-change-language-desc" xmlns="http://www.w3.org/2000/svg">`);
out.push(`  <title id="fig-change-language-title">One-colour change language</title>`);
out.push(`  <desc id="fig-change-language-desc">${esc(`Sample change in ${DIFF_PREVIEW.file}: lines that were there stay grey, the new line is red, and only the words that are actually new sit on a solid red block; the removed words sit on a grey block. Minus and plus markers and line numbers carry the meaning without colour. ${counts.added} added, ${counts.removed} removed. An illustrated revision.`)}</desc>`);
out.push(`  <text class="fig-label" x="16" y="20" font-size="11">${esc(`${DIFF_PREVIEW.file.toUpperCase()} · ${counts.added} ADDED · ${counts.removed} REMOVED`)}</text>`);
out.push(`  <line class="fig-rule" data-deco="rule" x1="16" y1="30" x2="${W - 16}" y2="30" />`);
rows.forEach((row, index) => {
  const y = TOP + index * ROW;
  const cls = row.kind === "add" ? "fig-diff-new" : "fig-diff-old";
  const oldNo = row.kind === "add" ? "" : String(row.oldNo ?? "");
  const newNo = row.kind === "del" ? "" : String(row.newNo ?? "");
  const group = [`  <g data-node="row-${index + 1}" data-diff="${row.kind}">`];
  if (oldNo) group.push("    " + text(48 - oldNo.length * ADV, y, oldNo, "fig-label fig-diff-no"));
  if (newNo) group.push("    " + text(80 - newNo.length * ADV, y, newNo, "fig-label fig-diff-no"));
  group.push("    " + text(92, y, MARK[row.kind], `fig-diff-mark ${cls}`));
  let cursor = X_TEXT;
  const segments = row.segments ?? [{ text: row.text, changed: false }];
  for (const segment of segments) {
    const width = segment.text.length * ADV;
    if (segment.changed) {
      const block = row.kind === "add" ? "fig-diff-block" : "fig-diff-old-block";
      group.push(`    <rect class="${block}" x="${f(cursor)}" y="${f(y - FS - 3)}" width="${f(width)}" height="${ROW}" />`);
      group.push("    " + text(cursor, y, segment.text, row.kind === "add" ? "fig-diff-block-ink" : "fig-diff-old"));
    } else {
      group.push("    " + text(cursor, y, segment.text, cls));
    }
    cursor += width;
  }
  group.push("  </g>");
  out.push(group.join("\n"));
});
out.push("</svg>");
writeFileSync(OUT, out.join("\n") + "\n");
console.log(`wrote ${path.relative(ROOT, OUT)} (${rows.length} rows, viewBox ${W}×${H})`);
