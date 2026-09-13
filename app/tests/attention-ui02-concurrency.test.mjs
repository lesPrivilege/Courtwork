/* Independent bounded checks for late Attention action responses and the
 * keyboard animation gate. These use the shared contract-shaped view fixtures;
 * they do not change the product implementation. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createAttentionWorkspace } from '../web/attention-view.mjs';
import { attentionDetail, attentionItem, attentionPage } from './attention-fixtures.mjs';
import { deferred, flush, press, TinyNode, withTinyDom, waitFor } from './tiny-dom.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/attention-actions.json', import.meta.url), 'utf8'));
const PROJECTS = [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }];
const key = (container, name) => container.querySelector(`[data-attention-focus="${name}"]`);
const type = (container, name, value) => {
  const node = key(container, name);
  node.value = value;
  node.dispatchEvent({ type: 'input', target: node });
};

function makeHarness(hooks = {}) {
  const projects = new Map([
    ['p1', new Map([
      ['a', { title: 'Alpha', status: 'needs_you', revision: 1, seen: false }],
      ['b', { title: 'Beta', status: 'needs_you', revision: 1, seen: false }],
    ])],
    ['p2', new Map([
      ['c', { title: 'Gamma', status: 'needs_you', revision: 1, seen: false }],
    ])],
  ]);
  const calls = [];
  const request = (path, options = {}) => {
    const body = options.body ?? null;
    calls.push({ path, body });
    if (path === '/attention/query') {
      if (body.query.kind === 'request') return Promise.resolve({ schema_version: 1, result: null });
      const projectId = body.projectId;
      const items = [...(projects.get(projectId)?.entries() ?? [])]
        .map(([id, item]) => attentionItem(id, { title: item.title, status: item.status, revision: item.revision }));
      const page = attentionPage(items);
      return hooks.registry?.({ body, page, projects, calls }) ?? Promise.resolve(page);
    }
    if (path.endsWith('/actions')) {
      const ctx = { request: body.request, projectId: body.projectId, projects, calls };
      const hooked = hooks.action?.(ctx);
      if (hooked !== undefined) return hooked;
      const item = projects.get(body.projectId)?.get(body.request.attention_id);
      if (item) {
        item.revision += 1;
        if (body.request.action === 'resolve') item.status = 'resolved';
      }
      return Promise.resolve({ schema_version: 1,
        attention_id: body.request.attention_id, request_id: body.request.request_id,
        revision: item?.revision ?? body.request.expected_revision + 1,
        event_id: `e${item?.revision ?? body.request.expected_revision + 1}`, status: item?.status ?? 'needs_you' });
    }
    const url = new URL(path, 'http://local.test');
    const projectId = url.searchParams.get('projectId');
    const id = decodeURIComponent(url.pathname.split('/').at(-1));
    const item = projects.get(projectId)?.get(id);
    if (!item) return Promise.reject(new Error('missing fixture item'));
    const actions = item.status === 'resolved' ? FIXTURE.resolved.human_actions : FIXTURE.open.human_actions;
    const detail = attentionDetail(id, { title: item.title, status: item.status, revision: item.revision,
      seen: item.seen, human_actions: actions.map(action => ({ ...action, expected_revision: item.revision })) });
    return hooks.inspect?.({ projectId, id, detail, projects, calls }) ?? Promise.resolve(detail);
  };
  return { request, calls, projects };
}

async function open(container, harness, projectId = 'p1') {
  const workspace = createAttentionWorkspace(container, { request: harness.request, onBack() {} });
  await workspace.open({ projects: PROJECTS, projectId });
  await flush();
  return workspace;
}

function beginResolve(container, draft) {
  key(container, 'action-resolve').click();
  type(container, 'field-reason', draft);
  key(container, 'submit-resolve').click();
}

function receipt(id, request, revision, status) {
  return { schema_version: 1, attention_id: id, request_id: request.request_id,
    revision, event_id: `e${revision}`, status };
}

test('late A conflict cannot replace B draft or show A conflict in the same project', async () => {
  const aResponse = deferred();
  const h = makeHarness({ action: ({ request }) => request.attention_id === 'a' ? aResponse.promise : undefined });
  await withTinyDom(async container => {
    await open(container, h);
    key(container, 'item-a').click(); await flush();
    beginResolve(container, 'A draft'); await flush();
    const aRequest = h.calls.find(call => call.path.endsWith('/actions')).body.request;

    key(container, 'item-b').click(); await flush();
    key(container, 'action-resolve').click();
    type(container, 'field-reason', 'B draft stays here');
    h.projects.get('p1').set('a', { title: 'Alpha', status: 'waiting', revision: 2, seen: false });
    aResponse.reject(Object.assign(new Error('changed'), {
      status: 409, body: { error: { code: 'VERSION_CONFLICT' } },
    }));
    await flush(); await flush(); await flush();

    assert.equal(key(container, 'field-reason').value, 'B draft stays here');
    assert.equal(container.querySelector('.attention-action-alert'), null);
    assert.equal(container.querySelector('.attention-conflict-now'), null);
    assert.equal(container.querySelector('.attention-receipt'), null);
    assert.ok(aRequest.request_id, 'the held action was A’s own request');
  });
});

test('late A success after project switch leaves B draft and receipt state alone', async () => {
  const aResponse = deferred();
  const h = makeHarness({ action: ({ request }) => request.attention_id === 'a' ? aResponse.promise : undefined });
  await withTinyDom(async container => {
    await open(container, h);
    key(container, 'item-a').click(); await flush();
    beginResolve(container, 'A draft'); await flush();
    const aRequest = h.calls.find(call => call.path.endsWith('/actions')).body.request;

    const project = key(container, 'project');
    project.value = 'p2'; project.dispatchEvent({ type: 'change', target: project });
    await flush();
    key(container, 'item-c').click(); await flush();
    key(container, 'action-resolve').click();
    type(container, 'field-reason', 'B project draft stays here');

    h.projects.get('p1').set('a', { title: 'Alpha', status: 'resolved', revision: 2, seen: false });
    aResponse.resolve(receipt('a', aRequest, 2, 'resolved'));
    await flush(); await flush(); await flush();

    assert.equal(key(container, 'project').value, 'p2');
    assert.equal(key(container, 'field-reason').value, 'B project draft stays here');
    assert.equal(container.querySelector('.attention-receipt'), null);
    assert.equal(container.querySelector('.attention-action-alert'), null);
  });
});

test('keyboard opening, editing and receipt feedback call no WAAPI animations', async () => {
  const previous = {
    matchMedia: globalThis.matchMedia,
    getComputedStyle: globalThis.getComputedStyle,
    animate: TinyNode.prototype.animate,
  };
  const animations = [];
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.getComputedStyle = () => ({ getPropertyValue: name => name === '--ease-out' ? 'ease-out' : '180ms' });
  TinyNode.prototype.animate = function (...args) { animations.push({ className: this.className, args }); return {}; };
  try {
    await withTinyDom(async container => {
      globalThis.document.documentElement = { getAttribute: () => null };
      const h = makeHarness();
      await open(container, h);
      animations.length = 0;
      press(key(container, 'item-a'), 'Enter'); await flush();
      key(container, 'action-resolve').click();
      type(container, 'field-reason', 'Keyboard decision');
      key(container, 'submit-resolve').click();
      await waitFor(() => container.querySelector('.attention-receipt'), { label: 'keyboard receipt' });
      await flush(); await flush();
      assert.deepEqual(animations.map(animation => animation.className), []);
    });
  } finally {
    if (previous.matchMedia === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = previous.matchMedia;
    if (previous.getComputedStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = previous.getComputedStyle;
    if (previous.animate === undefined) delete TinyNode.prototype.animate; else TinyNode.prototype.animate = previous.animate;
  }
});

test('overlapping settlements keep feedback motion held until B registry read finishes', async () => {
  const aResponse = deferred(), bResponse = deferred(), bInspect = deferred();
  const aRegistry = deferred(), bRegistry = deferred();
  const aRegistryStarted = deferred(), bInspectStarted = deferred(), bRegistryStarted = deferred();
  let registryReads = 0, bInspectReads = 0, aPageSnapshot = null;
  const h = makeHarness({
    action: ({ request }) => request.attention_id === 'a' ? aResponse.promise : bResponse.promise,
    inspect: ({ id, detail }) => {
      if (id === 'b' && ++bInspectReads === 2) { bInspectStarted.resolve(); return bInspect.promise; }
      return Promise.resolve(detail);
    },
    registry: ({ page }) => {
      registryReads += 1;
      if (registryReads === 2) { aPageSnapshot = page; aRegistryStarted.resolve(); return aRegistry.promise; }
      if (registryReads === 3) { bRegistryStarted.resolve(); return bRegistry.promise; }
      return Promise.resolve(page);
    },
  });
  const previous = {
    matchMedia: globalThis.matchMedia,
    getComputedStyle: globalThis.getComputedStyle,
    animate: TinyNode.prototype.animate,
  };
  const animations = [];
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.getComputedStyle = () => ({ getPropertyValue: name => name === '--ease-out' ? 'ease-out' : '180ms' });
  TinyNode.prototype.animate = function (...args) { animations.push({ className: this.className, args }); return {}; };
  try {
    await withTinyDom(async container => {
      globalThis.document.documentElement = { getAttribute: () => null };
      await open(container, h);
      animations.length = 0;
      key(container, 'item-a').click(); await flush();
      beginResolve(container, 'A decision'); await flush();
      const aRequest = h.calls.find(call => call.path.endsWith('/actions')).body.request;
      key(container, 'item-b').click(); await flush();
      beginResolve(container, 'B decision'); await flush();
      const bRequest = h.calls.filter(call => call.path.endsWith('/actions'))[1].body.request;

      h.projects.get('p1').set('a', { title: 'Alpha', status: 'resolved', revision: 2, seen: false });
      aResponse.resolve(receipt('a', aRequest, 2, 'resolved'));
      await aRegistryStarted.promise;

      h.projects.get('p1').set('b', { title: 'Beta', status: 'resolved', revision: 2, seen: false });
      bResponse.resolve(receipt('b', bRequest, 2, 'resolved'));
      await bInspectStarted.promise;

      /* A's already-issued registry page captured B before B's action committed. */
      assert.equal(aPageSnapshot.items.find(item => item.attention_id === 'b').status, 'needs_you');
      aRegistry.resolve(aPageSnapshot);
      await flush(); await flush();

      const currentB = h.projects.get('p1').get('b');
      const bDetail = attentionDetail('b', { title: currentB.title, status: currentB.status,
        revision: currentB.revision, human_actions: FIXTURE.resolved.human_actions.map(action => ({ ...action, expected_revision: 2 })) });
      bInspect.resolve(bDetail);
      await bRegistryStarted.promise;
      await flush();

      assert.deepEqual(animations.map(animation => animation.className).filter(name => name.includes('attention-receipt')), [],
        'B receipt feedback must wait while the B registry query is still unresolved');
      bRegistry.resolve(attentionPage([
        attentionItem('a', { title: 'Alpha', status: 'resolved', revision: 2 }),
        attentionItem('b', { title: 'Beta', status: 'resolved', revision: 2 }),
      ]));
      await flush(); await flush();
      assert.equal(animations.filter(animation => animation.className.includes('attention-receipt')).length, 1,
        'B receipt feedback appears once after its own registry read completes');
    });
  } finally {
    if (previous.matchMedia === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = previous.matchMedia;
    if (previous.getComputedStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = previous.getComputedStyle;
    if (previous.animate === undefined) delete TinyNode.prototype.animate; else TinyNode.prototype.animate = previous.animate;
  }
});
