import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeView } from '../web/runtime-view.mjs';
import { deferred, waitFor, withTinyDom } from './tiny-dom.mjs';

const scope = { type: 'session', id: 'session-a' };
const resource = id => ({
  id, kind: 'tool', title: id.slice(5), scope, action: 'workspace.write',
  source: { type: 'local-config', uri: 'fixture://local-tool' },
  activation: 'always', installed: true, running: null,
  exposed: true, health: 'healthy', configurable: true, defaultExposed: true,
  provenance: [{ scope, value: true, reason: 'source default' }],
  permission: { effect: 'ask', trace: [] },
});

async function fixture(body, sourceReply = async () => ({ content: 'Recorded fixture source.' })) {
  document.body = body;
  document.activeElement = body;
  // Model focus loss on subtree replacement, as browsers do. Tiny DOM is not
  // used to assert pixel bounds or native scrollability; those need a browser.
  const create = document.createElement.bind(document);
  document.createElement = tag => {
    const node = create(tag);
    node.scrollTop = 0;
    node.scrollLeft = 0;
    node.scrollIntoView = () => {};
    Object.defineProperty(node, 'childNodes', { get: () => node.children });
    const replace = node.replaceChildren.bind(node);
    node.replaceChildren = (...children) => {
      if (node.contains(document.activeElement)) document.activeElement = document.body;
      replace(...children);
    };
    return node;
  };
  const plane = document.createElement('div');
  plane.className = 'settings-sections';
  const overview = document.createElement('div');
  const capabilities = document.createElement('div');
  plane.append(overview, capabilities);
  body.append(plane);
  let sessionId = scope.id;
  const snapshot = {
    revision: 1, activeRuns: 0, scopes: [scope],
    resources: [resource('tool:ws_write'), resource('tool:ws_read'), resource('local:ref.alpha'), resource('local:ref_alpha')],
    composition: { id: 'agent:general', status: 'compatible', missing: [], uiSlots: [] },
  };
  const view = createRuntimeView({ overview, capabilities }, {
    request: async path => {
      if (path.startsWith('/runtime-control')) return structuredClone(snapshot);
      if (path.startsWith('/runtime-context')) return { context: [] };
      if (path.startsWith('/runtime-resources/')) return sourceReply();
      if (path.startsWith('/runtime-permissions/evaluate')) return { effect: 'ask', trace: [] };
      throw new Error(`Unexpected request: ${path}`);
    },
    getSessionId: () => sessionId,
    notify: () => {},
  });
  await view.load();
  const title = id => [...capabilities.querySelectorAll("button")].find(node => node.getAttribute("data-focus-key") === `row:${id}`);
  const detail = id => [...capabilities.querySelectorAll(".runtime-row")].find(node => node.getAttribute("data-resource") === id)?.querySelector('.runtime-detail');
  return { view, plane, capabilities, title, detail, setSession: id => { sessionId = id; } };
}

test('Runtime detail retains each object reading position and focus through a snapshot refresh', () => withTinyDom(async body => {
  const h = await fixture(body);
  h.title('tool:ws_write').click();
  const first = h.detail('tool:ws_write');
  first.scrollTop = 170;
  first.scrollLeft = 6;
  h.title('tool:ws_read').click();
  h.detail('tool:ws_read').scrollTop = 40;
  h.detail('tool:ws_write').focus();
  h.plane.scrollTop = 210;
  await h.view.refresh();
  assert.notEqual(h.detail('tool:ws_write'), first, 'the refresh really replaced the subtree');
  assert.equal(h.detail('tool:ws_write').scrollTop, 170);
  assert.equal(h.detail('tool:ws_write').scrollLeft, 6);
  assert.equal(h.detail('tool:ws_read').scrollTop, 40, 'objects do not share a reading position');
  assert.equal(h.plane.scrollTop, 210);
  assert.equal(document.activeElement, h.detail('tool:ws_write'));
  assert.equal(h.detail('tool:ws_write').getAttribute('role'), 'group');
  assert.equal(h.detail('tool:ws_write').getAttribute('aria-labelledby'), h.title('tool:ws_write').getAttribute('id'));
}));

