import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateState } from '../server/store.mjs';
import { localPiRunUnresolved } from '../runtime/local-pi-state.mjs';
import { localPiHost, localPiWait } from './fixtures/local-pi-host-harness.mjs';

async function refusedWithoutMutation(h, sessionId) {
  for (const owner of ['HTTP', 'Store']) {
    const memory = h.runtime.store.snapshot();
    const disk = await readFile(path.join(h.dataDir, 'runtime-state.json'));
    if (owner === 'HTTP') {
      const response = await h.api('DELETE', `/sessions/${sessionId}`);
      assert.equal(response.status, 409, JSON.stringify(response));
      assert.equal(response.json.error.code, 'spark_session_referenced');
    } else {
      await assert.rejects(h.runtime.store.deleteSession(sessionId), { code: 'spark_session_referenced', status: 409 });
    }
    assert.deepEqual(h.runtime.store.snapshot(), memory, `${owner} must preserve memory`);
    assert.deepEqual(await readFile(path.join(h.dataDir, 'runtime-state.json')), disk, `${owner} must preserve persisted bytes`);
    validateState(h.runtime.store.snapshot());
  }
}

async function refuseUnknownRetry(h, assignmentId, runId) {
  let spawns = 0;
  const record = h.runtime.store.recordLocalPiEvent.bind(h.runtime.store);
  h.runtime.store.recordLocalPiEvent = (...args) => { if (args[1] === 'local_pi.spawn') spawns++; return record(...args); };
  for (const action of ['reconcile', 'retry']) {
    const a = h.assignment(assignmentId);
    const before = h.runtime.store.snapshot(), disk = await readFile(path.join(h.dataDir, 'runtime-state.json'));
    const response = await h.api('POST', `/subagents/${a.id}/actions`, {
      action, expectedRevision: a.revision, commandId: randomUUID(), reason: 'LP-R5 fixture', expandedSources: [],
    });
    assert.equal(response.status, 409); assert.equal(response.json.error.code, 'local_pi_unreconciled');
    assert.deepEqual(h.runtime.store.snapshot(), before);
    assert.deepEqual(await readFile(path.join(h.dataDir, 'runtime-state.json')), disk);
  }
  await h.runtime.service.subagents.pump();
  assert.equal(localPiRunUnresolved(h.runtime.store.snapshot(), runId), true);
  assert.equal(h.assignment(assignmentId).attempts.length, 1);
  assert.equal(spawns, 0); assert.equal(h.requests.length, 0);
}

test('unknown local child and its parent cannot be deleted through HTTP or Store; bytes and recovery fence survive reopen', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-local-pi-delete-'));
  let h;
  try {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/local-pi-crash-host.mjs', import.meta.url)), dataDir, 'dispatch'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
    assert.equal(await new Promise(resolve => child.once('close', resolve)), 71, stderr);
    const crashed = JSON.parse(await readFile(path.join(dataDir, 'runtime-state.json'), 'utf8'));
    const a = crashed.subagents.assignments[0], attempt = a.attempts[0];
    h = await localPiHost({ dataDir, parentId: a.parentSessionId });
    assert.equal(h.runtime.store.getRun(attempt.runId).status, 'unknown');
    assert.equal(localPiRunUnresolved(h.runtime.store.snapshot(), attempt.runId), true);
    await refusedWithoutMutation(h, attempt.sessionId);
    await refusedWithoutMutation(h, a.parentSessionId);
    await refuseUnknownRetry(h, a.id, attempt.runId);
    await h.close({ remove: false }); h = null;
    h = await localPiHost({ dataDir, parentId: a.parentSessionId });
    validateState(h.runtime.store.snapshot());
    await refuseUnknownRetry(h, a.id, attempt.runId);
    // The fence protects references, not every unrelated Chat in the Host.
    const ordinary = (await h.api('POST', '/sessions', { title: 'Unreferenced' })).json.session;
    assert.equal((await h.api('DELETE', `/sessions/${ordinary.id}`)).status, 200);
    assert.equal((await h.api('GET', `/sessions/${ordinary.id}`)).status, 404);
    assert.equal(localPiRunUnresolved(h.runtime.store.snapshot(), attempt.runId), true);
    validateState(h.runtime.store.snapshot());
  } finally { if (h) await h.close(); else await rm(dataDir, { recursive: true, force: true }); }
});

