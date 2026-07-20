/* global process */

import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceRoot, '../../..');
const requireFromDesktop = createRequire(resolve(repositoryRoot, 'apps/desktop/package.json'));
const { chromium } = requireFromDesktop('@playwright/test');
const frameRoot = resolve(evidenceRoot, 'frames');
const baseUrl = process.env.COURTWORK_CAPTURE_URL ?? 'http://127.0.0.1:19641/';

await mkdir(frameRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function openWorkbench(page) {
  await page.goto(baseUrl);
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible().catch(() => false)) await page.getByTestId('provider-skip').click();
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible().catch(() => false)) {
    await welcomeDemo.click();
    if (await setup.isVisible().catch(() => false)) await page.getByTestId('provider-skip').click();
  }
  await page.getByTestId('event-stream').waitFor();
  await page.mouse.move(0, 0);
}

async function capture(name, prepare) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await openWorkbench(page);
  await prepare(page);
  if (await page.locator('html').getAttribute('data-theme') !== 'dark') throw new Error('dark theme did not resolve');
  await page.screenshot({ path: resolve(frameRoot, name), animations: 'disabled' });
  await context.close();
}

await capture('01-workbench-dark-1440x900.png', async (page) => {
  await page.getByTestId('revision-panel').waitFor();
});

await capture('02-risklist-settled-dark-1440x900.png', async (page) => {
  const panel = page.getByTestId('revision-panel');
  await panel.locator('[data-risk-id="risk-04"]').click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  await page.getByTestId('settle-seal-risk-04').waitFor();
});

await capture('03-revision-focus-dark-1440x900.png', async (page) => {
  await page.getByTestId('focus-toggle').click();
  await page.getByTestId('workspace').waitFor();
  if (await page.getByTestId('workspace').getAttribute('data-focus-mode') !== 'true') throw new Error('focus mode did not settle');
});

await browser.close();
