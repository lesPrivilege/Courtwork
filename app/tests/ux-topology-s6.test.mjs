/* UX-11 audit slice S6 (engineering/research/ux-interaction-topology-20260930/rulings.md):
 * small topology fixes. The Settings save/default split (SET-03, V5) and the
 * Remove key question (SET-09) are exercised on a real Host in
 * models-save-flow.test.mjs; this file covers the rest. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";

const read = (path) => readFileSync(new URL(`../web/${path}`, import.meta.url), "utf8");
const app = read("app.mjs");

test("S6 · HDR-01 · the open chat's header title renames it through the row menu's command", () => {
  const html = read("index.html");
  assert.match(html, /<button id="session-title-rename" class="session-title-rename" type="button" hidden><\/button>/);
  assert.match(app, /const renamable = !settingsOpen && !state\.attentionOpen && !state\.chatOpen && state\.view === "session" && Boolean\(session\)\n    && session\.scope !== "global" && !preview\.isExampleId\(session\.id\) && !project\?\.preview;/);
  assert.match(app, /rename\.setAttribute\("aria-label", `Rename chat · \$\{titleText\}`\)/, "the visible title is inside the accessible name");
  assert.match(app, /\$\("session-title-rename"\)\.addEventListener\("click", \(\) => \{\n    const session = currentSession\(\);\n    if \(session\) void runObjectCommand\("chat\.rename", \{ kind: "chat", id: session\.id \}\);/);
  assert.match(html, /aria-labelledby="session-title"/, "the heading element other surfaces name stays");
});

test("S6 · THR-05 · a failed or cancelled run offers its prompt back without sending", () => {
  const helper = app.slice(app.indexOf("function resendAction("), app.indexOf("function useEditedMessage("));
  assert.match(helper, /\["failed", "cancelled"\]\.includes\(statusRow\.status\)/);
  assert.match(helper, /rows\.find\(\(row\) => row\.kind === "user" && row\.runId === statusRow\.runId && row\.text\)/);
  assert.match(helper, /text: "Edit and resend"/);
  assert.match(helper, /if \(\$\("composer-input"\)\.value\.trim\(\)\) \{ openMessageEditor\(prompt\); return; \}/, "a draft already there is not overwritten without the editor's warning");
  assert.match(helper, /applyComposerDraft\(currentSession\(\)\?\.id, prompt\.text,/);
  assert.doesNotMatch(helper, /request\(|submitSessionRun/, "sending stays the person's Send");
  assert.match(app, /if \(latestResend\) measurements\.activity\.after\(latestResend\);/);
  assert.match(app, /latestResend = resend \? element\("div", \{ className: "run-resend-row" \}, resend\) : null;/, "on the stream column, not at its edge");
});

test("S6 · CMP-16 · the context readout offers Compact as the Host states it", async () => {
  await withTinyDom(async () => {
    const { createChatMeasurements } = await import("../web/chat-measurements.mjs");
    let compacted = 0, availability = { available: false, reason: "Available after this run ends." };
    const host = document.createElement("div");
    const view = createChatMeasurements({ host, readCompaction: async () => availability, onCompact: () => { compacted += 1; } });
    view.update({ session: { id: "s1" }, run: null, events: [], visible: true });
    const popover = host.querySelector(".chat-measurement-popover");
    popover.showPopover = () => { popover._popoverOpen = true; };
    popover.hidePopover = () => { popover._popoverOpen = false; };
    try { view.context.dispatchEvent({ type: "click", target: view.context, detail: 1 }); } catch { /* positioning needs a layout */ }
    await new Promise((resolve) => setTimeout(resolve, 0));
    let button = popover.querySelectorAll("button").find((node) => node.textContent === "Compact");
    assert.ok(button, "Compact sits in the context readout");
    assert.equal(button.disabled, true);
    assert.match(popover.textContent, /Available after this run ends\./, "the Host's reason is said");
    availability = { available: true };
    popover._popoverOpen = false;
    try { view.context.dispatchEvent({ type: "click", target: view.context, detail: 1 }); } catch { /* positioning needs a layout */ }
    await new Promise((resolve) => setTimeout(resolve, 0));
    button = popover.querySelectorAll("button").find((node) => node.textContent === "Compact");
    assert.equal(button.disabled, false);
    await button.dispatchEvent({ type: "click", target: button });
    assert.equal(compacted, 1);
  });
  const compact = app.slice(app.indexOf("async function compactChat("), app.indexOf("async function followCompaction("));
  assert.match(compact, /request\(`\/sessions\/\$\{encodeURIComponent\(sessionId\)\}\/compactions`, \{ method: "POST", body: \{ requestId: crypto\.randomUUID\(\) \} \}\)/);
  assert.match(compact, /void followCompaction\(sessionId, opId, operation\)/);
  assert.doesNotMatch(compact, /composer-input|clearComposerAfterCommand/, "the draft is untouched");
});

test("S6 · SET-19 · one word, one meaning: the group is named for what it holds; agent profiles say so", () => {
  const settings = read("settings-view.mjs");
  assert.match(settings, /\{ id: "agents", title: "Runtimes", panel: "settings-agents" \}/);
  assert.match(read("index.html"), /<h3 id="settings-agents-title" class="settings-section-title">\s*Runtimes\s*<\/h3>/);
  assert.doesNotMatch(read("agent-chooser-view.mjs"), /[^t] profile source/, "profile source always says agent profile source");
  assert.match(read("profile-editor-view.mjs"), /"Agent profile source \(JSON\)"/);
  assert.match(settings, /\{ id: "profile", title: "Profile", panel: "settings-profile" \}/, "Profile is the person's");
});
