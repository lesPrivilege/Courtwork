/**
 * Synthetic Agents API service for Host-consumer tests: a stateful script on
 * top of the loopback wire fixture, so the production service, store, gateway,
 * adapter, transport and the unmodified SDK all run over real sockets.
 *
 * It is a stand-in, not a model of the beta service: every behaviour here
 * (turn ids, event order, what a new stream replays) is a fixture choice. A
 * test that depends on one says so. It holds no credential and calls nothing.
 */
import { createWireFixture, sseFrame } from './agents-api-wire.mjs';

/**
 * @param plan ({ session, input, turnIndex, turnId }) => steps. A step is
 *   { text }, { call: { name, arguments, callId?, turnId? } }, { event } (a raw
 *   native event, given an event_id), { drop: true } (every open stream is cut
 *   here), { pause: name } (the turn waits for `resume(name)`), or
 *   { end: 'completed'|'failed'|'cancelled'|'none' }. A plan without an `end`
 *   step ends `completed`.
 * @param replay what a later stream carries first: 'new' the events no stream
 *   has carried, 'all' the session's whole log, 'live' nothing — events
 *   emitted while no stream was open are simply missed.
 * @param cancel 'confirm' ends the active turn cancelled; 'ignore' accepts the
 *   request and does nothing.
 * @param announceTurns false withholds `turn.created`, so a Host never learns
 *   a root turn from attributable evidence.
 */
