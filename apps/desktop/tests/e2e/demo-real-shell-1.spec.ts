import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('fresh shell is honest: no sample, pinned history, or person-shaped account', async ({ page }) => {
  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('case-card-demo-linjiang')).toHaveCount(0);
  await expect(page.getByTestId('rail-pinned')).toHaveCount(0);
  await expect(page.getByTestId('rail-empty-state')).toContainText('No recent work');
  await expect(page.getByTestId('user-menu-trigger')).toContainText('Local workspace');
  await expect(page.getByTestId('user-menu-trigger')).not.toContainText(/Owner|Sample lead|林律师/);
  await expect(page.getByTestId('welcome-new-case')).toBeVisible();
  await expect(page.getByTestId('welcome-sample-open')).toBeVisible();
  await expect(page.getByTestId('welcome-demo-start')).toHaveCount(0);
});

test('sample is explicit, read-only, and transient', async ({ page }) => {
  await page.getByTestId('welcome-sample-open').click();

  await expect(page.getByTestId('provider-setup')).toHaveCount(0);
  await expect(page.getByTestId('demo-case-badge')).toBeVisible();
  await expect(page.getByTestId('rail-sample')).toBeVisible();
  await expect(page.getByTestId('sample-readonly-label')).toContainText('只读演示');
  await expect(page.getByTestId('rail-pinned')).toHaveCount(0);
  await expect(page.getByTestId('rail-mixed-list').getByTestId('case-card-demo-linjiang')).toHaveCount(0);
  await expect(page.getByTestId('case-card-demo-linjiang').getByTestId('archive-trigger')).toHaveCount(0);
  await page.getByTestId('chat-case-title').dblclick();
  await expect(page.getByTestId('chat-case-title-input')).toHaveCount(0);
  await expect(page.getByTestId('user-menu-trigger')).toContainText('Local workspace');

  const persisted = await page.evaluate(() => localStorage.getItem('courtwork.case-list.v1') ?? '');
  expect(persisted).not.toContain('demo-linjiang');

  await page.reload();
  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('case-card-demo-linjiang')).toHaveCount(0);
  await expect(page.getByTestId('rail-sample')).toHaveCount(0);
});

test('provider Skip closes onboarding without opening the sample', async ({ page }) => {
  await page.getByTestId('composer-input').fill('开始处理');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('provider-setup')).toBeVisible();
  await expect(page.getByTestId('provider-skip')).toHaveText('暂不连接');
  await page.getByTestId('provider-skip').click();

  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('case-card-demo-linjiang')).toHaveCount(0);
  await expect(page.getByTestId('sample-tour')).toHaveCount(0);
});

test('real case creation occupies Recent and displaces the transient sample', async ({ page }) => {
  await page.getByTestId('welcome-sample-open').click();
  await expect(page.getByTestId('rail-sample')).toBeVisible();

  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill('真实工作案');
  await dialog.getByRole('button', { name: '创建案件' }).click();

  await expect(page.getByTestId('case-card-demo-linjiang')).toHaveCount(0);
  await expect(page.getByTestId('rail-sample')).toHaveCount(0);
  await expect(page.getByTestId('rail-mixed-list')).toContainText('Recent');
  await expect(page.locator('.case-card').filter({ hasText: '真实工作案' })).toBeVisible();
  const persisted = await page.evaluate(() => localStorage.getItem('courtwork.case-list.v1') ?? '');
  expect(persisted).toContain('真实工作案');
  expect(persisted).not.toContain('demo-linjiang');
});