test('completed archived local findings retain child, parent and source/result references across rejected deletion and reopen', async () => {
  let h = await localPiHost(); const dataDir = h.dataDir;
  try {
    const source = await h.source(), input = await h.create([source]);
    let a = await localPiWait(() => { const value = h.assignment(input.id); return value?.result ? value : null; });
    const result = await h.api('GET', `/subagents/${a.id}/result`);
    assert.equal(result.status, 200); assert.equal(a.attempts[0].status, 'completed');
    const archived = await h.api('POST', `/subagents/${a.id}/actions`, { action: 'archive', expectedRevision: a.revision, commandId: randomUUID(), reason: 'Retain historical findings.', expandedSources: [] });
    assert.equal(archived.status, 200); a = h.assignment(a.id); assert.equal(a.archived, true);
    await refusedWithoutMutation(h, a.attempts[0].sessionId);
    await refusedWithoutMutation(h, a.parentSessionId);
    assert.equal(h.requests.length, 1);
    await h.close({ remove: false }); h = null;
    h = await localPiHost({ dataDir, parentId: a.parentSessionId });
    validateState(h.runtime.store.snapshot());
    const retained = await h.api('GET', `/subagents/${a.id}/result`);
    assert.equal(retained.status, 200); assert.equal(retained.json.text, result.json.text);
    assert.deepEqual(retained.json.result, result.json.result);
    assert.equal(h.requests.length, 0);
    await refusedWithoutMutation(h, a.attempts[0].sessionId);
  } finally { if (h) await h.close(); else await rm(dataDir, { recursive: true, force: true }); }
});

test('Spark references prevent deletion before any local process records exist; an ordinary Store deletion still works', async () => {
  const h = await localPiHost();
  try {
    await h.runtime.service.subagents.create({ id: randomUUID(), parentSessionId: h.parent.id, brief: 'Queued reference only.', sources: [] });
    assert.equal(h.runtime.store.listRuns().length, 0);
    await refusedWithoutMutation(h, h.parent.id);
    const ordinary = (await h.api('POST', '/sessions', { title: 'Ordinary direct Store deletion' })).json.session;
    assert.equal((await h.runtime.store.deleteSession(ordinary.id)).deleted, true);
    assert.equal(h.runtime.store.getSession(ordinary.id), null);
    assert.equal(h.requests.length, 0); validateState(h.runtime.store.snapshot());
  } finally { await h.close(); }
});

test('a Spark reference queued after the Service snapshot is still protected by the atomic Store deletion guard', async () => {
  const h = await localPiHost(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    const held = h.runtime.store._mutate(async () => { await gate; });
    const creating = h.runtime.service.subagents.create({ id: randomUUID(), parentSessionId: h.parent.id, brief: 'Queued ahead of deletion.', sources: [] });
    const remove = h.runtime.store.deleteSession.bind(h.runtime.store); let deletionEntered = false;
    h.runtime.store.deleteSession = sessionId => {
      assert.equal(h.runtime.store.snapshot().subagents.assignments.length, 0, 'the public precheck has not seen the queued reference');
      const result = remove(sessionId); deletionEntered = true; return result;
    };
    const deleting = h.api('DELETE', `/sessions/${h.parent.id}`);
    await localPiWait(() => deletionEntered); release(); await held;
    await creating;
    const memory = h.runtime.store.snapshot(), disk = await readFile(path.join(h.dataDir, 'runtime-state.json'));
    const response = await deleting;
    assert.equal(response.status, 409); assert.equal(response.json.error.code, 'spark_session_referenced');
    assert.deepEqual(h.runtime.store.snapshot(), memory);
    assert.deepEqual(await readFile(path.join(h.dataDir, 'runtime-state.json')), disk);
    assert.equal(h.requests.length, 0); validateState(h.runtime.store.snapshot());
  } finally { release(); await h.close(); }
});

test('an ordinary unreferenced Chat with a completed non-child Run remains deletable', async () => {
  const h = await localPiHost();
  try {
    const started = await h.api('POST', `/sessions/${h.parent.id}/runs`, { input: 'Ordinary synthetic reply.', commandId: randomUUID() });
    assert.equal(started.status, 200);
    const run = await localPiWait(() => { const r = h.runtime.store.getRun(started.json.run.id); return r?.status === 'completed' ? r : null; });
    assert.notEqual(run.adapterId, 'pi-local-print');
    const response = await h.api('DELETE', `/sessions/${h.parent.id}`);
    assert.equal(response.status, 200); assert.equal(response.json.workspaceRetained, true);
    assert.equal(h.runtime.store.getRun(run.id), null);
    assert.equal(h.runtime.store.snapshot().events.some(e => e.runId === run.id), false);
    validateState(h.runtime.store.snapshot());
  } finally { await h.close(); }
});
