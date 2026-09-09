import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RuntimeStore } from '../server/store.mjs';
import { boot, spawnWorker, reopen } from './helpers.mjs';

// BG-02: a Run that ended in unknown|failed|cancelled can be explicitly and
// durably continued by a NEW Run that names it in `supersedes`. History is
// immutable, the lineage is a chain, no input is copied and nothing is
// replayed. Every server here uses port 0 and an mkdtemp data directory.

const BASE_SHA = '461ab12';
const exec = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const FAILING = '/fixture error make this run fail';
const ok = (response) => { assert.equal(response.status, 200, JSON.stringify(response.json)); return response.json; };

async function endedRun(h, sessionId, { input = FAILING, commandId = randomUUID(), supersedes } = {}) {
  const body = supersedes === undefined ? { input, commandId } : { input, commandId, supersedes };
  const created = ok(await h.api('POST', `/sessions/${sessionId}/runs`, body));
  return h.pollRun(created.run.id, { timeoutMs: 30000 });
}

function runOf(sessionView, runId) { return sessionView.runs.find((run) => run.id === runId); }

test('BG02-T1: a cancelled, a failed and a restart-unknown Run can each be continued, and the continued Run is unchanged', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    // cancelled
    const slow = ok(await h.api('POST', `/sessions/${session.id}/runs`, { input: '/fixture slow first attempt', commandId: randomUUID() }));
    const cancelled = ok(await h.api('POST', `/runs/${slow.run.id}/cancel`, {})).run;
    assert.equal(cancelled.status, 'cancelled');
    const beforeA = JSON.stringify(runOf(ok(await h.api('GET', `/sessions/${session.id}`)), slow.run.id));
    const afterCancelled = await endedRun(h, session.id, { input: 'continue the cancelled attempt', supersedes: slow.run.id });
    assert.equal(afterCancelled.supersedes, slow.run.id);

    // failed
    const failed = await endedRun(h, session.id);
    assert.equal(failed.status, 'failed');
    const failedContinuation = await endedRun(h, session.id, { input: 'continue the failed attempt', supersedes: failed.id });
    assert.equal(failedContinuation.supersedes, failed.id);

    const view = ok(await h.api('GET', `/sessions/${session.id}`));
    assert.equal(runOf(view, afterCancelled.id).supersedes, slow.run.id);
    assert.equal(runOf(view, failedContinuation.id).supersedes, failed.id);
    assert.equal(JSON.stringify(runOf(view, slow.run.id)), beforeA, 'the continued Run record is not rewritten');
    assert.equal(runOf(view, slow.run.id).supersedes, null);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('BG02-T1/T7: a Run left in flight by SIGKILL becomes unknown, keeps its lineage and can itself be continued', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-run-lineage-crash-'));
  let worker, host;
  try {
    worker = spawnWorker({ dataDir: dir, body: `
      await api('PUT', '/provider-credential', { provider: 'fake-openai-loopback', apiKey: FAKE_CREDENTIAL_KEY });
      const project = (await api('POST', '/projects', { name: 'lineage' })).json.project;
      const session = (await api('POST', '/sessions', { projectId: project.id, title: 'lineage' })).json.session;
      const a = (await api('POST', '/sessions/' + session.id + '/runs', { input: '/fixture error first attempt', commandId: 'cmd-a' })).json.run;
      await waitRun(a.id, (run) => run.status === 'failed');
      const b = (await api('POST', '/sessions/' + session.id + '/runs', { input: '/fixture slow second attempt', commandId: 'cmd-b', supersedes: a.id })).json.run;
      await waitRun(b.id, (run) => run.status === 'running');
      emit({ ready: true, sessionId: session.id, a: a.id, b: b.id, supersedes: b.supersedes });
    ` });
    const ready = await worker.waitForLine((value) => value.ready);
    assert.equal(ready.supersedes, ready.a);
    await worker.kill();

    host = await reopen(dir);
    const view = ok(await host.api('GET', `/sessions/${ready.sessionId}`));
    const b = runOf(view, ready.b);
    assert.equal(b.status, 'unknown', 'an in-flight Run is unknown after restart');
    assert.equal(b.supersedes, ready.a, 'lineage survives the restart it was created to describe');

    // The continued Run may itself be continued: the chain stays legal.
    const f = ok(await host.api('POST', `/sessions/${ready.sessionId}/runs`, { input: 'third attempt', commandId: 'cmd-f', supersedes: ready.b })).run;
    assert.equal(f.supersedes, ready.b);
  } finally { await worker?.kill(); await host?.runtime.close(); await rm(dir, { recursive: true, force: true }); }
});

