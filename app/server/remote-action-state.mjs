import { createHash } from "node:crypto";

/**
 * Schema 19 · remote runtime records (P03-C Host consumer).
 *
 * A CW Session served by a remote runtime keeps three things the Pi locator
 * `hostSession={id,path}` cannot carry: the remote binding, the binding each
 * Run was admitted against, and a bounded collection of remote actions. An
 * action is either a command intent (create / input / tool_result / cancel),
 * written before the request leaves the Host, or a native tool-call claim,
 * written before the governed tool runs. Execution and delivery are separate
 * facts on a claim; an HTTP-accepted delivery is never a completed effect.
 *
 * Everything here is a pure function over the state object RuntimeStore hands
 * to `_mutate`, so uniqueness and request-hash equality are decided inside the
 * store's one serialized queue. Result bytes are not held here: a claim binds
 * the content-addressed object ArtifactHistory retains, by digest and length.
 */
export const REMOTE_RUNTIME_ID = "agents-api";
export const REMOTE_ACTION_LIMIT = 512;
export const REMOTE_CALLS_PER_RUN_LIMIT = 32;
export const REMOTE_RESULT_BYTES_LIMIT = 4 * 1024 * 1024;
export const REMOTE_RETAINED_BYTES_LIMIT = 64 * 1024 * 1024;
export const REMOTE_ARGUMENTS_BYTES_LIMIT = 16 * 1024;
export const REMOTE_ERROR_BYTES_LIMIT = 4 * 1024;

const INTENT_KINDS = new Set(["create", "input", "tool_result", "cancel"]);
const INTENT_PHASES = new Set(["pending", "accepted", "rejected", "unknown"]);
const EXECUTION_STATES = new Set(["claimed", "succeeded", "failed", "rejected", "unknown"]);
const DELIVERY_STATES = new Set(["none", "pending", "accepted", "rejected", "unknown"]);
const ROOT_TURN_ATTRIBUTIONS = new Set(["turn.created"]);
// What may close an unknown without guessing: the Run's root turn is over, or
// the service's own saved history shows the function output it was given.
const RESOLUTION_EVIDENCE = new Set(["root_terminal", "native_item"]);
const SHA256 = /^[0-9a-f]{64}$/;
const NATIVE_ID = /^[\w.:-]{1,200}$/;

export function remoteError(code, message) { const error = new Error(message); error.code = code; return error; }
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Local operation identity: stable for one (kind, Run, native turn, native
 * call), so a repeated attempt meets its own receipt instead of a new one. It
 * is 64 hex characters and doubles as the caller-owned wire request key. */
export function remoteOperationId(kind, runId, native = {}) {
  return sha256(JSON.stringify([kind, runId, native.turnId ?? null, native.callId ?? null]));
}
export function remoteCallId(native) {
  return sha256(JSON.stringify(["call", native.sessionId, native.turnId, native.callId]));
}

/* ------------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------------ */

function checker(label) {
  const check = (ok, why) => { if (!ok) throw Object.assign(new Error(`invalid runtime state: ${label} ${why}`), { code: "INVALID_STATE" }); };
  const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  return {
    check,
    exact: (value, names, why) => check(record(value) && Object.keys(value).sort().join(",") === [...names].sort().join(","), why + " has unsupported or missing fields"),
    id: (value, why) => check(typeof value === "string" && value.length > 0 && value.length <= 200, why + " is invalid"),
    native: (value, why) => check(typeof value === "string" && NATIVE_ID.test(value), why + " is invalid"),
    hash: (value, why) => check(typeof value === "string" && SHA256.test(value), why + " is invalid"),
    time: (value, why) => check(typeof value === "string" && value.length <= 80 && Number.isFinite(Date.parse(value)), why + " is invalid"),
    count: (value, why) => check(Number.isSafeInteger(value) && value >= 0, why + " is invalid"),
  };
}

function validateConnection(value, v, label) {
  v.exact(value, ["connectionId", "configHash", "configVersion", "credentialGeneration"], label);
  v.id(value.connectionId, label + ".connectionId"); v.hash(value.configHash, label + ".configHash");
  v.count(value.configVersion, label + ".configVersion"); v.count(value.credentialGeneration, label + ".credentialGeneration");
}

