import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FAKE_CREDENTIAL_KEY, FAKE_MODEL_ID, FAKE_PROVIDER_ID } from "../runtime/pi-session-runtime.mjs";
import { FIXTURE_WRONG_KEY, createFakeOpenAiProvider } from "../runtime/fake-provider.mjs";
import { boot, reopen } from "./helpers.mjs";

// WO-PV-BE03: PV-59 (open admission), PV-61 (reasoning tri-state), PV-62
// (接入回执 / BE-39 verify), PV-42 (receipt persistence & invalidation).

const FAKE_CATALOG_ID = "catalog-" + FAKE_PROVIDER_ID;

async function putCatalogModels(h, models, id = FAKE_CATALOG_ID) {
  return h.api("PUT", `/provider-connections/${id}`, { models });
}

async function selectFakeCatalog(h, model = FAKE_MODEL_ID) {
  const saved = await h.api("PUT", "/provider-config", { provider: FAKE_PROVIDER_ID, model, api: "openai-completions" });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  return saved.json;
}

async function runOnce(h, commandId = "cmd-1") {
  const session = await h.createSession();
  const created = await h.api("POST", `/sessions/${session.id}/runs`, { input: h.scriptInput([]), commandId });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  return h.pollRun(created.json.run.id, { timeoutMs: 20_000 });
}

// PV-59 ①: a catalog connection's PUT accepts and accepts only {models}.
test("PV-59 · 目录连接 PUT 只接受 models；api/baseUrl/apiKey 出现即 400", async () => {
  const h = await boot();
  try {
    const withApiField = await h.api("PUT", `/provider-connections/${FAKE_CATALOG_ID}`, { api: "openai-completions", models: [{ id: "extra-a" }] });
    assert.equal(withApiField.status, 400);
    assert.equal(withApiField.json.error.code, "invalid_connection");
    const withBaseUrl = await h.api("PUT", `/provider-connections/${FAKE_CATALOG_ID}`, { baseUrl: "http://127.0.0.1:1/v1", models: [{ id: "extra-a" }] });
    assert.equal(withBaseUrl.status, 400);
    assert.equal(withBaseUrl.json.error.code, "invalid_connection");
    const withKey = await h.api("PUT", `/provider-connections/${FAKE_CATALOG_ID}`, { apiKey: "x", models: [{ id: "extra-a" }] });
    assert.equal(withKey.status, 400);

    // The clean {models} form succeeds.
    const clean = await putCatalogModels(h, [{ id: "extra-a" }]);
    assert.equal(clean.status, 200, JSON.stringify(clean.json));
    assert.equal(clean.json.connection.kind, "catalog");
    assert.deepEqual(clean.json.connection.models, [{ id: "extra-a", contextWindow: null, contextWindowSource: "catalog", reasoning: null }]);
  } finally {
    await h.runtime.close();
  }
});

// PV-59 ②: an id already in the installed catalog cannot be shadowed by an extra.
test("PV-59 · 追加的模型 id 不得与已装目录冲突", async () => {
  const h = await boot();
  try {
    const shadow = await putCatalogModels(h, [{ id: FAKE_MODEL_ID }]);
    assert.equal(shadow.status, 400);
    assert.equal(shadow.json.error.code, "invalid_connection");
    assert.deepEqual(shadow.json.error.models, [FAKE_MODEL_ID]);
  } finally {
    await h.runtime.close();
  }
});

