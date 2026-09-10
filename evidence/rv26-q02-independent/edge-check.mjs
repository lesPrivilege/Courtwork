#!/usr/bin/env node
/**
 * Independent Q02 counterexamples. Run from any cwd:
 *
 *   node evidence/rv26-q02-independent/edge-check.mjs [repo-root]
 *
 * The optional repo-root defaults to this script's repository root. The script
 * only uses disposable temp data directories and a loopback provider fixture;
 * it does not read personal credentials or mutate the repository checkout.
 */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(process.argv[2] ?? path.join(scriptDir, "../.."));
const appRoot = path.join(repoRoot, "app");
const piCodingAgentEntry = path.join(appRoot, "node_modules/@earendil-works/pi-coding-agent/dist/index.js");
const [{ ModelRuntime }, { boot, reopen }, { createReviewProviderFixture }] = await Promise.all([
  import(pathToFileURL(piCodingAgentEntry).href),
  import(pathToFileURL(path.join(appRoot, "tests/helpers.mjs")).href),
  import(pathToFileURL(path.join(appRoot, "tests/fixtures/review-provider/loopback.mjs")).href),
]);

const API = "openai-completions";
const SECRET = "q02-independent-secret";

async function stateOf(dataDir) {
  return JSON.parse(await readFile(path.join(dataDir, "runtime-state.json"), "utf8"));
}

async function saveConnection(h, fixture, model, apiKey = undefined) {
  fixture.setModels([model]);
  const response = await h.api("POST", "/provider-connections", {
    api: API,
    baseUrl: fixture.baseUrl(199),
    models: [{ id: model }],
    ...(apiKey === undefined ? {} : { apiKey }),
  });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json.connection;
}

async function testHistoricalInvalidCredentialCanBeRepaired() {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  let again;
  try {
    const model = "historical-invalid-credential-model";
    const connection = await saveConnection(h, fixture, model);
    await h.runtime.close();
    const statePath = path.join(dataDir, "runtime-state.json");
    const state = await stateOf(dataDir);
    const stored = state.providerConnections.find((item) => item.id === connection.id);
    stored.api = "legacy-api-format";
    await writeFile(statePath, JSON.stringify(state, null, 2));

    again = await reopen(dataDir);
    const before = await stateOf(dataDir);
    const failed = await again.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey: SECRET });
    assert.equal(failed.status, 400, JSON.stringify(failed.json));
    assert.equal(failed.json?.error?.code, "invalid_connection", JSON.stringify(failed.json));
    const afterFailed = await stateOf(dataDir);
    assert.deepEqual(afterFailed.providerConfigurationPending, [], "historical invalid credential PUT installed a pending marker");
    assert.equal(afterFailed.providerConnections.find((item) => item.id === connection.id).api, "legacy-api-format");
    assert.deepEqual(afterFailed.providerConfigurationPending, before.providerConfigurationPending);

    const repaired = await again.api("PUT", `/provider-connections/${connection.id}`, {
      api: API,
      baseUrl: connection.baseUrl,
      models: [{ id: model }],
      apiKey: SECRET,
    });
    assert.equal(repaired.status, 200, JSON.stringify(repaired.json));
    const listed = await again.api("GET", "/provider-connections");
    const repairedConnection = listed.json.connections.find((item) => item.id === connection.id);
    assert.equal(repairedConnection.configurationStatus, "ready", JSON.stringify(repaired.json));
    assert.equal(repairedConnection.credentialStatus, "configured", JSON.stringify(repaired.json));
    assert.deepEqual((await stateOf(dataDir)).providerConfigurationPending, []);
    console.log("historical-invalid-credential: actual pass (400/no-pending, then PUT repair/configured)");
  } finally {
    await again?.runtime.close().catch(() => {});
    if (!h.runtime.closing) await h.runtime.close().catch(() => {});
    await fixture.close();
  }
}

