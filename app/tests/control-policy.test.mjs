// Runtime control policy: rule evaluation, path-spelling equivalence and the
// governed-tool gate. Every test here is offline (no Host, no listener), so this
// file runs inside the sandboxed check recipe; the Host-level control-plane
// tests are in control-plane.test.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFile, mkdtemp, mkdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluatePolicy } from '../runtime/control-plane.mjs';
import { governTools, createPathAdmission } from '../runtime/control-tools.mjs';
import { createWsReadTool, createWsGrepTool, createWsListTool } from '../runtime/workspace-tools.mjs';

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
