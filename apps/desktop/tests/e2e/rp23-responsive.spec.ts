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
      // SKIN-B2-1：文书轨带墨量补偿（16px/1.75），字号不再等于功能轨 reading 档。
      // 承 SKIN-B1 判例改断关系不断值——断言它走的是文书轨档位，档位值改了这里不必跟着改。
      await page.getByTestId('outline-revision').click();
      const doc = page.locator('.document-preview');
      const track = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return {
          size: s.getPropertyValue('--type-document-size').trim(),
          ratio: Number.parseFloat(s.getPropertyValue('--type-document-line-height')),
        };
      });
      await expect(doc).toHaveCSS('font-size', track.size);
      const lh = await doc.evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
      const fs = await doc.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
      expect(lh / fs).toBeCloseTo(track.ratio, 2);
    }
  });
}