export async function createAgentsLoopback({ plan = () => [], replay = 'new', announceTurns = true, cancel = 'confirm' } = {}) {
  const wire = await createWireFixture();
  const sessions = new Map();
  const faults = [];
  const paused = new Map();
  let sessionSeq = 0;

  function emit(session, event) {
    const full = { session_id: session.id, event_id: `evt_${session.id}_${session.log.length + 1}`, ...event };
    session.log.push(full);
    for (const res of session.streams) { res.write(sseFrame(full)); session.carried = session.log.length; }
    return full;
  }

  const snapshot = (session) => ({ id: session.id, object: 'agent.session', status: session.status, required_actions: structuredClone(session.required) });

  function advance(session) {
    const turn = session.turn;
    while (turn && turn.steps.length) {
      const step = turn.steps.shift();
      if (step.text !== undefined) {
        const itemId = `item_${turn.id}_${turn.items += 1}`;
        emit(session, { type: 'agent.session.turn.output_text.delta', turn_id: turn.id, item_id: itemId, output_index: 0, content_index: 0, delta: step.text });
        emit(session, { type: 'agent.session.turn.output_text.done', turn_id: turn.id, item_id: itemId, output_index: 0, content_index: 0, text: step.text });
      } else if (step.event) {
        emit(session, structuredClone(step.event));
      } else if (step.drop) {
        for (const res of [...session.streams]) res.destroy();
        session.streams.clear();
      } else if (step.pause) {
        paused.set(step.pause, session);
        return;
      } else if (step.call) {
        const action = { type: 'function_call', turn_id: step.call.turnId ?? turn.id, call_id: step.call.callId ?? `call_${turn.id}_${turn.calls += 1}`,
          name: step.call.name, arguments: step.call.arguments ?? {} };
        session.required = [action]; session.status = 'requires_action';
        emit(session, { type: 'agent.session.requires_action', session: snapshot(session) });
        if (step.call.await !== false) return; // wait for the tool result
        session.required = [];
      } else if (step.end) {
        turn.steps.length = 0;
        if (step.end === 'none') { session.turn = null; return; }
        finish(session, step.end);
        return;
      }
    }
    if (turn) finish(session, 'completed');
  }

  function finish(session, status) {
    const turn = session.turn;
    session.turn = null; session.status = 'idle'; session.required = [];
    session.turnStatus.set(turn.id, status);
    emit(session, { type: `agent.session.turn.${status}`, turn_id: turn.id,
      turn: { id: turn.id, object: 'agent.session.turn', session_id: session.id, agent_id: 'agent_loopback', subagent_id: null, status,
        error: status === 'failed' ? { code: 'server_error', message: 'loopback failure' } : null } });
    emit(session, { type: 'agent.session.idle', session: snapshot(session) });
  }

  function startTurn(session, input) {
    const turn = { id: `turn_${session.id}_${session.turns += 1}`, steps: [], items: 0, calls: 0 };
    turn.steps = [...plan({ session: snapshot(session), input, turnIndex: session.turns, turnId: turn.id })];
    session.turn = turn; session.status = 'in_progress'; session.turnStatus.set(turn.id, 'in_progress');
    if (announceTurns) emit(session, { type: 'agent.session.turn.created', turn_id: turn.id,
      turn: { id: turn.id, object: 'agent.session.turn', session_id: session.id, agent_id: 'agent_loopback', subagent_id: null, status: 'in_progress', error: null } });
    advance(session);
  }

  function apply(attempt, { res }) {
    const url = new URL(attempt.path, 'http://loopback');
    const match = url.pathname.match(/^\/v1\/agents\/sessions(?:\/([^/]+)(?:\/(events|items|turns)(?:\/([^/]+))?)?)?$/);
    if (!match) return wire.json(404, { error: { message: 'unknown path' } });
    const [, sessionId, sub, turnId] = match;
    if (!sessionId && attempt.method === 'POST') {
      const session = { id: `sess_loopback_${sessionSeq += 1}`, status: 'in_progress', required: [], log: [], carried: 0, streams: new Set(), turns: 0, turn: null, turnStatus: new Map(), items: [], create: attempt.body, results: [], inputs: [] };
      sessions.set(session.id, session);
      startTurn(session, attempt.body.input);
      return wire.json(200, snapshot(session));
    }
    const session = sessions.get(sessionId);
    if (!session) return wire.json(404, { error: { message: 'unknown session' } });
    if (sub === 'events' && attempt.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      // The first stream of a session always starts from its beginning.
      const from = replay === 'all' ? 0 : replay === 'live' && session.opened ? session.log.length : session.carried;
      session.opened = true;
      session.streams.add(res); res.on('close', () => session.streams.delete(res));
      for (const event of session.log.slice(from)) res.write(sseFrame(event));
      session.carried = session.log.length;
      return { handled: true };
    }
    if (sub === 'events' && attempt.method === 'POST') {
      for (const event of attempt.body.events) {
        if (event.type === 'agent.session.input.message') { session.inputs.push(event); if (!session.turn) startTurn(session, event.input?.[0]?.content?.[0]?.text ?? ''); }
        else if (event.type === 'agent.session.input.tool_result') {
          session.results.push(event);
          if (session.required.some(action => action.call_id === event.call_id)) {
            session.items.push({ id: `item_out_${session.items.length + 1}`, type: 'function_call_output', call_id: event.call_id, turn_id: event.turn_id, status: 'completed' });
            session.required = []; session.status = 'in_progress'; advance(session);
          }
        } else if (event.type === 'agent.session.input.cancel') { session.cancels = (session.cancels ?? 0) + 1; if (session.turn && cancel === 'confirm') finish(session, 'cancelled'); }
      }
      return wire.json(202, {});
    }
    if (sub === 'items') return wire.json(200, { data: structuredClone(session.items), has_more: false, first_id: session.items[0]?.id ?? null, last_id: session.items.at(-1)?.id ?? null });
    if (sub === 'turns' && turnId && attempt.method === 'GET') {
      if (!session.turnStatus.has(turnId)) return wire.json(404, { error: { message: 'unknown turn' } });
      const status = session.turnStatus.get(turnId);
      return wire.json(200, { id: turnId, object: 'agent.session.turn', session_id: session.id, agent_id: 'agent_loopback', subagent_id: null, status,
        error: status === 'failed' ? { code: 'server_error', message: 'loopback failure' } : null });
    }
    if (!sub && attempt.method === 'GET') return wire.json(200, snapshot(session));
    return wire.json(405, { error: { message: 'unsupported' } });
  }

  wire.respond((attempt, io) => {
    const index = faults.findIndex(fault => fault.match(attempt));
    const fault = index === -1 ? null : faults.splice(index, 1)[0];
    if (fault?.mode === 'reject') return wire.json(fault.status ?? 400, { error: { message: 'loopback refusal', type: 'invalid_request_error' } });
    if (fault?.mode === 'respond') return wire.json(200, fault.status);
    if (fault?.mode === 'lose_request') return { destroy: true };
    // Never answered: the request stays in flight until the socket is closed.
    if (fault?.mode === 'hold') return { handled: true };
    const reply = apply(attempt, io);
    // The service did the work; only its answer is lost.
    if (fault?.mode === 'lose_reply') return { destroy: true };
    return reply;
  });

  return {
    baseURL: wire.baseURL,
    attempts: wire.attempts,
    sessions,
    /** One-shot fault for the next matching request: 'reject' (status) | 'respond' (a 200 body) | 'lose_request' | 'lose_reply' | 'hold'. */
    fault(match, mode, status) { faults.push({ match, mode, status }); },
    posts: (suffix) => wire.attempts.filter(attempt => attempt.method === 'POST' && attempt.path.endsWith(suffix)),
    /** Let a turn waiting at { pause: name } go on. */
    resume(name) { const session = paused.get(name); paused.delete(name); if (session) advance(session); },
    gets: (suffix) => wire.attempts.filter(attempt => attempt.method === 'GET' && attempt.path.split('?')[0].endsWith(suffix)),
    /** End every open event stream, as a dropped connection would. */
    dropStreams() { for (const session of sessions.values()) for (const res of [...session.streams]) res.destroy(); },
    close: () => wire.close(),
  };
}
