import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/** 批次七 Button 全量核验修复批的守护测试（探针实证七缺陷，此处锁其中五个可确定性复现项）。 */

test('#1/#2 composer + 菜单：真实可见（不被裁剪）且 Esc 收敛', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('composer-plus').click();
  const menu = page.getByTestId('composer-plus-menu');
  await expect(menu).toBeVisible();
  // 裁剪回归锁：菜单几何中心的命中测试必须落在菜单自身（overflow:hidden 裁剪时落到背景）
  const hitSelf = await menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return element.contains(hit);
  });
  expect(hitSelf).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

test('#2 Choose case 下拉：点外部收敛', async ({ page }) => {
  // Choose case chip 只在未绑容器面（欢迎态 composer）存在——不进样板案
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  await page.getByTestId('composer-case').click();
  await expect(page.getByTestId('composer-case-menu')).toBeVisible();
  await page.mouse.click(400, 200);
  await expect(page.getByTestId('composer-case-menu')).toHaveCount(0);
});

test('#3 未连接时点 Send：引导层拦截但草稿保留', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('segment-chat').click();
  const input = page.getByTestId('composer-input');
  await input.fill('这段草稿不许被吞');
  await page.getByTestId('composer-send').click();
  // 引导面出现（首启走引导卡或设置内嵌,两形态任一）
  await expect(page.getByTestId('provider-setup').or(page.getByTestId('settings-page'))).toBeVisible();
  await expect(input).toHaveValue('这段草稿不许被吞');
});

test('#4 Focus 态不再暴露收敛钮（组合白屏根除）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('focus-toggle').click();
  await expect(page.getByTestId('collapse-right-rail')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('collapse-right-rail')).toHaveCount(1);
});

test('#7 Ran command 行：展开后可收起（双向折叠）', async ({ page }) => {
  await openWorkbench(page);
  const row = page.getByTestId('tool-call-row').first();
  await row.locator('summary').click();
  await expect(page.getByTestId('tool-call-details').first()).toBeVisible();
  await row.locator('summary').click();
  await expect(page.getByTestId('tool-call-details')).toHaveCount(0);
});
