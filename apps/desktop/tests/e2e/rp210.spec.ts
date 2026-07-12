import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

// —— RP-2.10 三卡一纸 + 品牌 icon 推理动画（docs/49 第十二章 · docs/55 #26.2/#26.3） ——

test('推理锚 = 字符版竖线光标（RP-2.11 改判），居 turn 尾 message 按钮排之下', async ({ page }) => {
  await openWorkbench(page);
  const turn = page.getByTestId('assistant-turn-demo');
  const stream = turn.getByTestId('thinking-stream');
  await expect(stream).toBeVisible({ timeout: 15_000 });

  // RP-2.11 改判：最小字符版——竖线字符光标（非 SVG 图标；brand-mark 本体动画待 post-P-4 另单）
  const cursor = stream.locator('.thinking-cursor');
  await expect(cursor).toHaveCount(1);
  await expect(stream.locator('svg')).toHaveCount(0);
  // 竖线用藏青（灰阶 shimmer 唯一例外）
  await expect(cursor).toHaveCSS('color', 'rgb(10, 37, 64)');

  // 位形：turn 尾、message 按钮排之下（位形不变）
  const actions = turn.getByTestId('message-actions-assistant-demo');
  const [streamBox, actionsBox] = await Promise.all([stream.boundingBox(), actions.boundingBox()]);
  expect(streamBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect((streamBox?.y ?? 0)).toBeGreaterThanOrEqual((actionsBox?.y ?? 0));
});

test('#26.3 静默锚展开回看思考流，收回静态 icon', async ({ page }) => {
  await openWorkbench(page);
  const stream = page.getByTestId('assistant-turn-demo').getByTestId('thinking-stream');
  await expect(stream).toHaveAttribute('data-state', 'settled', { timeout: 15_000 });
  await expect(page.getByTestId('thinking-stream-body')).toHaveCount(0);
  await page.getByTestId('thinking-stream-toggle').click();
  await expect(page.getByTestId('thinking-stream-body')).toBeVisible();
  await page.getByTestId('thinking-stream-toggle').click();
  await expect(page.getByTestId('thinking-stream-body')).toHaveCount(0);
});

// —— Item 3：chat 内卡片清算 ——

test('chat 内唯 question/门禁为轻卡，event/artifact/file 降扁平 message 行', async ({ page }) => {
  await openWorkbench(page);
  // artifact/file：扁平 message 行——无四周框、无圆角、透明底
  const artifact = page.getByTestId('turn-card-artifact');
  await expect(artifact).toHaveCSS('border-radius', '0px');
  await expect(artifact).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const file = page.getByTestId('output-docx-card');
  await expect(file).toHaveCSS('border-radius', '0px');
  await expect(file).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  // question：轻卡——四周框 + 圆角 + 纯白底（承重确认体）
  const question = page.getByTestId('turn-card-question');
  await expect(question).not.toHaveCSS('border-radius', '0px');
  await expect(question).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(question).toHaveCSS('border-top-width', '1px');
  // gate：轻卡
  const gate = page.getByTestId('turn-card-gate');
  await expect(gate).not.toHaveCSS('border-radius', '0px');
  await expect(gate).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

// —— Item 1：三卡一纸 ——

test('右列双卡常驻（2026-07-12 改判）：tap 卡+schema 卡，无关闭/重开路径', async ({ page }) => {
  await openWorkbench(page);
  const right = page.getByTestId('right-module-stack');
  // schema 白卡唯一；tap 卡为填充卡（rail 底色）非白卡
  await expect(right.locator('.surface-card')).toHaveCount(1);
  await expect(right.locator('.surface-card')).toHaveAttribute('data-testid', 'preview-host');
  await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'dock');
  await expect(page.getByTestId('preview-close')).toHaveCount(0);
  await expect(page.getByTestId('preview-open')).toHaveCount(0);
});

test('tap 卡归右列顶（2026-07-12 改判）；折叠钮驻顶栏浮层', async ({ page }) => {
  // 迁移链：RP-2.11 卡顶带 → ch12 坐底纸 → 2026-07-12 真机改判顶置填充卡
  //（与 chat title 同线；填充 rail 色成卡，与 schema 卡上下相接）。折叠钮驻 chrome 不变。
  await openWorkbench(page);
  const collapse = page.getByTestId('collapse-right-rail');
  await expect(collapse).toBeVisible();
  // 2026-07-12 拍板：收敛钮驻 chat|right 过渡缝（不再驻 chrome），两态同位
  await expect(page.getByTestId('window-chrome').getByTestId('collapse-right-rail')).toHaveCount(0);
  const [cBox, rBox2] = await Promise.all([collapse.boundingBox(), page.getByTestId('right-module-stack').boundingBox()]);
  expect((cBox?.x ?? 0) + (cBox?.width ?? 0) / 2).toBeLessThanOrEqual((rBox2?.x ?? 0) + 1);
  await expect(collapse.locator('xpath=ancestor::*[contains(concat(" ",@class," ")," surface-card ")]')).toHaveCount(0);
  const right = page.getByTestId('right-module-stack');
  const dock = page.getByTestId('utility-rail');
  const [dBox, rBox] = await Promise.all([dock.boundingBox(), right.boundingBox()]);
  expect(dBox).not.toBeNull();
  expect(rBox).not.toBeNull();
  expect(Math.abs((dBox?.y ?? 0) - (rBox?.y ?? 0))).toBeLessThanOrEqual(2);
  // tap 卡=白卡（终拍：与 schema 卡统一）
  await expect(dock).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
