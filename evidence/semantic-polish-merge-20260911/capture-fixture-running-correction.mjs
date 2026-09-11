#!/usr/bin/env node
// Standalone running-state fixture. It starts a fresh f137 server, writes a
// real workspace file through ws_write, then starts a second natural-language
// Run whose ws_list and ws_read succeed before a paced local compatible stream.
// No existing capture server, DB, DOM or product source is touched.
import http from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { startServer } from '../../app/server/index.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const manifestPath = arg('--manifest', path.join(tmpdir(), `courtwork-running-correction-${randomUUID()}.json`));
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const slowText = `I inspected the Project Cedar review workspace and found the current source-backed working notes. The workspace contains the review memo written during the preparation step, and the file is available through the host workspace tools. The approved source records a three-year confidentiality term, limited use for the Project Cedar acquisition, need-to-know recipients, and reasonable safeguards with prompt notice after unauthorized access. The review remains a proposal for human consideration. I have not accepted, resolved, or published the Candidate, and no tool result grants that authority. I will keep the current source version and the written notes together while this Run remains active so the reviewer can inspect the evidence, compare the source basis, and decide what should happen next. This response is still streaming; the work state remains open for review.`;
let requestNumber = 0;
let activeRunId = null;

function sse(value) { return `data: ${JSON.stringify(value)}\n\n`; }
function correctionProvider() {
  const model = 'running-correction-model';
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ object: 'list', data: [{ id: model }] }));
      return;
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'running correction route not found' } }));
      return;
    }
    request.resume();
    request.on('end', async () => {
      const id = `running-correction-response-${++requestNumber}`;
      const created = Math.floor(Date.now() / 1000);
      response.writeHead(200, { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream' });
      const emitTool = (name, args) => {
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `running-correction-call-${requestNumber}`, type: 'function' }] }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      };
      if (requestNumber === 1) emitTool('ws_write', { path: 'out/project-cedar-review.md', text: '# Project Cedar review\n\nSource-backed working notes for human review.\n' });
      else if (requestNumber === 2) {
        const text = 'The Project Cedar review notes are ready for inspection.';
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      } else if (requestNumber === 3) emitTool('ws_list', {});
      else if (requestNumber === 4) emitTool('ws_read', { path: 'out/project-cedar-review.md' });
      else {
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
        for (const character of slowText) {
          await new Promise(resolve => setTimeout(resolve, 150));
          if (response.destroyed) return;
          response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: character }, finish_reason: null }] }));
        }
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: slowText.length, total_tokens: slowText.length + 1 } }));
      }
      response.end('data: [DONE]\n\n');
    });
  });
  return { model, server };
}

const dataDir = await mkdtemp(path.join(tmpdir(), 'courtwork-running-correction-'));
const provider = correctionProvider();
await new Promise((resolve, reject) => { provider.server.once('error', reject); provider.server.listen(0, '127.0.0.1', resolve); });
const address = provider.server.address();
const baseUrl = `http://127.0.0.1:${address.port}/v1`;
const runtime = await startServer({ dataDir, port: 0 });
const headers = { 'content-type': 'application/json', 'x-work-token': runtime.token };
async function api(method, route, body) {
  const response = await fetch(runtime.url + '/api/v5' + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} -> ${response.status}: ${text}`);
  return json;
}
async function waitEvent(sessionId, runId, type, name, timeoutMs = 15000) {
  const started = Date.now();
  for (;;) {
    const events = (await api('GET', `/sessions/${sessionId}/events?afterSeq=0`)).events;
    const event = events.find(item => item.runId === runId && item.type === type && (!name || item.data?.name === name));
    if (event) return event;
    if (Date.now() - started > timeoutMs) throw new Error(`event ${type}/${name ?? ''} missing for ${runId}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}
