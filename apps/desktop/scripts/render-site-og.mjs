import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const source = resolve('../../site/og.html');
const output = resolve('../../site/assets/og.png');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href);
await page.screenshot({ path: output, animations: 'disabled' });
await browser.close();