test('BG02-T2: lineage is a chain — a Run that already has a continuation refuses a second one', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const a = await endedRun(h, session.id);
    const b = await endedRun(h, session.id, { input: '/fixture error second attempt', supersedes: a.id });
    const c = await endedRun(h, session.id, { input: '/fixture error third attempt', supersedes: b.id });
    assert.equal(c.supersedes, b.id);

    const d = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'forking off B', commandId: randomUUID(), supersedes: b.id });
    assert.equal(d.status, 409); assert.equal(d.json.error.code, 'supersede_conflict');
    const e = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'forking off A', commandId: randomUUID(), supersedes: a.id });
    assert.equal(e.status, 409); assert.equal(e.json.error.code, 'supersede_conflict');
    assert.equal(h.runtime.store.listRuns(session.id).length, 3, 'a refused continuation creates no Run');
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('BG02-T3: completed, still-running, foreign/absent and effect-unreconciled targets are each refused', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const other = await h.createSession();

    const completed = await endedRun(h, session.id, { input: 'a plain answer' });
    assert.equal(completed.status, 'completed');
    const onCompleted = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'redo', commandId: randomUUID(), supersedes: completed.id });
    assert.equal(onCompleted.status, 409); assert.equal(onCompleted.json.error.code, 'supersede_completed');

    // The lineage gate is decided before the single-active-run gate, so a
    // live Run reports why it cannot be continued rather than "active_run".
    const running = ok(await h.api('POST', `/sessions/${session.id}/runs`, { input: '/fixture slow still working', commandId: randomUUID() })).run;
    const onRunning = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'continue too early', commandId: randomUUID(), supersedes: running.id });
    assert.equal(onRunning.status, 409); assert.equal(onRunning.json.error.code, 'supersede_active');
    ok(await h.api('POST', `/runs/${running.id}/cancel`, {}));

    // A Run of another Session is indistinguishable from one that never existed.
    const foreign = await endedRun(h, other.id);
    const absentAnswer = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'continue a ghost', commandId: randomUUID(), supersedes: randomUUID() });
    const foreignAnswer = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'continue a ghost', commandId: randomUUID(), supersedes: foreign.id });
    assert.equal(absentAnswer.status, 404); assert.equal(absentAnswer.json.error.code, 'not_found');
    assert.deepEqual(foreignAnswer.status, absentAnswer.status);
    assert.deepEqual(foreignAnswer.json, absentAnswer.json);

    // An unreconciled external effect is BG-03's business, not a retry's.
    const unreconciled = await endedRun(h, session.id);
    await h.runtime.store.updateRun(unreconciled.id, { error: { code: 'mcp_effect_unknown', message: 'Remote tool effects require reconciliation' } });
    const onUnreconciled = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'continue anyway', commandId: randomUUID(), supersedes: unreconciled.id });
    assert.equal(onUnreconciled.status, 409); assert.equal(onUnreconciled.json.error.code, 'effect_unreconciled');
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('BG02-T4: command identity includes the lineage claim', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const a = await endedRun(h, session.id);
    const a2 = await endedRun(h, session.id);
    const commandId = randomUUID();
    const body = { input: 'second attempt', commandId, supersedes: a.id };

    const first = ok(await h.api('POST', `/sessions/${session.id}/runs`, body)).run;
    await h.pollRun(first.id);
    const replay = ok(await h.api('POST', `/sessions/${session.id}/runs`, body)).run;
    assert.equal(replay.id, first.id);
    assert.equal(h.runtime.store.getCommandReceipt(session.id, commandId, body.input, a.id).idempotent, true);
    assert.equal(h.runtime.store.listRuns(session.id).length, 3, 'a replay starts no second Run');

    const otherLineage = await h.api('POST', `/sessions/${session.id}/runs`, { ...body, supersedes: a2.id });
    assert.equal(otherLineage.status, 409); assert.equal(otherLineage.json.error.code, 'command_conflict');
    const noLineage = await h.api('POST', `/sessions/${session.id}/runs`, { input: body.input, commandId });
    assert.equal(noLineage.status, 409); assert.equal(noLineage.json.error.code, 'command_conflict');

    const unknownField = await h.api('POST', `/sessions/${session.id}/runs`, { ...body, commandId: randomUUID(), attempt: 2 });
    assert.equal(unknownField.status, 400); assert.equal(unknownField.json.error.code, 'unknown_field');
    for (const bad of [null, '', 'x'.repeat(201)]) {
      const response = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'bad lineage', commandId: randomUUID(), supersedes: bad });
      assert.equal(response.status, 400, JSON.stringify(response.json));
    }
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('BG02-T5: a continuation carries its own input; the earlier prompt is not copied or replayed', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const a = await endedRun(h, session.id, { input: '/fixture error ORIGINAL-PROMPT-MARKER' });
    const b = await endedRun(h, session.id, { input: 'SECOND-PROMPT-MARKER only', supersedes: a.id });
    const events = ok(await h.api('GET', `/sessions/${session.id}/events`)).events;
    const inputs = events.filter((event) => event.runId === b.id && event.type === 'user.message');
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].data.text, 'SECOND-PROMPT-MARKER only');
    assert.equal(inputs[0].data.text.includes('ORIGINAL-PROMPT-MARKER'), false);
    assert.equal(events.filter((event) => event.type === 'user.message').length, 2, 'no prompt is re-emitted');
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

