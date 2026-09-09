import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { boot, reopen } from './helpers.mjs';
import { evaluatePolicy, compileControlContext } from '../runtime/control-plane.mjs';
import { governTools } from '../runtime/control-tools.mjs';

async function control(h, session) {
  const suffix = session ? '?sessionId=' + session.id : '';
  const get = async () => (await h.api('GET', '/runtime-control' + suffix)).json;
  const change = async body => h.api('PUT', '/runtime-control' + suffix, { revision: (await get()).revision, ...body });
  return { get, change, scope: session ? { type: 'session', id: session.id } : { type: 'user', id: 'local' } };
}

test('control: scope provenance, reset, CAS, and cross-session isolation survive restart', async () => {
  const h = await boot();
  const a = await h.createSession(); const b = await h.createSession();
  const c = await control(h, a); const d = await control(h, b);
  const initial = await c.get();
  assert.equal((await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: { type: 'workspace', id: h.projectId }, exposed: false })).status, 200);
  const stale = await h.api('PUT', '/runtime-control?sessionId=' + a.id, { revision: initial.revision, operation: 'exposure', id: 'tool:ws_read', scope: c.scope, exposed: true });
  assert.equal(stale.status, 409);
  assert.equal((await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: c.scope, exposed: true })).status, 200);
  assert.equal((await c.get()).resources.find(r => r.id === 'tool:ws_read').exposed, true);
  assert.equal((await d.get()).resources.find(r => r.id === 'tool:ws_read').exposed, false);
  assert.equal((await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: d.scope, exposed: true })).status, 400);
  await h.runtime.close();
  const resumed = await reopen(h.dataDir);
  try {
    const rc = await control(resumed, a);
    const resource = (await rc.get()).resources.find(r => r.id === 'tool:ws_read');
    assert.equal(resource.provenance.length, 3);
    assert.equal(resource.exposed, true);
    await rc.change({ operation: 'exposure', id: resource.id, scope: rc.scope, exposed: null });
    assert.equal((await rc.get()).resources.find(r => r.id === resource.id).exposed, false);
  } finally { await resumed.runtime.close(); }
});

test('control: active Run freezes config; retry preserves its original runtime binding', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    const input = h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'wait' } }]);
    const first = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'bound', input });
    await h.pollRun(first.json.run.id, { until: s => s === 'waiting_user' });
    assert.equal((await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: c.scope, exposed: false })).status, 409);
    await h.api('POST', `/runs/${first.json.run.id}/cancel`, {});
    await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: c.scope, exposed: false });
    const retried = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'bound', input });
    assert.equal(retried.json.run.id, first.json.run.id);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    assert.equal(events.filter(e => e.type === 'runtime.bound').length, 1);
    assert.equal(events.find(e => e.type === 'runtime.bound').data.revision, 0);
  } finally { await h.runtime.close(); }
});

test('policy: last match within scope, outer ceilings and literal regex characters', () => {
  const layers = [{ scope: 'workspace', rules: [{ action: 'ws_*', resource: '*', effect: 'allow' }, { action: 'ws_write', resource: 'out/[x].md', effect: 'deny' }] }, { scope: 'session', rules: [{ action: '*', resource: '*', effect: 'allow' }] }];
  assert.equal(evaluatePolicy(layers, 'ws_write', 'out/[x].md').effect, 'deny');
  assert.equal(evaluatePolicy(layers, 'ws_write', 'out/x.md').effect, 'allow');
  assert.equal(evaluatePolicy(layers, 'ws_write', 'out/x.md', 'ask').effect, 'ask');
  assert.equal(evaluatePolicy(layers, 'ws_write', 'out/x.md', 'deny').effect, 'deny');
  const allow = { scope: { type: 'user', id: 'local' }, rules: [{ action: 'mcp.*.read', resource: '*', effect: 'allow' }] };
  const profile = { scope: { type: 'agent', id: 'review' }, rules: [{ action: '*', resource: '*', effect: 'allow' }] };
  assert.equal(evaluatePolicy([profile], 'mcp.local:server.read', '*', 'allow', 'ask').effect, 'ask', 'profile cannot grant beyond the host default');
  assert.equal(evaluatePolicy([allow, profile], 'mcp.local:server.read', '*', 'allow', 'ask').effect, 'allow', 'an explicit host policy can authorize a specific MCP action');
});

