import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/** 批次七①：chat 面最小组装——发送请求必须携带 system 段（身份/红线/语言三件），零段即缺陷。 */
test('chat 发送携带 system 组装段：身份声明+红线简版+语言约定', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await page.evaluate(() => {
    type Context = { request: { systemPrompt?: string }; requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Context) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      (window as typeof window & { __capturedSystemPrompt?: string }).__capturedSystemPrompt = request.systemPrompt;
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '收到。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
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
