import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * 用户拍板 2026-07-12：顶部 chrome 行（红绿灯 + panel/search 钮）装进左卡内；
 * 品牌 wordmark 用扁平无框 brand-mark（撤旧 courtwork-mark.svg 带框暖灰 img）。
 * 回归 RP-2.11 原意「卡片铺到红绿灯」，覆盖左卡顶部四边等距。
 */

test('左卡顶边贯通到窗口顶，chrome 钮落卡背景内（红绿灯装卡内）', async ({ page }) => {
  await openWorkbench(page);
  const rail = page.getByTestId('case-rail');
  const railBox = (await rail.boundingBox())!;
  // 卡顶到窗口顶：红绿灯所在窗口左上区落卡背景内
  expect(railBox.y).toBeLessThanOrEqual(1);
  const panel = page.getByTestId('collapse-left-rail');
  const panelBox = (await panel.boundingBox())!;
  const inRail =
    panelBox.x >= railBox.x &&
    panelBox.x + panelBox.width <= railBox.x + railBox.width &&
    panelBox.y >= railBox.y;
  expect(inRail).toBe(true);
});

test('品牌 wordmark 用扁平无框 brand-mark（藏青本色，无 img 外框）', async ({ page }) => {
  await openWorkbench(page);
  const wordmark = page.locator('.rail-wordmark');
  // 撤旧 img 引用；现为内联 svg（brand-mark，扁平无框）
  await expect(wordmark.locator('img')).toHaveCount(0);
  const icon = wordmark.locator('svg.rail-wordmark-icon');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveCSS('color', 'rgb(10, 37, 64)');
});
