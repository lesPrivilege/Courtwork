/* RuntimeStore 20 reserved the local Pi receipt family without changing any
 * schema-19 authority. These tests keep that historical boundary while
 * checking its migration through the current schema. They use disposable
 * stores and synthetic descriptors only; they start no provider or Pi process. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RuntimeStore, SCHEMA_VERSION } from "../server/store.mjs";
import { SPARK_DEFINITION } from "../harness/subagent-state.mjs";

const SCHEMA19_HOST = "578d77d9cc031be817220e412a1f6b8924dd39fc";
const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
const sha256 = value => createHash("sha256").update(value).digest("hex");

async function schema19RemoteState(dir) {
  let store = await new RuntimeStore({ dataDir: dir }).open();
  const project = await store.createProject("Schema 19 authority");
  const session = await store.createSession({
    id: randomUUID(), projectId: project.id, title: "Remote records stay exact",
    workspaceDir: path.join(dir, "workspace"), permissionMode: "draft",
  });
  const remote = {
    expectedBindingId: null,
    expectedBindingRevision: null,
    newBindingId: randomUUID(),
    connection: {
      connectionId: "schema19-loopback", configHash: "a".repeat(64),
      configVersion: 0, credentialGeneration: 0,
    },
    scope: {
      repositoryBindingId: null, repositoryBindingRevision: null,
      repositoryCandidateId: null, repositoryCandidateRevision: null,
    },
  };
  const { run } = await store.createRun({
    sessionId: session.id, input: "preserve the schema-19 event bytes", adapterId: "agents-api",
    provider, extension: null, commandId: "schema19-remote-run", workspaceHostSession: null,
    credentialGeneration: 0, remote,
  });
  const { intent } = await store.recordRemoteIntent(run.id, {
    kind: "create", requestHash: "b".repeat(64), native: {},
  });
  await store.settleRemoteIntent(run.id, intent.id, {
    phase: "rejected", error: { code: "synthetic_refusal", message: "offline fixture" },
  });
  await store.updateRun(run.id, {
    status: "failed", admissionOpen: false,
    error: { code: "synthetic_refusal", message: "offline fixture" },
  });
  await store.close();
  store = null;

  const file = path.join(dir, "runtime-state.json");
  const current = JSON.parse(await readFile(file, "utf8"));
  assert.equal(current.schemaVersion, 21);
  assert.equal(current.sessions[0].remoteActions.length, 1);
  assert.ok(current.runs[0].remoteBinding);
  const aged = {
    ...current,
    schemaVersion: 19,
    runs: current.runs.map(({ kitBinding, ...run }) => run),
  };
  const raw = Buffer.from(JSON.stringify(aged, null, 1) + "\n");
  await writeFile(file, raw);
  return { file, raw, aged, sessionId: session.id, runId: run.id };
}

test("schema 19 upgrades to current exactly once and preserves schema-20 remote authority and every existing event", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-local-pi-schema20-"));
  let store;
  try {
    assert.equal(SCHEMA_VERSION, 21);
    const { file, raw, aged, sessionId, runId } = await schema19RemoteState(dir);
    const logs = [];
    store = await new RuntimeStore({ dataDir: dir, logger: line => logs.push(line) }).open();
    assert.equal(store.snapshot().schemaVersion, 21);
    assert.deepEqual(store.getSession(sessionId).remoteBinding, aged.sessions[0].remoteBinding);
    assert.deepEqual(store.listRemoteActions(sessionId, runId), aged.sessions[0].remoteActions);
    await store.close();
    store = null;

    assert.ok(logs.some(line => /upgraded schema 19 to 21/.test(line)));
    const backup = path.join(dir, `runtime-state.schema19.${sha256(raw)}.json`);
    assert.deepEqual(await readFile(backup), raw, "the exact schema-19 bytes are the recovery source");
    const upgraded = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(upgraded, {
      ...aged,
      schemaVersion: 21,
      runs: aged.runs.map(run => ({ ...run, kitBinding: null })),
    }, "only the current schema version and required null Kit binding change");
    assert.deepEqual(upgraded.events, aged.events, "all existing event records and data are byte-value identical");

    store = await new RuntimeStore({ dataDir: dir }).open();
    await store.close();
    store = null;
    assert.equal((await readdir(dir)).filter(name => name.startsWith("runtime-state.schema19.")).length, 1);
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

test("the schema-20 fixture migration fails closed for an occupied backup, malformed schema 19, and schema 22", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-local-pi-schema20-blocked-"));
  try {
    const { file, raw, aged } = await schema19RemoteState(dir);
    const backup = path.join(dir, `runtime-state.schema19.${sha256(raw)}.json`);
    await symlink(path.join(dir, "unwritten-target.json"), backup);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), { code: "EEXIST" });
    assert.deepEqual(await readFile(file), raw);
    assert.deepEqual((await readdir(dir)).filter(name => name === "unwritten-target.json"), []);
    await rm(backup);

    const malformedState = structuredClone(aged);
    malformedState.sessions[0].remoteActions[0].requestHash = "not-a-digest";
    const malformed = Buffer.from(JSON.stringify(malformedState));
    await writeFile(file, malformed);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /invalid runtime state/);
    assert.deepEqual(await readFile(file), malformed);
    assert.equal((await readdir(dir)).some(name => name.startsWith("runtime-state.schema19.")), false);

    const newer = Buffer.from(JSON.stringify({ ...aged, schemaVersion: 22 }));
    await writeFile(file, newer);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /schemaVersion 22 is not supported/);
    assert.deepEqual(await readFile(file), newer);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the pinned schema-19 Host rejects current schema 21 byte-for-byte and opens the exact backup separately", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cw-local-pi-schema19-host-"));
  let current;
  let old;
  try {
    const archive = execFileSync("git", ["archive", SCHEMA19_HOST, "app"], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)), maxBuffer: 64 * 1024 * 1024,
    });
    execFileSync("tar", ["-x", "-C", root], { input: archive });
    const { RuntimeStore: Schema19Store, SCHEMA_VERSION: oldVersion } = await import(pathToFileURL(path.join(root, "app/server/store.mjs")));
    assert.equal(oldVersion, 19);

    const dataDir = path.join(root, "data");
    await mkdir(dataDir);
    const { file, raw, sessionId } = await schema19RemoteState(dataDir);
    current = await new RuntimeStore({ dataDir }).open();
    await current.close();
    current = null;
    const upgraded = await readFile(file);
    await assert.rejects(new Schema19Store({ dataDir }).open(), /schemaVersion 21 is not supported/);
    assert.deepEqual(await readFile(file), upgraded, "the old Host did not rewrite the newer store");

    const restoredDir = path.join(root, "restored");
    await mkdir(restoredDir);
    await writeFile(path.join(restoredDir, "runtime-state.json"), raw);
    old = await new Schema19Store({ dataDir: restoredDir }).open();
    assert.equal(old.snapshot().schemaVersion, 19);
    assert.equal(old.listRemoteActions(sessionId).length, 1);
    assert.equal(old.getSession(sessionId).title, "Remote records stay exact");
  } finally {
    await current?.close?.().catch(() => {});
    await old?.close?.().catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});

test("generic event APIs cannot forge local Pi receipts, and unresolved local dispatches fence admission", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-local-pi-store-fence-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const project = await store.createProject("Local Pi fences");
    const parent = await store.createSession({ projectId: project.id, title: "Parent", workspaceDir: path.join(dir, "parent") });
    const first = await store.createSession({ projectId: project.id, title: "Local child", workspaceDir: path.join(dir, "one"), permissionMode: "read_only" });
    const second = await store.createSession({ projectId: project.id, title: "Other child", workspaceDir: path.join(dir, "two") });
    const assignmentId = "schema20-local-assignment";
    await store._mutate(state => state.subagents.assignments.push({
      id: assignmentId, revision: 2, briefRevision: 1, agentId: "spark", brief: "bounded fixture",
      parentSessionId: parent.id, origin: { actor: "human", runId: null, callId: null },
      scope: { kind: "project", projectId: project.id }, sources: [], definition: structuredClone(SPARK_DEFINITION),
      status: "active", cancelRequested: false,
      attempts: [{ number: 1, sessionId: first.id, runId: null, status: "prepared" }],
      result: null, consumption: [], createdAt: new Date().toISOString(), reason: null,
      notes: [], sourceReads: [], commands: [], archived: false, results: [],
      providerSelection: { provider: provider.provider, model: provider.model, api: provider.api, baseUrl: null, configVersion: 0 },
      budget: { deadlineMs: 60_000, maxTurns: 8, maxToolCalls: 32 },
    }));
    const local = (await store.createRun({
      sessionId: first.id, input: "local", adapterId: "pi-local-print", provider,
      commandId: `spark:${assignmentId}:1`, credentialGeneration: 0,
    })).run;
    const eventCount = store.snapshot().events.length;

    await assert.rejects(store.appendEvent({ runId: local.id, type: "local_pi.dispatch", data: {} }), { code: "LOCAL_PI_EVENT_RESERVED" });
    await assert.rejects(store.updateRunWithEvent(local.id, { status: "failed" }, { type: "local_pi.terminal", data: {} }), { code: "LOCAL_PI_EVENT_RESERVED" });
    assert.equal(store.getRun(local.id).status, "running", "a rejected combined write applies no patch");
    assert.equal(store.snapshot().events.length, eventCount);

    await assert.rejects(store.createRun({
      sessionId: first.id, input: "ordinary continuation", adapterId: "fixture", provider,
      commandId: "ordinary-same-session", credentialGeneration: 0,
    }), { code: "LOCAL_PI_UNRECONCILED" });
    await assert.rejects(store.createRun({
      sessionId: second.id, input: "another local process", adapterId: "pi-local-print", provider,
      commandId: "local-two", credentialGeneration: 0,
    }), { code: "LOCAL_PI_UNRECONCILED" });

    const ordinary = await store.createRun({
      sessionId: second.id, input: "unrelated ordinary Run", adapterId: "fixture", provider,
      commandId: "ordinary-other-session", credentialGeneration: 0,
    });
    assert.equal(ordinary.run.adapterId, "fixture", "the global fence is specific to another local process");
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});
