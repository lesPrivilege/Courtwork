import { utcDateRange } from "./work-metrics.mjs";
// A synchronous projection of one published store state. Never inspect events,
// host transcripts, workspace files, or invoke runtime/provider operations.
const OPEN = new Set(["running", "waiting_user"]);
const INSPECT = new Set(["failed", "unknown"]);
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const newest = (a, b, field, id) => Date.parse(b[field]) - Date.parse(a[field]) || compareId(a[id], b[id]);
const runFields = (run) => ({ runId: run.id, status: run.status, startedAt: run.startedAt, endedAt: run.endedAt });

function page(items, offset, limit) {
  const selected = items.slice(offset, offset + limit);
  const next = offset + selected.length;
  return { items: selected, total: items.length, offset, limit, truncated: offset > 0 || next < items.length,
    hasMore: next < items.length, nextOffset: next < items.length ? next : null };
}

export function deriveWorkSummary(state, options, availableQuestionIds) {
  const { projectId, limit = 50, sessionsOffset = 0, pendingOffset = 0, inspectionOffset = 0 } = options;
  const observedAt = new Date().toISOString();
  const date = options.date === 'today' ? observedAt.slice(0, 10) : options.date;
  const range = date ? utcDateRange(date) : null;
  const inRange = time => !range || (Date.parse(time) >= range.start && Date.parse(time) < range.end);
  const sessions = state.sessions.filter((s) => projectId === undefined || s.projectId === projectId);
  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const runs = new Map();
  const latest = new Map();
  const activity = new Map(sessions.map((s) => [s.id, s.createdAt]));
  const inspection = [];
  for (const run of state.runs) {
    const session = bySession.get(run.sessionId);
    if (!session) continue;
    runs.set(run.id, run);
    const prior = latest.get(run.sessionId);
    if (!prior || newest(run, prior, "startedAt", "id") < 0) latest.set(run.sessionId, run);
    for (const time of [run.startedAt, run.endedAt]) {
      if (time && Date.parse(time) > Date.parse(activity.get(run.sessionId))) activity.set(run.sessionId, time);
    }
    if (INSPECT.has(run.status)) inspection.push({ projectId: session.projectId, sessionId: session.id,
      ...runFields(run), errorCode: run.error?.code ?? null, resultAt: run.endedAt ?? run.startedAt });
  }
  const candidates = sessions.map((s) => ({ projectId: s.projectId, sessionId: s.id, title: s.title,
    createdAt: s.createdAt, recordedActivityAt: activity.get(s.id), latestRun: latest.has(s.id) ? runFields(latest.get(s.id)) : null }));
  candidates.sort((a, b) => newest(a, b, "recordedActivityAt", "sessionId"));
  const pending = [];
  for (const q of state.questions) {
    const run = runs.get(q.runId);
    if (q.status !== "pending" || !run?.admissionOpen || !OPEN.has(run.status) || !availableQuestionIds.has(q.id)) continue;
    if (q.kind !== "ask_user" && q.kind !== "permission") continue;
    pending.push({ projectId: bySession.get(run.sessionId).projectId, sessionId: run.sessionId,
      runId: run.id, questionId: q.id, kind: q.kind, createdAt: q.createdAt,
      label: q.kind === "permission" ? "Permission requested" : "Answer requested" });
  }
  pending.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || compareId(a.questionId, b.questionId));
  inspection.sort((a, b) => newest(a, b, "resultAt", "runId"));
  const sessionCandidates = page(candidates.filter(item => inRange(item.recordedActivityAt)), sessionsOffset, limit);
  const pendingItems = page(pending.filter(item => inRange(item.createdAt)), pendingOffset, limit);
  const inspectionCandidates = page(inspection.filter(item => inRange(item.resultAt)), inspectionOffset, limit);
  const involved = new Set([...sessionCandidates.items, ...pendingItems.items, ...inspectionCandidates.items].map((item) => item.sessionId));
  const sessionVersions = [...involved].sort(compareId).map((sessionId) => ({ sessionId, lastSeq: bySession.get(sessionId)._nextSeq }));
  return { observedAt, ...(date ? { dateFilter: { date, timeZone: 'UTC', start: new Date(range.start).toISOString(), endExclusive: new Date(range.end).toISOString(), fields: { sessionCandidates: 'recordedActivityAt', pendingItems: 'createdAt', inspectionCandidates: 'resultAt' } } } : {}), sessionVersions, sessionCandidates, pendingItems, inspectionCandidates };
}
