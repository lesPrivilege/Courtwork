/**
 * Hermes API-server `/v1/runs` · Runtime adapter, first standalone slice.
 *
 * The seam between a Host and Hermes' authenticated run surface. It turns
 * what the native side said into validated observations and a truthful
 * settlement; it owns no IO (hermes-api-runs-transport.mjs does) and no
 * authority.
 *
 * Authority (unchanged by this module):
 * - The Host owns CW Session/Run identity, admission, command receipts,
 *   effects, persistence and the final Run status. Hermes `run_id` and
 *   `session_id` are native observations kept beside CW identity, never in
 *   place of it, and never guessed.
 * - Work Core owns Attention and formal state. Nothing here accepts work.
 *
 * Capability rule: only synthetic conformance is claimed (a loopback fixture
 * built from the pinned source). No Host registration, executor allowlist,
 * Store schema or production selection follows from this module.
 *
 * Wire facts, pinned to NousResearch/hermes-agent
 * `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88` (v0.21.3) — see
 * app/docs/hermes-api-runs.md:
 * - The event envelope is `{event, run_id, timestamp, ...fields}`. There is
 *   no event id, sequence or replay cursor, so equal consecutive deltas are
 *   two deltas, and a lost stream is a coverage gap, not something to replay.
 * - Text arrives only as `message.delta.delta`. There is no `run.started`
 *   and no `message.complete`; the terminal `run.<status>` may carry
 *   `output`, the native final response, which is kept apart from the text
 *   actually streamed.
 * - A stop answer is an intent. Only a matching terminal `cancelled` is a
 *   cancellation. A durable owner-loss `interrupted` is status evidence with
 *   unknown execution coverage.
 */

export const HERMES_API_RUNS = Object.freeze({
  adapterId: "hermes-api-runs",
  revision: "hermes-agent@d7b836ab1c0cddaafc109ed24c9a83b6191cdc88/api-runs-v1",
  protocol: "hermes-api-server-runs",
  source: Object.freeze({
    repository: "NousResearch/hermes-agent",
    revision: "d7b836ab1c0cddaafc109ed24c9a83b6191cdc88",
    version: "v0.21.3",
    files: Object.freeze(["gateway/platforms/api_server_runs.py", "gateway/platforms/api_server.py", "gateway/platforms/api_server_run_idempotency.py"]),
  }),
  verification: "synthetic-loopback-fixture",
});

const UNSUPPORTED = (reason) => Object.freeze({ supported: false, reason });
/** What this slice does and does not do. `supported` means fixture-verified
 * against the pinned wire, never live-verified. */
export const HERMES_CAPABILITIES = Object.freeze({
  start: Object.freeze({ supported: true, note: "admission receipt only; the Host keeps its own intent" }),
  continue: Object.freeze({ supported: true, note: "only with a native session_id observed in a prior status" }),
  observe: Object.freeze({ supported: true, note: "live stream; no event id, sequence or replay" }),
  cancel: Object.freeze({ supported: true, note: "stop is an intent; only a matching terminal cancelled settles it" }),
  recover: Object.freeze({ supported: true, note: "status only; missed text and effects are not recovered" }),
  steer: UNSUPPORTED("Steering is outside the first slice."),
  approval: UNSUPPORTED("Native approvals are not granted or answered by this adapter."),
  submitToolResult: UNSUPPORTED("Hermes runs its own tool loop; there is no Host tool-result call."),
  compact: UNSUPPORTED("Compaction is not part of the run surface consumed here."),
  replay: UNSUPPORTED("The pinned stream has no replay cursor."),
});

export const HERMES_ADAPTER_LIMITS = Object.freeze({
  maxInputChars: 64 * 1024,
  maxTextChars: 1024 * 1024,
  maxDiagnostics: 32,
  maxErrorChars: 500,
});

const STATUSES = new Set(["queued", "running", "stopping", "waiting_for_approval", "completed", "failed", "cancelled", "interrupted"]);
const TERMINAL = new Set(["completed", "failed", "cancelled", "interrupted"]);
/* Well-formed native events this slice does not act on. They are recorded,
   never executed or answered, and any of them rules out a text-only success. */
const UNSUPPORTED_ACTIVITY = new Set(["approval.request", "approval.responded", "tool.started", "tool.completed", "reasoning.available", "subagent.start", "subagent.complete", "run.steered"]);
const IDEMPOTENCY_KEY = /^[\x21-\x7e]{1,255}$/;
const NATIVE_ID = /^[\w.:-]{1,128}$/;
const SESSION_ID = /^[^\x00-\x1f\x7f]{1,256}$/;

