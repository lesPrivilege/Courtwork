/* Order 3 · STR-R1: a failed coalesced snapshot write fails the Run the same
 * way any other runtime event persistence failure does; it is never only
 * logged. The unit cases use a fake clock; the service case injects exactly
 * one failing coalesced `assistant.delta` append into a real Host. */
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { createSegmentStream, SNAPSHOT_INTERVAL_MS } from "../server/assistant-stream.mjs";
import { boot } from "./helpers.mjs";

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
  assert.equal(stream.settle("failed").data.partial, true, "the received text still settles as partial");
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
