import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RuntimeStore, SCHEMA_VERSION } from "./fixtures/executor-store.mjs";
import { KIT_BINDING_LIMITS, validateKitBinding } from "../runtime/kit-binding-state.mjs";

const SCHEMA20_HOST = "678d71c58acc6968569a8850d39be404b19d4dfd";
const ADAPTER_ID = "pi-coding-agent@0.85.1/agent-session";
const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };

function kitFixture(session) {
  const contentBody = "Keep the response tied to the admitted Kit.";
  const scope = { type: "session", id: session.id };
  const descriptor = {
    schemaVersion: 1,
    id: "kit:store-test",
    version: "1.0.0",
    core: [{ resourceId: "local:guide", contentSha256: sha256(contentBody), artifactSha256: "a".repeat(64) }],
    deferred: [],
    requirements: [],
    conflicts: [],
  };
  const descriptorSha256 = sha256(JSON.stringify(canonical(descriptor)));
  const alphaDescriptor = { ...structuredClone(descriptor), id: "kit:alpha" };
  const alphaDescriptorSha256 = sha256(JSON.stringify(canonical(alphaDescriptor)));
  const declarations = [
    { descriptor, descriptorSha256 },
    { descriptor: alphaDescriptor, descriptorSha256: alphaDescriptorSha256 },
    { descriptor: structuredClone(descriptor), descriptorSha256 },
  ];
  const pins = [
    { id: alphaDescriptor.id, version: alphaDescriptor.version, descriptorSha256: alphaDescriptorSha256 },
    { id: descriptor.id, version: descriptor.version, descriptorSha256 },
  ];
  const profileSha256 = "b".repeat(64);
  const composition = {
    id: "agent:store-test", version: "2.0.0", hash: profileSha256, status: "compatible",
    resourceIds: ["local:guide"], uiSlots: [], missing: [], schemaVersion: 2,
    // Profile source order and duplicates are preserved here. K1 owns the
    // normalized unique pin order stored in the Run summary below.
    kits: declarations, selectionScope: scope,
  };
  const resources = [{
    id: "local:guide", kind: "instruction", title: "Store guide", scope,
    source: { type: "local-config", hash: sha256(contentBody) }, exposed: true,
  }];
  const content = [{ id: "local:guide", kind: "instruction", title: "Store guide", scope, content: contentBody }];
  const revision = 3;
  const policies = [];
  const bindingHash = sha256(JSON.stringify({ revision, sessionScope: { kind: session.scope, projectId: session.projectId }, resources, composition, policies }));
  const kitBinding = {
    version: 1,
    profile: { id: composition.id, version: composition.version, sourceSha256: profileSha256 },
    controlRevision: revision,
    bindingHash,
    kits: pins,
    planVersion: 1,
    compiler: "kit-context-v1",
    adapter: { id: ADAPTER_ID, revision: "pi-agent-session-context-v1" },
    compatibility: { status: "unchecked", kits: pins.map(pin => ({ ...pin, status: "unchecked", evidence: [] })) },
    policy: "reference-only-pi-unchecked-v1",
    limits: { ...KIT_BINDING_LIMITS },
    planSha256: "c".repeat(64),
    planPayload: { sha256: "d".repeat(64), bytes: 2048 },
    contextPayload: { sha256: sha256(contentBody), bytes: Buffer.byteLength(contentBody), characters: contentBody.length },
  };
  const runtimeSnapshot = {
    revision, hash: bindingHash, sessionScope: { kind: session.scope, projectId: session.projectId },
    composition, resources, content, policies, context: [], kitBinding: structuredClone(kitBinding),
  };
  return { kitBinding, runtimeSnapshot };
}

async function createSession(store, dir, title = "Kit Store") {
  const project = await store.createProject(title);
  return store.createSession({ id: randomUUID(), projectId: project.id, title, workspaceDir: path.join(dir, "workspace") });
}

async function createKitRun(store, session) {
  const fixture = kitFixture(session);
  const result = await store.createRun({
    sessionId: session.id, input: "Use the selected Kit", adapterId: ADAPTER_ID, provider,
    extension: null, commandId: "kit-store-command", workspaceHostSession: null,
    credentialGeneration: 0, runtimeSnapshot: fixture.runtimeSnapshot, kitBinding: fixture.kitBinding,
  });
  return { ...result, ...fixture };
}