test('control APIs: source content remains pinned after replacement; templates are human-invoked drafts', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const other = await h.createSession(); const c = await control(h, session);
    const resource = { id: 'local:conventions', kind: 'instruction', title: 'Conventions', scope: c.scope, content: 'Use simple sentences.' };
    await c.change({ operation: 'put', resource });
    await c.change({ operation: 'put', resource: { ...resource, id: 'local:prompt', kind: 'prompt_template', content: 'Please review the current text.' } });
    const binding = h.runtime.service.control.bind(await c.get());
    assert.ok(!compileControlContext(binding).includes('local:prompt'), 'a user-invoked template is not a model-discoverable capability');
    const invoked = await h.api('POST', '/runtime-resources/local%3Aprompt/invoke?sessionId=' + session.id, {});
    assert.equal(invoked.json.disposition, 'draft-only');
    assert.equal(h.runtime.store.listRuns().length, 0);
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'archive-context', input: 'hello' });
    await h.pollRun(made.json.run.id);
    await c.change({ operation: 'put', resource: { ...resource, content: 'New instruction.' } });
    const recorded = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(recorded.json.binding.content.find(r => r.id === resource.id).content, 'Use simple sentences.');
    assert.equal((await h.api('GET', `/runtime-context?sessionId=${other.id}&runId=${made.json.run.id}`)).status, 404);
    assert.equal((await h.api('GET', '/runtime-resources?kind=unknown')).status, 400);
    const denied = await c.change({ operation: 'exposure', id: 'tool:ws_read', scope: c.scope, exposed: false });
    assert.equal(denied.status, 200);
    const evaluated = await h.api('POST', '/runtime-permissions/evaluate?sessionId=' + session.id, { resourceId: 'tool:ws_read', resource: 'materials/input.txt' });
    assert.equal(evaluated.json.effect, 'deny'); assert.equal(evaluated.json.advisory, true);
  } finally { await h.runtime.close(); }
});

test('policy: path denial reaches the executor; exposed write does not imply allowed write', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    await c.change({ operation: 'policy', scope: c.scope, rules: [{ action: 'ws_write', resource: 'out/private*', effect: 'deny' }] });
    const row = (await c.get()).resources.find(r => r.id === 'tool:ws_write');
    assert.equal(row.exposed, true); assert.equal(row.permission.resourceSpecific, true);
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'denial', input: h.scriptInput([{ name: 'ws_write', arguments: { path: 'out/private.md', text: 'forbidden' } }, { name: 'ws_write', arguments: { path: 'out/public.md', text: 'ok' } }]) });
    const done = await h.pollRun(created.json.run.id);
    assert.deepEqual(done.artifacts.map(a => a.path), ['out/public.md']);
  } finally { await h.runtime.close(); }
});

test('policy: domain tools use the same execution gate, including exact arguments across approval', async () => {
  let observed = null;
  const args = { value: 'authorized' };
  const tools = governTools([{ name: 'se_action', execute: async (_id, value) => { observed = value; } }], {
    binding: { resources: [{ id: 'tool:se_action', exposed: true }], policies: [{ scope: 'user', rules: [{ action: 'se_*', resource: '*', effect: 'ask' }] }] },
    permissionMode: 'draft', isOpen: () => true,
    requestPermission: async () => { args.value = 'swapped'; return 'allow'; },
  });
  await tools[0].execute('call', args);
  assert.equal(observed.value, 'authorized');
});

