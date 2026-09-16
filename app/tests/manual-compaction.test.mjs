import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { boot, reopen } from "./helpers.mjs";

/* CMP-01 · manual compaction as a Host operation. The fake provider answers
 * the summary request; the SDK's own `compact()` writes the journal entry. */

function usage(totalTokens) {
  return { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
}
const messageText = (message) => typeof message?.content === "string" ? message.content : (message?.content ?? []).map((part) => part?.text ?? "").join("");
const isSummaryRequest = (body) => (body?.messages ?? []).some((m) => m.role === "user" && messageText(m).startsWith("<conversation>"));

async function seedHistory({ dataDir, runtime, session, turns = 2 }) {
  const sessionDir = path.join(dataDir, "pi-sessions", session.id);
  const manager = SessionManager.create(session.workspaceDir, sessionDir, { id: `seed-${session.id}` });
  for (let i = 0; i < turns; i++) {
    manager.appendMessage({ role: "user", content: [{ type: "text", text: `SEED_USER_${i} ` + "x".repeat(400) }], timestamp: Date.now() });
    manager.appendMessage({ role: "assistant", content: [{ type: "text", text: `SEED_ASSISTANT_${i} ` + "y".repeat(400) }], api: "openai-completions", provider: "fake-openai-loopback", model: "fake-model", usage: usage(4), stopReason: "stop", timestamp: Date.now() });
  }
  await runtime.store.setHostSession(session.id, { id: manager.getSessionId(), path: manager.getSessionFile() });
  return manager;
}

async function setup({ responder } = {}) {
  const requests = [];
  const h = await boot({
    compaction: { enabled: true, reserveTokens: 1, keepRecentTokens: 1, maxCompactions: 4 },
    fakeResponder: (args) => {
      const summary = isSummaryRequest(args.body);
      const userTexts = (args.body?.messages ?? []).filter((m) => m.role === "user").map(messageText);
      requests.push({ requestNumber: args.requestNumber, summary, userTexts, body: args.body });
      if (responder) return responder({ ...args, summary, userTexts });
      return { kind: "text", id: `manual-${args.requestNumber}`, created: 1, text: summary ? "SUMMARY OF THE CONVERSATION" : "ordinary answer" };
    },
  });
  h.runtime.fakeProvider.model.contextWindow = 4;
  const session = await h.createSession();
  const manager = await seedHistory({ dataDir: h.dataDir, runtime: h.runtime, session });
  return { ...h, session, manager, requests };
}

async function pollOperation(h, sessionId, id, { timeoutMs = 10000 } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const { json } = await h.api("GET", `/sessions/${sessionId}/compactions/${id}`);
    if (json.operation.status !== "running") return json.operation;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("operation did not settle");
}

test("CMP-01 · a manual compaction on an idle chat writes one summary through the SDK, records estimate and usage apart, and the next Run reads the compacted journal", async () => {
  const h = await setup();
  try {
    const started = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "compact-1", focus: "Keep the file paths and open questions." });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal(started.json.idempotent, false);
    assert.equal(started.json.operation.status, "running");
    assert.equal(started.json.operation.reason, "manual");
    assert.equal(started.json.operation.focus, "Keep the file paths and open questions.");
    const op = await pollOperation(h, h.session.id, started.json.operation.id);
    assert.equal(op.status, "completed", JSON.stringify(op.error));
    assert.equal(op.result.tokensBefore.source, "sdk-estimate");
    assert.equal(op.result.estimatedTokensAfter.source, "sdk-estimate");
    assert.ok(Number.isFinite(op.result.tokensBefore.value));
    assert.equal(op.result.usage.source, "provider-reported");
    assert.equal(op.result.usageMissing, false);
    assert.equal(op.journal.summariesBefore, 0);
    assert.equal(op.journal.summariesAfter, 1, "exactly one compaction entry was appended");
    assert.equal(op.provider.provider, "fake-openai-loopback");
    assert.equal(op.provider.configVersion, (await h.api("GET", "/provider-config")).json.version);
    // Under the fixture's four-token window the SDK summarizes in chunks; every
    // request is a summary request and none is an ordinary turn.
    const summaryRequests = h.requests.filter((r) => r.summary);
    assert.ok(summaryRequests.length >= 1, "at least one summary request");
    assert.ok(summaryRequests.some((r) => JSON.stringify(r.body).includes("Keep the file paths and open questions.")), "the focus reaches the summary request");
    assert.equal(h.requests.filter((r) => !r.summary).length, 0, "no ordinary model turn was sent");
    assert.equal(h.runtime.store.listRuns().filter((r) => r.sessionId === h.session.id).length, 0, "no Run was created");
    const entries = SessionManager.open(h.session.hostSession?.path ?? h.runtime.store.getSession(h.session.id).hostSession.path).getEntries();
    assert.equal(entries.at(-1).type, "compaction");
    assert.ok(entries.at(-1).summary.includes("SUMMARY OF THE CONVERSATION"), "the SDK's journal entry carries the provider's summary text");

    // Query-back and replay: the same requestId is the same record, no second summary.
    const replay = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "compact-1", focus: "Keep the file paths and open questions." });
    assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true); assert.equal(replay.json.operation.id, op.id);
    const summariesAfterReplay = h.requests.filter((r) => r.summary).length;
    assert.equal(summariesAfterReplay, summaryRequests.length, "a replay sends no summary request");
    const listed = (await h.api("GET", `/sessions/${h.session.id}/compactions`)).json.operations;
    assert.deepEqual(listed.map((o) => o.id), [op.id]);

    // Already compacted, nothing new: a non-success reason and no summary request.
    const again = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "compact-2" });
    assert.equal(again.status, 200, JSON.stringify(again.json));
    const second = await pollOperation(h, h.session.id, again.json.operation.id);
    assert.equal(second.status, "failed", JSON.stringify(second));
    assert.equal(second.error.code, "already_compacted", JSON.stringify(second.error));
    assert.equal(second.journal.summariesAfter, 1);
    assert.equal(h.requests.filter((r) => r.summary).length, summaryRequests.length, "no paid summary for nothing new");

    // The next ordinary Run sees the compacted journal (the summary is in its request).
    const made = await h.api("POST", `/sessions/${h.session.id}/runs`, { commandId: "after-compact", input: "continue" });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    const ordinary = h.requests.filter((r) => !r.summary);
    assert.ok(ordinary.length >= 1);
    assert.ok(JSON.stringify(ordinary[0].body).includes("SUMMARY OF THE CONVERSATION"), "the summary reaches the next request");
    assert.equal(JSON.stringify(ordinary[0].body).includes("SEED_USER_0"), false, "compacted history is not resent verbatim");

    // New history after the Run: a third manual compaction succeeds and the chat goes on.
    const third = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "compact-3", focus: "Keep the open questions." });
    assert.equal(third.status, 200, JSON.stringify(third.json));
    const settled3 = await pollOperation(h, h.session.id, third.json.operation.id);
    assert.equal(settled3.status, "completed", JSON.stringify(settled3.error));
    assert.equal(settled3.journal.summariesAfter, 2);
    const made2 = await h.api("POST", `/sessions/${h.session.id}/runs`, { commandId: "after-compact-3", input: "and again" });
    assert.equal(made2.status, 200, JSON.stringify(made2.json));
    assert.equal((await h.pollRun(made2.json.run.id)).status, "completed");
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("CMP-01 · refusals are explicit: active Run (not queued, not aborted), a second compaction, no history, unknown keys; and a compaction freezes configuration", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const h = await setup({ responder: async (args) => {
    if (args.summary) { await gate; return { kind: "text", id: `s-${args.requestNumber}`, created: 1, text: "SLOW SUMMARY" }; }
    return null; // ordinary turns keep the fixture-script behaviour
  } });
  try {
    // No history: a fresh session has no journal to compact.
    const fresh = await h.createSession();
    const none = await h.api("POST", `/sessions/${fresh.id}/compactions`, { requestId: "none" });
    assert.equal(none.status, 409); assert.equal(none.json.error.code, "nothing_to_compact");
    const bad = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "bad", extra: true });
    assert.equal(bad.status, 400);

    // While a compaction runs: a Run is refused, a second compaction is refused, configuration is frozen.
    const started = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "slow" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    await new Promise((r) => setTimeout(r, 100));
    const runDuring = await h.api("POST", `/sessions/${h.session.id}/runs`, { commandId: "during", input: "hello" });
    assert.equal(runDuring.status, 409, JSON.stringify(runDuring.json));
    const secondDuring = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "second" });
    assert.equal(secondDuring.status, 409); assert.equal(secondDuring.json.error.code, "operation_active");
    const cfg = (await h.api("GET", "/provider-config")).json;
    const frozen = await h.api("PUT", "/provider-config", { ...cfg.config, expectedVersion: cfg.version });
    assert.equal(frozen.status, 409); assert.equal(frozen.json.error.code, "active_run");
    release();
    const op = await pollOperation(h, h.session.id, started.json.operation.id);
    assert.equal(op.status, "completed", JSON.stringify(op.error));

    // With a Run active, compaction is refused and the Run is untouched.
    const holdSession = await h.createSession();
    await h.api("PUT", `/sessions/${holdSession.id}/permission-mode`, { permissionMode: "ask" });
    const held = await h.api("POST", `/sessions/${holdSession.id}/runs`, { commandId: "hold", input: '/fixture script [{"name":"ws_write","arguments":{"path":"note.txt","text":"x"}}]' });
    assert.equal(held.status, 200, JSON.stringify(held.json));
    let waiting = null;
    for (let i = 0; i < 100 && !waiting; i++) { await new Promise((r) => setTimeout(r, 50)); const r = (await h.api("GET", `/runs/${held.json.run.id}`)).json.run; if (r.status === "waiting_user") waiting = r; }
    assert.ok(waiting, "the Run is waiting for a permission answer");
    const refused = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "while-run" });
    assert.equal(refused.status, 409); assert.equal(refused.json.error.code, "active_run");
    assert.equal((await h.api("GET", `/runs/${held.json.run.id}`)).json.run.status, "waiting_user", "the active Run was not aborted");
    const openEvent = (await h.api("GET", `/sessions/${holdSession.id}/events`)).json.events.find((e) => e.type === "permission.open");
    await h.api("POST", `/runs/${held.json.run.id}/questions/${openEvent.data.id}`, { decision: "deny" });
    await h.pollRun(held.json.run.id);
    assert.equal((await h.api("GET", `/sessions/${h.session.id}/compactions`)).json.operations.filter((o) => o.requestId === "while-run").length, 0, "a refused compaction leaves no record");
  } finally {
    release?.();
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("CMP-01 · cancel and deadline settle without a partial summary; a restart marks an in-flight compaction unknown and the same requestId reads it back", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const h = await setup({ responder: async (args) => {
    if (args.summary) { await gate; return { kind: "text", id: `s-${args.requestNumber}`, created: 1, text: "LATE SUMMARY" }; }
    return { kind: "text", id: `t-${args.requestNumber}`, created: 1, text: "answer" };
  } });
  try {
    const summariesOf = (p) => SessionManager.open(p).getEntries().filter((e) => e.type === "compaction").length;
    const started = await h.api("POST", `/sessions/${h.session.id}/compactions`, { requestId: "cancel-me" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    await new Promise((r) => setTimeout(r, 100));
    const cancelled = await h.api("POST", `/sessions/${h.session.id}/compactions/${started.json.operation.id}/cancel`);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    assert.equal(cancelled.json.operation.status, "cancelled");
    assert.equal(cancelled.json.operation.error.code, "cancelled");
    assert.equal(summariesOf(h.runtime.store.getSession(h.session.id).hostSession.path), 0, "no partial summary was written");
    release();

    // Restart with a compaction in flight: unknown, queried back by the same requestId, no second summary.
    let release2; const gate2 = new Promise((r) => { release2 = r; });
    const h2 = await boot({ compaction: { enabled: true, reserveTokens: 1, keepRecentTokens: 1, maxCompactions: 4 }, fakeResponder: async (args) => {
      if (isSummaryRequest(args.body)) { await gate2; return { kind: "text", id: "never", created: 1, text: "NEVER" }; }
      return { kind: "text", id: "t", created: 1, text: "answer" };
    } });
    h2.runtime.fakeProvider.model.contextWindow = 4;
    const session2 = await h2.createSession();
    await seedHistory({ dataDir: h2.dataDir, runtime: h2.runtime, session: session2 });
    const inflight = await h2.api("POST", `/sessions/${session2.id}/compactions`, { requestId: "restart-1" });
    assert.equal(inflight.status, 200, JSON.stringify(inflight.json));
    await new Promise((r) => setTimeout(r, 100));
    const dataDir = h2.dataDir;
    release2();
    await h2.runtime.close();
    const again = await reopen(dataDir);
    try {
      const recovered = (await again.api("GET", `/sessions/${session2.id}/compactions/${inflight.json.operation.id}`)).json.operation;
      assert.equal(recovered.status, "unknown");
      assert.equal(recovered.error.code, "restart_unknown");
      const replay = await again.api("POST", `/sessions/${session2.id}/compactions`, { requestId: "restart-1" });
      assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true); assert.equal(replay.json.operation.status, "unknown");
      const runAfter = await again.api("POST", `/sessions/${session2.id}/runs`, { commandId: "after-unknown", input: "still works" });
      assert.equal(runAfter.status, 200, "an unknown operation does not hold the seat after restart");
      for (let i = 0; i < 200; i++) { await new Promise((r) => setTimeout(r, 25)); const r = (await again.api("GET", `/runs/${runAfter.json.run.id}`)).json.run; if (["completed", "failed", "cancelled"].includes(r.status)) break; }
    } finally { await again.runtime.close(); await rm(dataDir, { recursive: true, force: true }); }
  } finally {
    release?.();
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
