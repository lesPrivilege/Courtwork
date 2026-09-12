import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');
// Keep the SDK's aggregation, protocol validation and header-tool filtering.
// Validate each page before it enters the aggregate: SDK 2.0.0 silently ends
// a repeated cursor, which is not evidence of a complete Host catalog.
class DiscoveryClient extends Client {
  catalogPages = new Map();
  async request(request, options) {
    const result = await super.request(request, options);
    const kind = ({ 'tools/list': 'tools', 'resources/list': 'resources', 'prompts/list': 'prompts' })[request.method];
    if (!kind) return result;
    const state = this.catalogPages.get(kind) ?? { cursors: new Set(), identities: new Set(), bytes: 0 };
    this.catalogPages.set(kind, state);
    for (const item of result[kind]) {
      const identity = kind === 'resources' ? item.uri : item.name;
      if (state.identities.has(identity)) throw new Error('duplicate catalog identity');
      state.identities.add(identity);
      if (state.identities.size > 100) throw new Error('catalog limit');
    }
    state.bytes += Buffer.byteLength(JSON.stringify(result), 'utf8');
    if ([...this.catalogPages.values()].reduce((sum, page) => sum + page.bytes, 0) > 200000) throw new Error('catalog size limit');
    if (result.nextCursor !== undefined) {
      if (state.cursors.has(result.nextCursor)) throw new Error('catalog cursor cycle');
      state.cursors.add(result.nextCursor);
    }
    return result;
  }
}

