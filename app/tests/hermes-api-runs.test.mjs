/* Hermes API-server `/v1/runs` · standalone adapter + bounded transport.
 *
 * Every case drives the production adapter and transport over real local
 * sockets against the loopback fixture built from the pinned source
 * (fixtures/hermes-api-runs-loopback.mjs). No Hermes process, provider or
 * credential; a synthetic bearer and a disposable data file per test. These
 * are observable behaviours at the wire and in the settlement, not checks of
 * copied constants. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHermesRunsTransport, HermesTransportError, HERMES_TRANSPORT_CEILINGS } from "../runtime/hermes-api-runs-transport.mjs";
import { createHermesRunsAdapter, HERMES_API_RUNS, HERMES_CAPABILITIES, HERMES_ADAPTER_CEILINGS, readStatus } from "../runtime/hermes-api-runs-adapter.mjs";
import { startHermesLoopback } from "./fixtures/hermes-api-runs-loopback.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let keyCount = 0;
const newKey = () => `cw-intent-${++keyCount}`;

async function harness({ scripts = {}, keepaliveMs = 0, limits = {}, adapterLimits = {}, bearer } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-hermes-runs-"));
  const fixture = await startHermesLoopback({ dataFile: path.join(dir, "runs.json"), scripts, keepaliveMs });
  const transport = createHermesRunsTransport({ endpoint: fixture.url, bearer: bearer === undefined ? fixture.bearer : bearer, limits });
  const adapter = createHermesRunsAdapter({ transport, limits: adapterLimits });
  const run = async (input) => {
    const admitted = await adapter.admit(adapter.admissionIntent({ input, idempotencyKey: newKey() }));
    return admitted.nativeRunId;
  };
  return {
    fixture, transport, adapter, run,
    async close() {
      adapter.dispose();
      await fixture.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
const calls = (fixture, call) => fixture.trace.filter((entry) => entry.call === call);

/* ── Identity and configuration ──────────────────────────────────────── */

test("the adapter describes its pinned source, endpoint and capability ceiling", async () => {
  const h = await harness();
  try {
    const described = h.adapter.describe();
    assert.equal(described.adapterId, "hermes-api-runs");
    assert.equal(described.source.revision, "d7b836ab1c0cddaafc109ed24c9a83b6191cdc88");
    assert.equal(described.revision, HERMES_API_RUNS.revision);
    assert.equal(described.endpointIdentity, h.fixture.url);
    for (const operation of ["steer", "approval", "submitToolResult", "compact", "replay"]) assert.equal(described.capabilities[operation].supported, false, operation);
    assert.ok(Object.isFrozen(HERMES_CAPABILITIES.start));
  } finally { await h.close(); }
});

test("the first transport accepts only an explicit loopback origin, and never echoes the bearer", async () => {
  for (const endpoint of [undefined, "", "https://127.0.0.1:8642", "http://10.0.0.2:8642", "http://example.com:8642", "http://127.0.0.1", "http://127.0.0.1:8642/v1", "http://user:pw@127.0.0.1:8642"]) {
    assert.throws(() => createHermesRunsTransport({ endpoint }), (error) => error instanceof HermesTransportError && error.code === "invalid_endpoint", String(endpoint));
  }
  assert.throws(() => createHermesRunsTransport({ endpoint: "http://127.0.0.1:1", bearer: "has space" }), /visible ASCII/);
  const h = await harness({ bearer: "wrong-secret-value" });
  try {
    await assert.rejects(h.run("hello"), (error) => {
      assert.equal(error.code, "admission_refused");
      assert.equal(error.delivery, "rejected");
      assert.equal(error.nativeCode, "gateway_auth_failed");
      assert.doesNotMatch(`${error.message} ${JSON.stringify(error)}`, /wrong-secret-value/);
      return true;
    });
    assert.equal(h.fixture.admissions(), 0);
  } finally { await h.close(); }
});

/* ── Admission and idempotency ───────────────────────────────────────── */