async function schema9Fixture(dir) {
  const store = await new RuntimeStore({ dataDir: dir }).open();
  const project = await store.createProject('lineage');
  const session = await store.createSession({ projectId: project.id, title: 'lineage', workspaceDir: path.join(dir, 'ws'), permissionMode: 'draft' });
  const other = await store.createSession({ projectId: project.id, title: 'other', workspaceDir: path.join(dir, 'ws2'), permissionMode: 'draft' });
  const provider = { provider: 'fake-openai-loopback', model: 'fake-model', api: 'openai-completions', realProvider: false };
  const make = async (sessionId, commandId) => (await store.createRun({ sessionId, input: 'attempt ' + commandId, adapterId: 'test-adapter', provider, extension: null, commandId, workspaceHostSession: null, credentialGeneration: 0 })).run;
  const first = await make(session.id, 'cmd-1');
  await store.updateRun(first.id, { status: 'failed', admissionOpen: false });
  const second = await make(session.id, 'cmd-2');
  await store.updateRun(second.id, { status: 'failed', admissionOpen: false });
  const foreign = await make(other.id, 'cmd-3');
  await store.updateRun(foreign.id, { status: 'failed', admissionOpen: false });
  const live = await make(session.id, 'cmd-4');
  await store.close();
  return { sessionId: session.id, first: first.id, second: second.id, foreign: foreign.id, live: live.id };
}

async function writeSchema8(dir, ids) {
  const file = path.join(dir, 'runtime-state.json');
  const state = JSON.parse(await readFile(file, 'utf8'));
  state.schemaVersion = 8;
  delete state.providerConnections;
  for (const run of state.runs) delete run.supersedes;
  const raw = Buffer.from(JSON.stringify(state, null, 1) + '\n');
  await writeFile(file, raw);
  return { file, raw, ids };
}

