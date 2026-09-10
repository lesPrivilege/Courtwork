// Independent browser checks for R2-SD01 at eff0e41.
// Drives a real Chromium (Playwright, headless) with keyboard/mouse input
// events against review-serve.mjs, which proxies exact production bytes.
//
//   REVIEW_PORT (default 8885)   REVIEW_OUT (default ./screens next to this file)
//   PLAYWRIGHT_MODULE (default: `npm root -g`/playwright/index.mjs)
//
// Network-level fault checks (route interception of the product's own
// /api/v5 JSON) are labelled "network-mock" in results; they never inject code
// into the page and never use SD_FIXTURE_ADAPTER.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.REVIEW_PORT || 8885);
const base = `http://127.0.0.1:${port}`;
const out = process.env.REVIEW_OUT || path.join(here, "screens");
mkdirSync(out, { recursive: true });
const pwModule = process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs");
const { chromium } = await import(pwModule);

const config = await (await fetch(`${base}/review-config.json`)).json();
const results = [];
const shots = {};
function rec(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass === true ? "PASS" : pass === false ? "FAIL" : "NOTE"} ${id} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

const channel = process.env.REVIEW_BROWSER_CHANNEL || undefined; // e.g. "chrome" = installed Google Chrome, temp profile
const browser = await chromium.launch(channel ? { channel } : {});
async function newPage({ width = 1440, height = 900, scheme = "light" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => rec("page-error", false, error.message));
  await page.goto(base + "/");
  await page.waitForSelector("#navigation-panel", { state: "attached" });
  await page.waitForTimeout(500);
  return page;
}
async function shot(page, name, caption) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  const vp = page.viewportSize();
  shots[`${name}.png`] = { caption, viewport: `${vp.width}x${vp.height}`, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") };
}
async function selectSession(page, key) {
  const title = { normal: "Review · normal", multi: "Review · two runs", long: "Review · long file name", empty: "Review · no files", failed: "Review · failed run", none: "Review · no runs" }[key];
  const narrow = page.viewportSize().width < 1024;
  if (narrow && !(await page.locator("#navigation-panel").isVisible())) await page.getByRole("button", { name: /navigation|sidebar|menu/i }).first().click();
  await page.locator("#navigation-panel").getByText(title, { exact: true }).click();
  await page.waitForFunction((t) => document.querySelector(".chat-header")?.textContent.includes(t), title);
  await page.waitForTimeout(400);
}
const card = (page) => page.locator(".sd-run-summary");
const cardState = (page) => page.evaluate(() => {
  const c = document.querySelector(".sd-run-summary");
  if (!c) return null;
  const d = [...c.querySelectorAll("details")];
  return {
    hidden: c.hidden || !c.getClientRects().length,
    text: c.innerText.replace(/\s+/g, " ").trim(),
    state: c.querySelector(".rail-card-state")?.textContent,
    files: d[0]?.querySelector("summary")?.textContent,
    open: d.map((x) => x.open),
    runRow: [...c.querySelectorAll(".rail-row")].find((r) => r.textContent.startsWith("Run"))?.querySelector(".rail-row-value")?.textContent,
  };
});
const focusInfo = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { tag: a?.tagName, key: a?.dataset?.focusKey || null, label: a?.getAttribute("aria-label") || a?.textContent?.trim().slice(0, 40), id: a?.id || null };
});
const surface = (page) => page.evaluate(() => {
  const p = document.getElementById("surface-panel");
  const sel = [...document.querySelectorAll('.surface-tab[role="tab"], .surface-tab-select')].filter((t) => !t.hidden && t.closest("[hidden]") === null && t.getAttribute("aria-selected") === "true").map((t) => t.id);
  return { cls: p.className, railHidden: document.getElementById("surface-rail").hidden, selected: sel, doc: document.getElementById("surface-document-select")?.textContent?.trim() || null, docHidden: document.getElementById("surface-document-tab").hidden, runPane: document.getElementById("run-content").hidden ? null : document.getElementById("run-content").innerText.slice(0, 400) };
});
const overflow = (page) => page.evaluate(() => {
  const se = document.scrollingElement;
  const rail = document.getElementById("surface-rail");
  const r = rail.getBoundingClientRect();
  const escapes = [...rail.querySelectorAll("*")].filter((n) => { const b = n.getBoundingClientRect(); return b.width && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).length;
  return { pageScrollX: se.scrollWidth - innerWidth, railScrollW: rail.scrollWidth - rail.clientWidth, railScrollH: rail.scrollHeight - rail.clientHeight, railOverflowY: getComputedStyle(rail).overflowY, railRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), height: Math.round(r.height) }, viewportH: innerHeight, escapes };
});