test('context: skill metadata is progressive, installed content grants no plugin/tool authority', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    const content = '---\nname: careful-review\ndescription: Review text carefully\nallowed-tools: Bash\n---\nPRIVATE_SKILL_BODY';
    assert.equal((await c.change({ operation: 'put', resource: { id: 'local:review', kind: 'skill', title: 'Review', scope: c.scope, content } })).status, 200);
    const snapshot = await c.get();
    const binding = h.runtime.service.control.bind(snapshot);
    assert.ok(!compileControlContext(binding).includes('PRIVATE_SKILL_BODY'));
    assert.ok(!snapshot.resources.some(r => r.id === 'tool:Bash'));
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'load', input: h.scriptInput([{ name: 'runtime_load', arguments: { id: 'local:review' } }]) });
    await h.pollRun(created.json.run.id);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    assert.ok(events.some(e => e.type === 'runtime.context.loaded' && e.data.id === 'local:review'));
    const other = await h.createSession();
    assert.equal((await h.api('GET', '/runtime-resources/local%3Areview?sessionId=' + other.id)).status, 404);
    const otherControl = await control(h, other);
    assert.equal((await otherControl.change({ operation: 'remove', id: 'local:review' })).status, 400);
    assert.equal((await c.change({ operation: 'put', resource: { id: 'local:bad', kind: 'skill', title: 'Bad', scope: c.scope, content: 'not a skill' } })).status, 400);
    assert.equal((await c.change({ operation: 'put', resource: { id: 'local:code', kind: 'plugin', title: 'Code', scope: c.scope, content: 'execute me' } })).status, 400);
  } finally { await h.runtime.close(); }
});

test('composition: versioned profile restricts resources, never raises host permission, and missing requirements block admission', async () => {
  const h = await boot();
  try {
    const session = await h.createSession({ permissionMode: 'read_only' }); const c = await control(h, session);
    const resource = { id: 'local:expert', kind: 'agent_profile', title: 'Review profile', scope: c.scope, content: JSON.stringify({ schemaVersion: 1, version: '1.0', resourceIds: ['tool:ws_read', 'tool:ws_write'], rules: [{ action: '*', resource: '*', effect: 'allow' }], uiSlots: ['work.surface'] }) };
    assert.equal((await c.change({ operation: 'put', resource })).status, 200);
    assert.equal((await c.change({ operation: 'profile', scope: c.scope, id: resource.id })).status, 200);
    const snapshot = await c.get();
    assert.equal(snapshot.resources.find(r => r.id === 'tool:ws_write').permission.effect, 'deny');
    assert.equal(snapshot.resources.find(r => r.id === 'tool:ws_grep').exposed, false);
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'profile', input: h.scriptInput([{ name: 'ws_write', arguments: { path: 'out/no.md', text: 'no' } }]) });
    assert.equal((await h.pollRun(made.json.run.id)).artifacts.length, 0);
    await c.change({ operation: 'remove', id: resource.id });
    assert.equal((await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'missing-profile', input: 'hello' })).status, 409);
    await c.change({ operation: 'profile', scope: c.scope, id: 'agent:general' });
    assert.equal((await c.get()).composition.status, 'compatible');
  } finally { await h.runtime.close(); }
});

test('control config: corrupt or future version fails closed without overwriting the file', async () => {
  const h = await boot();
  await h.runtime.close();
  const file = path.join(h.dataDir, 'runtime-control.json');
  const input = JSON.stringify({ version: 9000 });
  await writeFile(file, input);
  await assert.rejects(() => reopen(h.dataDir));
  assert.equal(await readFile(file, 'utf8'), input);
});