// PV-59 ③: an extra model is admissible for selection and Run, the native
// model keeps working alongside it, and removing the extra (a shorter PUT)
// closes the Run gate again without disturbing the native identity.
test("PV-59 · 目录连接加一个不在已装目录的模型：可保存、可选为生效、run 发起门放行；删掉后 run 发起门 503；原生模型仍可解析", async () => {
  const h = await boot();
  try {
    const extraId = "fake-extra-model";
    const saved = await putCatalogModels(h, [{ id: extraId }]);
    assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const models = (await h.api("GET", "/provider-models")).json.models;
    const extraRow = models.find((model) => model.id === extraId);
    assert.ok(extraRow, "the extra model resolves through pi");
    assert.equal(extraRow.provider, FAKE_PROVIDER_ID);
    assert.equal(extraRow.origin, "connection");
    const nativeRow = models.find((model) => model.id === FAKE_MODEL_ID && model.provider === FAKE_PROVIDER_ID);
    assert.ok(nativeRow, "the native model is untouched by the extra registration");
    assert.equal(nativeRow.origin, "catalog");
    assert.equal(nativeRow.reasoningSource, "catalog");

    await selectFakeCatalog(h, extraId);
    const extraRun = await runOnce(h, "cmd-extra");
    assert.equal(extraRun.status, "completed", JSON.stringify(extraRun.error ?? null));
    assert.equal(extraRun.provider.model, extraId);

    // The native model still runs after the extra exists.
    await selectFakeCatalog(h, FAKE_MODEL_ID);
    const nativeRun = await runOnce(h, "cmd-native");
    assert.equal(nativeRun.status, "completed", JSON.stringify(nativeRun.error ?? null));

    // Re-select the extra, then remove it: the Run gate must close.
    await selectFakeCatalog(h, extraId);
    const cleared = await putCatalogModels(h, []);
    assert.equal(cleared.status, 200, JSON.stringify(cleared.json));
    const afterModels = (await h.api("GET", "/provider-models")).json.models;
    assert.equal(afterModels.some((model) => model.id === extraId), false, "the extra no longer resolves");
    assert.ok(afterModels.some((model) => model.id === FAKE_MODEL_ID), "the native model still resolves");

    const session = await h.createSession();
    const rejected = await h.api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-after-clear" });
    assert.equal(rejected.status, 503);
    assert.equal(rejected.json.error.code, "provider_unsupported");
  } finally {
    await h.runtime.close();
  }
});

// PV-61: reasoning is a tri-state the connection declares, mapped honestly
// into pi's boolean and reported back with its own source.
test("PV-61 · reasoning 三态：true → supportedEfforts 非 off；null → off + reasoningSource unknown；false → off + reasoningSource user", async () => {
  const h = await boot();
  try {
    const saved = await putCatalogModels(h, [
      { id: "reasoning-true", reasoning: true },
      { id: "reasoning-null" },
      { id: "reasoning-false", reasoning: false },
    ]);
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.deepEqual(
      saved.json.connection.models.map((model) => [model.id, model.reasoning]),
      [["reasoning-true", true], ["reasoning-null", null], ["reasoning-false", false]],
    );

    const models = (await h.api("GET", "/provider-models")).json.models;
    const byId = Object.fromEntries(models.filter((model) => model.provider === FAKE_PROVIDER_ID).map((model) => [model.id, model]));
    assert.notEqual(byId["reasoning-true"].supportedEfforts.join(","), "off");
    assert.equal(byId["reasoning-true"].reasoningSource, "user");
    assert.deepEqual(byId["reasoning-null"].supportedEfforts, ["off"]);
    assert.equal(byId["reasoning-null"].reasoningSource, "unknown");
    assert.deepEqual(byId["reasoning-false"].supportedEfforts, ["off"]);
    assert.equal(byId["reasoning-false"].reasoningSource, "user", "declared off is still declared, not unknown");
    assert.equal(byId[FAKE_MODEL_ID].origin, "catalog");
    assert.equal(byId[FAKE_MODEL_ID].reasoningSource, "catalog");
  } finally {
    await h.runtime.close();
  }
});

