import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { validateToolArguments } from "@earendil-works/pi-ai";
import { AGENTS_API_PROTOCOL, createAgentsApiRuntimeAdapter, createSettlementTracker } from "./agents-api-adapter.mjs";
import { AGENTS_TRANSPORT_FUNCTION_TOOLS } from "./openai-agents-transport.mjs";

/**
 * P03-C · the Agents API implementation of the Host's Runtime Port.
 *
 * The Host keeps admission, Run identity and status, credentials, repository
 * scope, permissions and every durable record; it hands this gateway tools
 * that are already governed and a `ledger` onto its own store. The adapter
 * keeps native normalization. What is left here is the order of one remote
 * Run: intent before dispatch, claim before execution, retained bytes before
 * submission — and an honest outcome when any of those cannot be established.
 *
 * Nothing is retried, re-run or re-sent. A native call is executed at most
 * once per claim; a repeated observation meets the receipt. HTTP acceptance of
 * a tool result is recorded as accepted delivery and nothing stronger. Only a
 * root-turn terminal attributable to this Run settles it.
 */
export const AGENTS_RUNTIME_ID = "agents-api";
const MAX_ARGUMENTS_BYTES = 16 * 1024;
const MAX_RESULT_BYTES = 4 * 1024 * 1024;
const MAX_ERROR_BYTES = 4 * 1024;
const NATIVE_ID = /^[\w.:-]{1,200}$/;

const CAPABILITIES = Object.freeze({
  start: Object.freeze({ supported: true }),
  continue: Object.freeze({ supported: true }),
  steer: Object.freeze({ supported: false, reason: "input during an active remote turn is not part of this consumer" }),
  cancel: Object.freeze({ supported: false, reason: "remote cancellation needs a confirmed turn.cancelled; stopping locally leaves the Run unknown" }),
  compact: Object.freeze({ supported: false, reason: "the remote session has no Host-side journal to compact" }),
  recover: Object.freeze({ supported: false, reason: "observation recovery is not part of this consumer" }),
  submitToolResult: Object.freeze({ supported: true }),
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function boundedError(message) {
  let text = typeof message === "string" && message ? message : "function failed";
  while (Buffer.byteLength(text) > MAX_ERROR_BYTES) text = text.slice(0, Math.floor(text.length * 0.9));
  return text;
}

/** The owner's TypeBox schema as the JSON Schema the service is given. The
 * properties and bounds are the owner's; only `additionalProperties:false` is
 * added, and the same closed shape is enforced on arrival below. */
export function functionDeclaration(tool) {
  return {
    type: "function", name: tool.name, description: tool.description,
    parameters: { ...JSON.parse(JSON.stringify(tool.parameters)), additionalProperties: false },
  };
}

/** Arguments exactly as the declaration allows: no extra key, and no value the
 * owner's validator would have had to coerce. */
function strictArguments(tool, args) {
  if (args === null || typeof args !== "object" || Array.isArray(args)) return null;
  if (Object.keys(args).some(key => !Object.hasOwn(tool.parameters.properties ?? {}, key))) return null;
  try {
    const validated = validateToolArguments(tool, { type: "toolCall", id: "validate", name: tool.name, arguments: structuredClone(args) });
    return isDeepStrictEqual(validated, args) ? validated : null;
  } catch { return null; }
}

function canonicalArguments(raw) {
  let value = raw;
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return { value: null, json: null, hash: sha256(raw) }; } }
  const json = JSON.stringify(value ?? null);
  return Buffer.byteLength(json) <= MAX_ARGUMENTS_BYTES ? { value, json, hash: sha256(json) } : { value: null, json: null, hash: sha256(json) };
}

