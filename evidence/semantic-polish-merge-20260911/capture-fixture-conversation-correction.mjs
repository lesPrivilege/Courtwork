#!/usr/bin/env node
// Repair the Attention conversation capture without changing the original
// failed run. The temporary provider is local-only and compatible with the
// product's normal provider connection contract. Disclosure is granted by the
// human Attention action while this new Run is waiting on ask_user; all three
// Attention tools then execute through the real Pi/Core runtime.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const origin = arg('--origin', 'http://127.0.0.1:60985');
const manifestPath = arg('--manifest', '/tmp/courtwork-capture-merged-none.json');
const token = (await (await fetch(`${origin}/api/v5/bootstrap`)).json()).sessionToken;
const headers = { 'content-type': 'application/json', 'x-work-token': token };
async function api(method, route, body) {
  const response = await fetch(`${origin}/api/v5${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} -> ${response.status}: ${text}`);
  return json;
}
async function waitRun(runId, predicate, timeoutMs = 15000) {
  const started = Date.now();
  for (;;) {
    const run = (await api('GET', `/runs/${runId}`)).run;
    if (predicate(run)) return run;
    if (Date.now() - started > timeoutMs) throw new Error(`Run ${runId} timed out at ${run.status}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}
async function waitEvent(sessionId, runId, type, timeoutMs = 15000) {
  const started = Date.now();
  for (;;) {
    const events = (await api('GET', `/sessions/${sessionId}/events?afterSeq=0`)).events;
    const found = events.find(event => event.runId === runId && event.type === type);
    if (found) return found;
    if (Date.now() - started > timeoutMs) throw new Error(`event ${type} missing for ${runId}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}
function sse(value) { return `data: ${JSON.stringify(value)}\n\n`; }
function loopbackProvider() {
  const model = 'conversation-correction-model';
  const state = { projectId: null, attentionId: null };
  let requests = 0;
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ object: 'list', data: [{ id: model }] }));
      return;
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'conversation correction route not found' } }));
      return;
    }
    request.resume();
    request.on('end', () => {
      requests += 1;
      const id = `conversation-correction-response-${requests}`;
      const created = Math.floor(Date.now() / 1000);
      response.writeHead(200, { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream' });
      const emitTool = (name, args) => {
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `conversation-correction-call-${requests}`, type: 'function' }] }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      };
      if (requests === 1) emitTool('ask_user', { prompt: 'Proceed with the disclosed Project Cedar review item?' });
      else if (requests === 2) emitTool('attention_projects', {});
      else if (requests === 3) emitTool('attention_list', { project_id: state.projectId });
      else if (requests === 4) emitTool('attention_inspect', { project_id: state.projectId, attention_id: state.attentionId, expected_revision: 2 });
      else {
        const text = 'I inspected the disclosed Project Cedar review item and its source-backed context. It remains pending human Review.';
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] }));
        response.write(sse({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }));
      }
      response.end('data: [DONE]\n\n');
    });
  });
  return { model, server, state, get requests() { return requests; } };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const originalSessionId = manifest.sessions.conversation;
const originalRunId = manifest.runs.conversation;
const attentionId = manifest.attention.id;
const projectId = manifest.attention.projectId;
const provider = loopbackProvider();
provider.state.projectId = projectId;
provider.state.attentionId = attentionId;
await new Promise((resolve, reject) => { provider.server.once('error', reject); provider.server.listen(0, '127.0.0.1', resolve); });
const address = provider.server.address();
const baseUrl = `http://127.0.0.1:${address.port}/v1`;
const originalConfig = (await api('GET', '/provider-config')).config;
let connection;
try {
  connection = (await api('POST', '/provider-connections', { api: 'openai-completions', baseUrl, models: [{ id: provider.model, contextWindow: 4096 }], apiKey: `capture-conversation-correction-${randomUUID()}` })).connection;
  await api('PUT', '/provider-config', { provider: connection.providerIdentity, model: provider.model, api: connection.api });
  const conversationId = randomUUID();
  const session = (await api('POST', '/attention/conversations', { conversationId })).session;
  const created = (await api('POST', `/sessions/${session.id}/runs`, { commandId: `capture-conversation-correction-${randomUUID()}`, input: 'Help me inspect the review item for Project Cedar.' })).run;
  const question = await waitEvent(session.id, created.id, 'question.open');
  const waiting = await waitRun(created.id, run => run.status === 'waiting_user');
  const disclosure = await api('POST', `/attention/${attentionId}/actions`, {
    projectId,
    request: {
      schema_version: 1,
      request_id: `capture-conversation-disclosure-${randomUUID()}`,
      attention_id: attentionId,
      expected_revision: 1,
      action: 'request_disclosure',
      payload: {
        grant: {
          adapter_id: waiting.adapterId,
          purpose: 'attention-runtime',
          fields: ['registry', 'details', 'sources', 'relations', 'events', 'signal'],
          expires_at: '2099-01-01T00:00:00Z',
        },
      },
    },
  });
  await api('POST', `/runs/${created.id}/questions/${question.data.id}`, { answer: 'Proceed with the disclosed review item.' });
  const settled = await waitRun(created.id, run => ['completed', 'failed', 'cancelled', 'unknown'].includes(run.status));
  if (settled.status !== 'completed') throw new Error(`corrected conversation failed: ${JSON.stringify(settled)}`);
  const snapshot = await api('GET', `/sessions/${session.id}`);
  const toolResults = snapshot.events.filter(event => event.runId === created.id && event.type === 'tool.result').map(event => ({ name: event.data.name, isError: event.data.isError, text: event.data.text }));
  const required = ['attention_projects', 'attention_list', 'attention_inspect'];
  if (required.some(name => !toolResults.some(result => result.name === name && result.isError === false))) throw new Error(`corrected conversation tool proof incomplete: ${JSON.stringify(toolResults)}`);
  manifest.sessions.conversationCorrection = session.id;
  manifest.runs.conversationCorrection = created.id;
  manifest.scenarios.conversationFailedOriginal = { sessionId: originalSessionId, runId: originalRunId, issue: 'attention item was not disclosed to the original Runtime adapter; attention_inspect returned NOT_FOUND while earlier discovery tools succeeded' };
  manifest.scenarios.conversation = { ...manifest.scenarios.conversation, sessionId: session.id, runId: created.id, attentionId, disclosureRevision: disclosure.revision, state: 'successful governed Attention tool chain', toolResults: toolResults.map(({ name, isError }) => ({ name, isError })), provider_mode: 'temporary local compatible loopback', execution_mode: 'real-compatible-connection', seed_provider_mode: 'catalog fake-openai-loopback / local-fake' };
  manifest.conversation_correction = { originalRunId, correctedRunId: created.id, correctedSessionId: session.id, attentionId, disclosureRevision: disclosure.revision, toolResults, provider_mode: 'temporary local compatible loopback', execution_mode: 'real-compatible-connection', seed_provider_mode: 'catalog fake-openai-loopback / local-fake' };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ origin, source_sha: manifest.source_sha, originalRunId, correctedSessionId: session.id, correctedRunId: created.id, attentionId, disclosureRevision: disclosure.revision, toolResults: toolResults.map(({ name, isError }) => ({ name, isError })), manifest: manifestPath }));
} finally {
  await api('PUT', '/provider-config', originalConfig);
  if (connection) await api('DELETE', `/provider-connections/${connection.id}`);
  await new Promise(resolve => provider.server.close(() => resolve()));
}