// PV-62/PV-84: the fixture proves the four outcomes BE-39 must be able to
// reach, and the honest classification each one gets under pi 0.85.1 now
// that `httpStatus` (captured through a wrapped `fetch`, not just
// `onResponse` -- see classifyVerifyOutcome) supplies a structured signal on
// every path, not only success.
test("PV-62/PV-84 · verify 四类 fixture 结果：成功 ok、401→authentication_failed、未知模型→http_error、不可达→unreachable，且不冒充精度", async () => {
  const h = await boot();
  try {
    const extraId = "fake-extra-model";
    await putCatalogModels(h, [{ id: extraId }, { id: "unknown-upstream-model" }]);

    // Success: a real generation happened, and the receipt carries the
    // model's own reply, provenance, and the real 2xx status.
    const ok = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: extraId });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(ok.json.status, "ok");
    assert.equal(ok.json.httpStatus, 200);
    assert.equal(ok.json.connectionId, FAKE_CATALOG_ID);
    assert.equal(ok.json.model, extraId);
    assert.equal(ok.json.message, "The model answered.");
    assert.equal(typeof ok.json.replyFirstLine, "string");
    assert.ok(ok.json.replyFirstLine.length > 0);
    assert.equal(typeof ok.json.latencyMs, "number");
    assert.ok(!Number.isNaN(Date.parse(ok.json.checkedAt)));
    assert.equal(ok.json.credentialSource, "runtime");
    assert.deepEqual(Object.keys(ok.json.binding).sort(), ["credentialGeneration", "providerConfigVersion"]);

    const listedAfterOk = (await h.api("GET", "/provider-connections")).json.connections.find((c) => c.id === FAKE_CATALOG_ID);
    assert.deepEqual(listedAfterOk.lastVerification, ok.json);

    // Unknown model: locally admissible (it is on the connection's own
    // list), but the fixture's upstream returns a structured 404 for it.
    // `httpStatus` carries that status; the hook has no body, so this is
    // `http_error`, not the unreachable `model_not_found` class.
    const unknownModel = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: "unknown-upstream-model" });
    assert.equal(unknownModel.status, 200, JSON.stringify(unknownModel.json));
    assert.equal(unknownModel.json.status, "http_error");
    assert.equal(unknownModel.json.httpStatus, 404);
    assert.match(unknownModel.json.message, /does not exist/);
    assert.equal(unknownModel.json.replyFirstLine, null);

    // 401: a connection saved with the fixture's wrong-key marker. The
    // wrapped `fetch` observes the raw 401 response before the vendored
    // OpenAI SDK throws on it, so this is `authentication_failed`.
    const compat = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }], apiKey: FIXTURE_WRONG_KEY,
    });
    assert.equal(compat.status, 200, JSON.stringify(compat.json));
    const badAuth = await h.api("POST", `/provider-connections/${compat.json.connection.id}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(badAuth.status, 200, JSON.stringify(badAuth.json));
    assert.equal(badAuth.json.status, "authentication_failed");
    assert.equal(badAuth.json.httpStatus, 401);
    assert.match(badAuth.json.message, /Incorrect API key/);
    assert.equal(badAuth.json.message.includes(FIXTURE_WRONG_KEY), false, "the key itself never appears in the receipt");

    // Unreachable: a compatible connection whose baseUrl points at a
    // loopback port nothing listens on. A connection save always probes its
    // directory synchronously (`#saveProviderConnection`), so the port has to
    // be LISTENING at save time; start a second fixture server, save against
    // it (passing the probe), then stop that server before verifying -- the
    // saved baseUrl now points at an unlistened loopback port, same as the
    // patch order names. The wrapped fetch never resolves a Response at all,
    // so `httpStatus` stays null -- the network-layer case, distinct from a
    // structured non-2xx.
    const deadServer = await createFakeOpenAiProvider();
    const deadPort = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: deadServer.baseUrl, models: [{ id: FAKE_MODEL_ID }], apiKey: "any-key",
    });
    assert.equal(deadPort.status, 200, JSON.stringify(deadPort.json));
    await deadServer.close();
    const unreachable = await h.api("POST", `/provider-connections/${deadPort.json.connection.id}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(unreachable.status, 200, JSON.stringify(unreachable.json));
    assert.equal(unreachable.json.status, "unreachable");
    assert.equal(unreachable.json.httpStatus, null);
  } finally {
    await h.runtime.close();
  }
});

// PV-62 request-shape gates: inadmissible model, no credential, active run.
test("PV-62 · verify 的三道门：模型不可准入 400、连接无凭据 400、活动 run 期间 409", async () => {
  const h = await boot();
  try {
    const notAdmissible = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: "never-saved-anywhere" });
    assert.equal(notAdmissible.status, 400);
    assert.equal(notAdmissible.json.error.code, "invalid_provider");

    // A connection with no credential configured.
    const noKey = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }],
    });
    assert.equal(noKey.status, 200, JSON.stringify(noKey.json));
    const missing = await h.api("POST", `/provider-connections/${noKey.json.connection.id}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.error.code, "credential_missing");

    const notFoundConnection = await h.api("POST", "/provider-connections/conn-does-not-exist/verify", { model: FAKE_MODEL_ID });
    assert.equal(notFoundConnection.status, 404);

    const session = await h.createSession();
    const slow = await h.api("POST", `/sessions/${session.id}/runs`, { input: "/fixture slow verify-freeze", commandId: "cmd-verify-freeze" });
    assert.equal(slow.status, 200, JSON.stringify(slow.json));
    const duringRun = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(duringRun.status, 409);
    assert.equal(duringRun.json.error.code, "active_run");
    await h.pollRun(slow.json.run.id, { timeoutMs: 20_000 });
  } finally {
    await h.runtime.close();
  }
});

