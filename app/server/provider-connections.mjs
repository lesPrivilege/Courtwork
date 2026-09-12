import { declaredThinkingMap } from "../runtime/model-capabilities.mjs";
// A CONNECTION is the unit of provider identity in this host: one endpoint,
// one wire format, one credential, one model list. Every route runs through a
// connection, including the three catalog ones, so there is exactly one shape
// to reason about and exactly one credential key space (the connection id).
//
// This module is pure: no store, no ModelRuntime, no credential file. It owns
// the record shape, the identity derivation and the honest reading of a model
// whose capabilities the directory never reported.

import { API_FORMATS, DEEPSEEK_PROVIDER_ID, FAKE_API_ID, FAKE_PROVIDER_ID, OPENAI_PROVIDER_ID } from "../runtime/pi-session-runtime.mjs";
import { assertProviderApiKey, assertProviderApi, normalizeProviderBaseUrl, validateProviderModels } from "./provider-fields.mjs";

/** Catalog provider identities: the closed set this build ships with. */
export const CATALOG_PROVIDER_IDS = Object.freeze([FAKE_PROVIDER_ID, DEEPSEEK_PROVIDER_ID, OPENAI_PROVIDER_ID]);

export const CATALOG_CONNECTION_PREFIX = "catalog-";
export const USER_CONNECTION_PREFIX = "conn-";

/** The exact sentence a run record and /provider-config state when a model's
 * context window was never reported. The host does not invent a window, and
 * does not pretend compaction is running. */
export const UNKNOWN_WINDOW_NOTICE = "context window unknown, compaction disabled";

/** Connection id of the default connection for a catalog provider identity.
 * Disjoint from `USER_CONNECTION_PREFIX` and from the provider ids themselves. */
export function catalogConnectionId(providerId) {
  return CATALOG_CONNECTION_PREFIX + providerId;
}

/** Runtime provider id of a connection. For a catalog connection it is the
 * catalog identity; for a user connection it is the connection id itself,
 * which can never collide with a catalog id because of the `conn-` prefix.
 * This is the PV-31 requirement: a user connection never registers onto a
 * catalog provider id, whose credential slot is single. */
export function providerIdentityOf(connection) {
  return connection.providerIdentity;
}

export function isUserConnection(connection) {
  return connection.kind === "compatible";
}

export function defaultConnections(catalogApiFor = defaultCatalogApi) {
  return CATALOG_PROVIDER_IDS.map((providerId) => ({
    id: catalogConnectionId(providerId),
    kind: "catalog",
    providerIdentity: providerId,
    api: catalogApiFor(providerId),
    baseUrl: null,
    models: [],
  }));
}

function defaultCatalogApi(providerId) {
  return providerId === FAKE_PROVIDER_ID ? FAKE_API_ID : API_FORMATS[0];
}

/** Where a model's context window came from. `catalog` means the installed
 * runtime catalog reported it; `user` means a person typed it; `unknown` means
 * nobody knows and the host refuses to guess (PV-27 / PV-30). */
export function contextWindowSourceOf(connection, entry) {
  if (connection.kind === "catalog") return "catalog";
  return Number.isSafeInteger(entry?.contextWindow) ? "user" : "unknown";
}

/** The record as served over HTTP: persisted fields plus derived ones.
 * `credentialStatus` is derived from the credential file rather than stored,
 * so there is only one source of truth for "is a key present". */
export function publicConnection(connection, { credentialStatus }) {
  return {
    id: connection.id,
    kind: connection.kind,
    providerIdentity: connection.providerIdentity,
    api: connection.api,
    baseUrl: connection.baseUrl,
    models: connection.models.map((entry) => ({
      id: entry.id,
      contextWindow: entry.contextWindow,
      contextWindowSource: contextWindowSourceOf(connection, entry),
      reasoning: entry.reasoning ?? null,
      reasoningEfforts: entry.reasoningEfforts ?? null,
    })),
    credentialStatus,
  };
}

export class ConnectionInputError extends Error {
  constructor(message, code = "invalid_connection") {
    super(message);
    this.code = code;
  }
}

function invalid(message) {
  throw new ConnectionInputError(message);
}

function normalizedBaseUrl(value) {
  try { return normalizeProviderBaseUrl(value); }
  catch (error) { invalid(error.message); }
}

function normalizedModels(value, options = {}) {
  try { return validateProviderModels(value, options); }
  catch (error) { invalid(error.message); }
}

/** Validate the body of a compatible-connection create/replace request.
 * `apiKey` is returned separately: it never becomes part of the record. */
