import { deriveUsageDetails } from "./usage-details.mjs";
import { mkdir, readFile, readdir, rename, unlink, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { acquireRuntimeLock } from "./runtime-lock.mjs";
import { deriveWorkMetrics } from "./work-metrics.mjs";
import { deriveWorkSummary } from "./work-summary.mjs";
import { maybeCrash } from "../runtime/test-hooks.mjs";
import { emptyCoordination, validateCoordination } from '../harness/coordination-state.mjs';
import { validateAsyncTasks } from './async-task-state.mjs';
import {
  assertProviderApi,
  assertProviderBaseUrl,
  assertProviderModelId,
  PROVIDER_API_FORMATS,
  validateProviderModels,
} from './provider-fields.mjs';

const ACTIVE_STATUSES = new Set(["running", "waiting_user", "stopping"]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed", "unknown"]);
const RUN_STATUSES = new Set([...ACTIVE_STATUSES, ...TERMINAL_STATUSES]);
const PERMISSION_MODES = new Set(["read_only", "draft", "ask"]);
// "cancelled" closes a question whose run ended before anyone answered it, so
// no question is left pending against a finished run and a late answer has a
// recorded reason to be refused.
const QUESTION_STATUSES = new Set(["pending", "resolved", "expired_restart", "cancelled"]);
const QUESTION_KINDS = new Set(["ask_user", "permission"]);
const DECISIONS = new Set(["allow", "deny"]);
const ARTIFACT_KIND = "content-version";
const SCHEMA_VERSION = 12;
const STATE_KEYS = new Set([
  "schemaVersion", "projects", "sessions", "runs", "events", "questions", "providerConfig", "extensionRecords",
  "credentialGeneration", "asyncTasks", "coordination", "providerConnections", "providerConfigurationPending",
  "providerConfigVersion", "providerVerifications",
]);

function now() { return new Date().toISOString(); }

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION, projects: [], sessions: [], runs: [], events: [], questions: [],
    providerConfig: null, extensionRecords: [], credentialGeneration: 0, asyncTasks: [], coordination: emptyCoordination(),
    providerConnections: [], providerConfigurationPending: [], providerConfigVersion: 0, providerVerifications: [],
  };
}

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

function invalidState(detail) {
  const error = new Error("invalid runtime state: " + detail);
  error.code = "INVALID_STATE";
  return error;
}

function assert(condition, detail) { if (!condition) throw invalidState(detail); }

