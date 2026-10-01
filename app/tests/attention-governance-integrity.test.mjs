import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { CoreClient } from '../core/client.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const humanA = (project = 'p') => ({ actor: 'local-user', project_id: project, purpose: 'human-attention', execution: null });
const humanG = (project = 'p') => ({ actor: 'local-user', project_id: project, purpose: 'human-governance', execution: null });
const runtime = (project = 'p') => ({ actor: 'runtime', project_id: project, purpose: 'attention-runtime', execution: { adapter_id: 'adapter', session_id: 'session', run_id: 'run' } });
const next = { kind: 'inspect', label: 'Look', trigger: 'manual', due_at: null };
const create = (id = 'a', sourceRefs = []) => ({ schema_version: 1, request_id: 'create-' + id, attention_id: id, expected_revision: 0, action: 'create', payload: { descriptor: { title: 'Item ' + id, summary: null }, reason: 'R', next_action: next, source_refs: sourceRefs, relation_refs: [] } });
const request = (action, revision, payload, id = 'a', requestId = `${action}-${revision}-${id}`) => ({ schema_version: 1, request_id: requestId, attention_id: id, expected_revision: revision, action, payload });
const aact = (core, r, ctx = humanA()) => core.call('attention_action', { context: ctx, request: r, provenance: [] });
const aq = (core, q, ctx = humanA()) => core.call('attention_query', { context: ctx, query: { schema_version: 1, ...q } });
const gq = (core, q, ctx = humanG()) => core.call('governance_query', { context: ctx, query: { schema_version: 1, ...q } });
const gact = (core, r, ctx = humanG()) => core.call('governance_action', { context: ctx, request: r });
const mref = id => ({ project_id: 'p', kind: 'matter', id });
const matterGrant = fields => ({ adapter_id: 'adapter', purpose: 'attention-runtime', fields, expires_at: '2099-01-01T00:00:00Z', content_scope: 'current' });
const attentionGrant = fields => ({ adapter_id: 'adapter', purpose: 'attention-runtime', fields, expires_at: '2099-01-01T00:00:00Z' });

