import { expect, test, type Page } from '@playwright/test';
import { connectProvider, createNamedCase, openWorkbench } from './helpers';

const GRANT_ID = 'grant-work-turn-2';

type HostAuthHooks = {
  reset(): void;
  setNextAuthorize(result: unknown): void;
};

async function createGrantCase(page: Page, name: string) {
  await page.evaluate(({ grantId, label }) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId, label },
    });
  }, { grantId: GRANT_ID, label: name });
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByTestId('new-case-authorize').click();
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
}

async function installStream(page: Page) {
  await page.evaluate(() => {
    type Context = { request: { systemPrompt?: string }; requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Context) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setStreamFactory(async function* ({ request, requestId, providerId, modelId }) {
      const captured = (window as typeof window & { __workTurn2Prompts?: string[] });
      captured.__workTurn2Prompts ??= [];
      captured.__workTurn2Prompts.push(request.systemPrompt ?? '');
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '已按当前工作面回复。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

/** fix-by-acceptance 红证：装一条卡在 `started` 之后的流，直到测试显式 release 才吐正文/终态。 */
async function installStalledStream(page: Page) {
  await page.evaluate(() => {
    type Context = { requestId: string; providerId: string; modelId: string };
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: ((context: Context) => AsyncIterable<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    const gate = window as typeof window & { __workTurn2Release?: () => void; __workTurn2Gate?: Promise<void> };
    gate.__workTurn2Gate = new Promise<void>((resolve) => { gate.__workTurn2Release = resolve; });
    hooks.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      yield { type: 'started', requestId, seq: 0, providerId, modelId };
      await gate.__workTurn2Gate;
      yield { type: 'content_delta', requestId, seq: 1, delta: '迟到的回复。' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    });
  });
}

async function releaseStalledStream(page: Page) {
  await page.evaluate(() => (window as typeof window & { __workTurn2Release?: () => void }).__workTurn2Release?.());
}

test('Work 对话留在 Work 并分账；Chat 反向不携案件语境', async ({ page }) => {
  await openWorkbench(page);
  await page.evaluate(() => (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.reset());
  await connectProvider(page);
  await installStream(page);
  await createGrantCase(page, 'Work Turn 二号案');
  const chatJournalBefore = await page.evaluate(() => window.localStorage.getItem('courtwork.turn-journal.v1'));

  await page.getByTestId('composer-input').fill('请概述本案下一步。');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('workspace')).toHaveAttribute('data-view-segment', 'work');
  await expect(page.getByTestId('work-chat-assistant-message')).toContainText('已按当前工作面回复。');

  const workResult = await page.evaluate((caseId) => ({
    chat: window.localStorage.getItem('courtwork.turn-journal.v1'),
    work: window.localStorage.getItem(`courtwork.work-chat.${caseId}.v1`),
  }), await page.getByTestId('composer').getAttribute('data-active-case'));
  expect(workResult.chat).toBe(chatJournalBefore);
  expect(workResult.work).toContain('"status":"completed"');

  const workPrompt = await page.evaluate(() => (window as typeof window & { __workTurn2Prompts?: string[] }).__workTurn2Prompts?.at(-1) ?? '');
  expect(workPrompt).toContain('案件语境');
  expect(workPrompt).toContain('Work Turn 二号案');

  await page.getByTestId('segment-chat').click();
  await page.getByTestId('composer-input').fill('现在只聊一个泛问题。');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toContainText('已按当前工作面回复。');
  const chatPrompt = await page.evaluate(() => (window as typeof window & { __workTurn2Prompts?: string[] }).__workTurn2Prompts?.at(-1) ?? '');
  expect(chatPrompt).not.toContain('案件语境');
});

test('fix-by-acceptance 红证：案 A 的在途 Work Turn 不得阻塞案 B 的 composer', async ({ page }) => {
  await openWorkbench(page);
  await page.evaluate(() => (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.reset());
  await connectProvider(page);
  await installStalledStream(page);

  await createGrantCase(page, 'Work Turn 在途案 A');
  await page.getByTestId('composer-input').fill('案 A 的问题，请稍后再答。');
  await page.getByTestId('composer-send').click();
  // 案 A 自身在途：composer 预期忙态禁用（非本红证目标，仅确认桩生效）。
  await expect(page.getByTestId('composer-send')).toBeDisabled();

  await createNamedCase(page, 'Work Turn 未绑定案 B');
  await expect(page.getByTestId('titlebar-case-title')).toHaveText('Work Turn 未绑定案 B');

  // 案 B 从未发起过请求；composer 不得因案 A 的在途请求被跨案静默锁死（零 disabledReason、零可见理由）。
  await expect(page.getByTestId('composer-input')).toBeEnabled();
  await expect(page.getByTestId('composer-disabled-reason')).toHaveCount(0);

  // 先填正文（canSend 前置条件），发送钮的 enabled 才单独反映「在途」态，不与「空文本」混淆。
  await page.getByTestId('composer-input').fill('案 B 的问题。');
  await expect(page.getByTestId('composer-send')).toBeEnabled();
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('work-chat-user-message')).toContainText('案 B 的问题。');

  await releaseStalledStream(page);
  await expect(page.getByTestId('work-chat-assistant-message')).toContainText('迟到的回复。');
});
