/* WO-CS-01 · Chat shell proportion (Astra layout ruling, 2026-09-10).
 * Source assertions for the relations the ruling fixes; the rendered numbers
 * live in evidence/chat-shell-proportion-20260910 (capture.mjs / checks.mjs). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
const layout = readFileSync(`${root}app/web/surface-layout.css`, "utf8");
const appSource = readFileSync(`${root}app/web/app.mjs`, "utf8");
const rule = (source, selector) => {
  // Match a rule that starts a line, so `.nav-home` does not hit `… + .nav-home`.
  const at = source.indexOf(`\n${selector} {`);
  assert.notEqual(at, -1, selector);
  return source.slice(at, source.indexOf("}", at) + 1);
};

test("band · 48 on the web, a native host only raises it", () => {
  assert.match(styles, /--band-top: 48px;/);
  assert.doesNotMatch(styles, /--band-top: 56px/);
  assert.match(
    styles,
    /html\[data-shell="desktop"\] \.app-shell \{ --band-top: max\(48px, var\(--native-toolbar-height, 0px\)\); \}/,
  );
  // Brand row, chat header and the reader's tab band all read the same token.
  for (const selector of [".sidebar-header", ".chat-header", ".surface-header"])
    assert.match(rule(styles, selector), /height: var\(--band-top\);/, selector);
  assert.match(layout, /\.surface-panel\.is-view-switch \.surface-header \{[\s\S]{0,40}height: var\(--band-top\);/);
});

test("band · one title line; Chat is the default mode and is not restated", () => {
  const wrap = rule(styles, ".chat-title-wrap");
  assert.match(wrap, /display: flex;/);
  assert.match(wrap, /align-items: baseline;/);
  assert.match(rule(styles, ".chat-title-wrap h1"), /white-space: nowrap;/);
  const meta = appSource.slice(
    appSource.indexOf('const meta = $("session-meta")'),
    appSource.indexOf('$("show-surface-button")'),
  );
  assert.match(meta, /session\.scope === "global" \|\| sessionMode\(session\) === "work"/);
  assert.match(meta, /appendRunBadge/);
});

test("sidebar · 16 glyph on a 32 row, 4 between nav rows, 16 between groups, 44 on touch", () => {
  assert.match(styles, /\.nav-home > \.ui-icon,\n#cancel-run-button \.ui-icon \{\n  width: 16px;\n  height: 16px;/);
  assert.doesNotMatch(styles, /\.nav-home > \.ui-icon \{\s*width: 20px/);
  assert.match(rule(styles, ".nav-home"), /min-height: max\(32px, var\(--control\)\);/);
  assert.doesNotMatch(rule(styles, ".sidebar"), /\bgap:/);
  assert.match(rule(styles, ".sidebar > * + *"), /margin-top: var\(--space-4\);/);
  assert.match(rule(styles, ".sidebar > .nav-home + .nav-home"), /margin-top: var\(--space-1\);/);
  // Text stays on the existing ladder: the nav row inherits the button label size.
  assert.doesNotMatch(rule(styles, ".nav-home"), /font-size/);
});

test("content column · prose and composer share one inset resolved against one width", () => {
  assert.match(styles, /--content-inset: 40px;/);
  assert.match(styles, /--content-inset-tight: var\(--space-8\);/);
  assert.match(
    rule(styles, ".conversation-body"),
    /--chat-inset: clamp\(\s*var\(--content-inset-tight\),\s*\(100% - var\(--cards-inset, 0px\) - var\(--column\)\) \/ 2,\s*var\(--content-inset\)\s*\);/,
  );
  assert.match(rule(styles, ".message-stream"), /padding: var\(--space-8\) var\(--chat-inset\) var\(--space-6\);/);
  assert.match(rule(styles, ".composer-area"), /padding: var\(--space-2\) var\(--chat-inset\) var\(--space-4\);/);
  assert.match(styles, /\.app-shell\.surface-cards \.composer-area \{\n    padding-right: calc\(var\(--chat-inset\) \+ var\(--cards-inset\)\);/);
  // Phone: 16, the page gutter, for both.
  assert.match(styles, /\.conversation-body \{ --chat-inset: var\(--page-gutter\); \}/);
  // Both boxes keep the 740 reading column.
  assert.match(styles, /\.message-list,\n\.home-view \{\n  width: 100%;\n  max-width: var\(--column\);/);
  assert.match(styles, /\.composer-form,\n\.draft-status \{\n  max-width: var\(--column\);/);
});

test("summary · cards fold to the strip before the reading column drops under 640 + two tight insets", () => {
  assert.match(appSource, /const READING_FLOOR = 640;/);
  assert.match(
    appSource,
    /READING_FLOOR \+ 2 \* px\("--content-inset-tight", 32\) \+ 288 \+ px\("--col-gap", 24\)/,
  );
  assert.match(layout, /\.app-shell\.surface-cards \{ --rail-width: 288px; \}/);
});

test("composer · content-driven and bounded; growth never writes value", () => {
  const field = rule(styles, "#composer-input");
  assert.match(field, /min-height: calc\(2lh \+ 8px\);/);
  assert.match(field, /max-height: 180px;/);
  // Integration with CI-B: one growth mechanism for every variant, not a
  // Chat-only rule. The engine sizes the field where `field-sizing` exists; the
  // only script sizer is composer-field.mjs's fallback, installed only where it
  // does not (asserted in composer-field.test.mjs).
  assert.match(styles, /@supports \(field-sizing: content\) \{\s*#composer-input \{ field-sizing: content; \}/);
  assert.doesNotMatch(styles, /\.app-shell:not\(\.home-active\) #composer-input/);
  // app.mjs itself never sizes the field.
  assert.doesNotMatch(appSource, /composer-input"\)\.style\.height/);
  assert.doesNotMatch(appSource, /textarea\.style\.height/);
});

test("Home keeps its own 820 column and composer sizes", () => {
  assert.match(styles, /--home-column: 820px;/);
  assert.match(styles, /\.home-active \.message-stream \{ overflow: visible; padding-top: 0; padding-inline: var\(--page-gutter\); \}/);
  assert.match(styles, /\.home-active \.composer-area \{\n  padding: 0 var\(--page-gutter\);/);
  assert.match(styles, /\.home-active #composer-input \{ min-height: 96px; max-height: 160px; \}/);
});
