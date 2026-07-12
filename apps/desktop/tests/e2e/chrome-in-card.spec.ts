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

test('三栏卡顶边齐到窗口顶、底边齐、左右 inset 对称（卡片对齐统一）', async ({ page }) => {
  await openWorkbench(page);
  const [rail, conv, right] = await Promise.all([
    page.getByTestId('case-rail').boundingBox(),
    page.locator('.conversation').boundingBox(),
    page.getByTestId('right-module-stack').boundingBox(),
  ]);
  const vw = page.viewportSize()!.width;
  // 三栏顶边齐到窗口顶
  expect(rail!.y).toBeLessThanOrEqual(1);
  expect(Math.abs(rail!.y - conv!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(conv!.y - right!.y)).toBeLessThanOrEqual(1);
  // 底边齐
  expect(Math.abs((rail!.y + rail!.height) - (right!.y + right!.height))).toBeLessThanOrEqual(1);
  // 左右 inset 对称
  expect(Math.abs(rail!.x - (vw - (right!.x + right!.width)))).toBeLessThanOrEqual(1);
});

test('品牌 wordmark 纯文字（撤占位简笔图标，无 img/svg——待正式扁平图标到位）', async ({ page }) => {
  await openWorkbench(page);
  const wordmark = page.locator('.rail-wordmark');
  await expect(wordmark).toHaveText('Courtwork');
  await expect(wordmark.locator('img')).toHaveCount(0);
  await expect(wordmark.locator('svg')).toHaveCount(0);
});
