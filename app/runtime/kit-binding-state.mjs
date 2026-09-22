import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";

const HASH = /^[0-9a-f]{64}$/;
const KIT_ID = /^kit:[a-z0-9][a-z0-9._-]{0,79}$/;
const VERSION = /^[A-Za-z0-9._-]{1,80}$/;
const SUMMARY_BYTES_LIMIT = 128 * 1024;
const MAX_KITS = 8;
const MAX_EVIDENCE = 64;
const PI_ADAPTER_ID = "pi-coding-agent@0.85.1/agent-session";
const PI_ADAPTER_REVISION = "pi-agent-session-context-v1";
const CONTENT_KINDS = new Set(["instruction", "skill", "reference", "prompt_template"]);

export const KIT_BINDING_LIMITS = Object.freeze({
  maxCoreBytes: 400000,
  maxContextBytes: 400000,
  maxContextCharacters: 100000,
  maxPlanBytes: 2097152,
  maxPayloadBytes: 2497152,
  payloadCount: 2,
});

function invalid(detail) {
  const error = new Error(`invalid runtime state: ${detail}`);
  error.code = "INVALID_STATE";
  throw error;
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(`${label} must be an object`);
}

function exact(value, keys, label) {
  record(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) invalid(`${label} has unsupported or missing fields`);
}

function string(value, label, max = 200) {
  if (typeof value !== "string" || value.length === 0 || value.length > max) invalid(`${label} is invalid`);
}

function integer(value, label, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) invalid(`${label} is invalid`);
}

function digest(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) invalid(`${label} is invalid`);
}

const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function declarationPin(declaration, label) {
  exact(declaration, ["descriptor", "descriptorSha256"], label);
  digest(declaration.descriptorSha256, `${label}.descriptorSha256`);
  exact(declaration.descriptor, ["schemaVersion", "id", "version", "core", "deferred", "requirements", "conflicts"], `${label}.descriptor`);
  if (declaration.descriptor.schemaVersion !== 1) invalid(`${label}.descriptor.schemaVersion is invalid`);
  pin({ id: declaration.descriptor.id, version: declaration.descriptor.version, descriptorSha256: declaration.descriptorSha256 }, label);
  for (const key of ["core", "deferred", "requirements", "conflicts"]) {
    if (!Array.isArray(declaration.descriptor[key]) || declaration.descriptor[key].length > 100) invalid(`${label}.descriptor.${key} is invalid`);
  }
  if (declaration.descriptor.core.length < 1) invalid(`${label}.descriptor.core is invalid`);
  const validateContentRef = (value, path, deferred) => {
    exact(value, deferred ? ["resourceId", "contentSha256", "artifactSha256", "required"] : ["resourceId", "contentSha256", "artifactSha256"], path);
    string(value.resourceId, `${path}.resourceId`);
    digest(value.contentSha256, `${path}.contentSha256`);
    digest(value.artifactSha256, `${path}.artifactSha256`);
    if (deferred && typeof value.required !== "boolean") invalid(`${path}.required is invalid`);
  };
  declaration.descriptor.core.forEach((value, index) => validateContentRef(value, `${label}.descriptor.core[${index}]`, false));
  declaration.descriptor.deferred.forEach((value, index) => validateContentRef(value, `${label}.descriptor.deferred[${index}]`, true));
  declaration.descriptor.requirements.forEach((value, index) => {
    const path = `${label}.descriptor.requirements[${index}]`;
    exact(value, ["resourceId", "required"], path);
    string(value.resourceId, `${path}.resourceId`);
    if (typeof value.required !== "boolean") invalid(`${path}.required is invalid`);
  });
  declaration.descriptor.conflicts.forEach((value, index) => {
    string(value, `${label}.descriptor.conflicts[${index}]`, 84);
    if (!KIT_ID.test(value) || value === declaration.descriptor.id) invalid(`${label}.descriptor.conflicts[${index}] is invalid`);
  });
  const actual = sha256(JSON.stringify(canonical(declaration.descriptor)));
  if (actual !== declaration.descriptorSha256) invalid(`${label}.descriptorSha256 does not match the descriptor`);
  if (Buffer.byteLength(JSON.stringify(canonical(declaration.descriptor)), "utf8") > 64 * 1024) invalid(`${label}.descriptor exceeds its limit`);
  return { id: declaration.descriptor.id, version: declaration.descriptor.version, descriptorSha256: declaration.descriptorSha256 };
}

