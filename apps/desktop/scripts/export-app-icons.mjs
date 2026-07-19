// 应用图标位图重导出（SKIN-B4 便利项）。dev-only：不入 test:e2e 门链、不随构建跑。
//
// 为何需要它：`docs/design/icon.md` 的变体谱系立了「唯一几何真源 = 512 源稿，其余尺寸一律从
// 源稿重推导」。而 `src-tauri/icons/` 四件位图自首枚提交（`2d66c9f`）起再未更新，源稿却在
// SKIN-B1 被重做（`d432e6d`）——装机图标与品牌源稿**已经脱钩**，且这种脱钩没有任何门看得见
// （位图是二进制，扫描器扫不出它画的是旧稿）。故重导出的动作本身必须留在仓里可复跑，
// 而不是某次手工操作的结果。
//
// 取 `icon-light.svg` 为源：源稿的满幅底盘按 icon.md「仅应用图标保留」，正是装机图标的形态；
// 浅宗底盘在 macOS Dock 的深浅背景下都成立，深宗件另有其位（品牌标深底场景）。
//
// 用法：node scripts/export-app-icons.mjs [--check]
//   缺省重导出四件；`--check` 只报现状与将写入的尺寸，不落盘。

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const repo = path.resolve(root, '..', '..');
const source = path.join(repo, 'docs/design/icon-light.svg');
const iconsDir = path.join(root, 'src-tauri/icons');
const check = process.argv.includes('--check');

// tauri.conf.json 的 icon 数组即交付面；.icns 由 iconset 经 iconutil 合成（macOS 自带，零依赖）。
const PNGS = [
  { file: '32x32.png', size: 32 },
  { file: '128x128.png', size: 128 },
  { file: '128x128@2x.png', size: 256 },
];
const ICNS_SET = [16, 32, 64, 128, 256, 512, 1024];

const svg = readFileSync(source, 'utf8');
const before = Object.fromEntries(PNGS.map(({ file }) => {
  const target = path.join(iconsDir, file);
  return [file, existsSync(target) ? statSync(target).size : 0];
}));

if (check) {
  console.log(`源稿 ${path.relative(repo, source)}（${svg.length} 字节）`);
  console.log(`将写入：${PNGS.map((p) => `${p.file}@${p.size}px`).join(' · ')} + icon.icns（${ICNS_SET.join('/')}）`);
  console.log(`现有字节：${JSON.stringify(before)}`);
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage();
/** 按目标像素起视口、页面零边距、背景透明——底盘由源稿自己画，浏览器不许补白。 */
const render = async (size) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};

for (const { file, size } of PNGS) {
  writeFileSync(path.join(iconsDir, file), await render(size));
}

const iconset = path.join(iconsDir, 'courtwork.iconset');
rmSync(iconset, { recursive: true, force: true });
mkdirSync(iconset, { recursive: true });
for (const size of ICNS_SET) {
  const bytes = await render(size);
  writeFileSync(path.join(iconset, `icon_${size}x${size}.png`), bytes);
  // Retina 命名：@2x 件的像素数是标称数的两倍，故 32px 位图同时充当 16x16@2x。
  if (size !== 16) writeFileSync(path.join(iconset, `icon_${size / 2}x${size / 2}@2x.png`), bytes);
}
await browser.close();

execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(iconsDir, 'icon.icns')]);
rmSync(iconset, { recursive: true, force: true });

for (const { file } of [...PNGS, { file: 'icon.icns' }]) {
  const size = statSync(path.join(iconsDir, file)).size;
  console.log(`${file}: ${before[file] ?? '(旧)'} → ${size} 字节`);
}
