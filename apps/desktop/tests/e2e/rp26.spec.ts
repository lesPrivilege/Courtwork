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

  const progress = page.getByTestId('preview-scroll-progress');
  await expect(progress).toHaveCount(1);
  await expect(progress).toHaveAttribute('aria-readonly', 'true');
  await expect(progress.locator('[data-testid="preview-progress-track"]')).toHaveCSS('width', '2px');
});

test('schema semantic edge keeps a tokenized gutter from chat', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-demo-start').click();

  const host = await page.getByTestId('preview-host').boundingBox();
  const semantic = await page.locator('.risk-master-detail').boundingBox();
  expect(host).not.toBeNull();
  expect(semantic).not.toBeNull();
  expect((semantic?.x ?? 0) - (host?.x ?? 0)).toBeGreaterThanOrEqual(12);
});

test('right workbench keeps the 44/40/36 hierarchy and tab endpoints', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-demo-start').click();

  await expect(page.locator('.utility-dock')).toHaveCSS('height', '44px');
  await expect(page.locator('.preview-host-head')).toHaveCSS('height', '40px');
  await expect(page.locator('.view-tabs')).toHaveCSS('height', '36px');
  await expect(page.locator('.view-tabs [role="tab"]')).toHaveCount(5);
  await expect(page.getByTestId('view-draft')).toBeVisible();
});
