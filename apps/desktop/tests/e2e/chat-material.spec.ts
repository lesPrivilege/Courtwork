import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * CHAT-MATERIAL-1：已就绪附件的 readingMarkdown 与用户文本必须逐字进入真实模型请求；
 * 空内容附件必须显式阻断发送，不得以占位符让模型调用成功。
 * 用真实 UI 端到端验证 App 的 handleChatSend 组装接线（Vitest 覆盖纯函数，这里覆盖接线）。
 */

const READING_MARKER = 'MATERIAL-READING-7Q3Z';
const TEXT_MARKER = 'MATERIAL-TEXT-7Q3Z';

test('就绪附件 readingMarkdown 与用户文本逐字进入 request.messages（非占位符）', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();

  await page.evaluate(() => {
    type Ctx = {
      request: { messages: Array<{ role: string; content: string }> };
      requestId: string;
      providerId: string;
      modelId: string;
    };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      (window as typeof window & { __capturedMessages?: unknown }).__capturedMessages = request.messages;
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '收到。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });

  await page.getByTestId('composer-file-input').setInputFiles({
    name: 'note.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(`# 摘要\n\n${READING_MARKER}`),
  });
  const chip = page.locator('[data-testid^="attachment-chip-"]').first();
  await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });

  await page.getByTestId('composer-input').fill(TEXT_MARKER);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toBeVisible();

  const messages = await page.evaluate(
    () =>
      (window as typeof window & { __capturedMessages?: Array<{ role: string; content: string }> })
        .__capturedMessages ?? [],
  );
  const userMessage = messages.find((message) => message.role === 'user');
  expect(userMessage?.content).toContain(READING_MARKER);
  expect(userMessage?.content).toContain(TEXT_MARKER);
  expect(userMessage?.content).not.toContain('（附文件）');
});

test('空内容附件阻断发送：chip 失败态且不发起模型请求', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();

  await page.evaluate(() => {
    type Ctx = { requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    (window as typeof window & { __chatRequested?: boolean }).__chatRequested = false;
    hooks.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      (window as typeof window & { __chatRequested?: boolean }).__chatRequested = true;
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'completed', requestId, seq: 1, finishReason: 'stop' };
    });
  });

  // 空 markdown：reading-view 返回 ok + 空正文 → 归入 failed·empty，不再冒充 ready
  await page.getByTestId('composer-file-input').setInputFiles({
    name: 'empty.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(''),
  });
  const chip = page.locator('[data-testid^="attachment-chip-"]').first();
  await expect(chip).toHaveAttribute('data-status', 'failed', { timeout: 15_000 });
  await expect(chip).toContainText('没有可读取的文字');

  // 即便补入文本，失败态附件仍阻断发送键
  await page.getByTestId('composer-input').fill('请阅读附件');
  await expect(page.getByTestId('composer-send')).toBeDisabled();

  // 未发起任何模型请求（无占位符绕过）
  const requested = await page.evaluate(
    () => (window as typeof window & { __chatRequested?: boolean }).__chatRequested,
  );
  expect(requested).toBe(false);
});