function pin(value, label) {
  exact(value, ["id", "version", "descriptorSha256"], label);
  string(value.id, `${label}.id`, 84);
  if (!KIT_ID.test(value.id)) invalid(`${label}.id is invalid`);
  string(value.version, `${label}.version`, 80);
  if (!VERSION.test(value.version)) invalid(`${label}.version is invalid`);
  digest(value.descriptorSha256, `${label}.descriptorSha256`);
}

function samePin(left, right) {
  return left.id === right.id && left.version === right.version && left.descriptorSha256 === right.descriptorSha256;
}

function comparePin(left, right) {
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  return compare(left.id, right.id) || compare(left.version, right.version) || compare(left.descriptorSha256, right.descriptorSha256);
}

/** Validate the exact, bounded schema-21 Run-owned Kit binding summary. */
export function validateKitBinding(summary) {
  exact(summary, [
    "version", "profile", "controlRevision", "bindingHash", "kits", "planVersion", "compiler", "adapter",
    "compatibility", "policy", "limits", "planSha256", "planPayload", "contextPayload",
  ], "run.kitBinding");
  if (summary.version !== 1) invalid("run.kitBinding.version is invalid");

  exact(summary.profile, ["id", "version", "sourceSha256"], "run.kitBinding.profile");
  string(summary.profile.id, "run.kitBinding.profile.id");
  string(summary.profile.version, "run.kitBinding.profile.version", 80);
  digest(summary.profile.sourceSha256, "run.kitBinding.profile.sourceSha256");
  integer(summary.controlRevision, "run.kitBinding.controlRevision");
  digest(summary.bindingHash, "run.kitBinding.bindingHash");

  if (!Array.isArray(summary.kits) || summary.kits.length < 1 || summary.kits.length > MAX_KITS) invalid("run.kitBinding.kits is invalid");
  const kitIdentities = new Set();
  summary.kits.forEach((value, index) => {
    pin(value, `run.kitBinding.kits[${index}]`);
    const identity = `${value.id}\u0000${value.version}\u0000${value.descriptorSha256}`;
    if (kitIdentities.has(identity)) invalid("run.kitBinding.kits contains a duplicate pin");
    kitIdentities.add(identity);
  });
  if (summary.kits.some((value, index) => index > 0 && comparePin(summary.kits[index - 1], value) >= 0)) invalid("run.kitBinding.kits must use the normalized K1 order");

  if (summary.planVersion !== 1 || summary.compiler !== "kit-context-v1") invalid("run.kitBinding compiler identity is invalid");
  exact(summary.adapter, ["id", "revision"], "run.kitBinding.adapter");
  if (summary.adapter.id !== PI_ADAPTER_ID || summary.adapter.revision !== PI_ADAPTER_REVISION) invalid("run.kitBinding.adapter is invalid");

  exact(summary.compatibility, ["status", "kits"], "run.kitBinding.compatibility");
  if (!["supported", "unchecked"].includes(summary.compatibility.status)) invalid("run.kitBinding.compatibility.status is invalid");
  if (!Array.isArray(summary.compatibility.kits) || summary.compatibility.kits.length !== summary.kits.length) invalid("run.kitBinding.compatibility.kits is invalid");
  let evidenceCount = 0;
  summary.compatibility.kits.forEach((value, index) => {
    exact(value, ["id", "version", "descriptorSha256", "status", "evidence"], `run.kitBinding.compatibility.kits[${index}]`);
    pin({ id: value.id, version: value.version, descriptorSha256: value.descriptorSha256 }, `run.kitBinding.compatibility.kits[${index}]`);
    if (!samePin(value, summary.kits[index])) invalid("run.kitBinding compatibility pin does not match kits");
    if (!["supported", "unchecked"].includes(value.status)) invalid("run.kitBinding compatibility Kit status is invalid");
    if (!Array.isArray(value.evidence)) invalid("run.kitBinding compatibility evidence is invalid");
    evidenceCount += value.evidence.length;
    value.evidence.forEach((evidence, evidenceIndex) => {
      const label = `run.kitBinding.compatibility.kits[${index}].evidence[${evidenceIndex}]`;
      exact(evidence, ["ref", "sha256", "result"], label);
      string(evidence.ref, `${label}.ref`, 4000);
      digest(evidence.sha256, `${label}.sha256`);
      if (!["supported", "unsupported"].includes(evidence.result)) invalid(`${label}.result is invalid`);
    });
    if (value.status === "supported" && (value.evidence.length === 0 || value.evidence.some(evidence => evidence.result !== "supported"))) invalid("a supported Kit requires nonempty supported evidence");
    if (value.status === "unchecked" && value.evidence.length !== 0) invalid("an unchecked Kit cannot retain compatibility evidence");
  });
  if (evidenceCount > MAX_EVIDENCE) invalid("run.kitBinding compatibility evidence exceeds its limit");
  const expectedCompatibility = summary.compatibility.kits.some(value => value.status === "unchecked") ? "unchecked" : "supported";
  if (summary.compatibility.status !== expectedCompatibility) invalid("run.kitBinding compatibility status contradicts its Kit readings");

  if (summary.policy !== "reference-only-pi-unchecked-v1") invalid("run.kitBinding.policy is invalid");
  exact(summary.limits, Object.keys(KIT_BINDING_LIMITS), "run.kitBinding.limits");
  for (const [key, value] of Object.entries(KIT_BINDING_LIMITS)) {
    if (summary.limits[key] !== value) invalid(`run.kitBinding.limits.${key} is invalid`);
  }
  digest(summary.planSha256, "run.kitBinding.planSha256");
  exact(summary.planPayload, ["sha256", "bytes"], "run.kitBinding.planPayload");
  digest(summary.planPayload.sha256, "run.kitBinding.planPayload.sha256");
  integer(summary.planPayload.bytes, "run.kitBinding.planPayload.bytes", { positive: true });
  if (summary.planPayload.bytes > KIT_BINDING_LIMITS.maxPlanBytes) invalid("run.kitBinding.planPayload exceeds its limit");
  exact(summary.contextPayload, ["sha256", "bytes", "characters"], "run.kitBinding.contextPayload");
  digest(summary.contextPayload.sha256, "run.kitBinding.contextPayload.sha256");
  integer(summary.contextPayload.bytes, "run.kitBinding.contextPayload.bytes");
  integer(summary.contextPayload.characters, "run.kitBinding.contextPayload.characters");
  if (summary.contextPayload.bytes > KIT_BINDING_LIMITS.maxContextBytes) invalid("run.kitBinding.contextPayload bytes exceed their limit");
  if (summary.contextPayload.characters > KIT_BINDING_LIMITS.maxContextCharacters) invalid("run.kitBinding.contextPayload characters exceed their limit");
  if (summary.planPayload.bytes + summary.contextPayload.bytes > KIT_BINDING_LIMITS.maxPayloadBytes) invalid("run.kitBinding payloads exceed their total limit");

  let encoded;
  try { encoded = JSON.stringify(summary); } catch { invalid("run.kitBinding is not JSON serializable"); }
  if (Buffer.byteLength(encoded, "utf8") > SUMMARY_BYTES_LIMIT) invalid("run.kitBinding exceeds its summary limit");
  return structuredClone(summary);
}

