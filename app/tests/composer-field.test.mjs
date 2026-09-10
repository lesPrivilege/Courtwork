/* CI-B / CI-F · composer growth and the unsupported-paste sentence.
 * (1) growth never writes `value` — a value write empties the undo history;
 * (2) with native `field-sizing` support nothing is installed;
 * (3) a paste with usable text is never touched; only an image-only paste
 *     produces a sentence, and nothing is prevented. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  supportsFieldSizing,
  fitFieldHeight,
  installComposerGrowth,
  unsupportedPasteNotice,
} from "../web/composer-field.mjs";

const root = new URL("../../", import.meta.url).pathname;
const appSource = readFileSync(`${root}app/web/app.mjs`, "utf8");
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
const html = readFileSync(`${root}app/web/index.html`, "utf8");
const server = readFileSync(`${root}app/server/index.mjs`, "utf8");

function fakeField({ scrollHeight = 240, clientWidth = 700 } = {}) {
  const listeners = {};
  const field = {
    style: {},
    scrollHeight,
    clientWidth,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    listeners,
  };
  Object.defineProperty(field, "value", {
    get: () => "draft",
    set: () => { throw new Error("growth must not write value"); },
  });
  return field;
}
const view = (styleMap) => ({
  getComputedStyle: () => ({ getPropertyValue: (name) => styleMap[name] ?? "" }),
});
const BORDER_BOX = { "box-sizing": "border-box", "border-top-width": "0px", "border-bottom-width": "0px", "padding-top": "4px", "padding-bottom": "4px" };

test("CI-B · support is read from CSS.supports, never assumed", () => {
  assert.equal(supportsFieldSizing({ supports: (p, v) => p === "field-sizing" && v === "content" }), true);
  assert.equal(supportsFieldSizing({ supports: () => false }), false);
  assert.equal(supportsFieldSizing(undefined), false);
});

test("CI-B · fit follows scrollHeight and respects the box model", () => {
  const field = fakeField({ scrollHeight: 240 });
  fitFieldHeight(field, view(BORDER_BOX));
  assert.equal(field.style.height, "240px");
  fitFieldHeight(field, view({ "box-sizing": "content-box", "padding-top": "4px", "padding-bottom": "4px" }));
  assert.equal(field.style.height, "232px");
});

test("CI-B · with native support nothing is installed; without it, input refits and value is never written", () => {
  const native = fakeField();
  installComposerGrowth(native, { css: { supports: () => true }, view: view(BORDER_BOX) });
  assert.equal(native.listeners.input, undefined);
  assert.equal(native.style.height, undefined);

  const fallback = fakeField({ scrollHeight: 120 });
  const fit = installComposerGrowth(fallback, { css: { supports: () => false }, view: view(BORDER_BOX) });
  assert.equal(fallback.style.height, "120px");
  fallback.scrollHeight = 176;
  fallback.listeners.input[0]();
  assert.equal(fallback.style.height, "176px");
  fallback.scrollHeight = 300; // the stylesheet's max-height clamps this, not the module
  fit();
  assert.equal(fallback.style.height, "300px");
});

const clipboard = (text, types) => ({
  getData: (type) => (type === "text/plain" ? text : ""),
  items: types.map((type) => ({ kind: "file", type })),
});

test("CI-F · only an image-only paste gets a sentence; text is never swallowed", () => {
  assert.equal(unsupportedPasteNotice(clipboard("", ["image/png"])), "Only text can be sent, so the image wasn't added.");
  assert.equal(unsupportedPasteNotice(clipboard("   \n", ["image/png"])), "Only text can be sent, so the image wasn't added.");
  assert.equal(unsupportedPasteNotice(clipboard("", ["image/png", "image/jpeg"])), "Only text can be sent, so the images weren't added.");
  // A copied table or document selection carries an image of the same text.
  assert.equal(unsupportedPasteNotice(clipboard("Clause 14.1", ["image/png"])), "");
  assert.equal(unsupportedPasteNotice(clipboard("", ["application/pdf"])), "");
  assert.equal(unsupportedPasteNotice(clipboard("plain", [])), "");
  assert.equal(unsupportedPasteNotice(null), "");
});

test("CI-B / CI-F · wiring: no paste is prevented, growth is @supports-gated, the module is served", () => {
  const paste = appSource.slice(appSource.indexOf('addEventListener("paste"'), appSource.indexOf('addEventListener("compositionstart"'));
  assert.ok(paste.length > 0);
  assert.doesNotMatch(paste, /preventDefault/);
  assert.match(styles, /@supports \(field-sizing: content\) \{\s*#composer-input \{ field-sizing: content; \}/);
  assert.match(html, /<p id="composer-notice" class="composer-notice" role="status" hidden><\/p>/);
  assert.match(server, /"composer-field\.mjs"/);
  // Every programmatic value write in renderComposer / the edit path is followed by a fit.
  assert.equal((appSource.match(/fitComposer\(\);/g) || []).length, 3);
});

test("CI-B · each variant keeps a plain ceiling, dvh hosts get the 28dvh override, Home anchors the resting box", () => {
  // Plain ceilings first: a host without dvh must still stop at 180 / 160.
  assert.match(styles, /#composer-input \{[^}]*min-height: 88px;\s*max-height: 180px;/);
  const home = styles.indexOf(".home-active #composer-input { min-height: 96px; max-height: 160px; }");
  assert.ok(home > 0);
  // The override is support-gated and comes after the Home rule: same
  // specificity, so only a later rule can replace Home's 160.
  const override = styles.indexOf("@supports (max-height: min(1px, 1dvh)) {");
  assert.ok(override > home);
  assert.match(styles.slice(override), /^@supports \(max-height: min\(1px, 1dvh\)\) \{\s*#composer-input \{ max-height: min\(180px, 28dvh\); \}\s*\.home-active #composer-input \{ max-height: min\(160px, 28dvh\); \}\s*\}/);
  // WK-96's 56 % line is read from the composer at its min-height, so a draft
  // that grew before the last measurement cannot lift an emptied composer.
  const start = appSource.indexOf("function measureHomeLead()");
  const lead = appSource.slice(start, appSource.indexOf("\n}\n", start));
  assert.ok(start > 0 && lead.length > 0);
  assert.match(lead, /minHeight/);
  assert.match(lead, /box\.height - growth/);
});
