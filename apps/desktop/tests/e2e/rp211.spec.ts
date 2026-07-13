import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

// —— RP-2.11 chat|work 二段 + 顶栏秩序 + 字符推理（docs/decisions/ADR-005-data-security.md 修正二 · 中间档） ——

test('chat|work 段控真路由：work=工作台 / chat=轻画布（右栏退场）', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('view-segment')).toBeVisible();
  await expect(page.getByTestId('segment-work')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('right-module-stack')).toBeVisible();

  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('segment-chat')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('chat-canvas')).toBeVisible();
  await expect(page.getByTestId('right-module-stack')).toHaveCount(0);
  await expect(page.getByTestId('conversation-canvas')).toHaveCount(0);

  await page.getByTestId('segment-work').click();
  await expect(page.getByTestId('right-module-stack')).toBeVisible();
});

test('chat 面内存态会话：发送即入会话；存入桥接容器化仪式后切 work', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('chat-empty')).toBeVisible();
  await connectProvider(page);
  await page.getByTestId('composer-input').fill('先聊一句再存入');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-user-message')).toContainText('先聊一句再存入');

  await page.getByTestId('store-chat').click();
  await expect(page.getByTestId('store-chat-popover')).toBeVisible();
  await page.getByTestId('store-chat-case').click();
  await expect(page.getByTestId('store-chat-popover')).toHaveCount(0);
  await expect(page.getByTestId('titlebar-case-title')).toContainText('案件');
  await expect(page.getByTestId('right-module-stack')).toBeVisible();
});

test('① 案件标题居顶栏（与红绿灯同排），不在 chat 头，且可编辑持久化', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('chat-titlebar').getByTestId('chat-case-title')).toBeVisible();
  await expect(page.getByTestId('chat-case-head').getByTestId('chat-case-title')).toHaveCount(0);
  await page.getByTestId('chat-case-title').dblclick();
  await page.getByTestId('chat-case-title-input').fill('顶栏改名测试');
  await page.getByTestId('chat-case-title-input').press('Enter');
  await expect(page.getByTestId('chat-case-title')).toHaveText('顶栏改名测试');
});

test('⑤ composer workmode 钮 = chat|work 同源（与顶部段控同步）', async ({ page }) => {
  await openWorkbench(page);
  const workmode = page.getByTestId('composer-workmode');
  await expect(workmode).toHaveAttribute('aria-pressed', 'true');
  await workmode.click();
  await expect(page.getByTestId('segment-chat')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('chat-canvas')).toBeVisible();
});

test('⑥⑦ message 按钮缩档 20px；扁平按钮 hover 深色块 token', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('message-actions-assistant-demo').locator('button').first()).toHaveCSS('width', '20px');
  const control = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--control-hover').trim());
  expect(control).toBe('#dae3ec');
});

test('⑧ 长消息收敛：超阈值渐隐 + Show more/less（纯呈现层）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('segment-chat').click();
  await connectProvider(page);
  await page.getByTestId('composer-input').fill('这是一段很长的消息用于触发长消息收敛。'.repeat(50));
  await page.getByTestId('composer-send').click();
  const msg = page.getByTestId('collapsible-message').first();
  await expect(msg).toHaveAttribute('data-overflowing', 'true');
  const toggle = page.getByTestId('collapse-toggle').first();
  await expect(toggle).toHaveText('Show more');
  await toggle.click();
  await expect(msg).toHaveClass(/is-expanded/);
  await expect(toggle).toHaveText('Show less');
});
