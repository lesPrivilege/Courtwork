import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * CONTRACT-REVIEW-SAFETY-1 验收第 8 条：完整 App e2e 证明「编辑取消仍 pending」「空/同值不可提交」
 * 「修正后确认与驳回并存时只输出已确认（含修正确认）项」，并覆盖第 2 条的「逐条填满但未点最终
 * 按钮仍不提交」——旧实现是最后一项一填即自动 resume，本票改为显式最终动作。
 *
 * 走 demo 案：真实 grant 案需宿主授权与真实材料，不在 e2e 内构造；本谱只锁**交互契约**
 * （何时可提交、何时不可、取消后回到什么态），production 的 command outcome 分流由
 * `contract-review-flow.test.ts` 的单测覆盖。此边界如实登记，不宣称本谱证明了 production 落盘。
 */

const ALL_RISKS = ['risk-01', 'risk-02', 'risk-03', 'risk-04', 'risk-05', 'risk-06'] as const;

function panelOf(page: Page) {
  return page.getByTestId('revision-panel');
}

/** 选中一项；高危/未核验条目须先展开依据才可确认，故按钮禁用时先展开。 */
async function select(page: Page, riskId: string) {
  const panel = panelOf(page);
  await panel.locator(`[data-risk-id="${riskId}"]`).click();
  return panel;
}

async function confirmItem(page: Page, riskId: string) {
  const panel = await select(page, riskId);
  const confirm = panel.getByRole('button', { name: '确认此项', exact: true });
  while (!(await confirm.isEnabled())) {
    await panel.getByRole('button', { name: /查看引语/ }).first().click();
  }
  await confirm.click();
}

async function rejectItem(page: Page, riskId: string) {
  const panel = await select(page, riskId);
  await panel.getByRole('button', { name: '驳回', exact: true }).click();
}

test('逐条处置填满后才启用最终提交；未点击时不进入已提交态', async ({ page }) => {
  await openWorkbench(page);
  const submit = page.getByTestId('submit-contract-review');
  await expect(submit).toBeDisabled();

  for (const riskId of ALL_RISKS.slice(0, ALL_RISKS.length - 1)) {
    await confirmItem(page, riskId);
    await expect(submit).toBeDisabled();
  }
  await confirmItem(page, ALL_RISKS[ALL_RISKS.length - 1]);

  // 填满只是让按钮可用——旧实现在此处会自动 resume，本票要求停在这里等显式动作。
  await expect(submit).toBeEnabled();
  await expect(panelOf(page).getByRole('status')).toHaveCount(0);

  await submit.click();
  await expect(panelOf(page).getByRole('status').first()).toBeVisible();
});

test('修正编辑取消后该项回到未处置：不得令全表「已处置」判据成立', async ({ page }) => {
  await openWorkbench(page);
  const submit = page.getByTestId('submit-contract-review');
  for (const riskId of ALL_RISKS.filter((id) => id !== 'risk-02')) await confirmItem(page, riskId);
  await expect(submit).toBeDisabled();

  const panel = await select(page, 'risk-02');
  await panel.getByTestId('begin-review-correction').click();
  await expect(panel.getByTestId('review-correction-editor')).toBeVisible();
  await panel.getByTestId('cancel-review-correction').click();

  await expect(panel.getByTestId('review-correction-editor')).toHaveCount(0);
  await expect(submit).toBeDisabled();
});

test('空修正与同值修正都不可提交；改出异值才放行', async ({ page }) => {
  await openWorkbench(page);
  const panel = await select(page, 'risk-02');
  const original = (await panel.locator('[data-risk-id="risk-02"]').innerText()).trim();

  await panel.getByTestId('begin-review-correction').click();
  const editor = panel.getByTestId('review-correction-editor');
  const textarea = editor.locator('textarea');
  const commit = panel.getByTestId('submit-review-correction');

  // 预填当前结论 → 同值，不可提交。
  await expect(commit).toBeDisabled();

  await textarea.fill('');
  await expect(commit).toBeDisabled();

  await textarea.fill('   ');
  await expect(commit).toBeDisabled();

  await textarea.fill(`${original} `);
  await expect(commit).toBeDisabled();

  await textarea.fill('管辖条款经复核后调整为双方所在地择一，且不排除法定专属管辖');
  await expect(commit).toBeEnabled();
});

test('修正确认与驳回并存：提交后修正文本落到该项，驳回项不被同批确认覆写', async ({ page }) => {
  await openWorkbench(page);
  const corrected = '管辖条款经复核后调整为双方所在地择一，且不排除法定专属管辖';

  const panel = await select(page, 'risk-02');
  await panel.getByTestId('begin-review-correction').click();
  await panel.getByTestId('review-correction-editor').locator('textarea').fill(corrected);
  await panel.getByTestId('submit-review-correction').click();

  await rejectItem(page, 'risk-03');
  for (const riskId of ['risk-01', 'risk-04', 'risk-05', 'risk-06']) await confirmItem(page, riskId);

  const submit = page.getByTestId('submit-contract-review');
  await expect(submit).toBeEnabled();
  await submit.click();

  // 修正确认项带着新结论，驳回项不因同批确认而翻面。
  await expect(panelOf(page).locator('[data-risk-id="risk-02"]')).toContainText(corrected);
  await expect(panelOf(page).locator('[data-risk-id="risk-03"] .signature-line')).toHaveAttribute('data-tone', 'neutral');
});
