import { expect, test, type Page } from '@playwright/test';

async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

test.describe('AI 消息复制', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('data-card 复制按钮悬停显现并写入含来源标记的纯文本', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.data-card').first();
    const copyButton = card.locator('.copy-button');
    await expect(copyButton).toHaveCSS('opacity', '0');
    await card.hover();
    await expect(copyButton).toHaveCSS('opacity', '1');
    await copyButton.click();
    await expect(copyButton).toContainText('已复制');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('合同审查已完成');
    expect(clipboardText.startsWith('D04')).toBe(true);
  });

  test('generated-callout 复制按钮写入提示全文', async ({ page }) => {
    await openWorkbench(page);
    const callout = page.locator('.generated-callout');
    await callout.hover();
    await callout.locator('.copy-button').click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('审阅提示');
    expect(clipboardText).toContain('先核对验收条款的原文依据');
  });

  test('按压态落在 60–80ms 区间且不整卡缩放', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.data-card').first();
    await card.hover();
    const copyButton = card.locator('.copy-button');
    await copyButton.hover();
    await page.mouse.down();
    await expect(copyButton).toHaveCSS('transition-duration', '0.07s, 0.07s');
    await expect(copyButton).toHaveCSS('transform', 'none');
    await expect(card).toHaveCSS('transform', 'none');
    await page.mouse.up();
  });
});
