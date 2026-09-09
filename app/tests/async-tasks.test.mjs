import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile, writeFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../server/index.mjs';
import { RuntimeStore } from '../server/store.mjs';
import { digestText } from '../server/async-task-state.mjs';

async function until(fn) {
  const end = Date.now() + 10_000;
  while (!await fn()) { assert(Date.now() < end, 'condition timed out'); await delay(10); }
}
function reader({ lostLaunch = false, corrupt = false } = {}) {
  const texts = { A: 'Document A: independent evidence. 中文', B: 'Document B: delayed evidence.' }, jobs = new Map();
  const sources = Object.entries(texts).map(([id, text]) => ({ id, version: 'v1', digest: digestText(text) }));
  let starts = 0;
  const response = (taskId, source) => {
    const j = jobs.get(taskId);
    return { taskId, source, status: j?.status ?? 'missing', ...(j?.status === 'succeeded' ? { result: { text: corrupt ? 'wrong bytes' : texts[source.id] } } : {}) };
  };
  return { jobs, texts, get starts() { return starts; }, adapter: { id: 'read-doc', version: 'impl1', sources,
    async launch({ taskId, source }) { starts++; jobs.set(taskId, { source, status: 'running' }); if (lostLaunch) throw new Error('lost ACK'); return response(taskId, source); },
    async query({ taskId, source }) { return response(taskId, source); },
    async cancel({ taskId, source }) { const j = jobs.get(taskId); if (j && j.status !== 'succeeded') j.status = 'cancelled'; return response(taskId, source); },
  }, complete(id) { for (const j of jobs.values()) if (j.source.id === id) j.status = 'succeeded'; } };
}
const tool = (step, name, args) => ({ kind: 'tool', id: 'response-' + step, created: 1, toolCallId: 'call-' + step, name, arguments: args });
const final = () => ({ kind: 'text', id: 'response-final', created: 1, text: 'Synthetic result.' });
function turnResults(body) {
  const msgs = body.messages; let start = msgs.findLastIndex(m => m.role === 'user');
  return msgs.slice(start + 1).filter(m => m.role === 'tool');
}
async function harness(adapters, responder, dataDir) {
  dataDir ??= await mkdtemp(path.join(tmpdir(), 'cw-async-host-'));
  const host = await startServer({ dataDir, asyncTaskAdapters: adapters, responder, logger: () => {} });
  const api = async (method, url, input, token = host.token) => {
    const res = await fetch(host.url + '/api/v5' + url, { method, headers: { 'content-type': 'application/json', 'x-work-token': token },
      body: input === undefined ? undefined : JSON.stringify(input) });
    return { status: res.status, json: await res.json() };
  };
  let project = host.store.listProjects()[0];
  if (!project) project = (await api('POST', '/projects', { name: 'async test' })).json.project;
  return { host, api, dataDir, project, async session() { return (await api('POST', '/sessions', { projectId: project.id, title: 'async' })).json.session; },
    async run(session, input = 'two docs', commandId = 'command') { const r = await api('POST', `/sessions/${session.id}/runs`, { commandId, input }); assert.equal(r.status, 200); return r.json.run; },
    async terminal(run) { await until(() => ['completed','unknown','failed','cancelled'].includes(host.store.getRun(run.id).status)); return host.store.getRun(run.id); },
    async close(remove = true) { await host.close(); if (remove) await rm(dataDir, { recursive: true, force: true }); },
  };
}

test('two durable reads use actual host/Pi tools and wait only on the selected source', async () => {
  const r = reader();
  const h = await harness([r.adapter], ({ body }) => {
    const results = turnResults(body), n = results.length;
    if (n < 2) return tool(n, 'async_launch', { adapterId: 'read-doc', sourceId: n ? 'B' : 'A' });
    if (n === 2) return tool(n, 'ws_list', { path: '.' });
    if (n < 5) return tool(n, 'async_wait', { taskId: JSON.parse(results[n === 3 ? 0 : 1].content).id, waitMs: 5000 });
    return final();
  });
  try {
    const s = await h.session(), run = await h.run(s);
    await until(() => r.jobs.size === 2);
    await until(() => h.host.store.listEvents({ sessionId: s.id }).some(e => e.type === 'tool.result' && e.data.name === 'ws_list'));
    r.complete('A');
    await until(() => h.host.store.state.asyncTasks.find(t => t.source.id === 'A')?.deliveries.some(d => d.runtimeRecordedAt));
    assert.equal(h.host.store.state.asyncTasks.find(t => t.source.id === 'B').execution.status, 'running');
    assert.equal(h.host.store.getRun(run.id).status, 'running'); r.complete('B');
    assert.equal((await h.terminal(run)).status, 'completed');
    assert.equal(r.starts, 2);
    for (const t of h.host.store.state.asyncTasks) {
      assert.equal(t.result.digest, t.source.digest); assert(t.deliveries.some(d => d.runtimeRecordedAt));
      assert(t.deliveries.every(d => d.provider === 'unknown'));
    }
    const unauth = await h.api('GET', '/async-tasks?projectId=' + h.project.id, undefined, 'wrong'); assert.equal(unauth.status, 401);
    const foreign = await h.api('GET', `/async-tasks/${h.host.store.state.asyncTasks[0].id}?projectId=other`); assert.equal(foreign.status, 404);
  } finally { await h.close(); }
});