test("admission sends the exact bounded body with the Host's key, and returns a native run id, not completion", async () => {
  const h = await harness();
  try {
    const intent = h.adapter.admissionIntent({ input: "hello", idempotencyKey: "host-intent-1" });
    assert.deepEqual(intent.body, { input: "hello" });
    const admitted = await h.adapter.admit(intent);
    assert.match(admitted.nativeRunId, /^run_[0-9a-f]{32}$/);
    assert.deepEqual([admitted.nativeStatus, admitted.replayed, admitted.idempotencyKey], ["started", false, "host-intent-1"]);
    assert.deepEqual(calls(h.fixture, "createRun").map((entry) => [entry.key, entry.input, entry.sessionId]), [["host-intent-1", "hello", null]]);
    const status = await h.adapter.status(admitted.nativeRunId);
    assert.equal(status.nativeStatus, "queued");
    assert.equal(status.terminal, false);
  } finally { await h.close(); }
});

test("invalid input or key is refused locally, before anything is sent", async () => {
  const h = await harness();
  try {
    for (const bad of [{ input: "", idempotencyKey: "k" }, { input: "   ", idempotencyKey: "k" }, { input: 7, idempotencyKey: "k" },
      { input: "x", idempotencyKey: "" }, { input: "x", idempotencyKey: "has space" }, { input: "x", idempotencyKey: "k".repeat(256) }]) {
      assert.throws(() => h.adapter.admissionIntent(bad), /Input must be|idempotency key/);
    }
    await assert.rejects(h.adapter.admit({ idempotencyKey: "k", body: { input: "x" } }), (error) => error.code === "invalid_intent");
    assert.equal(h.fixture.trace.length, 0);
  } finally { await h.close(); }
});

test("the same intent replays the same run; a changed body under the same key conflicts and creates nothing", async () => {
  const h = await harness();
  try {
    const first = await h.adapter.admit(h.adapter.admissionIntent({ input: "same", idempotencyKey: "k-replay" }));
    const again = await h.adapter.admit(h.adapter.admissionIntent({ input: "same", idempotencyKey: "k-replay" }));
    assert.equal(again.nativeRunId, first.nativeRunId);
    assert.equal(again.replayed, true);
    await assert.rejects(h.adapter.admit(h.adapter.admissionIntent({ input: "different", idempotencyKey: "k-replay" })), (error) =>
      error.code === "idempotency_conflict" && error.delivery === "rejected");
    assert.equal(h.fixture.admissions(), 1);
  } finally { await h.close(); }
});

test("a lost admission answer is unresolved; recovering with the same intent finds the one run, and nothing makes a new key", async () => {
  const h = await harness();
  try {
    const intent = h.adapter.admissionIntent({ input: "lost", idempotencyKey: "k-lost" });
    h.fixture.loseNextAdmissionResponse();
    let unresolved;
    await assert.rejects(h.adapter.admit(intent), (error) => { unresolved = error; return error.code === "admission_unresolved" && error.delivery === "unresolved"; });
    assert.equal(unresolved.intent, intent, "the error hands back the exact intent to recover with");
    assert.equal(h.fixture.admissions(), 1, "the native side did admit it");
    const recovered = await h.adapter.admit(unresolved.intent);
    assert.equal(recovered.replayed, true);
    assert.equal(recovered.nativeRunId, calls(h.fixture, "createRun")[0].runId);
    assert.equal(h.fixture.admissions(), 1);
    assert.deepEqual([...new Set(calls(h.fixture, "createRun").map((entry) => entry.key))], ["k-lost"]);
  } finally { await h.close(); }
});

/* ── Streaming ───────────────────────────────────────────────────────── */

