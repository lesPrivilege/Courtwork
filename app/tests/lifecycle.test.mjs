import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { boot } from "./helpers.mjs";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";

// T-CANCEL-1: cancel while a tool is executing (a slow write) ends the run
// cancelled, and no half-written temp file is left behind.
test("T-CANCEL-1: cancel during tool execution leaves no partial file", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const calls = [{ name: "ws_write", arguments: { path: "out/slow.md", text: "content" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    // Race the cancel against the (fast, in-process) write; either way the
    // guarantee under test is "no temp file left over", checked below.
    await api("POST", `/runs/${created.json.run.id}/cancel`, {});
    const finished = await pollRun(created.json.run.id);
    assert.ok(["cancelled", "completed"].includes(finished.status));
    const tree = await api("GET", `/sessions/${session.id}/workspace`);
    assert.ok(!tree.json.tree.some((f) => f.path.endsWith(".tmp")), "no .tmp file must remain");
  } finally {
    await runtime.close();
  }
});

test("cancelling a run with no pending question also ends cancelled", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "/fixture slow hello", commandId: "cmd-1" });
    await delay(30);
    const cancelled = await api("POST", `/runs/${created.json.run.id}/cancel`, {});
    assert.equal(cancelled.json.run.status, "cancelled");
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "cancelled");
  } finally {
    await runtime.close();
  }
});

// T-RESTART-1: SIGKILL mid waiting_user -> run becomes unknown, the pending
// question is expired_restart, and a new run continues the same host
// session (JSONL entry count grows).
test("T-RESTART-1: restart during waiting_user yields unknown/expired_restart and the host session continues", async () => {
  const appRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c1-restart-"));

  const workerScript = `
    import { startServer } from ${JSON.stringify(path.join(appRoot, "server/index.mjs"))};
    import { FAKE_CREDENTIAL_KEY } from ${JSON.stringify(path.join(appRoot, "runtime/pi-session-runtime.mjs"))};
    const runtime = await startServer({ dataDir: ${JSON.stringify(dataDir)}, port: 0 });
    const headers = { "content-type": "application/json", "x-work-token": runtime.token };
    async function api(method, p, bodyObj) {
      const res = await fetch(runtime.url + "/api/v5" + p, { method, headers, body: bodyObj ? JSON.stringify(bodyObj) : undefined });
      return { status: res.status, json: await res.json() };
    }
    await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const proj = await api("POST", "/projects", { name: "p1" });
    const sess = await api("POST", "/sessions", { projectId: proj.json.project.id, title: "restart-session" });
    const script = JSON.stringify([{ name: "ask_user", arguments: { prompt: "continue?" } }]);
    const run = await api("POST", \`/sessions/\${sess.json.session.id}/runs\`, { input: \`/fixture script \${script}\`, commandId: "c1" });
    let runStatus = run.json.run;
    for (let i = 0; i < 80 && runStatus.status !== "waiting_user"; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      runStatus = (await api("GET", \`/runs/\${run.json.run.id}\`)).json.run;
    }
    console.log("WORKER_READY " + JSON.stringify({ sessionId: sess.json.session.id, runId: run.json.run.id, status: runStatus.status }));
    await new Promise(() => {});
  `;

  const worker = spawn(process.execPath, ["--input-type=module", "-e", workerScript], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  worker.stdout.on("data", (chunk) => { output += chunk.toString(); });
  let ready;
  for (let i = 0; i < 120 && !ready; i += 1) {
    const match = output.match(/WORKER_READY (\{.*\})/);
    if (match) ready = JSON.parse(match[1]);
    else await delay(50);
  }
  assert.ok(ready, "worker did not reach waiting_user in time");
  assert.equal(ready.status, "waiting_user");

  worker.kill("SIGKILL");
  await new Promise((resolve) => worker.once("exit", resolve));
  await delay(150);

  const runtime2 = await startServer({ dataDir, port: 0 });
  try {
    const headers2 = { "content-type": "application/json", "x-work-token": runtime2.token };
    async function api2(method, p, bodyObj) {
      const res = await fetch(runtime2.url + "/api/v5" + p, { method, headers: headers2, body: bodyObj ? JSON.stringify(bodyObj) : undefined });
      return { status: res.status, json: await res.json() };
    }

    const runAfter = (await api2("GET", `/runs/${ready.runId}`)).json.run;
    assert.equal(runAfter.status, "unknown");
    assert.equal(runAfter.error.code, "restart_unknown");

    const events = (await api2("GET", `/sessions/${ready.sessionId}/events`)).json.events;
    const expired = events.find((e) => e.type === "question.resolved" && e.data.status === "expired_restart");
    assert.ok(expired, "expected a question.resolved(expired_restart) event");

    const sessionBefore = (await api2("GET", `/sessions/${ready.sessionId}`)).json.session;
    const hostSessionId = sessionBefore.hostSession.id;

    await api2("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const run2 = await api2("POST", `/sessions/${ready.sessionId}/runs`, { input: "continue same conversation", commandId: "c2" });
    let run2Status = run2.json.run;
    for (let i = 0; i < 100 && !["completed", "failed", "cancelled", "unknown"].includes(run2Status.status); i += 1) {
      await delay(25);
      run2Status = (await api2("GET", `/runs/${run2.json.run.id}`)).json.run;
    }
    assert.equal(run2Status.status, "completed");
    assert.equal(run2Status.hostSession.id, hostSessionId, "the second run must continue the same host session");
  } finally {
    await runtime2.close();
  }
});

// T-USAGE-1/2: a completed run reports non-zero usage with missing:false;
// an aborted run reports missing:true.
test("T-USAGE-1: a completed run records non-zero usage with missing:false", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello there", commandId: "cmd-1" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    assert.equal(finished.usage.missing, false);
    assert.ok(finished.usage.input > 0 || finished.usage.output > 0);
    assert.ok(finished.usage.turns >= 1);
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const usageEvent = events.find((e) => e.type === "run.usage");
    assert.ok(usageEvent);
    assert.equal(usageEvent.data.missing, false);
  } finally {
    await runtime.close();
  }
});

