/* WO-PV-FE01 · 连接面与模型面消费真实连接的浏览器断言。
 *
 * 每一条都在真的 headless Chromium 里、对着真的 `/api/v5` 流量读；数字与文字从
 * 渲染出来的文档上读，不从源码或 CSS 反推。全程 loopback：目录是本目录下的
 * `directory-fixture.mjs`（8912），没有任何真实凭据，也没有联网。
 *
 *   PV-FE-1  Connections 列的是后端注册表报的每一条（今日三条目录连接），
 *            结构不假设单数
 *   PV-FE-2  凭据请求体的键是连接 id：UI 上存一把 key 后 credentialStatus 变
 *            configured（旧的 `{provider}` 字段在 BE02 之后会 400）
 *   PV-FE-3  PV-M-1 写入合一：模型选择器存下的 reasoningEffort 不被"保存连接"清掉
 *   PV-FE-4  Fetch models 报来的 ID 进入 Model 列表，并带 unknown 的能力读数
 *   PV-FE-5  保存后连接列表多一行，行上说得出端点、凭据、模型数与未知窗口数，
 *            生效那条带后端的能力原话
 *   PV-FE-6  /provider-config 的 capability 与界面所说一致（notice 逐字）
 *   PV-FE-7  发现来的模型真的能执行：一次 run 完成，run 记录指回这条连接
 *   PV-FE-8  三类保存失败各自的真实错误信封（前端按码分类，不看正文）
 *   PV-FE-9  用户填入窗口后，来源标为用户输入，未知计数随之减一
 *   PV-FE-10 PV-53 · 模型选择器里用户连接的分组标签是它的端点主机名，
 *            不是 `conn-<hex>`；目录连接的分组名不变
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const FIXTURE = process.env.PV_FIXTURE_URL ?? "http://127.0.0.1:8912/v1";
const DEAD = "http://127.0.0.1:8913/v1";
const results = [];
const record = (id, pass, detail) => results.push({ id, pass: Boolean(pass), ...detail });

const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const api = async (path, init = {}) => {
  const res = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

async function open(section = "models", { width = 1440, height = 900 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url: `${ORIGIN}/?pvfe01=${Date.now()}#settings/${section}` });
  await waitFor("window.__V5_UI__?.state.home.data");
  await waitFor(`document.getElementById("settings-${section}")?.getClientRects().length > 0`);
  await sleep(800);
}
const shot = async (name) =>
  writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));

/* 页面内的小工具：一律用真的 DOM 事件，让应用自己的监听器决定后果。 */
const HELPERS = `
  const panel = () => document.getElementById("settings-models");
  const rows = () => [...panel().querySelectorAll(".connection-row")].map((row) => row.textContent);
  const byText = (selector, text) => [...panel().querySelectorAll(selector)].find((n) => n.textContent.trim() === text);
  const setValue = (node, value) => {
    const proto = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const providerSelect = () => panel().querySelector('select[name="provider"]');
  const modelSelect = () => panel().querySelector('select[name="model"]');
  const baseUrlInput = () => panel().querySelector('input[name="baseUrl"]');
  const windowInput = () => panel().querySelector('input[name="contextWindow"]');
  const keyInput = () => panel().querySelector('.credential-form input[type="password"]');
  const pathRadio = (id) => panel().querySelector('#connection-path-' + id);
  const probeText = () => panel().querySelector('.connection-probe-result')?.textContent ?? '';
  const modelOptions = () => [...modelSelect().options].map((o) => o.value);
  const capabilityLine = () => [...panel().querySelectorAll('.settings-form > .form-help')].map((n) => n.textContent).join(' | ');
  const errorText = () => panel().querySelector('.inline-error')?.textContent ?? '';
`;
const run = (body) => ev(`(async () => { ${HELPERS}\n${body} })()`);

// ---------------------------------------------------------------- PV-FE-1
await open("models");
await shot("settings-models-1440-light-before");
const registry = (await api("/provider-connections")).body.connections;
const initialRows = await run(`return rows();`);
record("PV-FE-1", initialRows.length === registry.length && registry.length === 3, {
  rendered: initialRows.length, reported: registry.length, rows: initialRows,
});

