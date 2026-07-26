import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * CONTRACT-TRACE-1 专用 e2e：真实锚点回跳、生产审阅面零 demo 常量、completed 只读重开。
 *
 * 坐标算法本身由 `material-actions` 单测穷举（含重复 quote、分页件与八类 anchor_invalid）；
 * 本文件只证**只有真跑才成立**的三件事：锚点确实打开了那一份原件、生产面上没有样板案的
 * 固定文本、办结后写入控件在结构上不存在。
 */
const GRANT_ID = 'grant-ctr1';
const PRIMARY_FILE = '设备采购合同.docx';
const SUPPORTING_FILE = '会议纪要.docx';
const PRIMARY_CLAUSE = '第一条 付款：买方应于验收后三十日内付清全部款项。';
const SUPPORTING_CLAUSE = '双方于二〇二五年三月就付款节奏另行沟通并达成一致。';

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = { reset(): void; setTurnStub(stub: unknown): void };

function docxBytes(title: string, paragraphs: string[]): number[] {
  return Array.from(new Uint8Array(compileDraftToDocx({ title, paragraphs })));
}

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __courtworkHostAuth: HostAuthHooks;
      __courtworkMaterialHost: MaterialHooks;
      __courtworkWorkHooks: WorkHooks;
    };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
  });
}

async function setNextAuthorize(page: Page) {
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId, label: '合同案卷夹' },
    });
  }, GRANT_ID);
}

async function seedFile(page: Page, fileName: string, data: number[]) {
  await page.evaluate(
    ({ grantId, name, bytes }) => {
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(
        grantId,
        name,
        new Uint8Array(bytes),
      );
    },
    { grantId: GRANT_ID, name: fileName, bytes: data },
  );
}

/** 樁一次成功的审查 turn；`anchorOn` 决定引语挂在哪一件材料上。 */
async function setTurnStub(page: Page, options: { anchorOn: 'primary' | 'supporting' }) {
  await page.evaluate(({ mode, primaryQuote, supportingQuote }) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: {
      turnId: string;
      providerRequestId: string;
      request: unknown;
      modelRoute: { providerId: string; modelId: string };
    }) => {
      const text = JSON.stringify(input.request);
      // 材料段按 materialRefs 顺序注入，故首个 fileId 就是用户选定的主合同。
      const ids = Array.from(text.matchAll(/材料:开始 fileId=([\w-]+)/g)).map((m) => m[1]);
      const fileId = mode === 'primary' ? ids[0] : ids[1] ?? ids[0];
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: input.modelRoute.providerId,
        modelId: input.modelRoute.modelId,
        usage: { inputTokens: 1, outputTokens: 1 },
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({
          target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
          artifact: {
            caseId: 'contract-trace',
            risks: [{
              id: 'risk-1',
              description: '付款期限较长，回款风险偏高',
              level: 'high',
              basis: [{
                citation: '第一条 付款',
                quoteClaims: [{ fileId, exactQuote: mode === 'primary' ? primaryQuote : supportingQuote }],
              }],
              dispositionStatus: 'pending',
            }],
          },
        }),
        finishReason: 'stop',
        completedAt: '2026-07-26T00:00:00.000Z',
      };
    });
  }, { mode: options.anchorOn, primaryQuote: PRIMARY_CLAUSE, supportingQuote: SUPPORTING_CLAUSE });
}

async function createCaseWithMaterials(page: Page, files: [string, number[]][]) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();

  for (const [name, bytes] of files) await seedFile(page, name, bytes);
  await setNextAuthorize(page);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  for (const [name] of files) {
    await expect(page.getByTestId('material-item').filter({ hasText: name })).toHaveAttribute('data-status', 'ready');
  }
}

/** 跑到门禁停下（不提交）——审阅面此刻是 interactive。 */
async function runToGate(page: Page) {
  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('s3-launcher')).toBeVisible();
  await page.getByTestId('s3-primary-contract').selectOption({ label: PRIMARY_FILE });
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  const panel = page.getByTestId('revision-panel');
  await expect(panel).toBeVisible();
  return panel;
}

