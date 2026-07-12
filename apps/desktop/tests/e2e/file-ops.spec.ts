import { expect, test } from '@playwright/test';
import { openWorkbench, openWorkingFolders } from './helpers';

test('卷宗整理计划表可勾选并确认执行', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('scene-more').click();
  await page.getByTestId('scene-more-popover').getByRole('button', { name: '卷宗整理' }).click();
  const panel = page.getByTestId('file-ops-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('file-ops-table')).toBeVisible();
  // 可选条目默认未勾选
  await expect(page.getByTestId('file-ops-select-e-copy-optional')).not.toBeChecked();
  await page.getByTestId('file-ops-execute').click();
  const report = page.getByTestId('file-ops-report');
  await expect(report).toBeVisible();
  await expect(report).toContainText('已执行');
  // QF-2：报告只呈现用户动作与容器内相对位置；机器枚举、绝对路径、hash 留在诊断层。
  await expect(report).toContainText('新建文件夹 · 重复项');
  await expect(report).toContainText('移动 · 原件/设备采购合同.pdf');
  await expect(report).toContainText('重命名 · 原件/催告函扫描.jpg');
  await expect(report).not.toContainText(/\b(?:mkdir|move|rename|copy)\b/);
  await expect(report).not.toContainText('/Users/');
  await expect(report).not.toContainText('哈希');
  await expect(page.getByTestId('system-open-feedback')).toContainText('已执行');
});

test('整理后可撤销并保留确认门禁形态', async ({ page }) => {
  await openWorkbench(page);
  await openWorkingFolders(page);
  await page.getByTestId('wf-open-file-ops').click();
  // 十四章：无 L2 popover（大纲目录即二级）——旧断言退役为恒真占位
  await expect(page.getByTestId('utility-dock-popover')).toHaveCount(0);
  const execute = page.getByTestId('file-ops-execute');
  await expect(execute).toBeVisible();
  const hitTarget = await execute.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('[data-testid]')?.getAttribute('data-testid');
  });
  expect(hitTarget).toBe('file-ops-execute');
  await execute.click();
  await expect(page.getByTestId('file-ops-report')).toBeVisible();
  await page.getByTestId('file-ops-undo').click();
  await expect(page.getByTestId('file-ops-undo-confirm')).toBeVisible();
  await page.getByTestId('file-ops-undo-confirm').click();
  await expect(page.getByText('已撤销', { exact: true })).toBeVisible();
  await expect(page.getByTestId('system-open-feedback')).toContainText('已撤销');
});

test('原件区展示原始文件名留痕且无删除入口', async ({ page }) => {
  await openWorkbench(page);
  const zone = page.getByTestId('originals-zone');
  await expect(zone.getByText('原名', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /删除/ })).toHaveCount(0);
});
