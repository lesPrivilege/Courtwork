import { emptySubagents, validateSubagents, bindSubagentRun } from '../harness/subagent-state.mjs';
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
  admitRemoteRun, associateRemoteRootTurn, beginRemoteCallDelivery, bindRemoteSession, claimRemoteCall,
  fenceRemoteActionsForRestart, recordRemoteIntent, recordRemoteRootTerminal, remoteActionUnresolved, remoteRunUnsettled, resolveRemoteActions, retainRemoteCallResult, settleRemoteIntent,
  validateRemoteActions, validateRunRemoteBinding, validateSessionRemoteBinding,
} from './remote-action-state.mjs';
import {
  assertProviderApi,
  assertProviderBaseUrl,
  assertProviderModelId,
  PROVIDER_API_FORMATS,
  validateProviderModels,
} from './provider-fields.mjs';
import { appendLocalPiEvent, localPiRunUnresolved, validateLocalPiEvents } from '../runtime/local-pi-state.mjs';

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
const SCHEMA_VERSION = 20;
// check.settled status: "unknown" is fenced in by the Host on restart for a
// check.started event that never got a matching settlement (RD-009 durable
// settlement rule); it is never produced by the runner itself.
const CHECK_STATUSES = new Set(["completed", "cancelled", "timed_out", "failed", "unknown"]);
const CHECK_OUTPUT_FIELD_LIMIT = 65536;
const REPOSITORY_COMMAND_LIMIT = 512;
const REPOSITORY_WRITE_EFFECT_LIMIT = 512;
const REPOSITORY_RETAINED_BYTES_LIMIT = 64 * 1024 * 1024;
const STATE_KEYS = new Set([
  "schemaVersion", "projects", "sessions", "runs", "events", "questions", "providerConfig", "extensionRecords",
  "credentialGeneration", "asyncTasks", "coordination", "providerConnections", "providerConfigurationPending",
  "providerConfigVersion", "providerVerifications", "subagents", "operations",
]);

