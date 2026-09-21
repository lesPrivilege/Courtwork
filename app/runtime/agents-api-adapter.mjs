/**
 * Agents API Runtime Adapter — P03/DRT-03 first slice (protocol and binding).
 *
 * The seam between the CourtWork Host and the OpenAI Agents API public beta
 * (`OpenAI-Beta: agents=v1`). Deliberately transport-free: the Host injects an
 * `AgentsApiTransport`, no SDK is imported here, and this slice performs no
 * network call and holds no credential.
 *
 * Authority (unchanged by this module):
 * - Host owns CW Session/Run identity, admission, command receipts and the
 *   final Run status write. Native session/turn/item/call ids are observations
 *   persisted beside CW identity, never in place of it.
 * - Work Core owns sources, candidates and Decisions. Nothing here accepts or
 *   rejects work, and remote output never gains formal effect.
 *
 * Capability rule: nothing unverified is exposed. Fixture-tested mappings in
 * this file prove protocol conformance only; `exposureOf` keeps every
 * capability unavailable until a live-service probe passes.
 *
 * External evidence: official Agents API guides and the beta streaming-events
 * reference retrieved 2026-09-15; snapshot manifest and hashes under
 * engineering/research/agents-api-first-2026-09-14/evidence/docs-20260915/.
 */

/** Frozen protocol identity. `sdkPin` records the exact verified npm artifact;
 * this adapter still does not import it (the Host transport implementation
 * owns SDK wiring in a later slice). */
export const AGENTS_API_PROTOCOL = Object.freeze({
  id: 'openai-agents-api',
  betaHeader: 'agents=v1',
  docsRevision: '2026-09-15',
  baseUrl: 'https://api.openai.com/v1/agents',
  endpoints: Object.freeze({
    createSession: 'POST /v1/agents/sessions',
    sendEvents: 'POST /v1/agents/sessions/{session_id}/events',
    streamEvents: 'GET /v1/agents/sessions/{session_id}/events?stream=true',
    getSession: 'GET /v1/agents/sessions/{session_id}',
    listItems: 'GET /v1/agents/sessions/{session_id}/items',
    deleteSession: 'DELETE /v1/agents/sessions/{session_id}',
  }),
  sdkPin: Object.freeze({
    package: 'openai',
    version: '7.15.0',
    verifiedAt: '2026-09-15',
    namespace: 'beta.agents',
    tarballSha256: 'a9428a67be47b7039468d534118a9fd258862978cd6862fcf3f9dd2f687afb90',
  }),
});

export const AGENTS_API_EXPOSURE_RULE =
  'unverified capabilities are unavailable; only live-verified capabilities may be exposed';

