import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { RuntimeStore } from "../server/store.mjs";

for (const operation of ["resolve", "cancel"]) {
  test(`summary sees one published view across paused ${operation} persistence`, async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "se-summary-view-"));
    const store = await new RuntimeStore({ dataDir }).open();
    let release;
    try {
      const project = await store.createProject("project");
      const session = await store.createSession({ projectId: project.id, title: "session", workspaceDir: "/unused" });
      const { run } = await store.createRun({ sessionId: session.id, input: "private prompt", adapterId: "fixture",
        provider: { provider: "fixture", model: "fixture", api: "fixture", realProvider: false }, commandId: "one", credentialGeneration: 0 });
      const question = await store.openQuestion({ runId: run.id, kind: "ask_user", prompt: "private question" });
      const receivers = new Set([question.id]);
      const before = store.getWorkSummary({}, receivers);
      const originalPersist = store._persist.bind(store);
      let entered;
      const paused = new Promise((r) => { entered = r; });
      const gate = new Promise((r) => { release = r; });
      store._persist = async (state) => { entered(); await gate; await originalPersist(state); };
      const mutation = operation === "resolve"
        ? store.resolveQuestion({ runId: run.id, questionId: question.id, answer: "yes" })
        : store.updateRunWithEvent(run.id, { status: "unknown", admissionOpen: false, error: { code: "fixture", message: "private failure" } }, { type: "run.status", data: { status: "unknown" } });
      await paused;
      const during = store.getWorkSummary({}, receivers);
      assert.equal(during.pendingItems.total, 1);
      assert.equal(during.sessionCandidates.items[0].latestRun.status, "waiting_user");
      assert.deepEqual(during.sessionVersions, before.sessionVersions);
      release(); await mutation;
      const after = store.getWorkSummary({}, receivers);
      assert.equal(after.pendingItems.total, 0);
      assert.equal(after.sessionCandidates.items[0].latestRun.status, operation === "resolve" ? "running" : "unknown");
      assert.ok(after.sessionVersions[0].lastSeq > before.sessionVersions[0].lastSeq);
      assert.equal(after.inspectionCandidates.total, operation === "cancel" ? 1 : 0);
      if (operation === "cancel") {
        assert.equal(store.getQuestion(question.id).status, "pending", "closed Run filters even before question cleanup");
        await store.cancelQuestionsForRun(run.id);
        assert.equal(store.getWorkSummary({}, receivers).pendingItems.total, 0);
      }
      assert.equal(before.pendingItems.total, 1, "previous result remains detached");
      after.sessionCandidates.items[0].title = "changed";
      assert.equal(store.getSession(session.id).title, "session");
      const events = store.state.events;
      Object.defineProperty(store.state, "events", { configurable: true, get() { throw new Error("summary must not read events"); } });
      assert.doesNotThrow(() => store.getWorkSummary({}, receivers));
      Object.defineProperty(store.state, "events", { configurable: true, writable: true, enumerable: true, value: events });
    } finally {
      release?.();
      await store.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  });
}
