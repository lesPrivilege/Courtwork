import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * 用户拍板 2026-07-12：顶部 chrome 行（红绿灯 + panel/search 钮）装进左卡内；
 * 品牌 wordmark 撤占位简笔图标，纯文字（旧 courtwork-mark.svg 带框暖灰已删；正式扁平图标到位再放）。
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

test('品牌 wordmark 纯文字（撤占位简笔图标，无 img/svg——待正式扁平图标到位）', async ({ page }) => {
  await openWorkbench(page);
  const wordmark = page.locator('.rail-wordmark');
  await expect(wordmark).toHaveText('Courtwork');
  await expect(wordmark.locator('img')).toHaveCount(0);
  await expect(wordmark.locator('svg')).toHaveCount(0);
});
