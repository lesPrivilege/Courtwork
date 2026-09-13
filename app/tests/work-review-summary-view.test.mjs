import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkReviewSummary} from '../web/work-review-summary.mjs';
import {deferred, flush, withTinyDom} from './tiny-dom.mjs';

const session = {id: 'session-1', extensionBinding: {extensionId: 'inbound-nda', binding: {matterId: 'matter-1'}}};
const available = overrides => ({
  schemaVersion: 1, sessionId: session.id, extensionId: 'inbound-nda', status: 'available',
  summary: {
    matterId: 'matter-1', title: 'Synthetic NDA', version: 2, sourceVersion: 3,
    contractVersion: 'inbound-nda-v1', stateVersion: 'state-1', readOnly: false,
    pendingCount: 0, stalePendingCount: 0, reviewableCount: 0, acceptedArtifactId: null,
    ...overrides,
  },
});

test('available summary stays visible at zero and opens the existing Work review', () => withTinyDom(async container => {
  let opener;
  const view = createWorkReviewSummary({session, request: async () => available({acceptedArtifactId: 'opaque-artifact-id'}), isCurrent: () => true, onOpenWork: value => { opener = value; }});
  container.append(view.root);
  await flush();
  assert.match(view.root.textContent, /No candidates pending review/);
  assert.match(view.root.textContent, /Accepted artifact available/);
  assert.doesNotMatch(view.root.textContent, /opaque-artifact-id/);
  const open = view.root.querySelectorAll('button').find(button => button.textContent === 'Open work review');
  await view.refresh();
  assert.equal(view.root.querySelectorAll('button').find(button => button.textContent === 'Open work review'), open);
  open.click();
  assert.equal(opener, open);
}));

test('candidate, stale and read-only facts remain separate without an impossible ready count', () => withTinyDom(async container => {
  const view = createWorkReviewSummary({
    session, request: async () => available({pendingCount: 3, stalePendingCount: 2, reviewableCount: 0, readOnly: true}),
    isCurrent: () => true, onOpenWork() {},
  });
  container.append(view.root);
  await flush();
  assert.match(view.root.textContent, /3 candidates pending review/);
  assert.doesNotMatch(view.root.textContent, /ready to review/);
  assert.match(view.root.textContent, /2 candidates based on an earlier work version/);
  assert.match(view.root.textContent, /Review actions are read-only right now/);
  assert.ok(view.root.querySelectorAll('button').some(button => button.textContent === 'Open work review'));
}));

test('ready count is shown only when part of the pending set is reviewable', () => withTinyDom(async container => {
  const responses = [available({pendingCount: 3, reviewableCount: 1}), available({pendingCount: 3, reviewableCount: 3})];
  const view = createWorkReviewSummary({session, request: async () => responses.shift(), isCurrent: () => true, onOpenWork() {}});
  container.append(view.root);
  await flush();
  assert.match(view.root.textContent, /1 candidate ready to review/);
  await view.refresh();
  assert.doesNotMatch(view.root.textContent, /ready to review/);
}));

test('refresh clears old facts while loading and on failure', () => withTinyDom(async container => {
  const wait = deferred();
  let reads = 0;
  const view = createWorkReviewSummary({
    session,
    request: () => ++reads === 1 ? Promise.resolve(available({pendingCount: 2, reviewableCount: 2})) : wait.promise,
    isCurrent: () => true, onOpenWork() {},
  });
  container.append(view.root);
  await flush();
  assert.match(view.root.textContent, /2 candidates pending/);
  const refreshing = view.refresh();
  assert.doesNotMatch(view.root.textContent, /2 candidates pending/);
  assert.match(view.root.textContent, /Reading work review summary/);
  wait.reject(new Error('Core offline'));
  await refreshing;
  assert.match(view.root.textContent, /Work review summary unavailable: Core offline/);
  assert.doesNotMatch(view.root.textContent, /2 candidates pending/);
}));

test('late and mismatched responses cannot replace the current scope', () => withTinyDom(async container => {
  const first = deferred();
  let current = true;
  const view = createWorkReviewSummary({session, request: () => first.promise, isCurrent: () => current, onOpenWork() {}});
  container.append(view.root);
  current = false;
  first.resolve(available({pendingCount: 9, reviewableCount: 9}));
  await flush();
  assert.doesNotMatch(view.root.textContent, /9 candidates/);

  const bad = createWorkReviewSummary({session, request: async () => ({...available({}), sessionId: 'other'}), isCurrent: () => true, onOpenWork() {}});
  container.append(bad.root);
  await flush();
  assert.match(bad.root.textContent, /response is invalid/);
  assert.doesNotMatch(bad.root.textContent, /No candidates pending/);

  const wrongMatter = createWorkReviewSummary({session, request: async () => available({matterId: 'matter-2'}), isCurrent: () => true, onOpenWork() {}});
  container.append(wrongMatter.root);
  await flush();
  assert.match(wrongMatter.root.textContent, /response is invalid/);
  assert.doesNotMatch(wrongMatter.root.textContent, /No candidates pending/);
}));

test('a view outside the current scope does not start a request', () => withTinyDom(async () => {
  let reads = 0;
  createWorkReviewSummary({session, request: async () => { reads++; return available({}); }, isCurrent: () => false, onOpenWork() {}});
  await flush();
  assert.equal(reads, 0);
}));
