#!/usr/bin/env node
/* Quick author probe: node shot.mjs <url> <out.png> [width] [height] [light|dark] */
import { chromium, openPage } from './pw.mjs';
const [url, out, width = '1440', height = '900', scheme = 'light'] = process.argv.slice(2);
const browser = await chromium.launch();
const { page } = await openPage(browser, { width: Number(width), height: Number(height), scheme });
await page.goto(url);
await page.waitForTimeout(900);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
