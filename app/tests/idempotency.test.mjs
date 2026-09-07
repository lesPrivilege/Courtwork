import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { boot } from "./helpers.mjs";

// T-IDEM-1: same commandId + same input -> same Run (200, same id).
test("T-IDEM-1: replaying the same commandId with the same input returns the same run", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const first = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "same-id" });
    assert.equal(first.status, 200);
    await pollRun(first.json.run.id);
    const replay = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "same-id" });
    assert.equal(replay.status, 200);
    assert.equal(replay.json.run.id, first.json.run.id);
  } finally {
    await runtime.close();
  }
});

// T-IDEM-2: same commandId + different input -> 409 command_conflict.
test("T-IDEM-2: replaying the same commandId with a different input is 409 command_conflict", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "same-id" });
    const conflict = await api("POST", `/sessions/${session.id}/runs`, { input: "different", commandId: "same-id" });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.json.error.code, "command_conflict");
  } finally {
    await runtime.close();
  }
});

// T-IDEM-3: two concurrent requests with the same commandId produce exactly
// one Run. The uniqueness check runs inside the store's serialized _mutate
// queue, so concurrent HTTP requests racing on the same commandId still
// observe each other in order.
test("T-IDEM-3: two concurrent creates with the same commandId produce exactly one run", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    const [a, b] = await Promise.all([
      api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "race-id" }),
      api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "race-id" }),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(a.json.run.id, b.json.run.id);
    const runs = (await api("GET", `/sessions/${session.id}`)).json.runs;
    const matching = runs.filter((r) => r.commandId === "race-id");
    assert.equal(matching.length, 1);
  } finally {
    await runtime.close();
  }
});

// T-IDEM-4: the client loses the HTTP response after the run has already been
// admitted, and resends with the same commandId. It must get the SAME run
// back, and the command must have been executed exactly once — which the
// host's own JSONL, not the app store, is the source of truth for.
test("T-IDEM-4: a lost response then a resend returns the same run and executes once", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const input = "count me exactly once";

    // Send the request and drop the connection before reading the response,
    // after the server has admitted the run.
    const controller = new AbortController();
    const inFlight = fetch(`${runtime.url}/api/v5/sessions/${session.id}/runs`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-work-token": runtime.token },
      body: JSON.stringify({ input, commandId: "lost-receipt" }),
      signal: controller.signal,
    }).catch((error) => ({ aborted: true, error }));

    let admitted = null;
    for (let i = 0; i < 400 && !admitted; i += 1) {
      const runs = (await api("GET", `/sessions/${session.id}`)).json.runs;
      admitted = runs.find((run) => run.commandId === "lost-receipt") ?? null;
      if (!admitted) await delay(10);
    }
    assert.ok(admitted, "the run must be admitted before the receipt is lost");
    controller.abort();
    await inFlight;

    const resend = await api("POST", `/sessions/${session.id}/runs`, { input, commandId: "lost-receipt" });
    assert.equal(resend.status, 200);
    assert.equal(resend.json.run.id, admitted.id, "the resend must resolve to the original run");

    const finished = await pollRun(admitted.id, { timeoutMs: 15_000 });
    assert.ok(["completed", "failed", "cancelled", "unknown"].includes(finished.status));
    const runs = (await api("GET", `/sessions/${session.id}`)).json.runs;
    assert.equal(runs.length, 1, "a lost receipt must not produce a second run");

    // The host JSONL is the journal of what the model was actually asked.
    const hostPath = (await api("GET", `/sessions/${session.id}`)).json.session.hostSession.path;
    const lines = (await readFile(hostPath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const userPrompts = lines.filter((entry) => entry.type === "message" && entry.message?.role === "user");
    assert.equal(userPrompts.length, 1, "the command must have been sent to the model exactly once");
  } finally {
    await runtime.close();
  }
});

// T-IDEM-6: the idempotency key is (sessionId, commandId). The same commandId
// in a different session is a different command, not a replay.
test("T-IDEM-6: the same commandId in another session is a different command", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const first = await createSession({ title: "session one" });
    const second = await createSession({ title: "session two" });

    const a = await api("POST", `/sessions/${first.id}/runs`, { input: "shared text", commandId: "same-key" });
    assert.equal(a.status, 200);
    await pollRun(a.json.run.id);
    const b = await api("POST", `/sessions/${second.id}/runs`, { input: "shared text", commandId: "same-key" });
    assert.equal(b.status, 200, "a commandId from another session must not collide");
    assert.notEqual(b.json.run.id, a.json.run.id);
    await pollRun(b.json.run.id);

    // And a DIFFERENT input under that key in the second session still
    // conflicts within its own session, so the key is per-session, not global.
    const conflict = await api("POST", `/sessions/${second.id}/runs`, { input: "other text", commandId: "same-key" });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.json.error.code, "command_conflict");
    assert.equal(a.json.run.sessionId, first.id);
    assert.equal(b.json.run.sessionId, second.id);
  } finally {
    await runtime.close();
  }
});

// C4: replay is a receipt read even after the execution extension is unloaded.
test('C4: unloaded extension preserves old receipts but still blocks new work', async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    assert.equal((await api('POST', '/extensions/evidence-memo/lifecycle', { action: 'load' })).status, 200);
    const session = await createSession();
    assert.equal((await api('POST', `/sessions/${session.id}/extension`, {
      extensionId: 'evidence-memo', input: { title: 'Receipt continuity', sourceText: 'Only synthetic source.' },
    })).status, 200);
    const original = { input: 'hello', commandId: 'receipt-after-unload' };
    const first = await api('POST', `/sessions/${session.id}/runs`, original);
    assert.equal(first.status, 200);
    await pollRun(first.json.run.id);
    assert.equal((await api('POST', '/extensions/evidence-memo/lifecycle', { action: 'unload' })).status, 200);
    const before = (await api('GET', `/sessions/${session.id}`)).json;
    const replay = await api('POST', `/sessions/${session.id}/runs`, original);
    assert.equal(replay.status, 200);
    assert.equal(replay.json.run.id, first.json.run.id);
    const conflict = await api('POST', `/sessions/${session.id}/runs`, { ...original, input: 'different' });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.json.error.code, 'command_conflict');
    const fresh = await api('POST', `/sessions/${session.id}/runs`, { ...original, commandId: 'new-after-unload' });
    assert.equal(fresh.status, 409);
    assert.equal(fresh.json.error.code, 'extension_unloaded');
    const after = (await api('GET', `/sessions/${session.id}`)).json;
    assert.deepEqual(after, before, 'receipt/conflict/rejected new work must not mutate snapshot');
  } finally { await runtime.close(); }
});
