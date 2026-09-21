/**
 * P03-C transport increment — the production SDK transport under the real
 * protocol adapter, against a synthetic loopback HTTP endpoint.
 *
 * The official SDK is not mocked: requests cross real sockets and the
 * assertions are about what reached the wire and how many times. Synthetic
 * credential, no ambient key, no live service. Nothing here shows account
 * access, service behaviour, a durable Host receipt, or restart recovery.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { capabilityRows, createAgentsApiRuntimeAdapter, exposureOf } from '../runtime/agents-api-adapter.mjs';
import { AGENTS_TRANSPORT_REQUEST_IDENTITY, AgentsTransportError, createOpenAiAgentsTransport } from '../runtime/openai-agents-transport.mjs';
import { nativeEvents } from './fixtures/agents-api-native.mjs';
import { createWireFixture, sseFrame } from './fixtures/agents-api-wire.mjs';

const SESSION = 'agsess_wire_1';
const KEY = 'sk-synthetic-transport-fixture';
const native = (overrides = {}) => ({ id: SESSION, object: 'agent.session', status: 'running', required_actions: [], ...overrides });
const identity = { sessionId: 'cw-sess-1', runId: 'cw-run-1' };
const creation = { identity, agent: { model: 'gpt-synthetic', instructions: 'Read only.' }, environment: { type: 'none' }, input: 'Summarize the source.', commandId: 'cw-cmd-create-1' };

async function harness(options = {}) {
  const wire = await createWireFixture();
  const transport = createOpenAiAgentsTransport({ apiKey: KEY, baseURL: wire.baseURL, ...options });
  const adapter = createAgentsApiRuntimeAdapter({ transport });
  return { wire, transport, adapter };
}

const timers = () => process.getActiveResourcesInfo().filter(name => name === 'Timeout').length;
const posts = (wire) => wire.attempts.filter(attempt => attempt.method === 'POST');

test('create, later input, cancel intent and function result reach the wire exactly as the caller identified them', async () => {
  const ambient = { OPENAI_API_KEY: 'sk-ambient', OPENAI_BASE_URL: 'http://ambient.invalid/v1', OPENAI_ORG_ID: 'org-ambient', OPENAI_PROJECT_ID: 'proj-ambient',
    // Names the wire legitimately carries, with ambient values (P03C-R1), plus one it does not.
    OPENAI_CUSTOM_HEADERS: ['Authorization: Bearer sk-ambient-header', 'User-Agent: ambient-agent', 'Idempotency-Key: ambient-key', 'Accept: text/ambient',
      'OpenAI-Beta: ambient=v0', 'Content-Type: text/ambient', 'X-Ambient: leaked'].join('\n') };
  const before = Object.fromEntries(Object.keys(ambient).map(name => [name, process.env[name]]));
  Object.assign(process.env, ambient);
  const { wire, adapter } = await harness();
  try {
    const events = nativeEvents(SESSION);
    wire.respond((attempt, { res }) => {
      if (attempt.method === 'GET') return wire.sse(res, [sseFrame(events.requiresAction({ eventId: 'evt_1', calls: [{ turnId: 'turn_wire_1', callId: 'call_wire_1', name: 'repo_read', arguments: { path: 'README.md' } }] }))]);
      return attempt.path.endsWith('/events') ? { status: 204, headers: {}, body: '' } : wire.json(200, native());
    });

    const { binding, native: created } = await adapter.createSession(creation);
    assert.equal(binding.native.sessionId, SESSION);
    assert.equal(created.id, SESSION);

    const pending = [];
    await adapter.observe(binding, { onObservation: observation => { if (observation.kind === 'runtime.function_call.pending') pending.push(observation); } }).done;
    assert.equal(pending.length, 1);
    const [call] = pending[0].data.calls;

    await adapter.submitInput(binding, { text: 'Also list the tests.', requestId: 'cw-cmd-input-2' });
    await adapter.cancelTurn(binding, { requestId: 'cw-cmd-cancel-3' });
    const cleared = await adapter.submitToolResult(binding, { turnId: call.turnId, callId: call.callId, success: true, output: '# Readme', requestId: 'cw-effect-result-4' });
    assert.deepEqual([call.turnId, call.callId], ['turn_wire_1', 'call_wire_1'], 'the result names the ids the service issued');
    assert.deepEqual(cleared, { clearedPendingCall: true });

    const captured = wire.attempts.map(wire.wire);
    const headers = (extra = {}) => ({ accept: 'application/json', authorization: 'Bearer <synthetic>', 'content-type': 'application/json', 'openai-beta': 'agents=v1', 'user-agent': captured[0].headers['user-agent'], ...extra });
    const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
    const eventsPost = (requestId, event) => ({ method: 'POST', path: `/v1/agents/sessions/${SESSION}/events`,
      headers: sorted(headers({ accept: '*/*', 'idempotency-key': requestId })), body: { events: [event] } });
    assert.match(captured[0].headers['user-agent'], /^OpenAI\/JS 7\.15\.0$/);
    assert.deepEqual(captured, [
      { method: 'POST', path: '/v1/agents/sessions', headers: sorted(headers()),
        body: { environment: { type: 'none' }, input: 'Summarize the source.', stream: false, agent: { model: 'gpt-synthetic', instructions: 'Read only.' } } },
      { method: 'GET', path: `/v1/agents/sessions/${SESSION}/events`, headers: sorted((({ 'content-type': _drop, ...rest }) => rest)(headers({ accept: 'text/event-stream' }))), body: null },
      eventsPost('cw-cmd-input-2', { type: 'agent.session.input.message', input: [{ role: 'user', content: [{ type: 'input_text', text: 'Also list the tests.' }] }] }),
      eventsPost('cw-cmd-cancel-3', { type: 'agent.session.input.cancel' }),
      eventsPost('cw-effect-result-4', { type: 'agent.session.input.tool_result', turn_id: 'turn_wire_1', call_id: 'call_wire_1', success: true, output: '# Readme' }),
    ]);
    assert.ok(wire.attempts.every(attempt => attempt.headers.authorization === `Bearer ${KEY}`), 'only the supplied credential is used');
    assert.ok(!JSON.stringify(wire.attempts).includes('mbient'), 'no ambient key, base URL, organization, project or custom header reaches the wire');
    assert.deepEqual(AGENTS_TRANSPORT_REQUEST_IDENTITY.create, { wire: null, guarantee: 'none' });

    // Overlapping operations each keep the identity their caller gave them.
    const sent = wire.attempts.length;
    const release = [];
    wire.respond(() => new Promise(resolve => { release.push(() => resolve({ status: 202, headers: {}, body: '' })); }));
    const overlapping = ['cw-cmd-a', 'cw-cmd-b', 'cw-cmd-c'].map(requestId => adapter.submitInput(binding, { text: `text for ${requestId}`, requestId }));
    while (release.length < 3) await delay(5);
    release.reverse().forEach(answer => answer());
    await Promise.all(overlapping);
    assert.deepEqual(wire.attempts.slice(sent).map(attempt => [attempt.headers['idempotency-key'], attempt.body.events[0].input[0].content[0].text]).sort(),
      [['cw-cmd-a', 'text for cw-cmd-a'], ['cw-cmd-b', 'text for cw-cmd-b'], ['cw-cmd-c', 'text for cw-cmd-c']]);
    assert.ok(!JSON.stringify(wire.attempts).includes('mbient'), 'still nothing ambient, on any of the eight requests');
    if (process.env.AGENTS_WIRE_CAPTURE) await writeFile(process.env.AGENTS_WIRE_CAPTURE, `${JSON.stringify(captured, null, 2)}\n`);
  } finally {
    for (const [name, value] of Object.entries(before)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    await wire.close();
  }
});

