/* Review N6 · a Send the Host never admitted is released with its text kept; a
 * Send whose outcome is not known stays held with its exact identity. The
 * classifier is app/web/command-outcome.mjs. The send and recovery paths live
 * in app.mjs, which has no DOM harness, so they are run from their real
 * function text (as host-fact-projection does) against stubbed screen owners. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { isUncertainCommandError, runAttemptOutcome } from "../web/command-outcome.mjs";

const src = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
function grab(name, prefix = "function ") {
  const start = src.indexOf(`${prefix}${name}(`);
  assert.ok(start >= 0, `app.mjs defines ${name}`);
  const open = src.indexOf("{", src.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const optional = (name) => (src.includes(`function ${name}(`) ? grab(name) : "");
function grabConst(name) {
  const start = src.indexOf(`const ${name} = {`);
  assert.ok(start >= 0, `app.mjs defines ${name}`);
  return src.slice(start, src.indexOf("\n};", start) + 3);
}

const hostError = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, body: { error: { code, message, ...extra } } });
const network = () => new Error("The local runtime could not be reached.");
const SELECTION_MOVED = "The selected Agent configuration changed; refresh before sending";
const notAdmitted = () => hostError(409, "runtime_selection_conflict", SELECTION_MOVED, { commandAdmitted: false });
const conflict = () => hostError(409, "command_conflict", "commandId was already used with a different input");
const operation = { commandId: "c1", input: "hello" };
const kind = (input) => runAttemptOutcome({ operation, sessionId: "s1", ...input }).kind;

test("N6 · a replay is released only by the Host's own statement; everything else keeps the command held", () => {
  const run = { id: "r1", sessionId: "s1", commandId: "c1" };
  assert.deepEqual(runAttemptOutcome({ operation, sessionId: "s1", replay: true, result: { run } }), { kind: "receipt", run });
  assert.equal(kind({ replay: true, error: notAdmitted() }), "not-admitted");
  assert.equal(kind({ replay: true, error: hostError(409, "active_run", "only one active run is allowed", { commandAdmitted: false }) }), "not-admitted");
  assert.equal(kind({ replay: true, error: hostError(404, "not_found", "session not found") }), "not-admitted", "the Session, and its receipts, are gone");

  assert.equal(kind({ replay: true, error: conflict() }), "unknown", "the id has a receipt under another input");
  assert.equal(kind({ replay: true, error: network() }), "unknown");
  assert.equal(kind({ replay: true, error: hostError(409, "runtime_selection_conflict", SELECTION_MOVED) }), "unknown", "a refusal without the marker proves nothing about the first request");
  assert.equal(kind({ replay: true, error: hostError(400, "invalid_input", "bad body") }), "unknown", "refused before the Host looked the command up");
  assert.equal(kind({ replay: true, error: hostError(503, "runtime_closing", "runtime is stopping") }), "unknown");
  assert.equal(kind({ replay: true, error: hostError(500, "internal_error", "request failed") }), "unknown");
  assert.equal(kind({ replay: true, error: hostError(503, "CORE_TIMEOUT", "timed out", { outcome: "unknown", commandAdmitted: false }) }), "unknown", "an unknown outcome outranks a marker");
  assert.equal(kind({ replay: true, error: Object.assign(new Error("bad gateway"), { status: 502, body: null }) }), "unknown");
  assert.equal(kind({ replay: true, result: { run: { ...run, commandId: "another" } } }), "unknown", "a 2xx that is not this command's receipt");
  assert.equal(kind({ replay: true, result: {} }), "unknown");
});

test("N6 · the first send is decided by the answer to the request itself, as before", () => {
  assert.equal(kind({ error: hostError(409, "runtime_selection_conflict", SELECTION_MOVED) }), "not-admitted");
  assert.equal(kind({ error: hostError(503, "provider_unsupported", "configured provider route is unavailable") }), "not-admitted");
  assert.equal(kind({ error: network() }), "unknown");
  assert.equal(kind({ error: hostError(500, "internal_error", "request failed") }), "unknown");
  assert.equal(kind({ result: { run: { id: "r1", sessionId: "other", commandId: "c1" } } }), "unknown");
  assert.equal(kind({ error: network(), sent: false }), "not-admitted", "nothing left the client");
  assert.equal(isUncertainCommandError(network()), true);
});

/* The production Send and Recover, with one composer, one chat and a scripted Host. */
function sendHarness(answers, { mergeFails = false } = {}) {
  const stored = new Map();
  const window = { clearTimeout() {}, sessionStorage: { setItem: (key, value) => stored.set(key, value), getItem: (key) => stored.get(key) ?? null } };
  const textarea = { value: "", focus() {} };
  const state = { view: "chat", activeSessionId: "s1", connectionLost: false, attentionOpen: false, sessionEpoch: 1, operationSequence: 0, runs: [],
    pendingRuns: new Map(), unconfirmedRuns: new Map(), draftCache: new Map(), draftDirty: new Set(), draftTimers: new Map(), draftRevisions: new Map(),
    session: { id: "s1", draft: "" } };
  const seen = { posts: [], feedback: [], cleared: 0, selectionConflicts: 0, merged: [], toasts: [] };
  const request = async (path, options) => {
    assert.equal(path, "/sessions/s1/runs");
    seen.posts.push(options.body);
    const answer = answers.shift();
    assert.ok(answer, "an unexpected request");
    return answer(options.body);
  };
  const feedback = (persistent) => (sessionId, operationId, category, text, options = {}) => seen.feedback.push({ persistent, category, text, nextAction: options.nextAction ?? null });
  const body = [grab("nextOperationId"), grab("draftRevision"), grab("clearSubmittedDraft"), grab("storeUnconfirmedRuns"), optional("isUncertainCommandError"), grabConst("ERROR_COPY"), grab("describeCommandError"),
    grab("submitSessionRun", "async function "), grab("recoverRunReceipt", "async function ")].join("\n");
  const make = new Function("state", "window", "document", "$", "request", "COMMAND_STORAGE_KEY", "isUncertainCommandError", "runAttemptOutcome",
    "currentSession", "currentRun", "preview", "showToast", "readComposerCommand", "guardRegisterIntent", "guardAdmitNavigation", "guardHandoffFocus",
    "setTransientFeedback", "setPersistentFeedback", "clearPersistentFeedback", "agentChoice", "agentChoiceGate", "selectionLanded", "renderComposer", "renderChat", "renderFeedback",
    "persistDraftForSession", "retirePreparedChat", "loadRecentSessions", "shellSignals", "mergeRun", "leavePreview", "stopPolling", "schedulePolling", "isActiveRun", "refreshActiveSession",
    `${body}; return { submitSessionRun, recoverRunReceipt };`);
  const api = make(state, window, { activeElement: null }, () => textarea, request, "test.commands", isUncertainCommandError, runAttemptOutcome,
    () => state.session, () => null, { active: false, isExampleId: () => false }, (text) => seen.toasts.push(text), async () => ({ handled: false }), () => ({}), () => true, () => {},
    feedback(false), feedback(true), () => { seen.cleared++; },
    { getState: () => ({ sessionId: "s1", next: { send: { runtimeSelection: { revision: 4, profileId: "agent:general", sourceHash: null } } } }), selectionConflict: async () => { seen.selectionConflicts++; } },
    () => ({ holdsSend: false }), () => true, () => {}, () => {}, () => {},
    async () => {}, () => false, () => {}, null, (run) => { if (mergeFails) throw new Error("the Run could not be drawn"); seen.merged.push(run.id); }, async () => {}, () => {}, () => {}, () => false, async () => {});
  const held = () => JSON.parse(stored.get("test.commands") || "[]");
  return { ...api, state, seen, textarea, held, send: (text) => { textarea.value = text; return api.submitSessionRun(); } };
}

