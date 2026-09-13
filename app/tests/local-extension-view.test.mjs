import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalExtensionView } from '../web/local-extension-view.mjs';
import { withTinyDom, waitFor } from './tiny-dom.mjs';

test('Changing a reviewed local path clears the visible trust and registration controls', () => withTinyDom(async body => {
  const requests = [];
  const view = createLocalExtensionView(body, { request: async (path, options) => {
    requests.push({ path, body: options.body });
    return { previewId: 'one', hash: 'a'.repeat(64), files: ['manifest.json', 'index.mjs'], bytes: 100, manifest: { id: 'sample', title: 'Sample', version: '1' } };
  } });
  const node = key => [...body.querySelectorAll('button,input')].find(e => e.getAttribute('data-local-field') === key);
  node('toggle').click();
  node('path').value = '/synthetic/one'; node('path').dispatchEvent({ type: 'input' });
  node('review').click(); await waitFor(() => node('trust'));
  assert.equal(node('register').disabled, true);
  node('trust').checked = true; node('trust').dispatchEvent({ type: 'change' });
  assert.equal(node('register').disabled, false);
  node('path').value = '/synthetic/two'; node('path').dispatchEvent({ type: 'input' });
  assert.equal(node('trust'), undefined); assert.equal(node('register'), undefined);
  assert.equal(body.textContent.includes('Sample'), false);
  assert.deepEqual(requests.map(r => r.path), ['/extensions/preview-local']);
  view.render(); assert.equal(node('path').value, '/synthetic/two');
}));

test('Closing the local extension editor retains focus on its collapsed entry', () => withTinyDom(async body => {
  const mount = document.createElement('div'); body.append(mount);
  const replace = mount.replaceChildren.bind(mount);
  mount.replaceChildren = (...children) => {
    if (mount.contains(document.activeElement)) body.focus();
    replace(...children);
  };
  const view = createLocalExtensionView(mount, { request: async () => { throw new Error('No request expected'); } });
  const toggle = () => mount.querySelector('button');
  toggle().focus(); toggle().click();
  assert.equal(toggle().getAttribute('aria-expanded'), 'true');
  toggle().focus(); toggle().click();
  assert.equal(toggle().getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, toggle());
  view.render();
  assert.equal(document.activeElement, toggle(), 'a collapsed refresh preserves the same focus target');
}));
