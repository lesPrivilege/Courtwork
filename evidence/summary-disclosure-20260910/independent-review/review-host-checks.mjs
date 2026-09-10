// Host-bridge and live-update checks for R2-SD01 at eff0e41.
//   REVIEW_PORT (default 8885); REVIEW_BROWSER_CHANNEL (default "chrome"); PLAYWRIGHT_MODULE optional.
// 1. Neighbouring module (Workspace card) Open → Escape still returns focus to its own opener.
// 2. While a Run streams, how often is the summary card rebuilt, and does a
//    human-speed click (press, 150 ms, release) on a card control survive?
import { execSync } from "node:child_process";
import path from "node:path";

const port = Number(process.env.REVIEW_PORT || 8885);
const channel = process.env.REVIEW_BROWSER_CHANNEL ?? "chrome";
const pw = process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs");
const { chromium } = await import(pw);
const browser = await chromium.launch(channel ? { channel } : {});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (id, value) => console.log(JSON.stringify({ id, ...value }));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForTimeout(600);
await page.locator("#navigation-panel").getByText("Review · two runs", { exact: true }).click();
await page.waitForTimeout(700);

// 1. Workspace card Open → Escape.
await page.locator('[data-focus-key="rail-open:preview"]').focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
const expanded = await page.evaluate(() => document.getElementById("surface-panel").className);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
log("neighbour-workspace-escape", { expanded, focusAfterEscape: await page.evaluate(() => document.activeElement.dataset.focusKey || document.activeElement.id || document.activeElement.tagName) });

// Header entry: close and reopen the surface by its header control, then Escape from the rail.
await page.locator("#show-surface-button").click();
await page.waitForTimeout(300);
await page.locator("#show-surface-button").click();
await page.waitForTimeout(300);
const firstFocus = await page.evaluate(() => document.activeElement.dataset.focusKey || document.activeElement.id);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
log("header-reopen-and-escape", { focusOnOpen: firstFocus, focusAfterEscape: await page.evaluate(() => document.activeElement.id || document.activeElement.tagName), panel: await page.evaluate(() => document.getElementById("surface-panel").className) });
await page.locator("#show-surface-button").click();
await page.waitForTimeout(300);

// 2. Streaming run: count card rebuilds, then a human-speed click on the Files trigger.
await page.evaluate(() => {
  window.__rebuilds = 0;
  const c = document.querySelector(".sd-run-summary");
  window.__mo = new MutationObserver((list) => { window.__rebuilds += list.filter((m) => m.target === c && m.type === "childList").length; });
  window.__mo.observe(c, { childList: true });
});
await page.locator("#composer-input").fill("[slow] Stream for a while.");
await page.keyboard.press("Enter");
await page.waitForTimeout(1500);
const box = await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').boundingBox();
const attempts = [];
for (let i = 0; i < 5; i++) {
  const before = await page.evaluate(() => document.querySelector(".sd-run-summary details")?.open);
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.querySelector(".sd-run-summary details")?.open);
  attempts.push({ before, after, toggled: before !== after });
}
await page.waitForTimeout(6000);
const rebuilds = await page.evaluate(() => { window.__mo.disconnect(); return window.__rebuilds; });
const status = await page.evaluate(() => document.querySelector(".sd-run-summary .rail-card-state")?.textContent);
log("streaming-rebuilds", { rebuildsDuringRun: rebuilds, finalStatus: status });
log("streaming-human-click", { attempts, lost: attempts.filter((a) => !a.toggled).length });
await browser.close();
