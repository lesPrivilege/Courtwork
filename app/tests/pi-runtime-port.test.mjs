import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { boot } from "./helpers.mjs";
import { PI_RUNTIME_ADAPTER_ID, RuntimePortError, createPiRuntimePort } from "../runtime/pi-runtime-port.mjs";

// P03-B. Every case drives the production RuntimeService through HTTP with
// the production Pi port underneath. `observe` only wraps that port to count
// what the Host asks of it and to keep hold of the observation sink; it never
// replaces Pi's behaviour.
function observe(service, { capabilities } = {}) {
  const real = service.runtimePort;
  const seen = { opened: [], compacted: 0, sinks: [] };
  service.runtimePort = {
    ...real,
    describe: () => ({ ...real.describe(), capabilities: { ...real.describe().capabilities, ...capabilities } }),
    openSession(input) {
      seen.opened.push(structuredClone(input));
      const native = real.openSession(input);
      return { ...native, start(options) { seen.sinks.push(options.onObservation); return native.start(options); } };
    },
    compact(input) { seen.compacted += 1; return real.compact(input); },
  };
  return seen;
}

const events = async (api, sessionId) => (await api("GET", `/sessions/${sessionId}/events`)).json.events;

test("the production Host runs Pi through the port and continues one native session", async () => {
  const { runtime, api, createSession, pollRun, dataDir } = await boot();
  try {
    assert.equal(runtime.service.runtimePort.id, PI_RUNTIME_ADAPTER_ID);
    assert.equal(PI_RUNTIME_ADAPTER_ID, "pi-coding-agent@0.85.1/agent-session", "recorded adapter identity keeps its meaning");
    const seen = observe(runtime.service);
    const session = await createSession();

    const first = await api("POST", `/sessions/${session.id}/runs`, { input: "first", commandId: "cmd-1" });
    const firstRun = await pollRun(first.json.run.id);
    assert.equal(firstRun.status, "completed");
    assert.equal(firstRun.adapterId, PI_RUNTIME_ADAPTER_ID);
    assert.equal(path.dirname(firstRun.hostSession.path), path.join(dataDir, "pi-sessions", session.id), "the journal stays where earlier versions put it");

    const second = await api("POST", `/sessions/${session.id}/runs`, { input: "second", commandId: "cmd-2" });
    const secondRun = await pollRun(second.json.run.id);
    assert.equal(secondRun.status, "completed");
    assert.deepEqual(secondRun.hostSession, firstRun.hostSession, "a later Run continues the same native session");

    assert.equal(seen.opened.length, 2);
    assert.equal(seen.opened[0].nativeRef, null, "the first Run creates the journal");
    assert.deepEqual(seen.opened[1].nativeRef, firstRun.hostSession, "the second Run reopens it by the stored reference");
    assert.deepEqual(await readdir(path.join(dataDir, "pi-sessions", session.id)), [path.basename(firstRun.hostSession.path)]);
    const journal = (await readFile(firstRun.hostSession.path, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(journal.filter(entry => entry.type === "message" && entry.message.role === "user")
      .map(entry => entry.message.content.map(part => part.text).join("")), ["first", "second"]);
  } finally {
    await runtime.close();
  }
});

test("a journal written before the port existed is opened in place and continued", async () => {
  const { runtime, api, createSession, pollRun, dataDir } = await boot();
  try {
    const session = await createSession();
    // Exactly what service.mjs did before the extraction.
    const manager = SessionManager.create(session.workspaceDir, path.join(dataDir, "pi-sessions", session.id));
    manager.appendMessage({ role: "user", content: [{ type: "text", text: "EARLIER_TURN" }], timestamp: Date.now() });
    // Pi writes a journal to disk once it holds an assistant message.
    manager.appendMessage({ role: "assistant", content: [{ type: "text", text: "EARLIER_ANSWER" }], api: "openai-completions",
      provider: "fake-openai-loopback", model: "fake-model", stopReason: "stop", timestamp: Date.now(),
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } });
    const locator = { id: manager.getSessionId(), path: manager.getSessionFile() };
    await runtime.store.setHostSession(session.id, locator);
    const before = await readFile(locator.path, "utf8");

    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "continue", commandId: "cmd-1" });
    const run = await pollRun(created.json.run.id);
    assert.equal(run.status, "completed");
    assert.deepEqual(run.hostSession, locator);
    assert.deepEqual(runtime.store.getSession(session.id).hostSession, locator);
    const after = await readFile(locator.path, "utf8");
    assert.ok(after.startsWith(before), "earlier entries are appended to, never rewritten");
    assert.ok(after.includes("EARLIER_TURN") && after.length > before.length);
  } finally {
    await runtime.close();
  }
});

