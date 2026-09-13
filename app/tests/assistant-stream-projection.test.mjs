import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {mapSessionEvent} from '../runtime/pi-session-runtime.mjs';

function messageUpdate(nativeType, message, extra = {}) {
  return {
    type: 'message_update',
    message,
    assistantMessageEvent: {type: nativeType, contentIndex: 0, partial: message, ...extra},
  };
}

test('only native text updates project as assistant deltas', () => {
  const textBeforeHiddenUpdate = {role: 'assistant', content: [{type: 'text', text: 'Visible reply'}]};
  const withThinking = {
    role: 'assistant',
    content: [
      {type: 'text', text: 'Visible reply'},
      {type: 'thinking', thinking: 'private reasoning'},
    ],
  };
  const withToolCall = {
    role: 'assistant',
    content: [
      {type: 'text', text: 'Visible reply'},
      {type: 'toolCall', id: 'call-1', name: 'ws_write', arguments: {path: 'out.txt'}},
    ],
  };

  assert.equal(mapSessionEvent(messageUpdate('thinking_delta', withThinking, {delta: 'reasoning chunk'})), null);
  assert.equal(mapSessionEvent(messageUpdate('toolcall_delta', withToolCall, {delta: '{"path":'})), null);
  assert.equal(mapSessionEvent(messageUpdate('toolcall_start', withToolCall)), null);

  assert.deepEqual(mapSessionEvent(messageUpdate('text_delta', textBeforeHiddenUpdate, {delta: ' reply'})), {
    type: 'assistant.delta', data: {text: 'Visible reply'},
  });
  assert.deepEqual(mapSessionEvent(messageUpdate('text_end', textBeforeHiddenUpdate, {content: 'Visible reply'})), {
    type: 'assistant.delta', data: {text: 'Visible reply'},
  });
  assert.deepEqual(mapSessionEvent({type: 'message_update', message: textBeforeHiddenUpdate}), {
    type: 'assistant.delta', data: {text: 'Visible reply'},
  }, 'legacy snapshots without a native event keep nonempty visible text');
  assert.equal(mapSessionEvent({type: 'message_update', message: {role: 'assistant', content: []}}), null);

  const toolUseEnd = mapSessionEvent({
    type: 'message_end',
    message: {role: 'assistant', content: withToolCall.content, stopReason: 'toolUse'},
  });
  assert.equal(toolUseEnd.type, 'assistant.message');
  assert.equal(toolUseEnd.data.stopReason, 'toolUse');
  assert.equal(toolUseEnd.data.text, 'Visible reply');
});

test('stream filtering retains final assistant messages and request telemetry', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const created = await h.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'stream-projection',
      input: 'Return a short synthetic reply.',
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const completed = await h.pollRun(created.json.run.id);
    assert.equal(completed.status, 'completed', JSON.stringify(completed.error ?? null));
    assert.equal(h.runtime.fakeProvider.requests.length, 1, 'the offline loopback provider handled the Run');

    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events
      .filter(event => event.runId === completed.id);
    assert.ok(events.some(event => event.type === 'assistant.delta' && event.data.text.length > 0));
    assert.ok(events.some(event => event.type === 'assistant.message' && event.data.stopReason === 'stop'));
    assert.ok(events.some(event => event.type === 'runtime.request.telemetry'));
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, {recursive: true, force: true});
  }
});
