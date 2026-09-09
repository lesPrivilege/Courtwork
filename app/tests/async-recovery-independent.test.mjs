import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../server/index.mjs';
import { RuntimeStore } from '../server/store.mjs';
import { createAsyncLoopFixture } from './fixtures/async-loop/index.mjs';
import { createFixtureHostAdapter } from './fixtures/async-loop/host-adapter.mjs';

const exec = promisify(execFile);
const appRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const repoRoot = path.resolve(appRoot, '..');
const hostChild = path.join(appRoot, 'tests/fixtures/async-loop/host-child.mjs');

async function bounded(promise, label, ms = 15_000) {
  return Promise.race([promise, delay(ms).then(() => { throw new Error(`${label} timed out`); })]);
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGKILL'); await bounded(once(child, 'exit'), 'child cleanup');
}
function startCrashHost({ dataDir, origin, point }) {
  const child = spawn(process.execPath, [hostChild, dataDir, origin, point], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, SE_TEST_MODE: '1', SE_TEST_CRASH_POINT: point },
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
  return {
    child, get stdout() { return stdout; }, get stderr() { return stderr; },
    async line(match) {
      for (;;) {
        for (const text of stdout.split('\n')) if (text.startsWith('HOST ')) { const value = JSON.parse(text.slice(5)); if (match(value)) return value; }
        if (child.exitCode !== null || child.signalCode !== null) return null;
        await bounded(Promise.race([once(child.stdout, 'data'), once(child, 'exit')]), 'host readiness');
      }
    },
    async exit() { if (child.exitCode !== null || child.signalCode !== null) return { code: child.exitCode, signal: child.signalCode }; const [code, signal] = await bounded(once(child, 'exit'), 'host crash'); return { code, signal }; },
  };
}
function consumeResponder(taskId) {
  return ({ body }) => {
    const messages = body.messages ?? [], user = messages.map((message) => message.role).lastIndexOf('user');
    const results = messages.slice(user + 1).filter((message) => message.role === 'tool');
    return !results.length
      ? { kind: 'tool', id: 'recovery-consume-0', created: 1, toolCallId: 'recovery-consume-call', name: 'async_get', arguments: { taskId } }
      : { kind: 'text', id: 'recovery-consume-1', created: 1, text: 'Synthetic recovery consumption.' };
  };
}
async function reopenHost(dataDir, origin, responder = null) {
  const host = await startServer({ dataDir, port: 0, asyncTaskAdapters: [createFixtureHostAdapter(origin)], responder, logger: () => {} });
  const api = async (method, pathname, body) => {
    const response = await fetch(host.url + '/api/v5' + pathname, { method, headers: { 'content-type': 'application/json', 'x-work-token': host.token }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); return { status: response.status, json: text ? JSON.parse(text) : null };
  };
  return { host, api };
}
async function terminal(api, sessionId, runId) {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const session = await api('GET', `/sessions/${sessionId}`);
    const run = session.json.runs.find((candidate) => candidate.id === runId);
    if (['completed', 'unknown', 'failed', 'cancelled'].includes(run.status)) return run;
    assert(Date.now() < deadline, 'run terminal state timed out'); await delay(20);
  }
}
async function withHistoricalStore(sha, run) {
  const parent = await mkdtemp(path.join(tmpdir(), 'cw-async-historical-host-'));
  const checkout = path.join(parent, 'source');
  try {
    await exec('git', ['-C', repoRoot, 'worktree', 'add', '--detach', checkout, sha]);
    const module = await import(pathToFileURL(path.join(checkout, 'app/server/store.mjs')).href);
    return await run(module.RuntimeStore);
  } finally {
    await exec('git', ['-C', repoRoot, 'worktree', 'remove', '--force', checkout]).catch(() => {});
    await rm(parent, { recursive: true, force: true });
  }
}

