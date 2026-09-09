import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { deriveWorkMetrics, utcDateRange } from "../../app/server/work-metrics.mjs";
import { deriveWorkSummary } from "../../app/server/work-summary.mjs";
import { boot, reopen } from "../../app/tests/helpers.mjs";

const MAX = Number.MAX_SAFE_INTEGER;
const usage = (overrides = {}) => ({ input: 10, output: 3, cacheRead: 7, cacheWrite: 2, turns: 1, missing: false, ...overrides });
const run = (id, sessionId, startedAt, overrides = {}) => ({
  id, sessionId, status: "completed", admissionOpen: false, startedAt, endedAt: startedAt,
  error: null, usage: usage(), ...overrides,
});
const metricsState = (runs = []) => ({
  sessions: [
    { id: "s1", projectId: "p1", createdAt: "2026-09-07T00:00:00.000Z" },
    { id: "s2", projectId: "p2", createdAt: "2026-09-07T00:00:00.000Z" },
  ], runs,
});

function checkPureUTCAndScope() {
  assert.deepEqual(utcDateRange("2026-09-09"), {
    start: Date.parse("2026-09-09T00:00:00.000Z"),
    end: Date.parse("2026-09-10T00:00:00.000Z"),
  });
  for (const invalid of ["2026-02-29", "2026-02-30", "2026-1-01", "bad", "2026-09-09T00:00:00Z"]) {
    assert.equal(utcDateRange(invalid), null, invalid);
  }

  const rows = [
    run("before", "s1", "2026-09-07T23:59:59.999Z"),
    run("start", "s1", "2026-09-08T00:00:00.000Z"),
    run("end", "s1", "2026-09-08T23:59:59.999Z", { status: "failed", endedAt: "2026-09-09T03:00:00.000Z" }),
    run("today", "s1", "2026-09-09T00:00:00.000Z", { status: "running", endedAt: null, usage: usage({ missing: true }) }),
    run("after", "s1", "2026-09-10T00:00:00.000Z"),
    run("other-project", "s2", "2026-09-09T12:00:00.000Z"),
  ];
  rows.push(rows[1]);
  const result = deriveWorkMetrics(metricsState(rows), { days: 2, projectId: "p1" }, "2026-09-09T14:00:00.000Z");
  assert.deepEqual(result.activity.buckets, [
    { date: "2026-09-08", recordedRunCount: 2 },
    { date: "2026-09-09", recordedRunCount: 1 },
  ]);
  assert.equal(result.activity.recordedRunCount, 3);
  assert.equal(result.activity.deduplicationKey, "run.id");
  assert.equal(result.usage.missing, true);
  assert.equal(result.usage.missingRunCount, 1);
  assert.equal(result.usage.reportedRunCount, 2);
  assert.equal(result.usage.accounting, "not_reported");
  assert.deepEqual(result.usage.tokens, { input: 30, output: 9, cacheRead: 21, cacheWrite: 6 });
  assert.equal(result.usage.isBillingRecord, false);

  const other = deriveWorkMetrics(metricsState(rows), { days: 1, projectId: "p2" }, "2026-09-09T14:00:00.000Z");
  assert.equal(other.activity.recordedRunCount, 1);
  assert.equal(deriveWorkMetrics(metricsState(), { days: 1 }, "2026-09-09T14:00:00.000Z").usage.accounting, "no_runs");
  const reportedZero = run("zero", "s1", "2026-09-09T12:00:00.000Z", { usage: usage({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }) });
  assert.equal(deriveWorkMetrics(metricsState([reportedZero]), { days: 1 }, "2026-09-09T14:00:00.000Z").usage.accounting, "reported");
}

function checkPureSummaryDateFields() {
  const state = {
    sessions: [
      { id: "sa", projectId: "p", title: "failed", createdAt: "2026-09-08T00:00:00.000Z", _nextSeq: 2 },
      { id: "sb", projectId: "p", title: "pending", createdAt: "2026-09-09T01:00:00.000Z", _nextSeq: 3 },
    ],
    runs: [
      run("ra", "sa", "2026-09-08T23:59:59.999Z", { status: "failed", endedAt: "2026-09-09T00:00:00.000Z", error: { code: "fixture" } }),
      run("rb", "sb", "2026-09-09T01:00:00.000Z", { status: "waiting_user", admissionOpen: true, endedAt: null }),
    ],
    questions: [{ id: "q", runId: "rb", kind: "ask_user", status: "pending", createdAt: "2026-09-08T23:59:59.999Z" }],
  };
  const today = deriveWorkSummary(state, { date: "2026-09-09", limit: 1 }, new Set(["q"]));
  assert.equal(today.dateFilter.timeZone, "UTC");
  assert.equal(today.dateFilter.fields.sessionCandidates, "recordedActivityAt");
  assert.equal(today.sessionCandidates.total, 2);
  assert.equal(today.inspectionCandidates.total, 1);
  assert.equal(today.pendingItems.total, 0);
  const unfiltered = deriveWorkSummary(state, {}, new Set(["q"]));
  assert.equal(unfiltered.pendingItems.total, 1);
}

