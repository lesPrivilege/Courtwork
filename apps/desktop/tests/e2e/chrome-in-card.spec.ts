import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * 2026-07-13 真机纠偏：Overlay 标题栏下，原生交通灯属于系统窗口框架；WebView 只负责
 * 保留不可遮挡区。旧测试仅查矩形 bounding box，没查圆角实际涂色区域，因而放过了
 * x=12 / y=0 / r=12 下关闭钮切进圆角外侧的假阳性。
 */

test('左卡真实拥有 chrome 与 AppKit 交通灯动态锚框，应用按钮不侵入系统控制组', async ({ page }) => {
  await openWorkbench(page);
  const rail = page.getByTestId('case-rail');
  const chrome = rail.getByTestId('window-chrome');
  const safeArea = rail.getByTestId('mac-window-controls-anchor');
  await expect(chrome).toHaveCount(1);
  await expect(safeArea).toHaveAttribute('aria-hidden', 'true');
  await expect(safeArea).toHaveAttribute('data-layout', 'appkit-anchor');

  const railBox = (await rail.boundingBox())!;
  const safeBox = (await safeArea.boundingBox())!;
  expect(safeBox.x).toBeGreaterThanOrEqual(railBox.x);
  expect(safeBox.y).toBeGreaterThanOrEqual(railBox.y);
  expect(safeBox.x + safeBox.width).toBeLessThanOrEqual(railBox.x + railBox.width);
  expect(safeBox.y + safeBox.height).toBeLessThanOrEqual(railBox.y + railBox.height);

  const panel = chrome.getByTestId('collapse-left-rail');
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.x).toBeGreaterThanOrEqual(safeBox.x + safeBox.width);
  expect(panelBox.y).toBeGreaterThanOrEqual(railBox.y);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(railBox.x + railBox.width);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(railBox.y + railBox.height);

  const railHeadBox = (await rail.locator('.rail-head').boundingBox())!;
  expect(safeBox.y + safeBox.height).toBeLessThanOrEqual(railHeadBox.y);
});

test('双侧收拢撤销右侧卡片，Chat 以视口中线为磁吸锚并随 resize 重新居中', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('collapse-left-rail').click();
  await page.getByTestId('collapse-right-rail').click();

  await expect(page.getByTestId('right-module-stack')).toHaveCount(0);
  await expect(page.getByTestId('expand-right-rail')).toBeVisible();

  for (const width of [1180, 1440, 1760]) {
    await page.setViewportSize({ width, height: 900 });
    const [conversation, composer] = await Promise.all([
      page.getByTestId('conversation-canvas').boundingBox(),
      page.locator('.composer-stack').boundingBox(),
    ]);
    expect(conversation!.x).toBe(0);
    expect(conversation!.width).toBe(width);
    expect(Math.abs(composer!.x + composer!.width / 2 - width / 2)).toBeLessThanOrEqual(1);
  }
});

test('系统关闭钮圆周完全落在左卡圆角涂色区（真机 Overlay 几何判例）', async ({ page }) => {
  await openWorkbench(page);
  const rail = page.getByTestId('case-rail');
  const railBox = (await rail.boundingBox())!;
  const radius = Number.parseFloat(await rail.evaluate((element) => getComputedStyle(element).borderTopLeftRadius));

  // 当前 Tauri Overlay 真机实测：交通灯首钮中心 (20,20)，半径 7px。
  // 卡片圆角圆心必须与之重合，按钮圆周才真正落在涂色区，而非只进 bounding box。
  const nativeClose = { x: 20, y: 20, radius: 7 };
  expect(railBox.x + radius).toBe(nativeClose.x);
  expect(railBox.y + radius).toBe(nativeClose.y);
  expect(nativeClose.radius).toBeLessThan(radius);
});

test('左右浮卡共用 8px 外缘、12px 圆角和上下基线；中间 Chat 保持 L0 全高画布', async ({ page }) => {
  await openWorkbench(page);
  const [rail, conv, right] = await Promise.all([
    page.getByTestId('case-rail').boundingBox(),
    page.getByTestId('conversation-canvas').boundingBox(),
    page.getByTestId('preview-host').boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(rail!.x).toBe(8);
  expect(rail!.y).toBe(8);
  expect(viewport.width - (right!.x + right!.width)).toBe(8);
  expect(right!.y).toBe(8);
  expect(Math.abs((rail!.y + rail!.height) - (right!.y + right!.height))).toBeLessThanOrEqual(1);
  expect(viewport.height - (rail!.y + rail!.height)).toBe(8);

  expect(conv!.y).toBe(0);
  expect(conv!.height).toBe(viewport.height);

  await expect(page.getByTestId('case-rail')).toHaveCSS('border-radius', '12px');
  await expect(page.getByTestId('preview-host')).toHaveCSS('border-radius', '12px');
});

test('品牌 wordmark 纯文字（撤占位简笔图标，无 img/svg——待正式扁平图标到位）', async ({ page }) => {
  await openWorkbench(page);
  const wordmark = page.locator('.rail-wordmark');
  await expect(wordmark).toHaveText('Courtwork');
  await expect(wordmark.locator('img')).toHaveCount(0);
  await expect(wordmark.locator('svg')).toHaveCount(0);
});
