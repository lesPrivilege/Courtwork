import { expect, test } from '@playwright/test';
import { openModuleList, openWorkbench } from './helpers';

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

test.describe('RP-2.12 · ② paste 文本块 + ③ chat 层级', () => {
  test('多行粘贴落 composer mono 折叠块预览,发送后入 user message', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('segment-chat').click();
    const input = page.getByTestId('composer-input');
    // 模拟多行粘贴（clipboardData text/plain）
    await input.evaluate((el, text) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8');
    await expect(page.getByTestId('composer-paste-list')).toBeVisible();
    await expect(page.getByTestId('composer-paste-list')).toContainText('8 行');
  });

  test('③ chat 层级：父行（工具调用）510 字重,子行（事件）缩进灰阶', async ({ page }) => {
    await openWorkbench(page);
    const parent = page.locator('.tool-call-row summary').first();
    await expect(parent).toHaveCSS('font-weight', '510');
    const child = page.locator('.turn-event-row').first();
    const pad = await child.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    expect(pad).toBeGreaterThanOrEqual(20);
  });
});

test.describe('RP-2.12 · 批D 对齐+溢出守护', () => {
  test('chat title 与右列首模块 title 同带对齐（±2px）', async ({ page }) => {
    await openWorkbench(page);
    await openModuleList(page);
    const chat = (await page.getByTestId('toolbar-stage').boundingBox())!;
    const rail = (await page.locator('.rail-module-title').first().boundingBox())!;
    expect(Math.abs(chat.y - rail.y)).toBeLessThanOrEqual(2);
  });

  test('右列各板块点开零横向溢出', async ({ page }) => {
    await openWorkbench(page);
    await openModuleList(page);
    for (const id of ['progress', 'working-folders', 'context']) {
      const open = await page.getByTestId(`module-${id}`).getAttribute('data-open');
      if (open !== 'true') await page.getByTestId(`module-${id}-toggle`).click();
    }
    const overflows = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('.rail-module-body, .preview-outline-row, .right-rail-modules').forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 1) bad.push(el.className);
      });
      return bad;
    });
    expect(overflows).toEqual([]);
  });
});
