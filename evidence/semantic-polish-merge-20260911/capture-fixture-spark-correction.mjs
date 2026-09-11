#!/usr/bin/env node
// Repair only the Spark Matter in a live capture fixture. The temporary
// provider is a loopback OpenAI-compatible endpoint owned by this process;
// candidate creation still travels through the product's HTTP/Pi/Core Run.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { buildReview } from '../../app/domains/inbound-nda/index.mjs';

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
async function poll(runId, timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    const run = (await api('GET', `/runs/${runId}`)).run;
    if (['completed', 'failed', 'cancelled', 'unknown'].includes(run.status)) return run;
    if (Date.now() - start > timeoutMs) throw new Error(`run ${runId} timed out at ${run.status}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}
function sseChunk(value) { return `data: ${JSON.stringify(value)}\n\n`; }
function providerServer(reviewDomain) {
  const model = 'spark-correction-model';
  let requests = 0;
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ object: 'list', data: [{ id: model }] }));
      return;
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'correction route not found' } }));
      return;
    }
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      requests += 1;
      const id = `spark-correction-response-${requests}`;
      const created = Math.floor(Date.now() / 1000);
      response.writeHead(200, { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream' });
      if (requests === 1) {
        response.write(sseChunk({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `spark-correction-call-${requests}`, type: 'function' }] }, finish_reason: null }] }));
        response.write(sseChunk({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name: 'se_submit_candidate', arguments: JSON.stringify({ domain: reviewDomain }) } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      } else {
        const text = 'I prepared a source-backed Spark review from the current approved source. It remains pending human Review.';
        response.write(sseChunk({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }));
        response.write(sseChunk({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] }));
        response.write(sseChunk({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
      }
      response.end('data: [DONE]\n\n');
    });
  });
  return { model, server, get requests() { return requests; } };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sparkSessionId = manifest.sessions.spark;
const beforeSurface = await api('GET', `/sessions/${sparkSessionId}/surface`);
const beforeProjection = beforeSurface.projection;
if (!beforeProjection?.matter?.id || !beforeProjection.sources?.[0]) throw new Error('Spark session has no bound Matter/source');
const reviewDomain = buildReview({ sources: beforeProjection.sources, facts: beforeProjection.domain.facts });
const provider = providerServer(reviewDomain);
await new Promise((resolve, reject) => { provider.server.once('error', reject); provider.server.listen(0, '127.0.0.1', resolve); });
const address = provider.server.address();
const baseUrl = `http://127.0.0.1:${address.port}/v1`;
const originalConfig = (await api('GET', '/provider-config')).config;
let connection;
try {
  connection = (await api('POST', '/provider-connections', { api: 'openai-completions', baseUrl, models: [{ id: provider.model, contextWindow: 4096 }], apiKey: `capture-spark-correction-${randomUUID()}` })).connection;
  await api('PUT', '/provider-config', { provider: connection.providerIdentity, model: provider.model, api: connection.api });
  const created = (await api('POST', `/sessions/${sparkSessionId}/runs`, { commandId: `capture-spark-candidate-${randomUUID()}`, input: 'Prepare a source-backed review for the refreshed Spark source.' })).run;
  const settled = await poll(created.id);
  if (settled.status !== 'completed') throw new Error(`Spark candidate Run did not complete: ${JSON.stringify(settled)}`);
  const candidateSurface = await api('GET', `/sessions/${sparkSessionId}/surface`);
  const candidate = candidateSurface.projection.candidates?.at(-1);
  if (!candidate?.id) throw new Error('Spark Run completed without a Candidate');
  const source = candidateSurface.projection.sources[0];
  const text = `${source.text}\n\n6. Delivery. Synthetic Spark source refresh after Candidate creation.\n`;
  const nextSource = { ...source, version: source.version + 1, text, digest: createHash('sha256').update(text).digest('hex') };
  const replaced = await api('POST', `/sessions/${sparkSessionId}/actions`, {
    extensionId: 'inbound-nda', generation: candidateSurface.extension.generation, action: 'replace_sources',
    payload: { sources: [nextSource], revision: candidateSurface.projection.matter.source_version + 1 },
  });
  const derivations = await api('GET', `/work-derivations?projectId=${encodeURIComponent(manifest.projects.primary)}`);
  const spark = derivations.matters.find(item => item.matterId === beforeProjection.matter.id);
  if (!spark || spark.derivations.stale < 1 || spark.derivations.total < 1 || spark.staleRefs.length < 1 || !spark.sourceSetChange) throw new Error(`Spark derivation did not become stale: ${JSON.stringify(spark)}`);
  manifest.runs.sparkCandidate = created.id;
  manifest.matter.sparkCandidate = candidate.id;
  manifest.scenarios.spark = {
    ...manifest.scenarios.spark,
    sessionId: sparkSessionId,
    matterId: beforeProjection.matter.id,
    candidateId: candidate.id,
    candidateRunId: created.id,
    replaced,
    derivations: spark,
    provider_mode: 'temporary local compatible loopback',
    execution_mode: 'real-compatible-connection',
    state: 'candidate at source v2; source replaced at v3; stale derivation verified',
  };
  manifest.spark_correction = {
    source_before: source.version,
    source_after: nextSource.version,
    candidateId: candidate.id,
    runId: created.id,
    stale: spark.derivations.stale,
    total: spark.derivations.total,
    provider_mode: 'temporary local compatible loopback',
    execution_mode: 'real-compatible-connection',
    seed_provider_mode: 'catalog fake-openai-loopback / local-fake',
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ origin, source_sha: manifest.source_sha, sparkSessionId, matterId: beforeProjection.matter.id, candidateId: candidate.id, runId: created.id, sourceVersion: nextSource.version, stale: spark.derivations.stale, total: spark.derivations.total, manifest: manifestPath }));
} finally {
  await api('PUT', '/provider-config', originalConfig);
  if (connection) await api('DELETE', `/provider-connections/${connection.id}`);
  await new Promise(resolve => provider.server.close(() => resolve()));
}
