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

test('dual-state exclusivity: browser mode has no module rail; module mode has no preview', async ({ page }) => {
  // 迁移链：底纸 → 顶置 → 十四章双态互斥（浏览器态右列唯一 Preview）。
  await openWorkbench(page);
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('utility-rail')).toHaveCount(0);
  await page.getByTestId('preview-back').click();
  await expect(page.getByTestId('utility-rail')).toBeVisible();
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
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
