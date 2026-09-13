import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { boot, reopen } from './helpers.mjs';

async function packageFixture(id = 'local-probe') {
  const folder = await mkdtemp(path.join(tmpdir(), 'cw-extension-package-'));
  const manifest = { schemaVersion: 1, id, version: '1.0.0', title: 'Local lifecycle sample', kind: 'development-extension', releaseStatus: 'development', owner: 'Synthetic test', applicability: 'Local intake verification', exclusions: ['No business effects'], declaredTools: [], surface: null, bindingFields: [], stateCompatibility: 'sample-v1', rollback: 'Unload future activation', deprecation: null, evalObligations: ['Fixture only'] };
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(path.join(folder, 'index.mjs'), `globalThis.__cwLocalImports = (globalThis.__cwLocalImports || 0) + 1;
    const manifest = ${JSON.stringify(manifest)};
    export function createExtension() { return { manifest, async start() {}, async dispose() { globalThis.__cwLocalDisposals = (globalThis.__cwLocalDisposals || 0) + 1; }, async createBinding() { return {}; }, async begin() { return { context: 'Synthetic local extension', tools: [], close: async () => {}, finish: async () => {} }; }, async projection() { return { summary: 'Synthetic local extension' }; }, async humanAction() { throw new Error('No actions'); } }; }`);
  return { folder, manifest };
}

test('Local registration is inert, pins reviewed bytes, and loads through existing lifecycle and binding', async () => {
  const fixture = await packageFixture(); const h = await boot();
  const before = globalThis.__cwLocalImports || 0;
  try {
    const preview = await h.api('POST', '/extensions/preview-local', { path: fixture.folder });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.equal(preview.json.disposition, 'inspect-only');
    assert.equal(globalThis.__cwLocalImports || 0, before);
    const input = { previewId: preview.json.previewId, hash: preview.json.hash, trust: 'host-trusted' };
    const missingTrust = await h.api('POST', '/extensions/register-local', { ...input, trust: 'untrusted' });
    assert.equal(missingTrust.status, 400);
    await writeFile(path.join(fixture.folder, 'index.mjs'), 'throw new Error("unreviewed source change");');
    const registered = await h.api('POST', '/extensions/register-local', input);
    assert.equal(registered.status, 200, JSON.stringify(registered.json));
    assert.equal(registered.json.extension.status, 'unloaded');
    assert.equal(registered.json.extension.source.hash, preview.json.hash);
    assert.equal(globalThis.__cwLocalImports || 0, before);
    const loaded = await h.api('POST', '/extensions/local-probe/lifecycle', { action: 'load' });
    assert.equal(loaded.status, 200, JSON.stringify(loaded.json));
    assert.equal(globalThis.__cwLocalImports, before + 1);
    const session = await h.createSession();
    assert.equal((await h.api('POST', `/sessions/${session.id}/extension`, { extensionId: 'local-probe', input: {} })).status, 200);
    const created = await h.api('POST', `/sessions/${session.id}/runs`, { commandId: 'local-extension-intake', input: 'Hello from the local extension.' });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    assert.equal((await h.pollRun(created.json.run.id)).status, 'completed');
    const unloaded = await h.api('POST', '/extensions/local-probe/lifecycle', { action: 'unload' });
    assert.equal(unloaded.status, 200);
    assert.ok(globalThis.__cwLocalDisposals > 0);
    assert.equal((await h.api('GET', `/sessions/${session.id}/surface`)).json.projection.readOnly, true);
  } finally { await h.runtime.close(); }
  const resumed = await reopen(h.dataDir);
  try {
    const entry = (await resumed.api('GET', '/extensions')).json.extensions.find(e => e.id === 'local-probe');
    assert.equal(entry.status, 'unloaded');
    assert.equal(entry.isolation, 'in-process');
    assert.equal(globalThis.__cwLocalImports, before + 1, 'unloaded package is not imported at restart');
  } finally { await resumed.runtime.close(); }
});

test('Local intake rejects symbolic links, malformed manifests and stale previews without loading code', async () => {
  const fixture = await packageFixture('local-negative'); const h = await boot();
  try {
    const stale = await h.api('POST', '/extensions/register-local', { previewId: 'missing', hash: 'a'.repeat(64), trust: 'host-trusted' });
    assert.equal(stale.status, 409);
    await symlink(path.join(fixture.folder, 'index.mjs'), path.join(fixture.folder, 'linked.mjs'));
    assert.equal((await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).status, 400);
    const invalid = await packageFixture('bad-local');
    await writeFile(path.join(invalid.folder, 'manifest.json'), JSON.stringify({ ...invalid.manifest, surface: { id: 'outside', title: 'outside', module: '/extensions/outside.mjs' } }));
    assert.equal((await h.api('POST', '/extensions/preview-local', { path: invalid.folder })).status, 400);
    assert.equal((await h.api('GET', '/extensions')).json.extensions.some(e => e.id === 'local-negative'), false);
  } finally { await h.runtime.close(); }
});

test('Registered snapshot tampering fails closed before a local module import', async () => {
  const fixture = await packageFixture('tamper-probe'); const h = await boot();
  try {
    const preview = (await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).json;
    await h.api('POST', '/extensions/register-local', { previewId: preview.previewId, hash: preview.hash, trust: 'host-trusted' });
    const originalImports = globalThis.__cwLocalImports || 0;
    const saved = path.join(h.dataDir, 'local-extensions', 'packages', preview.hash, 'index.mjs');
    await writeFile(saved, (await readFile(saved, 'utf8')) + '\n// unreviewed change');
    const loaded = await h.api('POST', '/extensions/tamper-probe/lifecycle', { action: 'load' });
    assert.equal(loaded.status, 409);
    assert.equal(globalThis.__cwLocalImports || 0, originalImports);
  } finally { await h.runtime.close(); }
});

