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
// 捕捉第一行已落、第二行正从 core 续写的审计帧。
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(outputDir, '43-thinking-turn-writing-1440.png') });
await page.locator('[data-testid="thinking-stream"][data-state="settled"]').waitFor();
await page.screenshot({ path: resolve(outputDir, '44-thinking-turn-anchor-1440.png'), animations: 'disabled' });
await page.getByTestId('thinking-stream-toggle').click();
await page.screenshot({ path: resolve(outputDir, '45-thinking-turn-review-open-1440.png'), animations: 'disabled' });
await browser.close();
