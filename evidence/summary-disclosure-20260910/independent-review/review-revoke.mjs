// Revocation: the viewed Session is deleted by another client (synthetic, via the
// product's own DELETE /api/v5/sessions/:id). The old card must not keep offering
// its details or execute its Open.   REVIEW_PORT (8885), REVIEW_BROWSER_CHANNEL ("chrome").
import { execSync } from "node:child_process";
import path from "node:path";
const port = Number(process.env.REVIEW_PORT || 8885);
const base = `http://127.0.0.1:${port}`;
const channel = process.env.REVIEW_BROWSER_CHANNEL ?? "chrome";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs"));
const config = await (await fetch(`${base}/review-config.json`)).json();
const browser = await chromium.launch(channel ? { channel } : {});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(base + "/"); await page.waitForTimeout(600);
await page.locator("#navigation-panel").getByText("Review · failed run", { exact: true }).click(); await page.waitForTimeout(700);
await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
const old = await page.locator('.sd-run-summary [data-focus-key="run-summary-open"]').elementHandle();
const { sessionToken: token } = await (await fetch(`${base}/api/v5/bootstrap`, { headers: { origin: base } })).json();
const del = await fetch(`${base}/api/v5/sessions/${config.sessions.failed}`, { method: "DELETE", headers: { "x-work-token": token, origin: base } });
const observed = [];
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(500);
  observed.push(await page.evaluate(() => ({ title: document.getElementById("session-title")?.textContent.trim().slice(0, 40), card: Boolean(document.querySelector(".sd-run-summary")?.getClientRects().length) })));
}
await old.evaluate((b) => b.click());
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ panel: document.getElementById("surface-panel").className, card: Boolean(document.querySelector(".sd-run-summary")?.getClientRects().length), cardText: document.querySelector(".sd-run-summary")?.innerText.slice(0, 120) }));
console.log(JSON.stringify({ deleteStatus: del.status, first: observed[0], last: observed.at(-1), afterStaleClick: after }));
await browser.close();
