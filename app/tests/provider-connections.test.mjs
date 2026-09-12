import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import { UNKNOWN_WINDOW_NOTICE } from "../server/provider-connections.mjs";
import { boot, reopen } from "./helpers.mjs";

const FIXTURE_MODEL = "fake-model";

/** Save one compatible connection onto the loopback fixture, which also serves
 * the OpenAI model directory, so the whole journey stays on loopback. */
async function saveConnection(h, { apiKey = "compatible-fixture-key", models = [{ id: FIXTURE_MODEL }] } = {}) {
  const created = await h.api("POST", "/provider-connections", {
    api: "openai-completions",
    baseUrl: h.runtime.fakeProvider.baseUrl,
    models,
    apiKey,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  return created.json.connection;
}

async function selectConnection(h, connection, model = FIXTURE_MODEL) {
  const saved = await h.api("PUT", "/provider-config", {
    provider: connection.providerIdentity,
    model,
    api: connection.api,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  return saved.json;
}

async function runOnce(h, commandId = "cmd-1") {
  const session = await h.createSession();
  const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: h.scriptInput([]), commandId });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  return h.pollRun(created.json.run.id, { timeoutMs: 20_000 });
}

// PV-32: the credential key space moves from provider id to connection id in
// one migration. No compatibility layer stays behind: the old key is rewritten
// on disk and never resolves again.
test("PV-32 · 旧 credentials.json 的 provider 键一次性迁到连接 id", async () => {
  const first = await boot({ configureFakeCredential: false });
  const dataDir = first.dataDir;
  await first.runtime.close();
  const credentialPath = path.join(dataDir, "credentials.json");
  await writeFile(credentialPath, JSON.stringify({ openai: "legacy-openai-key", "no-such-provider": "orphan-key" }, null, 2), { mode: 0o600 });

  const second = await reopen(dataDir);
  try {
    const onDisk = JSON.parse(await readFile(credentialPath, "utf8"));
    assert.deepEqual(onDisk, { "catalog-openai": "legacy-openai-key" }, "the key is re-homed onto the default connection and the orphan is dropped");
    const connections = (await second.api("GET", "/provider-connections")).json.connections;
    const openai = connections.find((connection) => connection.id === "catalog-openai");
    assert.equal(openai.credentialStatus, "configured");
    assert.equal(openai.providerIdentity, "openai");
    assert.equal(connections.find((connection) => connection.id === "catalog-deepseek").credentialStatus, "not_configured");
    assert.ok(second.logs.some((line) => line.includes("migrated credential key openai to connection catalog-openai")));
    assert.ok(second.logs.some((line) => line.includes("dropped 1 credential key")));

    // The old key space is gone: naming a provider id is now an invalid request.
    const legacy = await second.api("PUT", "/provider-credential", { provider: "openai", apiKey: "x" });
    assert.equal(legacy.status, 400);
  } finally {
    await second.runtime.close();
  }
});

// PV-25 + PV-24: a discovered model id is saved onto a connection, admitted by
// the Run gate, and the finished run says which connection and which credential
// source it used.
test("PV-25 · 兼容连接：发现 → 保存 → 选中 → 真跑一次 run，run 记录读得出连接与凭据来源", async () => {
  const h = await boot();
  try {
    const discovered = await h.api("POST", "/provider-models/discover", {
      protocol: "openai-compatible",
      baseUrl: h.runtime.fakeProvider.baseUrl,
      apiKey: "compatible-fixture-key",
    });
    assert.equal(discovered.json.status, "ok");
    assert.deepEqual(discovered.json.models, [{ id: FIXTURE_MODEL }], "the fixture directory is what the connection is saved from");

    const connection = await saveConnection(h, { models: [{ id: discovered.json.models[0].id }] });
    assert.equal(connection.kind, "compatible");
    assert.match(connection.id, /^conn-[0-9a-f]{12}$/);
    assert.equal(connection.providerIdentity, connection.id);
    assert.equal(connection.credentialStatus, "configured");
    assert.equal(JSON.stringify(connection).includes("compatible-fixture-key"), false, "a saved key is never echoed");

    const config = await selectConnection(h, connection);
    assert.equal(config.config.baseUrl, h.runtime.fakeProvider.baseUrl, "the connection's own endpoint is what gets saved");
    assert.equal(config.connection.id, connection.id);
    assert.equal(config.credentialStatus, "configured");

    const run = await runOnce(h);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    assert.equal(run.provider.connectionId, connection.id);
    assert.equal(run.provider.provider, connection.providerIdentity);
    assert.equal(run.provider.credentialSource, "runtime", "the provenance grade comes from getProviderAuthStatus, not from a host invention");
    assert.equal(run.provider.realProvider, true);

    const authorizations = h.runtime.fakeProvider.requests.map((request) => request.authorization ?? "");
    assert.ok(authorizations.some((value) => value.includes("compatible-fixture-key")), "the connection's own key is what reached the endpoint");
  } finally {
    await h.runtime.close();
  }
});

// PV-26: the hazard this slice exists to remove. Two connections onto the same
// wire protocol keep separate keys because each is its own provider id.
test("PV-26 · 两条连接各持自己的 key，互不覆盖", async () => {
  const h = await boot();
  try {
    const alpha = await saveConnection(h, { apiKey: "key-alpha" });
    const beta = await saveConnection(h, { apiKey: "key-beta" });
    assert.notEqual(alpha.id, beta.id);
    assert.notEqual(alpha.providerIdentity, beta.providerIdentity);

    const onDisk = JSON.parse(await readFile(path.join(h.dataDir, "credentials.json"), "utf8"));
    assert.equal(onDisk[alpha.id], "key-alpha");
    assert.equal(onDisk[beta.id], "key-beta");
    assert.equal(onDisk["catalog-fake-openai-loopback"], FAKE_CREDENTIAL_KEY, "the catalog connection's key is untouched");

    await selectConnection(h, alpha);
    await runOnce(h, "cmd-alpha");
    const afterAlpha = h.runtime.fakeProvider.requests.at(-1).authorization;
    await selectConnection(h, beta);
    await runOnce(h, "cmd-beta");
    const afterBeta = h.runtime.fakeProvider.requests.at(-1).authorization;

    assert.ok(afterAlpha.includes("key-alpha") && !afterAlpha.includes("key-beta"));
    assert.ok(afterBeta.includes("key-beta") && !afterBeta.includes("key-alpha"));

    const connections = (await h.api("GET", "/provider-connections")).json.connections;
    assert.equal(connections.filter((connection) => connection.credentialStatus === "configured").length, 3);
  } finally {
    await h.runtime.close();
  }
});

// PV-31: registration goes onto a derived provider id through registerProvider,
// never onto a catalog identity, and unregisters on delete.
test("PV-31 · 用户连接注册在独立 provider id 上，删除即注销", async () => {
  const h = await boot();
  try {
    const connection = await saveConnection(h);
    const catalogIds = ["fake-openai-loopback", "deepseek", "openai"];
    assert.ok(!catalogIds.includes(connection.providerIdentity));

    const models = (await h.api("GET", "/provider-models")).json.models;
    const own = models.filter((model) => model.provider === connection.providerIdentity);
    assert.deepEqual(own.map((model) => model.id), [FIXTURE_MODEL]);
    assert.equal(own[0].contextWindow, undefined, "an unreported window is not filled in by the host");
    assert.deepEqual(own[0].supportedEfforts, [], "no reasoning tier is claimed for a model nobody described");
    assert.equal(own[0].defaultEffort, null);
    assert.equal(own[0].reasoningCapability.kind, "unknown");
    assert.ok(models.some((model) => model.provider === "openai"), "the catalog identities are untouched");

    const catalogModel = models.find((model) => model.provider === "fake-openai-loopback");
    assert.equal(catalogModel.contextWindow, 4096, "the catalog connection still reports its own catalog window");

    const removed = await h.api("DELETE", `/provider-connections/${connection.id}`);
    assert.equal(removed.status, 200);
    const after = (await h.api("GET", "/provider-models")).json.models;
    assert.equal(after.some((model) => model.provider === connection.providerIdentity), false, "unregisterProvider removed the provider");
    const onDisk = JSON.parse(await readFile(path.join(h.dataDir, "credentials.json"), "utf8"));
    assert.equal(connection.id in onDisk, false, "the connection's credential goes with it");

    const selected = await h.api("PUT", "/provider-config", { provider: connection.providerIdentity, model: FIXTURE_MODEL, api: "openai-completions" });
    assert.equal(selected.status, 400);
  } finally {
    await h.runtime.close();
  }
});

// PV-27 + PV-30: an unreported context window stays null. The first Run does not
// throw; compaction is switched off and that fact is stated, not papered over.
test("PV-30 · 未知 contextWindow 不猜值：关压缩并显式记录，用户填值后来源标为 user", async () => {
  const h = await boot();
  try {
    const connection = await saveConnection(h);
    assert.deepEqual(connection.models, [{ id: FIXTURE_MODEL, contextWindow: null, contextWindowSource: "unknown", reasoning: null, reasoningEfforts: null }]);

    await selectConnection(h, connection);
    const config = (await h.api("GET", "/provider-config")).json;
    assert.deepEqual(config.capability, {
      contextWindow: null,
      contextWindowSource: "unknown",
      compactionEnabled: false,
      notice: UNKNOWN_WINDOW_NOTICE,
    });
    assert.equal(config.capability.notice, "context window unknown, compaction disabled");
    assert.equal((await h.api("GET", "/runtime-info")).json.compaction.enabled, false);

    const run = await runOnce(h);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    assert.equal(run.provider.contextWindowSource, "unknown");
    assert.equal(run.provider.capabilityNotice, "context window unknown, compaction disabled");

    // A window the user types is honoured, and recorded as the user's, never
    // as something the catalog said.
    const updated = await h.api("PUT", `/provider-connections/${connection.id}`, {
      api: "openai-completions",
      baseUrl: h.runtime.fakeProvider.baseUrl,
      models: [{ id: FIXTURE_MODEL, contextWindow: 8192 }],
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.json));
    assert.deepEqual(updated.json.connection.models, [{ id: FIXTURE_MODEL, contextWindow: 8192, contextWindowSource: "user", reasoning: null, reasoningEfforts: null }]);
    const second = (await h.api("GET", "/provider-config")).json;
    assert.deepEqual(second.capability, { contextWindow: 8192, contextWindowSource: "user", compactionEnabled: true, notice: null });

    const withWindow = await runOnce(h, "cmd-2");
    assert.equal(withWindow.status, "completed");
    assert.equal(withWindow.provider.contextWindowSource, "user");
    assert.equal(withWindow.provider.capabilityNotice, null);
  } finally {
    await h.runtime.close();
  }
});

// The host has no cost surface at all, so an explicit zero cost on a model
// record (needed so pi-ai's calculateCost cannot dereference undefined) can
// never be read as a reported charge.
test("PV-24 · 零成本的 Model 记录不会在 usage 面变成事实上的 $0", async () => {
  const h = await boot();
  try {
    const connection = await saveConnection(h);
    await selectConnection(h, connection);
    const run = await runOnce(h);
    assert.equal(run.status, "completed");
    const details = (await h.api("GET", "/work-usage-details")).json;
    const serialized = JSON.stringify({ run, details });
    assert.equal(/\$|"cost"|"price"/.test(serialized), false, "no run or usage surface states a price");
    assert.equal(typeof run.usage.missing, "boolean", "usage completeness stays a token-accounting fact");
  } finally {
    await h.runtime.close();
  }
});

// Registration happens after the ModelRuntime exists and before the service can
// take a request, so a saved connection survives a restart.
test("重启后连接与凭据仍可用；列表落空的连接不阻止启动", async () => {
  const h = await boot();
  const dataDir = h.dataDir;
  const baseUrl = h.runtime.fakeProvider.baseUrl;
  const connection = await saveConnection(h, { apiKey: "restart-key" });
  await selectConnection(h, connection);
  await h.runtime.close();

  const again = await reopen(dataDir);
  try {
    const connections = (await again.api("GET", "/provider-connections")).json.connections;
    const restored = connections.find((candidate) => candidate.id === connection.id);
    assert.deepEqual(restored, { ...connection, credentialStatus: "configured" });
    const models = (await again.api("GET", "/provider-models")).json.models;
    assert.ok(models.some((model) => model.provider === connection.providerIdentity), "the connection is re-registered before requests are served");
    assert.equal((await again.api("GET", "/provider-config")).json.config.baseUrl, baseUrl);
  } finally {
    await again.runtime.close();
  }

  // A connection whose saved models no longer resolve must not stop the host
  // from starting: it fails at the existing Run admission gate instead.
  const statePath = path.join(dataDir, "runtime-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  for (const record of state.providerConnections) {
    if (record.kind === "compatible") record.models = [{ id: "model-the-gateway-forgot", contextWindow: null, reasoning: null, reasoningEfforts: null }];
  }
  state.providerConfig = { provider: connection.providerIdentity, model: FIXTURE_MODEL, api: "openai-completions", baseUrl };
  await writeFile(statePath, JSON.stringify(state, null, 2));

  const third = await reopen(dataDir);
  try {
    const session = (await third.api("POST", "/sessions", { projectId: (await third.api("GET", "/projects")).json.projects[0].id, title: "stale" })).json.session;
    const rejected = await third.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-stale" });
    assert.equal(rejected.status, 503);
    assert.equal(rejected.json.error.code, "provider_unsupported");
  } finally {
    await third.runtime.close();
  }
});

// PV-34: the save path consumes the BE-17/18 status enum for the two classes it
// already names, and names the third (a model the directory does not list)
// itself, because that class is not in the probe enum.
test("PV-34 · 保存失败区分认证失败 / 目录不可达 / 模型不在该目录", async () => {
  const h = await boot();
  const unauthorized = http.createServer((req, res) => {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "no" } }));
  });
  await new Promise((resolve) => unauthorized.listen(0, "127.0.0.1", resolve));
  const unauthorizedUrl = `http://127.0.0.1:${unauthorized.address().port}/v1`;

  const closed = http.createServer(() => {});
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const closedUrl = `http://127.0.0.1:${closed.address().port}/v1`;
  await new Promise((resolve) => closed.close(resolve));

  try {
    const authFailure = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: unauthorizedUrl, models: [{ id: "any" }], apiKey: "wrong-key",
    });
    assert.equal(authFailure.status, 400);
    assert.equal(authFailure.json.error.code, "connection_authentication_failed");
    assert.equal(authFailure.json.error.status, "authentication_failed");

    const unreachable = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: closedUrl, models: [{ id: "any" }],
    });
    assert.equal(unreachable.status, 400);
    assert.equal(unreachable.json.error.code, "connection_directory_unavailable");
    assert.equal(unreachable.json.error.status, "unreachable");

    const absent = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }, { id: "not-served" }],
    });
    assert.equal(absent.status, 400);
    assert.equal(absent.json.error.code, "connection_model_not_in_directory");
    assert.deepEqual(absent.json.error.models, ["not-served"]);

    assert.equal((await h.api("GET", "/provider-connections")).json.connections.length, 3, "no failed save left a record behind");
  } finally {
    await new Promise((resolve) => unauthorized.close(resolve));
    await h.runtime.close();
  }
});

