import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const app = readFileSync(`${root}app/web/app.mjs`, "utf8");

test("The work surface, its rail and its header entry share one page predicate", () => {
  assert.match(app, /function surfaceAllowed\(\) \{\s*return Boolean\(currentSession\(\)\) && !state\.attentionOpen && !state\.chatOpen && !state\.settings\.open;/);
  assert.match(app, /const open = Boolean\(surfaceAllowed\(\) && state\.surface\.open\)/, "panel visibility");
  assert.match(app, /const visible = Boolean\(surfaceAllowed\(\) && state\.surface\.open && !state\.surface\.expanded\);\s*rail\.hidden = !visible;/, "rail visibility");
  assert.match(app, /\$\("show-surface-button"\)\.hidden = !surfaceAllowed\(\);/, "header entry");
  assert.match(app, /\$\("show-surface-button"\)\.hidden = expanded \|\| !surfaceAllowed\(\);/, "the later layout pass uses the same predicate");
  assert.doesNotMatch(app, /!state\.attentionOpen && state\.surface\.open && currentSession\(\)/, "no second, narrower predicate remains");
  assert.doesNotMatch(app, /state\.settings\.open \|\| state\.attentionOpen \|\| !currentSession\(\)/, "no page predicate that forgets the Chat page");
});
