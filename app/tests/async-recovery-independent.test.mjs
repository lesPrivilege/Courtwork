import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer } from '../server/index.mjs';
import { RuntimeStore } from '../server/store.mjs';
import { createAsyncLoopFixture } from './fixtures/async-loop/index.mjs';
import { createFixtureHostAdapter } from './fixtures/async-loop/host-adapter.mjs';

const exec = promisify(execFile);
const appRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const repoRoot = path.resolve(appRoot, '..');
const hostChild = path.join(appRoot, 'tests/fixtures/async-loop/host-child.mjs');

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
        await Promise.race([once(child.stdout, 'data'), once(child, 'exit')]);
      }
    },
    async exit() { if (child.exitCode !== null || child.signalCode !== null) return { code: child.exitCode, signal: child.signalCode }; const [code, signal] = await once(child, 'exit'); return { code, signal }; },
  };
}
async function reopenHost(dataDir, origin) {
  const host = await startServer({ dataDir, port: 0, asyncTaskAdapters: [createFixtureHostAdapter(origin)], logger: () => {} });
  const api = async (method, pathname, body) => {
    const response = await fetch(host.url + '/api/v5' + pathname, { method, headers: { 'content-type': 'application/json', 'x-work-token': host.token }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text(); return { status: response.status, json: text ? JSON.parse(text) : null };
  };
  return { host, api };
}

for (const point of ['async_intent', 'async_dispatch', 'async_result', 'async_delivery']) {
  test(`independent recovery: SIGKILL at ${point} keeps one original task/run and never relaunches`, async () => {
    const fixture = await createAsyncLoopFixture();
    const dataDir = await mkdtemp(path.join(tmpdir(), `cw-async-recovery-${point}-`));
    try {
      const worker = startCrashHost({ dataDir, origin: fixture.origin, point });
      const ready = await worker.line((value) => value.stage === 'ready');
      assert.ok(ready, `host did not finish setup: ${worker.stderr}`);
      const exited = await worker.exit();
      assert.equal(exited.signal, 'SIGKILL', 'the real startServer/Pi host must be killed by its armed hook');
      assert.match(worker.stdout, /crash point .* ARMED/);
      const countBefore = await fixture.launchCounts();
      if (['async_intent', 'async_dispatch'].includes(point)) assert.deepEqual(countBefore, {}, 'no remote launch reached the provider');
      else assert.equal(Object.values(countBefore).reduce((total, count) => total + count, 0), 1, 'one remote launch reached the provider');

      const reopened = await reopenHost(dataDir, fixture.origin);
      try {
        const session = await reopened.api('GET', `/sessions/${ready.sessionId}`);
        assert.equal(session.status, 200); assert.equal(session.json.runs.length, 1, 'restart does not create a Run');
        assert.equal(session.json.runs[0].status, 'unknown');
        const listed = await reopened.api('GET', `/async-tasks?projectId=${ready.projectId}`);
        assert.equal(listed.json.items.length, 1);
        const taskId = listed.json.items[0].id;
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
      } finally { await reopened.host.close(); }
    } finally { await fixture.close(); await rm(dataDir, { recursive: true, force: true }); }
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
    await assert.rejects(new OldRuntimeStore({ dataDir }).open(), /schemaVersion 5 is not supported/);
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
      oldState.schemaVersion = version; delete oldState.asyncTasks;
      const original = Buffer.from(JSON.stringify(oldState)); await writeFile(file, original);
      store = await new RuntimeStore({ dataDir }).open(); assert.equal(store.state.schemaVersion, 5); await store.close();
      const backup = (await readdir(dataDir)).find((name) => name.startsWith(`runtime-state.schema${version}.`));
      assert.deepEqual(await readFile(path.join(dataDir, backup)), original, 'migration backup is the original byte sequence');
      store = await new RuntimeStore({ dataDir }).open(); assert.equal(store.state.schemaVersion, 5); await store.close();
    } finally { await rm(dataDir, { recursive: true, force: true }); }
  }
});

test('invalid UTF-8 schema4 input is refused before migration and its bytes remain untouched', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-async-invalid-utf8-'));
  try {
    let store = await new RuntimeStore({ dataDir }).open();
    await store.createProject('x'); await store.close();
    const file = path.join(dataDir, 'runtime-state.json');
    const state = JSON.parse(await readFile(file, 'utf8')); state.schemaVersion = 4; delete state.asyncTasks;
    const bytes = Buffer.from(JSON.stringify(state));
    const marker = Buffer.from('"name":"x"'); const at = bytes.indexOf(marker);
    assert.notEqual(at, -1); bytes[at + marker.length - 2] = 0xff;
    await writeFile(file, bytes);
    await assert.rejects(new RuntimeStore({ dataDir }).open(), /UTF-8/i);
    assert.deepEqual(await readFile(file), bytes, 'a decoder replacement character must never permit an upgrade rewrite');
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});