// ---------------------------------------------------------------- PV-FE-2
await run(`
  pathRadio('catalog').click();
  setValue(providerSelect(), 'openai');
  byText('.settings-form button', 'Save connection').click();
`);
await sleep(1200);
await run(`
  setValue(keyInput(), 'pv-fe01-local-fake-key');
  byText('.credential-form button', 'Save key').click();
`);
await sleep(1200);
const afterKey = (await api("/provider-config")).body;
const openaiConn = (await api("/provider-connections")).body.connections.find((c) => c.providerIdentity === "openai");
record("PV-FE-2", openaiConn.credentialStatus === "configured", {
  connectionId: openaiConn.id, credentialStatus: openaiConn.credentialStatus,
  formError: await run(`return errorText();`),
  note: "凭据键是连接 id；旧的 {provider} 字段在 BE02 之后会 400",
});

// ---------------------------------------------------------------- PV-FE-3
await api("/provider-config", { method: "PUT", body: JSON.stringify({ provider: "openai", model: "gpt-5.4", api: "openai-completions", reasoningEffort: "high" }) });
await open("models");
const beforeSave = (await api("/provider-config")).body.config;
await run(`
  setValue(modelSelect(), 'gpt-5.5');
  byText('.settings-form button', 'Save connection').click();
`);
await sleep(1200);
const afterSave = (await api("/provider-config")).body.config;
record("PV-FE-3", afterSave.model === "gpt-5.5" && afterSave.reasoningEffort === "high", {
  before: beforeSave, after: afterSave, formError: await run(`return errorText();`),
  note: "旧行为：Settings 的表单 PUT 不带 reasoningEffort，整体替换后档位被静默清掉",
});

