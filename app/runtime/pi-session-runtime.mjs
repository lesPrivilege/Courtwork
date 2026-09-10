import { observeRequestStream } from "./request-telemetry.mjs";
import {
  createAgentSession,
  createExtensionRuntime,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore, createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import * as openaiCompletions from "@earendil-works/pi-ai/api/openai-completions";
import * as openaiResponses from "@earendil-works/pi-ai/api/openai-responses";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";

// Host wraps Pi coding-agent v3 AgentSession (in-process SDK). This module owns
// no persistence and no SE-specific fields; the service supplies credentials,
// tools, and event/settle callbacks. No core patch, no bindExtensions, no
// default coding tools, no resource/extension discovery.

export const FAKE_PROVIDER_ID = "fake-openai-loopback";
export const FAKE_MODEL_ID = "fake-model";
export const FAKE_API_ID = "openai-completions";
export const FAKE_CREDENTIAL_KEY = "fake-local-loopback-key";

export const DEEPSEEK_PROVIDER_ID = "deepseek";
export const OPENAI_PROVIDER_ID = "openai";
export const API_FORMATS = Object.freeze(["openai-completions", "openai-responses"]);

const NO_API_KEY_PATTERN = /no api key found/i;
const AUTH_FAILED_PATTERN = /\b(401|403|unauthorized|forbidden|invalid[_ -]?api[_ -]?key|authentication)\b/i;

/**
 * A ResourceLoader that discovers nothing: no extensions, skills, prompt
 * templates, themes, AGENTS.md files, or settings-file resources. Supplying
 * any ResourceLoader instance to createAgentSession skips construction of
 * DefaultResourceLoader entirely (sdk.ts:185-189).
 */
export function createEmptyResourceLoader(systemPrompt) {
  const runtime = createExtensionRuntime();
  return {
    getExtensions: () => ({ extensions: [], errors: [], runtime }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => systemPrompt,
    getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [],
    getAppendSystemPromptSources: () => [],
    extendResources: () => {},
    reload: async () => {},
  };
}

// Native (bundled-catalog) provider definitions, captured once per ModelRuntime
// instance at the moment this host first registers them -- BEFORE any catalog
// connection's extra models exist. A catalog connection's admissible set is
// "the installed catalog UNION the extras it saved" (PV-59); recomputing that
// union from this stable baseline, rather than from whatever is CURRENTLY
// registered, is what makes adding and removing extras idempotent instead of
// accumulating stale entries across repeated saves. Keyed by the ModelRuntime
// instance (not a bare module-level map) because more than one ModelRuntime
// exists in one process across tests, each with its own fake-provider baseUrl.
const nativeCatalogTemplates = new WeakMap();

function templatesFor(modelRuntime) {
  let map = nativeCatalogTemplates.get(modelRuntime);
  if (!map) { map = new Map(); nativeCatalogTemplates.set(modelRuntime, map); }
  return map;
}

function captureNativeTemplate(modelRuntime, template, models) {
  templatesFor(modelRuntime).set(template.id, { template, models });
  modelRuntime.registerNativeProvider(createProvider({ ...template, models }));
}

/**
 * Build the one ModelRuntime instance used by this host. Credentials live
 * only in an in-memory store; modelsPath:null disables the on-disk
 * models-store lookup; allowModelNetwork is left at its default (false), so
 * ModelRuntime.create() never refreshes catalogs from the network. No
 * `agentDir`/HOME path is read anywhere in this construction.
 */
export async function createIsolatedModelRuntime() {
  const runtime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    refreshOnCreate: false,
  });
  // Native provider factories have a single default transport. Register the
  // SDK's public per-API dispatch map so the chosen format actually selects
  // its encoder/stream parser; changing model.api alone is insufficient.
  for (const id of [DEEPSEEK_PROVIDER_ID, OPENAI_PROVIDER_ID]) {
    const provider = runtime.getProvider(id);
    const models = [...runtime.getModels(id)];
    const template = {
      id, name: provider.name, baseUrl: provider.baseUrl,
      auth: { apiKey: envApiKeyAuth(`${provider.name} application key`, []) },
      api: {
        "openai-completions": { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
        "openai-responses": { stream: openaiResponses.stream, streamSimple: openaiResponses.streamSimple },
      },
    };
    captureNativeTemplate(runtime, template, models);
  }
  return runtime;
}

/**
 * Register the fake-openai-loopback provider on the shared ModelRuntime so
 * the deterministic test route resolves its key through the SAME credential
 * lane (setRuntimeApiKey + InMemoryCredentialStore) as the real provider,
 * rather than a hardcoded resolver.
 */
export function registerFakeProvider(modelRuntime, fakeProviderHandle) {
  const template = {
    id: FAKE_PROVIDER_ID,
    name: "Fake OpenAI loopback",
    baseUrl: fakeProviderHandle.baseUrl,
    auth: { apiKey: envApiKeyAuth("Fake loopback key", []) },
    api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
  };
  captureNativeTemplate(modelRuntime, template, [fakeProviderHandle.model]);
}

/** The ids of a provider identity's INSTALLED (bundled-catalog) models --
 * never the extras a catalog connection has saved on top. Used only to reject
 * an extra model id that would shadow one already in the native catalog
 * (PV-59): a person's typo must not silently replace the definition Run
 * already resolves through the native provider. */
export function nativeCatalogModelIds(modelRuntime, providerId) {
  return new Set((templatesFor(modelRuntime).get(providerId)?.models ?? []).map((model) => model.id));
}

/**
 * Register a catalog connection's extra models (PV-59) -- models a person
 * added beyond the installed catalog -- on the SAME native provider id used
 * at Run time, WITHOUT touching that id's credential slot.
 *
 * This deliberately does NOT go through `ModelRuntime.registerProvider`. Two
 * facts about that method, read from
 * `app/node_modules/@earendil-works/pi-coding-agent/dist/core/model-runtime.js`
 * and `.../core/provider-composer.js`, rule it out for an id that already has
 * a NATIVE registration (as `deepseek`/`openai`/the fixture identity do,
 * above):
 *   1. `registerProvider(providerId, config)` unconditionally deletes the
 *      native registration for that id (`this.nativeExtensionProviders.delete
 *      (providerId)`, model-runtime.js:562) and recomposes from
 *      `this.builtins.get(providerId)` instead (model-runtime.js:134) -- pi-ai's
 *      OWN bundled provider, which has only a single default transport, not
 *      this host's explicit two-API-format dispatch map. Using it would
 *      silently drop `openai-responses` support for the whole identity.
 *   2. Even setting that aside, `config.models` is a WHOLESALE REPLACEMENT of
 *      the provider's model list, not a per-id merge: `applyExtension`
 *      (provider-composer.js:118-141) returns exactly
 *      `config.models.map(...)`, discarding every base model not named in
 *      `config.models`. There is no "field-level merge, append extras" path
 *      to opt into.
 * So this host recomposes the SAME native definition captured at startup
 * (`nativeCatalogTemplates`) with the extras layered on top by id, and
 * re-registers it with `registerNativeProvider` -- the untouched credential
 * store (keyed by provider id, entirely separate from provider definitions)
 * means neither step above ever risks the slot. Called fresh from the native
 * baseline every time (never incrementally), so removing an extra (a shorter
 * `extraModels` list) is exactly PUT-and-recompute, not a separate deletion.
 */
export function registerCatalogExtraModels(modelRuntime, providerId, extraModels) {
  const native = templatesFor(modelRuntime).get(providerId);
  if (!native) throw new Error(`no native catalog definition for provider ${providerId}`);
  const byId = new Map(native.models.map((model) => [model.id, model]));
  for (const extra of extraModels) byId.set(extra.id, { ...extra, baseUrl: native.template.baseUrl });
  modelRuntime.registerNativeProvider(createProvider({ ...native.template, models: [...byId.values()] }));
}

/**
 * Register one user-defined connection as its OWN provider id, merging fields
 * into any previous registration (`registerProvider`, not
 * `registerNativeProvider`): the credential lane is a single slot per provider
 * id, so a compatible endpoint must never be registered onto a catalog
 * identity. `config` comes from `server/provider-connections.mjs`; this module
 * only performs the registration.
 */
export function registerConnectionProvider(modelRuntime, providerId, config) {
  modelRuntime.registerProvider(providerId, config);
}

export function unregisterConnectionProvider(modelRuntime, providerId) {
  modelRuntime.unregisterProvider(providerId);
}

/** Credential provenance as pi-coding-agent itself grades it
 * (`runtime` / `stored` / `environment`, plus its other configured sources).
 * The host does not invent a classification of its own. */
export function credentialSourceOf(modelRuntime, providerId) {
  const status = modelRuntime.getProviderAuthStatus(providerId);
  return status?.configured ? (status.source ?? null) : null;
}

/** Usage counters only. Whether the accounting is COMPLETE is a terminal-state
 * judgement, so `missing` belongs to the service (the run's status owner), not
 * to this host wrapper: the wrapper's job is to never lose a number it saw. */
function newCounters() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 };
}

