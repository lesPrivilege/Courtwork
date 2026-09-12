import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { boot, reopen, spawnWorker } from './helpers.mjs';
import { MCPManager } from '../runtime/mcp-manager.mjs';

async function effectFixture({ drop = false, gate } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-p02-effect-'));
  let effects = 0;
  let dispatched;
  const called = new Promise(resolve => { dispatched = resolve; });
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const q = JSON.parse(raw);
    if (q.id === undefined) { res.writeHead(202).end(); return; }
    let result;
    if (q.method === 'server/discover') result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {} } };
    else if (q.method === 'tools/list') result = { tools: [{ name: 'write_then_fail', inputSchema: { type: 'object', properties: {} } }], ttlMs: 0, cacheScope: 'private' };
    else if (q.method === 'tools/call') {
      await writeFile(path.join(dir, 'effect.txt'), String(++effects));
      dispatched();
      if (gate) await gate;
      if (drop) { res.destroy(); return; }
      result = { isError: true, content: [{ type: 'text', text: 'operation failed after write' }] };
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: q.id, result: { resultType: 'complete', ...result } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { called, dir, effects: () => effects, resource: { id: 'local:p02', kind: 'mcp_server', title: 'Synthetic effect fixture', content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: `http://127.0.0.1:${server.address().port}` }) },
    async close() { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await rm(dir, { recursive: true, force: true }); } };
}
async function bind(h, session, f) {
  const suffix = '?sessionId=' + session.id, scope = { type: 'session', id: session.id };
  const snapshot = async () => (await h.api('GET', '/runtime-control' + suffix)).json;
  assert.equal((await h.api('PUT', '/runtime-control' + suffix, { revision: (await snapshot()).revision, operation: 'put', resource: { ...f.resource, scope } })).status, 200);
  assert.equal((await h.api('POST', '/mcp/local%3Ap02/lifecycle' + suffix, { revision: (await snapshot()).revision, action: 'connect' })).status, 200);
  assert.equal((await h.api('PUT', '/runtime-control' + suffix, { revision: (await snapshot()).revision, operation: 'exposure', id: f.resource.id, scope, exposed: true })).status, 200);
  return (await snapshot()).resources.find(r => r.mcp);
}
for (const mode of ['reported', 'drop', 'receipt-failure', 'cancel', 'restart-inflight', 'orphan-cancel']) test(`P02 ${mode}: effect is unknown, fenced and preserved across restart`, async () => {
  let release;
  const gate = mode === 'cancel' ? new Promise(resolve => { release = resolve; }) : undefined;
  const f = await effectFixture({ drop: mode === 'drop', gate }), h = await boot();
  let next;
  try {
    const session = await h.createSession(), tool = await bind(h, session, f);
    if (mode === 'receipt-failure') {
      const original = h.runtime.store.updateRunWithEvent.bind(h.runtime.store);
      h.runtime.store.updateRunWithEvent = async (id, patch, event) => {
        if (event.type === 'run.notice' && event.data.code === 'mcp_effect_unknown') throw new Error('synthetic receipt store failure');
        return original(id, patch, event);
      };
    }
    const call = { name: tool.executionName, arguments: {} };
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'p02-' + mode, input: h.scriptInput([call, call]) });
    assert.equal(made.status, 200);
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' });
    const events = async () => (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const question = (await events()).find(e => e.type === 'permission.open');
    await h.api('POST', `/runs/${made.json.run.id}/questions/${question.data.id}`, { decision: 'allow' });
    await f.called;
    if (mode === 'cancel') {
      await h.api('POST', `/runs/${made.json.run.id}/cancel`, {});
      release();
    }
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'unknown');
    assert.equal(done.error.code, 'mcp_effect_unknown');
    assert.equal(done.admissionOpen, false);
    assert.equal(f.effects(), 1);
    assert.equal(await readFile(path.join(f.dir, 'effect.txt'), 'utf8'), '1');
    const log = await events();
    assert.equal(log.filter(e => e.type === 'permission.open').length, 1);
    const detail = log.find(e => e.type === 'run.status' && e.data.externalUnknown)?.data.externalUnknown;
    assert.ok(detail?.callId);
    assert.equal(detail.serverId, f.resource.id);
    assert.equal(detail.tool, 'write_then_fail');
    assert.equal(detail.failureKind, ['reported', 'receipt-failure', 'restart-inflight', 'orphan-cancel'].includes(mode) ? 'tool-reported-error' : 'result-unavailable');
    assert.equal(detail.configHash.length, 64);
    assert.equal(detail.bindingHash.length, 64);
    assert.equal(typeof detail.bindingRevision, 'number');
    assert.equal('arguments' in detail, false);
    if (mode === 'orphan-cancel') {
      await h.runtime.store.updateRunWithEvent(done.id, { status: 'running' }, { type: 'run.status', data: { status: 'running' } });
      assert.equal((await h.runtime.service.cancelRun(done.id)).run.error.code, 'mcp_effect_unknown');
    }
    await h.runtime.close();
    if (mode === 'restart-inflight') {
      // Reconstruct the persisted window after the effect receipt but before
      // terminal settlement. This tests startup recovery, not a SIGKILL trace.
      const statePath = path.join(h.dataDir, 'runtime-state.json');
      const state = JSON.parse(await readFile(statePath, 'utf8'));
      state.runs.find(r => r.id === done.id).status = 'running';
      await writeFile(statePath, JSON.stringify(state));
    }
    next = await reopen(h.dataDir);
    assert.equal(next.runtime.store.getRun(done.id).status, 'unknown');
    assert.equal(next.runtime.store.getRun(done.id).error.code, 'mcp_effect_unknown');
    const continued = await next.api('POST', `/sessions/${session.id}/runs`, { commandId: 'unsafe-continuation', input: 'Repeat the action', supersedes: done.id });
    assert.equal(continued.status, 409);
    assert.equal(continued.json.error.code, 'effect_unreconciled');
    assert.equal(f.effects(), 1);
  } finally { release?.(); await (next?.runtime ?? h.runtime).close(); await f.close(); }
});

