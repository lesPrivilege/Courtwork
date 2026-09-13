/* WO-ATT-UI02 · the presentation facts the candidate adds on top of WK-158:
 * seen is drawn apart from status, the receipt line exists only after a matched
 * receipt and a re-read, a conflict states the re-read version and keeps the
 * draft, an unknown result hands focus to its recovery control, and an empty
 * payload action cannot be sent twice while it is out. Motion itself is a
 * browser concern (tiny-dom has no animate()), so these tests pin the facts the
 * motion is allowed to follow. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createAttentionWorkspace } from '../web/attention-view.mjs';
import { attentionDetail, attentionItem, attentionPage } from './attention-fixtures.mjs';
import { deferred, flush, withTinyDom } from './tiny-dom.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/attention-actions.json', import.meta.url), 'utf8'));
const PROJECTS = [{ id: 'p1', name: 'One' }];
const withRevision = (list, revision) => list.map(entry => ({ ...structuredClone(entry), expected_revision: revision }));
const key = (container, k) => container.querySelector(`[data-attention-focus="${k}"]`);
const type = (container, k, value) => {
  const node = key(container, k);
  node.value = value;
  node.dispatchEvent({ type: 'input', target: node });
};

/* A small stateful stand-in: one item whose detail follows committed receipts. */
function core({ status = 'needs_you', seen = false, view = 'all' } = {}) {
  const item = { revision: FIXTURE.open.revision, status, seen };
  const calls = [];
  const hooks = { action: null };
  const detail = () => attentionDetail('a', { title: 'Alpha', status: item.status, revision: item.revision,
    human_actions: withRevision(FIXTURE[item.status === 'resolved' ? 'resolved' : 'open'].human_actions, item.revision), seen: item.seen });
  const request = async (path, init = {}) => {
    calls.push({ path, body: init.body ?? null });
    if (path === '/attention/query') {
      if (init.body.query.kind === 'request') return { schema_version: 1, result: null };
      const visible = init.body.query.kind === 'exact' && init.body.query.value !== item.status ? [] : [attentionItem('a', { title: 'Alpha', status: item.status, revision: item.revision })];
      return attentionPage(visible);
    }
    if (path.endsWith('/actions')) {
      const hook = hooks.action?.(init.body.request, item);
      if (hook instanceof Error) throw hook;
      if (hook) return hook;
      const { action, payload, request_id } = init.body.request;
      if (action === 'acknowledge') item.seen = true;
      if (action === 'resolve') item.status = 'resolved';
      if (action === 'resume') item.status = payload.status ?? 'investigating';
      item.revision += 1;
      return { schema_version: 1, attention_id: 'a', request_id, revision: item.revision, event_id: `e${item.revision}`, status: item.status };
    }
    const d = detail();
    return { ...d, seen: item.seen };
  };
  return { request, calls, hooks, item, view };
}
async function openA(container, c) {
  const workspace = createAttentionWorkspace(container, { request: c.request, onBack() {} });
  await workspace.open({ projects: PROJECTS, projectId: 'p1' });
  if (c.view !== 'all') { key(container, `view-${c.view}`).click(); await flush(); }
  key(container, 'item-a').click();
  await flush();
  return workspace;
}
const posts = c => c.calls.filter(call => call.path.endsWith('/actions'));

test('seen and status are two drawn facts; acknowledging changes only seen', async () => {
  await withTinyDom(async container => {
    const c = core();
    await openA(container, c);
    assert.equal(container.querySelector('.attention-detail-state').textContent, 'Needs you');
    assert.equal(container.querySelector('.attention-seen').textContent, 'Not seen');
    key(container, 'action-acknowledge').click();
    await flush(); await flush();
    assert.equal(container.querySelector('.attention-detail-state').textContent, 'Needs you');
    assert.equal(container.querySelector('.attention-seen').textContent, 'Seen');
    assert.match(container.querySelector('.attention-receipt').textContent, /Recorded · Mark as seen · revision 2/);
  });
});

