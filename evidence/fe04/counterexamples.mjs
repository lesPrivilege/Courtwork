// FE-03 · copied verbatim from evidence/fe02-main-integration-20260909/, port only.
/* FE-02 分配反例 · FE-T03（FN-14 / 15 / 16）：请求值 / 有效值 / 绑定值三者分开。
 *
 *   FE-T03-a  基线：有效值（后端持有的连接）与绑定值（既有 Run 冻结的 runtime.bound）
 *             读得出来，且此刻一致。
 *   FE-T03-b  只在表单里改动（请求值）：display name、路径、provider、model 全改，
 *             不按 Save —— 有效值不动，Connections 那一行仍然只说已保存的事实，
 *             界面上没有任何一句把草稿说成已生效。
 *   FE-T03-c  按 Save：有效值变了，行随之变；既有 Run 的 runtime.bound 不变 ——
 *             改默认只影响以后的 Chat / Work。
 *   FE-T03-d  改回本地连接：有效值回到起点，绑定值自始至终没有被任何一步改写。
 *   FE-T03-e  另一台实例上有一个等人回答的 Run：同一次 Save 被后端拒绝并如实说明
 *             冻结原因，界面不说"已排队"也不说"结束后自动生效"（FN-16）。
 *
 * 全部经产品自己的控件与它自己的 /api/v5 读法（`window.__V5_UI__.request`），
 * 不直接写 UI 状态，不伪造后端响应。
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, obligation, pass, detail) =>
  results.push({ id, obligation, pass: Boolean(pass), detail });

const FROZEN = process.env.FROZEN_APP_URL ?? "http://127.0.0.1:8897";

async function load(section = "models", origin = ORIGIN) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  await cdp("Page.navigate", { url: `${origin}/?fe02t03=${Date.now()}#settings/${section}` });
  await waitFor("window.__V5_UI__?.state.home.data");
  await waitFor(`document.getElementById("settings-${section}")?.getClientRects().length > 0`);
  await sleep(700);
}

/** 有效值：后端持有的连接。绑定值：一个既有 Run 冻结下来的 runtime.bound。 */
const READ_FACTS = `(async () => {
  const ui = window.__V5_UI__;
  const config = await ui.request("/provider-config");
  const list = await ui.request("/sessions");
  const withRun = [];
  for (const session of list.sessions) {
    const detail = await ui.request("/sessions/" + session.id);
    const bound = (detail.events || []).find((event) => event.type === "runtime.bound");
    if (!bound) continue;
    const resources = bound.data.resources || [];
    withRun.push({
      sessionId: session.id,
      provider: resources.find((r) => r.kind === "provider")?.title ?? null,
      model: resources.find((r) => r.kind === "model")?.title ?? null,
    });
  }
  const panel = document.getElementById("settings-models");
  return {
    effective: { provider: config.config.provider, model: config.config.model, baseUrl: config.config.baseUrl ?? null },
    bound: withRun,
    row: [...panel.querySelectorAll(".connection-row")]
      .map((row) => row.textContent.replace(/\\s+/g, " ").trim()),
    claims: [...panel.querySelectorAll("p, span")]
      .map((node) => (node.textContent || "").trim())
      .filter((text) => /applied|queued|will take effect|now using/i.test(text)),
  };
})()`;

/** 只经产品自己的控件填表：设 value 后派发它监听的事件，处理器决定其余字段。 */
const draft = (provider, model) => ev(`(async () => {
  const panel = document.getElementById("settings-models");
  const set = (node, value, type) => {
    node.value = value;
    node.dispatchEvent(new Event(type, { bubbles: true }));
  };
  panel.querySelector(".connection-add").open = true;
  document.getElementById("connection-path-catalog").click();
  await new Promise((r) => setTimeout(r, 300));
  set(panel.querySelector('select[name="provider"]'), ${JSON.stringify(provider)}, "change");
  await new Promise((r) => setTimeout(r, 300));
  set(panel.querySelector('select[name="model"]'), ${JSON.stringify(model)}, "change");
  await new Promise((r) => setTimeout(r, 200));
  return {
    provider: panel.querySelector('select[name="provider"]').value,
    model: panel.querySelector('select[name="model"]').value,
  };
})()`);