test("schema 22 records one immutable Kit summary and equal typed runtime.bound projection across reopen", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-kit-store-"));
  let store;
  try {
    assert.equal(SCHEMA_VERSION, 22);
    store = await new RuntimeStore({ dataDir: dir }).open();
    const session = await createSession(store, dir);
    const { run, kitBinding } = await createKitRun(store, session);
    assert.deepEqual(run.kitBinding, kitBinding);
    const bound = store.listEvents({ sessionId: session.id, runId: run.id }).filter(event => event.type === "runtime.bound");
    assert.equal(bound.length, 1);
    assert.deepEqual(bound[0].data.kitBinding, kitBinding);

    await assert.rejects(store.updateRun(run.id, { kitBinding: null }), /non-Kit Run cannot have|Kit binding is immutable/);
    await assert.rejects(store.appendEvent({ runId: run.id, type: "runtime.bound", data: bound[0].data }), /exactly one runtime.bound|immutable/);
    assert.deepEqual(store.getRun(run.id).kitBinding, kitBinding, "rejected mutations leave published memory unchanged");
    await store.close();
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.deepEqual(store.getRun(run.id).kitBinding, kitBinding);
    assert.equal(store.listEvents({ sessionId: session.id, runId: run.id }).filter(event => event.type === "runtime.bound").length, 1);
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

test("schema 22 refuses malformed summaries and corrupt Kit projections without rewriting durable bytes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-kit-corrupt-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const session = await createSession(store, dir);
    const { run, kitBinding } = await createKitRun(store, session);
    const unsupported = structuredClone(kitBinding);
    unsupported.compatibility.status = "unsupported";
    unsupported.compatibility.kits[0].status = "unsupported";
    unsupported.compatibility.kits[0].evidence = [{ ref: "evidence:test", sha256: "e".repeat(64), result: "unsupported" }];
    assert.throws(() => validateKitBinding(unsupported), /compatibility.status is invalid/);
    const oversized = structuredClone(kitBinding);
    oversized.planPayload.bytes = KIT_BINDING_LIMITS.maxPlanBytes + 1;
    assert.throws(() => validateKitBinding(oversized), /planPayload exceeds/);

    await store.close();
    store = null;
    const file = path.join(dir, "runtime-state.json");
    const state = JSON.parse(await readFile(file, "utf8"));
    state.events.find(event => event.runId === run.id && event.type === "runtime.bound").data.composition.version = "changed-after-admission";
    const corrupt = Buffer.from(JSON.stringify(state, null, 2));
    await writeFile(file, corrupt);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /profile does not match/);
    assert.deepEqual(await readFile(file), corrupt, "failed load preserves the corrupt input for recovery");
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

test("schema 20 upgrades with an exact backup, unchanged historical events, and null legacy Run bindings", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-kit-schema21-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const session = await createSession(store, dir, "Schema 20 history");
    const created = await store.createRun({
      sessionId: session.id, input: "legacy input", adapterId: "fixture", provider,
      extension: null, commandId: "legacy-run", workspaceHostSession: null, credentialGeneration: 0,
      runtimeSnapshot: { revision: 0, hash: "f".repeat(64), sessionScope: { kind: session.scope, projectId: session.projectId }, composition: {}, resources: [], content: [], policies: [], context: [] },
    });
    await store.updateRun(created.run.id, { status: "completed", admissionOpen: false });
    await store.close();
    store = null;

    const file = path.join(dir, "runtime-state.json");
    const schema22 = JSON.parse(await readFile(file, "utf8"));
    const schema20 = structuredClone(schema22);
    schema20.schemaVersion = 20;
    for (const session of schema20.sessions) delete session.executorChoice;
    for (const run of schema20.runs) delete run.executorBinding;
    for (const run of schema20.runs) delete run.kitBinding;
    for (const event of schema20.events) if (event.type === "runtime.bound") delete event.data.kitBinding;
    const raw = Buffer.from(JSON.stringify(schema20, null, 1) + "\n");
    await writeFile(file, raw);

    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.snapshot().schemaVersion, 22);
    assert.equal(store.getRun(created.run.id).kitBinding, null);
    assert.deepEqual(store.snapshot().events, schema20.events);
    await store.close();
    store = null;
    const backup = path.join(dir, `runtime-state.schema20.${sha256(raw)}.json`);
    assert.deepEqual(await readFile(backup), raw);
    assert.equal((await readdir(dir)).filter(name => name.startsWith("runtime-state.schema20.")).length, 1);
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

test("the pinned schema-20 Host refuses schema 22 byte-for-byte", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cw-kit-old-host-"));
  let current;
  try {
    const archive = execFileSync("git", ["archive", SCHEMA20_HOST, "app"], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)), maxBuffer: 64 * 1024 * 1024,
    });
    execFileSync("tar", ["-x", "-C", root], { input: archive });
    const { RuntimeStore: Schema20Store, SCHEMA_VERSION: oldVersion } = await import(pathToFileURL(path.join(root, "app/server/store.mjs")));
    assert.equal(oldVersion, 20);

    const dataDir = path.join(root, "data");
    await mkdir(dataDir);
    current = await new RuntimeStore({ dataDir }).open();
    const session = await createSession(current, dataDir);
    await createKitRun(current, session);
    await current.close();
    current = null;
    const file = path.join(dataDir, "runtime-state.json");
    const newer = await readFile(file);
    await assert.rejects(new Schema20Store({ dataDir }).open(), /schemaVersion 22 is not supported/);
    assert.deepEqual(await readFile(file), newer, "the old Host did not rewrite the newer Store");
  } finally {
    await current?.close?.().catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});