function runtimeBoundEvents(state, runId) {
  return state.events.filter(event => event.runId === runId && event.type === "runtime.bound");
}

function validateBoundSnapshot(data, run, summary) {
  exact(data, ["revision", "hash", "sessionScope", "composition", "resources", "content", "policies", "context", "kitBinding"], "runtime.bound.data");
  if (data.revision !== summary.controlRevision || data.hash !== summary.bindingHash) invalid("runtime.bound revision or hash does not match its Kit binding");
  exact(data.sessionScope, ["kind", "projectId"], "runtime.bound.data.sessionScope");
  if (!["project", "unassigned"].includes(data.sessionScope.kind)) invalid("a Kit Run requires an ordinary Chat Session");
  if (data.sessionScope.kind === "project" ? typeof data.sessionScope.projectId !== "string" : data.sessionScope.projectId !== null) invalid("runtime.bound Session scope is invalid");

  record(data.composition, "runtime.bound.data.composition");
  if (data.composition.id !== summary.profile.id || data.composition.version !== summary.profile.version
    || data.composition.hash !== summary.profile.sourceSha256) invalid("runtime.bound profile does not match its Kit binding");
  if (data.composition.schemaVersion !== 2 || data.composition.status !== "compatible") invalid("a Kit Run requires a compatible v2 profile");
  exact(data.composition.selectionScope, ["type", "id"], "runtime.bound.data.composition.selectionScope");
  if (data.composition.selectionScope.type !== "session" || data.composition.selectionScope.id !== run.sessionId) invalid("the Kit profile selection is not bound to this Session");
  if (!Array.isArray(data.composition.kits) || data.composition.kits.length < 1 || data.composition.kits.length > MAX_KITS) invalid("runtime.bound profile Kit declarations do not match the summary");
  const declarationPins = new Map();
  data.composition.kits.forEach((declaration, index) => {
    const parsed = declarationPin(declaration, `runtime.bound.data.composition.kits[${index}]`);
    declarationPins.set(`${parsed.id}\u0000${parsed.version}\u0000${parsed.descriptorSha256}`, parsed);
  });
  const normalizedPins = [...declarationPins.values()].sort(comparePin);
  if (!isDeepStrictEqual(normalizedPins, summary.kits)) invalid("runtime.bound profile Kit pins do not match the normalized K1 summary");

  if (!Array.isArray(data.resources) || data.resources.length > 1024 || !Array.isArray(data.content) || data.content.length > 500
    || !Array.isArray(data.policies) || data.policies.length > 501 || !Array.isArray(data.context) || data.context.length > 500) invalid("runtime.bound snapshot collections are invalid");
  const resources = new Map();
  for (const resource of data.resources) {
    record(resource, "runtime.bound.data.resource");
    string(resource.id, "runtime.bound.data.resource.id");
    if (resources.has(resource.id)) invalid("runtime.bound resource id is duplicated");
    resources.set(resource.id, resource);
  }
  let contentCharacters = 0;
  const contentIds = new Set();
  for (const item of data.content) {
    exact(item, ["id", "kind", "title", "scope", "content"], "runtime.bound.data.content item");
    string(item.id, "runtime.bound.data.content.id");
    if (!/^local:[a-z0-9][a-z0-9._-]{0,79}$/.test(item.id) || contentIds.has(item.id)) invalid("runtime.bound content id is invalid or duplicated");
    contentIds.add(item.id);
    if (!CONTENT_KINDS.has(item.kind)) invalid("runtime.bound content kind is invalid");
    string(item.title, "runtime.bound.data.content.title");
    if (typeof item.content !== "string" || item.content.length === 0 || item.content.length > 100000) invalid("runtime.bound content body is invalid");
    contentCharacters += item.content.length;
    exact(item.scope, ["type", "id"], "runtime.bound.data.content.scope");
    if (!["user", "workspace", "session"].includes(item.scope.type)
      || (item.scope.type === "user" ? item.scope.id !== "local" : typeof item.scope.id !== "string" || item.scope.id.length === 0 || item.scope.id.length > 200)) invalid("runtime.bound content scope is invalid");
    const resource = resources.get(item.id);
    if (!resource || resource.exposed !== true || resource.kind !== item.kind || resource.title !== item.title
      || !isDeepStrictEqual(resource.scope, item.scope) || resource.source?.hash !== sha256(item.content)) invalid("runtime.bound content does not match its exposed resource identity");
  }
  if (contentCharacters > 500000) invalid("runtime.bound content exceeds its total limit");
  for (const resource of data.resources) {
    if (resource.exposed === true && CONTENT_KINDS.has(resource.kind) && !contentIds.has(resource.id)) invalid("an exposed content resource is missing its exact body");
  }
  const expectedHash = sha256(JSON.stringify({ revision: data.revision, sessionScope: data.sessionScope, resources: data.resources,
    composition: data.composition, policies: data.policies }));
  if (data.hash !== expectedHash) invalid("runtime.bound hash does not match its snapshot");
}

