import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/** Legacy filename retained for test history: real provider delta replaces UI-fabricated typewriter reveal. */
test('assistant 在 provider terminal 前显示真实 delta，terminal 后才切 Markdown', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await page.evaluate(() => {
    const scope = window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: { requestId: string; providerId: string; modelId: string }) => AsyncIterable<unknown>) | null): void };
      __releaseChatTerminal?: () => void;
    };
    scope.__courtworkChatHooks?.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '终态前可见，' };
      await new Promise<void>((resolve) => { scope.__releaseChatTerminal = resolve; });
      yield { type: 'content_delta', requestId, seq: 2, delta: '包含**加重**与完整结论。' };
      yield { type: 'completed', requestId, seq: 3, finishReason: 'stop' };
    });
  });
  await page.getByTestId('composer-input').fill('真实流验证');
  await page.getByTestId('composer-send').click();

  const message = page.getByTestId('chat-assistant-message');
  await expect(message).toHaveAttribute('data-status', 'running');
  await expect(message.getByTestId('chat-stream-content')).toHaveText('终态前可见，');
  await expect(message.getByTestId('chat-markdown')).toHaveCount(0);

  await page.evaluate(() => (window as typeof window & { __releaseChatTerminal?: () => void }).__releaseChatTerminal?.());
  await expect(message).toHaveAttribute('data-status', 'completed');
  await expect(message.getByTestId('chat-stream-content')).toHaveCount(0);
  await expect(message.getByTestId('chat-markdown').locator('strong')).toHaveText('加重');
});