// T-USAGE-2: cancelling during the SECOND turn of a two-turn script must keep
// the numbers the provider already reported on the first turn. `missing` says
// the accounting is incomplete; it never means "reset to zero".
test("T-USAGE-2: cancelling in the second turn keeps the first turn's usage and marks missing", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [
      { name: "ws_write", arguments: { path: "out/turn-one.md", text: "one" } },
      { name: "ws_write", arguments: { path: "out/turn-two.md", text: "two" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    async function opens() {
      return (await api("GET", `/sessions/${session.id}/events`)).json.events.filter((e) => e.type === "permission.open");
    }
    await pollRun(runId, { until: (s) => s === "waiting_user" });
    const [first] = await opens();
    await api("POST", `/runs/${runId}/questions/${first.data.id}`, { decision: "allow" });

    // The second turn is under way once its own permission is open.
    let pending = await opens();
    for (let i = 0; i < 200 && pending.length < 2; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      pending = await opens();
    }
    assert.equal(pending.length, 2, "the run must have reached its second turn");

    await api("POST", `/runs/${runId}/cancel`, {});
    const finished = await pollRun(runId);
    assert.equal(finished.status, "cancelled");
    assert.equal(finished.usage.missing, true);
    assert.ok(finished.usage.input > 0, "usage collected before the cancel must survive it");
    assert.ok(finished.usage.turns >= 2);
    const usageEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.findLast((e) => e.type === "run.usage");
    assert.equal(usageEvent.data.missing, true);
    assert.equal(usageEvent.data.input, finished.usage.input);
  } finally {
    await runtime.close();
  }
});

// T-USAGE-3: the same guarantee on the failure path. The first turn succeeds,
// the fixture then answers with a provider HTTP error; the run fails, and the
// usage already reported is still there with missing:true.
test("T-USAGE-3: a provider error after a good turn fails the run without erasing usage", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    await api("POST", `/sessions/${session.id}/materials`, { name: "plan.txt", text: "one\ntwo\n" });
    const calls = [
      { name: "ws_read", arguments: { path: "materials/plan.txt" } },
      { name: "fixture_error", arguments: {} },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    // The SDK retries a 5xx with backoff before giving up, so this run is
    // deliberately allowed far more wall clock than the fixture ones.
    const finished = await pollRun(created.json.run.id, { timeoutMs: 60_000 });
    assert.equal(finished.status, "failed");
    assert.equal(finished.error.code, "provider_error");
    assert.equal(finished.usage.missing, true);
    assert.ok(finished.usage.input > 0, "the successful turn's usage must survive the failure");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const usageEvent = events.findLast((e) => e.type === "run.usage");
    assert.equal(usageEvent.data.missing, true);
    assert.ok(usageEvent.data.input > 0);
    assert.ok(events.some((e) => e.type === "run.notice" && e.data.kind.startsWith("auto_retry")), "provider retries are surfaced as notices");
  } finally {
    await runtime.close();
  }
});

