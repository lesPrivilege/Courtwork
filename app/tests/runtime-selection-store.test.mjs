import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RuntimeStore, SCHEMA_VERSION } from "../server/store.mjs";
import { EXECUTOR_OPERATIONS, PI_EXECUTOR_ID, executorConfigurationRef } from "../server/executor-choice-state.mjs";

const caps = Object.fromEntries(EXECUTOR_OPERATIONS.map(name => [name, { supported: true }]));
const descriptor = (adapterId = PI_EXECUTOR_ID) => ({
  adapterId, revision: "fixture-revision-1",
  configurationRef: executorConfigurationRef({ adapterId, revision: "fixture-revision-1", protocol: "fixture" }),
  capabilities: caps,
});
const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
const run = (session, executor, commandId = "cmd-1", expectedRevision = session.executorChoice.revision) => ({
  sessionId: session.id, input: "inspect", adapterId: executor.adapterId, provider,
  extension: null, commandId, workspaceHostSession: null, credentialGeneration: 0,
  executorDescriptor: executor, expectedExecutorChoice: { revision: expectedRevision, adapterId: executor.adapterId },
});

test("R1 Store choice CAS, bound Run identity and historical lock survive reopen", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-store-"));
  let store;
  try {
    assert.equal(SCHEMA_VERSION, 22);
    store = await new RuntimeStore({ dataDir: dir }).open();
    const project = await store.createProject("Synthetic");
    const session = await store.createSession({ projectId: project.id, title: "Choice", workspaceDir: path.join(dir, "workspace"), executorDescriptor: descriptor() });
    const agents = descriptor("agents-api");
    const chosen = await store.changeExecutorChoice(session.id, { expectedRevision: 0, executorDescriptor: agents });
    assert.deepEqual(chosen.executorChoice, { revision: 1, adapterId: "agents-api", configurationRef: agents.configurationRef });
    await assert.rejects(store.changeExecutorChoice(session.id, { expectedRevision: 0, executorDescriptor: descriptor() }), { code: "EXECUTOR_SELECTION_CONFLICT" });
    const created = await store.createRun({ ...run(chosen, agents), remote: {
      expectedBindingId: null, expectedBindingRevision: null, newBindingId: "synthetic-binding",
      connection: { connectionId: "fixture", configHash: "a".repeat(64), configVersion: 0, credentialGeneration: 0 },
      scope: { repositoryBindingId: null, repositoryBindingRevision: null, repositoryCandidateId: null, repositoryCandidateRevision: null },
    } });
    assert.deepEqual([created.run.adapterId, created.run.executorBinding.recording, created.run.executorBinding.choiceRevision], ["agents-api", "bound", 1]);
    await assert.rejects(store.changeExecutorChoice(session.id, { expectedRevision: 1, executorDescriptor: descriptor() }), { code: "EXECUTOR_LINEAGE_LOCKED" });
    await store.close();
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.deepEqual(store.getRun(created.run.id).executorBinding, created.run.executorBinding);
    assert.deepEqual(store.getSession(session.id).executorChoice, chosen.executorChoice);
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});

test("R1 schema-21 empty Session migrates with null ref; first Run pins once after receipt lookup", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-migrate-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const project = await store.createProject("Legacy");
    const session = await store.createSession({ projectId: project.id, title: "Empty old Chat", workspaceDir: path.join(dir, "workspace"), executorDescriptor: descriptor() });
    await store.close(); store = null;
    const file = path.join(dir, "runtime-state.json");
    const old = JSON.parse(await readFile(file, "utf8"));
    old.schemaVersion = 21;
    for (const row of old.sessions) delete row.executorChoice;
    const raw = Buffer.from(JSON.stringify(old, null, 2));
    await writeFile(file, raw);
    store = await new RuntimeStore({ dataDir: dir }).open();
    const migrated = store.getSession(session.id);
    assert.deepEqual(migrated.executorChoice, { revision: 0, adapterId: PI_EXECUTOR_ID, configurationRef: null });
    const backup = path.join(dir, `runtime-state.schema21.${createHash("sha256").update(raw).digest("hex")}.json`);
    assert.deepEqual(await readFile(backup), raw);
    assert.equal((await readdir(dir)).filter(name => name.startsWith("runtime-state.schema21.")).length, 1);
    const pi = descriptor();
    const created = await store.createRun(run(migrated, pi));
    assert.equal(store.getSession(session.id).executorChoice.revision, 1);
    assert.equal(store.getSession(session.id).executorChoice.configurationRef, pi.configurationRef);
    assert.equal(created.run.executorBinding.choiceRevision, 1);
    const replay = await store.createRun(run(migrated, pi));
    assert.equal(replay.run.id, created.run.id);
    assert.equal(store.getSession(session.id).executorChoice.revision, 1);
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});

test("R1 contradictory schema-21 global Run/native history stays readable and fenced", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-executor-conflict-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const session = await store.createSession({
      scope: "global", projectId: null, title: "Attention history",
      workspaceDir: path.join(dir, "workspace"), executorDescriptor: descriptor(),
    });
    const created = await store.createRun(run(session, descriptor()));
    const native = { id: "pi-native", path: path.join(dir, "pi-native.jsonl") };
    await store.setHostSession(session.id, native);
    await store.updateRun(created.run.id, { hostSession: native, status: "completed", admissionOpen: false });
    await store.close(); store = null;
    const file = path.join(dir, "runtime-state.json");
    const old = JSON.parse(await readFile(file, "utf8"));
    old.schemaVersion = 21;
    for (const row of old.sessions) delete row.executorChoice;
    for (const row of old.runs) {
      delete row.executorBinding;
      row.adapterId = "agents-api";
    }
    await writeFile(file, JSON.stringify(old, null, 2));
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.getSession(session.id).executorChoice.adapterId, null);
    assert.equal(store.getRun(created.run.id).adapterId, "agents-api");
    assert.deepEqual(store.getRun(created.run.id).hostSession, native);
    await assert.rejects(store.createRun({
      ...run(store.getSession(session.id), descriptor(), "later"),
      expectedExecutorChoice: { revision: 0, adapterId: null },
    }), { code: "EXECUTOR_SELECTION_CONFLICT" });
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});
