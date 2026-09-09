import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Type } from '@earendil-works/pi-ai';
import { maybeCrash } from '../runtime/test-hooks.mjs';
import { AsyncTaskError, taskAssert, taskObject, taskId, validSource, sameSource,
  digestText, validateAsyncTasks, TASK_LIMIT, RESULT_LIMIT, DELIVERY_LIMIT, TASK_TERMINAL } from './async-task-state.mjs';

export const ASYNC_TOOL_NAMES = ['async_launch', 'async_get', 'async_wait'];
const now = () => new Date().toISOString();
const unavailable = () => new AsyncTaskError(404, 'task_unavailable', 'Async task is unavailable');
const active = r => r && r.admissionOpen && ['running', 'waiting_user'].includes(r.status);

/** Only RuntimeStore writes task facts. Promises coordinate I/O; they are never
 * used as recovery evidence and are not replayed after a host restart. */
export class AsyncTasks {
  constructor({ store, adapters = [], canUse = () => false, ioTimeoutMs = 2000 }) {
    taskAssert(Array.isArray(adapters) && adapters.length <= 16);
    this.store = store; this.canUse = canUse; this.adapters = new Map(); this.pending = new Set(); this.controllers = new Set(); this.closed = false;
    this.ioTimeoutMs = ioTimeoutMs;
    taskAssert(Number.isSafeInteger(ioTimeoutMs) && ioTimeoutMs >= 10 && ioTimeoutMs <= 10_000);
    let sourceCount = 0;
    for (const a of adapters) {
      taskObject(a, ['id','version','sources','launch','query','cancel']); taskId(a.id); taskId(a.version);
      taskAssert(!this.adapters.has(a.id) && Array.isArray(a.sources) && a.sources.length <= 128);
      taskAssert(['launch','query','cancel'].every(m => typeof a[m] === 'function'));
      const sources = a.sources.map(s => Object.freeze(validSource(s)));
      sourceCount += sources.length; taskAssert(sourceCount <= 128);
      taskAssert(new Set(sources.map(s => s.id)).size === sources.length);
      this.adapters.set(a.id, Object.freeze({ id: a.id, version: a.version, sources: Object.freeze(sources),
        launch: a.launch.bind(a), query: a.query.bind(a), cancel: a.cancel.bind(a) }));
    }
    taskAssert(Buffer.byteLength(JSON.stringify(this.catalog())) <= 65_536);
  }

