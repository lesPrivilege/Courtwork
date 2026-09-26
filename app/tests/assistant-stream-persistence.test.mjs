/* Order 3 · STR-R1: a failed coalesced snapshot write fails the Run the same
 * way any other runtime event persistence failure does; it is never only
 * logged. The unit cases use a fake clock; the service case injects exactly
 * one failing coalesced `assistant.delta` append into a real Host. */
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { createSegmentStream, SNAPSHOT_INTERVAL_MS } from "../server/assistant-stream.mjs";
import { boot, reopen } from "./helpers.mjs";

function harness(write) {
  let clock = 0;
  const timers = new Map();
  let nextId = 1;
  const logs = [];
  const stream = createSegmentStream({
    write,
    now: () => clock,
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimer: (id) => timers.delete(id),
    log: (message) => logs.push(message),
  });
  const advance = async (ms) => {
    clock += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { stream, logs, advance, timers };
}
const delta = (text) => ({ type: "assistant.delta", data: { text, segment: 0 } });
const final = (text) => ({ type: "assistant.message", data: { text, stopReason: "stop", segment: 0 } });

test("a failed coalesced write rejects the next observation and the final is not written", async () => {
  const written = [];
  let calls = 0;
  const { stream, logs, advance } = harness(async (event) => {
    if (++calls === 2) throw new Error("disk full");
    written.push(event);
  });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  await advance(SNAPSHOT_INTERVAL_MS);
  assert.match(logs.join("\n"), /coalesced snapshot write failed: disk full/);
  await assert.rejects(stream.observe(delta("abc")), /disk full/);
  await assert.rejects(stream.observe(final("abc")), /disk full/);
  assert.deepEqual(written.map((event) => event.type), ["assistant.delta"], "nothing after the failure");
  await assert.rejects(stream.persisted(), (error) => error.code === "runtime_projection_failed" && error.cause.message === "disk full");
  assert.deepEqual(stream.settle("failed"), [{ type: "assistant.message", data: { text: "ab", segment: 0, stopReason: "error", partial: true } }], "the newest accepted text settles as partial; data after the failure is not admitted");
});

test("with no later observation the Run end still reports the failure", async () => {
  const { stream, advance } = harness(async (event) => { if (event.data.text === "ab") throw new Error("disk full"); });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  await advance(SNAPSHOT_INTERVAL_MS);
  await assert.rejects(stream.persisted(), { code: "runtime_projection_failed" });
});

test("the final waits for a coalesced write under way and follows it", async () => {
  const order = [];
  let release;
  const { stream, advance } = harness(async (event) => {
    if (event.data.text === "ab") await new Promise((resolve) => { release = resolve; });
    order.push(`${event.type}:${event.data.text}`);
  });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  await advance(SNAPSHOT_INTERVAL_MS);
  const finishing = stream.observe(final("abc"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["assistant.delta:a"], "the final is held behind the write under way");
  release();
  await finishing;
  assert.deepEqual(order, ["assistant.delta:a", "assistant.delta:ab", "assistant.message:abc"]);
  await stream.persisted();
});

test("a final waiting on a failing write keeps its segment open for one error partial", async () => {
  let rejectHeld;
  const written = [];
  const { stream, advance } = harness(async (event) => {
    if (event.data.text === "abc") await new Promise((_, reject) => { rejectHeld = reject; });
    written.push(event);
  });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  await stream.observe(delta("abc"));
  await advance(SNAPSHOT_INTERVAL_MS);
  const finishing = stream.observe(final("abc"));
  rejectHeld(new Error("held write fails"));
  await assert.rejects(finishing, /held write fails/);
  await assert.rejects(stream.observe(final("abc")), /held write fails/, "late data admits no final");
  assert.deepEqual(written.map((event) => event.type), ["assistant.delta"]);
  assert.deepEqual(stream.settle("failed"), [{ type: "assistant.message", data: { text: "abc", segment: 0, stopReason: "error", partial: true } }]);
  assert.deepEqual(stream.settle("failed"), [], "idempotent");
});

test("a failing final write keeps its segment open for one error partial and rejects late data", async () => {
  const { stream } = harness(async (event) => { if (event.type === "assistant.message") throw new Error("final write fails"); });
  await stream.observe(delta("a"));
  await assert.rejects(stream.observe(final("ab")), /final write fails/);
  await assert.rejects(stream.observe(delta("a", 1)), /final write fails/);
  await assert.rejects(stream.persisted(), { code: "runtime_projection_failed" });
  assert.deepEqual(stream.settle("failed"), [{ type: "assistant.message", data: { text: "a", segment: 0, stopReason: "error", partial: true } }]);
});

test("a segment opened while an earlier final waits still settles both", async () => {
  let rejectHeld;
  const { stream, advance } = harness(async (event) => {
    if (event.data.text === "ab") await new Promise((_, reject) => { rejectHeld = reject; });
  });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  await advance(SNAPSHOT_INTERVAL_MS);
  const finishing = stream.observe(final("ab"));
  await stream.observe({ type: "assistant.delta", data: { text: "next", segment: 1 } });
  rejectHeld(new Error("held write fails"));
  await assert.rejects(finishing, /held write fails/);
  assert.deepEqual(stream.settle("failed").map((event) => [event.data.segment, event.data.text]), [[0, "ab"], [1, "next"]]);
});

test("persisted() stops a pending timer so nothing is written after the Run", async () => {
  const written = [];
  const { stream, advance, timers } = harness(async (event) => { written.push(event); });
  await stream.observe(delta("a"));
  await stream.observe(delta("ab"));
  assert.equal(timers.size, 1);
  await stream.persisted();
  assert.equal(timers.size, 0);
  await advance(SNAPSHOT_INTERVAL_MS);
  assert.equal(written.length, 1);
});

test("Host: one failed coalesced snapshot write fails the Run with runtime_projection_failed", async () => {
  const ctx = await boot({ fakeResponder: () => ({ kind: "text", id: "str-r1", created: 1, chunkMs: 30, text: "Synthetic persistence failure probe. ".repeat(100) }) });
  try {
    const append = ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
    let attempts = 0;
    let injected = false;
    ctx.runtime.store.appendEvent = async (event) => {
      if (event.type === "assistant.delta" && ++attempts === 2) { injected = true; throw new Error("transient snapshot persistence failure"); }
      return append(event);
    };
    const session = await ctx.createSession();
    const made = await ctx.api("POST", `/sessions/${session.id}/runs`, { commandId: "str-r1", input: "please answer" });
    const run = await ctx.pollRun(made.json.run.id, { timeoutMs: 30000 });
    assert.equal(injected, true);
    assert.equal(run.status, "failed");
    assert.equal(run.error?.code, "runtime_projection_failed");
    assert.equal(run.usage?.missing, true);
    const detail = await ctx.api("GET", `/sessions/${session.id}`);
    const finals = detail.json.events.filter((event) => event.runId === run.id && event.type === "assistant.message");
    assert.equal(finals.length, 1, "exactly one final for the open segment");
    assert.equal(finals[0].data.partial, true);
    assert.equal(finals[0].data.stopReason, "error");
    assert.equal(finals[0].data.segment, 0);
  } finally {
    await ctx.runtime.close();
    await rm(ctx.dataDir, { recursive: true, force: true });
  }
});

test("Host: a final waiting on a failing in-flight snapshot write still settles one error partial", async () => {
  const text = "Synthetic held persistence failure. ".repeat(18);
  const ctx = await boot({ fakeResponder: () => ({ kind: "text", id: "str-r1-final", created: 1, chunkMs: 30, text }) });
  let rejectHeld;
  let finalObserved = false;
  let reopened;
  try {
    const append = ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
    let attempts = 0;
    ctx.runtime.store.appendEvent = async (event) => {
      if (event.type === "assistant.delta" && ++attempts === 2) await new Promise((_, reject) => { rejectHeld = reject; });
      return append(event);
    };
    // The exact Parent sequence: the real sink starts awaiting the held write
    // for the final, then the held write rejects.
    const real = ctx.runtime.service.runtimePort;
    ctx.runtime.service.runtimePort = { ...real, openSession(input) {
      const native = real.openSession(input);
      return { ...native, start(options) {
        return native.start({ ...options, onObservation(observation) {
          const result = options.onObservation(observation);
          if (observation.type === "assistant.message" && rejectHeld) { finalObserved = true; queueMicrotask(() => rejectHeld(new Error("held snapshot rejects after final begins"))); }
          return result;
        } });
      } };
    } };
    const session = await ctx.createSession();
    const made = await ctx.api("POST", `/sessions/${session.id}/runs`, { commandId: "str-r1-final", input: "answer" });
    const run = await ctx.pollRun(made.json.run.id, { timeoutMs: 15000 });
    assert.equal(finalObserved, true);
    assert.equal(run.status, "failed");
    assert.equal(run.error?.code, "runtime_projection_failed");
    const read = async (api) => (await api("GET", `/sessions/${session.id}/events`)).json.events.filter((event) => event.runId === run.id);
    const events = await read(ctx.api);
    const finals = events.filter((event) => event.type === "assistant.message");
    const lastDelta = events.filter((event) => event.type === "assistant.delta").at(-1);
    assert.equal(finals.length, 1, "exactly one final for the open segment");
    assert.deepEqual(finals[0].data, { text, segment: 0, stopReason: "error", partial: true }, "the newest received snapshot");
    assert.ok(finals[0].data.text.startsWith(lastDelta.data.text), "extends the newest persisted snapshot");
    const status = events.find((event) => event.type === "run.status" && event.data.status === "failed");
    assert.equal(status.seq, finals[0].seq + 1, "the partial lands with the terminal status");
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.deepEqual(await read(ctx.api), events, "no later event, no duplicate final");
    await ctx.runtime.close();
    reopened = await reopen(ctx.dataDir);
    assert.deepEqual(await read(reopened.api), events, "reload restores the same events");
  } finally {
    rejectHeld?.(new Error("test cleanup"));
    await (reopened?.runtime ?? ctx.runtime).close();
    await rm(ctx.dataDir, { recursive: true, force: true });
  }
});