async function seed(core, id = 'm', text = 'evidence ' + id) {
  const source = { id: 's-' + id, version: 1, text, digest: hash(text) };
  await core.createMatter({ matterId: id, title: id + ' title', source, contractVersion: 'se-contract-v5.0' });
  await core.call('claim_work', { matter_id: id, project_id: 'p', extension_id: 'evidence-memo' });
  return source;
}
async function discloseMatter(core, id, fields, requestId) {
  const view = await gq(core, { kind: 'inspect', object_ref: mref(id) });
  return gact(core, { schema_version: 1, request_id: requestId, matter_id: id, expected_policy_revision: view.policy.revision, expected_object_version: view.object_version, grant: matterGrant(fields) });
}
async function fixture(fn) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-att-gov-integrity-'));
  const core = new CoreClient({ dataDir });
  try { await core.start(); await fn(core, dataDir); }
  finally { await core.close(); await rm(dataDir, { recursive: true, force: true }); }
}
function sql(db, source) {
  const r = spawnSync('python3', ['-c', `import sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\n${source}\nc.commit()\nc.close()`, db], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

test('D1: one over-budget or unsupported Matter is an unavailable registry entry, not a failed page', () => fixture(async (core, dir) => {
  await seed(core, 'm'); await seed(core, 'n'); await seed(core, 'o');
  await discloseMatter(core, 'm', ['registry', 'sources'], 'grant-m');
  const large = Array.from({ length: 129 }, (_, i) => ({ id: 'many-' + i, version: 1, text: 'x', digest: hash('x') }));
  await core.call('replace_sources', { matter_id: 'm', sources: large, revision: 2 });
  await core.close();
  sql(path.join(dir, 'state.db'), "c.execute(\"INSERT INTO app_work_data VALUES('o','{\\\"schemaVersion\\\":2}')\")");
  const reopened = new CoreClient({ dataDir: dir });
  try {
    const page = await gq(reopened, { kind: 'registry', object_kind: 'matter' });
    assert.deepEqual(page.items.map(e => [e.object_ref.id, e.availability, e.availability_reason ?? null, 'object_version' in e]),
      [['m', 'unavailable', 'GOVERNANCE_LIMIT', false], ['n', 'retained', null, true], ['o', 'unavailable', 'CONTRACT_UNSUPPORTED', false]]);
    assert.equal(page.items[0].descriptor.title, 'm title');
    // Deterministic: the same collection version, and continuation binds to it.
    assert.equal((await gq(reopened, { kind: 'registry', object_kind: 'matter' })).collection_version, page.collection_version);
    const second = await gq(reopened, { kind: 'registry', object_kind: 'matter', offset: 1, limit: 1, expected_collection_version: page.collection_version });
    assert.equal(second.items[0].object_ref.id, 'n');
    // The object's own read keeps the explicit capacity/contract refusal.
    await assert.rejects(gq(reopened, { kind: 'inspect', object_ref: mref('m') }), { code: 'GOVERNANCE_LIMIT' });
    await assert.rejects(gq(reopened, { kind: 'inspect', object_ref: mref('o') }), { code: 'CONTRACT_UNSUPPORTED' });
    // A runtime sees its granted Matter as unavailable; ungranted ones stay hidden.
    const rt = await gq(reopened, { kind: 'registry' }, runtime());
    assert.deepEqual(rt.items.map(e => [e.object_ref.id, e.availability, e.availability_reason]), [['m', 'unavailable', 'GOVERNANCE_LIMIT']]);
    await assert.rejects(gq(reopened, { kind: 'inspect', object_ref: mref('m') }, runtime()), { code: 'GOVERNANCE_LIMIT' });
  } finally { await reopened.close(); }
}));

test('D2: runtime Attention reads and signals apply the Matter source disclosure rule', () => fixture(async core => {
  const source = await seed(core, 'm');
  const ref = { kind: 'core', matter_id: 'm', source_id: source.id, version: 1, locator: 'p1', role: 'supports', digest: source.digest };
  await aact(core, create('a', [ref]));
  await aact(core, request('request_disclosure', 1, { grant: attentionGrant(['registry', 'details', 'sources', 'events', 'relations', 'signal']) }));
  const hidden = async () => {
    assert.deepEqual((await aq(core, { kind: 'inspect', attention_id: 'a' }, runtime())).source_refs, []);
    await assert.rejects(aq(core, { kind: 'source', attention_id: 'a', source_index: 0 }, runtime()), { code: 'NOT_FOUND', detail: 'source unavailable' });
    const events = (await aq(core, { kind: 'events', attention_id: 'a' }, runtime())).events;
    assert.deepEqual(events[0].payload.source_refs, []);
    assert.equal((await gq(core, { kind: 'inspect', object_ref: { project_id: 'p', kind: 'attention', id: 'a' } }, runtime())).sources.length, 0);
    // Existing, fabricated and foreign refs all get the same refusal: no existence/digest oracle.
    const revision = (await aq(core, { kind: 'inspect', attention_id: 'a' })).revision;
    for (const candidate of [ref, { ...ref, digest: hash('guess') }, { ...ref, matter_id: 'nope' }, { ...ref, version: 9 }]) {
      await assert.rejects(aact(core, request('record_signal', revision, { text: 'x', source_refs: [candidate] }, 'a', 'sig-' + Math.random()), runtime()),
        { code: 'NOT_FOUND', detail: 'source unavailable' });
    }
    // The human view is unchanged.
    assert.deepEqual((await aq(core, { kind: 'inspect', attention_id: 'a' })).source_refs, [ref]);
    assert.equal((await aq(core, { kind: 'source', attention_id: 'a', source_index: 0 })).text, source.text);
  };
  await hidden();  // no Matter grant
  await discloseMatter(core, 'm', ['registry', 'details'], 'grant-no-sources');
  await hidden();  // Matter grant without sources
  await discloseMatter(core, 'm', ['registry', 'sources'], 'grant-sources');
  assert.deepEqual((await aq(core, { kind: 'inspect', attention_id: 'a' }, runtime())).source_refs, [ref]);
  assert.equal((await aq(core, { kind: 'source', attention_id: 'a', source_index: 0 }, runtime())).text, source.text);
  assert.deepEqual((await aq(core, { kind: 'events', attention_id: 'a' }, runtime())).events[0].payload.source_refs, [ref]);
  const revision = (await aq(core, { kind: 'inspect', attention_id: 'a' })).revision;
  assert.equal((await aact(core, request('record_signal', revision, { text: 'cited', source_refs: [ref] }), runtime())).revision, revision + 1);
  // A source version no longer in the Matter's current source set is undisclosed again.
  await core.call('replace_sources', { matter_id: 'm', sources: [{ id: source.id, version: 2, text: 'newer', digest: hash('newer') }], revision: 2 });
  await hidden();
}));

test('D3: resolve on a resolved item requires reopen', () => fixture(async core => {
  await aact(core, create());
  await aact(core, request('resolve', 1, { reason: 'first' }));
  await assert.rejects(aact(core, request('resolve', 2, { reason: 'second' })), { code: 'INVALID_TRANSITION' });
  const state = await aq(core, { kind: 'inspect', attention_id: 'a' });
  assert.equal(state.revision, 2); assert.equal(state.reason, 'first');
  assert.ok(!state.human_actions.some(a => a.action === 'resolve'));
}));

test('D4: Attention ids that shadow literal GET /attention/<segment> routes are refused at create', () => fixture(async core => {
  const server = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const block = server.slice(server.indexOf("if (tail[0] === 'attention') {"));
  const routes = block.slice(0, block.indexOf('\n  }\n')).split('\n').filter(line => line.includes("method === 'GET'"));
  const literals = [...new Set(routes.flatMap(line => [...line.matchAll(/tail\[1\] === '([^']+)'/g)].map(m => m[1])))].sort();
  assert.deepEqual(literals, ['conversations', 'registry']);
  for (const id of literals) await assert.rejects(aact(core, create(id)), { code: 'INVALID', detail: 'Attention id is reserved by a Host route' });
  assert.equal((await aact(core, create('registry-item'))).revision, 1);
}));

test('governance action: a lone surrogate is invalid input, not an encoder crash', () => fixture(async core => {
  await seed(core, 'm');
  const view = await gq(core, { kind: 'inspect', object_ref: mref('m') });
  await assert.rejects(gact(core, { schema_version: 1, request_id: 'r', matter_id: 'm', expected_policy_revision: 0, expected_object_version: view.object_version,
    grant: { ...matterGrant(['registry']), adapter_id: 'bad\ud800' } }), { code: 'INVALID' });
}));