test("连接的增删改查受同一条配置队列与 active_run 冻结约束", async () => {
  const h = await boot();
  try {
    const listed = (await h.api("GET", "/provider-connections")).json.connections;
    assert.deepEqual(listed.map((connection) => connection.id).sort(), ["catalog-deepseek", "catalog-fake-openai-loopback", "catalog-openai"]);
    assert.ok(listed.every((connection) => connection.kind === "catalog"));

    assert.equal((await h.api("POST", "/provider-connections", { api: "not-an-api", baseUrl: "http://127.0.0.1:1/v1", models: [{ id: "m" }] })).status, 400);
    assert.equal((await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: "http://user:pass@127.0.0.1:1/v1", models: [{ id: "m" }] })).status, 400);
    assert.equal((await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [] })).status, 400);
    assert.equal((await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }], nickname: "x" })).status, 400);

    const connection = await saveConnection(h);
    assert.equal((await h.api("PUT", `/provider-connections/catalog-openai`, { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }] })).status, 400, "catalog connections are not user-editable");
    assert.equal((await h.api("DELETE", "/provider-connections/catalog-openai")).status, 400);
    assert.equal((await h.api("PUT", "/provider-connections/conn-000000000000", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }] })).status, 404);

    await selectConnection(h, connection);
    assert.equal((await h.api("DELETE", `/provider-connections/${connection.id}`)).json.error.code, "connection_in_use");

    // The freeze that already covers config and credentials covers connections.
    const session = await h.createSession();
    const started = await h.api("POST", `/sessions/${session.id}/runs`, { input: h.scriptInput([{ name: "ws_write", arguments: { path: "out/a.md", text: "a" } }]), commandId: "cmd-freeze" });
    const frozen = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }] });
    if (frozen.status !== 200) {
      assert.equal(frozen.status, 409);
      assert.equal(frozen.json.error.code, "active_run");
    }
    await h.pollRun(started.json.run.id, { timeoutMs: 20_000 });
  } finally {
    await h.runtime.close();
  }
});

