import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, readdir, mkdtemp, mkdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { boot, reopen } from './helpers.mjs';
import { evaluatePolicy, compileControlContext } from '../runtime/control-plane.mjs';
import { governTools, createPathAdmission } from '../runtime/control-tools.mjs';
import { createWsReadTool, createWsGrepTool, createWsListTool } from '../runtime/workspace-tools.mjs';

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

// A path policy is matched on a canonical form of the path (Unicode NFC, case
// folded), never on its spelling, for every filesystem-path action.
const NFC_NAME = 'café-secret.txt';
const NFD_NAME = NFC_NAME.normalize('NFD');
const NAME_SPELLINGS = [NFC_NAME, NFD_NAME, NFC_NAME.toUpperCase(), NFD_NAME.toUpperCase(), 'CAFé-Secret.txt'];
const PATH_FAMILIES = [['ws_read', 'materials/'], ['ws_write', 'out/'], ['ws_grep', 'materials/'], ['repo_read', 'src/'], ['repo_write', 'src/'], ['candidate_read', 'src/']];

test('path policy: a rule matches every case and Unicode-normalization spelling of its path for ws_, repo_ and candidate_ actions', () => {
  assert.notEqual(NFC_NAME, NFD_NAME);
  for (const effect of ['deny', 'ask']) for (const [action, prefix] of PATH_FAMILIES) {
    const exact = [{ scope: { type: 'session', id: 'fixture' }, rules: [{ action, resource: prefix + NFC_NAME, effect }] }];
    const glob = [{ scope: { type: 'session', id: 'fixture' }, rules: [{ action, resource: prefix + 'CAFé-*', effect }] }];
    const nfdRule = [{ scope: { type: 'session', id: 'fixture' }, rules: [{ action, resource: prefix + NFD_NAME, effect }] }];
    for (const spelling of NAME_SPELLINGS) for (const [label, layers] of [['NFC rule', exact], ['NFC glob rule', glob], ['NFD rule', nfdRule]]) {
      assert.equal(evaluatePolicy(layers, action, prefix + spelling).effect, effect, `${effect} ${action} ${label} vs ${JSON.stringify(prefix + spelling)}`);
    }
    assert.equal(evaluatePolicy(exact, action, prefix + 'other.txt').effect, 'allow', `${action} still allows a different file`);
  }
});

test('path policy: only spellings the Host volume aliases match; runtime_load ids, MCP actions and compatibility forms stay exact', () => {
  const session = { type: 'session', id: 'fixture' };
  const rule = (action, resource, effect = 'deny') => [{ scope: session, rules: [{ action, resource, effect }] }];
  // NFKC-equivalent (fullwidth) letters are a different name on APFS; leave them alone.
  assert.equal(evaluatePolicy(rule('repo_read', NFC_NAME), 'repo_read', 'ｃａｆé-secret.txt').effect, 'allow');
  assert.equal(evaluatePolicy(rule('ws_read', 'materials/' + NFC_NAME), 'ws_read', 'materials/ｃａｆé-secret.txt').effect, 'allow');
  // A runtime_load resource is an id, not a path.
  assert.equal(evaluatePolicy(rule('runtime_load', 'local:Docs'), 'runtime_load', 'local:Docs').effect, 'deny');
  assert.equal(evaluatePolicy(rule('runtime_load', 'local:Docs'), 'runtime_load', 'local:docs').effect, 'allow');
  assert.equal(evaluatePolicy(rule('runtime_load', 'local:café'), 'runtime_load', 'local:café').effect, 'allow');
  // The action pattern is unchanged: it neither folds case nor crosses families.
  assert.equal(evaluatePolicy(rule('repo_read', NFC_NAME), 'REPO_READ', NFC_NAME).effect, 'allow');
  assert.equal(evaluatePolicy(rule('repo_read', NFC_NAME), 'ws_read', NFC_NAME).effect, 'allow');
  assert.equal(evaluatePolicy(rule('mcp.local:Server.Read', '*'), 'mcp.local:server.read', '*', 'allow', 'allow').effect, 'allow');
});

function pathHarness(rules, { requestPermission } = {}) {
  const executed = [];
  const names = ['ws_read', 'ws_write', 'repo_read', 'repo_write', 'candidate_read'];
  const tools = names.map(name => ({ name, execute: async (_id, args) => { executed.push([name, args.path]); return { content: [] }; } }));
  return { executed, names, build: workspaceDir => governTools(tools, {
    binding: { resources: names.map(name => ({ id: 'tool:' + name, exposed: true })), policies: [{ scope: { type: 'session', id: 'fixture' }, rules }] },
    permissionMode: 'draft', workspaceDir, isOpen: () => true, requestPermission: requestPermission ?? (async () => 'deny'),
  }) };
}

