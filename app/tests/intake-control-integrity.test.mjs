import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { boot, reopen } from './helpers.mjs';
import { ProfileStore } from '../server/profile-store.mjs';

const MIB = 1024 * 1024;
async function control(h, session) {
  const suffix = '?sessionId=' + session.id;
  const get = async () => (await h.api('GET', '/runtime-control' + suffix)).json;
  const change = async body => h.api('PUT', '/runtime-control' + suffix, { revision: (await get()).revision, ...body });
  return { get, change };
}
const profileContent = JSON.stringify({ schemaVersion: 1, version: '1', resourceIds: ['tool:ws_read'], rules: [], uiSlots: [] });
const sessionEntries = (config, id) => ['resources', 'overrides', 'policies', 'profileSelections']
  .flatMap(key => config[key]).filter(item => item.scope.type === 'session' && item.scope.id === id);

test('a material name differing only by letter case is refused instead of overwriting the delivered file', async t => {
  const h = await boot(); t.after(() => h.runtime.close());
  const s = await h.createSession();
  const first = await h.api('POST', `/sessions/${s.id}/materials`, { name: 'Brief.md', text: 'ONE', commandId: '1', expectedRevision: 0 });
  assert.equal(first.status, 200);
  const clash = await h.api('POST', `/sessions/${s.id}/materials`, { name: 'brief.md', text: 'TWO', commandId: '2', expectedRevision: 0 });
  assert.equal(clash.status, 409);
  assert.equal(clash.json.error.code, 'material_name_conflict');
  assert.match(clash.json.error.message, /Brief\.md/);
  assert.equal(await readFile(path.join(s.workspaceDir, 'materials/Brief.md'), 'utf8'), 'ONE');
  assert.deepEqual((await h.api('GET', `/sessions/${s.id}/materials`)).json.sources.map(x => [x.name, x.latestRevision]), [['Brief.md', 1]]);
  const again = await h.api('POST', `/sessions/${s.id}/materials`, { name: 'Brief.md', text: 'THREE', commandId: '3', expectedRevision: 1 });
  assert.equal(again.status, 200, 'the exact name still adds a version');
  assert.equal(again.json.latestRevision, 2);
});

