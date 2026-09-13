import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRunActivity, projectRunProcess, createRunActivity, THINKING_PHRASES } from '../web/run-activity.mjs';
import { projectContextReading, renderChatMeasurementBody, contextRing } from '../web/chat-measurements.mjs';
import { withTinyDom } from './tiny-dom.mjs';

const run = status => ({ id: 'run-a', sessionId: 'session-a', status });
test('activity stops on wait, disconnect and terminal state without inventing cancellation acceptance', () => {
  assert.equal(projectRunActivity({ run: run('running') }).moving, true);
  for (const status of ['created', 'waiting_user', 'stopping', 'completed', 'cancelled', 'failed', 'future-status'])
    assert.equal(projectRunActivity({ run: run(status) }).moving, false, status);
  const pending = projectRunActivity({ run: run('running'), pendingCancel: true });
  assert.equal(pending.moving, false); assert.equal(pending.label, 'Working');
  assert.equal(projectRunActivity({ run: run('running'), connected: false }).label, 'Connection lost');
  assert.equal(projectRunActivity({ run: run('running'), visible: false }).visible, false);
  assert.equal(projectRunActivity({}).visible, false);
});

test('word clock survives polling, announces facts once, and stale callbacks cannot revive old work', async () => withTinyDom(() => {
  let time = 0, id = 0;
  const scheduled = new Map();
  const media = { matches: false };
  const view = createRunActivity({ now: () => time, schedule: fn => { scheduled.set(++id, fn); return id; }, cancel: key => scheduled.delete(key), media });
  const facts = { run: run('running') };
  view.update(facts);
  assert.equal(view.root.querySelector('.run-activity-phrase').textContent, 'Working…');
  time = 2000; view.update(facts);
  const pending = [...scheduled.values()].at(-1);
  time = 3500; pending();
  assert.equal(view.root.querySelector('.run-activity-phrase').textContent, 'Thinking…');
  assert.equal(view.root.querySelector('[role="status"]').textContent, 'Working');
  const stale = [...scheduled.values()].at(-1);
  view.update({ run: run('waiting_user') }); stale();
  assert.equal(view.root.querySelector('.run-activity-phrase').textContent, 'Waiting for you');
  assert.equal(scheduled.size, 0);
  view.update(facts); media.matches = true; view.update(facts);
  assert.equal(view.root.querySelector('.run-activity-phrase').textContent, 'Working…');
  assert.equal(scheduled.size, 0);
  media.matches = false;
  const root = document.documentElement;
  document.documentElement = document.createElement('html');
  document.documentElement.setAttribute('data-motion', 'reduce'); view.update(facts);
  assert.equal(scheduled.size, 0);
  assert.equal(view.root.classList.contains('is-moving'), false);
  document.documentElement = root; view.update(facts);
  const beforeClose = [...scheduled.values()].at(-1); view.deactivate(); beforeClose();
  assert.equal(view.root.hidden, true); assert.equal(scheduled.size, 0);
  view.destroy();
}));

test('Attention can subtract measurement actions without removing the status fact', async () => withTinyDom(() => {
  const view = createRunActivity({ media: { matches: true } });
  view.update({ run: run('running') });
  assert.equal(view.root.querySelectorAll('button').length, 0);
  assert.doesNotMatch(view.root.textContent, /Unavailable|tok\/s/);
  assert.deepEqual(THINKING_PHRASES, ['Thinking', 'Pondering', 'Musing', 'Considering', 'Reflecting']);
  view.destroy();
}));

test('process phrases follow exact tool/notice lifecycles and never turn prose into a progress claim', () => {
  const active = run('running');
  const event = (type, data, extra = {}) => ({ type, data, runId: active.id, sessionId: active.sessionId, ...extra });
  const events = [event('assistant.message', { text: 'Adding targeted tests' })];
  assert.equal(projectRunProcess(events, active), 'working');
  events.push(event('tool.start', { callId: 'call-a', name: 'ws_read' }));
  assert.equal(projectRunProcess(events, active), 'reading');
  events.push(event('tool.result', { callId: 'call-a' }, { runId: 'other' }));
  assert.equal(projectRunProcess(events, active), 'reading');
  events.push(event('tool.start', { callId: 'call-b', name: 'ws_write' }));
  assert.equal(projectRunProcess(events, active), 'tools');
  events.push(event('tool.result', { callId: 'call-a' }));
  assert.equal(projectRunProcess(events, active), 'writing');
  events.push(event('tool.result', { callId: 'call-b', isError: true }));
  assert.equal(projectRunProcess(events, active), 'working');
  events.push(event('assistant.delta', { text: 'The result is' }));
  assert.equal(projectRunProcess(events, active), 'response');
  events.push(event('run.notice', { kind: 'compaction_start' }));
  assert.equal(projectRunProcess(events, active), 'compaction');
  events.push(event('run.notice', { kind: 'compaction_end' }));
  assert.equal(projectRunProcess(events, active), 'working');
  assert.equal(projectRunActivity({ run: run('waiting_user'), events }).label, 'Waiting for you');
  assert.equal(projectRunActivity({ run: run('failed'), events }).moving, false);
});

function measurement(requestId, extra = {}) {
  return { schemaVersion: 1, requestId, source: 'host-semantic-stream', startedAt: '2026-09-13T08:00:00Z',
    requestedModel: { provider: 'test', model: 'test', api: 'test' }, requestedEffort: null, effectiveEffort: null,
    phase: 'completed', purpose: 'agent', elapsedMs: 1200, firstOutputMs: 200, firstTextMs: 500,
    providerTtftMs: null, decodeTokensPerSecond: null, missing: ['provider_token_timing', 'token_deltas'],
    contextWindow: 1000000, context: { method: 'serialized-request-utf16-chars-divided-by-4', exact: false, characters: 400, estimatedTokens: 100 }, ...extra };
}
test('Context reads the selected Run only, preserves missing and zero, and never computes capacity usage', async () => withTinyDom(() => {
  const events = [
    { type: 'runtime.request.telemetry', runId: 'a', data: measurement(1) },
    { type: 'runtime.request.telemetry', runId: 'b', data: measurement(2, { context: null }) },
  ];
  assert.equal(projectContextReading(events).estimate, null);
  assert.equal(projectContextReading(events, 'b').estimate, null);
  assert.equal(projectContextReading(events, 'a').estimate, 100);
  const ring = contextRing();
  assert.equal(ring.querySelectorAll('circle').length, 1);
  assert.equal(ring.querySelector('[stroke-dasharray]'), null);
  assert.equal(ring.getAttribute('role'), null);
  const create = document.createElement.bind(document);
  document.createElement = tag => Object.assign(create(tag), { style: {} });
  const body = renderChatMeasurementBody('context', { events, run: { id: 'a' } });
  assert.match(body.textContent, /~100 tokens/);
  assert.match(body.textContent, /not remaining model capacity/);
  assert.doesNotMatch(body.textContent, /0\.01%|52%/);
  const zero = [{ type: 'runtime.request.telemetry', runId: 'a', data: measurement(3, { context: {
    method: 'serialized-request-utf16-chars-divided-by-4', exact: false, characters: 0, estimatedTokens: 0 } }) }];
  assert.equal(projectContextReading(zero, 'a').estimate, 0);
  assert.match(renderChatMeasurementBody('context', { events: zero, run: { id: 'a' } }).textContent, /~0 tokens/);
}));
