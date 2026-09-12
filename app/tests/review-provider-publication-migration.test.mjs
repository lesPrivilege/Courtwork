import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { RuntimeStore } from "../server/store.mjs";

const exec = promisify(execFile);
const BASE_SHA = "a579929edd66544e6aa7cd8cd7d2399fae8265d3";
const repoRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const HISTORICAL_STORE_FILES = [
  "server/store.mjs",
  "server/runtime-lock.mjs",
  "server/runtime-lock.py",
  "server/work-metrics.mjs",
  "server/work-summary.mjs",
  "server/async-task-state.mjs",
  "harness/coordination-state.mjs",
  "runtime/test-hooks.mjs",
  "server/usage-details.mjs",
];

function endpointOfLength(length) {
  const prefix = "https://provider.example.test/";
  return prefix + "u".repeat(length - prefix.length);
}

async function historicalStore(codeRoot) {
  for (const file of HISTORICAL_STORE_FILES) {
    const { stdout } = await exec("git", ["show", `${BASE_SHA}:app/${file}`], {
      cwd: repoRoot,
      encoding: "buffer",
      maxBuffer: 8 * 1024 * 1024,
    });
    const destination = path.join(codeRoot, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, stdout);
  }
  const modulePath = pathToFileURL(path.join(codeRoot, "server/store.mjs")).href;
  return (await import(modulePath)).RuntimeStore;
}

function longProviderFixture() {
  const model = "m".repeat(240);
  const baseUrl = endpointOfLength(2048);
  const connection = {
    id: "conn-migration-long",
    kind: "compatible",
    providerIdentity: "conn-migration-long",
    api: "openai-completions",
    baseUrl,
    models: [{ id: model, contextWindow: null, reasoning: null, reasoningEfforts: null }],
  };
  const config = {
    provider: connection.providerIdentity,
    model,
    api: connection.api,
    baseUrl,
    reasoningEffort: "off",
  };
  const runProvider = {
    ...config,
    realProvider: true,
    connectionId: connection.id,
    credentialSource: "credential",
    contextWindowSource: "user",
    capabilityNotice: null,
  };
  return { model, baseUrl, connection, config, runProvider };
}