async function waitStatus(runId, status, timeoutMs = 15000) {
  const started = Date.now();
  for (;;) {
    const run = (await api('GET', `/runs/${runId}`)).run;
    if (run.status === status) return run;
    if (Date.now() - started > timeoutMs) throw new Error(`Run ${runId} did not reach ${status}: ${run.status}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

const manifest = { schemaVersion: 1, fixtureVersion: 2, dataClass: 'synthetic; actual HTTP/Pi/Core; standalone running correction', source_sha: sourceSha, provider_mode: 'temporary local compatible loopback', execution_mode: 'real-compatible-connection', origin: runtime.url, data_dir: dataDir, generated_at: new Date().toISOString() };
try {
  const connection = (await api('POST', '/provider-connections', { api: 'openai-completions', baseUrl, models: [{ id: provider.model, contextWindow: 4096 }], apiKey: `capture-running-correction-${randomUUID()}` })).connection;
  await api('PUT', '/provider-config', { provider: connection.providerIdentity, model: provider.model, api: connection.api });
  const project = (await api('POST', '/projects', { name: 'Project Cedar review' })).project;
  const session = (await api('POST', '/sessions', { projectId: project.id, title: 'Source inspection', permissionMode: 'draft' })).session;
  const seedRun = (await api('POST', `/sessions/${session.id}/runs`, { commandId: `running-seed-${randomUUID()}`, input: 'Prepare the Project Cedar review workspace.' })).run;
  await waitStatus(seedRun.id, 'completed');
  const workspace = await api('GET', `/sessions/${session.id}/workspace`);
  if (!JSON.stringify(workspace).includes('project-cedar-review.md')) throw new Error('real workspace file was not recorded');
  const runningRun = (await api('POST', `/sessions/${session.id}/runs`, { commandId: `running-stream-${randomUUID()}`, input: 'Inspect the Project Cedar workspace and summarize the current review.' })).run;
  activeRunId = runningRun.id;
  const wsList = await waitEvent(session.id, runningRun.id, 'tool.result', 'ws_list');
  if (wsList.data.isError) throw new Error(`ws_list failed: ${JSON.stringify(wsList.data)}`);
  const wsRead = await waitEvent(session.id, runningRun.id, 'tool.result', 'ws_read');
  if (wsRead.data.isError) throw new Error(`ws_read failed: ${JSON.stringify(wsRead.data)}`);
  const running = await waitStatus(runningRun.id, 'running');
  manifest.projectId = project.id;
  manifest.sessionId = session.id;
  manifest.seedRunId = seedRun.id;
  manifest.runningRunId = runningRun.id;
  manifest.workspace = { file: 'out/project-cedar-review.md', listed: true, read: true };
  manifest.scenario = { sessionId: session.id, runId: runningRun.id, seedRunId: seedRun.id, state: 'active slow stream after successful ws_list and ws_read', wsList: { name: wsList.data.name, isError: wsList.data.isError }, wsRead: { name: wsRead.data.name, isError: wsRead.data.isError }, active: { status: running.status, admissionOpen: running.admissionOpen }, provider_mode: 'temporary local compatible loopback', execution_mode: 'real-compatible-connection' };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ manifest: manifestPath, source_sha: sourceSha, origin: runtime.url, data_dir: dataDir, projectId: project.id, sessionId: session.id, seedRunId: seedRun.id, runningRunId: runningRun.id, wsList: { name: wsList.data.name, isError: wsList.data.isError }, wsRead: { name: wsRead.data.name, isError: wsRead.data.isError }, status: running.status, admissionOpen: running.admissionOpen }));
  await new Promise(resolve => {
    const stop = async () => {
      if (activeRunId) await api('POST', `/runs/${activeRunId}/cancel`, {}).catch(() => {});
      await runtime.close().catch(() => {});
      await provider.server.close();
      await rm(dataDir, { recursive: true, force: true });
      resolve();
    };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  });
} catch (error) {
  await runtime.close().catch(() => {});
  await provider.server.close().catch(() => {});
  await rm(dataDir, { recursive: true, force: true });
  throw error;
}