test("fragmented Unicode arrives whole: pinned ASCII escapes split across writes, and raw UTF-8 split inside a character", async () => {
  const text = ["héllo ", "😀 ", "中文", " \u{1F469}‍\u{1F4BB}"];
  const steps = [...text.map((delta) => ({ delta })), { terminal: "completed", fields: { output: text.join("") } }];
  const h = await harness({ scripts: { escaped: { steps, chunkBytes: 3 }, raw: { steps, chunkBytes: 1, rawUtf8: true } } });
  try {
    for (const input of ["escaped", "raw"]) {
      const settlement = await h.adapter.follow(await h.run(input));
      assert.equal(settlement.text, text.join(""), input);
      assert.equal(settlement.deltaCount, 4, input);
      assert.deepEqual([settlement.outcome, settlement.streamCoverage, settlement.diagnostics.length], ["completed", "complete", 0], input);
    }
  } finally { await h.close(); }
});

test("repeated equal deltas are separate text: nothing on the wire makes them duplicates", async () => {
  const h = await harness({ scripts: { repeat: { steps: [{ delta: "ha" }, { delta: "ha" }, { delta: "ha" }, { terminal: "completed", fields: { output: "hahaha" } }] } } });
  try {
    const seen = [];
    const settlement = await h.adapter.follow(await h.run("repeat"), { onObservation: (observation) => seen.push(observation.kind) });
    assert.deepEqual([settlement.text, settlement.deltaCount], ["hahaha", 3]);
    assert.deepEqual(seen, ["text.delta", "text.delta", "text.delta", "terminal"], "no run.started or message.complete is invented");
  } finally { await h.close(); }
});

test("terminal output is the native final response, kept apart from the text actually streamed", async () => {
  const h = await harness({ scripts: { final: { steps: [{ delta: "draft " }, { terminal: "completed", fields: { output: "The final answer." } }] } } });
  try {
    const settlement = await h.adapter.follow(await h.run("final"));
    assert.deepEqual([settlement.outcome, settlement.terminalSource, settlement.text, settlement.finalOutput], ["completed", "event", "draft ", "The final answer."]);
  } finally { await h.close(); }
});

test("a stream that ends without a terminal is a gap; the status decides only whether the run is known to have ended", async () => {
  const h = await harness({ scripts: {
    open: { steps: [{ delta: "part" }] },
    settled: { steps: [{ delta: "part" }, { statusOnly: "completed", fields: { output: "full text" } }] },
  } });
  try {
    const open = await h.adapter.follow(await h.run("open"));
    assert.deepEqual([open.outcome, open.nativeStatus, open.streamCoverage, open.text, open.finalOutput], ["unknown", "running", "gap", "part", null]);
    const settled = await h.adapter.follow(await h.run("settled"));
    assert.deepEqual([settled.outcome, settled.terminalSource, settled.streamCoverage, settled.text, settled.finalOutput],
      ["completed", "status", "gap", "part", "full text"], "missed text is not rebuilt from the status");
  } finally { await h.close(); }
});

test("malformed, foreign and unknown frames are bounded diagnostics; a foreign run's text never lands", async () => {
  const h = await harness({ scripts: { noisy: { steps: [
    { delta: "a" },
    { raw: "data: {not json\n\n" },
    { raw: `data: ${JSON.stringify({ event: "message.delta", delta: "no run id" })}\n\n` },
    { raw: `data: ${JSON.stringify({ event: "message.delta", run_id: "x", delta: "no timestamp" })}\n\n` },
    { wrongRun: true, delta: "FOREIGN" },
    { event: "message.delta", fields: { delta: 42 } },
    { event: "future.event", fields: { anything: true } },
    { delta: "b" },
    { terminal: "completed", fields: { output: "ab" } },
  ] } } });
  try {
    const settlement = await h.adapter.follow(await h.run("noisy"));
    assert.equal(settlement.text, "ab");
    assert.deepEqual(settlement.diagnostics.map((entry) => entry.reason), ["malformed_json", "malformed_envelope", "malformed_envelope", "wrong_run", "malformed_delta", "unknown_event"]);
    assert.equal(settlement.outcome, "completed");
    assert.equal(settlement.streamCoverage, "gap", "an unreadable frame may have carried content");
  } finally { await h.close(); }
});

