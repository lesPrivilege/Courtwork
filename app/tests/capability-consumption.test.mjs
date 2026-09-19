import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { boot } from './helpers.mjs';

// 06 · "Save is not enabled; enabled is not used." Three chains (MCP, Skill,
// local Plugin) each prove the same four facts about a capability saved
// through the control plane:
//   1. recorded  — the save is listed, but a Run started before the enabling
//      step does not carry it as exposed/usable in its recorded binding.
//   2. exposed   — after the enabling step, the NEXT Run's recorded binding
//      shows it exposed.
//   3. used      — that same Run's events show the capability actually being
//      invoked (dispatch/result), not merely offered.
//   4. historical — a later configuration change (exposure back to false, or
//      unload) never rewrites the earlier Run's already-recorded binding.
const evidence = {};

async function control(h, session) {
  const suffix = '?sessionId=' + session.id;
  const get = async () => (await h.api('GET', '/runtime-control' + suffix)).json;
  const change = async body => h.api('PUT', '/runtime-control' + suffix, { revision: (await get()).revision, ...body });
  return { get, change, scope: { type: 'session', id: session.id } };
}

// Minimal modern-protocol MCP fixture: one tool, `capture`, that echoes its
// input text back through the real remote-call/tools-call wire path.
async function mcpFixture() {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const request = JSON.parse(raw); calls.push(request);
    if (request.id === undefined) { res.writeHead(202); res.end(); return; }
    let result;
    if (request.method === 'server/discover') result = { supportedVersions: ['2026-07-28'], capabilities: { tools: {}, resources: {}, prompts: {} } };
    else if (request.method === 'tools/list') result = { tools: [{ name: 'capture', description: 'Capture fixture text', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] };
    else if (request.method === 'resources/list') result = { resources: [] };
    else if (request.method === 'prompts/list') result = { prompts: [] };
    else if (request.method === 'tools/call') result = { content: [{ type: 'text', text: request.params.arguments.text }] };
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(result
      ? { jsonrpc: '2.0', id: request.id, result: { resultType: 'complete', ...(request.method.endsWith('/list') ? { ttlMs: 0, cacheScope: 'private' } : {}), ...result } }
      : { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'unsupported' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { calls, url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

// A local plugin fixture that (unlike the inert lifecycle probes in
// local-extension-intake.test.mjs) declares and exposes one real extension
// tool, so a scripted Run can actually call it and produce tool.start/
// tool.result evidence through the extension registry's real ABI.
async function pluginFixture(id = 'cap-probe') {
  const folder = await mkdtemp(path.join(tmpdir(), 'cw-capability-plugin-'));
  const manifest = {
    schemaVersion: 1, id, version: '1.0.0', title: 'Capability consumption probe',
    kind: 'development-extension', releaseStatus: 'development', owner: 'Synthetic test',
    applicability: 'Local intake verification', exclusions: ['No business effects'],
    declaredTools: ['se_probe_echo'], surface: null, bindingFields: [],
    stateCompatibility: 'sample-v1', rollback: 'Unload future activation',
    deprecation: null, evalObligations: ['Fixture only'],
  };
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(path.join(folder, 'index.mjs'), `
    const manifest = ${JSON.stringify(manifest)};
    export function createExtension() {
      return {
        manifest,
        async start() {},
        async dispose() {},
        async createBinding() { return {}; },
        async begin() {
          return {
            context: 'Capability consumption fixture.',
            tools: [{
              name: 'se_probe_echo',
              description: 'Echo the given text back through the extension tool loop.',
              parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
              execute: async (params) => 'probe-echo:' + params.text,
            }],
            close: async () => {},
            finish: async () => {},
          };
        },
        async projection() { return { summary: 'Capability consumption fixture' }; },
        async humanAction() { throw new Error('No actions'); },
      };
    }`);
  return { folder, manifest };
}

test('06 · MCP: saved, exposed, approved and called — binding and dispatch recorded on the Run', async () => {
  const fixture = await mcpFixture();
  const h = await boot();
  try {
    const session = await h.createSession();
    const c = await control(h, session);
    const resourceId = 'local:cap-mcp';

    const put = await c.change({ operation: 'put', resource: { id: resourceId, kind: 'mcp_server', title: 'Capability MCP', scope: c.scope, content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: fixture.url }) } });
    assert.equal(put.status, 200, JSON.stringify(put.json));

    // 1. recorded: the server is listed after save, but not exposed, and no
    // MCP-derived tool exists in the binding of a Run started now.
    let snapshot = await c.get();
    assert.ok(snapshot.resources.some(r => r.id === resourceId), 'MCP resource is listed after save');
    assert.equal(snapshot.resources.find(r => r.id === resourceId).exposed, false, 'save alone does not expose the server');

    const before = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'before-mcp', input: 'hello before capability' });
    await h.pollRun(before.json.run.id);
    const beforeContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${before.json.run.id}`);
    assert.equal(beforeContext.json.binding.resources.find(r => r.id === resourceId).exposed, false, 'save is not enabled: the earlier Run recorded it unexposed');
    assert.equal(beforeContext.json.binding.resources.some(r => r.mcp), false, 'no MCP-derived tool exists in the earlier binding');

    const connected = await h.api('POST', `/mcp/${encodeURIComponent(resourceId)}/lifecycle?sessionId=${session.id}`, { revision: (await c.get()).revision, action: 'connect' });
    assert.equal(connected.status, 200, JSON.stringify(connected.json));

    // 2. exposed: an explicit exposure mutation enables it for the NEXT Run.
    assert.equal((await c.change({ operation: 'exposure', id: resourceId, scope: c.scope, exposed: true })).status, 200);
    snapshot = await c.get();
    const tool = snapshot.resources.find(r => r.mcp);
    assert.ok(tool, 'MCP tool resource is discoverable once exposed');
    assert.equal(tool.exposed, true);

    // 3. used: the Run calls the tool; consent is asked, and on allow the
    // remote call actually dispatches and its receipt is recorded.
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'use-mcp', input: h.scriptInput([{ name: tool.executionName, arguments: { text: 'capability payload' } }]) });
    await h.pollRun(made.json.run.id, { until: s => s === 'waiting_user' });
    let events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const question = events.find(e => e.type === 'permission.open');
    assert.ok(question, 'the tool call reaches consent before dispatch');
    await h.api('POST', `/runs/${made.json.run.id}/questions/${question.data.id}`, { decision: 'allow' });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'completed', JSON.stringify(done));
    assert.equal(fixture.calls.filter(call => call.method === 'tools/call').length, 1, 'the remote tool actually fired exactly once');

    events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const dispatched = events.find(e => e.type === 'tool.result' && e.data.mcpResult);
    assert.ok(dispatched, 'tool.result carries the recorded MCP dispatch');
    assert.ok(dispatched.data.mcpResult.dispatchId, 'a dispatchId proves the remote call actually fired, not merely that it was offered');

    // Binding recorded on the used Run.
    const usedContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(usedContext.json.binding.resources.find(r => r.mcp).exposed, true, 'the used Run recorded the tool as exposed at admission time');
    const bindingHash = usedContext.json.binding.hash;
    const bindingRevision = usedContext.json.binding.revision;

    // 4. historical: a later exposure=false does not rewrite the earlier Run's binding.
    assert.equal((await c.change({ operation: 'exposure', id: resourceId, scope: c.scope, exposed: false })).status, 200);
    assert.equal((await c.get()).resources.find(r => r.id === resourceId).exposed, false);
    const replay = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(replay.json.binding.hash, bindingHash);
    assert.equal(replay.json.binding.revision, bindingRevision);
    assert.equal(replay.json.binding.resources.find(r => r.mcp).exposed, true, 'the historical binding still shows the tool as exposed, unaffected by the later change');

    evidence.mcp = {
      resourceId, sessionId: session.id,
      runIds: { before: before.json.run.id, used: made.json.run.id },
      bindingRevision, bindingHash,
      exposed: { beforeSave: false, afterEnabling: true, afterLaterChange: false },
      usedEvidence: [
        { type: 'permission.open', seq: question.seq },
        { type: 'tool.result', seq: dispatched.seq, dispatchId: dispatched.data.mcpResult.dispatchId },
      ],
      historicalBindingUnchanged: replay.json.binding.hash === bindingHash && replay.json.binding.revision === bindingRevision,
    };
  } finally { await h.runtime.close(); await fixture.close(); }
});

test('06 · Skill: saved, exposed and loaded — binding and loaded content recorded on the Run', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const c = await control(h, session);
    const resourceId = 'local:cap-skill';
    const content = '---\nname: capability-review\ndescription: Review captured material\n---\nRead the bound source before responding.';

    const put = await c.change({ operation: 'put', resource: { id: resourceId, kind: 'skill', title: 'Capability Skill', scope: c.scope, content }, exposed: false });
    assert.equal(put.status, 200, JSON.stringify(put.json));

    // 1. recorded: the skill is listed after save, but not exposed, and its
    // content is not admitted into a Run started now.
    let snapshot = await c.get();
    assert.ok(snapshot.resources.some(r => r.id === resourceId), 'skill resource is listed after save');
    assert.equal(snapshot.resources.find(r => r.id === resourceId).exposed, false, 'save alone does not admit the skill to the model');

    const before = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'before-skill', input: 'hello before skill' });
    await h.pollRun(before.json.run.id);
    const beforeContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${before.json.run.id}`);
    assert.equal(beforeContext.json.binding.resources.find(r => r.id === resourceId).exposed, false, 'save is not enabled: the earlier Run recorded it unexposed');
    assert.equal(beforeContext.json.binding.content.some(r => r.id === resourceId), false, 'unexposed skill content is not admitted to the earlier Run');

    // 2. exposed: an explicit exposure mutation enables it for the NEXT Run.
    assert.equal((await c.change({ operation: 'exposure', id: resourceId, scope: c.scope, exposed: true })).status, 200);
    snapshot = await c.get();
    assert.equal(snapshot.resources.find(r => r.id === resourceId).exposed, true);

    // 3. used: the Run loads the skill; the exact saved content is returned to the model.
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'use-skill', input: h.scriptInput([{ name: 'runtime_load', arguments: { id: resourceId } }]) });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'completed', JSON.stringify(done));

    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const loadedEvent = events.find(e => e.type === 'runtime.context.loaded' && e.data.id === resourceId);
    assert.ok(loadedEvent, 'runtime.context.loaded records the exact loaded skill');
    assert.equal(loadedEvent.data.characters, content.length);
    const resultEvent = events.find(e => e.type === 'tool.result' && e.data.name === 'runtime_load');
    assert.equal(resultEvent.data.isError, false);
    assert.equal(resultEvent.data.text, content, 'the content returned to the model equals the saved content');

    // Binding recorded on the used Run.
    const usedContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(usedContext.json.binding.resources.find(r => r.id === resourceId).exposed, true, 'the used Run recorded the skill as exposed at admission time');
    const bindingHash = usedContext.json.binding.hash;
    const bindingRevision = usedContext.json.binding.revision;

    // 4. historical: a later exposure=false does not rewrite the earlier Run's binding.
    assert.equal((await c.change({ operation: 'exposure', id: resourceId, scope: c.scope, exposed: false })).status, 200);
    assert.equal((await c.get()).resources.find(r => r.id === resourceId).exposed, false);
    const replay = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(replay.json.binding.hash, bindingHash);
    assert.equal(replay.json.binding.revision, bindingRevision);
    assert.equal(replay.json.binding.resources.find(r => r.id === resourceId).exposed, true, 'the historical binding still shows the skill as exposed, unaffected by the later change');

    evidence.skill = {
      resourceId, sessionId: session.id,
      runIds: { before: before.json.run.id, used: made.json.run.id },
      bindingRevision, bindingHash,
      exposed: { beforeSave: false, afterEnabling: true, afterLaterChange: false },
      usedEvidence: [
        { type: 'runtime.context.loaded', seq: loadedEvent.seq, characters: loadedEvent.data.characters },
        { type: 'tool.result', seq: resultEvent.seq },
      ],
      loadedContentMatchesSaved: resultEvent.data.text === content,
      historicalBindingUnchanged: replay.json.binding.hash === bindingHash && replay.json.binding.revision === bindingRevision,
    };
  } finally { await h.runtime.close(); }
});