test('concurrent profile saves from one revision: exactly one lands, over HTTP and on the store directly', async t => {
  const h = await boot(); t.after(() => h.runtime.close());
  const current = (await h.api('GET', '/profile')).json.profile;
  const results = await Promise.all(['Alice', 'Bob'].map(fullName => h.api('PUT', '/profile', { expectedRevision: current.revision, fullName })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(results.find(r => r.status === 409).json.error.code, 'profile_conflict');
  const winner = results.find(r => r.status === 200).json.profile;
  const after = (await h.api('GET', '/profile')).json.profile;
  assert.equal(after.revision, current.revision + 1);
  assert.equal(after.fullName, winner.fullName);

  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-profile-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const store = new ProfileStore({ dataDir });
  await store.initialize();
  const direct = await Promise.allSettled(['A', 'B', 'C'].map(fullName => store.save({ expectedRevision: 0, fullName })));
  assert.equal(direct.filter(r => r.status === 'fulfilled').length, 1);
  assert.ok(direct.filter(r => r.status === 'rejected').every(r => r.reason.code === 'profile_conflict'));
  const disk = JSON.parse(await readFile(path.join(dataDir, 'profile.json'), 'utf8'));
  assert.equal(disk.revision, 1);
  assert.equal(disk.fullName, direct.find(r => r.status === 'fulfilled').value.fullName);
});

test('a profile is selectable only at a scope its own scope contains', async t => {
  const h = await boot(); t.after(() => h.runtime.close());
  const a = await h.createSession(); const b = await h.createSession();
  const c = await control(h, a);
  const sessionScope = { type: 'session', id: a.id }, userScope = { type: 'user', id: 'local' };
  assert.equal((await c.change({ operation: 'put', resource: { id: 'local:p1', kind: 'agent_profile', title: 'P', scope: sessionScope, content: profileContent } })).status, 200);
  const wide = await c.change({ operation: 'profile', scope: userScope, id: 'local:p1' });
  assert.equal(wide.status, 409);
  assert.equal(wide.json.error.code, 'profile_scope_conflict');
  assert.equal((await h.api('GET', '/runtime-control?sessionId=' + b.id)).json.composition.id, 'agent:general', 'another Session is untouched');
  assert.equal((await c.change({ operation: 'profile', scope: sessionScope, id: 'local:p1' })).status, 200);
  assert.equal((await c.change({ operation: 'put', resource: { id: 'local:p2', kind: 'agent_profile', title: 'P2', scope: userScope, content: profileContent } })).status, 200);
  assert.equal((await c.change({ operation: 'profile', scope: sessionScope, id: 'local:p2' })).status, 200, 'a user profile covers the session');
  assert.equal((await c.change({ operation: 'profile', scope: { type: 'workspace', id: a.projectId }, id: 'local:p2' })).status, 200);
});

test('deleting a Session removes its runtime-control entries; leftovers are removed at startup', async t => {
  const h = await boot();
  let closed = false;
  t.after(() => closed || h.runtime.close());
  const a = await h.createSession(); const b = await h.createSession(); const keep = await h.createSession();
  const scopeOf = s => ({ type: 'session', id: s.id });
  for (const s of [a, b, keep]) {
    const c = await control(h, s);
    assert.equal((await c.change({ operation: 'put', resource: { id: `local:i-${s.id.slice(0, 8)}`, kind: 'instruction', title: 'I', scope: scopeOf(s), content: 'x'.repeat(1000) } })).status, 200);
    assert.equal((await c.change({ operation: 'put', resource: { id: `local:p-${s.id.slice(0, 8)}`, kind: 'agent_profile', title: 'P', scope: scopeOf(s), content: profileContent } })).status, 200);
    assert.equal((await c.change({ operation: 'profile', scope: scopeOf(s), id: `local:p-${s.id.slice(0, 8)}` })).status, 200);
    assert.equal((await c.change({ operation: 'exposure', scope: scopeOf(s), id: 'tool:ws_write', exposed: false })).status, 200);
    assert.equal((await c.change({ operation: 'policy', scope: scopeOf(s), rules: [{ action: 'ws_read', resource: '*', effect: 'ask' }] })).status, 200);
  }
  const before = h.runtime.service.control.config.revision;
  const deleted = await h.api('DELETE', '/sessions/' + a.id);
  assert.equal(deleted.status, 200);
  assert.equal(deleted.json.runtimeControlCleanup, 'complete');
  const config = h.runtime.service.control.config;
  assert.deepEqual(sessionEntries(config, a.id), []);
  assert.equal(config.revision, before + 1);
  assert.equal(sessionEntries(config, keep.id).length, 5);
  assert.deepEqual(sessionEntries(JSON.parse(await readFile(path.join(h.dataDir, 'runtime-control.json'), 'utf8')), a.id), []);

  // A failed cleanup write leaves the deletion standing and is repaired at startup.
  const plane = h.runtime.service.control;
  plane.removeSessionScopes = async () => { throw new Error('disk full'); };
  const second = await h.api('DELETE', '/sessions/' + b.id);
  assert.equal(second.status, 200);
  assert.equal(second.json.runtimeControlCleanup, 'deferred');
  assert.equal((await h.api('GET', '/runtime-control?sessionId=' + b.id)).status, 404);
  assert.equal(sessionEntries(plane.config, b.id).length, 5);
  await h.runtime.close(); closed = true;

  const r = await reopen(h.dataDir);
  try {
    const recovered = r.runtime.service.control.config;
    assert.deepEqual(sessionEntries(recovered, b.id), []);
    assert.equal(sessionEntries(recovered, keep.id).length, 5);
    assert.equal(recovered.audit.at(-1).operation, 'session_removed');
  } finally { await r.runtime.close(); }
});

test('material uploads have a body limit covering JSON escaping; other routes answer over-limit bodies with a typed 413', async t => {
  const h = await boot(); t.after(() => h.runtime.close());
  const s = await h.createSession();
  const post = (name, text) => h.api('POST', `/sessions/${s.id}/materials`, { name, text });
  assert.equal((await post('a.md', 'a'.repeat(MIB))).status, 200, 'exactly 1 MiB reaches the service');
  assert.equal((await post('n.md', '\n'.repeat(MIB))).status, 200, 'two-character escapes');
  assert.equal((await post('c.md', '\u0001'.repeat(MIB))).status, 200, 'six-character escapes, the worst case');
  const over = await post('o.md', 'a'.repeat(MIB + 1));
  assert.equal(over.status, 400);
  assert.equal(over.json.error.code, 'invalid_input');
  const huge = await post('h.md', 'a'.repeat(7 * MIB));
  assert.equal(huge.status, 413);
  assert.equal(huge.json.error.code, 'body_too_large');
  const profile = await h.api('PUT', '/profile', { expectedRevision: 0, fullName: 'a'.repeat(2 * MIB) });
  assert.equal(profile.status, 413, 'the default limit still applies elsewhere');
  assert.equal(profile.json.error.code, 'body_too_large');
});

test('a ws_* path policy is matched without case so an alias cannot bypass it', async t => {
  const h = await boot(); t.after(() => h.runtime.close());
  const s = await h.createSession();
  const c = await control(h, s);
  assert.equal((await c.change({ operation: 'policy', scope: { type: 'session', id: s.id }, rules: [{ action: 'ws_write', resource: 'out/private*', effect: 'deny' }] })).status, 200);
  await mkdir(path.join(s.workspaceDir, 'out'), { recursive: true });
  await writeFile(path.join(s.workspaceDir, 'out/private.md'), 'ORIGINAL');
  const created = await h.api('POST', `/sessions/${s.id}/runs`, { commandId: 'c1', input: h.scriptInput([{ name: 'ws_write', arguments: { path: 'out/PRIVATE.md', text: 'OVERWRITTEN' } }]) });
  const done = await h.pollRun(created.json.run.id);
  assert.deepEqual(done.artifacts, []);
  assert.equal(await readFile(path.join(s.workspaceDir, 'out/private.md'), 'utf8'), 'ORIGINAL');
  assert.deepEqual(await readdir(path.join(s.workspaceDir, 'out')), ['private.md']);
});
