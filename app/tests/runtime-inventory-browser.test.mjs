/* 06c production I1 · Settings → Agents → Runtimes in a real headless Chrome
 * against a disposable Host, before any Session: the authenticated production
 * read, keyboard list → detail → back, a failed refresh and its recovery, and
 * 390 CSS px without horizontal overflow. Skips (and says so) without Chrome;
 * set COURTWORK_CHROME to point at one. Evidence runs write screenshots with
 * `node app/scripts/runtime-inventory-browser.mjs --out <dir>`. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runRuntimeInventoryBrowser } from "../scripts/runtime-inventory-browser.mjs";
import { MANAGED_EXECUTOR_ID, PI_EXECUTOR_ID } from "../server/executor-choice-state.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("the Runtimes page reads the real Host before a Session and survives keyboard, failure and narrow use", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const record = await runRuntimeInventoryBrowser({ chromePath: CHROME });
  const step = (name) => record.steps.find((entry) => entry.name === name);
  const list = step("list");
  assert.equal(list.tabSelected, "true");
  assert.equal(list.rows.length, 2);
  assert.match(list.rows[0], /^Pi · Host default Configured · live status not checked/);
  assert.match(list.rows[1], /^Agents API Unavailable · live status not checked This execution runtime is not configured on this Host\./);
  assert.deepEqual(list.buttons, ["refresh", `row-action:${PI_EXECUTOR_ID}`, `row-action:${MANAGED_EXECUTOR_ID}`], "read only: no mutation control");
  assert.ok(record.runtimeInfoRequests.length >= 1 && record.runtimeInfoRequests.every((request) => request.token && request.url === "/api/v5/runtime-info"), "authenticated, Host-scoped reads only");

  const detail = step("detail-by-keyboard");
  assert.deepEqual([detail.focusOnRow, detail.focusAfterOpen, detail.runtime], [`row:${PI_EXECUTOR_ID}`, "back", "Pi"]);
  assert.ok(detail.status.includes("Not checked. Nothing here connects to it, signs in or runs anything."));
  assert.deepEqual(detail.buttons, ["back", "refresh"]);
  assert.equal(step("back-by-keyboard").focusAfterBack, `row:${PI_EXECUTOR_ID}`);

  const failed = step("refresh-failed");
  assert.equal(failed.error, "The local runtime could not be reached. The rows below are the last reading that succeeded.");
  assert.equal(failed.rows.length, 2);
  assert.equal(failed.focus, "refresh");
  const recovered = step("refresh-recovered");
  assert.equal(recovered.error, null);
  assert.equal(recovered.focus, "refresh");

  // RFS-R1 · a malformed inventory is refused in place; the next Refresh is a real read.
  const malformed = step("refresh-malformed");
  assert.deepEqual([malformed.status, malformed.runtime, malformed.focus, malformed.newPageErrors],
    ["error", "Pi", "refresh", []]);
  assert.equal(malformed.error, "This Host's runtime report could not be read. The values below are the last reading that succeeded.");
  const after = step("refresh-after-malformed");
  assert.deepEqual([after.requestsSent >= 2, after.runtime, after.focus, after.newPageErrors], [true, "Pi", "refresh", []]);
  assert.deepEqual(record.pageErrors, [], "nothing thrown in the page");

  // RFS-R2 · values and reasons read at the reading role; labels and technical ids stay metadata.
  for (const name of ["detail-1280-light", "pi-390-dark"]) {
    const { geometry } = step(name);
    assert.equal(geometry.statusValue.size, "15px", `${name}: status values`);
    assert.equal(geometry.operationReason.size, "15px", `${name}: operation reasons`);
    assert.equal(geometry.term.size, "11.5px", `${name}: labels stay metadata`);
    assert.equal(geometry.technicalValue.size, "11.5px", `${name}: technical ids stay metadata`);
  }
  assert.equal(step("unavailable-1280-dark").geometry.absentOperations.size, "15px");
  assert.equal(step("detail-1280-light").geometry.refresh.h, 28, "fine-pointer control unchanged");
  assert.equal(step("pi-390-dark").geometry.back.h, 44, "narrow fallback target unchanged");

  for (const name of ["technical", "detail-1280-light", "list-390-dark", "pi-390-dark", "detail-390-dark", "detail-390-light"]) {
    const { overflow } = step(name);
    assert.ok(overflow.pageScrollWidth <= overflow.viewport, `${name}: no horizontal page scroll`);
    assert.deepEqual(overflow.wide, [], `${name}: nothing wider than the panel`);
  }
  const back = step("escape-and-return");
  assert.deepEqual(back.left, { hash: "", settingsHidden: true });
  assert.deepEqual(back.returned, { detailShown: true, runtime: "Agents API" });
  assert.deepEqual([record.host.sessionsBefore, record.host.sessionsAfter, record.host.stateUnchanged], [0, 0, true], "reading creates no Session and writes nothing");
});