test('policy: governed calls of a path-denied or path-asked file are stopped for its NFD and case spellings, per tool family', async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), 'cw-path-policy-ws-'));
  try {
    await mkdir(path.join(workspaceDir, 'materials'), { recursive: true });
    await mkdir(path.join(workspaceDir, 'out'), { recursive: true });
    const asked = [];
    const rules = [
      { action: 'ws_read', resource: 'materials/' + NFC_NAME, effect: 'deny' },
      { action: 'candidate_read', resource: NFC_NAME, effect: 'deny' },
      { action: 'repo_read', resource: NFC_NAME, effect: 'deny' },
      { action: 'ws_write', resource: 'out/' + NFC_NAME, effect: 'ask' },
      { action: 'repo_write', resource: NFC_NAME, effect: 'ask' },
    ];
    const h = pathHarness(rules, { requestPermission: async request => { asked.push([request.tool, request.path]); return 'deny'; } });
    const tools = Object.fromEntries(h.build(workspaceDir).map(tool => [tool.name, tool]));
    for (const spelling of NAME_SPELLINGS) {
      for (const [name, prefix] of [['ws_read', 'materials/'], ['repo_read', ''], ['candidate_read', '']]) {
        await assert.rejects(tools[name].execute('c', { path: prefix + spelling }), /Runtime policy denied/, `${name} ${JSON.stringify(spelling)}`);
      }
      for (const [name, prefix] of [['ws_write', 'out/'], ['repo_write', '']]) {
        await assert.rejects(tools[name].execute('c', { path: prefix + spelling, text: 'x' }), /denied by the user/, `${name} ${JSON.stringify(spelling)}`);
      }
    }
    assert.deepEqual(h.executed, [], 'no denied or refused call reaches its tool');
    assert.equal(asked.length, NAME_SPELLINGS.length * 2, 'every asked spelling raised a permission question');
    await tools.repo_read.execute('c', { path: 'other.txt' });
    assert.deepEqual(h.executed, [['repo_read', 'other.txt']]);
  } finally { await rm(workspaceDir, { recursive: true, force: true }); }
});

async function hostVolumeAliasesNormalization(dir) {
  await writeFile(path.join(dir, NFC_NAME), 'alias probe');
  try { return (await stat(path.join(dir, NFD_NAME))).ino === (await stat(path.join(dir, NFC_NAME))).ino; }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

test('policy: real ws_read of an NFC-named denied file is refused for its NFD and upper-case spellings (skips unless the Host volume aliases NFC and NFD)', async t => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), 'cw-path-policy-real-'));
  try {
    await mkdir(path.join(workspaceDir, 'materials'), { recursive: true });
    if (!await hostVolumeAliasesNormalization(path.join(workspaceDir, 'materials'))) { t.skip('Host test volume does not alias NFC and NFD spellings'); return; }
    await writeFile(path.join(workspaceDir, 'materials', NFC_NAME), 'REAL-ALIAS-SENTINEL');
    const binding = { resources: [{ id: 'tool:ws_read', exposed: true }], policies: [{ scope: { type: 'session', id: 'fixture' }, rules: [{ action: 'ws_read', resource: 'materials/' + NFC_NAME, effect: 'deny' }] }] };
    const [read] = governTools([createWsReadTool({ workspaceDir })], { binding, permissionMode: 'draft', workspaceDir, isOpen: () => true, requestPermission: async () => 'allow' });
    for (const spelling of NAME_SPELLINGS) await assert.rejects(read.execute('c', { path: 'materials/' + spelling }), /Runtime policy denied ws_read/, JSON.stringify(spelling));
  } finally { await rm(workspaceDir, { recursive: true, force: true }); }
});

test('policy: ws_grep and ws_list withhold a file whose on-disk name is NFD when the ws_read rule is written NFC', async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), 'cw-path-policy-grep-'));
  try {
    await mkdir(path.join(workspaceDir, 'materials'), { recursive: true });
    await writeFile(path.join(workspaceDir, 'materials', NFD_NAME), 'SENTINEL in the private file');
    await writeFile(path.join(workspaceDir, 'materials', 'open.txt'), 'SENTINEL in the open file');
    const binding = { resources: ['ws_grep', 'ws_list'].map(name => ({ id: 'tool:' + name, exposed: true })),
      policies: [{ scope: { type: 'session', id: 'fixture' }, rules: [{ action: 'ws_read', resource: 'materials/' + NFC_NAME, effect: 'deny' }] }] };
    const admitPath = createPathAdmission({ binding, permissionMode: 'draft' });
    const tools = Object.fromEntries(governTools([createWsGrepTool({ workspaceDir, admitPath }), createWsListTool({ workspaceDir, admitPath })],
      { binding, permissionMode: 'draft', workspaceDir, isOpen: () => true, requestPermission: async () => 'allow' }).map(tool => [tool.name, tool]));
    const grepped = await tools.ws_grep.execute('c', { pattern: 'SENTINEL' });
    assert.deepEqual(grepped.details.matches.map(match => match.path), ['materials/open.txt']);
    assert.equal(grepped.details.excludedByPolicy, 1);
    assert.ok(!JSON.stringify(grepped).includes('private file'), 'the withheld content never reaches the model');
    const listed = (await tools.ws_list.execute('c', {})).details.files;
    assert.equal(listed.find(file => file.path === 'materials/open.txt').sha256.length, 64);
    assert.equal(listed.find(file => file.path === 'materials/' + NFD_NAME).sha256, undefined);
  } finally { await rm(workspaceDir, { recursive: true, force: true }); }
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

