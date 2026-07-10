import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = resolve('visual-audit');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });

const capture = async (name) => {
  await page.screenshot({ path: resolve(outputDir, name), animations: 'disabled' });
};

await page.goto('http://127.0.0.1:1420');
await capture('00-provider-first-run-1440.png');
await page.getByRole('button', { name: '先查看演示' }).click();
await capture('01-s3-revision-1440.png');

await page.getByTestId('flow-s1').click();
await page.getByTestId('view-timeline').click();
await capture('02-s1-timeline-1440.png');

await page.getByTestId('view-graph').click();
await capture('03-s1-graph-1440.png');

await page.getByTestId('view-matrix').click();
await capture('04-matrix-1440.png');

await page.getByTestId('view-draft').click();
await capture('05-draft-1440.png');

await page.getByTestId('split-start').click();
await capture('06-split-rows-1440.png');

await page.setViewportSize({ width: 1700, height: 900 });
await page.getByRole('button', { name: '左右对照' }).click();
await capture('07-split-columns-1700.png');

await browser.close();
