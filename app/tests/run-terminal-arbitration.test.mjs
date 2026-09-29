/* Review D1–D3 (engineering/reviews/doc-driven-code-review-2026-09-29): a Run's
 * terminal status is final, and a cancel request is arbitrated against what the
 * runtime actually decided. A cancel that arrives after the runtime completed
 * does not relabel the Run; an exception while a cancel is pending is an
 * unresolved outcome, not a cancellation. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { createPiRuntimePort } from "../runtime/pi-runtime-port.mjs";

const statuses = (h, sessionId, runId) => h.runtime.store.listEvents({ sessionId, runId }).filter((e) => e.type === "run.status").map((e) => e.data.status);

test("D1: a cancel racing the completion write leaves the Run completed", async () => {
  const h = await boot();
  try {
    const store = h.runtime.store; const service = h.runtime.service;
    const session = await h.createSession();
    const write = store.updateRunWithEvent.bind(store);
    const writeIfActive = store.updateRunIfActive?.bind(store);
    let cancelled;
    // Issue the cancel in the same tick the Host queues its own `completed`
    // write, before that write is published: an HTTP cancel landing in the
    // persist window. No artificial delay.
    const intercept = (original) => (id, patch, events) => {
      const pending = original(id, patch, events);
      if (patch.status === "completed" && !cancelled) cancelled = service.cancelRun(id, {});
      return pending;
    };
    store.updateRunWithEvent = intercept(write);
    if (writeIfActive) store.updateRunIfActive = intercept(writeIfActive);
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "d1" });
    const runId = created.json.run.id;
    await h.pollRun(runId);
    assert.ok(cancelled, "the cancel was issued inside the completion write");
    const returned = await cancelled;
    assert.equal(returned.run.status, "completed");
    assert.equal(store.getRun(runId).status, "completed");
    assert.deepEqual(statuses(h, session.id, runId), ["running", "completed"]);
  } finally { await h.runtime.close(); }
});

test("D1: the store refuses to change a terminal Run's status", async () => {
  const h = await boot();
  try {
    const store = h.runtime.store;
    const session = await h.createSession();
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "d1-guard" });
    const runId = created.json.run.id;
    await h.pollRun(runId);
    await assert.rejects(store.updateRunWithEvent(runId, { status: "stopping" }, { type: "run.status", data: { status: "stopping" } }), { code: "RUN_TERMINAL" });
    await assert.rejects(store.updateRun(runId, { status: "cancelled" }), { code: "RUN_TERMINAL" });
    await assert.rejects(store.openQuestion({ runId, kind: "ask_user", prompt: "late?" }), { code: "RUN_TERMINAL" });
    const skipped = await store.updateRunIfActive(runId, { status: "cancelled" }, { type: "run.status", data: { status: "cancelled" } });
    assert.equal(skipped.applied, false);
    assert.equal(skipped.run.status, "completed");
    await store.updateRunWithEvent(runId, { admissionOpen: false }, null);
    assert.equal(store.getRun(runId).status, "completed", "non-status patches on a terminal Run still apply");
    assert.deepEqual(statuses(h, session.id, runId), ["running", "completed"]);
  } finally { await h.runtime.close(); }
});

// D2 is by design (same rule as the Local Pi contract): an explicit cancel
// accepted before the Host's terminal write settles the Run cancelled, and the
// runtime's completed answer stays as evidence.
test("D2: a cancel accepted before the terminal write settles cancelled and keeps the completed answer", async () => {
  const h = await boot();
  try {
    const store = h.runtime.store; const service = h.runtime.service;
    const session = await h.createSession();
    // Widen only the Host's own post-run bookkeeping: run() has returned
    // `completed`, the terminal write has not happened yet.
    const recordUsage = store.recordUsage.bind(store);
    let inWindow; const reached = new Promise((resolve) => { inWindow = resolve; });
    store.recordUsage = async (...args) => { inWindow(); await new Promise((resolve) => setTimeout(resolve, 200)); return recordUsage(...args); };
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "d2" });
    const runId = created.json.run.id;
    await reached;
    const returned = await service.cancelRun(runId, {});
    assert.equal(returned.run.status, "cancelled");
    const answers = store.listEvents({ sessionId: session.id, runId }).filter((e) => e.type === "assistant.message" && !e.data.partial);
    assert.ok(answers.length >= 1, "the completed answer remains as evidence");
    assert.deepEqual(statuses(h, session.id, runId), ["running", "stopping", "cancelled"]);
  } finally { await h.runtime.close(); }
});

test("D3: an exception while a cancel is pending settles unknown and keeps the error", async () => {
  // Cancel only once the runtime is executing: a cancel before start is a
  // confirmed cancellation with nothing run, which is a different case.
  let entered; const executing = new Promise((resolve) => { entered = resolve; });
  const runtimePort = (options) => {
    const real = createPiRuntimePort(options);
    return { ...real, openSession(args) {
      const session = real.openSession(args);
      return { ...session, async start(startOptions) {
        const started = await session.start(startOptions);
        // The runtime neither confirms termination nor reports `aborted`: it throws.
        return { ...started, abort: async () => {}, run: async () => { entered(); await new Promise((resolve) => setTimeout(resolve, 300)); throw Object.assign(new Error("native runtime lost the session"), { code: "native_lost" }); } };
      } };
    } };
  };
  const h = await boot({ runtimePort });
  try {
    const session = await h.createSession();
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "d3" });
    const runId = created.json.run.id;
    await executing;
    const cancelled = await h.api("POST", `/runs/${runId}/cancel`, {});
    assert.equal(cancelled.json.run.status, "unknown");
    assert.ok(cancelled.json.run.error?.code, "the Run keeps the error that left its outcome unresolved");
    const plain = await h.createSession();
    const other = await h.api("POST", `/sessions/${plain.id}/runs`, { input: "hello", commandId: "d3-plain" });
    const failed = await h.pollRun(other.json.run.id);
    assert.equal(failed.status, "failed", "without a cancel the same exception is a failure");
    assert.ok(failed.error?.code);
  } finally { await h.runtime.close(); }
});
