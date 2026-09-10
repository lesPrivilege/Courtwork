import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";

import { boot, reopen } from "./helpers.mjs";
import { createReviewProviderFixture } from "./fixtures/review-provider/loopback.mjs";

const API = "openai-completions";
const SECRET_PREFIX = "q02-synthetic-secret-";

async function hashFile(file) {
  try {
    const bytes = await readFile(file);
    return createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function fileHashes(dataDir) {
  return {
    state: await hashFile(path.join(dataDir, "runtime-state.json")),
    credentials: await hashFile(path.join(dataDir, "credentials.json")),
  };
}

async function readState(dataDir) {
  return JSON.parse(await readFile(path.join(dataDir, "runtime-state.json"), "utf8"));
}

async function writeState(dataDir, state) {
  await writeFile(path.join(dataDir, "runtime-state.json"), JSON.stringify(state, null, 2), { mode: 0o600 });
}

function detailsOf(response) {
  const error = response?.json?.error ?? {};
  return error.details ?? error;
}

function assertConfigurationIncomplete(response, connectionId = undefined) {
  assert.equal(response.status, 503, JSON.stringify(response.json));
  assert.equal(response.json?.error?.code, "configuration_incomplete", JSON.stringify(response.json));
  const details = detailsOf(response);
  if (connectionId !== undefined) assert.equal(details.connectionId, connectionId, JSON.stringify(response.json));
  assert.equal(details.configurationStatus, "recovery_required", JSON.stringify(response.json));
  return details.connectionId;
}

function pendingFor(state, connectionId, operation = undefined) {
  const pending = state.providerConfigurationPending ?? [];
  return pending.filter((item) => item.connectionId === connectionId && (operation === undefined || item.operation === operation));
}

function connectionFrom(response, id) {
  const payload = response?.json ?? response;
  return payload.connections.find((connection) => connection.id === id) ?? null;
}

async function saveConnection(h, fixture, { baseUrl, modelId, apiKey = undefined, contextWindow = undefined }) {
  fixture.setModels([modelId]);
  const body = {
    api: API,
    baseUrl,
    models: [{ id: modelId, ...(contextWindow === undefined ? {} : { contextWindow }) }],
    ...(apiKey === undefined ? {} : { apiKey }),
  };
  const response = await h.api("POST", "/provider-connections", body);
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json.connection;
}

async function selectConnection(h, connection) {
  const response = await h.api("PUT", "/provider-config", {
    provider: connection.providerIdentity,
    model: connection.models[0].id,
    api: connection.api,
  });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json;
}

async function runOnce(h, sessionId, commandId) {
  const created = await h.api("POST", `/sessions/${sessionId}/runs`, {
    input: h.scriptInput ? h.scriptInput([]) : "/fixture script []",
    commandId,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  if (h.pollRun) return h.pollRun(created.json.run.id, { timeoutMs: 20_000 });
  const started = Date.now();
  let run = (await h.api("GET", `/runs/${created.json.run.id}`)).json.run;
  while (!["completed", "failed", "cancelled", "unknown"].includes(run.status)) {
    if (Date.now() - started > 20_000) throw new Error(`run ${run.id} did not settle`);
    await new Promise((resolve) => setTimeout(resolve, 25));
    run = (await h.api("GET", `/runs/${created.json.run.id}`)).json.run;
  }
  return run;
}

function assertNoSecret(logs, secret) {
  assert.equal(logs.some((line) => String(line).includes(secret)), false, "credential value appeared in a log line");
}

function installOneShotFailure(target, method, predicate, message) {
  const original = target[method];
  let armed = true;
  target[method] = function (...args) {
    if (armed && predicate(...args)) {
      armed = false;
      throw new Error(message);
    }
    return original.apply(this, args);
  };
  return () => { target[method] = original; };
}

async function connectionList(h) {
  const response = await h.api("GET", "/provider-connections");
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json;
}

async function assertPendingVisible(h, connectionId, operation, expectedStatus = "recovery_required") {
  const listed = await connectionList(h);
  assert.ok(listed.pendingConfigurations?.some((item) => item.connectionId === connectionId && item.operation === operation), JSON.stringify(listed));
  const record = connectionFrom(listed, connectionId);
  if (record) assert.equal(record.configurationStatus, expectedStatus, JSON.stringify(record));
  return record;
}

test("Q02 · HTTP/store field boundaries preserve valid Unicode and reject controls without changing files", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  try {
    const modelLengths = [199, 200, 201, 240];
    const modelConnections = [];
    for (const length of modelLengths) {
      const modelId = "m".repeat(length);
      modelConnections.push(await saveConnection(h, fixture, {
        baseUrl: fixture.baseUrl(199),
        modelId,
        apiKey: `${SECRET_PREFIX}model-${length}`,
      }));
    }
    const urlLengths = [199, 200, 201, 2048];
    const urlConnections = [];
    for (const length of urlLengths) {
      const modelId = `url-model-${length}`;
      urlConnections.push(await saveConnection(h, fixture, {
        baseUrl: fixture.baseUrl(length),
        modelId,
        apiKey: `${SECRET_PREFIX}url-${length}`,
      }));
    }
    const unicodeId = "模型-Δ-🙂-valid";
    const unicodeConnection = await saveConnection(h, fixture, {
      baseUrl: fixture.baseUrl(201),
      modelId: unicodeId,
      apiKey: `${SECRET_PREFIX}unicode`,
    });
    const contextConnections = [];
    for (const contextWindow of [4, 100_000_000, null]) {
      contextConnections.push(await saveConnection(h, fixture, {
        baseUrl: fixture.baseUrl(201),
        modelId: `context-${String(contextWindow)}`,
        contextWindow,
        apiKey: `${SECRET_PREFIX}context-${String(contextWindow)}`,
      }));
    }

    const listed = await connectionList(h);
    for (const [index, length] of modelLengths.entries()) {
      const record = connectionFrom(listed, modelConnections[index].id);
      assert.equal(record.models[0].id.length, length);
      assert.equal(record.models[0].id, "m".repeat(length));
      assert.equal(record.baseUrl.length, 199);
      assert.equal(record.configurationStatus, "ready");
    }
    for (const [index, length] of urlLengths.entries()) {
      const record = connectionFrom(listed, urlConnections[index].id);
      assert.equal(record.baseUrl.length, length);
      assert.equal(record.models[0].id, `url-model-${length}`);
      assert.equal(record.configurationStatus, "ready");
    }
    assert.equal(connectionFrom(listed, unicodeConnection.id).models[0].id, unicodeId);
    for (const [index, contextWindow] of [4, 100_000_000, null].entries()) {
      assert.equal(connectionFrom(listed, contextConnections[index].id).models[0].contextWindow, contextWindow);
    }

    const savedState = await readState(h.dataDir);
    for (const connection of [...modelConnections, ...urlConnections, unicodeConnection]) {
      const stored = savedState.providerConnections.find((candidate) => candidate.id === connection.id);
      assert.ok(stored, `missing stored connection ${connection.id}`);
      assert.equal(stored.baseUrl.length === 199 || stored.baseUrl.length === 200 || stored.baseUrl.length === 201 || stored.baseUrl.length === 2048, true);
    }

    const invalidRequests = [
      { label: "model-241", body: { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: "x".repeat(241) }], apiKey: `${SECRET_PREFIX}invalid-model` } },
      { label: "url-2049", body: { api: API, baseUrl: fixture.baseUrl(2049), models: [{ id: "valid-model" }], apiKey: `${SECRET_PREFIX}invalid-url` } },
      { label: "url-empty-query", body: { api: API, baseUrl: `${fixture.baseUrl(199)}?`, models: [{ id: "valid-query-model" }], apiKey: `${SECRET_PREFIX}invalid-query` } },
      { label: "url-empty-fragment", body: { api: API, baseUrl: `${fixture.baseUrl(199)}#`, models: [{ id: "valid-fragment-model" }], apiKey: `${SECRET_PREFIX}invalid-fragment` } },
      { label: "unsupported-api", body: { api: "unsupported-wire-format", baseUrl: fixture.baseUrl(199), models: [{ id: "valid-api-model" }], apiKey: `${SECRET_PREFIX}invalid-api` } },
      ...[3, 100_000_001, 3.5].map((contextWindow, index) => ({
        label: `context-window-${String(contextWindow)}`,
        body: { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: `context-invalid-${index}`, contextWindow }], apiKey: `${SECRET_PREFIX}invalid-context-${index}` },
      })),
      ...["\u0000", "\u007f"].map((control, index) => ({
        label: `model-control-${index === 0 ? "C0" : "DEL"}`,
        body: { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: `valid${control}model` }], apiKey: `${SECRET_PREFIX}invalid-control-${index}` },
      })),
      { label: "base-url-C0", body: { api: API, baseUrl: `${fixture.baseUrl(199)}\u0000`, models: [{ id: "valid-base-c0" }], apiKey: `${SECRET_PREFIX}invalid-base-c0` } },
      { label: "base-url-DEL", body: { api: API, baseUrl: `${fixture.baseUrl(199)}\u007f`, models: [{ id: "valid-base-del" }], apiKey: `${SECRET_PREFIX}invalid-base-del` } },
    ];
    for (const invalid of invalidRequests) {
      fixture.setModels([invalid.body.models[0].id]);
      const before = await fileHashes(h.dataDir);
      const response = await h.api("POST", "/provider-connections", invalid.body);
      assert.equal(response.status, 400, `${invalid.label}: ${JSON.stringify(response.json)}`);
      const after = await fileHashes(h.dataDir);
      assert.deepEqual(after, before, `${invalid.label} changed persisted bytes`);
    }

    // Credential PUT uses the same printable, non-space ASCII API-key domain
    // as connection input. A valid update still succeeds; each malformed key
    // is rejected before either the credential file or runtime state changes.
    const credentialTarget = modelConnections[0];
    const validCredential = `${SECRET_PREFIX}valid-credential-put`;
    const validCredentialResponse = await h.api("PUT", "/provider-credential", {
      connectionId: credentialTarget.id,
      apiKey: validCredential,
    });
    assert.equal(validCredentialResponse.status, 200, JSON.stringify(validCredentialResponse.json));
    for (const [label, apiKey] of [
      ["credential-newline", "bad\nkey"],
      ["credential-space", "bad key"],
      ["credential-4001", "k".repeat(4001)],
    ]) {
      const before = await fileHashes(h.dataDir);
      const response = await h.api("PUT", "/provider-credential", { connectionId: credentialTarget.id, apiKey });
      assert.equal(response.status, 400, `${label}: ${JSON.stringify(response.json)}`);
      assert.deepEqual(await fileHashes(h.dataDir), before, `${label} changed persisted bytes`);
    }

    const beforeStoreState = h.runtime.store.snapshot();
    const beforeStoreHash = await hashFile(path.join(h.dataDir, "runtime-state.json"));
    for (const [label, modelId, baseUrl] of [
      ["store-model-241", "x".repeat(241), fixture.baseUrl(199)],
      ["store-control", "ok\u0000bad", fixture.baseUrl(199)],
      ["store-url-2049", "store-valid", fixture.baseUrl(2049)],
    ]) {
      const invalidRecord = {
        id: `conn-${label}`,
        kind: "compatible",
        providerIdentity: `conn-${label}`,
        api: API,
        baseUrl,
        models: [{ id: modelId, contextWindow: null }],
      };
      await assert.rejects(() => h.runtime.store.setProviderConnections([...beforeStoreState.providerConnections, invalidRecord]));
      assert.deepEqual(h.runtime.store.snapshot(), beforeStoreState, `${label} changed in-memory store state`);
      assert.equal(await hashFile(path.join(h.dataDir, "runtime-state.json")), beforeStoreHash, `${label} changed runtime-state.json`);
    }

    // The catalog config route shares the same URL boundary. Empty query and
    // fragment separators, C0, and DEL are all rejected before config can be
    // persisted; the baseline fake route remains unchanged byte-for-byte.
    const catalogConfigCases = [
      ["catalog-url-C0", `${fixture.baseUrl(199)}\u0000`],
      ["catalog-url-DEL", `${fixture.baseUrl(199)}\u007f`],
      ["catalog-url-empty-query", `${fixture.baseUrl(199)}?`],
      ["catalog-url-empty-fragment", `${fixture.baseUrl(199)}#`],
    ];
    for (const [label, baseUrl] of catalogConfigCases) {
      const before = await fileHashes(h.dataDir);
      const response = await h.api("PUT", "/provider-config", {
        provider: "openai",
        model: "gpt-4.1-mini",
        api: API,
        baseUrl,
      });
      assert.equal(response.status, 400, `${label}: ${JSON.stringify(response.json)}`);
      assert.deepEqual(await fileHashes(h.dataDir), before, `${label} changed persisted bytes`);
    }
  } finally {
    await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · a 240-character model and 2048-character endpoint survive reopen and keep the execution descriptor", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  const modelId = "r".repeat(240);
  const baseUrl = fixture.baseUrl(2048);
  const apiKey = `${SECRET_PREFIX}roundtrip`;
  try {
    const connection = await saveConnection(h, fixture, { baseUrl, modelId, apiKey });
    const selected = await selectConnection(h, connection);
    const session = await h.createSession();
    const before = await runOnce(h, session.id, "q02-before-reopen");
    assert.equal(before.status, "completed", JSON.stringify(before));
    assert.deepEqual({
      connectionId: before.provider.connectionId,
      provider: before.provider.provider,
      model: before.provider.model,
      api: before.provider.api,
      baseUrl: before.provider.baseUrl,
      realProvider: before.provider.realProvider,
    }, {
      connectionId: connection.id,
      provider: connection.providerIdentity,
      model: modelId,
      api: API,
      baseUrl,
      realProvider: true,
    });
    assert.equal(selected.config.baseUrl, baseUrl);
  } finally {
    await h.runtime.close();
  }

  const again = await reopen(dataDir);
  try {
    const config = await again.api("GET", "/provider-config");
    assert.equal(config.status, 200, JSON.stringify(config.json));
    assert.equal(config.json.config.baseUrl, baseUrl);
    assert.equal(config.json.config.model, modelId);
    assert.equal(config.json.connection.configurationStatus, "ready");
    const sessions = await again.api("GET", "/sessions");
    assert.equal(sessions.status, 200);
    const session = sessions.json.sessions[0];
    const after = await runOnce(again, session.id, "q02-after-reopen");
    assert.equal(after.status, "completed", JSON.stringify(after));
    assert.deepEqual({
      connectionId: after.provider.connectionId,
      provider: after.provider.provider,
      model: after.provider.model,
      api: after.provider.api,
      baseUrl: after.provider.baseUrl,
      realProvider: after.provider.realProvider,
    }, {
      connectionId: after.provider.connectionId,
      provider: after.provider.provider,
      model: modelId,
      api: API,
      baseUrl,
      realProvider: true,
    });
    assert.ok(fixture.requests.some((request) => request.authorization === `Bearer ${apiKey}`), "the custom credential reached the local SDK endpoint");
    assertNoSecret(again.logs, apiKey);
  } finally {
    await again.runtime.close();
    await fixture.close();
  }
});

