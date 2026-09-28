/* N07-R1 · the Chat page's own Rename / Delete in real headless Chrome: the
 * page redraws from the changed chats and focus lands on a live row. Skips
 * (and says so) without Chrome; set COURTWORK_CHROME to point at one. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runChatPageCommandsBrowser, runChatPageProjectNamesBrowser } from "../scripts/chat-page-commands-browser.mjs";

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

  // N07-R2 · the rows' More target: 32px fine (revealed on hover/focus), 44px coarse (always shown).
  const { fine, coarse } = record.targets;
  assert.deepEqual([fine.coarse, coarse.coarse], [false, true]);
  for (const [name, list] of [["Chat page", fine.chatPage], ["sidebar", fine.sidebar]])
    assert.ok(list.length && list.every((box) => box.w === 32 && box.h === 32), `${name} fine More stays 32×32`);
  for (const [name, list] of [["Chat page", coarse.chatPage], ["sidebar", coarse.sidebar]])
    assert.ok(list.length && list.every((box) => box.w >= 44 && box.h >= 44 && box.opacity === "1"), `${name} coarse More is at least 44×44 and visible`);
});

test("N07-R3 · a project collapsed in the sidebar still names its chats on the Chat page; a projectless chat stays No project", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const { sidebar, rows } = await runChatPageProjectNamesBrowser({ chromePath: CHROME });
  assert.deepEqual([sidebar.projectExpanded, sidebar.projectChatsListed, sidebar.activeChat], ["false", 0, false], "reloaded with no open chat and the project collapsed");
  const named = Object.fromEntries(rows.map((row) => [row.title, row.project]));
  assert.equal(named["UX batch — In project A"], "UX batch synthetic project");
  assert.equal(named["UX batch — In project B"], "UX batch synthetic project");
  assert.equal(named["UX batch — Projectless"], "No project");
});
