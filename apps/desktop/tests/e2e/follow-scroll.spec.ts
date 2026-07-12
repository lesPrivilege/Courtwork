import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

/**
 * 批次七首例登记缺陷（FABLE-BASE）：chat 新消息不自动滚底。
 * 三件套契约：钉底跟随 / 用户上翻暂停跟随 / 暂停期间新消息出浮标、点击回底。
 */

// 本组测滚动跟随，非打字机——reduced-motion 下 assistant reveal 瞬显（Typewriter 瞬完成），
// 消息立即全高，避免逐字 reveal 期同步读 scrollHeight 判不溢出。
test.use({ reducedMotion: 'reduce' });

const LONG_REPLY = '这是用于滚动验证的长段落，内容足够多以便撑高容器。'.repeat(30);

async function primeChatWithOverflow(page: Page) {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await page.evaluate((text) => {
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setResponder(r: ((m: unknown) => Promise<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    let turn = 0;
    hooks.setResponder(async () => ({ content: `回复 ${++turn}：${text}` }));
  }, LONG_REPLY);
  const prompts = ['滚动一', '滚动二', '滚动三'];
  for (const [index, prompt] of prompts.entries()) {
    await page.getByTestId('composer-input').fill(prompt);
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-assistant-message')).toHaveCount(index + 1);
    // 等打字机 reveal 完成（切富渲染），消息达全高再判溢出
    await expect(page.getByTestId('chat-typewriter')).toHaveCount(0);
  }
  const overflowing = await page.getByTestId('chat-scroll').evaluate((el) => el.scrollHeight > el.clientHeight + 100);
  expect(overflowing).toBe(true);
}

test('钉底时新消息自动滚底（跟随滚动）', async ({ page }) => {
  await primeChatWithOverflow(page);
  const atBottom = await page.getByTestId('chat-scroll').evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 48);
  expect(atBottom).toBe(true);
  await expect(page.getByTestId('scroll-to-latest')).toHaveCount(0);
});

test('上翻暂停跟随并出浮标，点浮标回底后浮标消失', async ({ page }) => {
  await primeChatWithOverflow(page);
  const scroll = page.getByTestId('chat-scroll');
  await scroll.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', { bubbles: true })); });
  await page.getByTestId('composer-input').fill('滚动四');
  await page.getByTestId('composer-send').click();
  await expect(page.getByTestId('chat-assistant-message')).toHaveCount(4);
  // 暂停跟随：视口留在用户上翻处
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeLessThan(100);
  const pill = page.getByTestId('scroll-to-latest');
  await expect(pill).toBeVisible();
  await pill.click();
  await expect(pill).toHaveCount(0);
  await expect.poll(async () => scroll.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 48)).toBe(true);
});
