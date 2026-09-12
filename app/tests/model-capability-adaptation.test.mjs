import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { FAKE_MODEL_ID, FAKE_PROVIDER_ID } from "../runtime/pi-session-runtime.mjs";
import { RuntimeStore } from "../server/store.mjs";
import { boot } from "./helpers.mjs";

const FAKE_CATALOG_ID = `catalog-${FAKE_PROVIDER_ID}`;

test("model capability contract: legacy boolean is not promoted into invented effort tiers; explicit per-model lists stay isolated", async () => {
  const h = await boot();
  try {
    const saved = await h.api("PUT", `/provider-connections/${FAKE_CATALOG_ID}`, {
      models: [
        { id: "legacy-reasoning-true", reasoning: true },
        { id: "explicit-low", reasoning: true, reasoningEfforts: ["low"] },
        { id: "explicit-high", reasoning: false, reasoningEfforts: ["high", "max"] },
      ],
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const catalog = await h.api("GET", "/provider-models");
    assert.equal(catalog.status, 200);
    assert.equal(typeof catalog.json.version, "number");
    const rows = Object.fromEntries(catalog.json.models
      .filter((row) => row.provider === FAKE_PROVIDER_ID)
      .map((row) => [row.id, row]));

    assert.deepEqual(rows["legacy-reasoning-true"].supportedEfforts, [], "legacy true means reasoning is declared, not that any exact tier is known");
    assert.equal(rows["legacy-reasoning-true"].defaultEffort, null);
    assert.ok(rows["legacy-reasoning-true"].reasoningCapability);
    assert.deepEqual(rows["explicit-low"].supportedEfforts, ["low"]);
    assert.deepEqual(rows["explicit-high"].supportedEfforts, ["high", "max"]);
    assert.equal(rows["explicit-low"].reasoningCapability.source, "user-declared");
    assert.deepEqual(rows["explicit-low"].reasoningByApi["openai-completions"].values, ["low"]);

    const connectionA = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, apiKey: "capability-a",
      models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["low"] }],
    });
    const connectionB = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, apiKey: "capability-b",
      models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["high"] }],
    });
    assert.equal(connectionA.status, 200, JSON.stringify(connectionA.json));
    assert.equal(connectionB.status, 200, JSON.stringify(connectionB.json));
    const compatibleRows = (await h.api("GET", "/provider-models")).json.models
      .filter((row) => row.id === FAKE_MODEL_ID && row.provider !== FAKE_PROVIDER_ID);
    assert.deepEqual(compatibleRows.map((row) => [row.provider, row.supportedEfforts]).sort((a, b) => a[0].localeCompare(b[0])), [
      [connectionA.json.connection.providerIdentity, ["low"]],
      [connectionB.json.connection.providerIdentity, ["high"]],
    ].sort((a, b) => a[0].localeCompare(b[0])), "same model id on distinct connections keeps its own capability declaration");

    const connection = (await h.api("GET", "/provider-connections")).json.connections.find((item) => item.id === FAKE_CATALOG_ID);
    assert.deepEqual(connection.models.find((item) => item.id === "explicit-low").reasoningEfforts, ["low"]);
    assert.equal(connection.models.find((item) => item.id === "legacy-reasoning-true").reasoningEfforts, null);
    assert.equal(connection.models.find((item) => item.id === "explicit-high").reasoning, true, "an explicit new list supersedes the legacy boolean consistently with adapter registration");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("model capability contract: effort lists reject invalid values; config CAS detects missing and stale writers", async () => {
  const h = await boot();
  try {
    for (const invalid of [["bogus"], ["low", "low"], ["low", 42], "high"]) {
      const rejected = await h.api("PUT", `/provider-connections/${FAKE_CATALOG_ID}`, {
        models: [{ id: `invalid-${JSON.stringify(invalid)}`, reasoningEfforts: invalid }],
      });
      assert.equal(rejected.status, 400, JSON.stringify(rejected.json));
    }

    const initial = (await h.api("GET", "/provider-config")).json;
    assert.equal(typeof initial.version, "number");
    const body = { ...initial.config, provider: FAKE_PROVIDER_ID, model: FAKE_MODEL_ID, api: "openai-completions" };
    const missing = await h.api("PUT", "/provider-config", body, { rawConfig: true });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.error.code, "invalid_config_version");

    const expectedVersion = initial.version;
    const [firstReader, secondReader] = await Promise.all([
      h.api("GET", "/provider-config"), h.api("GET", "/provider-config"),
    ]);
    assert.equal(firstReader.json.version, expectedVersion);
    assert.equal(secondReader.json.version, expectedVersion);
    const writes = await Promise.all([
      h.api("PUT", "/provider-config", { ...body, expectedVersion: firstReader.json.version }),
      h.api("PUT", "/provider-config", { ...body, expectedVersion: secondReader.json.version }),
    ]);
    assert.equal(writes.filter((result) => result.status === 200).length, 1, JSON.stringify(writes));
    assert.equal(writes.filter((result) => result.status === 409 && result.json.error.code === "config_conflict").length, 1, JSON.stringify(writes));
    assert.equal((await h.api("GET", "/provider-config")).json.version, expectedVersion + 1);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("installed model descriptors are API-specific and preserve exact concrete effort ladders", async () => {
  const h = await boot();
  try {
    const catalog = (await h.api("GET", "/provider-models")).json;
    const models = Object.fromEntries(catalog.models
      .filter((row) => row.provider === "openai" || row.provider === "deepseek")
      .map((row) => [`${row.provider}/${row.id}`, row]));
    const astra = models["openai/gpt-6-astra"];
    assert.ok(astra);
    for (const api of ["openai-completions", "openai-responses"]) {
      assert.deepEqual(astra.reasoningByApi[api].values, ["low", "medium", "high", "xhigh", "max"]);
      assert.ok(!astra.reasoningByApi[api].values.includes("off"));
      assert.ok(!astra.reasoningByApi[api].values.includes("minimal"));
      const unsupported = await h.api("PUT", "/provider-config", {
        provider: "openai", model: "gpt-6-astra", api, reasoningEffort: "off",
      });
      assert.equal(unsupported.status, 400);
      assert.equal(unsupported.json.error.code, "invalid_effort");
      const minimal = await h.api("PUT", "/provider-config", {
        provider: "openai", model: "gpt-6-astra", api, reasoningEffort: "minimal",
      });
      assert.equal(minimal.status, 400);
      assert.equal(minimal.json.error.code, "invalid_effort");
      const accepted = await h.api("PUT", "/provider-config", {
        provider: "openai", model: "gpt-6-astra", api, reasoningEffort: "low",
      });
      assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    }
    assert.deepEqual(models["deepseek/deepseek-v4-flash"].supportedEfforts, ["low", "high", "max"]);
    assert.deepEqual(models["deepseek/deepseek-v4-pro"].supportedEfforts, ["high", "max"]);

    const endpointOverride = await h.api("PUT", "/provider-config", {
      provider: "deepseek", model: "deepseek-v4-flash", api: "openai-completions",
      baseUrl: "https://override.example.test/v1", reasoningEffort: "low",
    });
    assert.equal(endpointOverride.status, 400);
    assert.equal(endpointOverride.json.error.code, "invalid_effort", "catalog capability is not transplanted to a different endpoint");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("editing a connection invalidates selected effort, and each Run freezes a capability binding across reopen", async () => {
  const h = await boot();
  try {
    const created = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, apiKey: "run-capability-key",
      models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["low"] }],
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const connection = created.json.connection;
    const selected = await h.api("PUT", "/provider-config", {
      provider: connection.providerIdentity, model: FAKE_MODEL_ID, api: connection.api, reasoningEffort: "low",
    });
    assert.equal(selected.status, 200, JSON.stringify(selected.json));
    const session = await h.createSession();
    const made = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "capability-binding", input: "hello",
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const completed = await h.pollRun(made.json.run.id);
    assert.equal(completed.status, "completed", JSON.stringify(completed.error ?? null));
    assert.deepEqual(completed.provider.reasoningBinding.values, ["low"]);
    assert.equal(completed.provider.reasoningBinding.configVersion, selected.json.version);

    const changed = await h.api("PUT", `/provider-connections/${connection.id}`, {
      api: connection.api, baseUrl: connection.baseUrl, models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["high"] }],
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.json));
    const rejected = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "invalidated-capability", input: "hello",
    });
    assert.equal(rejected.status, 503);
    assert.equal(rejected.json.error.code, "effort_unsupported");

    const dataDir = h.dataDir;
    await h.runtime.close();
    const { reopen } = await import("./helpers.mjs");
    const again = await reopen(dataDir);
    try {
      const persisted = (await again.api("GET", `/runs/${completed.id}`)).json.run;
      assert.deepEqual(persisted.provider.reasoningBinding, completed.provider.reasoningBinding);
      assert.equal(persisted.status, "completed");
    } finally { await again.runtime.close(); }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("schema12→13 migration preserves config and active Run, adds unknown capability, bumps CAS epoch, and invalidates old receipt", async () => {
  const h = await boot();
  let store;
  const dataDir = h.dataDir;
  try {
    const session = await h.createSession();
    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "hold-during-migration",
      input: "/fixture question",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const waiting = await h.pollRun(started.json.run.id, { until: (status) => status === "waiting_user", timeoutMs: 10_000 });
    assert.equal(waiting.status, "waiting_user");

    const beforeClose = (await h.api("GET", "/provider-config")).json;
    const configResponse = (await h.api("GET", "/provider-config")).json;
    const config = configResponse.config;
    const activeSnapshot = h.runtime.store.snapshot();
    await h.runtime.close();

    const statePath = path.join(dataDir, "runtime-state.json");
    const raw12 = activeSnapshot;
    raw12.schemaVersion = 12;
    raw12.providerConfig = config;
    raw12.providerConfigVersion = 7;
    raw12.providerVerifications = [{
      connectionId: FAKE_CATALOG_ID,
      model: "legacy-true",
      status: "ok",
      message: "The model answered.",
      observedModel: "legacy-true",
      replyFirstLine: "ok",
      latencyMs: 1,
      checkedAt: new Date().toISOString(),
      credentialSource: "runtime",
      binding: { providerConfigVersion: 7, credentialGeneration: raw12.credentialGeneration },
      httpStatus: 200,
    }];
    const legacyConnection = raw12.providerConnections.find((item) => item.id === FAKE_CATALOG_ID);
    legacyConnection.models = [{ id: "legacy-true", contextWindow: null, reasoning: true }];
    for (const run of raw12.runs) delete run.provider.reasoningBinding;
    const originalBytes = Buffer.from(JSON.stringify(raw12, null, 2) + "\n");
    await writeFile(statePath, originalBytes);

    store = await new RuntimeStore({ dataDir }).open();
    const upgraded = store.snapshot();
    assert.equal(upgraded.schemaVersion, 13);
    assert.deepEqual(upgraded.providerConfig, config, "the chosen host-global descriptor survives the upgrade");
    assert.equal(upgraded.providerConfigVersion, 8, "migration advances the shared epoch so old verification bindings become stale");
    assert.deepEqual(upgraded.providerVerifications, raw12.providerVerifications, "historical receipt is retained for audit");
    assert.equal(upgraded.providerVerifications[0].binding.providerConfigVersion, 7);
    assert.equal(upgraded.providerConfigVersion === upgraded.providerVerifications[0].binding.providerConfigVersion, false);
    assert.deepEqual(upgraded.providerConnections.find((item) => item.id === FAKE_CATALOG_ID).models, [
      { id: "legacy-true", contextWindow: null, reasoning: true, reasoningEfforts: null },
    ]);
    assert.equal(upgraded.runs.find((run) => run.id === waiting.id).status, "waiting_user", "migration preserves live recovery state");

    const digest = createHash("sha256").update(originalBytes).digest("hex");
    assert.deepEqual(await readFile(path.join(dataDir, `runtime-state.schema12.${digest}.json`)), originalBytes, "backup preserves exact schema12 bytes");
    await store.close();
    store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.getProviderConfigVersion(), 8);
    assert.equal(store.getRun(waiting.id).status, "waiting_user");
    assert.equal(beforeClose.version <= 7, true);
  } finally {
    await store?.close();
    await h.runtime.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});
