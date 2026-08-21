/* global document, window, getComputedStyle, process, console */
// SITE-MOTION-NATURAL-GROWTH-1C · Pages 动作与静态终态证据采集。
// 用法：
//   (cd site && python3 -m http.server 18924 --bind 127.0.0.1) &
//   node site/craft-evidence/SITE-MOTION-NATURAL-GROWTH-1/capture.mjs
//
// 采集器沿 N2 的双宗／六档矩阵，但只登记现行动作；普通态的 before/mid/settled 帧由暂停
// CSS transition 的实际 Web Animations timeline 得到，不用任意 sleep 猜中间帧。

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceRoot, '../../..');
const requireFromDesktop = createRequire(resolve(repositoryRoot, 'apps/desktop/package.json'));
const { chromium } = requireFromDesktop('@playwright/test');
const baseUrl = process.env.COURTWORK_SITE_URL ?? 'http://127.0.0.1:18924/';
const targetSha = process.env.COURTWORK_TARGET_SHA
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();

const WIDTHS = [375, 768, 1180, 1280, 1440, 1600];
const KNOWN_ANIMATIONS = new Set(['typer-develop']);
const REDUCE_ALLOWED_ANIMATIONS = new Set(['ghosty-reduced-fade']);
const DATA_SELECTORS = [
  '.scenario-proof-stats strong',
  '[data-fixture-count]',
  '[data-pm-finding-id]',
  '[data-pm-clause]',
  '[data-pm-defect-label]',
  '[data-pm-suggestion]',
  '[data-pm-disposition]',
];
const report = {
  targetSha,
  baseUrl,
  allowedActions: ['typer-develop', 'ghosty-reduced-fade', 'evidence-marker-transition', 'evidence-connector-transition', 'seal-settlement-transition'],
  protectedSelectors: DATA_SELECTORS,
  frames: [],
  overflow: [],
  animations: {},
  transitions: {},
  dataStatic: null,
  failures: [],
};

await mkdir(evidenceRoot, { recursive: true });

const settle = async (page) => {
  for (let top = 0; top < await page.evaluate(() => document.documentElement.scrollHeight); top += 700) {
    await page.evaluate((nextTop) => window.scrollTo(0, nextTop), top);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete),
    null,
    { timeout: 5000 },
  ).catch(() => undefined);
};

const probeLayout = async (page) => page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  brokenImages: [...document.images].filter((image) => !image.complete || !image.naturalWidth).length,
}));

const animationNames = async (page) => page.evaluate(() => [...new Set(document.getAnimations()
  .filter((animation) => animation.constructor.name === 'CSSAnimation')
  .map((animation) => animation.animationName))].sort());

const transitionsFor = (page, selector) => page.evaluate((targetSelector) => document.getAnimations()
  .filter((animation) => animation.constructor.name === 'CSSTransition'
    && animation.effect?.target?.matches?.(targetSelector))
  .map((animation) => {
    const timing = animation.effect?.getComputedTiming() ?? {};
    return {
      property: animation.transitionProperty,
      delay: Number(timing.delay ?? 0),
      duration: Number(timing.duration ?? 0),
      endTime: Number(timing.endTime ?? 0),
    };
  }), selector);

const pauseTransitions = async (page, selector) => page.evaluate((targetSelector) => {
  const transitions = document.getAnimations().filter((animation) => animation.constructor.name === 'CSSTransition'
    && animation.effect?.target?.matches?.(targetSelector));
  for (const transition of transitions) {
    const timing = transition.effect?.getComputedTiming() ?? {};
    const delay = Number(timing.delay ?? 0);
    const duration = Number(timing.duration ?? 0);
    transition.currentTime = delay + (duration / 2);
    transition.pause();
  }
  return transitions.length;
}, selector);

const finishTransitions = async (page, selector) => {
  await page.evaluate((targetSelector) => {
    for (const transition of document.getAnimations().filter((animation) => animation.constructor.name === 'CSSTransition'
      && animation.effect?.target?.matches?.(targetSelector))) transition.play();
  }, selector);
  await page.waitForFunction((targetSelector) => !document.getAnimations().some((animation) => animation.constructor.name === 'CSSTransition'
    && animation.effect?.target?.matches?.(targetSelector)), selector, { timeout: 2000 }).catch(() => undefined);
};