test('a request the caller did not identify, or identified wrongly, is refused before the wire', async () => {
  const { wire, transport, adapter } = await harness();
  try {
    wire.respond(() => wire.json(200, native()));
    const { binding } = await adapter.createSession(creation);
    const sent = wire.attempts.length;
    const refused = { name: 'AgentsTransportError', code: 'invalid_request', delivery: 'not_sent' };

    await assert.rejects(adapter.submitInput(binding, { text: 'no identity' }), refused);
    await assert.rejects(adapter.cancelTurn(binding), refused);
    await assert.rejects(adapter.submitInput(binding, { text: 'x', requestId: 'bad\nkey' }), refused);
    await assert.rejects(adapter.submitInput(binding, { text: 'x', requestId: '' }), { code: 'request_id_invalid' });
    await assert.rejects(adapter.submitToolResult(binding, { callId: 'call_1', success: true, output: 'x', requestId: 'r' }), { code: 'turn_required' });
    await assert.rejects(adapter.submitToolResult(binding, { turnId: 'turn_1', success: true, output: 'x', requestId: 'r' }), { code: 'call_required' });
    await assert.rejects(transport.sendEvents('../sessions', [{ type: 'agent.session.input.cancel' }], { requestId: 'r' }), refused);
    await assert.rejects(transport.sendEvents(SESSION, [{ type: 'agent.session.delete' }], { requestId: 'r' }), refused);
    await assert.rejects(transport.sendEvents(SESSION, [], { requestId: 'r' }), refused);
    await assert.rejects(transport.createSession({ agent: { model: 'm' }, environment: { type: 'hosted' }, input: 'x' }), refused);
    await assert.rejects(transport.createSession({ agent: {}, environment: { type: 'none' }, input: 'x' }), refused);
    await assert.rejects(transport.createSession({ agent: { model: 'm' }, environment: { type: 'none' }, input: ' ' }), refused);
    assert.throws(() => transport.streamEvents(''), refused);
    assert.equal(wire.attempts.length, sent, 'nothing was sent and nothing was rewritten into a valid request');

    assert.throws(() => createOpenAiAgentsTransport({ baseURL: wire.baseURL }), TypeError, 'no credential is discovered');
    assert.throws(() => createOpenAiAgentsTransport({ apiKey: KEY }), TypeError, 'no endpoint is assumed');
  } finally {
    await wire.close();
  }
});

