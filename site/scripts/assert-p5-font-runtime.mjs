// SKIN-R2-P5 · 真渲与数据静止计算态门。
// Safari 前／后帧是本批视觉主证；本脚本只提供可重播的 Chromium 计算态断言：
//   ① Junicode 子集真正加载，且只在四个签署消费点成为 computed font-family；
//   ② P5 前基线的既有数据字符、bbox、字槽与 motion computed 值逐位不变。
// 不挂 site:guard，沿既有 assert-reduced-motion 先例保持站面构建零浏览器依赖。
/* global document, getComputedStyle, performance */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , url = 'http://127.0.0.1:18963/', desktopDir = 'apps/desktop'] = process.argv;
const require = createRequire(resolve(process.cwd(), desktopDir, 'package.json'));
const { chromium } = require('@playwright/test');
const baseline = JSON.parse(readFileSync(resolve('site/craft-evidence/SKIN-R2-P5/runtime-data-baseline.json'), 'utf8'));
const family = 'Courtwork Manuscript Latin';
const failures = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const fontTruth = await page.evaluate(({ familyName }) => {
  const selectors = ['.wordmark > span', '.promise-heading h2 .latin-manuscript', '.closing .eyebrow .latin-manuscript'];
  return {
    loaded: document.fonts.check(`400 16px "${familyName}"`, 'Courtwork'),
    consumers: Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector);
      return [selector, element ? { text: element.textContent.trim(), fontFamily: getComputedStyle(element).fontFamily } : null];
    })),
    resourceLoads: performance.getEntriesByType('resource')
      .filter((entry) => entry.name.endsWith('/assets/fonts/manuscript-latin-subset.woff2')).length,
  };
}, { familyName: family });
if (!fontTruth.loaded) failures.push('document.fonts did not load the signed Junicode subset');
if (fontTruth.resourceLoads !== 1) failures.push(`signed subset resource loads = ${fontTruth.resourceLoads}, expected exactly 1`);
for (const [selector, value] of Object.entries(fontTruth.consumers)) {
  if (!value) failures.push(`missing signed consumer ${selector}`);
  else if (value.text !== 'Courtwork' || !value.fontFamily.includes(family)) failures.push(`${selector} did not compute to the signed manuscript face`);
}

const actualData = await page.evaluate((selectors) => Object.fromEntries(selectors.map((selector) => {
  const element = document.querySelector(selector);
  if (!element) return [selector, null];
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return [selector, {
    text: element.textContent.trim(),
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fontFamily: style.fontFamily,
    animationName: style.animationName,
    transform: style.transform,
  }];
})), Object.keys(baseline.selectors));
for (const [selector, expected] of Object.entries(baseline.selectors)) {
  if (JSON.stringify(actualData[selector]) !== JSON.stringify(expected)) failures.push(`data render drifted at ${selector}`);
}

const og = await context.newPage();
await og.goto(new URL('og.html', url).href, { waitUntil: 'networkidle' });
await og.evaluate(() => document.fonts.ready);
const ogTruth = await og.evaluate((familyName) => {
  const element = document.querySelector('.wordmark');
  return {
    loaded: document.fonts.check(`400 29px "${familyName}"`, 'Courtwork'),
    text: element?.textContent.trim(),
    fontFamily: element ? getComputedStyle(element).fontFamily : '',
  };
}, family);
if (!ogTruth.loaded || ogTruth.text !== 'Courtwork' || !ogTruth.fontFamily.includes(family)) {
  failures.push('OG wordmark did not compute to the signed manuscript face');
}

await browser.close();
console.log('P5 font truth:', JSON.stringify({ ...fontTruth, og: ogTruth }));
console.log('P5 data render:', JSON.stringify(actualData));
if (failures.length) {
  console.error(`\nP5 runtime gate failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log('\nP5 runtime: PASS (four signed consumers render Junicode; eight data nodes are byte/layout/motion identical to signed baseline)');
