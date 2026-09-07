import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { boot, reopen, spawnWorker } from "./helpers.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

async function getSummary(api, query = "") {
  const result = await api("GET", `/work-summary${query ? `?${query}` : ""}`);
  assert.equal(result.status, 200, JSON.stringify(result.json));
  return result.json;
}

async function waitForQuestion({ api, pollRun, runId, eventType }) {
  const status = await pollRun(runId, { until: (value) => value === "waiting_user" || TERMINAL.has(value) });
  assert.equal(status.status, "waiting_user", `run stopped before ${eventType}: ${status.status}`);
  for (let i = 0; i < 100; i += 1) {
    const events = (await api("GET", `/sessions/${status.sessionId}/events`)).json.events;
    const event = events.find((candidate) => candidate.type === eventType);
    if (event) return event;
    await delay(10);
  }
  throw new Error(`did not observe ${eventType}`);
}

async function waitForRun(api, runId, timeoutMs = 10_000) {
  const started = Date.now();
  for (;;) {
    const result = await api("GET", `/runs/${runId}`);
    assert.equal(result.status, 200, JSON.stringify(result.json));
    if (TERMINAL.has(result.json.run.status)) return result.json.run;
    if (Date.now() - started > timeoutMs) throw new Error(`run ${runId} did not finish at ${result.json.run.status}`);
    await delay(25);
  }
}

function collectionShape(collection) {
  assert.deepEqual(Object.keys(collection).sort(), ["hasMore", "items", "limit", "nextOffset", "offset", "total", "truncated"]);
  assert.ok(Array.isArray(collection.items));
  assert.equal(typeof collection.total, "number");
  assert.equal(typeof collection.offset, "number");
  assert.equal(typeof collection.limit, "number");
  assert.equal(typeof collection.truncated, "boolean");
  assert.equal(typeof collection.hasMore, "boolean");
  assert.ok(collection.nextOffset === null || typeof collection.nextOffset === "number");
}

async function recursiveSnapshot(root, relative = "") {
  const directory = path.join(root, relative);
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const result = [];
  for (const entry of entries) {
    const entryPath = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      result.push(...await recursiveSnapshot(root, entryPath));
    } else {
      result.push({ path: entryPath, bytes: (await readFile(path.join(root, entryPath))).toString("base64") });
    }
  }
  return result;
}

// The status matrix is deliberately built from one published store state. It
// keeps this test focused on the query's classification and avoids making the
// summary suite duplicate the provider and lifecycle suites' failure tests.
test("work summary distinguishes empty, no-run, completed, failed and unknown", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const empty = await getSummary(api);
    assert.equal(empty.sessionCandidates.total, 0);
    assert.equal(empty.pendingItems.total, 0);
    assert.equal(empty.inspectionCandidates.total, 0);
    assert.deepEqual(empty.sessionVersions, []);

    const noRun = await createSession({ title: "no run" });
    const completedSession = await createSession({ title: "completed" });
    const completedCreated = await api("POST", `/sessions/${completedSession.id}/runs`, { input: "complete this", commandId: "summary-completed" });
    const completed = await pollRun(completedCreated.json.run.id);
    assert.equal(completed.status, "completed");

    const failedSession = await createSession({ title: "failed" });
    const failedCreated = await api("POST", `/sessions/${failedSession.id}/runs`, { input: "mark failed", commandId: "summary-failed" });
    await pollRun(failedCreated.json.run.id);
    await runtime.store.updateRun(failedCreated.json.run.id, {
      status: "failed",
      admissionOpen: false,
      error: { code: "test_failure", message: "synthetic failure for the status matrix" },
    });

    const unknownSession = await createSession({ title: "unknown" });
    const unknownCreated = await api("POST", `/sessions/${unknownSession.id}/runs`, { input: "mark unknown", commandId: "summary-unknown" });
    await pollRun(unknownCreated.json.run.id);
    await runtime.store.updateRun(unknownCreated.json.run.id, {
      status: "unknown",
      admissionOpen: false,
      error: { code: "test_unknown", message: "synthetic unknown for the status matrix" },
    });

    const summary = await getSummary(api);
    const candidates = new Map(summary.sessionCandidates.items.map((item) => [item.sessionId, item]));
    assert.equal(candidates.get(noRun.id).latestRun, null, "a session without a Run remains a candidate");
    assert.equal(candidates.get(completedSession.id).latestRun.status, "completed");
    assert.equal(candidates.get(failedSession.id).latestRun.status, "failed");
    assert.equal(candidates.get(unknownSession.id).latestRun.status, "unknown");

    const inspection = new Map(summary.inspectionCandidates.items.map((item) => [item.runId, item]));
    assert.deepEqual(new Set(inspection.keys()), new Set([failedCreated.json.run.id, unknownCreated.json.run.id]));
    assert.equal(inspection.get(failedCreated.json.run.id).status, "failed");
    assert.equal(inspection.get(failedCreated.json.run.id).errorCode, "test_failure");
    assert.equal(inspection.get(unknownCreated.json.run.id).status, "unknown");
    assert.equal(inspection.get(unknownCreated.json.run.id).errorCode, "test_unknown");
    assert.ok(!summary.inspectionCandidates.items.some((item) => item.status === "completed"), "completed is not an inspection candidate");
    assert.ok(!summary.inspectionCandidates.items.some((item) => item.status === "cancelled"), "cancelled is not an inspection candidate");
  } finally {
    await runtime.close();
  }
});