export function parseMcpConfig(content) {
  let config;
  try { config = JSON.parse(content); } catch { throw new Error('MCP content must be JSON'); }
  if (!config || typeof config !== 'object' || Array.isArray(config) || Object.keys(config).some(k => !['transport', 'url', 'protocol'].includes(k))) throw new Error('Unsupported MCP configuration fields');
  if (config.transport !== 'streamable-http' || !['2026-07-28', 'legacy-2025'].includes(config.protocol)) throw new Error('Choose streamable-http and an explicit supported protocol');
  let url;
  try { url = new URL(config.url); } catch { throw new Error('Invalid MCP endpoint'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('MCP endpoint must not contain credentials, query or fragment');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Remote MCP requires HTTPS');
  return config;
}

/** The SDK owns protocol semantics. This manager owns provider handles, never
 * Agent Sessions. Restart reconnects metadata only and cannot replay a call.
 * v2 defaults to legacy: modern mode MUST be explicitly pinned. */
export class MCPManager {
  constructor() { this.connections = new Map(); }
  inspect(id, content) {
    const entry = this.connections.get(id);
    if (!entry || entry.hash !== digest(content)) return { connected: false, health: 'healthy', protocol: parseMcpConfig(content).protocol, tools: [], resources: [], prompts: [], diagnostic: null };
    return structuredClone({ connected: entry.connected, health: entry.health, protocol: entry.protocol, era: entry.era, server: entry.server, tools: entry.tools, resources: entry.resources, prompts: entry.prompts, diagnostic: entry.diagnostic });
  }
  async disconnect(id) {
    const entry = this.connections.get(id);
    if (!entry) return;
    entry.connected = false;
    this.connections.delete(id);
    await entry.client.close();
  }
  async connect(resource) {
    const config = parseMcpConfig(resource.content);
    const previous = this.connections.get(resource.id);
    if (previous) previous.connected = false;
    const client = new DiscoveryClient({ name: 'se-runtime', version: '0.1.0' }, {
      capabilities: {}, inputRequired: { autoFulfill: false },
      versionNegotiation: { mode: config.protocol === '2026-07-28' ? { pin: '2026-07-28' } : 'legacy' },
    });
    // Redirects could silently change the trusted endpoint. Authenticated
    // OAuth/bearer transports are a separate future SecretStore adapter.
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { redirect: 'error' }, onInsufficientScope: 'throw',
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(15000)]) }),
    });
    const entry = { client, hash: digest(resource.content), connected: false, health: 'healthy', protocol: config.protocol, tools: [], resources: [], prompts: [], diagnostic: null };
    this.connections.set(resource.id, entry);
    client.onclose = () => { entry.connected = false; };
    client.onerror = () => { entry.connected = false; entry.health = 'degraded'; entry.diagnostic = 'MCP transport error; reconnect explicitly'; };
    try {
      // Reserve identity before yielding; old disconnect/connect completions
      // can neither delete this entry nor return the replacement as their own.
      await previous?.client.close();
      if (this.connections.get(resource.id) !== entry) throw new Error('connection superseded');
      await client.connect(transport, { timeout: 15000 });
      const capabilities = client.getServerCapabilities() ?? {};
      const [tools, resources, prompts] = await Promise.all([
        capabilities.tools ? client.listTools({}, { timeout: 15000 }) : { tools: [] },
        capabilities.resources ? client.listResources({}, { timeout: 15000 }) : { resources: [] },
        capabilities.prompts ? client.listPrompts({}, { timeout: 15000 }) : { prompts: [] },
      ]);
      if (tools.tools.length > 100 || resources.resources.length > 100 || prompts.prompts.length > 100) throw new Error('catalog limit');
      // Short host tool names avoid model-specific identifier limits. The
      // descriptor retains the original name and server identity separately.
      const mappedTools = tools.tools.map(t => ({ ...t, hostName: 'mcp_' + digest(resource.id + '\0' + t.name).slice(0, 24) }));
      if (Buffer.byteLength(JSON.stringify([mappedTools, resources.resources, prompts.prompts]), 'utf8') > 200000) throw new Error('catalog size limit');
      if (this.connections.get(resource.id) !== entry) throw new Error('connection superseded');
      entry.tools = mappedTools;
      entry.resources = resources.resources;
      entry.prompts = prompts.prompts;
      entry.connected = true;
      entry.health = 'healthy';
      entry.protocol = client.getNegotiatedProtocolVersion();
      entry.era = client.getProtocolEra();
      entry.server = client.getServerVersion() ?? null;
    } catch (cause) {
      await client.close().catch(() => {});
      entry.connected = false; entry.health = 'error'; entry.diagnostic = 'Connection or discovery failed. Verify endpoint, protocol and authentication requirements.';
      throw new Error(entry.diagnostic, { cause });
    }
    return this.inspect(resource.id, resource.content);
  }
  toolsFor(binding, onUnknown) {
    return binding.resources.filter(r => r.kind === 'tool' && r.mcp && r.exposed).map(r => ({
      name: r.executionName, label: r.title, description: r.description || r.title, parameters: r.inputSchema,
      execute: async (callId, args, signal) => {
        const entry = this.connections.get(r.mcp.serverId);
        if (!entry?.connected || entry.hash !== r.mcp.configHash) throw new Error('MCP provider is no longer connected to the bound configuration');
        if (signal?.aborted) throw new Error('MCP call canceled before dispatch');
        try {
          const result = await entry.client.callTool({ name: r.mcp.name, arguments: args }, { signal, timeout: 60000 });
          if (result.isError) throw Object.assign(new Error('MCP tool reported a failure'), { reported: true });
          // Preserve supported Pi text/image blocks; keep other MCP content as
          // explicit JSON evidence instead of pretending it was rendered.
          const content = result.content?.map(c => c.type === 'text' || c.type === 'image' ? c : { type: 'text', text: JSON.stringify(c) }) ?? [];
          if (!content.length && result.structuredContent !== undefined) content.push({ type: 'text', text: JSON.stringify(result.structuredContent) });
          return { content, details: { serverId: r.mcp.serverId, tool: r.mcp.name } };
        } catch (error) {
          // A business error says a response arrived, not that no effect happened.
          // The owner closes admission before attempting durable settlement.
          await onUnknown({ callId, serverId: r.mcp.serverId, tool: r.mcp.name,
            configHash: r.mcp.configHash, bindingHash: binding.hash ?? null,
            bindingRevision: binding.revision ?? null,
            failureKind: error.reported ? 'tool-reported-error' : 'result-unavailable' });
          throw new Error(error.reported
            ? 'MCP tool reported a failure; remote effects may have occurred. Do not retry automatically.'
            : 'MCP result is unknown; remote effects may have occurred. Do not retry automatically.');
        }
      },
    }));
  }
  async close() { await Promise.all([...this.connections.keys()].map(id => this.disconnect(id))); }
}