function validateScope(value, v, label) {
  v.exact(value, ["repositoryBindingId", "repositoryBindingRevision", "repositoryCandidateId", "repositoryCandidateRevision"], label);
  for (const [idKey, revisionKey] of [["repositoryBindingId", "repositoryBindingRevision"], ["repositoryCandidateId", "repositoryCandidateRevision"]]) {
    v.check((value[idKey] === null) === (value[revisionKey] === null), `${label}.${idKey} and its revision must be set together`);
    if (value[idKey] !== null) { v.id(value[idKey], `${label}.${idKey}`); v.count(value[revisionKey], `${label}.${revisionKey}`); }
  }
}

export function validateSessionRemoteBinding(value, session, runsById) {
  if (value === null) return;
  const v = checker("session.remoteBinding");
  v.exact(value, ["runtimeId", "bindingId", "revision", "nativeSessionId", "environment", "nativeEnvironmentId", "protocol", "connection", "origin", "createdAt"], "record");
  v.check(value.runtimeId === REMOTE_RUNTIME_ID, "runtimeId is invalid");
  v.id(value.bindingId, "bindingId"); v.check(Number.isSafeInteger(value.revision) && value.revision > 0, "revision is invalid");
  v.native(value.nativeSessionId, "nativeSessionId");
  v.check(value.environment === "none", "environment is invalid");
  v.check(value.nativeEnvironmentId === null || NATIVE_ID.test(value.nativeEnvironmentId), "nativeEnvironmentId is invalid");
  v.exact(value.protocol, ["betaHeader", "docsRevision", "sdk"], "protocol");
  for (const key of ["betaHeader", "docsRevision", "sdk"]) v.id(value.protocol[key], "protocol." + key);
  validateConnection(value.connection, v, "connection");
  v.exact(value.origin, ["sessionId", "runId"], "origin");
  v.check(value.origin.sessionId === session.id, "origin names another session");
  v.check(runsById.get(value.origin.runId)?.sessionId === session.id, "origin names a missing run");
  v.time(value.createdAt, "createdAt");
  v.check(session.hostSession === null, "cannot coexist with a Pi hostSession");
}

export function validateRunRemoteBinding(value, run) {
  if (value === null) return;
  const v = checker("run.remoteBinding");
  v.exact(value, ["bindingId", "bindingRevision", "nativeSessionId", "connection", "scope", "rootTurn"], "record");
  v.id(value.bindingId, "bindingId"); v.check(Number.isSafeInteger(value.bindingRevision) && value.bindingRevision > 0, "bindingRevision is invalid");
  v.check(value.nativeSessionId === null || NATIVE_ID.test(value.nativeSessionId), "nativeSessionId is invalid");
  validateConnection(value.connection, v, "connection");
  validateScope(value.scope, v, "scope");
  if (value.rootTurn !== null) {
    v.exact(value.rootTurn, ["turnId", "attribution", "eventId", "associatedAt"], "rootTurn");
    v.native(value.rootTurn.turnId, "rootTurn.turnId");
    v.check(ROOT_TURN_ATTRIBUTIONS.has(value.rootTurn.attribution), "rootTurn.attribution is invalid");
    v.native(value.rootTurn.eventId, "rootTurn.eventId"); v.time(value.rootTurn.associatedAt, "rootTurn.associatedAt");
    v.check(value.nativeSessionId !== null, "rootTurn needs a native session");
  }
  v.check(run.hostSession === null, "cannot coexist with a Pi hostSession");
}

/** An unknown receipt is never rewritten. Evidence observed later is appended
 * beside it, so the record still says the answer was once not known. */
function validateResolution(value, v, label) {
  if (value === null) return;
  v.exact(value, ["evidence", "nativeRef", "resolvedAt"], label);
  v.check(RESOLUTION_EVIDENCE.has(value.evidence), label + ".evidence is invalid");
  v.native(value.nativeRef, label + ".nativeRef"); v.time(value.resolvedAt, label + ".resolvedAt");
}

function validateFailure(value, v, label) {
  if (value === null) return;
  v.exact(value, ["code", "message"], label);
  v.id(value.code, label + ".code");
  v.check(typeof value.message === "string" && Buffer.byteLength(value.message) <= REMOTE_ERROR_BYTES_LIMIT, label + ".message is invalid");
}