async function checkHTTPReadOnlyRestartDelete() {
  const h = await boot();
  let runtime = h.runtime;
  try {
    const session = await h.createSession({ title: "independent metrics" });
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "independent metric fixture", commandId: "independent-metric-run" });
    assert.equal(created.status, 200);
    await h.pollRun(created.json.run.id);
    const replay = await h.api("POST", `/sessions/${session.id}/runs`, { input: "independent metric fixture", commandId: "independent-metric-run" });
    assert.equal(replay.status, 200);
    assert.equal(replay.json.run.id, created.json.run.id);

    const beforeState = runtime.store.snapshot();
    const beforeFile = await readFile(path.join(h.dataDir, "runtime-state.json"));
    for (const endpoint of ["work-activity", "work-usage"]) {
      const unauthorized = await fetch(`${runtime.url}/api/v5/${endpoint}`);
      assert.equal(unauthorized.status, 401, endpoint);
      const valid = await h.api("GET", `/${endpoint}?days=1`);
      assert.equal(valid.status, 200, endpoint);
      assert.equal(valid.json.recordedRunCount, 1, endpoint);
      assert.equal((await h.api("GET", `/${endpoint}?projectId=unknown`)).json.recordedRunCount, 0, endpoint);
      for (const query of ["days=0", "days=367", "days=1.5", "days=01", "days=2&days=3", "projectId=", "extra=1"]) {
        const invalid = await h.api("GET", `/${endpoint}?${query}`);
        assert.equal(invalid.status, 400, `${endpoint}?${query}`);
        assert.equal(invalid.json.error.code, "invalid_input");
      }
    }
    const summary = await h.api("GET", "/work-summary?date=today");
    assert.equal(summary.status, 200);
    assert.equal(summary.json.dateFilter.timeZone, "UTC");
    for (const query of ["date=2026-02-30", "date=2026-1-01", "date=bad", "date=today&date=today"]) {
      const invalid = await h.api("GET", `/work-summary?${query}`);
      assert.equal(invalid.status, 400, query);
      assert.equal(invalid.json.error.code, "invalid_input");
    }
    assert.deepEqual(runtime.store.snapshot(), beforeState);
    assert.deepEqual(await readFile(path.join(h.dataDir, "runtime-state.json")), beforeFile);

    await runtime.close();
    const reopened = await reopen(h.dataDir);
    runtime = reopened.runtime;
    const afterRestart = await reopened.api("GET", "/work-activity?days=1");
    assert.equal(afterRestart.status, 200);
    assert.equal(afterRestart.json.recordedRunCount, 1);
    assert.equal((await reopened.api("DELETE", `/sessions/${session.id}`)).status, 200);
    const afterDelete = await reopened.api("GET", "/work-activity?days=1");
    assert.equal(afterDelete.status, 200);
    assert.equal(afterDelete.json.recordedRunCount, 0);
    assert.equal(afterDelete.json.coverage.historical, "unknown");
  } finally {
    await runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
}

async function checkPublishedViewAndUnavailable() {
  const h = await boot();
  try {
    const session = await h.createSession();
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "snapshot fixture", commandId: "independent-snapshot" });
    await h.pollRun(created.json.run.id);
    const originalPersist = h.runtime.store._persist.bind(h.runtime.store);
    let entered;
    const enteredPromise = new Promise(resolve => { entered = resolve; });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    h.runtime.store._persist = async state => { entered(); await gate; await originalPersist(state); };
    const publishedInput = h.runtime.store.getWorkMetrics({ days: 1 }).usage.tokens.input;
    const mutation = h.runtime.store._mutate(state => {
      state.runs[0].usage = { input: 91, output: 0, cacheRead: 0, cacheWrite: 0, turns: 1, missing: false };
    });
    await enteredPromise;
    const during = h.runtime.store.getWorkMetrics({ days: 1 }).usage.tokens.input;
    assert.equal(during, publishedInput, "read observes the prior published state while persistence is paused");
    release();
    await mutation;
    assert.equal(h.runtime.store.getWorkMetrics({ days: 1 }).usage.tokens.input, 91);
    h.runtime.store.lockLost = true;
    for (const endpoint of ["work-activity", "work-usage"]) {
      const unavailable = await h.api("GET", `/${endpoint}?days=1`);
      assert.equal(unavailable.status, 500, endpoint);
      assert.equal(unavailable.json.error.code, "internal_error", endpoint);
    }
    h.runtime.store.lockLost = false;
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
}

async function checkUnsafeAggregateFailure() {
  const h = await boot();
  try {
    const firstSession = await h.createSession();
    const secondSession = await h.createSession();
    const first = await h.api("POST", `/sessions/${firstSession.id}/runs`, { input: "overflow one", commandId: "overflow-one" });
    assert.equal(first.status, 200);
    await h.pollRun(first.json.run.id);
    const second = await h.api("POST", `/sessions/${secondSession.id}/runs`, { input: "overflow two", commandId: "overflow-two" });
    assert.equal(second.status, 200);
    await h.pollRun(second.json.run.id);
    await h.runtime.store._mutate(state => {
      for (const id of [first.json.run.id, second.json.run.id]) {
        const target = state.runs.find(item => item.id === id);
        target.usage = { input: MAX, output: 0, cacheRead: 0, cacheWrite: 0, turns: 1, missing: false };
      }
    });
    assert.throws(() => h.runtime.store.getWorkMetrics({ days: 1 }), /safe integer/);
    for (const endpoint of ["work-activity", "work-usage"]) {
      const response = await h.api("GET", `/${endpoint}?days=1`);
      assert.equal(response.status, 500, endpoint);
      assert.equal(response.json.error.code, "internal_error", endpoint);
    }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
}

checkPureUTCAndScope();
checkPureSummaryDateFields();
await checkHTTPReadOnlyRestartDelete();
await checkPublishedViewAndUnavailable();
await checkUnsafeAggregateFailure();
console.log(JSON.stringify({
  result: "passed",
  checks: [
    "UTC calendar boundaries, midnight crossing, status inclusion, deduplication, project scope",
    "missing versus reported-zero usage and summary collection-specific UTC date fields",
    "token authentication, query bounds, read-only state/file bytes, replay, restart, deletion",
    "published snapshot isolation during paused persistence and unavailable-store errors",
    "unsafe aggregate totals fail both metrics endpoints rather than returning rounded data",
  ],
}, null, 2));