// ---------------------------------------------------------------- 1440 light
{
  const page = await newPage();
  rec("prod-mode", await page.evaluate(() => !document.querySelector("[class*=fixture], [id*=fixture]") && !/fixture/i.test(document.body.innerText)), "no fixture DOM/text in production page");

  await selectSession(page, "normal");
  let s = await cardState(page);
  rec("normal-default-collapsed", s && !s.hidden && s.open.every((o) => !o) && s.files === "Files · 1" && s.state === "Completed", s);
  await shot(page, "1440-light-collapsed", "normal session, summary default collapsed");

  // Enter / Space on native summary keep focus on trigger.
  await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  let f = await focusInfo(page); s = await cardState(page);
  rec("enter-opens-files-focus-stays", s.open[0] === true && f.key === "run-summary-files", { open: s.open, focus: f });
  await page.keyboard.press(" ");
  await page.waitForTimeout(150);
  f = await focusInfo(page); s = await cardState(page);
  rec("space-toggles-files-focus-stays", s.open[0] === false && f.key === "run-summary-files", { open: s.open, focus: f });
  await page.keyboard.press(" ");
  await page.waitForTimeout(150);

  // Tab order through the card.
  const order = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push((await focusInfo(page)).key || (await focusInfo(page)).label); }
  rec("tab-order-files-open", order[0] === "run-summary-file:0" && order[1] === "run-summary-information", order);
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const order2 = [];
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Tab"); order2.push((await focusInfo(page)).key || (await focusInfo(page)).label); }
  rec("tab-order-information-open", order2[0] === "run-summary-open", order2);
  await shot(page, "1440-light-both-open", "normal session, Files and Run information expanded");

  // Idle re-render cadence (does polling rebuild the card while the user reads?).
  const rerenders = await page.evaluate(() => new Promise((resolve) => {
    const c = document.querySelector(".sd-run-summary");
    let n = 0; const mo = new MutationObserver((list) => { n += list.filter((m) => m.target === c && m.type === "childList").length; });
    mo.observe(c, { childList: true });
    setTimeout(() => { mo.disconnect(); resolve(n); }, 5000);
  }));
  rec("idle-rerender-5s", null, `card childList rebuilds in 5s idle: ${rerenders}`);

  // Preview a recorded file: same object in right tab, Escape returns focus.
  await page.locator('.sd-run-summary [data-focus-key="run-summary-file:0"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  let sf = await surface(page);
  rec("file-opens-in-right-tab", /is-expanded/.test(sf.cls) && sf.selected.includes("surface-document-select") && /source-note\.txt/.test(sf.doc || ""), sf);
  await shot(page, "1440-light-file-tab", "recorded file opened from the summary in the right tab (view switch)");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  f = await focusInfo(page); sf = await surface(page);
  rec("escape-from-file-returns-to-summary-row", !/is-expanded/.test(sf.cls) && f.key === "run-summary-file:0", { focus: f, cls: sf.cls });

  // Open Run in right panel: same identity; Escape returns to Open.
  const runId = config.runs.normal;
  await page.locator('.sd-run-summary [data-focus-key="run-summary-open"]').focus();
  const runReads = [];
  page.on("request", (r) => { if (r.url().includes(`/api/v5/runs/${runId}`)) runReads.push(Date.now()); });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const afterFirst = runReads.length;
  // Duplicate activation: a second synthetic click on the (possibly detached) Open control.
  await page.evaluate(() => document.querySelector('.sd-run-summary [data-focus-key="run-summary-open"]')?.click());
  await page.waitForTimeout(400);
  sf = await surface(page);
  rec("run-opens-in-right-tab", sf.selected.includes("surface-run-tab") && (sf.runPane || "").length > 0, { selected: sf.selected, cls: sf.cls });
  rec("run-open-requests", null, `GET /runs/${runId}: ${afterFirst} after one Enter; ${runReads.length} after an extra click on the Open control while the Run tab is shown`);
  const runPaneHasId = await page.evaluate((id) => document.getElementById("run-content").innerText.includes(id.slice(0, 8)) || document.getElementById("run-content").textContent.includes(id), runId);
  rec("run-tab-same-identity", null, `run pane text contains run id prefix: ${runPaneHasId}`);
  await shot(page, "1440-light-run-tab", "Run opened from summary in the right panel");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  f = await focusInfo(page);
  rec("escape-from-run-returns-to-open", f.key === "run-summary-open", f);

  // Document × vs Hide work surface.
  await page.locator('.sd-run-summary [data-focus-key="run-summary-file:0"]').click();
  await page.waitForTimeout(600);
  const labels = await page.evaluate(() => ({ docClose: document.getElementById("surface-document-close").getAttribute("aria-label"), hide: document.getElementById("close-surface-button").getAttribute("aria-label"), expand: document.getElementById("surface-expand-button").getAttribute("aria-label"), showHidden: document.getElementById("show-surface-button").hidden }));
  await page.locator("#surface-document-close").click();
  await page.waitForTimeout(400);
  sf = await surface(page); f = await focusInfo(page);
  rec("doc-close-only-closes-document", sf.docHidden && /is-open/.test(sf.cls) && !/is-expanded/.test(sf.cls) && !sf.railHidden, { labels, after: sf, focus: f });
  const hideLabel = await page.locator("#show-surface-button").getAttribute("aria-label");
  await page.locator("#show-surface-button").click();
  await page.waitForTimeout(300);
  sf = await surface(page);
  rec("hide-work-surface-label", hideLabel === "Hide work surface", hideLabel);
  rec("hide-work-surface-hides-all", !/is-open/.test(sf.cls) && sf.railHidden, sf);
  await page.locator("#show-surface-button").click();
  await page.waitForTimeout(300);
  s = await cardState(page);
  rec("reopen-keeps-local-disclosure", null, { open: s.open, note: "same identity; card state is UI-local" });

  // Stale Open: keep a handle to the old Open button, switch Session, click it.
  const old = await page.locator('.sd-run-summary [data-focus-key="run-summary-open"]').elementHandle();
  await selectSession(page, "multi");
  s = await cardState(page);
  rec("switch-session-new-identity-collapsed", s.runRow === config.runs.multiSecond && s.open.every((o) => !o) && s.files === "Files · 1", s);
  await old.evaluate((b) => b.click());
  await page.waitForTimeout(400);
  sf = await surface(page);
  rec("stale-open-after-session-switch-ignored", !/is-expanded/.test(sf.cls), sf);
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
  s = await cardState(page);
  rec("multi-latest-run-selected", s.runRow === config.runs.multiSecond, { runRow: s.runRow, expected: config.runs.multiSecond });
  await selectSession(page, "normal");
  s = await cardState(page);
  rec("return-session-disclosure-cleared", s.open.every((o) => !o), s);

  // Version change inside one Session: a new Run replaces the summarised Run.
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
  const stale = await page.locator('.sd-run-summary [data-focus-key="run-summary-open"]').elementHandle();
  await page.locator("#composer-input").fill("[second] A newer run in the same session.");
  await page.keyboard.press("Enter");
  await page.waitForFunction((id) => { const v = [...document.querySelectorAll(".sd-run-summary .rail-row")].find((r) => r.textContent.startsWith("Run")); return !document.querySelector(".sd-run-summary")?.textContent.includes(id) || (v && !v.textContent.includes(id)); }, config.runs.normal, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  s = await cardState(page);
  const detachedStale = await stale.evaluate((b) => !b.isConnected);
  await stale.evaluate((b) => b.click());
  await page.waitForTimeout(400);
  sf = await surface(page);
  rec("new-run-replaces-summary-identity", null, { card: s, staleDetached: detachedStale });
  rec("stale-open-after-new-run-ignored", !/is-expanded/.test(sf.cls), sf.cls);
  await shot(page, "1440-light-after-new-run", "same session after a newer run; summary follows latest run");

  // Disclosure memory is not persisted.
  const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  rec("no-disclosure-persistence", !/run-summary|disclosure|sd-/.test(storage), storage.slice(0, 300));
  await page.reload(); await page.waitForTimeout(800);
  await page.context().close();
}

// ------------------------------------------------------ states: empty / failed / none / long
{
  const page = await newPage();
  await selectSession(page, "empty");
  let s = await cardState(page);
  rec("empty-run-known-zero", s && s.files === "Files · 0", s);
  await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
  s = await cardState(page);
  rec("empty-run-message", /No files were recorded/.test(s.text), s.text);
  await shot(page, "1440-light-empty-run", "run with zero recorded files (known zero)");
  await selectSession(page, "failed");
  s = await cardState(page);
  rec("failed-run-status", s && s.state === "Failed", s);
  await shot(page, "1440-light-failed-run", "failed run status");
  await selectSession(page, "none");
  s = await cardState(page);
  rec("no-run-no-card", s === null || s.hidden, s);
  await selectSession(page, "long");
  await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
  await page.waitForTimeout(200);
  const o = await overflow(page);
  const ell = await page.evaluate(() => { const n = document.querySelector(".sd-run-summary-file-name"); const b = document.querySelector(".sd-run-summary-file-preview"); return { clipped: n.scrollWidth > n.clientWidth, title: b.title.length, aria: b.getAttribute("aria-label").length }; });
  rec("long-name-bounded", o.pageScrollX <= 0 && o.railScrollW <= 0 && o.escapes === 0 && ell.clipped && ell.title > 100, { o, ell });
  rec("long-card-bounded-scrolls", o.railRect.bottom <= o.viewportH && (o.railScrollH <= 0 || o.railOverflowY === "auto"), o);
  await shot(page, "1440-light-long-both-open", "long file name, both disclosures open; card bounded and scrolls internally");
  await page.locator("#surface-rail").evaluate((r) => r.scrollTo(0, r.scrollHeight));
  await shot(page, "1440-light-long-scrolled", "long card scrolled to bottom inside the card");
  await page.context().close();
}

// --------------------------------------------- network-mock: missing / malformed files, unknown status, late session reply
{
  const page = await newPage();
  const target = config.sessions.normal;
  let mode = "missing";
  await page.route(`**/api/v5/sessions/${target}`, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    for (const run of json.runs || []) {
      if (mode === "missing") delete run.artifacts;
      if (mode === "malformed") run.artifacts = [...run.artifacts, { kind: "content-version", path: "../escape.txt", sha256: "x" }];
      if (mode === "unknown") run.status = "someday";
    }
    await route.fulfill({ response, json });
  });
  for (const m of ["missing", "malformed", "unknown"]) {
    mode = m;
    await selectSession(page, "empty"); await selectSession(page, "normal");
    await page.waitForTimeout(300);
    const s = await cardState(page);
    const ok = m === "unknown" ? s.state === "Unknown" : s.files === "Files · unavailable" && !/Files · 0/.test(s.text);
    rec(`network-mock-${m}`, ok, s);
    if (m !== "unknown") { await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click(); }
    await shot(page, `1440-light-netmock-${m}`, `network-mock: session JSON with ${m} ${m === "unknown" ? "run status" : "artifact list"}`);
  }
  await page.unroute(`**/api/v5/sessions/${target}`);

  // Late reply: delay Session A, switch to Session B before A answers.
  await selectSession(page, "failed");
  await page.route(`**/api/v5/sessions/${config.sessions.normal}`, async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
  await page.locator("#navigation-panel").getByText("Review · normal", { exact: true }).click();
  await page.waitForTimeout(300);
  const during = await cardState(page);
  await page.locator("#navigation-panel").getByText("Review · two runs", { exact: true }).click();
  await page.waitForTimeout(3500);
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click().catch(() => {});
  const after = await cardState(page);
  const header = await page.locator(".chat-header").innerText();
  rec("late-session-reply-does-not-overwrite", /two runs/.test(header) && after?.runRow === config.runs.multiSecond && !/Loading/.test(after?.text || ""), { during, after, header: header.slice(0, 60) });
  await page.unroute(`**/api/v5/sessions/${config.sessions.normal}`);

  // Late Run read after switching: delay GET /runs/:id triggered by Open, switch away.
  await selectSession(page, "normal");
  await page.route(`**/api/v5/runs/**`, async (route) => { await new Promise((r) => setTimeout(r, 2000)); await route.continue(); });
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
  await page.locator('.sd-run-summary [data-focus-key="run-summary-open"]').click();
  await page.waitForTimeout(200);
  await selectSession(page, "multi");
  await page.waitForTimeout(2600);
  const sf = await surface(page); const s2 = await cardState(page);
  rec("late-run-read-after-switch", !/is-expanded/.test(sf.cls) && !/Loading/.test(s2?.text || ""), { surface: sf.cls, card: s2?.text });
  await page.unroute(`**/api/v5/runs/**`);
  await page.context().close();
}

// ------------------------------------------------------------- layout matrix
for (const scheme of ["light", "dark"]) {
  for (const [w, h] of [[1440, 900], [1280, 800], [390, 844]]) {
    // Enter the Session at the target width (resizing from desktop would carry an open surface into the sheet).
    const page = await newPage({ width: w, height: h, scheme });
    await selectSession(page, "normal");
    await page.waitForTimeout(500);
    const name = `${w}-${scheme}`;
    if (w < 1024) {
      const place = await page.evaluate(() => {
        const c = document.querySelector(".sd-run-summary"); const header = document.querySelector(".chat-header"); const body = document.getElementById("message-stream");
        const vis = c && c.getClientRects().length && !c.closest("[hidden]");
        return { cardVisibleInline: Boolean(vis), afterHeader: vis ? Boolean(header.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) : null, beforeBody: vis ? Boolean(c.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING) : null, surfaceOpen: document.getElementById("surface-panel").classList.contains("is-open"), showButton: !document.getElementById("show-surface-button").hidden };
      });
      rec(`narrow-${scheme}-default-placement`, null, place);
      await shot(page, `${name}-chat`, `390 ${scheme}: chat default (summary not forced open)`);
      await page.locator("#show-surface-button").click();
      await page.waitForTimeout(500);
      const sheet = await page.evaluate(() => { const c = document.querySelector(".sd-run-summary"); const r = c?.getBoundingClientRect(); return { cls: document.getElementById("surface-panel").className, card: r && { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }, modal: document.getElementById("surface-panel").getAttribute("aria-modal") }; });
      rec(`narrow-${scheme}-sheet`, null, sheet);
      await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
      await shot(page, `${name}-sheet-files`, `390 ${scheme}: on-demand sheet with Files open`);
      await page.locator('.sd-run-summary [data-focus-key="run-summary-file:0"]').click();
      await page.waitForTimeout(600);
      await shot(page, `${name}-sheet-preview`, `390 ${scheme}: file preview in sheet`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      const f = await focusInfo(page);
      rec(`narrow-${scheme}-escape-focus`, f.key === "run-summary-file:0", f);
    } else {
      await shot(page, `${name}-collapsed`, `${w} ${scheme}: summary collapsed`);
      await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
      await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
      const o = await overflow(page);
      rec(`layout-${name}`, o.pageScrollX <= 0 && o.escapes === 0 && o.railRect.bottom <= o.viewportH, o);
      await shot(page, `${name}-both-open`, `${w} ${scheme}: Files and Run information open`);
      await page.locator('.sd-run-summary [data-focus-key="run-summary-file:0"]').click();
      await page.waitForTimeout(600);
      await shot(page, `${name}-file-tab`, `${w} ${scheme}: recorded file in right tab`);
    }
    await page.context().close();
  }
}

// ------------------------------------------ strip / three-pane / reflow / adjacent pages
{
  const page = await newPage({ width: 1024, height: 768 });
  await selectSession(page, "normal");
  const strip = await page.evaluate(() => ({ strip: !!document.querySelector(".rail-strip"), glyphs: [...document.querySelectorAll(".rail-strip [data-module]")].map((b) => b.dataset.module) }));
  rec("strip-1024", null, strip);
  await shot(page, "1024-light-strip", "1024 light: compact strip");
  if (strip.strip) {
    await page.locator('.rail-strip [data-module="run"]').focus();
    await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    const sf = await surface(page);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    rec("strip-run-open-and-return", sf.selected.includes("surface-run-tab"), { selected: sf.selected, focusAfterEscape: await focusInfo(page) });
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.waitForTimeout(400);
  rec("reflow-720x450", (await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth)) <= 0, "equivalent reflow (not native 200% zoom)");
  await shot(page, "720x450-light-reflow", "720x450 equivalent reflow");
  await page.context().close();
}
{
  const page = await newPage({ width: 1680, height: 1000 });
  await selectSession(page, "normal");
  await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
  await page.locator('.sd-run-summary [data-focus-key="run-summary-file:0"]').click();
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => { window.__reviewNode = document.getElementById("file-content").firstElementChild; return document.getElementById("surface-panel").className; });
  await shot(page, "1680-light-three-pane", "1680 three-pane preview");
  await page.locator("#surface-expand-button").click(); await page.waitForTimeout(400);
  const max = await page.evaluate(() => ({ cls: document.getElementById("surface-panel").className, label: document.getElementById("surface-expand-button").getAttribute("aria-label"), same: document.getElementById("file-content").firstElementChild === window.__reviewNode }));
  await shot(page, "1680-light-maximized", "1680 Expand preview (maximized)");
  await page.locator("#surface-expand-button").click(); await page.waitForTimeout(400);
  const restored = await page.evaluate(() => ({ cls: document.getElementById("surface-panel").className, same: document.getElementById("file-content").firstElementChild === window.__reviewNode }));
  rec("maximize-restore-keeps-renderer", max.same && restored.same && max.label === "Restore preview", { before, max, restored });
  // Adjacent Home and Settings.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#home-button").click(); await page.waitForTimeout(600);
  rec("adjacent-home-no-card", await page.evaluate(() => !document.querySelector(".sd-run-summary")?.getClientRects().length && document.scrollingElement.scrollWidth <= innerWidth), "Home: no summary card, no horizontal overflow");
  await shot(page, "1440-light-adjacent-home", "adjacent Home page");
  await page.getByRole("button", { name: /^Settings$/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  rec("adjacent-settings-no-card", await page.evaluate(() => !document.querySelector(".sd-run-summary")?.getClientRects().length && document.scrollingElement.scrollWidth <= innerWidth), "Settings: no summary card, no horizontal overflow");
  await shot(page, "1440-light-adjacent-settings", "adjacent Settings page");
  await page.context().close();
}

await browser.close();
writeFileSync(path.join(path.dirname(out), `browser-results${channel ? "-" + channel : "-bundled"}.json`), JSON.stringify({ head: config.head, port, browser: `Playwright ${channel || "bundled chromium"} ${browser.version()} headless`, dataKind: config.dataKind, provider: config.provider, results, shots }, null, 2));
const failed = results.filter((r) => r.pass === false);
console.log(`\n${results.filter((r) => r.pass === true).length} pass, ${failed.length} fail, ${results.filter((r) => r.pass === null).length} notes`);
