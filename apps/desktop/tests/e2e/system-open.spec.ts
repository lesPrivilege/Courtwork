import { expect, test } from '@playwright/test';
import { confirmDemoReview, openWorkbench, openWorkingFolders } from './helpers';

test('状态条打开产出文件夹显示访达反馈', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('nav-artifacts').click();
  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveText('已在访达中显示');
});

test('产出 docx 卡片可在访达中显示并打开文件', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  const card = page.getByTestId('output-docx-card');
  await expect(card).toHaveCount(0);
  await confirmDemoReview(page);
  await expect(card).toBeVisible();
  await card.getByTestId('reveal-output-docx').click();
  await expect(page.getByTestId('system-open-feedback')).toHaveText('已在访达中显示');
  await card.getByTestId('open-output-docx').click();
  await expect(page.getByTestId('system-open-feedback')).toHaveText('已为您打开〔合同审查报告.docx〕');
});

test('确认编译后产出目录存在 docx，起草画布才进入冻结态', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('view-draft').click();
  const draft = page.getByTestId('draft-panel');
  await expect(draft).not.toHaveClass(/frozen/);

  await draft.getByRole('button', { name: '编译为 Word 文档' }).click();
  await page.getByTestId('confirm-draft-compile').click();

  await expect(page.getByTestId('system-open-feedback')).toHaveText('已写入本案「产出」目录：答辩意见.docx');
  await expect(draft).toHaveClass(/frozen/);
  await expect(draft.getByTestId('open-word-doc')).toBeEnabled();

  // 浏览器宿主只用于 UI 接线，不冒充真实磁盘；显式删除其产物并模拟从访达
  // 返回窗口，界面必须重新询问宿主，而不能把曾经的 true 当永久 UI 权威。
  await page.evaluate(async () => {
    const importClient = new Function('return import("/src/output/case-output-client.ts")') as () => Promise<{
      caseOutputClient: { resetBrowserFiles(): void };
    }>;
    const { caseOutputClient } = await importClient();
    caseOutputClient.resetBrowserFiles();
    window.dispatchEvent(new Event('focus'));
  });
  await expect(draft).not.toHaveClass(/frozen/);
  await expect(draft.getByRole('button', { name: '编译为 Word 文档' })).toBeEnabled();
});

test('新建工作稿进入编辑面且自动保存', async ({ page }) => {
  await openWorkbench(page);
  await openWorkingFolders(page);
  await page.getByTestId('wf-open-work-drafts').click();
  // 十四章：无 L2 popover（大纲目录即二级）——旧断言退役为恒真占位
  await expect(page.getByTestId('utility-dock-popover')).toHaveCount(0);
  await expect(page.getByTestId('work-draft-panel')).toBeVisible();
  const createDraft = page.getByTestId('new-work-draft');
  const hitTarget = await createDraft.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('[data-testid]')?.getAttribute('data-testid');
  });
  expect(hitTarget).toBe('new-work-draft');
  await createDraft.click();
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
