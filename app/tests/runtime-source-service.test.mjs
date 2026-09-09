import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot } from './helpers.mjs';
import { resolveRuntimeSource } from '../runtime/source-resolver.mjs';

const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');
const profile = JSON.stringify({ schemaVersion: 1, version: '1.0.0', resourceIds: ['tool:ws_read', 'local:missing'], rules: [{ action: '*', resource: '*', effect: 'deny' }], uiSlots: ['runtime.inspector'] });
const skill = '---\nname: test-skill\ndescription: Synthetic resolver test\nallowed-tools: ws_write\ncompatibility: example-host\n---\n\nA body with a script reference: scripts/run.sh\n';
const mcp = JSON.stringify({ transport: 'streamable-http', protocol: '2026-07-28', url: 'http://127.0.0.1:1' });
const SOURCES = [['instruction', 'Say hello.\n'], ['reference', '条款 🙂\r\n'], ['prompt_template', 'Draft only.'], ['skill', skill], ['agent_profile', profile], ['mcp_server', mcp]];
const LOCATORS = { url: 'https://example.invalid/never-fetched', repository: 'https://example.invalid/repo.git', package: 'example-pkg@9.9.9', path: '/definitely/not/read/be5', manifest: 'https://example.invalid/manifest.json' };
const inline = (kind, content) => ({ type: 'inline', kind, title: 'Synthetic source', content });

/** Full recursive file manifest (relative path -> sha256 of bytes) used to
 * prove resolution never touches persistent configuration or the resource
 * directory. */
async function walk(dir) {
  const out = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await walk(absolute));
    else if (entry.isFile()) out[path.relative(dir, absolute)] = sha(await readFile(absolute));
  }
  return out;
}

test('BE-5: POST /runtime-sources/resolve returns exact UTF-8 identity for all six inline kinds; provenance stays unverified and nothing is imported', async () => {
  const h = await boot();
  try {
    const diskBefore = await walk(h.dataDir);
    for (const [kind, content] of SOURCES) {
      const origin = { uri: 'https://example.invalid/declared/' + kind, version: 'v1' };
      const res = await h.api('POST', '/runtime-sources/resolve', { type: 'inline', kind, title: 'Synthetic ' + kind, content, origin });
      assert.equal(res.status, 200, JSON.stringify(res.json));
      const result = res.json;
      assert.equal(result.status, 'resolved');
      assert.equal(result.disposition, 'inspect-only');
      assert.equal(result.identity.kind, kind);
      assert.equal(result.identity.contentSha256, sha(content), kind);
      assert.equal(result.identity.artifactSha256, sha(JSON.stringify({ kind, title: 'Synthetic ' + kind, content })));
      assert.equal(result.identity.bytes, Buffer.byteLength(content, 'utf8'), kind);
      assert.equal(result.identity.characters, content.length, kind);
      assert.equal(result.portable.content, content);
      assert.deepEqual(result.portable, { kind, title: 'Synthetic ' + kind, content });
      assert.equal(result.provenance.type, 'supplied-inline');
      assert.equal(result.provenance.verified, false);
      assert.deepEqual(result.provenance.declaredOrigin, origin);
      assert.deepEqual(result.capabilities.granted, []);
      assert.deepEqual(result.native, []);
      assert.equal(result.trust, 'unverified');
      assert.equal(result.adapters.length, 1);
      assert.equal(result.adapters[0].status, 'syntax-accepted');
    }
    // Resolution is not import: persistent config revision/resources and every
    // on-disk byte under the data directory are unchanged.
    const control = (await h.api('GET', '/runtime-control')).json;
    assert.equal(control.revision, 0);
    assert.equal(control.resources.filter(r => r.id.startsWith('local:')).length, 0);
    assert.deepEqual(await walk(h.dataDir), diskBefore);
  } finally { await h.runtime.close(); }
});

