import assert from 'node:assert/strict';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

import { acquireRuntimeLock } from '../app/server/runtime-lock.mjs';

async function temporaryDir() {
  return mkdtemp(join(tmpdir(), 'se-v5-runtime-lock-'));
}

async function eventuallyAcquire(dataDir, attempts = 80) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await acquireRuntimeLock(dataDir);
    } catch (error) {
      lastError = error;
      if (error?.code !== 'LOCK_BUSY') throw error;
      await delay(25);
    }
  }
  throw lastError;
}

test('same data directory admits one POSIX flock owner and keeps the inode after release', async () => {
  const dataDir = await temporaryDir();
  const first = await acquireRuntimeLock(dataDir);
  const lockPath = join(dataDir, 'runtime.lock');
  const before = await stat(lockPath);
  assert.equal(before.isFile(), true);
  await assert.rejects(() => acquireRuntimeLock(dataDir), { code: 'LOCK_BUSY' });
  await first.release();
  const after = await stat(lockPath);
  assert.equal(after.isFile(), true);
  const second = await acquireRuntimeLock(dataDir);
  await second.release();
});

test('unexpected holder death invokes onLost and the next host can safely reacquire', async () => {
  const dataDir = await temporaryDir();
  const first = await acquireRuntimeLock(dataDir);
  const lost = new Promise((resolve) => first.onLost(resolve));
  process.kill(first.holderPid, 'SIGKILL');
  let loss;
  let lossTimer;
  try {
    const timeout = new Promise((_, reject) => {
      lossTimer = setTimeout(() => reject(new Error('onLost timeout')), 5_000);
    });
    loss = await Promise.race([lost, timeout]);
  } finally {
    clearTimeout(lossTimer);
  }
  assert.equal(loss.code, 'LOCK_LOST');
  const second = await eventuallyAcquire(dataDir);
  await second.release();
});

test('owner SIGKILL closes the parent pipe and does not require deleting the lock file', async () => {
  const dataDir = await temporaryDir();
  const moduleUrl = new URL('../app/server/runtime-lock.mjs', import.meta.url).href;
  const ownerScript = [
    `import { acquireRuntimeLock } from ${JSON.stringify(moduleUrl)};`,
    `const handle = await acquireRuntimeLock(${JSON.stringify(dataDir)});`,
    "console.log('ready');",
    'setInterval(() => {}, 1000);',
  ].join('\n');
  const owner = spawn(process.execPath, ['--input-type=module', '-e', ownerScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  owner.stdout.setEncoding('utf8');
  let output = '';
  owner.stdout.on('data', (chunk) => { output += chunk; });
  let ownerTimer;
  try {
    const timeout = new Promise((_, reject) => {
      ownerTimer = setTimeout(() => reject(new Error('owner did not acquire lock')), 5_000);
    });
    await Promise.race([(async () => {
      while (!output.includes('ready')) await delay(10);
    })(), timeout]);
  } finally {
    clearTimeout(ownerTimer);
  }
  await assert.rejects(() => acquireRuntimeLock(dataDir), { code: 'LOCK_BUSY' });
  owner.kill('SIGKILL');
  await once(owner, 'exit');
  const second = await eventuallyAcquire(dataDir);
  assert.equal((await stat(join(dataDir, 'runtime.lock'))).isFile(), true);
  await second.release();
});
