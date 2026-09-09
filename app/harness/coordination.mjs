import { createHash } from 'node:crypto';
import { check, keys, str, revision, sessionScope, validateCoordination } from './coordination-state.mjs';

const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const stamp = () => new Date().toISOString();
function session(state, id) { const s = state.sessions.find(s=>s.id === id); check(s, 'Session unavailable', 'coordination_unavailable', 404); return s; }
function thread(state, id) { const t = state.coordination.threads.find(t=>t.id === id); check(t, 'Thread unavailable', 'coordination_unavailable', 404); return t; }
function member(state, t, id) {
  const s = session(state,id);
  check(t.sessionIds.includes(id) && same(t.scope,sessionScope(s)), 'Thread binding changed', 'coordination_binding'); return s;
}
function cas(t, expected) { revision(expected); check(t.revision === expected, 'Thread changed; refresh before acting', 'coordination_stale'); }
function available(state,t) { return t.status === 'open' && t.sessionIds.some(id => state.sessions.some(s=>s.id === id && same(sessionScope(s),t.scope))); }
const inputFields = ['messageId','sourceThreadId','targetThreadId','sourceSessionId','kind','text','replyTo','expectedTargetRevision'];

// A single RuntimeStore transaction publishes outbox/inbox delivery records.
// No second file writer, model callback, Matter mutation or implicit latest target.
export class Coordination {
  constructor(store) { this.store = store; }
  mutate(fn) { return this.store._mutate(state => { const result = fn(state); validateCoordination(state.coordination); return result; }); }
  list(sessionId = null) {
    const state = this.store.snapshot();
    if (sessionId !== null) session(state,sessionId);
    return { schemaVersion: 1, threads: state.coordination.threads.map(t => ({...t, available: available(state,t)})),
      currentThreadId: sessionId === null ? null : state.coordination.threads.find(t=>t.sessionIds.includes(sessionId) && same(t.scope,sessionScope(session(state,sessionId))))?.id ?? null,
      capabilities: { message: true, explore: false, handoff: false, workflow: false } };
  }
  create(input) {
    keys(input,['threadId','sessionId','title']); str(input.threadId); str(input.sessionId); str(input.title);
    return this.mutate(state => {
      const existing = state.coordination.threads.find(t=>t.id === input.threadId);
      if (existing) { check(same(existing.creation,{sessionId:input.sessionId,title:input.title}), 'Thread identity reused', 'coordination_conflict'); return existing; }
      const s = session(state,input.sessionId);
      check(!state.coordination.threads.some(t=>t.sessionIds.includes(s.id)), 'Session already has a Thread', 'coordination_conflict');
      check(state.coordination.threads.length < 256, 'Thread capacity reached', 'coordination_capacity');
      const t = {id:input.threadId,title:input.title,scope:sessionScope(s),sessionIds:[s.id],revision:1,status:'open',createdAt:stamp(),creation:{sessionId:s.id,title:input.title}};
      state.coordination.threads.push(t); return t;
    });
  }
  attach(id,input) {
    keys(input,['sessionId','expectedRevision']); str(input.sessionId); revision(input.expectedRevision);
    return this.mutate(state => {
      const t = thread(state,id), s = session(state,input.sessionId);
      check(t.status === 'open' && same(t.scope,sessionScope(s)), 'Thread scope is unavailable', 'coordination_binding');
      // Exact repeated membership is an idempotent no-op, not another revision.
      if (t.sessionIds.includes(s.id)) return t;
      cas(t,input.expectedRevision);
      check(!state.coordination.threads.some(t=>t.sessionIds.includes(s.id)), 'Session already has a Thread', 'coordination_conflict');
      check(t.sessionIds.length < 64, 'Thread membership capacity reached', 'coordination_capacity');
      t.sessionIds.push(s.id); t.revision++; return t;
    });
  }
  close(id,input) {
    keys(input,['expectedRevision']);
    return this.mutate(state => { const t=thread(state,id); cas(t,input.expectedRevision); check(t.status === 'open','Thread already closed','coordination_conflict'); t.status='closed'; t.revision++; return t; });
  }
  enqueue(input, runtimeOrigin = null) {
    keys(input,inputFields); for (const k of ['messageId','sourceThreadId','targetThreadId','sourceSessionId']) str(input[k]);
    str(input.text,16000); revision(input.expectedTargetRevision);
    check(['request','signal','reply','result'].includes(input.kind),'Unsupported message kind');
    check((input.kind === 'reply') === (input.replyTo !== null),'Reply requires replyTo'); if (input.replyTo !== null) str(input.replyTo);
    const record = {id:input.messageId,sourceThreadId:input.sourceThreadId,targetThreadId:input.targetThreadId,sourceSessionId:input.sourceSessionId,
      sourceRunId:runtimeOrigin?.runId ?? null,sourceCallId:runtimeOrigin?.callId ?? null,actor:runtimeOrigin ? 'runtime' : 'human',
      kind:input.kind,text:input.text,replyTo:input.replyTo,expectedTargetRevision:input.expectedTargetRevision};
    return this.mutate(state => {
      const old=state.coordination.messages.find(m=>m.id === record.id);
      if (old) { check(Object.keys(record).every(k=>same(old[k],record[k])), 'Message identity reused with different input', 'coordination_conflict'); return old; }
      const source=thread(state,record.sourceThreadId), target=thread(state,record.targetThreadId);
      member(state,source,record.sourceSessionId);
      check(available(state,source) && available(state,target) && source.id !== target.id, 'Thread unavailable', 'coordination_unavailable');
      if (runtimeOrigin) {
        const r=state.runs.find(r=>r.id === runtimeOrigin.runId);
        check(r?.sessionId === record.sourceSessionId && r.admissionOpen && ['running','waiting_user'].includes(r.status), 'Run admission closed', 'coordination_closed');
        // A bound domain Run must not acquire input outside its coverage owner.
        check(!session(state,record.sourceSessionId).extensionBinding, 'Bound domain messaging awaits coverage contract', 'coordination_binding');
      }
      cas(target,record.expectedTargetRevision);
      if (record.replyTo !== null) {
        const parent=state.coordination.messages.find(m=>m.id === record.replyTo);
        check(parent?.status === 'delivered' && parent.sourceThreadId === target.id && parent.targetThreadId === source.id, 'Reply origin unavailable', 'coordination_binding');
      }
      check(state.coordination.messages.length < 1024,'Mailbox capacity reached','coordination_capacity');
      const message={...record,status:'queued',revision:1,createdAt:stamp(),deliveredAt:null}; state.coordination.messages.push(message); return message;
    });
  }
  deliver(id) {
    return this.mutate(state => {
      const m=state.coordination.messages.find(m=>m.id === id); check(m,'Message unavailable','coordination_unavailable',404);
      if (m.status !== 'queued') return m;
      const target=thread(state,m.targetThreadId);
      m.status = !available(state,target) ? 'target_unavailable' : target.revision !== m.expectedTargetRevision ? 'stale_target' : 'delivered';
      m.revision=2; if (m.status === 'delivered') m.deliveredAt=stamp(); return m;
    });
  }
  async send(input,origin=null) { const receipt=await this.enqueue(input,origin); return receipt.status === 'queued' ? this.deliver(receipt.id) : receipt; }
  async recover() { for (const m of this.store.snapshot().coordination.messages) if (m.status === 'queued') await this.deliver(m.id); }
  mailbox(id, {sessionId=null}={}) {
    const state=this.store.snapshot(), t=thread(state,id); if (sessionId !== null) member(state,t,sessionId);
    return {schemaVersion:1,thread:{...t,available:available(state,t)},authority:'communication-only',
      messages:state.coordination.messages.filter(m=>m.sourceThreadId === id || (m.targetThreadId === id && m.status === 'delivered'))};
  }
  runtimeMessageId(runId,callId) { return 'message-' + createHash('sha256').update(JSON.stringify([runId,callId])).digest('hex'); }
}
