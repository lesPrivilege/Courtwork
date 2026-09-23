import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateState } from '../server/store.mjs';
import { localPiReceipt, localPiRunUnresolved } from '../runtime/local-pi-state.mjs';
import { localPiHost } from './fixtures/local-pi-host-harness.mjs';

async function crashed(stage = 'terminal') {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-local-pi-recovery-'));
  const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/local-pi-crash-host.mjs', import.meta.url)), dataDir, stage], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise(resolve => child.once('close', resolve));
  assert.equal(code, { result: 73, terminal: 74 }[stage], stderr);
  const state = JSON.parse(await readFile(path.join(dataDir, 'runtime-state.json'), 'utf8'));
  const assignment = state.subagents.assignments[0];
  return { dataDir, assignment, runId: assignment.attempts[0].runId };
}

const actionBody = (assignment, commandId = randomUUID()) => ({
  action: 'reconcile', expectedRevision: assignment.revision, commandId,
  reason: 'Publish the already retained completed findings.', expandedSources: [],
});

async function reopenCrash(stage = 'terminal') {
  const fixture = await crashed(stage);
  const h = await localPiHost({ dataDir: fixture.dataDir, parentId: fixture.assignment.parentSessionId });
  return { ...fixture, h, assignment: h.assignment(fixture.assignment.id) };
}

test('LP-R6 actual terminal crash reopens, publishes retained findings once, and keeps every unknown fence', async () => {
  let fixture = await reopenCrash();
  let { h, dataDir, runId } = fixture;
  try {
    const before = h.assignment(fixture.assignment.id);
    const receipt = localPiReceipt(h.runtime.store.snapshot(), runId);
    assert.equal(receipt.terminal.status, 'completed'); assert.ok(receipt.result);
    assert.equal(before.result, null); assert.equal(before.status, 'blocked');
    assert.equal(before.attempts[0].status, 'unknown'); assert.equal(h.runtime.store.getRun(runId).status, 'unknown');
    const historicalReason = before.reason;
    const commandId = randomUUID(), body = actionBody(before, commandId);
    const recovered = await h.api('POST', `/subagents/${before.id}/actions`, body);
    assert.equal(recovered.status, 200, JSON.stringify(recovered));
    const after = h.assignment(before.id);
    assert.equal(after.results.length, 1); assert.equal(after.result.revision, 1);
    assert.equal(after.status, 'blocked'); assert.equal(after.reason, historicalReason);
    assert.equal(after.attempts[0].status, 'unknown'); assert.equal(h.runtime.store.getRun(runId).status, 'unknown');
    assert.equal(localPiRunUnresolved(h.runtime.store.snapshot(), runId), true);
    assert.equal(after.sourceReads.some(read => read.actor === 'runtime'), false);
    const result = await h.api('GET', `/subagents/${after.id}/result?revision=1`);
    assert.equal(result.status, 200); assert.equal(result.json.text, 'Retained before publication.');
    assert.match(result.json.result.coverage, /provided; model reading and coverage unverified/);
    assert.match(result.json.result.unknown, /No independent acceptance/);

    const duplicate = await h.api('POST', `/subagents/${after.id}/actions`, body);
    assert.equal(duplicate.status, 200); assert.equal(h.assignment(after.id).results.length, 1);
    assert.equal(h.assignment(after.id).commands.filter(command => command.commandId === commandId).length, 1);
    const conflicting = await h.api('POST', `/subagents/${after.id}/actions`, { ...body, reason: 'different' });
    assert.equal(conflicting.status, 409); assert.equal(conflicting.json.error.code, 'spark_conflict');
    const stale = await h.api('POST', `/subagents/${after.id}/actions`, actionBody({ ...after, revision: before.revision }));
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, 'spark_stale');
    const retry = await h.api('POST', `/subagents/${after.id}/actions`, { ...actionBody(h.assignment(after.id)), action: 'retry' });
    assert.equal(retry.status, 409); assert.equal(retry.json.error.code, 'local_pi_unreconciled');
    assert.equal((await h.api('POST', `/sessions/${after.attempts[0].sessionId}/runs`, { commandId: randomUUID(), input: 'must remain fenced' })).status, 409);
    assert.equal((await h.api('DELETE', `/sessions/${after.attempts[0].sessionId}`)).status, 409);
    assert.equal((await h.api('DELETE', `/sessions/${after.parentSessionId}`)).status, 409);
    assert.equal(h.requests.length, 0, 'recovery made no provider request');
    assert.equal((await readFile(path.join(dataDir, 'provider-requests.log'), 'utf8')).trim().split('\n').length, 1);
    validateState(h.runtime.store.snapshot());

    await h.close({ remove: false }); h = null;
    h = await localPiHost({ dataDir, parentId: after.parentSessionId });
    const reopened = await h.api('GET', `/subagents/${after.id}/result`);
    assert.equal(reopened.status, 200); assert.equal(reopened.json.text, result.json.text);
    assert.equal(localPiRunUnresolved(h.runtime.store.snapshot(), runId), true);
    assert.equal(h.assignment(after.id).attempts[0].status, 'unknown'); assert.equal(h.runtime.store.getRun(runId).status, 'unknown');
    assert.equal(h.requests.length, 0); validateState(h.runtime.store.snapshot());
  } finally { if (h) await h.close(); else await rm(dataDir, { recursive: true, force: true }); }
});

