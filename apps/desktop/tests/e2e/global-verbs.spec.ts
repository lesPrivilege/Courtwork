import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test.describe('新建案件', () => {
  test('左栏入口创建案件并自动进入，工作面显示空态', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    const nameInput = dialog.getByRole('textbox', { name: '案件名称' });
    await nameInput.fill('张三诉李四买卖合同纠纷');
    await dialog.getByRole('button', { name: '创建案件' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.case-card.selected')).toContainText('张三诉李四买卖合同纠纷');
    await expect(page.locator('.right-workbench .empty-state')).toBeVisible();
    await expect(page.locator('.right-workbench')).not.toContainText('47 件');
  });

  test('文件夹选择派生案件名称建议', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    const caseFolder = join(mkdtempSync(join(tmpdir(), 'courtwork-')), '王五诉赵六侵权纠纷');
    mkdirSync(caseFolder);
    writeFileSync(join(caseFolder, '合同.pdf'), 'demo');
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(caseFolder);
    await expect(dialog.getByRole('textbox', { name: '案件名称' })).toHaveValue(/王五诉赵六侵权纠纷/);
  });

  test('取消关闭对话框且不新增案件', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.case-card')).toHaveCount(1);
  });
});
