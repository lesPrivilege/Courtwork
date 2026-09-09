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
    runtime.registerNativeProvider(createProvider({
      id, name: provider.name, baseUrl: provider.baseUrl, models,
      auth: { apiKey: envApiKeyAuth(`${provider.name} application key`, []) },
      api: {
        "openai-completions": { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
        "openai-responses": { stream: openaiResponses.stream, streamSimple: openaiResponses.streamSimple },
      },
    }));
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
  const provider = createProvider({
    id: FAKE_PROVIDER_ID,
    name: "Fake OpenAI loopback",
    baseUrl: fakeProviderHandle.baseUrl,
    auth: { apiKey: envApiKeyAuth("Fake loopback key", []) },
    models: [fakeProviderHandle.model],
    api: { stream: openaiCompletions.stream, streamSimple: openaiCompletions.streamSimple },
  });
  modelRuntime.registerNativeProvider(provider);
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
}) {
  const compactionPolicy = resolveCompactionPolicy(model, compaction);
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    model,
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
  const nativeStream = session.agent.streamFunction;
  session.agent.streamFunction = (requestModel, context, options) => {
    if (stopped) {
      const error = new Error("Run cancelled"); error.name = "AbortError"; throw error;
    }
    return nativeStream(requestModel, context, {
      ...options,
      sessionId: sessionManager.getSessionId(),
      cacheRetention: options?.cacheRetention ?? "short",
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
