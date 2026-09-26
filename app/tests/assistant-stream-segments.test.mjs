/* Order 3 · Host assistant segments: identity, coalesced snapshots, partial
 * settlement and the legacy segment rule. DOM-free, with a fake clock. */
import test from "node:test";
import assert from "node:assert/strict";
import { createSegmentStream, persistedPartial, segmentOf, SNAPSHOT_INTERVAL_MS } from "../server/assistant-stream.mjs";
import { assistantSegmentAssigner } from "../runtime/pi-session-runtime.mjs";

function harness() {
  let clock = 0;
  const timers = new Map();
  let nextId = 1;
  const written = [];
  const logs = [];
  const stream = createSegmentStream({
    write: async (event) => { written.push(structuredClone(event)); },
    now: () => clock,
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimer: (id) => timers.delete(id),
    log: (message) => logs.push(message),
  });
  const advance = async (ms) => {
    clock += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); await timer.fn(); }
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { stream, written, logs, advance, timers };
}
const delta = (text, segment) => ({ type: "assistant.delta", data: segment === undefined ? { text } : { text, segment } });
const final = (text, segment, extra = {}) => ({ type: "assistant.message", data: { text, stopReason: "stop", ...(segment === undefined ? {} : { segment }), ...extra } });

test("the first snapshot is written at once, then at most one per interval keeping only the newest", async () => {
  const { stream, written, advance } = harness();
  await stream.observe(delta("a", 0));
  assert.deepEqual(written.map((e) => e.data.text), ["a"], "first snapshot immediately");
  await advance(50); await stream.observe(delta("ab", 0));
  await advance(50); await stream.observe(delta("abc", 0));
  await advance(100); await stream.observe(delta("abcd", 0));
  assert.equal(written.length, 1, "within the interval nothing more is written");
  await advance(SNAPSHOT_INTERVAL_MS - 200);
  assert.deepEqual(written.map((e) => e.data.text), ["a", "abcd"], "the newest pending snapshot, not the intermediate ones");
  assert.ok(written.every((e) => e.data.segment === 0));
});

test("the runtime final is authoritative: pending snapshots are dropped, never written after it", async () => {
  const { stream, written, advance } = harness();
  await stream.observe(delta("Hello", 0));
  await advance(10); await stream.observe(delta("Hello wor", 0));
  await stream.observe(final("Hello world, longer than any snapshot", 0));
  await advance(1000);
  assert.deepEqual(written.map((e) => [e.type, e.data.text]), [["assistant.delta", "Hello"], ["assistant.message", "Hello world, longer than any snapshot"]]);
});

test("segments must follow in order; a shrinking snapshot and a skipped ordinal are rejected", async () => {
  const { stream, written, logs } = harness();
  await stream.observe(delta("one", 0));
  await stream.observe(delta("on", 0));
  await stream.observe(delta("x", 2));
  await stream.observe(final("one", 0));
  await stream.observe(final("", 1)); // a tool-only message closes segment 1 without text
  await stream.observe(delta("two", 2));
  assert.deepEqual(written.map((e) => [e.type, e.data.segment, e.data.text]), [
    ["assistant.delta", 0, "one"], ["assistant.message", 0, "one"], ["assistant.message", 1, ""], ["assistant.delta", 2, "two"],
  ]);
  assert.equal(logs.length, 2, "the shrink and the skip are logged");
});

test("without an adapter ordinal the Host assigns the next segment", async () => {
  const { stream, written } = harness();
  await stream.observe(delta("a"));
  await stream.observe(final("a"));
  await stream.observe(delta("b"));
  assert.deepEqual(written.map((e) => e.data.segment), [0, 0, 1]);
});

test("settlement returns one partial for an open segment, clears the timer, is idempotent and rejects late updates", async () => {
  const { stream, written, logs, advance, timers } = harness();
  await stream.observe(delta("par", 0));
  await advance(10); await stream.observe(delta("partial text", 0));
  assert.equal(timers.size, 1);
  const partials = stream.settle("cancelled");
  assert.deepEqual(partials, [{ type: "assistant.message", data: { text: "partial text", segment: 0, stopReason: "cancelled", partial: true } }], "the newest received snapshot, even if not yet written");
  assert.equal(timers.size, 0);
  assert.deepEqual(stream.settle("cancelled"), [], "idempotent");
  await stream.observe(delta("partial text and more", 0));
  await advance(1000);
  assert.deepEqual(written.map((e) => e.data.text), ["par"], "nothing written after settlement");
  assert.match(logs.at(-1), /rejected after settlement/);
});

test("no partial when the final exists or no text arrived", async () => {
  const done = harness();
  await done.stream.observe(delta("x", 0));
  await done.stream.observe(final("x", 0));
  assert.deepEqual(done.stream.settle("failed"), []);
  assert.deepEqual(harness().stream.settle("unknown"), []);
});

test("recovery settles only from persisted text and never invents an empty partial", () => {
  const events = [
    { seq: 1, runId: "r", type: "assistant.delta", data: { text: "Hi", segment: 0 } },
    { seq: 2, runId: "r", type: "assistant.message", data: { text: "Hi", segment: 0 } },
    { seq: 3, runId: "r", type: "tool.start", data: {} },
    { seq: 4, runId: "r", type: "assistant.delta", data: { text: "Next par", segment: 1 } },
    { seq: 5, runId: "r", type: "assistant.delta", data: { text: "Next partial", segment: 1 } },
  ];
  assert.deepEqual(persistedPartial(events, "unknown"), { type: "assistant.message", data: { text: "Next partial", segment: 1, stopReason: "unknown", partial: true } });
  assert.equal(persistedPartial(events.slice(0, 3), "unknown"), null, "segment 0 already settled");
  assert.equal(persistedPartial([{ seq: 1, runId: "r", type: "run.status", data: {} }], "unknown"), null, "no text, no partial");
});

test("legacy events without a segment use the stable finals-before rule", () => {
  const events = [
    { seq: 1, runId: "r", type: "assistant.delta", data: { text: "a" } },
    { seq: 2, runId: "r", type: "assistant.message", data: { text: "a" } },
    { seq: 3, runId: "r", type: "assistant.delta", data: { text: "b" } },
  ];
  assert.deepEqual(events.map((e) => segmentOf(e, events)), [0, 0, 1]);
  assert.deepEqual(persistedPartial(events, "unknown").data, { text: "b", segment: 1, stopReason: "unknown", partial: true });
});

test("the Pi adapter numbers assistant messages per Run", () => {
  const assign = assistantSegmentAssigner();
  const out = [delta("a"), final("a"), { type: "tool.start", data: {} }, delta("b"), final("b")].map(assign);
  assert.deepEqual(out.map((e) => e.data.segment ?? null), [0, 0, null, 1, 1]);
});
