import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { RuntimeStore } from "../server/store.mjs";

// schemaVersion 12: the app store keeps no private conversation transcript
// (_history) — the host's Pi JSONL session file is the only journal, the
// store's own "events" array is a generic UI-facing projection, and
// run.commandId/artifacts/usage/hostSession carry the run's own facts.
// Version 3 adds the persisted credentialGeneration counter. There is no
// migration in either direction: an older file is refused, not rewritten.

test("RuntimeStore persists schemaVersion 12 session/run fields and the canonical user event", async () => {
  const dataDir = await mkdtemp("/private/tmp/v5-store-");
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("test project");
  const session = await store.createSession({
    projectId: project.id,
    title: "test session",
    workspaceDir: `${dataDir}/workspaces/s1`,
    permissionMode: "draft",
  });
  assert.equal(session.permissionMode, "draft");
  assert.equal(session.hostSession, null);
  assert.equal(session._history, undefined);

  const hostSession = { id: "host-1", path: `${dataDir}/pi-sessions/s1/x.jsonl` };
  const { run, idempotent } = await store.createRun({
    sessionId: session.id,
    input: "first turn",
    adapterId: "test-adapter",
    provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
    extension: null,
    commandId: "cmd-1",
    workspaceHostSession: hostSession,
    credentialGeneration: 0,
  });
  assert.equal(idempotent, false);
  assert.deepEqual(run.artifacts, []);
  assert.deepEqual(run.usage, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0, missing: true });
  assert.deepEqual(run.hostSession, hostSession);
  assert.equal(run.commandId, "cmd-1");
  assert.equal(store.listEvents({ sessionId: session.id })[0].type, "user.message");

  await store.appendArtifact(run.id, { path: "out/memo.md", bytes: 4, sha256: "a".repeat(64) });
  await store.recordUsage(run.id, { input: 3, output: 5, cacheRead: 0, cacheWrite: 0, turns: 1, missing: false });
  await store.updateRun(run.id, { status: "completed", admissionOpen: false });
  await store.close();

  const reopened = await new RuntimeStore({ dataDir }).open();
  const stored = reopened.getRun(run.id);
  assert.equal(stored.status, "completed");
  // An artifact entry is a content version, stamped by the store: the caller
  // supplies path/bytes/sha256 only.
  assert.equal(stored.artifacts.length, 1);
  assert.equal(stored.artifacts[0].path, "out/memo.md");
  assert.equal(stored.artifacts[0].bytes, 4);
  assert.equal(stored.artifacts[0].sha256, "a".repeat(64));
  assert.equal(stored.artifacts[0].kind, "content-version");
  assert.ok(!Number.isNaN(Date.parse(stored.artifacts[0].writtenAt)));
  assert.equal(stored.usage.missing, false);
  assert.equal(JSON.parse(await readFile(`${dataDir}/runtime-state.json`, "utf8")).schemaVersion, 12);
  await reopened.close();
});

test("RuntimeStore createRun is idempotent by commandId and rejects a conflicting replay", async () => {
  const dataDir = await mkdtemp("/private/tmp/v5-idem-");
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("p");
  const session = await store.createSession({ projectId: project.id, title: "s", workspaceDir: `${dataDir}/ws`, permissionMode: "draft" });
  const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
  const first = await store.createRun({ sessionId: session.id, input: "hello", adapterId: "a", provider, extension: null, commandId: "cmd-x", workspaceHostSession: null, credentialGeneration: 0 });
  const replay = await store.createRun({ sessionId: session.id, input: "hello", adapterId: "a", provider, extension: null, commandId: "cmd-x", workspaceHostSession: null, credentialGeneration: 0 });
  assert.equal(replay.idempotent, true);
  assert.equal(replay.run.id, first.run.id);

  await assert.rejects(
    () => store.createRun({ sessionId: session.id, input: "different", adapterId: "a", provider, extension: null, commandId: "cmd-x", workspaceHostSession: null, credentialGeneration: 0 }),
    { code: "COMMAND_CONFLICT" },
  );
  await store.close();
});

test("RuntimeStore rejects an older schemaVersion file with no migration and does not rewrite it", async () => {
  for (const version of [1, 2]) {
    const dataDir = await mkdtemp("/private/tmp/v5-invalid-state-");
    const filePath = `${dataDir}/runtime-state.json`;
    const original = `{"schemaVersion":${version}}\n`;
    await writeFile(filePath, original);
    await assert.rejects(() => new RuntimeStore({ dataDir }).open(), (error) => {
      assert.equal(error.code, "INVALID_STATE");
      assert.match(error.message, new RegExp(`schemaVersion ${version} is not supported`));
      return true;
    });
    assert.equal(await readFile(filePath, "utf8"), original, "a refused state file is left exactly as found");
  }
});

// T-CRED-6: the credential generation counter is persisted state, not a
// process-local integer. A restart must not hand out a generation a
// pre-restart run already recorded.
test("T-CRED-6: credentialGeneration is persisted and keeps increasing across a reopen", async () => {
  const dataDir = await mkdtemp("/private/tmp/v5-credgen-");
  const store = await new RuntimeStore({ dataDir }).open();
  assert.equal(store.getCredentialGeneration(), 0);
  await store.bumpCredentialGeneration();
  await store.bumpCredentialGeneration();
  assert.equal(store.getCredentialGeneration(), 2);
  await store.close();

  const reopened = await new RuntimeStore({ dataDir }).open();
  assert.equal(reopened.getCredentialGeneration(), 2, "a restart must not reset the counter");
  assert.equal(await reopened.bumpCredentialGeneration(), 3);
  await reopened.close();
});
