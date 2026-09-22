import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { validateState } from '../server/store.mjs';
import { localPiHost, localPiWait } from './fixtures/local-pi-host-harness.mjs';
import { localPiReceipt } from '../runtime/local-pi-state.mjs';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const settled = (h, id) => localPiWait(() => { const a = h.assignment(id); return ['blocked', 'resolved', 'cancelled'].includes(a?.status) && a.attempts.length ? a : null; });
const action = (h, a, verb, extra = {}) => h.api('POST', `/subagents/${a.id}/actions`, { action: verb, expectedRevision: a.revision, commandId: randomUUID(), reason: 'Synthetic explicit review.', expandedSources: [], ...extra });

test('Host Spark actual Pi process retains exact findings, keeps provided-only coverage blocked and consumes explicitly', async () => {
  const h = await localPiHost();
  try {
    const source = await h.source(); const input = await h.create([source]); const a = await settled(h, input.id);
    const run = h.runtime.store.getRun(a.attempts[0].runId);
    assert.equal(run.status, 'completed', JSON.stringify({ a, run, events: h.runtime.store.snapshot().events }));
    assert.equal(run.adapterId, 'pi-local-print'); assert.equal(run.hostSession, null);
    assert.equal(run.provider.baseUrl, h.runtime.fakeProvider.baseUrl);
    assert.equal(a.status, 'blocked'); assert.equal(a.reason, 'assigned_source_coverage_incomplete'); assert.deepEqual(a.sourceReads, []);
    assert.match(a.result.coverage, /provided.*unverified/);
    const receipt = localPiReceipt(h.runtime.store.snapshot(), run.id);
    assert.equal(receipt.terminal.status, 'completed'); assert.equal(receipt.result.sha256, a.result.sha256);
    const result = await h.api('GET', `/subagents/${a.id}/result`);
    assert.equal(result.status, 200); assert.equal(result.json.authority, 'finding-only');
    assert.equal(createHash('sha256').update(result.json.text).digest('hex'), a.result.sha256);
    assert.equal(h.requests.length, 1); assert.deepEqual(h.requests[0].tools ?? [], []);
    const denied = await action(h, a, 'adopt', { expandedSources: [0] }); assert.equal(denied.status, 409);
    await h.runtime.service.subagents.readSource(a.id, 0);
    const adopted = await action(h, h.assignment(a.id), 'adopt', { expandedSources: [0] }); assert.equal(adopted.status, 200, JSON.stringify(adopted));
    assert.equal(h.assignment(a.id).status, 'blocked'); assert.equal(h.assignment(a.id).consumption.length, 1);
    const replay = await h.api('POST', '/subagents', input); assert.equal(replay.status, 200); assert.equal(h.requests.length, 1);
    const runReplay = await h.api('POST', `/sessions/${run.sessionId}/runs`, { input: h.runtime.store.snapshot().events.find(e => e.runId === run.id && e.type === 'user.message').data.text, commandId: run.commandId });
    assert.equal(runReplay.status, 200); assert.equal(runReplay.json.run.id, run.id); assert.equal(h.requests.length, 1);
    validateState(h.runtime.store.snapshot());
  } finally { await h.close(); }
});

test('Host rejects malformed, duplicate/cross-attempt native receipts and generic worker-forgeable event append', async () => {
  const h = await localPiHost();
  try {
    const input = await h.create(); const a = await settled(h, input.id), runId = a.attempts[0].runId;
    const state = h.runtime.store.snapshot(); const events = state.events.filter(e => e.runId === runId && e.type.startsWith('local_pi.'));
    assert.equal(events.length, 5, JSON.stringify({ a, events }));
    for (const change of [
      s => s.events.find(e => e.type === 'local_pi.native').data.sessionId = 'wrong-native',
      s => s.events.find(e => e.type === 'local_pi.dispatch').data.attempt = 2,
      s => s.events.find(e => e.type === 'local_pi.result').data.bytes++,
      s => s.events.find(e => e.type === 'local_pi.terminal').data.process.exitCode = 7,
      s => s.events.find(e => e.type === 'local_pi.dispatch').data.binding.extra = true,
    ]) { const corrupt = structuredClone(state); change(corrupt); assert.throws(() => validateState(corrupt)); }
    const dispatch = events[0];
    assert.equal((await h.runtime.store.recordLocalPiEvent(runId, dispatch.type, dispatch.data)).recorded, false);
    await assert.rejects(h.runtime.store.recordLocalPiEvent(runId, dispatch.type, { ...dispatch.data, dispatchId: 'wrong' }));
    await assert.rejects(h.runtime.store.appendEvent({ runId, type: 'local_pi.spawn', data: {} }));
    assert.equal(h.requests.length, 1);
  } finally { await h.close(); }
});