export function validateRemoteActions(value, session, runsById) {
  const v = checker("session.remoteActions");
  v.check(Array.isArray(value) && value.length <= REMOTE_ACTION_LIMIT, "must be a bounded array");
  const ids = new Set(), callsPerRun = new Map(), rootTurns = new Set();
  let retained = 0;
  for (const action of value) {
    v.check(action && typeof action === "object", "item is invalid");
    v.hash(action.id, "id"); v.check(!ids.has(action.id), "id is not unique"); ids.add(action.id);
    v.check(runsById.get(action.runId)?.sessionId === session.id, "runId names a missing run");
    v.time(action.createdAt, "createdAt");
    if (action.kind === "call") {
      v.exact(action, ["id", "kind", "runId", "native", "tool", "argumentsJson", "argumentsSha256", "scope", "execution", "result", "delivery", "resolution", "createdAt", "executedAt"], "call");
      v.exact(action.native, ["sessionId", "turnId", "callId"], "call.native");
      for (const key of ["sessionId", "turnId", "callId"]) v.native(action.native[key], "call.native." + key);
      v.check(action.id === remoteCallId(action.native), "call id does not match its native tuple");
      v.id(action.tool, "call.tool");
      v.check(action.argumentsJson === null || (typeof action.argumentsJson === "string" && Buffer.byteLength(action.argumentsJson) <= REMOTE_ARGUMENTS_BYTES_LIMIT), "call.argumentsJson is invalid");
      v.hash(action.argumentsSha256, "call.argumentsSha256");
      v.check(action.argumentsJson === null || sha256(action.argumentsJson) === action.argumentsSha256, "call.argumentsSha256 does not match its arguments");
      validateScope(action.scope, v, "call.scope");
      v.check(EXECUTION_STATES.has(action.execution), "call.execution is invalid");
      v.exact(action.delivery, ["intentId", "state"], "call.delivery");
      v.check(DELIVERY_STATES.has(action.delivery.state), "call.delivery.state is invalid");
      v.check((action.delivery.state === "none") === (action.delivery.intentId === null), "call.delivery intent and state disagree");
      if (action.result !== null) {
        v.exact(action.result, ["success", "sha256", "bytes"], "call.result");
        v.check(typeof action.result.success === "boolean", "call.result.success is invalid");
        v.hash(action.result.sha256, "call.result.sha256");
        v.check(Number.isSafeInteger(action.result.bytes) && action.result.bytes >= 0 && action.result.bytes <= REMOTE_RESULT_BYTES_LIMIT, "call.result.bytes is invalid");
        retained += action.result.bytes;
      }
      const executed = ["succeeded", "failed", "rejected"].includes(action.execution);
      v.check(executed === (action.result !== null), "a call holds a result exactly when its execution ended");
      v.check(executed === (action.executedAt !== null), "call.executedAt is invalid"); if (executed) v.time(action.executedAt, "call.executedAt");
      v.check(action.result === null || (action.execution === "succeeded") === action.result.success, "call.result.success disagrees with its execution");
      v.check(action.delivery.state === "none" || executed, "a result is delivered only after it is retained");
      validateResolution(action.resolution, v, "call.resolution");
      v.check(action.resolution === null || action.execution === "unknown" || action.delivery.state === "unknown", "only an unknown call carries a resolution");
      callsPerRun.set(action.runId, (callsPerRun.get(action.runId) ?? 0) + 1);
      continue;
    }
    v.check(INTENT_KINDS.has(action.kind), "kind is invalid");
    v.exact(action, ["id", "kind", "runId", "requestId", "requestHash", "native", "phase", "error", "resolution", "createdAt", "settledAt"], "intent");
    v.exact(action.native, ["sessionId", "turnId", "callId"], "intent.native");
    for (const key of ["sessionId", "turnId", "callId"]) v.check(action.native[key] === null || NATIVE_ID.test(action.native[key]), "intent.native." + key + " is invalid");
    v.check(action.id === remoteOperationId(action.kind, action.runId, action.native), "intent id does not match its operation");
    // The pinned SDK has no request-identity slot for session creation.
    v.check(action.kind === "create" ? action.requestId === null && action.native.sessionId === null : action.requestId === action.id && action.native.sessionId !== null, "intent.requestId is invalid");
    v.check((action.kind === "tool_result") === (action.native.callId !== null), "intent.native.callId is invalid");
    v.hash(action.requestHash, "intent.requestHash");
    v.check(INTENT_PHASES.has(action.phase), "intent.phase is invalid");
    validateFailure(action.error, v, "intent.error");
    v.check((action.phase === "pending") === (action.settledAt === null), "an intent is settled exactly when it has settledAt");
    if (action.settledAt !== null) v.time(action.settledAt, "intent.settledAt");
    v.check(action.phase !== "accepted" || action.error === null, "an accepted intent carries no error");
    validateResolution(action.resolution, v, "intent.resolution");
    v.check(action.resolution === null || action.phase === "unknown", "only an unknown intent carries a resolution");
  }
  for (const count of callsPerRun.values()) v.check(count <= REMOTE_CALLS_PER_RUN_LIMIT, "exceeds the per-run call limit");
  v.check(retained <= REMOTE_RETAINED_BYTES_LIMIT, "exceeds the retained payload budget");
  for (const action of value) {
    if (action.kind !== "call" || action.delivery.intentId === null) continue;
    const intent = value.find(item => item.id === action.delivery.intentId);
    v.check(intent?.kind === "tool_result" && intent.runId === action.runId && intent.native.callId === action.native.callId
      && intent.phase === action.delivery.state, "call.delivery does not match its intent");
  }
  for (const run of runsById.values()) {
    const turnId = run.sessionId === session.id ? run.remoteBinding?.rootTurn?.turnId : null;
    if (!turnId) continue;
    v.check(!rootTurns.has(turnId), "two runs claim one native root turn"); rootTurns.add(turnId);
  }
}

