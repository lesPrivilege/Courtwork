import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1424';
const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });

await page.goto(baseURL);
await page.getByTestId('welcome-state').waitFor();
await page.screenshot({ path: resolve(outputDir, '37-rp26-first-install-1440.png'), animations: 'disabled' });

await page.getByTestId('welcome-demo-start').click();
await page.getByTestId('preview-host').waitFor();
await page.screenshot({ path: resolve(outputDir, '38-rp26-demo-preview-1440.png'), animations: 'disabled' });

await page.setViewportSize({ width: 1180, height: 900 });
await page.screenshot({ path: resolve(outputDir, '39-rp26-demo-preview-1180.png'), animations: 'disabled' });

await browser.close();
