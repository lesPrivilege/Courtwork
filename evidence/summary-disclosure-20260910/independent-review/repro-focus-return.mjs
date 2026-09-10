// Minimal repro for SDR-D1: the summary disables its focused trigger before
// the host records the opener, so engines that apply focus fixup synchronously
// record <body> as returnFocus and Escape/close lose the user's place.
//
//   REVIEW_PORT (default 8885); PLAYWRIGHT_MODULE optional.
//   Runs the same steps in Playwright's bundled Chromium and installed Chrome.
import { execSync } from "node:child_process";
import path from "node:path";

const port = Number(process.env.REVIEW_PORT || 8885);
const pw = process.env.PLAYWRIGHT_MODULE || path.join(execSync("npm root -g").toString().trim(), "playwright/index.mjs");
const { chromium } = await import(pw);

const probe = async (page) => page.evaluate(async () => {
  const b = document.createElement("button"); document.body.append(b); b.focus(); b.disabled = true;
  const sync = document.activeElement === b; b.remove(); return sync ? "keeps focus synchronously" : "blurs synchronously";
});

for (const channel of [undefined, "chrome"]) {
  const browser = await chromium.launch(channel ? { channel } : {});
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForTimeout(600);
  await page.locator("#navigation-panel").getByText("Review · long file name", { exact: true }).click();
  await page.waitForTimeout(600);
  const engine = await probe(page);
  const rows = [];
  for (const [label, key, open] of [["file", "run-summary-file:0", "run-summary-files"], ["run", "run-summary-open", "run-summary-information"]]) {
    await page.locator(`.sd-run-summary [data-focus-key="${open}"]`).focus();
    await page.keyboard.press("Enter");                      // expand disclosure
    await page.locator(`.sd-run-summary [data-focus-key="${key}"]`).focus();
    await page.keyboard.press("Enter");                      // open in right panel
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape");                     // back to the directory
    await page.waitForTimeout(400);
    const active = await page.evaluate(() => document.activeElement.dataset.focusKey || document.activeElement.tagName);
    rows.push({ open: label, expected: key, focusAfterEscape: active, pass: active === key });
    await page.locator(`.sd-run-summary [data-focus-key="${open}"]`).click(); // collapse again
  }
  console.log(JSON.stringify({ browser: `${channel || "bundled chromium"} ${browser.version()}`, engine, rows }));
  await browser.close();
}