test('compatibility: valid schema 3 upgrades with exact backup and schema 6 fence', async () => {
  const h = await boot();
  const session = await h.createSession();
  await h.runtime.close();
  const file = path.join(h.dataDir, 'runtime-state.json');
  const old = JSON.parse(await readFile(file, 'utf8')); old.schemaVersion = 3; delete old.asyncTasks; old.sessions.forEach(session => delete session.scope);
  const original = JSON.stringify(old);
  await writeFile(file, original);
  const next = await reopen(h.dataDir);
  try {
    const state = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(state.schemaVersion, 6);
    assert.equal(next.runtime.store.getSession(session.id).id, session.id);
    const backups = (await readdir(h.dataDir)).filter(name => name.startsWith('runtime-state.schema3.'));
    assert.equal(backups.length, 1);
    assert.equal(await readFile(path.join(h.dataDir, backups[0]), 'utf8'), original);
    // The old validator's first gate was exact equality with schemaVersion 3.
    assert.notEqual(state.schemaVersion, 3);
  } finally { await next.runtime.close(); }
});

async function mcpFixture({ legacy = false, dropCall = false, rpcError = false } = {}) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw); calls.push(request);
    if (request.id === undefined) { res.writeHead(202); res.end(); return; }
    const modern = !legacy;
    let result;
    if (request.method === 'server/discover' && modern) result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {}, resources: {}, prompts: {} } };
    else if (request.method === 'initialize' && legacy) result = { protocolVersion: '2025-11-25', capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: 'fixture', version: '1' } };
    else if (request.method === 'tools/list') result = { tools: [{ name: 'echo', description: 'Echo fixture text', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] };
    else if (request.method === 'resources/list') result = { resources: [{ uri: 'fixture://reference', name: 'fixture reference' }] };
    else if (request.method === 'prompts/list') result = { prompts: [{ name: 'review', description: 'Review prompt' }] };
    else if (request.method === 'tools/call') {
      if (dropCall) { res.destroy(); return; }
      if (rpcError) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: 'effect uncertain' } })); return; }
      result = { content: [{ type: 'text', text: request.params.arguments.text }] };
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(result ? { jsonrpc: '2.0', id: request.id, result: { ...(modern ? { resultType: 'complete', ...(request.method.endsWith('/list') ? { ttlMs: 0, cacheScope: 'private' } : {}) } : {}), ...result } } : { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'unsupported' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { calls, url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

for (const legacy of [false, true]) test(`MCP ${legacy ? 'legacy' : 'modern'}: discovery is separate from exposure and execution consent`, async () => {
  const fixture = await mcpFixture({ legacy }); const h = await boot();
  try {
    const session = await h.createSession(); const other = await h.createSession(); const c = await control(h, session);
    await c.change({ operation: 'put', resource: { id: 'local:mcp', kind: 'mcp_server', title: 'Fixture MCP', scope: { type: 'user', id: 'local' }, content: JSON.stringify({ transport: 'streamable-http', protocol: legacy ? 'legacy-2025' : '2026-07-28', url: fixture.url }) } });
    const connected = await h.api('POST', '/mcp/local%3Amcp/lifecycle?sessionId=' + session.id, { revision: (await c.get()).revision, action: 'connect' });
    assert.equal(connected.status, 200, JSON.stringify(connected.json));
    let snapshot = await c.get();
    const mcp = snapshot.resources.find(r => r.id === 'local:mcp');
    assert.equal(mcp.running, true); assert.equal(mcp.exposed, false);
    assert.equal(mcp.capabilities.resources, 1); assert.equal(mcp.capabilities.prompts, 1);
    const gated = snapshot.resources.find(r => r.mcp);
    assert.equal(gated.exposed, false);
    assert.deepEqual(gated.provenance.at(-1), { scope: mcp.scope, value: false, reason: 'parent not exposed', parentId: mcp.id });
    // A child override cannot defeat or hide the parent gate.
    await c.change({ operation: 'exposure', id: gated.id, scope: c.scope, exposed: true });
    const overridden = (await c.get()).resources.find(r => r.id === gated.id);
    assert.equal(overridden.exposed, false);
    assert.equal(overridden.provenance.at(-1).value, overridden.exposed);
    await c.change({ operation: 'exposure', id: 'local:mcp', scope: c.scope, exposed: true });
    snapshot = await c.get();
    const tool = snapshot.resources.find(r => r.mcp);
    assert.equal(tool.exposed, true); assert.equal(tool.permission.effect, 'ask');
    assert.equal((await (await control(h, other)).get()).resources.find(r => r.mcp).exposed, false);
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'mcp-call', input: h.scriptInput([{ name: tool.executionName, arguments: { text: 'hello MCP' } }]) });
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' || s === 'failed' || s === 'completed' });
    assert.equal(fixture.calls.filter(c => c.method === 'tools/call').length, 0);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const question = events.find(e => e.type === 'permission.open');
    assert.ok(question, JSON.stringify(events));
    await h.api('POST', `/runs/${made.json.run.id}/questions/${question.data.id}`, { decision: 'allow' });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'completed');
    assert.equal(fixture.calls.filter(c => c.method === 'tools/call').length, 1);
    if (!legacy) {
      assert.ok(fixture.calls.every(c => c.method !== 'initialize'));
      assert.equal(fixture.calls.find(c => c.method === 'tools/call').params._meta['io.modelcontextprotocol/protocolVersion'], '2026-07-28');
    }
    await h.api('POST', '/mcp/local%3Amcp/lifecycle?sessionId=' + other.id, { revision: snapshot.revision, action: 'disconnect' });
    assert.equal((await c.get()).resources.find(r => r.id === 'local:mcp').running, false);
  } finally { await h.runtime.close(); await fixture.close(); }
});