test("retrying a command never opens a second native session", async () => {
  const { runtime, api, createSession, pollRun, dataDir } = await boot();
  try {
    const seen = observe(runtime.service);
    const session = await createSession();
    const body = { input: "/fixture slow once", commandId: "cmd-retry" };
    const replies = await Promise.all([1, 2, 3].map(() => api("POST", `/sessions/${session.id}/runs`, body)));
    const runIds = new Set(replies.map(reply => reply.json.run.id));
    assert.equal(runIds.size, 1, "every retry answers with the same Run");
    const [runId] = runIds;
    await delay(50);
    await api("POST", `/runs/${runId}/cancel`, {});
    await pollRun(runId);
    const late = await api("POST", `/sessions/${session.id}/runs`, body);
    assert.equal(late.json.run.id, runId, "a retry after settlement is a receipt, not new work");

    assert.equal(seen.opened.length, 1);
    assert.equal(seen.sinks.length, 1);
    assert.equal((await readdir(path.join(dataDir, "pi-sessions", session.id))).length, 1);
  } finally {
    await runtime.close();
  }
});

test("observations that arrive after cancellation are not recorded", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const seen = observe(runtime.service);
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "/fixture slow waiting on the model", commandId: "cmd-1" });
    const runId = created.json.run.id;
    await delay(80);
    const cancelled = await api("POST", `/runs/${runId}/cancel`, {});
    assert.equal(cancelled.json.run.status, "cancelled");
    const settled = await events(api, session.id);

    assert.equal(seen.sinks.length, 1, "the Run had reached the runtime before it was cancelled");
    const [sink] = seen.sinks;
    await sink({ type: "assistant.message", data: { text: "LATE_ANSWER", stopReason: "stop" } });
    await sink({ type: "tool.start", data: { callId: "late-call", name: "ws_write" } });
    await sink({ type: "tool.result", data: { callId: "late-call", name: "ws_write", text: "LATE_EFFECT", isError: false } });

    assert.deepEqual(await events(api, session.id), settled, "the transcript is closed with the Run");
    assert.equal((await pollRun(runId)).status, "cancelled");
  } finally {
    await runtime.close();
  }
});

test("an operation the runtime does not support is refused, not rerouted", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const first = await api("POST", `/sessions/${session.id}/runs`, { input: "history", commandId: "cmd-1" });
    assert.equal((await pollRun(first.json.run.id)).status, "completed");

    const real = runtime.service.runtimePort;
    assert.throws(() => real.recover(), (error) => error instanceof RuntimePortError && error.code === "runtime_capability_unsupported" && error.operation === "recover");
    assert.throws(() => real.submitToolResult(), { code: "runtime_capability_unsupported" });
    assert.deepEqual(Object.entries(real.describe().capabilities).filter(([, row]) => !row.supported).map(([name]) => name), ["recover", "submitToolResult"]);
    assert.deepEqual(Object.keys(real.describe().capabilities), ["start", "continue", "steer", "cancel", "compact", "recover", "submitToolResult"]);
    assert.ok(Object.values(real.describe().capabilities).every(row => row.supported || row.reason), "a missing capability says why");

    const unsupported = { supported: false, reason: "fixture runtime" };
    const seen = observe(runtime.service, { capabilities: { compact: unsupported, continue: unsupported } });
    const compaction = await api("POST", `/sessions/${session.id}/compactions`, { requestId: "req-1" });
    assert.equal(compaction.status, 409);
    assert.equal(compaction.json.error.code, "runtime_capability_unsupported");
    const next = await api("POST", `/sessions/${session.id}/runs`, { input: "again", commandId: "cmd-2" });
    assert.equal(next.status, 409);
    assert.equal(next.json.error.code, "runtime_capability_unsupported");

    assert.deepEqual(seen, { opened: [], compacted: 0, sinks: [] }, "a refused operation never reaches the runtime");
    assert.equal(runtime.store.listRuns().filter(run => run.sessionId === session.id).length, 1, "no Run is admitted for it");
    assert.deepEqual(runtime.store.listOperations(session.id), []);
  } finally {
    await runtime.close();
  }
});

test("the port refuses to exist without its journal root or Pi's model runtime", () => {
  assert.throws(() => createPiRuntimePort({ modelRuntime: {} }), TypeError);
  assert.throws(() => createPiRuntimePort({ dataDir: "/nonexistent" }), TypeError);
});
