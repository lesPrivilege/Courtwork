// Shared provider field rules.  This module intentionally has no runtime,
// store, credential, or HTTP dependencies: callers translate ProviderFieldError
// into their own boundary error (HTTP input or invalid persisted state).

/** These values mirror app/runtime/pi-session-runtime.mjs:24.  The helper is
 * kept independent of Pi so the store can enforce the same API domain while
 * validating a state file.  Runtime callers may pass their own allowed list to
 * assertProviderApi when the installed API registry is the authority. */
export const PROVIDER_API_FORMATS = Object.freeze([
  "openai-completions",
  "openai-responses",
]);

export const PROVIDER_FIELD_LIMITS = Object.freeze({
  baseUrl: 2048,
  modelId: 240,
  models: 200,
  apiKey: 4000,
  contextWindowMin: 4,
  contextWindowMax: 100_000_000,
});

export class ProviderFieldError extends TypeError {
  constructor(message, field) {
    super(message);
    this.name = "ProviderFieldError";
    this.field = field;
  }
}

function fail(field, message) {
  throw new ProviderFieldError(message, field);
}

/** Validate one of the host's wire format identifiers.  The optional allowed
 * iterable lets the runtime pass its own API registry without making this
 * pure module import the Pi adapter. */
export function assertProviderApi(value, allowed = PROVIDER_API_FORMATS) {
  const formats = allowed && typeof allowed.includes === "function" ? allowed : [...(allowed ?? [])];
  if (typeof value !== "string" || !formats.includes(value)) fail("api", "unsupported API format");
  return value;
}

function parseBaseUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > PROVIDER_FIELD_LIMITS.baseUrl || /[\s\\\x00-\x1f\x7f]/.test(value)) {
    fail("baseUrl", "baseUrl is invalid");
  }
  // URL() accepts shorthand forms such as `http:foo` and normalizes some
  // backslash forms.  The HTTP preview contract requires an explicit origin,
  // so keep the shared provider domain equally strict here.
  if (!/^https?:\/\//.test(value)) fail("baseUrl", "baseUrl is invalid");
  let parsed;
  try { parsed = new URL(value); } catch { fail("baseUrl", "baseUrl is invalid"); }
  const authority = value.slice(value.indexOf("//") + 2).split(/[\/?#]/, 1)[0];
  if (![
    "http:",
    "https:",
  ].includes(parsed.protocol) || parsed.username || parsed.password || authority.includes("@") || /[?#]/.test(value) || parsed.search || parsed.hash) {
    fail("baseUrl", "baseUrl is not an allowed endpoint");
  }
  return parsed;
}

/** Validate a persisted/request URL without changing its spelling.  `null` is
 * accepted only for catalog records, where no custom endpoint is present. */
export function assertProviderBaseUrl(value, { nullable = false } = {}) {
  if (nullable && value === null) return value;
  parseBaseUrl(value);
  return value;
}

/** Validate and canonicalize a user-entered endpoint. */
export function normalizeProviderBaseUrl(value) {
  parseBaseUrl(value);
  return value.replace(/\/+$/, "");
}

/** Validate one model identifier in the public provider domain.  Whitespace
 * inside an ID remains provider data; only blank IDs and ASCII controls are
 * rejected, matching the directory probe contract. */
export function assertProviderModelId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > PROVIDER_FIELD_LIMITS.modelId || /[\x00-\x1f\x7f]/.test(value)) {
    fail("modelId", "model id is invalid");
  }
  return value;
}

/** Normalize a connection model's optional context window.  Unknown is
 * represented as null; known values use the same safe bounded domain at every
 * provider boundary. */
export function normalizeProviderContextWindow(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value)
    || value < PROVIDER_FIELD_LIMITS.contextWindowMin
    || value > PROVIDER_FIELD_LIMITS.contextWindowMax) {
    fail("contextWindow", "contextWindow must be a positive integer or omitted");
  }
  return value;
}

/** Preserve the historical tri-state declaration without inferring settings.
 * Only reasoningEfforts supplies a precise user-declared parameter set. */
export function normalizeProviderReasoning(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") fail("reasoning", "reasoning must be true, false, or omitted");
  return value;
}

export const REASONING_EFFORTS = Object.freeze(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

export function normalizeReasoningEfforts(value) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length > REASONING_EFFORTS.length || value.some(v => !REASONING_EFFORTS.includes(v)) || new Set(value).size !== value.length) fail("reasoningEfforts", "reasoningEfforts must be a unique list of supported effort values or null");
  return REASONING_EFFORTS.filter(v => value.includes(v));
}

function validateModelEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("models", "model entry is invalid");
  const keys = Object.keys(entry);
  if (keys.some((key) => !["id", "contextWindow", "reasoning", "reasoningEfforts"].includes(key))) fail("models", "model entry has unsupported fields");
  const id = assertProviderModelId(entry.id);
  const contextWindow = normalizeProviderContextWindow(entry.contextWindow);
  const legacyReasoning = normalizeProviderReasoning(entry.reasoning);
  const reasoningEfforts = normalizeReasoningEfforts(entry.reasoningEfforts);
  // An exact current declaration supersedes the old, less precise boolean.
  // Unknown lists preserve the legacy value, including during migration.
  const reasoning = reasoningEfforts === null ? legacyReasoning : reasoningEfforts.length > 0;
  return { id, contextWindow, reasoning, reasoningEfforts };
}

/** Validate a whole model list and return canonical entries.  Catalog records
 * may be empty; compatible connection input opts into the non-empty rule. */
export function validateProviderModels(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > PROVIDER_FIELD_LIMITS.models) {
    fail("models", "models must be a non-empty list");
  }
  const seen = new Set();
  return value.map((entry) => {
    const normalized = validateModelEntry(entry);
    if (seen.has(normalized.id)) fail("models", "model ids must be unique");
    seen.add(normalized.id);
    return normalized;
  });
}

/** API keys use printable non-space ASCII, matching HTTP header transport. */
export function assertProviderApiKey(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > PROVIDER_FIELD_LIMITS.apiKey || !/^[\x21-\x7e]+$/.test(value)) fail('apiKey', 'apiKey is invalid');
  return value;
}
