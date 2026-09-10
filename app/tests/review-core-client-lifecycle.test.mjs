import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const implementation = process.env.COURTWORK_CORE_CLIENT
  ? pathToFileURL(path.resolve(process.env.COURTWORK_CORE_CLIENT)).href
  : new URL('../core/client.mjs', import.meta.url).href;
const { CoreClient } = await import(implementation);

const WORKER = fileURLToPath(new URL('./fixtures/review-core-client/worker.py', import.meta.url));
const TIMEOUT = Symbol('timeout');
const BASE_OPTIONS = {
  python: WORKER,
  // Keep ordinary fixture startup independent from host CPU contention while
  // the no-ready case overrides this to a deliberately short deadline.
  readyTimeoutMs: 2_000,
  requestTimeoutMs: 100,
  closeTimeoutMs: 40,
  maxPending: 256,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settleWithin(promise, milliseconds = 500) {
  let timer;
  const observed = Promise.resolve(promise).then(
    (value) => ({ state: 'fulfilled', value }),
    (reason) => ({ state: 'rejected', reason }),
  );
  const result = await Promise.race([
    observed,
    new Promise((resolve) => { timer = setTimeout(() => resolve(TIMEOUT), milliseconds); }),
  ]);
  clearTimeout(timer);
  return result;
}

async function waitForChild(client, milliseconds = 200) {
  const deadline = Date.now() + milliseconds;
  while (!client.process && Date.now() < deadline) await delay(2);
  return client.process;
}

async function waitForClose(child, milliseconds = 500) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  const result = await settleWithin(new Promise((resolve) => child.once('close', resolve)), milliseconds);
  return result !== TIMEOUT;
}

async function forceKill(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try { child.kill('SIGKILL'); } catch { /* already reaped */ }
  await waitForClose(child, 1000);
}

async function fixture(scenario, options = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-rv26-q01-'));
  const dbPath = path.join(dataDir, `${scenario}.db`);
  const client = new CoreClient({ dataDir, dbPath, ...BASE_OPTIONS, ...options });
  return { client, dataDir, dbPath };
}

async function dispose({ client, child, dataDir }) {
  const close = settleWithin(client.close(), 250);
  await forceKill(child ?? client.process);
  await settleWithin(close, 500);
  await rm(dataDir, { recursive: true, force: true });
}

function assertRejected(result, expectedCodes = []) {
  assert.notEqual(result, TIMEOUT, 'operation exceeded its configured lifecycle deadline');
  assert.equal(result?.state, 'rejected', 'operation unexpectedly fulfilled');
  assert.ok(result.reason instanceof Error, 'operation rejected with a non-error value');
  if (expectedCodes.length) assert.ok(expectedCodes.includes(result.reason.code), `unexpected error code ${result.reason.code}`);
  return result.reason;
}

test('no ready frame rejects within readyTimeoutMs and reaps the failed worker', async () => {
  const context = await fixture('no-ready', { readyTimeoutMs: 80 });
  const start = context.client.start();
  start.catch(() => {});
  const child = await waitForChild(context.client);
  try {
    assert.ok(child, 'client did not spawn the synthetic worker');
    const result = await settleWithin(start, 300);
    assertRejected(result, ['CORE_UNAVAILABLE']);
    assert.equal(await waitForClose(child), true, 'failed startup left a live worker');
  } finally {
    await dispose({ ...context, child });
  }
});

test('a request with no response times out, clears pending, and reaps the transport', async () => {
  const context = await fixture('no-response');
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.call('save_draft', { matter_id: 'm', text: 'synthetic' }), 300);
    const error = assertRejected(result, ['CORE_TIMEOUT']);
    assert.equal(error.outcome, 'unknown', 'a sent request must remain explicitly outcome-unknown');
    assert.equal(context.client.pending.size, 0, 'timed-out request remained pending');
    assert.equal(await waitForClose(child), true, 'request timeout left a live worker');
  } finally {
    await dispose({ ...context, child });
  }
});

