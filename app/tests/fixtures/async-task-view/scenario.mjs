import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../../../server/index.mjs';
import { makeReader } from './synthetic.mjs';

/**
 * Real `startServer` on port 0 with one synthetic in-process adapter, driving
 * the local Pi loop through two ordinary Runs:
 *
 *  - project "primary"  (/p-docs): launches doc-alpha + doc-beta, then waits
 *    on each so both settle `succeeded` with a runtime-recorded delivery.
 *  - project "foreign"  (/q-docs): launches doc-gamma and waits on it.
 *
 * This is the same retained-task surface a UI would read over HTTP; no real
 * provider, external adapter or credential store is involved.
 */
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'unknown']);
const tool = (step, name, args) => ({ kind: 'tool', id: 'response-' + step, created: 1, toolCallId: 'call-' + step, name, arguments: args });
const final = () => ({ kind: 'text', id: 'response-final', created: 1, text: 'Synthetic final.' });
function turnResults(body) {
  const msgs = body.messages;
  const start = msgs.findLastIndex(m => m.role === 'user');
  return msgs.slice(start + 1).filter(m => m.role === 'tool');
}
async function until(fn, what) {
  const end = Date.now() + 15_000;
  while (!(await fn())) { if (Date.now() > end) throw new Error('scenario timeout: ' + what); await delay(15); }
}

export async function bootScenario() {
  const reader = makeReader();
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-task-view-'));
  const host = await startServer({ dataDir, asyncTaskAdapters: [reader.adapter], responder: ({ body, mode }) => {
    const results = turnResults(body);
    const n = results.length;
    if (mode === '/p-docs') {
      if (n < 2) return tool(n, 'async_launch', { adapterId: 'read-doc', sourceId: n === 0 ? 'doc-alpha' : 'doc-beta' });
      if (n === 2) return tool(n, 'ws_list', { path: '.' });
      if (n === 3) return tool(n, 'async_wait', { taskId: JSON.parse(results[0].content).id, waitMs: 5000 });
      if (n === 4) return tool(n, 'async_wait', { taskId: JSON.parse(results[1].content).id, waitMs: 5000 });
      return final();
    }
    if (mode === '/q-docs') {
      if (n === 0) return tool(n, 'async_launch', { adapterId: 'read-doc', sourceId: 'doc-gamma' });
      if (n === 1) return tool(n, 'async_wait', { taskId: JSON.parse(results[0].content).id, waitMs: 5000 });
      return final();
    }
    return final();
  }, logger: () => {} });

  const api = async (method, url, input, token = host.token) => {
    const headers = { 'content-type': 'application/json', ...(token ? { 'x-work-token': token } : {}) };
    const res = await fetch(host.url + '/api/v5' + url, { method, headers,
      body: input === undefined ? undefined : JSON.stringify(input) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const taskOf = sourceId => host.store.state.asyncTasks.find(t => t.source.id === sourceId);
  const delivered = sourceId => taskOf(sourceId)?.deliveries.some(d => d.runtimeRecordedAt);
  const terminal = async runId => { await until(() => TERMINAL.has(host.store.getRun(runId)?.status), 'run terminal'); return host.store.getRun(runId); };

  try {
    const primary = (await api('POST', '/projects', { name: 'task-view-primary' })).body.project;
    const foreign = (await api('POST', '/projects', { name: 'task-view-foreign' })).body.project;
    const sessionP = (await api('POST', '/sessions', { projectId: primary.id, title: 'primary docs' })).body.session;
    const sessionQ = (await api('POST', '/sessions', { projectId: foreign.id, title: 'foreign docs' })).body.session;

    const runP = (await api('POST', `/sessions/${sessionP.id}/runs`, { commandId: 'primary-run', input: '/p-docs' })).body.run;
    await until(() => host.store.listEvents({ sessionId: sessionP.id }).some(e => e.type === 'tool.result' && e.data.name === 'ws_list'), 'ws_list barrier');
    reader.complete('alpha'); reader.complete('beta');
    await until(() => delivered('doc-alpha') && delivered('doc-beta'), 'primary deliveries');
    const runPResult = await terminal(runP.id);
    if (runPResult.status !== 'completed') throw new Error(`primary run ended ${runPResult.status}`);

    const runQ = (await api('POST', `/sessions/${sessionQ.id}/runs`, { commandId: 'foreign-run', input: '/q-docs' })).body.run;
    await until(() => reader.hasJob('doc-gamma'), 'gamma launched');
    reader.complete('gamma');
    await until(() => delivered('doc-gamma'), 'foreign delivery');
    const runQResult = await terminal(runQ.id);
    if (runQResult.status !== 'completed') throw new Error(`foreign run ended ${runQResult.status}`);

    return {
      host, api, dataDir, reader, primary, foreign, sessionP, sessionQ, runP, runQ, taskOf,
      async close(remove = true) { await host.close(); if (remove) await rm(dataDir, { recursive: true, force: true }); },
    };
  } catch (error) {
    await host.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