/* ------------------------------------------------------------------------ *
 * Facts
 * ------------------------------------------------------------------------ */

/** An action whose remote or local outcome the Host cannot state. It blocks
 * new remote work on the Session; nothing here ever resolves it by guessing. */
export function remoteActionUnresolved(action) {
  if (action.kind !== "call") return action.phase === "pending" || (action.phase === "unknown" && action.resolution === null);
  return action.execution === "claimed" || action.delivery.state === "pending"
    || ((action.execution === "unknown" || action.delivery.state === "unknown") && action.resolution === null);
}

export function sessionUsesRemoteRuntime(session) {
  return session.remoteBinding !== null || session.remoteActions.length > 0;
}

function retainedBytes(session) {
  return session.remoteActions.reduce((total, action) => total + (action.kind === "call" && action.result ? action.result.bytes : 0), 0);
}

function requireOpenRun(state, runId, activeStatuses) {
  const run = state.runs.find(item => item.id === runId);
  if (!run) throw new Error("run not found");
  if (!run.remoteBinding) throw remoteError("REMOTE_BINDING_MISSING", "run was not admitted against a remote binding");
  const session = state.sessions.find(item => item.id === run.sessionId);
  if (!run.admissionOpen || !activeStatuses.has(run.status)) throw remoteError("RUN_CLOSED", "run admission is closed");
  return { run, session };
}

/* ------------------------------------------------------------------------ *
 * Transitions (called inside RuntimeStore._mutate)
 * ------------------------------------------------------------------------ */

/** Admission: the binding a new Run would be frozen against. */
export function admitRemoteRun(session, remote) {
  if (remote === null) {
    if (sessionUsesRemoteRuntime(session)) throw remoteError("RUNTIME_MISMATCH", "this session belongs to a remote runtime");
    return null;
  }
  if (session.hostSession !== null) throw remoteError("RUNTIME_MISMATCH", "this session belongs to the Pi runtime");
  if (session.remoteActions.some(remoteActionUnresolved)) throw remoteError("REMOTE_UNRECONCILED", "a remote action of this session is unresolved");
  // A Run needs room for its own input and cancel intents before it starts.
  if (session.remoteActions.length + 2 > REMOTE_ACTION_LIMIT) throw remoteError("REMOTE_ACTION_LIMIT", "remote action history is full");
  const bound = session.remoteBinding;
  if (bound) {
    if (remote.expectedBindingId !== bound.bindingId || remote.expectedBindingRevision !== bound.revision) throw remoteError("REMOTE_BINDING_CHANGED", "remote binding changed during run admission");
    for (const key of ["connectionId", "configHash", "credentialGeneration"]) {
      if (remote.connection[key] !== bound.connection[key]) throw remoteError("REMOTE_BINDING_MISMATCH", "the remote binding was created under another connection, configuration or credential");
    }
  } else if (remote.expectedBindingId !== null) throw remoteError("REMOTE_BINDING_CHANGED", "remote binding changed during run admission");
  return {
    bindingId: bound?.bindingId ?? remote.newBindingId, bindingRevision: bound?.revision ?? 1,
    nativeSessionId: bound?.nativeSessionId ?? null, connection: structuredClone(remote.connection),
    scope: structuredClone(remote.scope), rootTurn: null,
  };
}

