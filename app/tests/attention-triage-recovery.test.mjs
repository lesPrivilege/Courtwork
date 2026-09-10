/* WK-158 · the mutation protocol against the real Core: one request identity per
 * human submit, a receipt that is verified rather than assumed, a lost response
 * that is recovered instead of guessed, and a version conflict that is never
 * silently replayed. The view is driven through the same request helper shape
 * `app/web/app.mjs` gives it, so an HTTP refusal arrives here exactly as it does
 * in the product: a status and a structured `error.code`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { boot } from './helpers.mjs';
import { createAttentionWorkspace } from '../web/attention-view.mjs';
import { flush, waitFor, withTinyDom } from './tiny-dom.mjs';

const ok = (response, label = 'request') => {
  assert.equal(response.status, 200, `${label}: ${JSON.stringify(response.json)}`);
  return response.json;
};

/** The web request helper's contract: JSON on success, an Error carrying the
 * HTTP status and the structured body on refusal, and an Error without a status
 * when the transport itself did not report a result. */
function webRequest(h, hooks = {}) {
  const calls = [];
  const state = { inflight: 0 };
  const request = async (path, options = {}) => {
    state.inflight += 1;
    try { return await send(path, options); } finally { state.inflight -= 1; }
  };
  const send = async (path, options = {}) => {
    const method = options.method ?? 'GET';
    calls.push({ path, method, body: options.body ?? null });
    const before = hooks.before?.({ path, method, body: options.body, calls });
    if (before === 'drop') throw new Error('The local runtime could not be reached.');
    const response = await h.api(method, path, options.body);
    if (hooks.after?.({ path, method, body: options.body, response }) === 'lose')
      throw new Error('The local runtime could not be reached.');
    if (response.status !== 200) {
      const error = new Error(response.json?.error?.message ?? `Request failed (${response.status}).`);
      error.status = response.status;
      error.body = response.json;
      throw error;
    }
    return response.json;
  };
  return { request, calls, state };
}

async function createAttention(h, { title = 'Contract renewal reply', status = null } = {}) {
  const attentionId = `att-${randomUUID()}`;
  ok(await h.api('POST', '/attention', { projectId: h.projectId, request: {
    schema_version: 1, request_id: randomUUID(), attention_id: attentionId, expected_revision: 0, action: 'create',
    payload: {
      descriptor: { title, summary: null },
      reason: 'A recorded decision is waiting for a person.',
      next_action: { kind: 'decide', label: 'Decide whether to renew', trigger: 'manual', due_at: null },
      source_refs: [], relation_refs: [],
    },
  } }), 'create attention');
  if (status) {
    const current = ok(await h.api('GET', `/attention/${attentionId}?projectId=${h.projectId}`));
    ok(await h.api('POST', `/attention/${attentionId}/actions`, { projectId: h.projectId, request: {
      schema_version: 1, request_id: randomUUID(), attention_id: attentionId, expected_revision: current.revision,
      action: 'resume', payload: { reason: 'Recorded as needing a person.', status },
    } }), 'set status');
  }
  return attentionId;
}

const inspect = async (h, id) => ok(await h.api('GET', `/attention/${id}?projectId=${h.projectId}`), 'inspect');
const events = async (h, id) =>
  ok(await h.api('POST', '/attention/query', { projectId: h.projectId,
    query: { schema_version: 1, kind: 'events', attention_id: id } }), 'events').events;
const statusQuery = async (h, status) =>
  ok(await h.api('POST', '/attention/query', { projectId: h.projectId,
    query: { schema_version: 1, kind: 'exact', field: 'status', value: status } }), `query ${status}`).items.map(item => item.attention_id);

