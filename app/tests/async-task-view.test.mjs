import assert from 'node:assert/strict';
import test from 'node:test';
import { projectAsyncTask } from '../server/async-task-view.mjs';
import { bootScenario } from './fixtures/async-task-view/scenario.mjs';
import { DOCUMENTS, digestOf, ADAPTER_ID, ADAPTER_VERSION } from './fixtures/async-task-view/synthetic.mjs';

/* ------------------------------------------------------------------ *
 * Hand-written expectations
 *
 * The expected values below are typed literal JSON, NOT produced by running
 * projectAsyncTask or AsyncTasks.view. They pin down the schemaVersion:1
 * contract an authenticated UI read must keep: the exact field set and key
 * order, the availability classification for each (task, context) pair, the
 * preservation of nulls and of terminal/cancellation/delivery facts, and the
 * absence of any invented field (no accepted status, no permission/action
 * inference, no auto-recovery, no UI copy). Digests in unit fixtures are fixed
 * 64-hex placeholders; the HTTP packets later use digests of the literal
 * synthetic documents.
 * ------------------------------------------------------------------ */

const NOW = '2026-09-10T08:00:00.000Z';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_OLD = 'b'.repeat(64);
const DIGEST_Z = 'c'.repeat(64);

/** A retained task exactly in the store's field order (schema5). */
const LIVE_TASK = {
  id: '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b',
  revision: 3,
  origin: { projectId: 'project-primary', sessionId: 'session-live', runId: 'run-origin', callId: 'call-origin' },
  adapter: { id: ADAPTER_ID, version: ADAPTER_VERSION },
  source: { id: 'doc-alpha', version: 'v1', digest: DIGEST_A },
  createdAt: NOW,
  updatedAt: NOW,
  execution: { status: 'running', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
  result: null,
  deliveries: [
    { runId: 'run-consumer', callId: 'call-wait', kind: 'wait', taskRevision: 2, executionStatus: 'running', resultDigest: null,
      preparedAt: NOW, runtimeRecordedAt: null, provider: 'unknown' },
  ],
};

/** The full schemaVersion:1 view for LIVE_TASK under a matching context. */
const LIVE_EXPECTED = {
  schemaVersion: 1,
  id: '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b',
  revision: 3,
  origin: { projectId: 'project-primary', sessionId: 'session-live', runId: 'run-origin', callId: 'call-origin' },
  adapter: { id: ADAPTER_ID, version: ADAPTER_VERSION },
  source: { id: 'doc-alpha', version: 'v1', digest: DIGEST_A },
  createdAt: NOW,
  updatedAt: NOW,
  execution: { status: 'running', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
  result: null,
  deliveries: [
    { runId: 'run-consumer', callId: 'call-wait', kind: 'wait', taskRevision: 2, executionStatus: 'running', resultDigest: null,
      preparedAt: NOW, runtimeRecordedAt: null, provider: 'unknown' },
  ],
  availability: 'current',
};

const matchingAdapter = { version: ADAPTER_VERSION, sources: [{ id: 'doc-alpha', version: 'v1', digest: DIGEST_A }] };
const liveCtx = { sessionExists: true, adapter: matchingAdapter };

test('current: full schemaVersion:1 view is an independent literal copy with availability last', () => {
  const input = structuredClone(LIVE_TASK);
  const view = projectAsyncTask(input, liveCtx);
  // The whole body is compared to the hand-written literal above.
  assert.deepEqual(view, LIVE_EXPECTED);
  // Byte-stable key order: schemaVersion first, every retained task field in
  // store order, availability appended last — same as the pre-extraction view.
  assert.deepEqual(Object.keys(view), [
    'schemaVersion', 'id', 'revision', 'origin', 'adapter', 'source', 'createdAt', 'updatedAt',
    'execution', 'result', 'deliveries', 'availability',
  ]);
  assert.equal(view.availability, 'current');
  assert.equal(view.schemaVersion, 1);
  // Independent copy: the caller can mutate the returned view without touching
  // the owner's task object.
  assert.notEqual(view, input);
  view.execution.status = 'mutated'; view.deliveries.length = 0;
  assert.equal(input.execution.status, 'running');
  assert.equal(input.deliveries.length, 1);
});

test('availability classes follow the frozen priority with no inference', () => {
  const cases = [
    { name: 'orphaned when session is gone (adapter+source still match)', task: LIVE_TASK, ctx: { sessionExists: false, adapter: matchingAdapter }, expected: 'orphaned' },
    { name: 'orphaned wins over adapter/source staleness', task: LIVE_TASK, ctx: { sessionExists: false, adapter: null }, expected: 'orphaned' },
    { name: 'adapter_unavailable when adapter is null', task: LIVE_TASK, ctx: { sessionExists: true, adapter: null }, expected: 'adapter_unavailable' },
    { name: 'adapter_unavailable on version mismatch', task: LIVE_TASK, ctx: { sessionExists: true, adapter: { version: 'impl0', sources: matchingAdapter.sources } }, expected: 'adapter_unavailable' },
    { name: 'adapter_unavailable wins over a stale source', task: LIVE_TASK, ctx: { sessionExists: true, adapter: { version: 'impl0', sources: [{ id: 'doc-alpha', version: 'v1', digest: DIGEST_OLD }] } }, expected: 'adapter_unavailable' },
    { name: 'historical on source digest mismatch', task: LIVE_TASK, ctx: { sessionExists: true, adapter: { version: ADAPTER_VERSION, sources: [{ id: 'doc-alpha', version: 'v1', digest: DIGEST_OLD }] } }, expected: 'historical' },
    { name: 'historical on source version mismatch', task: { ...LIVE_TASK, source: { id: 'doc-alpha', version: 'v2', digest: DIGEST_A } }, ctx: liveCtx, expected: 'historical' },
    { name: 'historical on source id mismatch', task: { ...LIVE_TASK, source: { id: 'doc-other', version: 'v1', digest: DIGEST_Z } }, ctx: liveCtx, expected: 'historical' },
    { name: 'current when session, adapter and source all match', task: LIVE_TASK, ctx: liveCtx, expected: 'current' },
  ];
  for (const c of cases) {
    const input = structuredClone(c.task);
    const view = projectAsyncTask(input, c.ctx);
    assert.equal(view.availability, c.expected, c.name);
    // Besides the classification, the body is still the retained task plus
    // schemaVersion and availability — nothing else was dropped or invented.
    assert.deepEqual(view, { schemaVersion: 1, ...structuredClone(c.task), availability: c.expected }, c.name);
    assert.deepEqual(input, c.task, `${c.name}: input must not be mutated`);
  }
});

test('options omit result and/or deliveries but never rewrite the rest', () => {
  const input = structuredClone(LIVE_TASK);
  const withResult = projectAsyncTask(input, liveCtx, { result: true, deliveries: true });
  assert.ok('result' in withResult && 'deliveries' in withResult);
  const noResult = projectAsyncTask(input, liveCtx, { result: false });
  assert.ok(!('result' in noResult) && 'deliveries' in noResult);
  const noDeliveries = projectAsyncTask(input, liveCtx, { deliveries: false });
  assert.ok('result' in noDeliveries && !('deliveries' in noDeliveries));
  const listShape = projectAsyncTask(input, liveCtx, { result: false, deliveries: false });
  assert.ok(!('result' in listShape) && !('deliveries' in listShape));
  assert.equal(listShape.availability, 'current');
  // The omitted fields disappear entirely, exactly like the list read: the item
  // ends at `execution`, then `availability`.
  assert.deepEqual(Object.keys(listShape), ['schemaVersion', 'id', 'revision', 'origin', 'adapter', 'source',
    'createdAt', 'updatedAt', 'execution', 'availability']);
  assert.equal(noResult.revision, input.revision); assert.equal(noResult.execution.status, 'running');
});

test('nulls and prepared-but-unrecorded delivery facts are preserved, never filled in', () => {
  // The delivery was requested (prepared) but never runtime-recorded: it must
  // NOT masquerade as delivered. Projection fills nothing in.
  const input = structuredClone(LIVE_TASK);
  const view = projectAsyncTask(input, liveCtx);
  assert.equal(view.result, null);
  assert.equal(view.execution.cancelRequestedAt, null);
  assert.equal(view.execution.reason, null);
  const delivery = view.deliveries[0];
  assert.equal(delivery.runtimeRecordedAt, null);   // prepared != delivered
  assert.equal(delivery.executionStatus, 'running'); // not bumped to a newer fact
  assert.equal(delivery.resultDigest, null);
  assert.equal(delivery.provider, 'unknown');        // provider is always unknown
  assert.equal(delivery.taskRevision, 2);            // older than task.revision 3, untouched
  assert.equal(view.revision, 3);
});

test('succeeded and cancelRequestedAt coexist; terminal evidence is immutable in the view', () => {
  // A cancel request raced a success settlement: the task is terminal
  // `succeeded` while the recorded cancellation intent remains. The projection
  // must keep both — it must not erase the cancel request nor demote success.
  const input = {
    id: 'task-settled-0000-0000-0000-000000000001',
    revision: 7,
    origin: { projectId: 'project-primary', sessionId: 'session-live', runId: 'run-origin', callId: 'call-origin' },
    adapter: { id: ADAPTER_ID, version: ADAPTER_VERSION },
    source: { id: 'doc-alpha', version: 'v1', digest: DIGEST_A },
    createdAt: NOW, updatedAt: NOW,
    execution: { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: '2026-09-10T08:00:01.000Z', cancelAttempted: true, reason: null },
    result: { text: DOCUMENTS.alpha.text, bytes: Buffer.byteLength(DOCUMENTS.alpha.text), digest: digestOf('alpha') },
    deliveries: [
      { runId: 'run-consumer', callId: 'call-wait', kind: 'wait', taskRevision: 7, executionStatus: 'succeeded',
        resultDigest: digestOf('alpha'), preparedAt: NOW, runtimeRecordedAt: '2026-09-10T08:00:02.000Z', provider: 'unknown' },
    ],
  };
  const view = projectAsyncTask(structuredClone(input), liveCtx);
  assert.equal(view.execution.status, 'succeeded');
  assert.equal(view.execution.cancelRequestedAt, '2026-09-10T08:00:01.000Z');
  assert.equal(view.execution.cancelAttempted, true);
  assert.equal(view.result.digest, digestOf('alpha'));
  assert.equal(view.deliveries[0].runtimeRecordedAt, '2026-09-10T08:00:02.000Z');
  assert.equal(view.deliveries[0].provider, 'unknown');
  assert.equal(view.availability, 'current');
});

test('an older delivery snapshot is projected as-is and never repaired into newer facts', () => {
  // The task has since settled `succeeded` at revision 5, but its only receipt
  // is an older snapshot recorded while it was still running at revision 3.
  // The projection must not back-fill executionStatus/resultDigest/
  // runtimeRecordedAt from the task's newer state: it copies retained facts,
  // it does not reconcile them.
  const input = {
    id: 'task-old-receipt-0000-0000-0000-000000000002',
    revision: 5,
    origin: { projectId: 'project-primary', sessionId: 'session-live', runId: 'run-origin', callId: 'call-origin' },
    adapter: { id: ADAPTER_ID, version: ADAPTER_VERSION },
    source: { id: 'doc-alpha', version: 'v1', digest: DIGEST_A },
    createdAt: NOW, updatedAt: NOW,
    execution: { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
    result: { text: DOCUMENTS.alpha.text, bytes: Buffer.byteLength(DOCUMENTS.alpha.text), digest: digestOf('alpha') },
    deliveries: [
      { runId: 'run-consumer', callId: 'call-wait', kind: 'wait', taskRevision: 3, executionStatus: 'running',
        resultDigest: null, preparedAt: NOW, runtimeRecordedAt: null, provider: 'unknown' },
    ],
  };
  const view = projectAsyncTask(structuredClone(input), liveCtx);
  const delivery = view.deliveries[0];
  assert.equal(delivery.taskRevision, 3);            // not bumped to 5
  assert.equal(delivery.executionStatus, 'running'); // not repaired to 'succeeded'
  assert.equal(delivery.resultDigest, null);         // not filled from task.result
  assert.equal(delivery.runtimeRecordedAt, null);    // not turned into delivered
  assert.equal(view.execution.status, 'succeeded');
  assert.equal(view.revision, 5);
});

test('no invented fields and no auto-recovery in the projection', () => {
  // A task left `unknown` by a host restart stays unknown with its reason; the
  // projection adds no `accepted`/`permissions`/`actions`/copy, never re-queues
  // and never fabricates a delivery for an untracked read.
  const unknownTask = {
    ...LIVE_TASK,
    execution: { status: 'unknown', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: 'host_restart' },
    deliveries: [],
  };
  const view = projectAsyncTask(structuredClone(unknownTask), liveCtx);
  assert.equal(view.execution.status, 'unknown');
  assert.equal(view.execution.reason, 'host_restart');
  assert.deepEqual(view.deliveries, []);
  assert.deepEqual(Object.keys(view), ['schemaVersion', 'id', 'revision', 'origin', 'adapter', 'source',
    'createdAt', 'updatedAt', 'execution', 'result', 'deliveries', 'availability']);
  assert.deepEqual(Object.keys(view.execution).sort(), ['cancelAttempted', 'cancelRequestedAt', 'dispatchCount', 'reason', 'status']);
});

test('a stale source never projects as current even when a result exists', () => {
  // The retained result bytes are intact, but the registered source digest no
  // longer matches: the read is historical, and the result is not upgraded.
  const input = {
    ...LIVE_TASK,
    execution: { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null },
    result: { text: DOCUMENTS.alpha.text, bytes: Buffer.byteLength(DOCUMENTS.alpha.text), digest: DIGEST_A },
    deliveries: [],
  };
  const ctx = { sessionExists: true, adapter: { version: ADAPTER_VERSION, sources: [{ id: 'doc-alpha', version: 'v1', digest: DIGEST_OLD }] } };
  const view = projectAsyncTask(structuredClone(input), ctx);
  assert.equal(view.availability, 'historical');
  assert.equal(view.result.digest, DIGEST_A); // retained bytes untouched
});

/* ------------------------------------------------------------------ *
 * Real HTTP packets: a real startServer on port 0 with the synthetic
 * adapter, driven through the local Pi loop, then read back over HTTP.
 * List items omit result/deliveries; detail keeps them; authorization and
 * project scope are enforced; counts/pagination never include the other
 * project.
 * ------------------------------------------------------------------ */

function assertPacketListShape(packet, { projectId, sources, count, offset = 0, limit = 20 }) {
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.count, count);
  assert.equal(packet.offset, offset);
  assert.equal(packet.nextOffset, offset + limit < count ? offset + limit : null);
  assert.equal(packet.items.length, Math.min(limit, Math.max(0, count - offset)));
  assert.deepEqual(packet.items.map(i => i.source.id), sources);
  for (const item of packet.items) {
    assert.equal(item.origin.projectId, projectId);          // never leaks the other project
    assert.ok(!('result' in item), 'list item must omit result');
    assert.ok(!('deliveries' in item), 'list item must omit deliveries');
    assert.equal(item.schemaVersion, 1);
  }
}

test('HTTP list/detail packets: real host + synthetic adapter, scoped and paged', async () => {
  const h = await bootScenario();
  try {
    const alpha = h.taskOf('doc-alpha');
    const beta = h.taskOf('doc-beta');
    assert.ok(alpha && beta, 'primary project must retain two tasks');
    assert.equal(h.reader.starts, 3, 'exactly one launch per document');

    // --- list: primary project holds alpha + beta, omits result/deliveries ---
    const listPrimary = await h.api('GET', `/async-tasks?projectId=${h.primary.id}`);
    assert.equal(listPrimary.status, 200);
    assertPacketListShape(listPrimary.body, { projectId: h.primary.id, sources: ['doc-alpha', 'doc-beta'], count: 2 });
    assert.equal(listPrimary.body.items[0].availability, 'current');
    assert.equal(listPrimary.body.items[0].execution.status, 'succeeded');
    assert.equal(listPrimary.body.items[0].adapter.version, ADAPTER_VERSION);
    assert.equal(listPrimary.body.items[1].source.digest, digestOf('beta'));

    // --- detail keeps result + deliveries (hand-written contract below) ---
    const detailAlpha = await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.primary.id}`);
    assert.equal(detailAlpha.status, 200);
    const d = detailAlpha.body;
    assert.equal(d.schemaVersion, 1);
    assert.equal(d.availability, 'current');
    assert.equal(d.id, alpha.id);
    assert.deepEqual(d.origin, { projectId: h.primary.id, sessionId: h.sessionP.id, runId: alpha.origin.runId, callId: alpha.origin.callId });
    assert.deepEqual(d.adapter, { id: ADAPTER_ID, version: ADAPTER_VERSION });
    assert.deepEqual(d.source, { id: 'doc-alpha', version: 'v1', digest: digestOf('alpha') });
    assert.deepEqual(d.execution, { status: 'succeeded', dispatchCount: 1, cancelRequestedAt: null, cancelAttempted: false, reason: null });
    // result is retained in detail and its bytes/digest match the literal document
    assert.deepEqual(d.result, { text: DOCUMENTS.alpha.text, bytes: Buffer.byteLength(DOCUMENTS.alpha.text), digest: digestOf('alpha') });
    assert.equal(d.deliveries.length, 1, 'one runtime-recorded wait delivery');
    const receipt = d.deliveries[0];
    assert.equal(receipt.kind, 'wait');
    // The receipt's taskRevision is the revision read when the delivery was
    // finalized; finalizing itself bumps the task revision, so later reads may
    // legitimately see a higher revision. The schema invariant is
    // taskRevision <= revision — never an equality claim.
    assert.ok(Number.isSafeInteger(receipt.taskRevision) && receipt.taskRevision >= 1 && receipt.taskRevision <= d.revision);
    assert.equal(receipt.executionStatus, 'succeeded');
    assert.equal(receipt.resultDigest, digestOf('alpha'));
    assert.equal(receipt.provider, 'unknown', 'provider delivery is always unknown');
    assert.ok(Number.isFinite(Date.parse(receipt.preparedAt)) && Number.isFinite(Date.parse(receipt.runtimeRecordedAt)));
    assert.ok(Number.isFinite(Date.parse(d.createdAt)) && Number.isFinite(Date.parse(d.updatedAt)));

    // --- pagination never crosses project boundaries ---
    const page = await h.api('GET', `/async-tasks?projectId=${h.primary.id}&offset=0&limit=1`);
    assert.equal(page.status, 200);
    assertPacketListShape(page.body, { projectId: h.primary.id, sources: ['doc-alpha'], count: 2, limit: 1 });
    assert.equal(page.body.nextOffset, 1);
    const page2 = await h.api('GET', `/async-tasks?projectId=${h.primary.id}&offset=1&limit=1`);
    assert.equal(page2.status, 200);
    assertPacketListShape(page2.body, { projectId: h.primary.id, sources: ['doc-beta'], count: 2, offset: 1, limit: 1 });

    // --- foreign project: its own task only, never the primary pair ---
    const listForeign = await h.api('GET', `/async-tasks?projectId=${h.foreign.id}`);
    assert.equal(listForeign.status, 200);
    assertPacketListShape(listForeign.body, { projectId: h.foreign.id, sources: ['doc-gamma'], count: 1 });
    assert.equal(listForeign.body.items[0].availability, 'current');

    // --- cross-project detail is refused ---
    const crossProject = await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.foreign.id}`);
    assert.equal(crossProject.status, 404);
    assert.equal(crossProject.body.error.code, 'task_unavailable');

    // --- authorization: bad or missing work token is refused ---
    const badToken = await h.api('GET', `/async-tasks?projectId=${h.primary.id}`, undefined, 'wrong-token');
    assert.equal(badToken.status, 401);
    const missing = await h.api('GET', `/async-tasks?projectId=${h.primary.id}`, undefined, '');
    assert.equal(missing.status, 401);

    // --- deleting the origin session orphans the read but keeps retained facts ---
    const removed = await h.api('DELETE', `/sessions/${h.sessionP.id}`);
    assert.equal(removed.status, 200);
    const orphaned = await h.api('GET', `/async-tasks/${alpha.id}?projectId=${h.primary.id}`);
    assert.equal(orphaned.status, 200);
    assert.equal(orphaned.body.availability, 'orphaned');
    assert.deepEqual(orphaned.body.result, { text: DOCUMENTS.alpha.text, bytes: Buffer.byteLength(DOCUMENTS.alpha.text), digest: digestOf('alpha') });
    assert.equal(orphaned.body.deliveries.length, 1);
    // foreign project's task is untouched by the deletion
    const foreignDetail = await h.api('GET', `/async-tasks/${h.taskOf('doc-gamma').id}?projectId=${h.foreign.id}`);
    assert.equal(foreignDetail.body.availability, 'current');

    // --- adapter absence classifies adapter_unavailable over HTTP ---
    h.host.service.asyncTasks.adapters.clear();
    const noAdapter = await h.api('GET', `/async-tasks/${h.taskOf('doc-gamma').id}?projectId=${h.foreign.id}`);
    assert.equal(noAdapter.status, 200);
    assert.equal(noAdapter.body.availability, 'adapter_unavailable');

    // --- stale registered source classifies historical over HTTP ---
    h.host.service.asyncTasks.adapters.set(ADAPTER_ID, { version: ADAPTER_VERSION, sources: [{ id: 'doc-gamma', version: 'v1', digest: digestOf('beta') }] });
    const stale = await h.api('GET', `/async-tasks/${h.taskOf('doc-gamma').id}?projectId=${h.foreign.id}`);
    assert.equal(stale.status, 200);
    assert.equal(stale.body.availability, 'historical');
    assert.deepEqual(stale.body.result, { text: DOCUMENTS.gamma.text, bytes: Buffer.byteLength(DOCUMENTS.gamma.text), digest: digestOf('gamma') });
  } finally {
    await h.close();
  }
});