// ---------------------------------------------------------------- PV-FE-4
await run(`
  pathRadio('compatible').click();
  setValue(baseUrlInput(), ${JSON.stringify(FIXTURE)});
  setValue(keyInput(), 'pv-fe01-fixture-key');
  byText('.connection-flow button', 'Fetch models').click();
`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.textContent.startsWith('ok')`);
await sleep(400);
const discovered = await run(`return { probe: probeText(), options: modelOptions(), capability: capabilityLine() };`);
record("PV-FE-4",
  discovered.options.includes("loopback-alpha") &&
  discovered.options.includes("loopback-beta") &&
  /Context window: unknown\./.test(discovered.capability) &&
  /Compaction stays off/.test(discovered.capability) &&
  /Reasoning effort: Off\./.test(discovered.capability),
  discovered);
await shot("settings-models-1440-light-discovered");

// ---------------------------------------------------------------- PV-FE-5
await run(`
  setValue(modelSelect(), 'loopback-alpha');
  byText('.settings-form button', 'Save connection').click();
`);
await sleep(2000);
const savedRows = await run(`return rows();`);
const savedConfig = (await api("/provider-config")).body;
const inForceRow = savedRows.find((text) => text.includes("In force"));
record("PV-FE-5",
  savedRows.length === 4 &&
  inForceRow.includes("127.0.0.1:8912") &&
  inForceRow.includes("API key saved") &&
  inForceRow.includes("2 models, 2 with an unknown context window") &&
  inForceRow.includes("context window unknown, compaction disabled"),
  { rows: savedRows, inForceRow, formError: await run(`return errorText();`) });
await shot("settings-models-1440-light-saved");

// ---------------------------------------------------------------- PV-FE-6
record("PV-FE-6",
  savedConfig.capability.notice === "context window unknown, compaction disabled" &&
  savedConfig.capability.contextWindow === null &&
  savedConfig.capability.contextWindowSource === "unknown" &&
  savedConfig.capability.compactionEnabled === false &&
  savedConfig.config.provider.startsWith("conn-"),
  { capability: savedConfig.capability, config: savedConfig.config });

// ---------------------------------------------------------------- PV-FE-7
const project = (await api("/projects", { method: "POST", body: JSON.stringify({ name: "PV-FE01" }) })).body;
const projectId = project.project?.id ?? project.id;
const session = (await api("/sessions", { method: "POST", body: JSON.stringify({ projectId, title: "PV-FE01 execution" }) })).body;
const sessionId = session.session?.id ?? session.id;
const created = (await api(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input: "say hello", commandId: crypto.randomUUID() }) })).body;
const runId = created.run?.id ?? created.id;
let finished = null;
for (let i = 0; i < 120 && !finished; i++) {
  const view = (await api(`/runs/${runId}`)).body;
  const record_ = view.run ?? view;
  if (["completed", "failed", "cancelled", "unknown"].includes(record_.status)) finished = record_;
  else await sleep(500);
}
record("PV-FE-7",
  finished?.status === "completed" && finished.provider?.connectionId === savedConfig.connection.id,
  { status: finished?.status, provider: finished?.provider, project, sessionId, runId, created });

// ---------------------------------------------------------------- PV-FE-8
const ghost = await api("/provider-connections", { method: "POST", body: JSON.stringify({ api: "openai-completions", baseUrl: FIXTURE, models: [{ id: "ghost-model" }], apiKey: "pv-fe01-fixture-key" }) });
const rejected = await api("/provider-connections", { method: "POST", body: JSON.stringify({ api: "openai-completions", baseUrl: FIXTURE, models: [{ id: "loopback-alpha" }], apiKey: "reject-me" }) });
const unreachable = await api("/provider-connections", { method: "POST", body: JSON.stringify({ api: "openai-completions", baseUrl: DEAD, models: [{ id: "loopback-alpha" }], apiKey: "pv-fe01-fixture-key" }) });
record("PV-FE-8",
  ghost.body.error.code === "connection_model_not_in_directory" &&
  ghost.body.error.models?.[0] === "ghost-model" &&
  rejected.body.error.code === "connection_authentication_failed" &&
  typeof rejected.body.error.status === "string" &&
  unreachable.body.error.code === "connection_directory_unavailable" &&
  typeof unreachable.body.error.status === "string",
  { ghost: ghost.body.error, rejected: rejected.body.error, unreachable: unreachable.body.error });

// ---------------------------------------------------------------- PV-FE-9
await open("models");
await run(`
  setValue(windowInput(), '16384');
  byText('.settings-form button', 'Save connection').click();
`);
await sleep(2000);
const withWindow = (await api("/provider-config")).body;
const windowRows = await run(`return { rows: rows(), capability: capabilityLine(), error: errorText() }; `);
record("PV-FE-9",
  withWindow.capability.contextWindow === 16384 &&
  withWindow.capability.contextWindowSource === "user" &&
  withWindow.capability.notice === null &&
  /from your entry/.test(windowRows.capability) &&
  windowRows.rows.some((text) => text.includes("2 models, 1 with an unknown context window")),
  { capability: withWindow.capability, ...windowRows });
await shot("settings-models-1440-light-user-window");

// --------------------------------------------------------------- PV-FE-10
/* PV-53 · 模型选择器的分组标签。此处已存在一条用户连接（PV-FE-5 存下的那条，
 * 端点 127.0.0.1:8912），它在目录里的身份是 `conn-<hex>`。 */
const userConnection = (await api("/provider-connections")).body.connections.find((c) => c.kind === "compatible");
await cdp("Page.navigate", { url: `${ORIGIN}/?pvfe01=${Date.now()}` });
await waitFor("window.__V5_UI__?.state.home.data");
await sleep(800);
await ev(`document.getElementById("model-settings-button").click()`);
await sleep(400);
await ev(`[...document.getElementById("connection-popover").querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").startsWith("Choose model")).click()`);
await waitFor(`document.querySelector(".model-picker-dialog select")?.options.length > 0`);
await sleep(400);
const picker = await ev(`(() => {
  const dialog = document.querySelector(".model-picker-dialog");
  return { groups: [...dialog.querySelectorAll("optgroup")].map((g) => g.label) };
})()`);
const expectedHost = new URL(userConnection.baseUrl).host;
record("PV-FE-10",
  picker.groups.includes(expectedHost) &&
  !picker.groups.some((label) => label.startsWith("conn-")) &&
  picker.groups.includes("openai"),
  { groups: picker.groups, connectionId: userConnection.id, providerIdentity: userConnection.providerIdentity, baseUrl: userConnection.baseUrl, expectedHost,
    note: "标签是用户自己填过的端点主机名；取不到连接列表时退回原始 id" });
await shot("model-picker-1440-light-groups");
await ev(`document.querySelector(".model-picker-dialog").close()`);

await writeFile(new URL("./pv-checks.json", import.meta.url), JSON.stringify(results, null, 2));
for (const entry of results) console.log(entry.pass ? "PASS" : "FAIL", entry.id);
console.log("failures:", results.filter((r) => !r.pass).map((r) => r.id));
await close();
