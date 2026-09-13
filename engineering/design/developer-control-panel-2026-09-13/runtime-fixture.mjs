import http from 'node:http';
import { startServer } from '../../../app/server/index.mjs';
import { boot } from '../../../app/tests/helpers.mjs';
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
  await new Promise(resolve => server.listen(Number(process.env.CW_FIXTURE_MCP_PORT || 0), '127.0.0.1', resolve));
  return { calls, url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

const mcp=await mcpFixture();
const h=process.env.CW_FIXTURE_DATA ? { runtime: await startServer({dataDir:process.env.CW_FIXTURE_DATA,port:Number(process.env.CW_FIXTURE_PORT || 0)}),dataDir:process.env.CW_FIXTURE_DATA } : await boot();
console.log(JSON.stringify({url:h.runtime.url,dataDir:h.dataDir,projectId:h.projectId,mcpUrl:mcp.url}));
