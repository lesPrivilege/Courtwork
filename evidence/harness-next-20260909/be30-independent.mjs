import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { boot } from "../../app/tests/helpers.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function eventually(predicate, label, timeoutMs = 3000) {
  const started = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await delay(10);
  }
}

async function permissionPending(harness, commandId = "be30-independent") {
  const session = await harness.createSession({ permissionMode: "ask" });
  const created = await harness.api("POST", `/sessions/${session.id}/runs`, {
    input: harness.scriptInput([
      { name: "ws_write", arguments: { path: "out/be30-independent.txt", text: "independent CAS bytes" } },
    ]),
    commandId,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const runId = created.json.run.id;
  const run = await harness.pollRun(runId, {
    until: (status) => status === "waiting_user" || TERMINAL.has(status),
  });
  assert.equal(run.status, "waiting_user", JSON.stringify(run));
  const events = (await harness.api("GET", `/sessions/${session.id}/events`)).json.events;
  const open = events.find((event) => event.type === "permission.open" && event.data?.id);
  assert.ok(open, "permission.open must be recorded");
  const question = harness.runtime.store.getQuestion(open.data.id);
  assert.equal(question.status, "pending");
  assert.equal(question.kind, "permission");
  await eventually(() => harness.runtime.service.questionWaiters.has(question.id), "permission waiter");
  return {
    session,
    runId,
    question,
    route: `/runs/${runId}/questions/${question.id}`,
    expected: {
      expectedContentSha256: question.payload.contentSha256,
      expectedToolCallId: question.payload.toolCallId,
    },
  };
}

async function withHarness(fn) {
  const harness = await boot();
  try {
    return await fn(harness);
  } finally {
    await harness.runtime.close();
    await rm(harness.dataDir, { recursive: true, force: true });
  }
}

function otherHash(actual) {
  const candidate = "0".repeat(64);
  return candidate === actual ? "1".repeat(64) : candidate;
}

async function mismatchNoSideEffects() {
  return withHarness(async (harness) => {
    const pending = await permissionPending(harness, "be30-mismatch-no-side-effects");
    const before = harness.runtime.store.snapshot();
    const persistedBefore = await readFile(path.join(harness.dataDir, "runtime-state.json"));
    const treeBefore = await harness.api("GET", `/sessions/${pending.session.id}/workspace`);
    const wrongHash = otherHash(pending.expected.expectedContentSha256);

    for (const body of [
      { decision: "allow", ...pending.expected, expectedContentSha256: wrongHash },
      { decision: "deny", ...pending.expected, expectedToolCallId: "be30-wrong-call" },
    ]) {
      const rejected = await harness.api("POST", pending.route, body);
      assert.equal(rejected.status, 409, JSON.stringify(rejected.json));
      assert.equal(rejected.json.error.code, "version_mismatch");
      assert.deepEqual(harness.runtime.store.snapshot(), before, "CAS mismatch must not mutate published state");
      assert.deepEqual(await readFile(path.join(harness.dataDir, "runtime-state.json")), persistedBefore, "CAS mismatch must not persist a write");
      assert.deepEqual(await harness.api("GET", `/sessions/${pending.session.id}/workspace`), treeBefore, "CAS mismatch must not change workspace bytes");
      assert.equal(harness.runtime.store.getQuestion(pending.question.id).status, "pending");
      assert.equal(harness.runtime.store.getRun(pending.runId).status, "waiting_user");
      assert.equal(harness.runtime.service.questionWaiters.has(pending.question.id), true, "CAS mismatch must leave the live waiter");
    }

    const accepted = await harness.api("POST", pending.route, { decision: "allow", ...pending.expected });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    const finished = await harness.pollRun(pending.runId);
    assert.equal(finished.status, "completed");
    assert.equal(finished.artifacts.length, 1);
    assert.equal(finished.artifacts[0].sha256, pending.expected.expectedContentSha256);
    const resolved = harness.runtime.store.listEvents({ sessionId: pending.session.id })
      .filter((event) => event.type === "permission.resolved" && event.data.id === pending.question.id);
    assert.equal(resolved.length, 1);
    return { mismatches: 2, status: "passed" };
  });
}

async function optionalAndLegacyBodies() {
  const cases = [
    ["legacy body", (expected) => ({ decision: "allow" }), 1],
    ["content hash only", (expected) => ({ decision: "allow", expectedContentSha256: expected.expectedContentSha256 }), 1],
    ["tool call only deny", (expected) => ({ decision: "deny", expectedToolCallId: expected.expectedToolCallId }), 0],
  ];
  const results = [];
  for (const [label, bodyFor, artifactCount] of cases) {
    results.push(await withHarness(async (harness) => {
      const pending = await permissionPending(harness, `be30-optional-${label.replaceAll(" ", "-")}`);
      const answered = await harness.api("POST", pending.route, bodyFor(pending.expected));
      assert.equal(answered.status, 200, `${label}: ${JSON.stringify(answered.json)}`);
      const finished = await harness.pollRun(pending.runId);
      assert.equal(finished.status, "completed", label);
      assert.equal(finished.artifacts.length, artifactCount, label);
      const resolved = harness.runtime.store.listEvents({ sessionId: pending.session.id })
        .filter((event) => event.type === "permission.resolved" && event.data.id === pending.question.id);
      assert.equal(resolved.length, 1, label);
      return label;
    }));
  }
  return { cases: results, status: "passed" };
}

async function malformedBodiesAndUnknownField() {
  return withHarness(async (harness) => {
    const pending = await permissionPending(harness, "be30-malformed");
    const before = harness.runtime.store.snapshot();
    const persistedBefore = await readFile(path.join(harness.dataDir, "runtime-state.json"));
    const malformed = [
      ["expectedContentSha256", null],
      ["expectedContentSha256", 1],
      ["expectedContentSha256", "A".repeat(64)],
      ["expectedContentSha256", "0".repeat(63)],
      ["expectedToolCallId", null],
      ["expectedToolCallId", 1],
      ["expectedToolCallId", ""],
      ["expectedToolCallId", "x".repeat(201)],
    ];
    for (const [field, value] of malformed) {
      const response = await harness.api("POST", pending.route, { decision: "allow", [field]: value });
      assert.equal(response.status, 400, `${field}=${String(value)}: ${JSON.stringify(response.json)}`);
      assert.equal(response.json.error.code, "invalid_input", `${field} must use invalid_input`);
      assert.deepEqual(harness.runtime.store.snapshot(), before, `${field} malformed input must not mutate state`);
      assert.deepEqual(await readFile(path.join(harness.dataDir, "runtime-state.json")), persistedBefore, `${field} malformed input must not persist`);
    }
    const extra = await harness.api("POST", pending.route, { decision: "allow", unexpected: true });
    assert.equal(extra.status, 400);
    assert.equal(harness.runtime.store.getQuestion(pending.question.id).status, "pending");
    const accepted = await harness.api("POST", pending.route, { decision: "deny", ...pending.expected });
    assert.equal(accepted.status, 200);
    assert.equal((await harness.pollRun(pending.runId)).status, "completed");
    return { malformed: malformed.length, unknownFieldStatus: extra.json.error.code, status: "passed" };
  });
}

async function askUserDoesNotMixExpectations() {
  return withHarness(async (harness) => {
    const session = await harness.createSession();
    const created = await harness.api("POST", `/sessions/${session.id}/runs`, {
      input: harness.scriptInput([{ name: "ask_user", arguments: { prompt: "choose one" } }]),
      commandId: "be30-ask-user-mix",
    });
    assert.equal(created.status, 200);
    const runId = created.json.run.id;
    const waiting = await harness.pollRun(runId, { until: (status) => status === "waiting_user" || TERMINAL.has(status) });
    assert.equal(waiting.status, "waiting_user");
    const question = harness.runtime.store.snapshot().questions.find((candidate) => candidate.runId === runId);
    assert.ok(question);
    const before = harness.runtime.store.snapshot();
    const rejected = await harness.api("POST", `/runs/${runId}/questions/${question.id}`, {
      answer: "yes",
      expectedContentSha256: "0".repeat(64),
    });
    assert.equal(rejected.status, 400, JSON.stringify(rejected.json));
    assert.equal(harness.runtime.store.getQuestion(question.id).status, "pending");
    assert.deepEqual(harness.runtime.store.snapshot(), before);
    const answered = await harness.api("POST", `/runs/${runId}/questions/${question.id}`, { answer: "yes" });
    assert.equal(answered.status, 200);
    assert.equal((await harness.pollRun(runId)).status, "completed");
    return { rejectionCode: rejected.json.error.code, status: "passed" };
  });
}

async function concurrentMatchingAnswers() {
  return withHarness(async (harness) => {
    const pending = await permissionPending(harness, "be30-concurrent-matching");
    const body = { decision: "allow", ...pending.expected };
    const responses = await Promise.all([
      harness.api("POST", pending.route, body),
      harness.api("POST", pending.route, body),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    const loser = responses.find((response) => response.status === 409);
    assert.equal(loser.json.error.code, "question_unavailable");
    const finished = await harness.pollRun(pending.runId);
    assert.equal(finished.status, "completed");
    const resolved = harness.runtime.store.listEvents({ sessionId: pending.session.id })
      .filter((event) => event.type === "permission.resolved" && event.data.id === pending.question.id);
    assert.equal(resolved.length, 1);
    assert.equal(finished.artifacts.length, 1);
    return { statuses: responses.map((response) => response.status).sort(), status: "passed" };
  });
}

async function cancelWinsOverQueuedAnswer() {
  return withHarness(async (harness) => {
    const pending = await permissionPending(harness, "be30-cancel-queued-answer");
    const originalPersist = harness.runtime.store._persist.bind(harness.runtime.store);
    let releasePersist;
    let enteredPersist;
    const persistGate = new Promise((resolve) => { releasePersist = resolve; });
    const persistEntered = new Promise((resolve) => { enteredPersist = resolve; });
    let paused = false;
    let persistEnteredFlag = false;
    harness.runtime.store._persist = async function (state) {
      if (!paused && state.runs.some((run) => run.id === pending.runId && run.status === "stopping")) {
        paused = true;
        persistEnteredFlag = true;
        enteredPersist();
        await persistGate;
      }
      return originalPersist(state);
    };
    try {
      const cancelRequest = harness.api("POST", `/runs/${pending.runId}/cancel`, {});
      await eventually(() => persistEnteredFlag, "cancel persistence gate");
      assert.equal(harness.runtime.store.getRun(pending.runId).status, "waiting_user", "cancel must be unpublished at the gate");
      const answerRequest = harness.api("POST", pending.route, { decision: "allow", ...pending.expected });
      releasePersist();
      const [cancelled, answered] = await Promise.all([cancelRequest, answerRequest]);
      assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
      assert.equal(cancelled.json.run.status, "cancelled");
      assert.equal(answered.status, 409, JSON.stringify(answered.json));
      assert.equal(answered.json.error.code, "question_unavailable");
      const finished = await harness.pollRun(pending.runId);
      assert.equal(finished.status, "cancelled");
      await eventually(() => harness.runtime.store.getQuestion(pending.question.id).status === "cancelled", "question cancellation");
      const events = harness.runtime.store.listEvents({ sessionId: pending.session.id });
      assert.equal(events.some((event) => event.type === "permission.resolved" && event.data.id === pending.question.id && event.data.decision), false);
      assert.deepEqual(finished.artifacts, []);
      return { cancel: cancelled.status, answer: answered.status, status: "passed" };
    } finally {
      releasePersist();
      harness.runtime.store._persist = originalPersist;
    }
  });
}

async function queuedPayloadChangeCAS() {
  return withHarness(async (harness) => {
    const pending = await permissionPending(harness, "be30-queued-payload-change");
    const replacementCall = "be30-new-generation-call";
    let releaseMutation;
    let enteredMutation;
    const mutationGate = new Promise((resolve) => { releaseMutation = resolve; });
    const mutationEntered = new Promise((resolve) => { enteredMutation = resolve; });
    let mutationEnteredFlag = false;
    const mutation = harness.runtime.store._mutate(async (state) => {
      state.questions.find((question) => question.id === pending.question.id).payload.toolCallId = replacementCall;
      mutationEnteredFlag = true;
      enteredMutation();
      await mutationGate;
    });
    await eventually(() => mutationEnteredFlag, "synthetic queued payload mutation");
    let resolveCalled;
    let resolveInvokedFlag = false;
    const resolveInvoked = new Promise((resolve) => { resolveCalled = resolve; });
    const originalResolve = harness.runtime.store.resolveQuestion.bind(harness.runtime.store);
    harness.runtime.store.resolveQuestion = (...args) => {
      resolveInvokedFlag = true;
      resolveCalled();
      return originalResolve(...args);
    };
    try {
      const answering = harness.api("POST", pending.route, { decision: "allow", ...pending.expected });
      await eventually(() => resolveInvokedFlag, "answer queued behind payload mutation");
      releaseMutation();
      await mutation;
      const rejected = await answering;
      assert.equal(rejected.status, 409, JSON.stringify(rejected.json));
      assert.equal(rejected.json.error.code, "version_mismatch");
      assert.equal(harness.runtime.store.getQuestion(pending.question.id).status, "pending");
      assert.equal(harness.runtime.store.getRun(pending.runId).status, "waiting_user");
      assert.equal(harness.runtime.service.questionWaiters.has(pending.question.id), true);
      assert.equal(harness.runtime.store.listEvents({ sessionId: pending.session.id })
        .some((event) => event.type === "permission.resolved" && event.data.id === pending.question.id && event.data.decision), false);
      const cancelled = await harness.api("POST", `/runs/${pending.runId}/cancel`, {});
      assert.equal(cancelled.status, 200);
      assert.equal((await harness.pollRun(pending.runId)).status, "cancelled");
      return { replacementCall, status: "passed" };
    } finally {
      releaseMutation();
      harness.runtime.store.resolveQuestion = originalResolve;
    }
  });
}

async function main() {
  const results = {
    mismatchNoSideEffects: await mismatchNoSideEffects(),
    optionalAndLegacyBodies: await optionalAndLegacyBodies(),
    malformedBodiesAndUnknownField: await malformedBodiesAndUnknownField(),
    askUserDoesNotMixExpectations: await askUserDoesNotMixExpectations(),
    concurrentMatchingAnswers: await concurrentMatchingAnswers(),
    cancelWinsOverQueuedAnswer: await cancelWinsOverQueuedAnswer(),
    queuedPayloadChangeCAS: await queuedPayloadChangeCAS(),
  };
  console.log(JSON.stringify({ commit: "757ea768b8ea9702c7534f5f67b950bbd9dafc7d", dataDir: "independent temp dirs", port: 0, provider: "local-fake", results }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