test("N6 · an unconfirmed Send that the Host says it never admitted is released: the text stays, and the next Send is a new command", async () => {
  const h = sendHarness([
    () => { throw network(); },                       // the first Send: no reply
    () => { throw conflict(); },                      // Recover: proves nothing
    () => { throw network(); },                       // Recover: no reply
    () => { throw notAdmitted(); },                   // Recover: the Host has no Run for it
    (body) => ({ run: { id: "r2", sessionId: "s1", commandId: body.commandId, status: "running" } }),
  ]);
  await h.send("Summarise the renewal window.");
  const first = h.seen.posts[0];
  assert.deepEqual(Object.keys(first).sort(), ["commandId", "input", "runtimeSelection"]);
  assert.equal(h.state.unconfirmedRuns.get("s1").commandId, first.commandId, "held with its identity");
  assert.equal(h.held()[0][1].commandId, first.commandId, "and stored for a reload");
  assert.deepEqual(h.seen.feedback.at(-1), { persistent: true, category: "run", nextAction: "retry-run",
    text: "Delivery is unconfirmed. Your instruction is kept; check its receipt before sending another." });

  // While it is held, Send sends nothing.
  await h.send("Summarise the renewal window.");
  assert.equal(h.seen.posts.length, 1);

  for (const reason of ["commandId was already used with a different input", "The local runtime could not be reached."]) {
    await h.recoverRunReceipt();
    assert.deepEqual(h.seen.posts.at(-1), first, "a replay is the stored command, byte for byte");
    assert.equal(h.state.unconfirmedRuns.get("s1")?.commandId, first.commandId, "still held");
    assert.deepEqual(h.seen.feedback.at(-1), { persistent: true, category: "run", nextAction: "retry-run", text: `Run receipt is still unresolved: ${reason}` });
    assert.equal(h.state.pendingRuns.size, 0);
  }
  assert.equal(h.seen.selectionConflicts, 0);

  await h.recoverRunReceipt();
  assert.deepEqual(h.seen.posts.at(-1), first);
  assert.equal(h.state.unconfirmedRuns.has("s1"), false, "settled as refused");
  assert.deepEqual(h.held(), [], "and no longer restored after a reload");
  assert.deepEqual(h.seen.feedback.at(-1), { persistent: true, category: "run", nextAction: "retry", text: `Run was not started: ${SELECTION_MOVED}` });
  assert.equal(h.seen.selectionConflicts, 1, "the Agent choice is read again");
  assert.equal(h.state.draftCache.get("s1"), "Summarise the renewal window.", "the text is still the draft");
  assert.equal(h.state.draftDirty.has("s1"), true);
  assert.equal(h.textarea.value, "Summarise the renewal window.");
  assert.equal(h.seen.merged.length, 0, "no Run was invented");

  await h.send(h.textarea.value);
  const next = h.seen.posts.at(-1);
  assert.equal(h.seen.posts.length, 5);
  assert.equal(next.input, first.input);
  assert.notEqual(next.commandId, first.commandId, "a new operation, not the refused one again");
  assert.deepEqual(h.seen.merged, ["r2"]);
  assert.equal(h.state.unconfirmedRuns.size, 0);
});