test('actual Host crashes across intent/spawn/retention/publication reopen fenced and old reconcile/retry cannot redispatch', async t => {
  for (const stage of ['dispatch', 'spawn', 'result', 'terminal']) await t.test(stage, async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-local-pi-crash-'));
    let h;
    try {
      const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/local-pi-crash-host.mjs', import.meta.url)), dataDir, stage], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = ''; child.stderr.on('data', b => { stderr += b; }); child.stdout.resume();
      const code = await new Promise(resolve => child.once('close', resolve));
      assert.equal(code, { dispatch: 71, spawn: 72, result: 73, terminal: 74 }[stage], stderr);
      const before = JSON.parse(await readFile(path.join(dataDir, 'runtime-state.json'), 'utf8'));
      const originalAssignment = before.subagents.assignments[0], runId = originalAssignment.attempts[0].runId;
      const receiptBefore = localPiReceipt(before, runId);
      assert.ok(receiptBefore.dispatch); assert.equal(before.runs.find(r => r.id === runId).status, 'running');
      if (stage === 'spawn') {
        assert.equal(receiptBefore.spawn, undefined, 'crash before durable PID observation');
        const { pid } = JSON.parse(await readFile(path.join(dataDir, 'owned-pid.json'), 'utf8'));
        await localPiWait(() => { try { process.kill(pid, 0); return false; } catch { return true; } }, 5000);
      }
      h = await localPiHost({ dataDir, parentId: originalAssignment.parentSessionId });
      let repeatedSpawns = 0;
      const record = h.runtime.store.recordLocalPiEvent.bind(h.runtime.store);
      h.runtime.store.recordLocalPiEvent = (...args) => { if (args[1] === 'local_pi.spawn') repeatedSpawns++; return record(...args); };
      const a = h.assignment(originalAssignment.id);
      assert.equal(a.status, 'blocked'); assert.equal(a.attempts[0].status, 'unknown');
      const reconcile = await action(h, a, 'reconcile'); assert.equal(reconcile.status, 409, JSON.stringify(reconcile));
      assert.equal(reconcile.json.error.code, 'local_pi_unreconciled');
      assert.equal((await action(h, h.assignment(a.id), 'retry')).status, 409);
      const persisted = h.runtime.store.snapshot();
      await assert.rejects(h.runtime.store.updateRunWithEvent(runId, { status: 'cancelled' }, { type: 'run.status', data: { status: 'cancelled' } }), /terminal transition/);
      assert.deepEqual(h.runtime.store.snapshot(), persisted, 'changing both fields cannot remove a recorded unknown');
      const next = await h.api('POST', `/sessions/${a.attempts[0].sessionId}/runs`, { commandId: randomUUID(), input: 'Must not relaunch.' }); assert.equal(next.status, 409);
      assert.equal(h.assignment(a.id).attempts.length, 1); assert.equal(h.requests.length, 0);
      assert.equal(repeatedSpawns, 0, 'no owned-process spawn callback follows any recovery/retry request');
      if (['result', 'terminal'].includes(stage)) {
        const retained = await h.runtime.service.artifactHistory.read(a.attempts[0].sessionId, receiptBefore.result.sha256, receiptBefore.result.bytes);
        assert.equal(retained.toString(), 'Retained before publication.'); assert.equal(a.result, null);
      }
      validateState(h.runtime.store.snapshot());
    } finally { if (h) await h.close(); else await rm(dataDir, { recursive: true, force: true }); }
  });
});

