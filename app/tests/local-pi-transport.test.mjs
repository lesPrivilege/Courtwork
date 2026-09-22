import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runLocalPiProcess } from "../runtime/local-pi-transport.mjs";

const fixture = fileURLToPath(new URL("./fixtures/local-pi-process-fixture.mjs", import.meta.url));
const cwd = path.dirname(fixture);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function run(mode, options = {}) {
  return runLocalPiProcess({
    executable: process.execPath,
    args: [fixture, mode, ...(options.fixtureArgs ?? [])],
    cwd,
    env: options.env ?? {},
    input: options.input,
    signal: options.signal,
    limits: options.limits,
    onSpawn: options.onSpawn,
    onEvent: options.onEvent,
  });
}

async function waitUntilGone(pid) {
  const deadline = Date.now() + 2000;
  for (;;) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return;
      throw error;
    }
    if (Date.now() >= deadline) assert.fail(`pid ${pid} still exists`);
    await sleep(20);
  }
}

test("runLocalPiProcess decodes JSONL split through UTF-8 code points", async () => {
  const events = [];
  const result = await run("split-utf8", { onEvent: event => events.push(event) });
  assert.equal(result.fault, null);
  assert.equal(result.exitCode, 0);
  assert.equal(result.inputComplete, true);
  assert.equal(result.eventCount, 1);
  assert.deepEqual(events, [{ type: "text", value: "拆分🙂字节" }]);
  assert.ok(result.stdoutBytes > 0);
});

for (const [mode, fault] of [
  ["malformed", "malformed_json"],
  ["non-object", "non_object_event"],
  ["partial", "partial_frame"],
  ["invalid-utf8", "invalid_utf8"],
]) {
  test(`runLocalPiProcess reports ${fault}`, async () => {
    const result = await run(mode);
    assert.equal(result.spawned, true);
    assert.equal(result.fault, fault);
    assert.equal(result.eventCount, 0);
  });
}

test("runLocalPiProcess enforces frame and total stdout byte limits", async () => {
  const frame = await run("oversize-frame", {
    fixtureArgs: ["4096"],
    limits: { maxFrameBytes: 512 },
  });
  assert.equal(frame.fault, "frame_too_large");

  const total = await run("oversize-total", {
    fixtureArgs: ["200"],
    limits: { maxStdoutBytes: 512, maxFrameBytes: 256 },
  });
  assert.equal(total.fault, "stdout_too_large");
  assert.ok(total.stdoutBytes > 512);
});

test("runLocalPiProcess bounds stderr separately and keeps draining it", async () => {
  const events = [];
  const result = await run("stderr", {
    fixtureArgs: ["10000"],
    limits: { maxStderrBytes: 31 },
    onEvent: event => events.push(event),
  });
  assert.equal(result.fault, null);
  assert.equal(result.stderrTruncated, true);
  assert.ok(result.stderr.length > 0);
  assert.ok(Buffer.byteLength(result.stderr, "utf8") <= 34, "only a cut UTF-8 replacement may exceed the raw byte cap");
  assert.deepEqual(events, [{ type: "done" }]);
});

test("runLocalPiProcess streams bounded input with pipe backpressure", async () => {
  const input = Buffer.alloc(1024 * 1024, 0x61);
  let observed;
  const result = await run("backpressure", {
    fixtureArgs: ["150"],
    input,
    onEvent: event => { observed = event; },
  });
  assert.equal(result.fault, null);
  assert.equal(result.inputComplete, true);
  assert.deepEqual(observed, { type: "input", bytes: input.byteLength });
});

test("runLocalPiProcess waits for onSpawn before delivering input", async () => {
  const started = Date.now();
  let eventAt = 0;
  const result = await run("echo", {
    input: "durable observation first",
    onSpawn: async ({ pid }) => {
      assert.ok(Number.isInteger(pid));
      await sleep(120);
    },
    onEvent: () => { eventAt = Date.now(); },
  });
  assert.equal(result.fault, null);
  assert.ok(eventAt - started >= 100, `input arrived after ${eventAt - started}ms`);
});

test("runLocalPiProcess applies async onEvent backpressure in order", async () => {
  const order = [];
  let active = 0;
  let maxActive = 0;
  const result = await run("many-events", {
    fixtureArgs: ["24"],
    onEvent: async event => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(4);
      order.push(event.index);
      active -= 1;
    },
  });
  assert.equal(result.fault, null);
  assert.equal(result.eventCount, 24);
  assert.equal(maxActive, 1);
  assert.deepEqual(order, Array.from({ length: 24 }, (_, index) => index));
});

