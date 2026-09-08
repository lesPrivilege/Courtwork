import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);

async function waitUntil(predicate, timeoutMs = 2000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error("timed out waiting for race probe state");
    await delay(5);
  }
}

async function waitUntilTerminal(store, runId, timeoutMs = 2000) {
  const startedAt = Date.now();
  let run = store.getRun(runId);
  while (!TERMINAL.has(run?.status)) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`run did not settle; status=${run?.status}`);
    await delay(5);
    run = store.getRun(runId);
  }
  return run;
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HYP-01 regression.  Block the real RuntimeStore persist used by
 * openQuestion, invoke Pi's exposed Run abort while no question waiter exists,
 * then release the store.  The service must notice the already-fired signal
 * after it installs the listener and waiter, settle the Run, and close the
 * question without a second cancel request.
 */
test("HYP-01: abort before openQuestion waiter is installed does not hang", { timeout: 10000 }, async () => {
  const harness = await boot();
  const { runtime, api, createSession, scriptInput } = harness;
  const originalPersist = runtime.store._persist.bind(runtime.store);
  let releasePersist;
  let persistReleased = false;
  let openPersistEntered;
  const openPersist = new Promise((resolve) => { openPersistEntered = resolve; });
  const persistGate = new Promise((resolve) => { releasePersist = resolve; });
  let pausedQuestionId = null;
  let runId = null;
  let abortPromise = null;

  runtime.store._persist = async function (state) {
    if (!persistReleased && pausedQuestionId === null) {
      const pending = state.questions.find((question) => question.status === "pending");
      if (pending) {
        pausedQuestionId = pending.id;
        openPersistEntered();
        await persistGate;
      }
    }
    return originalPersist(state);
  };

  const release = () => {
    if (persistReleased) return;
    persistReleased = true;
    releasePersist();
  };

  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "ask_user", arguments: { prompt: "race probe" } }]),
      commandId: "hyp-01-question-abort",
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    runId = created.json.run.id;

    await withTimeout(openPersist, 5000, "openQuestion did not reach the persistence gate");
    assert.ok(pausedQuestionId, "the real openQuestion mutation must have reached the store gate");
    assert.equal(runtime.store.getQuestion(pausedQuestionId), undefined, "the blocked mutation must not be published yet");
    assert.equal(runtime.store.getRun(runId).status, "running", "the blocked waiting_user mutation must not be published yet");
    assert.equal(runtime.service.questionWaiters.size, 0, "abort must precede waiter registration");

    const entry = runtime.service.active.get(runId);
    assert.ok(entry?.abort, "the active Pi Run must expose the host abort seam");

    // Calling this starts the real Pi abort synchronously (stopped=true) before
    // its async session.abort() reaches the blocked question path.
    abortPromise = Promise.resolve(entry.abort()).then(
      () => ({ settled: true }),
      (error) => ({ settled: false, error: error?.message ?? String(error) }),
    );
    await Promise.resolve();
    assert.equal(runtime.service.questionWaiters.size, 0, "the waiter is still absent at the forced abort point");

    release();
    await waitUntil(() => runtime.store.getQuestion(pausedQuestionId)?.status !== undefined);
    const settled = await waitUntilTerminal(runtime.store, runId, 2000);
    assert.equal(settled.status, "cancelled");
    const abortResult = await withTimeout(abortPromise, 1500, "Pi abort did not settle after the question gate opened");
    assert.equal(abortResult.settled, true, JSON.stringify(abortResult));
    assert.equal(runtime.service.questionWaiters.size, 0);
    await waitUntil(() => runtime.store.getQuestion(pausedQuestionId)?.status === "cancelled");
    assert.equal(runtime.store.getQuestion(pausedQuestionId).status, "cancelled");
  } finally {
    release();
    runtime.store._persist = originalPersist;
    if (runId && !TERMINAL.has(runtime.store.getRun(runId)?.status)) {
      await withTimeout(runtime.service.cancelRun(runId, {}), 3000, "probe cleanup did not settle").catch(() => {});
    }
    await runtime.close();
  }
});