test("status and terminal records must describe this run in the pinned shape", () => {
  const id = `run_${"a".repeat(32)}`;
  assert.equal(readStatus(null, id), null);
  assert.equal(readStatus({ run_id: "other", status: "completed" }, id), null);
  assert.equal(readStatus({ run_id: id, status: "finished" }, id), null);
  assert.equal(readStatus({ run_id: id, status: "completed", completed: true, partial: true }, id), null);
  assert.equal(readStatus({ run_id: id, status: "failed", completed: true }, id), null);
  assert.deepEqual(readStatus({ run_id: id, status: "running", session_id: "s1" }, id), { nativeRunId: id, nativeStatus: "running", terminal: false, nativeSessionId: "s1", output: null, error: null });
});

test("an approval or tool event is recorded, never answered or executed, and rules out a text-only success", async () => {
  const h = await harness({ scripts: { tools: { steps: [
    { delta: "Let me check." },
    { event: "tool.started", fields: { tool: "terminal", preview: "rm -rf /tmp/x" } },
    { event: "approval.request", fields: { command: "rm -rf /tmp/x", choices: ["once", "deny"] } },
    { terminal: "completed", fields: { output: "Done." } },
  ] } } });
  try {
    const settlement = await h.adapter.follow(await h.run("tools"));
    assert.equal(settlement.outcome, "unsupported_activity");
    assert.deepEqual(settlement.unsupported, ["tool.started", "approval.request"]);
    for (const [operation, args] of [["approve", ["run", "once"]], ["steer", ["run", "go"]], ["submitToolResult", ["run", {}]], ["compact", ["run"]], ["replay", ["run"]]])
      await assert.rejects(h.adapter[operation](...args), (error) => error.code === "unsupported", operation);
    assert.deepEqual(calls(h.fixture, "other"), [], "no approval, steer or other control request was sent");
  } finally { await h.close(); }
});

/* ── Cancellation, restart and recovery ──────────────────────────────── */

test("stop is an intent: only the matching terminal cancelled settles the run as cancelled", async () => {
  const h = await harness({ scripts: { long: { steps: [{ delta: "working" }, { waitForStop: true }] } } });
  try {
    const runId = await h.run("long");
    const following = h.adapter.follow(runId, { stopRequested: true });
    await sleep(50);
    assert.deepEqual(await h.adapter.stop(runId), { state: "stopping" });
    const settlement = await following;
    assert.deepEqual([settlement.outcome, settlement.terminalSource, settlement.nativeStatus, settlement.stopRequested], ["cancelled", "event", "cancelled", true]);
    assert.equal(calls(h.fixture, "stopRun").length, 1);
    assert.equal((await h.adapter.stop(runId)).state, "already_terminal", "a later stop reads the terminal status");
  } finally { await h.close(); }
});

test("a stop that is never confirmed stays unknown, and nothing sends a second stop or a new run", async () => {
  const h = await harness({ scripts: { stubborn: { steps: [{ delta: "working" }, { waitForStop: true }], ignoreStop: true } }, limits: { streamIdleMs: 300 } });
  try {
    const runId = await h.run("stubborn");
    const following = h.adapter.follow(runId, { stopRequested: true });
    await sleep(50);
    assert.equal((await h.adapter.stop(runId)).state, "stopping");
    const reconciled = await h.adapter.reconcile(runId);
    assert.deepEqual([reconciled.nativeStatus, reconciled.outcome], ["stopping", "unknown"]);
    const settlement = await following;
    assert.deepEqual([settlement.outcome, settlement.nativeStatus, settlement.streamError, settlement.streamCoverage], ["unknown", "stopping", "stream_idle", "gap"]);
    assert.deepEqual([calls(h.fixture, "stopRun").length, h.fixture.admissions()], [1, 1]);
  } finally { await h.close(); }
});

