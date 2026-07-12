import { expect, test } from '@playwright/test';
import { openWorkbench, openModuleList } from './helpers';

test.beforeEach(async ({ page }) => openWorkbench(page));

test('provider 唯一声明位在 composer，三态无假模型名', async ({ page }) => {
  await expect(page.getByTestId('model-config-trigger')).toHaveCount(1);
  await expect(page.getByTestId('composer-provider')).toBeVisible();
  const phase = await page.getByTestId('composer-provider').getAttribute('data-phase');
  if (phase !== 'connected') await expect(page.getByTestId('composer-provider')).not.toContainText(/DeepSeek/);
  await expect(page.locator('.statusbar [data-testid="model-config-trigger"]')).toHaveCount(0);
  await expect(page.getByTestId('credential-status-button')).toHaveCount(0);
});

test('wordmark 唯一，案件头位于 chat 并可编辑持久化', async ({ page }) => {
  await expect(page.getByText('Courtwork', { exact: true })).toHaveCount(1);
  const title = page.getByTestId('chat-case-title');
  await title.dblclick();
  const input = page.getByTestId('chat-case-title-input');
  await input.fill('临江案 · 第二版');
  await input.press('Enter');
  await expect(title).toHaveText('临江案 · 第二版');
  await page.reload();
  await page.getByTestId('welcome-continuations').locator('button').click();
  await expect(page.getByTestId('chat-case-title')).toHaveText('临江案 · 第二版');
});

test('双侧折叠保留原位展开 bar', async ({ page }) => {
  await page.getByTestId('collapse-left-rail').click();
  await page.getByTestId('collapse-right-rail').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-right-collapsed', 'true');
  await expect(page.getByTestId('collapse-left-rail')).toBeVisible();
  await expect(page.getByTestId('expand-right-rail')).toBeVisible();
  await expect(page.getByTestId('conversation-canvas')).toBeVisible();
});

test('composer 定稿声明与 feedback 链接一字不改', async ({ page }) => {
  await expect(page.getByTestId('composer-disclaimer')).toHaveText(
    'Courtwork is an agent and can make mistakes. Please double-check responses. Give us feedback',
  );
  await expect(page.getByRole('link', { name: 'Give us feedback' })).toHaveAttribute('href', /^mailto:/);
  await expect(page.getByTestId('composer-disclaimer').locator('xpath=..')).toHaveClass(/composer-stack/);
  await expect(page.getByTestId('composer-disclaimer').locator('xpath=..').locator('.composer-float')).toHaveCount(1);
});

test('收窄时案件与模块标题横向省略，不竖排溢出', async ({ page }) => {
  const title = page.getByTestId('chat-case-title');
  await expect(title).toHaveCSS('white-space', 'nowrap');
  await expect(title).toHaveCSS('text-overflow', 'ellipsis');
  await openModuleList(page);
    await expect(page.locator('.rail-module-title').first()).toHaveCSS('white-space', 'nowrap');
  await expect(page.locator('.case-card-select strong').first()).toHaveCSS('text-overflow', 'ellipsis');
});

test('左下用户菜单收纳设置、更新与 feedback', async ({ page }) => {
  await page.getByTestId('user-menu-trigger').click();
  const menu = page.getByTestId('user-menu');
  await expect(menu).toContainText('Settings & updates');
  await expect(menu).toContainText('Give us feedback');
});