export class HermesAdapterError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "HermesAdapterError";
    this.code = code;
    Object.assign(this, extra);
  }
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const bounded = (value, limit) => (typeof value === "string" ? (value.length > limit ? `${value.slice(0, limit)}…` : value) : null);

/** A native status record, validated against the run it must describe.
 * Returns null when it does not describe that run in the pinned shape. */
export function readStatus(json, nativeRunId) {
  if (!isRecord(json) || json.run_id !== nativeRunId || typeof json.status !== "string") return null;
  const status = STATUSES.has(json.status) ? json.status : null;
  if (!status) return null;
  const terminal = TERMINAL.has(status);
  const record = {
    nativeRunId,
    nativeStatus: status,
    terminal,
    nativeSessionId: typeof json.session_id === "string" && SESSION_ID.test(json.session_id) ? json.session_id : null,
    output: typeof json.output === "string" ? json.output : null,
    error: bounded(json.error, HERMES_ADAPTER_LIMITS.maxErrorChars),
  };
  if (terminal && !consistentTerminal(status, json)) return null;
  return record;
}

/* The pinned `terminal_run_status` never puts `completed: true` beside
   `partial` or `interrupted`; a record that does is not the pinned shape. */
function consistentTerminal(status, json) {
  if (status === "completed") return json.completed !== false && json.partial !== true && json.interrupted !== true;
  if (status === "cancelled") return json.completed !== true;
  return json.completed !== true;
}

/**
 * @param {{ transport: ReturnType<import("./hermes-api-runs-transport.mjs").createHermesRunsTransport>, limits?: Partial<typeof HERMES_ADAPTER_LIMITS> }} options
 */
