import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const outputDir = resolve(process.cwd(), '../../docs/visual-audit/2026-07-14-process-trace');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const port = process.env.COURTWORK_E2E_PORT ?? '1420';
const baseURL = process.env.COURTWORK_E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(baseURL);
await page.getByTestId('welcome-demo-start').click();
await page.getByTestId('process-trace').waitFor();
// 捕捉第一行已落、第二行正从 core 续写的审计帧。
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(outputDir, '01-process-trace-running-1440.png') });
await page.locator('[data-testid="process-trace"][data-state="settled"]').waitFor();
await page.screenshot({ path: resolve(outputDir, '02-process-trace-settled-1440.png'), animations: 'disabled' });
await page.getByTestId('process-trace-toggle').click();
await page.screenshot({ path: resolve(outputDir, '03-process-trace-open-1440.png'), animations: 'disabled' });
await browser.close();