async function testMissingSelectedIsUnavailable() {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  let again;
  try {
    const model = "missing-selected-model";
    const connection = await saveConnection(h, fixture, model, SECRET);
    const selected = await h.api("PUT", "/provider-config", {
      provider: connection.providerIdentity,
      model,
      api: API,
    });
    assert.equal(selected.status, 200, JSON.stringify(selected.json));
    await h.runtime.close();
    const statePath = path.join(dataDir, "runtime-state.json");
    const state = await stateOf(dataDir);
    state.providerConnections = state.providerConnections.filter((item) => item.id !== connection.id);
    await writeFile(statePath, JSON.stringify(state, null, 2));
    again = await reopen(dataDir);
    const config = await again.api("GET", "/provider-config");
    assert.equal(config.status, 200, JSON.stringify(config.json));
    assert.equal(config.json.configurationStatus, "unavailable", JSON.stringify(config.json));
    assert.equal(config.json.connection, null, JSON.stringify(config.json));
    assert.equal(config.json.config.provider, connection.providerIdentity, JSON.stringify(config.json));
    assert.equal((await again.api("GET", "/provider-models")).json.models.some((item) => item.provider === connection.providerIdentity), false);
    console.log("missing-selected-config: actual pass (GET 200/unavailable, null connection, no executable provider)");
  } finally {
    await again?.runtime.close().catch(() => {});
    if (!h.runtime.closing) await h.runtime.close().catch(() => {});
    await fixture.close();
  }
}

async function testCatalogIdentityIsNotOverwritten() {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  let again;
  try {
    const model = "identity-guard-model";
    const connection = await saveConnection(h, fixture, model, SECRET);
    await h.runtime.close();
    const statePath = path.join(dataDir, "runtime-state.json");
    const state = await stateOf(dataDir);
    const stored = state.providerConnections.find((item) => item.id === connection.id);
    stored.providerIdentity = "legacy-noncanonical-provider";
    await writeFile(statePath, JSON.stringify(state, null, 2));
    again = await reopen(dataDir);
    const models = (await again.api("GET", "/provider-models")).json.models;
    assert.equal(models.some((item) => item.provider === "openai"), true, "catalog openai identity disappeared");
    assert.equal(models.some((item) => item.provider === "legacy-noncanonical-provider"), false, "noncanonical connection identity was registered");
    const listed = await again.api("GET", "/provider-connections");
    const unavailable = listed.json.connections.find((item) => item.id === connection.id);
    assert.equal(unavailable.configurationStatus, "unavailable", JSON.stringify(unavailable));
    console.log("catalog-identity-guard: actual pass (catalog remains; noncanonical compatible identity unavailable/unregistered)");
  } finally {
    await again?.runtime.close().catch(() => {});
    if (!h.runtime.closing) await h.runtime.close().catch(() => {});
    await fixture.close();
  }
}

async function testStartupKeyloadFailureCleansSdk() {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  let again;
  const original = ModelRuntime.prototype.setRuntimeApiKey;
  let armed = true;
  try {
    const model = "startup-keyload-failure-model";
    const connection = await saveConnection(h, fixture, model, SECRET);
    await h.runtime.close();
    ModelRuntime.prototype.setRuntimeApiKey = async function (providerId, apiKey) {
      if (armed && providerId === connection.providerIdentity) {
        armed = false;
        throw new Error("synthetic startup key-load failure");
      }
      return original.call(this, providerId, apiKey);
    };
    again = await reopen(dataDir);
    const models = (await again.api("GET", "/provider-models")).json.models;
    assert.equal(models.some((item) => item.provider === connection.providerIdentity), false, "startup key-load failure left a registered provider");
    const auth = again.runtime.modelRuntime.getProviderAuthStatus(connection.providerIdentity);
    assert.equal(auth?.configured ?? false, false, "startup key-load failure left an SDK credential");
    const listed = await again.api("GET", "/provider-connections");
    const unavailable = listed.json.connections.find((item) => item.id === connection.id);
    assert.equal(unavailable.configurationStatus, "unavailable", JSON.stringify(unavailable));
    console.log("startup-keyload-cleanup: actual pass (SDK registration and key removed; route unavailable)");
  } finally {
    ModelRuntime.prototype.setRuntimeApiKey = original;
    await again?.runtime.close().catch(() => {});
    if (!h.runtime.closing) await h.runtime.close().catch(() => {});
    await fixture.close();
  }
}

await testHistoricalInvalidCredentialCanBeRepaired();
await testMissingSelectedIsUnavailable();
await testCatalogIdentityIsNotOverwritten();
await testStartupKeyloadFailureCleansSdk();
