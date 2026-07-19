/* global CSSKeyframesRule, document, getComputedStyle, navigator, devicePixelRatio, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseURL = process.env.COURTWORK_P3_BASE_URL ?? 'http://127.0.0.1:19355';
const evidenceRoot = path.resolve('../..', 'site/craft-evidence/SKIN-R2-P3');
await mkdir(evidenceRoot, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(baseURL);
const setup = page.getByTestId('provider-setup');
if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
const welcome = page.getByTestId('welcome-demo-start');
if (await welcome.isVisible()) {
  await welcome.click();
  const onboarding = page.getByTestId('provider-setup');
  if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
  await page.getByTestId('event-stream').waitFor();
}
await page.getByTestId('flow-s3').click();
const panel = page.getByTestId('revision-panel');
await panel.waitFor();
await panel.locator('[data-risk-id="risk-04"]').click();
await panel.getByRole('button', { name: '确认此项', exact: true }).click();
const seal = page.getByTestId('settle-seal-risk-04');
await seal.waitFor();

async function setSealTime(milliseconds) {
  await seal.evaluate((node, time) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw new Error('seal-press animation missing');
    animation.pause();
    animation.currentTime = time;
  }, milliseconds);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

const detail = page.locator('.risk-detail');
if (process.env.COURTWORK_P3_BEFORE_ONLY === '1') {
  await setSealTime(320 * 0.58);
  await detail.screenshot({ path: path.join(evidenceRoot, 'seal-before-058.png') });
  console.log(JSON.stringify({
    baseline: 'pre-P3 two-keyframe seal-press',
    sampleTimeMs: 320 * 0.58,
    keyframes: await page.evaluate(() => {
      for (const sheet of [...document.styleSheets]) {
        for (const rule of [...sheet.cssRules]) {
          if (rule instanceof CSSKeyframesRule && rule.name === 'seal-press') {
            return [...rule.cssRules].map((frame) => frame.keyText);
          }
        }
      }
      return [];
    }),
  }, null, 2));
  await browser.close();
  process.exit(0);
}

for (const [name, time] of [['000', 0], ['058', 320 * 0.58], ['100', 320]]) {
  await setSealTime(time);
  await detail.screenshot({ path: path.join(evidenceRoot, `seal-${name}.png`) });
}

await setSealTime(320);
const before = await seal.evaluate((node) => {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    rect: [rect.x, rect.y, rect.width, rect.height].map((value) => +value.toFixed(2)),
    color: style.color,
    opacity: style.opacity,
    filter: style.filter,
    animations: node.getAnimations().length,
  };
});
await detail.screenshot({ path: path.join(evidenceRoot, 'ink-a-clean.png') });

await seal.evaluate((node) => {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.id = 'p3-ink-fixture';
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden';
  svg.innerHTML = '<defs><filter id="p3-ink-bleed" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
  document.body.append(svg);
  node.style.filter = 'url("#p3-ink-bleed")';
});
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const withInk = await seal.evaluate((node) => {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    rect: [rect.x, rect.y, rect.width, rect.height].map((value) => +value.toFixed(2)),
    color: style.color,
    opacity: style.opacity,
    filter: style.filter,
    animations: node.getAnimations().length,
  };
});
await detail.screenshot({ path: path.join(evidenceRoot, 'ink-b-bleed.png') });

const staticSamples = [];
for (let index = 0; index < 3; index += 1) {
  staticSamples.push(await seal.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return [rect.x, rect.y, rect.width, rect.height].map((value) => +value.toFixed(2));
  }));
  await page.waitForTimeout(400);
}

const cleanup = await seal.evaluate((node) => {
  node.style.removeProperty('filter');
  document.getElementById('p3-ink-fixture')?.remove();
  return {
    fixtureCount: document.querySelectorAll('#p3-ink-fixture, #p3-ink-bleed').length,
    inlineFilter: node.style.filter,
    computedFilter: getComputedStyle(node).filter,
  };
});

const report = {
  engine: await page.evaluate(() => navigator.userAgent),
  viewport: page.viewportSize(),
  dpr: await page.evaluate(() => devicePixelRatio),
  before,
  withInk,
  geometryStable: JSON.stringify(before.rect) === JSON.stringify(withInk.rect)
    && staticSamples.every((sample) => JSON.stringify(sample) === JSON.stringify(withInk.rect)),
  animationCountStable: before.animations === withInk.animations,
  cleanup,
};
console.log(JSON.stringify(report, null, 2));
await browser.close();
