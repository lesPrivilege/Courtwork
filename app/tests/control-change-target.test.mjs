import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { boot } from './helpers.mjs';

// One configuration change has one target (scope and id). The Session's scope
// chain, storage, the exposure override, the MCP disconnect and the audit
// record all read that target; a body naming a second one is refused.
const user = { type: 'user', id: 'local' };
async function setup() {
  const h = await boot();
  const a = await h.createSession(); const b = await h.createSession();
  const scopeOf = s => ({ type: 'session', id: s.id });
  const get = async s => (await h.api('GET', '/runtime-control' + (s ? '?sessionId=' + s.id : ''))).json;
  const put = async (s, body) => h.api('PUT', '/runtime-control' + (s ? '?sessionId=' + s.id : ''), { revision: (await get(s)).revision, ...body });
  const file = () => readFile(path.join(h.dataDir, 'runtime-control.json'), 'utf8');
  const disconnected = [];
  const mcp = h.runtime.service.mcp, disconnect = mcp.disconnect.bind(mcp);
  mcp.disconnect = async id => { disconnected.push(id); return disconnect(id); };
  const instruction = (id, scope, content = 'Text.') => ({ id, kind: 'instruction', title: id, scope, content });
  return { h, a, b, scopeOf, get, put, file, disconnected, instruction };
}
const facts = async f => ({ file: await f.file(), a: await f.get(f.a), b: await f.get(f.b) });

test('change target: a put naming Session A at the top level and Session B in the resource is refused and changes nothing', async () => {
  const f = await setup();
  try {
    const A = f.scopeOf(f.a), B = f.scopeOf(f.b);
    assert.equal((await f.put(f.b, { operation: 'put', resource: f.instruction('local:owned-by-b', B, 'B wrote this.') })).status, 200);
    const before = await facts(f); f.disconnected.length = 0;
    // A new id in B, and the id B already holds: neither may be written through A.
    for (const resource of [f.instruction('local:planted', B), f.instruction('local:owned-by-b', B, 'A replaced this.')]) {
      const refused = await f.put(f.a, { operation: 'put', scope: A, resource });
      assert.equal(refused.status, 400, 'a put with two scopes is refused');
      assert.equal(refused.json.error.code, 'invalid_runtime_config');
      assert.deepEqual(await facts(f), before, 'revision, both catalogs and the audit log are unchanged');
    }
    assert.deepEqual(f.disconnected, [], 'a refused change disconnects nothing');
  } finally { await f.h.runtime.close(); }
});

test('change target: a put whose resource scope is outside the selected chain is refused', async () => {
  const f = await setup();
  try {
    const B = f.scopeOf(f.b);
    assert.equal((await f.put(null, { operation: 'put', resource: f.instruction('local:seed', user) })).status, 200);
    const before = await facts(f);
    for (const [session, scope] of [[f.a, B], [null, B], [null, { type: 'workspace', id: f.h.projectId }], [f.a, { type: 'session', id: 'no-such-session' }]]) {
      const refused = await f.put(session, { operation: 'put', resource: f.instruction('local:outside', scope) });
      assert.equal(refused.status, 400);
      assert.equal(refused.json.error.code, 'invalid_scope');
      assert.deepEqual(await facts(f), before);
    }
  } finally { await f.h.runtime.close(); }
});

test('change target: storage, catalog, audit and MCP disconnect name the same target', async () => {
  const f = await setup();
  try {
    const A = f.scopeOf(f.a);
    const resource = { id: 'local:server', kind: 'mcp_server', title: 'Server', scope: A, content: JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: 'http://127.0.0.1:9/mcp' }) };
    const saved = await f.put(f.a, { operation: 'put', resource, exposed: false });
    assert.equal(saved.status, 200);
    const config = JSON.parse(await f.file());
    assert.deepEqual(config.resources.map(r => [r.id, r.scope]), [[resource.id, A]]);
    assert.deepEqual(config.overrides, [{ id: resource.id, scope: A, exposed: false }]);
    assert.deepEqual(saved.json.resources.find(r => r.id === resource.id).scope, A);
    const { id, scope, operation } = saved.json.audit.at(-1);
    assert.deepEqual({ id, scope, operation }, { id: resource.id, scope: A, operation: 'put' });
    assert.deepEqual(f.disconnected, [resource.id]);
    assert.equal((await f.get(f.b)).resources.some(r => r.id === resource.id), false, 'Session B does not see it');

    // A second id beside the resource would be disconnected and audited in its place.
    const before = await facts(f); f.disconnected.length = 0;
    const stray = await f.put(f.a, { operation: 'put', id: 'local:other', resource: { ...resource, title: 'Renamed' } });
    assert.equal(stray.status, 400);
    assert.equal(stray.json.error.code, 'invalid_runtime_config');
    assert.deepEqual(await facts(f), before);
    assert.deepEqual(f.disconnected, []);
  } finally { await f.h.runtime.close(); }
});

