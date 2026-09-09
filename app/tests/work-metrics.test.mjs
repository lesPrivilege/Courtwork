import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveWorkMetrics } from '../server/work-metrics.mjs';
import { deriveWorkSummary } from '../server/work-summary.mjs';
import { boot, reopen } from './helpers.mjs';

const usage = (missing = false) => ({ input: 10, output: 3, cacheRead: 7, cacheWrite: 2, turns: 1, missing });
const run = (id, startedAt, overrides = {}) => ({ id, sessionId: 's', startedAt, usage: usage(), ...overrides });
const state = runs => ({ sessions: [{ id: 's', projectId: 'p' }, { id: 's2', projectId: 'p2' }], runs });

test('UTC bins count unique retained run IDs, every status, and start time rather than end time', () => {
  const runs = [
    run('before', '2026-09-07T23:59:59.999Z'), run('first', '2026-09-08T00:00:00.000Z'),
    run('last', '2026-09-08T23:59:59.999Z', { status: 'failed', endedAt: '2026-09-09T01:00:00Z' }),
    run('today', '2026-09-09T00:00:00.000Z', { status: 'running', usage: usage(true) }),
    run('after', '2026-09-10T00:00:00.000Z'), run('other', '2026-09-09T12:00:00Z', { sessionId: 's2' }),
  ];
  runs.push(runs[1]);
  const { activity, usage: totals } = deriveWorkMetrics(state(runs), { days: 2, projectId: 'p' }, '2026-09-09T14:00:00.000Z');
  assert.deepEqual(activity.buckets, [{ date: '2026-09-08', recordedRunCount: 2 }, { date: '2026-09-09', recordedRunCount: 1 }]);
  assert.equal(activity.recordedRunCount, 3);
  assert.equal(activity.coverage.historical, 'unknown');
  assert.deepEqual(totals.tokens, { input: 30, output: 9, cacheRead: 21, cacheWrite: 6 });
  assert.equal(totals.missingRunCount, 1);
  assert.equal(totals.missing, true);
  assert.equal(totals.isBillingRecord, false);
  assert.equal(totals.accounting, 'not_reported');
});

test('empty differs from reported zero and aggregate overflow fails instead of rounding', () => {
  assert.equal(deriveWorkMetrics(state([])).usage.accounting, 'no_runs');
  const now = new Date().toISOString();
  const zero = run('zero', now, { usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 1, missing: false } });
  assert.equal(deriveWorkMetrics(state([zero])).usage.accounting, 'reported');
  const big = run('big', now, { usage: { ...usage(), input: Number.MAX_SAFE_INTEGER } });
  assert.throws(() => deriveWorkMetrics(state([big, run('one', now)])), /safe integer/);
});

test('summary UTC filter uses each collection timestamp before pagination', () => {
  const s = state([run('r', '2026-09-08T23:00:00Z', { status: 'failed', endedAt: '2026-09-09T00:00:00Z' }), run('active', '2026-09-09T01:00:00Z', { status: 'waiting_user', admissionOpen: true })]);
  s.sessions.forEach(x => Object.assign(x, { createdAt: '2026-09-08T00:00:00Z', _nextSeq: 3 }));
  s.questions = [{ id: 'q', runId: 'active', kind: 'ask_user', status: 'pending', createdAt: '2026-09-08T23:59:59.999Z' }];
  const result = deriveWorkSummary(s, { date: '2026-09-09' }, new Set(['q']));
  assert.equal(result.sessionCandidates.total, 1);
  assert.equal(result.inspectionCandidates.total, 1);
  assert.equal(result.pendingItems.total, 0);
  assert.equal(result.dateFilter.timeZone, 'UTC');
  assert.equal(deriveWorkSummary(s, {}, new Set(['q'])).pendingItems.total, 1);
});

test('authenticated HTTP metrics are read-only, survive restart, and honestly shrink after deletion', async () => {
  const h = await boot();
  let runtime = h.runtime;
  try {
    const session = await h.createSession();
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'metrics fixture', commandId: 'metrics-once' });
    await h.pollRun(created.json.run.id);
    await h.api('POST', `/sessions/${session.id}/runs`, { input: 'metrics fixture', commandId: 'metrics-once' });
    const before = runtime.store.snapshot();
    for (const endpoint of ['work-activity', 'work-usage']) {
      assert.equal((await fetch(`${runtime.url}/api/v5/${endpoint}`)).status, 401);
      for (const query of ['days=0', 'days=367', 'days=1.5', 'days=01', 'days=2&days=3', 'extra=1', 'projectId=']) {
        assert.equal((await h.api('GET', `/${endpoint}?${query}`)).status, 400, query);
      }
      const result = await h.api('GET', `/${endpoint}?days=1`);
      assert.equal(result.status, 200);
      assert.equal(result.json.recordedRunCount, 1);
      assert.equal((await h.api('GET', `/${endpoint}?projectId=absent`)).json.recordedRunCount, 0);
    }
    for (const date of ['2026-02-30', '2026-1-01', 'bad', 'today&date=today']) assert.equal((await h.api('GET', `/work-summary?date=${date}`)).status, 400);
    assert.equal((await h.api('GET', '/work-summary?date=today')).json.dateFilter.timeZone, 'UTC');
    assert.deepEqual(runtime.store.snapshot(), before);
    await runtime.close();
    const reopened = await reopen(h.dataDir);
    runtime = reopened.runtime;
    assert.equal((await reopened.api('GET', '/work-activity?days=1')).json.recordedRunCount, 1);
    assert.equal((await reopened.api('DELETE', `/sessions/${session.id}`)).status, 200);
    const deleted = (await reopened.api('GET', '/work-activity?days=1')).json;
    assert.equal(deleted.recordedRunCount, 0);
    assert.equal(deleted.coverage.historical, 'unknown');
  } finally { await runtime.close(); }
});

test('read during an unpublished mutation sees the whole previous snapshot', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'snapshot fixture', commandId: 'snapshot' });
    await h.pollRun(created.json.run.id);
    let release;
    let entered;
    const ready = new Promise(resolve => { entered = resolve; });
    const hold = new Promise(resolve => { release = resolve; });
    const write = h.runtime.store._mutate(async working => {
      working.runs[0].usage = usage(true);
      entered();
      await hold;
    });
    await ready;
    try {
      const value = h.runtime.store.getWorkMetrics({ days: 1 }).usage;
      assert.deepEqual(value.tokens, Object.fromEntries(Object.keys(value.tokens).map(key => [key, h.runtime.store.getRun(created.json.run.id).usage[key]])));
    } finally { release(); }
    await write;
    assert.equal(h.runtime.store.getWorkMetrics({ days: 1 }).usage.missing, true);
  } finally { await h.runtime.close(); }
});
