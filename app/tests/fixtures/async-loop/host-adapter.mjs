import { createHash } from 'node:crypto';
import { DOCUMENTS, FIXTURE_IDENTITY } from './contract.mjs';

const hash = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const prefixed = (text) => `sha256:${hash(text)}`;
const sourceFor = (document) => Object.freeze({ id: document.id, version: document.version, digest: hash(document.content) });

function inputFor(taskId) {
  const content = `Courtwork recovery host input for ${taskId}.\n`;
  return { version: '1', content, digest: prefixed(content) };
}
function expectedSource(source) {
  const document = Object.values(DOCUMENTS).find((item) => item.id === source.id);
  if (!document || source.version !== document.version || source.digest !== hash(document.content)) throw new Error('fixture source identity mismatch');
  return document;
}
function mapReply(reply, taskId, source) {
  if (reply.status === 404 && reply.json?.error === 'missing_job') return { taskId, source, status: 'missing' };
  if (!reply.json || reply.json.fixture?.provider !== FIXTURE_IDENTITY.provider || reply.json.jobId !== taskId) throw new Error('fixture response identity mismatch');
  const document = expectedSource(source);
  if (reply.json.document?.digest !== document.digest || reply.json.document?.content !== document.content) throw new Error('fixture document bytes mismatch');
  const status = ['accepted', 'executing'].includes(reply.json.status) ? 'running' : reply.json.status;
  if (status === 'succeeded') {
    if (reply.json.result?.content !== document.content) throw new Error('fixture result bytes mismatch');
    return { taskId, source, status, result: { text: reply.json.result.content } };
  }
  if (!['running', 'cancelled', 'failed'].includes(status)) throw new Error('fixture status unsupported');
  return { taskId, source, status };
}

/** Thin test-only bridge from the real host AsyncTasks adapter seam to T2 HTTP. */
export function createFixtureHostAdapter(origin) {
  if (typeof origin !== 'string' || !origin.startsWith('http://127.0.0.1:')) throw new TypeError('loopback origin required');
  const request = async (method, pathname, body) => {
    const response = await fetch(origin + pathname, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text(); return { status: response.status, json: text ? JSON.parse(text) : null };
  };
  return {
    id: 'fixture-immutable-read', version: '1', sources: Object.values(DOCUMENTS).map(sourceFor),
    async launch({ taskId, source }) { expectedSource(source); return mapReply(await request('POST', '/jobs', { jobId: taskId, documentId: source.id, input: inputFor(taskId) }), taskId, source); },
    async query({ taskId, source }) { expectedSource(source); return mapReply(await request('GET', `/jobs/${encodeURIComponent(taskId)}`), taskId, source); },
    async cancel({ taskId, source }) { expectedSource(source); return mapReply(await request('POST', `/jobs/${encodeURIComponent(taskId)}/cancel`, { reason: 'host-cancel' }), taskId, source); },
  };
}
