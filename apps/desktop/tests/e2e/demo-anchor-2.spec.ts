import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

const OUT_DIR = '../../release/evidence/demo-anchor-2-2026-08-09';

/**
 * DEMO-ANCHOR-2 专用 e2e：样板案三面的「回到原件」由必落 `anchor_invalid` 转真实回跳。
 *
 * 只证**只有真跑才成立**的两件事：
 * ① 三面上那句引语，点回到原件后确实在样板案卷宗里被按坐标高亮，且**恰一处**——
 *    坐标算法与路由 fail-closed 判据由 `demo/legal-interaction.test.ts` 逐枚穷举（137 枚），
 *    本谱只证从面到阅读面这一条真实链路走得通；
 * ② 两枚 statute 指定展品（`DEMO-ANCHOR-1` 刻意保留的诚实降级面）仍显式阻断，
 *    但样板案路径上的下一步不再是「重新运行产出它的场景」——样板案没有那次运行可重跑。
 *
 * 断言一律取面上现读的引语，不在本谱里抄卷宗原句（语料墙）。
 */

/**
 * 面上引语 ≡ 阅读面高亮：两端都从真跑里读，不给字面量留座位。
 * 引语必须在点击**之前**取——阅读面开面即占住预览格，面上那句随之退场。
 */
async function expectSingleFocus(page: Page, expected: string) {
  expect(expected.length).toBeGreaterThan(2);
  await expect(page.getByTestId('reader-pane')).toBeVisible();
  const mark = page.getByTestId('reader-focus-anchor');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveText(expected);
}

test('样板案时间线：回到原件按坐标打开卷宗并恰一处高亮', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-timeline').click();
  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline).toBeVisible();

  const quote = timeline.locator('.evidence-body q');
  if (!(await quote.isVisible().catch(() => false))) {
    await timeline.getByRole('button', { name: /查看引语/ }).click();
  }
  await expect(quote).toBeVisible();

  const goto = page.getByTestId('timeline-goto-source');
  await expect(goto).toBeEnabled();
  const expected = (await quote.innerText()).trim();
  await goto.click();

  await expectSingleFocus(page, expected);
  // 阻断文案缺席即真开了面（不是拿显式反馈冒充成功）。
  await expect(page.getByTestId('system-open-feedback')).toHaveCount(0);
  await page.screenshot({ path: `${OUT_DIR}/01-demo-timeline-goto-source.png` });
});

test('样板案关系图谱：关系依据回到原件按坐标高亮', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  await page.getByTestId('view-graph').click();
  const graph = page.getByTestId('graph-panel');
  await expect(graph).toBeVisible();
  await expect(graph).toHaveAttribute('data-layout-ready', 'true');

  // 关系列表先列主体后列关系，故末枚按钮必是一条边——选边才出「关系依据」。
  await page.locator('.relation-list button').last().click();
  await expect(page.getByTestId('graph-source-kind')).toHaveText('关系依据');
  const quote = page.locator('.relation-evidence q');
  await expect(quote).toBeVisible();
  const expected = (await quote.innerText()).trim();

  const goto = page.getByTestId('graph-goto-source');
  await expect(goto).toBeEnabled();
  await goto.click();

  await expectSingleFocus(page, expected);
  await page.screenshot({ path: `${OUT_DIR}/02-demo-graph-goto-source.png` });
});

test('样板案矩阵审阅：格内引语回到变体合同并恰一处高亮', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-matrix').click();
  const matrix = page.getByTestId('matrix-panel');
  await expect(matrix).toBeVisible();

  await page.locator('.matrix-wrap td .cell-peek-anchor > button').first().click();
  const peek = page.getByTestId('matrix-cell-peek-v01-q1');
  const quote = peek.locator('q');
  await expect(quote).toBeVisible();
  const expected = (await quote.innerText()).trim();
  await peek.getByRole('button', { name: '回到原件', exact: true }).click();

  await expectSingleFocus(page, expected);
  await page.screenshot({ path: `${OUT_DIR}/03-demo-matrix-goto-source.png` });
});

test('statute 指定展品仍显式阻断，但样板案路径不再指路重跑不存在的场景', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  const panel = page.getByTestId('revision-panel');
  await panel.locator('[data-risk-id="risk-02"]').click();
  // 展品住 basis[0]（statute 文本结构性不可锚于合同），故取首枚依据展开。
  await panel.getByRole('button', { name: /查看引语/ }).first().click();
  const goto = panel.getByTestId('goto-source').first();
  await expect(goto).toBeEnabled();
  await goto.click();

  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText('样板案');
  await expect(feedback).not.toContainText('重新运行');
  // 阻断即不开面——绝不拿空白阅读面冒充回跳。
  await expect(page.getByTestId('reader-focus-anchor')).toHaveCount(0);
  await page.screenshot({ path: `${OUT_DIR}/04-demo-exhibit-honest-copy.png` });
});