test('BE-5: token, origin, content-type and body-size guards plus malformed/extra-field input follow the existing host boundaries', async () => {
  const h = await boot();
  const url = p => h.runtime.url + '/api/v5' + p;
  const raw = async (p, { token = h.runtime.token, headers = {}, body } = {}) => {
    const res = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/json', ...(token === null ? {} : { 'x-work-token': token }), ...headers }, body });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  try {
    // Token: a missing or wrong x-work-token is rejected before routing.
    assert.equal((await raw('/runtime-sources/resolve', { token: 'wrong', body: JSON.stringify(inline('reference', 'x')) })).status, 401);
    assert.equal((await raw('/runtime-sources/resolve', { token: null, body: JSON.stringify(inline('reference', 'x')) })).status, 401);
    // Origin: a disallowed Origin header is rejected even with the valid token.
    assert.equal((await raw('/runtime-sources/resolve', { headers: { origin: 'http://attacker.invalid' }, body: JSON.stringify(inline('reference', 'x')) })).status, 403);
    // Content type and JSON shape follow the host body parser.
    assert.equal((await raw('/runtime-sources/resolve', { headers: { 'content-type': 'text/plain' }, body: JSON.stringify(inline('reference', 'x')) })).status, 415);
    assert.equal((await raw('/runtime-sources/resolve', { body: '{not json' })).status, 400);
    assert.equal((await raw('/runtime-sources/resolve', { body: '[]' })).status, 400);
    assert.equal((await raw('/runtime-sources/resolve', { body: 'null' })).status, 400);
    // Body size: the shared host body() reader discards any request over its
    // 1 MiB cap by destroying the request socket (pre-existing behavior for
    // every POST route; no JSON 413 reaches the client), so the fetch itself
    // is rejected and nothing is resolved.
    const oversizedBody = JSON.stringify(inline('reference', 'x'.repeat(1024 * 1024 + 64)));
    await assert.rejects(() => fetch(url('/runtime-sources/resolve'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-work-token': h.runtime.token }, body: oversizedBody }), /fetch failed|other side closed|terminated|SocketError|ECONNRESET/);
    assert.equal((await h.api('POST', '/runtime-sources/resolve', inline('reference', 'runtime still up'))).status, 200);
    // Resolver field limit is tighter than the HTTP cap: 100001 chars is a 400.
    const fieldTooLong = await h.api('POST', '/runtime-sources/resolve', inline('reference', 'x'.repeat(100001)));
    assert.equal(fieldTooLong.status, 400);
    assert.equal(fieldTooLong.json.error.code, 'invalid_runtime_config');
    // Malformed and unknown inputs produce the deterministic 400 codes of the
    // resolver / source validator, never a 500 and never silent reinterpretation.
    const malformed = [
      ['empty object', {}, 'invalid_runtime_source'],
      ['unknown type', { type: 'unknown' }, 'invalid_runtime_source'],
      ['extra envelope field', { ...inline('reference', 'x'), scope: { type: 'user', id: 'local' } }, 'invalid_runtime_source'],
      ['extra source field', { ...inline('reference', 'x'), id: 'local:ghost' }, 'invalid_runtime_source'],
      ['origin verified assertion', { ...inline('reference', 'x'), origin: { uri: 'https://x.invalid', verified: true } }, 'invalid_runtime_source'],
      ['bad locator kind', { type: 'locator', locator: 'unknown', value: 'x' }, 'invalid_runtime_source'],
      ['locator with dropped field', { type: 'locator', locator: 'url', value: 'x', content: 'ignored' }, 'invalid_runtime_source'],
      ['empty content', { ...inline('reference', '') }, 'invalid_runtime_config'],
      ['unsupported inline kind', inline('plugin', 'export default {}'), 'invalid_runtime_config'],
      ['malformed skill yaml', inline('skill', '---\nname: [\ndescription: x\n---\nbody'), 'invalid_runtime_config'],
      ['skill without frontmatter', inline('skill', 'no frontmatter'), 'invalid_runtime_config'],
      ['profile not json', inline('agent_profile', 'not json'), 'invalid_runtime_config'],
      ['profile bad ui slot', inline('agent_profile', JSON.stringify({ ...JSON.parse(profile), uiSlots: ['arbitrary-code'] })), 'invalid_runtime_config'],
      ['mcp stdio transport', inline('mcp_server', JSON.stringify({ transport: 'stdio', command: 'echo' })), 'invalid_runtime_config'],
      ['mcp credentials in url', inline('mcp_server', JSON.stringify({ ...JSON.parse(mcp), url: 'https://user:pass@example.invalid' })), 'invalid_runtime_config'],
    ];
    for (const [label, body, code] of malformed) {
      const res = await h.api('POST', '/runtime-sources/resolve', body);
      assert.equal(res.status, 400, label);
      assert.equal(res.json.error.code, code, label);
    }
  } finally { await h.runtime.close(); }
});

test('BE-5: every locator kind stays explicitly unsupported over real HTTP with an exact echo, and no content identity is invented', async () => {
  const h = await boot();
  try {
    for (const [kind, value] of Object.entries(LOCATORS)) {
      const res = await h.api('POST', '/runtime-sources/resolve', { type: 'locator', locator: kind, value });
      assert.equal(res.status, 200, kind);
      const result = res.json;
      assert.equal(result.status, 'unsupported', kind);
      assert.equal(result.reason, 'source_acquisition_not_implemented', kind);
      assert.equal(result.disposition, 'inspect-only');
      assert.equal(result.resolverVersion, 1);
      assert.deepEqual(result.source, { type: 'locator', locator: kind, value });
      assert.equal(result.identity, undefined, kind + ' must not acquire a content identity');
      assert.equal(result.portable, undefined, kind);
      assert.ok(result.diagnostics.some(line => /no locator was fetched, read, cloned or installed/i.test(line)), kind);
      assert.deepEqual(result, resolveRuntimeSource({ type: 'locator', locator: kind, value }), 'HTTP result must equal the pure resolver output');
    }
  } finally { await h.runtime.close(); }
});

test('BE-5: an isolated child probe proves locator and inline MCP resolution performs no file read, socket connect, HTTP request, fetch or child process', async () => {
  const appRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  const source = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fsProm = require('node:fs/promises');
const osMod = require('node:os');
const pathMod = require('node:path');
const fsMod = require('node:fs');
const netMod = require('node:net');
const httpMod = require('node:http');
const httpsMod = require('node:https');
const cpMod = require('node:child_process');
// Every patchable builtin is only reached through require, and patching happens
// before the runtime is imported, so the ESM bindings the runtime holds point
// at these wrappers. Delegation keeps boot I/O working while disarmed.
const blocked = new Set();
const wrap = (cat, kind, orig) => (...a) => {
  if (blocked.has(cat)) { const e = new Error('PROBE_BLOCKED:' + kind); e.code = 'PROBE_IO_BLOCKED'; throw e; }
  return orig.apply(orig, a);
};
const reads = ['readFile','readFileSync','open','openSync','createReadStream','stat','statSync','access','accessSync','readdir','readdirSync','realpath','realpathSync','lstat','lstatSync','read','readSync','openAsBlob'];
for (const name of reads) {
  if (typeof fsMod[name] === 'function') fsMod[name] = wrap('fs', 'fs.' + name, fsMod[name]);
  if (typeof fsProm[name] === 'function') fsProm[name] = wrap('fs', 'fs/p.' + name, fsProm[name]);
}
netMod.connect = wrap('net', 'net.connect', netMod.connect);
netMod.createConnection = wrap('net', 'net.createConnection', netMod.createConnection);
httpMod.request = wrap('http', 'http.request', httpMod.request);
httpMod.get = wrap('http', 'http.get', httpMod.get);
httpsMod.request = wrap('http', 'https.request', httpsMod.request);
httpsMod.get = wrap('http', 'https.get', httpsMod.get);
for (const name of ['spawn','exec','execFile','fork','spawnSync','execSync','execFileSync']) if (typeof cpMod[name] === 'function') cpMod[name] = wrap('process', 'cp.' + name, cpMod[name]);
const realFetch = globalThis.fetch;
globalThis.fetch = wrap('fetch', 'fetch', realFetch);
const arm = (...cats) => cats.forEach(c => blocked.add(c));
const disarm = () => blocked.clear();

const { startServer } = await import(${JSON.stringify(path.join(appRoot, 'server/index.mjs'))});
const { RuntimeControlPlane } = await import(${JSON.stringify(path.join(appRoot, 'runtime/control-plane.mjs'))});
const dataDir = await fsProm.mkdtemp(pathMod.join(osMod.tmpdir(), 'cw-be5-probe-'));
const runtime = await startServer({ dataDir, port: 0, logger: () => {} });
const headers = { 'content-type': 'application/json', 'x-work-token': runtime.token };
const raw = async (p, bodyObj) => {
  const res = await realFetch(runtime.url + '/api/v5' + p, { method: 'POST', headers, body: JSON.stringify(bodyObj) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};
const LOCATORS = ${JSON.stringify(LOCATORS)};
const mcpContent = ${JSON.stringify(mcp)};
const results = [];
try {
  // Warm up the route while disarmed so first-request lazy module resolution
  // (which legitimately touches the filesystem) is cached before the guards
  // are armed; the guarded rounds then measure only request handling.
  const warmInline = await raw('/runtime-sources/resolve', { type: 'inline', kind: 'reference', title: 'warm', content: 'warm-up' });
  const warmLocator = await raw('/runtime-sources/resolve', { type: 'locator', locator: 'url', value: 'https://example.invalid/warm' });
  if (warmInline.status !== 200 || warmLocator.status !== 200) results.push({ name: 'warm-up', warmInline: warmInline.status, warmLocator: warmLocator.status });
  // Negative control: the runtime's own fs/promises binding is the wrapper, so
  // an armed guard really would intercept a file read by the server code.
  const control = new RuntimeControlPlane({ dataDir });
  await control.initialize();
  arm('fs');
  try { await control.initialize(); results.push({ name: 'fs-guard reaches runtime', ok: false }); }
  catch (e) { results.push({ name: 'fs-guard reaches runtime', ok: e.code === 'PROBE_IO_BLOCKED' }); }
  disarm();
  // Negative control: the net guard blocks a new socket connect.
  arm('net');
  try { netMod.createConnection({}); results.push({ name: 'net-guard live', ok: false }); }
  catch (e) { results.push({ name: 'net-guard live', ok: e.code === 'PROBE_IO_BLOCKED' }); }
  disarm();
  // Round A: real HTTP resolves while file, node-http, fetch and child-process
  // I/O are blocked (net stays open only because the probe client needs it).
  arm('fs', 'http', 'fetch', 'process');
  const roundA = [];
  for (const [kind, value] of Object.entries(LOCATORS)) {
    const r = await raw('/runtime-sources/resolve', { type: 'locator', locator: kind, value });
    roundA.push({ kind, status: r.status, out: r.json?.status });
  }
  const inlineMcp = await raw('/runtime-sources/resolve', { type: 'inline', kind: 'mcp_server', title: 'probe mcp', content: mcpContent });
  roundA.push({ kind: 'mcp_server(inline)', status: inlineMcp.status, out: inlineMcp.json?.status });
  results.push({ name: 'roundA http under guard', roundA });
  disarm();
  // Round B: service-layer resolution with every category blocked, including
  // new socket connects; no client traffic exists in this window.
  arm('fs', 'net', 'http', 'fetch', 'process');
  const roundB = [];
  for (const [kind, value] of Object.entries(LOCATORS)) {
    const r = runtime.service.resolveRuntimeSource({ type: 'locator', locator: kind, value });
    roundB.push({ kind, status: r.status, reason: r.reason });
  }
  const svcInline = runtime.service.resolveRuntimeSource({ type: 'inline', kind: 'mcp_server', title: 'probe mcp', content: mcpContent });
  roundB.push({ kind: 'mcp_server(inline)', status: svcInline.status });
  results.push({ name: 'roundB service under full guard', roundB });
  disarm();
} catch (e) { results.push({ name: 'worker failure', error: String((e && e.stack) || e) }); }
console.log('WORKER ' + JSON.stringify(results));
await runtime.close();
await fsProm.rm(dataDir, { recursive: true, force: true });
`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk.toString(); });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const outcome = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('isolation probe timed out\n' + stdout + stderr)); }, 60000);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  assert.equal(outcome.signal, null, 'worker must exit normally\n' + stdout + stderr);
  assert.equal(outcome.code, 0, 'worker exit code\n' + stdout + stderr);
  const line = stdout.split('\n').find(l => l.startsWith('WORKER '));
  assert.ok(line, 'expected a WORKER line\n' + stdout + stderr);
  const results = JSON.parse(line.slice(7));
  const byName = Object.fromEntries(results.map(r => [r.name, r]));
  assert.equal(byName['fs-guard reaches runtime']?.ok, true, JSON.stringify(results));
  assert.equal(byName['net-guard live']?.ok, true, JSON.stringify(results));
  const roundA = byName['roundA http under guard']?.roundA ?? [];
  assert.equal(roundA.length, 6, JSON.stringify(results));
  for (const item of roundA) assert.equal(item.status, 200, JSON.stringify(results));
  assert.deepEqual(roundA.slice(0, 5).map(i => i.out), ['unsupported', 'unsupported', 'unsupported', 'unsupported', 'unsupported']);
  assert.equal(roundA[5].out, 'resolved');
  const roundB = byName['roundB service under full guard']?.roundB ?? [];
  assert.equal(roundB.length, 6, JSON.stringify(results));
  for (const item of roundB.slice(0, 5)) {
    assert.equal(item.status, 'unsupported');
    assert.equal(item.reason, 'source_acquisition_not_implemented');
  }
  assert.equal(roundB[5].status, 'resolved');
});

test('BE-5: pure resolution stays available during an active Run while config, disk, revision and the Run binding remain unchanged and nothing imports', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const scope = { type: 'session', id: session.id };
    // Establish a nonzero config revision so "unchanged" is a real assertion.
    const initial = (await h.api('GET', '/runtime-control?sessionId=' + session.id)).json;
    const changed = await h.api('PUT', '/runtime-control?sessionId=' + session.id, { revision: initial.revision, operation: 'exposure', id: 'tool:ws_read', scope, exposed: false });
    assert.equal(changed.status, 200);
    // Start a Run and hold it at an ask_user question so it stays active.
    const made = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'hold', input: h.scriptInput([{ name: 'ask_user', arguments: { prompt: 'wait' } }]) });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    await h.pollRun(made.json.run.id, { until: status => status === 'waiting_user' });
    const diskBefore = await walk(h.dataDir);
    const contextBefore = (await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`)).json;
    const snapshotBefore = (await h.api('GET', '/runtime-control?sessionId=' + session.id)).json;
    // The mutation freeze is in force while the Run is active…
    const frozen = await h.api('PUT', '/runtime-control?sessionId=' + session.id, { revision: snapshotBefore.revision, operation: 'exposure', id: 'tool:ws_read', scope, exposed: true });
    assert.equal(frozen.status, 409);
    // …but pure resolution is not a mutation and must still succeed.
    for (const [kind, content] of SOURCES) {
      const res = await h.api('POST', '/runtime-sources/resolve', inline(kind, content));
      assert.equal(res.status, 200, kind);
      assert.equal(res.json.status, 'resolved', kind);
    }
    const unsupported = await h.api('POST', '/runtime-sources/resolve', { type: 'locator', locator: 'url', value: 'https://example.invalid/active-run' });
    assert.equal(unsupported.status, 200);
    assert.equal(unsupported.json.status, 'unsupported');
    // Persisted config bytes, the control revision/snapshot and the recorded
    // Run binding are unchanged, and no resource was imported.
    const diskAfter = await walk(h.dataDir);
    assert.deepEqual(diskAfter, diskBefore);
    const snapshotAfter = (await h.api('GET', '/runtime-control?sessionId=' + session.id)).json;
    assert.equal(snapshotAfter.revision, snapshotBefore.revision);
    assert.deepEqual(snapshotAfter.resources, snapshotBefore.resources);
    const contextAfter = (await h.api('GET', `/runtime-context?sessionId=${session.id}&runId=${made.json.run.id}`)).json;
    assert.deepEqual(contextAfter, contextBefore);
    assert.equal(snapshotAfter.resources.filter(r => r.id.startsWith('local:')).length, 0, 'resolution must not import');
    const catalog = (await h.api('GET', '/runtime-resources?kind=instruction')).json;
    assert.equal(catalog.resources.filter(r => r.id.startsWith('local:')).length, 0);
    // Clean up the held Run before closing.
    await h.api('POST', `/runs/${made.json.run.id}/cancel`, {});
    await h.pollRun(made.json.run.id);
  } finally { await h.runtime.close(); }
});

test('BE-5: the service seam mirrors the pure resolver and adapts its 400s to the host error shape', async () => {
  const h = await boot();
  try {
    const { service } = h.runtime;
    const resolved = service.resolveRuntimeSource(inline('reference', 'direct'));
    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.identity.contentSha256, sha('direct'));
    assert.deepEqual(resolved, resolveRuntimeSource(inline('reference', 'direct')));
    const unsupported = service.resolveRuntimeSource({ type: 'locator', locator: 'path', value: '/etc/hosts' });
    assert.equal(unsupported.status, 'unsupported');
    // A resolver 400 surfaces as a host ServiceError carrying the resolver code.
    assert.throws(() => service.resolveRuntimeSource({ ...inline('reference', 'x'), scope: { type: 'user', id: 'local' } }),
      error => error.status === 400 && error.code === 'invalid_runtime_source');
    assert.throws(() => service.resolveRuntimeSource(inline('skill', 'not a skill')),
      error => error.status === 400 && error.code === 'invalid_runtime_config');
    // A non-object body is rejected by the same requireObject boundary as peers.
    assert.throws(() => service.resolveRuntimeSource(null), error => error.status === 400 && error.code === 'invalid_json');
    assert.throws(() => service.resolveRuntimeSource('text'), error => error.status === 400 && error.code === 'invalid_json');
    assert.throws(() => service.resolveRuntimeSource([]), error => error.status === 400 && error.code === 'invalid_json');
  } finally { await h.runtime.close(); }
});