export function createHermesRunsAdapter({ transport, limits = {} } = {}) {
  if (!transport || typeof transport.createRun !== "function") throw new HermesAdapterError("invalid_configuration", "A Hermes runs transport is required.");
  const bounds = { ...HERMES_ADAPTER_LIMITS, ...limits };
  let disposed = false;
  const live = () => { if (disposed) throw new HermesAdapterError("disposed", "This adapter was disposed."); };

  function intent({ input, idempotencyKey, nativeSessionId = null }) {
    if (typeof input !== "string" || !input.trim() || input.length > bounds.maxInputChars)
      throw new HermesAdapterError("invalid_input", "Input must be non-empty text within the limit.");
    if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey))
      throw new HermesAdapterError("invalid_idempotency_key", "The Host must supply a 1–255 character visible-ASCII idempotency key.");
    if (nativeSessionId !== null && (typeof nativeSessionId !== "string" || !SESSION_ID.test(nativeSessionId)))
      throw new HermesAdapterError("invalid_session", "A native session id must be an observed, bounded string.");
    const body = nativeSessionId === null ? { input } : { input, session_id: nativeSessionId };
    return Object.freeze({ idempotencyKey, body: Object.freeze(body) });
  }

  async function admitWith(admission) {
    live();
    if (!Object.isFrozen(admission) || !admission?.body || typeof admission.idempotencyKey !== "string")
      throw new HermesAdapterError("invalid_intent", "Admit only an intent built by this adapter.");
    let answer;
    try {
      answer = await transport.createRun({ body: admission.body, idempotencyKey: admission.idempotencyKey });
    } catch (error) {
      const delivery = error.delivery ?? "unresolved";
      throw new HermesAdapterError(
        error.nativeCode === "idempotency_key_conflict" ? "idempotency_conflict" : delivery === "unresolved" ? "admission_unresolved" : "admission_refused",
        delivery === "unresolved"
          ? "Admission may have happened. Recover only by admitting this same intent again; never with a new key."
          : "Hermes did not admit this run.",
        { delivery, status: error.status ?? null, nativeCode: error.nativeCode ?? null, intent: admission },
      );
    }
    const json = answer.json;
    if (answer.status !== 202 || !isRecord(json) || typeof json.run_id !== "string" || !NATIVE_ID.test(json.run_id)
      || typeof json.status !== "string" || typeof json.replayed !== "boolean") {
      throw new HermesAdapterError("admission_unresolved", "The admission answer was not in the pinned shape; admission may have happened.", { delivery: "unresolved", intent: admission });
    }
    return Object.freeze({ nativeRunId: json.run_id, nativeStatus: bounded(json.status, 32), replayed: json.replayed || answer.replayedHeader, idempotencyKey: admission.idempotencyKey });
  }

  async function status(nativeRunId) {
    live();
    const answer = await transport.getRun(nativeRunId);
    const record = readStatus(answer.json, nativeRunId);
    if (!record) throw new HermesAdapterError("malformed_status", "The status did not describe this run in the pinned shape.");
    return Object.freeze(record);
  }

  /** Validate one SSE data payload for `nativeRunId`. */
  function parseEvent(data, nativeRunId) {
    let json;
    try { json = JSON.parse(data); } catch { return { diagnostic: "malformed_json" }; }
    if (!isRecord(json) || typeof json.event !== "string" || !json.event || json.event.length > 64
      || typeof json.run_id !== "string" || typeof json.timestamp !== "number" || !Number.isFinite(json.timestamp)) {
      return { diagnostic: "malformed_envelope" };
    }
    if (json.run_id !== nativeRunId) return { diagnostic: "wrong_run", event: json.event };
    if (json.event === "message.delta") {
      return typeof json.delta === "string" ? { kind: "text.delta", text: json.delta } : { diagnostic: "malformed_delta" };
    }
    const terminal = /^run\.(completed|failed|cancelled|interrupted)$/.exec(json.event);
    if (terminal) {
      const record = readStatus({ ...json, status: terminal[1] }, nativeRunId);
      return record ? { kind: "terminal", ...record } : { diagnostic: "malformed_terminal", event: json.event };
    }
    if (UNSUPPORTED_ACTIVITY.has(json.event)) return { kind: "unsupported", event: json.event };
    return { diagnostic: "unknown_event", event: json.event };
  }

  /**
   * Follow one native run's live stream to its end and settle it truthfully.
   * `onObservation` receives each validated observation as it arrives.
   * When the stream ends without a matching terminal, one status read decides
   * whether the run is known to have ended; it never recovers missed text.
   */
  async function follow(nativeRunId, { onObservation = () => {}, signal, stopRequested = false } = {}) {
    live();
    const state = {
      nativeRunId, text: "", deltaCount: 0, textBounded: false, finalOutput: null, terminal: null, terminalSource: null,
      streamCoverage: "complete", unsupported: [], diagnostics: [], diagnosticsDropped: 0, keepalives: 0, streamError: null,
    };
    const note = (diagnostic) => {
      if (state.diagnostics.length < bounds.maxDiagnostics) state.diagnostics.push(diagnostic);
      else state.diagnosticsDropped += 1;
    };
    try {
      for await (const frame of transport.events(nativeRunId, { signal })) {
        if (frame.type === "comment") { if (frame.text === "keepalive") state.keepalives += 1; continue; }
        if (state.terminal) { note({ reason: "after_terminal" }); continue; }
        const observed = parseEvent(frame.data, nativeRunId);
        if (observed.diagnostic) {
          note({ reason: observed.diagnostic, ...(observed.event ? { event: bounded(observed.event, 64) } : {}) });
          // Unreadable or foreign frames may have carried content: coverage is no longer whole.
          if (observed.diagnostic !== "unknown_event") state.streamCoverage = "gap";
          continue;
        }
        if (observed.kind === "text.delta") {
          state.deltaCount += 1;
          const room = bounds.maxTextChars - state.text.length;
          if (observed.text.length > room) { state.text += observed.text.slice(0, Math.max(0, room)); state.textBounded = true; }
          else state.text += observed.text;
        } else if (observed.kind === "unsupported") {
          if (!state.unsupported.includes(observed.event)) state.unsupported.push(observed.event);
        } else if (observed.kind === "terminal") {
          state.terminal = observed;
          state.terminalSource = "event";
        }
        onObservation(Object.freeze({ ...observed }));
      }
    } catch (error) {
      state.streamError = error.code ?? "stream_failed";
      state.streamCoverage = error.code === "stream_unavailable" ? "unavailable" : "gap";
    }
    if (!state.terminal) {
      if (state.streamCoverage === "complete") state.streamCoverage = "gap";
      try {
        const record = await status(nativeRunId);
        if (record.terminal) { state.terminal = record; state.terminalSource = "status"; }
        else state.pendingStatus = record.nativeStatus;
      } catch (error) {
        state.statusError = error.code ?? "status_failed";
      }
    }
    return settle(state, { stopRequested });
  }

  function settle(state, { stopRequested }) {
    const terminal = state.terminal;
    let outcome = "unknown";
    if (terminal) {
      if (terminal.nativeStatus === "completed") outcome = state.unsupported.length ? "unsupported_activity" : "completed";
      else if (terminal.nativeStatus === "failed") outcome = "failed";
      else if (terminal.nativeStatus === "cancelled") outcome = "cancelled";
      // `interrupted` (shutdown or owner loss): the native run stopped with
      // unknown execution coverage. It is not completion and not cancellation.
      else outcome = "unknown";
    }
    return Object.freeze({
      nativeRunId: state.nativeRunId,
      outcome,
      nativeStatus: terminal?.nativeStatus ?? state.pendingStatus ?? null,
      terminalSource: state.terminalSource,
      // Only the text actually streamed. It is never rebuilt from `output`.
      text: state.text,
      deltaCount: state.deltaCount,
      textBounded: state.textBounded,
      // The native final response, only when a terminal record returned it.
      finalOutput: terminal?.output ?? null,
      nativeSessionId: terminal?.nativeSessionId ?? null,
      error: terminal?.error ?? null,
      streamCoverage: state.streamCoverage,
      streamError: state.streamError,
      statusError: state.statusError ?? null,
      stopRequested,
      unsupported: Object.freeze([...state.unsupported]),
      diagnostics: Object.freeze(state.diagnostics.map((entry) => Object.freeze(entry))),
      diagnosticsDropped: state.diagnosticsDropped,
      keepalives: state.keepalives,
    });
  }

  const refuse = (operation) => async () => {
    throw new HermesAdapterError("unsupported", `${operation} is not supported by this adapter: ${HERMES_CAPABILITIES[operation].reason}`);
  };

  return {
    describe() {
      return Object.freeze({
        ...HERMES_API_RUNS,
        endpointIdentity: transport.endpointIdentity ?? null,
        capabilities: HERMES_CAPABILITIES,
      });
    },
    /** A new run: the exact body and the Host's key, frozen for recovery. */
    admissionIntent({ input, idempotencyKey }) {
      return intent({ input, idempotencyKey });
    },
    /** A continuation: only from a status this adapter validated for an
     * earlier run that reported its native session id. */
    continuationIntent({ input, idempotencyKey, from }) {
      if (!Object.isFrozen(from) || typeof from?.nativeRunId !== "string" || !from.nativeSessionId)
        throw new HermesAdapterError("session_unknown", "Continuation needs a native session id observed in an earlier status; none is guessed.");
      return intent({ input, idempotencyKey, nativeSessionId: from.nativeSessionId });
    },
    /** Send the intent once. An unresolved admission is recovered only by
     * calling this again with the same intent. Nothing retries on its own. */
    admit: admitWith,
    status,
    follow,
    /** Ask Hermes to stop. The answer is an intent; settle with `follow` or
     * `reconcile`. Returns `{ state }`: `stopping`, `already_terminal` (with
     * its status), `not_active`, `refused` or `unresolved`. */
    async stop(nativeRunId) {
      live();
      try {
        const answer = await transport.stopRun(nativeRunId);
        if (isRecord(answer.json) && answer.json.run_id === nativeRunId && answer.json.status === "stopping") return Object.freeze({ state: "stopping" });
        const record = readStatus(answer.json, nativeRunId);
        if (record?.terminal) return Object.freeze({ state: "already_terminal", status: Object.freeze(record) });
        return Object.freeze({ state: "unresolved" });
      } catch (error) {
        if (error.nativeCode === "run_not_active") return Object.freeze({ state: "not_active" });
        return Object.freeze({ state: error.delivery === "rejected" ? "refused" : "unresolved" });
      }
    },
    /** Status-only reconciliation, e.g. after an owner restart. Missed text
     * and effects stay missing; `interrupted` settles as unknown. */
    async reconcile(nativeRunId) {
      const record = await status(nativeRunId);
      const outcome = !record.terminal || record.nativeStatus === "interrupted" ? "unknown"
        : record.nativeStatus;
      // Status cannot show tool or approval activity, so a status-only
      // `completed` is not a text-only success claim either.
      return Object.freeze({ ...record, outcome, evidence: "status_only", textRecovered: false, activityKnown: false });
    },
    steer: refuse("steer"),
    approve: refuse("approval"),
    submitToolResult: refuse("submitToolResult"),
    compact: refuse("compact"),
    replay: refuse("replay"),
    /** Close the transport's own connections. No stop, no delete. */
    dispose() {
      if (disposed) return 0;
      disposed = true;
      return transport.close();
    },
  };
}
