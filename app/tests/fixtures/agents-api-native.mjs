/**
 * Offline native fixture for the Agents API Runtime Adapter tests.
 *
 * No network, no SDK, no credentials: this is a scripted in-memory stand-in
 * for the beta wire surface described by the official reference retrieved
 * 2026-09-15. Tests drive it directly; nothing here is product code.
 */

export const FIXTURE_SESSION_ID = 'sess_fixture_1';

function createStream() {
  const queue = [];
  const waiters = [];
  let closed = false;
  let pending = null;

  function settleWaiter() {
    if (!waiters.length || !queue.length) return;
    const waiter = waiters.shift();
    pending = queue.shift();
    waiter.resolve({ value: pending.value, done: false });
  }

  return {
    /** Resolves after the consumer has processed this event and asked for the
     * next one, which makes test assertions deterministic without polling. */
    push(value) {
      if (closed) return Promise.reject(new Error('fixture stream is closed'));
      return new Promise((resolve, reject) => {
        queue.push({ value, ack: resolve, reject });
        settleWaiter();
      });
    },
    close() {
      if (closed) return;
      closed = true;
      for (const waiter of waiters.splice(0)) waiter.resolve({ value: undefined, done: true });
      if (pending) { pending.ack(); pending = null; }
    },
    get closed() {
      return closed;
    },
    iterator() {
      return {
        next() {
          if (pending) { const ack = pending.ack; pending = null; ack(); }
          if (queue.length) {
            pending = queue.shift();
            return Promise.resolve({ value: pending.value, done: false });
          }
          if (closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise((resolve) => waiters.push({ resolve }));
        },
        return() {
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}

function requireSession(sessions, sessionId) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`fixture session ${sessionId} does not exist`);
  return session;
}

export function createNativeFixture({ sessionId = FIXTURE_SESSION_ID, pageSize = 2 } = {}) {
  const calls = [];
  const sessions = new Map();
  const items = new Map();
  const streams = new Map();

  function streamFor(id) {
    let stream = streams.get(id);
    if (!stream || stream.closed) {
      stream = createStream();
      streams.set(id, stream);
    }
    return stream;
  }

  const transport = {
    async createSession(request) {
      calls.push({ op: 'createSession', request: structuredClone(request) });
      const session = { id: sessionId, object: 'agent.session', status: 'in_progress', required_actions: [] };
      sessions.set(sessionId, session);
      return structuredClone(session);
    },
    async sendEvents(id, events) {
      calls.push({ op: 'sendEvents', sessionId: id, events: structuredClone(events) });
      requireSession(sessions, id);
      return { accepted: true };
    },
    streamEvents(id) {
      calls.push({ op: 'streamEvents', sessionId: id });
      requireSession(sessions, id);
      const stream = streamFor(id);
      return {
        events: { [Symbol.asyncIterator]: () => stream.iterator() },
        abort: () => stream.close(),
      };
    },
    async getSession(id) {
      calls.push({ op: 'getSession', sessionId: id });
      return structuredClone(requireSession(sessions, id));
    },
    async listItems(id, params = {}) {
      calls.push({ op: 'listItems', sessionId: id, params: structuredClone(params) });
      const all = items.get(id) ?? [];
      const start = typeof params.after === 'string' && params.after
        ? all.findIndex((item) => item.id === params.after) + 1
        : 0;
      const limit = Math.min(Number.isSafeInteger(params.limit) ? params.limit : pageSize, pageSize);
      const page = all.slice(start, start + limit);
      return {
        data: structuredClone(page),
        has_more: start + limit < all.length,
        first_id: page[0]?.id ?? null,
        last_id: page.at(-1)?.id ?? null,
      };
    },
  };

  return {
    transport,
    calls,
    sessions,
    items,
    emit(id, event) {
      requireSession(sessions, id);
      return streamFor(id).push(structuredClone(event));
    },
    closeStream(id) {
      streams.get(id)?.close();
    },
    setItems(id, list) {
      requireSession(sessions, id);
      items.set(id, structuredClone(list));
    },
    patchSession(id, patch) {
      const session = requireSession(sessions, id);
      Object.assign(session, structuredClone(patch));
    },
    callsOf(op) {
      return calls.filter((call) => call.op === op);
    },
  };
}

/** Native event builders using the exact field names of the beta reference. */
export function nativeEvents(sessionId = FIXTURE_SESSION_ID) {
  const base = (type) => ({ type, session_id: sessionId });
  return {
    outputDelta({ eventId, itemId, text, turnId = 'turn_1', outputIndex = 0, contentIndex = 0 }) {
      return { ...base('agent.session.turn.output_text.delta'), event_id: eventId, turn_id: turnId,
        item_id: itemId, output_index: outputIndex, content_index: contentIndex, delta: text };
    },
    outputDone({ eventId, itemId, text, turnId = 'turn_1', outputIndex = 0, contentIndex = 0 }) {
      return { ...base('agent.session.turn.output_text.done'), event_id: eventId, turn_id: turnId,
        item_id: itemId, output_index: outputIndex, content_index: contentIndex, text };
    },
    turnCompleted({ eventId, turnId = 'turn_1', subagentId = null }) {
      return { ...base('agent.session.turn.completed'), event_id: eventId, turn_id: turnId,
        turn: { id: turnId, object: 'agent.session.turn', session_id: sessionId, agent_id: 'agent_fixture',
          subagent_id: subagentId, status: 'completed', error: null } };
    },
    turnFailed({ eventId, turnId = 'turn_1', code = 'server_error', message = 'fixture failure', subagentId = null }) {
      return { ...base('agent.session.turn.failed'), event_id: eventId, turn_id: turnId,
        turn: { id: turnId, object: 'agent.session.turn', session_id: sessionId, agent_id: 'agent_fixture',
          subagent_id: subagentId, status: 'failed', error: { code, message } } };
    },
    turnCancelled({ eventId, turnId = 'turn_1', subagentId = null }) {
      return { ...base('agent.session.turn.cancelled'), event_id: eventId, turn_id: turnId,
        turn: { id: turnId, object: 'agent.session.turn', session_id: sessionId, agent_id: 'agent_fixture',
          subagent_id: subagentId, status: 'cancelled', error: null } };
    },
    requiresAction({ eventId, calls = [], environmentConnections = [], status = 'requires_action' }) {
      const required = [
        ...calls.map((call) => ({ type: 'function_call', turn_id: call.turnId, call_id: call.callId,
          name: call.name, arguments: call.arguments ?? {} })),
        ...environmentConnections.map((environmentId) => ({ type: 'environment_connection', environment_id: environmentId })),
      ];
      return { ...base('agent.session.requires_action'), event_id: eventId,
        session: { id: sessionId, object: 'agent.session', status, required_actions: required } };
    },
    idle({ eventId }) {
      return { ...base('agent.session.idle'), event_id: eventId,
        session: { id: sessionId, object: 'agent.session', status: 'idle', required_actions: [] } };
    },
    sessionFailed({ eventId, code = 'server_error', message = 'session failed' }) {
      return { ...base('agent.session.failed'), event_id: eventId,
        session: { id: sessionId, object: 'agent.session', status: 'failed', required_actions: [],
          error: { code, message } } };
    },
    unknownType({ eventId, type = 'agent.session.future.thing' }) {
      return { ...base(type), event_id: eventId };
    },
  };
}
