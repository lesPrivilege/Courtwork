/* E1-R2 · the Runtime view keeps a destination asked for before its
 * Session's snapshot has settled (the first Settings visit from the
 * Composer), opens it when that read lands, and forgets it on departure or a
 * Session change. Observed through the real owner's effect: opening a
 * resource reads its recorded source. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntimeView } from '../web/runtime-view.mjs';
import { deferred, withTinyDom } from './tiny-dom.mjs';

const profile = (sessionId) => ({
  id: 'local:e1-kit-reviewer', kind: 'agent_profile', title: 'Kit reviewer', scope: { type: 'user', id: 'local' },
  source: { type: 'local-config', hash: 'a'.repeat(64) }, activation: 'manual', installed: true, running: null,
  exposed: false, health: 'healthy', configurable: false, defaultExposed: false, provenance: [],
});
const snapshotFor = (sessionId) => ({
  revision: 3, activeRuns: 0, sessionId, scopes: [{ type: 'session', id: sessionId }], resources: [profile(sessionId)],
  composition: { id: 'agent:general', version: null, hash: null, status: 'compatible', resourceIds: null, missing: [], uiSlots: [] }, profileSelections: [], policies: [], context: [],
});

function setup(body) {
  document.body = body;
  // Same shim as runtime-detail-reading.test.mjs: tiny-dom has no childNodes.
  const create = document.createElement.bind(document);
  document.createElement = (tag) => {
    const node = create(tag);
    node.scrollIntoView = () => {};
    Object.defineProperty(node, 'childNodes', { get: () => node.children });
    return node;
  };
  const composition = document.createElement('div');
  body.append(composition);
  let sessionId = 'session-a';
  const gates = [];
  const calls = [];
  const view = createRuntimeView({ composition }, {
    getSessionId: () => sessionId,
    request: async (path) => {
      calls.push(path);
      if (path.startsWith('/runtime-control')) {
        const gate = deferred();
        gates.push(gate);
        await gate.promise;
        return snapshotFor(path.split('sessionId=')[1]);
      }
      if (path.startsWith('/runtime-resources/')) return { resource: profile(sessionId), content: '{"schemaVersion":2}' };
      if (path.startsWith('/runtime-context')) return { context: [] };
      if (path.startsWith('/runtime-proposals')) return { proposals: [] };
      return {};
    },
  });
  const sourceReads = () => calls.filter((p) => p.startsWith('/runtime-resources/local%3Ae1-kit-reviewer') || p.startsWith('/runtime-resources/local:e1-kit-reviewer')).length;
  return { view, gates, sourceReads, setSession: (id) => { sessionId = id; } };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('first visit: a destination asked for during the first read opens when it lands', () => withTinyDom(async (body) => {
  const { view, gates, sourceReads } = setup(body);
  const loading = view.load();
  assert.equal(view.openResource('local:e1-kit-reviewer'), 'pending');
  assert.equal(sourceReads(), 0);
  gates.shift().resolve();
  await loading; await settle();
  assert.equal(sourceReads(), 1, 'the pending destination was opened by the settling read');
}));

test('already loaded: the destination opens at once', () => withTinyDom(async (body) => {
  const { view, gates, sourceReads } = setup(body);
  const loading = view.load(); gates.shift().resolve(); await loading; await settle();
  assert.equal(view.openResource('local:e1-kit-reviewer'), true);
  assert.equal(sourceReads(), 1);
  assert.equal(view.openResource('local:absent'), false, 'a settled snapshot without the resource says so');
}));

test('leaving before a slow read settles forgets the destination', () => withTinyDom(async (body) => {
  const { view, gates, sourceReads } = setup(body);
  const loading = view.load();
  assert.equal(view.openResource('local:e1-kit-reviewer'), 'pending');
  view.forgetPendingOpen();
  gates.shift().resolve(); await loading; await settle();
  assert.equal(sourceReads(), 0);
}));

test('a Session change before the read settles never opens it in the other chat', () => withTinyDom(async (body) => {
  const { view, gates, sourceReads, setSession } = setup(body);
  const first = view.load();
  assert.equal(view.openResource('local:e1-kit-reviewer'), 'pending');
  setSession('session-b');
  const second = view.load();
  gates.shift().resolve(); gates.shift().resolve();
  await Promise.allSettled([first, second]); await settle();
  assert.equal(sourceReads(), 0);
}));
