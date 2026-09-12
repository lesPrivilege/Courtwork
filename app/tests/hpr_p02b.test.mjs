import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { rm } from 'node:fs/promises';
import { boot, reopen } from './helpers.mjs';
import { MCPManager } from '../runtime/mcp-manager.mjs';
import { MCP_RESULT_MAX_BYTES, prepareMcpResult } from '../runtime/mcp-result.mjs';

async function fixture(result, { legacy = false, outputSchema } = {}) {
  let calls = 0;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = ''; for await (const c of req) raw += c;
    const q = JSON.parse(raw);
    if (q.id === undefined) { res.writeHead(202).end(); return; }
    let body;
    if (q.method === 'server/discover') body = { supportedVersions: ['2026-07-28'], capabilities: { tools: {} } };
    else if (q.method === 'initialize') body = { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'p02b', version: '1' } };
    else if (q.method === 'tools/list') body = { tools: [{ name: 'result', inputSchema: { type: 'object', properties: {} }, ...(outputSchema ? { outputSchema } : {}) }], ...(!legacy ? { ttlMs: 0, cacheScope: 'private' } : {}) };
    else if (q.method === 'tools/call') { calls++; body = result; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: q.id, result: { ...(!legacy ? { resultType: 'complete' } : {}), ...body } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { calls: () => calls, resource: { id: 'local:p02b', content: JSON.stringify({ transport: 'streamable-http', protocol: legacy ? 'legacy-2025' : '2026-07-28', url: `http://127.0.0.1:${server.address().port}` }) },
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
async function managerTool(f, onUnknown = async () => {}) {
  const manager = new MCPManager(); await manager.connect(f.resource);
  const [tool] = manager.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: manager.connections.get(f.resource.id).hash, name: 'result' } }] }, onUnknown);
  return { manager, tool };
}
for (const value of [{ answer: 42 }, [1, 'two'], null, false, 0, 'scalar']) test(`P02b actual modern SDK preserves structured ${JSON.stringify(value)}`, async () => {
  const f = await fixture({ content: [{ type: 'text', text: 'visible body' }], structuredContent: value });
  const { manager, tool } = await managerTool(f);
  try {
    const result = await tool.execute('coexist', {}, undefined);
    assert.equal(result.content[0].text, 'visible body');
    assert.equal(result.content[1].text, `MCP structuredContent (JSON):\n${JSON.stringify(value)}`);
  } finally { await manager.close(); await f.close(); }
});

test('P02b actual legacy SDK preserves body plus supported structure', async () => {
  const f = await fixture({ content: [{ type: 'text', text: 'legacy body' }], structuredContent: { answer: 42 } }, { legacy: true });
  const { manager, tool } = await managerTool(f);
  try { assert.equal((await tool.execute('legacy', {}, undefined)).content.length, 2); }
  finally { await manager.close(); await f.close(); }
});

test('P02b structured-only and non-rendered resource blocks stay explicit', async () => {
  for (const payload of [{ content: [], structuredContent: false }, { content: [{ type: 'resource', resource: { uri: 'fixture://doc', text: 'resource body', _meta: { private: 'NESTED_PRIVATE_SENTINEL' } } }] }]) {
    const f = await fixture(payload), { manager, tool } = await managerTool(f);
    try {
      const projected = await tool.execute('explicit', {}, undefined);
      assert.match(projected.content[0].text, /MCP .*JSON/);
      assert.equal(JSON.stringify(projected).includes('NESTED_PRIVATE_SENTINEL'), false);
      assert.equal(prepareMcpResult(payload).bytes.includes(Buffer.from('NESTED_PRIVATE_SENTINEL')), false);
    }
    finally { await manager.close(); await f.close(); }
  }
});

test('P02b invalid/oversized result fences uncertainty without raw dumping', async () => {
  for (const payload of [{ content: [{ type: 'not-a-protocol-block', private: 'never dump me' }] }, { content: [{ type: 'text', text: 'x'.repeat(MCP_RESULT_MAX_BYTES) }] }]) {
    let unknown = 0;
    const f = await fixture(payload), { manager, tool } = await managerTool(f, async () => { unknown++; });
    try {
      await assert.rejects(tool.execute('unsupported', {}, undefined), error => /unknown|unavailable/.test(error.message) && !error.message.includes('never dump me'));
      assert.equal(unknown, 1);
    } finally { await manager.close(); await f.close(); }
  }
});

