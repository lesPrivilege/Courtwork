/* FE-05a Commit D · M-18（WK-138 ②）· HOME-16 首屏余量在三档 Text size 各跑一次。
 *
 * 门槛沿 contracts/home-modules §2：1440 × 900、Modules 版面，第一条具体待办在主区
 * 底边之上至少露出 12px。字号放大会把 Today 与列表行撑高，余量从这里出（M-7）。
 * 过不了**不做**任何自动折叠或隐藏：`HOME_COMPOSER_CENTRE` 0.56 的修订不在本单
 * 作者的权限内，只记实测高度与吃掉预算的那个元素，交回裁定。
 * harness 逐字复制自 evidence/cc-d0a/browser.mjs，只改端口。
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile, mkdir } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass, ...detail });
const SCALES = [["small", 0.929], ["medium", 1], ["large", 1.143]];

const PREF_KEY = `(() => {
  let h = 2166136261;
  const text = location.origin;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return "cw:prefs:" + h.toString(36);
})()`;
const setPreferences = async (patch) => {
  await ev(`(() => {
    const key = ${PREF_KEY};
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    Object.assign(stored, ${JSON.stringify(patch)});
    localStorage.setItem(key, JSON.stringify(stored));
    return true;
  })()`);
};
async function open({ width = 1440, height = 900 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await cdp("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(700);
}
/* 余量与吃掉预算的那一段：主区底边 − 第一条待办的顶边，外加 composer 之上每一段的高度。 */
const BUDGET = `(() => {
  const rect = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const body = document.getElementById("conversation-body");
  const area = rect(body);
  const todo = document.querySelector(".home-row") || document.querySelector(".home-card");
  const composer = rect(document.getElementById("composer-form"));
  const segments = [...body.children]
    .filter((n) => !n.hidden && n.getClientRects().length)
    .map((n) => ({ id: n.id || n.className, height: Math.round(n.getBoundingClientRect().height) }));
  return {
    scale: getComputedStyle(document.documentElement).getPropertyValue("--text-scale").trim(),
    dataTextSize: document.documentElement.dataset.textSize ?? "medium",
    layout: document.getElementById("home-module-band") &&
      !document.getElementById("home-module-band").hidden ? "modules" : "simple",
    area, composer, segments,
    todo: rect(todo),
    room: todo && area ? Math.round(area.top + area.height - todo.getBoundingClientRect().top) : null,
    largest: segments.slice().sort((a, b) => b.height - a.height)[0] ?? null,
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
})()`;

try {
  await open();
  await setPreferences({ homeLayout: "modules", homeModuleBand: "expanded" });
  for (const [name, expected] of SCALES) {
    await setPreferences({ textSize: name });
    await open();
    const budget = await ev(BUDGET);
    await mkdir(new URL("./screenshots/", import.meta.url), { recursive: true });
    await writeFile(new URL(`./screenshots/home-modules-1440x900-${name}-v1.png`, import.meta.url),
      Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
    record(`HOME-16-${name}`, budget.room !== null && budget.room >= 12, {
      textSize: name, expectedScale: expected, ...budget, threshold: 12,
    });
  }
  await setPreferences({ textSize: "medium" });
} finally {
  await writeFile(new URL("./home-text-scale.json", import.meta.url),
    JSON.stringify({ results, passed: results.filter((r) => r.pass).length, total: results.length }, null, 1));
  console.log(results.map((r) => `${r.pass ? "ok" : "FAIL"} ${r.id} room=${r.room} scale=${r.scale}`).join("\n"));
  console.log(`${results.filter((r) => r.pass).length}/${results.length}`);
  await close();
}