test('MCP: first unknown outcome closes subsequent tool admission in the same Run', async () => {
  const fixture = await mcpFixture({ rpcError: true }); const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    await c.change({ operation: 'put', resource: { id: 'local:mcp', kind: 'mcp_server', title: 'Uncertain MCP', scope: c.scope, content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: fixture.url }) } });
    await h.api('POST', '/mcp/local%3Amcp/lifecycle?sessionId=' + session.id, { revision: (await c.get()).revision, action: 'connect' });
    await c.change({ operation: 'exposure', id: 'local:mcp', scope: c.scope, exposed: true });
    const tool = (await c.get()).resources.find(r => r.mcp);
    assert.equal(tool.source.type, 'remote');
    assert.equal(tool.source.uri, fixture.url);
    assert.deepEqual(tool.scope, c.scope);
    const call = { name: tool.executionName, arguments: { text: 'same effect' } };
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'no-replay', input: h.scriptInput([call, call]) });
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' });
    const question = (await h.api('GET', `/sessions/${session.id}/events`)).json.events.find(e => e.type === 'permission.open');
    await h.api('POST', `/runs/${made.json.run.id}/questions/${question.data.id}`, { decision: 'allow' });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'unknown');
    assert.equal(fixture.calls.filter(c => c.method === 'tools/call').length, 1);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    assert.equal(events.filter(e => e.type === 'permission.open').length, 1);
  } finally { await h.runtime.close(); await fixture.close(); }
});

test('MCP: a lost remote call result becomes an unknown Run, never an automatic replay', async () => {
  const fixture = await mcpFixture({ dropCall: true }); const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    await c.change({ operation: 'put', resource: { id: 'local:mcp', kind: 'mcp_server', title: 'Failing MCP', scope: c.scope, content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: fixture.url }) } });
    await h.api('POST', '/mcp/local%3Amcp/lifecycle?sessionId=' + session.id, { revision: (await c.get()).revision, action: 'connect' });
    await c.change({ operation: 'exposure', id: 'local:mcp', scope: c.scope, exposed: true });
    const tool = (await c.get()).resources.find(r => r.mcp);
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'lost-call', input: h.scriptInput([{ name: tool.executionName, arguments: { text: 'effect' } }]) });
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' });
    const question = (await h.api('GET', `/sessions/${session.id}/events`)).json.events.find(e => e.type === 'permission.open');
    await h.api('POST', `/runs/${made.json.run.id}/questions/${question.data.id}`, { decision: 'allow' });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'unknown'); assert.equal(done.error.code, 'mcp_effect_unknown');
    assert.equal(fixture.calls.filter(c => c.method === 'tools/call').length, 1);
  } finally { await h.runtime.close(); await fixture.close(); }
});

