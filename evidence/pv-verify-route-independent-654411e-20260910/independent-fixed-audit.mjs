#!/usr/bin/env node

/*
 * Independent, provider-free recheck for 654411e. The migration fixture and
 * route fixture use separate temporary directories and loopback-only servers;
 * every non-loopback fetch is blocked before it can leave the process.
 */

import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.env.APP_ROOT || path.resolve(evidenceDir, "../../app");

async function importFrom(relative) {
  return import(pathToFileURL(path.join(appRoot, relative)).href);
}

async function migrationProbe() {
  const { RuntimeStore } = await importFrom("server/store.mjs");
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-fixed-independent-migration-"));
  const statePath = path.join(dataDir, "runtime-state.json");
  const pending = [
    { connectionId: "conn-missing-save", operation: "connection_save" },
    { connectionId: "conn-missing-delete", operation: "connection_delete" },
    { connectionId: "conn-missing-credential-set", operation: "credential_set" },
    { connectionId: "conn-missing-credential-delete", operation: "credential_delete" },
  ];
  let store;
  try {
    // Start from a valid current state, then downgrade only its versioned
    // shape. Every pending ID is deliberately absent from providerConnections.
    store = await new RuntimeStore({ dataDir }).open();
    for (const marker of pending) await store.beginProviderConfiguration(marker.connectionId, marker.operation);
    const schema11 = store.snapshot();
    await store.close();
    store = null;
    schema11.schemaVersion = 11;
    delete schema11.providerConfigVersion;
    delete schema11.providerVerifications;
    const original = Buffer.from(JSON.stringify(schema11, null, 2) + "\n");
    await writeFile(statePath, original);
    const digest = createHash("sha256").update(original).digest("hex");
    const backupPath = path.join(dataDir, `runtime-state.schema11.${digest}.json`);

    store = await new RuntimeStore({ dataDir }).open();
    const upgradedPending = store.getProviderConfigurationPending();
    const upgradedState = store.snapshot();
    await store.close();
    store = null;
    const backupExact = (await readFile(backupPath)).equals(original);
    const upgradedBytesDiffer = !(await readFile(statePath)).equals(original);

    store = await new RuntimeStore({ dataDir }).open();
    const reopenedPending = store.getProviderConfigurationPending();
    await store.finishProviderConfiguration(pending[0].connectionId);
    const afterOneExplicitFinish = store.getProviderConfigurationPending();
    await store.close();
    store = null;

    const result = {
      inputSchema: 11,
      inputPending: pending,
      upgradedSchema: upgradedState.schemaVersion,
      upgradedPending,
      reopenedPending,
      afterOneExplicitFinish,
      backupExact,
      upgradedBytesDiffer,
      providerConfigVersionReset: upgradedState.providerConfigVersion === 0,
      providerVerificationsReset: JSON.stringify(upgradedState.providerVerifications) === "[]",
      pendingPreserved: JSON.stringify(upgradedPending) === JSON.stringify(pending),
      reopenPreserved: JSON.stringify(reopenedPending) === JSON.stringify(pending),
      finishOnlyRemovesOne: JSON.stringify(afterOneExplicitFinish) === JSON.stringify(pending.slice(1)),
    };
    result.migrationPass = Object.entries(result)
      .filter(([key]) => ["backupExact", "upgradedBytesDiffer", "providerConfigVersionReset", "providerVerificationsReset", "pendingPreserved", "reopenPreserved", "finishOnlyRemovesOne"].includes(key))
      .every(([, value]) => value === true);
    assert.equal(result.upgradedSchema, 12);
    assert.equal(result.migrationPass, true, JSON.stringify(result));
    return result;
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
}

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input && typeof input.url === "string") return input.url;
  return String(input ?? "");
}