test('source revocation before intent prevents provider dispatch; revocation before publication retains no readable findings', async t => {
  const deny = async h => {
    const control = (await h.api('GET', `/runtime-control?sessionId=${h.parent.id}`)).json;
    const r = await h.api('PUT', `/runtime-control?sessionId=${h.parent.id}`, { revision: control.revision, operation: 'policy', scope: { type: 'session', id: h.parent.id }, rules: [{ action: 'ws_read', resource: '*', effect: 'deny' }] });
    assert.equal(r.status, 409, 'public Runtime control is correctly frozen while a Run is active');
    await h.runtime.service.control.change({ revision: control.revision, operation: 'policy', scope: { type: 'session', id: h.parent.id }, rules: [{ action: 'ws_read', resource: '*', effect: 'deny' }] }, control.resources);
  };
  await t.test('before intent', async () => {
    const h = await localPiHost();
    try {
      const source = await h.source();
      const history = h.runtime.service.artifactHistory; const save = history.save.bind(history);
      let intercepted = false;
      history.save = async (...args) => { const result = await save(...args); if (!intercepted && args[1].toString().includes('"executionId"')) { intercepted = true; await deny(h); } return result; };
      const input = await h.create([source]); const a = await settled(h, input.id);
      assert.equal(h.requests.length, 0); assert.equal(a.result, null); assert.equal(a.status, 'blocked');
      assert.equal(localPiReceipt(h.runtime.store.snapshot(), a.attempts[0].runId).dispatch, undefined);
    } finally { await h.close(); }
  });
  await t.test('before publication', async () => {
    let release, ready; const gate = new Promise(r => { release = r; }); const requested = new Promise(r => { ready = r; });
    const h = await localPiHost({ respond: async () => { ready(); await gate; return { kind: 'text', id: 'fixture', created: 1, text: 'Stale finding.' }; } });
    try {
      const input = await h.create([await h.source()]); await requested; await deny(h); release();
      const a = await settled(h, input.id); assert.equal(a.result, null); assert.equal(a.status, 'blocked');
      assert.equal(a.attempts[0].status, 'unknown'); assert.equal(h.requests.length, 1);
      assert.equal((await action(h, a, 'reconcile')).status, 409);
      assert.notEqual((await h.api('GET', `/subagents/${a.id}/result`)).status, 200);
    } finally { release(); await h.close(); }
  });
});

test('Host cancellation closes the actual owned Pi before releasing the serial lane', async () => {
  let ready, release; const requested = new Promise(r => { ready = r; }); const gate = new Promise(r => { release = r; });
  const h = await localPiHost({ respond: async () => { ready(); await gate; return { kind: 'text', id: 'fixture', created: 1, text: 'Too late.' }; } });
  try {
    const input = await h.create(); await requested;
    const cancelled = await action(h, h.assignment(input.id), 'cancel'); assert.equal(cancelled.status, 200, JSON.stringify(cancelled));
    const a = await settled(h, input.id); assert.equal(a.status, 'cancelled');
    const receipt = localPiReceipt(h.runtime.store.snapshot(), a.attempts[0].runId);
    assert.equal(receipt.terminal.status, 'cancelled'); assert.equal(a.result, null);
    assert.throws(() => process.kill(receipt.spawn.pid, 0), { code: 'ESRCH' });
  } finally { release(); await h.close(); }
});

test('new source revision during actual process consultation prevents stale publication', async () => {
  let ready, release; const requested = new Promise(r => { ready = r; }); const gate = new Promise(r => { release = r; });
  const h = await localPiHost({ respond: async () => { ready(); await gate; return { kind: 'text', id: 'fixture', created: 1, text: 'Old-source finding.' }; } });
  try {
    const source = await h.source('Version one.'); const input = await h.create([source]); await requested;
    const newer = await h.source('Version two.'); assert.ok(newer.revision > source.revision); release();
    const a = await settled(h, input.id);
    assert.equal(a.result, null); assert.equal(a.attempts[0].status, 'unknown'); assert.equal(h.requests.length, 1);
    assert.equal((await action(h, a, 'reconcile')).status, 409);
  } finally { release(); await h.close(); }
});

test('result retention failure cannot publish or rerun a completed native response', async () => {
  const h = await localPiHost();
  try {
    const history = h.runtime.service.artifactHistory, save = history.save.bind(history);
    history.save = async (...args) => { if (args[1].toString().startsWith('Retained finding')) throw Error('synthetic retention failure'); return save(...args); };
    const input = await h.create(); const a = await settled(h, input.id);
    assert.equal(a.result, null); assert.equal(a.attempts[0].status, 'unknown'); assert.equal(h.requests.length, 1);
    assert.equal((await action(h, a, 'reconcile')).status, 409);
    assert.equal((await action(h, h.assignment(a.id), 'retry')).status, 409);
    assert.equal(h.requests.length, 1);
  } finally { await h.close(); }
});

test('source revision changed during final retention cannot pass the atomic publication fence', async () => {
  const h = await localPiHost();
  try {
    const source = await h.source('Version one.');
    const history = h.runtime.service.artifactHistory, save = history.save.bind(history);
    let resultSaves = 0;
    history.save = async (...args) => {
      const result = await save(...args);
      if (args[1].toString().startsWith('Retained finding') && ++resultSaves === 2) await h.source('Changed in the last publication window.');
      return result;
    };
    const input = await h.create([source]), a = await settled(h, input.id);
    assert.equal(resultSaves, 2); assert.equal(a.result, null, 'stale finding must not gain a public result pointer');
    assert.equal(a.reason, 'findings_publication_failed');
    assert.equal(h.runtime.store.getRun(a.attempts[0].runId).status, 'completed', 'native completion remains known');
    assert.equal(h.requests.length, 1);
  } finally { await h.close(); }
});