test('fragmented frames, done without deltas and a normal end keep every outcome distinct', async () => {
  const { wire, adapter } = await harness();
  try {
    const events = nativeEvents(SESSION);
    const scripts = {
      root: [events.outputDelta({ eventId: 'e1', itemId: 'item_1', text: 'Hel' }), events.outputDelta({ eventId: 'e2', itemId: 'item_1', text: 'lo' }),
        events.outputDone({ eventId: 'e3', itemId: 'item_1', text: 'Hello' }), events.outputDone({ eventId: 'e4', itemId: 'item_2', text: 'No deltas came first.' }),
        events.outputDone({ eventId: 'e3', itemId: 'item_1', text: 'Hello' }), events.turnCompleted({ eventId: 'e5' }), events.idle({ eventId: 'e6' })],
      child: [events.turnCompleted({ eventId: 'c1', turnId: 'turn_child', subagentId: 'subagent_1' }), events.idle({ eventId: 'c2' })],
      idle: [events.idle({ eventId: 'i1' })],
      closed: [events.outputDelta({ eventId: 'x1', itemId: 'item_9', text: 'partial' })],
    };
    let current;
    wire.respond((attempt, { res }) => {
      if (attempt.method !== 'GET') return wire.json(200, native({ id: `${SESSION}_${current}` }));
      const bytes = scripts[current].map(sseFrame).join('');
      // Split mid-line, mid-JSON and across the blank line that ends a frame.
      const chunks = []; for (let at = 0; at < bytes.length; at += 37) chunks.push(bytes.slice(at, at + 37));
      return wire.sse(res, chunks);
    });

    const outcome = {};
    for (current of Object.keys(scripts)) {
      const { binding } = await adapter.createSession({ ...creation, commandId: `cmd-${current}` });
      const seen = [];
      await adapter.observe(binding, { onObservation: observation => { seen.push(observation); } }).done;
      outcome[current] = { seen, decision: adapter.settle(binding, {}) };
    }

    const texts = outcome.root.seen.filter(observation => observation.kind === 'assistant.message').map(observation => [observation.native.itemId, observation.data.text]);
    assert.deepEqual(texts, [['item_1', 'Hello'], ['item_2', 'No deltas came first.']], 'the SDK reassembled every frame; the adapter kept its own dedup and text-done rule');
    assert.deepEqual(outcome.root.seen.filter(observation => observation.kind === 'assistant.delta').map(observation => observation.data.text), ['Hel', 'lo']);
    assert.equal(outcome.root.decision.status, 'completed');
    assert.equal(outcome.root.decision.source, 'native-terminal');
    for (const name of ['child', 'idle', 'closed']) {
      assert.equal(outcome[name].decision.status, 'unknown', `${name}: not a completion`);
      assert.equal(outcome[name].decision.reason, 'stream_closed_before_terminal');
    }
    assert.equal(wire.inFlight(), 0);
  } finally {
    await wire.close();
  }
});