test('premature final and lost launch ACK preserve query-only recovery, then a later Run consumes the original task', async () => {
  const r = reader({ lostLaunch: true });
  let oldTask;
  const respond = ({ body, mode }) => {
    const n = turnResults(body).length;
    if (n) return final();
    return mode === 'recover' ? tool('recover', 'async_get', { taskId: oldTask }) : tool('launch', 'async_launch', { adapterId: 'read-doc', sourceId: 'A' });
  };
  let h = await harness([r.adapter], respond);
  try {
    const s = await h.session(), run = await h.run(s);
    assert.equal((await h.terminal(run)).status, 'unknown');
    assert.equal(h.host.store.getRun(run.id).error.code, 'async_dependencies_unresolved');
    oldTask = h.host.store.state.asyncTasks[0].id; await until(() => r.starts === 1);
    await h.close(false);
    h = await harness([r.adapter], respond, h.dataDir); r.complete('A');
    const recovered = await h.run(s, 'recover', 'new-command');
    assert.equal((await h.terminal(recovered)).status, 'completed'); assert.equal(r.starts, 1);
    const task = h.host.store.state.asyncTasks[0]; assert.equal(task.id, oldTask); assert.equal(task.origin.runId, run.id);
    const cancelled = await h.api('POST', `/async-tasks/${oldTask}/cancel`, { projectId: h.project.id, expectedRevision: task.revision });
    assert.equal(cancelled.json.execution.status, 'succeeded');
    const stale = await h.api('POST', `/async-tasks/${oldTask}/reconcile`, { projectId: h.project.id, expectedRevision: 1 });
    assert.equal(stale.status, 409);
    await h.api('DELETE', `/sessions/${s.id}`);
    const orphan = await h.api('GET', `/async-tasks/${oldTask}?projectId=${h.project.id}`);
    assert.equal(orphan.json.availability, 'orphaned'); assert.equal(orphan.json.result.digest, task.source.digest);
  } finally { await h.close(); }
});

test('source/implementation absence remains readable; corrupt bytes and cross-session consumption are refused', async () => {
  const r = reader({ corrupt: true }); let id;
  const h = await harness([r.adapter], ({ body }) => turnResults(body).length ? final() : tool('launch', 'async_launch', { adapterId: 'read-doc', sourceId: 'A' }));
  try {
    const s = await h.session(); await h.terminal(await h.run(s));
    id = h.host.store.state.asyncTasks[0].id; r.complete('A');
    await assert.rejects(h.host.service.asyncTasks.reconcile(id, { projectId: h.project.id }), { code: 'task_integrity_refusal' });
    assert.equal(h.host.store.state.asyncTasks[0].result, null);
    assert.throws(() => h.host.service.asyncTasks.inspect(id, { projectId: h.project.id, sessionId: 'another' }), { code: 'task_unavailable' });
    h.host.service.asyncTasks.adapters.clear();
    assert.equal((await h.api('GET', `/async-tasks/${id}?projectId=${h.project.id}`)).json.availability, 'adapter_unavailable');
    await assert.rejects(h.host.service.asyncTasks.reconcile(id, { projectId: h.project.id }), { code: 'task_policy_denied' });
  } finally { await h.close(); }
});

test('schema3/4 migrate only after full validation and exclusive backup; current-state corruption refuses open', async () => {
  for (const version of [3,4]) {
    const dir = await mkdtemp(path.join(tmpdir(), 'cw-async-schema-'));
    let store = await new RuntimeStore({ dataDir: dir }).open(); await store.close();
    const file = path.join(dir, 'runtime-state.json'), state = JSON.parse(await readFile(file, 'utf8'));
    state.schemaVersion = version; delete state.asyncTasks;
    const old = JSON.stringify(state); await writeFile(file, old);
    store = await new RuntimeStore({ dataDir: dir }).open(); assert.equal(store.state.schemaVersion, 5); await store.close();
    const backup = (await readdir(dir)).find(p => p.startsWith('runtime-state.schema' + version));
    assert.equal(await readFile(path.join(dir, backup), 'utf8'), old);
    await writeFile(file, old);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), { code: 'EEXIST' });
    assert.equal(await readFile(file, 'utf8'), old);
    await rm(path.join(dir, backup));
    await symlink(path.join(dir, 'missing'), path.join(dir, backup));
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), { code: 'EEXIST' });
    assert.equal(await readFile(file, 'utf8'), old);
    await rm(dir, { recursive: true, force: true });
  }
});


test('invalid UTF-8 schema4 is refused before backup or replacement', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-async-invalid-bytes-'));
  try {
    const store = await new RuntimeStore({ dataDir: dir }).open(); await store.createProject('unique-marker'); await store.close();
    const file = path.join(dir, 'runtime-state.json');
    const old = JSON.parse(await readFile(file, 'utf8')); old.schemaVersion = 4; delete old.asyncTasks;
    const encoded = Buffer.from(JSON.stringify(old)); encoded[encoded.indexOf('unique-marker')] = 0xff;
    await writeFile(file, encoded);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), { code: 'INVALID_STATE' });
    assert.deepEqual(await readFile(file), encoded);
    assert(!(await readdir(dir)).some(f => f.startsWith('runtime-state.schema')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