test("after an owner restart, status reports interrupted: unknown coverage, no text invented, and stop only reads that status", async () => {
  const h = await harness({ scripts: { crash: { steps: [{ delta: "before the crash" }, { hang: true }] } } });
  try {
    const runId = await h.run("crash");
    const following = h.adapter.follow(runId);
    await sleep(80);
    await h.fixture.restart();
    const settlement = await following;
    assert.deepEqual([settlement.outcome, settlement.nativeStatus, settlement.terminalSource, settlement.streamCoverage, settlement.text],
      ["unknown", "interrupted", "status", "gap", "before the crash"]);
    assert.equal(settlement.error, "The gateway restarted before this run settled.");
    const reconciled = await h.adapter.reconcile(runId);
    assert.deepEqual([reconciled.outcome, reconciled.evidence, reconciled.textRecovered, reconciled.activityKnown], ["unknown", "status_only", false, false]);
    assert.deepEqual(await h.adapter.stop(runId), { state: "already_terminal", status: await h.adapter.status(runId) });
    assert.equal(h.fixture.admissions(), 1);
  } finally { await h.close(); }
});

test("a stop for a run this gateway process does not drive is refused as not active, with no effect", async () => {
  const h = await harness({ scripts: { idle: { steps: [{ hang: true }] } } });
  try {
    const runId = await h.run("idle");
    h.fixture.forgetLive(runId);
    assert.deepEqual(await h.adapter.stop(runId), { state: "not_active" });
    assert.equal(h.fixture.status(runId).status, "queued");
  } finally { await h.close(); }
});

test("the stream has one subscriber; a second follow finds no stream and does not claim replay", async () => {
  const h = await harness({ scripts: { once: { steps: [{ delta: "only once" }, { terminal: "completed", fields: { output: "only once" } }] } } });
  try {
    const runId = await h.run("once");
    const first = await h.adapter.follow(runId);
    const second = await h.adapter.follow(runId);
    assert.deepEqual([first.streamCoverage, first.text], ["complete", "only once"]);
    assert.deepEqual([second.streamCoverage, second.streamError, second.text, second.outcome, second.terminalSource, second.finalOutput],
      ["unavailable", "stream_unavailable", "", "completed", "status", "only once"]);
  } finally { await h.close(); }
});

test("continuation uses only a native session id observed in a validated status, never a guess", async () => {
  const h = await harness();
  try {
    const firstId = await h.run("hello");
    await h.adapter.follow(firstId);
    const observed = await h.adapter.status(firstId);
    assert.equal(observed.nativeSessionId, firstId, "the pinned server falls back to the run id as the session");
    const intent = h.adapter.continuationIntent({ input: "and then?", idempotencyKey: newKey(), from: observed });
    await h.adapter.admit(intent);
    assert.equal(calls(h.fixture, "createRun").at(-1).sessionId, firstId);
    for (const from of [undefined, {}, { nativeRunId: firstId, nativeSessionId: "guessed" }, Object.freeze({ nativeRunId: firstId, nativeSessionId: null })])
      assert.throws(() => h.adapter.continuationIntent({ input: "x", idempotencyKey: newKey(), from }), (error) => error.code === "session_unknown");
  } finally { await h.close(); }
});

/* ── Bounds and cleanup ──────────────────────────────────────────────── */