test('BG02-T6: schema 8 upgrades once with an exact backup, and an occupied backup path stops the upgrade', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-run-lineage-upgrade-'));
  let store;
  try {
    const ids = await schema9Fixture(dir);
    const { file, raw } = await writeSchema8(dir, ids);
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.state.schemaVersion, 10);
    assert.equal(store.listRuns().length, 4);
    for (const run of store.listRuns()) assert.equal(run.supersedes, null, 'history is never reinterpreted into a chain');
    await store.close(); store = null;
    const digest = createHash('sha256').update(raw).digest('hex');
    assert.deepEqual(await readFile(path.join(dir, `runtime-state.schema8.${digest}.json`)), raw);
    assert.equal((await readdir(dir)).filter((name) => name.includes('schema8')).length, 1);

    // A second upgrade attempt whose backup path is already taken (here by a
    // symlink) refuses and leaves the state file byte-identical.
    const second = await mkdtemp(path.join(tmpdir(), 'cw-run-lineage-upgrade-b-'));
    try {
      await schema9Fixture(second);
      const older = await writeSchema8(second, ids);
      const target = path.join(second, `runtime-state.schema8.${createHash('sha256').update(older.raw).digest('hex')}.json`);
      await symlink(path.join(second, 'elsewhere.json'), target);
      await assert.rejects(new RuntimeStore({ dataDir: second }).open());
      assert.deepEqual(await readFile(older.file), older.raw);
    } finally { await rm(second, { recursive: true, force: true }); }
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});

test('BG02-T6: a schema 10 state with an impossible lineage fails closed, and the base host refuses schema 10 entirely', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-run-lineage-bad-'));
  try {
    const ids = await schema9Fixture(dir);
    const file = path.join(dir, 'runtime-state.json');
    const good = JSON.parse(await readFile(file, 'utf8'));
    const withLineage = (runId, value) => {
      const state = structuredClone(good);
      state.runs.find((run) => run.id === runId).supersedes = value;
      return state;
    };
    for (const [label, state] of [
      ['absent target', withLineage(ids.second, randomUUID())],
      ['cross-session target', withLineage(ids.second, ids.foreign)],
      ['target still running', withLineage(ids.second, ids.live)],
    ]) {
      await writeFile(file, JSON.stringify(state, null, 2));
      await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), undefined, label);
    }
    await writeFile(file, JSON.stringify(good, null, 2));
    const reopened = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(reopened.state.schemaVersion, 10); await reopened.close();

    // The pre-BG-02 host must refuse the new schema outright rather than drop
    // the field it cannot see.
    const code = path.join(dir, 'base-code');
    const files = ['server/store.mjs', 'server/usage-details.mjs', 'server/runtime-lock.mjs', 'server/runtime-lock.py',
      'server/work-metrics.mjs', 'server/work-summary.mjs', 'server/async-task-state.mjs', 'harness/coordination-state.mjs', 'runtime/test-hooks.mjs'];
    for (const name of files) {
      const { stdout } = await exec('git', ['show', `${BASE_SHA}:app/${name}`], { cwd: repoRoot, encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
      const dest = path.join(code, name); await mkdir(path.dirname(dest), { recursive: true }); await writeFile(dest, stdout);
    }
    const { RuntimeStore: Base } = await import(pathToFileURL(path.join(code, 'server/store.mjs')).href);
    const bytes = await readFile(file);
    await assert.rejects(new Base({ dataDir: dir }).open(), /schemaVersion 10 is not supported/);
    assert.deepEqual(await readFile(file), bytes, 'a refusing old host does not rewrite the state');
  } finally { await rm(dir, { recursive: true, force: true }); }
});


test('integration: main schema 9 lineage survives schema 10 provider-connection migration', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-schema9-to10-'));
  let store;
  try {
    const ids = await schema9Fixture(dir);
    const file = path.join(dir, 'runtime-state.json');
    const old = JSON.parse(await readFile(file, 'utf8'));
    old.schemaVersion = 9; delete old.providerConnections;
    old.runs.find(run => run.id === ids.second).supersedes = ids.first;
    const raw = Buffer.from(JSON.stringify(old, null, 2) + '\n');
    await writeFile(file, raw);
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.state.schemaVersion, 10);
    assert.deepEqual(store.state.runs, old.runs);
    assert.deepEqual(store.getProviderConnections(), []);
    await store.close(); store = null;
    const digest = createHash('sha256').update(raw).digest('hex');
    assert.deepEqual(await readFile(path.join(dir, `runtime-state.schema9.${digest}.json`)), raw);
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.getRun(ids.second).supersedes, ids.first);
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});
