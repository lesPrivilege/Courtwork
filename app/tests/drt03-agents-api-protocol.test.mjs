/**
 * DRT-03 first slice — Agents API Runtime Adapter protocol tests.
 *
 * Offline and credential-free: the native transport is a scripted in-memory
 * fixture. These tests cover protocol/binding creation, event dedup, the
 * completed/failed/cancelled/unknown settlement set, saved-items recovery and
 * cancellation mapping. They do not prove the live service, Work Core
 * acceptance, or any coding capability; see
 * engineering/research/agents-api-first-2026-09-14/adapter-protocol-20260915.md.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENTS_API_PROTOCOL,
  AGENTS_API_TERMINAL_STATUSES,
  capabilityRows,
  createAgentsApiRuntimeAdapter,
  exposureOf,
  settleRun,
} from '../runtime/agents-api-adapter.mjs';
import {
  FIXTURE_SESSION_ID,
  createNativeFixture,
  nativeEvents,
} from './fixtures/agents-api-native.mjs';

async function setup({ pageSize = 2 } = {}) {
  const fixture = createNativeFixture({ pageSize });
  const adapter = createAgentsApiRuntimeAdapter({ transport: fixture.transport });
  const created = await adapter.createSession({
    identity: { sessionId: 'cw-sess-1', runId: 'cw-run-1' },
    agent: { model: 'gpt-6-astra' },
    environment: { type: 'none' },
    input: 'Synthetic task',
    commandId: 'cmd-1',
  });
  return { fixture, adapter, binding: created.binding };
}

function collect() {
  const seen = [];
  return { seen, onObservation: (observation) => { seen.push(observation); } };
}

test('DRT03 protocol: beta wire identity is pinned and every unverified capability stays unavailable', () => {
  assert.equal(AGENTS_API_PROTOCOL.id, 'openai-agents-api');
  assert.equal(AGENTS_API_PROTOCOL.betaHeader, 'agents=v1');
  assert.match(AGENTS_API_PROTOCOL.docsRevision, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(AGENTS_API_PROTOCOL.sdkPin.package, 'openai');
  assert.equal(AGENTS_API_PROTOCOL.sdkPin.version, '7.15.0');
  assert.equal(AGENTS_API_PROTOCOL.sdkPin.namespace, 'beta.agents');
  assert.match(AGENTS_API_PROTOCOL.sdkPin.tarballSha256, /^[0-9a-f]{64}$/);
  assert.equal(AGENTS_API_PROTOCOL.endpoints.createSession, 'POST /v1/agents/sessions');
  assert.equal(AGENTS_API_PROTOCOL.endpoints.listItems, 'GET /v1/agents/sessions/{session_id}/items');

  const rows = capabilityRows();
  assert.ok(rows.length >= 20, 'the capability boundary must be explicit, not implied');
  for (const row of rows) {
    assert.equal(exposureOf(row), 'unavailable', `${row.id} may not be exposed before a live probe`);
  }
  const supported = rows.filter((row) => row.support === 'supported');
  assert.ok(supported.length >= 8, 'the fixture-tested protocol subset must be recorded');
  for (const row of supported) {
    assert.equal(row.verification, 'fixture');
    assert.equal(row.environment, 'none');
    assert.ok(row.documented.length > 0, `${row.id} needs a documented source`);
  }
  for (const id of ['builtin.bash', 'builtin.apply_patch', 'workspace.files', 'executor.mcp', 'artifacts.download']) {
    assert.equal(rows.find((row) => row.id === id).support, 'unsupported', `${id} is unavailable with environment:none`);
  }
  const selfHosted = rows.filter((row) => row.environment === 'self_hosted');
  assert.ok(selfHosted.length >= 4);
  assert.ok(selfHosted.every((row) => row.support === 'unsupported' && row.verification === 'none'),
    'the self-hosted lane stays unavailable in this slice');
  assert.equal(rows.find((row) => row.id === 'approval.per_command').support, 'unsupported',
    'no per-command approval interception may be claimed');

  // Pi parity on the settlement vocabulary the Host already writes.
  assert.deepEqual(AGENTS_API_TERMINAL_STATUSES, ['completed', 'failed', 'cancelled', 'unknown']);
});

test('DRT03 creation: environment:none binds CW identity once and fails closed without touching the transport', async () => {
  const fixture = createNativeFixture();
  const adapter = createAgentsApiRuntimeAdapter({ transport: fixture.transport });
  const identity = { sessionId: 'cw-sess-9', runId: 'cw-run-9' };

  const created = await adapter.createSession({
    identity, agent: { model: 'gpt-6-astra' }, environment: { type: 'none' },
    input: 'Synthetic task', commandId: 'cmd-a',
  });
  assert.deepEqual(created.binding.internal, identity, 'CW identity is carried, not replaced');
  assert.equal(created.binding.native.sessionId, FIXTURE_SESSION_ID);
  assert.equal(created.binding.runtimeId, 'agents-api');
  assert.equal(created.binding.protocol.betaHeader, 'agents=v1');
  const creates = fixture.callsOf('createSession');
  assert.equal(creates.length, 1);
  assert.deepEqual(creates[0].request.environment, { type: 'none' });

  await assert.rejects(adapter.createSession({
    identity, agent: { model: 'gpt-6-astra' }, environment: { type: 'none' },
    input: '   ', commandId: 'cmd-b',
  }), (error) => error.code === 'input_required');
  await assert.rejects(adapter.createSession({
    identity, agent: { model: 'gpt-6-astra' }, environment: { type: 'self_hosted' },
    input: 'task', commandId: 'cmd-c',
  }), (error) => error.code === 'environment_unavailable');
  await assert.rejects(adapter.createSession({
    identity, agent: { model: 'gpt-6-astra' }, environment: { type: 'none' },
    input: 'task', commandId: 'cmd-a',
  }), (error) => error.code === 'duplicate_command', 'command receipt is local Host authority');
  await assert.rejects(adapter.createSession({
    identity: { sessionId: 'cw-sess-9' }, agent: { model: 'gpt-6-astra' },
    environment: { type: 'none' }, input: 'task', commandId: 'cmd-d',
  }), (error) => error.code === 'identity_required');
  assert.equal(fixture.callsOf('createSession').length, 1, 'local rejections never reach the native transport');
});

test('DRT03 events: duplicates collapse by event id and diagnostics never settle', async () => {
  const { fixture, adapter, binding } = await setup();
  const { seen, onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.outputDelta({ eventId: 'evt_1', itemId: 'msg_1', text: 'Hello ' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.outputDelta({ eventId: 'evt_1', itemId: 'msg_1', text: 'Hello ' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.unknownType({ eventId: 'evt_2' }));
  await fixture.emit(FIXTURE_SESSION_ID, { ...events.idle({ eventId: 'evt_3' }), event_id: undefined });

  assert.equal(seen.filter((observation) => observation.kind === 'assistant.delta').length, 1,
    'a repeated event id is one observation');
  assert.equal(seen.filter((observation) => observation.kind === 'native.unknown'
    && observation.data.reason === 'unknown_event').length, 1);
  assert.equal(seen.filter((observation) => observation.kind === 'native.unknown'
    && observation.data.reason === 'missing_event_id').length, 1,
  'an event without identity must not be merged by position');
  assert.equal(adapter.settle(binding, {}), null, 'an unknown type and idle are not terminal states');

  subscription.stop();
  await subscription.done;
});

test('DRT03 settlement: root turn.completed settles completed; idle and subagent turns do not', async () => {
  const { fixture, adapter, binding } = await setup();
  const { seen, onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.outputDelta({ eventId: 'e1', itemId: 'msg_1', text: 'Acme competes ' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.outputDone({ eventId: 'e2', itemId: 'msg_1', text: 'Acme competes on price.' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.idle({ eventId: 'e3' }));
  assert.equal(adapter.settle(binding, {}), null, 'idle alone does not establish success');

  await fixture.emit(FIXTURE_SESSION_ID, events.turnCompleted({ eventId: 'e4', turnId: 'turn_1', subagentId: 'sub_1' }));
  assert.equal(adapter.settle(binding, {}), null, 'a child turn terminal does not settle the root Run');

  await fixture.emit(FIXTURE_SESSION_ID, events.turnCompleted({ eventId: 'e5', turnId: 'turn_1' }));
  assert.deepEqual(adapter.settle(binding, {}), {
    status: 'completed', source: 'native-terminal', reason: 'native_turn_completed', turnId: 'turn_1',
  });
  const message = seen.find((observation) => observation.kind === 'assistant.message');
  assert.equal(message.data.text, 'Acme competes on price.', 'done text replaces the streamed buffer');
  assert.ok(seen.some((observation) => observation.kind === 'run.notice'
    && observation.data.notice === 'subagent_turn_completed'));

  subscription.stop();
  await subscription.done;
});

test('DRT03 settlement: root turn.failed keeps a bounded error and is not masked by text', async () => {
  const { fixture, adapter, binding } = await setup();
  const { onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.outputDone({ eventId: 'f1', itemId: 'msg_1', text: 'partial prose' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.turnFailed({
    eventId: 'f2', code: 'server_error', message: 'x'.repeat(900),
  }));
  const decision = adapter.settle(binding, {});
  assert.equal(decision.status, 'failed');
  assert.equal(decision.source, 'native-terminal');
  assert.equal(decision.reason, 'native_turn_failed');
  assert.equal(decision.error.code, 'server_error');
  assert.ok(decision.error.message.length <= 501, 'error text stays bounded');
  assert.ok(decision.error.message.endsWith('…'));

  subscription.stop();
  await subscription.done;
});

test('DRT03 cancel: input.cancel is intent only; only turn.cancelled confirms it', async () => {
  const { fixture, adapter, binding } = await setup();
  const { onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.outputDelta({ eventId: 'c1', itemId: 'msg_1', text: 'working' }));
  const receipt = await adapter.cancelTurn(binding);
  assert.deepEqual(receipt, { intent: 'sent' });
  assert.deepEqual(fixture.callsOf('sendEvents').at(-1).events, [{ type: 'agent.session.input.cancel' }],
    'cancellation is exactly the documented input event');
  assert.equal(adapter.settle(binding, { cancelRequested: true }), null,
    'a submitted intent is not a terminal state');

  await fixture.emit(FIXTURE_SESSION_ID, events.turnCancelled({ eventId: 'c2' }));
  assert.equal(adapter.settle(binding, { cancelRequested: true }).status, 'cancelled');
  assert.equal(adapter.settle(binding, { cancelRequested: true }).reason, 'native_turn_cancelled');

  subscription.stop();
  await subscription.done;
});

test('DRT03 cancel: closing the stream is never a cancellation', async () => {
  const { fixture, adapter, binding } = await setup();
  const { onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.outputDelta({ eventId: 'u1', itemId: 'msg_1', text: 'working' }));
  subscription.stop();
  await subscription.done;

  assert.deepEqual(adapter.settle(binding, {}), {
    status: 'unknown', source: 'transport', reason: 'stream_closed_before_terminal',
  });
  await adapter.cancelTurn(binding);
  assert.equal(adapter.settle(binding, { cancelRequested: true }).status, 'unknown');
  assert.equal(adapter.settle(binding, { cancelRequested: true }).reason, 'cancellation_unconfirmed',
    'an unconfirmed stop stays unknown, not cancelled');
});

test('DRT03 settlement: unreconciled effects and session failure keep ambiguity unknown', async () => {
  const { fixture, adapter, binding } = await setup();
  const { onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.requiresAction({
    eventId: 'p1', calls: [{ turnId: 'turn_1', callId: 'call_1', name: 'get_source', arguments: { id: 'src_1' } }],
  }));
  await fixture.emit(FIXTURE_SESSION_ID, events.turnCompleted({ eventId: 'p2' }));
  assert.equal(adapter.settle(binding, {}).status, 'unknown',
    'a pending function call keeps even a completed turn ambiguous');
  assert.equal(adapter.settle(binding, {}).reason, 'effects_unreconciled');
  assert.equal(adapter.settle(binding, { effectsUnknown: true }).status, 'unknown');

  await adapter.submitToolResult(binding, { turnId: 'turn_1', callId: 'call_1', success: true, output: '{"version":"v3"}' });
  assert.equal(adapter.settle(binding, {}).status, 'completed', 'a durable result receipt closes the ambiguity');

  subscription.stop();
  await subscription.done;
});

test('DRT03 settlement: an unreconciled session failure cannot be reported as a plain failure', async () => {
  const { fixture, adapter, binding } = await setup();
  const { onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });

  await fixture.emit(FIXTURE_SESSION_ID, nativeEvents().requiresAction({
    eventId: 's1', calls: [{ turnId: 'turn_1', callId: 'call_1', name: 'get_source', arguments: {} }],
  }));
  await fixture.emit(FIXTURE_SESSION_ID, nativeEvents().sessionFailed({ eventId: 's2', code: 'server_error' }));
  assert.equal(adapter.settle(binding, {}).status, 'unknown');
  assert.equal(adapter.settle(binding, {}).reason, 'session_failed_effects_unverified');

  subscription.stop();
  await subscription.done;
});

test('DRT03 functions: pending actions are observations and results echo turn_id and call_id', async () => {
  const { fixture, adapter, binding } = await setup();
  const { seen, onObservation } = collect();
  const subscription = adapter.observe(binding, { onObservation });
  const events = nativeEvents();

  await fixture.emit(FIXTURE_SESSION_ID, events.requiresAction({
    eventId: 'a1',
    calls: [{ turnId: 'turn_7', callId: 'call_7', name: 'get_source', arguments: { id: 'src_7' } }],
    environmentConnections: ['env_7'],
  }));
  const pending = seen.find((observation) => observation.kind === 'runtime.function_call.pending');
  assert.deepEqual(pending.data.calls, [{ turnId: 'turn_7', callId: 'call_7', name: 'get_source', arguments: { id: 'src_7' } }]);
  assert.deepEqual(pending.data.environmentConnections, ['env_7']);
  assert.equal(fixture.callsOf('sendEvents').length, 0, 'the adapter never auto-executes a function');

  await adapter.submitToolResult(binding, { turnId: 'turn_7', callId: 'call_7', success: true, output: 'v3' });
  assert.deepEqual(fixture.callsOf('sendEvents').at(-1).events, [{
    type: 'agent.session.input.tool_result', turn_id: 'turn_7', call_id: 'call_7', success: true, output: 'v3',
  }]);

  await adapter.submitToolResult(binding, { turnId: 'turn_7', callId: 'call_8', success: false, error: 'denied by policy' });
  assert.deepEqual(fixture.callsOf('sendEvents').at(-1).events, [{
    type: 'agent.session.input.tool_result', turn_id: 'turn_7', call_id: 'call_8', success: false, error: 'denied by policy',
  }]);

  subscription.stop();
  await subscription.done;
});

test('DRT03 settlement: the replay helper applies the same rules as the live tracker', () => {
  const terminal = {
    kind: 'run.settlement',
    native: { eventId: 'z1', sessionId: FIXTURE_SESSION_ID, turnId: 'turn_1', itemId: null, subagentId: null },
    data: { candidate: 'failed', source: 'native-terminal', reason: 'native_turn_failed', error: { code: 'server_error', message: 'boom' } },
  };
  assert.equal(settleRun({ observations: [terminal], conditions: { cancelRequested: true }, streamEnded: true }).status, 'failed',
    'native terminal evidence outranks a pending cancel intent');
  assert.equal(settleRun({ observations: [terminal], conditions: { effectsUnknown: true } }).reason, 'effects_unreconciled');
  assert.deepEqual(settleRun({ streamEnded: true }), { status: 'unknown', source: 'transport', reason: 'stream_closed_before_terminal' });
  assert.equal(settleRun({}), null);
});

test('DRT03 recovery: saved items page by after cursor and merge by item id without fabricating gaps', async () => {
  const { fixture, adapter, binding } = await setup({ pageSize: 2 });
  fixture.setItems(FIXTURE_SESSION_ID, [
    { id: 'msg_1', type: 'message', role: 'assistant', status: 'completed', turn_id: 'turn_0',
      content: [{ type: 'output_text', text: 'Finished text' }] },
    { id: 'msg_2', type: 'message', role: 'assistant', status: 'in_progress', turn_id: 'turn_1',
      content: [{ type: 'output_text', text: 'Partial ' }] },
    { id: null, type: 'message', role: 'user', status: 'completed', turn_id: 'turn_1',
      content: [{ type: 'input_text', text: 'task' }] },
  ]);
  fixture.patchSession(FIXTURE_SESSION_ID, {
    required_actions: [{ type: 'function_call', turn_id: 'turn_1', call_id: 'call_9', name: 'get_source', arguments: {} }],
  });
  const { seen, onObservation } = collect();
  const events = nativeEvents();

  const recoveryPromise = adapter.reconcile(binding, { onObservation, disconnected: true });
  // The stream stays connected during recovery; these arrive while buffering.
  await fixture.emit(FIXTURE_SESSION_ID, events.outputDone({ eventId: 'b1', itemId: 'msg_1', text: 'stale rewrite' }));
  await fixture.emit(FIXTURE_SESSION_ID, events.outputDone({ eventId: 'b2', itemId: 'msg_2', text: 'Partial done' }));
  const recovery = await recoveryPromise;

  const streamIndex = fixture.calls.findIndex((call) => call.op === 'streamEvents');
  const itemIndex = fixture.calls.findIndex((call) => call.op === 'listItems');
  assert.ok(streamIndex >= 0 && streamIndex < itemIndex, 'the new stream opens before saved items are retrieved');
  const itemCalls = fixture.callsOf('listItems');
  assert.equal(itemCalls.length, 2, 'pagination follows has_more');
  assert.equal(itemCalls[0].params.order, 'asc');
  assert.equal(itemCalls[1].params.after, 'msg_2', 'the after cursor is the previous page last_id');

  assert.equal(recovery.malformed, 1, 'an item without an id cannot be keyed and is never invented');
  assert.equal(recovery.discarded, 1, 'a buffered update for a final item is discarded');
  assert.equal(recovery.applied, 1);
  assert.equal(recovery.items.find((item) => item.id === 'msg_1').text, 'Finished text',
    'final history is not overwritten by a buffered rewrite');
  assert.equal(recovery.items.find((item) => item.id === 'msg_2').text, 'Partial done');
  assert.deepEqual(recovery.pendingActions, [
    { type: 'function_call', turn_id: 'turn_1', call_id: 'call_9', name: 'get_source', arguments: {} },
  ]);
  assert.deepEqual(recovery.gap, { reason: 'stream_not_replayed', missedIntermediateEvents: true });
  assert.ok(seen.some((observation) => observation.kind === 'coverage.gap'),
    'missed intermediate events stay an explicit gap, not a reconstructed trace');
  assert.equal(seen.filter((observation) => observation.kind === 'assistant.message').length, 1);

  // Resume live: a redelivery of the merged event is dropped; a terminal settles.
  await fixture.emit(FIXTURE_SESSION_ID, events.outputDone({ eventId: 'b2', itemId: 'msg_2', text: 'Partial done' }));
  assert.equal(seen.filter((observation) => observation.kind === 'assistant.message').length, 1);
  await fixture.emit(FIXTURE_SESSION_ID, events.turnCompleted({ eventId: 'b3' }));
  assert.equal(adapter.settle(binding, {}).status, 'completed');

  fixture.closeStream(FIXTURE_SESSION_ID);
});