test('close ignores a missing close acknowledgement, is bounded, and reaps the worker', async () => {
  const context = await fixture('close-no-ack');
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.close(), 300);
    assert.notEqual(result, TIMEOUT, 'close waited indefinitely for a close acknowledgement');
    assert.equal(result?.state, 'fulfilled');
    assert.equal(await waitForClose(child), true, 'close left a live worker');
    assert.equal(context.client.closed, true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('a partial response frame is bounded by the request deadline and the transport is reaped', async () => {
  const context = await fixture('partial-frame');
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.listMatters(), 300);
    assertRejected(result, ['CORE_TIMEOUT']);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('invalid JSON invalidates and reaps the transport', async () => {
  const context = await fixture('invalid-json');
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.listMatters(), 300);
    assertRejected(result, ['CORE_UNAVAILABLE', 'INVALID']);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('an oversized unterminated frame is rejected before unbounded buffering', async () => {
  const context = await fixture('oversized-no-newline', { requestTimeoutMs: 1_000 });
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.listMatters(), 300);
    assertRejected(result, ['INVALID']);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('stderr is capped while a failed request is cleaned up', async () => {
  const context = await fixture('stderr-flood');
  await context.client.start();
  const child = context.client.process;
  try {
    const result = await settleWithin(context.client.listMatters(), 300);
    assertRejected(result, ['CORE_TIMEOUT']);
    assert.ok(context.client.stderr.length <= 65_536, `stderr grew to ${context.client.stderr.length} characters`);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('concurrent starts share one worker and one readiness result', async () => {
  const context = await fixture('concurrent-starts');
  try {
    const starts = await Promise.all(Array.from({ length: 8 }, () => context.client.start()));
    assert.equal(new Set(starts.map((info) => info.generation)).size, 1);
    assert.equal(starts[0].ready, true);
    assert.equal(Number(await readFile(`${context.dbPath}.starts`, 'utf8')), 1);
    await context.client.close();
  } finally {
    await dispose(context);
  }
});

test('close during startup rejects start and reaps the child', async () => {
  const context = await fixture('startup-hold');
  const start = context.client.start();
  start.catch(() => {});
  const child = await waitForChild(context.client);
  try {
    const close = await settleWithin(context.client.close(), 300);
    assert.notEqual(close, TIMEOUT);
    assert.equal(close?.state, 'fulfilled');
    assertRejected(await settleWithin(start, 300), ['CORE_UNAVAILABLE']);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('maxPending rejects excess calls and failed transport cleanup leaves no pending entries', async () => {
  const context = await fixture('pending-cap', { maxPending: 2 });
  await context.client.start();
  const child = context.client.process;
  try {
    const first = context.client.listMatters();
    const second = context.client.listMatters();
    const third = await settleWithin(context.client.listMatters(), 100);
    assertRejected(third, ['CORE_BUSY']);
    assertRejected(await settleWithin(first, 300), ['CORE_TIMEOUT']);
    assertRejected(await settleWithin(second, 300), ['CORE_TIMEOUT']);
    assert.equal(context.client.pending.size, 0);
    assert.equal(await waitForClose(child), true);
  } finally {
    await dispose({ ...context, child });
  }
});

test('a failed transport can restart after its child has been reaped', async () => {
  const context = await fixture('restartable');
  await context.client.start();
  const firstChild = context.client.process;
  try {
    assertRejected(await settleWithin(context.client.listMatters(), 300), ['CORE_UNAVAILABLE', 'INVALID']);
    assert.equal(await waitForClose(firstChild), true, 'first failed generation was not reaped');
    const secondReady = await context.client.start();
    assert.equal(secondReady.generation, 2);
    assert.deepEqual(await context.client.listMatters(), { generation: 2, operation: 'list_matters' });
  } finally {
    await dispose({ ...context, child: context.client.process });
  }
});

test('late events from an old generation cannot satisfy or damage the replacement', async () => {
  const context = await fixture('late-events', { closeTimeoutMs: 40 });
  await context.client.start();
  const firstChild = context.client.process;
  try {
    assertRejected(await settleWithin(context.client.listMatters(), 300), ['CORE_UNAVAILABLE', 'INVALID']);
    const secondReady = await context.client.start();
    assert.equal(secondReady.generation, 2, 'stale ready frame selected the old generation');
    await delay(80);
    assert.deepEqual(await context.client.listMatters(), { generation: 2, operation: 'list_matters' });
    assert.equal(await waitForClose(firstChild), true);
  } finally {
    await dispose({ ...context, child: context.client.process });
  }
});

test('close rejects in-flight admissions, then permits a reaped replacement generation', async () => {
  const context = await fixture('close-reopen');
  await context.client.start();
  const firstChild = context.client.process;
  let childForCleanup = firstChild;
  try {
    const queued = context.client.listMatters();
    queued.catch(() => {});
    const closing = context.client.close();
    const startDuringClose = settleWithin(context.client.start(), 100);
    const callDuringClose = settleWithin(context.client.listMatters(), 100);

    assertRejected(await settleWithin(queued, 300), ['CORE_UNAVAILABLE']);
    assertRejected(await startDuringClose, ['CORE_UNAVAILABLE']);
    assertRejected(await callDuringClose, ['CORE_UNAVAILABLE']);
    assert.notEqual(await settleWithin(closing, 300), TIMEOUT, 'close did not finish after the close deadline');
    assert.equal(await waitForClose(firstChild), true, 'closing left the first generation alive');

    const ready = await context.client.start();
    childForCleanup = context.client.process;
    assert.equal(ready.generation, 2);
    assert.deepEqual(await context.client.listMatters(), { generation: 2, operation: 'list_matters' });
  } finally {
    await dispose({ ...context, child: childForCleanup });
  }
});
