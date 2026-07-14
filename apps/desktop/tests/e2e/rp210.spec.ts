import { expect, test } from '@playwright/test';
import { confirmDemoReview, openWorkbench } from './helpers';

// —— RP-2.10 三卡一纸 + 同源过程动画（docs/decisions/ADR-011-minimal-harness-kernel.md） ——

test('Work progress 锚 = settled 字符竖线 / running 品牌三横，居 turn 尾 message 按钮排之下', async ({ page }) => {
  await openWorkbench(page);
  const turn = page.getByTestId('assistant-turn-demo');
  const stream = turn.getByTestId('process-trace');
  await expect(stream).toBeVisible({ timeout: 15_000 });

  // 链注记：RP-2.11 字符版 → 批次七⑦ thinking 态 BrandThinking；字符光标只余 settled 静锚。
  // 时序去耦：等回放落定 settled 再断言锚形（thinking 窗口内无 cursor 属新契约,勿误红）。
  await expect(stream).toHaveAttribute('data-state', 'settled', { timeout: 15_000 });
  await expect(stream).toHaveAttribute('data-mode', 'progress');
  const cursor = stream.locator('.process-trace-cursor');
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

test('#26.3 静默锚展开回看工作进度，收回静态 icon', async ({ page }) => {
  await openWorkbench(page);
  const stream = page.getByTestId('assistant-turn-demo').getByTestId('process-trace');
  await expect(stream).toHaveAttribute('data-state', 'settled', { timeout: 15_000 });
  await expect(page.getByTestId('process-trace-body')).toHaveCount(0);
  await page.getByTestId('process-trace-toggle').click();
  await expect(page.getByTestId('process-trace-body')).toBeVisible();
  await page.getByTestId('process-trace-toggle').click();
  await expect(page.getByTestId('process-trace-body')).toHaveCount(0);
});

// —— Item 3：chat 内卡片清算 ——

test('chat 内 interaction/门禁为轻卡，event/artifact/file 降扁平 message 行', async ({ page }) => {
  await openWorkbench(page);
  // artifact/file：扁平 message 行——无四周框、无圆角、透明底
  const artifact = page.getByTestId('turn-card-artifact');
  await expect(artifact).toHaveCSS('border-radius', '0px');
  await expect(artifact).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await confirmDemoReview(page);
  const file = page.getByTestId('output-docx-card');
  await expect(file).toHaveCSS('border-radius', '0px');
  await expect(file).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  // interaction：轻卡——hairline + 6px + generated 微差底色（非白卡套白卡）
  const question = page.getByTestId('turn-card-question');
  await expect(question).toHaveCSS('border-radius', '6px');
  await expect(question).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(question).toHaveCSS('border-top-width', '1px');
  // gate：轻卡
  const gate = page.getByTestId('turn-card-gate');
  await expect(gate).not.toHaveCSS('border-radius', '0px');
  await expect(gate).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

// —— Item 1：三卡一纸 ——

test('十四章浏览器态：右列唯一 surface 卡=Preview,无关闭/重开路径', async ({ page }) => {
  await openWorkbench(page);
  const right = page.getByTestId('right-module-stack');
  await expect(right.locator('.surface-card')).toHaveCount(1);
  await expect(right.locator('.surface-card')).toHaveAttribute('data-testid', 'preview-host');
  await expect(page.getByTestId('preview-close')).toHaveCount(0);
  await expect(page.getByTestId('preview-open')).toHaveCount(0);
});

test('缝钮两态同位；模块列态四模块白卡顶置（十四章）', async ({ page }) => {
  // 迁移链：卡顶带 → 底纸 → 顶置填充卡 → 白卡 tap → 十四章四模块序。缝钮驻过渡带不变。
  await openWorkbench(page);
  const collapse = page.getByTestId('collapse-right-rail');
  await expect(collapse).toBeVisible();
  await expect(page.getByTestId('window-chrome').getByTestId('collapse-right-rail')).toHaveCount(0);
  const [cBox, rBox2] = await Promise.all([collapse.boundingBox(), page.getByTestId('right-module-stack').boundingBox()]);
  expect((cBox?.x ?? 0) + (cBox?.width ?? 0) / 2).toBeLessThanOrEqual((rBox2?.x ?? 0) + 1);
  await expect(collapse.locator('xpath=ancestor::*[contains(concat(" ",@class," ")," surface-card ")]')).toHaveCount(0);
  // back → 模块列：首模块白卡顶缘=右列顶缘
  await page.getByTestId('preview-back').click();
  const right = page.getByTestId('right-module-stack');
  const modules = page.getByTestId('utility-rail');
  const [dBox, rBox] = await Promise.all([modules.boundingBox(), right.boundingBox()]);
  expect(Math.abs((dBox?.y ?? 0) - (rBox?.y ?? 0))).toBeLessThanOrEqual(2);
  await expect(modules.locator('.rail-module').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