function addUsage(totals, usage) {
  if (!usage) return;
  totals.input += usage.input ?? 0;
  totals.output += usage.output ?? 0;
  totals.cacheRead += usage.cacheRead ?? 0;
  totals.cacheWrite += usage.cacheWrite ?? 0;
}

export function classifyRuntimeError(message) {
  const text = String(message ?? "");
  if (NO_API_KEY_PATTERN.test(text)) return "credential_missing";
  if (AUTH_FAILED_PATTERN.test(text)) return "provider_auth_failed";
  return "provider_error";
}

/**
 * PV-62 ①/PV-84: a verify receipt's `status` may only be set from a
 * STRUCTURED signal (an HTTP status code, a field this host itself owns) --
 * never a regex over prose. The first cut of this function (see git history)
 * read pi-coding-agent 0.85.1's generation surface as offering only three
 * such signals -- `stopReason`, this host's own timeout, and nothing else --
 * because `ModelRuntime.complete()` never rejects and every provider-side
 * failure is collapsed into a flat `errorMessage` string
 * (pi-ai/dist/api/openai-completions.js:506-526,
 * `output.errorMessage = formatProviderError(normalizeProviderError(error))`).
 * That reading MISSED a structured signal that survives independently of
 * `errorMessage`: both api modules call
 * `options.onResponse?.({ status, headers }, model)` right after their
 * request resolves (openai-completions.js:218, openai-responses.js:128), and
 * `ModelRuntime.prepareRequest` forwards `onResponse` (and any other option
 * this host passes) through to that call unchanged
 * (pi-coding-agent/dist/core/model-runtime.js:433 destructures out only
 * `transformHeaders`; :441-448 spread the rest into the options handed to
 * `provider.stream`).
 *
 * `onResponse` alone, however, does not carry the failing statuses this
 * receipt needs to name: the vendored `openai` npm SDK's
 * `client...create(...).withResponse()` REJECTS for any non-2xx response
 * before that call site is ever reached (`openai/client.js`'s
 * `Client#makeRequest`, the `if (!response.ok) { ...; throw err; }` branch;
 * `openai/core/api-promise.js`'s `parse()`/`asResponse()` both chain off the
 * same rejected `responsePromise`). So a 401 or a 404 upstream never calls
 * `onResponse` at all -- verified both by reading the vendored SDK and by an
 * empirical probe against the local fixture (`onResponse` fired with 200 on
 * success, never fired on a 401 or a 404). `httpStatus` below is therefore
 * captured through the ONE layer pi exposes that sees the raw response on
 * every path, success or failure: the `fetch` override `createClient` wires
 * straight into the OpenAI SDK client
 * (openai-completions.js:203, `createClient(model, context, apiKey,
 * options?.headers, options?.fetch, ...)`), itself forwarded unchanged by
 * the same `prepareRequest` spread that forwards `onResponse`. `#verifyProviderConnection`
 * (`app/server/service.mjs`) passes both: the wrapped `fetch` is what
 * actually supplies `httpStatus` on a failure; `onResponse` is passed too
 * (harmless, and it is what PV-84 asked for) but can only ever confirm what
 * the fetch wrapper already captured, since it is unreachable on the
 * statuses this receipt cares about classifying.
 *
 * With a real `httpStatus` available on every path, `authentication_failed`
 * (401/403), `http_error` (any other non-2xx) and `malformed_response` (a
 * 2xx response whose body pi then failed to parse into a complete message)
 * all become reachable, alongside the original `ok`/`timeout`. `unreachable`
 * is the network-layer case: the wrapped fetch itself never resolved (DNS
 * failure, connection refused, ...), so `httpStatus` stays `null` -- this is
 * also the residual bucket for any error where the request never reached a
 * response at all. `model_not_found` stays UNREACHABLE: the hook that
 * supplies `httpStatus` carries no response body, so there is no structured
 * way to tell "404 because the model id is wrong" apart from any other
 * non-2xx status without parsing prose -- which PV-62 ① forbids. `unknown`
 * remains the honest catch-all for whatever this enumeration does not name
 * (for example a signal-aborted request that was not this host's own timer).
 */
