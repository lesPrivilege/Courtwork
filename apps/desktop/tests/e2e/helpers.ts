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

/** LAUNCH-FIX：走完 S3 六项门禁，等待真实 output 写入桥回报产物存在。 */
export async function confirmDemoReview(page: Page) {
  const panel = page.getByTestId('revision-panel');
  await panel.getByRole('button', { name: '批量确认 4 项' }).click();
  await panel.locator('[data-risk-id="risk-03"]').click();
  await panel.getByRole('button', { name: /展开原文/ }).click();
  await panel.getByRole('button', { name: '确认', exact: true }).click();
  await panel.locator('[data-risk-id="risk-01"]').click();
  await panel.getByRole('button', { name: /展开原文/ }).click();
  await panel.getByRole('button', { name: '确认', exact: true }).click();
  await page.getByTestId('output-docx-card').waitFor();
}

/** 十四章：从浏览器态返回四模块列（模块级断言前调用）。 */
export async function openModuleList(page: Page) {
  const back = page.getByTestId('preview-back');
  if (await back.isVisible()) await back.click();
  await page.getByTestId('utility-rail').waitFor();
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
  // 2026-07-12 connect 路由：非首启一律 Settings 内嵌凭证面（首启引导卡另测于 rp29/goal1）
  await trigger.click();
  const embed = page.getByTestId('settings-credential-embed');
  await embed.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
  await embed.getByTestId('settings-credential-validate').click();
  await page.getByTestId('settings-credential-verified').waitFor();
  await page.keyboard.press('Escape');
  await page.getByTestId('settings-page').waitFor({ state: 'hidden' });
}

/** RP-2.7：工作稿/整理等通用文件动作只保留在 Working folders 单一宿主。 */
export async function openWorkingFolders(page: Page) {
  const tree = page.getByTestId('working-folders-tree');
  if (await tree.isVisible().catch(() => false)) return;
  await openModuleList(page);
  await page.getByTestId('module-working-folders-toggle').click();
  await tree.waitFor();
}
