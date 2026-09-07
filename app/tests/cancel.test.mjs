import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { boot } from "./helpers.mjs";

const TERMINAL = ["completed", "failed", "cancelled", "unknown"];

async function waitForStatus(pollRun, runId, status) {
  return pollRun(runId, { until: (s) => s === status || TERMINAL.includes(s) });
}

async function statusEvents(api, sessionId) {
  return (await api("GET", `/sessions/${sessionId}/events`)).json.events
    .filter((e) => e.type === "run.status")
    .map((e) => e.data.status);
}

// T-CANCEL-2: cancel while the run is genuinely waiting on the model (the
// fixture holds back the first token). The run passes through stopping to
// cancelled, and no assistant message is fabricated as a completed answer.
test("T-CANCEL-2: cancelling while waiting for the first token yields stopping then cancelled", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "/fixture slow waiting on the model", commandId: "cmd-1" });
    const runId = created.json.run.id;
    await delay(80);

    // Cancel and poll concurrently: the cancel response only returns after
    // the run settles, so `stopping` is only observable from another reader.
    const cancelling = api("POST", `/runs/${runId}/cancel`, {});
    let sawStopping = false;
    for (let i = 0; i < 200 && !sawStopping; i += 1) {
      const run = (await api("GET", `/runs/${runId}`)).json.run;
      if (run.status === "stopping") sawStopping = true;
      if (TERMINAL.includes(run.status)) break;
      await delay(5);
    }
    const cancelled = await cancelling;
    assert.equal(cancelled.json.run.status, "cancelled");
    const finished = await pollRun(runId);
    assert.equal(finished.status, "cancelled");

    const statuses = await statusEvents(api, session.id);
    assert.ok(sawStopping || statuses.includes("stopping"), "stopping must be a real, observable state, not skipped");
    assert.ok(statuses.indexOf("stopping") < statuses.lastIndexOf("cancelled"), "stopping precedes cancelled");

    const assistantMessages = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .filter((e) => e.type === "assistant.message");
    for (const message of assistantMessages) {
      assert.notEqual(message.data.stopReason, "stop", "a cancelled run must not report a completed assistant answer");
    }
    assert.equal(finished.usage.missing, true, "a cancelled run's accounting is incomplete, and says so");
  } finally {
    await runtime.close();
  }
});

// T-CANCEL-3: cancel while an ask_user question is open. The question is
// closed (not left pending forever), the run is cancelled, and an answer that
// arrives afterwards is refused.
test("T-CANCEL-3: cancelling during ask_user closes the question and refuses a late answer", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const calls = [{ name: "ask_user", arguments: { prompt: "which plan?" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    await waitForStatus(pollRun, runId, "waiting_user");
    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "question.open");
    assert.ok(openEvent);

    const cancelled = await api("POST", `/runs/${runId}/cancel`, {});
    assert.equal(cancelled.json.run.status, "cancelled");

    const late = await api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { answer: "too late" });
    assert.equal(late.status, 409, "an answer to a cancelled run's question must be refused");

    const closed = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .find((e) => e.type === "question.resolved" && e.data.id === openEvent.data.id);
    assert.equal(closed.data.status, "cancelled", "the question must be recorded as closed, not left pending");
    assert.equal((await pollRun(runId)).status, "cancelled");
  } finally {
    await runtime.close();
  }
});

// T-CANCEL-4: the same for a permission. A late "allow" after the cancel is
// refused and no file appears — an approval cannot resurrect a dead run.
test("T-CANCEL-4: a late allow after cancelling a permission is refused and writes nothing", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/late.md", text: "should never land" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    await waitForStatus(pollRun, runId, "waiting_user");
    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "permission.open");

    const cancelled = await api("POST", `/runs/${runId}/cancel`, {});
    assert.equal(cancelled.json.run.status, "cancelled");

    const late = await api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { decision: "allow" });
    assert.equal(late.status, 409);

    await delay(200);
    const tree = (await api("GET", `/sessions/${session.id}/workspace`)).json.tree;
    assert.ok(!tree.some((f) => f.path === "out/late.md"), "no file may be written by a late approval");
    assert.deepEqual((await api("GET", `/runs/${runId}`)).json.run.artifacts, []);
    const resolved = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .find((e) => e.type === "permission.resolved" && e.data.id === openEvent.data.id);
    assert.equal(resolved.data.status, "cancelled");
  } finally {
    await runtime.close();
  }
});

// T-CANCEL-5: cancelling a run this process is not driving. The service can
// abort only what it holds; anything else is `unknown`, never a cancelled it
// cannot vouch for.
test("T-CANCEL-5: cancelling a run that is not in this process reports unknown, not cancelled", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-1" });
    const runId = created.json.run.id;
    await pollRun(runId);

    // Put the record back into a running state with no in-process execution
    // behind it — the shape a stale or foreign record has.
    await runtime.store.updateRun(runId, { status: "running", admissionOpen: true, endedAt: null, error: null });
    assert.equal((await api("GET", `/runs/${runId}`)).json.run.status, "running");

    const cancelled = await api("POST", `/runs/${runId}/cancel`, {});
    assert.equal(cancelled.json.run.status, "unknown");
    assert.equal(cancelled.json.run.error.code, "not_in_process");
    assert.notEqual(cancelled.json.run.status, "cancelled");
  } finally {
    await runtime.close();
  }
});

// T-PERM-6: two clients answer the same permission at once. Exactly one
// decision takes effect; the other is refused rather than overwriting it.
test("T-PERM-6: concurrent allow and deny on one permission — first wins, second is 409", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/contested.md", text: "one decision only" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    await waitForStatus(pollRun, runId, "waiting_user");
    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "permission.open");

    const [a, b] = await Promise.all([
      api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { decision: "allow" }),
      api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { decision: "deny" }),
    ]);
    const codes = [a.status, b.status].sort();
    assert.deepEqual(codes, [200, 409], "exactly one answer may be accepted");
    const loser = a.status === 409 ? a : b;
    assert.equal(loser.json.error.code, "question_unavailable");

    const finished = await pollRun(runId);
    const resolvedEvents = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .filter((e) => e.type === "permission.resolved" && e.data.id === openEvent.data.id);
    assert.equal(resolvedEvents.length, 1, "only one decision may be recorded");
    const decision = resolvedEvents[0].data.decision;
    const wrote = finished.artifacts.some((artifact) => artifact.path === "out/contested.md");
    assert.equal(wrote, decision === "allow", "the file state must match the one recorded decision");
  } finally {
    await runtime.close();
  }
});

// T-PERM-7: in read_only mode ws_write does not exist. The model is told the
// tool is not found — this is absence, not a policy refusal, so there is no
// permission to open and nothing to approve.
test("T-PERM-7: read_only makes ws_write absent, not present-and-refused", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "read_only" });
    const calls = [{ name: "ws_write", arguments: { path: "out/nope.md", text: "no" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    assert.deepEqual(finished.artifacts, []);

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const toolResult = events.find((e) => e.type === "tool.result" && e.data.name === "ws_write");
    assert.equal(toolResult.data.isError, true);
    assert.match(toolResult.data.text, /not found/i, "the model must be told the tool does not exist");
    assert.ok(!/denied|permission|not allowed/i.test(toolResult.data.text), "an absent tool is not a refused one");

    assert.ok(!events.some((e) => e.type === "permission.open"), "an absent tool cannot open a permission");
    assert.ok(!events.some((e) => e.type === "artifact.written"));
    assert.deepEqual((await api("GET", `/sessions/${session.id}/workspace`)).json.tree, []);
  } finally {
    await runtime.close();
  }
});
