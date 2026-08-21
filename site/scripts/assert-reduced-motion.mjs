// SITE-MOTION-NATURAL-GROWTH-1C · Pages reduced-motion 计算态实测。
//
// 该脚本只消费现行 Pages DOM：Typer、Ghosty、Evidence causal advance、seal settlement 与
// 真实数据槽。它同时读取 animation 与 transition 的 computed style，避免只看 CSS 字面分支而
// 漏掉高特异性覆盖；它不为页面增加任何运行时行为。
/* global document, window, getComputedStyle */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , url = 'http://127.0.0.1:18902/', desktopDir = 'apps/desktop'] = process.argv;
const require = createRequire(resolve(process.cwd(), desktopDir, 'package.json'));
const { chromium } = require('@playwright/test');

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
const failures = [];

const readMatrix = (value) => {
  if (value === 'none') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const match = value.match(/^matrix\(([^)]+)\)$/);
  if (!match) return null;
  const values = match[1].split(',').map(Number);
  if (values.length !== 6 || values.some((part) => Number.isNaN(part))) return null;
  return { a: values[0], b: values[1], c: values[2], d: values[3], e: values[4], f: values[5] };
};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete),
    null,
    { timeout: 3000 },
  ).catch(() => failures.push('reduced probe image load did not settle within 3s'));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));

  const imageState = await page.evaluate(() => [...document.images].map((image) => ({
    src: image.currentSrc || image.src,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
  })));
  for (const image of imageState) {
    if (!image.complete || image.naturalWidth === 0) failures.push(`broken image: ${image.src}`);
  }

  const census = await page.evaluate(() => document.getAnimations().map((animation) => ({
    name: animation.animationName ?? animation.constructor.name,
    target: animation.effect?.target?.tagName?.toLowerCase() ?? '?',
  })));
  for (const entry of census) {
    if (!REDUCE_ALLOWED_ANIMATIONS.has(entry.name)) {
      failures.push(`reduce has an unregistered animation: ${entry.name} @ ${entry.target}`);
    }
  }

  const computed = await page.evaluate(() => {
    const style = (selector, pseudo = undefined) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computedStyle = getComputedStyle(element, pseudo);
      return {
        animationName: computedStyle.animationName,
        opacity: computedStyle.opacity,
        transform: computedStyle.transform,
        transitionDuration: computedStyle.transitionDuration,
        transitionProperty: computedStyle.transitionProperty,
        maskImage: computedStyle.maskImage,
        webkitMaskImage: computedStyle.webkitMaskImage,
      };
    };
    return {
      typer: style('.tc'),
      ghosty: style('.work-crop[data-reveal] img'),
      marker: style('.evidence-step', '::before'),
      connector: style('.evidence-step:not(:last-child)', '::after'),
      seal: style('.settle-seal'),
      counts: document.querySelectorAll('[data-fixture-count]').length,
      evidence: document.querySelectorAll('.evidence-step').length,
    };
  });

  if (!computed.typer) failures.push('Typer target missing');
  else if (computed.typer.animationName !== 'none') failures.push(`Typer animation-name is ${computed.typer.animationName}`);

  if (!computed.ghosty) failures.push('Ghosty target missing');
  else {
    if (computed.ghosty.maskImage !== 'none' && computed.ghosty.webkitMaskImage !== 'none') failures.push('Ghosty mask was not removed under reduce');
    if (computed.ghosty.transitionDuration !== '0s') failures.push(`Ghosty transition is ${computed.ghosty.transitionDuration}`);
  }

  if (computed.evidence !== 4) failures.push(`Evidence node count is ${computed.evidence}, expected 4`);
  if (!computed.marker) failures.push('Evidence marker pseudo-element missing');
  else {
    if (computed.marker.opacity !== '1') failures.push(`Evidence marker opacity is ${computed.marker.opacity}`);
    const markerMatrix = readMatrix(computed.marker.transform);
    if (!markerMatrix || markerMatrix.a !== 1 || markerMatrix.b !== 0 || markerMatrix.c !== 0
      || markerMatrix.d !== 1 || markerMatrix.e !== 0 || markerMatrix.f !== 0) {
      failures.push(`Evidence marker transform is ${computed.marker.transform}`);
    }
    if (computed.marker.transitionDuration !== '0s') failures.push(`Evidence marker transition is ${computed.marker.transitionDuration}`);
  }
  if (!computed.connector) failures.push('Evidence desktop connector pseudo-element missing');
  else {
    const matrix = readMatrix(computed.connector.transform);
    if (!matrix || matrix.a < 0.99 || Math.abs(matrix.e) > 0.01) failures.push(`Evidence connector is not settled: ${computed.connector.transform}`);
    if (computed.connector.transitionDuration !== '0s') failures.push(`Evidence connector transition is ${computed.connector.transitionDuration}`);
  }

  if (!computed.seal) failures.push('settle seal missing');
  else {
    const matrix = readMatrix(computed.seal.transform);
    if (computed.seal.opacity !== '1') failures.push(`settle seal opacity is ${computed.seal.opacity}`);
    if (!matrix || Math.abs(matrix.e) > 0.01 || Math.abs(matrix.f) > 0.01 || matrix.a < 0.98 || matrix.d < 0.98) {
      failures.push(`settle seal transform is not its static final matrix: ${computed.seal.transform}`);
    }
    if (computed.seal.transitionDuration !== '0s') failures.push(`settle seal transition is ${computed.seal.transitionDuration}`);
    if (computed.seal.animationName !== 'none') failures.push(`settle seal animation-name is ${computed.seal.animationName}`);
  }

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
  const firstData = await sample();
  await page.waitForTimeout(1000);
  const secondData = await sample();
  if (!firstData.length) failures.push('protected data selectors matched no nodes');
  if (JSON.stringify(firstData) !== JSON.stringify(secondData)) failures.push('protected data text/bbox/transform drifted between samples');
  for (const entry of firstData) {
    if (entry.transform !== 'none' || entry.animationName !== 'none' || entry.transitionDuration !== '0s') {
      failures.push(`protected data gained motion: ${entry.selector}`);
    }
  }

  await context.close();
  console.log('reduce animation census:', JSON.stringify(census));
  console.log('reduce computed state:', JSON.stringify(computed));
  console.log('protected data samples:', JSON.stringify({ nodes: firstData.length, identical: JSON.stringify(firstData) === JSON.stringify(secondData) }));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\nreduced-motion runtime probe failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(`\nreduced-motion: PASS (${DATA_SELECTORS.length} protected selector groups; no unregistered animations)`);