test("Q02 · registration failure leaves a recoverable record without a ghost provider", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const modelId = "registration-failure-model";
  const body = { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: modelId }], apiKey: `${SECRET_PREFIX}registration` };
  const restore = installOneShotFailure(h.runtime.modelRuntime, "registerProvider", (providerId) => providerId.startsWith("conn-"), "synthetic registration failure");
  try {
    fixture.setModels([modelId]);
    const failed = await h.api("POST", "/provider-connections", body);
    const connectionId = assertConfigurationIncomplete(failed);
    assert.match(connectionId, /^conn-[0-9a-f]{12}$/);
    await assertPendingVisible(h, connectionId, "connection_save");
    const models = (await h.api("GET", "/provider-models")).json.models;
    assert.equal(models.some((model) => model.provider === connectionId), false, "failed registration left an executable provider");
    assertNoSecret(h.logs, body.apiKey);

    restore();
    const retried = await h.api("PUT", `/provider-connections/${connectionId}`, body);
    assert.equal(retried.status, 200, JSON.stringify(retried.json));
    const listed = await connectionList(h);
    assert.equal(connectionFrom(listed, connectionId).configurationStatus, "ready");
    assert.equal(pendingFor(await readState(h.dataDir), connectionId).length, 0);
    assert.ok((await h.api("GET", "/provider-models")).json.models.some((model) => model.provider === connectionId));
  } finally {
    restore();
    await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · a provider store failure can be retried with PUT and does not publish a ghost registration", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const modelId = "store-failure-model";
  const body = { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: modelId }], apiKey: `${SECRET_PREFIX}store` };
  const originalPersist = h.runtime.store._persist.bind(h.runtime.store);
  const existingIds = new Set(h.runtime.store.getProviderConnections().map((connection) => connection.id));
  let failed = false;
  h.runtime.store._persist = async function (state) {
    const newConnection = state.providerConnections?.some((connection) => connection.kind === "compatible" && !existingIds.has(connection.id));
    if (!failed && newConnection && state.providerConfigurationPending?.some((item) => item.operation === "connection_save")) {
      failed = true;
      throw new Error("synthetic provider store failure");
    }
    return originalPersist(state);
  };
  try {
    fixture.setModels([modelId]);
    const failedResponse = await h.api("POST", "/provider-connections", body);
    const connectionId = assertConfigurationIncomplete(failedResponse);
    const listedAfterFailure = await connectionList(h);
    assert.equal(connectionFrom(listedAfterFailure, connectionId), null, "store failure published a partial connection record");
    assert.ok(listedAfterFailure.pendingConfigurations?.some((item) => item.connectionId === connectionId && item.operation === "connection_save"));
    assert.equal((await h.api("GET", "/provider-models")).json.models.some((model) => model.provider === connectionId), false);
    assertNoSecret(h.logs, body.apiKey);

    h.runtime.store._persist = originalPersist;
    const retried = await h.api("PUT", `/provider-connections/${connectionId}`, body);
    assert.equal(retried.status, 200, JSON.stringify(retried.json));
    const listed = await connectionList(h);
    assert.equal(connectionFrom(listed, connectionId).configurationStatus, "ready");
    assert.equal(pendingFor(await readState(h.dataDir), connectionId).length, 0);
  } finally {
    h.runtime.store._persist = originalPersist;
    await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · replacing a connection fences the route when the new store write fails, then recovers after restart", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  const originalModel = "replace-old-model";
  const nextModel = "replace-new-model";
  const original = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId: originalModel, apiKey: `${SECRET_PREFIX}replace` });
  await selectConnection(h, original);
  const session = await h.createSession();
  const body = { api: API, baseUrl: fixture.baseUrl(199), models: [{ id: nextModel }] };
  fixture.setModels([nextModel]);
  const originalPersist = h.runtime.store._persist.bind(h.runtime.store);
  let failed = false;
  h.runtime.store._persist = async function (state) {
    const record = state.providerConnections?.find((connection) => connection.id === original.id);
    if (!failed && record?.models?.some((model) => model.id === nextModel)) {
      failed = true;
      throw new Error("synthetic replace store failure");
    }
    return originalPersist(state);
  };
  try {
    const failedResponse = await h.api("PUT", `/provider-connections/${original.id}`, body);
    assertConfigurationIncomplete(failedResponse, original.id);
    const listed = await connectionList(h);
    const recovered = connectionFrom(listed, original.id);
    assert.equal(recovered.models[0].id, originalModel);
    assert.equal(recovered.configurationStatus, "recovery_required");
    const models = (await h.api("GET", "/provider-models")).json.models.filter((model) => model.provider === original.providerIdentity);
    assert.deepEqual(models.map((model) => model.id), [], "the failed replacement leaves no executable SDK registration");

    h.runtime.store._persist = originalPersist;
    await h.runtime.close();
    const again = await reopen(dataDir);
    try {
      const afterRestart = connectionFrom(await connectionList(again), original.id);
      assert.equal(afterRestart.configurationStatus, "recovery_required");
      assert.equal((await again.api("GET", "/provider-models")).json.models.some((model) => model.provider === original.providerIdentity), false);
      const blocked = await again.api("POST", `/sessions/${session.id}/runs`, {
        input: "/fixture script []",
        commandId: "replace-blocked-after-restart",
      });
      assertConfigurationIncomplete(blocked, original.id);

      const retried = await again.api("PUT", `/provider-connections/${original.id}`, body);
      assert.equal(retried.status, 200, JSON.stringify(retried.json));
      assert.deepEqual(connectionFrom(await connectionList(again), original.id).models.map((model) => model.id), [nextModel]);
      assert.equal(connectionFrom(await connectionList(again), original.id).configurationStatus, "ready");
      assert.ok((await again.api("GET", "/provider-models")).json.models.some((model) => model.provider === original.providerIdentity));
    } finally {
      await again.runtime.close();
    }
  } finally {
    h.runtime.store._persist = originalPersist;
    if (!h.runtime.closing) await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · credential file, runtime key, and generation failures remain inspectable and retryable", async (t) => {
  const failureKinds = ["runtime-key", "credential-path", "generation"];
  for (const kind of failureKinds) {
    await t.test(kind, async () => {
      const fixture = await createReviewProviderFixture();
      const h = await boot();
      const modelId = `credential-${kind}-model`;
      const apiKey = `${SECRET_PREFIX}${kind}`;
      const connection = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId, apiKey: undefined });
      await selectConnection(h, connection);
      const credentialPath = path.join(h.dataDir, "credentials.json");
      const originalPersist = h.runtime.store._persist.bind(h.runtime.store);
      let restoreFailure = () => {};
      try {
        if (kind === "runtime-key") {
          restoreFailure = installOneShotFailure(h.runtime.modelRuntime, "setRuntimeApiKey", (providerId) => providerId === connection.providerIdentity, "synthetic runtime key failure");
        } else if (kind === "credential-path") {
          await rm(credentialPath, { force: true, recursive: true });
          await mkdir(credentialPath);
        } else {
          const generation = h.runtime.store.getCredentialGeneration();
          let failed = false;
          h.runtime.store._persist = async function (state) {
            if (!failed && state.credentialGeneration > generation) {
              failed = true;
              throw new Error("synthetic credential generation failure");
            }
            return originalPersist(state);
          };
        }

        const failed = await h.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey });
        assertConfigurationIncomplete(failed, connection.id);
        await assertPendingVisible(h, connection.id, "credential_set");
        const blocked = await h.api("POST", `/sessions/${(await h.createSession()).id}/runs`, { input: h.scriptInput([]), commandId: `blocked-${kind}` });
        assertConfigurationIncomplete(blocked, connection.id);
        assertNoSecret(h.logs, apiKey);

        if (kind === "credential-path") await rm(credentialPath, { force: true, recursive: true });
        restoreFailure();
        h.runtime.store._persist = originalPersist;
        const retried = await h.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey });
        assert.equal(retried.status, 200, JSON.stringify(retried.json));
        const listed = await connectionList(h);
        assert.equal(connectionFrom(listed, connection.id).configurationStatus, "ready");
        assert.equal(connectionFrom(listed, connection.id).credentialStatus, "configured");
        assert.equal(pendingFor(await readState(h.dataDir), connection.id).length, 0);
      } finally {
        restoreFailure();
        h.runtime.store._persist = originalPersist;
        if (kind === "credential-path") await rm(credentialPath, { force: true, recursive: true });
        await h.runtime.close();
        await fixture.close();
      }
    });
  }
});