test('An executable that violates its reviewed ABI is disposed before load fails', async () => {
  const fixture = await packageFixture('invalid-abi-probe'); const h = await boot();
  try {
    await writeFile(path.join(fixture.folder, 'index.mjs'), `export function createExtension() { return { manifest: ${JSON.stringify(fixture.manifest)}, async dispose() { globalThis.__cwInvalidAbiDisposed = true; } }; }`);
    const preview = (await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).json;
    await h.api('POST', '/extensions/register-local', { previewId: preview.previewId, hash: preview.hash, trust: 'host-trusted' });
    const loaded = await h.api('POST', '/extensions/invalid-abi-probe/lifecycle', { action: 'load' });
    assert.equal(loaded.status, 409);
    assert.equal(globalThis.__cwInvalidAbiDisposed, true);
    assert.notEqual((await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id).status, 'loaded');
  } finally { await h.runtime.close(); }
});

test('Local startup failure disposes synchronous instances both on Load and on restart', async () => {
  for (const duringRestart of [false, true]) {
    const fixture = await packageFixture('start-failure-' + (duringRestart ? 'restart' : 'load'));
    let h = await boot();
    const key = '__cwStartFailure' + duringRestart;
    globalThis[key] = { fail: !duringRestart, disposals: 0 };
    try {
      await writeFile(path.join(fixture.folder, 'index.mjs'), `const manifest = ${JSON.stringify(fixture.manifest)};
        export function createExtension() { return { manifest, start() { if (globalThis[${JSON.stringify(key)}].fail) throw new Error('synthetic startup failure'); }, dispose() { globalThis[${JSON.stringify(key)}].disposals++; }, createBinding() { return {}; }, begin() {}, projection() {}, humanAction() {} }; }`);
      const preview = (await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).json;
      await h.api('POST', '/extensions/register-local', { previewId: preview.previewId, hash: preview.hash, trust: 'host-trusted' });
      const loaded = await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'load' });
      assert.equal(loaded.status, duringRestart ? 200 : 409);
      if (duringRestart) {
        const dataDir = h.dataDir;
        await h.runtime.close();
        globalThis[key] = { fail: true, disposals: 0 };
        h = await reopen(dataDir);
      }
      const record = (await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id);
      assert.equal(record.status, 'invalidated');
      assert.equal(globalThis[key].disposals, 1);
      assert.ok(JSON.stringify(record.diagnostics).includes('synthetic startup failure'));
    } finally { await h.runtime.close(); delete globalThis[key]; }
  }
});

test('Failed local cleanup persists invalidation and never restores a loaded package on restart', async () => {
  const fixture = await packageFixture('cleanup-failure-probe'); let h = await boot();
  globalThis.__cwCleanupStarts = 0;
  try {
    await writeFile(path.join(fixture.folder, 'index.mjs'), `const manifest = ${JSON.stringify(fixture.manifest)};
      export function createExtension() { return { manifest, start() { globalThis.__cwCleanupStarts++; }, dispose() { throw new Error('synthetic cleanup failure'); }, createBinding() { return {}; }, begin() {}, projection() {}, humanAction() {} }; }`);
    const preview = (await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).json;
    await h.api('POST', '/extensions/register-local', { previewId: preview.previewId, hash: preview.hash, trust: 'host-trusted' });
    assert.equal((await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'load' })).status, 200);
    assert.equal((await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'unload' })).status, 409);
    const record = (await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id);
    assert.equal(record.status, 'invalidated');
    assert.ok(JSON.stringify(record.diagnostics).includes('resources may remain active'));
    const dataDir = h.dataDir;
    await assert.rejects(h.runtime.close(), /Extension cleanup failed/); h = await reopen(dataDir);
    assert.equal((await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id).status, 'invalidated');
    assert.equal(globalThis.__cwCleanupStarts, 1);
    assert.equal((await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'unload' })).status, 200, 'idempotent cleanup without an in-process instance');
  } finally { await h.runtime.close(); delete globalThis.__cwCleanupStarts; }
});

test('A failed unload receipt cannot reactivate the disposed local package on restart', async () => {
  const fixture = await packageFixture('receipt-failure-probe'); let h = await boot();
  globalThis.__cwReceiptStarts = 0;
  try {
    await writeFile(path.join(fixture.folder, 'index.mjs'), `const manifest = ${JSON.stringify(fixture.manifest)};
      export function createExtension() { return { manifest, start() { globalThis.__cwReceiptStarts++; }, dispose() {}, createBinding() { return {}; }, begin() {}, projection() {}, humanAction() {} }; }`);
    const preview = (await h.api('POST', '/extensions/preview-local', { path: fixture.folder })).json;
    await h.api('POST', '/extensions/register-local', { previewId: preview.previewId, hash: preview.hash, trust: 'host-trusted' });
    await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'load' });
    const original = h.runtime.store.setExtensionRecords.bind(h.runtime.store);
    h.runtime.store.setExtensionRecords = async () => { throw new Error('synthetic receipt write failure'); };
    assert.equal((await h.api('POST', `/extensions/${fixture.manifest.id}/lifecycle`, { action: 'unload' })).status, 409);
    assert.equal((await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id).status, 'invalidated');
    h.runtime.store.setExtensionRecords = original;
    const dataDir = h.dataDir; await h.runtime.close(); h = await reopen(dataDir);
    assert.equal((await h.api('GET', '/extensions')).json.extensions.find(e => e.id === fixture.manifest.id).status, 'invalidated');
    assert.equal(globalThis.__cwReceiptStarts, 1);
  } finally { await h.runtime.close(); delete globalThis.__cwReceiptStarts; }
});
