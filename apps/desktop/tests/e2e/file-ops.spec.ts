import { expect, test, type Page } from '@playwright/test';

async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

test('卷宗整理计划表可勾选并确认执行', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('scene-file-ops').click();
  const panel = page.getByTestId('file-ops-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('file-ops-table')).toBeVisible();
  // 可选条目默认未勾选
  await expect(page.getByTestId('file-ops-select-e-copy-optional')).not.toBeChecked();
  await page.getByTestId('file-ops-execute').click();
  await expect(page.getByTestId('file-ops-report')).toBeVisible();
  await expect(page.getByTestId('file-ops-report')).toContainText('已执行');
  await expect(page.getByTestId('system-open-feedback')).toContainText('已执行');
});

test('整理后可撤销并保留确认门禁形态', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('open-file-ops').click();
  await page.getByTestId('file-ops-execute').click();
  await expect(page.getByTestId('file-ops-report')).toBeVisible();
  await page.getByTestId('file-ops-undo').click();
  await expect(page.getByTestId('file-ops-undo-confirm')).toBeVisible();
  await page.getByTestId('file-ops-undo-confirm').click();
  await expect(page.getByText('已撤销', { exact: true })).toBeVisible();
  await expect(page.getByTestId('system-open-feedback')).toContainText('已撤销');
});

test('原件区展示原始文件名留痕且无删除入口', async ({ page }) => {
  await openWorkbench(page);
  const zone = page.getByTestId('originals-zone');
  await expect(zone.getByText('原名', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /删除/ })).toHaveCount(0);
});
