#!/usr/bin/env node

/*
 * Independent, provider-free probes for the PV schema migration and verify
 * route.  The script imports the application under test by an explicit app
 * root so the same fixture can be run against two immutable checkouts without
 * copying or modifying product files.
 *
 * Usage:
 *   BB_APP_ROOT=/path/to/bb/app FIXED_APP_ROOT=/path/to/792/app \
 *     node evidence/pv-sd-independent-backend-20260910/independent-backend-audit.mjs
 */

import http from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const defaultBbRoot = path.resolve(evidenceDir, "../../app");
const bbRoot = process.env.BB_APP_ROOT || defaultBbRoot;
const fixedRoot = process.env.FIXED_APP_ROOT || "/private/tmp/cw-pv-sd-integration-20260910/app";

function equalJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function importFrom(root, relative) {
  return import(pathToFileURL(path.join(root, relative)).href);
}

async function migrationProbe(root, label) {
  const { RuntimeStore } = await importFrom(root, "server/store.mjs");
  const dataDir = await mkdtemp(path.join(tmpdir(), `cw-independent-${label}-`));
  const statePath = path.join(dataDir, "runtime-state.json");
  const pending = [
    { connectionId: "conn-missing-save", operation: "connection_save" },
    { connectionId: "conn-missing-delete", operation: "connection_delete" },
    { connectionId: "conn-missing-credential-set", operation: "credential_set" },
    { connectionId: "conn-missing-credential-delete", operation: "credential_delete" },
  ];
  let store;
  const logs = [];
  try {
    // Build a valid current state, then downgrade only the versioned shape.
    // All four IDs intentionally have no provider record: the migration must
    // preserve recovery fences even when the record they mention is missing.
    store = await new RuntimeStore({ dataDir, logger: (line) => logs.push(line) }).open();
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

    store = await new RuntimeStore({ dataDir, logger: (line) => logs.push(line) }).open();
    const upgradedPending = store.getProviderConfigurationPending();
    const upgradedState = store.snapshot();
    await store.close();
    store = null;
    const backupExact = (await readFile(backupPath)).equals(original);
    const upgradedBytes = await readFile(statePath);

    store = await new RuntimeStore({ dataDir, logger: (line) => logs.push(line) }).open();
    const reopenedPending = store.getProviderConfigurationPending();
    await store.finishProviderConfiguration(pending[0].connectionId);
    const afterOneFinish = store.getProviderConfigurationPending();
    await store.close();
    store = null;

    const pendingPreserved = equalJson(upgradedPending, pending);
    const reopenPreserved = equalJson(reopenedPending, pending);
    const finishOnlyRemovesOne = equalJson(afterOneFinish, pending.slice(1));
    const result = {
      root: root,
      label,
      inputSchema: 11,
      inputPending: pending,
      upgradedSchema: upgradedState.schemaVersion,
      upgradedPending,
      reopenedPending,
      afterOneExplicitFinish: afterOneFinish,
      backupExact,
      upgradedBytesDiffer: !upgradedBytes.equals(original),
      providerConfigVersionReset: upgradedState.providerConfigVersion === 0,
      providerVerificationsReset: equalJson(upgradedState.providerVerifications, []),
      pendingPreserved,
      reopenPreserved,
      finishOnlyRemovesOne,
      migrationCorrect: pendingPreserved && backupExact && reopenPreserved && finishOnlyRemovesOne,
      logs: logs.filter((line) => line.includes("upgraded schema")),
    };
    return result;
  } catch (error) {
    return {
      root,
      label,
      inputSchema: 11,
      inputPending: pending,
      migrationCorrect: false,
      error: { name: error?.name, code: error?.code, message: error?.message },
    };
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

async function routeProbe(root, label) {
  const { startServer } = await importFrom(root, "server/index.mjs");
  const dataDir = await mkdtemp(path.join(tmpdir(), `cw-independent-route-${label}-`));
  const localHits = [];
  const blockedExternal = [];
  let localServer;
  let runtime;
  const hostFetch = globalThis.fetch;
  try {
    localServer = http.createServer((req, res) => {
      localHits.push({ method: req.method, url: req.url, authorization: req.headers.authorization ?? null });
      req.resume();
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "independent local route marker" } }));
    });
    await new Promise((resolve, reject) => {
      localServer.once("error", reject);
      localServer.listen(0, "127.0.0.1", resolve);
    });
    const localBaseUrl = `http://127.0.0.1:${localServer.address().port}/v1`;
    runtime = await startServer({ dataDir, port: 0, logger: () => {} });

    // Keep host API calls on the original fetch.  The service's verify path
    // uses the global fetch through its wrapped SDK transport, so every
    // provider target is observable and non-loopback requests are blocked.
    globalThis.fetch = async (input, init) => {
      const url = requestUrl(input);
      if (url.startsWith(localBaseUrl)) return hostFetch(input, init);
      blockedExternal.push(url);
      throw new Error("independent audit blocked external provider request");
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

    const model = "gpt-4";
    const credential = await api("PUT", "/provider-credential", {
      connectionId: "catalog-openai",
      apiKey: "independent-route-audit-key",
    });
    const config = await api("PUT", "/provider-config", {
      provider: "openai",
      model,
      api: "openai-completions",
      baseUrl: localBaseUrl,
    });
    const verification = await api("POST", "/provider-connections/catalog-openai/verify", { model });
    return {
      root,
      label,
      credentialStatus: credential.status,
      configStatus: config.status,
      configuredBaseUrl: config.json?.config?.baseUrl ?? null,
      verifyHttpStatus: verification.status,
      receiptStatus: verification.json?.status ?? null,
      receiptHttpStatus: verification.json?.httpStatus ?? null,
      localHits,
      blockedExternal,
      configuredEndpointUsed: localHits.length > 0,
      routeCounterexample: localHits.length === 0 && blockedExternal.length > 0,
    };
  } catch (error) {
    return {
      root,
      label,
      localHits,
      blockedExternal,
      routeCounterexample: false,
      error: { name: error?.name, code: error?.code, message: error?.message },
    };
  } finally {
    globalThis.fetch = hostFetch;
    await runtime?.close().catch(() => {});
    if (localServer) await new Promise((resolve) => localServer.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
}

const results = {
  migration: {
    bb21027: await migrationProbe(bbRoot, "bb21027"),
    "792174c": await migrationProbe(fixedRoot, "792174c"),
  },
  route: {
    bb21027: await routeProbe(bbRoot, "bb21027"),
    "792174c": await routeProbe(fixedRoot, "792174c"),
  },
};

// The expected matrix is deliberately explicit: the old checkout must retain
// the independent migration failure, the fixed checkout must pass migration,
// and both currently retain the separately reported verify-route issue.
const expected = {
  migrationBbFails: results.migration.bb21027.migrationCorrect === false,
  migrationFixedPasses: results.migration["792174c"].migrationCorrect === true,
  routeBbFails: results.route.bb21027.routeCounterexample === true,
  routeFixedStillFails: results.route["792174c"].routeCounterexample === true,
};
results.expectedMatrix = expected;
results.matrixMatches = Object.values(expected).every(Boolean);
console.log(JSON.stringify(results, null, 2));
if (!results.matrixMatches) process.exitCode = 1;
