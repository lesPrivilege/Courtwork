#!/usr/bin/env node
// Builds the Spark / Attention direction sheet. First column: the glyph pair
// and the product names only, at 16 / 18 / 20 / 24, light and dark, beside
// Chat and the generic seats. Nav photographs (capture-nav.mjs) follow. The
// explanations sit in their own section at the end, on purpose.
//
//   node engineering/design/product-icons-2026-09-11/atmosphere-20260911/build-sheet.mjs
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../../..");
const sprite = await readFile(path.join(ROOT, "app/web/vendor/icons.svg"), "utf8");
const styles = await readFile(path.join(ROOT, "app/web/styles.css"), "utf8");
const notes = JSON.parse(await readFile(path.join(here, "directions.json"), "utf8"));
const inner = (svg) => svg.replace(/^[\s\S]*?>\s*(?=<)/, "").replace(/<\/svg>\s*$/, "").trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const dirs = [];
for (const name of (await readdir(path.join(here, "directions"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const files = {};
  for (const glyph of ["spark", "attention"]) {
    const raw = await readFile(path.join(here, "directions", name, `${glyph}.svg`), "utf8");
    files[glyph] = { inner: inner(raw), sha256: createHash("sha256").update(raw).digest("hex") };
  }
  dirs.push({ name, ...files, note: notes[name] ?? {} });
}
const order = ["a", "b", "c", "current"];
dirs.sort((x, y) => order.indexOf(x.name) - order.indexOf(y.name));

const symbol = (id, body) => `<symbol id="${id}" viewBox="0 0 24 24">${body}</symbol>`;
const defs = `<svg hidden style="display:none">${sprite.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}${dirs.map((d) => symbol(`d-${d.name}-spark`, d.spark.inner) + symbol(`d-${d.name}-attention`, d.attention.inner)).join("")}</svg>`;
const use = (id, size) => `<svg class="ui-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
const sizes = [16, 18, 20, 24];
const seat = (id, size, label) => `<span class="seat" data-size="${size}"><span class="slot">${use(id, size)}</span><span class="name">${esc(label)}</span></span>`;

const firstLook = (theme) => `<div class="ground ${theme}"><h2>${theme === "light" ? "Light" : "Dark"}</h2>
<table class="look"><thead><tr><th>direction</th>${sizes.map((s) => `<th>${s}px</th>`).join("")}<th>with Chat and generic seats · 16px (nav size)</th></tr></thead><tbody>
${dirs.map((d) => `<tr data-direction="${d.name}"><th scope="row">${esc(d.note.title ?? d.name)}<small>${d.name === "current" ? "current · provisional" : "direction " + d.name.toUpperCase()}</small></th>${sizes.map((s) => `<td class="pair">${seat(`d-${d.name}-spark`, s, "Spark")}${seat(`d-${d.name}-attention`, s, "Attention")}</td>`).join("")}<td class="context"><span class="nav">${seat("square-pen", 16, "New chat")}${seat("house", 16, "Home")}${seat("chat", 16, "Chat")}${seat(`d-${d.name}-attention`, 16, "Attention")}${seat(`d-${d.name}-spark`, 16, "Spark")}</span><span class="nav generic">${["search", "settings-2", "plug", "folder", "file-text", "refresh-cw"].map((n) => use(n, 16)).join("")}</span></td></tr>`).join("\n")}
</tbody></table></div>`;

const navShots = async () => {
  let manifest = null;
  try { manifest = JSON.parse(await readFile(path.join(here, "nav/manifest.json"), "utf8")); } catch { return "<p class=legend>Nav photographs not captured yet (run capture-nav.mjs against a running app).</p>"; }
  const rows = [];
  for (const theme of ["light", "dark"]) {
    rows.push(`<div class="ground ${theme} shots"><h2>Real navigation · ${theme} · 1× and 2×</h2><div class="shot-row">${dirs.map((d) => {
      const one = manifest.shots.find((s) => s.direction === d.name && s.theme === theme && s.dpr === 1);
      const two = manifest.shots.find((s) => s.direction === d.name && s.theme === theme && s.dpr === 2);
      return `<figure><figcaption>${esc(d.note.title ?? d.name)} <small>${d.name === "current" ? "current" : d.name.toUpperCase()}</small></figcaption>${one ? `<img src="nav/${one.file}" width="${one.clip.w}" alt="">` : ""}${two ? `<img src="nav/${two.file}" width="${two.clip.w}" alt="">` : ""}</figure>`;
    }).join("")}</div></div>`);
  }
  return rows.join("\n");
};

const explain = `<section class="explain"><h2>Notes · read after looking</h2>
${dirs.map((d) => `<article data-direction="${d.name}"><h3>${esc(d.note.title ?? d.name)} <small>${d.name === "current" ? "current · provisional" : "direction " + d.name.toUpperCase()}</small></h3>
<dl><dt>Spark</dt><dd>${esc(d.note.spark ?? "")}</dd><dt>Attention</dt><dd>${esc(d.note.attention ?? "")}</dd><dt>Together</dt><dd>${esc(d.note.together ?? "")}</dd><dt>Sources</dt><dd><code>directions/${d.name}/spark.svg</code> ${d.spark.sha256.slice(0, 12)} · <code>directions/${d.name}/attention.svg</code> ${d.attention.sha256.slice(0, 12)}</dd></dl></article>`).join("\n")}
<article><h3>Recommendation</h3><p>${esc(notes.recommendation ?? "")}</p></article>
</section>`;

const rootBlock = styles.slice(styles.indexOf("/* ==== tier:S · skin lead-gray（铅灰）· light"), styles.indexOf("/* ==== tier:S · skin lead-gray · dark"));
const darkBlock = styles.slice(styles.indexOf("/* ==== tier:S · skin lead-gray · dark"), styles.indexOf("@media (prefers-color-scheme: dark)", styles.indexOf("/* ==== tier:S · skin lead-gray · dark")));
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spark / Attention · direction sheet</title>
<style>
${rootBlock.replace(/:root/g, ".ground.light")}
${darkBlock.replace(/:root\[data-theme="dark"\]/g, ".ground.dark").replace(/:root/g, ".ground.dark")}
body{margin:0;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;background:#8a8f93;color:#111}
.ground{padding:20px 28px;background:var(--gray-1,#f8fafb);color:var(--gray-12,#242d33)}
.ground.dark{background:var(--gray-1,#11171b);color:var(--gray-12,#e4ebef)}
h1{font-size:18px;margin:0 0 2px;font-weight:600}h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 10px;opacity:.7;font-weight:600}
h3{font-size:14px;margin:18px 0 4px}h3 small,th small,figcaption small{font-weight:400;opacity:.6;margin-left:6px;font-size:11px}
table.look{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:middle;padding:10px 12px;border-bottom:1px solid rgba(128,128,128,.3)}
thead th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.65;font-weight:500}
th[scope=row]{width:150px;font-weight:500}th[scope=row] small{display:block;margin:0}
.pair{white-space:nowrap}.seat{display:inline-flex;align-items:center;gap:8px;margin-right:18px;vertical-align:middle}
.slot{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px}
.name{font-size:14px}.context .nav{display:inline-flex;gap:0;align-items:center}.context .nav .seat{margin-right:14px}
.context .generic{opacity:.5;margin-left:8px}.context .generic svg{margin-right:8px}
.shots .shot-row{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0}figcaption{font-size:12px;margin-bottom:6px}figure img{display:block;margin-bottom:8px;border:1px solid rgba(128,128,128,.35)}
.explain{padding:20px 28px;background:#fff;color:#222;max-width:960px}.explain dl{margin:0;display:grid;grid-template-columns:90px 1fr;gap:4px 12px;font-size:13px}.explain dt{opacity:.6}.explain dd{margin:0}
.legend{font-size:12px;opacity:.7;margin:0 0 12px}
</style>
${defs}
<div class="ground light"><h1>Spark / Attention · three paired directions</h1><p class="legend">Look first, read later. Each row is one pair; the last row is the current provisional pair for comparison. Sizes are the four admitted optical sizes; the product navigation uses 16px in a 32px seat. Chat and the generic Lucide seats are the real neighbours. Black and white only.</p></div>
${firstLook("light")}
${firstLook("dark")}
${await navShots()}
${explain}
`;
await writeFile(path.join(here, "sheet.html"), html);
const manifest = { generated: new Date().toISOString(), directions: Object.fromEntries(dirs.map((d) => [d.name, { title: d.note.title ?? null, spark: d.spark.sha256, attention: d.attention.sha256 }])), sheet: "sheet.html" };
await writeFile(path.join(here, "directions-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`sheet.html · ${dirs.length} directions`);
