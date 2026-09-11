#!/usr/bin/env node
// Contact sheet for the product glyph set: every symbol in the sprite at the
// four admitted optical sizes (16 row · 18 control · 20 navigation · 24
// specimen), on light and dark grounds, in monochrome and under a forced-colors
// simulation, next to its text fallback. The sheet reads the built sprite and
// the two source manifests, so it cannot show a glyph the product cannot load.
//
//   node tools/ui-vendor/contact-sheet.mjs            # writes engineering/design/product-icons-2026-09-11/contact-sheet.html
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const OUT_DIR = path.join(ROOT, "engineering/design/product-icons-2026-09-11");
const sprite = await readFile(path.join(ROOT, "app/web/vendor/icons.svg"), "utf8");
const lucide = JSON.parse(await readFile(path.join(here, "lucide/sources.json"), "utf8"));
const courtwork = JSON.parse(await readFile(path.join(here, "courtwork/sources.json"), "utf8"));
const registry = JSON.parse(await readFile(path.join(ROOT, "engineering/design/product-semantics/registry.json"), "utf8"));
const styles = await readFile(path.join(ROOT, "app/web/styles.css"), "utf8");
const symbols = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
const consumers = new Map();
const names = new Map();
for (const entry of registry.entries) if (entry.glyphRef) { consumers.set(entry.glyphRef, [...(consumers.get(entry.glyphRef) ?? []), entry.semanticKey]); if (!names.has(entry.glyphRef)) names.set(entry.glyphRef, entry.accessibleName.en); }
const source = (name) => (courtwork.files[`${name}.svg`] ? { kind: "courtwork-domain", ...courtwork.files[`${name}.svg`] } : lucide.files[`${name}.svg`] ? { kind: "lucide", ...lucide.files[`${name}.svg`] } : { kind: "unknown" });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const use = (name, size) => `<svg class="ui-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#${name}"/></svg>`;
const sizes = [16, 18, 20, 24];
const NEIGHBOURS = { expert: ["chat", "attention", "cpu"], spark: ["house", "message-square", "plug"], attention: ["house", "message-square", "plug"], chat: ["house", "message-square", "square-pen"], "text-align-start": ["panel-right", "panel-left", "x"] };
const row = (name) => {
  const src = source(name);
  const keys = consumers.get(name) ?? [];
  return `<tr data-glyph="${name}"><th scope="row"><code>${name}</code><small>${esc(src.kind)}${src.sha256 ? " · " + src.sha256.slice(0, 12) : ""}</small><small>${keys.length ? keys.map(esc).join(", ") : "no registry entry"}</small></th>${sizes.map((size) => `<td class="cell"><span class="slot" data-size="${size}">${use(name, size)}</span><span class="fallback">${esc(names.get(name) ?? name)}</span></td>`).join("")}<td class="cell neighbours">${(NEIGHBOURS[name] ?? ["house", "plus", "x"]).map((n) => use(n, 20)).join("")}</td></tr>`;
};
const table = (title, names) => `<section><h2>${esc(title)}</h2><table><thead><tr><th>glyph · source · consumers</th>${sizes.map((s) => `<th>${s}px</th>`).join("")}<th>Lucide neighbours · 20px</th></tr></thead><tbody>${names.map(row).join("\n")}</tbody></table></section>`;
const domain = symbols.filter((n) => courtwork.files[`${n}.svg`]);
const settings = ["sliders-horizontal", "palette", "cpu", "plug", "book-open", "database", "key-round", "keyboard", "code"].filter((n) => symbols.includes(n));
const rest = symbols.filter((n) => !domain.includes(n) && !settings.includes(n));
// The product's own type and colour roles, so the sheet's grounds are the product's grounds.
const rootBlock = styles.slice(styles.indexOf("/* ==== tier:S · skin lead-gray（铅灰）· light"), styles.indexOf("/* ==== tier:S · skin lead-gray · dark"));
const darkBlock = styles.slice(styles.indexOf("/* ==== tier:S · skin lead-gray · dark"), styles.indexOf('@media (prefers-color-scheme: dark)', styles.indexOf("/* ==== tier:S · skin lead-gray · dark")));
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product glyph contact sheet</title>
<style>
${rootBlock.replace(/:root/g, ".ground.light")}
${darkBlock.replace(/:root\[data-theme="dark"\]/g, ".ground.dark").replace(/:root/g, ".ground.dark")}
body{margin:0;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;background:#888}
.ground{padding:24px 32px;background:var(--gray-1,#f8fafb);color:var(--gray-12,#242d33)}
.ground.dark{background:var(--gray-1,#11171b);color:var(--gray-12,#e4ebef)}
.ground.mono{filter:grayscale(1)}
.ground.forced{background:#fff;color:#000}.ground.forced.dark{background:#000;color:#fff}
h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:24px 0 8px;opacity:.8}
table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:middle;padding:6px 10px;border-bottom:1px solid rgba(128,128,128,.35)}
th[scope=row]{width:300px;font-weight:500}th[scope=row] small{display:block;font-weight:400;opacity:.7;font-size:11px}
.cell{white-space:nowrap}.slot{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;vertical-align:middle;outline:1px dashed rgba(128,128,128,.4);border-radius:4px}
.fallback{margin-left:8px;font-size:12px;opacity:.85}.neighbours svg{margin-right:10px;opacity:.55}
.legend{font-size:12px;opacity:.75;margin:0 0 12px}
</style>
<div hidden>${sprite}</div>
${["light", "dark", "light mono", "dark mono", "light forced", "dark forced"].map((mode) => `<div class="ground ${mode}"><h1>Product glyphs · ${mode}</h1><p class="legend">Dashed box = 32px desktop hit region (44px on narrow/touch); glyph sizes 16 / 18 / 20 / 24 stated at the call site. Text beside each slot is the fallback label a control keeps. Forced-colors rows are a two-colour simulation, not a native high-contrast render.</p>${table("CourtWork domain glyphs", domain)}${table("Settings groups", settings)}${mode === "light" ? table("Remaining Lucide subset", rest) : ""}</div>`).join("\n")}
`;
await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "contact-sheet.html"), html);
const manifest = symbols.map((name) => ({ symbol: name, ...source(name), consumers: consumers.get(name) ?? [] }));
await writeFile(path.join(OUT_DIR, "glyph-manifest.json"), JSON.stringify({ sprite: "app/web/vendor/icons.svg", spriteSha256: createHash("sha256").update(sprite).digest("hex"), symbols: manifest }, null, 2) + "\n");
console.log(`contact sheet: ${symbols.length} symbols (${domain.length} domain, ${settings.length} settings)`);
