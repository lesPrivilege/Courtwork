import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const port = Number(process.env.COURTWORK_AUDIT_PORT ?? 1430);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });

async function openAt(width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`http://127.0.0.1:${port}`);
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

for (const [width, file] of [
  [1180, '29-rp25-dual-host-1180.png'],
  [1440, '30-rp25-dual-host-1440.png'],
  [1600, '31-rp25-dual-host-1600.png'],
]) {
  await openAt(width);
  await page.screenshot({ path: resolve('visual-audit', file), animations: 'disabled' });
}

await openAt(1180);
await page.getByTestId('open-settings').click();
await page.screenshot({ path: resolve('visual-audit', '32-rp25-settings-1180.png'), animations: 'disabled' });

await page.getByTestId('settings-close').click();
await page.getByTestId('preview-close').click();
await page.screenshot({ path: resolve('visual-audit', '33-rp25-utility-base-1180.png'), animations: 'disabled' });

await browser.close();