export function classifyVerifyOutcome(message, { timedOut, httpStatus }) {
  if (message.stopReason !== "error" && message.stopReason !== "aborted") return "ok";
  if (timedOut) return "timeout";
  if (httpStatus === 401 || httpStatus === 403) return "authentication_failed";
  if (httpStatus !== null && (httpStatus < 200 || httpStatus > 299)) return "http_error";
  if (httpStatus === null) return "unreachable";
  if (httpStatus >= 200 && httpStatus <= 299) return "malformed_response";
  return "unknown";
}

/** Use Pi's compaction with a model-sized window and a bounded number of
 * operations per Run. The scripted fake is opt-in so its command fixtures
 * are not summarized as though they were natural-language conversations. */
export function resolveCompactionPolicy(model, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("compaction must be an object");
  const allowed = new Set(["enabled", "reserveTokens", "keepRecentTokens", "maxCompactions"]);
  if (Object.keys(options).some((key) => !allowed.has(key))) throw new TypeError("unknown compaction option");
  if (options.enabled !== undefined && typeof options.enabled !== "boolean") throw new TypeError("compaction.enabled must be boolean");
  const window = model.contextWindow;
  const enabled = options.enabled ?? (model.provider !== FAKE_PROVIDER_ID);
  if (!Number.isSafeInteger(window) || window < 4) {
    if (enabled) throw new RangeError("compaction requires a known model context window");
    return { enabled: false, reserveTokens: 1, keepRecentTokens: 1, maxCompactions: 4 };
  }
  const reserveTokens = options.reserveTokens ?? Math.min(16384, Math.floor(window / 4));
  const keepRecentTokens = options.keepRecentTokens ?? Math.min(20000, Math.floor(window / 2));
  const maxCompactions = options.maxCompactions ?? 4;
  if (![reserveTokens, keepRecentTokens, maxCompactions].every((value) => Number.isSafeInteger(value) && value > 0)
    || reserveTokens + keepRecentTokens > window || maxCompactions > 100) throw new RangeError("invalid compaction limits");
  return { enabled, reserveTokens, keepRecentTokens, maxCompactions };
}

