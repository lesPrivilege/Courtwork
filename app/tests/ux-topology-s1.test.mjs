/* UX-11 audit slice S1 (engineering/research/ux-interaction-topology-20260930/rulings.md).
 * Pure helpers are tested directly; the app.mjs wiring is pinned at source level,
 * as the other composer wiring tests do, and its behaviour was checked in a real
 * browser against a disposable Host (see the S1 record). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { activeRunFreezeNotice, isActiveRunRefusal } from "../web/provider-config.mjs";

const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");

test("S1 · an active_run refusal is read from the Host's body and names the running chat only when it is this one", () => {
  assert.equal(isActiveRunRefusal({ status: 409, body: { error: { code: "active_run" } } }), true);
  assert.equal(isActiveRunRefusal({ code: "active_run" }), true);
  assert.equal(isActiveRunRefusal({ status: 409, body: { error: { code: "config_conflict" } } }), false);
  assert.equal(isActiveRunRefusal(new Error("network")), false);
  assert.equal(activeRunFreezeNotice(true), "Available after this run ends.");
  assert.equal(activeRunFreezeNotice(false), "Another chat is running. Available when it ends.");
  assert.equal(activeRunFreezeNotice(undefined), "A chat is running. Available when it ends.");
});

test("S1 · a generic New chat starts in the open chat's project, else Home's; the project row's + stays explicit", () => {
  assert.match(app, /async function startNewSession\(\{ projectId \} = \{\}\) \{\s*if \(projectId === undefined\) projectId = currentSession\(\)\?\.projectId \?\? state\.homeProjectId \?\? null;/);
  assert.match(app, /\$\("new-session-button"\)\.addEventListener\("click", \(\) => void startNewSession\(\)\);/, "the click event is not passed as options");
  assert.match(app, /newChat: \(target\) => startNewSession\(\{ projectId: target\.id \}\)/);
});

test("S1 · leaving a chat records whether Preview was open; returning reopens it only as a third column", () => {
  assert.match(app, /rememberPreviewOpen\(\);\s*state\.activeSessionId = sessionId;/);
  assert.match(app, /rememberPreviewOpen\(\);\s*state\.activeSessionId = null;/);
  assert.match(app, /previewOpenBySession\.get\(sessionId\) && surfaceThreePaneQuery\.matches\)\s*showPreview\(\{ focus: false \}\);/);
});

test("S1 · during a run, a slash command still reaches the Host and plain text is held with a visible line, unchanged", () => {
  assert.match(app, /if \(runBusy && !\$\("composer-input"\)\.value\.startsWith\("\/"\)\) return holdForRun\(\);/);
  assert.match(app, /if \(read\.handled\) return;\s*\/\/[^\n]*\n\s*if \(runBusy\) return holdForRun\(\);\s*if \(read\.text !== input\)/, "literal text is not rewritten while held");
  assert.match(app, /"Still working — your message stays here until this run ends\."/);
});
