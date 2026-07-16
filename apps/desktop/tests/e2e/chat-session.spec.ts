import { expect, test } from '@playwright/test';
import { connectProvider, installChatStream, openWorkbench } from './helpers';

/**
 * CHAT-SESSION-1（ADR-013 §1）：会话以 1 小时连续性窗口自动划界。
 * - 跨窗（>1h）新请求开启新 session，不回灌上一会话全文（捕获请求断言）；
 * - 窗口内（≤1h）延续，携历史；
 * - 历史 session 只读导航：无用户管理入口，只读态无 composer。
 * 端到端覆盖 App.handleChatSend 的窗口接线与 SessionHistory 装配（纯函数另有 Vitest）。
 */

/** 装一个把每轮 request.messages 记进 window.__rounds 的流工厂。 */
async function installRoundCapture(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    type Message = { role: string; content: string };
    type Ctx = { request: { messages: Message[] }; requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Ctx) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    const target = window as typeof window & { __rounds?: Message[][] };
    target.__rounds = [];
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      target.__rounds?.push(request.messages.map((message) => ({ ...message })));
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '收到。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

async function readRounds(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => (window as typeof window & { __rounds?: Array<Array<{ role: string; content: string }>> }).__rounds ?? [],
  );
}

const FIRST = 'FIRST-SESSION-MARK-7K2Z';
const SECOND = 'SECOND-SESSION-MARK-7K2Z';

test('跨窗（>1h）新开：第二轮请求不含上一会话全文', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installRoundCapture(page);

  // 冻结时钟到固定时刻，再跨过 1 小时窗口
  await page.clock.install({ time: new Date('2026-07-15T09:00:00Z') });

  await page.getByTestId('composer-input').fill(FIRST);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveCount(1);

  await page.clock.fastForward('01:01:00'); // 61 分钟 → 超窗

  await page.getByTestId('composer-input').fill(SECOND);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveCount(2);

  const rounds = await readRounds(page);
  expect(rounds).toHaveLength(2);
  const secondRound = rounds[1];
  const joined = secondRound.map((message) => message.content).join('\n');
  // 只带本轮新消息，不回灌上一会话
  expect(joined).toContain(SECOND);
  expect(joined).not.toContain(FIRST);
  expect(secondRound.filter((message) => message.role === 'user')).toHaveLength(1);
});

test('窗口内（≤1h）延续：第二轮请求仍携第一轮历史', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installRoundCapture(page);

  await page.clock.install({ time: new Date('2026-07-15T09:00:00Z') });

  await page.getByTestId('composer-input').fill(FIRST);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveCount(1);

  await page.clock.fastForward('00:59:00'); // 59 分钟 → 仍在窗口内

  await page.getByTestId('composer-input').fill(SECOND);
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveCount(2);

  const rounds = await readRounds(page);
  const secondRound = rounds[1];
  const joined = secondRound.map((message) => message.content).join('\n');
  // 延续：历史全文进入第二轮
  expect(joined).toContain(FIRST);
  expect(joined).toContain(SECOND);
  expect(secondRound.filter((message) => message.role === 'user')).toHaveLength(2);
});

test('历史会话只读导航：列表无管理入口，选中只读且无 composer', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, { content: '历史回答内容-ABC123' });

  await page.getByTestId('composer-input').fill('第一问');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveAttribute('data-status', 'completed');

  // 打开历史会话列表
  await page.getByTestId('chat-history-toggle').click();
  await expect(page.getByTestId('session-history')).toBeVisible();
  await expect(page.getByTestId('session-entry')).toHaveCount(1);

  // 无任何用户管理入口
  await expect(page.getByTestId('session-rename')).toHaveCount(0);
  await expect(page.getByTestId('session-archive')).toHaveCount(0);
  await expect(page.getByTestId('session-pin')).toHaveCount(0);
  await expect(page.getByTestId('session-delete')).toHaveCount(0);
  // 历史浏览态不渲染 composer
  await expect(page.getByTestId('composer-input')).toHaveCount(0);

  // 选中 → 只读 transcript（含助手正文，无 composer）
  await page.getByTestId('session-entry').first().click();
  const readonly = page.getByTestId('session-transcript-readonly');
  await expect(readonly).toBeVisible();
  await expect(readonly).toContainText('历史回答内容-ABC123');
  await expect(page.getByTestId('composer-input')).toHaveCount(0);
  await expect(readonly.locator('input, textarea')).toHaveCount(0);

  // 返回当前会话 → composer 复现
  await page.getByTestId('session-history-close').click();
  await expect(page.getByTestId('composer-input')).toBeVisible();
});