test('LP-R6 missing terminal and missing retained bytes refuse without publication or replay', async t => {
  await t.test('result without terminal', async () => {
    const { h, dataDir, assignment } = await reopenCrash('result');
    try {
      const before = h.runtime.store.snapshot();
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(assignment));
      assert.equal(response.status, 409); assert.equal(response.json.error.code, 'local_pi_unreconciled');
      assert.deepEqual(h.runtime.store.snapshot(), before); assert.equal(h.requests.length, 0);
    } finally { await h.close(); }
  });
  await t.test('retained object unavailable', async () => {
    const { h, assignment } = await reopenCrash();
    try {
      const before = h.runtime.store.snapshot();
      h.runtime.service.artifactHistory.read = async () => { throw Object.assign(new Error('missing'), { code: 'history_unavailable' }); };
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(assignment));
      assert.equal(response.status, 400); assert.equal(response.json.error.code, 'local_pi_result');
      assert.deepEqual(h.runtime.store.snapshot(), before); assert.equal(h.requests.length, 0);
    } finally { await h.close(); }
  });
  await t.test('retained object bytes fail integrity', async () => {
    const { h, assignment } = await reopenCrash();
    try {
      const before = h.runtime.store.snapshot();
      h.runtime.service.artifactHistory.read = async () => Buffer.from('forged retained bytes');
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(assignment));
      assert.equal(response.status, 400); assert.equal(response.json.error.code, 'local_pi_result');
      assert.deepEqual(h.runtime.store.snapshot(), before); assert.equal(h.requests.length, 0);
    } finally { await h.close(); }
  });
});

test('LP-R6 cancellation, source changes, and publication-gap revocation preserve retained bytes and unknown state', async t => {
  await t.test('cancelled assignment', async () => {
    const { h, assignment, runId } = await reopenCrash();
    try {
      const cancelled = await h.api('POST', `/subagents/${assignment.id}/actions`, { ...actionBody(assignment), action: 'cancel' });
      assert.equal(cancelled.status, 200);
      const before = h.runtime.store.snapshot(), current = h.assignment(assignment.id);
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(current));
      assert.equal(response.status, 409); assert.equal(response.json.error.code, 'local_pi_unreconciled');
      assert.deepEqual(h.runtime.store.snapshot(), before); assert.equal(localPiRunUnresolved(before, runId), true);
    } finally { await h.close(); }
  });
  await t.test('source revision changed', async () => {
    const { h, assignment } = await reopenCrash();
    try {
      const source = assignment.sources[0];
      const added = await h.api('POST', `/sessions/${assignment.parentSessionId}/materials`, { name: path.basename(source.path), text: 'new revision', commandId: randomUUID() });
      assert.equal(added.status, 200);
      const before = h.runtime.store.snapshot();
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(h.assignment(assignment.id)));
      assert.equal(response.status, 400); assert.equal(response.json.error.code, 'local_pi_source_changed');
      assert.deepEqual(h.runtime.store.snapshot(), before);
    } finally { await h.close(); }
  });
  await t.test('policy revoked after payload read', async () => {
    const { h, assignment } = await reopenCrash();
    try {
      const history = h.runtime.service.artifactHistory, read = history.read.bind(history); let revoked = false;
      history.read = async (...args) => {
        const value = await read(...args);
        if (!revoked) {
          revoked = true;
          const control = (await h.api('GET', `/runtime-control?sessionId=${assignment.parentSessionId}`)).json;
          await h.runtime.service.control.change({ revision: control.revision, operation: 'policy', scope: { type: 'session', id: assignment.parentSessionId }, rules: [{ action: 'ws_read', resource: '*', effect: 'deny' }] }, control.resources);
        }
        return value;
      };
      const response = await h.api('POST', `/subagents/${assignment.id}/actions`, actionBody(assignment));
      assert.equal(response.status, 409); assert.equal(response.json.error.code, 'spark_source_policy');
      assert.equal(h.assignment(assignment.id).result, null); assert.equal(h.assignment(assignment.id).attempts[0].status, 'unknown');
      assert.equal(h.requests.length, 0);
    } finally { await h.close(); }
  });
});

test('LP-R6 cross-attempt retained receipt remains invalid state', async () => {
  const fixture = await crashed();
  try {
    const state = JSON.parse(await readFile(path.join(fixture.dataDir, 'runtime-state.json'), 'utf8'));
    const result = state.events.find(event => event.type === 'local_pi.result');
    result.data.attempt += 1;
    assert.throws(() => validateState(state), /attempt\/dispatch association/);
  } finally { await rm(fixture.dataDir, { recursive: true, force: true }); }
});