export function recordRemoteIntent(state, runId, { kind, requestHash, native = {} }, { now, activeStatuses }) {
  const { run, session } = requireOpenRun(state, runId, activeStatuses);
  const tuple = { sessionId: kind === "create" ? null : run.remoteBinding.nativeSessionId, turnId: native.turnId ?? null, callId: native.callId ?? null };
  const id = remoteOperationId(kind, runId, tuple);
  const existing = session.remoteActions.find(item => item.id === id);
  if (existing) {
    if (existing.requestHash !== requestHash) throw remoteError("REMOTE_INTENT_CONFLICT", "this remote operation was already recorded with a different request");
    return { intent: structuredClone(existing), idempotent: true };
  }
  if (session.remoteActions.length >= REMOTE_ACTION_LIMIT) throw remoteError("REMOTE_ACTION_LIMIT", "remote action history is full");
  const intent = { id, kind, runId, requestId: kind === "create" ? null : id, requestHash, native: tuple, phase: "pending", error: null, resolution: null, createdAt: now, settledAt: null };
  session.remoteActions.push(intent);
  return { intent: structuredClone(intent), idempotent: false };
}

export function settleRemoteIntent(state, runId, intentId, { phase, error = null }, { now }) {
  const run = state.runs.find(item => item.id === runId);
  const session = state.sessions.find(item => item.id === run?.sessionId);
  const intent = session?.remoteActions.find(item => item.id === intentId && item.kind !== "call");
  if (!intent) throw remoteError("REMOTE_INTENT_NOT_FOUND", "remote intent is unavailable");
  // A settled receipt is immutable; a later answer never overwrites it.
  if (intent.phase !== "pending") return structuredClone(intent);
  if (!["accepted", "rejected", "unknown"].includes(phase)) throw remoteError("INVALID_STATUS", "remote intent phase is invalid");
  intent.phase = phase; intent.settledAt = now; intent.error = phase === "accepted" ? null : structuredClone(error);
  const call = session.remoteActions.find(item => item.kind === "call" && item.delivery.intentId === intent.id);
  if (call) call.delivery.state = phase;
  return structuredClone(intent);
}

/** Creation answered: the create intent, the Session binding and the Run's
 * frozen copy change in one write, so none can exist without the others. */
export function bindRemoteSession(state, runId, intentId, { nativeSessionId, nativeEnvironmentId = null, protocol }, { now, activeStatuses }) {
  const { run, session } = requireOpenRun(state, runId, activeStatuses);
  if (session.remoteBinding) throw remoteError("REMOTE_BINDING_CHANGED", "this session already has a remote binding");
  const intent = session.remoteActions.find(item => item.id === intentId && item.kind === "create" && item.runId === runId);
  if (!intent || intent.phase !== "pending") throw remoteError("REMOTE_INTENT_NOT_FOUND", "the creation intent is not pending");
  intent.phase = "accepted"; intent.settledAt = now;
  session.remoteBinding = {
    runtimeId: REMOTE_RUNTIME_ID, bindingId: run.remoteBinding.bindingId, revision: run.remoteBinding.bindingRevision,
    nativeSessionId, environment: "none", nativeEnvironmentId, protocol: structuredClone(protocol),
    connection: structuredClone(run.remoteBinding.connection), origin: { sessionId: session.id, runId }, createdAt: now,
  };
  run.remoteBinding.nativeSessionId = nativeSessionId;
  return structuredClone(session.remoteBinding);
}

export function associateRemoteRootTurn(state, runId, { turnId, attribution, eventId }, { now, activeStatuses }) {
  const { run, session } = requireOpenRun(state, runId, activeStatuses);
  if (run.remoteBinding.nativeSessionId === null) throw remoteError("REMOTE_BINDING_MISSING", "the run has no native session yet");
  if (run.remoteBinding.rootTurn) return { rootTurn: structuredClone(run.remoteBinding.rootTurn), associated: run.remoteBinding.rootTurn.turnId === turnId };
  // A turn another Run of this Session already owns is history, not this Run.
  if (state.runs.some(item => item.sessionId === session.id && item.remoteBinding?.rootTurn?.turnId === turnId)) return { rootTurn: null, associated: false };
  run.remoteBinding.rootTurn = { turnId, attribution, eventId, associatedAt: now };
  return { rootTurn: structuredClone(run.remoteBinding.rootTurn), associated: true };
}

/** Claim a native call before anything runs. One native tuple has one claim:
 * a repeat with the same request meets the receipt, a different one is refused. */