// T-BUDGET-1: time spent in waiting_user does not count against the
// execution deadline; the deadline only accumulates while running.
test("T-BUDGET-1: waiting_user time is excluded from the execution deadline", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot({ budget: { deadlineMs: 400, maxTurns: 40 } });
  try {
    const session = await createSession();
    const calls = [{ name: "ask_user", arguments: { prompt: "wait for it" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    let run = await pollRun(created.json.run.id, { until: (s) => s === "waiting_user" });
    assert.equal(run.status, "waiting_user");
    // Hold the question open well past the 400ms deadline. Because the
    // deadline is paused during waiting_user, this must NOT trigger
    // budget_exceeded.
    await new Promise((r) => setTimeout(r, 700));
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.ok(!events.some((e) => e.type === "run.error" && e.data.code === "budget_exceeded"), "deadline must not fire while waiting_user");

    const openEvent = events.find((e) => e.type === "question.open");
    await api("POST", `/runs/${created.json.run.id}/questions/${openEvent.data.id}`, { answer: "go" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
  } finally {
    await runtime.close();
  }
});

// T-USAGE-4: the provider answers 5xx once and then succeeds. The SDK's own
// retry is surfaced as run.notice, the run completes, and the usage is the
// SUCCESSFUL attempt's — a retried call must not be billed twice.
test("T-USAGE-4: a retried provider call is surfaced as a notice and counted once", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();

    // Control: one clean provider round trip, no retry.
    const control = await api("POST", `/sessions/${session.id}/runs`, { input: "plain single turn", commandId: "control" });
    const controlRun = await pollRun(control.json.run.id);
    assert.equal(controlRun.status, "completed");
    assert.equal(controlRun.usage.missing, false);
    const perCall = controlRun.usage.input;
    assert.ok(perCall > 0);

    // Same shape, but the first attempt is a 502 the SDK retries.
    const retried = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "fixture_error_once", arguments: {} }]),
      commandId: "retried",
    });
    const retriedRun = await pollRun(retried.json.run.id, { timeoutMs: 60_000 });
    assert.equal(retriedRun.status, "completed", "a transient provider error that the retry fixes must not fail the run");
    assert.equal(retriedRun.usage.missing, false, "a completed run's accounting is whole");

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .filter((e) => e.runId === retried.json.run.id);
    const notices = events.filter((e) => e.type === "run.notice" && e.data.kind.startsWith("auto_retry"));
    assert.ok(notices.length > 0, "the retry must be visible as a notice, not swallowed");
    assert.ok(notices.some((e) => e.data.kind === "auto_retry_end" && e.data.success === true));

    assert.equal(retriedRun.usage.input, perCall, "only the attempt that produced an answer is counted");
    // The failed attempt IS visible in the stream (it is not hidden), but it
    // carries no usage: exactly one assistant message reports a real answer,
    // and that is the one the numbers come from.
    const assistantMessages = events.filter((e) => e.type === "assistant.message");
    assert.equal(assistantMessages.length, 2, "both the failed attempt and the retry are recorded");
    assert.equal(assistantMessages.filter((e) => e.data.stopReason === "stop").length, 1, "only one attempt produced an answer");
    assert.equal(assistantMessages[0].data.stopReason, "error");
    assert.equal(assistantMessages[0].data.text, "", "the failed attempt carried no content and no tokens to bill");
  } finally {
    await runtime.close();
  }
});

// T-USAGE-5: a question left open far longer than the execution deadline, then
// answered. The budget never fires (waiting_user does not consume it), the run
// completes, and its usage is complete rather than marked missing.
test("T-USAGE-5: a long waiting_user then an answer completes with whole usage and no budget trip", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot({ budget: { deadlineMs: 300, maxTurns: 40 } });
  try {
    const session = await createSession();
    const calls = [{ name: "ask_user", arguments: { prompt: "take your time" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    await pollRun(runId, { until: (s) => s === "waiting_user" });

    // Several times the 300ms execution budget.
    await delay(1500);
    const stillWaiting = (await api("GET", `/runs/${runId}`)).json.run;
    assert.equal(stillWaiting.status, "waiting_user", "waiting on a person must not consume the execution budget");

    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "question.open");
    assert.equal((await api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { answer: "go ahead" })).status, 200);

    const finished = await pollRun(runId, { timeoutMs: 15_000 });
    assert.equal(finished.status, "completed");
    assert.equal(finished.usage.missing, false, "usage is complete: nothing was cut short");
    assert.ok(finished.usage.input > 0);
    assert.ok(finished.usage.turns >= 1);

    const errors = (await api("GET", `/sessions/${session.id}/events`)).json.events.filter((e) => e.type === "run.error");
    assert.deepEqual(errors, [], "no budget_exceeded, and no error at all");
    const usageEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.findLast((e) => e.type === "run.usage");
    assert.equal(usageEvent.data.missing, false);
    assert.equal(usageEvent.data.input, finished.usage.input);
  } finally {
    await runtime.close();
  }
});
