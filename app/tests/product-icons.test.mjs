/* Product glyph set (ONE-SHOT 2026-09-11 stage 1). The sprite, the two source
 * manifests, the semantic registry and the ui-controls allowlist must agree, so
 * regenerating the sprite cannot drop a glyph a control depends on. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productSemantics } from "../web/product-semantics.generated.mjs";
import { iconData } from "../web/vendor/icon-data.generated.mjs";
import { action, icon, flowRow } from "../web/ui-controls.mjs";
import { withTinyDom } from "./tiny-dom.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const sprite = read("app/web/vendor/icons.svg");
const symbols = new Set([...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
const lucide = JSON.parse(read("tools/ui-vendor/lucide/sources.json"));
const domain = JSON.parse(read("tools/ui-vendor/courtwork/sources.json"));
const manifest = JSON.parse(read("app/web/vendor/manifest.json"));
const controls = read("app/web/ui-controls.mjs");
const allowed = new Set([...controls.slice(controls.indexOf("const icons = new Set(["), controls.indexOf("]);", controls.indexOf("const icons = new Set(["))).matchAll(/"([\w-]+)"/g)].map((m) => m[1]));

test("every registry glyph is in the sprite and in the ui-controls allowlist", () => {
  const refs = productSemantics.entries.filter((e) => e.glyphRef).map((e) => e.glyphRef);
  for (const ref of refs) {
    assert.ok(symbols.has(ref), `sprite lacks ${ref}`);
    assert.ok(allowed.has(ref), `ui-controls icons set lacks ${ref}`);
  }
});

test("offline icon geometry reproduces every pinned sprite shape without changes", () => {
  assert.deepEqual(Object.keys(iconData).sort(), [...symbols].sort());
  const normalize = (value) => value.replace(/\s+/g, ' ').replace(/\s*\/>/g, '/>').replace(/>\s+</g, '><').trim();
  for (const [, name, body] of sprite.matchAll(/<symbol id="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g)) {
    const rendered = iconData[name].map(([tag, attrs]) =>
      `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ')}/>`).join('');
    assert.equal(normalize(rendered), normalize(body), `${name} geometry changed`);
    assert.ok(Object.isFrozen(iconData[name]));
    for (const shape of iconData[name]) assert.ok(Object.isFrozen(shape) && Object.isFrozen(shape[1]));
  }
  assert.ok(Object.isFrozen(iconData));
});

test("recreated controls contain local shapes and retain their action after disconnection", () => withTinyDom((container) => {
  let closed = 0;
  const first = action('x', 'Close Spark', () => closed++);
  container.append(first);
  container.replaceChildren();
  const reopened = action('x', 'Close Spark', () => closed++);
  container.append(reopened);
  assert.equal(reopened.getAttribute('aria-label'), 'Close Spark');
  assert.equal(reopened.querySelector('svg').getAttribute('aria-hidden'), 'true');
  assert.equal(reopened.querySelectorAll('path').length, 2);
  assert.equal(reopened.querySelectorAll('use, image, [href]').length, 0, 'no external SVG resolution after rerender');
  reopened.click();
  assert.equal(closed, 1);
  for (const name of allowed) {
    const svg = icon(name, { size: 18 });
    assert.equal(svg.getAttribute('width'), '18');
    assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
    assert.equal(svg.children.length, iconData[name].length);
    assert.equal(svg.querySelectorAll('use, image, [href]').length, 0);
  }
  assert.throws(() => icon('unregistered-action'), /Unknown static icon/);
}));

test("disclosure rows use a native SVG chevron without changing the summary or its name", () => withTinyDom(() => {
  const row = flowRow('summary', { title: 'Recorded sources', glyph: 'file-text' });
  assert.equal(row.tagName, 'summary');
  assert.equal(row.textContent, 'Recorded sources');
  const chevron = row.querySelector('.flow-disclosure-icon');
  assert.equal(chevron.getAttribute('aria-hidden'), 'true');
  assert.equal(chevron.querySelectorAll('path').length, 1);
  assert.equal(flowRow('div', { title: 'Plain row' }).querySelector('.flow-disclosure-icon'), null);
}));

test("sprite symbols are exactly the pinned Lucide files plus the CourtWork domain files, with recorded hashes", () => {
  const expected = new Set([...Object.keys(lucide.files), ...Object.keys(domain.files)].filter((f) => f.endsWith(".svg")).map((f) => f.replace(/\.svg$/, "")));
  assert.deepEqual([...symbols].sort(), [...expected].sort());
  for (const [file, entry] of Object.entries(domain.files))
    assert.equal(createHash("sha256").update(readFileSync(path.join(ROOT, "tools/ui-vendor/courtwork", file))).digest("hex"), entry.sha256, `${file} hash drifted`);
  for (const [file, entry] of Object.entries(lucide.files)) {
    if (file === "LICENSE") continue;
    assert.equal(createHash("sha256").update(readFileSync(path.join(ROOT, "tools/ui-vendor/lucide", file))).digest("hex"), entry.sha256, `${file} hash drifted from the Lucide pin`);
  }
  assert.equal(manifest.outputs["icons.svg"], createHash("sha256").update(sprite).digest("hex"), "vendor manifest records the built sprite");
  assert.deepEqual(manifest.courtwork.files, domain.files);
});

test("domain glyphs follow the admitted geometry contract", () => {
  for (const file of Object.keys(domain.files)) {
    const svg = readFileSync(path.join(ROOT, "tools/ui-vendor/courtwork", file), "utf8");
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke="currentColor"/);
    assert.match(svg, /stroke-width="2"/);
    assert.match(svg, /stroke-linecap="round"/);
    assert.match(svg, /fill="none"/);
    assert.doesNotMatch(svg, /fill="#|stroke="#|<text|<image|<style/);
    for (const [, x, y] of svg.matchAll(/(?:x|cx)="([\d.]+)"[^>]*(?:y|cy)="([\d.]+)"/g)) { assert.ok(+x >= 1 && +x <= 23 && +y >= 1 && +y <= 23, `${file} leaves the 1px safe edge`); }
  }
});

test("Spark, Attention and Chat seats and the Settings groups carry their registered glyphs", () => {
  const app = read("app/web/app.mjs");
  assert.match(app, /setSemanticControl\(\$\("chat-button"\), "chat\.surface", \{ visible: true \}\)/);
  assert.match(app, /setSemanticControl\(\$\("attention-button"\), "attention\.agent", \{ visible: true \}\)/);
  assert.match(app, /setSemanticControl\(\$\("spark-button"\), "spark\.surface", \{ visible: true \}\)/);
  assert.match(app, /"show-run-button": \["text-align-start", "Chat overview"\]/);
  assert.match(app, /"show-surface-button": \["panel-right", "Open work surface"\]/, "work-surface entry keeps panel-right");
  const settings = read("app/web/settings-view.mjs");
  assert.match(settings, /semanticIcon\(`settings\.\$\{group\.id\}`, \{ size: 18 \}\)/);
  for (const id of ["general", "appearance", "models", "tools", "skills", "memory", "permissions", "keyboard", "developer"])
    assert.ok(productSemantics.entries.some((e) => e.semanticKey === `settings.${id}` && e.glyphRef), `settings.${id} registered with a glyph`);
});