export function createAgentsRuntimePort({ transport } = {}) {
  const adapter = createAgentsApiRuntimeAdapter({ transport });
  const id = AGENTS_RUNTIME_ID;
  const protocol = Object.freeze({ betaHeader: AGENTS_API_PROTOCOL.betaHeader, docsRevision: AGENTS_API_PROTOCOL.docsRevision,
    sdk: `${AGENTS_API_PROTOCOL.sdkPin.package}@${AGENTS_API_PROTOCOL.sdkPin.version}` });
  const bindings = new Map();

  return Object.freeze({
    id,
    /** The Host persists a remote binding for this runtime, never a Pi locator. */
    remote: true,
    describe: () => ({ id, capabilities: CAPABILITIES }),

    /**
     * @param ledger the Host's durable record of this Run's remote actions.
     * @param nativeSessionId the Session's persisted native id, or null to create.
     */
    openSession({ sessionId, runId, nativeSessionId = null, ledger }) {
      return {
        historyIsEmpty: () => nativeSessionId === null,
        async start({ tools, input, model, systemPrompt = "", currentContext = "", onObservation }) {
          const advertised = tools.filter(tool => AGENTS_TRANSPORT_FUNCTION_TOOLS.includes(tool.name));
          const controller = new AbortController();
          const tracker = createSettlementTracker();
          let observer = null;
          let halted = null; // an outcome the gateway itself decided

          const halt = (outcome) => { halted ??= outcome; observer?.stop(); };
          const unresolvedDelivery = (error) => error?.delivery === "not_sent" || error?.delivery === "rejected" ? "rejected" : "unknown";
          const failure = (error) => ({ code: typeof error?.code === "string" ? error.code : "remote_request_failed", message: boundedError(error?.message) });

          async function dispatchIntent(kind, request, native, send) {
            const { intent, idempotent } = await ledger.recordIntent({ kind, requestHash: sha256(JSON.stringify(request)), native });
            // A receipt answers a repeat; the request is never sent twice.
            if (idempotent) return { intent, refused: intent.phase === "rejected" ? "rejected" : "unknown" };
            try {
              const answer = await send(intent);
              return { intent, answer };
            } catch (error) {
              const phase = unresolvedDelivery(error);
              await ledger.settleIntent(intent.id, { phase, error: failure(error) });
              return { intent, refused: phase, error };
            }
          }

          async function open() {
            if (nativeSessionId !== null) {
              const { binding } = adapter.attachSession({ identity: { sessionId, runId }, nativeSessionId });
              bindings.set(nativeSessionId, binding);
              return binding;
            }
            const agent = { model: model?.id, instructions: [systemPrompt, currentContext].filter(Boolean).join("\n\n"), tools: advertised.map(functionDeclaration) };
            if (!agent.tools.length) delete agent.tools;
            const created = await dispatchIntent("create", { agent, input }, {}, () => adapter.createSession({
              identity: { sessionId, runId }, agent, environment: { type: "none" }, input, commandId: runId, signal: controller.signal,
            }));
            if (created.refused) {
              halt(created.refused === "rejected"
                ? { status: "error", errorCode: "remote_create_rejected", errorMessage: "The remote runtime refused to create a session" }
                : { status: "unknown", errorCode: "remote_create_unknown", errorMessage: "Session creation was not answered; no replacement is created" });
              return null;
            }
            const native = created.answer.binding.native;
            if (!NATIVE_ID.test(native.sessionId)) {
              await ledger.settleIntent(created.intent.id, { phase: "unknown", error: { code: "native_session_invalid", message: "The remote runtime returned an unusable session id" } });
              halt({ status: "unknown", errorCode: "remote_create_unknown", errorMessage: "The remote runtime returned an unusable session id" });
              return null;
            }
            await ledger.bind(created.intent.id, { nativeSessionId: native.sessionId, nativeEnvironmentId: null, protocol });
            nativeSessionId = native.sessionId;
            bindings.set(nativeSessionId, created.answer.binding);
            return created.answer.binding;
          }

          // A refusal is a result too: retained and delivered on the same path.
          const reject = (code, message) => ({ execution: "rejected", success: false, bytes: Buffer.from(`${code}: ${message}`, "utf8") });

          async function execute(tool, call, args) {
            await onObservation({ type: "tool.start", data: { callId: call.callId, name: tool.name } });
            try {
              const result = await tool.execute(call.callId, args, controller.signal);
              const text = (result?.content ?? []).filter(part => part?.type === "text" && typeof part.text === "string").map(part => part.text).join("\n");
              const bytes = Buffer.from(text, "utf8");
              if (bytes.length > MAX_RESULT_BYTES) return { execution: "failed", success: false, bytes: Buffer.from("result_too_large: the result exceeds the retained result limit", "utf8") };
              return { execution: "succeeded", success: true, bytes };
            } catch (error) {
              return { execution: "failed", success: false, bytes: Buffer.from(boundedError(error?.message), "utf8") };
            }
          }

          async function handleCall(binding, call) {
            if (![call.turnId, call.callId].every(value => typeof value === "string" && NATIVE_ID.test(value)) || typeof call.name !== "string" || !call.name || call.name.length > 200) {
              await onObservation({ type: "run.notice", data: { code: "remote_call_unattributable", message: "A required action without a usable turn, call or name was ignored" } });
              return false;
            }
            const args = canonicalArguments(call.arguments);
            const native = { sessionId: nativeSessionId, turnId: call.turnId, callId: call.callId };
            let claim;
            try {
              claim = await ledger.claimCall({ native, tool: call.name, argumentsJson: args.json, argumentsSha256: args.hash });
            } catch (error) {
              if (error?.code === "REMOTE_CALL_CONFLICT") {
                await onObservation({ type: "run.notice", data: { code: "remote_call_conflict", message: "A native call repeated with a different request was ignored" } });
                return false;
              }
              halt({ status: "error", errorCode: String(error?.code ?? "remote_claim_failed").toLowerCase(), errorMessage: "The native call could not be claimed; it was not executed" });
              return false;
            }
            // A claim that already exists is the receipt: never execute again,
            // never send again. Only the first observation acts.
            if (claim.idempotent) return claim.call.delivery.state === "accepted";

            const rootTurn = ledger.rootTurn();
            const tool = advertised.find(item => item.name === call.name);
            const validated = tool && args.value !== null ? strictArguments(tool, args.value) : null;
            let outcome;
            if (!rootTurn) outcome = reject("root_turn_unknown", "no root turn is associated with this run");
            else if (rootTurn.turnId !== call.turnId) outcome = reject("wrong_turn", "the call does not belong to this run's root turn");
            else if (!tool) outcome = reject("tool_unavailable", "this function is not available to this run");
            else if (args.json === null) outcome = reject("invalid_arguments", "arguments are not JSON within the argument limit");
            else if (!validated) outcome = reject("invalid_arguments", "arguments do not match the declared schema");
            else if (controller.signal.aborted) outcome = reject("run_closed", "the run is stopping");
            else outcome = await execute(tool, call, validated);

            // Retain the exact bytes, then record them, then say so, then send.
            const digest = sha256(outcome.bytes);
            await ledger.retainResult(claim.call.id, outcome.bytes, { execution: outcome.execution, result: { success: outcome.success, sha256: digest, bytes: outcome.bytes.length } });
            await onObservation(outcome.execution === "rejected"
              ? { type: "run.notice", data: { code: "remote_call_rejected", message: outcome.bytes.toString("utf8") } }
              : { type: "tool.result", data: { callId: call.callId, name: call.name, text: outcome.bytes.toString("utf8"), isError: !outcome.success } });
            if (controller.signal.aborted) return false;
            const delivery = await ledger.beginDelivery(claim.call.id);
            if (delivery.idempotent) return false;
            const text = outcome.bytes.toString("utf8");
            try {
              await adapter.submitToolResult(binding, { turnId: call.turnId, callId: call.callId, success: outcome.success,
                ...(outcome.success ? { output: text } : { error: text }), requestId: delivery.intent.requestId, signal: controller.signal });
              await ledger.settleIntent(delivery.intent.id, { phase: "accepted" });
              return true;
            } catch (error) {
              const phase = unresolvedDelivery(error);
              await ledger.settleIntent(delivery.intent.id, { phase, error: failure(error) });
              halt(phase === "rejected"
                ? { status: "error", errorCode: "remote_delivery_rejected", errorMessage: "The remote runtime refused the function result" }
                : { status: "unknown", errorCode: "remote_delivery_unknown", errorMessage: "The function result was sent but not acknowledged; it is retained and is not re-sent" });
              return false;
            }
          }

          async function observe(binding, observation) {
            const { kind, native, data } = observation;
            if (kind === "run.notice" && data.notice === "turn_created" && native.subagentId === null && native.turnId && NATIVE_ID.test(native.turnId) && native.eventId && NATIVE_ID.test(native.eventId)) {
              await ledger.associateRootTurn({ turnId: native.turnId, attribution: "turn.created", eventId: native.eventId });
              return;
            }
            const rootTurnId = ledger.rootTurn()?.turnId ?? null;
            if (kind === "assistant.delta" || kind === "assistant.message") {
              // Text of another turn is this Session's history, not this Run.
              if (native.turnId === null || native.turnId !== rootTurnId) return;
              if (kind === "assistant.message") await onObservation({ type: "assistant.message", data: { text: data.text, stopReason: "stop" } });
              else { deltas.set(data.itemId, (deltas.get(data.itemId) ?? "") + data.text); await onObservation({ type: "assistant.delta", data: { text: deltas.get(data.itemId) } }); }
              return;
            }
            if (kind === "runtime.function_call.pending") {
              // What this Run still owes the root turn: its calls whose result
              // the service has not accepted. A repeated observation of an
              // answered call is history, not a new debt.
              const owed = [];
              for (const call of data.calls) {
                if (halted) break;
                if (!await handleCall(binding, call) && call.turnId === rootTurnId) owed.push(call);
              }
              tracker.observe({ ...observation, data: { ...data, calls: owed } });
              return;
            }
            if (kind === "run.settlement") {
              if (data.source === "native-terminal" && (native.turnId === null || native.turnId !== rootTurnId)) return;
              tracker.observe(observation);
              return;
            }
            if (kind === "run.error") await onObservation({ type: "run.notice", data: { code: "remote_stream_error", message: boundedError(data.message) } });
          }

          const deltas = new Map();

          return {
            abort: async () => { controller.abort(); observer?.stop(); },
            steer: () => { throw Object.assign(new Error(`${id} does not support steer: ${CAPABILITIES.steer.reason}`), { code: "runtime_capability_unsupported" }); },
            getUsage: () => null,
            async run() {
              const continuing = nativeSessionId !== null;
              const binding = await open();
              if (!binding) return halted;
              let decided = null;
              const settleIfDecided = () => {
                decided ??= tracker.decide({ cancelRequested: controller.signal.aborted, effectsUnknown: ledger.unresolved() });
                if (decided) observer?.stop();
              };
              observer = adapter.observe(binding, { onObservation: async (observation) => {
                if (halted || decided) return;
                await observe(binding, observation);
                if (!halted) settleIfDecided();
              } });
              if (continuing && !controller.signal.aborted) {
                const sent = await dispatchIntent("input", { input }, {}, (intent) => adapter.submitInput(binding, { text: input, requestId: intent.requestId, signal: controller.signal }));
                if (sent.refused) {
                  halt(sent.refused === "rejected"
                    ? { status: "error", errorCode: "remote_input_rejected", errorMessage: "The remote runtime refused the input" }
                    : { status: "unknown", errorCode: "remote_input_unknown", errorMessage: "The input was sent but not acknowledged; it is not re-sent" });
                } else await ledger.settleIntent(sent.intent.id, { phase: "accepted" });
              }
              let streamError = null;
              try { await observer.done; } catch (error) { streamError = error; }
              if (halted) return halted;
              if (!decided) { tracker.endStream(); settleIfDecided(); }
              if (!decided || decided.status === "unknown") {
                return { status: "unknown", errorCode: `remote_${decided?.reason ?? "stream_closed_before_terminal"}`,
                  errorMessage: streamError ? "The event stream failed before a root terminal was observed" : "No attributable root terminal settled this run" };
              }
              if (decided.status === "completed") return { status: "completed" };
              if (decided.status === "cancelled") return { status: "aborted" };
              return { status: "error", errorCode: "remote_turn_failed", errorMessage: boundedError(decided.error?.message ?? decided.reason) };
            },
          };
        },
      };
    },

    /** Release every open stream. Sends nothing to the service. */
    close() {
      for (const binding of bindings.values()) { try { adapter.close(binding); } catch { /* already closed */ } }
      bindings.clear();
    },
  });
}