test("live ask_user and permission entries disappear after answer or cancel, and stale posts remain 409", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const askSession = await createSession({ title: "ask summary" });
    const askCreated = await api("POST", `/sessions/${askSession.id}/runs`, {
      input: scriptInput([{ name: "ask_user", arguments: { prompt: "which plan?" } }]),
      commandId: "summary-ask",
    });
    const askOpen = await waitForQuestion({ api, pollRun, runId: askCreated.json.run.id, eventType: "question.open" });
    const pendingAsk = await getSummary(api);
    const askItem = pendingAsk.pendingItems.items.find((item) => item.questionId === askOpen.data.id);
    assert.ok(askItem);
    assert.deepEqual(Object.keys(askItem).sort(), ["createdAt", "kind", "label", "projectId", "questionId", "runId", "sessionId"]);
    assert.equal(askItem.kind, "ask_user");
    assert.equal(askItem.label, "Answer requested");
    assert.equal("prompt" in askItem, false, "summary does not copy the full prompt");

    const answered = await api("POST", `/runs/${askCreated.json.run.id}/questions/${askOpen.data.id}`, { answer: "plan A" });
    assert.equal(answered.status, 200);
    assert.equal((await pollRun(askCreated.json.run.id)).status, "completed");
    const afterAsk = await getSummary(api);
    assert.ok(!afterAsk.pendingItems.items.some((item) => item.questionId === askOpen.data.id));
    const staleAsk = await api("POST", `/runs/${askCreated.json.run.id}/questions/${askOpen.data.id}`, { answer: "late plan" });
    assert.equal(staleAsk.status, 409);

    const permissionSession = await createSession({ title: "permission summary", permissionMode: "ask" });
    const permissionCreated = await api("POST", `/sessions/${permissionSession.id}/runs`, {
      input: scriptInput([{ name: "ws_write", arguments: { path: "out/summary-cancelled.md", text: "must not land" } }]),
      commandId: "summary-permission",
    });
    const permissionOpen = await waitForQuestion({ api, pollRun, runId: permissionCreated.json.run.id, eventType: "permission.open" });
    const pendingPermission = await getSummary(api);
    const permissionItem = pendingPermission.pendingItems.items.find((item) => item.questionId === permissionOpen.data.id);
    assert.ok(permissionItem);
    assert.equal(permissionItem.kind, "permission");
    assert.equal(permissionItem.label, "Permission requested");
    assert.equal("path" in permissionItem, false, "summary does not copy permission payload");

    const cancelled = await api("POST", `/runs/${permissionCreated.json.run.id}/cancel`, {});
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.run.status, "cancelled");
    const afterPermission = await getSummary(api);
    assert.ok(!afterPermission.pendingItems.items.some((item) => item.questionId === permissionOpen.data.id));
    const stalePermission = await api("POST", `/runs/${permissionCreated.json.run.id}/questions/${permissionOpen.data.id}`, { decision: "allow" });
    assert.equal(stalePermission.status, 409);
  } finally {
    await runtime.close();
  }
});

