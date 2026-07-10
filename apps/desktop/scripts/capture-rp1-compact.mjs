import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:1420');
const setup = page.getByTestId('provider-setup');
if (await setup.isVisible()) {
  await setup.getByRole('button', { name: '先查看演示' }).click();
}
await page.mouse.move(0, 0);
await page.getByTestId('enter-compact-layout').click();
await page.waitForTimeout(150);
await page.screenshot({ path: resolve(outputDir, '22-rp1-compact-layout-1440.png'), animations: 'disabled' });
await page.getByTestId('expand-left-rail').click();
await page.getByTestId('module-progress-toggle').click();
await page.screenshot({ path: resolve(outputDir, '23-rp1-full-layout-1440.png'), animations: 'disabled' });
await browser.close();
console.log('ok');
