import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

async function waitForQuestion({ api, pollRun, runId, eventType }) {
  const waiting = await pollRun(runId, { until: (status) => status === "waiting_user" || TERMINAL.has(status) });
  assert.equal(waiting.status, "waiting_user");
  const event = (await api("GET", `/sessions/${waiting.sessionId}/events`)).json.events
    .find((candidate) => candidate.type === eventType && candidate.data?.id);
  assert.ok(event, `${eventType} must be present while the run is waiting`);
  return event;
}

async function runAdmissionRace({ permission = false } = {}) {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  let releasePersist;
  let persistReleased = false;
  try {
    const session = await createSession(permission ? { permissionMode: "ask" } : {});
    const calls = permission
      ? [{ name: "ws_write", arguments: { path: "out/race.md", text: "must not land" } }]
      : [{ name: "ask_user", arguments: { prompt: "which plan?" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput(calls),
      commandId: permission ? "admission-race-permission" : "admission-race-ask",
    });
    const runId = created.json.run.id;
    const openType = permission ? "permission.open" : "question.open";
    const openEvent = await waitForQuestion({ api, pollRun, runId, eventType: openType });

    // Hold the cancel mutation after it has computed `stopping` but before
    // RuntimeStore publishes that state. The answer request therefore reads
    // the old waiting_user snapshot, then queues its resolve behind cancel.
    let enteredResolve;
    const entered = new Promise((resolve) => { enteredResolve = resolve; });
    const persistGate = new Promise((resolve) => { releasePersist = resolve; });
    const originalPersist = runtime.store._persist.bind(runtime.store);
    let pauseNextPersist = true;
    runtime.store._persist = async function (state) {
      if (pauseNextPersist) {
        pauseNextPersist = false;
        enteredResolve();
        await persistGate;
      }
      return originalPersist(state);
    };

    const cancelRequest = api("POST", `/runs/${runId}/cancel`, {});
    await entered;
    assert.equal(runtime.store.getRun(runId).status, "waiting_user", "cancel must still be unpublished at the interleaving point");

    let resolveCalled;
    const resolveQueued = new Promise((resolve) => { resolveCalled = resolve; });
    const originalResolveQuestion = runtime.store.resolveQuestion.bind(runtime.store);
    runtime.store.resolveQuestion = async (...args) => {
      resolveCalled();
      return originalResolveQuestion(...args);
    };
    const answerBody = permission ? { decision: "allow" } : { answer: "plan A" };
    const answerRequest = api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, answerBody);
    await resolveQueued;

    // The answer has passed the service's stale read and is now behind the
    // paused cancel mutation in the store queue.
    persistReleased = true;
    releasePersist();
    const [cancelled, answered] = await Promise.all([cancelRequest, answerRequest]);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.run.status, "cancelled");
    assert.equal(answered.status, 409, "an answer queued behind cancellation must be rejected");
    assert.equal(answered.json.error.code, "question_unavailable");

    const finished = await pollRun(runId);
    assert.equal(finished.status, "cancelled");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const stopping = events.find((event) => event.type === "run.status" && event.data.status === "stopping");
    assert.ok(stopping, "cancel must publish stopping");
    assert.ok(!events.some((event) => event.type === "run.status" && event.data.status === "running" && event.seq > stopping.seq), "a rejected answer must not resurrect running");
    const resolvedType = permission ? "permission.resolved" : "question.resolved";
    assert.ok(!events.some((event) => event.type === resolvedType && event.data.id === openEvent.data.id && event.data.status === undefined), "a rejected answer must not record a successful resolution");
    if (permission) {
      assert.deepEqual(finished.artifacts, [], "a rejected permission answer must not write an artifact");
      assert.ok(!events.some((event) => event.type === "permission.resolved" && event.data.id === openEvent.data.id && event.data.decision), "no permission decision may be recorded");
    } else {
      assert.ok(!events.some((event) => event.type === "question.resolved" && event.data.id === openEvent.data.id && event.data.answer), "no ask_user answer may be recorded");
    }
  } finally {
    if (!persistReleased) releasePersist?.();
    await runtime.close();
  }
}

test("answer admission race: ask_user queued behind cancel returns 409", async () => {
  await runAdmissionRace();
});

test("answer admission race: permission queued behind cancel returns 409", async () => {
  await runAdmissionRace({ permission: true });
});

test("normal ask_user answer still resolves and completes the run", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "ask_user", arguments: { prompt: "which plan?" } }]),
      commandId: "admission-normal-ask",
    });
    const openEvent = await waitForQuestion({ api, pollRun, runId: created.json.run.id, eventType: "question.open" });
    const answered = await api("POST", `/runs/${created.json.run.id}/questions/${openEvent.data.id}`, { answer: "plan A" });
    assert.equal(answered.status, 200);
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.equal(events.filter((event) => event.type === "question.resolved" && event.data.id === openEvent.data.id).length, 1);
    assert.equal(events.find((event) => event.type === "question.resolved" && event.data.id === openEvent.data.id).data.answer, "plan A");
  } finally {
    await runtime.close();
  }
});

test("double permission answer records one decision and rejects the other", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "ws_write", arguments: { path: "out/double-answer.md", text: "one decision" } }]),
      commandId: "admission-double-permission",
    });
    const runId = created.json.run.id;
    const openEvent = await waitForQuestion({ api, pollRun, runId, eventType: "permission.open" });
    const [allow, deny] = await Promise.all([
      api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { decision: "allow" }),
      api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { decision: "deny" }),
    ]);
    assert.deepEqual([allow.status, deny.status].sort(), [200, 409]);
    const loser = allow.status === 409 ? allow : deny;
    assert.equal(loser.json.error.code, "question_unavailable");
    const finished = await pollRun(runId);
    assert.equal(finished.status, "completed");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const resolved = events.filter((event) => event.type === "permission.resolved" && event.data.id === openEvent.data.id);
    assert.equal(resolved.length, 1);
    assert.equal(finished.artifacts.length, resolved[0].data.decision === "allow" ? 1 : 0);
  } finally {
    await runtime.close();
  }
});
