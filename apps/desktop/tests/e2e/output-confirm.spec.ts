import { expect, test } from '@playwright/test';
import { disposeAllDemoRisks, openWorkbench } from './helpers';

// —— OUTPUT-CONFIRM-UI-1：审阅→docx 的产品侧确认（OUTPUT-CORRECTNESS #6） ——
// 合成合同里 risk-02/risk-06 的法条依据未能定位到正文，落盘门禁不再是一句可见报错：
// 逐条显式展示（typed outcome + 原因）→ 逐项确认 → 重编译落盘；取消则不产出。

test('未落点修订逐条显式确认后才生成产物（含原因，零技术概念暴露）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  await page.getByTestId('revision-panel').waitFor();
  await expect(page.getByTestId('output-docx-card')).toHaveCount(0);

  await disposeAllDemoRisks(page);

  // 确认全部风险后，未落点项逐条挂出——不静默阻断、也不静默交付
  const nonApplied = page.getByTestId('nonapplied-confirm');
  await nonApplied.waitFor();
  await expect(nonApplied.getByTestId('nonapplied-item')).toHaveCount(2);
  await expect(nonApplied).toContainText('有 2 处修订未能落到文书上');
  await expect(nonApplied).toContainText('未能在文书中找到对应原文');

  // 零技术概念暴露（principles §9）：不出现工程词
  const shown = (await nonApplied.textContent()) ?? '';
  for (const banned of ['instruction', 'locator', 'schema', 'JSON', 'prompt', 'instr-risk', 'locator_not_found']) {
    expect(shown).not.toContain(banned);
  }

  // 未逐条确认满前不产出任何 docx
  await expect(page.getByTestId('output-docx-card')).toHaveCount(0);

  // 逐条确认（针对性确认，非笼统全批）
  const confirmButtons = nonApplied.getByTestId('confirm-nonapplied');
  await confirmButtons.nth(0).click();
  await expect(nonApplied).toContainText('已确认 1/2');
  await expect(page.getByTestId('output-docx-card')).toHaveCount(0);
  await confirmButtons.nth(1).click();

  // 全部确认 → 重编译落盘 → 产物出现
  await expect(page.getByTestId('output-docx-card')).toBeVisible();
  await expect(page.getByTestId('nonapplied-confirm')).toHaveCount(0);
});

test('取消未落点确认则不生成产物（留人确认：不可逆动作永不自动触发）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  await page.getByTestId('revision-panel').waitFor();

  await disposeAllDemoRisks(page);

  const nonApplied = page.getByTestId('nonapplied-confirm');
  await nonApplied.waitFor();
  // 先确认一条：仍不足以落盘（覆盖不全，门禁继续阻断）
  await nonApplied.getByTestId('confirm-nonapplied').first().click();
  await expect(page.getByTestId('output-docx-card')).toHaveCount(0);

  // 取消：确认区消失，产物不生成
  await nonApplied.getByTestId('cancel-nonapplied').click();
  await expect(nonApplied).toHaveCount(0);
  await expect(page.getByTestId('output-docx-card')).toHaveCount(0);
});
