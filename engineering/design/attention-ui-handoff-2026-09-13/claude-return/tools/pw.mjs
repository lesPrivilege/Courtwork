/* Author tooling only: resolves a locally installed Playwright without adding a
 * dependency to Courtwork. Set PLAYWRIGHT_MODULE to a playwright package path,
 * or leave it unset to use the npx cache entry this work order was captured with. */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [process.env.PLAYWRIGHT_MODULE, join(homedir(), '.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs')].filter(Boolean);
const found = candidates.find(existsSync);
if (!found) throw new Error('Playwright not found. Set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs');
const playwright = await import(pathToFileURL(found).href);
/* The system Chrome is used so no browser download is required. */
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const chromium = { launch: (options = {}) => playwright.chromium.launch({ executablePath: CHROME, ...options }) };

export async function openPage(browser, { width = 1440, height = 900, scheme = 'light', reduced = false, video = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: scheme,
    reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'en-US', timezoneId: 'UTC',
    ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  const page = await context.newPage();
  return { context, page };
}