test('change target: each operation accepts its own keys only, before the revision is compared', async () => {
  const f = await setup();
  try {
    const A = f.scopeOf(f.a), B = f.scopeOf(f.b);
    const profile = { id: 'local:p', kind: 'agent_profile', title: 'P', scope: A, content: JSON.stringify({ schemaVersion: 1, version: '1', resourceIds: [], rules: [], uiSlots: [] }) };
    assert.equal((await f.put(f.a, { operation: 'put', resource: profile })).status, 200);
    assert.equal((await f.put(f.a, { operation: 'put', resource: f.instruction('local:text', A) })).status, 200);
    const audited = async body => {
      const done = await f.put(f.a, body);
      assert.equal(done.status, 200, JSON.stringify(done.json));
      const { operation, id, scope } = done.json.audit.at(-1);
      return { operation, id, scope };
    };
    assert.deepEqual(await audited({ operation: 'exposure', id: 'tool:ws_read', scope: A, exposed: false }), { operation: 'exposure', id: 'tool:ws_read', scope: A });
    assert.deepEqual(await audited({ operation: 'profile', id: 'local:p', scope: A }), { operation: 'profile', id: 'local:p', scope: A });
    assert.deepEqual(await audited({ operation: 'policy', scope: A, rules: [] }), { operation: 'policy', id: null, scope: A });
    f.disconnected.length = 0;
    // A removal names an id; the audit keeps no scope for it.
    assert.deepEqual(await audited({ operation: 'remove', id: 'local:text' }), { operation: 'remove', id: 'local:text', scope: null });
    assert.deepEqual(f.disconnected, ['local:text']);

    const before = await facts(f); f.disconnected.length = 0;
    const rules = [{ action: 'ws_read', resource: '*', effect: 'deny' }];
    const refusals = [
      { operation: 'remove', id: 'local:p', scope: B },
      { operation: 'remove', id: 'local:p', resource: profile },
      { operation: 'exposure', id: 'tool:ws_read', scope: A, exposed: true, resource: f.instruction('local:x', B) },
      { operation: 'exposure', id: 'tool:ws_read', scope: A, exposed: true, rules },
      { operation: 'profile', id: null, scope: A, exposed: true },
      { operation: 'policy', scope: A, rules, id: 'local:p' },
      { operation: 'policy', scope: A, rules, resource: profile },
      { operation: 'put', resource: f.instruction('local:y', A), rules },
      { operation: 'rename', id: 'local:p' },
      // A missing or malformed scope is a shape error of the body, not a scope outside the chain.
      { operation: 'exposure', id: 'tool:ws_read', exposed: true },
      { operation: 'profile', id: null },
      { operation: 'policy', rules },
      { operation: 'put', resource: { id: 'local:z', kind: 'instruction', title: 'Z', content: 'Text.' } },
      { operation: 'put' },
      ...[null, 'session', { type: 'session' }, { id: f.a.id }, { type: 'session', id: f.a.id, extra: true }, { type: 'user', id: 'someone' }, { type: 'org', id: 'x' }].flatMap(scope => [
        { operation: 'exposure', id: 'tool:ws_read', scope, exposed: true },
        { operation: 'profile', id: null, scope },
        { operation: 'policy', scope, rules },
        { operation: 'put', resource: f.instruction('local:z', scope) },
      ]),
    ];
    for (const body of refusals) {
      // Stale on purpose: the key set is refused before the revision is read.
      const refused = await f.h.api('PUT', '/runtime-control?sessionId=' + f.a.id, { revision: before.a.revision - 1, ...body });
      assert.equal(refused.status, 400, JSON.stringify(body));
      assert.equal(refused.json.error.code, 'invalid_runtime_config', JSON.stringify(body));
    }
    // A scope outside the chain is refused for every operation that names one.
    for (const body of [{ operation: 'exposure', id: 'tool:ws_read', scope: B, exposed: true }, { operation: 'profile', id: null, scope: B }, { operation: 'policy', scope: B, rules }]) {
      const refused = await f.put(f.a, body);
      assert.equal(refused.status, 400, JSON.stringify(body));
      assert.equal(refused.json.error.code, 'invalid_scope', JSON.stringify(body));
    }
    assert.deepEqual(await facts(f), before);
    assert.deepEqual(f.disconnected, []);
  } finally { await f.h.runtime.close(); }
});