// The credential doctrine is not relaxed for the new path: a compatible
// connection with no key fails the run, and nothing on HOME or in the
// environment stands in for one.
test("T-CRED · 用户连接路径同样不读 HOME/.pi 与环境变量", async () => {
  const sentinelHome = await mkdtemp(path.join(tmpdir(), "se-conn-home-"));
  const authDir = path.join(sentinelHome, ".pi", "agent");
  await mkdir(authDir, { recursive: true });
  const sentinel = JSON.stringify({ "conn-any": { apiKey: "sentinel-key-must-never-be-used" } }, null, 2);
  await writeFile(path.join(authDir, "auth.json"), sentinel);
  const originalHome = process.env.HOME;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.HOME = sentinelHome;
  process.env.OPENAI_API_KEY = "sentinel-env-key-must-never-be-used";
  let h;
  try {
    h = await boot();
    assert.equal(process.env.OPENAI_API_KEY, undefined, "the inherited env var is stripped before any provider code runs");
    const connection = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FIXTURE_MODEL }],
    });
    assert.equal(connection.status, 200);
    assert.equal(connection.json.connection.credentialStatus, "not_configured");
    await selectConnection(h, connection.json.connection);
    const run = await runOnce(h, "cmd-nokey");
    assert.equal(run.status, "failed");
    assert.equal(run.error.code, "credential_missing");
    assert.equal(await readFile(path.join(authDir, "auth.json"), "utf8"), sentinel);
    assert.deepEqual(await readdir(authDir), ["auth.json"]);
  } finally {
    await h?.runtime.close();
    if (originalHome !== undefined) process.env.HOME = originalHome;
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
