/* FE-02 · Settings › Models 与 Tools & Integrations 的五轮收敛断言（WK-100）。
 *
 * 每个数字都从渲染出来的文档上读，不从 CSS 反推。
 *
 *   NAV-1    侧栏宽 = 256（WK-105 ⑤）
 *   MOD-1    Connections 只有一行，且这一行同时说出 provider / model / endpoint / credential
 *   MOD-2    Models 组只有一个 primary action（轮 ①）
 *   MOD-3    Add provider 默认收起；展开后三条路径是一个 radio group（一个 tab stop）
 *   MOD-4    统一流程五步，未交付的两步是文本、不是控件（BE-17 / BE-18）
 *   MOD-5    全组没有任何按钮承诺 Test connection / Fetch models / Detect
 *   MOD-6    Compatible endpoint：Advanced 自动展开，Base URL 空时 Save 不可用
 *   MOD-7    Local endpoint：Base URL 由宿主固定（禁用），API key 块不出现
 *   MOD-8    同级 input / select 同高同 radius（轮 ③）
 *   MOD-9    label 起点同一条竖线、控件右边界同一条竖线（轮 ②）
 *   MOD-10   Models 与 Tools 两组无 backdrop-filter（轮 ④：不越层、无未登记 blur）
 *   MOD-11   Model 行说清默认只影响以后的 Chat / Work
 *   MOD-12   Tools 组的 MCP intake 六步、三步未交付，且零 focusable
 *   MOD-13   1440 与 390 两个视口下 Models 组无横向溢出（轮 ③ / FN-27）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass: Boolean(pass), ...detail });

async function open(section, { width = 1440, height = 900 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url: `${ORIGIN}/?fe02=${Date.now()}#settings/${section}` });
  await waitFor("window.__V5_UI__?.state.home.data");
  await waitFor(`document.getElementById("settings-${section}")?.getClientRects().length > 0`);
  await sleep(700);
}
const shot = async (name) =>
  writeFile(
    new URL(`./${name}.png`, import.meta.url),
    Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"),
  );

const READ = `(() => {
  const panel = document.getElementById("settings-models");
  const tools = document.getElementById("settings-tools");
  const visible = (node) => node.getClientRects().length > 0;
  const rect = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, width: r.width, height: r.height };
  };
  const rows = [...panel.querySelectorAll(".connection-row")];
  const steps = [...panel.querySelectorAll(".connection-flow .connection-step")];
  const controls = [...panel.querySelectorAll('.settings-row-control input, .settings-row-control select')]
    .filter(visible).filter((node) => !["radio", "checkbox"].includes(node.type));
  const titles = [...panel.querySelectorAll(".settings-form .settings-row-title")].filter(visible);
  const controlCells = [...panel.querySelectorAll(".settings-form .settings-row-control")].filter(visible);
  const blurred = [...panel.querySelectorAll("*"), ...tools.querySelectorAll("*")].filter((node) => {
    const value = getComputedStyle(node).backdropFilter;
    return value && value !== "none";
  }).length;
  const intake = document.getElementById("settings-integrations-intake");
  return {
    rowCount: rows.length,
    rowText: rows.map((row) => row.textContent.replace(/\\s+/g, " ").trim()),
    badge: rows.map((row) => row.querySelector(".connection-row-badge")?.textContent || null),
    primaryActions: [...panel.querySelectorAll(".primary-button")].filter(visible).length,
    addOpen: document.querySelector(".connection-add")?.open ?? null,
    pathRadios: [...panel.querySelectorAll('input[name="connection-path"]')].map((input) => input.value),
    pathTabStops: [...panel.querySelectorAll('input[name="connection-path"]')]
      .filter((input) => input.tabIndex >= 0 && (input.checked || !input.form))
      .length,
    stepCount: steps.length,
    pendingSteps: steps.filter((step) => step.classList.contains("is-pending"))
      .map((step) => step.querySelector(".connection-step-name").textContent),
    pendingControls: steps.filter((step) => step.querySelector("button, input, select, a")).length,
    promises: [...document.querySelectorAll("button")]
      .map((b) => (b.textContent || "").trim())
      .filter((t) => /Test connection|Fetch models|Detect/i.test(t)),
    baseUrlDisabled: panel.querySelector('input[name="baseUrl"]').disabled,
    advancedOpen: [...panel.querySelectorAll("details.settings-advanced")]
      .filter((node) => !node.classList.contains("connection-add"))
      .map((node) => node.open),
    saveDisabled: panel.querySelector(".primary-button").disabled,
    credentialVisible: visible(panel.querySelector(".credential-form")),
    heights: controls.map((node) => Math.round(rect(node).height)),
    radii: [...new Set(controls.map((node) => getComputedStyle(node).borderRadius))],
    titleLefts: [...new Set(titles.map((node) => Math.round(rect(node).left)))],
    controlRights: [...new Set(controlCells.map((node) => Math.round(rect(node).right)))],
    modelHelp: [...panel.querySelectorAll(".settings-row-help")].map((n) => n.textContent).join(" "),
    blurred,
    navWidth: Math.round(rect(document.querySelector(".sidebar")).width),
    overflow: document.documentElement.scrollWidth - innerWidth,
    intake: {
      steps: [...(intake?.querySelectorAll(".connection-step") || [])].length,
      pending: [...(intake?.querySelectorAll(".connection-step.is-pending") || [])].length,
      focusable: [...(intake?.querySelectorAll("button, a, input, select, textarea, [tabindex]") || [])].length,
    },
  };
})()`;

/** 只经产品自己的控件切换路径：点 label，让它的 change 处理器决定其余字段。 */
const choosePath = (id) => ev(`(() => {
  const input = document.getElementById("connection-path-${id}");
  input.click();
  return input.checked;
})()`);

