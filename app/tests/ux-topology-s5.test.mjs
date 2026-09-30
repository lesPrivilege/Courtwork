/* UX-11 / IC-10 audit slice S5 (engineering/research/ux-interaction-topology-20260930/rulings.md):
 * icons and hygiene. The size an icon() call passes is the size that renders;
 * a glyph has one meaning; an action without a capability is not drawn. The
 * rendered sizes themselves are measured in a real browser by
 * evidence/capture-s5.mjs (report.json: every visible glyph against its size). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";

const read = (path) => readFileSync(new URL(`../web/${path}`, import.meta.url), "utf8");
const styles = read("styles.css");
const app = read("app.mjs");

test("S5 · no selector sizes a glyph: width and height come from icon() alone", () => {
  const offenders = [];
  for (const match of styles.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!/\.ui-icon\b|(^|[\s>,+~])svg\b/.test(selector)) continue;
    if (/\.avatar svg/.test(selector)) continue; // the avatar mark is an identity drawing, not a glyph
    if (/(^|;|\s)(width|height)\s*:/.test(match[2])) offenders.push(selector);
  }
  assert.deepEqual(offenders, []);
});

test("S5 · the default glyph is 16; a blank of the same size keeps titles on one x", async () => {
  await withTinyDom(async () => {
    const { icon, flowRow, BLANK_GLYPH } = await import("../web/ui-controls.mjs");
    const { semanticIcon } = await import("../web/semantic-controls.mjs");
    assert.equal(icon("x").getAttribute("width"), "16");
    assert.equal(icon("x", { size: 14 }).getAttribute("width"), "14");
    assert.equal(semanticIcon("chat.surface").getAttribute("width"), "16");
    const blank = flowRow("div", { glyph: BLANK_GLYPH, title: "runtime_list" });
    assert.equal(blank.children[0].className, "ui-icon glyph-blank");
    assert.equal(blank.children[0].getAttribute("aria-hidden"), "true");
    const none = flowRow("div", { glyph: null, title: "Summary" });
    assert.equal(none.children[0].className, "flow-title", "a row family without glyphs gets no blank");
  });
  assert.match(styles, /\.glyph-blank\s*\{[^}]*width:\s*16px[^}]*height:\s*16px/, "the blank is the size of the 16 glyph it stands in for");
  assert.match(read("run-rows.mjs"), /glyph: toolGlyph\(row\.name\) \?\? BLANK_GLYPH/);
});

test("S5 · production rows draw only actions with a handler; the reasons stay for their return", async () => {
  await withTinyDom(async () => {
    const { createChatActions, createProductionActionAdapter } = await import("../web/chat-actions.mjs");
    const adapter = createProductionActionAdapter({ copy: () => true });
    const assistant = createChatActions({ target: { key: "a", role: "assistant", text: "Answer" }, adapter });
    const drawn = assistant.querySelectorAll("[data-chat-action]").map((node) => node.getAttribute("data-chat-action"));
    assert.deepEqual(drawn, ["copy"], "no read aloud, feedback, regenerate, fork, share or pin without an owner capability");
    assert.equal(assistant.querySelector("[data-chat-more]"), null, "no More menu with nothing in it");
    const file = createChatActions({ target: { key: "f", role: "file", path: "out/a.md", sha256: "0".repeat(64) }, adapter: createProductionActionAdapter({ "copy-path": () => true, "copy-hash": () => true }) });
    assert.deepEqual(file.querySelectorAll("[data-chat-action]").map((node) => node.getAttribute("data-chat-action")), ["copy-path", "copy-hash"]);
    const demo = createChatActions({ target: { key: "d", role: "assistant", text: "Answer" }, adapter: { availability: () => ({ available: false, reason: "demo" }), invoke: async () => ({ state: "success" }) } });
    assert.ok(demo.querySelectorAll("[data-chat-action]").length > 3, "an adapter without draws() still draws every intent");
  });
  assert.match(read("chat-actions.mjs"), /'read-aloud': 'Read aloud is not available in this app yet\.'/);
});

test("S5 · glyph meanings: one Settings entry in the account menu, no Sign out, settings-2 only where Settings opens", () => {
  const menu = app.slice(app.indexOf("function openAccountMenu("), app.indexOf("\n}\n", app.indexOf("function openAccountMenu("))).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal((menu.match(/"settings-2"/g) || []).length, 1);
  assert.doesNotMatch(menu, /Sign out|Preferences|"square-pen"|"key-round"|"external-link"/);
  assert.match(menu, /personal\("Profile", "profile"\)/);
  assert.match(menu, /semanticPresentation\(`settings\.\$\{section\}`\)\.glyph/, "each page row carries its Settings group's own glyph");
  assert.match(menu, /personal\("Account", "account"\)/);
  assert.doesNotMatch(read("run-rows.mjs"), /"settings-2"/, "a runtime tool row opens nothing");
});

test("S5 · Retry keeps visible text; the navigation toggle is named for what a press does; preview tabs carry no native title", () => {
  assert.equal((read("materials-view.mjs").match(/"Retry loading [^"]+",[^\n]*\{ visible: "Retry"/g) || []).length, 3);
  assert.match(app, /setAction\(\$\("toggle-nav-button"\), "panel-left", navigationShown \? "Close navigation" : "Open navigation"\)/);
  assert.doesNotMatch(read("preview-tabs.mjs"), /\btitle: words/);
});

test("S5 · hygiene: the unreachable chat dialog and its branches are gone; zero-use glyphs leave the allowlist", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /session-dialog|session-title-input|session-permission-input/);
  assert.doesNotMatch(app, /newSessionProjectId|createSession\b|session-title-input/);
  const allow = read("ui-controls.mjs");
  assert.doesNotMatch(allow, /"arrow-down"|"runtime-plugin"/);
  assert.doesNotMatch(html, /returns to the chat you were in or the most recent one/);
});

test("S5 addendum · Profile is the person, Account has no borrowed glyph, a copy that succeeded shows a check", async () => {
  await withTinyDom(async () => {
    const { semanticPresentation } = await import("../web/semantic-controls.mjs");
    assert.equal(semanticPresentation("settings.profile").glyph, "circle-user");
    assert.equal(semanticPresentation("settings.account").glyph, null);
    assert.equal(semanticPresentation("message.copied").glyph, "check");
  });
  assert.match(read("ui-controls.mjs"), /setAction\(button, "check", "Copied"\)/);
  assert.match(read("chat-actions.mjs"), /transientCopyIntent === intent \? 'message\.copied'/);
  assert.match(read("settings-view.mjs"), /\(glyphKey && semanticIcon\(glyphKey\)\) \|\| glyphBlank\(\), el\("span", \{ className: "settings-tab-label"/);
});