test("callback rejection is a bounded fault and terminates the owned child", async () => {
  const result = await run("wait", {
    onEvent: async () => { throw new Error("private callback detail"); },
    limits: { timeoutMs: 2000, killGraceMs: 50 },
  });
  assert.equal(result.fault, "callback_failed");
  assert.equal(result.spawned, true);
  await waitUntilGone(result.pid);
});

test("a hung onSpawn callback cannot defeat the total deadline or a full pipe", async () => {
  const started = Date.now();
  const result = await run("oversize-total", {
    fixtureArgs: ["100000"],
    onSpawn: () => new Promise(() => {}),
    limits: { timeoutMs: 120, killGraceMs: 50 },
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.spawned, true);
  assert.ok(Date.now() - started < 2000);
  await waitUntilGone(result.pid);
});

test("an early process exit never leaves an unhandled stdin error", async () => {
  const result = await run("exit-early", {
    fixtureArgs: ["7"],
    input: Buffer.alloc(1024 * 1024),
  });
  assert.equal(result.exitCode, 7);
  assert.equal(result.inputComplete, false);
  assert.ok(["input_failed", "input_incomplete"].includes(result.fault), result.fault);
});

test("a pre-aborted signal starts no process", async () => {
  const controller = new AbortController();
  controller.abort();
  let observedSpawn = false;
  const result = await run("wait", {
    signal: controller.signal,
    onSpawn: () => { observedSpawn = true; },
  });
  assert.equal(result.spawned, false);
  assert.equal(result.pid, null);
  assert.equal(result.cancelled, true);
  assert.equal(observedSpawn, false);
});

test("abort immediately after invocation cannot escape the pre-spawn race", async () => {
  const controller = new AbortController();
  const resultPromise = run("wait", {
    signal: controller.signal,
    limits: { timeoutMs: 2000, killGraceMs: 50 },
  });
  controller.abort();
  const result = await resultPromise;
  assert.equal(result.cancelled, true);
  if (result.spawned) await waitUntilGone(result.pid);
});

test("caller cancellation resolves only after the owned process closes", async () => {
  const controller = new AbortController();
  let announcedPid;
  const result = await run("wait", {
    signal: controller.signal,
    onEvent: event => {
      announcedPid = event.pid;
      controller.abort();
    },
    limits: { timeoutMs: 2000, killGraceMs: 50 },
  });
  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.pid, announcedPid);
  await waitUntilGone(announcedPid);
});

test("timeout escalates a ready TERM-resistant process group and removes its descendant", async () => {
  let ready;
  const result = await run("spawn-grandchild-ignore-term", {
    limits: { timeoutMs: 180, killGraceMs: 80 },
    onEvent: event => { ready = event; },
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, false);
  assert.equal(result.escalated, true);
  assert.equal(result.signal, "SIGKILL");
  assert.equal(ready.type, "ready", "the TERM handler and descendant existed before escalation");
  await Promise.all([waitUntilGone(ready.pid), waitUntilGone(ready.descendantPid)]);
});

test("the child receives only the explicit environment", async () => {
  let observed;
  const result = await run("env", {
    env: { CW_FIXTURE_VALUE: "present" },
    onEvent: event => { observed = event; },
  });
  assert.equal(result.fault, null);
  assert.deepEqual(observed, { type: "env", value: "present", ambient: null });
});

test("invalid limits and input are rejected before spawn", async () => {
  await assert.rejects(
    runLocalPiProcess({ executable: process.execPath, args: [], env: {}, limits: { timeoutMs: 0 } }),
    error => error.code === "invalid_arguments",
  );
  await assert.rejects(
    runLocalPiProcess({ executable: "node", args: [], env: {} }),
    error => error.code === "invalid_arguments",
  );
  const tooLarge = await run("echo", {
    input: Buffer.alloc(33),
    limits: { maxInputBytes: 32 },
  });
  assert.equal(tooLarge.spawned, false);
  assert.equal(tooLarge.fault, "input_too_large");
});

test("spawn failure is returned as a bounded transport fault", async () => {
  const result = await runLocalPiProcess({
    executable: path.join(cwd, "missing-local-pi-executable"),
    args: [],
    cwd,
    env: {},
    input: "",
  });
  assert.equal(result.spawned, false);
  assert.equal(result.fault, "spawn_failed");
  assert.equal(result.stderr, "");
});

