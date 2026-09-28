/* N07-R1 · the Chat page's own Rename / Delete in real headless Chrome: the
 * page redraws from the changed chats and focus lands on a live row. Skips
 * (and says so) without Chrome; set COURTWORK_CHROME to point at one. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runChatPageCommandsBrowser } from "../scripts/chat-page-commands-browser.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("Chat page Rename and Delete redraw the page and land focus on a live row", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const record = await runChatPageCommandsBrowser({ chromePath: CHROME });
  assert.equal(record.error, undefined, record.error);
  const at = (name) => record.steps.find((entry) => entry.name === name);
  for (const s of record.steps) {
    assert.deepEqual(s.page, s.recent, `${s.name}: the page shows what the sidebar shows`);
    assert.equal(s.pageOpen, true, `${s.name}: the reader stays on the Chat page`);
    assert.equal(s.focusConnected, true, `${s.name}: focus is on a live element`);
  }
  assert.equal(at("renamed").focus, "UX batch — Renamed by page", "the renamed row keeps focus");
  assert.ok(!at("deleted-middle").page.includes("UX batch — Delete target"));
  assert.equal(at("deleted-middle").focus, "UX batch — Keep first", "the next row takes focus");
  assert.equal(at("deleted-last").focus, "UX batch — Renamed by page", "with no next row, the previous one");
  assert.deepEqual(at("deleted-open-chat").page, ["UX batch — Renamed by page"]);
  assert.equal(record.returnControlAfterOpenDelete, false, "no Return to a chat that no longer exists");
  assert.equal(at("deleted-final-row").focus, "page title");
  assert.equal(record.emptyState, "No chats yet.");
});