test('P02 pre-dispatch refusal has no effect and no unknown receipt', async () => {
  const f = await effectFixture(), m = new MCPManager();
  let unknown = 0;
  try {
    await m.connect(f.resource);
    const tools = m.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: m.connections.get(f.resource.id).hash, name: 'write_then_fail' } }] }, async () => { unknown++; });
    const signal = AbortSignal.abort();
    await assert.rejects(tools[0].execute('never-dispatched', {}, signal), /before dispatch/);
    await m.disconnect(f.resource.id);
    await assert.rejects(tools[0].execute('not-connected', {}, undefined), /no longer connected/);
    assert.equal(unknown, 0); assert.equal(f.effects(), 0);
  } finally { await m.close(); await f.close(); }
});


test('P02 SIGKILL after remote effect before result leaves a durable unreconciled dispatch', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = await effectFixture({ gate }), h = await boot();
  let child, next;
  try {
    const session = await h.createSession();
    const tool = await bind(h, session, f);
    await h.runtime.close();
    child = spawnWorker({ dataDir: h.dataDir, body: `
      await api('PUT', '/provider-credential', { connectionId: 'catalog-fake-openai-loopback', apiKey: FAKE_CREDENTIAL_KEY });
      const sessionId = ${JSON.stringify(session.id)};
      const control = (await api('GET', '/runtime-control?sessionId=' + sessionId)).json;
      await api('POST', '/mcp/local%3Ap02/lifecycle?sessionId=' + sessionId, { revision: control.revision, action: 'connect' });
      const made = await api('POST', '/sessions/' + sessionId + '/runs', {
        commandId: 'crash-after-effect', input: ${JSON.stringify(h.scriptInput([{ name: tool.executionName, arguments: {} }]))}
      });
      emit({ runId: made.json.run.id });
      const waiting = await waitRun(made.json.run.id, run => run.status === 'waiting_user' || ['failed','completed','unknown','cancelled'].includes(run.status));
      if (waiting.status !== 'waiting_user') throw new Error('unexpected run state: ' + JSON.stringify(waiting));
      const events = (await api('GET', '/sessions/' + sessionId + '/events')).json.events;
      const question = events.find(e => e.type === 'permission.open');
      const answer = await api('POST', '/runs/' + made.json.run.id + '/questions/' + question.data.id, { decision: 'allow' });
      if (answer.status !== 200) throw new Error('permission failure: ' + JSON.stringify(answer));
      await new Promise(() => {});
    ` });
    const ready = await child.waitForLine(value => Boolean(value.runId));
    assert.ok(ready);
    await Promise.race([f.called, new Promise((_, reject) => {
      setTimeout(() => reject(new Error('remote dispatch timed out: ' + child.stdout + ' ' + child.stderr)), 10000).unref();
    })]);
    assert.equal(await readFile(path.join(f.dir, 'effect.txt'), 'utf8'), '1');
    await child.kill('SIGKILL'); release();
    next = await reopen(h.dataDir);
    const run = next.runtime.store.getRun(ready.runId);
    assert.equal(run.status, 'unknown');
    assert.equal(run.error.code, 'mcp_effect_unknown');
    const log = next.runtime.store.listEvents({ sessionId: session.id, runId: run.id });
    assert.equal(log.filter(e => e.type === 'runtime.mcp.dispatch').length, 1);
    assert.equal(log.filter(e => e.type === 'runtime.mcp.result').length, 0);
    assert.ok(log.find(e => e.type === 'run.status' && e.data.unsettledMcp?.length === 1));
    const continued = await next.api('POST', '/sessions/' + session.id + '/runs', { commandId: 'unsafe-after-crash', input: 'repeat', supersedes: run.id });
    assert.equal(continued.status, 409);
    assert.equal(continued.json.error.code, 'effect_unreconciled');
    assert.equal(f.effects(), 1);
  } finally { release?.(); await child?.kill(); await (next?.runtime ?? h.runtime).close(); await f.close(); }
});

test('P02 failed durable dispatch intent prevents the remote call', async () => {
  const f = await effectFixture(), m = new MCPManager();
  let unknown = 0;
  try {
    await m.connect(f.resource);
    const [tool] = m.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: m.connections.get(f.resource.id).hash, name: 'write_then_fail' } }] }, async () => { unknown++; }, undefined, async () => { throw new Error('intent unavailable'); });
    await assert.rejects(tool.execute('not-dispatched', {}, undefined), /intent unavailable/);
    assert.equal(f.effects(), 0); assert.equal(unknown, 0);
  } finally { await m.close(); await f.close(); }
});