test("Q02 · credential_delete explicitly abandons a pending credential_set and clears its key", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const modelId = "credential-delete-abandon-model";
  const apiKey = `${SECRET_PREFIX}abandon`;
  const connection = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId });
  const restoreRuntimeKey = installOneShotFailure(
    h.runtime.modelRuntime,
    "setRuntimeApiKey",
    (providerId) => providerId === connection.providerIdentity,
    "synthetic runtime key failure before credential delete",
  );
  try {
    const failed = await h.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey });
    assertConfigurationIncomplete(failed, connection.id);
    await assertPendingVisible(h, connection.id, "credential_set");

    restoreRuntimeKey();
    const abandoned = await h.api("DELETE", "/provider-credential", { connectionId: connection.id });
    assert.equal(abandoned.status, 200, JSON.stringify(abandoned.json));
    const listed = await connectionList(h);
    assert.equal(connectionFrom(listed, connection.id).configurationStatus, "ready");
    assert.equal(connectionFrom(listed, connection.id).credentialStatus, "not_configured");
    assert.equal(pendingFor(await readState(h.dataDir), connection.id).length, 0);
    const credentials = JSON.parse(await readFile(path.join(h.dataDir, "credentials.json"), "utf8"));
    assert.equal(Object.hasOwn(credentials, connection.id), false);
    assert.equal((await h.api("GET", "/provider-models")).json.models.some((model) => model.provider === connection.providerIdentity), true);
    assertNoSecret(h.logs, apiKey);
  } finally {
    restoreRuntimeKey();
    await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · a final pending-marker persist failure fences an already-applied credential until the same retry", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const modelId = "credential-finish-persist-model";
  const apiKey = `${SECRET_PREFIX}finish-persist`;
  const connection = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId });
  const originalPersist = h.runtime.store._persist.bind(h.runtime.store);
  const generation = h.runtime.store.getCredentialGeneration();
  let failed = false;
  h.runtime.store._persist = async function (state) {
    const markerCleared = !state.providerConfigurationPending?.some((item) => item.connectionId === connection.id);
    if (!failed && markerCleared && state.credentialGeneration > generation) {
      failed = true;
      throw new Error("synthetic finish marker persist failure");
    }
    return originalPersist(state);
  };
  try {
    const failedResponse = await h.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey });
    assertConfigurationIncomplete(failedResponse, connection.id);
    const listed = await assertPendingVisible(h, connection.id, "credential_set");
    assert.equal(listed.credentialStatus, "not_configured");
    assert.equal((await h.api("GET", "/provider-models")).json.models.some((model) => model.provider === connection.providerIdentity), false, "the completed SDK side effect is fenced after finish persistence fails");
    assert.equal(h.runtime.modelRuntime.getProviderAuthStatus(connection.providerIdentity)?.configured ?? false, false);
    const credentials = JSON.parse(await readFile(path.join(h.dataDir, "credentials.json"), "utf8"));
    assert.equal(credentials[connection.id], apiKey, "the credential write completed before the finish marker failed");
    assertNoSecret(h.logs, apiKey);

    h.runtime.store._persist = originalPersist;
    const retried = await h.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey });
    assert.equal(retried.status, 200, JSON.stringify(retried.json));
    const recovered = connectionFrom(await connectionList(h), connection.id);
    assert.equal(recovered.configurationStatus, "ready");
    assert.equal(recovered.credentialStatus, "configured");
    assert.equal(pendingFor(await readState(h.dataDir), connection.id).length, 0);
    assert.equal(h.runtime.modelRuntime.getProviderAuthStatus(connection.providerIdentity)?.configured ?? false, true);
  } finally {
    h.runtime.store._persist = originalPersist;
    await h.runtime.close();
    await fixture.close();
  }
});