const saveConnection = () => ev(`(async () => {
  const panel = document.getElementById("settings-models");
  panel.querySelector(".primary-button").click();
  await new Promise((r) => setTimeout(r, 1500));
  return panel.querySelector(".primary-button").disabled;
})()`);

const chooseLocal = () => ev(`(async () => {
  const panel = document.getElementById("settings-models");
  panel.querySelector(".connection-add").open = true;
  document.getElementById("connection-path-local").click();
  await new Promise((r) => setTimeout(r, 400));
  panel.querySelector(".primary-button").click();
  await new Promise((r) => setTimeout(r, 1500));
  return true;
})()`);

try {
  await load();
  const before = await ev(READ_FACTS);
  record(
    "FE-T03-a",
    "FN-14 · 三层可分别读出",
    before.effective.provider === "fake-openai-loopback" &&
      before.bound.length > 0 &&
      before.bound.every((entry) => entry.model === "fake-model"),
    { effective: before.effective, bound: before.bound },
  );

  const drafted = await draft("deepseek", "deepseek-v4-pro");
  const during = await ev(READ_FACTS);
  record(
    "FE-T03-b",
    "FN-14 / 16 · 请求值不冒充有效值",
    drafted.provider === "deepseek" &&
      drafted.model === "deepseek-v4-pro" &&
      during.effective.provider === "fake-openai-loopback" &&
      during.effective.model === "fake-model" &&
      during.row.every((text) => /Local test/.test(text)) &&
      during.claims.length === 0,
    { drafted, effective: during.effective, row: during.row, claims: during.claims },
  );

  await saveConnection();
  await sleep(600);
  const after = await ev(READ_FACTS);
  const boundUnchanged =
    JSON.stringify(after.bound) === JSON.stringify(before.bound);
  record(
    "FE-T03-c",
    "FN-14 / 15 · 有效值变、绑定值不变",
    after.effective.provider === "deepseek" &&
      after.effective.model === "deepseek-v4-pro" &&
      after.row.some((text) => /^DeepSeekIn force/.test(text)) &&
      boundUnchanged,
    { effective: after.effective, row: after.row, boundBefore: before.bound, boundAfter: after.bound },
  );

  await chooseLocal();
  await sleep(600);
  const restored = await ev(READ_FACTS);
  record(
    "FE-T03-d",
    "FN-14 · 绑定值自始至终不被改写",
    restored.effective.provider === "fake-openai-loopback" &&
      JSON.stringify(restored.bound) === JSON.stringify(before.bound),
    { effective: restored.effective, bound: restored.bound },
  );
  /* FE-T03-e · active Run 冻结时的诚实：后端拒绝，界面照抄原因，不发明"已排队"。 */
  await load("models", FROZEN);
  await draft("deepseek", "deepseek-v4-pro");
  await saveConnection();
  await sleep(600);
  const frozen = await ev(`(async () => {
    const panel = document.getElementById("settings-models");
    const config = await window.__V5_UI__.request("/provider-config");
    return {
      error: (panel.querySelector(".inline-error")?.textContent || "").trim(),
      errorShown: panel.querySelector(".inline-error")?.hidden === false,
      effective: config.config.provider,
      queueWords: [...panel.querySelectorAll("p, span")]
        .map((node) => (node.textContent || "").trim())
        .filter((text) => /queued|will apply after|automatically/i.test(text)),
    };
  })()`);
  record(
    "FE-T03-e",
    "FN-16 · 冻结时不假装排队",
    frozen.errorShown &&
      /frozen during a run/i.test(frozen.error) &&
      frozen.effective === "fake-openai-loopback" &&
      frozen.queueWords.length === 0,
    frozen,
  );
} finally {
  const pass = results.filter((entry) => entry.pass).length;
  for (const entry of results) {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.id} — ${entry.obligation}`);
    console.log(`      ${JSON.stringify(entry.detail)}`);
  }
  console.log(`${pass} / ${results.length}`);
  await writeFile(new URL("./counterexamples.json", import.meta.url), JSON.stringify(results, null, 2));
  await close();
  if (pass !== results.length) process.exitCode = 1;
}