test('abort and disposal release the connection and send nothing to the service', async () => {
  const { wire, transport, adapter } = await harness();
  try {
    const events = nativeEvents(SESSION);
    let mode = 'never-answers';
    let streamOpened;
    wire.respond((attempt, { res }) => {
      if (attempt.method !== 'GET') return wire.json(200, native());
      streamOpened?.();
      if (mode === 'never-answers') return { handled: true };
      if (mode === 'holds-open') return wire.sse(res, [sseFrame(events.outputDelta({ eventId: 'h1', itemId: 'item_1', text: 'first' }))], { hold: true });
      return wire.sse(res, [sseFrame(events.turnCompleted({ eventId: 'd1' }))]);
    });
    const { binding } = await adapter.createSession(creation);
    const baseline = timers();
    const opened = () => new Promise(resolve => { streamOpened = resolve; });

    // Before response headers.
    let waiting = opened();
    let subscription = adapter.observe(binding, {});
    await waiting;
    assert.equal(wire.inFlight(), 1);
    subscription.stop();
    subscription.stop();
    await subscription.done;
    assert.equal(adapter.settle(binding, {}).reason, 'stream_closed_before_terminal', 'releasing a stream settles nothing');

    // While reading.
    mode = 'holds-open';
    const seen = [];
    waiting = opened();
    subscription = adapter.observe(binding, { onObservation: observation => { seen.push(observation.kind); subscription.stop(); } });
    await waiting;
    await subscription.done;
    assert.equal(seen.length, 1);

    // After completion, twice, and through a bare iterator that is abandoned.
    mode = 'completes';
    subscription = adapter.observe(binding, {});
    await subscription.done;
    subscription.stop();
    subscription.stop();
    const handle = transport.streamEvents(SESSION);
    for await (const event of handle.events) { assert.equal(event.event_id, 'd1'); break; }
    handle.abort();
    const unread = transport.streamEvents(SESSION);
    unread.abort();
    assert.deepEqual(await unread.events.next(), { value: undefined, done: true }, 'an iterator aborted before use opens nothing');

    adapter.close(binding);
    for (let i = 0; i < 50 && (wire.inFlight() || timers() > baseline); i += 1) await delay(10);
    assert.equal(wire.inFlight(), 0, 'no request survives');
    assert.ok(timers() <= baseline, 'no SDK timeout timer survives');
    assert.deepEqual(wire.attempts.filter(attempt => attempt.method !== 'GET').map(attempt => `${attempt.method} ${attempt.path}`), ['POST /v1/agents/sessions'],
      'no cancel, delete or replacement create was caused by releasing a stream');
  } finally {
    await wire.close();
  }
});

