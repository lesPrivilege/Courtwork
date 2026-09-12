import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileView } from '../web/inspector.mjs';
import { withTinyDom } from './tiny-dom.mjs';

const target = (path, sha256) => ({
  kind: 'content-version',
  sessionId: 'session-1',
  runId: 'run-1',
  path,
  sha256,
});

test('file quotes work on initial and cached views, while replaced targets invalidate old buttons', async () =>
  withTinyDom(async container => {
    const quotes = [];
    const request = async url => {
      const query = new URL(url, 'http://courtwork.test').searchParams;
      return {
        kind: 'content-version',
        sessionId: 'session-1',
        runId: query.get('runId'),
        path: query.get('path'),
        sha256: query.get('sha256'),
        bytes: 16,
        text: `Contents of ${query.get('path')}`,
        truncated: false,
      };
    };
    const view = createFileView(container, {
      request,
      onQuote: quote => quotes.push(quote),
    });
    const first = target('out/first.txt', 'a'.repeat(64));

    await view.load(first);
    const initialButton = container.querySelector('button.text-button');
    assert.ok(initialButton);
    initialButton.click();
    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].ref.path, first.path);
    assert.equal(quotes[0].text, 'Contents of out/first.txt');

    view.pause();
    await view.load({ ...first });
    assert.equal(container.querySelector('button.text-button'), initialButton);
    initialButton.click();
    assert.equal(quotes.length, 2, 'a pause followed by a same-target cache hit stays actionable');

    const second = target('out/second.txt', 'b'.repeat(64));
    await view.load(second);
    const secondButton = container.querySelector('button.text-button');
    assert.ok(secondButton);
    assert.notEqual(secondButton, initialButton);
    initialButton.click();
    assert.equal(quotes.length, 2, 'a detached button cannot quote a superseded target');
    secondButton.click();
    assert.equal(quotes.length, 3);
    assert.equal(quotes[2].ref.path, second.path);
    view.dispose();
  })
);