function exactKeys(value, expected, label) {
  assert(isRecord(value), label + " must be an object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), label + " has unsupported or missing fields");
}

function id(value, label) { assert(typeof value === "string" && value.length > 0 && value.length <= 200, label + " is invalid"); }
function text(value, label, max = 100_000) { assert(typeof value === "string" && value.length <= max, label + " is invalid"); }
function timestamp(value, label) { text(value, label, 80); assert(!Number.isNaN(Date.parse(value)), label + " is invalid"); }
function nonNegativeInt(value, label) { assert(Number.isSafeInteger(value) && value >= 0, label + " is invalid"); }
function sha256Hex(value, label) { assert(typeof value === "string" && /^[0-9a-f]{64}$/.test(value), label + " is invalid"); }

function validateDescriptor(value, label, { allowRealProvider = false, schema = SCHEMA_VERSION, legacy = false } = {}) {
  assert(isRecord(value), label + " must be an object");
  // Only a RUN descriptor carries connection provenance: it is a record of what
  // one run actually used, not part of the editable configuration pointer.
  const provenance = allowRealProvider && schema >= 10 ? ["connectionId", "credentialSource", "contextWindowSource", "capabilityNotice"] : [];
  const allowed = new Set(["provider", "model", "api", ...(allowRealProvider ? ["realProvider"] : []), "baseUrl", ...(schema >= 7 ? ["reasoningEffort"] : []), ...provenance]);
  assert(Object.keys(value).every((key) => allowed.has(key)), label + " has unsupported fields");
  id(value.provider, label + ".provider");
  if (schema >= SCHEMA_VERSION && !legacy) {
    try { assertProviderModelId(value.model); }
    catch { throw invalidState(label + ".model is invalid"); }
    try { assertProviderApi(value.api, PROVIDER_API_FORMATS); }
    catch { throw invalidState(label + ".api is invalid"); }
  } else {
    // Preserve historical descriptors without normalization. Schema10 also
    // admits the HTTP 240/2048 limits that its old reader incorrectly capped
    // at 200. New writes take the strict branch; Host admission rechecks them.
    text(value.model, label + ".model", schema >= 10 ? 240 : 200);
    assert(value.model.length > 0, label + ".model is invalid");
    id(value.api, label + ".api");
  }
  if (value.baseUrl !== undefined) {
    if (schema >= SCHEMA_VERSION && !legacy) {
      try { assertProviderBaseUrl(value.baseUrl); }
      catch { throw invalidState(label + ".baseUrl is invalid"); }
    } else {
      text(value.baseUrl, label + ".baseUrl", schema >= 10 ? 2048 : 200);
      let parsed;
      try { parsed = new URL(value.baseUrl); } catch { throw invalidState(label + ".baseUrl is invalid"); }
      assert(["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash, label + ".baseUrl is invalid");
    }
  }
  if (value.reasoningEffort !== undefined) assert(["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(value.reasoningEffort), label + ".reasoningEffort is invalid");
  if (allowRealProvider) assert(typeof value.realProvider === "boolean", label + ".realProvider is invalid");
  if (value.connectionId !== undefined) id(value.connectionId, label + ".connectionId");
  if (value.credentialSource !== undefined && value.credentialSource !== null) id(value.credentialSource, label + ".credentialSource");
  if (value.contextWindowSource !== undefined) assert(["catalog", "user", "unknown"].includes(value.contextWindowSource), label + ".contextWindowSource is invalid");
  if (value.capabilityNotice !== undefined && value.capabilityNotice !== null) text(value.capabilityNotice, label + ".capabilityNotice", 200);
}

/** BE-39's classification honesty (PV-62 ①, revised by the PV-84 patch): a
 * receipt's `status` is set only from a STRUCTURED signal -- `stopReason`,
 * this host's own timeout, or `httpStatus` (below) -- never a regex over
 * prose. Under pi-coding-agent 0.85.1, `ok`, `timeout`, `authentication_failed`,
 * `http_error`, `unreachable`, `malformed_response` and `unknown` are all
 * reachable this way; `model_not_found` stays unreachable because the
 * transport-level hook that supplies `httpStatus` carries no body (see
 * `classifyVerifyOutcome` in `app/runtime/pi-session-runtime.mjs` for the
 * exact judgement and its file:line evidence). The persisted shape keeps the
 * full contract enum regardless, so a future pi version that exposes more
 * structure does not require a schema bump to use it. */
const VERIFY_STATUSES = new Set([
  "ok", "authentication_failed", "model_not_found", "unreachable", "timeout", "http_error", "malformed_response", "unknown",
]);
/** A verify receipt (PV-42/62): the most recent connection/model probe,
 * bound to the configuration and credential epoch it was actually run
 * against. One per connection id; a newer probe replaces the old one
 * outright (`setProviderVerification`), it does not accumulate history. */
function validateVerifications(value) {
  assert(Array.isArray(value), "providerVerifications must be an array");
  const seen = new Set();
  for (const record of value) {
    exactKeys(record, new Set([
      "connectionId", "model", "status", "message", "observedModel", "replyFirstLine",
      "latencyMs", "checkedAt", "credentialSource", "binding", "httpStatus",
    ]), "providerVerification");
    id(record.connectionId, "providerVerification.connectionId");
    assert(!seen.has(record.connectionId), "providerVerification.connectionId is not unique"); seen.add(record.connectionId);
    try { assertProviderModelId(record.model); } catch { throw invalidState("providerVerification.model is invalid"); }
    assert(VERIFY_STATUSES.has(record.status), "providerVerification.status is invalid");
    assert(record.httpStatus === null || (Number.isSafeInteger(record.httpStatus) && record.httpStatus >= 100 && record.httpStatus <= 599), "providerVerification.httpStatus is invalid");
    text(record.message, "providerVerification.message", 4000);
    if (record.observedModel !== null) text(record.observedModel, "providerVerification.observedModel", 240);
    if (record.replyFirstLine !== null) text(record.replyFirstLine, "providerVerification.replyFirstLine", 400);
    nonNegativeInt(record.latencyMs, "providerVerification.latencyMs");
    timestamp(record.checkedAt, "providerVerification.checkedAt");
    if (record.credentialSource !== null) id(record.credentialSource, "providerVerification.credentialSource");
    assert(isRecord(record.binding), "providerVerification.binding must be an object");
    exactKeys(record.binding, new Set(["providerConfigVersion", "credentialGeneration"]), "providerVerification.binding");
    nonNegativeInt(record.binding.providerConfigVersion, "providerVerification.binding.providerConfigVersion");
    nonNegativeInt(record.binding.credentialGeneration, "providerVerification.binding.credentialGeneration");
  }
}

const CONFIGURATION_OPERATIONS = new Set(['connection_save', 'connection_delete', 'credential_set', 'credential_delete']);
function validatePending(value) {
  assert(Array.isArray(value), 'providerConfigurationPending must be an array');
  const seen = new Set();
  for (const item of value) {
    exactKeys(item, new Set(['connectionId', 'operation']), 'providerConfigurationPending item');
    id(item.connectionId, 'providerConfigurationPending.connectionId');
    assert(!seen.has(item.connectionId), 'duplicate pending connection'); seen.add(item.connectionId);
    assert(CONFIGURATION_OPERATIONS.has(item.operation), 'invalid pending configuration operation');
  }
}

function validateBinding(value, label) {
  assert(isRecord(value), label + " must be an object");
  assert(Object.keys(value).every((key) => key.length <= 100), label + " has invalid keys");
}

function validateHostSession(value, label) {
  if (value === null) return;
  exactKeys(value, new Set(["id", "path"]), label);
  id(value.id, label + ".id");
  text(value.path, label + ".path", 4000);
}

function validateUsage(value, label) {
  exactKeys(value, new Set(["input", "output", "cacheRead", "cacheWrite", "turns", "missing"]), label);
  nonNegativeInt(value.input, label + ".input");
  nonNegativeInt(value.output, label + ".output");
  nonNegativeInt(value.cacheRead, label + ".cacheRead");
  nonNegativeInt(value.cacheWrite, label + ".cacheWrite");
  nonNegativeInt(value.turns, label + ".turns");
  assert(typeof value.missing === "boolean", label + ".missing is invalid");
}

/** An artifact record is a CONTENT VERSION: the bytes as they were written at
 * one instant, addressed by sha256. It is never a handle on the mutable path,
 * which only GET workspace/file resolves (kind "current"). */
function validateArtifact(value, label) {
  exactKeys(value, new Set(["path", "bytes", "sha256", "kind", "writtenAt"]), label);
  text(value.path, label + ".path", 4000);
  nonNegativeInt(value.bytes, label + ".bytes");
  sha256Hex(value.sha256, label + ".sha256");
  assert(value.kind === ARTIFACT_KIND, label + ".kind must be " + ARTIFACT_KIND);
  timestamp(value.writtenAt, label + ".writtenAt");
}

function validateState(parsed, schema = SCHEMA_VERSION, { legacyDescriptors = true } = {}) {
  assert(isRecord(parsed), "state must be an object");
  assert(parsed.schemaVersion === schema, `schemaVersion ${JSON.stringify(parsed.schemaVersion)} is not supported (this build requires ${SCHEMA_VERSION}; only validated schema 3, 4, 5, 6, 7, 8, 9, 10 or 11 can be upgraded)`);
  exactKeys(parsed, new Set([...STATE_KEYS].filter(k => (schema >= 5 || k !== 'asyncTasks') && (schema >= 8 || k !== 'coordination') && (schema >= 10 || k !== 'providerConnections') && (schema >= 11 || k !== 'providerConfigurationPending') && (schema >= 12 || (k !== 'providerConfigVersion' && k !== 'providerVerifications')))), "state");
  for (const key of ["projects", "sessions", "runs", "events", "questions", "extensionRecords"]) {
    assert(Array.isArray(parsed[key]), key + " must be an array");
  }
  const projectIds = new Set();
  for (const project of parsed.projects) {
    exactKeys(project, new Set(["id", "name", "createdAt"]), "project");
    id(project.id, "project.id"); assert(!projectIds.has(project.id), "duplicate project id"); projectIds.add(project.id);
    text(project.name, "project.name", 200); timestamp(project.createdAt, "project.createdAt");
  }
  const sessionIds = new Set();
  for (const session of parsed.sessions) {
    exactKeys(session, new Set(["id", "projectId", "title", "draft", "extensionBinding", "createdAt", "_nextSeq", "workspaceDir", "permissionMode", "hostSession", ...(schema >= 6 ? ['scope'] : [])]), "session");
    id(session.id, "session.id"); assert(!sessionIds.has(session.id), "duplicate session id"); sessionIds.add(session.id);
    if (schema >= 6 && session.scope === 'global') {
      assert(session.projectId === null && session.extensionBinding === null, 'global session cannot own a project or Matter binding');
    } else {
      assert(schema < 6 || session.scope === 'project', 'session scope is invalid');
      assert(projectIds.has(session.projectId), "session references missing project");
    }
    text(session.title, "session.title", 200); text(session.draft, "session.draft", 100_000); timestamp(session.createdAt, "session.createdAt");
    assert(Number.isSafeInteger(session._nextSeq) && session._nextSeq >= 0, "session._nextSeq is invalid");
    text(session.workspaceDir, "session.workspaceDir", 4000);
    assert(PERMISSION_MODES.has(session.permissionMode), "session.permissionMode is invalid");
    validateHostSession(session.hostSession, "session.hostSession");
    if (session.extensionBinding !== null) {
      exactKeys(session.extensionBinding, new Set(["extensionId", "binding"]), "session.extensionBinding");
      id(session.extensionBinding.extensionId, "extensionBinding.extensionId"); validateBinding(session.extensionBinding.binding, "extensionBinding.binding");
    }
  }
  const runIds = new Set();
  const commandKeys = new Set();
  for (const run of parsed.runs) {
    exactKeys(run, new Set([
      "id", "sessionId", "status", "admissionOpen", "adapterId", "provider", "extension",
      "startedAt", "endedAt", "error", "commandId", "artifacts", "usage", "hostSession", "credentialGeneration",
      ...(schema >= 9 ? ["supersedes"] : []),
    ]), "run");
    id(run.id, "run.id"); assert(!runIds.has(run.id), "duplicate run id"); runIds.add(run.id);
    assert(sessionIds.has(run.sessionId), "run references missing session");
    assert(RUN_STATUSES.has(run.status), "run.status is invalid"); assert(typeof run.admissionOpen === "boolean", "run.admissionOpen is invalid");
    id(run.adapterId, "run.adapterId"); validateDescriptor(run.provider, "run.provider", { allowRealProvider: true, schema, legacy: legacyDescriptors });
    if (run.extension !== null) {
      exactKeys(run.extension, new Set(["id", "version", "generation"]), "run.extension");
      id(run.extension.id, "run.extension.id"); id(run.extension.version, "run.extension.version");
      assert(Number.isSafeInteger(run.extension.generation) && run.extension.generation >= 0, "run.extension.generation is invalid");
    }
    timestamp(run.startedAt, "run.startedAt"); assert(run.endedAt === null || typeof run.endedAt === "string", "run.endedAt is invalid");
    if (run.endedAt !== null) timestamp(run.endedAt, "run.endedAt");
    if (run.error !== null && run.error !== undefined) {
      exactKeys(run.error, new Set(["code", "message"]), "run.error"); id(run.error.code, "run.error.code"); text(run.error.message, "run.error.message", 4000);
    }
    id(run.commandId, "run.commandId");
    const commandKey = run.sessionId + " " + run.commandId;
    assert(!commandKeys.has(commandKey), "duplicate commandId within session");
    commandKeys.add(commandKey);
    assert(Array.isArray(run.artifacts), "run.artifacts must be an array");
    for (const artifact of run.artifacts) validateArtifact(artifact, "run.artifact");
    validateUsage(run.usage, "run.usage");
    validateHostSession(run.hostSession, "run.hostSession");
    nonNegativeInt(run.credentialGeneration, "run.credentialGeneration");
  }
  // Lineage is validated after every Run is known, because a superseding Run
  // may be stored before its target. A stored link must still name a
  // terminated Run of the SAME Session: a file that lost that guarantee is a
  // corrupt ledger, not a recoverable state, so the host fails closed.
  if (schema >= 9) {
    const runsById = new Map(parsed.runs.map((run) => [run.id, run]));
    for (const run of parsed.runs) {
      assert(run.supersedes === null || typeof run.supersedes === "string", "run.supersedes is invalid");
      if (run.supersedes === null) continue;
      const target = runsById.get(run.supersedes);
      assert(target && target.sessionId === run.sessionId, "run.supersedes does not name a Run of the same session");
      assert(TERMINAL_STATUSES.has(target.status), "run.supersedes names a Run that has not ended");
    }
  }
  const eventSeq = new Map();
  for (const event of parsed.events) {
    exactKeys(event, new Set(["seq", "runId", "sessionId", "type", "data"]), "event");
    assert(Number.isSafeInteger(event.seq) && event.seq > 0, "event.seq is invalid");
    assert(sessionIds.has(event.sessionId) && runIds.has(event.runId), "event references missing record");
    const run = parsed.runs.find((candidate) => candidate.id === event.runId);
    assert(run?.sessionId === event.sessionId, "event run/session mismatch");
    text(event.type, "event.type", 80); assert(isRecord(event.data), "event.data must be an object");
    const previous = eventSeq.get(event.sessionId) ?? 0; assert(event.seq === previous + 1, "event sequence is not contiguous"); eventSeq.set(event.sessionId, event.seq);
  }
  for (const session of parsed.sessions) assert(session._nextSeq === (eventSeq.get(session.id) ?? 0), "session sequence does not match events");
  const questionIds = new Set();
  for (const question of parsed.questions) {
    exactKeys(question, new Set(["id", "runId", "kind", "prompt", "payload", "status", "answer", "decision", "createdAt"]), "question");
    id(question.id, "question.id"); assert(!questionIds.has(question.id), "duplicate question id"); questionIds.add(question.id);
    assert(runIds.has(question.runId), "question references missing run"); text(question.prompt, "question.prompt", 4000);
    assert(QUESTION_KINDS.has(question.kind), "question.kind is invalid");
    assert(QUESTION_STATUSES.has(question.status), "question.status is invalid");
    assert(question.answer === null || typeof question.answer === "string", "question.answer is invalid"); if (question.answer !== null) text(question.answer, "question.answer", 4000);
    assert(question.decision === null || DECISIONS.has(question.decision), "question.decision is invalid");
    if (question.kind === "ask_user") {
      assert(question.payload === null, "ask_user question.payload must be null");
    } else {
      // A permission is bound to one tool call and to the exact bytes it
      // would write, so an approval cannot be replayed onto a later call.
      exactKeys(question.payload, new Set(["toolCallId", "tool", "path", "bytes", "contentSha256", "preview"]), "question.payload");
      id(question.payload.toolCallId, "question.payload.toolCallId");
      id(question.payload.tool, "question.payload.tool");
      text(question.payload.path, "question.payload.path", 4000);
      nonNegativeInt(question.payload.bytes, "question.payload.bytes");
      sha256Hex(question.payload.contentSha256, "question.payload.contentSha256");
      text(question.payload.preview, "question.payload.preview", 400);
    }
    timestamp(question.createdAt, "question.createdAt");
  }
  nonNegativeInt(parsed.credentialGeneration, "state.credentialGeneration");
  if (parsed.providerConfig !== null) validateDescriptor(parsed.providerConfig, "providerConfig", { schema, legacy: legacyDescriptors });
  for (const record of parsed.extensionRecords) assert(isRecord(record), "extension record is invalid");
  if (schema >= 5) validateAsyncTasks(parsed.asyncTasks, parsed);
  if (schema >= 8) validateCoordination(parsed.coordination);
  if (schema >= 10) validateConnections(parsed.providerConnections, { historical: true, schema });
  if (schema >= 11) validatePending(parsed.providerConfigurationPending);
  if (schema >= 12) {
    nonNegativeInt(parsed.providerConfigVersion, "state.providerConfigVersion");
    validateVerifications(parsed.providerVerifications);
  }
  return structuredClone(parsed);
}

/** A connection is the persisted unit of provider identity: one endpoint, one
 * wire format, one model list, one credential key. `credentialStatus` is NOT
 * stored here — the credential file is its only source of truth. `schema`
 * gates the `reasoning` tri-state field (PV-61), added in schema 12: reading
 * an older validated state never requires a field that version did not have. */
function validateConnections(value, { historical = false, schema = SCHEMA_VERSION } = {}) {
  assert(Array.isArray(value), "providerConnections must be an array");
  const ids = new Set();
  const identities = new Set();
  const modelKeys = schema >= 12 ? ["id", "contextWindow", "reasoning"] : ["id", "contextWindow"];
  for (const connection of value) {
    exactKeys(connection, new Set(["id", "kind", "providerIdentity", "api", "baseUrl", "models"]), "providerConnection");
    id(connection.id, "providerConnection.id");
    assert(["catalog", "compatible"].includes(connection.kind), "providerConnection.kind is invalid");
    id(connection.providerIdentity, "providerConnection.providerIdentity");
    try { if (historical) id(connection.api, "providerConnection.api"); else assertProviderApi(connection.api, PROVIDER_API_FORMATS); }
    catch { throw invalidState("providerConnection.api is invalid"); }
    assert(!ids.has(connection.id), "providerConnection.id is not unique");
    assert(!identities.has(connection.providerIdentity), "providerConnection.providerIdentity is not unique");
    ids.add(connection.id); identities.add(connection.providerIdentity);
    if (connection.baseUrl !== null) {
      try { if (historical) {
        text(connection.baseUrl, "providerConnection.baseUrl", 2048);
        const url = new URL(connection.baseUrl);
        assert(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash, "providerConnection.baseUrl is invalid");
      } else assertProviderBaseUrl(connection.baseUrl); }
      catch { throw invalidState("providerConnection.baseUrl is invalid"); }
    }
    assert(Array.isArray(connection.models), "providerConnection.models must be an array");
    for (const model of connection.models) {
      exactKeys(model, new Set(modelKeys), "providerConnection.model");
      assert(model.contextWindow !== undefined, "providerConnection.model.contextWindow is invalid");
      if (schema >= 12) assert(model.reasoning !== undefined, "providerConnection.model.reasoning is invalid");
    }
    try {
      if (historical) {
        const seen = new Set();
        for (const model of connection.models) {
          text(model.id, "providerConnection.model.id", 240);
          assert(model.id.length > 0 && !seen.has(model.id), "providerConnection.model.id is invalid or duplicate"); seen.add(model.id);
          assert(model.contextWindow === null || (Number.isSafeInteger(model.contextWindow) && model.contextWindow > 0), "providerConnection.model.contextWindow is invalid");
          if (schema >= 12) assert(model.reasoning === null || typeof model.reasoning === "boolean", "providerConnection.model.reasoning is invalid");
        }
      } else validateProviderModels(connection.models, { allowEmpty: true });
    } catch (error) {
      // Keep the state boundary's stable diagnostic paths while sharing the
      // public model-ID/count/contextWindow domain with HTTP input.
      if (error?.field === "modelId") throw invalidState("providerConnection.model.id is invalid");
      if (error?.field === "contextWindow") throw invalidState("providerConnection.model.contextWindow is invalid");
      if (error?.field === "reasoning") throw invalidState("providerConnection.model.reasoning is invalid");
      if (error?.message === "model ids must be unique") throw invalidState("providerConnection.model.id is not unique");
      throw invalidState(error?.message === "models must be a non-empty list"
        ? "providerConnection.models is invalid"
        : "providerConnection.model is invalid");
    }
    assert(connection.kind !== "compatible" || (connection.baseUrl !== null && connection.models.length > 0), "a compatible connection requires a baseUrl and at least one model");
  }
}

function publicSession(session) {
  if (!session) return null;
  const { _nextSeq, ...result } = session;
  return structuredClone(result);
}
function publicRun(run) { return run ? structuredClone(run) : null; }

function appendEventToState(state, { runId, sessionId, type, data }) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error("session not found");
  session._nextSeq += 1;
  const event = { seq: session._nextSeq, runId, sessionId, type, data: structuredClone(data) };
  state.events.push(event);
  return event;
}

// Receipt lookup and new-run admission share the same identity comparison.
// Existing receipts remain readable when today's execution route is unavailable.
function commandReceipt(state, sessionId, commandId, input, supersedes = null) {
  const existing = state.runs.find((run) => run.sessionId === sessionId && run.commandId === commandId);
  if (!existing) return null;
  const priorInputEvent = state.events.find((event) => event.runId === existing.id && event.type === "user.message");
  // Command identity includes the lineage claim: the same commandId asking to
  // continue a DIFFERENT prior Run is a different intent, not a retry of this
  // receipt.
  if ((priorInputEvent && priorInputEvent.data.text !== input) || (existing.supersedes ?? null) !== supersedes) {
    const conflict = new Error("command conflict");
    conflict.code = "COMMAND_CONFLICT";
    throw conflict;
  }
  return { run: publicRun(existing), idempotent: true };
}

function lineageError(code, message) { const error = new Error(message); error.code = code; return error; }

/**
 * D03: a superseding Run may only continue a Run of the same Session that has
 * already ended in `unknown|failed|cancelled`, is not already continued by
 * another Run (lineage is a chain, never a tree) and left no unreconciled
 * external effect. A missing Run and a Run of another Session are one answer,
 * so lineage cannot be used to probe another Session's Run IDs.
 */
function assertSupersedable(state, sessionId, supersedes) {
  const target = state.runs.find((run) => run.id === supersedes);
  if (!target || target.sessionId !== sessionId) throw lineageError("SUPERSEDE_NOT_FOUND", "superseded run not found");
  if (!TERMINAL_STATUSES.has(target.status)) throw lineageError("SUPERSEDE_NOT_TERMINAL", "superseded run has not ended");
  if (target.status === "completed") throw lineageError("SUPERSEDE_COMPLETED", "superseded run completed");
  if (state.runs.some((run) => run.supersedes === supersedes)) throw lineageError("SUPERSEDE_CONFLICT", "superseded run is already continued");
  if (target.error?.code === "mcp_effect_unknown") throw lineageError("EFFECT_UNRECONCILED", "superseded run left unreconciled external effects");
}

export class RuntimeStore {
  constructor({ dataDir, fileName = "runtime-state.json", logger = () => {} }) {
    if (!dataDir) throw new TypeError("dataDir is required");
    this.dataDir = dataDir; this.filePath = path.join(dataDir, fileName); this.logger = logger;
    this.state = emptyState(); this._queue = Promise.resolve(); this.lockHandle = null; this.lockUnsubscribe = null; this.lockLost = false; this.opened = false;
  }

  /**
   * Remove leftover `runtime-state.json.<uuid>.tmp` files. A tmp file is the
   * residue of a process that died between writeFile and rename: the rename
   * never happened, so runtime-state.json is still the last COMPLETE version
   * and the tmp holds a half-written state nobody should read. Sweeping is
   * safe precisely because the tmp is never a source of truth, and it is
   * always logged so a crash never disappears quietly.
   */
  async #sweepStaleTempFiles() {
    const base = path.basename(this.filePath);
    let entries;
    try {
      entries = await readdir(this.dataDir);
    } catch {
      return;
    }
    const stale = entries.filter((name) => name.startsWith(base + ".") && name.endsWith(".tmp"));
    for (const name of stale) await unlink(path.join(this.dataDir, name)).catch(() => {});
    if (stale.length) {
      this.logger(`store: discarded ${stale.length} incomplete state write(s) left by an earlier crash (${stale.join(", ")}); runtime-state.json is the last complete version`);
    }
  }

  async open() {
    if (this.opened) return this;
    await mkdir(this.dataDir, { recursive: true });
    try {
      this.lockLost = false;
      this.lockHandle = await acquireRuntimeLock(this.dataDir);
      this.lockUnsubscribe = this.lockHandle.onLost((error) => { this.lockLost = true; this.opened = false; this.lockError = error; });
      await this.#sweepStaleTempFiles();
      const rawState = await readFile(this.filePath).catch((error) => { if (error?.code === "ENOENT") return null; throw error; });
      if (rawState === null) { this.state = emptyState(); await this._persist(this.state); }
      else {
        const textValue = rawState.toString("utf8");
        if (!Buffer.from(textValue, "utf8").equals(rawState)) throw invalidState("file is not valid UTF-8");
        let parsed; try { parsed = JSON.parse(textValue); } catch { throw invalidState("file is not valid JSON"); }
        if ([3, 4, 5, 6, 7, 8, 9, 10, 11].includes(parsed?.schemaVersion)) {
          // Validate the old shape before writing any backup or new data.
          // Existing backup paths are never followed or overwritten, including
          // symlinks. Recovery after an interrupted upgrade is explicit.
          validateState(parsed, parsed.schemaVersion);
          const upgraded = validateState({ ...parsed, schemaVersion: SCHEMA_VERSION, asyncTasks: parsed.asyncTasks ?? [],
            coordination: parsed.schemaVersion >= 8 ? parsed.coordination : emptyCoordination(),
            // A pre-12 connection's models never reported reasoning; `null`
            // (never declared, PV-61) is the only honest default, not a guess.
            providerConnections: (parsed.providerConnections ?? []).map(connection => ({
              ...connection,
              models: connection.models.map(model => ({ ...model, reasoning: model.reasoning ?? null })),
            })),
            providerConfigurationPending: [],
            providerConfigVersion: 0,
            providerVerifications: [],
            sessions: parsed.sessions.map(session => ({ ...session, scope: parsed.schemaVersion >= 6 ? session.scope : 'project' })),
            runs: parsed.runs.map(run => ({ ...run, supersedes: parsed.schemaVersion >= 9 ? run.supersedes : null })) }, SCHEMA_VERSION, { legacyDescriptors: true });
          const digest = createHash('sha256').update(rawState).digest('hex');
          const backup = path.join(this.dataDir, `runtime-state.schema${parsed.schemaVersion}.${digest}.json`);
          await writeFile(backup, rawState, { flag: 'wx', mode: 0o600 });
          await this._persist(upgraded);
          this.state = upgraded;
          this.logger(`store: upgraded schema ${parsed.schemaVersion} to ${SCHEMA_VERSION}; exact original state preserved in ${path.basename(backup)}`);
        } else this.state = validateState(parsed);
      }
      this.opened = true; return this;
    } catch (error) { await this.#releaseLock(); throw error; }
  }

  async close() { await this._queue; await this.#releaseLock(); }

  async #releaseLock() {
    this.lockUnsubscribe?.(); this.lockUnsubscribe = null;
    if (this.lockHandle) { await this.lockHandle.release().catch(() => {}); this.lockHandle = null; }
    this.opened = false;
  }

  async _persist(state) {
    if (!this.lockHandle || this.lockLost) throw this.lockError ?? new Error("runtime store lock is unavailable");
    const tempPath = this.filePath + "." + randomUUID() + ".tmp";
    await writeFile(tempPath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 }); await chmod(tempPath, 0o600);
    // Crash point: between the complete tmp write and the atomic rename. The
    // qualifier names a situation the test can aim at without counting
    // persists ("with-run" = a run already exists in the state being written).
    maybeCrash("store_write", state.runs.length > 0 ? "with-run" : "empty");
    await rename(tempPath, this.filePath);
  }

  async _mutate(mutator) {
    if (this.lockLost) throw this.lockError ?? new Error("runtime store lock is unavailable");
    const operation = this._queue.then(async () => {
      if (this.lockLost) throw this.lockError ?? new Error("runtime store lock is unavailable");
      const working = structuredClone(this.state); const result = await mutator(working); await this._persist(working); this.state = working; return structuredClone(result);
    });
    this._queue = operation.catch(() => {}); return operation;
  }

  snapshot() { return structuredClone(this.state); }

  getWorkSummary(options, availableQuestionIds) {
    if (!this.opened || this.lockLost) throw new Error("runtime store is unavailable");
    // _mutate publishes by replacing this.state only after persistence. No await
    // here: all collections and high-water marks see the same published state.
    return deriveWorkSummary(this.state, options, availableQuestionIds);
  }

  getWorkMetrics(options) {
    if (!this.opened || this.lockLost) throw new Error("runtime store is unavailable");
    return deriveWorkMetrics(this.state, options);
  }

  getUsageDetails(options) {
    if (!this.opened || this.lockLost) throw new Error("runtime store is unavailable");
    return deriveUsageDetails(this.state, options);
  }

  async createProject(name) {
    return this._mutate((state) => { const project = { id: randomUUID(), name, createdAt: now() }; state.projects.push(project); return project; });
  }

  listProjects() { return structuredClone(this.state.projects); }

  async createSession({ id: sessionId = randomUUID(), projectId, title, workspaceDir, permissionMode = "draft", scope = 'project' }) {
    return this._mutate((state) => {
      assert(scope === 'project' || scope === 'global', 'session scope is invalid');
      if (scope === 'project' && !state.projects.some((project) => project.id === projectId)) throw new Error("project not found");
      assert(scope !== 'global' || projectId === null, 'global session project must be null');
      const existing = state.sessions.find(session => session.id === sessionId);
      if (existing) {
        // The dedicated Attention create route accepts only the identity; its
        // defaults cannot mutate a recovered conversation or its permissions.
        assert(scope === 'global' && existing.scope === 'global', 'session identity conflict');
        return publicSession(existing);
      }
      assert(PERMISSION_MODES.has(permissionMode), "permissionMode is invalid");
      const session = {
        id: sessionId, scope, projectId, title, draft: "", extensionBinding: null, createdAt: now(), _nextSeq: 0,
        workspaceDir, permissionMode, hostSession: null,
      };
      state.sessions.push(session); return publicSession(session);
    });
  }

  getSession(id) { return publicSession(this.state.sessions.find((session) => session.id === id)); }
  listSessions(projectId) { return this.state.sessions.filter((session) => projectId === undefined || session.projectId === projectId).map(publicSession); }
  listRuns(sessionId) { return this.state.runs.filter((run) => !sessionId || run.sessionId === sessionId).map(publicRun); }
  getRun(id) { return publicRun(this.state.runs.find((run) => run.id === id)); }
  getCommandReceipt(sessionId, commandId, input, supersedes = null) { return commandReceipt(this.state, sessionId, commandId, input, supersedes); }
  getQuestion(id) { return structuredClone(this.state.questions.find((question) => question.id === id)); }
  /** The session's current event high-water mark. A snapshot reader resumes
   * from exactly this seq; a cursor beyond it is ahead of the server. */
  getSessionLastSeq(id) { return this.state.sessions.find((session) => session.id === id)?._nextSeq ?? null; }
  getCredentialGeneration() { return this.state.credentialGeneration; }
  hasActiveRun(sessionId) {
    return this.state.runs.some((run) => (!sessionId || run.sessionId === sessionId) && ACTIVE_STATUSES.has(run.status));
  }

  async setDraft(sessionId, textValue) {
    return this._mutate((state) => { const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found"); session.draft = textValue; return publicSession(session); });
  }

  async setPermissionMode(sessionId, permissionMode) {
    return this._mutate((state) => {
      assert(PERMISSION_MODES.has(permissionMode), "permissionMode is invalid");
      const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found");
      if (state.runs.some((run) => ACTIVE_STATUSES.has(run.status))) throw new Error("active run exists");
      session.permissionMode = permissionMode; return publicSession(session);
    });
  }

  async setHostSession(sessionId, hostSession) {
    return this._mutate((state) => {
      const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found");
      session.hostSession = structuredClone(hostSession); return publicSession(session);
    });
  }

  async renameSession(sessionId, title) {
    return this._mutate((state) => {
      assert(typeof title === "string" && title.trim().length > 0 && title.length <= 200, "title is invalid");
      const session = state.sessions.find(item => item.id === sessionId);
      if (!session) throw new Error("session not found");
      session.title = title.trim();
      return publicSession(session);
    });
  }

  async deleteSession(sessionId) {
    return this._mutate((state) => {
      if (!state.sessions.some(s => s.id === sessionId)) throw new Error("session not found");
      const runs = state.runs.filter(r => r.sessionId === sessionId);
      if (runs.some(r => ACTIVE_STATUSES.has(r.status))) throw new Error("active run exists");
      const ids = new Set(runs.map(r => r.id));
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      state.runs = state.runs.filter(r => !ids.has(r.id));
      state.events = state.events.filter(e => e.sessionId !== sessionId);
      state.questions = state.questions.filter(q => !ids.has(q.runId));
      return {deleted:true,sessionId,workspaceRetained:true};
    });
  }

  async detachExtension(sessionId) {
    return this._mutate((state) => { const session=state.sessions.find(s=>s.id===sessionId); if(!session) throw new Error("session not found"); session.extensionBinding=null; return publicSession(session); });
  }

  async bindExtension(sessionId, extensionBinding) {
    return this._mutate((state) => { const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found"); if (session.scope === "global") throw new Error("global session cannot bind a Matter expert"); if (session.extensionBinding) throw new Error("session already has an extension binding"); session.extensionBinding = structuredClone(extensionBinding); return publicSession(session); });
  }

  /**
   * Idempotent run creation. The commandId uniqueness check happens inside
   * this _mutate closure (the only place safe from races: concurrent calls
   * are serialized through the mutation queue, so two requests racing on the
   * same commandId still observe each other in order).
   */
  async createRun({ sessionId, input, adapterId, provider, extension, commandId, workspaceHostSession, credentialGeneration, runtimeSnapshot = null, singleActiveRun = false, supersedes = null }) {
    // Validate and detach the descriptor before it enters the mutation queue.
    // A caller must not be able to mutate a checked object while an earlier
    // queued write is still pending, and an invalid descriptor must never
    // reach the durable state closure.
    const checkedProvider = structuredClone(provider);
    validateDescriptor(checkedProvider, "run.provider", { allowRealProvider: true, schema: SCHEMA_VERSION });
    return this._mutate((state) => {
      const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found");
      const receipt = commandReceipt(state, sessionId, commandId, input, supersedes);
      if (receipt) return receipt;
      // Lineage admission shares this serialized closure with the commandId
      // check, so two requests racing to continue the same Run still observe
      // each other in order and only one of them wins.
      if (supersedes !== null) assertSupersedable(state, sessionId, supersedes);
      if (state.runs.some((run) => (singleActiveRun || run.sessionId === sessionId) && ACTIVE_STATUSES.has(run.status))) throw new Error("active run exists");
      const timestamp = now();
      const run = {
        id: randomUUID(), sessionId, status: "running", admissionOpen: true, adapterId,
        provider: checkedProvider, extension: extension ? structuredClone(extension) : null,
        startedAt: timestamp, endedAt: null, error: null,
        commandId, supersedes, artifacts: [], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0, missing: true },
        hostSession: workspaceHostSession ? structuredClone(workspaceHostSession) : null,
        credentialGeneration,
      };
      state.runs.push(run);
      appendEventToState(state, { runId: run.id, sessionId, type: "user.message", data: { text: input } });
      appendEventToState(state, { runId: run.id, sessionId, type: "run.status", data: { status: "running" } });
      if (runtimeSnapshot) appendEventToState(state, { runId: run.id, sessionId, type: "runtime.bound", data: runtimeSnapshot });
      session.draft = "";
      return { run: publicRun(run), idempotent: false };
    });
  }

  async updateRun(id, patch) {
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === id); if (!run) throw new Error("run not found"); Object.assign(run, structuredClone(patch)); if (TERMINAL_STATUSES.has(run.status)) run.endedAt ??= now(); return run; });
  }

  async updateRunWithEvent(id, patch, event) {
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === id); if (!run) throw new Error("run not found"); Object.assign(run, structuredClone(patch)); if (TERMINAL_STATUSES.has(run.status)) run.endedAt ??= now(); if (event) appendEventToState(state, { runId: id, sessionId: run.sessionId, ...event }); return run; });
  }

  async appendEvent({ runId, type, data }) {
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found"); return appendEventToState(state, { runId, sessionId: run.sessionId, type, data }); });
  }

  async appendAsyncToolResult({ runId, type, data }) {
    return this._mutate(state => {
      const run = state.runs.find(r => r.id === runId); if (!run) throw new Error('run not found');
      if (type === 'tool.result' && !data.isError) {
        let packet; try { packet = JSON.parse(data.text); } catch { packet = null; }
        for (const t of state.asyncTasks) {
          const d = t.deliveries.find(d => d.runId === runId && d.callId === data.callId && data.name === 'async_' + d.kind);
          if (d && !d.runtimeRecordedAt && packet?.id === t.id && packet.execution?.status === d.executionStatus
            && (packet.result?.digest ?? null) === d.resultDigest) {
            d.runtimeRecordedAt = now(); t.revision++; t.updatedAt = d.runtimeRecordedAt;
          }
        }
      }
      validateAsyncTasks(state.asyncTasks, state);
      return appendEventToState(state, { runId, sessionId: run.sessionId, type, data });
    });
  }

  async appendArtifact(runId, artifact) {
    return this._mutate((state) => {
      const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found");
      exactKeys(artifact, new Set(["path", "bytes", "sha256"]), "artifact");
      const record = { path: artifact.path, bytes: artifact.bytes, sha256: artifact.sha256, kind: ARTIFACT_KIND, writtenAt: now() };
      validateArtifact(record, "run.artifact");
      run.artifacts.push(record);
      return appendEventToState(state, { runId, sessionId: run.sessionId, type: "artifact.written", data: structuredClone(record) });
    });
  }

  async recordUsage(runId, usage) {
    return this._mutate((state) => {
      const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found");
      run.usage = structuredClone(usage);
      return appendEventToState(state, { runId, sessionId: run.sessionId, type: "run.usage", data: structuredClone(usage) });
    });
  }

  listEvents({ sessionId, runId, afterSeq = 0 }) {
    return structuredClone(this.state.events.filter((event) => event.sessionId === sessionId && (!runId || event.runId === runId) && event.seq > afterSeq));
  }

  async openQuestion({ runId, kind, prompt, payload = null }) {
    return this._mutate((state) => {
      const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found");
      const question = { id: randomUUID(), runId, kind, prompt, payload: payload ? structuredClone(payload) : null, status: "pending", answer: null, decision: null, createdAt: now() };
      state.questions.push(question); run.status = "waiting_user";
      const eventType = kind === "permission" ? "permission.open" : "question.open";
      appendEventToState(state, { runId, sessionId: run.sessionId, type: eventType, data: kind === "permission" ? { id: question.id, kind, ...payload } : { id: question.id, kind, prompt } });
      appendEventToState(state, { runId, sessionId: run.sessionId, type: "run.status", data: { status: "waiting_user" } });
      return question;
    });
  }

  async resolveQuestion({ runId, questionId, answer = null, decision = null, expectedContentSha256, expectedToolCallId }) {
    return this._mutate((state) => {
      const question = state.questions.find((item) => item.id === questionId && item.runId === runId); if (!question) throw new Error("question not found"); if (question.status !== "pending") throw new Error("question already resolved");
      const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found");
      // Recheck in the same queued mutation as the answer. The service's
      // earlier read may precede a cancel/terminal mutation that queued first.
      if (!run.admissionOpen || !["running", "waiting_user"].includes(run.status)) throw new Error("question is not available");
      if (expectedContentSha256 !== undefined || expectedToolCallId !== undefined) {
        if (question.kind !== "permission") throw new Error("expected payload is only valid for permission questions");
        if ((expectedContentSha256 !== undefined && expectedContentSha256 !== question.payload.contentSha256)
          || (expectedToolCallId !== undefined && expectedToolCallId !== question.payload.toolCallId)) {
          const error = new Error("permission payload no longer matches the reviewed request");
          error.code = "version_mismatch";
          throw error;
        }
      }
      question.status = "resolved"; question.answer = answer; question.decision = decision; run.status = "running";
      const eventType = question.kind === "permission" ? "permission.resolved" : "question.resolved";
      appendEventToState(state, { runId, sessionId: run.sessionId, type: eventType, data: question.kind === "permission" ? { id: questionId, kind: question.kind, decision } : { id: questionId, kind: question.kind, answer } });
      appendEventToState(state, { runId, sessionId: run.sessionId, type: "run.status", data: { status: "running" } });
      return question;
    });
  }

  /** Credential generation is a persisted, monotonically increasing counter:
   * a run freezes the generation it started under, and a restart must not
   * reset it to zero, or a post-restart credential change would look like the
   * same generation a pre-restart run recorded. */
  async bumpCredentialGeneration() {
    return this._mutate((state) => {
      state.credentialGeneration += 1;
      return state.credentialGeneration;
    });
  }

  /** Close every still-pending question of a finished run. Leaving one pending
   * would mean a question outliving the run it belongs to; the recorded
   * `cancelled` status is what a late answer is refused against. */
  async cancelQuestionsForRun(runId) {
    return this._mutate((state) => {
      const run = state.runs.find((item) => item.id === runId);
      const cancelled = [];
      for (const question of state.questions) {
        if (question.runId !== runId || question.status !== "pending") continue;
        question.status = "cancelled";
        cancelled.push(question.id);
        if (!run) continue;
        const eventType = question.kind === "permission" ? "permission.resolved" : "question.resolved";
        appendEventToState(state, { runId, sessionId: run.sessionId, type: eventType, data: { id: question.id, kind: question.kind, status: "cancelled" } });
      }
      return cancelled;
    });
  }

  async expireQuestionsForRestart() {
    return this._mutate((state) => {
      const expired = [];
      for (const question of state.questions) {
        if (question.status !== "pending") continue;
        question.status = "expired_restart";
        expired.push(question.id);
        const run = state.runs.find((item) => item.id === question.runId);
        if (run) {
          const eventType = question.kind === "permission" ? "permission.resolved" : "question.resolved";
          appendEventToState(state, { runId: run.id, sessionId: run.sessionId, type: eventType, data: { id: question.id, kind: question.kind, status: "expired_restart" } });
        }
      }
      return expired;
    });
  }

  getProviderConfigurationPending() { return structuredClone(this.state.providerConfigurationPending); }
  async beginProviderConfiguration(connectionId, operation) {
    validatePending([{ connectionId, operation }]);
    return this._mutate((state) => {
      const previous = state.providerConfigurationPending.find(item => item.connectionId === connectionId);
      assert(!previous || previous.operation === operation || operation === 'connection_delete' || (operation === 'credential_delete' && previous.operation === 'credential_set'), 'incompatible pending configuration operation');
      state.providerConfigurationPending = state.providerConfigurationPending.filter(item => item.connectionId !== connectionId);
      state.providerConfigurationPending.push({ connectionId, operation });
      return { connectionId, operation };
    });
  }
  async finishProviderConfiguration(connectionId) {
    return this._mutate((state) => { state.providerConfigurationPending = state.providerConfigurationPending.filter(item => item.connectionId !== connectionId); });
  }

  async setProviderConnections(connections) {
    const checkedConnections = structuredClone(connections);
    validateConnections(checkedConnections, { historical: true });
    return this._mutate((state) => {
      for (const connection of checkedConnections) {
        const previous = state.providerConnections.find(item => item.id === connection.id);
        if (!previous || JSON.stringify(previous) !== JSON.stringify(connection)) validateConnections([connection]);
      }
      state.providerConnections = checkedConnections;
      // Coarse and deliberately global (PV-42): ANY connection write can
      // change what a saved verify receipt actually proves (a different
      // model list, a different endpoint), so every receipt's binding is
      // checked against this one counter rather than a per-connection one.
      // Over-invalidating is the safe direction; a stale receipt read as
      // current is not.
      state.providerConfigVersion += 1;
      return state.providerConnections;
    });
  }
  getProviderConnections() { return structuredClone(this.state.providerConnections); }

  async setProviderConfig(config) {
    const checkedConfig = structuredClone(config);
    validateDescriptor(checkedConfig, "providerConfig", { schema: SCHEMA_VERSION });
    return this._mutate((state) => { state.providerConfig = checkedConfig; state.providerConfigVersion += 1; return state.providerConfig; });
  }
  getProviderConfig() { return structuredClone(this.state.providerConfig); }
  getProviderConfigVersion() { return this.state.providerConfigVersion; }

  /** The most recent verify receipt for one connection, bound to the
   * configuration/credential epoch it actually ran against (PV-42). Replaces
   * any prior receipt for the same connection outright — one per connection,
   * never a history. */
  async setProviderVerification(verification) {
    const checked = structuredClone(verification);
    validateVerifications([checked]);
    return this._mutate((state) => {
      state.providerVerifications = state.providerVerifications.filter((record) => record.connectionId !== checked.connectionId);
      state.providerVerifications.push(checked);
      return checked;
    });
  }
  getProviderVerification(connectionId) {
    return structuredClone(this.state.providerVerifications.find((record) => record.connectionId === connectionId) ?? null);
  }

  async setExtensionRecords(records) { return this._mutate((state) => { state.extensionRecords = structuredClone(records); return state.extensionRecords; }); }
  getExtensionRecords() { return structuredClone(this.state.extensionRecords); }
}

export { ACTIVE_STATUSES, TERMINAL_STATUSES, PERMISSION_MODES, SCHEMA_VERSION, ARTIFACT_KIND, validateState };
