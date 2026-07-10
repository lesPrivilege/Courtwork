import { expect, test } from '@playwright/test';

test('完整工作台帧与三栏在 1440 视口可见', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('workbench')).toBeVisible();
  await expect(page.getByRole('heading', { name: '案件', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '对话', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '结构化工作面' })).toBeVisible();
  await expect(page.getByTestId('usage-ring')).toBeVisible();
});

test('S1 摄取事件回放可进入时间线', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-timeline').click();
  await expect(page.getByTestId('timeline-panel')).toBeVisible();
  await expect(page.getByText('摄取进行中 16 / 20')).toBeVisible();
  await expect(page.getByText('双方签订《精密铸造生产线设备采购合同》', { exact: false })).toBeVisible();
});

test('S1 关系图谱提供关系选择与原文依据', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('flow-s1').click();
  await page.getByTestId('view-graph').click();
  await expect(page.getByTestId('graph-panel')).toBeVisible();
  await expect(page.getByRole('img', { name: '当事人关系图谱' })).toBeVisible();
  await expect(page.getByRole('button', { name: '全资控股母公司（持股100%） e-01' })).toBeVisible();
});

test('S3 高危或未核验条目展开依据前不可确认', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByTestId('revision-panel');
  await expect(panel).toBeVisible();
  const confirm = panel.getByRole('button', { name: '确认', exact: true });
  await expect(confirm).toBeDisabled();
  await panel.getByRole('button', { name: /展开原文/ }).click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(panel.getByText('已确认', { exact: true })).toBeVisible();
});

test('S3 批量范围明确排除逐条条目', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByTestId('revision-panel');
  await expect(panel.getByText('高危与未核验条目已拆出')).toBeVisible();
  await panel.getByRole('button', { name: '批量确认 4 项' }).click();
  await expect(panel.getByText('已确认', { exact: true })).toHaveCount(4);
});

test('矩阵审阅使用样板案十份合同', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('view-matrix').click();
  await expect(page.getByTestId('matrix-panel')).toBeVisible();
  await expect(page.getByText('V01-卓越智造装备（云章）有限公司')).toBeVisible();
  await expect(page.getByText('10 份合同 · 7 个问题')).toBeVisible();
});

test('起草画布经显式冻结仪式转为只读', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('view-draft').click();
  const draft = page.getByTestId('draft-panel');
  await expect(draft.getByRole('textbox', { name: '文书起草画布' })).toBeVisible();
  await draft.getByRole('button', { name: '编译为 Word 文档' }).click();
  await expect(page.getByRole('dialog', { name: '编译为 Word 文档' })).toBeVisible();
  await page.getByRole('button', { name: '确认定稿并编译' }).click();
  await expect(draft.getByText('已定稿 · 2026-07-10 17:40')).toBeVisible();
  await expect(draft.getByRole('textbox', { name: '文书起草画布' })).toHaveCount(0);
});

test('状态圆盘可展开用量明细', async ({ page }) => {
  await page.goto('/');
  const ring = page.getByTestId('usage-ring');
  await expect(ring).toHaveAttribute('aria-expanded', 'false');
  await ring.click();
  await expect(ring).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('卷宗占用 28%')).toBeVisible();
});
