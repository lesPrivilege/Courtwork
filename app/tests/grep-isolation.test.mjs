import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWsGrepTool, GREP_TIMEOUT_MS } from '../runtime/workspace-tools.mjs';

async function fixture(t, contents) {
  const dir = await mkdtemp(path.join(tmpdir(), 'c4-grep-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'sample.txt'), contents);
  return createWsGrepTool({ workspaceDir: dir });
}

test('worker preserves regex matches, line numbers and Unicode', async (t) => {
  const tool = await fixture(t, 'alpha\n中文 beta\nBETA\n');
  const result = await tool.execute('normal', { pattern: '(beta|BETA)', path: 'sample.txt' });
  assert.deepEqual(result.details.matches, [
    { path: 'sample.txt', line: 2, text: '中文 beta' },
    { path: 'sample.txt', line: 3, text: 'BETA' },
  ]);
});

test('pathological regex times out while the service event loop stays responsive', { timeout: 7000 }, async (t) => {
  const tool = await fixture(t, 'a'.repeat(40) + '!');
  let ticks = 0;
  const timer = setInterval(() => ticks++, 25);
  t.after(() => clearInterval(timer));
  const start = Date.now();
  await assert.rejects(tool.execute('timeout', { pattern: '(a|aa)+$', path: 'sample.txt' }), /time limit/);
  assert.ok(Date.now() - start >= GREP_TIMEOUT_MS - 50);
  assert.ok(ticks >= 5, 'main thread must run timers during matching');
});

test('abort terminates pathological matching before its worker timeout', { timeout: 5000 }, async (t) => {
  const tool = await fixture(t, 'a'.repeat(40) + '!');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150);
  t.after(() => clearTimeout(timer));
  const start = Date.now();
  await assert.rejects(tool.execute('abort', { pattern: '(a|aa)+$', path: 'sample.txt' }, controller.signal), /cancelled/);
  assert.ok(Date.now() - start < GREP_TIMEOUT_MS, 'abort must not wait for timeout');
});

test('already aborted search cannot start matching', async (t) => {
  const tool = await fixture(t, 'alpha');
  await assert.rejects(tool.execute('aborted', { pattern: 'alpha' }, AbortSignal.abort()), /cancelled/);
});
