import { expect, test } from '@playwright/test';

test('cold install stays on the quiet welcome surface', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('provider-setup')).toHaveCount(0);
  await expect(page.getByTestId('event-stream')).toHaveCount(0);
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
  await expect(page.getByTestId('welcome-demo-start')).toBeVisible();
});

test('demo identity is inline, data-driven, and opens only by choice', async ({ page }) => {
  await page.goto('/');
  const demo = page.locator('[data-demo="true"]');

  await expect(demo.getByTestId('demo-origin-label')).toHaveText('样板案');
  await expect(demo.getByTestId('demo-package-icon')).toBeVisible();
  await expect(demo.locator('.case-demo-badge')).toHaveCount(0);
  await expect(demo.locator('.unread-count')).toHaveCount(0);

  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();
  await expect(page.getByTestId('event-stream')).toBeVisible();
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

test('pending credentials surface only on an explicit send attempt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('provider-setup')).toHaveCount(0);
  await page.getByPlaceholder('Describe a task or ask anything…').fill('开始处理');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('provider-setup')).toBeVisible();
});

test('preview owns one read-only scroll progress interface', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();

  const progress = page.getByTestId('preview-scroll-progress');
  await expect(progress).toHaveCount(1);
  await expect(progress).toHaveAttribute('aria-readonly', 'true');
  await expect(progress.locator('[data-testid="preview-progress-track"]')).toHaveCSS('width', '2px');
});

test('schema 语义区与面板本体左对齐贯通（⑫用户拍板，撤 master-detail gutter）', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();

  // CONFIRM-GRANULARITY-1：批量确认入口 feature-off 后 .batch-bar 不再渲染，锚点改为
  // 面板本体（revision-layout 零 padding，risk-master-detail 无左 margin，语义仍等价：
  // 验证语义区无额外左缩进/gutter，不依赖已收起的批量状态栏存在）。
  const panel = await page.getByTestId('revision-panel').boundingBox();
  const semantic = await page.locator('.risk-master-detail').boundingBox();
  expect(panel).not.toBeNull();
  expect(semantic).not.toBeNull();
  // 迁移注记：原「≥12 tokenized gutter」→ 贯通对齐（法理之线在 row 内左边缘，不依赖外部 gutter）
  expect(Math.abs((semantic?.x ?? 0) - (panel?.x ?? 0))).toBeLessThanOrEqual(1);
});

test('right workbench keeps the 44/40/36 hierarchy and tab endpoints', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();

  // 十四章：demo 进浏览器态,back 回四模块列——模块头行 40（与 chat title 带同线）
  await page.getByTestId('preview-back').click();
  await expect(page.locator('.rail-module-head').first()).toHaveCSS('height', '40px');
  // 浏览器态：preview 头 40 + tab 条 36 五 tab
  await page.getByTestId('outline-draft').click();
  await expect(page.locator('.preview-host-head')).toHaveCSS('height', '40px');
  await expect(page.locator('.view-tabs')).toHaveCSS('height', '36px');
  await expect(page.locator('.view-tabs [role="tab"]')).toHaveCount(5);
  await expect(page.getByTestId('view-draft')).toBeVisible();
});