test("summary excludes stale question states and paginates pending/inspection by project with a union of lastSeq", async () => {
  const { runtime, api, projectId, createSession } = await boot();
  const syntheticQuestionIds = [];
  const syntheticRunIds = [];
  try {
    const secondProject = (await api("POST", "/projects", { name: "matrix-project" })).json.project;
    const candidate = await createSession({ title: "matrix candidate" });
    const pendingA = await createSession({ title: "pending A" });
    const pendingB = (await api("POST", "/sessions", { projectId: secondProject.id, title: "pending B" })).json.session;
    const inspectionA = await createSession({ title: "inspection A" });
    const inspectionB = (await api("POST", "/sessions", { projectId: secondProject.id, title: "inspection B" })).json.session;
    const resolvedSession = await createSession({ title: "resolved question" });
    const cancelledSession = await createSession({ title: "cancelled question" });
    const expiredSession = await createSession({ title: "expired question" });
    const terminalOpenSession = await createSession({ title: "terminal admission open" });
    const closedAdmissionSession = await createSession({ title: "closed admission" });
    const missingReceiverSession = await createSession({ title: "missing receiver" });

    const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
    async function storedRun(session, commandId) {
      const created = await runtime.store.createRun({
        sessionId: session.id,
        input: commandId,
        adapterId: "summary-matrix",
        provider,
        extension: null,
        commandId,
        workspaceHostSession: null,
        credentialGeneration: runtime.store.getCredentialGeneration(),
      });
      syntheticRunIds.push(created.run.id);
      return created.run;
    }
    async function storedQuestion(run, kind = "ask_user") {
      const question = await runtime.store.openQuestion({ runId: run.id, kind, prompt: `matrix ${run.id}` });
      syntheticQuestionIds.push(question.id);
      return question;
    }

    // These two are actionable from the projection's point of view. The
    // receiver entries are test doubles; no provider or AgentSession is used.
    const pendingRunA = await storedRun(pendingA, "pending-a");
    const pendingQuestionA = await storedQuestion(pendingRunA);
    const pendingRunB = await storedRun(pendingB, "pending-b");
    const pendingQuestionB = await storedQuestion(pendingRunB);
    runtime.service.questionWaiters.set(pendingQuestionA.id, { runId: pendingRunA.id, kind: "ask_user", resolve: () => {}, reject: () => {} });
    runtime.service.questionWaiters.set(pendingQuestionB.id, { runId: pendingRunB.id, kind: "ask_user", resolve: () => {}, reject: () => {} });

    // All of these records have a question, but none is an actionable pending
    // item: status, admission, or receiver membership makes each one stale.
    const resolvedQuestion = await storedQuestion(await storedRun(resolvedSession, "resolved"));
    await runtime.store.resolveQuestion({ runId: resolvedQuestion.runId, questionId: resolvedQuestion.id, answer: "done" });
    const cancelledQuestion = await storedQuestion(await storedRun(cancelledSession, "cancelled"));
    await runtime.store.cancelQuestionsForRun(cancelledQuestion.runId);
    const expiredQuestion = await storedQuestion(await storedRun(expiredSession, "expired"));
    await runtime.store._mutate((state) => {
      const question = state.questions.find((item) => item.id === expiredQuestion.id);
      question.status = "expired_restart";
    });
    const terminalRun = await storedRun(terminalOpenSession, "terminal-admission-open");
    const terminalQuestion = await storedQuestion(terminalRun);
    await runtime.store.updateRun(terminalRun.id, { status: "completed", admissionOpen: true });
    const closedRun = await storedRun(closedAdmissionSession, "closed-admission");
    const closedQuestion = await storedQuestion(closedRun);
    await runtime.store.updateRun(closedRun.id, { status: "waiting_user", admissionOpen: false });
    const missingReceiverRun = await storedRun(missingReceiverSession, "missing-receiver");
    const missingReceiverQuestion = await storedQuestion(missingReceiverRun);

    // Register receivers for every stale case except this one. That keeps
    // the assertions about resolved/cancelled/expired/admission independent
    // of the missing-receiver guard.
    for (const question of [resolvedQuestion, cancelledQuestion, expiredQuestion, terminalQuestion, closedQuestion]) {
      runtime.service.questionWaiters.set(question.id, { runId: question.runId, kind: question.kind, resolve: () => {}, reject: () => {} });
    }

    const failedRun = await storedRun(inspectionA, "inspection-a");
    await runtime.store.updateRun(failedRun.id, {
      status: "failed",
      admissionOpen: false,
      error: { code: "matrix_failed", message: "matrix failure" },
    });
    const unknownRun = await storedRun(inspectionB, "inspection-b");
    await runtime.store.updateRun(unknownRun.id, {
      status: "unknown",
      admissionOpen: false,
      error: { code: "matrix_unknown", message: "matrix unknown" },
    });

    // Equal timestamps force both collection-specific ID tiebreakers. Keep
    // the candidate session separate so sessionVersions proves it is the
    // union of the three independently paged item sets.
    const sameTime = "2025-02-03T04:05:06.000Z";
    await runtime.store._mutate((state) => {
      for (const question of state.questions) {
        if (question.id === pendingQuestionA.id || question.id === pendingQuestionB.id) question.createdAt = sameTime;
      }
      for (const run of state.runs) {
        if (run.id === failedRun.id || run.id === unknownRun.id) {
          run.startedAt = sameTime;
          run.endedAt = sameTime;
        }
      }
    });

    const pendingIds = [pendingQuestionA.id, pendingQuestionB.id].sort();
    const inspectionIds = [failedRun.id, unknownRun.id].sort();
    const first = await getSummary(api, `limit=1&pendingOffset=0&inspectionOffset=0`);
    assert.equal(first.pendingItems.total, 2);
    assert.equal(first.inspectionCandidates.total, 2);
    assert.deepEqual(first.pendingItems.items.map((item) => item.questionId), [pendingIds[0]]);
    assert.deepEqual(first.inspectionCandidates.items.map((item) => item.runId), [inspectionIds[0]]);
    assert.equal(first.pendingItems.nextOffset, 1);
    assert.equal(first.inspectionCandidates.nextOffset, 1);
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === resolvedQuestion.id));
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === cancelledQuestion.id));
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === expiredQuestion.id));
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === terminalQuestion.id));
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === closedQuestion.id));
    assert.ok(!first.pendingItems.items.some((item) => item.questionId === missingReceiverQuestion.id));

    const second = await getSummary(api, `limit=1&pendingOffset=${first.pendingItems.nextOffset}&inspectionOffset=${first.inspectionCandidates.nextOffset}`);
    assert.deepEqual(second.pendingItems.items.map((item) => item.questionId), [pendingIds[1]]);
    assert.deepEqual(second.inspectionCandidates.items.map((item) => item.runId), [inspectionIds[1]]);
    assert.equal(second.pendingItems.hasMore, false);
    assert.equal(second.inspectionCandidates.hasMore, false);

    const projectA = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=100`);
    assert.deepEqual(new Set(projectA.pendingItems.items.map((item) => item.questionId)), new Set([pendingQuestionA.id]));
    assert.deepEqual(new Set(projectA.inspectionCandidates.items.map((item) => item.runId)), new Set([failedRun.id]));
    assert.ok(projectA.sessionCandidates.items.some((item) => item.sessionId === candidate.id));
    const projectB = await getSummary(api, `projectId=${encodeURIComponent(secondProject.id)}&limit=100`);
    assert.deepEqual(new Set(projectB.pendingItems.items.map((item) => item.questionId)), new Set([pendingQuestionB.id]));
    assert.deepEqual(new Set(projectB.inspectionCandidates.items.map((item) => item.runId)), new Set([unknownRun.id]));

    const firstItemSessionIds = [
      first.sessionCandidates.items[0]?.sessionId,
      first.pendingItems.items[0]?.sessionId,
      first.inspectionCandidates.items[0]?.sessionId,
    ];
    assert.deepEqual(first.sessionVersions.map((item) => item.sessionId), [...new Set(firstItemSessionIds)].sort());
    for (const version of first.sessionVersions) assert.equal(version.lastSeq, runtime.store.getSessionLastSeq(version.sessionId));
  } finally {
    for (const questionId of syntheticQuestionIds) runtime.service.questionWaiters.delete(questionId);
    await runtime.close();
  }
});

test("restart hides the old live question, exposes its unknown Run, and a new Run gets a new ID", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-summary-restart-"));
  const worker = spawnWorker({
    dataDir,
    body: `
      await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
      const project = await api("POST", "/projects", { name: "restart-project" });
      const session = await api("POST", "/sessions", { projectId: project.json.project.id, title: "restart-summary" });
      const script = JSON.stringify([{ name: "ask_user", arguments: { prompt: "survive restart?" } }]);
      const created = await api("POST", "/sessions/" + session.json.session.id + "/runs", { input: "/fixture script " + script, commandId: "restart-old" });
      await waitRun(created.json.run.id, (run) => run.status === "waiting_user");
      const events = (await api("GET", "/sessions/" + session.json.session.id + "/events")).json.events;
      const question = events.find((event) => event.type === "question.open");
      emit({ projectId: project.json.project.id, sessionId: session.json.session.id, runId: created.json.run.id, questionId: question.data.id });
      await new Promise(() => {});
    `,
  });
  let ready;
  try {
    ready = await worker.waitForLine((value) => value.questionId !== undefined);
    assert.ok(ready);
  } finally {
    await worker.kill().catch(() => {});
  }
  await delay(200);

  let runtime;
  try {
    ({ runtime } = await reopen(dataDir));
    const api = async (method, requestPath, body) => {
      const headers = { "content-type": "application/json", "x-work-token": runtime.token };
      const response = await fetch(runtime.url + "/api/v5" + requestPath, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      return { status: response.status, json: text ? JSON.parse(text) : null };
    };
    const afterRestart = await getSummary(api);
    assert.equal(afterRestart.pendingItems.total, 0, "restart-expired questions are not answerable");
    const oldInspection = afterRestart.inspectionCandidates.items.find((item) => item.runId === ready.runId);
    assert.ok(oldInspection);
    assert.equal(oldInspection.status, "unknown");
    assert.equal(oldInspection.errorCode, "restart_unknown");

    const stale = await api("POST", `/runs/${ready.runId}/questions/${ready.questionId}`, { answer: "too late" });
    assert.equal(stale.status, 409);

    const newCreated = await api("POST", `/sessions/${ready.sessionId}/runs`, { input: "a fresh run", commandId: "restart-new" });
    assert.equal(newCreated.status, 200, JSON.stringify(newCreated.json));
    assert.notEqual(newCreated.json.run.id, ready.runId, "new admission must not overwrite the old Run identity");
    const newRun = await waitForRun(api, newCreated.json.run.id);
    assert.equal(newRun.status, "completed");

    const afterNewRun = await getSummary(api);
    const candidate = afterNewRun.sessionCandidates.items.find((item) => item.sessionId === ready.sessionId);
    assert.equal(candidate.latestRun.runId, newCreated.json.run.id);
    assert.equal(candidate.latestRun.status, "completed");
    assert.ok(afterNewRun.inspectionCandidates.items.some((item) => item.runId === ready.runId), "the historical unknown remains locatable");
  } finally {
    await runtime?.close().catch(() => {});
  }
});

test("summary keeps project sources separate and has deterministic tie ordering, offsets and bounds", async () => {
  const { runtime, api, projectId, createSession } = await boot();
  try {
    const secondProjectResponse = await api("POST", "/projects", { name: "second-project" });
    const secondProjectId = secondProjectResponse.json.project.id;
    const firstProjectSessions = [];
    for (let i = 0; i < 5; i += 1) firstProjectSessions.push(await createSession({ title: `same-time-${i}` }));
    const secondProjectSession = (await api("POST", "/sessions", { projectId: secondProjectId, title: "other-project" })).json.session;

    // Force a real equal-time tie so the required sessionId tiebreaker is
    // tested rather than relying on the clock's millisecond resolution.
    const sameTime = "2025-01-01T00:00:00.000Z";
    await runtime.store._mutate((state) => {
      for (const session of state.sessions) {
        if (session.projectId === projectId) session.createdAt = sameTime;
      }
    });

    const sortedIds = firstProjectSessions.map((session) => session.id).sort();
    const allProjects = await getSummary(api, "limit=100");
    const allCandidateIds = new Set(allProjects.sessionCandidates.items.map((item) => item.sessionId));
    assert.ok(sortedIds.every((id) => allCandidateIds.has(id)));
    assert.ok(allCandidateIds.has(secondProjectSession.id), "the unfiltered view includes the second project");
    assert.equal(allProjects.sessionCandidates.items.find((item) => item.sessionId === secondProjectSession.id).projectId, secondProjectId);
    const full = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=100`);
    assert.deepEqual(full.sessionCandidates.items.map((item) => item.sessionId), sortedIds);
    assert.ok(full.sessionCandidates.items.every((item) => item.projectId === projectId));
    assert.ok(!full.sessionCandidates.items.some((item) => item.sessionId === secondProjectSession.id));

    const page1 = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=2`);
    assert.equal(page1.sessionCandidates.total, 5);
    assert.equal(page1.sessionCandidates.offset, 0);
    assert.equal(page1.sessionCandidates.limit, 2);
    assert.equal(page1.sessionCandidates.truncated, true);
    assert.equal(page1.sessionCandidates.hasMore, true);
    assert.equal(page1.sessionCandidates.nextOffset, 2);
    assert.deepEqual(page1.sessionCandidates.items.map((item) => item.sessionId), sortedIds.slice(0, 2));

    const page2 = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=2&sessionsOffset=${page1.sessionCandidates.nextOffset}`);
    assert.deepEqual(page2.sessionCandidates.items.map((item) => item.sessionId), sortedIds.slice(2, 4));
    const page3 = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=2&sessionsOffset=${page2.sessionCandidates.nextOffset}`);
    assert.deepEqual(page3.sessionCandidates.items.map((item) => item.sessionId), sortedIds.slice(4));
    assert.equal(page3.sessionCandidates.hasMore, false);
    assert.equal(page3.sessionCandidates.nextOffset, null);
    assert.equal(page3.sessionCandidates.truncated, true, "a nonzero offset still means the page is truncated");

    const outOfRange = await getSummary(api, `projectId=${encodeURIComponent(projectId)}&limit=2&sessionsOffset=99`);
    assert.deepEqual(outOfRange.sessionCandidates.items, []);
    assert.equal(outOfRange.sessionCandidates.total, 5);
    assert.equal(outOfRange.sessionCandidates.truncated, true);
    assert.equal(outOfRange.sessionCandidates.hasMore, false);
    assert.equal(outOfRange.sessionCandidates.nextOffset, null);

    const otherProject = await getSummary(api, `projectId=${encodeURIComponent(secondProjectId)}`);
    assert.deepEqual(otherProject.sessionCandidates.items.map((item) => item.sessionId), [secondProjectSession.id]);
    const unknownProject = await getSummary(api, "projectId=does-not-exist");
    assert.equal(unknownProject.sessionCandidates.total, 0);
    assert.equal(unknownProject.pendingItems.total, 0);
    assert.equal(unknownProject.inspectionCandidates.total, 0);

    for (const query of ["limit=0", "limit=101", "limit=01", "limit=-1", "unknown=1", "limit=1&limit=2"]) {
      const invalid = await api("GET", `/work-summary?${query}`);
      assert.equal(invalid.status, 400, query);
      assert.equal(invalid.json.error.code, "invalid_input", query);
    }
  } finally {
    await runtime.close();
  }
});

test("summary is allowlisted and read-only; unauthorized and failed reads are errors rather than empty results", async () => {
  const { dataDir, runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession({ title: "allowlist" });
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "one completed run", commandId: "summary-read-only" });
    await pollRun(created.json.run.id);
    const beforeState = runtime.store.snapshot();
    const beforeFiles = await recursiveSnapshot(dataDir);
    const beforeStateFile = await readFile(path.join(dataDir, "runtime-state.json"));
    const beforeProviderRequests = runtime.fakeProvider.requests.length;

    const result = await getSummary(api);
    assert.deepEqual(Object.keys(result).sort(), ["inspectionCandidates", "observedAt", "pendingItems", "sessionCandidates", "sessionVersions"]);
    collectionShape(result.sessionCandidates);
    collectionShape(result.pendingItems);
    collectionShape(result.inspectionCandidates);
    for (const item of result.sessionCandidates.items) {
      assert.deepEqual(Object.keys(item).sort(), ["createdAt", "latestRun", "projectId", "recordedActivityAt", "sessionId", "title"]);
      if (item.latestRun) assert.deepEqual(Object.keys(item.latestRun).sort(), ["endedAt", "runId", "startedAt", "status"]);
    }
    for (const item of result.pendingItems.items) assert.deepEqual(Object.keys(item).sort(), ["createdAt", "kind", "label", "projectId", "questionId", "runId", "sessionId"]);
    for (const item of result.inspectionCandidates.items) assert.deepEqual(Object.keys(item).sort(), ["endedAt", "errorCode", "projectId", "resultAt", "runId", "sessionId", "startedAt", "status"]);
    for (const item of result.sessionVersions) assert.deepEqual(Object.keys(item).sort(), ["lastSeq", "sessionId"]);
    assert.ok(!JSON.stringify(result).includes(runtime.token));
    assert.ok(!JSON.stringify(result).includes(FAKE_CREDENTIAL_KEY));
    assert.equal(JSON.stringify(result).includes("workspaceDir"), false);
    assert.deepEqual(runtime.store.snapshot(), beforeState, "a summary read does not mutate store state or event high-water marks");
    const afterFiles = await recursiveSnapshot(dataDir);
    assert.deepEqual(afterFiles, beforeFiles, "a summary read does not create nested JSONL or any other files");
    assert.deepEqual(await readFile(path.join(dataDir, "runtime-state.json")), beforeStateFile, "a summary read does not rewrite persisted state");
    assert.equal(runtime.fakeProvider.requests.length, beforeProviderRequests, "a summary read does not invoke the provider");

    const unauthorizedResponse = await fetch(`${runtime.url}/api/v5/work-summary`);
    const unauthorizedBody = await unauthorizedResponse.json();
    assert.equal(unauthorizedResponse.status, 401);
    assert.equal(unauthorizedBody.error.code, "unauthorized");

    const originalGetWorkSummary = runtime.store.getWorkSummary;
    runtime.store.getWorkSummary = () => { throw new Error("injected read failure"); };
    try {
      const failedRead = await api("GET", "/work-summary");
      assert.equal(failedRead.status, 500);
      assert.equal(failedRead.json.error.code, "internal_error");
      assert.notEqual(failedRead.status, 200, "a read failure must not be represented as an empty inbox");
    } finally {
      runtime.store.getWorkSummary = originalGetWorkSummary;
    }
  } finally {
    await runtime.close();
  }
});