const capturePhases = async (page, selector, prefix, frameSelector = selector) => {
  await page.evaluate((targetSelector) => {
    document.querySelectorAll(targetSelector).forEach((element) => element.classList.remove('is-visible'));
  }, selector);
  const before = `${prefix}-before.png`;
  await page.locator(frameSelector).screenshot({ path: resolve(evidenceRoot, before) });
  report.frames.push(before);

  await page.evaluate((targetSelector) => {
    document.querySelectorAll(targetSelector).forEach((element) => element.classList.add('is-visible'));
  }, selector);
  await page.waitForFunction((targetSelector) => document.getAnimations().some((animation) => animation.constructor.name === 'CSSTransition'
    && animation.effect?.target?.matches?.(targetSelector)), selector, { timeout: 1000 }).catch(() => undefined);
  const transitions = await transitionsFor(page, selector);
  const midCount = await pauseTransitions(page, selector);
  report.transitions[prefix] = { items: transitions, pausedCount: midCount };
  if (midCount === 0) report.failures.push(`${prefix} has no CSS transition timeline to pause`);
  const mid = `${prefix}-mid.png`;
  await page.locator(frameSelector).screenshot({ path: resolve(evidenceRoot, mid) });
  report.frames.push(mid);

  await finishTransitions(page, selector);
  const settled = `${prefix}-settled.png`;
  await page.locator(frameSelector).screenshot({ path: resolve(evidenceRoot, settled) });
  report.frames.push(settled);
};

const captureMatrix = async () => {
  for (const colorScheme of ['light', 'dark']) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await settle(page);
      const probe = await probeLayout(page);
      report.overflow.push({ colorScheme, width, ...probe });
      if (probe.overflow !== 0) report.failures.push(`overflow ${colorScheme}@${width}: ${probe.overflow}px`);
      if (probe.brokenImages !== 0) report.failures.push(`broken images ${colorScheme}@${width}: ${probe.brokenImages}`);
      if (width === 1280 || width === 375) {
        const frame = `matrix-${colorScheme}-${width}.png`;
        await page.screenshot({ path: resolve(evidenceRoot, frame), fullPage: true, animations: 'disabled' });
        report.frames.push(frame);
      }
      await context.close();
    }
  }
};

const browser = await chromium.launch({ headless: true });
try {
  await captureMatrix();

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const probe = await probeLayout(page);
    if (probe.overflow !== 0) report.failures.push(`JS-off overflow: ${probe.overflow}px`);
    if (probe.brokenImages !== 0) report.failures.push(`JS-off broken images: ${probe.brokenImages}`);
    const frame = 'nojs-dark-1280.png';
    await page.screenshot({ path: resolve(evidenceRoot, frame), fullPage: true, animations: 'disabled' });
    report.frames.push(frame);
    await context.close();
  }

  for (const [label, reducedMotion, allowed] of [
    ['no-preference', 'no-preference', KNOWN_ANIMATIONS],
    ['reduce', 'reduce', REDUCE_ALLOWED_ANIMATIONS],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await settle(page);
    const names = await animationNames(page);
    report.animations[label] = names;
    for (const name of names) if (!allowed.has(name)) report.failures.push(`unexpected animation under ${label}: ${name}`);
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '.tc, .work-crop[data-reveal] img { animation: none !important; }' });
    await capturePhases(page, '.evidence-step', 'evidence', '.evidence-chain');
    await capturePhases(page, '.settle-seal[data-reveal]', 'seal', '.promise-heading');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await settle(page);
    const sample = () => page.evaluate((selectors) => {
      const nodes = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
      return nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const computedStyle = getComputedStyle(node);
        return {
          selector: selectors.find((selector) => node.matches(selector)),
          text: node.textContent,
          rect: [box.x, box.y, box.width, box.height],
          transform: computedStyle.transform,
          animationName: computedStyle.animationName,
          transitionDuration: computedStyle.transitionDuration,
        };
      });
    }, DATA_SELECTORS);
    const first = await sample();
    await page.waitForTimeout(1300);
    const second = await sample();
    report.dataStatic = { identical: JSON.stringify(first) === JSON.stringify(second), nodes: first.length };
    if (!report.dataStatic.identical) report.failures.push('protected data zone drifted between samples');
    for (const entry of first) {
      if (entry.transform !== 'none' || entry.animationName !== 'none' || entry.transitionDuration !== '0s') {
        report.failures.push(`protected data gained motion: ${entry.selector}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve(evidenceRoot, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  failures: report.failures,
  targetSha: report.targetSha,
  overflowChecked: report.overflow.length,
  animations: report.animations,
  transitions: report.transitions,
  dataStatic: report.dataStatic,
}, null, 2));
if (report.failures.length) process.exit(1);
console.log('SITE-MOTION-NATURAL-GROWTH-1 capture: PASS');
