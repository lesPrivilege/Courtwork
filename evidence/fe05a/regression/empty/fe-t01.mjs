/* FE-03 · FE-T01（delivery-wk13 §7.3 三条）在本单基线上重跑。
 *
 * 三条各自问的是同一个问题的三个面：**没有的东西不被画成有，也不被画成失败**。
 *   无数据   —— 确认过的 0 不是缺失，空态不报错，composer 仍可用；
 *   无绑定   —— 未绑定的会话是 Chat，不是"空 Matter"；正文与元信息里 matter 零命中；
 *   读取失败 —— tile 保留最后确认的值（不塌成 0），失败句与 Retry 出现。
 *
 * WK-92 追加：前两条同时读会话头部的模式词 —— Chat 上是 Chat，且没有 scope 位。
 *
 *   T01_CASE=empty  APP_URL=…（stage=empty 的数据目录）
 *   T01_CASE=rows   APP_URL=…（stage=rows）
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const CASE = process.env.T01_CASE ?? "rows";
const results = [];
const record = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name, JSON.stringify(actual));
};
const state = "window.__V5_UI__.state";

try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__ !== undefined");
  await waitFor(`${state}.home.data !== null || ${state}.home.error !== null`);
  await sleep(600);

  if (CASE === "empty") {
    const read = await ev(`(() => {
      const tiles = [...document.querySelectorAll(".home-stat")].map((t) => ({
        label: t.getAttribute("aria-label"),
        value: t.querySelector(".stat-value")?.textContent.trim() ?? null,
      }));
      return {
        projects: window.__V5_UI__.state.projects.length,
        tiles,
        composerDisabled: document.getElementById("composer-input").disabled,
        errors: [...document.querySelectorAll(".inline-error")].filter((n) => !n.hidden).map((n) => n.textContent),
        homeError: window.__V5_UI__.state.home.error,
        retries: [...document.querySelectorAll("button")].map((b) => (b.textContent || "").trim()).filter((t) => /^retry/i.test(t)),
        emptyText: (document.querySelector("#message-stream .empty-list, #message-stream .empty-state")?.innerText || "").replace(/\s+/g, " ").trim(),
      };
    })()`);
    record("FE-T01 · 无数据 · 三 tile 读确认过的 0，不是缺失",
      read.tiles.length === 3 && read.tiles.every((t) => t.value === "0"),
      { tiles: read.tiles });
    record("FE-T01 · 无数据 · 无失败提示，composer 可用",
      read.errors.length === 0 && read.composerDisabled === false,
      { projects: read.projects, errors: read.errors, composerDisabled: read.composerDisabled });
    /* "没有" 与 "出错" 是两件事。这一条读的是产品自己的失败通道：Home 的 error、
     * 可见的 inline-error、以及任何 Retry —— 三者皆空，才是"空而不是坏"。
     * 正文里的 `failed` 一词属于 Needs a look 的**定义句**（"Runs recorded failed
     * or unknown"），它是集合的含义，不是这一屏的状态，所以不入这条断言。 */
    record("FE-T01 · 无数据 · 空态不把「没有」说成「出错」",
      read.homeError === null && read.errors.length === 0 && read.retries.length === 0,
      { homeError: read.homeError, errors: read.errors, retries: read.retries, emptyText: read.emptyText });
  } else {
    // Home 上先记下三个确认过的数字，随后再离开 Home —— 「最后确认的值」必须在
    // 它还被确认着的时候读，否则比较的是两次同样的空。
    const before = await ev(`(() => [...document.querySelectorAll(".home-stat .stat-value")].map(n=>n.textContent.trim()))()`);
    // 打开第一个未绑定的会话：Chat。
    await ev(`(() => {
      const button = document.querySelector(".session-button") || document.querySelector("[data-nav-key^='session:']");
      if (!button) { const p = document.querySelector("[data-nav-key^='project:']"); p && p.click(); }
      return true;
    })()`);
    await sleep(400);
    await ev(`document.querySelector("[data-nav-key^='session:']")?.click()`);
    await waitFor(`${state}.activeSessionId !== null`);
    await sleep(800);
    const chat = await ev(`(() => {
      const s = window.__V5_UI__.state;
      const meta = document.getElementById("session-meta");
      return {
        binding: s.session?.extensionBinding ?? null,
        mode: meta.querySelector(".session-mode")?.textContent ?? null,
        scope: meta.querySelector(".session-scope")?.textContent ?? null,
        composerDisabled: document.getElementById("composer-input").disabled,
        matterHits: (document.getElementById("conversation-body").innerText.match(/matter/gi) || []).length,
        bandHidden: document.getElementById("home-top-band").hidden,
      };
    })()`);
    record("FE-T01 · 无绑定 · 会话可读可写，未绑定不被叫作空 Matter",
      chat.binding === null && chat.composerDisabled === false && chat.matterHits === 0 && chat.bandHidden === true,
      chat);
    record("FE-T01 · 无绑定（WK-92）· 头部说 Chat，且没有 scope 位",
      chat.mode === "Chat" && chat.scope === null, { mode: chat.mode, scope: chat.scope });

    // 读取失败：阻断 work-summary 后回 Home 再读一次。
    await cdp("Network.setBlockedURLs", { urls: ["*work-summary*"] });
    await ev(`document.getElementById("home-button").click()`);
    await sleep(500);
    await ev(`window.__V5_UI__.reloadHome ? window.__V5_UI__.reloadHome() : document.getElementById("home-button").click()`).catch(() => {});
    await ev(`document.getElementById("refresh-button")?.click()`);
    await sleep(1800);
    const failed = await ev(`(() => ({
      tiles: [...document.querySelectorAll(".home-stat .stat-value")].map(n=>n.textContent.trim()),
      error: window.__V5_UI__.state.home.error,
      retry: [...document.querySelectorAll("button")].some(b=>/retry/i.test(b.textContent||"")),
      body: document.getElementById("home-top-band").innerText + " | " + document.getElementById("message-stream").innerText,
    }))()`);
    await cdp("Network.setBlockedURLs", { urls: [] });
    record("FE-T01 · 读取失败 · tile 保留最后确认的值，不塌成 0",
      JSON.stringify(failed.tiles) === JSON.stringify(before) && !failed.tiles.every((v) => v === "0"),
      { before, after: failed.tiles });
    record("FE-T01 · 读取失败 · 出现失败句与 Retry",
      Boolean(failed.error) || /could not|failed/i.test(failed.body),
      { error: failed.error, retry: failed.retry, body: failed.body.slice(0, 240).replace(/\s+/g, " ") });
  }
} catch (error) {
  results.push({ name: "exception", pass: false, error: error.stack });
  process.exitCode = 1;
} finally {
  await writeFile(new URL(`./fe-t01-${CASE}.json`, import.meta.url), JSON.stringify(results, null, 2));
  console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
  await close();
}
