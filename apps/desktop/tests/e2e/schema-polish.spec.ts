import { expect, test } from '@playwright/test';
import { openWorkbench, tokenColor } from './helpers';

async function openUtilityModule(page: Parameters<typeof openWorkbench>[0], id: 'progress' | 'context') {
  const back = page.getByTestId('preview-back');
  if (await back.isVisible()) await back.click();
  const module = page.getByTestId(`module-${id}`);
  if ((await module.getAttribute('data-open')) !== 'true') await page.getByTestId(`module-${id}-toggle`).click();
  return module;
}

test('schema preview exposes a self-contained tab-to-panel relation', async ({ page }) => {
  await openWorkbench(page);

  const host = page.getByTestId('preview-host');
  await expect(host).toHaveAttribute('data-schema-self-contained', 'true');

  const activeTab = page.getByRole('tablist', { name: '结构化工作面' }).getByRole('tab', { selected: true });
  const panelId = await activeTab.getAttribute('aria-controls');
  const tabId = await activeTab.getAttribute('id');
  expect(panelId).toBeTruthy();
  expect(tabId).toBeTruthy();

  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute('aria-labelledby', tabId ?? '');
});

test('schema rejection feedback keeps the neutral disposition tone', async ({ page }) => {
  await openWorkbench(page);

  const panel = page.getByTestId('revision-panel');
  const risk = panel.locator('[data-risk-id="risk-04"]');
  await risk.click();
  await panel.getByRole('button', { name: '驳回', exact: true }).click();

  const flash = risk.getByTestId('settle-flash-risk-04');
  await expect(flash).toHaveAttribute('data-kind', 'rejected');
  // 断的是绑定关系：rejected 处置取中性板岩（驳回是处置不是错误），非某一版皮层的字面值。
  await expect
    .poll(async () =>
      flash.evaluate((element) => {
        const settle = getComputedStyle(element).getPropertyValue('--settle-color').trim();
        const slate = getComputedStyle(document.documentElement).getPropertyValue('--slate-graphic').trim();
        return settle.toLowerCase() === slate.toLowerCase();
      }),
    )
    .toBe(true);
});

test('continuation belongs to Context usage and uses ink instead of risk red', async ({ page }) => {
  await openWorkbench(page);

  const progress = await openUtilityModule(page, 'progress');
  await expect(progress.getByTestId('continuation-button')).toHaveCount(0);

  const context = await openUtilityModule(page, 'context');
  const continuation = context.getByTestId('continuation-button');
  await expect(continuation).toHaveText('Continue this case');
  await expect(continuation).toHaveCSS('background-color', await tokenColor(page, '--text-primary'));
  await continuation.click();
  await expect(continuation).toBeDisabled();
  await expect(continuation).toHaveText('Next phase opened');
});

test('matrix names questions from schema text and exposes full evidence to keyboard users', async ({ page }) => {
  await openWorkbench(page);
  await page.getByRole('tab', { name: '矩阵审阅' }).click();

  const q1 = page.getByTestId('matrix-question-q1');
  await expect(q1.locator('> span').first()).toHaveText('Q1 · 违约金');
  await q1.focus();
  await expect(q1).toBeFocused();
  await expect(page.getByTestId('matrix-question-tooltip-q1')).toBeVisible();
  await expect(page.getByTestId('matrix-question-tooltip-q1')).toHaveText('违约金比例（买方逾期付款）是多少？');

  const source = page.getByTestId('matrix-source-v01-q1');
  await source.focus();
  await page.keyboard.press('Enter');
  await expect(source).toHaveAttribute('aria-expanded', 'true');
  const peek = page.getByTestId('matrix-cell-peek-v01-q1');
  await expect(peek).toBeVisible();
  await expect(peek.locator('q')).toHaveText('每逾期一日应按未付金额的0.05%');
  const peekGeometry = await peek.evaluate((element) => {
    const preview = element.closest('[data-testid="preview-host"]');
    if (!preview) throw new Error('matrix evidence must remain inside preview host');
    const peekRect = element.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    return { peekTop: peekRect.top, previewTop: previewRect.top };
  });
  expect(peekGeometry.peekTop).toBeGreaterThanOrEqual(peekGeometry.previewTop);
  await expect(peek.locator('q')).toHaveCSS('white-space', 'normal');
  await expect(peek.getByRole('button', { name: '回到原件 · 尚未接通' })).toBeDisabled();
});

test('risk rows and detail state severity, verification, disposition, and next step', async ({ page }) => {
  await openWorkbench(page);
  const panel = page.getByTestId('revision-panel');

  // CONFIRM-GRANULARITY-1：批量确认入口 feature-off，批量范围状态栏整体不渲染。
  await expect(panel.getByTestId('batch-scope')).toHaveCount(0);

  const highRisk = panel.locator('[data-risk-id="risk-01"]');
  await expect(highRisk).toContainText('高危');
  await expect(highRisk).toContainText('已核验');
  await expect(highRisk).toContainText('待确认');
  await expect(highRisk).toContainText('展开依据');

  const unverified = panel.locator('[data-risk-id="risk-03"]');
  await expect(unverified).toContainText('未核验');

  await highRisk.click();
  const status = panel.getByTestId('risk-detail-status');
  await expect(status).toContainText('严重度高危');
  await expect(status).toContainText('核验已核验');
  await expect(status).toContainText('处置待确认');
  await expect(status).toContainText('下一步展开依据');

  const quoteToggle = panel.getByRole('button', { name: /查看引语 · 《中华人民共和国民法典》第五百八十五条/ });
  await quoteToggle.focus();
  await page.keyboard.press('Enter');
  const quote = panel.getByTestId('risk-quote-risk-01-0');
  await expect(quote).toHaveText('乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金');
  await expect(quote).toHaveCSS('white-space', 'normal');
  await expect(panel.getByRole('button', { name: '回到原件 · 尚未接通' })).toBeDisabled();
});

test('schema evidence remains inside the 1180 viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 800 });
  await openWorkbench(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole('tab', { name: '矩阵审阅' }).click();
  const q1 = page.getByTestId('matrix-question-q1');
  await q1.focus();
  await expect(page.getByTestId('matrix-question-tooltip-q1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
