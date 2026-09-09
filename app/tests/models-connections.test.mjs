/* FE-02 · 只测本单新增的判断，不重测别处已经断言过的东西：
 * (1) 三条 happy path 的 provider 身份取自后端目录的闭集 —— 前端不生成 provider ID，
 *     也就不会画出一条后端不认识的连接；
 * (2) 已保存的事实反推路径（本地 / 兼容端点 / 目录），不另存"用户当时选了哪条"；
 * (3) Connections 列表只画后端真有的那一条连接，凭据与端点分开陈述；
 * (4) WK-108 · BE-17 / BE-18 交付后，那两步是控件：请求体逐字按文档，结果原样呈现
 *     后端 status / message，目录报来的模型 ID 不进下拉也不进保存配置；
 * (5) WK-105 ⑤ 的 `--nav` 取值。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  CONNECTION_PATHS,
  CONNECTION_STEPS,
  MCP_INTAKE_STEPS,
  connectionPathOf,
  connectionRows,
  providerLabels,
  PROBE_PATHS,
  PROBE_ABSENT_NOTE,
  PROBE_ENDPOINT,
  PROBE_PROTOCOL,
  probeAvailableFor,
  providerProbeRequest,
  probeReading,
  probeLine,
  probeCatalogueLine,
} from "../web/settings-view.mjs";

const root = new URL("../../", import.meta.url).pathname;
const styles = readFileSync(`${root}app/web/styles.css`, "utf8");
const settingsSource = readFileSync(`${root}app/web/settings-view.mjs`, "utf8");

test("三条 happy path 是闭集，且每条只用后端目录里真有的 provider 身份", () => {
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.id), ["catalog", "compatible", "local"]);
  for (const path of CONNECTION_PATHS) {
    assert.ok(path.providers.length, path.id);
    for (const provider of path.providers)
      assert.ok(Object.hasOwn(providerLabels, provider), `${path.id}: ${provider}`);
  }
  // 端点归谁决定，是三条路径唯一真正的差别。
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.endpoint), ["provider", "required", "host"]);
});

test("路径由已保存的事实反推，不是第二个真源", () => {
  assert.equal(connectionPathOf({ provider: "openai" }), "catalog");
  assert.equal(connectionPathOf({ provider: "openai", baseUrl: "http://127.0.0.1:1234/v1" }), "compatible");
  assert.equal(connectionPathOf({ provider: "fake-openai-loopback" }), "local");
  assert.equal(connectionPathOf(null), "catalog");
});

test("Connections 只列后端真有的那一条：一条生效连接，凭据与端点分开陈述", () => {
  assert.deepEqual(connectionRows({ config: null }), []);
  const [saved] = connectionRows({
    config: { provider: "openai", model: "gpt-4.1-mini" },
    credentialStatus: "not_configured",
  });
  assert.equal(saved.name, "OpenAI");
  assert.equal(saved.endpoint, "Provider default endpoint");
  assert.equal(saved.credential, "No API key saved");
  assert.equal(saved.inForce, true);
  const [local] = connectionRows({
    config: { provider: "fake-openai-loopback", model: "fake-model" },
    credentialStatus: "not_configured",
  });
  // 本地端点不需要 key，所以它不说"没有 key"——那会读成一个缺口。
  assert.equal(local.credential, "No key needed");
  assert.equal(local.endpoint, "Local endpoint fixed by the host");
  assert.equal(local.name, "Local test");
});

test("WK-108 · 两步不再是留位说明：BE-17 / BE-18 交付后各自是一个控件", () => {
  const probes = CONNECTION_STEPS.filter((step) => step.probe);
  assert.deepEqual(probes.map((step) => step.id), ["test", "fetch"]);
  assert.deepEqual(probes.map((step) => step.probe), ["test", "discover"]);
  for (const step of CONNECTION_STEPS) assert.equal(step.available, true);
  // 旧的两句留位文本不得残留：后端已经有握手了，说"没有"就是说错。
  assert.doesNotMatch(settingsSource, /host has no handshake/);
  assert.doesNotMatch(settingsSource, /same missing handshake/);
  for (const step of CONNECTION_STEPS) assert.doesNotMatch(step.note, /^Not available yet/);
  // 探测成功不被说成"已验证 key / 可推理 / 已配置"。
  for (const step of probes) assert.doesNotMatch(step.note, /verified|valid key|ready to|configured/i);
  assert.match(CONNECTION_STEPS.find((s) => s.id === "test").note, /does not check that a key is valid/);
  assert.match(CONNECTION_STEPS.find((s) => s.id === "fetch").note, /not added to the Model list/);
});

test("WK-108 · 探测控件只出现在表单里写得出 Base URL 的那条路径上", () => {
  assert.deepEqual([...PROBE_PATHS], ["compatible"]);
  for (const path of CONNECTION_PATHS)
    assert.equal(
      probeAvailableFor(path.id),
      path.endpoint === "required",
      path.id,
    );
  // 另外两条路径各自说明端点归谁，而不是说"暂不支持"。
  assert.match(PROBE_ABSENT_NOTE.catalog, /endpoint is the provider's own/);
  assert.match(PROBE_ABSENT_NOTE.local, /fixed by the host/);
});

test("WK-108 · 请求体逐字按文档：三个字段，无 key 省略字段，不加 header", () => {
  assert.deepEqual(
    providerProbeRequest({ baseUrl: "http://127.0.0.1:1234/v1", apiKey: "explicit-optional-key" }),
    { protocol: "openai-compatible", baseUrl: "http://127.0.0.1:1234/v1", apiKey: "explicit-optional-key" },
  );
  // 无 key：省略字段本身，不是送空串。
  const anonymous = providerProbeRequest({ baseUrl: " http://127.0.0.1:1234/v1 ", apiKey: "   " });
  assert.deepEqual(Object.keys(anonymous), ["protocol", "baseUrl"]);
  assert.equal(anonymous.baseUrl, "http://127.0.0.1:1234/v1");
  assert.deepEqual(providerProbeRequest({ baseUrl: "x" }), { protocol: "openai-compatible", baseUrl: "x" });
  // 没有端点就没有可探测的目录：不发请求。
  assert.equal(providerProbeRequest({ baseUrl: "" }), null);
  assert.equal(providerProbeRequest({ baseUrl: "   ", apiKey: "k" }), null);
  assert.equal(providerProbeRequest(), null);
  // 两个端点是文档冻结的那两条路径。
  assert.deepEqual(PROBE_ENDPOINT, {
    test: "/provider-connection/test",
    discover: "/provider-models/discover",
  });
  assert.equal(PROBE_PROTOCOL, "openai-compatible");
});

test("WK-108 · 结果原样呈现后端 status 与 message；ok 不被改写成一句更强的话", () => {
  const ok = probeReading(
    {
      operation: "discover",
      protocol: "openai-compatible",
      check: "model-directory",
      status: "ok",
      message: "Model directory handshake succeeded; generation was not tested.",
      models: [{ id: "example-model" }, { id: "second-model" }],
    },
    "discover",
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.status, "ok");
  assert.equal(ok.message, "Model directory handshake succeeded; generation was not tested.");
  assert.deepEqual(ok.models, ["example-model", "second-model"]);
  assert.equal(probeLine(ok), "ok · Model directory handshake succeeded; generation was not tested.");
  assert.match(probeCatalogueLine(ok), /^The directory reports 2 models\./);
  assert.match(probeCatalogueLine(ok), /not added to the Model list or saved/);
  assert.doesNotMatch(probeLine(ok), /verified|configured|can reason/i);

  const single = probeReading({ operation: "discover", status: "ok", message: "m", models: [{ id: "one" }] }, "discover");
  assert.match(probeCatalogueLine(single), /^The directory reports 1 model\./);
  // 空目录是一次成功的握手，不是"零个可用模型"以外的任何断言。
  const empty = probeReading({ operation: "discover", status: "ok", message: "m", models: [] }, "discover");
  assert.match(probeCatalogueLine(empty), /^The directory reports 0 models\./);

  // `test` 永远回空 models，也就永远没有目录行。
  const tested = probeReading(
    { operation: "test", status: "authentication_failed", message: "The model directory rejected the supplied credentials.", models: [] },
    "test",
  );
  assert.equal(tested.ok, false);
  assert.equal(probeLine(tested), "authentication_failed · The model directory rejected the supplied credentials.");
  assert.equal(probeCatalogueLine(tested), null);
  assert.equal(probeCatalogueLine(probeReading({ operation: "discover", status: "unsupported", message: "u", models: [] }, "discover")), null);

  // 非字符串 / 缺字段不被猜成成功。
  const nothing = probeReading(null, "test");
  assert.equal(nothing.ok, false);
  assert.equal(nothing.status, "no_result");
  assert.equal(probeReading({ models: [{ id: 1 }, { id: "keep" }] }, "test").models.length, 1);
});

test("WK-108 · 目录报来的模型 ID 不进 Model 下拉，也不进保存的配置", () => {
  // 下拉只由已安装目录 `availableModels()` 填；探测结果只进它自己的列表。
  assert.match(settingsSource, /function fillModels\(preferred\)[\s\S]{0,400}availableModels\(\)/);
  assert.doesNotMatch(settingsSource, /probeModels[\s\S]{0,120}model\.append/);
  assert.doesNotMatch(settingsSource, /model\.append[\s\S]{0,120}reading\.models/);
  // 保存请求体仍是四个字段，没有一个来自探测。
  assert.match(
    settingsSource,
    /const body = \{\s*provider: provider\.value,\s*model: model\.value,\s*api: api\.value,/,
  );
});

test("MCP 走同一形态：六步，未交付的三步同样只留位", () => {
  assert.deepEqual(MCP_INTAKE_STEPS.map(([title]) => title), [
    "Add", "Configure", "Test connection", "Review permissions", "Enable", "Advanced",
  ]);
  const pending = MCP_INTAKE_STEPS.filter(([, note]) => note.startsWith("Not available yet"));
  assert.equal(pending.length, 3);
});

test("WK-105 ⑤ · 侧栏宽落进 256–280 的下沿", () => {
  assert.match(styles, /--nav:\s*256px;/);
});