  get enabled() { return this.adapters.size > 0 && !this.closed; }
  catalog() { return [...this.adapters.values()].map(a => ({ id: a.id, version: a.version, sources: structuredClone(a.sources) })); }
  #find(state, id) { const t = state.asyncTasks.find(t => t.id === id); if (!t) throw unavailable(); return t; }
  #scope(t, { projectId, sessionId }) {
    if (t.origin.projectId !== projectId || sessionId !== undefined && t.origin.sessionId !== sessionId) throw unavailable();
  }
  #origin(state, runId) {
    const run = state.runs.find(r => r.id === runId), session = state.sessions.find(s => s.id === run?.sessionId);
    taskAssert(active(run) && session && !session.extensionBinding, 'task_admission_closed', 'Async task admission is closed', 409);
    return { run, session };
  }
  #adapter(t) {
    const a = this.adapters.get(t.adapter.id);
    taskAssert(a?.version === t.adapter.version, 'task_adapter_unavailable', 'Matching async read adapter is unavailable', 409);
    taskAssert(a.sources.some(s => sameSource(s, t.source)), 'task_source_stale', 'Async task source is historical', 409);
    return a;
  }
  #permission(t, name) {
    taskAssert(!this.closed && this.canUse(name, t.origin.sessionId), 'task_policy_denied', 'Runtime policy denies this async action', 409);
  }
  #touch(t) { t.revision++; t.updatedAt = now(); }
  #mutate(fn) { return this.store._mutate(state => { const result = fn(state); validateAsyncTasks(state.asyncTasks, state); return result; }); }
  #track(promise) {
    this.pending.add(promise); promise.then(() => this.pending.delete(promise), () => this.pending.delete(promise));
    return promise;
  }
  async #io(adapter, method, t, signal, timeoutMs = this.ioTimeoutMs) {
    const controller = new AbortController(); this.controllers.add(controller);
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted || this.closed) controller.abort();
    let timeout, abortListener;
    const boundary = new Promise((_, reject) => {
      abortListener = () => reject(new AsyncTaskError(409, 'task_io_unknown', 'Async adapter outcome is unknown'));
      controller.signal.addEventListener('abort', abortListener, { once: true });
      timeout = setTimeout(() => controller.abort(), timeoutMs);
      if (controller.signal.aborted) abortListener();
    });
    try {
      if (controller.signal.aborted) return await boundary;
      const operation = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new Error('aborted before adapter');
        return adapter[method]({ taskId: t.id, source: structuredClone(t.source), signal: controller.signal });
      });
      return structuredClone(await Promise.race([operation, boundary]));
    } finally {
      clearTimeout(timeout); signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', abortListener); this.controllers.delete(controller);
    }
  }

  view(t, { result = true, deliveries = true } = {}) {
    const session = this.store.getSession(t.origin.sessionId);
    const a = this.adapters.get(t.adapter.id);
    const availability = !session ? 'orphaned' : !a || a.version !== t.adapter.version ? 'adapter_unavailable'
      : !a.sources.some(s => sameSource(s, t.source)) ? 'historical' : 'current';
    const v = { schemaVersion: 1, ...structuredClone(t), availability };
    if (!result) delete v.result;
    if (!deliveries) delete v.deliveries;
    return v;
  }
  inspect(id, scope) { const t = this.#find(this.store.state, id); this.#scope(t, scope); return this.view(t); }
  list(projectId, { offset = 0, limit = 20 } = {}) {
    taskAssert(this.store.listProjects().some(p => p.id === projectId), 'task_unavailable', 'Project is unavailable', 404);
    taskAssert(Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(limit) && limit >= 1 && limit <= 50);
    const rows = this.store.state.asyncTasks.filter(t => t.origin.projectId === projectId);
    return { schemaVersion: 1, items: rows.slice(offset, offset + limit).map(t => this.view(t, { result: false, deliveries: false })),
      count: rows.length, offset, nextOffset: offset + limit < rows.length ? offset + limit : null };
  }

  async recover() {
    if (!this.store.state.asyncTasks.some(t => !TASK_TERMINAL.has(t.execution.status))) return;
    await this.#mutate(state => {
      for (const t of state.asyncTasks) if (!TASK_TERMINAL.has(t.execution.status)) {
        t.execution.status = 'unknown'; t.execution.reason = 'host_restart'; this.#touch(t);
      }
    });
  }
  async launch(runId, callId, args, signal) {
    taskObject(args, ['adapterId','sourceId']); taskId(args.adapterId); taskId(args.sourceId); taskId(callId);
    taskAssert(!this.closed && !signal?.aborted, 'task_admission_closed', 'Async task admission is closed', 409);
    const a = this.adapters.get(args.adapterId), source = a?.sources.find(s => s.id === args.sourceId);
    taskAssert(source, 'task_source_unavailable', 'Async read source is unavailable', 409);
    const result = await this.#mutate(state => {
      const { session } = this.#origin(state, runId);
      const existing = state.asyncTasks.find(t => t.origin.runId === runId && t.origin.callId === callId);
      if (existing) {
        taskAssert(existing.adapter.id === a.id && existing.adapter.version === a.version && sameSource(existing.source, source),
          'task_call_conflict', 'Tool call identity was already used with different input', 409);
        return { task: existing, replay: true };
      }
      taskAssert(state.asyncTasks.filter(t => t.origin.projectId === session.projectId).length < TASK_LIMIT, 'task_limit', 'Async task retention limit reached', 409);
      const timestamp = now();
      const t = { id: randomUUID(), revision: 1, origin: { projectId: session.projectId, sessionId: session.id, runId, callId },
        adapter: { id: a.id, version: a.version }, source: structuredClone(source), createdAt: timestamp, updatedAt: timestamp,
        execution: { status: 'queued', dispatchCount: 0, cancelRequestedAt: null, cancelAttempted: false, reason: null }, result: null, deliveries: [] };
      this.#permission(t, 'async_launch'); state.asyncTasks.push(t); return { task: t, replay: false };
    });
    maybeCrash('async_intent');
    if (!result.replay) this.#track(this.#dispatch(result.task.id, signal)).catch(() => {});
    return this.view(result.task, { result: false, deliveries: false });
  }
  async #unknown(id, reason) {
    return this.#mutate(state => {
      const t = this.#find(state, id);
      if (!TASK_TERMINAL.has(t.execution.status) && (t.execution.status !== 'unknown' || t.execution.reason !== reason)) {
        t.execution.status = 'unknown'; t.execution.reason = reason; this.#touch(t);
      }
      return t;
    });
  }
  async #dispatch(id, signal) {
    try {
      const t = await this.#mutate(state => {
        const t = this.#find(state, id);
        if (t.execution.status !== 'queued' || t.execution.dispatchCount) return null;
        this.#origin(state, t.origin.runId); this.#permission(t, 'async_launch'); this.#adapter(t);
        if (signal?.aborted || t.execution.cancelRequestedAt) {
          t.execution.status = 'cancelled'; t.execution.reason = 'cancelled_before_dispatch'; this.#touch(t); return null;
        }
        t.execution.status = 'dispatching'; t.execution.dispatchCount = 1; this.#touch(t); return t;
      });
      if (!t) return;
      maybeCrash('async_dispatch');
      const current = this.#find(this.store.state, id);
      this.#origin(this.store.state, t.origin.runId); this.#permission(t, 'async_launch');
      if (signal?.aborted || current.execution.cancelRequestedAt) { await this.#unknown(id, 'dispatch_cancel_race'); return; }
      const observation = await this.#io(this.#adapter(t), 'launch', t, signal);
      maybeCrash('async_result');
      await this.#observe(id, observation);
    } catch (error) { await this.#unknown(id, error instanceof AsyncTaskError ? error.code : 'dispatch_unknown'); }
  }

  async #observe(id, observation) {
    taskObject(observation, ['taskId','source','status','result']);
    const source = validSource(observation.source);
    taskAssert(['running','succeeded','failed','cancelled','missing'].includes(observation.status), 'task_observation_invalid', 'Invalid task observation', 409);
    return this.#mutate(state => {
      const t = this.#find(state, id);
      taskAssert(observation.taskId === id && sameSource(source, t.source), 'task_identity_mismatch', 'Task response identity does not match', 409);
      let result = null;
      if (observation.status === 'succeeded') {
        taskObject(observation.result, ['text']);
        taskAssert(typeof observation.result.text === 'string' && Buffer.byteLength(observation.result.text) <= RESULT_LIMIT, 'task_result_invalid', 'Invalid task result', 409);
        result = { text: observation.result.text, bytes: Buffer.byteLength(observation.result.text), digest: digestText(observation.result.text) };
        taskAssert(result.digest === t.source.digest, 'task_integrity_refusal', 'Async source bytes do not match the recorded digest', 409);
      } else taskAssert(observation.result === undefined, 'task_observation_invalid', 'Unexpected task result', 409);
      const status = observation.status === 'missing' ? 'unknown' : observation.status;
      if (TASK_TERMINAL.has(t.execution.status)) {
        // A slow running query may arrive after a terminal callback. It cannot
        // roll state back; a contradictory terminal receipt is an integrity error.
        taskAssert(!TASK_TERMINAL.has(status) || status === t.execution.status && result?.digest === t.result?.digest,
          'task_settlement_conflict', 'Conflicting task settlement', 409);
        return t;
      }
      const reason = observation.status === 'missing' ? 'remote_record_missing' : null;
      if (t.execution.status !== status || t.execution.reason !== reason) {
        t.execution.status = status; t.execution.reason = reason; t.result = result; this.#touch(t);
      }
      return t;
    });
  }
  async reconcile(id, scope, { expectedRevision, signal, tool = 'async_get', timeoutMs } = {}) {
    let t = this.#find(this.store.state, id); this.#scope(t, scope);
    if (expectedRevision !== undefined) taskAssert(t.revision === expectedRevision, 'task_version_conflict', 'Async task revision changed', 409);
    this.#permission(t, tool); const a = this.#adapter(t);
    if (TASK_TERMINAL.has(t.execution.status)) return this.view(t);
    try { t = await this.#observe(id, await this.#io(a, 'query', t, signal, timeoutMs)); }
    catch (error) {
      if (error instanceof AsyncTaskError && ['task_identity_mismatch','task_integrity_refusal','task_settlement_conflict','task_observation_invalid','task_result_invalid'].includes(error.code)) throw error;
      t = await this.#unknown(id, 'query_unknown');
    }
    return this.view(t);
  }
  async requestConsumption(runId, callId, kind, args) {
    taskAssert(['get', 'wait'].includes(kind));
    taskObject(args, kind === 'wait' ? ['taskId','waitMs'] : ['taskId']); taskId(args.taskId); taskId(callId);
    const { session } = this.#origin(this.store.state, runId);
    const scope = { projectId: session.projectId, sessionId: session.id };
    const t = this.#find(this.store.state, args.taskId); this.#scope(t, scope);
    // Runs retain valid, scoped requests even when the outer policy wrapper
    // denies execution. This is dependency evidence, never adapter permission.
    await this.#mutate(state => {
      this.#origin(state, runId);
      const current = this.#find(state, t.id); this.#scope(current, scope);
      const previous = state.asyncTasks.flatMap(task => task.deliveries.map(d => ({ task, d })))
        .find(({ d }) => d.runId === runId && d.callId === callId);
      if (previous) {
        taskAssert(previous.task.id === t.id && previous.d.kind === kind && !previous.d.runtimeRecordedAt,
          'task_delivery_conflict', 'Consumption call identity was already used', 409);
        return;
      }
      taskAssert(current.deliveries.length < DELIVERY_LIMIT, 'task_delivery_limit', 'Async task delivery retention limit reached', 409);
      current.deliveries.push({ runId, callId, kind, taskRevision: current.revision, executionStatus: current.execution.status,
        resultDigest: current.result?.digest ?? null, preparedAt: now(), runtimeRecordedAt: null, provider: 'unknown' });
      this.#touch(current);
    });
  }
  async consume(runId, callId, kind, args, signal) {
    taskObject(args, kind === 'wait' ? ['taskId','waitMs'] : ['taskId']); taskId(args.taskId); taskId(callId);
    const waitMs = kind === 'wait' ? args.waitMs ?? 1000 : 0;
    taskAssert(Number.isSafeInteger(waitMs) && waitMs >= 0 && waitMs <= 10_000);
    const { session } = this.#origin(this.store.state, runId), scope = { projectId: session.projectId, sessionId: session.id };
    let t = this.#find(this.store.state, args.taskId); this.#scope(t, scope);
    const tool = kind === 'wait' ? 'async_wait' : 'async_get';
    await this.requestConsumption(runId, callId, kind, args);
    this.#permission(t, tool); this.#adapter(t);
    const deadline = Date.now() + waitMs;
    do {
      this.#origin(this.store.state, runId);
      taskAssert(!signal?.aborted, 'task_wait_cancelled', 'Async wait cancelled', 409);
      if (!TASK_TERMINAL.has(t.execution.status)) await this.reconcile(t.id, scope, { signal, tool, timeoutMs: waitMs > 0 ? Math.min(this.ioTimeoutMs, Math.max(1, deadline - Date.now())) : this.ioTimeoutMs });
      t = this.#find(this.store.state, t.id);
      if (TASK_TERMINAL.has(t.execution.status) || Date.now() >= deadline) break;
      await delay(Math.min(50, Math.max(1, deadline - Date.now())), undefined, { signal });
    } while (true);
    const recorded = await this.#mutate(state => {
      this.#origin(state, runId); this.#permission(t, tool); this.#adapter(t);
      const current = this.#find(state, t.id);
      const receipt = current.deliveries.find(d => d.runId === runId && d.callId === callId);
      taskAssert(receipt && !receipt.runtimeRecordedAt, 'task_delivery_conflict', 'Consumption receipt changed', 409);
      Object.assign(receipt, { taskRevision: current.revision, executionStatus: current.execution.status, resultDigest: current.result?.digest ?? null });
      this.#touch(current); return current;
    });
    maybeCrash('async_delivery');
    return this.view(recorded, { deliveries: false });
  }
  async cancel(id, scope, expectedRevision) {
    const selected = this.#find(this.store.state, id); this.#scope(selected, scope); this.#permission(selected, 'async_launch');
    const a = this.#adapter(selected);
    const t = await this.#mutate(state => {
      const t = this.#find(state, id); this.#scope(t, scope); this.#permission(t, 'async_launch');
      if (expectedRevision !== undefined) taskAssert(t.revision === expectedRevision, 'task_version_conflict', 'Async task revision changed', 409);
      if (TASK_TERMINAL.has(t.execution.status) || t.execution.cancelAttempted) return null;
      t.execution.cancelRequestedAt ??= now(); t.execution.cancelAttempted = true;
      if (!t.execution.dispatchCount) { t.execution.status = 'cancelled'; t.execution.reason = 'cancelled_before_dispatch'; }
      this.#touch(t); return t;
    });
    if (t && !TASK_TERMINAL.has(t.execution.status)) {
      try { await this.#observe(id, await this.#io(a, 'cancel', t)); }
      catch { await this.#unknown(id, 'cancel_unknown'); }
    }
    return this.inspect(id, scope);
  }
  async cancelOrigin(runId) {
    await Promise.allSettled(this.store.state.asyncTasks.filter(t => t.origin.runId === runId && !TASK_TERMINAL.has(t.execution.status))
      .map(t => this.cancel(t.id, { projectId: t.origin.projectId })));
  }
  unresolved(runId) {
    return this.store.state.asyncTasks.filter(t => t.origin.runId === runId || t.deliveries.some(d => d.runId === runId))
      .filter(t => !TASK_TERMINAL.has(t.execution.status) || this.view(t).availability !== 'current'
        || !t.deliveries.some(d => d.runId === runId && d.runtimeRecordedAt && d.executionStatus === t.execution.status && d.resultDigest === (t.result?.digest ?? null)))
      .map(t => t.id);
  }
  tools(runId) {
    return ASYNC_TOOL_NAMES.map(name => ({ name, label: name,
      description: name === 'async_launch' ? 'Launch a durable read of one host-catalogued immutable source. Returns a handle; use async_get/wait for its evidence.'
        : name === 'async_get' ? 'Get/reconcile the selected task in this Session, without relaunching it.' : 'Wait only for the selected task, up to waitMs (0–10000). A pending result is not complete evidence.',
      parameters: name === 'async_launch' ? Type.Object({ adapterId: Type.String(), sourceId: Type.String() }, { additionalProperties: false })
        : Type.Object({ taskId: Type.String(), ...(name === 'async_wait' ? { waitMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000 })) } : {}) }, { additionalProperties: false }),
      execute: async (callId, args, signal) => {
        const value = name === 'async_launch' ? await this.launch(runId, callId, args, signal)
          : await this.consume(runId, callId, name === 'async_get' ? 'get' : 'wait', args, signal);
        return { content: [{ type: 'text', text: JSON.stringify(value) }], details: { taskId: value.id } };
      },
    }));
  }
  async close() {
    this.closed = true; for (const controller of this.controllers) controller.abort();
    await Promise.allSettled([...this.pending]);
  }
}
