import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * GENERIC-PACK-1（解耦相）专用 e2e：卸载态（未绑定 matter）与过渡默认的机器判据。
 *
 * 卸载态按 ADR-015 决定三补记经**测试构造点的未绑定 matter** 取证（packBinding: []），
 * 不入产品 UX——过渡期内新建 matter 默认绑定 Legal（`PACK-INTERACT-1` 销条）。
 */

const CASE_LIST_KEY = 'courtwork.case-list.v1';

test('卸载态：未绑定 matter 页签集零垂类（effective registry 派生）', async ({ page }) => {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: CASE_LIST_KEY,
    payload: {
      version: 1,
      cases: [{ id: 'unbound-1', title: '未绑定案', kind: 'case', packBinding: [] }],
    },
  });
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  await page.getByTestId('case-card-unbound-1').getByRole('button', { name: '未绑定案', exact: true }).click();
  await expect(page.getByTestId('scene-strip')).toBeVisible();
  // 卸载态起手引导（裁定二）：matter 规范文件提示＋Draft 入口，零垂类兜底——条内无任何垂类按钮。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  await expect(page.getByTestId('scene-unloaded-hint')).toContainText('《场景规范.md》');
  for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状', '停止审查']) {
    await expect(page.getByTestId('scene-strip').getByRole('button', { name: legalCopy, exact: true })).toHaveCount(0);
  }
  // Draft 入口打开工作面预览（壳内通用起草画布，卸载态仍可用）。
  await page.getByTestId('scene-unloaded-draft').click();
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await expect(tabs).toBeVisible();
  // 四枚垂类页签标题一个都不许出现；通用起草画布在。
  for (const legalTab of ['时间线', '关系图谱', '矩阵审阅', '修订预览']) {
    await expect(tabs.getByRole('tab', { name: legalTab })).toHaveCount(0);
  }
  await expect(tabs.getByRole('tab', { name: '起草画布' })).toHaveCount(1);
});

test('过渡默认：新建 matter 持久携 packBinding [legal]（PACK-INTERACT-1 销条）', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill('过渡默认案');
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' }).catch(() => undefined);
  const envelope = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { cases?: Array<Record<string, unknown>> });
  }, CASE_LIST_KEY);
  const record = envelope?.cases?.find((item) => item.title === '过渡默认案');
  expect(record).toBeDefined();
  expect(record!.packBinding).toEqual(['legal']);
});
