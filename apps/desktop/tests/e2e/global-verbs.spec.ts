import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

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
    expect(clipboardText).toContain('发现 6 项合同风险');
    expect(clipboardText.startsWith('R')).toBe(true);
  });

  test('系统事件合并为紧凑事件流且不再生成 callout 卡', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('event-stream')).toContainText('合同审查已完成');
    await expect(page.getByTestId('event-stream')).toContainText('审阅提示已送达右侧工作面');
    await expect(page.locator('.generated-callout')).toHaveCount(0);
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

test.describe('归档案件', () => {
  test('popover 轻确认归档并可逆', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.case-card').first();
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await expect(page.locator('.archive-popover')).toBeVisible();
    await page.locator('.archive-popover').getByRole('button', { name: '归档', exact: true }).click();
    await expect(card).toHaveClass(/archived/);
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await page.locator('.archive-popover').getByRole('button', { name: '取消归档', exact: true }).click();
    await expect(card).not.toHaveClass(/archived/);
  });

  test('取消不改变归档状态', async ({ page }) => {
    await openWorkbench(page);
    const card = page.locator('.case-card').first();
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    await page.locator('.archive-popover').getByRole('button', { name: '取消', exact: true }).click();
    await expect(page.locator('.archive-popover')).toHaveCount(0);
    await expect(card).not.toHaveClass(/archived/);
  });

  test('案件卡片无删除入口', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /删除案件/ })).toHaveCount(0);
  });
});

test.describe('专注模式', () => {
  test('进入后左中栏隐藏、右栏独占且 0ms 硬切', async ({ page }) => {
    await openWorkbench(page);
    const workspace = page.getByTestId('workspace');
    await expect(workspace).toHaveCSS('transition-duration', '0s');
    await page.getByTestId('focus-toggle').click();
    await expect(workspace).toHaveAttribute('data-focus-mode', 'true');
    await expect(page.locator('.case-rail')).toHaveCount(0);
    await expect(page.locator('.conversation')).toHaveCount(0);
    await expect(page.locator('.right-workbench')).toBeVisible();
  });

  test('Esc 退出专注模式恢复三栏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('focus-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'false');
    await expect(page.locator('.case-rail')).toBeVisible();
    await expect(page.locator('.conversation')).toBeVisible();
  });

  test('专注态按钮显示 Esc 提示且对照控件隐藏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('focus-toggle').click();
    await expect(page.getByTestId('focus-toggle')).toContainText('Esc');
    await expect(page.getByTestId('split-start')).toHaveCount(0);
  });

  test('对照态进入专注模式会重置为单栏', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('split-start').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'true');
    await page.getByTestId('focus-toggle').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-comparing', 'false');
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'true');
  });
});

test.describe('命令面板', () => {
  test('⌘K 打开命令面板，Esc 关闭', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await page.keyboard.press('Meta+K');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
  });

  test('模糊匹配过滤场景与操作', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    const input = page.getByRole('textbox', { name: '搜索场景、案件或操作' });
    await input.fill('专注');
    await expect(page.getByRole('option', { name: /进入专注模式/ })).toBeVisible();
    await expect(page.getByRole('option', { name: '整理卷宗' })).toHaveCount(0);
  });

  test('选择场景条目触发对应场景并关闭面板', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '审查合同' }).click();
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(page.getByTestId('flow-s3')).toHaveClass(/selected/);
  });

  test('⌘K 触发新建案件对话框', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '新建案件' }).click();
    await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  });

  test('⌘K 触发专注模式并可再次通过面板退出', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '进入专注模式' }).click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'true');
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '退出专注模式' }).click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-focus-mode', 'false');
  });

  test('⌘K 打开产出文件夹显示访达反馈', async ({ page }) => {
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '打开产出文件夹' }).click();
    await expect(page.getByTestId('system-open-feedback')).toHaveText('已在访达中显示');
  });

  test('方向键在结果间移动高亮', async ({ page }) => {
    // openWorkbench helpers 已 mouse.move(0,0)，消除 onMouseEnter 抢高亮（D-1 0b）
    await openWorkbench(page);
    await page.keyboard.press('Meta+K');
    const first = page.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');
  });

  test('案件切换命令列出新建案件并可选中', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('new-case-open').click();
    const dialog = page.getByTestId('new-case-dialog');
    await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
    await dialog.getByRole('textbox', { name: '案件名称' }).fill('周七诉吴八借款纠纷');
    await dialog.getByRole('button', { name: '创建案件' }).click();
    await page.keyboard.press('Meta+K');
    await page.getByRole('option', { name: '临江精铸', exact: false }).click();
    await expect(page.locator('.case-card.selected')).toContainText('临江精铸');
  });
});
