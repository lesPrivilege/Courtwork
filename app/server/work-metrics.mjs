// Read-only projection of a single published RuntimeStore state.
const DAY = 86_400_000;
export function utcDateRange(date) {
  const start = Date.parse(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== date) return null;
  return { start, end: start + DAY };
}

export function deriveWorkMetrics(state, { days = 30, projectId } = {}, observedAt = new Date().toISOString()) {
  const today = utcDateRange(observedAt.slice(0, 10));
  const start = today.start - (days - 1) * DAY;
  const end = today.end;
  const sessions = new Set(state.sessions.filter(s => projectId === undefined || s.projectId === projectId).map(s => s.id));
  const buckets = Array.from({ length: days }, (_, i) => ({ date: new Date(start + i * DAY).toISOString().slice(0, 10), recordedRunCount: 0 }));
  const seen = new Set();
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let recordedRunCount = 0;
  let missingRunCount = 0;
  for (const run of state.runs) {
    const time = Date.parse(run.startedAt);
    if (!sessions.has(run.sessionId) || time < start || time >= end || seen.has(run.id)) continue;
    seen.add(run.id);
    buckets[Math.floor((time - start) / DAY)].recordedRunCount++;
    recordedRunCount++;
    if (run.usage.missing) missingRunCount++;
    for (const key of Object.keys(tokens)) {
      tokens[key] += run.usage[key];
      if (!Number.isSafeInteger(tokens[key])) throw new Error('usage aggregate exceeds safe integer range');
    }
  }
  const common = {
    schemaVersion: 1, observedAt, timeZone: 'UTC',
    interval: { start: new Date(start).toISOString(), endExclusive: new Date(end).toISOString(), days, runTimeField: 'startedAt' },
    scope: { kind: 'retained-recorded-runs', projectId: projectId ?? null },
    coverage: { retainedRecords: 'complete', historical: 'unknown', reason: 'deleted_sessions_remove_run_records' },
    recordedRunCount,
  };
  return {
    activity: { ...common, deduplicationKey: 'run.id', buckets },
    usage: { ...common, source: 'provider-reported-run-usage', isBillingRecord: false, tokens,
      missing: missingRunCount > 0, missingRunCount, reportedRunCount: recordedRunCount - missingRunCount,
      accounting: recordedRunCount === 0 ? 'no_runs' : missingRunCount > 0 ? 'not_reported' : 'reported' },
  };
}
