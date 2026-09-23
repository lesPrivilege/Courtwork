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
 * A native call is executed at most once per claim; a repeated observation
 * meets the receipt. Creation, function results and cancel are sent once. The
 * one retry here is an unanswered input message, re-sent once under the same
 * request key, because that is the one operation the pinned SDK documents the
 * key for (AGENTS_TRANSPORT_REQUEST_IDENTITY.message). HTTP acceptance of a
 * tool result is recorded as accepted delivery and nothing stronger. Only a
 * root-turn terminal attributable to this Run settles it.
 *
 * P03-D adds what a Run may do when the stream, a reply or the Host is lost:
 * a cancel intent confirmed only by the root turn ending cancelled; bounded
 * observation recovery through the adapter's subscribe/buffer/read/merge, then
 * a read of the root turn itself; and `inspectSession`, a read-only look at a
 * bound session for the Host's explicit reconciliation. When the service
 * offers nothing decisive the outcome stays unknown.
 */
export const AGENTS_RUNTIME_ID = "agents-api";
export const AGENTS_RUNTIME_REVISION = "agents-api-host-v1";
const MAX_ARGUMENTS_BYTES = 16 * 1024;
const MAX_RESULT_BYTES = 4 * 1024 * 1024;
const MAX_ERROR_BYTES = 4 * 1024;
const NATIVE_ID = /^[\w.:-]{1,200}$/;