test('policy: a ws_read deny reaches ws_grep and ws_list through the Host, without a permission question', async () => {
  const h = await boot();
  try {
    const session = await h.createSession(); const c = await control(h, session);
    for (const [name, text] of [['open.txt', 'SENTINEL in the open file'], ['secret.txt', 'SENTINEL in the private file']]) {
      assert.equal((await h.api('POST', `/sessions/${session.id}/materials`, { name, text })).status, 200);
    }
    await c.change({ operation: 'policy', scope: c.scope, rules: [{ action: 'ws_read', resource: 'materials/secret.txt', effect: 'deny' }] });
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'ws-aggregate', input: h.scriptInput([{ name: 'ws_grep', arguments: { pattern: 'SENTINEL' } }, { name: 'ws_list', arguments: {} }]) });
    assert.equal((await h.pollRun(created.json.run.id)).status, 'completed');
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    assert.equal(events.some(e => e.type === 'permission.open'), false);
    const results = Object.fromEntries(events.filter(e => e.runId === created.json.run.id && e.type === 'tool.result').map(e => [e.data.name, e.data]));
    assert.equal(results.ws_grep.isError, false, JSON.stringify(results.ws_grep));
    assert.match(results.ws_grep.text, /materials\/open\.txt/);
    assert.ok(!results.ws_grep.text.includes('private file'), 'denied content must not reach the model');
    const listed = JSON.parse(results.ws_list.text);
    assert.equal(listed.find(f => f.path === 'materials/open.txt').sha256.length, 64);
    assert.equal(listed.find(f => f.path === 'materials/secret.txt').sha256, undefined);
  } finally { await h.runtime.close(); }
});

// D10: the advisory evaluation is the dispatch decision, not a second opinion.
// Every tool that has a host ceiling is made exposed here (repo_write, check_run,
// spark_explore and message_other_agent exist only when their surface is bound),
// and each (mode, tool, resource) must equal what governTools would apply.
test('policy: the advisory evaluation equals dispatch admission for every host ceiling and permission mode', async () => {
  const h = await boot();
  try {
    const tools = ['ws_read', 'ws_write', 'repo_write', 'check_run', 'spark_explore', 'message_other_agent'];
    for (const mode of ['read_only', 'draft', 'ask']) {
      const session = await h.createSession({ permissionMode: mode });
      const real = h.runtime.service.getRuntimeControl(session.id);
      const resources = [...real.resources.filter(r => !tools.includes(r.id.slice(5))),
        ...tools.map(name => ({ id: 'tool:' + name, kind: 'tool', action: name, exposed: true })),
        { id: 'tool:mcp_0123', kind: 'tool', action: 'mcp.local:server.read', exposed: true, mcp: { serverId: 'local:server', name: 'read' } }];
      const snapshot = { ...real, resources, policies: [{ scope: { type: 'session', id: session.id }, rules: [{ action: 'repo_write', resource: 'src/*', effect: 'ask' }] }] };
      h.runtime.service.getRuntimeControl = () => snapshot;
      const admitPath = createPathAdmission({ binding: snapshot, permissionMode: mode });
      for (const name of [...tools, 'mcp_0123']) for (const resource of ['*', 'src/a.txt']) {
        const evaluated = h.runtime.service.evaluateRuntimePermission(session.id, { resourceId: 'tool:' + name, resource });
        assert.equal(evaluated.effect, admitPath(name, resource), `${name} on ${resource} in ${mode}`);
      }
    }
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
  const old = JSON.parse(await readFile(file, 'utf8')); old.schemaVersion = 3; delete old.operations; old.sessions.forEach(session => { delete session.remoteBinding; delete session.remoteActions; delete session.executorChoice; }); old.runs.forEach(run => { delete run.remoteBinding; delete run.executorBinding; }); delete old.subagents; delete old.asyncTasks; delete old.coordination; delete old.providerConnections; delete old.providerConfigurationPending; delete old.providerConfigVersion; delete old.providerVerifications; old.sessions.forEach(session => { delete session.scope; delete session.repositoryBinding; delete session.repositoryBindingRevision; delete session.repositoryBindingCommands; delete session.repositoryCandidate; delete session.repositoryCandidateRevision; delete session.repositoryCandidateCommands; delete session.repositoryWriteEffects; }); old.runs.forEach(run => { delete run.repositoryBindingSnapshot; delete run.repositoryCandidateSnapshot; delete run.kitBinding; });
  const original = JSON.stringify(old);
  await writeFile(file, original);
  const next = await reopen(h.dataDir);
  try {
    const state = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(state.schemaVersion, 22);
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