for (const isError of [false, true]) test(`P02b ${isError ? 'error' : 'success'}: native projection and scoped full result survive restart`, async () => {
  const structuredContent = { source: 'synthetic', long: '界😀'.repeat(20000) };
  const payload = { content: [{ type: 'text', text: 'body remains visible' }], structuredContent, isError, _meta: { private: 'PRIVATE_TRANSPORT_SENTINEL' } };
  const f = await fixture(payload), h = await boot(); let next;
  try {
    const session = await h.createSession(), scope = { type: 'session', id: session.id }, suffix = '?sessionId=' + session.id;
    const snapshot = async () => (await h.api('GET', '/runtime-control' + suffix)).json;
    assert.equal((await h.api('PUT', '/runtime-control' + suffix, { revision: (await snapshot()).revision, operation: 'put', resource: { ...f.resource, kind: 'mcp_server', title: 'result fixture', scope } })).status, 200);
    await h.api('POST', '/mcp/local%3Ap02b/lifecycle' + suffix, { revision: (await snapshot()).revision, action: 'connect' });
    await h.api('PUT', '/runtime-control' + suffix, { revision: (await snapshot()).revision, operation: 'exposure', id: f.resource.id, scope, exposed: true });
    const tool = (await snapshot()).resources.find(r => r.mcp);
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'result', input: h.scriptInput([{ name: tool.executionName, arguments: {} }]) });
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' });
    const log = async () => (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const permission = (await log()).find(e => e.type === 'permission.open');
    await h.api('POST', `/runs/${made.json.run.id}/questions/${permission.data.id}`, { decision: 'allow' });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, isError ? 'unknown' : 'completed');
    const events = await log(), result = events.find(e => e.type === 'tool.result');
    assert.equal(result.data.isError, isError);
    assert.match(result.data.text, /body remains visible/);
    assert.match(result.data.text, /projection is partial/);
    assert.ok(Buffer.byteLength(result.data.text) < 34000);
    assert.equal(result.data.text.includes('\uFFFD'), false);
    assert.equal(result.data.mcpResult.projection, 'partial');
    assert.equal(JSON.stringify(events).includes('PRIVATE_TRANSPORT_SENTINEL'), false);
    const dispatchId = result.data.mcpResult.dispatchId, url = `/sessions/${session.id}/mcp-results/${encodeURIComponent(dispatchId)}?runId=${done.id}`;
    const full = await h.api('GET', url);
    assert.equal(full.status, 200);
    assert.deepEqual(full.json.result, { content: payload.content, structuredContent, isError });
    assert.equal(full.json.sha256, prepareMcpResult(payload).sha256);
    const other = await h.createSession();
    assert.equal((await h.api('GET', url.replace(session.id, other.id))).status, 404);
    assert.equal((await h.api('GET', url.replace(encodeURIComponent(dispatchId), 'unrecorded'))).status, 404);
    assert.equal((await h.api('GET', url + '&sha256=' + full.json.sha256)).status, 400);
    await h.runtime.close(); next = await reopen(h.dataDir);
    assert.deepEqual((await next.api('GET', url)).json.result, full.json.result);
    assert.equal(f.calls(), 1);
    await rm(next.runtime.service.artifactHistory.repository(session.id), { recursive: true, force: true });
    assert.equal((await next.api('GET', url)).status, 410, 'missing retained bytes are unavailable, never fabricated');
  } finally { await (next?.runtime ?? h.runtime).close(); await f.close(); }
});


test('P02b installed SDK output schema rejection is effect-unknown', async () => {
  const f = await fixture({ content: [], structuredContent: { answer: 'wrong type' } }, { outputSchema: { type: 'object', properties: { answer: { type: 'number' } }, required: ['answer'] } });
  let unknown = 0;
  const { manager, tool } = await managerTool(f, async () => { unknown++; });
  try {
    await assert.rejects(tool.execute('schema-failure', {}, undefined), /unknown/);
    assert.equal(unknown, 1);
  } finally { await manager.close(); await f.close(); }
});

test('P02b failed result retention cannot become a successful empty result', async () => {
  const f = await fixture({ content: [{ type: 'text', text: 'not retained' }] }), manager = new MCPManager();
  let detail;
  try {
    await manager.connect(f.resource);
    const [tool] = manager.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: manager.connections.get(f.resource.id).hash, name: 'result' } }] }, async d => { detail = d; }, async () => { throw new Error('synthetic storage failure'); });
    await assert.rejects(tool.execute('retention-failure', {}, undefined), /evidence is unavailable/);
    assert.equal(detail.callId, 'retention-failure');
    assert.equal(detail.failureKind, 'result-evidence-unavailable');
    assert.equal(f.calls(), 1);
  } finally { await manager.close(); await f.close(); }
});

test('P02b repeated native call IDs receive distinct Host dispatch identities', async () => {
  const f = await fixture({ content: [{ type: 'text', text: 'same result' }] }), manager = new MCPManager();
  const intents = [], results = [];
  try {
    await manager.connect(f.resource);
    const [tool] = manager.toolsFor({ resources: [{ kind: 'tool', exposed: true, executionName: 'test', title: 'test', mcp: { serverId: f.resource.id, configHash: manager.connections.get(f.resource.id).hash, name: 'result' } }] }, async () => assert.fail('success is known'), async ({ prepared, ...identity }) => { results.push(identity); }, async identity => { intents.push(identity); });
    await tool.execute('native-reused-id', {}, undefined);
    await tool.execute('native-reused-id', {}, undefined);
    assert.equal(results.length, 2);
    assert.equal(results[0].callId, results[1].callId);
    assert.notEqual(results[0].dispatchId, results[1].dispatchId);
    assert.deepEqual(results, intents);
  } finally { await manager.close(); await f.close(); }
});
