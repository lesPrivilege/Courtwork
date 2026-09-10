/* WO-PV-FE02 · 无感接入与接入回执的浏览器断言。
 *
 * 每一条都在真的 headless Chromium 里、对着真的 `/api/v5` 流量读；数字与文字从
 * 渲染出来的文档上读，不从源码或 CSS 反推。全程 local-fake / loopback：只用宿主
 * 自带的 `fake-openai-loopback` 身份与它的确定性 fixture（`unknown-` 前缀模型 id
 * 触发结构化 404，见 `app/runtime/fake-provider.mjs`），没有第二个外部端点，
 * 没有任何真实凭据，也没有联网。
 *
 *   PVFE2-1  Local endpoint 连接 "Save and ask once"：保存成功后自动问一次，
 *            回执成功两行不着色，阶梯 smoke 步追加 "· Answered"，连接行随之
 *            显示 "Answered HH:MM · fake-model"
 *   PVFE2-2  "Save only" 不发 verify 请求：保存成功，但没有新的 POST …/verify，
 *            回执块不出现
 *   PVFE2-3  模型选择器 "Use a model ID that is not listed…" 入口：展开面板，
 *            "Use without asking" 走两步（PUT connection → PUT config），不问
 *   PVFE2-4  Settings 对着新选中的 `unknown-ghost` 点 "Save and ask once"：
 *            回执失败一行借 --danger，文案与登记表一致（http_error · 404）
 *   PVFE2-5  "Ask again" 显式重放：再次点出现新的 POST …/verify
 *   PVFE2-6  is-arrived 一帧后移除：过渡在正常动效下非零，在 prefers-reduced-motion
 *            下由既有全局强制关闭覆盖为 0（本单不重复声明这条规则，这里验证它确实
 *            覆盖到了新元素）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, verifyRequestCount } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

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

async function open(section = "models", { width = 1440, height = 900, reducedMotion = "reduce" } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: reducedMotion },
    ],
  });
  await cdp("Page.navigate", { url: `${ORIGIN}/?pvfe02=${Date.now()}#settings/${section}` });
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
  const pathRadio = (id) => panel().querySelector('#connection-path-' + id);
  const probeText = () => panel().querySelector('.connection-probe-result')?.textContent ?? '';
  const probeHidden = () => panel().querySelector('.connection-probe-result')?.hidden ?? true;
  const probeIsFailed = () => panel().querySelector('.connection-probe-result')?.classList.contains('is-failed') ?? false;
  const probeDetailText = () => panel().querySelector('.connection-add > .form-help + .form-help')?.textContent ?? '';
  const smokeStatus = () => panel().querySelector('.connection-step-status')?.textContent ?? '';
  const errorText = () => panel().querySelector('.inline-error')?.textContent ?? '';
`;
const run = (body) => ev(`(async () => { ${HELPERS}\n${body} })()`);

// -------------------------------------------------------------- PVFE2-1
await open("models");
await run(`
  pathRadio('local').click();
  byText('.credential-actions button', 'Save and ask once').click();
`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.textContent.startsWith('Answered in')`, 20000);
await sleep(500);
const success = await run(`return { status: probeText(), failed: probeIsFailed(), smoke: smokeStatus(), rows: rows() };`);
record("PVFE2-1",
  /^Answered in (\d+ ms|[\d.]+ s) · /.test(success.status) &&
  success.failed === false &&
  success.smoke === " · Answered" &&
  success.rows.some((text) => text.includes("Answered") && text.includes("fake-model")),
  success);
await shot("settings-models-1440-light-receipt-success");
await shot("settings-models-1440-light-connection-row");

// -------------------------------------------------------------- PVFE2-2
const verifyCountBeforeSaveOnly = verifyRequestCount();
await run(`byText('.credential-actions button', 'Save only').click();`);
await sleep(1500);
const afterSaveOnly = await run(`return { status: probeText(), hidden: probeHidden(), error: errorText() }; `);
record("PVFE2-2",
  verifyRequestCount() === verifyCountBeforeSaveOnly &&
  afterSaveOnly.error === "" &&
  (afterSaveOnly.hidden === true || afterSaveOnly.status === ""),
  { verifyCountBeforeSaveOnly, verifyCountAfter: verifyRequestCount(), ...afterSaveOnly });

// -------------------------------------------------------------- PVFE2-3
await ev(`document.getElementById("model-settings-button").click()`);
await sleep(400);
await ev(`[...document.getElementById("connection-popover").querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").startsWith("Choose model")).click()`);
await waitFor(`document.querySelector(".model-picker-dialog select")?.options.length > 0`);
await sleep(400);
const verifyCountBeforeCustom = verifyRequestCount();
await ev(`document.querySelector(".model-picker-custom-toggle").click()`);
await sleep(200);
await ev(`(() => {
  const dialog = document.querySelector(".model-picker-dialog");
  const setValue = (node, value) => {
    const proto = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  };
  setValue(dialog.querySelector(".model-picker-custom input[type=text]"), "unknown-ghost");
  const select = dialog.querySelector(".model-picker-custom select");
  const local = [...select.options].find((o) => o.textContent === "Local test");
  if (local) setValue(select, local.value);
})()`);
await sleep(300);
const customPanelOpen = await ev(`!document.querySelector(".model-picker-custom").hidden`);
await shot("model-picker-1440-light-custom-entry");
await ev(`[...document.querySelectorAll(".model-picker-custom button")].find((b) => b.textContent === "Use without asking").click()`);
await waitFor(`document.querySelector(".model-picker-custom .connection-probe-result")?.textContent.includes("Saved and selected")`, 15000);
const customResult = await ev(`(() => {
  const dialog = document.querySelector(".model-picker-dialog");
  return { status: dialog.querySelector(".model-picker-custom .connection-probe-result").textContent, closed: !dialog.open };
})()`);
record("PVFE2-3",
  customPanelOpen === true &&
  customResult.status.includes("Saved and selected") &&
  customResult.closed === false && // PV-40 · 不自动关闭
  verifyRequestCount() === verifyCountBeforeCustom, // "Use without asking" 不问
  { customPanelOpen, ...customResult, verifyCountBeforeCustom, verifyCountAfter: verifyRequestCount() });
await ev(`document.querySelector(".model-picker-dialog").close()`);

// -------------------------------------------------------------- PVFE2-4
await open("models");
const selectedAfterCustom = await run(`return { model: modelSelect().value, path: pathRadio('local').checked }; `);
await run(`byText('.credential-actions button', 'Save and ask once').click();`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.classList.contains('is-failed')`, 20000);
await sleep(500);
const failure = await run(`return { status: probeText(), failed: probeIsFailed(), rows: rows() }; `);
record("PVFE2-4",
  selectedAfterCustom.model === "unknown-ghost" &&
  failure.failed === true &&
  failure.status.startsWith("The provider returned HTTP 404") &&
  failure.status.includes("does not exist") &&
  failure.rows.some((text) => text.includes("Last ask failed") && text.includes("The provider rejected the key") === false),
  { selectedAfterCustom, ...failure });
await shot("settings-models-1440-light-receipt-failure");

// -------------------------------------------------------------- PVFE2-5
const verifyCountBeforeAskAgain = verifyRequestCount();
await run(`byText('.connection-add button', 'Ask again').click();`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.classList.contains('is-failed')`, 20000);
await sleep(500);
record("PVFE2-5", verifyRequestCount() > verifyCountBeforeAskAgain, {
  verifyCountBeforeAskAgain, verifyCountAfter: verifyRequestCount(),
});

// -------------------------------------------------------------- PVFE2-6
// 正常动效：过渡时长非零；reduced-motion（本单默认全程用它截图）下由既有全局
// 强制关闭覆盖为 0——两次读同一个元素的 computed transitionDuration。
await open("models", { reducedMotion: "no-preference" });
const normalMotion = await ev(`getComputedStyle(document.querySelector('.connection-probe-result')).transitionDuration`);
await open("models", { reducedMotion: "reduce" });
const reducedMotion = await ev(`getComputedStyle(document.querySelector('.connection-probe-result')).transitionDuration`);
record("PVFE2-6", normalMotion !== "0s" && reducedMotion === "0s", { normalMotion, reducedMotion });

await writeFile(new URL("./pv-checks.json", import.meta.url), JSON.stringify(results, null, 2));
for (const entry of results) console.log(entry.pass ? "PASS" : "FAIL", entry.id);
console.log("failures:", results.filter((r) => !r.pass).map((r) => r.id));
await close();