// PV-42: a receipt is bound to the epoch it ran against; either half of the
// binding moving invalidates it, and a persisted-and-still-valid receipt
// survives a restart.
test("PV-42 · 回执绑定失配返回 null；重启后额外模型与回执可用", async () => {
  const h = await boot();
  const dataDir = h.dataDir;
  try {
    const extraId = "fake-extra-model";
    await putCatalogModels(h, [{ id: extraId }]);
    const receipt = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: extraId });
    assert.equal(receipt.status, 200, JSON.stringify(receipt.json));

    let listed = (await h.api("GET", "/provider-connections")).json.connections.find((c) => c.id === FAKE_CATALOG_ID);
    assert.ok(listed.lastVerification, "the receipt reads back while its epoch is unchanged");

    // Any connection write bumps providerConfigVersion (PV-42's deliberately
    // coarse invalidation): saving another connection's credential still
    // invalidates this one's receipt.
    await h.api("PUT", "/provider-credential", { connectionId: FAKE_CATALOG_ID, apiKey: FAKE_CREDENTIAL_KEY });
    listed = (await h.api("GET", "/provider-connections")).json.connections.find((c) => c.id === FAKE_CATALOG_ID);
    assert.equal(listed.lastVerification, null, "the credential generation changed under the receipt");
  } finally {
    await h.runtime.close();
  }

  // Restart: extras and an unstale receipt both survive.
  const extraId = "fake-extra-model";
  const reopened = await reopen(dataDir);
  const receipt = await reopened.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: extraId });
  assert.equal(receipt.status, 200, JSON.stringify(receipt.json));
  await reopened.runtime.close();

  const third = await reopen(dataDir);
  try {
    const models = (await third.api("GET", "/provider-models")).json.models;
    assert.ok(models.some((model) => model.id === extraId), "the extra model is re-registered after restart");
    const listed = (await third.api("GET", "/provider-connections")).json.connections.find((c) => c.id === FAKE_CATALOG_ID);
    assert.ok(listed.lastVerification, "a receipt whose epoch did not change survives a restart");
    assert.equal(listed.lastVerification.model, extraId);
  } finally {
    await third.runtime.close();
  }
});

// PV-62's credential_missing gate excepts the fixture identity (mirroring
// Run's own `credentialConfigured = provider.provider === FAKE_PROVIDER_ID ||
// ...`): verify against the fake catalog connection works even with no
// credential ever configured. A COMPATIBLE connection gets no such
// exemption, and the credential doctrine — no HOME/.pi, no environment —
// extends to the verify path either way.
test("T-CRED-VERIFY · fixture 除外：fake 连接的 verify 不要求预先配置凭据；兼容连接仍要求，且不读 HOME/.pi 与环境变量", async () => {
  const sentinelHome = await mkdtemp(path.join(tmpdir(), "se-verify-home-"));
  const authDir = path.join(sentinelHome, ".pi", "agent");
  await mkdir(authDir, { recursive: true });
  const sentinel = JSON.stringify({ "conn-any": { apiKey: "sentinel-key-must-never-be-used" } }, null, 2);
  await writeFile(path.join(authDir, "auth.json"), sentinel);
  const originalHome = process.env.HOME;
  process.env.HOME = sentinelHome;
  let h;
  try {
    h = await boot({ configureFakeCredential: false });
    assert.equal((await h.api("GET", "/provider-connections")).json.connections.find((c) => c.id === FAKE_CATALOG_ID).credentialStatus, "not_configured");
    const fakeOk = await h.api("POST", `/provider-connections/${FAKE_CATALOG_ID}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(fakeOk.status, 200, JSON.stringify(fakeOk.json));
    assert.equal(fakeOk.json.status, "ok");
    assert.equal(fakeOk.json.credentialSource, "runtime");

    const compat = await h.api("POST", "/provider-connections", {
      api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }],
    });
    assert.equal(compat.status, 200, JSON.stringify(compat.json));
    const denied = await h.api("POST", `/provider-connections/${compat.json.connection.id}/verify`, { model: FAKE_MODEL_ID });
    assert.equal(denied.status, 400);
    assert.equal(denied.json.error.code, "credential_missing");

    assert.equal(await readFile(path.join(authDir, "auth.json"), "utf8"), sentinel);
    assert.deepEqual(await readdir(authDir), ["auth.json"]);
  } finally {
    await h?.runtime.close();
    if (originalHome !== undefined) process.env.HOME = originalHome;
  }
});