test("Runtime11 migrates a real schema10 byte sequence, preserves provider fields, and fences the old host", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-q02-schema10-provider-"));
  let store;
  try {
    const fixture = longProviderFixture();
    store = await new RuntimeStore({ dataDir }).open();
    const project = await store.createProject("schema10 migration");
    const session = await store.createSession({
      projectId: project.id,
      title: "schema10 migration",
      workspaceDir: path.join(dataDir, "workspace"),
      permissionMode: "draft",
    });
    await store.setProviderConnections([fixture.connection]);
    await store.setProviderConfig(fixture.config);
    const created = await store.createRun({
      sessionId: session.id,
      input: "migration fixture",
      adapterId: "fixture-adapter",
      provider: fixture.runProvider,
      extension: null,
      commandId: "migration-run",
      workspaceHostSession: null,
      credentialGeneration: 0,
    });
    await store.close();
    store = null;

    const file = path.join(dataDir, "runtime-state.json");
    const schema10 = JSON.parse(await readFile(file, "utf8"));
    schema10.schemaVersion = 10;
    delete schema10.providerConfigurationPending;
    // A real schema10 file predates providerConfigVersion/providerVerifications
    // and both reasoning capability fields: strip them so this simulates the
    // actual old byte shape, not schema-13 data wearing an old version number.
    delete schema10.providerConfigVersion;
    delete schema10.providerVerifications;
    for (const connection of schema10.providerConnections) for (const model of connection.models) { delete model.reasoning; delete model.reasoningEfforts; }
    for (const run of schema10.runs) delete run.provider.reasoningBinding;
    const original = Buffer.from(JSON.stringify(schema10, null, 1) + "\n");
    await writeFile(file, original);
    const digest = createHash("sha256").update(original).digest("hex");

    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.state.schemaVersion, 13);
    assert.deepEqual(store.getProviderConnections(), [fixture.connection]);
    assert.deepEqual(store.getProviderConfig(), fixture.config);
    assert.deepEqual(store.getRun(created.run.id).provider, fixture.runProvider);
    assert.deepEqual(store.getProviderConfigurationPending(), []);
    await store.close();
    store = null;

    const backup = path.join(dataDir, `runtime-state.schema10.${digest}.json`);
    assert.deepEqual(await readFile(backup), original, "schema10 backup must preserve the original bytes");
    const migrated = await readFile(file);
    assert.notDeepEqual(migrated, original, "migration must publish a Runtime11 state");
    assert.deepEqual(JSON.parse(migrated).providerConfigurationPending, []);

    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.state.schemaVersion, 13);
    assert.equal(store.getProviderConnections()[0].models[0].id, fixture.model);
    assert.equal(store.getProviderConnections()[0].baseUrl, fixture.baseUrl);
    assert.equal(store.getProviderConfig().model, fixture.model);
    assert.equal(store.getProviderConfig().baseUrl, fixture.baseUrl);
    assert.equal(store.getRun(created.run.id).provider.model, fixture.model);
    assert.equal(store.getRun(created.run.id).provider.baseUrl, fixture.baseUrl);
    await store.close();
    store = null;

    // The fixed schema10 reader rejects Runtime11 before reading any state.
    // This long-field fixture deliberately stays in the current-host test:
    // the historical reader's generic id() domain is only 200 characters.
    const codeRoot = path.join(dataDir, "historical-store");
    const LegacyStore = await historicalStore(codeRoot);
    const bytesBeforeLegacyOpen = await readFile(file);
    await assert.rejects(new LegacyStore({ dataDir }).open(), /schemaVersion 13 is not supported/);
    assert.deepEqual(await readFile(file), bytesBeforeLegacyOpen, "the schema10 host must not rewrite Runtime11 bytes");
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("a fixed schema10 host can read an exact schema10 backup in an independent directory", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-q02-schema10-short-"));
  const legacyData = await mkdtemp(path.join(tmpdir(), "cw-q02-schema10-backup-"));
  let store;
  let legacy;
  try {
    const model = "short-model-" + "m".repeat(180);
    const baseUrl = endpointOfLength(200);
    // `connection` (no `reasoning`) is what a real schema10 record looked
    // like, and is what the BASE_SHA-era reader below must read back
    // byte-for-fact-identical; the write below adds the schema-13 field only
    // on the copy actually sent to the CURRENT store.
    const connection = {
      id: "conn-migration-short",
      kind: "compatible",
      providerIdentity: "conn-migration-short",
      api: "openai-completions",
      baseUrl,
      models: [{ id: model, contextWindow: null }],
    };
    const config = { provider: connection.providerIdentity, model, api: connection.api, baseUrl, reasoningEffort: "off" };
    store = await new RuntimeStore({ dataDir }).open();
    await store.setProviderConnections([{ ...connection, models: connection.models.map((entry) => ({ ...entry, reasoning: null, reasoningEfforts: null })) }]);
    await store.setProviderConfig(config);
    await store.close();
    store = null;

    const file = path.join(dataDir, "runtime-state.json");
    const state = JSON.parse(await readFile(file, "utf8"));
    state.schemaVersion = 10;
    delete state.providerConfigurationPending;
    delete state.providerConfigVersion;
    delete state.providerVerifications;
    for (const record of state.providerConnections) for (const model of record.models) { delete model.reasoning; delete model.reasoningEfforts; }
    for (const run of state.runs) delete run.provider.reasoningBinding;
    const original = Buffer.from(JSON.stringify(state, null, 2) + "\n");
    await writeFile(file, original);

    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.state.schemaVersion, 13);
    await store.close();
    store = null;
    const digest = createHash("sha256").update(original).digest("hex");
    const backup = path.join(dataDir, `runtime-state.schema10.${digest}.json`);
    assert.deepEqual(await readFile(backup), original);
    await writeFile(path.join(legacyData, "runtime-state.json"), await readFile(backup));

    const LegacyStore = await historicalStore(path.join(legacyData, "historical-store"));
    legacy = await new LegacyStore({ dataDir: legacyData }).open();
    assert.equal(legacy.state.schemaVersion, 10);
    assert.deepEqual(legacy.getProviderConnections(), [connection]);
    assert.deepEqual(legacy.getProviderConfig(), config);
  } finally {
    await legacy?.close().catch(() => {});
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
    await rm(legacyData, { recursive: true, force: true });
  }
});

test("Runtime11 pending configuration markers survive reopen and finish durably", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-q02-pending-reopen-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    await store.beginProviderConfiguration("conn-pending", "connection_save");
    await store.close();
    store = null;

    store = await new RuntimeStore({ dataDir }).open();
    assert.deepEqual(store.getProviderConfigurationPending(), [{ connectionId: "conn-pending", operation: "connection_save" }]);
    assert.deepEqual(store.snapshot().providerConfigurationPending, [{ connectionId: "conn-pending", operation: "connection_save" }]);
    await store.finishProviderConfiguration("conn-pending");
    await store.close();
    store = null;

    store = await new RuntimeStore({ dataDir }).open();
    assert.deepEqual(store.getProviderConfigurationPending(), []);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("Runtime11 refuses a malformed pending marker without changing the original bytes", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-q02-pending-invalid-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    await store.close();
    store = null;
    const file = path.join(dataDir, "runtime-state.json");
    const malformed = JSON.parse(await readFile(file, "utf8"));
    malformed.providerConfigurationPending = [{ connectionId: "conn-malformed", operation: "unknown" }];
    const original = Buffer.from(JSON.stringify(malformed, null, 2));
    await writeFile(file, original);

    await assert.rejects(new RuntimeStore({ dataDir }).open(), (error) => {
      assert.equal(error.code, "INVALID_STATE");
      assert.match(error.message, /pending configuration operation/);
      return true;
    });
    assert.deepEqual(await readFile(file), original);
    assert.deepEqual((await readdir(dataDir)).filter((name) => name.startsWith("runtime-state.schema")), []);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});