test('a CW parent tool delegates to actual local Pi only after releasing the existing serial lane', async () => {
  const h = await localPiHost({ respond: ({ mode }) => mode.startsWith('/fixture') ? null : { kind: 'text', id: 'fixture', created: 1, text: 'Bounded child consultation.' } });
  try {
    const parent = (await h.api('POST', '/sessions', { title: 'Agent parent', permissionMode: 'ask' })).json.session;
    const input = '/fixture script ' + JSON.stringify([{ name: 'spark_explore', arguments: { brief: 'Explain missing evidence.', sources: [] } }]);
    const started = await h.api('POST', `/sessions/${parent.id}/runs`, { commandId: randomUUID(), input });
    assert.equal(started.status, 200);
    const question = await localPiWait(() => h.runtime.store.snapshot().questions.find(q => q.runId === started.json.run.id && q.status === 'pending'));
    const allowed = await h.api('POST', `/runs/${started.json.run.id}/questions/${question.id}`, { decision: 'allow' }); assert.equal(allowed.status, 200);
    const assignment = await localPiWait(() => h.runtime.store.snapshot().subagents.assignments.find(a => a.origin.runId === started.json.run.id));
    const a = await settled(h, assignment.id);
    const parentRun = h.runtime.store.getRun(started.json.run.id), childRun = h.runtime.store.getRun(a.attempts[0].runId);
    assert.equal(childRun.adapterId, 'pi-local-print'); assert.equal(childRun.status, 'completed', JSON.stringify(a));
    assert.notEqual(parentRun.adapterId, 'pi-local-print'); assert.ok(Date.parse(childRun.startedAt) >= Date.parse(parentRun.endedAt));
    assert.equal(h.runtime.store.listRuns(parent.id).length, 1, 'no automatic parent resume');
    assert.equal(a.origin.actor, 'runtime'); assert.equal(a.result.runId, childRun.id);
  } finally { await h.close(); }
});

test('a forged Run status cannot erase its Host status evidence', async () => {
  const h = await localPiHost();
  try {
    const input = await h.create(), a = await settled(h, input.id);
    const state = h.runtime.store.snapshot(), run = state.runs.find(r => r.id === a.attempts[0].runId);
    assert.equal(localPiReceipt(state, run.id).terminal.status, 'completed');
    run.status = 'cancelled';
    assert.throws(() => validateState(state), /Host status evidence/);
    await assert.rejects(h.runtime.store.updateRunWithEvent(run.id, { status: 'cancelled' }, { type: 'run.status', data: { status: 'cancelled' } }), /terminal transition/);
    assert.equal(h.runtime.store.getRun(run.id).status, 'completed');
  } finally { await h.close(); }
});

test('late explicit cancellation can settle the Host Run cancelled after known native completion without inventing uncertainty', async () => {
  const h = await localPiHost(); let ready, release;
  const published = new Promise(r => { ready = r; }), gate = new Promise(r => { release = r; });
  try {
    const append = h.runtime.store.appendEvent.bind(h.runtime.store); let gated = false;
    h.runtime.store.appendEvent = async event => {
      const result = await append(event);
      if (event.type === 'assistant.message' && !gated) { gated = true; ready(); await gate; }
      return result;
    };
    const input = await h.create(); await published;
    const a = h.assignment(input.id), runId = a.attempts[0].runId;
    const cancellation = action(h, a, 'cancel');
    await localPiWait(() => h.runtime.store.getRun(runId).status === 'stopping'); release();
    assert.equal((await cancellation).status, 200);
    const done = await settled(h, input.id), receipt = localPiReceipt(h.runtime.store.snapshot(), runId);
    assert.equal(receipt.terminal.status, 'completed'); assert.equal(h.runtime.store.getRun(runId).status, 'cancelled');
    assert.equal(done.status, 'cancelled'); assert.equal(done.result, null);
    assert.throws(() => process.kill(receipt.spawn.pid, 0), { code: 'ESRCH' });
    const retained = await h.runtime.service.artifactHistory.read(done.attempts[0].sessionId, receipt.result.sha256, receipt.result.bytes);
    assert.match(retained.toString(), /Retained finding/);
    assert.notEqual((await action(h, done, 'retry')).status, 200); assert.equal(h.requests.length, 1);
    validateState(h.runtime.store.snapshot());
    const next = await h.create(); assert.equal((await settled(h, next.id)).status, 'resolved');
    assert.equal(h.requests.length, 2, 'the second process follows explicit new work after known close');
  } finally { release(); await h.close(); }
});
