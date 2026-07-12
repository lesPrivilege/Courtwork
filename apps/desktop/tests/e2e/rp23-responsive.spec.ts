import { expect, test } from '@playwright/test';
import { openWorkbench, openModuleList } from './helpers';

for (const width of [1180, 1280, 1440, 1600]) {
  test(`RP-2.3 ${width}px：三栏比例闭合且无全局横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkbench(page);
    const overflow = await page.evaluate(() => ({
      root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
      body: [document.body.scrollWidth, document.body.clientWidth],
      workbench: [
        document.querySelector<HTMLElement>('[data-testid="workbench"]')?.scrollWidth ?? 0,
        document.querySelector<HTMLElement>('[data-testid="workbench"]')?.clientWidth ?? 0,
      ],
    }));
    for (const [scrollWidth, clientWidth] of Object.values(overflow)) expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-auto-left-collapsed', width < 1240 ? 'true' : 'false');

    const schemaFont = Number.parseFloat(await page.locator('.dense-row').first().evaluate((node) => getComputedStyle(node).fontSize));
    expect(schemaFont).toBeGreaterThanOrEqual(13);
    await openModuleList(page);
    await expect(page.locator('.rail-module-title').first()).toHaveCSS('white-space', 'nowrap');

    if (width === 1440) {
      // 文书阅读面在浏览器态（大纲→修订预览）
      await page.getByTestId('outline-revision').click();
      await expect(page.locator('.document-preview')).toHaveCSS('font-size', '15px');
      await expect(page.locator('.document-preview')).toHaveCSS('line-height', '24px');
    }
  });
}
