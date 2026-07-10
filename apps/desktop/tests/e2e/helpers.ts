import type { Page } from '@playwright/test';

/**
 * 打开工作台并移开光标。
 * D-1 验收根因：openWorkbench 点「先查看演示」后光标停在面板中心，
 * 后续打开的浮层（命令面板等）若带 onMouseEnter 高亮，会抢占初始选中态。
 * 凡依赖键盘导航 / 初始 aria-selected 的用例，必须先 mouse.move(0,0)。
 */
export async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) {
    await setup.getByRole('button', { name: '先查看演示' }).click();
  }
  // 加固：点击后光标可能仍悬在中心区域
  await page.mouse.move(0, 0);
}

export async function createNamedCase(page: Page, name: string) {
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill(name);
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' }).catch(() => undefined);
}