test('Late recorded-source completion preserves the currently read object position', () => withTinyDom(async body => {
  const pending = deferred();
  const h = await fixture(body, () => pending.promise);
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="source:tool:ws_write"]').click();
  const reading = h.detail('tool:ws_write');
  reading.scrollTop = 95;
  reading.focus();
  pending.resolve({ content: 'Late recorded source.\n'.repeat(50) });
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('Late recorded source.'));
  assert.equal(h.detail('tool:ws_write').scrollTop, 95);
  assert.equal(document.activeElement, h.detail('tool:ws_write'));
  assert.equal(h.title('tool:ws_write').getAttribute('aria-expanded'), 'true');
}));

test('Changing Session does not carry an old object reading position into the new context', () => withTinyDom(async body => {
  const h = await fixture(body);
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').scrollTop = 200;
  h.setSession('session-b');
  await h.view.load();
  assert.equal(h.title('tool:ws_write').getAttribute('aria-expanded'), 'false');
  h.title('tool:ws_write').click();
  assert.equal(h.detail('tool:ws_write').scrollTop, 0);
}));


test('Permission explanation remains before an already opened long recorded source', () => withTinyDom(async body => {
  const h = await fixture(body, async () => ({ content: 'Long source fixture.\n'.repeat(200) }));
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="source:tool:ws_write"]').click();
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('Long source fixture.'));
  h.detail('tool:ws_write').querySelector('[data-focus-key="explain:tool:ws_write"]').click();
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('Permission explanation'));
  const text = h.detail('tool:ws_write').textContent;
  assert.ok(text.indexOf('Permission explanation') < text.indexOf('Long source fixture.'));
}));


test('Distinct legal resource IDs keep independent DOM relationships and reading positions', () => withTinyDom(async body => {
  const h = await fixture(body);
  const ids = ['local:ref.alpha', 'local:ref_alpha'];
  ids.forEach(id => h.title(id).click());
  h.detail(ids[0]).scrollTop = 75;
  h.detail(ids[1]).scrollTop = 125;
  await h.view.refresh();
  assert.notEqual(h.detail(ids[0]).getAttribute('id'), h.detail(ids[1]).getAttribute('id'));
  ids.forEach((id, i) => {
    assert.equal(h.detail(id).scrollTop, i ? 125 : 75);
    assert.equal(h.title(id).getAttribute('aria-controls'), h.detail(id).getAttribute('id'));
    assert.equal(h.detail(id).getAttribute('aria-labelledby'), h.title(id).getAttribute('id'));
  });
}));

test('A pending source read and permission explanation settle independently', () => withTinyDom(async body => {
  const pending = deferred();
  const h = await fixture(body, () => pending.promise);
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="source:tool:ws_write"]').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="explain:tool:ws_write"]').click();
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('Permission explanation'));
  pending.resolve({ content: 'Concurrent recorded source.' });
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('Concurrent recorded source.'));
}));

test('A failed source response from a prior Session cannot replace the new read', () => withTinyDom(async body => {
  const old = deferred();
  let calls = 0;
  const h = await fixture(body, () => ++calls === 1 ? old.promise : Promise.resolve({ content: 'New Session source.' }));
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="source:tool:ws_write"]').click();
  h.setSession('session-b'); await h.view.load();
  h.title('tool:ws_write').click();
  h.detail('tool:ws_write').querySelector('[data-focus-key="source:tool:ws_write"]').click();
  await waitFor(() => h.detail('tool:ws_write').textContent.includes('New Session source.'));
  old.reject(new Error('Old Session failure'));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(h.detail('tool:ws_write').textContent.includes('New Session source.'));
  assert.ok(!h.detail('tool:ws_write').textContent.includes('Old Session failure'));
}));
