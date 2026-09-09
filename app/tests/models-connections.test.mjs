/* FE-02 / WO-PV-FE01 · 只测本单新增的判断，不重测别处已经断言过的东西：
 * (1) 三条 happy path 的身份来源 —— 目录与本地两条取自后端目录的闭集，兼容那条
 *     的身份是宿主登记的连接本身；前端两处都不生成身份；
 * (2) 路径由连接记录自己的 kind 与身份说，`connectionPathOf` 的单条反推已退役；
 * (3) Connections 列后端注册表报的每一条，凭据与端点分开陈述，结构不假设单数；
 * (4) WK-108 · BE-17 / BE-18 交付后，那两步是控件：请求体逐字按文档，结果原样呈现
 *     后端 status / message；**PV-50** 之后，报来的模型 ID 进入这条连接的 Model
 *     列表并随它保存（旧断言与理由见 delivery-pv-fe01 §5）；
 * (5) PV-M-1 两处写入合一、PV-27 未知能力如实、PV-34/46 三类失败按码分类；
 * (6) WK-105 ⑤ 的 `--nav` 取值。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  CONNECTION_PATHS,
  CONNECTION_STEPS,
  MCP_INTAKE_STEPS,
  connectionPathOfKind,
  connectionLabel,
  connectionRows,
  connectionSaveError,
  contextWindowReading,
  CONNECTION_SAVE_FAILURES,
  PROVIDER_CONFIG_FIELDS,
  projectProviderConfig,
  supportedEffortsOf,
  effortSelectable,
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
const pickerSource = readFileSync(`${root}app/web/model-picker.mjs`, "utf8");

/* WO-PV-FE01 · 一条兼容连接与三条目录连接，形状逐字按 `GET /api/v5/provider-connections`
 * 的交付页（delivery-pv-be02 §3.1）：`credentialStatus` 是派生值，模型带
 * `contextWindowSource`。 */
const REGISTRY = [
  { id: "catalog-openai", kind: "catalog", providerIdentity: "openai", api: "openai-completions", baseUrl: null, models: [], credentialStatus: "configured" },
  { id: "catalog-fake-openai-loopback", kind: "catalog", providerIdentity: "fake-openai-loopback", api: "openai-completions", baseUrl: null, models: [], credentialStatus: "not_configured" },
  {
    id: "conn-abc123def456",
    kind: "compatible",
    providerIdentity: "conn-abc123def456",
    api: "openai-completions",
    baseUrl: "http://127.0.0.1:1234/v1",
    models: [
      { id: "discovered-a", contextWindow: null, contextWindowSource: "unknown" },
      { id: "discovered-b", contextWindow: 8192, contextWindowSource: "user" },
    ],
    credentialStatus: "configured",
  },
];

test("三条 happy path 是闭集，且每条只用后端目录里真有的 provider 身份", () => {
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.id), ["catalog", "compatible", "local"]);
  for (const path of CONNECTION_PATHS)
    for (const provider of path.providers)
      assert.ok(Object.hasOwn(providerLabels, provider), `${path.id}: ${provider}`);
  // 目录与本地两条路径列的是目录身份的闭集。
  assert.ok(CONNECTION_PATHS.find((p) => p.id === "catalog").providers.length);
  assert.ok(CONNECTION_PATHS.find((p) => p.id === "local").providers.length);
  /* PV-24 · 兼容路径不列任何目录身份：那条路上身份就是宿主登记的这条连接本身
   * （BE02 的 `conn-` 前缀），不借用 openai / deepseek 的身份与凭据槽。 */
  assert.deepEqual(CONNECTION_PATHS.find((p) => p.id === "compatible").providers, []);
  // 端点归谁决定，是三条路径唯一真正的差别。
  assert.deepEqual(CONNECTION_PATHS.map((path) => path.endpoint), ["provider", "required", "host"]);
});

