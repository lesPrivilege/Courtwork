const root = process.env.APP_ROOT;
const { AsyncTasks } = await import(root ? root + '/server/async-tasks.mjs' : './server/async-tasks.mjs');

const A = 'a'.repeat(64), B = 'b'.repeat(64), Z = 'c'.repeat(64);
const NOW = '2026-09-10T08:00:00.000Z';

const task = {
  id: '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b', revision: 3,
  origin: { projectId: 'p1', sessionId: 's1', runId: 'r1', callId: 'c1' },
  adapter: { id: 'read-doc', version: 'v1' },
  source: { id: 'doc-alpha', version: 'v1', digest: A },
  createdAt: NOW, updatedAt: NOW,
  execution: { status: 'running', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
  result: null,
  deliveries: [
    { runId: 'rc', callId: 'cw', kind: 'wait', taskRevision: 2, executionStatus: 'running', resultDigest: null, preparedAt: NOW, runtimeRecordedAt: null, provider: 'unknown' },
  ],
};

const variants = {
  match: { version: 'v1', sources: [{ id: 'doc-alpha', version: 'v1', digest: A }] },
  wrongver: { version: 'v2', sources: [{ id: 'doc-alpha', version: 'v1', digest: A }] },
  staledigest: { version: 'v1', sources: [{ id: 'doc-alpha', version: 'v1', digest: B }] },
  staleversion: { version: 'v1', sources: [{ id: 'doc-alpha', version: 'v2', digest: A }] },
  staleid: { version: 'v1', sources: [{ id: 'doc-other', version: 'v1', digest: Z }] },
  noadapt: null,
};

const sessions = { live: { id: 's1', projectId: 'p1' }, gone: null };
const settled = { ...task, revision: 7,
  execution: { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: '2026-09-10T08:00:01.000Z', cancelAttempted: true, reason: null },
  result: { text: 'Alpha bytes', bytes: 11, digest: A },
  deliveries: [{ runId: 'rc', callId: 'cw', kind: 'wait', taskRevision: 7, executionStatus: 'succeeded', resultDigest: A, preparedAt: NOW, runtimeRecordedAt: '2026-09-10T08:00:02.000Z', provider: 'unknown' }] };
const staleReceipt = { ...task, revision: 5,
  execution: { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
  result: { text: 'Alpha bytes', bytes: 11, digest: A },
  deliveries: [{ runId: 'rc', callId: 'cw', kind: 'wait', taskRevision: 3, executionStatus: 'running', resultDigest: null, preparedAt: NOW, runtimeRecordedAt: null, provider: 'unknown' }] };

const TASK_POOL = { task, settled, staleReceipt };
const OPTION_POOL = [undefined, { result: false }, { deliveries: false }, { result: false, deliveries: false }];

function run(sessionKey, variantKey, taskKey, options) {
  const inst = new AsyncTasks({ store: { getSession: () => sessions[sessionKey] }, adapters: [] });
  if (variantKey !== 'noadapt') inst.adapters.set('read-doc', variants[variantKey]);
  const output = inst.view(structuredClone(TASK_POOL[taskKey]), options);
  return JSON.stringify(output);
}

const out = [];
for (const sessionKey of Object.keys(sessions))
  for (const variantKey of Object.keys(variants))
    for (const taskKey of Object.keys(TASK_POOL))
      for (const options of OPTION_POOL)
        out.push(`${sessionKey}|${variantKey}|${taskKey}|${JSON.stringify(options ?? 'default')} => ${run(sessionKey, variantKey, taskKey, options)}`);
console.log(out.join('\n'));