test('item pages keep the service cursors, and unusable answers are errors rather than empty results', async () => {
  const { wire, transport, adapter } = await harness();
  try {
    const item = (id, text) => ({ id, type: 'message', role: 'assistant', status: 'completed', turn_id: 'turn_1', content: [{ type: 'output_text', text }] });
    const pages = { '': { data: [item('item_a', 'A'), item('item_b', 'B')], has_more: true, first_id: 'item_a', last_id: 'cursor_not_an_item_id' },
      cursor_not_an_item_id: { data: [item('item_c', 'C')], has_more: false, first_id: 'item_c', last_id: 'item_c' } };
    wire.respond((attempt, { res }) => {
      if (attempt.method === 'POST') return wire.json(200, native());
      const url = new URL(attempt.path, 'http://wire');
      if (url.pathname.endsWith('/events')) return wire.sse(res, []);
      if (url.pathname.endsWith('/items')) return wire.json(200, { object: 'list', ...pages[url.searchParams.get('after') ?? ''] });
      return wire.json(200, native({ status: 'idle' }));
    });
    const { binding } = await adapter.createSession(creation);
    const recovered = await adapter.reconcile(binding, {});
    assert.deepEqual(recovered.items.map(entry => entry.id), ['item_a', 'item_b', 'item_c']);
    assert.deepEqual(wire.attempts.filter(attempt => attempt.path.includes('/items')).map(attempt => attempt.path),
      [`/v1/agents/sessions/${SESSION}/items?order=asc&limit=100`, `/v1/agents/sessions/${SESSION}/items?order=asc&limit=100&after=cursor_not_an_item_id`],
      'the next page is asked for with the cursor the service returned');
    assert.equal((await transport.listItems(SESSION, { order: 'desc', limit: 2 })).last_id, 'cursor_not_an_item_id');

    // P03C-R3: "more exists" with nowhere to continue from is not a history.
    const historyOf = async (page) => {
      wire.respond((attempt, { res }) => {
        const url = new URL(attempt.path, 'http://wire');
        if (url.pathname.endsWith('/events')) return wire.sse(res, []);
        if (url.pathname.endsWith('/items')) return wire.json(200, url.searchParams.get('after') ? { object: 'list', data: [item('item_z', 'Z')], has_more: false } : { object: 'list', ...page });
        return wire.json(200, native({ status: 'idle' }));
      });
      return adapter.reconcile(binding, {}).then(result => result.items.map(entry => entry.id), error => error);
    };
    for (const page of [{ data: [], has_more: true }, { data: [], has_more: true, last_id: '' }, { data: [{ type: 'message' }], has_more: true, last_id: null }]) {
      const outcome = await historyOf(page);
      assert.ok(outcome instanceof AgentsTransportError && outcome.code === 'malformed_response', `recovery must fail, got ${JSON.stringify(outcome)}`);
    }
    assert.deepEqual(await historyOf({ data: [item('item_y', 'Y')], has_more: true }), ['item_y', 'item_z'], 'the last item id is still a usable cursor when last_id is absent');
    assert.deepEqual(await historyOf({ data: [], has_more: false }), [], 'an empty page that claims to be complete is an empty history');

    const secret = 'RESPONSE_BODY_SECRET';
    const cases = [
      ['non-JSON error', { status: 502, headers: { 'content-type': 'text/html', 'x-request-id': 'req_native_1' }, body: `<html>${secret}</html>` }, { code: 'http_failed', status: 502, nativeRequestId: 'req_native_1' }],
      ['refusal', wire.json(401, { error: { message: `bad key ${secret}`, code: 'invalid_api_key', type: 'invalid_request_error' } }), { code: 'http_rejected', status: 401, nativeCode: 'invalid_api_key' }],
      ['2xx that is not JSON', { status: 200, headers: { 'content-type': 'application/json' }, body: `<html>${secret}` }, { code: 'malformed_response' }],
      ['2xx of another type', { status: 200, headers: { 'content-type': 'text/html' }, body: `<html>${secret}` }, { code: 'malformed_response' }],
      ['2xx without the page fields', wire.json(200, { object: 'list', data: [] }), { code: 'malformed_response' }],
      ['2xx for another session', wire.json(200, native({ id: 'agsess_other' })), { code: 'malformed_response' }],
    ];
    for (const [label, reply, expected] of cases) {
      wire.respond(() => reply);
      for (const read of [() => transport.listItems(SESSION), () => transport.getSession(SESSION)]) {
        const error = await read().then(() => null, failure => failure);
        assert.ok(error instanceof AgentsTransportError, `${label}: never an empty success`);
        assert.deepEqual(Object.fromEntries(Object.keys(expected).map(name => [name, error[name]])), expected, label);
        assert.equal(error.delivery, undefined, 'a read carries no delivery claim');
        const rendered = JSON.stringify({ message: error.message, ...error, stack: error.stack });
        assert.ok(!rendered.includes(secret) && !rendered.includes(KEY) && !('cause' in error), `${label}: no body, credential or SDK error is copied`);
      }
    }
    await assert.rejects(adapter.reconcile(binding, {}), { code: 'malformed_response' }, 'recovery fails; it does not return an empty history');
  } finally {
    await wire.close();
  }
});

