/* global document */

// og 卡渲染器（R-13，ARCH-SCOPE-2026-07-20）。
//
// 立此脚本的缘由：`site/og.html` **从不发布**——`build.mjs` 不拷贝它，读者只经
// `site/assets/og.png` 看到这张卡。于是 og.html 的文案改动在重渲之前对外零效力，
// 而此前 og.png 既无重渲入口也无字节绑定，实测产物 SHA 与唯一留档已不一致。
// 「源改了、产物没跟上、还没人发现」正是这条链缺两样东西：一个可复跑的渲染入口，
// 一个会红的绑定。本文件是前者，`og-manifest.json` + 契约测试是后者。
//
// 用法：`node site/scripts/render-og.mjs`（自起静态服务，渲染后写回 og.png 与 manifest）。
// 渲染完须跑 `pnpm site:guard`——绑定测试会核实 manifest 与新字节一致。

import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

const siteRoot = resolve('site');
const require = createRequire(resolve('apps/desktop/package.json'));
const { chromium } = require('@playwright/test');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const server = createServer((request, response) => {
  const path = join(siteRoot, decodeURIComponent(request.url.split('?')[0]));
  try {
    response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;

const browser = await chromium.launch();
// og 卡是固定 1200×630 的社交卡规格（og.html 自身以此写死 html/body 尺寸）。
// deviceScaleFactor 取 1：抓取器按 1200×630 消费，放大只增字节不增信息。
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`http://127.0.0.1:${port}/og.html`, { waitUntil: 'networkidle' });
// 字标走子集 webfont；不等字体就绪会摄到回退字形，且每次回退不同 → 字节不可复现。
await page.evaluate(() => document.fonts.ready);
const rendered = await page.screenshot({ type: 'png' });
await browser.close();
server.close();

const outputPath = resolve('site/assets/og.png');
const manifestPath = resolve('site/assets/og-manifest.json');
writeFileSync(outputPath, rendered);
const sha256 = createHash('sha256').update(rendered).digest('hex');
const previous = (() => {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return undefined;
  }
})();
writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 'courtwork.og-card.v1',
  note: 'og.html 从不发布，读者只经本 png 看到这张卡。改 og.html 文案后必须跑 site/scripts/render-og.mjs 重渲，否则改动对外零效力。字节绑定由 versional-language-contract.test.mjs 守。',
  source: 'site/og.html',
  renderer: 'site/scripts/render-og.mjs',
  viewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
  asset: 'site/assets/og.png',
  bytes: rendered.byteLength,
  sha256,
}, null, 2)}\n`);

console.log(`og.png 已重渲：${rendered.byteLength} bytes  sha256 ${sha256}`);
if (previous?.sha256 && previous.sha256 !== sha256) console.log(`（前值 ${previous.sha256}）`);
