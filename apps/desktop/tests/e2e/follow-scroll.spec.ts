import { expect, test, type Page } from '@playwright/test';
import { connectProvider, installChatStream, openWorkbench } from './helpers';

/**
 * 批次七首例登记缺陷（FABLE-BASE）：chat 新消息不自动滚底。
 * 三件套契约：钉底跟随 / 用户上翻暂停跟随 / 暂停期间新消息出浮标、点击回底。
 */

// 本组测滚动跟随；reduced-motion 下滚动回底必须使用 auto。
test.use({ reducedMotion: 'reduce' });

const LONG_REPLY = '这是用于滚动验证的长段落，内容足够多以便撑高容器。'.repeat(30);

async function primeChatWithOverflow(page: Page) {
  await openWorkbench(page);
  await connectProvider(page);
  await page.getByTestId('segment-chat').click();
  await installChatStream(page, { content: LONG_REPLY });
  const prompts = ['滚动一', '滚动二', '滚动三'];
  for (const [index, prompt] of prompts.entries()) {
    await page.getByTestId('composer-input').fill(prompt);
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-assistant-message')).toHaveCount(index + 1);
    await expect(page.getByTestId('chat-assistant-message').nth(index)).toHaveAttribute('data-status', 'completed');
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
