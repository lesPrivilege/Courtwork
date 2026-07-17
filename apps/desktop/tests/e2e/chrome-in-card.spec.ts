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

test('双侧收拢撤销右侧卡片，work 正文列收至 content-measure 并随 resize 保持居中', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('collapse-left-rail').click();
  await page.getByTestId('collapse-right-rail').click();

  await expect(page.getByTestId('right-module-stack')).toHaveCount(0);
  await expect(page.getByTestId('expand-right-rail')).toBeVisible();

  // 架构裁定（LAYOUT-CONVERGE-1 P1-3）：跨模式阅读宽度一致——work 单列态正文列须收至
  // --content-measure；旧断言只查 composer 中心 ≈ 视口中线（全宽时恒真的伪断言）已退役。
  const measure = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--content-measure')));
  expect(measure).toBeGreaterThan(0);

  for (const width of [1180, 1440, 1760]) {
    await page.setViewportSize({ width, height: 900 });
    const [conversation, composer] = await Promise.all([
      page.getByTestId('conversation-canvas').boundingBox(),
      page.locator('.composer-stack').boundingBox(),
    ]);
    // 画布仍为 L0 全高全宽——收缩发生在正文列，画布本体不动
    expect(conversation!.x).toBe(0);
    expect(conversation!.width).toBe(width);
    // 单列态 grid 不得保留 48px 幽灵首列
    const firstTrack = await page.getByTestId('workspace').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ')[0]);
    expect(firstTrack).not.toBe('48px');
    // 正文列（composer）收至 content-measure（视口宽于测宽时封顶），且仍以视口中线居中
    expect(Math.abs(composer!.width - measure)).toBeLessThanOrEqual(2);
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

test('展开态品牌标记位于 Courtwork 左侧，保持单枚 SVG 与无装饰几何契约', async ({ page }) => {
  await openWorkbench(page);
  const wordmark = page.locator('.rail-wordmark');
  const mark = wordmark.getByTestId('brand-mark');
  const label = wordmark.locator('.rail-wordmark-label');

  await expect(wordmark).toHaveText('Courtwork');
  await expect(page.getByRole('heading', { name: 'Courtwork' })).toHaveCount(1);
  await expect(wordmark.locator('img')).toHaveCount(0);
  await expect(wordmark.locator('svg')).toHaveCount(1);
  await expect(mark).toHaveCount(1);
  await expect(mark.locator('rect')).toHaveCount(0);
  await expect(mark.locator('path')).toHaveCount(4);
  await expect(mark.locator('title')).toHaveCount(0);
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark).not.toHaveAttribute('aria-label', /.+/);
  await expect(mark).not.toHaveAttribute('role', /.+/);

  const [markBox, labelBox] = await Promise.all([mark.boundingBox(), label.boundingBox()]);
  expect(markBox).not.toBeNull();
  expect(labelBox).not.toBeNull();
  expect(markBox!.width).toBeGreaterThanOrEqual(16);
  expect(markBox!.width).toBeLessThanOrEqual(18);
  expect(markBox!.height).toBeGreaterThanOrEqual(16);
  expect(markBox!.height).toBeLessThanOrEqual(18);
  expect(labelBox!.x - (markBox!.x + markBox!.width)).toBeGreaterThanOrEqual(6);
  expect(labelBox!.x - (markBox!.x + markBox!.width)).toBeLessThanOrEqual(8);
  expect(Math.abs((markBox!.y + markBox!.height / 2) - (labelBox!.y + labelBox!.height / 2))).toBeLessThanOrEqual(1);

  for (const element of [wordmark, mark]) {
    await expect(element).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(element).toHaveCSS('box-shadow', 'none');
    await expect(element).toHaveCSS('border-radius', '0px');
    await expect(element).toHaveCSS('border-top-width', '0px');
  }

  const staticStyle = async () => mark.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationName: style.animationName,
      transitionDuration: style.transitionDuration,
      transform: style.transform,
      opacity: style.opacity,
    };
  });
  const restingStyle = await staticStyle();
  expect(restingStyle).toEqual({
    animationName: 'none',
    transitionDuration: '0s',
    transform: 'none',
    opacity: '1',
  });
  await mark.hover();
  expect(await staticStyle()).toEqual(restingStyle);

  await page.getByTestId('collapse-left-rail').click();
  await expect(page.getByTestId('brand-mark')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Courtwork' })).toHaveCount(0);
  await expect(page.getByTestId('collapse-left-rail')).toBeVisible();
  await page.getByTestId('collapse-left-rail').click();
  await expect(page.getByTestId('brand-mark')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Courtwork' })).toHaveCount(1);
});