test('a mutation is attempted once: refusal, timeout and a lost reply never become a second create or a second result', async () => {
  const { wire, transport, adapter } = await harness({ timeoutMs: 150 });
  try {
    wire.respond(() => wire.json(200, native()));
    const { binding } = await adapter.createSession(creation);
    const result = { turnId: 'turn_1', callId: 'call_1', success: true, output: 'bytes', requestId: 'cw-effect-1' };
    const mutations = {
      create: () => adapter.createSession({ ...creation, commandId: `cmd-${Math.random()}` }),
      result: () => adapter.submitToolResult(binding, result),
    };
    const replies = {
      'HTTP 500': [() => wire.json(500, { error: { message: 'x' } }), { code: 'http_failed', delivery: 'unresolved' }],
      'HTTP 429': [() => ({ status: 429, headers: { 'content-type': 'application/json', 'retry-after-ms': '1' }, body: '{}' }), { code: 'http_rejected', delivery: 'rejected' }],
      'HTTP 409': [() => wire.json(409, { error: { message: 'x' } }), { code: 'http_rejected', delivery: 'rejected' }],
      'HTTP 408': [() => wire.json(408, { error: { message: 'x' } }), { code: 'http_failed', delivery: 'unresolved' }],
      'no answer': [() => ({ handled: true }), { code: 'timeout', delivery: 'unresolved' }],
      'reply lost after the request arrived': [() => ({ destroy: true }), { code: 'connection_failed', delivery: 'unresolved' }],
      'unreadable success': [() => ({ status: 200, headers: { 'content-type': 'application/json' }, body: '{' }), { code: 'malformed_response', delivery: 'unresolved' }],
    };
    for (const [label, [reply, expected]] of Object.entries(replies)) {
      for (const [name, mutate] of Object.entries(mutations)) {
        if (label === 'unreadable success' && name === 'result') continue; // an events reply has no body to read
        wire.respond(reply);
        const before = posts(wire).length;
        const error = await mutate().then(() => null, failure => failure);
        assert.ok(error instanceof AgentsTransportError, `${label}/${name}`);
        assert.deepEqual({ code: error.code, delivery: error.delivery }, expected, `${label}/${name}`);
        assert.equal(posts(wire).length - before, 1, `${label}/${name}: exactly one HTTP attempt`);
      }
    }

    // The caller retries with the same identity; the transport adds none of its own.
    wire.respond(() => ({ status: 204, headers: {}, body: '' }));
    await adapter.submitToolResult(binding, result);
    const keys = posts(wire).filter(attempt => attempt.body?.events?.[0]?.type === 'agent.session.input.tool_result').map(attempt => attempt.headers['idempotency-key']);
    assert.deepEqual([...new Set(keys)], ['cw-effect-1'], 'every attempt for one operation carried the one caller-owned key');
    assert.ok(posts(wire).filter(attempt => attempt.path === '/v1/agents/sessions').every(attempt => !('idempotency-key' in attempt.headers)), 'create has no wire identity in this artifact, and none is invented');

    // Aborting a mutation: before the call nothing is sent; during it the outcome is unresolved.
    const early = new AbortController(); early.abort();
    let before = posts(wire).length;
    await assert.rejects(adapter.submitToolResult(binding, { ...result, signal: early.signal }), { code: 'aborted', delivery: 'not_sent' });
    assert.equal(posts(wire).length, before);
    wire.respond(() => ({ handled: true }));
    const during = new AbortController();
    const pending = adapter.submitInput(binding, { text: 'late', requestId: 'cw-cmd-late', signal: during.signal });
    while (posts(wire).length === before) await delay(5);
    during.abort();
    await assert.rejects(pending, { code: 'aborted', delivery: 'unresolved' });
    assert.equal(posts(wire).length, before + 1);

    assert.ok(capabilityRows().every(row => exposureOf(row) === 'unavailable'), 'a synthetic wire promotes no capability');
  } finally {
    await wire.close();
  }
});