const CAPABILITIES = Object.freeze({
  start: Object.freeze({ supported: true }),
  continue: Object.freeze({ supported: true }),
  steer: Object.freeze({ supported: false, reason: "input during an active remote turn is not part of this consumer" }),
  cancel: Object.freeze({ supported: true }),
  compact: Object.freeze({ supported: false, reason: "the remote session has no Host-side journal to compact" }),
  recover: Object.freeze({ supported: true }),
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

/**
 * @param cancelConfirmMs how long a sent cancel waits for the root turn to end cancelled.
 * @param recoveryAttempts how many times one Run re-subscribes after losing its stream.
 */
export function createAgentsRuntimePort({ transport, cancelConfirmMs = 10_000, recoveryAttempts = 2 } = {}) {
  const adapter = createAgentsApiRuntimeAdapter({ transport });
  const id = AGENTS_RUNTIME_ID;
  const protocol = Object.freeze({ betaHeader: AGENTS_API_PROTOCOL.betaHeader, docsRevision: AGENTS_API_PROTOCOL.docsRevision,
    sdk: `${AGENTS_API_PROTOCOL.sdkPin.package}@${AGENTS_API_PROTOCOL.sdkPin.version}` });
  const bindings = new Map();

  return Object.freeze({
    id,
    /** The Host persists a remote binding for this runtime, never a Pi locator. */
    remote: true,
    describe: () => ({ id, revision: AGENTS_RUNTIME_REVISION,
      protocol: `agents-api:${AGENTS_API_PROTOCOL.docsRevision}`,
      configurationIdentity: transport.endpointIdentity ?? null,
      capabilities: CAPABILITIES }),

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
          const timers = new Set();
          let stream = null;          // the event stream being observed now
          let activeBinding = null;
          let halted = null;          // an outcome the gateway itself decided
          let decided = null;         // an outcome the settlement rules decided
          let recovering = false;     // decisions wait until a recovery batch is whole
          let contradiction = false;
          let cancelStarted = false, cancelExpired = false;

          const halt = (outcome) => { halted ??= outcome; stream?.stop(); };
          const later = (ms, action) => { const timer = setTimeout(() => { timers.delete(timer); action(); }, ms); timers.add(timer); };
          const unresolvedDelivery = (error) => error?.delivery === "not_sent" || error?.delivery === "rejected" ? "rejected" : "unknown";
          const failure = (error) => ({ code: typeof error?.code === "string" ? error.code : "remote_request_failed", message: boundedError(error?.message) });

          async function dispatchIntent(kind, request, native, send, { retries = 0 } = {}) {
            const { intent, idempotent } = await ledger.recordIntent({ kind, requestHash: sha256(JSON.stringify(request)), native });
            // A receipt answers a repeat; the request is never sent twice.
            if (idempotent) return { intent, refused: intent.phase === "rejected" ? "rejected" : "unknown" };
            for (let attempt = 0; ; attempt += 1) {
              try {
                const answer = await send(intent);
                return { intent, answer };
              } catch (error) {
                const phase = unresolvedDelivery(error);
                if (phase === "unknown" && attempt < retries) continue; // same request key
                await ledger.settleIntent(intent.id, { phase, error: failure(error) });
                return { intent, refused: phase, error };
              }
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
              identity: { sessionId, runId }, agent, environment: { type: "none" }, input, commandId: runId,
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
            // A Run the Host is stopping answers with a cancel, not a result.
            if (controller.signal.aborted || !ledger.isOpen()) return false;
            const delivery = await ledger.beginDelivery(claim.call.id);
            if (delivery.idempotent) return false;
            const text = outcome.bytes.toString("utf8");
            try {
              await adapter.submitToolResult(binding, { turnId: call.turnId, callId: call.callId, success: outcome.success,
                ...(outcome.success ? { output: text } : { error: text }), requestId: delivery.intent.requestId });
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
              if (data.source === "native-terminal") {
                if (native.turnId === null || native.turnId !== rootTurnId) return;
                const recorded = await ledger.recordRootTerminal({ turnId: rootTurnId, status: data.candidate, evidence: data.reason === "native_turn_read" ? "turn.read" : "turn.event", nativeRef: native.eventId ?? rootTurnId });
                if (recorded.contradicts) contradiction = true;
                // A confirmed cancellation voids what this Run still owed the turn.
                if (data.candidate === "cancelled" && controller.signal.aborted) for (const callId of tracker.pendingCallIds()) tracker.noteToolResult(callId);
              }
              tracker.observe(observation);
              return;
            }
            if (kind === "run.error") await onObservation({ type: "run.notice", data: { code: "remote_stream_error", message: boundedError(data.message) } });
          }

          const deltas = new Map();

          const settleIfDecided = () => {
            if (contradiction) return halt({ status: "unknown", errorCode: "remote_contradictory_terminal", errorMessage: "The root turn was observed ending in two different ways" });
            decided ??= tracker.decide({ cancelRequested: controller.signal.aborted, effectsUnknown: ledger.unresolved() });
            if (decided) stream?.stop();
          };
          const onNative = async (observation) => {
            if (halted || decided) return;
            await observe(activeBinding, observation);
            if (!halted && !recovering) settleIfDecided();
          };

          /** Cancel is a request. Only the root turn.cancelled confirms it, and
           * only for a bounded time; otherwise the Run stays unknown. */
          async function cancelRemote() {
            if (cancelStarted || !activeBinding || halted || decided) return;
            cancelStarted = true;
            const sent = await dispatchIntent("cancel", { cancel: true }, { turnId: ledger.rootTurn()?.turnId ?? null },
              (intent) => adapter.cancelTurn(activeBinding, { requestId: intent.requestId }));
            if (sent.refused) {
              return halt({ status: "unknown", errorCode: sent.refused === "rejected" ? "remote_cancel_rejected" : "remote_cancel_unknown",
                errorMessage: sent.refused === "rejected" ? "The remote runtime refused the cancel request; the turn may still be running" : "The cancel request was not answered; it is not re-sent" });
            }
            await ledger.settleIntent(sent.intent.id, { phase: "accepted" });
            later(cancelConfirmMs, () => { cancelExpired = true; stream?.stop(); });
          }

          /** Whether a new stream replays what was missed is not known. The root
           * turn itself is the decisive read: ended, or still running. */
          async function readRootTurn() {
            const rootTurn = ledger.rootTurn();
            if (!rootTurn || rootTurn.terminal) return;
            try {
              const turn = await adapter.readTurn(activeBinding, rootTurn.turnId);
              if (!turn.root || !turn.terminal) return;
              await observe(activeBinding, { kind: "run.settlement", native: { eventId: null, sessionId: nativeSessionId, turnId: rootTurn.turnId, itemId: null, subagentId: null },
                data: { candidate: turn.terminal, source: "native-terminal", reason: "native_turn_read", ...(turn.error ? { error: turn.error } : {}) } });
            } catch (error) {
              halt({ status: "unknown", errorCode: "remote_recovery_failed", errorMessage: `The root turn could not be read (${failure(error).code})` });
            }
          }

          /** The stream ended without a decision: subscribe again, buffer, read
           * saved items and the session, merge. Current required actions come
           * from the session snapshot and meet their claims like any other. */
          async function recover() {
            await onObservation({ type: "run.notice", data: { code: "remote_stream_recovering", message: "The event stream ended before a root terminal; observing the session again" } });
            recovering = true;
            let recovered;
            try { recovered = await adapter.reconcile(activeBinding, { onObservation: onNative }); }
            catch (error) {
              recovering = false;
              return halt({ status: "unknown", errorCode: "remote_recovery_failed", errorMessage: `Saved history could not be read completely (${failure(error).code})` });
            }
            stream = recovered.stream;
            const calls = recovered.pendingActions.filter(action => action?.type === "function_call")
              .map(action => ({ turnId: action.turn_id, callId: action.call_id, name: action.name, arguments: action.arguments ?? null }));
            if (calls.length && !halted) {
              await observe(activeBinding, { kind: "runtime.function_call.pending", native: { eventId: null, sessionId: nativeSessionId, turnId: null, itemId: null, subagentId: null }, data: { calls, environmentConnections: [] } });
            }
            if (!halted) await readRootTurn();
            recovering = false;
            if (!halted) settleIfDecided();
            if (halted || decided) stream.stop();
          }

          return {
            // The Host calls abort without awaiting it on some paths; it must never reject.
            abort: async () => {
              if (controller.signal.aborted) return;
              controller.abort();
              try { await cancelRemote(); }
              catch { halt({ status: "unknown", errorCode: "remote_cancel_unrecorded", errorMessage: "The cancel could not be recorded, so it was not sent" }); }
            },
            steer: () => { throw Object.assign(new Error(`${id} does not support steer: ${CAPABILITIES.steer.reason}`), { code: "runtime_capability_unsupported" }); },
            getUsage: () => null,
            async run() {
              try {
                const continuing = nativeSessionId !== null;
                activeBinding = await open();
                if (!activeBinding) return halted;
                stream = adapter.observe(activeBinding, { onObservation: onNative });
                if (continuing && !controller.signal.aborted) {
                  const sent = await dispatchIntent("input", { input }, {}, (intent) => adapter.submitInput(activeBinding, { text: input, requestId: intent.requestId }), { retries: 1 });
                  if (sent.refused) {
                    halt(sent.refused === "rejected"
                      ? { status: "error", errorCode: "remote_input_rejected", errorMessage: "The remote runtime refused the input" }
                      : { status: "unknown", errorCode: "remote_input_unknown", errorMessage: "The input was not acknowledged, twice under one request key" });
                  } else await ledger.settleIntent(sent.intent.id, { phase: "accepted" });
                }
                if (controller.signal.aborted) {
                  try { await cancelRemote(); }
                  catch { halt({ status: "unknown", errorCode: "remote_cancel_unrecorded", errorMessage: "The cancel could not be recorded, so it was not sent" }); }
                }
                let streamError = null;
                for (let recoveries = 0; ; recoveries += 1) {
                  try { await stream.done; streamError = null; } catch (error) { streamError = error; }
                  if (halted || decided || cancelExpired || recoveries >= recoveryAttempts) break;
                  await recover();
                }
                // A cancel that was not confirmed in time gets one last read.
                if (!halted && !decided && cancelExpired) { await readRootTurn(); if (!halted) settleIfDecided(); }
                if (halted) return halted;
                if (!decided) { tracker.endStream(); settleIfDecided(); }
                if (halted) return halted;
                if (!decided || decided.status === "unknown") {
                  return { status: "unknown", errorCode: `remote_${decided?.reason ?? "stream_closed_before_terminal"}`,
                    errorMessage: streamError ? "The event stream failed before a root terminal was observed" : "No attributable root terminal settled this run" };
                }
                if (decided.status === "completed") return { status: "completed" };
                if (decided.status === "cancelled") return { status: "aborted" };
                return { status: "error", errorCode: "remote_turn_failed", errorMessage: boundedError(decided.error?.message ?? decided.reason) };
              } finally {
                for (const timer of timers) clearTimeout(timer);
                stream?.stop();
              }
            },
          };
        },
      };
    },

    /**
     * Read-only look at a bound native session for the Host's explicit
     * reconciliation: the current status of the root turns it names, and the
     * saved function outputs by call. Two reads; no stream, input, result or
     * cancel.
     */
    async inspectSession({ sessionId, nativeSessionId, turnIds = [] }) {
      const { binding } = adapter.attachSession({ identity: { sessionId, runId: "inspect" }, nativeSessionId });
      bindings.set(nativeSessionId, binding);
      const turns = [];
      for (const turnId of turnIds) turns.push(await adapter.readTurn(binding, turnId));
      const items = await adapter.readSavedItems(binding);
      return {
        turns,
        functionOutputs: items.filter(item => item.type === "function_call_output" && item.callId && item.turnId && NATIVE_ID.test(item.id))
          .map(item => ({ itemId: item.id, callId: item.callId, turnId: item.turnId })),
      };
    },

    /** Release every open stream. Sends nothing to the service. */
    close() {
      for (const binding of bindings.values()) { try { adapter.close(binding); } catch { /* already closed */ } }
      bindings.clear();
    },
  });
}