function now() { return new Date().toISOString(); }

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION, subagents: emptySubagents(), projects: [], sessions: [], runs: [], events: [], questions: [],
    providerConfig: null, extensionRecords: [], credentialGeneration: 0, asyncTasks: [], coordination: emptyCoordination(),
    providerConnections: [], providerConfigurationPending: [], providerConfigVersion: 0, providerVerifications: [], operations: [],
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
  const allowed = new Set(["provider", "model", "api", ...(allowRealProvider ? ["realProvider"] : []), "baseUrl", ...(schema >= 7 ? ["reasoningEffort"] : []), ...provenance, ...(allowRealProvider && schema >= 13 ? ["reasoningBinding"] : [])]);
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
  if (value.reasoningBinding !== undefined) {
    const binding = value.reasoningBinding;
    exactKeys(binding, new Set(["kind", "source", "values", "defaultMode", "adapterVersion", "notice", "configVersion"]), label + ".reasoningBinding");
    assert(["enum", "unknown", "unsupported"].includes(binding.kind), "reasoningBinding.kind is invalid");
    assert(["runtime-catalog", "user-declared", "unknown"].includes(binding.source), "reasoningBinding.source is invalid");
    assert(Array.isArray(binding.values) && binding.values.length <= 7 && new Set(binding.values).size === binding.values.length && binding.values.every(v => ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(v)), "reasoningBinding.values is invalid");
    assert((binding.kind === "enum") === (binding.values.length > 0), "reasoningBinding.kind and values disagree");
    assert(value.reasoningEffort === undefined || binding.values.includes(value.reasoningEffort), "reasoningBinding does not admit requested effort");
    assert(binding.defaultMode === "omit", "reasoningBinding.defaultMode is invalid");
    text(binding.adapterVersion, "reasoningBinding.adapterVersion", 100);
    text(binding.notice, "reasoningBinding.notice", 300);
    nonNegativeInt(binding.configVersion, "reasoningBinding.configVersion");
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
function validateVerifications(value, schema = SCHEMA_VERSION) {
  assert(Array.isArray(value), "providerVerifications must be an array");
  const seen = new Set();
  for (const record of value) {
    exactKeys(record, new Set([
      "connectionId", "model", "status", "message", "observedModel", "replyFirstLine",
      "latencyMs", "checkedAt", "credentialSource", "binding", "httpStatus",
      ...(schema >= 13 && record.coverage !== undefined ? ["coverage"] : []),
    ]), "providerVerification");
    if (record.coverage !== undefined) {
      exactKeys(record.coverage, new Set(["api", "adapterVersion", "reasoningMode", "providerEffectiveEffort", "tools", "turns"]), "providerVerification.coverage");
      assertProviderApi(record.coverage.api);
      text(record.coverage.adapterVersion, "providerVerification.coverage.adapterVersion", 100);
      assert(record.coverage.reasoningMode === "omit" && record.coverage.providerEffectiveEffort === null && record.coverage.tools === false && record.coverage.turns === 1, "providerVerification.coverage is invalid");
    }
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

function validateRepositoryBinding(value, label, { activeOnly = false } = {}) {
  if (value === null) { assert(!activeOnly, label + " is required"); return; }
  exactKeys(value, new Set(["id", "rootPath", "device", "inode", "revision", "status"]), label);
  id(value.id, label + ".id");
  text(value.rootPath, label + ".rootPath", 4000);
  assert(path.isAbsolute(value.rootPath), label + ".rootPath must be absolute");
  text(value.device, label + ".device", 40); assert(/^\d+$/.test(value.device), label + ".device is invalid");
  text(value.inode, label + ".inode", 40); assert(/^\d+$/.test(value.inode), label + ".inode is invalid");
  nonNegativeInt(value.revision, label + ".revision"); assert(value.revision > 0, label + ".revision must be positive");
  assert(value.status === "active" || (!activeOnly && value.status === "revoked"), label + ".status is invalid");
}

function validateRepositoryBindingCommands(value, label, currentRevision) {
  assert(Array.isArray(value), label + " must be an array");
  const requestIds = new Set();
  for (const command of value) {
    exactKeys(command, new Set(["requestId", "requestHash", "operation", "expectedRevision", "receipt"]), label + " item");
    id(command.requestId, label + ".requestId"); assert(!requestIds.has(command.requestId), label + " requestId is not unique"); requestIds.add(command.requestId);
    sha256Hex(command.requestHash, label + ".requestHash");
    assert(command.operation === "bind" || command.operation === "revoke", label + ".operation is invalid");
    nonNegativeInt(command.expectedRevision, label + ".expectedRevision");
    // `at` is optional: it was added after this receipt shape shipped, so
    // already-persisted commands may not carry it. New commands always do
    // (see #changeRepositoryBinding's receipt construction).
    const hasAt = Object.hasOwn(command.receipt, "at");
    exactKeys(command.receipt, new Set(["requestId", "operation", "bindingId", "revision", "status", "rootPath", ...(hasAt ? ["at"] : [])]), label + ".receipt");
    id(command.receipt.requestId, label + ".receipt.requestId"); assert(command.receipt.requestId === command.requestId, label + " receipt requestId mismatch");
    assert(command.receipt.operation === command.operation, label + " receipt operation mismatch");
    id(command.receipt.bindingId, label + ".receipt.bindingId");
    nonNegativeInt(command.receipt.revision, label + ".receipt.revision");
    assert(command.receipt.revision === command.expectedRevision + 1 && command.receipt.revision <= currentRevision, label + ".receipt revision is invalid");
    assert(command.receipt.status === (command.operation === "bind" ? "active" : "revoked"), label + ".receipt status is invalid");
    text(command.receipt.rootPath, label + ".receipt.rootPath", 4000);
    assert(path.isAbsolute(command.receipt.rootPath), label + ".receipt.rootPath must be absolute");
    if (hasAt) timestamp(command.receipt.at, label + ".receipt.at");
  }
}

const REPOSITORY_CANDIDATE_STATUSES = new Set(["active", "revoked"]);
const REPOSITORY_CANDIDATE_COMMAND_STATUSES = new Set(["preparing", "active", "revoked", "failed"]);
const REPOSITORY_WRITE_EFFECT_STATUSES = new Set(["prepared", "confirmed", "unknown", "failed"]);

function validateFileState(value, label, { absent = false } = {}) {
  if (value && value.present === false) {
    exactKeys(value, new Set(["present"]), label);
    assert(absent, label + " cannot be absent");
    return;
  }
  exactKeys(value, new Set(["present", "sha256", "bytes", "device", "inode", "mode"]), label);
  assert(value.present === true, label + ".present is invalid");
  sha256Hex(value.sha256, label + ".sha256");
  nonNegativeInt(value.bytes, label + ".bytes");
  text(value.device, label + ".device", 40); assert(/^\d+$/.test(value.device), label + ".device is invalid");
  text(value.inode, label + ".inode", 40); assert(/^\d+$/.test(value.inode), label + ".inode is invalid");
  nonNegativeInt(value.mode, label + ".mode");
  assert((value.mode & ~0o777) === 0, label + ".mode is invalid");
}

function validateRepositoryCandidate(value, label, { activeOnly = false } = {}) {
  if (value === null) { assert(!activeOnly, label + " is required"); return; }
  exactKeys(value, new Set([
    "id", "status", "revision", "sourceBindingId", "sourceBindingRevision", "baseCommit", "objectFormat",
    "candidatePath", "device", "inode", "candidateDirectory", "containerDevice", "containerInode",
    "stagingDevice", "stagingInode", "gitDirectory", "gitDevice", "gitInode", "gitVersion", "writeRevision", "createdAt",
  ]), label);
  id(value.id, label + ".id");
  assert(REPOSITORY_CANDIDATE_STATUSES.has(value.status) && (!activeOnly || value.status === "active"), label + ".status is invalid");
  nonNegativeInt(value.revision, label + ".revision"); assert(value.revision > 0, label + ".revision must be positive");
  id(value.sourceBindingId, label + ".sourceBindingId");
  nonNegativeInt(value.sourceBindingRevision, label + ".sourceBindingRevision"); assert(value.sourceBindingRevision > 0, label + ".sourceBindingRevision must be positive");
  assert(["sha1", "sha256"].includes(value.objectFormat), label + ".objectFormat is invalid");
  assert(typeof value.baseCommit === "string" && new RegExp(`^(?:[0-9a-f]{${value.objectFormat === "sha1" ? 40 : 64}})$`).test(value.baseCommit), label + ".baseCommit is invalid");
  for (const key of ["candidatePath", "candidateDirectory", "gitDirectory"]) {
    text(value[key], `${label}.${key}`, 4000); assert(path.isAbsolute(value[key]), `${label}.${key} must be absolute`);
  }
  for (const key of ["device", "inode", "containerDevice", "containerInode", "stagingDevice", "stagingInode", "gitDevice", "gitInode"]) {
    text(value[key], `${label}.${key}`, 40); assert(/^\d+$/.test(value[key]), `${label}.${key} is invalid`);
  }
  text(value.gitVersion, label + ".gitVersion", 120);
  nonNegativeInt(value.writeRevision, label + ".writeRevision");
  timestamp(value.createdAt, label + ".createdAt");
}

function validateRepositoryCandidateCommands(value, label) {
  assert(Array.isArray(value) && value.length <= REPOSITORY_COMMAND_LIMIT, label + " must be a bounded array");
  const requestIds = new Set();
  for (const command of value) {
    exactKeys(command, new Set(["requestId", "requestHash", "operation", "expectedRevision", "expectedBindingRevision", "sourceBindingId", "candidateId", "baseCommit", "receipt"]), label + " item");
    id(command.requestId, label + ".requestId"); assert(!requestIds.has(command.requestId), label + " requestId is not unique"); requestIds.add(command.requestId);
    sha256Hex(command.requestHash, label + ".requestHash");
    assert(command.operation === "create" || command.operation === "revoke", label + ".operation is invalid");
    nonNegativeInt(command.expectedRevision, label + ".expectedRevision");
    nonNegativeInt(command.expectedBindingRevision, label + ".expectedBindingRevision");
    id(command.sourceBindingId, label + ".sourceBindingId"); id(command.candidateId, label + ".candidateId");
    assert(typeof command.baseCommit === "string" && /^[0-9a-f]{40}([0-9a-f]{24})?$/.test(command.baseCommit), label + ".baseCommit is invalid");
    exactKeys(command.receipt, new Set(["requestId", "operation", "candidateId", "revision", "status", "sourceBindingId", "sourceBindingRevision", "baseCommit", "failureCode"]), label + ".receipt");
    assert(command.receipt.requestId === command.requestId && command.receipt.operation === command.operation, label + ".receipt identity mismatch");
    assert(command.receipt.candidateId === command.candidateId && command.receipt.sourceBindingId === command.sourceBindingId, label + ".receipt binding mismatch");
    nonNegativeInt(command.receipt.revision, label + ".receipt.revision"); assert(command.receipt.revision === command.expectedRevision + 1, label + ".receipt revision is invalid");
    nonNegativeInt(command.receipt.sourceBindingRevision, label + ".receipt.sourceBindingRevision");
    assert(command.receipt.sourceBindingRevision === command.expectedBindingRevision, label + ".receipt source revision mismatch");
    assert(command.receipt.baseCommit === command.baseCommit, label + ".receipt base commit mismatch");
    assert(REPOSITORY_CANDIDATE_COMMAND_STATUSES.has(command.receipt.status), label + ".receipt status is invalid");
    if (command.receipt.status === "failed") id(command.receipt.failureCode, label + ".receipt.failureCode");
    else assert(command.receipt.failureCode === null, label + ".receipt.failureCode must be null");
  }
}

function validateRepositoryWriteEffects(value, label, runsById, sessionId) {
  assert(Array.isArray(value) && value.length <= REPOSITORY_WRITE_EFFECT_LIMIT, label + " must be a bounded array");
  const ids = new Set();
  const requestIds = new Set();
  let retainedBytes = 0;
  for (const effect of value) {
    exactKeys(effect, new Set([
      "effectId", "requestHash", "requestId", "runId", "candidateId", "candidateRevision", "sourceBindingId",
      "sourceBindingRevision", "candidateWriteRevision", "path", "expectedSha256", "before", "contentSha256", "bytes",
      "contentRef", "status", "createdAt", "settledAt", "result", "failure",
    ]), label + " item");
    assert(typeof effect.effectId === "string" && /^[0-9a-f]{64}$/.test(effect.effectId), label + ".effectId is invalid");
    assert(!ids.has(effect.effectId), label + ".effectId is not unique"); ids.add(effect.effectId);
    sha256Hex(effect.requestHash, label + ".requestHash");
    id(effect.requestId, label + ".requestId");
    assert(!requestIds.has(effect.requestId), label + ".requestId is not unique"); requestIds.add(effect.requestId);
    id(effect.runId, label + ".runId");
    assert(runsById.has(effect.runId), label + ".runId is missing");
    assert(runsById.get(effect.runId).sessionId === sessionId, label + ".runId belongs to another session");
    id(effect.candidateId, label + ".candidateId"); nonNegativeInt(effect.candidateRevision, label + ".candidateRevision");
    id(effect.sourceBindingId, label + ".sourceBindingId"); nonNegativeInt(effect.sourceBindingRevision, label + ".sourceBindingRevision");
    nonNegativeInt(effect.candidateWriteRevision, label + ".candidateWriteRevision");
    text(effect.path, label + ".path", 1000);
    assert(!path.isAbsolute(effect.path) && !effect.path.includes("\\") && effect.path.split("/").every(part => part && part !== "." && part !== ".." && part.toLowerCase() !== ".git"), label + ".path is invalid");
    assert(effect.expectedSha256 === null || (typeof effect.expectedSha256 === "string" && /^[0-9a-f]{64}$/.test(effect.expectedSha256)), label + ".expectedSha256 is invalid");
    validateFileState(effect.before, label + ".before", { absent: true });
    assert((effect.before.present ? effect.before.sha256 : null) === effect.expectedSha256, label + ".before state does not match expected hash");
    sha256Hex(effect.contentSha256, label + ".contentSha256"); nonNegativeInt(effect.bytes, label + ".bytes");
    if (effect.contentRef !== null) {
      assert(effect.contentRef === `effect-${effect.effectId}.payload`, label + ".contentRef is invalid");
      retainedBytes += effect.bytes;
    }
    assert(REPOSITORY_WRITE_EFFECT_STATUSES.has(effect.status), label + ".status is invalid");
    timestamp(effect.createdAt, label + ".createdAt");
    assert(effect.settledAt === null || typeof effect.settledAt === "string", label + ".settledAt is invalid");
    if (effect.settledAt !== null) timestamp(effect.settledAt, label + ".settledAt");
    if (effect.result !== null) {
      exactKeys(effect.result, new Set(["after", "created", "writeRevision"]), label + ".result");
      validateFileState(effect.result.after, label + ".result.after");
      assert(effect.result.after.sha256 === effect.contentSha256 && effect.result.after.bytes === effect.bytes, label + ".result content mismatch");
      assert(typeof effect.result.created === "boolean", label + ".result.created is invalid");
      nonNegativeInt(effect.result.writeRevision, label + ".result.writeRevision");
    }
    if (effect.failure !== null) {
      exactKeys(effect.failure, new Set(["code", "message"]), label + ".failure");
      id(effect.failure.code, label + ".failure.code"); text(effect.failure.message, label + ".failure.message", 4000);
    }
    if (effect.status === "prepared") assert(effect.settledAt === null && effect.result === null && effect.failure === null && effect.contentRef !== null, label + " prepared receipt is invalid");
    if (effect.status === "confirmed") assert(effect.settledAt !== null && effect.result !== null && effect.failure === null && effect.contentRef === null, label + " confirmed receipt is invalid");
    if (effect.status === "unknown") assert(effect.settledAt !== null && effect.result === null && effect.failure !== null && effect.contentRef !== null, label + " unknown receipt is invalid");
    if (effect.status === "failed") assert(effect.settledAt !== null && effect.result === null && effect.failure !== null && effect.contentRef === null, label + " failed receipt is invalid");
  }
  assert(retainedBytes <= REPOSITORY_RETAINED_BYTES_LIMIT, label + " exceeds retained payload budget");
}

/* Schema 18 · Host operations. A manual compaction is not a Run: it has no
 * user message, no model turn and no tool admission, but it does hold the
 * same exclusive seat (one active piece of work per Host) and it does spend
 * provider requests, so it is recorded, settled and recovered like one. */
const OPERATION_KINDS = new Set(["compaction"]);
const OPERATION_ACTIVE = new Set(["running"]);
const OPERATION_STATUSES = new Set(["running", "completed", "failed", "cancelled", "unknown"]);
function validateOperations(value, sessions) {
  assert(Array.isArray(value), "operations must be an array");
  const ids = new Set(), sessionIds = new Set(sessions.map(s => s.id));
  for (const op of value) {
    exactKeys(op, new Set(["id", "kind", "sessionId", "requestId", "requestHash", "status", "reason", "focus", "startedAt", "settledAt", "provider", "journal", "result", "error"]), "operation");
    id(op.id, "operation.id"); assert(!ids.has(op.id), "duplicate operation id"); ids.add(op.id);
    assert(OPERATION_KINDS.has(op.kind), "operation.kind"); assert(sessionIds.has(op.sessionId), "operation.sessionId");
    text(op.requestId, "operation.requestId", 200); text(op.requestHash, "operation.requestHash", 64);
    assert(OPERATION_STATUSES.has(op.status), "operation.status"); assert(op.reason === "manual", "operation.reason");
    assert(op.focus === null || (typeof op.focus === "string" && op.focus.length <= 4000), "operation.focus");
    timestamp(op.startedAt, "operation.startedAt"); assert(op.settledAt === null || typeof op.settledAt === "string", "operation.settledAt");
    assert(isRecord(op.provider) && isRecord(op.journal), "operation.provider/journal");
    assert(op.result === null || isRecord(op.result), "operation.result"); assert(op.error === null || isRecord(op.error), "operation.error");
    assert(OPERATION_ACTIVE.has(op.status) === (op.settledAt === null), "an operation is settled exactly when it has settledAt");
  }
}

function validateState(parsed, schema = SCHEMA_VERSION, { legacyDescriptors = true } = {}) {
  assert(isRecord(parsed), "state must be an object");
  assert(parsed.schemaVersion === schema, `schemaVersion ${JSON.stringify(parsed.schemaVersion)} is not supported (this build requires ${SCHEMA_VERSION}; only validated schema 3 through 19 can be upgraded)`);
  exactKeys(parsed, new Set([...STATE_KEYS].filter(k => (schema >= 15 || k !== 'subagents') && (schema >= 5 || k !== 'asyncTasks') && (schema >= 8 || k !== 'coordination') && (schema >= 10 || k !== 'providerConnections') && (schema >= 11 || k !== 'providerConfigurationPending') && (schema >= 12 || (k !== 'providerConfigVersion' && k !== 'providerVerifications')) && (schema >= 18 || k !== 'operations'))), "state");
  for (const key of ["projects", "sessions", "runs", "events", "questions", "extensionRecords"]) {
    assert(Array.isArray(parsed[key]), key + " must be an array");
  }
  if (schema >= 18) validateOperations(parsed.operations, parsed.sessions);
  const projectIds = new Set();
  for (const project of parsed.projects) {
    exactKeys(project, new Set(["id", "name", "createdAt"]), "project");
    id(project.id, "project.id"); assert(!projectIds.has(project.id), "duplicate project id"); projectIds.add(project.id);
    text(project.name, "project.name", 200); timestamp(project.createdAt, "project.createdAt");
  }
  const sessionIds = new Set();
  for (const session of parsed.sessions) {
    exactKeys(session, new Set(["id", "projectId", "title", "draft", "extensionBinding", "createdAt", "_nextSeq", "workspaceDir", "permissionMode", "hostSession", ...(schema >= 6 ? ['scope'] : []), ...(schema >= 16 ? ["repositoryBinding", "repositoryBindingRevision", "repositoryBindingCommands"] : []), ...(schema >= 17 ? ["repositoryCandidate", "repositoryCandidateRevision", "repositoryCandidateCommands", "repositoryWriteEffects"] : []), ...(schema >= 19 ? ["remoteBinding", "remoteActions"] : [])]), "session");
    id(session.id, "session.id"); assert(!sessionIds.has(session.id), "duplicate session id"); sessionIds.add(session.id);
    if ((schema >= 6 && session.scope === 'global') || (schema >= 14 && session.scope === 'unassigned')) {
      assert(session.projectId === null && session.extensionBinding === null, 'unassigned/global session cannot own a project or Matter binding');
    } else {
      assert(schema < 6 || session.scope === 'project', 'session scope is invalid');
      assert(projectIds.has(session.projectId), "session references missing project");
    }
    text(session.title, "session.title", 200); text(session.draft, "session.draft", 100_000); timestamp(session.createdAt, "session.createdAt");
    assert(Number.isSafeInteger(session._nextSeq) && session._nextSeq >= 0, "session._nextSeq is invalid");
    text(session.workspaceDir, "session.workspaceDir", 4000);
    assert(PERMISSION_MODES.has(session.permissionMode), "session.permissionMode is invalid");
    validateHostSession(session.hostSession, "session.hostSession");
    if (schema >= 16) {
      nonNegativeInt(session.repositoryBindingRevision, "session.repositoryBindingRevision");
      validateRepositoryBinding(session.repositoryBinding, "session.repositoryBinding");
      assert((session.repositoryBinding?.revision ?? 0) === session.repositoryBindingRevision, "session.repositoryBinding revision mismatch");
      validateRepositoryBindingCommands(session.repositoryBindingCommands, "session.repositoryBindingCommands", session.repositoryBindingRevision);
    }
    if (schema >= 17) {
      nonNegativeInt(session.repositoryCandidateRevision, "session.repositoryCandidateRevision");
      validateRepositoryCandidate(session.repositoryCandidate, "session.repositoryCandidate");
      assert((session.repositoryCandidate?.revision ?? 0) === session.repositoryCandidateRevision, "session.repositoryCandidate revision mismatch");
      validateRepositoryCandidateCommands(session.repositoryCandidateCommands, "session.repositoryCandidateCommands");
      validateRepositoryWriteEffects(session.repositoryWriteEffects, "session.repositoryWriteEffects", new Map(parsed.runs.map(run => [run.id, run])), session.id);
    }
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
      ...(schema >= 9 ? ["supersedes"] : []), ...(schema >= 16 ? ["repositoryBindingSnapshot"] : []), ...(schema >= 17 ? ["repositoryCandidateSnapshot"] : []), ...(schema >= 19 ? ["remoteBinding"] : []),
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
    if (schema >= 16 && run.repositoryBindingSnapshot !== null) validateRepositoryBinding(run.repositoryBindingSnapshot, "run.repositoryBindingSnapshot", { activeOnly: true });
    if (schema >= 17 && run.repositoryCandidateSnapshot !== null) validateRepositoryCandidate(run.repositoryCandidateSnapshot, "run.repositoryCandidateSnapshot", { activeOnly: true });
    if (schema >= 19) validateRunRemoteBinding(run.remoteBinding, run);
  }
  // Schema 19 · remote runtime records sit beside Pi's hostSession, never in it.
  if (schema >= 19) {
    const runsById = new Map(parsed.runs.map(run => [run.id, run]));
    for (const session of parsed.sessions) {
      validateSessionRemoteBinding(session.remoteBinding, session, runsById);
      validateRemoteActions(session.remoteActions, session, runsById);
    }
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
      const repositoryWrite = question.payload?.tool === "repo_write";
      const checkRun = question.payload?.tool === "check_run";
      exactKeys(question.payload, new Set(["toolCallId", "tool", "path", "bytes", "contentSha256", "preview",
        ...(repositoryWrite ? ["candidateId", "candidateRevision", "candidateWriteRevision", "sourceBindingId", "sourceBindingRevision", "expectedSha256"] : []),
        ...(checkRun ? ["recipeId", "recipeVersion", "command", "argv", "cwd", "candidateId", "candidateWriteRevision", "timeoutMs", "outputLimitBytes", "env"] : [])]), "question.payload");
      id(question.payload.toolCallId, "question.payload.toolCallId");
      id(question.payload.tool, "question.payload.tool");
      text(question.payload.path, "question.payload.path", 4000);
      nonNegativeInt(question.payload.bytes, "question.payload.bytes");
      sha256Hex(question.payload.contentSha256, "question.payload.contentSha256");
      text(question.payload.preview, "question.payload.preview", 400);
      if (question.payload.tool === "repo_write") {
        id(question.payload.candidateId, "question.payload.candidateId");
        nonNegativeInt(question.payload.candidateRevision, "question.payload.candidateRevision");
        assert(question.payload.candidateRevision > 0, "question.payload.candidateRevision must be positive");
        nonNegativeInt(question.payload.candidateWriteRevision, "question.payload.candidateWriteRevision");
        id(question.payload.sourceBindingId, "question.payload.sourceBindingId");
        nonNegativeInt(question.payload.sourceBindingRevision, "question.payload.sourceBindingRevision");
        assert(question.payload.sourceBindingRevision > 0, "question.payload.sourceBindingRevision must be positive");
        assert(question.payload.expectedSha256 === null || (typeof question.payload.expectedSha256 === "string" && /^[0-9a-f]{64}$/.test(question.payload.expectedSha256)), "question.payload.expectedSha256 is invalid");
      } else if (question.payload.tool === "check_run") {
        // The approval must show the exact recipe the Host will run: its id
        // and pinned version, the fixed command/argv/cwd, the candidate this
        // runs against, and the timeout/output limits -- the model supplied
        // none of this, only the recipeId.
        id(question.payload.recipeId, "question.payload.recipeId");
        assert(Number.isSafeInteger(question.payload.recipeVersion) && question.payload.recipeVersion > 0, "question.payload.recipeVersion is invalid");
        text(question.payload.command, "question.payload.command", 4000);
        assert(Array.isArray(question.payload.argv) && question.payload.argv.length <= 64
          && question.payload.argv.every(arg => typeof arg === "string" && arg.length <= 4000), "question.payload.argv is invalid");
        text(question.payload.cwd, "question.payload.cwd", 200);
        id(question.payload.candidateId, "question.payload.candidateId");
        nonNegativeInt(question.payload.candidateWriteRevision, "question.payload.candidateWriteRevision");
        assert(Number.isSafeInteger(question.payload.timeoutMs) && question.payload.timeoutMs > 0, "question.payload.timeoutMs is invalid");
        assert(Number.isSafeInteger(question.payload.outputLimitBytes) && question.payload.outputLimitBytes > 0, "question.payload.outputLimitBytes is invalid");
        text(question.payload.env, "question.payload.env", 40);
      } else {
        for (const key of ["candidateId", "candidateRevision", "candidateWriteRevision", "sourceBindingId", "sourceBindingRevision", "expectedSha256",
          "recipeId", "recipeVersion", "command", "argv", "cwd", "timeoutMs", "outputLimitBytes", "env"]) {
          assert(!Object.hasOwn(question.payload, key), `question.payload.${key} is only valid for repo_write or check_run`);
        }
      }
    }
    timestamp(question.createdAt, "question.createdAt");
  }
  nonNegativeInt(parsed.credentialGeneration, "state.credentialGeneration");
  if (parsed.providerConfig !== null) validateDescriptor(parsed.providerConfig, "providerConfig", { schema, legacy: legacyDescriptors });
  for (const record of parsed.extensionRecords) assert(isRecord(record), "extension record is invalid");
  if (schema >= 5) validateAsyncTasks(parsed.asyncTasks, parsed);
  if (schema >= 15) validateSubagents(parsed.subagents,parsed);
  if (schema >= 8) validateCoordination(parsed.coordination);
  if (schema >= 10) validateConnections(parsed.providerConnections, { historical: true, schema });
  if (schema >= 11) validatePending(parsed.providerConfigurationPending);
  if (schema >= 12) {
    nonNegativeInt(parsed.providerConfigVersion, "state.providerConfigVersion");
    validateVerifications(parsed.providerVerifications, schema);
  }
  validateLocalPiEvents(parsed, schema);
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
  const modelKeys = schema >= 13 ? ["id", "contextWindow", "reasoning", "reasoningEfforts"] : schema >= 12 ? ["id", "contextWindow", "reasoning"] : ["id", "contextWindow"];
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
      } else {
        const canonical = validateProviderModels(connection.models, { allowEmpty: true });
        if (schema >= 13) assert(connection.models.every((model, index) => model.reasoning === canonical[index].reasoning), "providerConnection.model.reasoning contradicts reasoningEfforts");
      }
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
  // remoteActions is a Host ledger read through its own accessors.
  const { _nextSeq, remoteActions, ...result } = session;
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

function repositoryBindingRequestHash({ operation, rootPath, expectedRevision }) {
  return createHash("sha256").update(JSON.stringify({
    operation,
    rootPath: operation === "bind" ? rootPath : null,
    expectedRevision,
  })).digest("hex");
}

function repositoryBindingError(code, message) { const error = new Error(message); error.code = code; return error; }

function repositoryCandidateRequestHash(value) {
  // Hash the public command intent, not Host-derived state. In particular a
  // source rebind or a newer candidate must not change the replay identity of
  // an already-recorded create/revoke command. A revoke body has no base OID.
  const intent = {
    operation: value.operation, expectedRevision: value.expectedRevision,
    expectedBindingRevision: value.expectedBindingRevision, candidateId: value.candidateId,
  };
  if (value.operation === "create") intent.baseCommit = value.baseCommit;
  return createHash("sha256").update(JSON.stringify(intent)).digest("hex");
}

function repositoryCandidateError(code, message) { const error = new Error(message); error.code = code; return error; }

function assertRepositoryWriteCapacity(session, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw repositoryCandidateError("INVALID_RECEIPT", "repository write byte count is invalid");
  }
  if (session.repositoryWriteEffects.length >= REPOSITORY_WRITE_EFFECT_LIMIT) {
    throw repositoryCandidateError("WRITE_EFFECT_LIMIT", "repository write receipt budget is exhausted");
  }
  const retainedBytes = session.repositoryWriteEffects.reduce((total, effect) => total + (effect.contentRef === null ? 0 : effect.bytes), 0);
  if (retainedBytes + bytes > REPOSITORY_RETAINED_BYTES_LIMIT) {
    throw repositoryCandidateError("RETAINED_PAYLOAD_LIMIT", "repository write recovery payload budget is exhausted");
  }
}

function repositoryWriteRequestHash(value) {
  // writeRevision is an admission fence supplied by the Host's tool closure,
  // not part of the user/model's request identity. A duplicate tool call can
  // arrive after its first invocation advanced that fence; requestId plus the
  // write intent below must still resolve to the original durable receipt.
  return createHash("sha256").update(JSON.stringify({
    requestId: value.requestId, runId: value.runId, candidateId: value.candidateId,
    candidateRevision: value.candidateRevision, sourceBindingId: value.sourceBindingId,
    sourceBindingRevision: value.sourceBindingRevision,
    path: value.path, expectedSha256: value.expectedSha256, contentSha256: value.contentSha256, bytes: value.bytes,
  })).digest("hex");
}

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
        if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].includes(parsed?.schemaVersion)) {
          // Validate the old shape before writing any backup or new data.
          // Existing backup paths are never followed or overwritten, including
          // symlinks. Recovery after an interrupted upgrade is explicit.
          validateState(parsed, parsed.schemaVersion);
          const upgraded = validateState({ ...parsed, subagents: parsed.schemaVersion >= 15 ? parsed.subagents : emptySubagents(), schemaVersion: SCHEMA_VERSION, asyncTasks: parsed.asyncTasks ?? [],
            coordination: parsed.schemaVersion >= 8 ? parsed.coordination : emptyCoordination(),
            // A pre-12 connection's models never reported reasoning; `null`
            // (never declared, PV-61) is the only honest default, not a guess.
            providerConnections: (parsed.providerConnections ?? []).map(connection => ({
              ...connection,
              models: connection.models.map(model => ({ ...model, reasoning: model.reasoning ?? null, reasoningEfforts: parsed.schemaVersion >= 13 ? model.reasoningEfforts : null })),
            })),
            // Schema11 already owns recovery fences; an upgrade must not
            // turn a partially published connection or credential ready.
            providerConfigurationPending: parsed.schemaVersion >= 11 ? parsed.providerConfigurationPending : [],
            providerConfigVersion: parsed.schemaVersion >= 13 ? parsed.providerConfigVersion : parsed.schemaVersion >= 12 ? parsed.providerConfigVersion + 1 : 0,
            providerVerifications: parsed.schemaVersion >= 12 ? parsed.providerVerifications : [],
            sessions: parsed.sessions.map(session => ({ ...session, scope: parsed.schemaVersion >= 6 ? session.scope : 'project',
              repositoryBinding: parsed.schemaVersion >= 16 ? session.repositoryBinding : null,
              repositoryBindingRevision: parsed.schemaVersion >= 16 ? session.repositoryBindingRevision : 0,
              repositoryBindingCommands: parsed.schemaVersion >= 16 ? session.repositoryBindingCommands : [],
              repositoryCandidate: parsed.schemaVersion >= 17 ? session.repositoryCandidate : null,
              repositoryCandidateRevision: parsed.schemaVersion >= 17 ? session.repositoryCandidateRevision : 0,
              repositoryCandidateCommands: parsed.schemaVersion >= 17 ? session.repositoryCandidateCommands : [],
              repositoryWriteEffects: parsed.schemaVersion >= 17 ? session.repositoryWriteEffects : [],
              // Schema 19 · preserve existing remote-runtime authority while
              // older stores gain only the version's null/empty defaults.
              remoteBinding: parsed.schemaVersion >= 19 ? session.remoteBinding : null,
              remoteActions: parsed.schemaVersion >= 19 ? session.remoteActions : [],
            })),
            // Schema 18 · Host operations (manual compaction). None can be in
            // flight across an upgrade; an old file simply has none.
            operations: parsed.schemaVersion >= 18 ? parsed.operations : [],
            runs: parsed.runs.map(run => ({ ...run, supersedes: parsed.schemaVersion >= 9 ? run.supersedes : null,
              repositoryBindingSnapshot: parsed.schemaVersion >= 16 ? run.repositoryBindingSnapshot : null,
              repositoryCandidateSnapshot: parsed.schemaVersion >= 17 ? run.repositoryCandidateSnapshot : null,
              remoteBinding: parsed.schemaVersion >= 19 ? run.remoteBinding : null })) }, SCHEMA_VERSION, { legacyDescriptors: true });
          const digest = createHash('sha256').update(rawState).digest('hex');
          const backup = path.join(this.dataDir, `runtime-state.schema${parsed.schemaVersion}.${digest}.json`);
          await writeFile(backup, rawState, { flag: 'wx', mode: 0o600 });
          await this._persist(upgraded);
          this.state = upgraded;
          this.logger(`store: upgraded schema ${parsed.schemaVersion} to ${SCHEMA_VERSION}; exact original state preserved in ${path.basename(backup)}`);
        } else this.state = validateState(parsed);
        if (this.state.schemaVersion >= 17) {
          let recovered = false;
          for (const session of this.state.sessions) {
            for (const command of session.repositoryCandidateCommands) {
              if (command.operation === "create" && command.receipt.status === "preparing") {
                command.receipt.status = "failed";
                command.receipt.failureCode = "candidate_creation_interrupted";
                recovered = true;
              }
            }
            for (const effect of session.repositoryWriteEffects) {
              if (effect.status !== "prepared") continue;
              effect.status = "unknown";
              effect.settledAt = now();
              effect.failure = { code: "effect_unknown_after_restart", message: "The prepared repository write may have completed before the Host stopped" };
              const run = this.state.runs.find(item => item.id === effect.runId);
              if (run && !TERMINAL_STATUSES.has(run.status)) {
                run.status = "unknown"; run.admissionOpen = false; run.endedAt = effect.settledAt;
                run.error = { code: "repository_write_unknown", message: "A repository write needs reconciliation before more writes" };
              }
              if (run) appendEventToState(this.state, { runId: run.id, sessionId: session.id, type: "repository.write.unknown", data: { effectId: effect.effectId, requestId: effect.requestId, candidateId: effect.candidateId, path: effect.path, code: effect.failure.code } });
              recovered = true;
            }
          }
          if (recovered) {
            this.state = validateState(this.state);
            await this._persist(this.state);
            this.logger("store: unresolved repository writes were fenced as unknown; no write was replayed");
          }
          // A check.started with no matching check.settled (same runId+callId)
          // means the Host stopped mid-check. The process outcome is genuinely
          // unknown -- it is never replayed -- so fence it in as "unknown" the
          // same way an interrupted repository write is fenced above.
          let checksRecovered = false;
          for (const run of this.state.runs) {
            const runEvents = this.state.events.filter(event => event.runId === run.id);
            const settledCallIds = new Set(runEvents.filter(event => event.type === "check.settled").map(event => event.data.callId));
            for (const startEvent of runEvents.filter(event => event.type === "check.started")) {
              if (settledCallIds.has(startEvent.data.callId)) continue;
              const endedAt = now();
              appendEventToState(this.state, { runId: run.id, sessionId: run.sessionId, type: "check.settled", data: {
                callId: startEvent.data.callId, status: "unknown", exitCode: null, signal: null,
                durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startEvent.data.startedAt)),
                stdout: "", stderr: "", truncated: { stdout: false, stderr: false },
                startedAt: startEvent.data.startedAt, endedAt, failure: { code: "check_unknown_after_restart" },
              } });
              checksRecovered = true;
            }
          }
          if (checksRecovered) {
            this.state = validateState(this.state);
            await this._persist(this.state);
            this.logger("store: unresolved check runs were fenced as unknown; no check was re-executed");
          }
          if (fenceRemoteActionsForRestart(this.state, { now: now() })) {
            this.state = validateState(this.state);
            await this._persist(this.state);
            this.logger("store: in-flight remote actions were fenced as unknown; nothing was re-read, re-run or re-sent");
          }
        }
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
      const working = structuredClone(this.state); const result = await mutator(working);
      // Local process recovery authority also depends on Host Run/status and
      // assignment mutations, not only on the named local receipt writer.
      validateLocalPiEvents(working);
      await this._persist(working); this.state = working; return structuredClone(result);
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

  async createProject(name, id = randomUUID()) {
    return this._mutate((state) => {
      if (state.projects.some((project) => project.id === id)) throw new Error("project id exists");
      const project = { id, name, createdAt: now() }; state.projects.push(project); return project;
    });
  }

  listProjects() { return structuredClone(this.state.projects); }

  async createSession({ id: sessionId = randomUUID(), projectId, title, workspaceDir, permissionMode = "draft", scope = 'project' }) {
    return this._mutate((state) => {
      assert(scope === 'project' || scope === 'global' || scope === 'unassigned', 'session scope is invalid');
      if (scope === 'project' && !state.projects.some((project) => project.id === projectId)) throw new Error("project not found");
      assert(scope === 'project' || projectId === null, 'unassigned/global session project must be null');
      assert(scope !== 'unassigned' || (typeof workspaceDir === 'string' && workspaceDir.length > 0), 'session workspace is required');
      const existing = state.sessions.find(session => session.id === sessionId);
      if (existing) {
        // Identity replay never mutates a recovered title, binding or permissions.
        // A client cannot move a conversation by replaying a different scope.
        if (existing.scope !== scope || existing.projectId !== projectId) {
          const error = new Error('session identity conflict'); error.code = 'SESSION_IDENTITY_CONFLICT'; throw error;
        }
        return publicSession(existing);
      }
      assert(PERMISSION_MODES.has(permissionMode), "permissionMode is invalid");
      const session = {
        id: sessionId, scope, projectId, title, draft: "", extensionBinding: null, createdAt: now(), _nextSeq: 0,
        workspaceDir, permissionMode, hostSession: null, repositoryBinding: null, repositoryBindingRevision: 0, repositoryBindingCommands: [],
        repositoryCandidate: null, repositoryCandidateRevision: 0, repositoryCandidateCommands: [], repositoryWriteEffects: [],
        remoteBinding: null, remoteActions: [],
      };
      state.sessions.push(session); return publicSession(session);
    });
  }

  getSession(id) { return publicSession(this.state.sessions.find((session) => session.id === id)); }
  listSessions(projectId) {
    // Recorded activity is creation or a Run boundary, never a guessed UI timestamp.
    const activity = new Map(this.state.sessions.map(s => [s.id, s.createdAt]));
    for (const run of this.state.runs) for (const at of [run.startedAt, run.endedAt]) {
      if (at && at > activity.get(run.sessionId)) activity.set(run.sessionId, at);
    }
    return this.state.sessions.filter(s => projectId === undefined || s.projectId === projectId)
      .map(s => ({...publicSession(s), recordedActivityAt: activity.get(s.id)}))
      .sort((a,b) => b.recordedActivityAt.localeCompare(a.recordedActivityAt) || a.id.localeCompare(b.id));
  }
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
  /** True while any Host operation (manual compaction) holds the exclusive seat. */
  hasActiveOperation() {
    return this.state.operations.some((op) => OPERATION_ACTIVE.has(op.status));
  }

  getRepositoryBindingReceipt(sessionId, { requestId, operation, rootPath = null, expectedRevision }) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    if (!session) throw new Error("session not found");
    const requestHash = repositoryBindingRequestHash({ operation, rootPath, expectedRevision });
    const existing = session.repositoryBindingCommands.find(item => item.requestId === requestId);
    if (!existing) return null;
    if (existing.requestHash !== requestHash) throw repositoryBindingError("IDEMPOTENCY_CONFLICT", "repository binding requestId was already used with different input");
    return structuredClone(existing.receipt);
  }

  getRepositoryCandidateReceipt(sessionId, request) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    if (!session) throw new Error("session not found");
    const requestHash = repositoryCandidateRequestHash(request);
    const existing = session.repositoryCandidateCommands.find(item => item.requestId === request.requestId);
    if (!existing) return null;
    if (existing.requestHash !== requestHash) throw repositoryCandidateError("IDEMPOTENCY_CONFLICT", "repository candidate requestId was already used with different input");
    return structuredClone(existing.receipt);
  }

  async beginRepositoryCandidate(sessionId, request) {
    const requestHash = repositoryCandidateRequestHash(request);
    return this._mutate(state => {
      const session = state.sessions.find(item => item.id === sessionId);
      if (!session) throw new Error("session not found");
      const existing = session.repositoryCandidateCommands.find(item => item.requestId === request.requestId);
      if (existing) {
        if (existing.requestHash !== requestHash) throw repositoryCandidateError("IDEMPOTENCY_CONFLICT", "repository candidate requestId was already used with different input");
        return { receipt: structuredClone(existing.receipt), candidate: structuredClone(session.repositoryCandidate), idempotent: true };
      }
      if (request.expectedRevision !== session.repositoryCandidateRevision) throw repositoryCandidateError("STALE_REVISION", "repository candidate revision changed");
      const binding = session.repositoryBinding;
      if (!binding || binding.status !== "active" || binding.id !== request.sourceBindingId
        || binding.revision !== request.expectedBindingRevision) throw repositoryCandidateError("BINDING_CHANGED", "source repository binding changed");
      const activeRuns = state.runs.filter(run => run.sessionId === sessionId && ACTIVE_STATUSES.has(run.status));
      let receipt;
      let runsToCancel = [];
      if (request.operation === "create") {
        if (activeRuns.length) throw repositoryCandidateError("ACTIVE_RUN", "repository candidate cannot change during a Run");
        if (session.repositoryCandidate?.status === "active") throw repositoryCandidateError("ACTIVE_CANDIDATE", "a repository candidate is already active");
        // A create can make a candidate that must later be revocable. Leave
        // one durable receipt slot for that revoke; a failed create at the
        // boundary may therefore exhaust the remaining lifecycle budget.
        if (session.repositoryCandidateCommands.length >= REPOSITORY_COMMAND_LIMIT - 1) {
          throw repositoryCandidateError("CANDIDATE_COMMAND_LIMIT", "repository candidate command receipt budget is exhausted");
        }
        receipt = { requestId: request.requestId, operation: "create", candidateId: request.candidateId,
          revision: session.repositoryCandidateRevision + 1, status: "preparing", sourceBindingId: binding.id,
          sourceBindingRevision: binding.revision, baseCommit: request.baseCommit, failureCode: null };
      } else if (request.operation === "revoke") {
        const current = session.repositoryCandidate;
        if (!current || current.status !== "active" || current.id !== request.candidateId || current.sourceBindingId !== binding.id) {
          throw repositoryCandidateError("NO_ACTIVE_CANDIDATE", "no matching active repository candidate exists");
        }
        if (session.repositoryCandidateCommands.length >= REPOSITORY_COMMAND_LIMIT) {
          throw repositoryCandidateError("CANDIDATE_COMMAND_LIMIT", "repository candidate command receipt budget is exhausted");
        }
        const next = { ...structuredClone(current), revision: session.repositoryCandidateRevision + 1, status: "revoked" };
        session.repositoryCandidate = next;
        session.repositoryCandidateRevision = next.revision;
        runsToCancel = activeRuns.filter(run => run.repositoryCandidateSnapshot?.id === current.id).map(run => run.id);
        receipt = { requestId: request.requestId, operation: "revoke", candidateId: current.id,
          revision: next.revision, status: "revoked", sourceBindingId: binding.id,
          sourceBindingRevision: binding.revision, baseCommit: current.baseCommit, failureCode: null };
      } else throw repositoryCandidateError("INVALID_OPERATION", "repository candidate operation is invalid");
      session.repositoryCandidateCommands.push({ requestId: request.requestId, requestHash, operation: request.operation,
        expectedRevision: request.expectedRevision, expectedBindingRevision: request.expectedBindingRevision,
        sourceBindingId: request.sourceBindingId, candidateId: request.candidateId, baseCommit: request.baseCommit, receipt });
      return { receipt: structuredClone(receipt), candidate: structuredClone(session.repositoryCandidate), idempotent: false, runsToCancel };
    });
  }

  async activateRepositoryCandidate(sessionId, { requestId, candidate }) {
    return this._mutate(state => {
      const session = state.sessions.find(item => item.id === sessionId);
      if (!session) throw new Error("session not found");
      const command = session.repositoryCandidateCommands.find(item => item.requestId === requestId);
      if (!command || command.operation !== "create") throw repositoryCandidateError("CANDIDATE_COMMAND_MISSING", "candidate create command is unavailable");
      if (command.receipt.status === "active") return { receipt: structuredClone(command.receipt), candidate: structuredClone(session.repositoryCandidate), idempotent: true };
      if (command.receipt.status !== "preparing") throw repositoryCandidateError("CANDIDATE_COMMAND_CLOSED", "candidate create command is no longer pending");
      const binding = session.repositoryBinding;
      if (!binding || binding.status !== "active" || binding.id !== command.sourceBindingId
        || binding.revision !== command.expectedBindingRevision
        || session.repositoryCandidateRevision !== command.expectedRevision) {
        throw repositoryCandidateError("BINDING_CHANGED", "source repository changed during candidate creation");
      }
      const next = {
        id: command.candidateId, status: "active", revision: command.receipt.revision,
        sourceBindingId: command.sourceBindingId, sourceBindingRevision: command.expectedBindingRevision,
        baseCommit: command.baseCommit, objectFormat: candidate.objectFormat,
        candidatePath: candidate.candidatePath, device: candidate.candidateDevice, inode: candidate.candidateInode,
        candidateDirectory: candidate.candidateDirectory, containerDevice: candidate.candidateContainerDevice,
        containerInode: candidate.candidateContainerInode, stagingDevice: candidate.stagingDevice,
        stagingInode: candidate.stagingInode, gitDirectory: candidate.gitDirectory,
        gitDevice: candidate.gitDevice, gitInode: candidate.gitInode, gitVersion: candidate.gitVersion,
        writeRevision: 0, createdAt: now(),
      };
      validateRepositoryCandidate(next, "repository candidate", { activeOnly: true });
      session.repositoryCandidate = next; session.repositoryCandidateRevision = next.revision;
      command.receipt.status = "active";
      return { receipt: structuredClone(command.receipt), candidate: structuredClone(next), idempotent: false };
    });
  }

  async failRepositoryCandidate(sessionId, { requestId, code }) {
    return this._mutate(state => {
      const session = state.sessions.find(item => item.id === sessionId);
      const command = session?.repositoryCandidateCommands.find(item => item.requestId === requestId);
      if (!command) throw repositoryCandidateError("CANDIDATE_COMMAND_MISSING", "candidate create command is unavailable");
      if (command.receipt.status !== "preparing") return { receipt: structuredClone(command.receipt), idempotent: true };
      command.receipt.status = "failed"; command.receipt.failureCode = code;
      return { receipt: structuredClone(command.receipt), idempotent: false };
    });
  }

  async recordRepositoryCandidateRead(runId, { candidateId, revision, writeRevision, operation, path: relativePath, resultSha256, sources }) {
    return this._mutate(state => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      const session = state.sessions.find(item => item.id === run.sessionId);
      const current = session?.repositoryCandidate;
      const snapshot = run.repositoryCandidateSnapshot;
      if (!run.admissionOpen || !ACTIVE_STATUSES.has(run.status)) throw repositoryCandidateError("RUN_CLOSED", "run admission is closed");
      if (!current || current.status !== "active" || !snapshot || current.id !== candidateId || snapshot.id !== candidateId
        || current.revision !== revision || snapshot.revision !== revision || current.writeRevision !== writeRevision
        || current.sourceBindingId !== session.repositoryBinding?.id || session.repositoryBinding?.status !== "active") {
        throw repositoryCandidateError("CANDIDATE_REVOKED", "repository candidate is no longer active for this Run");
      }
      if (!["list", "read", "grep", "diff"].includes(operation)) throw repositoryCandidateError("INVALID_OPERATION", "repository candidate read operation is invalid");
      text(relativePath, "repository candidate read path", 1000);
      if (!/^([a-f0-9]{64})$/.test(resultSha256)) throw repositoryCandidateError("INVALID_RECEIPT", "candidate read result digest is invalid");
      assert(Array.isArray(sources) && sources.length <= 500, "repository candidate read sources are invalid");
      return appendEventToState(state, { runId, sessionId: session.id, type: "repository.candidate.read", data: {
        candidateId, revision, writeRevision, operation, path: relativePath, resultSha256, sources: structuredClone(sources),
      } });
    });
  }

  async prepareRepositoryWrite(runId, input) {
    const checked = structuredClone(input);
    const requestHash = repositoryWriteRequestHash({ ...checked, runId });
    return this._mutate(state => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      const session = state.sessions.find(item => item.id === run.sessionId);
      const existing = session.repositoryWriteEffects.find(item => item.requestId === checked.requestId);
      if (existing) {
        if (existing.requestHash !== requestHash) throw repositoryCandidateError("IDEMPOTENCY_CONFLICT", "repository write requestId was already used with different input");
        return { effect: structuredClone(existing), idempotent: true };
      }
      if (!run.admissionOpen || !ACTIVE_STATUSES.has(run.status)) throw repositoryCandidateError("RUN_CLOSED", "run admission is closed");
      const candidate = session.repositoryCandidate;
      const snapshot = run.repositoryCandidateSnapshot;
      const binding = session.repositoryBinding;
      if (!candidate || candidate.status !== "active" || !snapshot || candidate.id !== checked.candidateId || snapshot.id !== checked.candidateId
        || candidate.revision !== checked.candidateRevision || snapshot.revision !== checked.candidateRevision
        || candidate.writeRevision !== checked.candidateWriteRevision || binding?.status !== "active"
        || binding.id !== checked.sourceBindingId || binding.revision !== checked.sourceBindingRevision
        || candidate.sourceBindingId !== binding.id || candidate.sourceBindingRevision !== binding.revision) {
        throw repositoryCandidateError("CANDIDATE_CHANGED", "repository candidate changed while permission was pending");
      }
      if (session.repositoryWriteEffects.some(effect => effect.candidateId === candidate.id && ["prepared", "unknown"].includes(effect.status))) {
        throw repositoryCandidateError("EFFECT_UNKNOWN", "a repository write needs reconciliation before another write");
      }
      if (!checked.before || !checked.before.present && checked.expectedSha256 !== null
        || checked.before.present && checked.before.sha256 !== checked.expectedSha256) throw repositoryCandidateError("INVALID_RECEIPT", "candidate write before-state does not match its expected hash");
      assertRepositoryWriteCapacity(session, checked.bytes);
      const effectId = createHash("sha256").update(`${session.id}\n${checked.requestId}`).digest("hex");
      const effect = {
        effectId, requestHash, requestId: checked.requestId, runId,
        candidateId: candidate.id, candidateRevision: candidate.revision, sourceBindingId: binding.id,
        sourceBindingRevision: binding.revision, candidateWriteRevision: candidate.writeRevision,
        path: checked.path, expectedSha256: checked.expectedSha256, before: checked.before,
        contentSha256: checked.contentSha256, bytes: checked.bytes, contentRef: `effect-${effectId}.payload`,
        status: "prepared", createdAt: now(), settledAt: null, result: null, failure: null,
      };
      session.repositoryWriteEffects.push(effect);
      return { effect: structuredClone(effect), idempotent: false };
    });
  }

  getRepositoryWriteEffect(sessionId, requestId) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    return structuredClone(session?.repositoryWriteEffects.find(item => item.requestId === requestId) ?? null);
  }

  assertRepositoryWriteCapacity(sessionId, bytes) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    if (!session) throw new Error("session not found");
    assertRepositoryWriteCapacity(session, bytes);
  }

  getRepositoryWriteReceipt(runId, input) {
    const run = this.state.runs.find(item => item.id === runId);
    if (!run) return null;
    const session = this.state.sessions.find(item => item.id === run.sessionId);
    const existing = session?.repositoryWriteEffects.find(item => item.requestId === input.requestId);
    if (!existing) return null;
    const requestHash = repositoryWriteRequestHash({ ...input, runId });
    if (existing.requestHash !== requestHash) throw repositoryCandidateError("IDEMPOTENCY_CONFLICT", "repository write requestId was already used with different input");
    return structuredClone(existing);
  }

  async settleRepositoryWrite(runId, effectId, { status, result = null, failure = null }) {
    return this._mutate(state => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      const session = state.sessions.find(item => item.id === run.sessionId);
      const effect = session?.repositoryWriteEffects.find(item => item.effectId === effectId);
      if (!effect) throw repositoryCandidateError("EFFECT_NOT_FOUND", "repository write receipt is unavailable");
      if (effect.status !== "prepared") return structuredClone(effect);
      if (!["confirmed", "unknown", "failed"].includes(status)) throw repositoryCandidateError("INVALID_STATUS", "repository write result status is invalid");
      effect.status = status; effect.settledAt = now(); effect.failure = failure ? structuredClone(failure) : null;
      if (status === "confirmed" || status === "failed") effect.contentRef = null;
      if (status === "confirmed") {
        if (!result || !result.after || result.after.sha256 !== effect.contentSha256 || result.after.bytes !== effect.bytes) throw repositoryCandidateError("INVALID_RECEIPT", "candidate write result does not match the prepared content");
        const candidate = session.repositoryCandidate;
        if (!candidate || candidate.id !== effect.candidateId) throw repositoryCandidateError("CANDIDATE_CHANGED", "repository candidate changed during the write");
        candidate.writeRevision += 1;
        effect.result = { after: structuredClone(result.after), created: Boolean(result.created), writeRevision: candidate.writeRevision };
      } else effect.result = null;
      if (status === "unknown") {
        if (run && !TERMINAL_STATUSES.has(run.status)) { run.status = "unknown"; run.admissionOpen = false; run.endedAt = effect.settledAt; run.error = { code: "repository_write_unknown", message: "A repository write needs reconciliation before more writes" }; }
        appendEventToState(state, { runId: run.id, sessionId: session.id, type: "repository.write.unknown", data: { effectId, requestId: effect.requestId, candidateId: effect.candidateId, path: effect.path, code: failure?.code ?? "write_outcome_unknown" } });
      } else if (status === "confirmed") appendEventToState(state, { runId: run.id, sessionId: session.id, type: "repository.write.confirmed", data: { effectId, requestId: effect.requestId, candidateId: effect.candidateId, path: effect.path, contentSha256: effect.contentSha256, bytes: effect.bytes, writeRevision: effect.result.writeRevision } });
      else appendEventToState(state, { runId: run.id, sessionId: session.id, type: "repository.write.failed", data: { effectId, requestId: effect.requestId, candidateId: effect.candidateId, path: effect.path, code: failure?.code ?? "write_failed" } });
      return structuredClone(effect);
    });
  }

  async changeRepositoryBinding(sessionId, { requestId, operation, rootPath = null, expectedRevision, resolvedRoot = null }) {
    const requestHash = repositoryBindingRequestHash({ operation, rootPath, expectedRevision });
    return this._mutate((state) => {
      const session = state.sessions.find(item => item.id === sessionId);
      if (!session) throw new Error("session not found");
      const existing = session.repositoryBindingCommands.find(item => item.requestId === requestId);
      if (existing) {
        if (existing.requestHash !== requestHash) throw repositoryBindingError("IDEMPOTENCY_CONFLICT", "repository binding requestId was already used with different input");
        const runsToCancel = operation === "revoke"
          ? state.runs.filter(run => run.sessionId === sessionId && ACTIVE_STATUSES.has(run.status)
            && run.repositoryBindingSnapshot?.id === existing.receipt.bindingId).map(run => run.id)
          : [];
        return { receipt: structuredClone(existing.receipt), binding: structuredClone(session.repositoryBinding), idempotent: true, runsToCancel };
      }
      if (expectedRevision !== session.repositoryBindingRevision) throw repositoryBindingError("STALE_REVISION", "repository binding revision changed");
      const activeRuns = state.runs.filter(run => run.sessionId === sessionId && ACTIVE_STATUSES.has(run.status));
      let nextBinding;
      let runsToCancel = [];
      if (operation === "bind") {
        if (activeRuns.length) throw repositoryBindingError("ACTIVE_RUN", "repository binding cannot change during an active run");
        if (session.repositoryCandidate?.status === "active") {
          throw repositoryBindingError("ACTIVE_CANDIDATE", "revoke the private candidate before changing its source repository binding");
        }
        if (!resolvedRoot || typeof resolvedRoot.path !== "string" || !path.isAbsolute(resolvedRoot.path)
          || typeof resolvedRoot.device !== "string" || !/^\d+$/.test(resolvedRoot.device)
          || typeof resolvedRoot.inode !== "string" || !/^\d+$/.test(resolvedRoot.inode)) {
          throw repositoryBindingError("INVALID_ROOT", "repository root identity is invalid");
        }
        nextBinding = {
          id: randomUUID(), rootPath: resolvedRoot.path, device: resolvedRoot.device, inode: resolvedRoot.inode,
          revision: session.repositoryBindingRevision + 1, status: "active",
        };
      } else if (operation === "revoke") {
        if (!session.repositoryBinding || session.repositoryBinding.status !== "active") throw repositoryBindingError("NO_ACTIVE_BINDING", "no active repository binding exists");
        const current = session.repositoryBinding;
        nextBinding = { ...structuredClone(current), revision: session.repositoryBindingRevision + 1, status: "revoked" };
        runsToCancel = activeRuns.filter(run => run.repositoryBindingSnapshot?.id === current.id).map(run => run.id);
        if (session.repositoryCandidate?.status === "active" && session.repositoryCandidate.sourceBindingId === current.id) {
          const candidate = session.repositoryCandidate;
          session.repositoryCandidate = { ...structuredClone(candidate), revision: session.repositoryCandidateRevision + 1, status: "revoked" };
          session.repositoryCandidateRevision = session.repositoryCandidate.revision;
          runsToCancel = [...new Set([...runsToCancel, ...activeRuns.filter(run => run.repositoryCandidateSnapshot?.id === candidate.id).map(run => run.id)])];
          for (const runId of activeRuns.filter(run => run.repositoryCandidateSnapshot?.id === candidate.id).map(run => run.id)) appendEventToState(state, {
            runId, sessionId, type: "repository.candidate.revoked", data: { candidateId: candidate.id, revision: session.repositoryCandidateRevision, reason: "source_binding_revoked" },
          });
        }
      } else throw repositoryBindingError("INVALID_OPERATION", "repository binding operation is invalid");
      const receipt = {
        requestId, operation, bindingId: nextBinding.id, revision: nextBinding.revision,
        status: nextBinding.status, rootPath: nextBinding.rootPath, at: now(),
      };
      session.repositoryBinding = nextBinding;
      session.repositoryBindingRevision = nextBinding.revision;
      session.repositoryBindingCommands.push({ requestId, requestHash, operation, expectedRevision, receipt });
      for (const runId of runsToCancel) appendEventToState(state, {
        runId, sessionId, type: "repository.binding.revoked",
        data: { bindingId: nextBinding.id, revision: nextBinding.revision },
      });
      return { receipt: structuredClone(receipt), binding: structuredClone(nextBinding), idempotent: false, runsToCancel };
    });
  }

  async recordRepositoryRead(runId, { bindingId, revision, operation, path: relativePath, resultSha256, sources }) {
    return this._mutate((state) => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      const session = state.sessions.find(item => item.id === run.sessionId);
      if (!session) throw new Error("session not found");
      const current = session.repositoryBinding;
      const snapshot = run.repositoryBindingSnapshot;
      if (!run.admissionOpen || !ACTIVE_STATUSES.has(run.status)) throw repositoryBindingError("RUN_CLOSED", "run admission is closed");
      if (!current || current.status !== "active" || !snapshot
        || current.id !== bindingId || snapshot.id !== bindingId
        || current.revision !== revision || snapshot.revision !== revision
        || current.device !== snapshot.device || current.inode !== snapshot.inode || current.rootPath !== snapshot.rootPath) {
        throw repositoryBindingError("BINDING_REVOKED", "repository binding is no longer active for this run");
      }
      if (!["list", "read", "grep"].includes(operation)) throw repositoryBindingError("INVALID_OPERATION", "repository read operation is invalid");
      text(relativePath, "repository read path", 1000);
      const validRelativePath = value => value === "." || (!path.isAbsolute(value) && !value.includes("\\")
        && value.split("/").every(part => part && part !== "." && part !== ".."));
      assert(validRelativePath(relativePath), "repository read path is invalid");
      sha256Hex(resultSha256, "repository read resultSha256");
      assert(Array.isArray(sources) && sources.length <= 500, "repository read sources are invalid");
      const checkedSources = sources.map((source, index) => {
        exactKeys(source, new Set(["path", "bytes", "sha256"]), `repository read source ${index}`);
        text(source.path, `repository read source ${index}.path`, 1000);
        assert(validRelativePath(source.path), `repository read source ${index}.path is invalid`);
        nonNegativeInt(source.bytes, `repository read source ${index}.bytes`);
        sha256Hex(source.sha256, `repository read source ${index}.sha256`);
        return structuredClone(source);
      });
      return appendEventToState(state, { runId, sessionId: run.sessionId, type: "repository.read", data: {
        bindingId, revision, operation, path: relativePath, resultSha256, sources: checkedSources,
      } });
    });
  }

  /**
   * check.started/check.settled record a Run's check_run tool call durably,
   * independent of Pi's own tool.result path (RD-009): a cancel closes Run
   * admission before a late tool.* event would otherwise arrive, so the Host
   * must persist the process outcome itself. recordCheckStarted refuses to
   * start a new process for a Run that is already closing; recordCheckSettled
   * has no such gate; it must succeed even after admission has closed, so the
   * settlement for an in-flight process is never lost.
   */
  async recordCheckStarted(runId, { callId, recipeId, recipeVersion, candidateId, candidateWriteRevision, startedAt }) {
    return this._mutate(state => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      if (!run.admissionOpen || !ACTIVE_STATUSES.has(run.status)) { const error = new Error("run admission is closed"); error.code = "RUN_CLOSED"; throw error; }
      id(callId, "check.started callId");
      id(recipeId, "check.started recipeId");
      assert(Number.isSafeInteger(recipeVersion) && recipeVersion > 0, "check.started recipeVersion is invalid");
      id(candidateId, "check.started candidateId");
      nonNegativeInt(candidateWriteRevision, "check.started candidateWriteRevision");
      timestamp(startedAt, "check.started startedAt");
      const session = state.sessions.find(item => item.id === run.sessionId);
      const current = session?.repositoryCandidate;
      const admitted = run.repositoryCandidateSnapshot;
      const binding = session?.repositoryBinding;
      if (current?.status !== "active" || current.id !== candidateId
        || current.writeRevision !== candidateWriteRevision || !admitted
        || ["id", "revision", "sourceBindingId", "sourceBindingRevision", "candidatePath"]
          .some(key => current[key] !== admitted[key])
        || binding?.status !== "active" || binding.id !== current.sourceBindingId
        || binding.revision !== current.sourceBindingRevision) {
        const error = new Error("Check candidate or binding changed");
        error.code = "candidate_changed";
        throw error;
      }
      return appendEventToState(state, { runId, sessionId: run.sessionId, type: "check.started", data: {
        callId, recipeId, recipeVersion, candidateId, candidateWriteRevision, startedAt,
      } });
    });
  }

  async recordCheckSettled(runId, { callId, status, exitCode, signal, durationMs, stdout, stderr, truncated, startedAt, endedAt, failure = null }) {
    return this._mutate(state => {
      const run = state.runs.find(item => item.id === runId);
      if (!run) throw new Error("run not found");
      id(callId, "check.settled callId");
      assert(CHECK_STATUSES.has(status), "check.settled status is invalid");
      assert(exitCode === null || Number.isInteger(exitCode), "check.settled exitCode is invalid");
      assert(signal === null || (typeof signal === "string" && signal.length > 0 && signal.length <= 40), "check.settled signal is invalid");
      nonNegativeInt(durationMs, "check.settled durationMs");
      text(stdout, "check.settled stdout", CHECK_OUTPUT_FIELD_LIMIT);
      text(stderr, "check.settled stderr", CHECK_OUTPUT_FIELD_LIMIT);
      assert(isRecord(truncated) && typeof truncated.stdout === "boolean" && typeof truncated.stderr === "boolean"
        && Object.keys(truncated).length === 2, "check.settled truncated is invalid");
      timestamp(startedAt, "check.settled startedAt");
      timestamp(endedAt, "check.settled endedAt");
      if (failure !== null) { exactKeys(failure, new Set(["code"]), "check.settled failure"); id(failure.code, "check.settled failure.code"); }
      return appendEventToState(state, { runId, sessionId: run.sessionId, type: "check.settled", data: {
        callId, status, exitCode, signal, durationMs, stdout, stderr,
        truncated: { stdout: truncated.stdout, stderr: truncated.stderr }, startedAt, endedAt, failure,
      } });
    });
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
    return this._mutate((state) => { const session = state.sessions.find((item) => item.id === sessionId); if (!session) throw new Error("session not found"); if (session.scope === "global") throw new Error("global session cannot bind a Matter expert"); if (session.scope === "unassigned") throw new Error("A Matter expert requires a project session"); if (session.extensionBinding) throw new Error("session already has an extension binding"); session.extensionBinding = structuredClone(extensionBinding); return publicSession(session); });
  }

  /**
   * Idempotent run creation. The commandId uniqueness check happens inside
   * this _mutate closure (the only place safe from races: concurrent calls
   * are serialized through the mutation queue, so two requests racing on the
   * same commandId still observe each other in order).
   */
  /* ── Host operations (schema 18) ───────────────────────────────────── */
  listOperations(sessionId = null) {
    return structuredClone(this.state.operations.filter((op) => !sessionId || op.sessionId === sessionId));
  }
  getOperation(id) {
    const op = this.state.operations.find((item) => item.id === id);
    return op ? structuredClone(op) : null;
  }
  /** Admission for a manual operation shares the serialized closure with Run
   * creation: no active Run anywhere, no running operation; the same
   * requestId replays the same record, a different body under it conflicts. */
  async createOperation({ kind, sessionId, requestId, focus = null, provider, journal }) {
    const requestHash = createHash("sha256").update(JSON.stringify({ kind, sessionId, focus })).digest("hex");
    return this._mutate((state) => {
      if (!state.sessions.some((item) => item.id === sessionId)) throw new Error("session not found");
      const existing = state.operations.find((op) => op.requestId === requestId && op.sessionId === sessionId);
      if (existing) {
        if (existing.requestHash !== requestHash) { const error = new Error("requestId was used for a different operation"); error.code = "IDEMPOTENCY_CONFLICT"; throw error; }
        return { operation: structuredClone(existing), idempotent: true };
      }
      if (state.runs.some((run) => ACTIVE_STATUSES.has(run.status))) { const error = new Error("active run exists"); error.code = "ACTIVE_RUN"; throw error; }
      if (state.operations.some((op) => OPERATION_ACTIVE.has(op.status))) { const error = new Error("operation in progress"); error.code = "OPERATION_ACTIVE"; throw error; }
      const operation = { id: randomUUID(), kind, sessionId, requestId, requestHash, status: "running", reason: "manual", focus, startedAt: now(), settledAt: null,
        provider: structuredClone(provider), journal: structuredClone(journal), result: null, error: null };
      state.operations.push(operation);
      return { operation: structuredClone(operation), idempotent: false };
    });
  }
  async settleOperation(id, { status, result = null, error = null, journal = null }) {
    if (!OPERATION_STATUSES.has(status) || OPERATION_ACTIVE.has(status)) throw new Error("invalid operation settlement");
    return this._mutate((state) => {
      const op = state.operations.find((item) => item.id === id); if (!op) throw new Error("operation not found");
      if (!OPERATION_ACTIVE.has(op.status)) return structuredClone(op);
      op.status = status; op.settledAt = now(); op.result = result ? structuredClone(result) : null; op.error = error ? structuredClone(error) : null;
      if (journal) op.journal = { ...op.journal, ...structuredClone(journal) };
      return structuredClone(op);
    });
  }

  async createRun({ sessionId, input, adapterId, provider, extension, commandId, workspaceHostSession, credentialGeneration, runtimeSnapshot = null, singleActiveRun = false, supersedes = null, expectedRepositoryBindingRevision = null, expectedRepositoryCandidateRevision = null, remote = null }) {
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
      const unresolvedLocalRuns = state.runs.filter(run => localPiRunUnresolved(state, run.id));
      if (unresolvedLocalRuns.length > 0 && (adapterId === "pi-local-print" || unresolvedLocalRuns.some(run => run.sessionId === sessionId))) {
        const error = new Error("a local Pi dispatch requires reconciliation before another Run");
        error.code = "LOCAL_PI_UNRECONCILED";
        throw error;
      }
      if (expectedRepositoryBindingRevision !== null && expectedRepositoryBindingRevision !== session.repositoryBindingRevision) {
        throw repositoryBindingError("BINDING_CHANGED", "repository binding changed during run admission");
      }
      if (expectedRepositoryCandidateRevision !== null && expectedRepositoryCandidateRevision !== session.repositoryCandidateRevision) {
        throw repositoryCandidateError("CANDIDATE_CHANGED", "repository candidate changed during run admission");
      }
      // Lineage admission shares this serialized closure with the commandId
      // check, so two requests racing to continue the same Run still observe
      // each other in order and only one of them wins.
      if (supersedes !== null) assertSupersedable(state, sessionId, supersedes);
      if (state.runs.some((run) => (singleActiveRun || run.sessionId === sessionId) && ACTIVE_STATUSES.has(run.status))) throw new Error("active run exists");
      if (state.operations.some((op) => OPERATION_ACTIVE.has(op.status))) throw new Error("operation in progress");
      const remoteBinding = admitRemoteRun(session, remote, state.runs);
      const timestamp = now();
      const repositoryBindingSnapshot = session.repositoryBinding?.status === "active" ? structuredClone(session.repositoryBinding) : null;
      const repositoryCandidateSnapshot = session.repositoryCandidate?.status === "active" ? structuredClone(session.repositoryCandidate) : null;
      const run = {
        id: randomUUID(), sessionId, status: "running", admissionOpen: true, adapterId,
        provider: checkedProvider, extension: extension ? structuredClone(extension) : null,
        startedAt: timestamp, endedAt: null, error: null,
        commandId, supersedes, artifacts: [], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0, missing: true },
        hostSession: workspaceHostSession ? structuredClone(workspaceHostSession) : null,
        credentialGeneration, repositoryBindingSnapshot, repositoryCandidateSnapshot, remoteBinding,
      };
      bindSubagentRun(state, sessionId, run.id, commandId);
      state.runs.push(run);
      appendEventToState(state, { runId: run.id, sessionId, type: "user.message", data: { text: input } });
      appendEventToState(state, { runId: run.id, sessionId, type: "run.status", data: { status: "running" } });
      if (runtimeSnapshot) appendEventToState(state, { runId: run.id, sessionId, type: "runtime.bound", data: runtimeSnapshot });
      if (repositoryBindingSnapshot) appendEventToState(state, { runId: run.id, sessionId, type: "repository.bound", data: { bindingId: repositoryBindingSnapshot.id, revision: repositoryBindingSnapshot.revision } });
      if (repositoryCandidateSnapshot) appendEventToState(state, { runId: run.id, sessionId, type: "repository.candidate.bound", data: { candidateId: repositoryCandidateSnapshot.id, revision: repositoryCandidateSnapshot.revision, baseCommit: repositoryCandidateSnapshot.baseCommit } });
      session.draft = "";
      return { run: publicRun(run), idempotent: false };
    });
  }

  /* Schema 19 · remote runtime records. The rules live in remote-action-state.mjs;
   * these are its entry points into the one serialized mutation queue. */
  listRemoteActions(sessionId, runId = null) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    return structuredClone((session?.remoteActions ?? []).filter(action => runId === null || action.runId === runId));
  }
  listUnresolvedRemoteActions(sessionId) { return this.listRemoteActions(sessionId).filter(remoteActionUnresolved); }
  hasUnresolvedRemoteAction(sessionId, runId = null) {
    const session = this.state.sessions.find(item => item.id === sessionId);
    return Boolean(session?.remoteActions.some(action => (runId === null || action.runId === runId) && remoteActionUnresolved(action)));
  }
  async recordRemoteIntent(runId, input) { return this._mutate(state => recordRemoteIntent(state, runId, structuredClone(input), { now: now(), activeStatuses: ACTIVE_STATUSES })); }
  async settleRemoteIntent(runId, intentId, outcome) { return this._mutate(state => settleRemoteIntent(state, runId, intentId, structuredClone(outcome), { now: now() })); }
  async bindRemoteSession(runId, intentId, native) { return this._mutate(state => bindRemoteSession(state, runId, intentId, structuredClone(native), { now: now(), activeStatuses: ACTIVE_STATUSES })); }
  async associateRemoteRootTurn(runId, evidence) { return this._mutate(state => associateRemoteRootTurn(state, runId, structuredClone(evidence), { now: now(), activeStatuses: ACTIVE_STATUSES })); }
  async recordRemoteRootTerminal(runId, evidence) { return this._mutate(state => recordRemoteRootTerminal(state, runId, structuredClone(evidence), { now: now() })); }
  listUnsettledRemoteRuns(sessionId) { return structuredClone(this.state.runs.filter(run => run.sessionId === sessionId && remoteRunUnsettled(run))); }
  async claimRemoteCall(runId, input) { return this._mutate(state => claimRemoteCall(state, runId, structuredClone(input), { now: now(), activeStatuses: ACTIVE_STATUSES })); }
  async retainRemoteCallResult(runId, callId, outcome) { return this._mutate(state => retainRemoteCallResult(state, runId, callId, structuredClone(outcome), { now: now() })); }
  async resolveRemoteActions(sessionId, resolutions) { return this._mutate(state => resolveRemoteActions(state, sessionId, structuredClone(resolutions), { now: now() })); }
  async beginRemoteCallDelivery(runId, callId) { return this._mutate(state => beginRemoteCallDelivery(state, runId, callId, { now: now(), activeStatuses: ACTIVE_STATUSES })); }

  async updateRun(id, patch) {
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === id); if (!run) throw new Error("run not found"); Object.assign(run, structuredClone(patch)); if (TERMINAL_STATUSES.has(run.status)) run.endedAt ??= now(); return run; });
  }

  async updateRunWithEvent(id, patch, event) {
    if (typeof event?.type === "string" && event.type.startsWith("local_pi")) {
      const error = new Error("local Pi events require the named Store API"); error.code = "LOCAL_PI_EVENT_RESERVED"; throw error;
    }
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === id); if (!run) throw new Error("run not found"); Object.assign(run, structuredClone(patch)); if (TERMINAL_STATUSES.has(run.status)) run.endedAt ??= now(); if (event) appendEventToState(state, { runId: id, sessionId: run.sessionId, ...event }); return run; });
  }

  async appendEvent({ runId, type, data }) {
    if (typeof type === "string" && type.startsWith("local_pi")) {
      const error = new Error("local Pi events require the named Store API"); error.code = "LOCAL_PI_EVENT_RESERVED"; throw error;
    }
    return this._mutate((state) => { const run = state.runs.find((item) => item.id === runId); if (!run) throw new Error("run not found"); return appendEventToState(state, { runId, sessionId: run.sessionId, type, data }); });
  }

  async recordLocalPiEvent(runId, type, data) {
    const copy = structuredClone(data);
    return this._mutate(state => appendLocalPiEvent(state, { runId, type, data: copy }, appendEventToState));
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
