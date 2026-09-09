import { createHash } from 'node:crypto';

export const TASK_LIMIT = 128;
export const RESULT_LIMIT = 65_536;
export const DELIVERY_LIMIT = 128;
export const TASK_TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);
const STATES = new Set(['queued', 'dispatching', 'running', 'unknown', ...TASK_TERMINAL]);

export function digestText(value) { return createHash('sha256').update(value, 'utf8').digest('hex'); }
export function sameSource(a, b) { return a?.id === b?.id && a?.version === b?.version && a?.digest === b?.digest; }

export class AsyncTaskError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function taskAssert(condition, code = 'invalid_task_input', message = 'Invalid async task input', status = 400) {
  if (!condition) throw new AsyncTaskError(status, code, message);
}
export function taskObject(value, keys) {
  taskAssert(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(k => keys.includes(k)));
}
export function taskId(value) { taskAssert(typeof value === 'string' && value.length > 0 && value.length <= 200); return value; }
export function validSource(value) {
  taskObject(value, ['id', 'version', 'digest']);
  taskId(value.id); taskId(value.version);
  taskAssert(typeof value.digest === 'string' && /^[a-f0-9]{64}$/.test(value.digest));
  return structuredClone(value);
}

/** Schema5's task collection. Origin references are deliberately retained after
 * Session deletion; they must agree with live records whenever those exist. */
export function validateAsyncTasks(tasks, state) {
  const check = (ok, why) => { if (!ok) throw Object.assign(new Error('invalid runtime state: async task ' + why), { code: 'INVALID_STATE' }); };
  const exact = (v, names) => check(v && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).sort().join(',') === [...names].sort().join(','), 'shape');
  const id = v => check(typeof v === 'string' && v.length > 0 && v.length <= 200, 'identity');
  const time = v => check(typeof v === 'string' && v.length <= 80 && Number.isFinite(Date.parse(v)), 'time');
  const hash = v => check(typeof v === 'string' && /^[a-f0-9]{64}$/.test(v), 'digest');
  check(Array.isArray(tasks), 'collection');
  const ids = new Set(), calls = new Set(), counts = new Map();
  for (const t of tasks) {
    exact(t, ['id','revision','origin','adapter','source','createdAt','updatedAt','execution','result','deliveries']);
    id(t.id); check(!ids.has(t.id), 'duplicate id'); ids.add(t.id);
    check(Number.isSafeInteger(t.revision) && t.revision > 0, 'revision');
    exact(t.origin, ['projectId','sessionId','runId','callId']); Object.values(t.origin).forEach(id);
    check(state.projects.some(p => p.id === t.origin.projectId), 'missing project');
    const s = state.sessions.find(s => s.id === t.origin.sessionId), r = state.runs.find(r => r.id === t.origin.runId);
    check(!s || s.projectId === t.origin.projectId, 'session scope');
    check(!r || r.sessionId === t.origin.sessionId, 'run scope');
    check(!r || s, 'missing live session');
    const key = JSON.stringify([t.origin.runId, t.origin.callId]); check(!calls.has(key), 'duplicate origin'); calls.add(key);
    const count = (counts.get(t.origin.projectId) ?? 0) + 1; counts.set(t.origin.projectId, count); check(count <= TASK_LIMIT, 'project limit');
    exact(t.adapter, ['id','version']); id(t.adapter.id); id(t.adapter.version);
    exact(t.source, ['id','version','digest']); id(t.source.id); id(t.source.version); hash(t.source.digest);
    time(t.createdAt); time(t.updatedAt);
    exact(t.execution, ['status','dispatchCount','cancelRequestedAt','cancelAttempted','reason']);
    check(STATES.has(t.execution.status), 'status'); check([0,1].includes(t.execution.dispatchCount), 'dispatch count');
    check(typeof t.execution.cancelAttempted === 'boolean', 'cancel attempt');
    if (t.execution.cancelRequestedAt !== null) time(t.execution.cancelRequestedAt);
    check(!t.execution.cancelAttempted || t.execution.cancelRequestedAt !== null, 'cancel intent');
    check(t.execution.reason === null || typeof t.execution.reason === 'string' && t.execution.reason.length <= 100, 'reason');
    check(t.execution.status !== 'queued' || t.execution.dispatchCount === 0, 'queued dispatch');
    if (t.result !== null) {
      exact(t.result, ['text','bytes','digest']);
      check(typeof t.result.text === 'string' && Buffer.byteLength(t.result.text) <= RESULT_LIMIT, 'result limit');
      check(t.result.bytes === Buffer.byteLength(t.result.text), 'result bytes'); hash(t.result.digest);
      check(digestText(t.result.text) === t.result.digest && t.result.digest === t.source.digest, 'result integrity');
    }
    check((t.execution.status === 'succeeded') === (t.result !== null), 'result settlement');
    check(Array.isArray(t.deliveries) && t.deliveries.length <= DELIVERY_LIMIT, 'deliveries');
    const receiptKeys = new Set();
    for (const d of t.deliveries) {
      exact(d, ['runId','callId','kind','taskRevision','executionStatus','resultDigest','preparedAt','runtimeRecordedAt','provider']);
      id(d.runId); id(d.callId); check(['get','wait'].includes(d.kind), 'delivery kind');
      const consumer = state.runs.find(r => r.id === d.runId);
      check(!consumer || consumer.sessionId === t.origin.sessionId, 'consumer scope');
      const dk = JSON.stringify([d.runId, d.callId]); check(!receiptKeys.has(dk), 'duplicate delivery'); receiptKeys.add(dk);
      check(Number.isSafeInteger(d.taskRevision) && d.taskRevision > 0 && d.taskRevision <= t.revision, 'delivery revision');
      check(STATES.has(d.executionStatus), 'delivery status');
      if (d.resultDigest !== null) hash(d.resultDigest);
      check((d.executionStatus === 'succeeded') === (d.resultDigest !== null), 'delivery result');
      check(d.resultDigest === null || d.resultDigest === t.source.digest, 'delivery digest');
      time(d.preparedAt); if (d.runtimeRecordedAt !== null) time(d.runtimeRecordedAt);
      check(d.provider === 'unknown', 'provider acknowledgement');
    }
  }
}
