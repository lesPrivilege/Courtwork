// Diagnostic tests: PASS means the named BASELINE behavior was reproduced.
// This file does NOT certify the behavior as correct or run a real MCP SDK/server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

const bytes = await readFile(new URL('../reference/mcp-manager.baseline.mjs', import.meta.url));
assert.equal(createHash('sha1').update(Buffer.concat([
  Buffer.from(`blob ${bytes.length}\0`), bytes,
])).digest('hex'), '055e66223a91eec4a4aade665f8d96af488e9573');

async function load({ page, call } = {}) {
  const observation = { listRequests: [], effectCount: 0, unknownCount: 0, outboundRequests: 0 };
  class Client {
    async connect() {}
    async close() {}
    getServerCapabilities() { return { tools: {} }; }
    getNegotiatedProtocolVersion() { return '2025-11-25'; }
    getProtocolEra() { return 'legacy'; }
    getServerVersion() { return { name: 'synthetic-fixture', version: '1' }; }
    async listTools(params) {
      observation.listRequests.push(structuredClone(params));
      return page ? page(params) : { tools: [{ name: 'synthetic_tool', inputSchema: { type: 'object' } }] };
    }
    async callTool() { return call ? call(observation) : { content: [{ type: 'text', text: 'ok' }] }; }
  }
  class StreamableHTTPClientTransport { constructor() {} }
  const context = createContext({ structuredClone, URL, AbortSignal,
    fetch() { observation.outboundRequests++; throw new Error('Network is forbidden in this probe'); },
  });
  const source = new SourceTextModule(bytes.toString('utf8'), { context });
  await source.link(async (specifier) => {
    if (specifier === '@modelcontextprotocol/client') {
      return new SyntheticModule(['Client', 'StreamableHTTPClientTransport'], function () {
        this.setExport('Client', Client); this.setExport('StreamableHTTPClientTransport', StreamableHTTPClientTransport);
      }, { context });
    }
    if (specifier === 'node:crypto') return new SyntheticModule(['createHash'], function () { this.setExport('createHash', createHash); }, { context });
    throw new Error(`Unexpected dependency: ${specifier}`);
  });
  await source.evaluate();
  const manager = new source.namespace.MCPManager();
  const resource = { id: 'local:synthetic', content: JSON.stringify({ transport: 'streamable-http', url: 'https://example.invalid/mcp', protocol: 'legacy-2025' }) };
  const snapshot = await manager.connect(resource);
  const binding = { resources: snapshot.tools.map(tool => ({ kind: 'tool', exposed: true,
    executionName: tool.hostName, title: tool.name, inputSchema: tool.inputSchema,
    mcp: { serverId: resource.id, name: tool.name, configHash: createHash('sha256').update(resource.content).digest('hex') },
  })) };
  const tools = manager.toolsFor(binding, async () => { observation.unknownCount++; });
  return { manager, snapshot, tools, observation };
}

test('baseline: a paged catalogue is published healthy after only the first page', async () => {
  const fixture = await load({ page: params => params.cursor
    ? { tools: [{ name: 'second_tool', inputSchema: { type: 'object' } }] }
    : { tools: [{ name: 'first_tool', inputSchema: { type: 'object' } }], nextCursor: 'page-2' } });
  assert.equal(fixture.snapshot.health, 'healthy');
  assert.equal(fixture.snapshot.connected, true);
  assert.equal(fixture.snapshot.tools.length, 1);
  assert.equal(fixture.observation.listRequests.length, 1);
  assert.equal(fixture.observation.outboundRequests, 0);
  await fixture.manager.close();
});

test('baseline: a synthetic effect followed by isError does not invoke the unknown-effect callback', async () => {
  const fixture = await load({ call: observation => {
    observation.effectCount++; // only a local integer, not an external operation
    return { isError: true, content: [{ type: 'text', text: 'failed after the simulated effect' }] };
  } });
  await assert.rejects(fixture.tools[0].execute('call-1', {}, new AbortController().signal), /reported a failure/);
  assert.equal(fixture.observation.effectCount, 1);
  assert.equal(fixture.observation.unknownCount, 0);
  assert.equal(fixture.observation.outboundRequests, 0);
  await fixture.manager.close();
});

test('baseline control: a transport-style rejection invokes the unknown-effect callback', async () => {
  const fixture = await load({ call: () => { throw new Error('synthetic disconnect'); } });
  await assert.rejects(fixture.tools[0].execute('call-2', {}, new AbortController().signal), /result is unknown/);
  assert.equal(fixture.observation.unknownCount, 1);
  assert.equal(fixture.observation.outboundRequests, 0);
  await fixture.manager.close();
});

test('baseline control: successful text result reaches the caller', async () => {
  const fixture = await load();
  const result = await fixture.tools[0].execute('call-3', {}, new AbortController().signal);
  assert.equal(result.content[0].text, 'ok');
  assert.equal(fixture.observation.unknownCount, 0);
  assert.equal(fixture.observation.outboundRequests, 0);
  await fixture.manager.close();
});
