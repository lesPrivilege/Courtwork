import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = path.resolve(process.argv[2] ?? '.');
const { MCPManager } = await import(pathToFileURL(path.join(sourceRoot, 'app/runtime/mcp-manager.mjs')).href);

function sourceCommit() {
  return execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function loopback(mode) {
  const modern = mode === 'modern';
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    requests.push(body);
    if (body.id === undefined) {
      response.writeHead(202);
      response.end();
      return;
    }

    let result;
    if (modern && body.method === 'server/discover') {
      result = {
        supportedVersions: ['2026-07-28'],
        capabilities: { tools: {}, extensions: { 'io.modelcontextprotocol/tasks': {} } },
      };
    } else if (!modern && body.method === 'initialize') {
      result = {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: { name: 'legacy-loopback', version: '1' },
      };
    } else if (body.method === 'tools/list') {
      result = {
        tools: ['echo', 'task'].map((name) => ({
          name,
          description: name + ' probe',
          inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        })),
      };
    } else if (body.method === 'tools/call' && body.params.name === 'echo') {
      result = { content: [{ type: 'text', text: body.params.arguments.text }] };
    } else if (body.method === 'tools/call' && body.params.name === 'task') {
      result = modern
        ? {
          resultType: 'task', taskId: 'modern-task-1', status: 'working', ttlMs: null,
          createdAt: '2026-09-10T00:00:00Z', lastUpdatedAt: '2026-09-10T00:00:00Z', pollIntervalMs: 1000,
        }
        : {
          task: {
            taskId: 'legacy-task-1', status: 'working', ttl: null,
            createdAt: '2026-09-10T00:00:00Z', lastUpdatedAt: '2026-09-10T00:00:00Z',
          },
        };
    }

    if (!result) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'unsupported' } }));
      return;
    }
    const payload = modern
      ? Object.assign({ resultType: 'complete' }, body.method.endsWith('/list') ? { ttlMs: 0, cacheScope: 'private' } : {}, result)
      : result;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: payload }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    requests,
    url: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }),
  };
}

const observations = [];
for (const mode of ['modern', 'legacy']) {
  const modern = mode === 'modern';
  const wire = await loopback(mode);
  const manager = new MCPManager();
  const serverId = 'independent-' + mode;
  const content = JSON.stringify({
    transport: 'streamable-http',
    protocol: modern ? '2026-07-28' : 'legacy-2025',
    url: wire.url,
  });
  try {
    const inspected = await manager.connect({ id: serverId, content });
    const entry = manager.connections.get(serverId);
    const binding = {
      resources: entry.tools.map((tool) => ({
        kind: 'tool', exposed: true, executionName: mode + '_' + tool.name,
        title: tool.name, description: tool.description, inputSchema: tool.inputSchema,
        mcp: { serverId, configHash: entry.hash, name: tool.name },
      })),
    };
    const tools = new Map(manager.toolsFor(binding, async () => {}).map((tool) => [tool.label, tool]));
    const ordinary = await tools.get('echo').execute('echo-call', { text: 'ok' }, new AbortController().signal);
    assert.deepEqual(ordinary.content, [{ type: 'text', text: 'ok' }]);
    await assert.rejects(
      tools.get('task').execute('task-call', { text: 'ok' }, new AbortController().signal),
      /MCP result is unknown/i,
    );

    const methods = wire.requests.filter((request) => request.method).map((request) => request.method);
    const call = wire.requests.find((request) => request.method === 'tools/call' && request.params.name === 'echo');
    assert.equal(inspected.protocol, modern ? '2026-07-28' : '2025-11-25');
    assert.equal(inspected.era, modern ? 'modern' : 'legacy');
    if (modern) {
      assert.ok(methods.includes('server/discover'));
      assert.ok(!methods.includes('initialize'));
      assert.equal(call.params._meta['io.modelcontextprotocol/protocolVersion'], '2026-07-28');
    } else {
      assert.ok(methods.includes('initialize'));
      assert.ok(!methods.includes('server/discover'));
      assert.equal(call.params._meta, undefined);
    }
    observations.push({
      mode,
      negotiated: inspected.protocol,
      era: inspected.era,
      methods,
      ordinaryTool: 'completed',
      taskShape: modern ? 'resultType:task' : 'task wrapper',
      taskRuntime: 'rejected as unknown by current manager/client',
      toolCallMeta: call.params._meta ?? null,
    });
  } finally {
    await manager.close();
    await wire.close();
  }
}

console.log(JSON.stringify({ sourceRoot, sourceCommit: sourceCommit(), observations }, null, 2));