export function validateConnectionInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("body must be an object");
  const keys = Object.keys(value);
  if (keys.some((key) => !["api", "baseUrl", "models", "apiKey"].includes(key))) invalid("body has unsupported fields");
  try { assertProviderApi(value.api, API_FORMATS); }
  catch (error) { invalid(error.message); }
  const baseUrl = normalizedBaseUrl(value.baseUrl);
  const models = normalizedModels(value.models);
  let apiKey;
  if (value.apiKey !== undefined) {
    try { apiKey = assertProviderApiKey(value.apiKey); }
    catch (error) { invalid(error.message); }
  }
  return { record: { api: value.api, baseUrl, models }, apiKey };
}

/** Cost is an explicit zero so pi-ai's calculateCost cannot dereference an
 * undefined `cost`. It is NOT a claim that the route is free: this host has no
 * cost surface at all (no endpoint or view reports a price), so no reader can
 * mistake this zero for a reported charge. `contextWindow` and `maxTokens` stay
 * undefined when unknown — the honest reading, not a fabricated ceiling.
 * Only an exact reasoningEfforts declaration registers control values; a
 * legacy boolean never creates Pi's generic default ladder. */
export function registrationInput(connection) {
  return {
    name: `Compatible connection ${connection.id}`,
    baseUrl: connection.baseUrl,
    api: connection.api,
    models: connection.models.map((entry) => ({
      id: entry.id,
      name: entry.id,
      api: connection.api,
      baseUrl: connection.baseUrl,
      reasoning: (entry.reasoningEfforts?.length ?? 0) > 0,
      thinkingLevelMap: declaredThinkingMap(entry),
      // This connection selected the generic OpenAI protocol. URL substrings
      // must not silently select a different vendor's reasoning grammar.
      compat: { thinkingFormat: "openai", supportsReasoningEffort: true, requiresReasoningContentOnAssistantMessages: false, requiresThinkingAsText: false },
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      ...(Number.isSafeInteger(entry.contextWindow) ? { contextWindow: entry.contextWindow } : {}),
    })),
  };
}

/** The extra models a CATALOG connection adds beyond the installed catalog
 * (PV-59): models a person typed in that pi's own bundled catalog never
 * shipped for this provider identity. Unlike `registrationInput` (which
 * builds a whole compatible-connection provider), this returns only the
 * per-model entries; the caller (`registerCatalogExtraModels` in
 * `app/runtime/pi-session-runtime.mjs`) merges them onto the SAME native
 * provider definition captured at startup, filling in the native `baseUrl`
 * itself — a catalog connection's extras have no endpoint of their own. */
export function registrationExtras(connection) {
  return connection.models.map((entry) => ({
    id: entry.id,
    name: entry.id,
    provider: connection.providerIdentity,
    api: connection.api,
    reasoning: (entry.reasoningEfforts?.length ?? 0) > 0,
      thinkingLevelMap: declaredThinkingMap(entry),
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    ...(Number.isSafeInteger(entry.contextWindow) ? { contextWindow: entry.contextWindow } : {}),
  }));
}

/** Validate the body of a `PUT` on a CATALOG connection. Only `{models}` is
 * accepted (PV-59): `api`/`baseUrl`/`apiKey` are the installed catalog's own
 * facts, not user input, and the credential route is unchanged
 * (`PUT /provider-credential` still keys off the connection id either way).
 * `models` may be empty — that is how the extra list is cleared back out. */
export function validateCatalogConnectionInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("body must be an object");
  const keys = Object.keys(value);
  if (keys.some((key) => key !== "models")) invalid("a catalog connection only accepts its extra models");
  return { models: normalizedModels(value.models, { allowEmpty: true }) };
}

/** Old `credentials.json` keys were provider ids. Re-home each onto that
 * provider's default connection; drop anything that names no connection.
 * One migration, no compatibility layer: the file is rewritten in the new
 * key space and the old key never resolves again. */
export function migrateCredentialKeys(entries, connections) {
  const byId = new Set(connections.map((connection) => connection.id));
  const migrated = {};
  const moved = [];
  const dropped = [];
  for (const [key, apiKey] of Object.entries(entries)) {
    if (byId.has(key)) { migrated[key] = apiKey; continue; }
    const target = connections.find((connection) => connection.kind === "catalog" && connection.providerIdentity === key);
    if (target) { migrated[target.id] = apiKey; moved.push([key, target.id]); continue; }
    dropped.push(key);
  }
  return { entries: migrated, moved, dropped, changed: moved.length > 0 || dropped.length > 0 };
}
