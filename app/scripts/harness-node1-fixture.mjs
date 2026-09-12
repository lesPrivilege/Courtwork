// Deterministic GUI evidence only. Never contacts a real provider.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.mjs';
import { fixture, MODEL } from '../tests/fixtures/deepseek-loopback.mjs';
const wire = await fixture();
const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-harness-node1-gui-'));
const runtime = await startServer({ dataDir, port: 0, budget: { maxTurns: 4, deadlineMs: 60000 } });
const api = async (method, p, body) => {
  const res = await fetch(runtime.url + '/api/v5' + p, { method, headers: { 'content-type': 'application/json', 'x-work-token': runtime.token }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await res.json(); if (!res.ok) throw new Error(JSON.stringify(result)); return result;
};
await api('PUT', '/provider-credential', { connectionId: 'catalog-deepseek', apiKey: 'SYNTHETIC_DEEPSEEK_KEY' });
runtime.service.modelRuntime.getModel('deepseek', MODEL).baseUrl = wire.baseUrl; // Synthetic catalog transport only.
await api('PUT', '/provider-config', { expectedVersion: (await api('GET', '/provider-config')).version, provider: 'deepseek', model: MODEL, api: 'openai-completions', baseUrl: wire.baseUrl, reasoningEffort: 'high' });
const { project } = await api('POST', '/projects', { name: 'Harness synthetic verification' });
const { session } = await api('POST', '/sessions', { projectId: project.id, title: 'DeepSeek loopback · GUI evidence', permissionMode: 'ask' });
console.log(JSON.stringify({ url: runtime.url, sessionId: session.id, kind: 'synthetic-loopback', endpoint: wire.baseUrl, model: MODEL }));
let closing;
const close = () => { closing ??= runtime.close().then(() => wire.close()).finally(() => { process.removeListener('SIGINT', close); process.removeListener('SIGTERM', close); }); };
process.on('SIGINT', close); process.on('SIGTERM', close);