async function openWorkspace(container, h, hooks) {
  const { request, calls, state } = webRequest(h, hooks);
  const workspace = createAttentionWorkspace(container, { request, onBack() {} });
  /* Every interaction below settles before the test looks at the DOM: the view
   * re-inspects and re-reads the registry after a committed action, and a test
   * that asserts before those land would be asserting on a half-rendered page. */
  const quiet = async () => {
    await flush();
    await waitFor(() => state.inflight === 0, { label: 'the workspace to go quiet' });
    await flush();
  };
  await workspace.open({ projects: [{ id: h.projectId, name: 'test-project' }], projectId: h.projectId });
  await quiet();
  return { workspace, calls, quiet };
}
const openRow = async (container, id, quiet) => {
  container.querySelector(`[data-attention-focus="item-${id}"]`).click();
  await (quiet?.() ?? flush());
};
const fill = (container, key, value) => {
  const node = container.querySelector(`[data-attention-focus="${key}"]`);
  node.value = value;
  node.dispatchEvent({ type: 'input', target: node });
};
const alertText = container => container.querySelector('.attention-action-alert')?.textContent ?? null;
const editorOpen = container => Boolean(container.querySelector('.attention-action-editor'));
const fieldError = container => container.querySelector('.attention-field-error')?.textContent ?? null;
/** Clicks a submit control and waits for the request to reach an outcome: the
 * editor closed on a receipt, an alert raised, or the draft refused locally. */
const submit = async (container, action, quiet) => {
  container.querySelector(`[data-attention-focus="submit-${action}"]`).click();
  await waitFor(() => alertText(container) || fieldError(container) || !editorOpen(container), { label: `${action} outcome` });
  await (quiet?.() ?? flush());
};
const act = async (container, action) => {
  container.querySelector(`[data-attention-focus="action-${action}"]`).click();
  await flush();
};