const PRIMARY_DOCX = () => docxBytes('设备采购合同', [PRIMARY_CLAUSE, '第二条 交付：卖方逾期交付的，按日承担违约金。']);
const SUPPORTING_DOCX = () => docxBytes('会议纪要', [SUPPORTING_CLAUSE]);

test('锚点指向支持材料时打开的是那一份原件，并按坐标高亮逐字切片', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  // 引语挂在支持材料上：若回跳按 materialRefs[0] 或按主合同猜，打开的会是设备采购合同。
  await setTurnStub(page, { anchorOn: 'supporting' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  const panel = await runToGate(page);

  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  const gotoSource = panel.getByTestId('goto-source').first();
  await expect(gotoSource).toBeEnabled();
  await gotoSource.click();

  const reader = page.getByTestId('reader-pane');
  await expect(reader).toBeVisible();
  // 打开的是第二份材料，不是主合同——正文取自会议纪要，主合同条款一句不在场。
  await expect(reader).toContainText(SUPPORTING_CLAUSE);
  await expect(reader).not.toContainText('第二条 交付');
  await expect(reader).not.toContainText(PRIMARY_CLAUSE);
  // 高亮恰一处，且逐字等于锚点切片。
  const mark = page.getByTestId('reader-focus-anchor');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveText(SUPPORTING_CLAUSE);
});

test('生产审阅面零 demo 常量：面头呈真实主合同名，预览块无假 redline', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setTurnStub(page, { anchorOn: 'primary' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  const panel = await runToGate(page);

  await expect(panel.getByTestId('review-head')).toContainText('风险审查');
  await expect(panel.getByTestId('review-head')).toContainText(PRIMARY_FILE);
  // 固定 demo 合同标题、固定「修订 4 处」与 del/ins 三件随本票整块退役。
  await expect(panel).not.toContainText('精密铸造生产线设备采购合同');
  await expect(panel).not.toContainText('修订 4 处');
  await expect(panel.locator('del')).toHaveCount(0);
  await expect(panel.locator('ins')).toHaveCount(0);
  await expect(panel.getByTestId('revision-preview-empty')).toContainText('待生成');
});

test('completed 只读重开：处置/修正/驳回控件在结构上不存在', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setTurnStub(page, { anchorOn: 'primary' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  const panel = await runToGate(page);

  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  const submit = page.getByTestId('submit-contract-review');
  await expect(submit).toBeEnabled();
  await submit.click();

  // 办结即转只读：写权限由判别联合隔离，不是把按钮藏起来。
  await expect(panel).toHaveAttribute('data-review-mode', 'read_only', { timeout: 15000 });
  await expect(panel.getByRole('button', { name: '确认此项', exact: true })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: '驳回', exact: true })).toHaveCount(0);
  await expect(panel.getByTestId('begin-review-correction')).toHaveCount(0);
  await expect(page.getByTestId('submit-contract-review')).toHaveCount(0);
  // 处置只从账本读：已确认仍如实呈现。
  await expect(panel.getByTestId('risk-detail-status')).toContainText('处置已确认');
});

test('已交付会话不显示重试入口（重试只在 inspect=ready_to_deliver 时出现）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setTurnStub(page, { anchorOn: 'primary' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  const panel = await runToGate(page);

  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  await page.getByTestId('submit-contract-review').click();

  await expect(page.getByTestId('work-output-docx')).toBeVisible({ timeout: 15000 });
  await expect(panel).toHaveAttribute('data-review-mode', 'read_only');
  // 产物已在且 hash 相同 → coordinator 判 already_present，不是 ready_to_deliver，故零重试入口。
  await expect(panel.getByTestId('retry-contract-output')).toHaveCount(0);
  await expect(panel.getByTestId('revision-preview-empty')).toContainText('已生成批注稿');
});
