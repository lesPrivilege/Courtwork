import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const app = readFileSync(`${root}app/web/app.mjs`, "utf8");

test("Preview and its header entry share one page predicate", () => {
  assert.match(app, /function surfaceAllowed\(\) \{\s*return state\.view === "session" && Boolean\(currentSession\(\)\) && !state\.attentionOpen && !state\.chatOpen && !state\.settings\.open;/, "only the session view shows the surface: not Home, the Chat list, Attention or Settings");
  assert.match(app, /const open = Boolean\(surfaceAllowed\(\) && state\.surface\.open && active\)/, "panel visibility: allowed, shown, and an object selected");
  assert.doesNotMatch(app, /surface-rail|renderSurfaceRail/, "06d · no card rail is left to show");
  assert.match(app, /\$\("show-surface-button"\)\.hidden = !surfaceAllowed\(\);/, "header entry");
  assert.match(app, /\$\("show-surface-button"\)\.hidden = open \|\| !surfaceAllowed\(\);/, "the later layout pass uses the same predicate");
  assert.doesNotMatch(app, /!state\.attentionOpen && state\.surface\.open && currentSession\(\)/, "no second, narrower predicate remains");
  assert.doesNotMatch(app, /state\.settings\.open \|\| state\.attentionOpen \|\| !currentSession\(\)/, "no page predicate that forgets the Chat page");
});
