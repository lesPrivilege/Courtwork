/* FE-03 第 0 项（WK-108）· BE-17 / BE-18 的三种展示，经产品自己的控件与
 * /api/v5 流量取得。
 *
 * 被探测的目录是本脚本自己起的一个 loopback fixture，绑在临时端口上，只回三种
 * 应答：一个合法目录、401、404。它不是任何真实 provider，也不持有任何真实 key；
 * 送进去的 key 是一个合成串，只用来观察"有 key 时 Authorization 出现、无 key 时
 * 这个字段根本不存在"。
 *
 *   PRB-1  ok               · 状态与后端原话逐字上屏，且不被说成"已验证 / 可推理"
 *   PRB-2  discover ok      · 目录报告 N 个模型，ID 原样列出
 *   PRB-3  不注入           · Model 下拉与已保存配置在 discover 成功后逐字不变
 *   PRB-4  authentication_failed
 *   PRB-5  unsupported
 *   PRB-6  无 key 时省略字段：目标目录收到的请求没有 Authorization
 *   PRB-7  有 key 时只作 Bearer 送出，不加任何自定义 header
 *   PRB-8  改地址后旧结果离开（一次探测只描述它自己那次请求）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";
import http from "node:http";

const results = [];
const record = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name, JSON.stringify(actual));
};

const seen = [];
const fixture = http.createServer((req, res) => {
  seen.push({
    url: req.url,
    authorization: req.headers.authorization ?? null,
    extra: Object.keys(req.headers).filter((h) => h.startsWith("x-")),
  });
  const mode = req.url.split("/")[1];
  if (mode === "auth") { res.writeHead(401); res.end("{}"); return; }
  if (mode === "missing") { res.writeHead(404); res.end("{}"); return; }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ data: [{ id: "probe-model-a" }, { id: "probe-model-b" }, { id: "probe-model-c" }] }));
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${fixture.address().port}`;

const setBaseUrl = (value) => ev(`(() => {
  const input = document.querySelector('#settings-models input[name="baseUrl"]');
  input.value = ${JSON.stringify(value)};
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input.value;
})()`);
const setKey = (value) => ev(`(() => {
  const input = document.querySelector('.credential-form input[type="password"]');
  if (!input) return null;
  input.value = ${JSON.stringify(value)};
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input.value;
})()`);
const READ = `(() => {
  const status = document.querySelector(".connection-probe-result");
  const models = [...document.querySelectorAll(".connection-probe-model")].map((n) => n.textContent);
  const catalogue = [...document.querySelectorAll(".connection-add .form-help")]
    .filter((n) => !n.hidden).map((n) => n.textContent.trim())
    .filter((t) => /^The directory reports/.test(t));
  return {
    hidden: status.hidden,
    text: status.textContent,
    failed: status.classList.contains("is-failed"),
    models,
    catalogue,
    modelOptions: [...document.querySelector('#settings-models select[name="model"]').options].map((o) => o.value),
  };
})()`;
async function probe(which) {
  const key = which === "test" ? "connection:test" : "connection:discover";
  await ev(`document.querySelector('[data-focus-key="${key}"]').click()`);
  await waitFor(`document.querySelector(".connection-probe-result").textContent !== "Probing…"`, 20000);
  await sleep(150);
  return ev(READ);
}

try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: `${ORIGIN}#settings/models` });
  await waitFor(`document.getElementById("settings-models") && !document.getElementById("settings-models").hidden`);
  await sleep(600);
  const savedBefore = await ev(`window.__V5_UI__.request("/provider-config")`);
  await ev(`(document.querySelector(".connection-add").open = true, true)`);
  await sleep(200);
  await ev(`document.getElementById("connection-path-compatible").click()`);
  await sleep(400);

  // 1 · 合法目录，先不填 key。
  await setBaseUrl(`${base}/ok`);
  await sleep(150);
  const okTest = await probe("test");
  record("PRB-1 · test ok：状态与后端原话逐字上屏",
    okTest.text.startsWith("ok · ") && /handshake succeeded/.test(okTest.text) &&
      okTest.failed === false && !/verified|configured|can reason|ready/i.test(okTest.text) &&
      okTest.models.length === 0,
    { text: okTest.text, models: okTest.models });

  const okFetch = await probe("discover");
  record("PRB-2 · discover ok：目录报告 3 个模型，ID 原样列出",
    okFetch.text.startsWith("ok · ") &&
      okFetch.catalogue.length === 1 && /reports 3 models/.test(okFetch.catalogue[0]) &&
      JSON.stringify(okFetch.models) === JSON.stringify(["probe-model-a", "probe-model-b", "probe-model-c"]),
    { text: okFetch.text, catalogue: okFetch.catalogue, models: okFetch.models });

  const savedAfter = await ev(`window.__V5_UI__.request("/provider-config")`);
  record("PRB-3 · discover 的模型 ID 不进 Model 下拉，也不进已保存配置",
    okFetch.modelOptions.every((id) => !id.startsWith("probe-model")) &&
      JSON.stringify(savedAfter) === JSON.stringify(savedBefore),
    { modelOptions: okFetch.modelOptions, configUnchanged: JSON.stringify(savedAfter) === JSON.stringify(savedBefore) });

  record("PRB-6 · 无 key 时 apiKey 字段被省略：目标目录收到的请求没有 Authorization",
    seen.length >= 2 && seen.every((r) => r.authorization === null) && seen.every((r) => r.extra.length === 0),
    { requests: seen.map((r) => ({ url: r.url, authorization: r.authorization, extra: r.extra })) });

  // 2 · 同一地址加一个合成 key：只作 Bearer 送出。
  const marked = seen.length;
  await setKey("synthetic-probe-key");
  await sleep(150);
  const keyed = await probe("test");
  record("PRB-7 · 有 key 时只作 Bearer 送出，且不加任何自定义 header",
    seen.slice(marked).every((r) => r.authorization === "Bearer synthetic-probe-key" && r.extra.length === 0) &&
      keyed.text.startsWith("ok · "),
    { requests: seen.slice(marked), text: keyed.text });
  await setKey("");
  await sleep(150);

  // 3 · 401 与 404。
  await setBaseUrl(`${base}/auth`);
  await sleep(150);
  record("PRB-8 · 改地址后上一次的结果离开",
    (await ev(READ)).hidden === true, { hidden: (await ev(READ)).hidden });
  const auth = await probe("test");
  record("PRB-4 · authentication_failed 原样呈现，且不被改写成一句更好听的话",
    auth.text.startsWith("authentication_failed · ") && auth.failed === true &&
      !/try again|check your key/i.test(auth.text),
    { text: auth.text });

  await setBaseUrl(`${base}/missing`);
  await sleep(150);
  const unsupported = await probe("discover");
  record("PRB-5 · unsupported 原样呈现，且没有目录行",
    unsupported.text.startsWith("unsupported · ") && unsupported.failed === true &&
      unsupported.models.length === 0 && unsupported.catalogue.length === 0,
    { text: unsupported.text, catalogue: unsupported.catalogue });

  const shot = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(new URL("./settings-models-probe-1440-light.png", import.meta.url), Buffer.from(shot.data, "base64"));
} catch (error) {
  results.push({ name: "exception", pass: false, error: error.stack });
  process.exitCode = 1;
} finally {
  await writeFile(new URL("./probe-checks.json", import.meta.url), JSON.stringify({ results, upstreamRequests: seen }, null, 2));
  console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
  fixture.close();
  await close();
}
