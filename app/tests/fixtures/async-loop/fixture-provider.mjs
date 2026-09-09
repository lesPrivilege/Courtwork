import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { DOCUMENTS, FIXTURE_IDENTITY, sha256Utf8 } from './contract.mjs';

const root = process.argv[2], statePath = path.join(root, 'synthetic-provider-jobs.json');
const docs = new Map(Object.values(DOCUMENTS).map((document) => [document.id, document]));
const phases = new Set(['launchAccepted', 'startExecution', 'resultGenerated', 'sendReceipt']), jobs = new Map(), gates = new Map(), events = new Map();
const key = (jobId, phase) => `${jobId}:${phase}`;
function deferred() { let resolve; return { promise: new Promise((done) => { resolve = done; }), resolve }; }
function item(registry, jobId, phase) { const id = key(jobId, phase); if (!registry.has(id)) registry.set(id, deferred()); return registry.get(id); }
const copy = (value) => JSON.parse(JSON.stringify(value));
async function persist() { await mkdir(root, { recursive: true }); await writeFile(statePath, JSON.stringify({ jobs: [...jobs.values()] }, null, 2)); }
try { for (const job of JSON.parse(await readFile(statePath, 'utf8')).jobs ?? []) jobs.set(job.jobId, job); } catch (error) { if (error.code !== 'ENOENT') throw error; }
function view(job) { return copy({ fixture: FIXTURE_IDENTITY, jobId: job.jobId, document: job.document, input: job.input, status: job.status, result: job.result ?? null, launchCount: job.launchCount, cancellation: job.cancellation ?? null, receipt: job.receipt ?? null }); }
function signal(jobId, phase) { item(events, jobId, phase).resolve(); }
async function run(job) { await item(gates, job.jobId, 'startExecution').promise; job.executionStarted = true; if (job.status === 'accepted') job.status = 'executing'; signal(job.jobId, 'startExecution'); await persist(); await item(gates, job.jobId, 'resultGenerated').promise; job.result = { resultId: `result-${job.jobId}`, document: job.document, input: job.input, content: job.document.content }; if (job.status !== 'cancelled') job.status = 'succeeded'; signal(job.jobId, 'resultGenerated'); await persist(); }
async function launch(input) { const document = docs.get(input?.documentId); const expectedInputDigest = input?.input?.content ? sha256Utf8(input.input.content) : null; if (!input?.jobId || !document || document.digest !== sha256Utf8(document.content) || !input.input?.version || !input.input?.content || input.input.digest !== expectedInputDigest || !/^sha256:[0-9a-f]{64}$/.test(input.input.digest)) throw new Error('jobId, exact document bytes, and immutable lowercase SHA-256 input are required'); let job = jobs.get(input.jobId); if (job) { job.launchCount += 1; await persist(); return job; } job = { jobId: input.jobId, document, input: copy(input.input), status: 'accepted', launchCount: 1, options: { ...(input.options ?? {}) } }; jobs.set(job.jobId, job); signal(job.jobId, 'launchAccepted'); await persist(); void run(job); return job; }
async function body(req) { let text = ''; for await (const chunk of req) text += chunk; return text ? JSON.parse(text) : {}; }
function send(res, status, value) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
const server = http.createServer(async (req, res) => { try { const url = new URL(req.url, 'http://fixture.invalid');
  if (req.method === 'POST' && url.pathname === '/_fixture/release') { const { jobId, phase } = await body(req); if (!phases.has(phase)) return send(res, 400, { error: 'unknown_phase' }); item(gates, jobId, phase).resolve(); return send(res, 200, { released: phase }); }
  if (req.method === 'POST' && url.pathname === '/_fixture/barrier') { const { jobId, phase } = await body(req); if (!phases.has(phase)) return send(res, 400, { error: 'unknown_phase' }); await item(events, jobId, phase).promise; return send(res, 200, { reached: phase }); }
  if (req.method === 'GET' && url.pathname === '/_fixture/state') { const jobId = url.searchParams.get('jobId'); return send(res, 200, jobId ? (jobs.has(jobId) ? view(jobs.get(jobId)) : null) : { launchCounts: Object.fromEntries([...jobs.values()].map((job) => [job.jobId, job.launchCount])) }); }
  if (req.method === 'POST' && url.pathname === '/jobs') { const job = await launch(await body(req)); if (job.options.dropLaunchAck) { job.options.dropLaunchAck = false; await persist(); return res.destroy(); } return send(res, 202, view(job)); }
  const match = /^\/jobs\/([^/]+)(?:\/(receipts|cancel))?$/.exec(url.pathname); if (!match) return send(res, 404, { error: 'not_found' }); const job = jobs.get(decodeURIComponent(match[1])); if (!job) return send(res, 404, { error: 'missing_job' });
  if (req.method === 'GET' && !match[2]) { if (job.result && (job.options.dropResultAck || job.options.disconnectAfterResult)) { job.options.dropResultAck = false; job.options.disconnectAfterResult = false; await persist(); return res.destroy(); } return send(res, 200, view(job)); }
  if (req.method === 'POST' && match[2] === 'cancel') { const input = await body(req); if (job.status === 'succeeded') job.cancellation = { requested: true, outcome: 'ignored_after_success', reason: input.reason ?? null }; else { job.status = 'cancelled'; job.cancellation = { requested: true, outcome: 'cancelled', reason: input.reason ?? null }; } await persist(); return send(res, 200, view(job)); }
  if (req.method === 'POST' && match[2] === 'receipts') { const { receiptId } = await body(req); if (!receiptId) return send(res, 400, { error: 'receiptId_required' }); signal(job.jobId, 'sendReceipt'); await item(gates, job.jobId, 'sendReceipt').promise; if (!job.receipt) job.receipt = { receiptId, deliveryId: `delivery-${job.jobId}`, resultId: job.result?.resultId ?? null }; await persist(); return send(res, 200, copy(job.receipt)); }
  return send(res, 405, { error: 'method_not_allowed' });
} catch (error) { return send(res, 400, { error: error.message }); } });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); process.stdout.write(`FIXTURE_PROVIDER ${JSON.stringify({ origin: `http://127.0.0.1:${server.address().port}` })}\n`); process.on('SIGTERM', () => server.close(() => process.exit(0)));
