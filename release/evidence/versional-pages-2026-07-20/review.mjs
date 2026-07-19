import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../../apps/desktop/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const round = process.argv[2];
if (round !== "round-1" && round !== "round-2") {
  throw new Error("usage: node review.mjs round-1|round-2");
}

const base = "https://lesprivilege.github.io/Courtwork/";
const output = new URL("./", import.meta.url);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function inspect({ name, width, height, javaScriptEnabled = true, reducedMotion = "no-preference" }) {
  const errors = [];
  const abortedRequests = [];
  const context = await browser.newContext({
    viewport: { width, height },
    javaScriptEnabled,
    reducedMotion,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(`console:${entry.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    const message = `request:${failure}:${request.url()}`;
    if (failure === "net::ERR_ABORTED") abortedRequests.push(message);
    else errors.push(message);
  });

  const response = await page.goto(base, { waitUntil: "load", timeout: 30_000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const images = [...document.images].map((image) => ({
      alt: image.alt,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      currentSrc: image.currentSrc,
    }));
    const workImages = [...document.querySelectorAll(".work-crop img")].map((image) => ({
      src: image.getAttribute("src"),
      currentSrc: image.currentSrc,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
    const h1 = document.querySelector("h1");
    const release = document.querySelector("#release-colophon");
    const proof = document.querySelector(".scenario-proof");
    const ledgerRows = [...document.querySelectorAll(".promise-ledger > div")];
    const marginalia = document.querySelector(".site-marginalia");
    return {
      title: document.title,
      viewport: [document.documentElement.clientWidth, window.innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      noHorizontalOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
      h1: h1?.textContent?.trim(),
      h1Aria: h1?.getAttribute("aria-label"),
      release: release?.textContent?.replace(/\s+/g, " ").trim(),
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0),
      imageCount: images.length,
      workImages,
      versionalRules: {
        proofInline: proof ? [getComputedStyle(proof).borderLeftWidth, getComputedStyle(proof).borderRightWidth] : null,
        ledgerInternal: ledgerRows.slice(0, -1).map((row) => getComputedStyle(row).borderBottomWidth),
        ledgerLast: ledgerRows.length ? getComputedStyle(ledgerRows.at(-1)).borderBottomWidth : null,
        marginalia: marginalia ? [
          getComputedStyle(marginalia).borderTopWidth,
          getComputedStyle(marginalia).borderRightWidth,
          getComputedStyle(marginalia).borderBottomWidth,
          getComputedStyle(marginalia).borderLeftWidth,
        ] : null,
      },
      activeAnimations: document.getAnimations().length,
      htmlClass: document.documentElement.className,
    };
  });

  const screenshotPath = fileURLToPath(new URL(`${round}-${name}.png`, output));
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();
  return { name, status: response?.status(), errors, abortedRequests, ...metrics };
}

const result = {
  round,
  base,
  desktop: await inspect({ name: "desktop-1280x860", width: 1280, height: 860 }),
  narrow: await inspect({ name: "narrow-375x900", width: 375, height: 900 }),
  reduced: await inspect({ name: "reduced-1280x860", width: 1280, height: 860, reducedMotion: "reduce" }),
  jsOff: await inspect({ name: "js-off-375x900", width: 375, height: 900, javaScriptEnabled: false }),
};

await writeFile(new URL(`${round}.json`, output), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
