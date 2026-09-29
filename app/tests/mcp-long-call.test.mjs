import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { MCPManager } from '../runtime/mcp-manager.mjs';

/* A transport-wide 15 s fetch deadline also covered response bodies, so every
 * MCP tool call over 15 s was cut and recorded as an unknown effect despite its
 * 60 s call timeout (2026-09-30 convergence loop, S15). A 16 s call must now
 * complete and record its result. */
test('an MCP tool call longer than 15 s completes within its 60 s call timeout', { timeout: 40_000 }, async () => {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw);
    if (request.id === undefined) { res.writeHead(202).end(); return; }
    let result;
    if (request.method === 'server/discover') result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {} } };
    else if (request.method === 'tools/list') result = { tools: [{ name: 't', inputSchema: { type: 'object' } }], ttlMs: 0, cacheScope: 'private' };
    else if (request.method === 'tools/call') { await new Promise((resolve) => setTimeout(resolve, 16_000)); result = { content: [{ type: 'text', text: 'done' }] }; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { resultType: 'complete', ...result } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const manager = new MCPManager();
  try {
    const resource = { id: 'local:slow', kind: 'mcp_server', content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: 'http://127.0.0.1:' + server.address().port }) };
    const info = await manager.connect(resource);
    const tool = info.tools[0];
    const binding = { resources: [{ kind: 'tool', exposed: true, executionName: tool.hostName, title: 't', inputSchema: tool.inputSchema,
      mcp: { serverId: 'local:slow', name: 't', configHash: createHash('sha256').update(resource.content).digest('hex') } }] };
    const outcomes = [];
    const [execute] = manager.toolsFor(binding, async (detail) => outcomes.push('unknown:' + detail.failureKind), async () => { outcomes.push('result'); return null; }, async () => outcomes.push('dispatch'));
    const output = await execute.execute('call-1', {}, new AbortController().signal);
    assert.deepEqual(output.content, [{ type: 'text', text: 'done' }]);
    assert.deepEqual(outcomes, ['dispatch', 'result'], 'recorded as a completed effect, not unknown');
  } finally {
    await manager.close(); server.closeAllConnections(); server.close();
  }
});

// Without any transport deadline, the legacy handshake's initialized
// notification (sent without an SDK timeout) could hang connect forever when a
// server never answers it. Response headers now have their own deadline.
test('a legacy server that never answers the initialized notification fails connect in bounded time', { timeout: 40_000 }, async () => {
  const held = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw);
    if (request.method === 'notifications/initialized') { held.push(res); return; } // never answer
    if (request.id === undefined) { res.writeHead(202).end(); return; }
    let result;
    if (request.method === 'initialize') result = { protocolVersion: request.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'f', version: '1' } };
    else { res.writeHead(404).end(); return; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const manager = new MCPManager();
  const started = Date.now();
  try {
    const resource = { id: 'local:legacy', kind: 'mcp_server', content: JSON.stringify({ transport: 'streamable-http', protocol: 'legacy-2025', url: 'http://127.0.0.1:' + server.address().port }) };
    await assert.rejects(manager.connect(resource), /Connection or discovery failed/);
    assert.ok(held.length === 1, 'the handshake reached the unanswered notification');
    assert.ok(Date.now() - started < 30_000, 'connect failed within its deadline');
  } finally {
    for (const res of held) res.destroy();
    await manager.close(); server.closeAllConnections(); server.close();
  }
});
