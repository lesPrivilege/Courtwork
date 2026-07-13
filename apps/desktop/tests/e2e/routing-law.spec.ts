import { expect, test, type Page } from '@playwright/test';
import { connectProvider, createNamedCase, openWorkbench } from './helpers';

/** 批次七④ 路由律：对象在哪面，点击即切面。探针实证旧态三条全断（chat 内建案/点案/点阶段均不切）。 */

async function enterChatSegment(page: Page) {
  await openWorkbench(page);
  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
}

test('chat 建案 → 切 work 并选中新案', async ({ page }) => {
  await enterChatSegment(page);
  await createNamedCase(page, '路由律甲案');
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('chat-case-title')).toContainText('路由律甲案');
});

test('chat 内点左栏既有案件 → 隐式切 work', async ({ page }) => {
  await enterChatSegment(page);
  await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('demo-case-badge')).toBeVisible();
});

test('chat 内点阶段行 → 隐式切 work 且右列挂载', async ({ page }) => {
  await enterChatSegment(page);
  await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  // 回 chat 再点阶段，验证阶段行独立触发切面
  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'chat');
  await page.getByTestId('flow-s3').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

/** 五裁②：chat 内建案=隐式存入——话题随建案带入 work 面，chatspace 侧对话单例保留。 */
test('chat 建案隐式存入：话题带入 work 面且 chat 对话保留', async ({ page }) => {
  await enterChatSegment(page);
  await connectProvider(page);
  await page.evaluate(() => {
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setResponder(r: (() => Promise<unknown>) | null): void };
    }).__courtworkChatHooks;
    hooks?.setResponder(async () => ({ content: '助手已回复。' }));
  });
  await page.getByTestId('composer-input').fill('存入桥话题验证');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
  await page.getByTestId('store-chat').click();
  await page.getByTestId('store-chat-case').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('local-user-message')).toContainText('存入桥话题验证');
  await page.getByTestId('segment-chat').click();
  await expect(page.getByTestId('chat-user-message')).toContainText('存入桥话题验证');
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
});
