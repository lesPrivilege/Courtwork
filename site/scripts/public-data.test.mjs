import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publicSpecimen, assertPublicTree } from './public-data.mjs';

test('public projection preserves facts and does not mutate the recording', () => {
  const source = { session: { workspaceDir: '/Users/fixture/workspace' }, runs: { run: { hostSession: { path: '/tmp/fixture/run.jsonl' }, status: 'completed' } }, events: [{ seq: 1, resources: [{ filesystem: '/home/fixture/workspace' }] }] };
  const result = publicSpecimen(source);
  assert.equal(source.session.workspaceDir, '/Users/fixture/workspace');
  assert.equal(result.session.workspaceDir, 'synthetic/workspace');
  assert.equal(result.runs.run.hostSession.path, 'synthetic/host-session/run.jsonl');
  assert.equal(result.runs.run.status, 'completed');
  assert.equal(result.events[0].seq, 1);
  assert.deepEqual(publicSpecimen(result), result);
});
test('unexpected private content fails closed', () => {
  assert.throws(() => publicSpecimen({ text: '/Users/fixture/private.txt' }), /Unexpected/);
});
test('publication rejects injected machine paths and accepts synthetic paths', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-public-check-'));
  try {
    const file = path.join(dir, 'record.json');
    await writeFile(file, JSON.stringify({ path: 'synthetic/workspace' }));
    assert.equal(await assertPublicTree(dir), 1);
    await writeFile(file, JSON.stringify({ path: '/private/tmp/fixture' }));
    await assert.rejects(assertPublicTree(dir), /Machine-local path/);
    await writeFile(file, JSON.stringify({ path: String.raw`C:\Users\fixture\private.txt` }));
    await assert.rejects(assertPublicTree(dir), /Machine-local path/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