test("Q02 · startup skips pending registration/key load, preserves receipt replay, and only same-operation retry clears it", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  const modelId = "startup-pending-model";
  const apiKey = `${SECRET_PREFIX}startup`;
  const connection = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId, apiKey });
  await selectConnection(h, connection);
  const session = await h.createSession();
  const receipt = await runOnce(h, session.id, "q02-receipt");
  assert.equal(receipt.status, "completed");
  await h.runtime.close();

  const state = await readState(dataDir);
  state.providerConfigurationPending = [{ connectionId: connection.id, operation: "connection_save" }];
  await writeState(dataDir, state);
  const again = await reopen(dataDir);
  try {
    const listed = await assertPendingVisible(again, connection.id, "connection_save");
    assert.equal(listed.configurationStatus, "recovery_required");
    assert.equal((await again.api("GET", "/provider-models")).json.models.some((model) => model.provider === connection.providerIdentity), false);
    assert.equal(again.runtime.modelRuntime.getProviderAuthStatus(connection.providerIdentity)?.configured ?? false, false);

    const masked = await again.api("PUT", "/provider-credential", { connectionId: connection.id, apiKey: `${SECRET_PREFIX}masked` });
    assert.equal(masked.status, 409, JSON.stringify(masked.json));
    assert.equal(masked.json?.error?.code, "configuration_recovery_required", JSON.stringify(masked.json));
    assert.equal(detailsOf(masked).connectionId, connection.id, JSON.stringify(masked.json));
    assert.equal(detailsOf(masked).operation, "connection_save", JSON.stringify(masked.json));
    assert.equal(pendingFor(await readState(dataDir), connection.id, "connection_save").length, 1);

    const replay = await again.api("POST", `/sessions/${session.id}/runs`, { input: h.scriptInput([]), commandId: "q02-receipt" });
    assert.equal(replay.status, 200, JSON.stringify(replay.json));
    assert.equal(replay.json.run.id, receipt.id);
    const blocked = await again.api("POST", `/sessions/${session.id}/runs`, { input: h.scriptInput([]), commandId: "q02-new-while-pending" });
    assertConfigurationIncomplete(blocked, connection.id);

    const retried = await again.api("PUT", `/provider-connections/${connection.id}`, {
      api: API,
      baseUrl: connection.baseUrl,
      models: [{ id: modelId }],
      apiKey,
    });
    assert.equal(retried.status, 200, JSON.stringify(retried.json));
    assert.equal(connectionFrom(await connectionList(again), connection.id).configurationStatus, "ready");
    assert.equal(pendingFor(await readState(dataDir), connection.id).length, 0);
    assert.ok((await again.api("GET", "/provider-models")).json.models.some((model) => model.provider === connection.providerIdentity));
    assertNoSecret(again.logs, apiKey);
  } finally {
    await again.runtime.close();
    await fixture.close();
  }
});

