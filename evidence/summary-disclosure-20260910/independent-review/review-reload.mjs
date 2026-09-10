// Reload = client restart: disclosure memory must not survive; host restores surface/session only.
//   REVIEW_PORT (8885), REVIEW_BROWSER_CHANNEL ("chrome").
import { execSync } from "node:child_process";
import path from "node:path";
const port = Number(process.env.REVIEW_PORT || 8885);
const channel = process.env.REVIEW_BROWSER_CHANNEL ?? "chrome";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs"));
const browser = await chromium.launch(channel ? { channel } : {});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`http://127.0.0.1:${port}/`); await page.waitForTimeout(600);
await page.locator("#navigation-panel").getByText("Review · long file name", { exact: true }).click(); await page.waitForTimeout(600);
await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
const before = await page.evaluate(() => [...document.querySelectorAll(".sd-run-summary details")].map((d) => d.open));
await page.reload();
await page.waitForTimeout(1200);
const landing = await page.evaluate(() => ({ title: document.getElementById("session-title")?.textContent.trim(), card: Boolean(document.querySelector(".sd-run-summary")?.getClientRects().length) }));
await page.locator("#navigation-panel").getByText("Review · long file name", { exact: true }).click(); await page.waitForTimeout(700);
const after = await page.evaluate(() => ({ title: document.getElementById("session-title")?.textContent, open: [...document.querySelectorAll(".sd-run-summary details")].map((d) => d.open), storageKeys: Object.keys(localStorage) }));
console.log(JSON.stringify({ before, landing, after, pass: before.every(Boolean) && after.open.length === 2 && after.open.every((o) => !o) }));
await browser.close();
