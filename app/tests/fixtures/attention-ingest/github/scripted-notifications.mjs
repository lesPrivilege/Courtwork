// Synthetic, offline GitHub notification transport scripts.  They model only
// provider replies and expected host obligations; no snapshot/store exists here.
export const GITHUB_SCENARIOS = Object.freeze({
  conditionalPagination: {
    account: "octo-a",
    steps: [
      { request: { kind: "poll", participating: true }, response: { status: 200, headers: { "last-modified": "Tue, 09 Sep 2026 00:00:00 GMT", "x-poll-interval": "90" }, notifications: [{ id: "n-1", threadId: "t-1", reason: "author", head: "a1" }], nextPage: 2 } },
      { request: { kind: "poll", participating: true, page: 2 }, response: { status: 200, headers: { "last-modified": "Tue, 09 Sep 2026 00:00:01 GMT", "x-poll-interval": "45" }, notifications: [{ id: "n-2", threadId: "t-2", reason: "review_requested", head: "b1" }] } },
      { request: { kind: "poll", participating: true, ifModifiedSince: "Tue, 09 Sep 2026 00:00:01 GMT" }, response: { status: 304, headers: { "x-poll-interval": "120" } } },
    ],
    expected: { preserveLastModifiedExactly: "Tue, 09 Sep 2026 00:00:01 GMT", retainSnapshotOn304: true, pollIntervals: [90, 45, 120], participatingIsFilter: true },
  },
  changedReasonAndHead: {
    account: "octo-a",
    steps: [
      { request: { kind: "poll" }, response: { status: 200, headers: { "last-modified": "Tue, 09 Sep 2026 01:00:00 GMT" }, notifications: [{ id: "n-3", threadId: "t-3", reason: "author", head: "old-head" }] } },
      { request: { kind: "poll", ifModifiedSince: "Tue, 09 Sep 2026 01:00:00 GMT" }, response: { status: 200, headers: { "last-modified": "Tue, 09 Sep 2026 01:00:10 GMT" }, notifications: [{ id: "n-3", threadId: "t-3", reason: "mention", head: "new-head" }, { id: "n-4", threadId: "t-4", reason: "future_reason", head: "c1" }] } },
    ],
    expected: { sameThreadReasonCanChange: true, changedHeadMakesProposalStale: true, retainUnknownReason: "future_reason" },
  },
  authorizationAndRateLimit: {
    account: "octo-a",
    steps: [
      { request: { kind: "poll", token: "fine-grained" }, error: { status: 403, code: "unsupported_token" } },
      { request: { kind: "poll", token: "revoked" }, error: { status: 401, code: "revoked" } },
      { request: { kind: "poll", token: "classic" }, error: { status: 429, code: "rate_limited", headers: { "retry-after": "60", "x-ratelimit-reset": "1788912000" } } },
    ],
    expected: { stopOnRevocation: true, retryAfterSeconds: 60, doNotTreatMissingNotificationAsResolved: true },
  },
});

function matches(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

export function createScriptedGitHub(name) {
  const scenario = GITHUB_SCENARIOS[name];
  if (!scenario) throw new Error(`unknown GitHub scenario: ${name}`);
  let index = 0;
  const calls = [];
  return Object.freeze({
    account: scenario.account,
    expected: scenario.expected,
    calls,
    async request(request) {
      const step = scenario.steps[index++];
      if (!step) throw new Error(`unexpected GitHub request: ${JSON.stringify(request)}`);
      if (!matches(request, step.request)) throw new Error(`GitHub request mismatch: expected ${JSON.stringify(step.request)}, got ${JSON.stringify(request)}`);
      calls.push(structuredClone(request));
      if (step.error) throw Object.assign(new Error(step.error.code), step.error);
      return structuredClone(step.response);
    },
    assertDrained() {
      if (index !== scenario.steps.length) throw new Error(`GitHub scenario ${name} has ${scenario.steps.length - index} unconsumed response(s)`);
    },
  });
}

export function validateGitHubScenario(scenario) {
  if (!scenario || typeof scenario.account !== "string" || !Array.isArray(scenario.steps) || !scenario.expected) return false;
  return scenario.steps.every((step) => step.request && ((step.response && !step.error) || (!step.response && step.error)));
}