test("Q02 · a pending delete with a missing record can be retried to clean credentials", async () => {
  const fixture = await createReviewProviderFixture();
  const h = await boot();
  const dataDir = h.dataDir;
  const modelId = "delete-pending-model";
  const apiKey = `${SECRET_PREFIX}delete`;
  const connection = await saveConnection(h, fixture, { baseUrl: fixture.baseUrl(199), modelId, apiKey });
  await h.api("PUT", "/provider-config", { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" });
  await h.runtime.close();

  const state = await readState(dataDir);
  state.providerConnections = state.providerConnections.filter((candidate) => candidate.id !== connection.id);
  state.providerConfigurationPending = [{ connectionId: connection.id, operation: "connection_delete" }];
  await writeState(dataDir, state);
  const again = await reopen(dataDir);
  try {
    const listed = await assertPendingVisible(again, connection.id, "connection_delete");
    assert.equal(listed, null, "a missing delete target must remain inspectable as pending without a ghost record");
    assert.equal((await again.api("GET", "/provider-models")).json.models.some((model) => model.provider === connection.providerIdentity), false);
    const cleanup = await again.api("DELETE", `/provider-connections/${connection.id}`);
    assert.equal(cleanup.status, 200, JSON.stringify(cleanup.json));
    assert.equal(pendingFor(await readState(dataDir), connection.id).length, 0);
    const credentials = JSON.parse(await readFile(path.join(dataDir, "credentials.json"), "utf8"));
    assert.equal(Object.hasOwn(credentials, connection.id), false);
  } finally {
    await again.runtime.close();
    await fixture.close();
  }
});