export const AGENTS_API_TERMINAL_STATUSES = Object.freeze(['completed', 'failed', 'cancelled', 'unknown']);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function boundedText(value, limit) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : String(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function boundedError(shape) {
  if (!shape || typeof shape !== 'object') return null;
  const rawCode = shape.code;
  const code = rawCode === null || rawCode === undefined ? null : boundedText(rawCode, 120);
  return { code, message: boundedText(shape.message, 500) };
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/* ------------------------------------------------------------------------ *
 * Capability boundary
 * ------------------------------------------------------------------------ */

/** First-slice capability rows. `supported` means the adapter protocol covers
 * the operation and offline fixtures verify the mapping; it does NOT mean the
 * live service was verified. `documented` lists the official pages the claim
 * came from. Everything absent from `supported` rows is unavailable. */
const CAPABILITY_ROWS = Object.freeze([
  { id: 'session.create', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S04'],
    note: 'environment:none requires initial input' },
  { id: 'session.input.message', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S04'],
    note: 'idle starts a new turn; active turn steers' },
  { id: 'session.input.cancel', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S04'],
    note: 'intent only; turn.cancelled is the confirmation' },
  { id: 'session.events.stream', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S05'] },
  { id: 'session.items.read', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S05'],
    note: 'paged with the after cursor in ascending order' },
  { id: 'session.saved_items.recovery', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S05'],
    note: 'buffer, retrieve items, merge by item id, discard final updates' },
  { id: 'function_call.required_action', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S06'],
    note: 'application executes; adapter never auto-runs a function' },
  { id: 'function_call.result', environment: 'none', support: 'supported', verification: 'fixture', documented: ['S06'],
    note: 'echoes turn_id and call_id' },
  { id: 'session.delete', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S04'],
    note: 'destructive; not in the first slice and never implicit' },
  { id: 'session.turns.read', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S05'],
    note: 'turn list/retrieve not implemented in this slice' },
  { id: 'session.webhooks', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S04'],
    note: 'streaming only in this slice' },
  { id: 'builtin.bash', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S03'],
    note: 'documented unavailable without an environment' },
  { id: 'builtin.apply_patch', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S03'] },
  { id: 'workspace.files', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S03'] },
  { id: 'executor.mcp', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S03'] },
  { id: 'artifacts.download', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S10'],
    note: 'no environment in this slice' },
  { id: 'multi_agent.subagents', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S07'],
    note: 'delegation stays disabled in the first slice' },
  { id: 'usage.exact', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S11'],
    note: 'usage is best effort and may change' },
  { id: 'trace.export', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S11'],
    note: 'public beta does not expose full trace retrieval' },
  { id: 'approval.per_command', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S08'],
    note: 'no documented per-command interception; never claim CW approved each command' },
  { id: 'data.zdr', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S02'] },
  { id: 'data.residency_non_us', environment: 'none', support: 'unsupported', verification: 'none', documented: ['S02'] },
  { id: 'environment.self_hosted.executor', environment: 'self_hosted', support: 'unsupported', verification: 'none', documented: ['S09'],
    note: 'later slice; executor key and exec-server not implemented' },
  { id: 'environment.self_hosted.files', environment: 'self_hosted', support: 'unsupported', verification: 'none', documented: ['S10'] },
  { id: 'environment.self_hosted.lifecycle', environment: 'self_hosted', support: 'unsupported', verification: 'none', documented: ['S13'] },
  { id: 'environment.self_hosted.approval', environment: 'self_hosted', support: 'unsupported', verification: 'none', documented: ['S09'],
    note: 'no per-command approval contract to intercept' },
  { id: 'environment.openai_hosted.sandbox', environment: 'openai_hosted', support: 'unsupported', verification: 'none', documented: ['S08'] },
  { id: 'environment.openai_hosted.artifacts', environment: 'openai_hosted', support: 'unsupported', verification: 'none', documented: ['S10'] },
  { id: 'environment.openai_hosted.network', environment: 'openai_hosted', support: 'unsupported', verification: 'none', documented: ['S08'],
    note: 'network defaults to enabled; no policy implemented' },
].map((row) => Object.freeze(row)));

export function capabilityRows() {
  return CAPABILITY_ROWS;
}

/** The only route to `available` is a live-service verification. Fixture tests
 * and docs may never promote a capability, which is what keeps unverified
 * features out of the product surface. */
export function exposureOf(capability) {
  return capability?.verification === 'live' ? 'available' : 'unavailable';
}

/* ------------------------------------------------------------------------ *
 * Native event normalization
 * ------------------------------------------------------------------------ */

function nativeRef(event) {
  return {
    eventId: typeof event.event_id === 'string' ? event.event_id : null,
    sessionId: typeof event.session_id === 'string' ? event.session_id : null,
    turnId: typeof event.turn_id === 'string' ? event.turn_id
      : typeof event.turn?.id === 'string' ? event.turn.id : null,
    itemId: typeof event.item_id === 'string' ? event.item_id : null,
    subagentId: typeof event.turn?.subagent_id === 'string' ? event.turn.subagent_id : null,
  };
}

function observation(kind, native, data) {
  return { kind, native, data };
}

const TURN_TERMINALS = new Map([
  ['agent.session.turn.completed', 'completed'],
  ['agent.session.turn.failed', 'failed'],
  ['agent.session.turn.cancelled', 'cancelled'],
]);

const ENVIRONMENT_NOTICES = new Map([
  ['agent.session.environment.pending', 'environment_pending'],
  ['agent.session.environment.ready', 'environment_ready'],
  ['agent.session.environment.connected', 'environment_connected'],
  ['agent.session.environment.disconnected', 'environment_disconnected'],
]);

/** Map one native event to one normalized observation.
 *
 * Returns `null` for known events this slice intentionally does not surface
 * (reasoning summary deltas, content-part bookkeeping, hosted command output);
 * returns `native.unknown` for event types outside the frozen subset. An
 * event missing `event_id` is never merged — it becomes a diagnostic because
 * dedup and item-keyed recovery both depend on that identity. */
export function normalizeNativeEvent(event) {
  if (!event || typeof event !== 'object' || typeof event.type !== 'string' || !event.type) return null;
  const native = nativeRef(event);

  if (native.eventId === null) {
    return observation('native.unknown', native, {
      type: boundedText(event.type, 120),
      reason: 'missing_event_id',
    });
  }

  if (TURN_TERMINALS.has(event.type)) {
    const status = TURN_TERMINALS.get(event.type);
    if (native.subagentId !== null) {
      // Child turns never settle the root Run; first slice keeps delegation off.
      return observation('run.notice', native, {
        notice: `subagent_turn_${status}`, turnId: native.turnId, subagentId: native.subagentId,
      });
    }
    const error = status === 'failed' ? boundedError(event.turn?.error) : null;
    return observation('run.settlement', native, {
      candidate: status,
      source: 'native-terminal',
      reason: `native_turn_${status}`,
      ...(error ? { error } : {}),
    });
  }

  switch (event.type) {
    case 'agent.session.turn.output_text.delta':
      return observation('assistant.delta', native, {
        text: boundedText(event.delta, 100000),
        itemId: native.itemId,
        outputIndex: positiveInteger(event.output_index),
        contentIndex: positiveInteger(event.content_index),
      });
    case 'agent.session.turn.output_text.done':
      return observation('assistant.message', native, {
        text: boundedText(event.text, 100000),
        itemId: native.itemId,
      });
    case 'agent.session.requires_action': {
      const actions = Array.isArray(event.session?.required_actions) ? event.session.required_actions : [];
      const calls = [];
      const environmentConnections = [];
      for (const action of actions) {
        if (action?.type === 'function_call') {
          calls.push({
            turnId: boundedText(action.turn_id, 200),
            callId: boundedText(action.call_id, 200),
            name: boundedText(action.name, 200),
            arguments: action.arguments ?? null,
          });
        } else if (action?.type === 'environment_connection') {
          environmentConnections.push(boundedText(action.environment_id, 200));
        }
      }
      return observation('runtime.function_call.pending', native, { calls, environmentConnections });
    }
    case 'agent.session.failed': {
      const error = boundedError(event.session?.error);
      return observation('run.settlement', native, {
        candidate: 'failed', source: 'native-session', reason: 'native_session_failed',
        ...(error ? { error } : {}),
      });
    }
    case 'agent.session.environment.failed': {
      const error = boundedError(event.environment?.error);
      return observation('run.settlement', native, {
        candidate: 'failed', source: 'native-session', reason: 'native_environment_failed',
        ...(error ? { error } : {}),
      });
    }
    case 'agent.session.idle':
      return observation('run.notice', native, {
        notice: 'session_idle', status: boundedText(event.session?.status ?? 'idle', 40) || null,
      });
    case 'error':
      return observation('run.error', native, {
        code: event.error?.code === null || event.error?.code === undefined ? null : boundedText(event.error.code, 120),
        message: boundedText(event.error?.message, 500),
      });
    case 'agent.session.turn.item.added':
    case 'agent.session.turn.item.done':
      return observation('run.notice', native, {
        notice: event.type.endsWith('.added') ? 'item_added' : 'item_done',
        itemId: typeof event.item?.id === 'string' ? event.item.id : null,
        itemType: boundedText(event.item?.type, 80) || null,
        status: boundedText(event.item?.status, 40) || null,
        turnId: native.turnId ?? (typeof event.item?.turn_id === 'string' ? event.item.turn_id : null),
      });
    case 'agent.session.created':
    case 'agent.session.in_progress':
    case 'agent.session.turn.created':
    case 'agent.session.turn.in_progress':
      return observation('run.notice', native, {
        notice: event.type.replace('agent.session.', '').replaceAll('.', '_'),
      });
    case 'agent.session.subagent.created':
    case 'agent.session.subagent.active':
    case 'agent.session.subagent.closed':
      return observation('run.notice', native, {
        notice: event.type.replace('agent.session.', '').replaceAll('.', '_'),
      });
    default:
      if (ENVIRONMENT_NOTICES.has(event.type)) {
        return observation('run.notice', native, {
          notice: ENVIRONMENT_NOTICES.get(event.type),
          status: boundedText(event.environment?.status, 40) || null,
        });
      }
      if (event.type.startsWith('agent.session.turn.reasoning_summary')
        || event.type.startsWith('agent.session.turn.content_part')
        || event.type === 'agent.output.command_execution_output.delta') {
        return null; // Known but not surfaced by this slice; never terminal.
      }
      return observation('native.unknown', native, {
        type: boundedText(event.type, 120),
        reason: 'unknown_event',
      });
  }
}

/* ------------------------------------------------------------------------ *
 * Event identity ledger
 * ------------------------------------------------------------------------ */

/** Dedup by `event_id`. A repeated event id is dropped; events without an id
 * stay diagnostics (normalizeNativeEvent) and are never merged by position. */
export function createEventLedger() {
  const seen = new Set();
  const stats = { seen: 0, duplicates: 0, malformed: 0, ignored: 0 };
  return {
    accept(event) {
      if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
        stats.malformed += 1;
        return { duplicate: false, observation: null, malformed: true };
      }
      const observationResult = normalizeNativeEvent(event);
      if (observationResult === null) {
        stats.ignored += 1;
        return { duplicate: false, observation: null, malformed: false };
      }
      const eventId = observationResult.native.eventId;
      if (eventId !== null) {
        if (seen.has(eventId)) {
          stats.duplicates += 1;
          return { duplicate: true, observation: null, malformed: false };
        }
        seen.add(eventId);
        stats.seen += 1;
      }
      return { duplicate: false, observation: observationResult, malformed: false };
    },
    seen(eventId) {
      if (typeof eventId === 'string' && eventId) seen.add(eventId);
    },
    mark(event) {
      if (event && typeof event === 'object' && typeof event.event_id === 'string') seen.add(event.event_id);
    },
    stats() {
      return { ...stats };
    },
  };
}

/* ------------------------------------------------------------------------ *
 * Settlement
 * ------------------------------------------------------------------------ */

/** Track native terminal evidence and Host conditions. `decide` returns a
 * recommendation; only the Host writes the Run status. */
export function createSettlementTracker() {
  let terminal = null;
  let sessionFailure = null;
  let streamEnded = false;
  let pendingCalls = new Set();

  return {
    observe(observationResult) {
      if (!observationResult) return;
      if (observationResult.kind === 'run.settlement') {
        const { candidate, source, reason, error = null } = observationResult.data;
        if (source === 'native-terminal') {
          terminal ??= {
            status: candidate, source, reason,
            turnId: observationResult.native.turnId, error,
          };
        } else {
          sessionFailure ??= { source, reason, error };
        }
        return;
      }
      if (observationResult.kind === 'runtime.function_call.pending') {
        pendingCalls = new Set(observationResult.data.calls.map((call) => call.callId));
      }
    },
    endStream() {
      streamEnded = true;
    },
    noteToolResult(callId) {
      const cleared = pendingCalls.delete(callId);
      return cleared;
    },
    pendingCallIds() {
      return [...pendingCalls];
    },
    decide(conditions = {}) {
      const { cancelRequested = false, effectsUnknown = false } = conditions;
      const ambiguousEffects = effectsUnknown || pendingCalls.size > 0;
      if (terminal) {
        if (ambiguousEffects) {
          return { status: 'unknown', source: 'host-condition', reason: 'effects_unreconciled',
            turnId: terminal.turnId ?? null };
        }
        return {
          status: terminal.status, source: terminal.source, reason: terminal.reason,
          turnId: terminal.turnId ?? null,
          ...(terminal.error ? { error: terminal.error } : {}),
        };
      }
      if (sessionFailure) {
        if (ambiguousEffects) {
          return { status: 'unknown', source: sessionFailure.source,
            reason: 'session_failed_effects_unverified' };
        }
        return {
          status: 'failed', source: sessionFailure.source, reason: sessionFailure.reason,
          ...(sessionFailure.error ? { error: sessionFailure.error } : {}),
        };
      }
      if (streamEnded) {
        return {
          status: 'unknown', source: 'transport',
          reason: cancelRequested ? 'cancellation_unconfirmed' : 'stream_closed_before_terminal',
        };
      }
      return null;
    },
  };
}

/** Replay helper: same reducer the Host uses, over a bounded observation list. */
export function settleRun({ observations = [], conditions = {}, streamEnded = false } = {}) {
  const tracker = createSettlementTracker();
  for (const observationResult of observations) tracker.observe(observationResult);
  if (streamEnded) tracker.endStream();
  return tracker.decide(conditions);
}

/* ------------------------------------------------------------------------ *
 * Saved-items recovery
 * ------------------------------------------------------------------------ */

function itemText(item) {
  if (!Array.isArray(item?.content)) return null;
  const parts = item.content.filter((part) => part && typeof part.text === 'string');
  if (!parts.length) return null;
  return parts.map((part) => part.text).join('');
}

/** Recovery merge from the documented procedure: restore state keyed by item
 * id, then apply buffered item updates, discarding updates for items that are
 * already final in the retrieved history. Intermediate events that were never
 * replayed stay a coverage gap; they are not reconstructed from final text. */
export function mergeRecoveredItems({ items = [], buffered = [], disconnected = false } = {}) {
  const restored = new Map();
  let malformed = 0;
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) {
      malformed += 1;
      continue;
    }
    const status = typeof item.status === 'string' ? item.status : null;
    restored.set(item.id, {
      id: item.id,
      type: typeof item.type === 'string' ? item.type : 'unknown',
      role: typeof item.role === 'string' ? item.role : null,
      status,
      turnId: typeof item.turn_id === 'string' ? item.turn_id : null,
      text: itemText(item),
      final: status === 'completed' || status === 'incomplete',
    });
  }

  const decisions = [];
  let applied = 0;
  let discarded = 0;
  let unclaimed = 0;
  for (const event of buffered) {
    const type = event && typeof event === 'object' ? event.type : null;
    const itemId = event && typeof event === 'object' && typeof event.item_id === 'string' ? event.item_id : null;
    const isTextUpdate = type === 'agent.session.turn.output_text.done'
      || type === 'agent.session.turn.output_text.delta';
    if (!isTextUpdate || !itemId) {
      decisions.push('unclaimed');
      unclaimed += 1;
      continue;
    }
    const current = restored.get(itemId);
    if (current?.final) {
      decisions.push('discarded');
      discarded += 1;
      continue;
    }
    const entry = current ?? {
      id: itemId, type: 'message', role: 'assistant', status: null, turnId: null, text: '', final: false,
    };
    if (type === 'agent.session.turn.output_text.done') {
      entry.text = typeof event.text === 'string' ? event.text : entry.text ?? '';
      entry.final = true;
    } else {
      entry.text = `${entry.text ?? ''}${typeof event.delta === 'string' ? event.delta : ''}`;
    }
    restored.set(itemId, entry);
    decisions.push('applied');
    applied += 1;
  }

  return {
    items: [...restored.values()].map(({ final, ...rest }) => rest),
    pendingActions: [],
    applied,
    discarded,
    malformed,
    unclaimed,
    gap: disconnected ? { reason: 'stream_not_replayed', missedIntermediateEvents: true } : null,
    decisions,
  };
}

/* ------------------------------------------------------------------------ *
 * Runtime adapter
 * ------------------------------------------------------------------------ */

/** Forward only what the caller supplied; an absent key stays absent. */
function callerOptions({ requestId, signal } = {}) {
  if (requestId !== undefined && (typeof requestId !== 'string' || !requestId)) {
    throw fail('request_id_invalid', 'requestId must be a non-empty string when supplied');
  }
  return { ...(requestId !== undefined ? { requestId } : {}), ...(signal ? { signal } : {}) };
}

function requireString(value, code) {
  if (typeof value !== 'string' || !value) throw fail(code, `${code} is required`);
  return value;
}

/** Build the minimal adapter over a Host-injected native transport.
 *
 * Fail-closed rules this slice enforces locally (no network):
 * - `environment.type` other than `none` is unavailable;
 * - `environment:none` requires initial input (official requirement);
 * - a duplicate `commandId` never reaches the transport twice; the adapter
 *   makes no remote idempotency claim for session creation.
 *
 * Request identity and cancellation metadata are the caller's: an optional
 * `requestId` and `signal` are passed to the transport unchanged. The adapter
 * never invents a `requestId`, and `commandId` is not sent to the transport,
 * because the verified SDK artifact has no creation identity on the wire. */
export function createAgentsApiRuntimeAdapter({ transport } = {}) {
  if (!transport || typeof transport.createSession !== 'function') {
    throw fail('transport_required', 'an AgentsApiTransport is required');
  }
  const states = new Map();
  const commands = new Map();

  function stateOf(binding) {
    const nativeSessionId = binding?.native?.sessionId;
    const state = typeof nativeSessionId === 'string' ? states.get(nativeSessionId) : null;
    if (!state || state.closed) throw fail('unknown_binding', 'the binding is not an open adapter session');
    return state;
  }

  async function listAllItems(state) {
    const collected = [];
    let after = null;
    for (let page = 0; ; page += 1) {
      const result = await transport.listItems(state.binding.native.sessionId, {
        order: 'asc',
        limit: 100,
        ...(after ? { after } : {}),
      });
      const data = Array.isArray(result?.data) ? result.data : [];
      collected.push(...data);
      if (!result?.has_more) return collected;
      const lastId = typeof result.last_id === 'string' && result.last_id ? result.last_id
        : typeof data.at(-1)?.id === 'string' ? data.at(-1).id : null;
      if (!lastId || page > 1000) return collected; // cannot page further; never loop
      after = lastId;
    }
  }

  async function dispatch(state, nativeEvent, onObservation) {
    const outcome = state.ledger.accept(nativeEvent);
    if (outcome.duplicate || !outcome.observation) return null;
    state.tracker.observe(outcome.observation);
    await onObservation?.(outcome.observation);
    return outcome.observation;
  }

  async function pump(state, onObservation, capture) {
    const handle = transport.streamEvents(state.binding.native.sessionId);
    state.handle = handle;
    try {
      for await (const nativeEvent of handle.events) {
        if (state.closed) break;
        if (capture && state.buffering) {
          capture.push(nativeEvent);
          continue;
        }
        await dispatch(state, nativeEvent, onObservation);
      }
    } finally {
      state.tracker.endStream();
      state.handle = null;
    }
  }

  return {
    async createSession({ identity, agent, environment, input, commandId, signal } = {}) {
      if (!identity || typeof identity.sessionId !== 'string' || !identity.sessionId
        || typeof identity.runId !== 'string' || !identity.runId) {
        throw fail('identity_required', 'CW sessionId and runId are required');
      }
      requireString(commandId, 'command_required');
      if (environment?.type !== 'none') {
        throw fail('environment_unavailable', 'only environment:none is available in this slice');
      }
      if (typeof input !== 'string' || !input.trim()) {
        throw fail('input_required', 'environment:none requires initial input');
      }
      if (!agent || (typeof agent.model !== 'string' && typeof agent.id !== 'string')) {
        throw fail('agent_required', 'agent.model or agent.id is required');
      }
      if (commands.has(commandId)) {
        throw fail('duplicate_command', 'commandId was already used by this adapter instance');
      }

      const native = await transport.createSession({
        agent, environment: { type: 'none' }, input,
      }, callerOptions({ signal }));
      if (!native || typeof native.id !== 'string' || !native.id) {
        throw fail('native_session_missing', 'the transport did not return a native session id');
      }
      commands.set(commandId, native.id);
      const binding = {
        runtimeId: 'agents-api',
        internal: { sessionId: identity.sessionId, runId: identity.runId },
        native: {
          sessionId: native.id,
          ...(typeof native.environment?.id === 'string' ? { environmentId: native.environment.id } : {}),
          ...(typeof native.environment?.remote_url === 'string' ? { remoteUrl: native.environment.remote_url } : {}),
        },
        protocol: { betaHeader: 'agents=v1', docsRevision: AGENTS_API_PROTOCOL.docsRevision },
      };
      states.set(native.id, {
        binding,
        ledger: createEventLedger(),
        tracker: createSettlementTracker(),
        handle: null,
        closed: false,
        buffering: false,
      });
      return { binding, native };
    },

    /** Re-open adapter state for a native session the Host already bound
     * durably (a later Run, or the same Run after a Host restart). Local
     * only: nothing is sent, nothing is looked up, and the id is the Host's
     * persisted one — never a guess. An open state is returned as it is. */
    attachSession({ identity, nativeSessionId } = {}) {
      if (!identity || typeof identity.sessionId !== 'string' || !identity.sessionId
        || typeof identity.runId !== 'string' || !identity.runId) {
        throw fail('identity_required', 'CW sessionId and runId are required');
      }
      requireString(nativeSessionId, 'native_session_required');
      const open = states.get(nativeSessionId);
      if (open && !open.closed) return { binding: open.binding };
      const binding = {
        runtimeId: 'agents-api',
        internal: { sessionId: identity.sessionId, runId: identity.runId },
        native: { sessionId: nativeSessionId },
        protocol: { betaHeader: 'agents=v1', docsRevision: AGENTS_API_PROTOCOL.docsRevision },
      };
      states.set(nativeSessionId, {
        binding, ledger: createEventLedger(), tracker: createSettlementTracker(),
        handle: null, closed: false, buffering: false,
      });
      return { binding };
    },

    async submitInput(binding, { text, requestId, signal } = {}) {
      const state = stateOf(binding);
      requireString(text, 'input_required');
      await transport.sendEvents(state.binding.native.sessionId, [{
        type: 'agent.session.input.message',
        input: [{ role: 'user', content: [{ type: 'input_text', text }] }],
      }], callerOptions({ requestId, signal }));
    },

    async cancelTurn(binding, { requestId, signal } = {}) {
      const state = stateOf(binding);
      // Request only. Closing a stream or returning from this call is not a
      // cancellation; the Host settles from turn.cancelled or stays unknown.
      await transport.sendEvents(state.binding.native.sessionId, [
        { type: 'agent.session.input.cancel' },
      ], callerOptions({ requestId, signal }));
      return { intent: 'sent' };
    },

    async submitToolResult(binding, result = {}) {
      const state = stateOf(binding);
      requireString(result.turnId, 'turn_required');
      requireString(result.callId, 'call_required');
      const payload = {
        type: 'agent.session.input.tool_result',
        turn_id: result.turnId,
        call_id: result.callId,
        success: result.success === true,
      };
      if (result.success === true) {
        payload.output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output ?? null);
      } else {
        payload.error = typeof result.error === 'string' && result.error ? result.error : 'function failed';
      }
      await transport.sendEvents(state.binding.native.sessionId, [payload], callerOptions(result));
      return { clearedPendingCall: state.tracker.noteToolResult(result.callId) };
    },

    observe(binding, { onObservation } = {}) {
      const state = stateOf(binding);
      const done = pump(state, onObservation, null);
      return {
        stop: () => { state.handle?.abort?.(); },
        done,
      };
    },

    async reconcile(binding, { onObservation, disconnected = true } = {}) {
      const state = stateOf(binding);
      const buffered = [];
      state.buffering = true;
      // The pump keeps running after recovery resumes live; a pump failure is
      // recorded rather than replacing the recovery result.
      pump(state, onObservation, buffered).catch((error) => { state.pumpError = error; });

      // Documented order: the stream stays connected while saved items are
      // retrieved, so events arriving during the fetch are buffered, not lost.
      let items;
      let session;
      try {
        items = await listAllItems(state);
        session = await transport.getSession(state.binding.native.sessionId);
      } catch (error) {
        state.buffering = false;
        throw error;
      }
      const snapshot = buffered.splice(0, buffered.length);
      const merged = mergeRecoveredItems({ items, buffered: snapshot, disconnected });

      // Only a text update for an item the saved history already finalised is
      // dropped (marked seen so a redelivery stays dropped). Everything else
      // the stream delivered while buffering — kept text, and non-item events
      // such as a root turn terminal or required actions — takes the ordinary
      // path, so the tracker and the Host still see it; buffering only delays
      // it. This runs while still buffering, so live events cannot interleave
      // the restored view; they are drained below and then flow live.
      for (const [index, nativeEvent] of snapshot.entries()) {
        if (merged.decisions[index] === 'discarded') { state.ledger.mark(nativeEvent); continue; }
        await dispatch(state, nativeEvent, onObservation);
      }
      if (merged.gap) {
        await onObservation?.({
          kind: 'coverage.gap',
          native: { eventId: null, sessionId: state.binding.native.sessionId, turnId: null, itemId: null, subagentId: null },
          data: { reason: merged.gap.reason, missedIntermediateEvents: true },
        });
      }
      state.buffering = false;
      const remainder = buffered.splice(0, buffered.length);
      for (const nativeEvent of remainder) await dispatch(state, nativeEvent, onObservation);

      return {
        items: merged.items,
        pendingActions: Array.isArray(session?.required_actions) ? session.required_actions : [],
        applied: merged.applied,
        discarded: merged.discarded,
        malformed: merged.malformed,
        unclaimed: merged.unclaimed,
        gap: merged.gap,
      };
    },

    settle(binding, conditions = {}) {
      const state = stateOf(binding);
      return state.tracker.decide(conditions);
    },

    close(binding) {
      const state = stateOf(binding);
      state.closed = true;
      state.handle?.abort?.();
      states.delete(state.binding.native.sessionId);
    },
  };
}