try {
  await open("models");
  let r = await ev(READ);
  await shot("settings-models-1440-light");

  record("NAV-1", r.navWidth === 256, { navWidth: r.navWidth });
  record("MOD-1", r.rowCount === 1 && /Local test/.test(r.rowText[0]) &&
    /Local deterministic model/.test(r.rowText[0]) &&
    /Local endpoint fixed by the host/.test(r.rowText[0]) &&
    /No key needed/.test(r.rowText[0]), { rowCount: r.rowCount, rowText: r.rowText, badge: r.badge });
  record("MOD-2", r.primaryActions === 1, { primaryActions: r.primaryActions });
  record("MOD-3", r.addOpen === false, { addOpen: r.addOpen });
  record("MOD-5", r.promises.length === 0, { promises: r.promises });
  record("MOD-11", /Chats already open keep the model they were bound to/.test(r.modelHelp), {});
  record("MOD-10", r.blurred === 0, { blurred: r.blurred });

  // Add provider：展开后读三条路径与统一流程。
  await ev(`(document.querySelector(".connection-add").open = true, true)`);
  await sleep(200);
  r = await ev(READ);
  await shot("settings-models-add-1440-light");
  record("MOD-3b", r.pathRadios.length === 3 && r.pathTabStops === 1,
    { pathRadios: r.pathRadios, pathTabStops: r.pathTabStops });
  record("MOD-4", r.stepCount === 5 && r.pendingSteps.length === 2 && r.pendingControls === 0,
    { stepCount: r.stepCount, pendingSteps: r.pendingSteps, pendingControls: r.pendingControls });

  // Compatible endpoint：Advanced 自动展开，Base URL 空时 Save 不可用。
  await choosePath("compatible");
  await sleep(300);
  r = await ev(READ);
  record("MOD-6", r.advancedOpen.some(Boolean) && r.saveDisabled === true && r.baseUrlDisabled === false,
    { advancedOpen: r.advancedOpen, saveDisabled: r.saveDisabled });

  // Local endpoint：端点由宿主固定，凭据块退出。
  await choosePath("local");
  await sleep(300);
  r = await ev(READ);
  record("MOD-7", r.baseUrlDisabled === true && r.credentialVisible === false,
    { baseUrlDisabled: r.baseUrlDisabled, credentialVisible: r.credentialVisible });
  record("MOD-8", new Set(r.heights).size === 1 && r.radii.length === 1,
    { heights: [...new Set(r.heights)], radii: r.radii });
  record("MOD-9", r.titleLefts.length === 1 && r.controlRights.length === 1,
    { titleLefts: r.titleLefts, controlRights: r.controlRights });
  record("MOD-13 · 1440", r.overflow <= 0, { overflow: r.overflow });

  // Tools & Integrations：同一形态的 MCP intake。
  await open("tools");
  const t = await ev(READ);
  await shot("settings-tools-1440-light");
  record("MOD-12", t.intake.steps === 6 && t.intake.pending === 3 && t.intake.focusable === 0,
    { intake: t.intake });

  await open("models", { width: 390, height: 844 });
  const narrow = await ev(READ);
  await shot("settings-models-390-light");
  record("MOD-13 · 390", narrow.overflow <= 0, { overflow: narrow.overflow });
} finally {
  const pass = results.filter((entry) => entry.pass).length;
  for (const entry of results)
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.id} ${JSON.stringify({ ...entry, id: undefined, pass: undefined })}`);
  console.log(`${pass} / ${results.length}`);
  await writeFile(new URL("./models-checks.json", import.meta.url), JSON.stringify(results, null, 2));
  await close();
  if (pass !== results.length) process.exitCode = 1;
}
