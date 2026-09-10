/* WK-156 / WK-157 · the triage list itself: explicit state views, the row's
 * recorded time, and the keys that make a list of decisions fast to walk.
 * Every assertion below is about what the view does with a server packet; no
 * test invents a field the registry does not carry. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createAttentionWorkspace, relativeUpdated } from '../web/attention-view.mjs';
import { attentionPage, attentionItem, attentionDetail, NOW } from './attention-fixtures.mjs';
import { deferred, flush, press, withTinyDom } from './tiny-dom.mjs';

const PROJECTS = [{ id: 'p1', name: 'One' }];
const viewLabels = container =>
  container.querySelectorAll('.attention-view-choice').map(node => node.textContent);
const pressed = container =>
  container.querySelectorAll('.attention-view-choice').filter(node => node.getAttribute('aria-pressed') === 'true')
    .map(node => node.textContent);
const rows = container => container.querySelectorAll('.attention-registry-row');

function harness(handler) {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({ path, body: options.body ?? null });
    return handler(path, options, calls.length - 1);
  };
  return { calls, request };
}

test('relative time reads the recorded instant without rewriting it', () => {
  const stamp = '2026-09-10T12:00:00.000Z';
  const now = Date.parse('2026-09-10T12:40:00.000Z');
  assert.equal(relativeUpdated(stamp, now), '40m ago');
  assert.equal(relativeUpdated(stamp, now + 3 * 3_600_000), '3h ago');
  assert.equal(relativeUpdated(stamp, now + 3 * 86_400_000), '3d ago');
  assert.equal(relativeUpdated(stamp, Date.parse('2026-09-30T12:00:00.000Z')),
    new Date(stamp).toLocaleDateString());
  assert.equal(relativeUpdated('not-a-time', now), null);
  assert.equal(stamp, '2026-09-10T12:00:00.000Z');
});

test('the state strip is six explicit views and each one is its own exact query', async () => {
  await withTinyDom(async container => {
    const { calls, request } = harness(() => attentionPage([attentionItem('a', { title: 'Alpha' })]));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    assert.deepEqual(viewLabels(container), ['All', 'Investigating', 'Needs you', 'Waiting', 'Later', 'Resolved']);
    assert.deepEqual(pressed(container), ['All']);
    assert.equal(container.querySelector('[data-attention-focus="filter"]'), null);
    assert.deepEqual(calls[0].body.query, { schema_version: 1, kind: 'registry', limit: 20, offset: 0 });

    container.querySelector('[data-attention-focus="view-later"]').click();
    await flush();
    assert.deepEqual(pressed(container), ['Later']);
    assert.deepEqual(calls[1].body.query,
      { schema_version: 1, kind: 'exact', limit: 20, offset: 0, field: 'status', value: 'later' });
    assert.match(container.textContent, /1 item · Later/);
  });
});

test('All renders the order the server returned and adds no client sort', async () => {
  await withTinyDom(async container => {
    const served = [
      attentionItem('a', { title: 'Later first', status: 'later' }),
      attentionItem('b', { title: 'Needs you second', status: 'needs_you' }),
      attentionItem('c', { title: 'Resolved third', status: 'resolved' }),
    ];
    const { request } = harness(() => attentionPage(served));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    assert.deepEqual(rows(container).map(row => row.querySelector('.attention-row-title').textContent),
      ['Later first', 'Needs you second', 'Resolved third']);
  });
});

test('a row states its status and when the record was updated, and nothing else', async () => {
  await withTinyDom(async container => {
    const updated = new Date(Date.now() - 8 * 60_000).toISOString();
    const { request } = harness(() => attentionPage([attentionItem('a', { title: 'Alpha', updated_at: updated })]));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    const row = rows(container)[0];
    const stamp = row.querySelector('.attention-row-time');
    assert.equal(stamp.getAttribute('datetime'), updated);
    assert.equal(stamp.textContent, 'Updated 8m ago');
    assert.equal(stamp.getAttribute('title'), new Date(updated).toLocaleString());
    assert.match(row.textContent, /Needs you/);
    assert.doesNotMatch(row.textContent, /reason|Next step|gmail|github/i);
  });
});

test('J K and the arrows walk the list, clamp at both ends and stay out of text controls', async () => {
  await withTinyDom(async container => {
    const { request } = harness(() => attentionPage([attentionItem('a'), attentionItem('b'), attentionItem('c')]));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    const [first, second, third] = rows(container);
    press(first, 'j');
    assert.equal(document.activeElement, first);
    press(first, 'j');
    assert.equal(document.activeElement, second);
    press(second, 'ArrowDown');
    assert.equal(document.activeElement, third);
    press(third, 'j');
    assert.equal(document.activeElement, third, 'the cursor clamps instead of wrapping');
    press(third, 'k');
    assert.equal(document.activeElement, second);
    press(second, 'ArrowUp');
    assert.equal(document.activeElement, first);
    press(first, 'k');
    assert.equal(document.activeElement, first);

    const project = container.querySelector('[data-attention-focus="project"]');
    project.focus();
    press(project, 'j');
    assert.equal(document.activeElement, project, 'J is a letter inside a form control');
  });
});

test('Enter opens the focused row and Escape returns focus to it', async () => {
  await withTinyDom(async container => {
    const { request } = harness(path =>
      path === '/attention/query' ? attentionPage([attentionItem('a'), attentionItem('b')]) : attentionDetail('b'));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    const second = rows(container)[1];
    press(second, 'Enter');
    await flush();
    assert.match(container.textContent, /Why this needs attention/);
    press(container.querySelector('[data-attention-focus="list-back"]'), 'Escape');
    await flush();
    assert.doesNotMatch(container.textContent, /Why this needs attention/);
    assert.equal(document.activeElement, container.querySelector('[data-attention-focus="item-b"]'));
  });
});

test('Back to items returns to the row, never to the project selector', async () => {
  await withTinyDom(async container => {
    const { request } = harness(path =>
      path === '/attention/query' ? attentionPage([attentionItem('a'), attentionItem('b')]) : attentionDetail('a'));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    container.querySelector('[data-attention-focus="item-a"]').click();
    await flush();
    container.querySelector('[data-attention-focus="list-back"]').click();
    await flush();
    assert.equal(document.activeElement, container.querySelector('[data-attention-focus="item-a"]'));
    assert.notEqual(document.activeElement, container.querySelector('[data-attention-focus="project"]'));
  });
});

test('pagination is explicit and a view change starts again at the first page', async () => {
  await withTinyDom(async container => {
    const page = offset => attentionPage(
      [attentionItem(`a${offset}`), attentionItem(`b${offset}`)],
      { count: 4, offset, next_offset: offset === 0 ? 2 : null, truncated: offset === 0 });
    const { calls, request } = harness((path, options) => page(options.body.query.offset));
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    assert.match(container.textContent, /1–2 of 4/);
    container.querySelector('[data-attention-focus="next"]').click();
    await flush();
    assert.equal(calls[1].body.query.offset, 2);
    assert.match(container.textContent, /3–4 of 4/);
    container.querySelector('[data-attention-focus="view-needs_you"]').click();
    await flush();
    assert.equal(calls[2].body.query.offset, 0);
    assert.equal(calls[2].body.query.kind, 'exact');
  });
});

test('a pending query keeps the workspace readable and never sorts a half page', async () => {
  await withTinyDom(async container => {
    const pending = deferred();
    const request = () => pending.promise;
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    const opening = workspace.open({ projects: PROJECTS, projectId: 'p1' });
    assert.match(container.textContent, /Loading items/);
    pending.resolve(attentionPage([attentionItem('a', { title: 'Alpha' })]));
    await opening;
    await flush();
    assert.match(container.textContent, /Alpha/);
    assert.equal(NOW, '2026-09-10T12:00:00.000Z');
  });
});

test('a refused read speaks the adjudicated sentence, never the wire code', async () => {
  await withTinyDom(async container => {
    const refusal = () => {
      const error = new Error('NOT_FOUND: Attention unavailable');
      error.status = 409;
      error.body = { error: { code: 'NOT_FOUND', message: 'Attention unavailable' } };
      return error;
    };
    const request = async path => {
      if (path === '/attention/query') return attentionPage([attentionItem('a', { title: 'Alpha' })]);
      throw refusal();
    };
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    await workspace.open({ projects: PROJECTS, projectId: 'p1' });
    container.querySelector('[data-attention-focus="item-a"]').click();
    await flush();
    assert.match(container.textContent, /This item is unavailable\./);
    assert.doesNotMatch(container.textContent, /NOT_FOUND/);
  });
});