test("N6 · Recover that finds the receipt shows the Run and releases the command", async () => {
  const h = sendHarness([
    () => { throw network(); },
    (body) => ({ run: { id: "r1", sessionId: "s1", commandId: body.commandId, status: "running" } }),
  ]);
  await h.send("hello");
  await h.recoverRunReceipt();
  assert.deepEqual(h.seen.posts[1], h.seen.posts[0]);
  assert.equal(h.state.unconfirmedRuns.size, 0);
  assert.deepEqual(h.seen.merged, ["r1"]);
  assert.equal(h.seen.cleared > 0, true, "the unconfirmed notice is cleared");
  assert.equal(h.seen.feedback.at(-1).text, "Delivery is unconfirmed. Your instruction is kept; check its receipt before sending another.", "nothing was added after it");
});

test("N6 · a confirmed receipt whose Run then cannot be shown is a failed refresh, not an unresolved receipt", async () => {
  const h = sendHarness([
    () => { throw network(); },
    (body) => ({ run: { id: "r1", sessionId: "s1", commandId: body.commandId, status: "running" } }),
  ], { mergeFails: true });
  await h.send("hello");
  await h.recoverRunReceipt(); // must not reject
  assert.equal(h.state.unconfirmedRuns.size, 0, "the receipt is settled");
  assert.deepEqual(h.held(), []);
  assert.deepEqual(h.seen.toasts, ["Refresh failed: the Run could not be drawn"]);
  assert.equal(h.seen.feedback.some((entry) => entry.text.startsWith("Run receipt is still unresolved")), false);
  assert.equal(h.state.pendingRuns.size, 0);
});

test("N6 · app.mjs wiring: Send and Recover classify through the one outcome function", () => {
  assert.match(src, /import \{ isUncertainCommandError, runAttemptOutcome \} from "\.\/command-outcome\.mjs";/);
  assert.doesNotMatch(src, /function isUncertainCommandError\(/, "one classifier, in the module");
  const send = grab("submitSessionRun", "async function ");
  assert.match(send, /runAttemptOutcome\(\{ operation, sessionId, error, sent: state\.unconfirmedRuns\.has\(sessionId\) \}\)\.kind === "unknown"/);
  assert.match(send, /commandId: commandId \|\| crypto\.randomUUID\(\)/, "a Send with nothing held mints its own identity");
  const recover = grab("recoverRunReceipt", "async function ");
  assert.equal((recover.match(/runAttemptOutcome\(\{ operation: receipt, sessionId, replay: true, /g) || []).length, 2);
  assert.match(recover, /body: \{ input: receipt\.input, commandId: receipt\.commandId, \.\.\.\(receipt\.runtimeSelection \? \{ runtimeSelection: receipt\.runtimeSelection \} : \{\}\) \}/);
  assert.doesNotMatch(recover, /randomUUID/, "recovery never mints");
});
