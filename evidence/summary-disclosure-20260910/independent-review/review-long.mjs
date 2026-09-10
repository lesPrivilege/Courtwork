// Long file name at 390 (sheet) and 1440 dark, both disclosures open; measures
// the SHA-256 row columns (SDR-D2).  REVIEW_PORT (8885), REVIEW_OUT, REVIEW_BROWSER_CHANNEL ("chrome").
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.REVIEW_PORT || 8885);
const out = process.env.REVIEW_OUT || path.join(here, "screens");
const channel = process.env.REVIEW_BROWSER_CHANNEL ?? "chrome";
const pw = process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs");
const { chromium } = await import(pw);
const browser = await chromium.launch(channel ? { channel } : {});
for (const [session, w, h, scheme] of [["Review · long file name", 390, 844, "light"], ["Review · long file name", 1440, 900, "dark"], ["Review · normal", 1440, 900, "light"]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme })).newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForTimeout(600);
  if (w < 1024) await page.getByRole("button", { name: /navigation/i }).first().click();
  await page.locator("#navigation-panel").getByText(session, { exact: true }).click();
  await page.waitForTimeout(600);
  if (w < 1024) { await page.locator("#show-surface-button").click(); await page.waitForTimeout(400); }
  await page.locator('.sd-run-summary [data-focus-key="run-summary-files"]').click();
  await page.locator('.sd-run-summary [data-focus-key="run-summary-information"]').click();
  await page.mouse.move(5, h - 5);
  await page.waitForTimeout(200);
  const sha = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".sd-run-summary .rail-row")].find((r) => r.textContent.startsWith("SHA-256"));
    const [label, value] = row.children;
    return { rowWidth: Math.round(row.getBoundingClientRect().width), labelWidth: Math.round(label.getBoundingClientRect().width), valueWidth: Math.round(value.getBoundingClientRect().width), valueHeight: Math.round(value.getBoundingClientRect().height), cardHeight: Math.round(document.querySelector(".sd-run-summary").getBoundingClientRect().height) };
  });
  const name = `${w}-${scheme}-${session.includes("long") ? "long" : "normal"}-sha-row`;
  console.log(JSON.stringify({ name, sha }));
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
  await page.context().close();
}
await browser.close();
