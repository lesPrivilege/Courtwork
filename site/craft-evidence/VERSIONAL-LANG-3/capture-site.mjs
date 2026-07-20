/* global process, document, window, getComputedStyle, console */

import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceRoot, '../../..');
const requireFromDesktop = createRequire(resolve(repositoryRoot, 'apps/desktop/package.json'));
const { chromium } = requireFromDesktop('@playwright/test');
const baseUrl = process.env.COURTWORK_SITE_URL ?? 'http://127.0.0.1:19642/';
const output = resolve(evidenceRoot, 'site-frames');

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const colorScheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(baseUrl);
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const metrics = await page.evaluate(() => ({
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim(),
    importantTitle: getComputedStyle(document.documentElement).getPropertyValue('--important-title').trim(),
    heroColor: getComputedStyle(document.querySelector('h1')).color,
    bodyColor: getComputedStyle(document.body).color,
    heroWeight: getComputedStyle(document.querySelector('h1')).fontWeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => !image.complete || !image.naturalWidth).length,
  }));
  console.log(JSON.stringify({ colorScheme, ...metrics }));
  await page.screenshot({ path: resolve(output, `pages-${colorScheme}-1280.png`), fullPage: true, animations: 'disabled' });
  await context.close();
}
await browser.close();
