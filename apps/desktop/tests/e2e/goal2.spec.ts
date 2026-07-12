import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/** GOAL-2 schema workspace 专项：批次三器件 + docs/36 回灌断言。 */

test.describe('GOAL-2 · #14 矩阵 hover 溯源预览', () => {
  test('单元格 hover 出全文与引语浮层；空锚格诚实注明未提及', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('view-matrix').click();
    await expect(page.getByTestId('matrix-panel')).toBeVisible();
    const firstCell = page.getByTestId('matrix-panel').locator('tbody td').first();
    await firstCell.locator('button').hover();
    const peek = firstCell.getByTestId('matrix-cell-peek');
    await expect(peek).toBeVisible();
    // 引语走 verified 双轨（mono + verifiedBg）或诚实"未提及"，二者必居其一
    const hasQuote = await peek.locator('q').count();
    const hasHonestEmpty = await peek.locator('em').count();
    expect(hasQuote + hasHonestEmpty).toBeGreaterThanOrEqual(1);
    await expect(peek.locator('small')).toContainText('置信');
    // 数据区静止：hover 不产生位移动画（浮层是显隐不是动效）
    await expect(firstCell.locator('button')).toHaveCSS('transform', 'none');
  });
});

test.describe('GOAL-2 · 零编码暴露律（docs/36 五节）', () => {
  test('时间线来源列显示可读文件名而非截断 wire 前缀', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('view-timeline').click();
    const source = page.getByTestId('timeline-panel').locator('.timeline-source').first();
    await expect(source).toBeVisible();
    const text = (await source.textContent()) ?? '';
    // 旧缺陷形态：fileId.slice(0,3) 产出如 "04-" 的三字符残片
    expect(text.length).toBeGreaterThan(3);
    expect(text.endsWith('.md')).toBe(false);
  });
});
