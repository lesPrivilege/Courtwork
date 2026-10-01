/* The Chat projects Host facts: a Run's status, a settled refusal, a frozen
 * or conflicting save, a deletion refusal. app.mjs has no DOM harness, so
 * these run the real function text from app.mjs against stubbed state. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { normalizedType } from "../web/thread-projection.mjs";
import { admitSessionEvents } from "../web/session-events.mjs";

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
function grabConst(name) {
  const start = src.indexOf(`const ${name} = {`);
  assert.ok(start >= 0, `app.mjs defines ${name}`);
  const end = src.indexOf("\n};", start);
  return src.slice(start, end + 3);
}

function runMerger(runs) {
  const state = { runs, events: [], lastSeq: 0, activeSessionId: "s", questionDrafts: new Map(), questionControls: new Map(), questionSubmitting: new Map(), questionSubmitted: new Map(), questionErrors: new Map() };
  const body = [grab("isTerminalRunStatus"), grab("sessionIdForEvent"), grab("runBelongsToSession"), grab("mergeRun"), grab("mergeEvents")].join("\n");
  const make = new Function("state", "normalizedType", "admitSessionEvents", "preview", "bumpSessionMutation", "workReviewSummaryView", "loadRecentSessions", "questionScopeKey",
    `${body}; return { mergeEvents, mergeRun };`);
  return { state, ...make(state, normalizedType, admitSessionEvents, { active: false }, () => {}, null, () => {}, (a, b) => `${a}:${b}`) };
}

test("a run.error records the error but not a status; the Host's run.status settles it", () => {
  const { state, mergeEvents } = runMerger([{ id: "r1", sessionId: "s", status: "running" }]);
  mergeEvents([{ seq: 1, sessionId: "s", runId: "r1", type: "run.error", data: { code: "budget_exceeded", message: "run turn budget exceeded" } }]);
  assert.equal(state.runs[0].status, "running", "run.error is not a status");
  assert.equal(state.runs[0].error.code, "budget_exceeded");
  mergeEvents([{ seq: 2, sessionId: "s", runId: "r1", type: "run.status", data: { status: "unknown" } }]);
  assert.equal(state.runs[0].status, "unknown");
});

test("a Host Run snapshot replaces a terminal status; a stale non-terminal read does not reopen it", () => {
  const { state, mergeRun } = runMerger([{ id: "r1", sessionId: "s", status: "failed" }]);
  assert.equal(mergeRun({ id: "r1", sessionId: "s", status: "unknown" }, { sessionId: "s" }), true);
  assert.equal(state.runs[0].status, "unknown");
  assert.equal(mergeRun({ id: "r1", sessionId: "s", status: "running" }, { sessionId: "s" }), false);
  assert.equal(state.runs[0].status, "unknown");
});

test("a coded Host refusal is settled; only no response or an uncoded/internal 5xx is uncertain", () => {
  const make = new Function(`${grab("isUncertainCommandError")}; ${grabConst("ERROR_COPY")}; ${grab("describeCommandError")}; return { isUncertainCommandError, describeCommandError };`);
  const { isUncertainCommandError, describeCommandError } = make();
  const hostError = (status, code, message = "refused") => Object.assign(new Error(message), { status, body: code ? { error: { code, message } } : null });
  for (const code of ["provider_unsupported", "configuration_incomplete", "effort_unsupported", "runtime_closing", "runtime_unavailable"])
    assert.equal(isUncertainCommandError(hostError(503, code)), false, code);
  assert.equal(isUncertainCommandError(hostError(409, "active_run")), false);
  assert.equal(isUncertainCommandError(new Error("The local runtime could not be reached.")), true);
  assert.equal(isUncertainCommandError(hostError(500, "internal_error")), true);
  assert.equal(isUncertainCommandError(hostError(502, null)), true);
  assert.equal(describeCommandError("run", hostError(503, "provider_unsupported", "configured provider route is unavailable")).text,
    "Run was not started: configured provider route is unavailable");
  // The send path records an unconfirmed Run by the same classification.
  assert.match(grab("submitSessionRun", "async function "), /state\.unconfirmedRuns\.has\(sessionId\) && isUncertainCommandError\(error\)/);
});

test("a Core error the Host marked outcome unknown is uncertain whatever its code; the same code without the marker is settled", () => {
  const { isUncertainCommandError } = new Function(`${grab("isUncertainCommandError")}; return { isUncertainCommandError };`)();
  const coreError = (status, code, outcome) => Object.assign(new Error("Core did not answer in time"), { status, body: { error: { code, message: "Core did not answer in time", ...(outcome && { outcome, operation: "attention_action" }) } } });
  assert.equal(isUncertainCommandError(coreError(503, "CORE_TIMEOUT", "unknown")), true);
  assert.equal(isUncertainCommandError(coreError(503, "CORE_TIMEOUT")), false);
  assert.equal(isUncertainCommandError(coreError(409, "OBLIGATION_OPEN")), false);
});

test("a binding command with an unknown Core outcome is not reported as a refusal, and the binding is read again", async () => {
  const toasts = [], reads = [];
  const make = new Function("showToast", "refreshSessionBinding", `${grab("bindingFailed", "async function ")}; return bindingFailed;`);
  const bindingFailed = make((text) => toasts.push(text), async (id) => reads.push(id));
  const coreError = (status, code, message, outcome) => Object.assign(new Error(message), { status, body: { error: { code, message, ...(outcome && { outcome }) } } });
  await bindingFailed(coreError(503, "CORE_TIMEOUT", "Core did not answer in time", "unknown"), "Could not create binding", "s1");
  assert.deepEqual(toasts, ["The result is not known: Core did not answer in time"]);
  assert.deepEqual(reads, ["s1"]);
  await bindingFailed(coreError(409, "binding_mismatch", "binding changed"), "Could not create binding", "s1");
  assert.deepEqual(toasts.at(-1), "Could not create binding: binding changed");
  assert.deepEqual(reads, ["s1", "s1"], "a 409 still re-reads");
  await bindingFailed(coreError(400, "invalid_input", "bad field"), "Could not release the binding", "s1");
  assert.equal(toasts.at(-1), "Could not release the binding: bad field");
  assert.equal(reads.length, 2, "a plain refusal does not re-read");
  assert.equal((src.match(/await bindingFailed\(/g) || []).length, 3, "release, continue and create all use it");
});

async function effortSave(error) {
  const state = { providerConfig: { version: 3, config: { provider: "p", model: "m", api: "a" }, reasoningCapability: { kind: "enum", values: ["low"] } } };
  const reads = [];
  const request = async (path, options = {}) => { if (options.method === "PUT") throw error; reads.push(path); return { version: 4, config: state.providerConfig.config }; };
  const make = new Function("state", "request", "projectProviderConfig", "renderModelCard", "renderProviderPanel", "renderAll", "attentionAgent",
    `let modelCardEpoch = 0, modelCardBusy = false, modelCardFeedback = null; ${grab("saveEffortFromCard", "async function ")}; return { save: saveEffortFromCard, feedback: () => modelCardFeedback };`);
  const card = make(state, request, (config, patch) => ({ ...config, ...patch }), () => {}, () => {}, () => {}, null);
  await card.save("low");
  return { feedback: card.feedback(), reads };
}

test("effort save: a frozen refusal shows the Host's words; only config_conflict re-reads", async () => {
  const frozen = Object.assign(new Error("provider config is frozen during a run"), { status: 409, body: { error: { code: "active_run", message: "provider config is frozen during a run" } } });
  assert.deepEqual(await effortSave(frozen), { feedback: "provider config is frozen during a run", reads: [] });
  const conflict = Object.assign(new Error("Provider configuration changed. Reload before saving."), { status: 409, body: { error: { code: "config_conflict" } } });
  assert.deepEqual(await effortSave(conflict), { feedback: "Saved settings changed elsewhere. Showing the current value.", reads: ["/provider-config"] });
});

function deleteHarness(error) {
  const node = () => ({ textContent: "", hidden: true, disabled: false, querySelector: () => node() });
  const nodes = { "delete-error": node(), "delete-form": node() };
  const state = { deleteTarget: { id: "s2", title: "Other chat" } };
  const make = new Function("state", "$", "request", `${grab("submitDelete", "async function ")}; return submitDelete;`);
  return { nodes, submit: make(state, (id) => nodes[id], async () => { throw error; }) };
}

test("chat delete: a Host refusal is shown in its own words; enablement follows any loaded active Run", async () => {
  for (const [code, message] of [["operation_active", "session deletion is unavailable during a compaction"], ["spark_session_referenced", "a Spark matter references this chat"]]) {
    const { nodes, submit } = deleteHarness(Object.assign(new Error(message), { status: 409, body: { error: { code, message } } }));
    await submit({ preventDefault() {}, submitter: { value: "default" } });
    assert.equal(nodes["delete-error"].textContent, message, code);
  }
  const state = { projects: [], runs: [{ id: "r", status: "running" }], activeSessionId: "s1", view: "session" };
  const make = new Function("state", "findKnownSession", "preview", `${grab("isActiveRun")}; ${grab("resolveCommandTarget")}; return resolveCommandTarget;`);
  const resolve = make(state, (id) => ({ id, title: id, projectId: null }), { isExampleId: () => false });
  assert.equal(resolve({ kind: "chat", id: "s2" }).target.activeRun, true, "the Host refuses deleting any chat while a Run is active");
});
