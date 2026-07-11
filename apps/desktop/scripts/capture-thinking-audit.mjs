import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1427';
const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(baseURL);
await page.getByTestId('welcome-demo-start').click();
await page.getByTestId('thinking-stream').waitFor();
await page.screenshot({ path: resolve(outputDir, '41-thinking-settled-anchor-1440.png'), animations: 'disabled' });
await page.getByTestId('thinking-stream-toggle').click();
await page.screenshot({ path: resolve(outputDir, '42-thinking-review-open-1440.png'), animations: 'disabled' });
await browser.close();
