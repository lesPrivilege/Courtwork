/* WK-158 · the typed action layer. The descriptors used here are the ones the
 * running Core actually advertised (captured by
 * `evidence/att-fe01/capture-action-fixtures.mjs`), so no test can build an
 * editor for an action or a schema the backend does not publish. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { toAttentionActionDescriptors } from '../web/presentation-adapters.mjs';
import { createAttentionWorkspace } from '../web/attention-view.mjs';
import { attentionDetail, attentionItem, attentionPage } from './attention-fixtures.mjs';
import { flush, withTinyDom } from './tiny-dom.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/attention-actions.json', import.meta.url), 'utf8'));
const PROJECTS = [{ id: 'p1', name: 'One' }];
const advertised = (which = 'open') => structuredClone(FIXTURE[which].human_actions);
const names = list => list.map(entry => entry.action);

function detail(id = 'a', { which = 'open', actions, ...rest } = {}) {
  const source = FIXTURE[which];
  return attentionDetail(id, {
    revision: source.revision,
    status: source.status,
    human_actions: actions ?? advertised(which),
    policy: source.policy,
    ...rest,
  });
}

async function openDetail(container, { onRequest, ...options } = {}) {
  const calls = [];
  const request = async (path, init = {}) => {
    calls.push({ path, method: init.method ?? 'GET', body: init.body ?? null });
    const response = onRequest?.(path, init, calls.length - 1);
    if (response instanceof Error) throw response;
    if (response !== undefined) return response;
    if (path === '/attention/query') return attentionPage([attentionItem('a', { status: 'needs_you' })]);
    return detail('a', options);
  };
  const workspace = createAttentionWorkspace(container, { request, onBack() {} });
  await workspace.open({ projects: PROJECTS, projectId: 'p1' });
  container.querySelector('[data-attention-focus="item-a"]').click();
  await flush();
  return { calls, workspace };
}
const actions = calls => calls.filter(call => call.path.endsWith('/actions'));
const choices = container =>
  container.querySelectorAll('.attention-action-choice').map(node => node.textContent);
const type = (container, key, value) => {
  const node = container.querySelector(`[data-attention-focus="${key}"]`);
  node.value = value;
  node.dispatchEvent({ type: 'input', target: node });
  return node;
};

test('the projection accepts exactly the actions this app was built against', () => {
  const open = toAttentionActionDescriptors({ revision: FIXTURE.open.revision, human_actions: advertised('open') });
  assert.deepEqual(names(open.actions), ['acknowledge', 'resume', 'set_waiting', 'snooze', 'resolve']);
  assert.deepEqual(open.omitted, [
    { action: 'attach_relation', reason: 'out-of-scope' },
    { action: 'request_disclosure', reason: 'out-of-scope' },
  ]);
  const resolved = toAttentionActionDescriptors({ revision: FIXTURE.resolved.revision, human_actions: advertised('resolved') });
  assert.deepEqual(names(resolved.actions), ['acknowledge', 'reopen']);
  assert.deepEqual(names(resolved.omitted), ['attach_relation', 'request_disclosure']);
  const snooze = open.actions.find(entry => entry.action === 'snooze');
  assert.deepEqual(snooze.fields.nextAction.kinds, ['inspect', 'decide', 'wait', 'follow_up']);
  assert.equal(snooze.fields.reason.maxLength, 4000);
  assert.equal(snooze.fields.nextAction.labelMaxLength, 500);
});

test('a descriptor fails closed on a stale revision, an unknown action or a widened schema', () => {
  const base = advertised('open');
  const stale = toAttentionActionDescriptors({ revision: FIXTURE.open.revision + 1, human_actions: base });
  assert.deepEqual(stale.actions, []);
  assert.equal(stale.omitted.every(entry => entry.reason === 'revision-mismatch'), true);

  const unknown = structuredClone(base);
  unknown[0] = { ...unknown[0], action: 'approve' };
  const seenUnknown = toAttentionActionDescriptors({ revision: FIXTURE.open.revision, human_actions: unknown });
  assert.deepEqual(seenUnknown.omitted.filter(entry => entry.action === 'approve'), [{ action: 'approve', reason: 'unknown-action' }]);

  const widened = structuredClone(base);
  const resolve = widened.find(entry => entry.action === 'resolve');
  resolve.payload_schema.properties.effect = { type: 'string' };
  const seenWidened = toAttentionActionDescriptors({ revision: FIXTURE.open.revision, human_actions: widened });
  assert.equal(names(seenWidened.actions).includes('resolve'), false);
  assert.deepEqual(seenWidened.omitted.filter(entry => entry.action === 'resolve'),
    [{ action: 'resolve', reason: 'unsupported-payload-schema' }]);

  const version = structuredClone(base);
  version.find(entry => entry.action === 'snooze').schema_version = 2;
  const seenVersion = toAttentionActionDescriptors({ revision: FIXTURE.open.revision, human_actions: version });
  assert.deepEqual(seenVersion.omitted.filter(entry => entry.action === 'snooze'),
    [{ action: 'snooze', reason: 'unsupported-schema-version' }]);
  assert.equal(toAttentionActionDescriptors({ revision: 1 }), null);
});

test('the detail offers only advertised, understood actions and never an out-of-scope control', async () => {
  await withTinyDom(async container => {
    await openDetail(container);
    assert.deepEqual(choices(container), ['Mark as seen', 'Resume', 'Set waiting', 'Snooze', 'Resolve']);
    assert.doesNotMatch(container.textContent, /Link|Unlink|disclosure editor|Revoke|Coming soon|Proposal/);
    assert.match(container.textContent, /Runtime disclosure: None/);
    assert.equal(container.querySelector('[data-attention-focus="action-attach_relation"]'), null);
    assert.equal(container.querySelector('[data-attention-focus="action-request_disclosure"]'), null);
  });
});

test('an item whose descriptors this app cannot read offers no controls at all', async () => {
  await withTinyDom(async container => {
    const widened = advertised('open').map(entry => ({ ...entry, expected_revision: entry.expected_revision + 5 }));
    await openDetail(container, { actions: widened });
    assert.deepEqual(choices(container), []);
    assert.match(container.textContent, /No action is available on this item right now/);
  });
});

test('acknowledge is the action itself: an empty payload, no dialog, no toggle', async () => {
  await withTinyDom(async container => {
    const { calls } = await openDetail(container);
    container.querySelector('[data-attention-focus="action-acknowledge"]').click();
    await flush();
    const post = actions(calls)[0];
    assert.deepEqual(post.body.request.payload, {});
    assert.equal(post.body.request.action, 'acknowledge');
    assert.equal(post.body.request.expected_revision, FIXTURE.open.revision);
    assert.equal(post.body.request.schema_version, 1);
    assert.equal(typeof post.body.request.request_id, 'string');
    assert.deepEqual(Object.keys(post.body.request).sort(),
      ['action', 'attention_id', 'expected_revision', 'payload', 'request_id', 'schema_version']);
    assert.deepEqual(Object.keys(post.body).sort(), ['projectId', 'request']);
  });
});

test('resolve requires a reason and refuses to send without one', async () => {
  await withTinyDom(async container => {
    const { calls } = await openDetail(container);
    container.querySelector('[data-attention-focus="action-resolve"]').click();
    await flush();
    container.querySelector('[data-attention-focus="submit-resolve"]').click();
    await flush();
    assert.equal(actions(calls).length > 0, false);
    const alert = container.querySelector('.attention-field-error');
    assert.equal(alert.getAttribute('role'), 'alert');
    assert.match(alert.textContent, /A reason is required/);
    assert.equal(container.querySelector('[data-attention-focus="field-reason"]').getAttribute('aria-describedby'),
      alert.getAttribute('id'));

    type(container, 'field-reason', '  Recorded as handled.  ');
    container.querySelector('[data-attention-focus="submit-resolve"]').click();
    await flush();
    const post = actions(calls)[0];
    assert.deepEqual(post.body.request.payload, { reason: 'Recorded as handled.' });
  });
});

test('snooze records a next action and only sends a due time when the trigger is one', async () => {
  await withTinyDom(async container => {
    const { calls } = await openDetail(container);
    container.querySelector('[data-attention-focus="action-snooze"]').click();
    await flush();
    assert.deepEqual(
      container.querySelector('[data-attention-focus="field-kind"]').children.map(option => option.getAttribute('value')),
      ['inspect', 'decide', 'wait', 'follow_up'], 'a snooze cannot record "none" as its next action');
    assert.equal(container.querySelector('[data-attention-focus="field-due"]'), null);

    container.querySelector('[data-attention-focus="submit-snooze"]').click();
    await flush();
    assert.match(container.querySelector('.attention-field-error').textContent, /A reason is required/);
    type(container, 'field-reason', 'Waiting on the other party.');
    container.querySelector('[data-attention-focus="submit-snooze"]').click();
    await flush();
    assert.match(container.querySelector('.attention-field-error').textContent, /label is required/);
    type(container, 'field-label', 'Check the reply');
    container.querySelector('[data-attention-focus="submit-snooze"]').click();
    await flush();
    const manual = actions(calls)[0];
    assert.deepEqual(manual.body.request.payload.next_action,
      { kind: 'inspect', label: 'Check the reply', trigger: 'manual', due_at: null });
  });
});

test('a recorded due time is required for the at trigger and is sent with its zone', async () => {
  await withTinyDom(async container => {
    const { calls } = await openDetail(container);
    container.querySelector('[data-attention-focus="action-set_waiting"]').click();
    await flush();
    type(container, 'field-reason', 'Counsel is reviewing.');
    type(container, 'field-label', 'Read the reply');
    const trigger = container.querySelector('[data-attention-focus="field-trigger"]');
    trigger.value = 'at';
    trigger.dispatchEvent({ type: 'change', target: trigger });
    await flush();
    container.querySelector('[data-attention-focus="submit-set_waiting"]').click();
    await flush();
    assert.equal(actions(calls).length > 0, false);
    assert.match(container.querySelector('.attention-field-error').textContent, /due time is required/);

    type(container, 'field-due', '2026-09-20T09:30');
    container.querySelector('[data-attention-focus="submit-set_waiting"]').click();
    await flush();
    const post = actions(calls)[0];
    assert.equal(post.body.request.action, 'set_waiting');
    assert.equal(post.body.request.payload.next_action.due_at, new Date('2026-09-20T09:30').toISOString());
    assert.match(post.body.request.payload.next_action.due_at, /Z$|[+-]\d{2}:\d{2}$/);
    assert.doesNotMatch(container.textContent, /fires in|reminder|notification|countdown/i);
  });
});

test('resume and reopen name their target state and offer no third one', async () => {
  await withTinyDom(async container => {
    const { calls } = await openDetail(container);
    container.querySelector('[data-attention-focus="action-resume"]').click();
    await flush();
    assert.match(container.textContent, /Resume as/);
    assert.equal(container.querySelector('[data-attention-focus="field-status-investigating"]').checked, true);
    assert.equal(container.querySelector('[data-attention-focus="field-status-later"]'), null);
    type(container, 'field-reason', 'Back to me.');
    const needsYou = container.querySelector('[data-attention-focus="field-status-needs_you"]');
    needsYou.dispatchEvent({ type: 'change', target: needsYou });
    container.querySelector('[data-attention-focus="submit-resume"]').click();
    await flush();
    assert.deepEqual(actions(calls)[0].body.request.payload,
      { reason: 'Back to me.', status: 'needs_you' });
  });
});

test('a resolved item offers reopen and nothing the contract withdrew', async () => {
  await withTinyDom(async container => {
    await openDetail(container, { which: 'resolved' });
    assert.deepEqual(choices(container), ['Mark as seen', 'Reopen']);
    container.querySelector('[data-attention-focus="action-reopen"]').click();
    await flush();
    assert.match(container.textContent, /Reopen as/);
  });
});

test('nothing is optimistic: only the submit control changes while a request is open', async () => {
  await withTinyDom(async container => {
    const held = [];
    const { calls } = await openDetail(container, {
      onRequest: (path) => {
        if (!path.endsWith('/actions')) return undefined;
        return new Promise(resolve => held.push(resolve));
      },
    });
    container.querySelector('[data-attention-focus="action-resolve"]').click();
    await flush();
    type(container, 'field-reason', 'Recorded as handled.');
    container.querySelector('[data-attention-focus="submit-resolve"]').click();
    await flush();
    const submit = container.querySelector('[data-attention-focus="submit-resolve"]');
    assert.equal(submit.textContent, 'Sending…');
    assert.equal(submit.disabled, true);
    assert.doesNotMatch(container.textContent, /Resolving…|Snoozing…/);
    // The confirmed status is what the row and the detail keep saying.
    assert.match(container.querySelector('.attention-registry-row').textContent, /Needs you/);
    assert.equal(container.querySelector('.attention-detail-state').textContent, 'Investigating');
    assert.equal(actions(calls).length, 1);
    held[0]({ schema_version: 1, attention_id: 'a', request_id: actions(calls)[0].body.request.request_id, revision: 2, status: 'resolved' });
    await flush();
  });
});

test('when the last row of a page leaves, the view backs up to a page that exists', async () => {
  await withTinyDom(async container => {
    let removed = false;
    const page = offset => {
      if (offset === 0) return attentionPage([attentionItem('first'), attentionItem('second')],
        { count: removed ? 2 : 3, offset: 0, next_offset: removed ? null : 2, truncated: !removed });
      return attentionPage(removed ? [] : [attentionItem('a')],
        { count: removed ? 2 : 3, offset: 2, next_offset: null, truncated: false });
    };
    const request = async (path, init = {}) => {
      if (path === '/attention/query') return page(init.body.query.offset);
      if (path.endsWith('/actions')) {
        removed = true;
        return { schema_version: 1, attention_id: 'a', request_id: init.body.request.request_id, revision: 2, status: 'resolved' };
      }
      return detail('a');
    };
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    container.querySelector('[data-attention-focus="next"]').click();
    await flush();
    assert.match(container.textContent, /3–3 of 3/);
    container.querySelector('[data-attention-focus="item-a"]').click();
    await flush();
    container.querySelector('[data-attention-focus="action-resolve"]').click();
    await flush();
    type(container, 'field-reason', 'Recorded as handled.');
    container.querySelector('[data-attention-focus="submit-resolve"]').click();
    await flush(); await flush(); await flush();
    assert.match(container.textContent, /2 items · all states/);
    assert.deepEqual(container.querySelectorAll('.attention-registry-row').map(row => row.dataset.attentionFocus),
      ['item-first', 'item-second']);
    assert.doesNotMatch(container.textContent, /3–3 of|3–2 of|0 of 2/);
    assert.equal(document.activeElement, container.querySelector('[data-attention-focus="item-first"]'));
  });
});