/**
 * Start one Run's AgentSession. Creates a fresh AgentSession per Run (bound
 * to this run's tool closures) against a caller-supplied SessionManager,
 * which is what carries continuity across Runs within one app session.
 */
export async function createSessionRun({
  cwd,
  agentDir,
  modelRuntime,
  model,
  sessionManager,
  customTools,
  maxTurns,
  input,
  systemPrompt,
  currentContext = "",
  onEvent,
  onNotice,
  compaction = {},
  beforeTool,
  beforeExtraInput,
  beforeInitialInput,
  reasoningEffort,
  onTelemetry,
}) {
  const compactionPolicy = resolveCompactionPolicy(model, compaction);
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    model,
    ...(reasoningEffort !== undefined ? { thinkingLevel: reasoningEffort } : {}),
    noTools: "builtin",
    customTools: customTools.map(tool => ({...tool, execute: async (...args) => {
      await drain();
      await beforeTool?.(tool.name,args[1],args[0]);
      return tool.execute(...args);
    }})).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    resourceLoader: createEmptyResourceLoader(systemPrompt),
    sessionManager,
    settingsManager: SettingsManager.inMemory({ compaction: {
      enabled: compactionPolicy.enabled,
      reserveTokens: compactionPolicy.reserveTokens,
      keepRecentTokens: compactionPolicy.keepRecentTokens,
    } }),
  });

  // Pi may resume prompt() after pre-prompt compaction was aborted, before
  // its Agent had an active abort controller. Keep cancellation sticky across
  // that transition and enforce it at the public transport seam.
  let stopped = false;
  let requestOrdinal = 0;
  let requestPurpose = "agent";
  const nativeStream = session.agent.streamFunction;
  session.agent.streamFunction = (requestModel, context, options) => {
    if (stopped) {
      const error = new Error("Run cancelled"); error.name = "AbortError"; throw error;
    }
    return observeRequestStream({ model: requestModel, context, requestId: ++requestOrdinal, purpose: requestPurpose,
      requestedEffort: reasoningEffort ?? null, effectiveEffort: session.thinkingLevel,
      record: data => forward(onTelemetry, data),
      start: () => nativeStream(requestModel, context, { ...options, sessionId: sessionManager.getSessionId(), cacheRetention: options?.cacheRetention ?? "short" }),
    });
  };
  const abort = async () => {
    stopped = true;
    session.setAutoCompactionEnabled(false);
    await session.abort();
  };

  // AgentSession emits synchronously and does not await subscriber promises.
  // Observe host persistence explicitly, so terminal receipts include all
  // admitted events and a storage failure cannot become a completed Run.
  const pending = new Set();
  let projectionError = null;
  const failedProjection = (error) => {
    projectionError ??= error;
    void abort().catch(() => {});
  };
  const forward = (callback, ...args) => {
    try {
      const result = Promise.resolve(callback?.(...args));
      pending.add(result);
      result.then(() => pending.delete(result), (error) => {
        pending.delete(result); failedProjection(error);
      });
    } catch (error) { failedProjection(error); }
  };
  const drain = async () => {
    while (pending.size) await Promise.allSettled([...pending]);
    if (projectionError) {
      const error = new Error("runtime event persistence failed", { cause: projectionError });
      error.code = "runtime_projection_failed"; throw error;
    }
  };

  const counters = newCounters();
  let lastAssistant = null;
  let turnBudgetExceeded = false;
  let compactionCount = 0;
  let usageMissing = false;

  const unsubscribe = session.subscribe((event) => {
    switch (event.type) {
      case "turn_start": {
        counters.turns += 1;
        if (maxTurns && counters.turns > maxTurns && !turnBudgetExceeded) {
          turnBudgetExceeded = true;
          abort();
        }
        break;
      }
      case "message_end": {
        if (event.message?.role === "assistant") {
          lastAssistant = event.message;
          addUsage(counters, event.message.usage);
        }
        break;
      }
      case "compaction_start":
        requestPurpose = "compaction";
        forward(beforeExtraInput, "compaction");
        compactionCount += 1;
        forward(onNotice, { kind: "compaction_start", reason: event.reason });
        if (compactionCount === compactionPolicy.maxCompactions) {
          // The native operation has already been admitted. Finish it, but
          // prevent further automatic compactions in this Run. Ordinary
          // turns retain their existing deadline and turn-count budget.
          session.setAutoCompactionEnabled(false);
          forward(onNotice, { kind: "compaction_limit_reached", limit: compactionPolicy.maxCompactions });
        }
        break;
      case "compaction_end": {
        requestPurpose = "agent";
        const aborted = stopped || !!event.aborted;
        const successful = !!event.result && !aborted && !event.errorMessage;
        if (event.result?.usage) addUsage(counters, event.result.usage);
        if (!successful || !event.result?.usage) usageMissing = true;
        forward(onNotice, { kind: "compaction_end", reason: event.reason, aborted,
          willRetry: !!event.willRetry, outcome: successful ? "completed" : aborted ? "aborted" : "failed",
          ...(!successful && !aborted ? { code: "compaction_failed" } : {}) });
        break;
      }
      case "summarization_retry_scheduled":
        usageMissing = true;
        // Never forward the provider's raw error or summary text.
        forward(onNotice, { kind: "summarization_retry", attempt: event.attempt, maxAttempts: event.maxAttempts });
        break;
      case "auto_retry_start":
        forward(onNotice, { kind: "auto_retry_start", attempt: event.attempt, maxAttempts: event.maxAttempts });
        break;
      case "auto_retry_end":
        forward(onNotice, { kind: "auto_retry_end", success: event.success, attempt: event.attempt });
        break;
      default:
        break;
    }
    forward(onEvent, event, session);
  });

  // These public input methods are unused by the current HTTP service, but
  // preserve coverage before a future host forwards steering or custom text.
  const sendFrozenContext = session.sendCustomMessage.bind(session);
  for (const method of ['steer','followUp','sendCustomMessage']) {
    if (typeof session[method] !== 'function') continue;
    const original = session[method].bind(session);
    session[method] = async (...args) => {
      await beforeExtraInput?.(`host:${method}`);
      return original(...args);
    };
  }
  // The initial host context has already been frozen by the service. Avoid
  // routing this one known input through the extra-input wrapper.
  let task;
  const run = () => {
    task ??= (async () => {
      try {
        // Admission and abort ownership are installed by the caller before
        // this function starts any provider or tool work.
        if (!stopped) {
          // Mutable task context belongs at the append-only history tail,
          // never in the stable system prefix. Reuse identical context; after
          // compaction, reassert it only if it is absent from active messages.
          const previous = [...session.state.messages].reverse()
            .find((message) => message.role === "custom" && message.customType === "runtime.context");
          const content = `Current host task context (latest update applies; it does not grant permissions):\n${currentContext || "No domain extension is active."}`;
          if ((currentContext || previous) && previous?.content !== content) {
            await sendFrozenContext({ customType: "runtime.context", content, display: false }, { triggerTurn: false });
          }
          if (!stopped) await session.prompt(input);
        }
        await session.waitForIdle();
        await drain();
        const stopReason = lastAssistant?.stopReason;
        const status = stopped || stopReason === "aborted" ? "aborted" : stopReason === "error" ? "error" : "completed";
        return { status, lastAssistant, turnBudgetExceeded, errorMessage: lastAssistant?.errorMessage };
      } finally {
        unsubscribe();
        session.dispose();
        await drain();
      }
    })();
    return task;
  };

  try {
    await beforeInitialInput?.({
      systemPrompt: session.systemPrompt,
      currentContext: JSON.stringify({
        message: `Current host task context (latest update applies; it does not grant permissions):\n${currentContext || "No domain extension is active."}`,
        tools: [...customTools].sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
          .map(({name,description,parameters}) => ({name,description,parameters})),
      }),
      cleanHistory: session.state.messages.length === 0,
    });
  } catch (error) {
    unsubscribe(); session.dispose(); throw error;
  }
  return { session, abort, run, getUsage: () => ({ ...counters, missing: usageMissing }) };
}

