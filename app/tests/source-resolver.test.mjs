import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveRuntimeSource } from '../runtime/source-resolver.mjs';
import { RuntimeControlPlane } from '../runtime/control-plane.mjs';

const inline = (kind, content) => ({ type: 'inline', kind, title: 'Synthetic source', content });
const profile = JSON.stringify({ schemaVersion: 1, version: '1.0.0', resourceIds: ['tool:ws_read', 'local:missing'], rules: [{ action: '*', resource: '*', effect: 'deny' }], uiSlots: ['runtime.inspector'] });
const skill = '---\nname: test-skill\ndescription: Synthetic resolver test\nallowed-tools: ws_write\ncompatibility: example-host\n---\n\nA body with a script reference: scripts/run.sh\n';
const mcp = JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: 'http://127.0.0.1:1' });

// Import and resolution must accept the same source bytes; importing still
// requires an explicit target identity/scope and advances CAS separately.
test('R2: six inline kinds resolve without changing config, then explicit imports preserve exact bytes', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-resolver-'));
  const control = new RuntimeControlPlane({ dataDir });
  try {
    await control.initialize();
    for (const [kind, content] of [['instruction', 'Say hello.\n'], ['reference', '条款 🙂\r\n'], ['prompt_template', 'Draft only.'], ['skill', skill], ['agent_profile', profile], ['mcp_server', mcp]]) {
      const before = structuredClone(control.config);
      const result = resolveRuntimeSource(inline(kind, content));
      assert.deepEqual(control.config, before);
      assert.equal(result.identity.contentSha256, createHash('sha256').update(content).digest('hex'));
      assert.equal(result.identity.bytes, Buffer.byteLength(content));
      assert.equal(result.identity.characters, content.length);
      assert.equal(result.portable.content, content);
      assert.deepEqual(result.capabilities.granted, []);
      assert.equal(result.trust, 'unverified');
      assert.equal(result.disposition, 'inspect-only');
      await control.change({ revision: control.config.revision, operation: 'put', resource: { ...result.portable, id: `local:${kind}`, scope: { type: 'user', id: 'local' } } }, []);
      assert.equal(control.config.revision, before.revision + 1);
      assert.equal(control.config.resources.at(-1).content, content);
    }
    assert.equal(JSON.parse(await readFile(control.file, 'utf8')).resources.length, 6);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

test('R2: hashes bind bytes and interpretation; origin is only a caller assertion and outputs own their data', () => {
  const input = { ...inline('reference', 'same\r\n'), origin: { uri: 'https://example.invalid/claimed', version: 'v1' } };
  const result = resolveRuntimeSource(input);
  const reordered = resolveRuntimeSource({ content: input.content, origin: input.origin, title: input.title, kind: input.kind, type: input.type });
  assert.deepEqual(result, reordered);
  assert.notEqual(resolveRuntimeSource({ ...input, content: 'same\n' }).identity.contentSha256, result.identity.contentSha256);
  assert.notEqual(resolveRuntimeSource({ ...input, kind: 'instruction' }).identity.artifactSha256, result.identity.artifactSha256);
  assert.equal(result.provenance.verified, false);
  input.origin.version = 'changed'; input.content = 'changed';
  assert.equal(result.provenance.declaredOrigin.version, 'v1');
  assert.equal(result.portable.content, 'same\r\n');
  result.provenance.declaredOrigin.version = 'output mutation';
  assert.equal(input.origin.version, 'changed');
});

test('R2: skill/profile declarations remain unverified requirements without new capabilities', () => {
  const s = resolveRuntimeSource(inline('skill', skill));
  assert.equal(s.capabilities.declared.requestedTools, 'ws_write');
  assert.deepEqual(s.capabilities.granted, []);
  assert.deepEqual(s.native, []);
  assert.ok(s.diagnostics.some(message => message.includes('scripts and bundled assets are not resolved')));
  const p = resolveRuntimeSource(inline('agent_profile', profile));
  assert.deepEqual(p.requirements, [{ kind: 'resource', id: 'tool:ws_read', status: 'unchecked' }, { kind: 'resource', id: 'local:missing', status: 'unchecked' }]);
  assert.deepEqual(p.capabilities.granted, []);
  assert.equal(p.adapters[0].status, 'syntax-accepted');
});

test('R2: MCP and locators never fetch, connect or read their declared target', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('resolver performed network I/O'); };
  try {
    const result = resolveRuntimeSource(inline('mcp_server', mcp));
    assert.deepEqual(result.requirements, [{ kind: 'mcp-connection', status: 'unchecked' }]);
    for (const locator of ['url', 'repository', 'package', 'path', 'manifest']) {
      const unsupported = resolveRuntimeSource({ type: 'locator', locator, value: locator === 'path' ? '/definitely-not-a-real-source' : 'https://example.invalid/unreachable' });
      assert.equal(unsupported.status, 'unsupported');
      assert.equal(unsupported.reason, 'source_acquisition_not_implemented');
      assert.equal(unsupported.identity, undefined, 'unread source cannot acquire a content identity');
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('R2: malformed, executable and ambiguous sources cannot be silently reinterpreted', () => {
  for (const input of [
    null, [], { type: 'unknown' },
    { type: 'locator', locator: 'unknown', value: 'x' },
    { type: 'locator', locator: 'url', value: 'x', content: 'ignored' },
    { ...inline('reference', 'text'), scope: { type: 'user', id: 'local' } },
    { ...inline('reference', 'text'), origin: { uri: 'x', verified: true } },
    inline('plugin', 'export default {}'), inline('tool', 'code'), inline('hook', 'code'),
    inline('reference', 'x'.repeat(100001)), inline('skill', '# missing frontmatter'),
    inline('agent_profile', JSON.stringify({ ...JSON.parse(profile), uiSlots: ['arbitrary-code'] })),
    inline('mcp_server', JSON.stringify({ transport: 'stdio', command: 'echo' })),
    inline('mcp_server', JSON.stringify({ ...JSON.parse(mcp), url: 'https://user:password@example.invalid' })),
  ]) assert.throws(() => resolveRuntimeSource(input), error => error.status === 400);
});

test('R2: invalid YAML and cyclic projected metadata fail before config persistence', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-resolver-invalid-'));
  const control = new RuntimeControlPlane({ dataDir });
  try {
    await control.initialize();
    for (const content of [
      '---\nname: [\ndescription: test\n---\nbody',
      '---\nname: test\ndescription: test\nallowed-tools: &a [*a]\n---\nbody',
      '---\nname: test\ndescription: test\ncompatibility: &a { recursive: *a }\n---\nbody',
    ]) {
      assert.throws(() => resolveRuntimeSource(inline('skill', content)), error => error.status === 400 && error.code === 'invalid_runtime_config');
      await assert.rejects(control.change({ revision: 0, operation: 'put', resource: { kind: 'skill', title: 'Invalid', content, id: 'local:bad', scope: { type: 'user', id: 'local' } } }, []), error => error.status === 400);
      assert.equal(control.config.revision, 0);
      assert.deepEqual(control.config.resources, []);
      await assert.rejects(readFile(control.file), { code: 'ENOENT' });
    }
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});
