import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

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
