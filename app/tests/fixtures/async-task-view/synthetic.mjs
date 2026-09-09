import { digestText } from '../../../server/async-task-state.mjs';

/**
 * Independent, hand-written synthetic data for the task-view projection and
 * packet tests. These documents are local literals — they never touch a real
 * provider, adapter or credential store. Digests are derived from the exact
 * UTF-8 bytes of the literal texts below.
 */
export const DOCUMENTS = Object.freeze({
  alpha: { id: 'doc-alpha', version: 'v1', text: 'Alpha packet: independent synthetic read A. 中文' },
  beta: { id: 'doc-beta', version: 'v1', text: 'Beta packet: independent synthetic read B.' },
  gamma: { id: 'doc-gamma', version: 'v1', text: 'Gamma packet: independent synthetic read C.' },
});

export const ADAPTER_ID = 'read-doc';
export const ADAPTER_VERSION = 'impl1';

export function digestOf(name) {
  const document = DOCUMENTS[name];
  if (!document) throw new Error(`unknown synthetic document ${name}`);
  return digestText(document.text);
}

export function sourceOf(name) {
  const document = DOCUMENTS[name];
  return Object.freeze({ id: document.id, version: document.version, digest: digestOf(name) });
}

export function adapterSources() {
  return Object.keys(DOCUMENTS).map(sourceOf);
}

/**
 * Deterministic in-process read adapter over the synthetic documents.
 * `launch` starts a `running` job; `query` reports `succeeded` only after the
 * test calls `complete(name)`; `cancel` marks an unfinished job `cancelled`.
 */
export function makeReader() {
  const texts = Object.fromEntries(Object.entries(DOCUMENTS).map(([name, d]) => [d.id, d.text]));
  const jobs = new Map();
  let starts = 0;
  const reply = (taskId, source) => {
    const job = jobs.get(taskId);
    return { taskId, source, status: job?.status ?? 'missing', ...(job?.status === 'succeeded' ? { result: { text: texts[source.id] } } : {}) };
  };
  return {
    get starts() { return starts; },
    hasJob(sourceId) { return [...jobs.values()].some(job => job.source.id === sourceId); },
    adapter: {
      id: ADAPTER_ID, version: ADAPTER_VERSION, sources: adapterSources(),
      async launch({ taskId, source }) { starts++; jobs.set(taskId, { source, status: 'running' }); return reply(taskId, source); },
      async query({ taskId, source }) { return reply(taskId, source); },
      async cancel({ taskId, source }) { const job = jobs.get(taskId); if (job && job.status !== 'succeeded') job.status = 'cancelled'; return reply(taskId, source); },
    },
    complete(name) {
      const target = DOCUMENTS[name].id;
      for (const job of jobs.values()) if (job.source.id === target) job.status = 'succeeded';
    },
  };
}
