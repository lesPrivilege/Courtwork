// Synthetic, offline Gmail transport scripts.  These are deliberately not an
// ingest implementation: callers choose when (or whether) to advance a cursor.
export const GMAIL_SCENARIOS = Object.freeze({
  duplicateOutOfOrder: {
    account: "acct-a", startHistoryId: "100",
    steps: [
      { request: { kind: "push" }, response: { historyId: "103" } },
      { request: { kind: "push" }, response: { historyId: "101" } },
      { request: { kind: "history", startHistoryId: "100" }, response: { history: [{ id: "101", message: "m-1" }], nextPageToken: "p2" } },
      { request: { kind: "history", pageToken: "p2" }, response: { history: [{ id: "102", message: "m-2" }, { id: "101", message: "m-1" }], historyId: "103" } },
    ],
    expected: { observations: ["m-1", "m-2"], cursorAfterComplete: "103", cursorBeforeComplete: "100" },
  },
  paginationInterrupted: {
    account: "acct-a", startHistoryId: "200",
    steps: [
      { request: { kind: "history", startHistoryId: "200" }, response: { history: [{ id: "201", message: "m-3" }], nextPageToken: "p2" } },
      { request: { kind: "history", pageToken: "p2" }, error: { status: 503, code: "interrupted" } },
    ],
    expected: { cursorAfterFailure: "200", resumeFrom: "200" },
  },
  historyGap: {
    account: "acct-a", startHistoryId: "300",
    steps: [{ request: { kind: "history", startHistoryId: "300" }, error: { status: 404, code: "history_gap" } }],
    expected: { recordGap: true, requires: "full_sync" },
  },
  watchExpiryAndRenewFailure: {
    account: "acct-a", startHistoryId: "400",
    steps: [
      { request: { kind: "watch" }, response: { historyId: "400", expiration: 1000 } },
      { request: { kind: "clock" }, response: { now: 1001 } },
      { request: { kind: "watch" }, error: { status: 503, code: "renew_failed" } },
    ],
    expected: { pushIsAdvisory: true, reconciliationRequired: true, watchRenewed: false },
  },
  accountMismatchAndRevoke: {
    account: "acct-a", startHistoryId: "500",
    steps: [
      { request: { kind: "history", account: "acct-b", startHistoryId: "500" }, error: { status: 409, code: "account_mismatch" } },
      { request: { kind: "history", account: "acct-a", startHistoryId: "500" }, error: { status: 401, code: "revoked" } },
      { request: { kind: "watch", account: "acct-a" }, error: { status: 403, code: "revoked" } },
    ],
    expected: { accountBindingRequired: true, readsStopped: true },
  },
});

function same(value, expected) {
  return Object.entries(expected).every(([key, item]) => value?.[key] === item);
}

export function createScriptedGmail(name) {
  const scenario = GMAIL_SCENARIOS[name];
  if (!scenario) throw new Error(`unknown Gmail scenario: ${name}`);
  let index = 0;
  const calls = [];
  let blocked = false;
  return Object.freeze({
    account: scenario.account,
    expected: scenario.expected,
    calls,
    barrier: Object.freeze({ block() { blocked = true; }, release() { blocked = false; } }),
    async request(request) {
      if (blocked) throw Object.assign(new Error("fixture barrier is closed"), { code: "barrier_closed" });
      const step = scenario.steps[index++];
      if (!step) throw new Error(`unexpected Gmail request: ${JSON.stringify(request)}`);
      if (!same(request, step.request)) throw new Error(`Gmail request mismatch: expected ${JSON.stringify(step.request)}, got ${JSON.stringify(request)}`);
      calls.push(structuredClone(request));
      if (step.error) throw Object.assign(new Error(step.error.code), step.error);
      return structuredClone(step.response);
    },
    assertDrained() {
      if (index !== scenario.steps.length) throw new Error(`Gmail scenario ${name} has ${scenario.steps.length - index} unconsumed response(s)`);
    },
  });
}

export function validateGmailScenario(scenario) {
  if (!scenario || typeof scenario.account !== "string" || !Array.isArray(scenario.steps) || !scenario.expected) return false;
  return scenario.steps.every((step) => step.request && (step.response || step.error) && !(step.response && step.error));
}
