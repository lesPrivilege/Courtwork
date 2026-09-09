import assert from "node:assert/strict";
import test from "node:test";
import { GITHUB_SCENARIOS, createScriptedGitHub, validateGitHubScenario } from "./fixtures/attention-ingest/github/scripted-notifications.mjs";

test("GitHub fixture preserves raw conditional values, pagination, snapshots on 304, and changing poll cadence", async () => {
  const fake = createScriptedGitHub("conditionalPagination");
  const first = await fake.request({ kind: "poll", participating: true });
  assert.equal(first.headers["last-modified"], "Tue, 09 Sep 2026 00:00:00 GMT");
  const page = await fake.request({ kind: "poll", participating: true, page: 2 });
  const notModified = await fake.request({ kind: "poll", participating: true, ifModifiedSince: page.headers["last-modified"] });
  assert.equal(notModified.status, 304);
  assert.equal(fake.expected.retainSnapshotOn304, true);
  assert.deepEqual(fake.expected.pollIntervals, [90, 45, 120]);
  fake.assertDrained();
});

test("GitHub fixture retains notification semantics that are unsafe to collapse", async () => {
  const fake = createScriptedGitHub("changedReasonAndHead");
  const first = await fake.request({ kind: "poll" });
  const changed = await fake.request({ kind: "poll", ifModifiedSince: first.headers["last-modified"] });
  assert.equal(first.notifications[0].threadId, changed.notifications[0].threadId);
  assert.notEqual(first.notifications[0].reason, changed.notifications[0].reason);
  assert.notEqual(first.notifications[0].head, changed.notifications[0].head);
  assert.equal(changed.notifications[1].reason, fake.expected.retainUnknownReason);
  fake.assertDrained();
});

test("GitHub fixture surfaces unsupported credentials, revoked authorization and rate limits", async () => {
  const fake = createScriptedGitHub("authorizationAndRateLimit");
  await assert.rejects(fake.request({ kind: "poll", token: "fine-grained" }), { code: "unsupported_token", status: 403 });
  await assert.rejects(fake.request({ kind: "poll", token: "revoked" }), { code: "revoked", status: 401 });
  await assert.rejects(fake.request({ kind: "poll", token: "classic" }), { code: "rate_limited", status: 429 });
  assert.equal(fake.expected.retryAfterSeconds, 60);
  fake.assertDrained();
});

test("GitHub fixture rejects contradictory scripts", () => {
  assert.equal(validateGitHubScenario(GITHUB_SCENARIOS.conditionalPagination), true);
  assert.equal(validateGitHubScenario({ account: "a", steps: [{ request: {}, response: {}, error: {} }], expected: {} }), false);
});