async function routeProbe() {
  const { startServer } = await importFrom("server/index.mjs");
  const { FAKE_MODEL_ID } = await importFrom("runtime/pi-session-runtime.mjs");
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-fixed-independent-route-"));
  const localHits = [];
  const blockedExternal = [];
  const hostFetch = globalThis.fetch;
  let localServer;
  let runtime;
  try {
    localServer = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { /* record null */ }
        localHits.push({
          method: req.method,
          url: req.url,
          authorization: req.headers.authorization ?? null,
          body,
        });
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "independent local authentication marker" } }));
      });
    });
    await new Promise((resolve, reject) => {
      localServer.once("error", reject);
      localServer.listen(0, "127.0.0.1", resolve);
    });
    const configuredBaseUrl = `http://127.0.0.1:${localServer.address().port}/v1`;
    runtime = await startServer({ dataDir, port: 0, logger: () => {} });
    const fakeBaseUrl = runtime.fakeProvider.baseUrl;

    // Host API requests use the saved original fetch. Provider requests may
    // reach only the two loopback fixtures; a non-loopback URL is evidence of
    // a route leak and is blocked before any network I/O.
    globalThis.fetch = async (input, init) => {
      const url = requestUrl(input);
      if (url.startsWith(configuredBaseUrl) || url.startsWith(fakeBaseUrl)) return hostFetch(input, init);
      blockedExternal.push(url);
      throw new Error("independent fixed audit blocked non-loopback provider request");
    };
    async function api(method, requestPath, body) {
      const response = await hostFetch(runtime.url + "/api/v5" + requestPath, {
        method,
        headers: { "content-type": "application/json", "x-work-token": runtime.token },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, json: text ? JSON.parse(text) : null };
    }

    const credential = await api("PUT", "/provider-credential", {
      connectionId: "catalog-openai",
      apiKey: "independent-fixed-route-key",
    });
    assert.equal(credential.status, 200, JSON.stringify(credential.json));
    const openaiModels = (await api("GET", "/provider-models")).json.models.filter((model) => model.provider === "openai");
    assert.ok(openaiModels.length >= 2, "the installed OpenAI catalog must provide two models for the alternate-model check");
    const [selected, alternate] = openaiModels;
    const config = await api("PUT", "/provider-config", {
      provider: "openai",
      model: selected.id,
      api: "openai-completions",
      baseUrl: configuredBaseUrl,
    });
    assert.equal(config.status, 200, JSON.stringify(config.json));
    assert.equal(config.json.config.baseUrl, configuredBaseUrl);

    const activeReceipts = [];
    for (const model of [selected, alternate]) {
      const verification = await api("POST", "/provider-connections/catalog-openai/verify", { model: model.id });
      assert.equal(verification.status, 200, JSON.stringify(verification.json));
      assert.equal(verification.json.status, "authentication_failed", JSON.stringify(verification.json));
      assert.equal(verification.json.httpStatus, 401, JSON.stringify(verification.json));
      activeReceipts.push({ id: model.id, receipt: verification.json });
    }
    assert.equal(localHits.length, 2, JSON.stringify(localHits));
    assert.deepEqual(localHits.map((hit) => [hit.method, hit.url, hit.body?.model]), [
      ["POST", "/v1/chat/completions", selected.id],
      ["POST", "/v1/chat/completions", alternate.id],
    ]);
    assert.equal(blockedExternal.length, 0, JSON.stringify(blockedExternal));

    // The selected identity is openai, but fake is inactive. Its verify must
    // use the fake model's own registered route, not openai's custom endpoint.
    const localHitsBeforeInactive = localHits.length;
    const fakeRequestsBeforeInactive = runtime.fakeProvider.requests.length;
    const inactive = await api("POST", "/provider-connections/catalog-fake-openai-loopback/verify", { model: FAKE_MODEL_ID });
    assert.equal(inactive.status, 200, JSON.stringify(inactive.json));
    assert.equal(inactive.json.status, "ok", JSON.stringify(inactive.json));
    const fakeRequests = runtime.fakeProvider.requests.slice(fakeRequestsBeforeInactive);
    assert.ok(fakeRequests.length > 0, "inactive fake identity should reach its own registered loopback");
    assert.equal(fakeRequests.at(-1).body.model, FAKE_MODEL_ID, JSON.stringify(fakeRequests.at(-1)));
    assert.equal(localHits.length, localHitsBeforeInactive, "inactive identity must not borrow the active openai endpoint");
    assert.equal(blockedExternal.length, 0, JSON.stringify(blockedExternal));

    return {
      configuredBaseUrl,
      selectedModel: selected.id,
      alternateModel: alternate.id,
      activeReceipts: activeReceipts.map(({ id, receipt }) => ({ model: id, status: receipt.status, httpStatus: receipt.httpStatus })),
      activeLocalHits: localHits.map((hit) => ({ method: hit.method, url: hit.url, model: hit.body?.model })),
      inactiveIdentity: "catalog-fake-openai-loopback",
      inactiveModel: FAKE_MODEL_ID,
      inactiveOwnRouteBaseUrl: fakeBaseUrl,
      inactiveFakeRequests: fakeRequests.map((request) => ({ model: request.body?.model, authorizationPresent: Boolean(request.authorization) })),
      inactiveBorrowedActiveRoute: localHits.length !== localHitsBeforeInactive,
      blockedExternal,
      externalNetworkAttempts: blockedExternal.length,
      routePass: activeReceipts.every(({ receipt }) => receipt.status === "authentication_failed" && receipt.httpStatus === 401)
        && localHits.every((hit) => hit.method === "POST" && hit.url === "/v1/chat/completions")
        && fakeRequests.length > 0
        && fakeRequests.at(-1).body?.model === FAKE_MODEL_ID
        && localHits.length === localHitsBeforeInactive
        && blockedExternal.length === 0,
    };
  } finally {
    globalThis.fetch = hostFetch;
    await runtime?.close().catch(() => {});
    if (localServer) await new Promise((resolve) => localServer.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
}

const result = {
  commit: "654411e2058c3d40abe74751ba6dbe1742133a9e",
  migration: await migrationProbe(),
  route: await routeProbe(),
};
assert.equal(result.migration.migrationPass, true, JSON.stringify(result.migration));
assert.equal(result.route.routePass, true, JSON.stringify(result.route));
console.log(JSON.stringify(result, null, 2));