test('06 · Local plugin: registered, loaded and bound — the Run records the binding, unload leaves history untouched', async () => {
  const fixture = await pluginFixture();
  const h = await boot();
  try {
    const preview = await h.api('POST', '/extensions/preview-local', { path: fixture.folder });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    const registered = await h.api('POST', '/extensions/register-local', { previewId: preview.json.previewId, hash: preview.json.hash, trust: 'host-trusted' });
    assert.equal(registered.status, 200, JSON.stringify(registered.json));
    assert.equal(registered.json.extension.status, 'unloaded');

    const session = await h.createSession();
    const resourceId = 'plugin:' + fixture.manifest.id;

    // 1. recorded: registration is listed, but a Run started now does not
    // carry the plugin (or its declared tool) as exposed/bound.
    assert.ok((await h.api('GET', '/extensions')).json.extensions.some(e => e.id === fixture.manifest.id), 'registered plugin is listed');

    const before = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'before-plugin', input: 'hello before plugin' });
    assert.equal(before.json.run.extension, null, 'the earlier Run carries no extension binding');
    await h.pollRun(before.json.run.id);
    const beforeContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${before.json.run.id}`);
    const beforePlugin = beforeContext.json.binding.resources.find(r => r.id === resourceId);
    assert.ok(beforePlugin, 'registered plugin is recorded in the binding');
    assert.equal(beforePlugin.exposed, false, 'save alone does not enable the plugin');

    // 2. exposed/loaded: lifecycle load + session bind enables it for the NEXT Run.
    const loaded = await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'load' });
    assert.equal(loaded.status, 200, JSON.stringify(loaded.json));
    const bound = await h.api('POST', `/sessions/${session.id}/extension`, { extensionId: fixture.manifest.id, input: {} });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));

    // 3. used: the Run calls the extension's declared tool and the events
    // show it actually fired, through the real extension-registry ABI.
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'use-plugin', input: h.scriptInput([{ name: 'se_probe_echo', arguments: { text: 'capability payload' } }]) });
    const done = await h.pollRun(made.json.run.id);
    assert.equal(done.status, 'completed', JSON.stringify(done));
    assert.equal(done.extension.id, fixture.manifest.id, 'the used Run recorded its extension binding');

    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const start = events.find(e => e.type === 'tool.start' && e.data.name === 'se_probe_echo');
    const result = events.find(e => e.type === 'tool.result' && e.data.name === 'se_probe_echo');
    assert.ok(start, 'the extension tool ran inside the tool loop');
    assert.equal(result.data.isError, false);
    assert.equal(result.data.text, 'probe-echo:capability payload', 'the extension tool actually executed and returned its real result');

    // Binding recorded on the used Run.
    const usedContext = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(usedContext.json.binding.resources.find(r => r.id === resourceId).exposed, true, 'the used Run recorded the plugin as exposed at admission time');
    const bindingHash = usedContext.json.binding.hash;
    const bindingRevision = usedContext.json.binding.revision;

    // 4. historical: unload does not rewrite the earlier Run's recorded binding.
    const unloaded = await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'unload' });
    assert.equal(unloaded.status, 200, JSON.stringify(unloaded.json));
    assert.equal((await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id).status, 'unloaded');
    const replay = await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`);
    assert.equal(replay.json.binding.hash, bindingHash);
    assert.equal(replay.json.binding.revision, bindingRevision);
    assert.equal(replay.json.binding.resources.find(r => r.id === resourceId).exposed, true, 'the historical binding still shows the plugin as exposed, unaffected by the later unload');

    evidence.plugin = {
      resourceId, sessionId: session.id,
      runIds: { before: before.json.run.id, used: made.json.run.id },
      bindingRevision, bindingHash,
      exposed: { beforeSave: false, afterEnabling: true },
      usedEvidence: [
        { type: 'tool.start', seq: start.seq },
        { type: 'tool.result', seq: result.seq },
      ],
      runExtensionId: done.extension.id,
      historicalBindingUnchanged: replay.json.binding.hash === bindingHash && replay.json.binding.revision === bindingRevision,
    };
  } finally { await h.runtime.close(); }
});

/* The tracked record (engineering/execution/claude-frontend-harness-2026-09-16/
 * evidence/06-capability-consumption.json) is refreshed deliberately, never by
 * an ordinary run: its ids are random per run. Set CW_CAPABILITY_EVIDENCE to
 * the output path to write it, as governance-http does with its packets. */
after(async () => {
  const out = process.env.CW_CAPABILITY_EVIDENCE;
  if (!out) return;
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await writeFile(out, JSON.stringify(evidence, null, 2) + '\n');
});
