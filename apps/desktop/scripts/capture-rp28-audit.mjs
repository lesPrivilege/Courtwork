import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.COURTWORK_AUDIT_URL ?? 'http://127.0.0.1:1439';
const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(baseURL);
await page.getByTestId('welcome-demo-start').click();
await page.getByTestId('turn-card-gate').waitFor();
await page.screenshot({ path: resolve(outputDir, '46-rp28-turn-cards-1440.png'), animations: 'disabled' });
await page.getByTestId('module-working-folders-toggle').click();
await page.getByTestId('utility-dock-popover').waitFor();
await page.screenshot({ path: resolve(outputDir, '47-rp28-dock-l2-1440.png'), animations: 'disabled' });
await browser.close();