test("byte, frame, idle and text limits end the stream as a bounded gap", async () => {
  const big = "x".repeat(5000);
  const h = await harness({
    scripts: {
      stream: { steps: Array.from({ length: 20 }, () => ({ delta: big })).concat([{ terminal: "completed" }]) },
      frame: { steps: [{ delta: "y".repeat(20000) }, { terminal: "completed" }] },
      quiet: { steps: [{ hang: true }] },
      text: { steps: [{ delta: "abcdef" }, { delta: "ghij" }, { terminal: "completed", fields: { output: "abcdefghij" } }] },
    },
    limits: { maxStreamBytes: 50_000, maxFrameBytes: 16_000, streamIdleMs: 200 },
    adapterLimits: { maxTextChars: 8 },
  });
  try {
    const stream = await h.adapter.follow(await h.run("stream"));
    // The native run finished before the limit cut the stream: the status says
    // so, but the streamed text stays the partial text actually received.
    assert.deepEqual([stream.streamError, stream.streamCoverage, stream.outcome, stream.terminalSource], ["stream_too_large", "gap", "completed", "status"]);
    assert.ok(stream.text.length < 20 * 5000);
    const frame = await h.adapter.follow(await h.run("frame"));
    assert.equal(frame.streamError, "frame_too_large");
    const quiet = await h.adapter.follow(await h.run("quiet"));
    assert.deepEqual([quiet.streamError, quiet.outcome], ["stream_idle", "unknown"]);
    const text = await h.adapter.follow(await h.run("text"));
    assert.deepEqual([text.text, text.textBounded, text.deltaCount, text.outcome, text.finalOutput], ["abcdefgh", true, 2, "completed", "abcdefghij"]);
    assert.equal(h.transport.openConnections(), 0, "every stream connection was released");
  } finally { await h.close(); }
});

test("keepalive comments hold an idle stream open and are not events", async () => {
  const h = await harness({ scripts: { slow: { steps: [{ delta: "a" }, { pause: 450 }, { delta: "b" }, { terminal: "completed", fields: { output: "ab" } }] } }, keepaliveMs: 100, limits: { streamIdleMs: 250 } });
  try {
    const settlement = await h.adapter.follow(await h.run("slow"));
    assert.deepEqual([settlement.text, settlement.outcome, settlement.streamCoverage], ["ab", "completed", "complete"]);
    assert.ok(settlement.keepalives >= 2);
    assert.equal(settlement.diagnostics.length, 0);
  } finally { await h.close(); }
});

test("dispose closes only this transport's connections: no stop, no delete, and the native run is left as it was", async () => {
  const h = await harness({ scripts: { held: { steps: [{ delta: "running" }, { hang: true }] } } });
  try {
    const runId = await h.run("held");
    const following = h.adapter.follow(runId);
    await sleep(80);
    assert.equal(h.transport.openConnections(), 1);
    assert.equal(h.adapter.dispose(), 1);
    const settlement = await following;
    assert.equal(settlement.outcome, "unknown");
    await sleep(50);
    assert.equal(h.fixture.openSockets(), 0, "the server sees no connection left open");
    assert.deepEqual(calls(h.fixture, "stopRun"), []);
    assert.deepEqual(calls(h.fixture, "other"), []);
    assert.equal(h.fixture.status(runId).status, "running", "disposal is not cancellation");
    await assert.rejects(h.adapter.status(runId), (error) => error.code === "disposed");
    assert.equal(h.adapter.dispose(), 0);
  } finally { await h.close(); }
});

/* ── HPR-R1 · intent and continuation provenance ─────────────────────── */

/* A transport that records every call and never touches the network. */
function recordingTransport(endpointIdentity, calls) {
  return {
    endpointIdentity,
    async createRun(request) { calls.push({ endpointIdentity, call: "createRun", ...request }); return { status: 202, json: { run_id: "run_new", status: "started", replayed: false } }; },
    async getRun(runId) { calls.push({ endpointIdentity, call: "getRun", runId }); return { status: 200, json: { run_id: runId, status: "completed", completed: true, session_id: `session-at-${endpointIdentity.slice(-4)}`, output: "ok" } }; },
    async stopRun() { calls.push({ call: "stopRun" }); return { status: 200, json: {} }; },
    async *events() {},
    close() { return 0; },
  };
}

