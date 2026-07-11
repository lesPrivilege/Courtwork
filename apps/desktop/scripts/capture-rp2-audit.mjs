import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto('http://127.0.0.1:4177');
const setup = page.getByTestId('provider-setup');
if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
await page.screenshot({ path: resolve('visual-audit/26-rp2-1-vertical-full-1440.png'), animations: 'disabled' });
await page.getByTestId('collapse-left-rail').click();
await page.getByTestId('collapse-right-rail').click();
await page.screenshot({ path: resolve('visual-audit/27-rp2-1-vertical-collapsed-1440.png'), animations: 'disabled' });
for (const width of [1180, 1280, 1440, 1600]) {
  await page.setViewportSize({ width, height: 900 });
  await page.reload();
  const setupAtWidth = page.getByTestId('provider-setup');
  if (await setupAtWidth.isVisible()) await setupAtWidth.getByRole('button', { name: '先查看演示' }).click();
  await page.screenshot({ path: resolve(`visual-audit/rp2-3-${width}.png`), animations: 'disabled' });
}
await browser.close();
