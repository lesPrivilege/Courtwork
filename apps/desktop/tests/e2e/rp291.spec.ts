import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('window chrome mirrors Codex: sidebar control only, no browser history verbs', async ({ page }) => {
  await page.goto('/');
  const chrome = page.getByTestId('window-chrome');
  await expect(chrome).toBeVisible();
  await expect(chrome.getByTestId('collapse-left-rail')).toHaveCount(1);
  await expect(chrome.getByRole('button', { name: 'Back' })).toHaveCount(0);
  await expect(chrome.getByRole('button', { name: 'Forward' })).toHaveCount(0);
  await expect(chrome.getByText('Courtwork', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('case-rail').getByText('Courtwork', { exact: true })).toHaveCount(1);
});

test('chat header has zero buttons', async ({ page }) => {
  await openWorkbench(page);
  // RP-2.11 ①：案件标题迁中栏顶栏（覆盖 RP-2 #19，用户 Debug 3）→ chat 头真正零按钮；标题居 chat-titlebar。
  await expect(page.getByTestId('chat-case-head').locator('button')).toHaveCount(0);
  await expect(page.getByTestId('chat-titlebar').getByTestId('chat-case-title')).toBeVisible();
  await expect(page.getByTestId('chat-case-head').locator('.chat-global-action, .shortcut-trigger')).toHaveCount(0);
});

test('dock is structurally above schema canvas instead of overlaying it', async ({ page }) => {
  await openWorkbench(page);
  const dock = page.getByTestId('utility-rail');
  const preview = page.getByTestId('preview-host');
  const dockBox = await dock.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(dockBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect((dockBox?.y ?? 0) + (dockBox?.height ?? 0)).toBeLessThanOrEqual((previewBox?.y ?? 0) + 1);
  await expect(dock).toHaveCSS('position', 'relative');
});

test('user message, rail rows, and secondary controls are flat', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.locator('.user-message')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('.case-card').first()).toHaveCSS('border-top-width', '0px');
  await expect(page.getByTestId('new-case-open')).toHaveCSS('border-top-width', '0px');
  await expect(page.getByTestId('composer-plus')).toHaveCSS('border-top-width', '0px');
  await expect(page.getByTestId('composer-send')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('chat turn cards collapse to flat ledger rows', async ({ page }) => {
  await openWorkbench(page);
  const artifact = page.getByTestId('assistant-turn-demo').locator('.turn-card').first();
  await expect(artifact).toHaveCSS('border-left-width', '0px');
  await expect(artifact).toHaveCSS('border-radius', '0px');
  await expect(artifact).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
