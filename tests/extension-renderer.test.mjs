import assert from 'node:assert/strict';
import test from 'node:test';

import { mount } from '../app/extensions/evidence-memo/renderer.mjs';

class FakeNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.value = '';
    this.textContent = '';
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  removeEventListener(name) {
    this.listeners.delete(name);
  }

  click() {
    this.listeners.get('click')?.();
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeNode(tagName, this);
  }
}

function textOf(node) {
  return [node.textContent, ...node.children.map(textOf)].join(' ');
}

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test('renderer is a neutral projection surface and dispatches typed actions without actor fields', () => {
  const documentRef = new FakeDocument();
  const container = new FakeNode('main', documentRef);
  const dispatched = [];
  const projection = {
    title: 'Memo title',
    matter: { id: 'matter-1' },
    sources: [{ id: 'source-1', version: 1, text: 'Source text', digest: 'digest-1' }],
    evidence: [{ source_id: 'source-1', source_version: 1, start: 0, end: 6, quote: 'Source', digest: 'digest-1' }],
    candidates: [{ id: 'candidate-1', status: 'pending', artifact_text: 'Draft', base_version: 0, evidence: [] }],
    artifact: null,
    draft: 'Existing draft',
  };
  const view = mount({ container, projection, dispatch: (action, payload) => dispatched.push({ action, payload }) });
  assert.match(textOf(container), /Memo title/);
  assert.match(textOf(container), /Source text/);
  assert.match(textOf(container), /Draft/);
  const save = find(container, (node) => node.tagName === 'button' && node.textContent === 'Save draft');
  save.click();
  assert.equal(dispatched[0].action, 'save_draft');
  assert.deepEqual(dispatched[0].payload, { text: 'Existing draft' });
  const accept = find(container, (node) => node.tagName === 'button' && node.textContent === 'accept');
  accept.click();
  assert.equal(dispatched[1].action, 'decide');
  assert.equal(Object.hasOwn(dispatched[1].payload, 'actor'), false);
  view.dispose();
  view.update({ title: 'stale' });
  assert.doesNotMatch(textOf(container), /stale/);
});