for (const point of ['async_intent', 'async_dispatch', 'async_result', 'async_delivery']) {
  test(`independent recovery: SIGKILL at ${point} keeps one original task/run and never relaunches`, async () => {
    const fixture = await createAsyncLoopFixture();
    const dataDir = await mkdtemp(path.join(tmpdir(), `cw-async-recovery-${point}-`));
    let worker;
    try {
      worker = startCrashHost({ dataDir, origin: fixture.origin, point });
      const ready = await worker.line((value) => value.stage === 'ready');
      assert.ok(ready, `host did not finish setup: ${worker.stderr}`);
      const exited = await worker.exit();
      assert.equal(exited.signal, 'SIGKILL', 'the real startServer/Pi host must be killed by its armed hook');
      assert.match(worker.stdout, /crash point .* ARMED/);
      const countBefore = await fixture.launchCounts();
      if (['async_intent', 'async_dispatch'].includes(point)) assert.deepEqual(countBefore, {}, 'no remote launch reached the provider');
      else assert.equal(Object.values(countBefore).reduce((total, count) => total + count, 0), 1, 'one remote launch reached the provider');

      const durable = JSON.parse(await readFile(path.join(dataDir, 'runtime-state.json'), 'utf8'));
      const persistedTask = durable.asyncTasks[0];
      assert.ok(persistedTask, 'the task ID must be read from bytes that survived SIGKILL');
      assert.equal(persistedTask.source.digest, ready.source.digest);
      const reopened = await reopenHost(dataDir, fixture.origin);
      try {
        const session = await reopened.api('GET', `/sessions/${ready.sessionId}`);
        assert.equal(session.status, 200); assert.equal(session.json.runs.length, 1, 'restart does not create a Run');
        assert.equal(session.json.runs[0].status, 'unknown');
        const listed = await reopened.api('GET', `/async-tasks?projectId=${ready.projectId}`);
        assert.equal(listed.json.items.length, 1);
        const taskId = listed.json.items[0].id;
        assert.equal(taskId, persistedTask.id, 'restart preserves the exact pre-restart task ID');
        const task = await reopened.api('GET', `/async-tasks/${taskId}?projectId=${ready.projectId}`);
        assert.equal(task.status, 200, 'the original task remains queryable by its original ID');
        assert.equal(task.json.id, taskId); assert.equal(task.json.source.digest, ready.source.digest, 'source digest is retained exactly');
        assert.equal(task.json.execution.status, 'unknown');
        assert.equal(task.json.execution.reason, 'host_restart');
        assert.deepEqual(await fixture.launchCounts(), countBefore, 'restart performs no automatic remote launch');
        if (point === 'async_delivery') {
          assert.equal(task.json.deliveries.length, 1, 'delivery intent was retained before the crash');
          assert.equal(task.json.deliveries[0].runtimeRecordedAt, null, 'no tool.result receipt was recorded as delivered');
          const events = await reopened.api('GET', `/sessions/${ready.sessionId}/events`);
          assert.ok(!events.json.events.some((event) => event.type === 'tool.result' && event.data.name === 'async_get'));
        }
        if (['async_intent', 'async_dispatch'].includes(point)) {
          const reconciled = await reopened.api('POST', `/async-tasks/${taskId}/reconcile`, { projectId: ready.projectId, expectedRevision: task.json.revision });
          assert.equal(reconciled.status, 200); assert.equal(reconciled.json.execution.status, 'unknown');
          assert.equal(reconciled.json.execution.reason, 'remote_record_missing');
          assert.deepEqual(await fixture.launchCounts(), countBefore, 'a missing remote record never triggers launch');
        } else {
          await fixture.release(taskId, 'startExecution'); await fixture.barrier(taskId, 'startExecution');
          await fixture.release(taskId, 'resultGenerated'); await fixture.barrier(taskId, 'resultGenerated');
          const reconciled = await reopened.api('POST', `/async-tasks/${taskId}/reconcile`, { projectId: ready.projectId, expectedRevision: task.json.revision });
          assert.equal(reconciled.status, 200); assert.equal(reconciled.json.execution.status, 'succeeded');
          assert.equal(reconciled.json.result.text, fixture.documents.A.content); assert.equal(reconciled.json.result.digest, ready.source.digest);
          await reopened.host.close();
          const consumedHost = await reopenHost(dataDir, fixture.origin, consumeResponder(taskId));
          try {
            const created = await consumedHost.api('POST', `/sessions/${ready.sessionId}/runs`, { input: 'consume retained async task', commandId: `consume-${point}` });
            assert.equal(created.status, 200); await terminal(consumedHost.api, ready.sessionId, created.json.run.id);
            const consumed = await consumedHost.api('GET', `/async-tasks/${taskId}?projectId=${ready.projectId}`);
            assert.ok(consumed.json.deliveries.some((delivery) => delivery.runId === created.json.run.id && delivery.runtimeRecordedAt), 'a new Run records actual async_get delivery');
            assert.deepEqual(await fixture.launchCounts(), countBefore, 'consumption reconciles the original remote identity without relaunch');
          } finally { await consumedHost.host.close(); }
          return;
        }
      } finally { await reopened.host.close().catch(() => {}); }
    } finally { await stop(worker?.child); await fixture.close(); await rm(dataDir, { recursive: true, force: true }); }
  });
}

