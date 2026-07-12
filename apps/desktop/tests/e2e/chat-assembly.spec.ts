import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/** 批次七①：chat 面最小组装——发送请求必须携带 system 段（身份/红线/语言三件），零段即缺陷。 */
test('chat 发送携带 system 组装段：身份声明+红线简版+语言约定', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await page.evaluate(() => {
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setResponder(r: ((m: unknown, s?: string) => Promise<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setResponder(async (_messages, systemPrompt) => {
      (window as typeof window & { __capturedSystemPrompt?: string }).__capturedSystemPrompt = systemPrompt;
      return { content: '收到。' };
    });
  });
  await page.getByTestId('composer-input').fill('组装段验证');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
  const captured = await page.evaluate(() =>
    (window as typeof window & { __capturedSystemPrompt?: string }).__capturedSystemPrompt ?? '');
  expect(captured).toContain('Courtwork 的协作助手');
  expect(captured).toContain('红线');
  expect(captured).toContain('等待用户确认');
  expect(captured).toContain('简体中文');
});