/** Validate cross-record Kit authority and immutable Store transitions. */
export function validateKitBindings(state, previousState = null) {
  if (!state || !Array.isArray(state.runs) || !Array.isArray(state.events)) invalid("Kit binding state is invalid");
  for (const run of state.runs) {
    const bound = runtimeBoundEvents(state, run.id);
    if (run.kitBinding === null) {
      if (bound.some(event => event.data?.kitBinding !== undefined && event.data.kitBinding !== null)) invalid("a non-Kit Run cannot have runtime.bound Kit authority");
      // On load there is no previous state to compare. Removing both summary
      // projections must not turn retained Kit declarations into legacy history.
      if (bound.some(event => event.data?.composition?.schemaVersion === 2
        && Array.isArray(event.data.composition.kits) && event.data.composition.kits.length > 0)) {
        invalid("a Kit-bearing runtime.bound composition requires a Run Kit binding");
      }
      continue;
    }
    const summary = validateKitBinding(run.kitBinding);
    if (bound.length !== 1) invalid("a Kit Run must have exactly one runtime.bound event");
    const event = bound[0];
    if (!Object.hasOwn(event.data, "kitBinding") || !isDeepStrictEqual(event.data.kitBinding, summary)) invalid("runtime.bound Kit binding does not equal its Run summary");
    validateBoundSnapshot(event.data, run, summary);
    if (event.sessionId !== run.sessionId || run.adapterId !== summary.adapter.id) invalid("Kit Run session or Adapter does not match its binding");
    const sparkChild = state.subagents?.assignments?.some(assignment => assignment.attempts?.some(attempt => attempt.sessionId === run.sessionId));
    if (run.extension !== null || run.remoteBinding !== null || sparkChild) invalid("Kit binding is not allowed for extension, remote, or Spark Runs");
  }

  if (previousState) {
    const currentRuns = new Map(state.runs.map(run => [run.id, run]));
    for (const previousRun of previousState.runs) {
      const currentRun = currentRuns.get(previousRun.id);
      if (!currentRun) continue;
      if ((previousRun.kitBinding !== null || currentRun.kitBinding !== null)
        && !isDeepStrictEqual(currentRun.kitBinding, previousRun.kitBinding)) invalid("an existing Run Kit binding is immutable");
      if (previousRun.kitBinding !== null) {
        const previousEvents = runtimeBoundEvents(previousState, previousRun.id);
        const currentEvents = runtimeBoundEvents(state, previousRun.id);
        if (!isDeepStrictEqual(currentEvents, previousEvents)) invalid("an existing Kit runtime.bound event is immutable");
      }
    }
  }
  return true;
}
