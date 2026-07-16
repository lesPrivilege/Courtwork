import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * CHAT-MEMORY-1（ADR-013 §2）端到端：请求完成→规则蒸馏入 memory→下轮作为低频前缀段注入→
 * 设置页查看（含来源坐标）→一键清除后不再注入。窗口/transcript 语义（CHAT-SESSION-1）不动。
 */

const MEMORY_KEY = 'courtwork.chat-memory.v1';

/** 安装捕获用 stream：每次请求把 system 段推入 window，并正常完成一轮。 */
async function installCapturingStream(page: Page) {
  await page.evaluate(() => {
    type Ctx = { request: { systemPrompt?: string }; requestId: string; providerId: string; modelId: string };
    const w = window as typeof window & {
      __caps?: string[];
      __courtworkChatHooks?: { setStreamFactory(f: ((c: Ctx) => AsyncIterable<unknown>) | null): void };
    };
    w.__caps = [];
    const hooks = w.__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      w.__caps!.push(request.systemPrompt ?? '');
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '好的。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

async function sendChat(page: Page, text: string) {
  await page.getByTestId('composer-input').fill(text);
  await page.getByTestId('composer-send').click();
}

const lastSystem = (page: Page) =>
  page.evaluate(() => {
    const caps = (window as typeof window & { __caps?: string[] }).__caps ?? [];
    return caps[caps.length - 1] ?? '';
  });

test('自动记忆全链：蒸馏→注入→查看→一键清除', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installCapturingStream(page);

  // ① 首轮：显式偏好被规则蒸馏入 memory（携来源坐标，写入 localStorage 版本化单键）
  await sendChat(page, '记住：我偏好简短的回答');
  await expect(page.getByTestId('chat-assistant-message').first()).toBeVisible();
  await expect
    .poll(async () => page.evaluate((key) => localStorage.getItem(key) ?? '', MEMORY_KEY))
    .toContain('简短的回答');

  // 蒸馏条目携真实 turn 坐标（来源 turnId 存在于 journal 版本化条目）
  const stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key) ?? '', MEMORY_KEY)) as {
    version: number;
    entries: Array<{ kind: string; text: string; source: { sessionId: string; turnId: string } }>;
  };
  expect(stored.version).toBe(1);
  expect(stored.entries.length).toBeGreaterThan(0);
  expect(stored.entries[0].source.turnId).toMatch(/^chat-/);

  // ② 次轮：memory 作为低频前缀段注入 system——基身份仍是稳定前缀
  await installCapturingStream(page); // 重置捕获数组
  await sendChat(page, '你好');
  await expect(page.getByTestId('chat-assistant-message').nth(1)).toBeVisible();
  const injected = await lastSystem(page);
  expect(injected).toContain('Courtwork 的协作助手'); // 基身份前缀
  expect(injected).toContain('[长期记忆]');
  expect(injected).toContain('简短的回答');
  expect(injected).toContain('作参考不作裁决依据');

  // ③ 设置页查看：只读列表含来源坐标，无编辑/管理控件
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await page.getByTestId('settings-nav-privacy').click();
  await expect(page.getByTestId('settings-memory-row')).toBeVisible();
  await expect(page.getByTestId('settings-memory-item').first()).toContainText('简短的回答');
  await expect(page.getByTestId('settings-memory-source').first()).toContainText('chat-');
  // 只读：面板内无输入/编辑控件
  expect(await page.getByTestId('settings-memory-row').locator('input, textarea, select').count()).toBe(0);

  // ④ 一键清除：点击后 memory 彻底清空（UI 空态 + 干净 v1 空信封）
  await page.getByTestId('settings-memory-clear').click();
  await expect(page.getByTestId('settings-memory-empty')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key) ?? '', MEMORY_KEY)).toBe(
    JSON.stringify({ version: 1, entries: [] }),
  );
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings-page')).toBeHidden();

  // ⑤ 清除后不再注入：下一轮 system 回退纯基身份，零 memory 残留
  await installCapturingStream(page);
  await sendChat(page, '再问一句');
  await expect(page.getByTestId('chat-assistant-message').nth(2)).toBeVisible();
  const afterClear = await lastSystem(page);
  expect(afterClear).toContain('Courtwork 的协作助手');
  expect(afterClear).not.toContain('[长期记忆]');
});