test('the receipt line waits for the receipt and the re-read, and never precedes them', async () => {
  await withTinyDom(async container => {
    const c = core();
    const held = deferred();
    c.hooks.action = () => held.promise;
    await openA(container, c);
    key(container, 'action-resolve').click(); await flush();
    type(container, 'field-reason', 'Handled.');
    key(container, 'submit-resolve').click(); await flush();
    assert.equal(container.querySelector('.attention-receipt'), null);
    assert.equal(container.querySelector('.attention-detail-state').textContent, 'Needs you');
    const request = posts(c)[0].body.request;
    c.item.status = 'resolved'; c.item.revision += 1;
    held.resolve({ schema_version: 1, attention_id: 'a', request_id: request.request_id, revision: c.item.revision, event_id: 'e', status: 'resolved' });
    await flush(); await flush(); await flush();
    assert.equal(container.querySelector('.attention-detail-state').textContent, 'Resolved');
    assert.match(container.querySelector('.attention-receipt').textContent, /Recorded · Resolve · revision 2/);
  });
});

test('a mismatched receipt draws no receipt line', async () => {
  await withTinyDom(async container => {
    const c = core();
    c.hooks.action = request => ({ schema_version: 1, attention_id: 'a', request_id: 'someone-else', revision: 9, status: 'resolved' });
    await openA(container, c);
    key(container, 'action-acknowledge').click();
    await flush(); await flush(); await flush();
    assert.equal(container.querySelector('.attention-receipt'), null);
    assert.match(container.textContent, /The recorded receipt did not match this request/);
  });
});

test('a version conflict keeps the draft and states the version now on screen', async () => {
  await withTinyDom(async container => {
    const c = core();
    c.hooks.action = (request, item) => {
      item.revision += 1; item.status = 'waiting';
      return Object.assign(new Error('changed'), { status: 409, body: { error: { code: 'VERSION_CONFLICT' } } });
    };
    await openA(container, c);
    key(container, 'action-resolve').click(); await flush();
    type(container, 'field-reason', 'Words worth keeping.');
    key(container, 'submit-resolve').click();
    await flush(); await flush(); await flush();
    assert.equal(key(container, 'field-reason').value, 'Words worth keeping.');
    assert.equal(container.querySelector('.attention-conflict-now').textContent, 'Now Waiting (was Needs you) · revision 2. Your draft is kept.');
    assert.equal(container.querySelector('.attention-receipt'), null);
  });
});

test('an unknown result moves focus to Retry sending and keeps the submit closed', async () => {
  await withTinyDom(async container => {
    const c = core();
    c.hooks.action = () => new Error('The local runtime could not be reached.');
    await openA(container, c);
    key(container, 'action-resolve').click(); await flush();
    type(container, 'field-reason', 'Handled.');
    key(container, 'submit-resolve').click();
    await flush(); await flush();
    assert.equal(document.activeElement, key(container, 'retry-mutation'));
    assert.equal(key(container, 'submit-resolve').disabled, true);
    assert.equal(container.querySelector('.attention-receipt'), null);
  });
});

test('Mark as seen cannot be sent twice while its request is out', async () => {
  await withTinyDom(async container => {
    const c = core();
    const held = deferred();
    c.hooks.action = () => held.promise;
    await openA(container, c);
    key(container, 'action-acknowledge').click(); await flush();
    assert.equal(key(container, 'action-acknowledge').textContent, 'Sending…');
    key(container, 'action-acknowledge').click(); await flush();
    assert.equal(posts(c).length, 1);
    held.resolve({ schema_version: 1, attention_id: 'a', request_id: posts(c)[0].body.request.request_id, revision: 2, status: 'needs_you' });
    await flush(); await flush();
  });
});

test('an item that leaves the current view after a receipt is named, with its new status', async () => {
  await withTinyDom(async container => {
    const c = core({ view: 'needs_you' });
    await openA(container, c);
    key(container, 'action-resolve').click(); await flush();
    type(container, 'field-reason', 'Handled.');
    key(container, 'submit-resolve').click();
    await flush(); await flush(); await flush(); await flush();
    assert.equal(container.querySelectorAll('.attention-registry-row').length, 0);
    assert.equal(container.querySelector('.attention-departed').textContent, 'Alpha · now Resolved, not in this view');
    key(container, 'view-all').click(); await flush();
    assert.equal(container.querySelector('.attention-departed'), null);
  });
});

test('the assistant entry is part of the workspace heading, not an item detail', async () => {
  await withTinyDom(async container => {
    const c = core();
    const workspace = createAttentionWorkspace(container, { request: c.request, onBack() {}, onOpenAssistant() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    key(container, 'item-a').click(); await flush();
    const open = key(container, 'open-assistant');
    assert.ok(open.closest('.attention-workspace-heading'));
    assert.equal(open.closest('.attention-reading'), null);
  });
});
