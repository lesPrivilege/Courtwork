import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { boot } from './helpers.mjs';

async function pending(h, commandId = 'permission-cas') {
  const session = await h.createSession({ permissionMode: 'ask' });
  const response = await h.api('POST', `/sessions/${session.id}/runs`, {
    input: h.scriptInput([{ name: 'ws_write', arguments: { path: 'out/cas.txt', text: 'reviewed bytes' } }]), commandId,
  });
  assert.equal(response.status, 200);
  const runId = response.json.run.id;
  assert.equal((await h.pollRun(runId, { until: status => status === 'waiting_user' || ['completed','failed','cancelled','unknown'].includes(status) })).status, 'waiting_user');
  const question = h.runtime.store.snapshot().questions.find(q => q.runId === runId && q.status === 'pending');
  assert.ok(question);
  return { runId, session, question, route: `/runs/${runId}/questions/${question.id}`, expected: { expectedToolCallId: question.payload.toolCallId, expectedContentSha256: question.payload.contentSha256 } };
}

test('permission CAS mismatches leave pending question, waiter, events and persisted bytes untouched', async () => {
  const h = await boot();
  try {
    const p = await pending(h);
    const before = h.runtime.store.snapshot();
    const bytes = await readFile(path.join(h.dataDir, 'runtime-state.json'));
    for (const body of [
      { decision: 'allow', ...p.expected, expectedContentSha256: '0'.repeat(64) },
      { decision: 'deny', ...p.expected, expectedToolCallId: 'another-tool-call' },
    ]) {
      const rejected = await h.api('POST', p.route, body);
      assert.equal(rejected.status, 409);
      assert.equal(rejected.json.error.code, 'version_mismatch');
      assert.deepEqual(h.runtime.store.snapshot(), before);
      assert.deepEqual(await readFile(path.join(h.dataDir, 'runtime-state.json')), bytes);
    }
    assert.equal((await h.api('POST', p.route, { decision: 'allow', ...p.expected })).status, 200);
    const finished = await h.pollRun(p.runId);
    assert.equal(finished.status, 'completed');
    assert.equal(finished.artifacts[0].sha256, p.expected.expectedContentSha256);
    assert.equal(h.runtime.store.listEvents({ sessionId: p.session.id }).filter(e => e.type === 'permission.resolved' && e.data.id === p.question.id).length, 1);
  } finally { await h.runtime.close(); }
});

test('each expectation is independently optional and malformed expectations are 400', async () => {
  const h = await boot();
  try {
    for (const field of ['expectedContentSha256', 'expectedToolCallId']) {
      const p = await pending(h, field);
      for (const value of [null, 1, '', ...(field === 'expectedContentSha256' ? ['A'.repeat(64),'0'.repeat(63)] : ['x'.repeat(201)])]) {
        const result = await h.api('POST', p.route, { decision: 'deny', [field]: value });
        assert.equal(result.status, 400);
        assert.equal(result.json.error.code, 'invalid_input');
      }
      assert.equal((await h.api('POST', p.route, { decision: 'deny', [field]: p.expected[field] })).status, 200);
      assert.equal((await h.pollRun(p.runId)).artifacts.length, 0);
    }
  } finally { await h.runtime.close(); }
});

test('CAS comparison happens inside the mutation queue after a stale service read', async () => {
  const h = await boot();
  let release;
  try {
    const p = await pending(h);
    let entered;
    const ready = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    // Synthetic future-version change only: production currently never edits a
    // pending payload. Pause publication to test the actual queued CAS boundary.
    const mutation = h.runtime.store._mutate(async state => {
      state.questions.find(q => q.id === p.question.id).payload.toolCallId = 'new-generation-call';
      entered();
      await gate;
    });
    await ready;
    let queued;
    const queuedPromise = new Promise(resolve => { queued = resolve; });
    const original = h.runtime.store.resolveQuestion.bind(h.runtime.store);
    h.runtime.store.resolveQuestion = args => { const result = original(args); queued(); return result; };
    const answering = h.api('POST', p.route, { decision: 'allow', ...p.expected });
    await queuedPromise;
    release();
    await mutation;
    const rejected = await answering;
    assert.equal(rejected.status, 409);
    assert.equal(rejected.json.error.code, 'version_mismatch');
    assert.equal(h.runtime.store.getQuestion(p.question.id).status, 'pending');
    assert.equal(h.runtime.store.getRun(p.runId).status, 'waiting_user');
    assert.equal(h.runtime.store.listEvents({ sessionId: p.session.id }).some(e => e.type === 'permission.resolved'), false);
    assert.equal((await h.api('POST', `/runs/${p.runId}/cancel`, {})).status, 200);
    assert.deepEqual((await h.pollRun(p.runId)).artifacts, []);
  } finally { release?.(); await h.runtime.close(); }
});

test('two matching concurrent answers still resolve at most once', async () => {
  const h = await boot();
  try {
    const p = await pending(h);
    const results = await Promise.all(['allow','deny'].map(decision => h.api('POST', p.route, { decision, ...p.expected })));
    assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
    assert.equal(results.find(r => r.status === 409).json.error.code, 'question_unavailable');
    await h.pollRun(p.runId);
    assert.equal(h.runtime.store.listEvents({ sessionId: p.session.id }).filter(e => e.type === 'permission.resolved' && e.data.id === p.question.id).length, 1);
  } finally { await h.runtime.close(); }
});

test('ask_user does not accept permission expectations', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { input: h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'Choose' } }]), commandId: 'cas-ask' });
    const runId = made.json.run.id;
    await h.pollRun(runId, { until: status => status === 'waiting_user' });
    const question = h.runtime.store.snapshot().questions.find(q => q.runId === runId);
    assert.equal((await h.api('POST', `/runs/${runId}/questions/${question.id}`, { answer: 'A', expectedContentSha256: '0'.repeat(64) })).status, 400);
    assert.equal(h.runtime.store.getQuestion(question.id).status, 'pending');
    assert.equal((await h.api('POST', `/runs/${runId}/questions/${question.id}`, { answer: 'A' })).status, 200);
    await h.pollRun(runId);
  } finally { await h.runtime.close(); }
});
