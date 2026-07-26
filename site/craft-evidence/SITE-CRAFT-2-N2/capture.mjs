/* global process, document, window, console */
// SITE-CRAFT-2 N2 · 帧证与机器自证采集器（沿 N1 体例，仅换输出名与新分区靶）。
// 用法：
//   (cd site && python3 -m http.server 18924 --bind 127.0.0.1) &
//   node site/craft-evidence/SITE-CRAFT-2-N2/capture.mjs
// 自带判定，任一不合即 exit 1：
//   ① 双宗 × 六档宽度横向溢出必须全 0，破图数必须全 0；
//   ② 零新动效：no-preference 下 CSSAnimation 名集合 ⊆ 既有六名；reduce 下 ⊆ {ghosty-reduced-fade}；
//   ③ 数据区静止：卷宗计数四格与微演示原件正文在 1.3s 间隔前后文本与包围盒逐位一致。

import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceRoot, '../../..');
const requireFromDesktop = createRequire(resolve(repositoryRoot, 'apps/desktop/package.json'));
const { chromium } = requireFromDesktop('@playwright/test');
const baseUrl = process.env.COURTWORK_SITE_URL ?? 'http://127.0.0.1:18924/';

const KNOWN_ANIMATIONS = new Set(['typer-develop', 'demo-attn-a', 'demo-attn-b', 'demo-attn-c', 'demo-anchor-a', 'demo-zhu-b']);
const REDUCE_ALLOWED = new Set(['ghosty-reduced-fade']);
const report = { frames: [], overflow: [], animations: {}, dataStatic: null, failures: [] };

const browser = await chromium.launch({ headless: true });
await mkdir(evidenceRoot, { recursive: true });

const settle = async (page) => {
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
};

// ① 帧 + 溢出矩阵（reduce 上下文，帧确定性）
for (const colorScheme of ['light', 'dark']) {
  for (const width of [375, 768, 1180, 1280, 1440, 1600]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await settle(page);
    const probe = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      brokenImages: [...document.images].filter((image) => !image.complete || !image.naturalWidth).length,
    }));
    report.overflow.push({ colorScheme, width, ...probe });
    if (probe.overflow !== 0) report.failures.push(`overflow ${colorScheme}@${width}: ${probe.overflow}px`);
    if (probe.brokenImages !== 0) report.failures.push(`broken images ${colorScheme}@${width}: ${probe.brokenImages}`);
    if (width === 1280 || width === 375) {
      const frame = `n2-${colorScheme}-${width}.png`;
      await page.screenshot({ path: resolve(evidenceRoot, frame), fullPage: true, animations: 'disabled' });
      report.frames.push(frame);
    }
    if (width === 1280) {
      for (const [selector, name] of [['.hero-copy', 'hero'], ['.scenario-ledger', 'contract'], ['.promise', 'promise'], ['.facts', 'facts'], ['.faq', 'faq']]) {
        const frame = `n2-${name}-${colorScheme}-1280.png`;
        await page.locator(selector).screenshot({ path: resolve(evidenceRoot, frame), animations: 'disabled' });
        report.frames.push(frame);
      }
    }
    await context.close();
  }
}

// JS 关闭内容完整帧（新分区为纯静态标记，关 JS 应完整可读）
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(evidenceRoot, 'n2-nojs-dark-1280.png'), fullPage: true, animations: 'disabled' });
  report.frames.push('n2-nojs-dark-1280.png');
  await context.close();
}

// ② 动效集合恒等（零新动效的机器形态）
for (const [label, reducedMotion, allowed] of [
  ['no-preference', 'no-preference', KNOWN_ANIMATIONS],
  ['reduce', 'reduce', REDUCE_ALLOWED],
]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await settle(page);
  await page.waitForTimeout(300);
  const names = await page.evaluate(() => [...new Set(document.getAnimations()
    .filter((animation) => animation.constructor.name === 'CSSAnimation')
    .map((animation) => animation.animationName))].sort());
  report.animations[label] = names;
  for (const name of names) {
    if (!allowed.has(name)) report.failures.push(`unexpected animation under ${label}: ${name}`);
  }
  await context.close();
}

// ③ 数据区静止（计数四格 + 微演示原件正文，1.3s 双采样逐位一致）
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(baseUrl);
  const sample = () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.scenario-proof-stats strong'), document.querySelector('.demo-clause')];
    return nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return `${node.textContent}|${box.x},${box.y},${box.width},${box.height}`;
    });
  });
  const first = await sample();
  await page.waitForTimeout(1300);
  const second = await sample();
  report.dataStatic = { identical: JSON.stringify(first) === JSON.stringify(second), nodes: first.length };
  if (!report.dataStatic.identical) report.failures.push('data zone drifted between samples');
  await context.close();
}

await browser.close();
await writeFile(resolve(evidenceRoot, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ failures: report.failures, overflowChecked: report.overflow.length, animations: report.animations, dataStatic: report.dataStatic }, null, 2));
if (report.failures.length) process.exit(1);
console.log('N2 capture: PASS');