test('fixed old main schema4 RuntimeStore rejects a schema5 state without changing bytes', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-async-old-host-state-'));
  const checkoutParent = await mkdtemp(path.join(tmpdir(), 'cw-async-old-main-'));
  const checkout = path.join(checkoutParent, 'source');
  try {
    const current = await new RuntimeStore({ dataDir }).open(); await current.close();
    const file = path.join(dataDir, 'runtime-state.json'); const original = await readFile(file);
    await exec('git', ['-C', repoRoot, 'worktree', 'add', '--detach', checkout, '7c07ef6b5a19f0eb2c45b8894ab9911de87ea979']);
    const { RuntimeStore: OldRuntimeStore } = await import(pathToFileURL(path.join(checkout, 'app/server/store.mjs')).href);
    await assert.rejects(new OldRuntimeStore({ dataDir }).open(), /schemaVersion 9 is not supported/);
    assert.deepEqual(await readFile(file), original, 'the fixed old host refuses schema5 before rewriting any byte');
  } finally {
    await exec('git', ['-C', repoRoot, 'worktree', 'remove', '--force', checkout]).catch(() => {});
    await rm(checkoutParent, { recursive: true, force: true }); await rm(dataDir, { recursive: true, force: true });
  }
});

test('schema3 and schema4 migrate with an exact independent backup and reopen', async () => {
  for (const version of [3, 4]) {
    const dataDir = await mkdtemp(path.join(tmpdir(), `cw-async-schema-${version}-`));
    try {
      let store = await new RuntimeStore({ dataDir }).open(); await store.close();
      const file = path.join(dataDir, 'runtime-state.json'); const oldState = JSON.parse(await readFile(file, 'utf8'));
      oldState.schemaVersion = version; delete oldState.asyncTasks; delete oldState.coordination; oldState.sessions.forEach(session => delete session.scope);
      const original = Buffer.from(JSON.stringify(oldState)); await writeFile(file, original);
      store = await new RuntimeStore({ dataDir }).open(); assert.equal(store.state.schemaVersion, 9); await store.close();
      const backup = (await readdir(dataDir)).find((name) => name.startsWith(`runtime-state.schema${version}.`));
      assert.deepEqual(await readFile(path.join(dataDir, backup)), original, 'migration backup is the original byte sequence');
      store = await new RuntimeStore({ dataDir }).open(); assert.equal(store.state.schemaVersion, 9); await store.close();
      const legacyData = await mkdtemp(path.join(tmpdir(), `cw-async-schema${version}-legacy-`));
      try {
        await writeFile(path.join(legacyData, 'runtime-state.json'), await readFile(path.join(dataDir, backup)));
        const historicalSha = version === 3 ? 'b26670c8975bd9bd2666a856be55b80fcb2963fc' : '7c07ef6b5a19f0eb2c45b8894ab9911de87ea979';
        await withHistoricalStore(historicalSha, async (HistoricalStore) => {
          const historical = await new HistoricalStore({ dataDir: legacyData }).open();
          assert.equal(historical.state.schemaVersion, version, `fixed historical schema${version} host opens its separate backup`);
          await historical.close();
        });
      } finally { await rm(legacyData, { recursive: true, force: true }); }
    } finally { await rm(dataDir, { recursive: true, force: true }); }
  }
});

test('invalid UTF-8 schema4 input is refused before migration and its bytes remain untouched', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-async-invalid-utf8-'));
  try {
    let store = await new RuntimeStore({ dataDir }).open();
    await store.createProject('x'); await store.close();
    const file = path.join(dataDir, 'runtime-state.json');
    const state = JSON.parse(await readFile(file, 'utf8')); state.schemaVersion = 4; delete state.asyncTasks; delete state.coordination; state.sessions.forEach(session => delete session.scope);
    const bytes = Buffer.from(JSON.stringify(state));
    const marker = Buffer.from('"name":"x"'); const at = bytes.indexOf(marker);
    assert.notEqual(at, -1); bytes[at + marker.length - 2] = 0xff;
    await writeFile(file, bytes);
    await assert.rejects(new RuntimeStore({ dataDir }).open(), /UTF-8/i);
    assert.deepEqual(await readFile(file), bytes, 'a decoder replacement character must never permit an upgrade rewrite');
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});