export function claimRemoteCall(state, runId, { native, tool, argumentsJson, argumentsSha256 }, { now, activeStatuses }) {
  const id = remoteCallId(native);
  const owner = state.runs.find(item => item.id === runId);
  const existing = state.sessions.find(item => item.id === owner?.sessionId)?.remoteActions.find(item => item.id === id);
  if (existing) {
    if (existing.tool !== tool || existing.argumentsSha256 !== argumentsSha256) throw remoteError("REMOTE_CALL_CONFLICT", "this native call was already claimed with a different request");
    return { call: structuredClone(existing), idempotent: true };
  }
  const { run, session } = requireOpenRun(state, runId, activeStatuses);
  if (native.sessionId !== run.remoteBinding.nativeSessionId) throw remoteError("REMOTE_BINDING_MISMATCH", "the call names another native session");
  if (session.remoteActions.filter(item => item.kind === "call" && item.runId === runId).length >= REMOTE_CALLS_PER_RUN_LIMIT) throw remoteError("REMOTE_CALL_LIMIT", "this run reached its native call limit");
  // Reserve the claim, its delivery intent and the largest result it may keep.
  if (session.remoteActions.length + 2 > REMOTE_ACTION_LIMIT) throw remoteError("REMOTE_ACTION_LIMIT", "remote action history is full");
  if (retainedBytes(session) + REMOTE_RESULT_BYTES_LIMIT > REMOTE_RETAINED_BYTES_LIMIT) throw remoteError("REMOTE_RETAINED_LIMIT", "remote result retention budget is exhausted");
  const call = {
    id, kind: "call", runId, native: structuredClone(native), tool, argumentsJson, argumentsSha256,
    scope: structuredClone(run.remoteBinding.scope), execution: "claimed", result: null,
    delivery: { intentId: null, state: "none" }, resolution: null, createdAt: now, executedAt: null,
  };
  session.remoteActions.push(call);
  return { call: structuredClone(call), idempotent: false };
}

export function retainRemoteCallResult(state, runId, callId, { execution, result }, { now }) {
  const run = state.runs.find(item => item.id === runId);
  const call = state.sessions.find(item => item.id === run?.sessionId)?.remoteActions.find(item => item.id === callId && item.kind === "call" && item.runId === runId);
  if (!call) throw remoteError("REMOTE_CALL_NOT_FOUND", "remote call claim is unavailable");
  if (call.execution !== "claimed") return structuredClone(call);
  if (!["succeeded", "failed", "rejected"].includes(execution) || (execution === "succeeded") !== result.success) throw remoteError("INVALID_STATUS", "remote call execution state is invalid");
  call.execution = execution; call.executedAt = now;
  call.result = { success: result.success, sha256: result.sha256, bytes: result.bytes };
  return structuredClone(call);
}

/** The submission intent and the claim's delivery state are one write. */
export function beginRemoteCallDelivery(state, runId, callId, { now, activeStatuses }) {
  const { session } = requireOpenRun(state, runId, activeStatuses);
  const call = session.remoteActions.find(item => item.id === callId && item.kind === "call" && item.runId === runId);
  if (!call?.result) throw remoteError("REMOTE_CALL_NOT_FOUND", "no retained result to deliver");
  if (call.delivery.state !== "none") return { call: structuredClone(call), idempotent: true };
  const requestHash = sha256(JSON.stringify([call.native.turnId, call.native.callId, call.result.success, call.result.sha256, call.result.bytes]));
  const { intent } = recordRemoteIntent(state, runId, { kind: "tool_result", requestHash, native: call.native }, { now, activeStatuses });
  call.delivery = { intentId: intent.id, state: "pending" };
  return { call: structuredClone(call), intent, idempotent: false };
}

/** Startup fence: what was in flight when the Host stopped is unknown. Nothing
 * is re-read, re-run or re-sent to find out. */
export function fenceRemoteActionsForRestart(state, { now }) {
  let fenced = 0;
  for (const session of state.sessions) {
    for (const action of session.remoteActions) {
      if (action.kind === "call") { if (action.execution === "claimed") { action.execution = "unknown"; fenced += 1; } continue; }
      if (action.phase !== "pending") continue;
      action.phase = "unknown"; action.settledAt = now;
      action.error = { code: "restart_unknown", message: "The Host stopped before this remote request was answered" };
      const call = session.remoteActions.find(item => item.kind === "call" && item.delivery.intentId === action.id);
      if (call) call.delivery.state = "unknown";
      fenced += 1;
    }
  }
  return fenced;
}