test('an allowlisted function declaration reaches the wire with exactly four keys; every other tool is refused before the wire', async () => {
  const { wire, transport } = await harness();
  try {
    wire.respond(() => wire.json(200, native()));
    const parameters = { type: 'object', required: ['path'], additionalProperties: false, properties: { path: { type: 'string', minLength: 1, maxLength: 1000 } } };
    const declaration = { type: 'function', name: 'repo_read', description: 'Read a file.', parameters, defer_loading: true, strict: true, execute: 'never serialized' };
    await transport.createSession({ agent: { model: 'gpt-synthetic', tools: [declaration] }, environment: { type: 'none' }, input: 'go' });
    assert.deepEqual(posts(wire)[0].body.agent, { model: 'gpt-synthetic', tools: [{ type: 'function', name: 'repo_read', description: 'Read a file.', parameters }] });

    const refused = [
      [{ type: 'tool_search' }], [{ ...declaration, name: 'shell' }], [{ ...declaration, type: 'mcp' }], [declaration, declaration],
      [{ ...declaration, parameters: { type: 'string' } }], [{ ...declaration, description: '' }], [], 'repo_read',
    ];
    for (const tools of refused) {
      await assert.rejects(transport.createSession({ agent: { model: 'gpt-synthetic', tools }, environment: { type: 'none' }, input: 'go' }),
        error => error instanceof AgentsTransportError && error.code === 'invalid_request' && error.delivery === 'not_sent');
    }
    assert.equal(posts(wire).length, 1, 'no refused declaration produced a request');
  } finally { await wire.close(); }
});

test('a turn read is one GET for the turn asked for; another turn, another session or a statusless answer is an error', async () => {
  const { wire, transport, adapter } = await harness();
  try {
    const turn = (overrides = {}) => ({ id: 'turn_wire_1', object: 'agent.session.turn', session_id: SESSION, subagent_id: null, status: 'completed', error: null, ...overrides });
    let answer = turn();
    wire.respond(attempt => attempt.method === 'POST' ? wire.json(200, native()) : wire.json(200, answer));
    assert.equal((await transport.getTurn(SESSION, 'turn_wire_1')).status, 'completed');
    const [read] = wire.attempts;
    assert.deepEqual([read.method, read.path, read.headers.accept, 'idempotency-key' in read.headers, read.body], ['GET', `/v1/agents/sessions/${SESSION}/turns/turn_wire_1`, 'application/json', false, null]);
    for (const wrong of [turn({ id: 'turn_other' }), turn({ session_id: 'agsess_other' }), turn({ status: undefined }), null]) {
      answer = wrong;
      await assert.rejects(transport.getTurn(SESSION, 'turn_wire_1'), error => error instanceof AgentsTransportError && error.code === 'malformed_response' && error.delivery === undefined);
    }
    await assert.rejects(transport.getTurn(SESSION, 'not a token'), { code: 'invalid_request' });

    const { binding } = await adapter.createSession(creation);
    answer = turn({ status: 'failed', error: { code: 'server_error', message: 'x'.repeat(2000) } });
    const failed = await adapter.readTurn(binding, 'turn_wire_1');
    assert.deepEqual([failed.root, failed.terminal, failed.error.code, failed.error.message.length], [true, 'failed', 'server_error', 501]);
    answer = turn({ status: 'waiting' });
    assert.deepEqual([(await adapter.readTurn(binding, 'turn_wire_1')).terminal], [null], 'a turn that has not ended settles nothing');
    answer = turn({ subagent_id: 'sub_1' });
    assert.equal((await adapter.readTurn(binding, 'turn_wire_1')).root, false, 'a child turn is never the root');
  } finally { await wire.close(); }
});