function textFromContent(content) {
  return (content ?? [])
    .filter((part) => part?.type === "text")
    .map((part) => part.text)
    .join("");
}

export function assistantMessageText(message) {
  return textFromContent(message?.content);
}

/**
 * Map a raw AgentSession event to the app's generic {type,data} event shape.
 * Extends the previous five-primitive mapping with turn/agent bookkeeping
 * consumed only for usage/turn counts (not persisted as their own store
 * event types unless noted).
 */
export function mapSessionEvent(event) {
  switch (event.type) {
    case "message_update":
      if (event.message?.role !== "assistant") return null;
      return { type: "assistant.delta", data: { text: assistantMessageText(event.message) } };
    case "message_end":
      if (event.message?.role !== "assistant") return null;
      return {
        type: "assistant.message",
        data: {
          text: assistantMessageText(event.message),
          stopReason: event.message.stopReason,
          errorMessage: event.message.errorMessage,
        },
      };
    case "tool_execution_start":
      return { type: "tool.start", data: { callId: event.toolCallId, name: event.toolName } };
    case "tool_execution_update":
      return {
        type: "tool.update",
        data: { callId: event.toolCallId, name: event.toolName, text: textFromContent(event.partialResult?.content), isError: false },
      };
    case "tool_execution_end":
      return {
        type: "tool.result",
        data: {
          callId: event.toolCallId,
          name: event.toolName,
          text: textFromContent(event.result?.content),
          isError: event.isError,
        },
      };
    default:
      return null;
  }
}
