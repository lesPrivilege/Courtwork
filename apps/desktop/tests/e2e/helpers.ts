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
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible()) {
    await welcomeDemo.click();
    const onboarding = page.getByTestId('provider-setup');
    if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
    await page.getByTestId('event-stream').waitFor();
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

/** 需要真实发送/model-config 的旧回归须先显式授权；冷启动本身保持安静。 */
export async function connectProvider(page: Page) {
  const trigger = page.getByTestId('composer-provider');
  if (await trigger.getAttribute('data-phase') === 'connected') return;
  await trigger.click();
  const dialog = page.getByTestId('provider-setup');
  await dialog.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
  await dialog.getByRole('button', { name: '验证连接' }).click();
  await dialog.waitFor({ state: 'hidden' });
}

/** RP-2.7：工作稿/整理等通用文件动作只保留在 Working folders 单一宿主。 */
export async function openWorkingFolders(page: Page) {
  const tree = page.getByTestId('working-folders-tree');
  if (await tree.isVisible().catch(() => false)) return;
  await page.getByTestId('module-working-folders-toggle').click();
  await tree.waitFor();
}