test('ATT-ACT-1 · a submitted action carries the inspected revision and is read back canonically', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h);
    const before = await inspect(h, id);
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h);
      await openRow(container, id, quiet);
      await act(container, 'resolve');
      fill(container, 'field-reason', 'Recorded as handled.');
      await submit(container, 'resolve', quiet);
      await waitFor(() => container.textContent.includes('Resolved'), { label: 'canonical status' });
      const action = calls.find(call => call.path.endsWith('/actions'));
      assert.equal(action.body.request.expected_revision, before.revision);
      const after = await inspect(h, id);
      assert.equal(after.revision, before.revision + 1);
      assert.equal(after.status, 'resolved');
      assert.match(container.textContent, /Resolved/);
      // The re-inspect is what put that word on the screen: the action response
      // is a receipt, not a state.
      assert.equal(calls.filter(call => call.path.startsWith(`/attention/${id}?`)).length, 2);
    });
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('ATT-ACT-2 · a stale revision is refused, announced and never silently replayed', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h);
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h);
      await openRow(container, id, quiet);
      const inspected = await inspect(h, id);
      // Someone else advances the object while this human is deciding.
      ok(await h.api('POST', `/attention/${id}/actions`, { projectId: h.projectId, request: {
        schema_version: 1, request_id: randomUUID(), attention_id: id, expected_revision: inspected.revision,
        action: 'acknowledge', payload: {},
      } }), 'external acknowledge');
      await act(container, 'resolve');
      fill(container, 'field-reason', 'Recorded as handled.');
      await submit(container, 'resolve', quiet);
      await waitFor(() => alertText(container), { label: 'conflict alert' });
      const alert = container.querySelectorAll('.attention-action-alert')[0];
      assert.equal(alert.getAttribute('role'), 'alert');
      assert.equal(alert.textContent, 'This item changed while you were deciding. Reload it and try again.');
      const after = await inspect(h, id);
      assert.equal(after.status, 'investigating', 'no partial commit');
      assert.equal(calls.filter(call => call.path.endsWith('/actions')).length, 1, 'no silent replay');
      // The draft survives, because the decision has to be made again, not retyped.
      assert.equal(container.querySelector('[data-attention-focus="field-reason"]').value, 'Recorded as handled.');
      // ...and the next submit is a new decision: new identity, new revision.
      await submit(container, 'resolve', quiet);
      await waitFor(() => calls.filter(call => call.path.endsWith('/actions')).length === 2, { label: 'second submit' });
      await waitFor(() => container.textContent.includes('Resolved'), { label: 'canonical status' });
      const sent = calls.filter(call => call.path.endsWith('/actions'));
      assert.equal(sent.length, 2);
      assert.notEqual(sent[0].body.request.request_id, sent[1].body.request.request_id);
      assert.equal(sent[1].body.request.expected_revision, after.revision);
      assert.equal((await inspect(h, id)).status, 'resolved');
    });
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('ATT-ACT-3 · a lost response is recovered from the receipt, not guessed', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h);
    let lose = true;
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h, {
        after: ({ path, response }) => {
          if (!path.endsWith('/actions') || !lose || response.status !== 200) return null;
          lose = false;
          return 'lose';
        },
      });
      await openRow(container, id, quiet);
      container.querySelector('[data-attention-focus="action-acknowledge"]').click();
      await waitFor(() => calls.some(call => call.body?.query?.kind === 'request'), { label: 'receipt query' });
      await waitFor(() => calls.filter(call => call.path.startsWith(`/attention/${id}?`)).length === 2, { label: 're-inspect' });
      await quiet();
      const query = calls.find(call => call.body?.query?.kind === 'request');
      assert.equal(query.body.query.request_id, calls.find(call => call.path.endsWith('/actions')).body.request.request_id);
      assert.equal(calls.filter(call => call.path.endsWith('/actions')).length, 1);
      assert.equal((await events(h, id)).filter(event => event.action === 'acknowledge').length, 1);
      assert.doesNotMatch(container.textContent, /failed|completed|Retry sending/i);
      assert.equal((await inspect(h, id)).seen, true);
    });
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('ATT-ACT-4 · a request that never left is retried under its own identity, once', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h);
    let drop = true;
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h, {
        before: ({ path }) => {
          if (!path.endsWith('/actions') || !drop) return null;
          drop = false;
          return 'drop';
        },
      });
      await openRow(container, id, quiet);
      container.querySelector('[data-attention-focus="action-acknowledge"]').click();
      await waitFor(() => container.querySelector('[data-attention-focus="retry-mutation"]'), { label: 'recovery notice' });
      await quiet();
      const notice = container.querySelector('.attention-action-alert');
      assert.match(notice.textContent, /No committed result was found/);
      assert.doesNotMatch(notice.textContent, /failed|completed/i);
      assert.equal((await inspect(h, id)).seen, false);
      const first = calls.find(call => call.path.endsWith('/actions')).body.request;
      container.querySelector('[data-attention-focus="retry-mutation"]').click();
      await waitFor(() => calls.filter(call => call.path.endsWith('/actions')).length === 2, { label: 'retry' });
      await waitFor(() => !container.querySelector('[data-attention-focus="retry-mutation"]'), { label: 'recovery cleared' });
      await quiet();
      const sent = calls.filter(call => call.path.endsWith('/actions')).map(call => call.body.request);
      assert.equal(sent.length, 2);
      assert.equal(sent[1].request_id, first.request_id, 'the retry keeps the identity of the same decision');
      assert.deepEqual(sent[1], first, 'and its payload is not rewritten');
      assert.equal((await events(h, id)).filter(event => event.action === 'acknowledge').length, 1);
      assert.equal((await inspect(h, id)).seen, true);
    });
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('ATT-ACT-5 · a reused identity with different content is refused and surfaced', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h);
    let reuse = null;
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h, {
        before: ({ path, body }) => {
          if (!path.endsWith('/actions')) return null;
          if (reuse === null) reuse = body.request.request_id;
          else body.request.request_id = reuse;
          return null;
        },
      });
      await openRow(container, id, quiet);
      container.querySelector('[data-attention-focus="action-acknowledge"]').click();
      await waitFor(() => calls.filter(call => call.path.endsWith('/actions')).length === 1, { label: 'first action' });
      await quiet();
      await waitFor(() => container.querySelector('[data-attention-focus="action-resolve"]'), { label: 'detail ready' });
      await act(container, 'resolve');
      fill(container, 'field-reason', 'A different decision under a reused identity.');
      await submit(container, 'resolve', quiet);
      await waitFor(() => alertText(container), { label: 'idempotency alert' });
      const alert = container.querySelectorAll('.attention-action-alert')[0];
      assert.equal(alert.textContent, 'A different request already used this identity. Reload the item before retrying.');
      assert.equal((await inspect(h, id)).status, 'investigating');
      assert.equal(container.querySelector('[data-attention-focus="retry-mutation"]'), null,
        'a conflicting identity is discarded, not retried');
      assert.equal(calls.filter(call => call.path.endsWith('/actions')).length, 2);
    });
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('Snooze records Later, which stays a visible view and starts no timer', async () => {
  const h = await boot();
  try {
    const id = await createAttention(h, { status: 'needs_you' });
    const other = await createAttention(h, { title: 'Second item', status: 'needs_you' });
    await withTinyDom(async container => {
      const { calls, quiet } = await openWorkspace(container, h);
      container.querySelector('[data-attention-focus="view-needs_you"]').click();
      await quiet();
      await openRow(container, id, quiet);
      await act(container, 'snooze');
      fill(container, 'field-reason', 'Waiting on the other party.');
      fill(container, 'field-label', 'Check the reply');
      const trigger = container.querySelector('[data-attention-focus="field-trigger"]');
      trigger.value = 'at';
      trigger.dispatchEvent({ type: 'change', target: trigger });
      await flush();
      fill(container, 'field-due', '2026-09-20T09:30');
      await submit(container, 'snooze', quiet);
      await waitFor(() => !container.querySelector(`[data-attention-focus="item-${id}"]`), { label: 'row leaves Needs you' });

      const after = await inspect(h, id);
      assert.equal(after.status, 'later');
      assert.equal(after.next_action.due_at, new Date('2026-09-20T09:30').toISOString());
      assert.equal((await statusQuery(h, 'needs_you')).includes(id), false);
      assert.equal((await statusQuery(h, 'later')).includes(id), true);
      // It left the Needs you page through the server's own answer, and focus
      // landed on a row that still exists.
      assert.equal(container.querySelector(`[data-attention-focus="item-${id}"]`), null);
      assert.equal(document.activeElement, container.querySelector(`[data-attention-focus="item-${other}"]`));
      container.querySelector('[data-attention-focus="view-later"]').click();
      await quiet();
      assert.equal(Boolean(container.querySelector(`[data-attention-focus="item-${id}"]`)), true);
      container.querySelector('[data-attention-focus="view-all"]').click();
      await quiet();
      assert.equal(Boolean(container.querySelector(`[data-attention-focus="item-${id}"]`)), true,
        'Later is not an archive: All still shows it where the server returned it');
      await openRow(container, id, quiet);
      assert.match(container.textContent, /Recorded due time/);
      assert.doesNotMatch(container.textContent, /countdown|fires in|reminder|will return/i);
      assert.equal(calls.some(call => call.path.includes('/runs')), false);
    });
    // Reading and acting on Attention starts nothing: no Run, no provider call.
    assert.equal(ok(await h.api('GET', '/work-activity?days=1')).recordedRunCount, 0);
    assert.equal(ok(await h.api('GET', '/sessions')).sessions.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test('the workspace holds no timer of its own', () => {
  const source = readFileSync(new URL('../web/attention-view.mjs', import.meta.url), 'utf8');
  for (const timer of ['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback'])
    assert.equal(source.includes(timer), false, `${timer} would make the view a scheduler`);
});
