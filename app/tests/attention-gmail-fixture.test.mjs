import assert from "node:assert/strict";
import test from "node:test";
import { GMAIL_SCENARIOS, createScriptedGmail, validateGmailScenario } from "./fixtures/attention-ingest/gmail/scripted-gmail.mjs";

test("Gmail fixture supplies duplicate and out-of-order push/history pages without advancing a caller cursor", async () => {
  const fake = createScriptedGmail("duplicateOutOfOrder");
  assert.deepEqual(await fake.request({ kind: "push" }), { historyId: "103" });
  assert.deepEqual(await fake.request({ kind: "push" }), { historyId: "101" });
  const first = await fake.request({ kind: "history", startHistoryId: "100" });
  assert.equal(first.nextPageToken, "p2");
  const last = await fake.request({ kind: "history", pageToken: "p2" });
  assert.deepEqual(first.history.concat(last.history).map((item) => item.message), ["m-1", "m-2", "m-1"]);
  assert.equal(fake.expected.cursorBeforeComplete, "100");
  assert.equal(fake.expected.cursorAfterComplete, "103");
  fake.assertDrained();
});

test("Gmail fixture presents interruption, gap, expired watch, mismatch, and revoked authorization as explicit provider outcomes", async () => {
  const interrupted = createScriptedGmail("paginationInterrupted");
  await interrupted.request({ kind: "history", startHistoryId: "200" });
  await assert.rejects(interrupted.request({ kind: "history", pageToken: "p2" }), { code: "interrupted", status: 503 });
  assert.equal(interrupted.expected.cursorAfterFailure, "200");
  const gap = createScriptedGmail("historyGap");
  await assert.rejects(gap.request({ kind: "history", startHistoryId: "300" }), { code: "history_gap", status: 404 });
  const watch = createScriptedGmail("watchExpiryAndRenewFailure");
  assert.equal((await watch.request({ kind: "watch" })).expiration, 1000);
  assert.equal((await watch.request({ kind: "clock" })).now, 1001);
  await assert.rejects(watch.request({ kind: "watch" }), { code: "renew_failed" });
  const revoked = createScriptedGmail("accountMismatchAndRevoke");
  await assert.rejects(revoked.request({ kind: "history", account: "acct-b", startHistoryId: "500" }), { code: "account_mismatch" });
  await assert.rejects(revoked.request({ kind: "history", account: "acct-a", startHistoryId: "500" }), { code: "revoked", status: 401 });
  await assert.rejects(revoked.request({ kind: "watch", account: "acct-a" }), { code: "revoked", status: 403 });
});

test("Gmail fixture rejects malformed and contradictory scripted responses", async () => {
  assert.equal(validateGmailScenario(GMAIL_SCENARIOS.historyGap), true);
  assert.equal(validateGmailScenario({ account: "a", steps: [{ request: {}, response: {}, error: {} }], expected: {} }), false);
  const fake = createScriptedGmail("historyGap");
  await assert.rejects(fake.request({ kind: "history", startHistoryId: "wrong" }), /Gmail request mismatch/);
  fake.barrier.block();
  await assert.rejects(fake.request({ kind: "history", startHistoryId: "300" }), { code: "barrier_closed" });
});