test("HPR-R1 · a status observed through another adapter or endpoint cannot start a continuation", async () => {
  const calls = [];
  const a = createHermesRunsAdapter({ transport: recordingTransport("http://127.0.0.1:1111", calls) });
  const b = createHermesRunsAdapter({ transport: recordingTransport("http://127.0.0.1:2222", calls) });
  const fromA = await a.status("run_a");
  assert.throws(() => b.continuationIntent({ input: "continue", idempotencyKey: "key-b", from: fromA }), (error) => error.code === "session_unknown");
  // A same-endpoint adapter is still another adapter: it did not observe that record.
  const a2 = createHermesRunsAdapter({ transport: recordingTransport("http://127.0.0.1:1111", calls) });
  assert.throws(() => a2.continuationIntent({ input: "continue", idempotencyKey: "key-a2", from: fromA }), (error) => error.code === "session_unknown");
  // A copied or forged record, frozen or not, is not an observation.
  for (const from of [Object.freeze({ ...fromA }), Object.freeze({ nativeRunId: "run_a", nativeSessionId: "session-at-1111", terminal: true })])
    assert.throws(() => a.continuationIntent({ input: "continue", idempotencyKey: "key-a", from }), (error) => error.code === "session_unknown");
  assert.deepEqual(calls.filter((entry) => entry.call === "createRun"), [], "nothing was sent");
  // The legitimate path still works: the record A itself observed.
  await a.admit(a.continuationIntent({ input: "continue", idempotencyKey: "key-a", from: fromA }));
  assert.deepEqual(calls.filter((entry) => entry.call === "createRun").map((entry) => [entry.endpointIdentity, entry.body]), [["http://127.0.0.1:1111", { input: "continue", session_id: "session-at-1111" }]]);
});

test("HPR-R1 · admit sends only an intent this adapter issued, with its exact validated body", async () => {
  const calls = [];
  const a = createHermesRunsAdapter({ transport: recordingTransport("http://127.0.0.1:1111", calls) });
  const b = createHermesRunsAdapter({ transport: recordingTransport("http://127.0.0.1:2222", calls) });
  const issuedByA = a.admissionIntent({ input: "x", idempotencyKey: "key-1" });
  const forged = [
    Object.freeze({ idempotencyKey: "forged", body: { input: "x", session_id: "arbitrary", toolsets: ["all"] } }),
    Object.freeze({ idempotencyKey: "forged", body: Object.freeze({ input: "x" }) }),
    Object.freeze({ ...issuedByA }),
    Object.freeze({ ...issuedByA, body: Object.freeze({ ...issuedByA.body, toolsets: ["all"] }) }),
  ];
  for (const intent of forged) await assert.rejects(a.admit(intent), (error) => error.code === "invalid_intent" && error.delivery === "not_sent");
  await assert.rejects(b.admit(issuedByA), (error) => error.code === "invalid_intent", "an intent issued for another endpoint is refused");
  assert.throws(() => { issuedByA.body.session_id = "altered"; }, TypeError, "an issued body cannot be altered");
  assert.deepEqual(calls, [], "nothing was sent");
  assert.equal((await a.admit(issuedByA)).nativeRunId, "run_new");
  assert.deepEqual(calls.map((entry) => [entry.endpointIdentity, entry.idempotencyKey, entry.body]), [["http://127.0.0.1:1111", "key-1", { input: "x" }]]);
});

test("HPR-R1 · after the adapter is re-created, recovery rebuilds the same intent from the Host's key and input; nothing is substituted", async () => {
  const h = await harness();
  try {
    h.fixture.loseNextAdmissionResponse();
    const lost = h.adapter.admissionIntent({ input: "survive a restart", idempotencyKey: "k-restart" });
    await assert.rejects(h.adapter.admit(lost), (error) => error.code === "admission_unresolved");
    h.adapter.dispose();
    // The Host kept (key, input) with its own intent record; a new adapter
    // cannot admit the old object, but the same key and body replay the one run.
    const again = createHermesRunsAdapter({ transport: createHermesRunsTransport({ endpoint: h.fixture.url, bearer: h.fixture.bearer }) });
    try {
      await assert.rejects(again.admit(lost), (error) => error.code === "invalid_intent");
      const recovered = await again.admit(again.admissionIntent({ input: "survive a restart", idempotencyKey: "k-restart" }));
      assert.deepEqual([recovered.replayed, h.fixture.admissions()], [true, 1]);
      // A continuation re-reads the earlier run through the new adapter first.
      const observed = await again.status(recovered.nativeRunId);
      await again.admit(again.continuationIntent({ input: "next", idempotencyKey: "k-next", from: observed }));
      assert.equal(calls(h.fixture, "createRun").at(-1).sessionId, recovered.nativeRunId);
    } finally { again.dispose(); }
  } finally { await h.close(); }
});

