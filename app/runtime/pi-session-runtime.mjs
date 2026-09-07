import {
  createAgentSession,
  createExtensionRuntime,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore, createProvider, envApiKeyAuth } from "@earendil-works/pi-ai";
import * as openaiCompletions from "@earendil-works/pi-ai/api/openai-completions";
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

const NO_API_KEY_PATTERN = /no api key found/i;
const AUTH_FAILED_PATTERN = /\b(401|403|unauthorized|forbidden|invalid[_ -]?api[_ -]?key|authentication)\b/i;

/**
 * A ResourceLoader that discovers nothing: no extensions, skills, prompt
 * templates, themes, AGENTS.md files, or settings-file resources. Supplying
 * any ResourceLoader instance to createAgentSession skips construction of
 * DefaultResourceLoader entirely (sdk.ts:185-189).
 */
export function createEmptyResourceLoader() {
  const runtime = createExtensionRuntime();
  return {
    getExtensions: () => ({ extensions: [], errors: [], runtime }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => undefined,
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
  return ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    refreshOnCreate: false,
  });
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

/**
 * Start one Run's AgentSession. Creates a fresh AgentSession per Run (bound
 * to this run's tool closures) against a caller-supplied SessionManager,
 * which is what carries continuity across Runs within one app session.
 */
export async function startSessionRun({
  cwd,
  agentDir,
  modelRuntime,
  model,
  sessionManager,
  customTools,
  maxTurns,
  input,
  onEvent,
  onNotice,
}) {
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    model,
    noTools: "builtin",
    customTools,
    resourceLoader: createEmptyResourceLoader(),
    sessionManager,
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
  });

  const counters = newCounters();
  let lastAssistant = null;
  let turnBudgetExceeded = false;

  const unsubscribe = session.subscribe((event) => {
    switch (event.type) {
      case "turn_start": {
        counters.turns += 1;
        if (maxTurns && counters.turns > maxTurns && !turnBudgetExceeded) {
          turnBudgetExceeded = true;
          session.abort();
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
        onNotice?.({ kind: "compaction_start", reason: event.reason });
        break;
      case "compaction_end":
        onNotice?.({ kind: "compaction_end", reason: event.reason, aborted: event.aborted });
        break;
      case "auto_retry_start":
        onNotice?.({ kind: "auto_retry_start", attempt: event.attempt, maxAttempts: event.maxAttempts });
        break;
      case "auto_retry_end":
        onNotice?.({ kind: "auto_retry_end", success: event.success, attempt: event.attempt });
        break;
      default:
        break;
    }
    onEvent(event, session);
  });

  const task = (async () => {
    try {
      await session.prompt(input);
      await session.waitForIdle();
    } finally {
      unsubscribe();
    }
    const stopReason = lastAssistant?.stopReason;
    const status = stopReason === "aborted" ? "aborted" : stopReason === "error" ? "error" : "completed";
    return {
      status,
      lastAssistant,
      turnBudgetExceeded,
      errorMessage: lastAssistant?.errorMessage,
    };
  })();

  // getUsage() reads the accumulator directly, so a caller can still recover
  // everything the provider reported when the task throws or is aborted
  // before it settles.
  return { session, task, getUsage: () => ({ ...counters }) };
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
        type: "tool.result",
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
