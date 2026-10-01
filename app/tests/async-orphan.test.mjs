// Harness copied from the S15 reproduction (async-host fixtures).
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../server/index.mjs';
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

/* Deleting a Session retains its async tasks as orphans. Reconcile and cancel
 * of an orphan were refused as "policy denied": the permission check looked up
 * the deleted Session's Runtime Control. An unknown remote task could then never
 * be settled or cancelled (2026-09-30 convergence loop, S15). */
test('an orphaned async task of a deleted Session can still be reconciled by the local human', async () => {
  const r = reader({ lostLaunch: true });
  const respond = ({ body }) => turnResults(body).length ? final() : tool('launch', 'async_launch', { adapterId: 'read-doc', sourceId: 'A' });
  const h = await harness([r.adapter], respond);
  try {
    const s = await h.session(), run = await h.run(s);
    await h.terminal(run);
    const id = h.host.store.state.asyncTasks[0].id; await until(() => r.starts === 1);
    assert.equal(h.host.store.state.asyncTasks[0].execution.status, 'unknown', 'the lost launch ACK leaves the task unknown');
    r.complete('A');
    assert.equal((await h.api('DELETE', `/sessions/${s.id}`)).status, 200);
    const t = h.host.store.state.asyncTasks[0];
    const reconciled = await h.api('POST', `/async-tasks/${id}/reconcile`, { projectId: h.project.id, expectedRevision: t.revision });
    assert.equal(reconciled.status, 200, JSON.stringify(reconciled.json));
    assert.equal(reconciled.json.execution.status, 'succeeded', 'the orphan settles from the remote record');
  } finally { await h.close(); }
});

test('an orphaned running async task of a deleted Session can still be cancelled by the local human', async () => {
  const r = reader({ lostLaunch: true });
  const respond = ({ body }) => turnResults(body).length ? final() : tool('launch', 'async_launch', { adapterId: 'read-doc', sourceId: 'A' });
  const h = await harness([r.adapter], respond);
  try {
    const s = await h.session(), run = await h.run(s);
    await h.terminal(run);
    const id = h.host.store.state.asyncTasks[0].id; await until(() => r.starts === 1);
    assert.equal((await h.api('DELETE', `/sessions/${s.id}`)).status, 200);
    const t = h.host.store.state.asyncTasks[0];
    const cancelled = await h.api('POST', `/async-tasks/${id}/cancel`, { projectId: h.project.id, expectedRevision: t.revision });
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    assert.equal([...r.jobs.values()][0].status, 'cancelled', 'the remote work was asked to stop');
  } finally { await h.close(); }
});