/* ── HPR-R2 · configuration and limits ───────────────────────────────── */

test("HPR-R2 · invalid limits and unknown configuration are refused before any request", async () => {
  const h = await harness();
  try {
    const endpoint = h.fixture.url;
    const badTransport = [
      { maxFrameBytes: Number.NaN }, { maxStreamBytes: Number.POSITIVE_INFINITY }, { streamIdleMs: -1 }, { requestTimeoutMs: 0 },
      { maxJsonBytes: 1.5 }, { maxFrameBytes: "1024" }, { maxStreamBytes: 2 ** 40 }, { streamIdleMs: 3_600_000 }, { retries: 3 },
      { maxFrameBytes: 4096, maxStreamBytes: 1024 },
    ];
    for (const limits of badTransport)
      assert.throws(() => createHermesRunsTransport({ endpoint, bearer: h.fixture.bearer, limits }), (error) => error instanceof HermesTransportError && error.code === "invalid_configuration" && error.delivery === "not_sent", JSON.stringify(limits));
    for (const options of [{ endpoint, limits: null }, { endpoint, limits: [] }, { endpoint, extra: true }])
      assert.throws(() => createHermesRunsTransport(options), (error) => error.code === "invalid_configuration", JSON.stringify(options));
    const badAdapter = [
      { maxDiagnostics: Number.NaN }, { maxTextChars: Number.POSITIVE_INFINITY }, { maxInputChars: -5 }, { maxErrorChars: 0 },
      { maxTextChars: 2 ** 40 }, { maxDiagnostics: 2.5 }, { anything: 1 },
    ];
    for (const limits of badAdapter)
      assert.throws(() => createHermesRunsAdapter({ transport: h.transport, limits }), (error) => error.code === "invalid_configuration", JSON.stringify(limits));
    for (const options of [{ transport: h.transport, extra: 1 }, { transport: { createRun() {} } }, { transport: { ...h.transport, endpointIdentity: 42 } }])
      assert.throws(() => createHermesRunsAdapter(options), (error) => error.code === "invalid_configuration");
    assert.equal(h.fixture.trace.length, 0, "no request was made");
  } finally { await h.close(); }
});

test("HPR-R2 · valid smaller limits and the documented ceilings are accepted and enforced", async () => {
  const h = await harness({
    scripts: { big: { steps: [{ delta: "z".repeat(3000) }, { terminal: "completed", fields: { output: "done" } }] } },
    limits: { maxFrameBytes: 1024, maxStreamBytes: 1024 * 1024, streamIdleMs: 1000, requestTimeoutMs: 2000, maxJsonBytes: 4096 },
    adapterLimits: { maxTextChars: 10, maxDiagnostics: 1 },
  });
  try {
    const settlement = await h.adapter.follow(await h.run("big"));
    assert.equal(settlement.streamError, "frame_too_large", "the smaller frame limit is enforced on a real stream");
    assert.doesNotThrow(() => createHermesRunsTransport({ endpoint: h.fixture.url, limits: { ...HERMES_TRANSPORT_CEILINGS } }));
    assert.doesNotThrow(() => createHermesRunsAdapter({ transport: h.transport, limits: { ...HERMES_ADAPTER_CEILINGS } }));
  } finally { await h.close(); }
});