test("路径由连接记录自己说，不由一份全局配置反推", () => {
  // `connectionPathOf` 的单条推断退役：路径读的是连接的 kind 与身份。
  assert.doesNotMatch(settingsSource, /export function connectionPathOf\(/);
  const [openai, local, compatible] = REGISTRY;
  assert.equal(connectionPathOfKind(openai), "catalog");
  assert.equal(connectionPathOfKind(local), "local");
  assert.equal(connectionPathOfKind(compatible), "compatible");
  assert.equal(connectionPathOfKind(null), "catalog");
  // 用户连接没有显示名字段，界面也不发明一个：它的名字是它的端点主机名。
  assert.equal(connectionLabel(compatible), "127.0.0.1:1234");
  assert.equal(connectionLabel(openai), "OpenAI");
});

test("Connections 列后端注册表报的每一条，结构不假设单数", () => {
  assert.deepEqual(connectionRows({ connections: null }), []);
  assert.deepEqual(connectionRows({ connections: [] }), []);
  const rows = connectionRows({ connections: REGISTRY, config: { provider: "conn-abc123def456", model: "discovered-b" } });
  assert.equal(rows.length, 3);
  // 生效的那一条由 providerConfig 的身份认领，其余同样是连接，不是"没有的东西"。
  assert.deepEqual(rows.map((row) => row.inForce), [false, false, true]);
  const [openai, local, compatible] = rows;
  assert.equal(openai.name, "OpenAI");
  assert.equal(openai.endpoint, "Provider default endpoint");
  assert.equal(openai.credential, "API key saved");
  // 本地端点不需要 key，所以它不说"没有 key"——那会读成一个缺口。
  assert.equal(local.credential, "No key needed");
  assert.equal(local.endpoint, "Local endpoint fixed by the host");
  assert.equal(local.name, "Local test");
  assert.equal(compatible.connectionId, "conn-abc123def456");
  assert.equal(compatible.endpoint, "http://127.0.0.1:1234/v1");
  assert.deepEqual(compatible.models, ["discovered-a", "discovered-b"]);
  // PV-27 · 未知窗口按条计数，不被四舍五入成"都知道"或"都不知道"。
  assert.equal(compatible.unknownWindows, 1);
  assert.equal(openai.unknownWindows, 0);
});

test("PV-27 / PV-30 · 窗口读数如实：unknown、目录值、用户填的值各说各的", () => {
  assert.equal(contextWindowReading({ contextWindow: null, contextWindowSource: "unknown" }), "Context window: unknown.");
  assert.equal(contextWindowReading(undefined), "Context window: unknown.");
  assert.equal(
    contextWindowReading({ contextWindow: 8192, contextWindowSource: "user" }),
    "Context window: 8,192 tokens, from your entry.",
  );
  assert.equal(
    contextWindowReading({ contextWindow: 128000, contextWindowSource: "catalog" }),
    "Context window: 128,000 tokens.",
  );
  // 未知时不出现任何被编出来的数字。
  assert.doesNotMatch(contextWindowReading({ contextWindowSource: "unknown" }), /\d/);
});

test("PV-34 / PV-46 · 保存失败的三类直接消费后端错误码与枚举，前端不重新归类", () => {
  assert.deepEqual(Object.keys(CONNECTION_SAVE_FAILURES), [
    "connection_authentication_failed",
    "connection_directory_unavailable",
    "connection_model_not_in_directory",
  ]);
  const auth = connectionSaveError({
    message: "ignored",
    body: { error: { code: "connection_authentication_failed", message: "The model directory rejected the supplied credentials.", status: "authentication_failed" } },
  });
  assert.match(auth, /^Authentication failed/);
  assert.match(auth, /rejected the supplied credentials\./);
  assert.match(auth, /\(authentication_failed\)$/);
  const unreachable = connectionSaveError({
    body: { error: { code: "connection_directory_unavailable", message: "the endpoint could not be reached", status: "unreachable" } },
  });
  assert.match(unreachable, /could not be read/);
  assert.match(unreachable, /\(unreachable\)$/);
  const missing = connectionSaveError({
    body: { error: { code: "connection_model_not_in_directory", message: "the model directory does not list every selected model", status: "ok", models: ["ghost-model"] } },
  });
  assert.match(missing, /does not list the selected model/);
  assert.match(missing, /Not listed: ghost-model\./);
  // 未登记的错误按 host 原话报，不被塞进三类之一冒充精度。
  assert.equal(connectionSaveError({ message: "A run is active.", body: { error: { code: "active_run", message: "x" } } }), "A run is active.");
  assert.equal(connectionSaveError(new Error("The local runtime could not be reached.")), "The local runtime could not be reached.");
  // 三类的判据全部来自后端字段，前端没有一条正则去读报文正文。
  assert.doesNotMatch(settingsSource, /connection_authentication_failed[\s\S]{0,200}\.test\(/);
});

test("WK-108 · 两步不再是留位说明：BE-17 / BE-18 交付后各自是一个控件", () => {
  const probes = CONNECTION_STEPS.filter((step) => step.probe);
  assert.deepEqual(probes.map((step) => step.id), ["test", "fetch"]);
  assert.deepEqual(probes.map((step) => step.probe), ["test", "discover"]);
  /* 已交付的步是控件；未交付的步只留位。冒烟（第三级阶梯，PV-35）依赖 BE-39，
   * 它还没有，所以这里写"没有"，而不是画一个按不动的按钮。 */
  assert.deepEqual(
    CONNECTION_STEPS.filter((step) => !step.available).map((step) => step.id),
    ["smoke"],
  );
  const smoke = CONNECTION_STEPS.find((step) => step.id === "smoke");
  assert.ok(smoke.note.startsWith("Not available yet"));
  assert.equal(smoke.probe, undefined);
  // 留位就是留位：不许诺一个日期，也不声称那两步已经证明了模型能回答。
  assert.match(smoke.note, /neither shows that the selected model can answer/);
  // 旧的两句留位文本不得残留：后端已经有握手了，说"没有"就是说错。
  assert.doesNotMatch(settingsSource, /host has no handshake/);
  assert.doesNotMatch(settingsSource, /same missing handshake/);
  for (const step of CONNECTION_STEPS.filter((step) => step.available))
    assert.doesNotMatch(step.note, /^Not available yet/);
  // 探测成功不被说成"已验证 key / 可推理 / 已配置"。
  for (const step of probes) assert.doesNotMatch(step.note, /verified|valid key|ready to|configured/i);
  assert.match(CONNECTION_STEPS.find((s) => s.id === "test").note, /does not check that a key is valid/);
  /* PV-24 / PV-50 · 这句话改了，因为事实改了：报来的 ID 现在真的成为这条连接的
   * 模型列表。它仍不声称任何一个模型能回答 —— 那是冒烟那一步的事。 */
  assert.match(CONNECTION_STEPS.find((s) => s.id === "fetch").note, /become the Model list for this connection/);
  assert.match(CONNECTION_STEPS.find((s) => s.id === "fetch").note, /does not check that any of them can answer/);
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
  assert.match(probeCatalogueLine(ok), /becomes? this connection's model list when you save/);
  assert.match(probeCatalogueLine(ok), /not a check that any can answer/);
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

/* PV-50 · 这一条改写了 WK-108 的旧断言"目录报来的模型 ID 不进 Model 下拉，也不进
 * 保存的配置"。旧断言当时是对的：后端没有可以保存兼容连接的地方，所以前端把发现来的
 * ID 只画成一张说明性的清单才是诚实的。WO-PV-BE02 之后后端有了连接注册表，那条清单
 * 若仍进不去就成了 PV-24 所拒的"填得出却不能用"。所以断言反过来：发现来的 ID 必须
 * 进入这条连接的模型列表并随它保存。 */
test("PV-24 · 目录报来的模型 ID 进入这条连接的 Model 列表，并随连接保存", () => {
  // 兼容路径的模型来源是"这条连接已存的" ∪ "刚 discover 报来的"。
  assert.match(settingsSource, /function compatibleModelEntries\(\)[\s\S]{0,600}for \(const id of discovered\)/);
  assert.match(settingsSource, /const entries = compatible\s*\?\s*compatibleModelEntries\(\)/);
  // discover 成功即把它们填进 Model 列表，而不是只画一张说明性的清单。
  assert.match(settingsSource, /reading\.operation === "discover" && reading\.ok[\s\S]{0,160}fillModels\(/);
  // 保存时它们进入 `POST\/PUT \/provider-connections` 的 models，然后那条连接被选为生效配置。
  assert.match(settingsSource, /const models = compatibleModelEntries\(\)\.map/);
  assert.match(settingsSource, /request\("\/provider-connections", \{ method: "POST", body \}\)/);
  assert.match(settingsSource, /provider: connection\.providerIdentity, model: chosen/);
  // 另外两条路径不变：Model 下拉仍只由已安装目录填。
  assert.match(settingsSource, /const entries = compatible[\s\S]{0,120}availableModels\(\)/);
});

test("BE02 契约 · 凭据请求体的键是连接 id，不是 provider 身份", () => {
  // `PUT\/DELETE \/provider-credential` 收 `{connectionId}`；旧字段会 400。
  assert.match(settingsSource, /body: \{ connectionId: target\.id, apiKey: value \}/);
  assert.match(settingsSource, /body: \{ connectionId: target\.id \}/);
  assert.doesNotMatch(settingsSource, /provider-credential[\s\S]{0,200}body: \{ provider:/);
  // 连接 id 从注册表里查出来，前端不拼 `catalog-…`：那个 id 的构造规则归后端。
  assert.doesNotMatch(settingsSource, /"catalog-" \+|`catalog-\$\{/);
  assert.match(settingsSource, /function selectedConnection\(\)/);
});

test("PV-M-1 · 两处写入合一：任一处保存都不清掉另一处的字段", () => {
  const current = { provider: "openai", model: "gpt-4.1-mini", api: "openai-completions", baseUrl: "http://127.0.0.1:1234/v1", reasoningEffort: "medium" };
  const catalog = { models: [
    { provider: "openai", id: "gpt-4.1-mini", supportedEfforts: ["off", "low", "medium", "high"] },
    { provider: "openai", id: "plain", supportedEfforts: ["off"] },
    { provider: "conn-abc123def456", id: "discovered-a", supportedEfforts: ["off"] },
  ] };
  // Settings 的连接表单：它没提 effort，于是 effort 由快照带过去（旧行为里它被清掉）。
  const fromSettings = projectProviderConfig(current, { provider: "openai", model: "gpt-4.1-mini", api: "openai-completions", baseUrl: "http://127.0.0.1:1234/v1" }, catalog);
  assert.equal(fromSettings.reasoningEffort, "medium");
  // 模型选择器：它没提端点，于是同一身份下的 baseUrl 由快照带过去。
  const fromPicker = projectProviderConfig(current, { provider: "openai", model: "gpt-4.1-mini", api: "openai-completions", reasoningEffort: "high" }, catalog);
  assert.equal(fromPicker.baseUrl, "http://127.0.0.1:1234/v1");
  assert.equal(fromPicker.reasoningEffort, "high");
  // 换了身份，旧端点不再是关于它的陈述，不被带走。
  assert.equal(projectProviderConfig(current, { provider: "conn-abc123def456", model: "discovered-a", api: "openai-completions" }, catalog).baseUrl, undefined);
  // 目标模型的目录不含这个档位时省略，而不是送上去换一个 invalid_effort 的保存失败。
  assert.equal(projectProviderConfig(current, { model: "plain" }, catalog).reasoningEffort, undefined);
  // 显式清空端点就是清空。
  assert.equal(projectProviderConfig(current, { baseUrl: null }, catalog).baseUrl, undefined);
  // 字段集是闭集：投影不发明第六个字段。
  for (const key of Object.keys(fromPicker)) assert.ok(PROVIDER_CONFIG_FIELDS.includes(key), key);
  // 两个写入方都走这一处，没有第二份装配。
  assert.match(settingsSource, /body: projectProviderConfig\(/);
  assert.match(pickerSource, /projectProviderConfig\(current\.config,/);
  assert.doesNotMatch(pickerSource, /const config=\{provider:/);
});

test("PV-53 · 模型选择器的用户连接分组标签是它的端点主机名，取不到注册表时退回 id", () => {
  const user = REGISTRY.find((c) => c.kind === "compatible");
  // 标签与 Connections 列同出一处：主机名，不是 `conn-<hex>`，也不是前端造的显示名。
  assert.equal(connectionLabel(user), "127.0.0.1:1234");
  assert.notEqual(connectionLabel(user), user.id);
  // 目录连接不受这条影响：它仍报自己的 provider 名。
  assert.equal(connectionLabel(REGISTRY[0]), providerLabels.openai || "openai");
  // 选择器多取一次注册表，只为这一层标签，并且只映射 compatible 那些。
  assert.match(pickerSource, /request\('\/provider-connections'\)/);
  assert.match(pickerSource, /groupLabels = new Map\(connections\.filter\(c=>c\.kind==='compatible'\)\.map\(c=>\[c\.providerIdentity,connectionLabel\(c\)\]\)\)/);
  // 退回路径：注册表取不到时这份表为空，标签就是原始 provider 身份。
  assert.match(pickerSource, /\.catch\(\(\)=>\[\]\)/);
  assert.match(pickerSource, /label:groupLabels\.get\(provider\) \|\| provider/);
  // 一次一变量：搜索匹配的字段集不动，`conn-` id 仍搜得到。
  assert.match(pickerSource, /`\$\{m\.provider\} \$\{m\.name\} \$\{m\.id\}`/);
});

test("PV-27 · 目录未声明档位时只出 Off，不出一个只有一项的下拉", () => {
  assert.deepEqual(supportedEffortsOf({ models: [{ provider: "openai", id: "m", supportedEfforts: ["off", "high"] }] }, "openai", "m"), ["off", "high"]);
  // 目录里根本没有这条模型 = 不知道，不等于"只有 off"。
  assert.equal(supportedEffortsOf({ models: [] }, "openai", "m"), null);
  assert.equal(supportedEffortsOf(null, "openai", "m"), null);
  // 声明了但为空，读成只有 off。
  assert.deepEqual(supportedEffortsOf({ models: [{ provider: "openai", id: "m", supportedEfforts: [] }] }, "openai", "m"), ["off"]);
  assert.equal(effortSelectable(["off"]), false);
  assert.equal(effortSelectable(["off", "high"]), true);
  assert.equal(effortSelectable(null), false);
  // 选择器只在可选时被挂上去。
  assert.match(pickerSource, /if \(effortSelectable\(supported\)\)[\s\S]{0,800}effortControl\.replaceChildren\(effortFixed\)/);
  // 未报窗口写 unknown，不写一个宿主编的数，也不再写 `unavailable`。
  assert.doesNotMatch(pickerSource, /:'unavailable'/);
  assert.match(pickerSource, /:'unknown'/);
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
