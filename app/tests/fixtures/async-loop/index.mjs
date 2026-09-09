import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DOCUMENTS, FIXTURE_IDENTITY, fixtureInput } from './contract.mjs';

export { DOCUMENTS, FIXTURE_IDENTITY, fixtureInput };
export const PHASES = Object.freeze(['launchAccepted', 'startExecution', 'resultGenerated', 'sendReceipt']);

/** Fixture-only slow provider. A real child owns synthetic records and port 0. */
export async function createAsyncLoopFixture({ root } = {}) {
  const directory = root ?? await mkdtemp(path.join(tmpdir(), 'courtwork-async-fixture-'));
  const statePath = path.join(directory, 'synthetic-provider-jobs.json');
  const providerFile = fileURLToPath(new URL('./fixture-provider.mjs', import.meta.url));
  let provider; let origin;
  async function startProvider() {
    provider = spawn(process.execPath, [providerFile, directory], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    provider.stdout.on('data', (chunk) => { stdout += chunk; }); provider.stderr.on('data', (chunk) => { stderr += chunk; });
    const started = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`fixture provider did not start: ${stderr}`)), 5_000);
      const onData = () => { const line = stdout.split('\n').find((x) => x.startsWith('FIXTURE_PROVIDER ')); if (line) { clearTimeout(timer); resolve(JSON.parse(line.slice(17))); } };
      provider.stdout.on('data', onData); provider.once('exit', (code, signal) => { clearTimeout(timer); reject(new Error(`fixture provider exited ${code}/${signal}: ${stderr}`)); }); onData();
    });
    origin = started.origin;
  }
  async function request(method, pathname, body) {
    const response = await fetch(origin + pathname, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text(); return { status: response.status, json: text ? JSON.parse(text) : null };
  }
  await startProvider();
  return {
    get origin() { return origin; }, get baseUrl() { return origin; }, root: directory, statePath, documents: JSON.parse(JSON.stringify(DOCUMENTS)), identity: FIXTURE_IDENTITY,
    launch(jobId, documentId, { input = fixtureInput(jobId), ...options } = {}) { return request('POST', '/jobs', { jobId, documentId, input, options }); },
    query(jobId) { return request('GET', `/jobs/${encodeURIComponent(jobId)}`); },
    cancel(jobId, reason) { return request('POST', `/jobs/${encodeURIComponent(jobId)}/cancel`, { reason }); },
    receipt(jobId, receiptId) { return request('POST', `/jobs/${encodeURIComponent(jobId)}/receipts`, { receiptId }); },
    release(jobId, phase) { return request('POST', '/_fixture/release', { jobId, phase }); },
    barrier(jobId, phase) { return request('POST', '/_fixture/barrier', { jobId, phase }); },
    async snapshot(jobId) { return (await request('GET', `/_fixture/state?jobId=${encodeURIComponent(jobId)}`)).json; },
    async launchCounts() { return (await request('GET', '/_fixture/state')).json.launchCounts; },
    get providerProcess() { return provider; },
    async killProvider(signal = 'SIGKILL') { if (provider.exitCode === null && provider.signalCode === null) provider.kill(signal); await new Promise((resolve) => provider.once('exit', resolve)); },
    restartProvider() { return startProvider(); },
    startQueryChild(jobId) { return spawn(process.execPath, [fileURLToPath(new URL('./fixture-child.mjs', import.meta.url)), origin, jobId], { stdio: ['ignore', 'pipe', 'pipe'] }); },
    async close() { if (provider?.exitCode === null && provider?.signalCode === null) { provider.kill('SIGTERM'); await new Promise((resolve) => provider.once('exit', resolve)); } if (!root) await rm(directory, { recursive: true, force: true }); },
  };
}
