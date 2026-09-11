/* Ordinary control accent and unavailable pair (Astra ruling 2026-09-11, stage 3
 * of the final Design ONE-SHOT). Roles are scheme-owned, consumed only on the
 * on / selected state of interactive native controls and on controls whose
 * DOM action is impossible; never on Review, danger, diff or brand. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const css = readFileSync(path.join(ROOT, "app/web/styles.css"), "utf8");
const site = readFileSync(path.join(ROOT, "site/src/site.css"), "utf8");
const figures = readFileSync(path.join(ROOT, "site/scripts/check-figures.mjs"), "utf8");
const block = (from, to) => css.slice(css.indexOf(from), css.indexOf(to, css.indexOf(from)));

test("roles exist in both schemes and stay separate from review / danger / diff", () => {
  for (const name of ["--control-accent", "--control-accent-strong", "--control-unavailable-fill", "--control-unavailable-ink"])
    assert.match(css, new RegExp(`${name}: var\\(${name}-foreground\\)`), name);
  const light = block(":root {\n  --control-accent-foreground", "}");
  const dark = block('html[data-theme="dark"] {\n  --control-accent-foreground', "}");
  assert.notEqual(light, dark, "light and dark values are independent");
  assert.doesNotMatch(css, /--control-accent: var\(--(?:danger|attention-review|diff-add|system-danger)/);
  assert.doesNotMatch(css, /--attention-review: var\(--control-accent/);
  assert.doesNotMatch(css, /--danger: var\(--control-accent/);
});

test("the switch is the specimen: on = accent, disabled = unavailable pair, off = neutral", () => {
  assert.match(css, /\.runtime-switch input:checked::before \{\n  background: var\(--control-accent\);/);
  assert.match(css, /\.runtime-switch input:disabled::before \{\n  background: var\(--control-unavailable-fill\);/);
  assert.match(css, /\.runtime-switch input:disabled::after \{\n  background: var\(--control-unavailable-ink\);/);
  const off = block(".runtime-switch input::before {", "}");
  assert.doesNotMatch(off, /control-accent|unavailable/, "off state stays neutral");
  assert.match(css, /accent-color: var\(--ink\)/, "ordinary checkbox / radio selection stays neutral");
  assert.doesNotMatch(css, /\.segmented::before \{[^}]*control-accent/, "segmented selection has no red frame");
  assert.match(css, /\.segmented:disabled \{\n  background: var\(--control-unavailable-fill\);\n  opacity: 1;/);
});

test("the Pages paper link is an action, not the Review marker", () => {
  assert.match(site, /\.hero-actions \.hero-action-paper \{[^}]*background:var\(--campaign-action\)/);
  assert.doesNotMatch(site, /\.hero-actions \.hero-action-paper \{[^}]*campaign-attention-review/);
  assert.match(site, /--campaign-action: #c95e55; --campaign-action-ink: #10161a;/, "the accepted Paper common-red (Astra 9bdbb55)");
  assert.doesNotMatch(figures, /hero-action-paper/, "the checker no longer whitelists the link for the review token");
});
