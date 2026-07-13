import { expect, test } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/** 用户拍板 2026-07-12：LLM 回复逐字打字机 reveal（UI 层），完成后切 ChatMarkdown 富渲染。 */
test('assistant 回复逐字 reveal，完成切富渲染（打字机）', async ({ page }) => {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await page.evaluate(() => {
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setResponder(r: (() => Promise<unknown>) | null): void };
    }).__courtworkChatHooks;
    hooks?.setResponder(async () => ({ content: '这是一段用于验证打字机逐字输出的回复文本，包含**加重**与足够长度以观察 reveal 过程。' }));
  });
  await page.getByTestId('composer-input').fill('打字机验证');
  await page.getByTestId('composer-send').click();
  // reveal 进行中：typewriter 元素出现且文本尚未全长
  const typewriter = page.getByTestId('chat-typewriter');
  await expect(typewriter).toBeVisible();
  const partial = (await typewriter.textContent())!.length;
  expect(partial).toBeGreaterThan(0);
  // 完成后：typewriter 退场，切 ChatMarkdown 富渲染（加重成 strong）
  await expect(typewriter).toHaveCount(0);
  const md = page.getByTestId('chat-assistant-message').getByTestId('chat-markdown');
  await expect(md.locator('strong')).toHaveText('加重');
});
