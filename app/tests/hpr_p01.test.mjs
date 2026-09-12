import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { MCPManager } from '../runtime/mcp-manager.mjs';

const item = (kind, n) => kind === 'tools' ? { name: `tool${n}`, inputSchema: { type: 'object' } }
  : kind === 'resources' ? { name: `resource${n}`, uri: `fixture://resource/${n}` } : { name: `prompt${n}` };
async function fixture({ legacy = false, mode = 'pages', gate } = {}) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const q = JSON.parse(raw); calls.push(q);
    if (q.id === undefined) { res.writeHead(202).end(); return; }
    let result, error;
    if (q.method === 'server/discover' && !legacy) result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {}, resources: {}, prompts: {} } };
    else if (q.method === 'initialize' && legacy) result = { protocolVersion: '2025-11-25', capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: 'fixture', version: '1' } };
    else if (q.method.endsWith('/list')) {
      const kind = q.method.split('/')[0], cursor = q.params?.cursor;
      if (gate && kind === 'tools') await gate;
      const n = cursor === undefined ? 0 : Number(cursor);
      result = { [kind]: [item(kind, n)] };
      if (mode === 'pages' || mode === 'empty') {
        if (n < 2) result.nextCursor = String(n + 1);
        if (mode === 'empty' && n === 1) result[kind] = [];
      } else if (mode === 'failure' && n === 1) { result = undefined; error = { code: -32603, message: 'page failed' }; }
      else if (mode === 'failure') result.nextCursor = '1';
      else if (mode === 'cycle') result.nextCursor = n === 0 ? '1' : n === 1 ? '2' : '1';
      else if (mode === 'duplicate') result[kind] = [item(kind, 0), item(kind, 0)];
      else if (mode === 'cross-page-duplicate') { result[kind] = [item(kind, 0)]; if (n === 0) result.nextCursor = '1'; }
      else if (mode === 'empty-cycle') { result[kind] = []; result.nextCursor = '1'; }
      else if (mode === 'count') result[kind] = Array.from({ length: 101 }, (_, i) => item(kind, i));
      else if (mode === 'bytes') result[kind][0].description = 'x'.repeat(200001);
      else if (mode === 'page-limit') result.nextCursor = String(n + 1);
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(result ? { jsonrpc: '2.0', id: q.id, result: { ...(!legacy ? { resultType: 'complete', ...(q.method.endsWith('/list') ? { ttlMs: 0, cacheScope: 'private' } : {}) } : {}), ...result } }
      : { jsonrpc: '2.0', id: q.id, error: error ?? { code: -32601, message: 'unsupported' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { calls, resource: { id: 'p01-fixture', content: JSON.stringify({ transport: 'streamable-http', protocol: legacy ? 'legacy-2025' : '2026-07-28', url: `http://127.0.0.1:${server.address().port}` }) },
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
for (const legacy of [false, true]) {
  for (const mode of ['pages', 'empty']) test(`P01 installed SDK ${legacy ? 'legacy' : 'modern'} aggregates ${mode}`, async () => {
    const f = await fixture({ legacy, mode }), m = new MCPManager();
    try {
      const result = await m.connect(f.resource);
      assert.equal(result.connected, true);
      for (const kind of ['tools', 'resources', 'prompts']) {
        assert.equal(result[kind].length, mode === 'empty' ? 2 : 3);
        assert.deepEqual(f.calls.filter(q => q.method === `${kind}/list`).map(q => q.params?.cursor), [undefined, '1', '2']);
      }
    } finally { await m.close(); await f.close(); }
  });
  for (const mode of ['failure', 'cycle', 'empty-cycle', 'duplicate', 'cross-page-duplicate', 'count', 'bytes', 'page-limit']) test(`P01 ${legacy ? 'legacy' : 'modern'} rejects incomplete ${mode} atomically`, async () => {
    const f = await fixture({ legacy, mode }), m = new MCPManager();
    try {
      await assert.rejects(m.connect(f.resource), /discovery failed/);
      const state = m.inspect(f.resource.id, f.resource.content);
      assert.equal(state.connected, false);
      assert.equal(state.health, 'error');
      for (const kind of ['tools', 'resources', 'prompts']) assert.deepEqual(state[kind], []);
    } finally { await m.close(); await f.close(); }
  });
}

test('P01 concurrent connects expose only the latest requested connection', async () => {
  const old = await fixture({ mode: 'pages' }), latest = await fixture({ mode: 'empty' }), m = new MCPManager();
  try {
    const outcomes = await Promise.allSettled([m.connect(old.resource), m.connect(latest.resource)]);
    assert.equal(outcomes[0].status, 'rejected');
    assert.equal(outcomes[1].status, 'fulfilled');
    assert.equal(m.inspect(latest.resource.id, latest.resource.content).connected, true);
    assert.equal(m.inspect(old.resource.id, old.resource.content).connected, false);
  } finally { await m.close(); await old.close(); await latest.close(); }
});

test('P01 disconnect while discovery waits cannot publish a late catalog', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture({ gate }), m = new MCPManager();
  try {
    const pending = m.connect(f.resource);
    const rejected = assert.rejects(pending, /discovery failed/);
    while (!f.calls.some(q => q.method === 'tools/list')) await new Promise(resolve => setTimeout(resolve, 1));
    await m.disconnect(f.resource.id);
    release();
    await rejected;
    assert.equal(m.connections.has(f.resource.id), false);
    assert.equal(m.inspect(f.resource.id, f.resource.content).connected, false);
  } finally { release(); await m.close(); await f.close(); }
});

// Exercise the SDK-to-Host error callback separately from protocol failures.
test('P01 transport error invalidates callability until explicit reconnect', async () => {
  const f = await fixture(), m = new MCPManager();
  try {
    await m.connect(f.resource);
    const entry = m.connections.get(f.resource.id);
    entry.client.onerror(new Error('synthetic transport error'));
    const state = m.inspect(f.resource.id, f.resource.content);
    assert.equal(state.connected, false); assert.equal(state.health, 'degraded');
    const [tool] = m.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: entry.hash, name: 'tool0' } }] }, async () => assert.fail('must reject before dispatch'));
    await assert.rejects(tool.execute('no-dispatch', {}, undefined), /no longer connected/);
    assert.equal((await m.connect(f.resource)).connected, true);
  } finally { await m.close(); await f.close(); }
});