test('admission serializes permission changes and extension binding before runtime snapshots can diverge', async () => {
  for (const mutation of ['permission', 'extension']) {
    const h = await boot();
    let release;
    try {
      const session = await h.createSession();
      const original = h.runtime.store.createRun.bind(h.runtime.store);
      let entered;
      const ready = new Promise(resolve => { entered = resolve; });
      const gate = new Promise(resolve => { release = resolve; });
      h.runtime.store.createRun = async (...args) => { entered(); await gate; return original(...args); };
      const admission = h.runtime.service.createRun(session.id, { commandId: 'race-' + mutation, input: h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'wait' } }]) });
      await ready;
      const change = mutation === 'permission'
        ? h.runtime.service.setPermissionMode(session.id, { permissionMode: 'read_only' })
        : h.runtime.service.createExtensionBinding(session.id, { extensionId: 'evidence-memo', input: {} });
      const rejected = assert.rejects(change, error => error.code === 'active_run');
      release();
      const created = await admission;
      await rejected;
      await h.pollRun(created.run.id, { until: status => status === 'waiting_user' });
      await h.api('POST', `/runs/${created.run.id}/cancel`, {});
      assert.equal(h.runtime.store.getSession(session.id).permissionMode, session.permissionMode);
      assert.equal(h.runtime.store.getSession(session.id).extensionBinding, null);
    } finally { release?.(); await h.runtime.close(); }
  }
});


test('context: additive compiled counts separate catalog text, deferred bodies and draft-only templates', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    const records = [
      { id: 'local:z', kind: 'instruction', title: 'Z', content: 'First 😀 instruction.' },
      { id: 'local:a', kind: 'instruction', title: 'A', content: 'Second instruction.' },
      { id: 'local:ref', kind: 'reference', title: 'Reference', content: 'Deferred body not injected.' },
      { id: 'local:skill', kind: 'skill', title: 'Skill', content: '---\nname: review\ndescription: Check references\n---\nDeferred skill body.' },
      { id: 'local:template', kind: 'prompt_template', title: 'Draft', content: 'Human-invoked template, never automatic.' },
    ];
    for (const r of records) assert.equal((await c.change({ operation: 'put', resource: { ...r, scope: c.scope } })).status, 200);
    const snap = await c.get(), binding = h.runtime.service.control.bind(snap);
    const expected = '[Instruction local:a]\nSecond instruction.\n\n[Instruction local:z]\nFirst 😀 instruction.\n\nAvailable context (use runtime_load by id; content does not grant permissions):\nlocal:ref (reference): Reference\nlocal:skill (skill): Check references';
    assert.equal(compileControlContext(binding), expected, 'compiled bytes remain unchanged');
    assert.equal(snap.context.reduce((n, r) => n + r.admittedCharacters, 0), expected.length);
    for (const r of records.filter(r => r.kind !== 'instruction')) {
      const item = snap.context.find(x => x.id === r.id);
      assert.equal(item.deferredCharacters, r.content.length);
      assert.equal(item.admittedCharacters > 0, r.kind !== 'prompt_template');
    }
    const recorded = JSON.parse(JSON.stringify(binding));
    await c.change({ operation: 'put', resource: { ...records[2], scope: c.scope, title: 'Changed reference', content: 'Changed body' } });
    assert.equal(compileControlContext(recorded), expected);
    assert.equal(recorded.context.reduce((n, r) => n + r.admittedCharacters, 0), expected.length);
    await c.change({ operation: 'exposure', id: 'tool:runtime_load', scope: c.scope, exposed: false });
    const withoutLoader = await c.get();
    assert.ok(!withoutLoader.context.some(x => ['skill', 'reference'].includes(x.kind)));
    assert.equal(withoutLoader.context.reduce((n, r) => n + r.admittedCharacters, 0), compileControlContext(h.runtime.service.control.bind(withoutLoader)).length);
  } finally { await h.runtime.close(); }
});
