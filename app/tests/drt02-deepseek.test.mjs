import assert from 'node:assert/strict';
import { fixture, MODEL, output } from './fixtures/deepseek-loopback.mjs';
import { test } from 'node:test';
import { boot, reopen } from './helpers.mjs';

async function configure(h, f) {
  assert.equal((await h.api('PUT', '/provider-credential', { connectionId: 'catalog-deepseek', apiKey: 'SYNTHETIC_DEEPSEEK_KEY' })).status, 200);
  const configured = await h.api('PUT', '/provider-config', { provider: 'deepseek', model: MODEL, api: 'openai-completions', baseUrl: f.baseUrl, reasoningEffort: 'high' });
  assert.equal(configured.status, 200, JSON.stringify(configured.json));
}
async function start(h, sessionId, commandId) {
  const made = await h.api('POST', `/sessions/${sessionId}/runs`, { input: `Synthetic task ${commandId}`, commandId });
  assert.equal(made.status, 200, JSON.stringify(made.json)); return made.json.run;
}
async function answer(h, sessionId, runId, decision) {
  await h.pollRun(runId, { until: status => status === 'waiting_user' });
  const events = (await h.api('GET', `/sessions/${sessionId}/events`)).json.events;
  const question = events.find(event => event.type === 'permission.open' && event.runId === runId);
  assert.ok(question);
  const payload = question.data;
  const answered = await h.api('POST', `/runs/${runId}/questions/${question.data.id}`, { decision, expectedToolCallId: payload.toolCallId, expectedContentSha256: payload.contentSha256 });
  assert.equal(answered.status, 200, JSON.stringify(answered.json));
}

test('DRT02 DeepSeek: actual SDK stream, Deny/Approve, reasoning replay and reopened history', async () => {
  const f = await fixture(), h = await boot(); let next;
  try {
    await configure(h, f);
    const session = await h.createSession({ permissionMode: 'ask' });
    const first = await start(h, session.id, 'plain');
    const firstDone = await h.pollRun(first.id);
    assert.equal(firstDone.status, 'completed');
    const denied = await start(h, session.id, 'deny');
    await answer(h, session.id, denied.id, 'deny');
    assert.equal((await h.pollRun(denied.id)).status, 'completed');
    assert.equal((await h.api('GET', `/sessions/${session.id}/workspace/file?path=out/deepseek.md`)).status, 404);
    const approved = await start(h, session.id, 'approve');
    await answer(h, session.id, approved.id, 'allow');
    const done = await h.pollRun(approved.id);
    assert.equal(done.status, 'completed'); assert.equal(done.artifacts.length, 1);
    assert.equal((await h.api('GET', `/sessions/${session.id}/workspace/file?path=out/deepseek.md`)).json.text, output);
    assert.equal(done.provider.model, MODEL); assert.equal(done.provider.reasoningEffort, 'high');
    assert.equal(done.provider.baseUrl, f.baseUrl); assert.equal(done.provider.connectionId, 'catalog-deepseek');
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    assert.equal(JSON.stringify(events).includes('protocol-r'), false, 'private protocol metadata is not public conversation trace');
    assert.ok(events.some(event => event.type === 'assistant.delta' && event.data.text.startsWith('Reply')));
    await h.runtime.close(); next = await reopen(h.dataDir);
    const resumed = await start(next, session.id, 'reopened');
    const until = Date.now() + 10000;
    while (next.runtime.store.getRun(resumed.id).status === 'running' && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(next.runtime.store.getRun(resumed.id).status, 'completed');
    assert.equal(next.runtime.store.getRun(resumed.id).hostSession.id, firstDone.hostSession.id);
    assert.equal(f.requests.length, 6);
    for (const [i, request] of f.requests.entries()) {
      assert.equal(request.path, '/v1/chat/completions');
      assert.equal(request.body.model, MODEL); assert.equal(request.body.thinking.type, 'enabled');
      assert.equal(request.body.reasoning_effort, 'high');
      const prior = request.body.messages.filter(message => message.role === 'assistant');
      assert.deepEqual(prior.map(message => message.reasoning_content), Array.from({ length: i }, (_, j) => `protocol-r${j + 1}`));
      for (const message of request.body.messages.filter(message => message.role === 'tool')) {
        assert.ok(prior.some(assistant => assistant.tool_calls?.some(call => call.id === message.tool_call_id)));
      }
    }
    assert.match(f.requests[2].body.messages.find(message => message.role === 'tool').content, /denied/i);
    assert.match(f.requests[4].body.messages.filter(message => message.role === 'tool').at(-1).content, /deepseek.md/);
  } finally { await (next?.runtime ?? h.runtime).close(); await f.close(); }
});

for (const mode of ['error', 'cancel', 'missing-metadata']) test(`DRT02 DeepSeek ${mode}: explicit terminal state and no fallback`, async () => {
  const f = await fixture({ mode }), h = await boot();
  try {
    await configure(h, f);
    const session = await h.createSession({ permissionMode: 'read_only' });
    const run = await start(h, session.id, mode);
    if (mode === 'cancel') { await f.firstRequest; await h.api('POST', `/runs/${run.id}/cancel`, {}); }
    const done = await h.pollRun(run.id);
    assert.equal(done.status, mode === 'cancel' ? 'cancelled' : 'failed');
    assert.equal(done.provider.model, MODEL);
    assert.equal(f.requests.length, mode === 'missing-metadata' ? 2 : 1);
    assert.equal(done.artifacts.length, 0);
    if (mode === 'missing-metadata') {
      assert.equal(f.requests[1].body.messages.find(message => message.role === 'assistant').reasoning_content, '', 'SDK supplies an empty field for absent metadata; this fixture rejects it explicitly');
    }
  } finally { await h.runtime.close(); await f.close(); }
});
