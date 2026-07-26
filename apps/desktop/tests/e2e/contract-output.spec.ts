import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * CONTRACT-OUTPUT-TRUTH-1 专用 e2e：显式主合同选择、版本化产物名与 no-replace、
 * 以及「只有支持材料锚」的整份阻断。
 *
 * 既有四枚 spec 只作机械迁移（真实 DOCX + 显式选择 + 版本化名）；**行为扩张只进本文件**。
 */
const GRANT_ID = 'grant-cot1';
const PRIMARY_FILE = '设备采购合同.docx';
const SUPPORTING_FILE = '会议纪要.docx';
const NOT_DOCX_FILE = '情况说明.md';
const CONTRACT_CLAUSE = '第一条 付款：买方应于验收后三十日内付清全部款项。';
const SUPPORTING_CLAUSE = '双方于二〇二五年三月就付款节奏另行沟通。';

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

/**
 * 樁一次成功的审查 turn。`anchorOn` 决定引语挂在哪一件材料上——
 * `supporting` 用于构造「只有支持材料锚」的阻断反例。
 */
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
      const artifact = {
        caseId: 'contract-output',
        risks: [
          {
            id: 'risk-1',
            description: '付款期限较长，回款风险偏高',
            level: 'high',
            basis: [
              {
                citation: '第一条 付款',
                quoteClaims: [{ fileId, exactQuote: mode === 'primary' ? primaryQuote : supportingQuote }],
              },
            ],
            dispositionStatus: 'pending',
          },
        ],
      };
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
          artifact,
        }),
        finishReason: 'stop',
        completedAt: '2026-07-17T00:00:00.000Z',
      };
    });
  }, { mode: options.anchorOn, primaryQuote: CONTRACT_CLAUSE, supportingQuote: SUPPORTING_CLAUSE });
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

async function runReviewToCompletion(page: Page, primaryLabel = PRIMARY_FILE) {
  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('s3-launcher')).toBeVisible();
  await page.getByTestId('s3-primary-contract').selectOption({ label: primaryLabel });
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  const panel = page.getByTestId('revision-panel');
  await expect(panel).toBeVisible();
  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  const submit = page.getByTestId('submit-contract-review');
  await expect(submit).toBeEnabled();
  await submit.click();
}

const PRIMARY_DOCX = () => docxBytes('设备采购合同', [CONTRACT_CLAUSE, '第二条 交付：卖方逾期交付的，按日承担违约金。']);
const SUPPORTING_DOCX = () => docxBytes('会议纪要', [SUPPORTING_CLAUSE]);

test('未选主合同不得起跑；无可选 DOCX 时显式说明下一步', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createCaseWithMaterials(page, [[NOT_DOCX_FILE, Array.from(new TextEncoder().encode('# 情况说明\n\n仅供参考。'))]]);

  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('s3-launcher')).toBeVisible();
  // 只有一件 md：候选为空 → 选择器禁用 + 显式下一步，起跑钮无论主体填不填都禁用。
  await expect(page.getByTestId('s3-primary-contract')).toBeDisabled();
  await expect(page.getByTestId('s3-no-primary')).toContainText('先入库一份 Word 主合同');
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await expect(page.getByTestId('s3-run')).toBeDisabled();
});

test('候选只列 DOCX：md 材料不出现在主合同选择里', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createCaseWithMaterials(page, [
    [PRIMARY_FILE, PRIMARY_DOCX()],
    [NOT_DOCX_FILE, Array.from(new TextEncoder().encode('# 情况说明\n\n仅供参考。'))],
  ]);

  await page.getByTestId('scene-work-review').click();
  const options = page.getByTestId('s3-primary-contract').locator('option');
  const labels = await options.allInnerTexts();
  expect(labels).toContain(PRIMARY_FILE);
  expect(labels).not.toContain(NOT_DOCX_FILE);
});

test('显式选定主合同 → 版本化产物名落盘；同名不覆盖（重开审查不抹旧产物）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setTurnStub(page, { anchorOn: 'primary' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  await runReviewToCompletion(page);

  const output = page.getByTestId('work-output-docx');
  await expect(output).toBeVisible({ timeout: 15000 });
  const first = await output.innerText();
  // 版本化命名：前缀 + UTC 时间戳 + 64 位 session hash；旧固定名已退役。
  expect(first).toMatch(/合同审查批注稿-\d{8}-\d{6}-\d{3}-[0-9a-f]{64}\.docx/);
  expect(first).not.toContain('合同审查报告');
  expect(first).toContain('已写入本案「产出」目录');
});

test('已确认风险只有支持材料锚：整份阻断，零产物、零逐条放行控件', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  // 引语挂在支持材料上——主合同里根本没有这句话。
  await setTurnStub(page, { anchorOn: 'supporting' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()], [SUPPORTING_FILE, SUPPORTING_DOCX()]]);
  await runReviewToCompletion(page);

  // 阻断的**原因**必须可区分：这里是「未能唯一落到主合同」，不是「仍有待索证项」，
  // 也不是「没有已确认风险」。只断言零产物会让三种截然不同的结局看起来一样。
  const note = page.getByTestId('review-result');
  await expect(note).toBeVisible({ timeout: 15000 });
  await expect(note).toContainText('未能唯一落到主合同');
  await expect(note).not.toContainText('待索证');
  // 整份阻断：没有 docx 结果卡，也**没有**「确认知悉后跳过」一类逐条 waiver 控件。
  await expect(page.getByTestId('work-output-docx')).toHaveCount(0);
  await expect(page.getByTestId('non-applied-confirm')).toHaveCount(0);
});

test('生产审阅面不渲染样板案的固定 redline（数据面退役）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setTurnStub(page, { anchorOn: 'primary' });
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()]]);

  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-primary-contract').selectOption({ label: PRIMARY_FILE });
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  const panel = page.getByTestId('revision-panel');
  await expect(panel).toBeVisible();
  const text = await panel.innerText();
  expect(text).not.toContain('精密铸造生产线设备采购合同');
  expect(text).not.toContain('修订 4 处');
  await expect(page.getByTestId('revision-preview-empty')).toBeVisible();
  expect(await panel.locator('del').count()).toBe(0);
  expect(await panel.locator('ins').count()).toBe(0);
});

test('产出目录残留旧固定名文件：账本无版本化记录时不得宣称"已有产物"', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createCaseWithMaterials(page, [[PRIMARY_FILE, PRIMARY_DOCX()]]);

  // 旧版本应用（或用户手工）在本案产出目录留下一份固定名 `合同审查报告.docx`。
  // 本次会话的账本里**没有任何**版本化产物记录——产物名只能由完整 replay 的持久 metadata 铸出。
  await page.evaluate(async (grantId) => {
    const importClient = new Function('return import("/src/output/case-output-client.ts")') as () => Promise<{
      caseOutputClient: {
        seedBrowserFile(binding: { kind: 'grant'; grantId: string }, fileName: string, bytes: Uint8Array): void;
      };
    }>;
    const { caseOutputClient } = await importClient();
    caseOutputClient.seedBrowserFile({ kind: 'grant', grantId }, '合同审查报告.docx', new Uint8Array([0x50, 0x4b, 3, 4]));
  }, GRANT_ID);

  // 回到应用即重新询问宿主产物存在性（访达删改后不缓存裸 true 的既有机制）。
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  // 旧名文件在场**不构成**本次会话已有产物：账本读不到持久名 → 诚实空态，绝不回退猜名。
  await expect(page.getByTestId('work-output-docx')).toHaveCount(0);
  await expect(page.getByTestId('conversation-empty')).toBeVisible();
});
