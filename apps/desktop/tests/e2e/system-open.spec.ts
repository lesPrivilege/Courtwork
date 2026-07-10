import { expect, test, type Page } from '@playwright/test';

async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
}

test('状态条打开产出文件夹显示访达反馈', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('open-output-folder').click();
  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveText('已在访达中显示');
});

test('产出 docx 卡片可在访达中显示并打开文件', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  const card = page.getByTestId('output-docx-card');
  await expect(card).toBeVisible();
  await card.getByTestId('reveal-output-docx').click();
  await expect(page.getByTestId('system-open-feedback')).toHaveText('已在访达中显示');
  await card.getByTestId('open-output-docx').click();
  await expect(page.getByTestId('system-open-feedback')).toHaveText('已为您打开〔合同审查报告.docx〕');
});

test('新建工作稿进入编辑面且自动保存', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('open-work-drafts').click();
  await expect(page.getByTestId('work-draft-panel')).toBeVisible();
  await page.getByTestId('new-work-draft').click();
  await expect(page.getByTestId('work-draft-editor')).toBeVisible();
  await expect(page.getByTestId('work-draft-list').locator('button')).toHaveCount(1);
  const editor = page.getByTestId('work-draft-editor');
  await editor.locator('p').first().click();
  await page.keyboard.type('核对验收异议期限');
  await editor.blur();
  await expect(editor).toContainText('核对验收异议期限');
});

test('卷宗原件区只读：无 contentEditable、无编辑入口', async ({ page }) => {
  await openWorkbench(page);
  const zone = page.getByTestId('originals-zone');
  await expect(zone).toBeVisible();
  await expect(zone).toHaveAttribute('data-readonly', 'true');
  await expect(zone.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(zone.getByRole('button', { name: /编辑|保存|修改/ })).toHaveCount(0);
  const items = zone.getByTestId('original-item');
  expect(await items.count()).toBeGreaterThan(0);
  await expect(items.first()).toHaveAttribute('data-readonly', 'true');
  await expect(zone.getByText('只读').first()).toBeVisible();
  // 仅允许打开（查看），打开后反馈含文件名
  await zone.getByTestId('original-open').first().click();
  await expect(page.getByTestId('system-open-feedback')).toContainText('已为您打开');
});
