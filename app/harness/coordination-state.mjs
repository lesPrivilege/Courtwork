// CW interaction/execution records. These do not own Matter acceptance.
export class CoordinationError extends Error {
  constructor(code, message, status = 409) { super(message); this.name = 'CoordinationError'; this.code = code; this.status = status; }
}
export function check(ok, message, code = 'coordination_invalid', status = 400) {
  if (!ok) throw new CoordinationError(code, message, status);
}
export function keys(value, expected) {
  check(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...expected].sort().join(','), 'Unsupported or missing fields');
}
export function str(value, max = 200) { check(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Invalid text'); return value; }
export function revision(value) { check(Number.isSafeInteger(value) && value >= 0, 'Invalid revision'); return value; }
export const emptyCoordination = () => ({ threads: [], messages: [] });
export function sessionScope(session) {
  return { kind: session.scope, projectId: session.projectId, matterId: session.extensionBinding?.binding?.matterId ?? null };
}
export function validateCoordination(value) {
  keys(value, ['threads','messages']);
  check(Array.isArray(value.threads) && value.threads.length <= 256 && Array.isArray(value.messages) && value.messages.length <= 1024, 'Coordination capacity exceeded');
  const ids = new Set(), memberships = new Set();
  for (const t of value.threads) {
    keys(t, ['id','title','scope','sessionIds','revision','status','createdAt','creation']);
    str(t.id); check(!ids.has(t.id), 'Duplicate Thread'); ids.add(t.id);
    str(t.title); revision(t.revision); check(t.revision >= 1, 'Invalid Thread revision');
    keys(t.scope, ['kind','projectId','matterId']);
    check(['global','project'].includes(t.scope.kind), 'Invalid scope');
    if (t.scope.kind === 'global') check(t.scope.projectId === null && t.scope.matterId === null, 'Global Thread scope');
    else { str(t.scope.projectId); if (t.scope.matterId !== null) str(t.scope.matterId); }
    check(['open','closed'].includes(t.status) && Number.isFinite(Date.parse(t.createdAt)), 'Invalid Thread state');
    check(Array.isArray(t.sessionIds) && t.sessionIds.length > 0 && t.sessionIds.length <= 64, 'Invalid membership');
    for (const s of t.sessionIds) { str(s); check(!memberships.has(s), 'Session already belongs to a Thread'); memberships.add(s); }
    check(t.revision === t.sessionIds.length + (t.status === 'closed' ? 1 : 0), 'Thread revision does not match membership');
    keys(t.creation, ['sessionId','title']); str(t.creation.sessionId); str(t.creation.title);
    check(t.sessionIds[0] === t.creation.sessionId && t.title === t.creation.title, 'Invalid creation receipt');
  }
  const messages = new Map(), calls = new Set();
  for (const m of value.messages) {
    keys(m, ['id','sourceThreadId','targetThreadId','sourceSessionId','sourceRunId','sourceCallId','actor','kind','text','replyTo','expectedTargetRevision','status','revision','createdAt','deliveredAt']);
    str(m.id); check(!messages.has(m.id), 'Duplicate message'); messages.set(m.id,m);
    check(ids.has(m.sourceThreadId) && ids.has(m.targetThreadId) && m.sourceThreadId !== m.targetThreadId, 'Invalid message Threads');
    str(m.sourceSessionId); check(value.threads.find(t=>t.id === m.sourceThreadId).sessionIds.includes(m.sourceSessionId), 'Invalid message source');
    check(['human','runtime'].includes(m.actor), 'Invalid actor');
    if (m.actor === 'runtime') { str(m.sourceRunId); str(m.sourceCallId); const key=JSON.stringify([m.sourceRunId,m.sourceCallId]); check(!calls.has(key),'Duplicate runtime message call'); calls.add(key); } else check(m.sourceRunId === null && m.sourceCallId === null, 'Invalid human origin');
    check(['request','signal','reply','result'].includes(m.kind), 'Invalid message kind'); str(m.text, 16000);
    revision(m.expectedTargetRevision); check(m.expectedTargetRevision >= 1 && m.expectedTargetRevision <= value.threads.find(t=>t.id === m.targetThreadId).revision, 'Invalid target revision');
    check(['queued','delivered','target_unavailable','stale_target'].includes(m.status), 'Invalid delivery');
    check(m.revision === (m.status === 'queued' ? 1 : 2), 'Invalid message revision');
    check(Number.isFinite(Date.parse(m.createdAt)), 'Invalid createdAt');
    check(m.status === 'delivered' ? Number.isFinite(Date.parse(m.deliveredAt)) : m.deliveredAt === null, 'Invalid deliveredAt');
    if (m.replyTo !== null) str(m.replyTo);
    check((m.kind === 'reply') === (m.replyTo !== null), 'Reply must name its origin');
  }
  for (const m of value.messages) if (m.replyTo !== null) {
    const parent = messages.get(m.replyTo);
    check(parent && parent.status === 'delivered' && parent.sourceThreadId === m.targetThreadId && parent.targetThreadId === m.sourceThreadId, 'Invalid reply lineage');
  }
  return value;
}
