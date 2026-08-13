import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * LEGAL-ANCHOR-BINDING-1 专用 e2e：三面「回到原件」由显式 disabled 转真实回跳。
 *
 * 只证**只有真跑才成立**的两件事：
 * ① 模型侧只交引语（`quoteClaims`），落到面上的坐标是 resolver 铸的——按它回跳能打开那一份
 *    原件并按坐标高亮逐字切片（判据循 `CONTRACT-TRACE-1`：fileId 同案重验 + block-local 高亮）；
 * ② 跨案 fileId 的伪锚不开面，走显式阻断文案，绝不打开空白阅读面（fail-closed）。
 *
 * 坐标算法本身由 `material-actions` 单测穷举；引用闭环的执行器行为由
 * `packages/demo-runtime/src/acceptance/legal-anchor-binding.integration.test.ts` 看守。
 *
 * 模型回合由 DEV/E2E turn 樁承载；真 key 真模型回合 **external-validated blocked**
 * （承 `LEGAL-FIVE-FACES-1` 同一条边界）。
 */

const GRANT_ID = 'grant-anchor-binding';
const PRIMARY_FILE = '设备采购合同.docx';
const PRIMARY_CLAUSE = '第一条 付款：买方应于验收后三十日内付清全部款项。';
const SECOND_CLAUSE = '第二条 交付：卖方逾期交付的，按日承担违约金。';
const OUT_DIR = '../../release/evidence/legal-anchor-binding-1-2026-08-09';

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = { reset(): void; setTurnStub(stub: unknown): void };

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
      grant: { grantId, label: '合成卷宗 · 锚点回跳' },
    });
  }, GRANT_ID);
}

/**
 * 樁只交引语（草稿形），坐标一律不写——本票之后那些字段在模型侧结构上不存在。
 * `bogusFileId` 打开伪锚分支：引语正确但 fileId 指向本案没有的文件。
 */
async function setScriptedTurnStub(page: Page, options: { bogusFileId?: boolean } = {}) {
  await page.evaluate(({ clause, bogus }) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown; modelRoute: { providerId: string; modelId: string } }) => {
      const text = JSON.stringify(input.request);
      const fileMatch = text.match(/材料:开始 fileId=([\w-]+)/);
      const realFileId = fileMatch ? fileMatch[1] : 'unknown';
      const fileId = bogus ? 'not-in-this-case' : realFileId;
      const claim = { fileId, exactQuote: clause };
      const script: Array<{ stepId: string; artifactType: string; artifact: unknown }> = [
        {
          stepId: 'intake-files',
          artifactType: 'legal.CaseFile',
          artifact: {
            caseId: 'anchor-binding',
            files: [{ fileId: realFileId, fileName: '设备采购合同.docx', documentType: 'supporting', ingestStatus: 'done', contentHash: 'sha' }],
          },
        },
        {
          stepId: 'build-timeline',
          artifactType: 'legal.Timeline',
          artifact: {
            caseId: 'anchor-binding',
            events: [{
              id: 'evt-01',
              description: '双方约定验收后三十日内付款',
              date: { kind: 'exact', date: '2024-03-11' },
              partyIds: [],
              quoteClaims: [claim],
            }],
          },
        },
        {
          stepId: 'build-party-graph',
          artifactType: 'legal.PartyGraph',
          artifact: {
            caseId: 'anchor-binding',
            nodes: [
              { id: 'p1', kind: 'organization', primaryName: '晨曦印务有限公司', aliases: [] },
              { id: 'p2', kind: 'organization', primaryName: '起云智能装备股份有限公司', aliases: [] },
            ],
            edges: [{
              id: 'e1',
              sourcePartyId: 'p1',
              targetPartyId: 'p2',
              relationType: '买卖合同相对方',
              quoteClaims: [claim],
            }],
          },
        },
        {
          stepId: 'produce-review-matrix',
          artifactType: 'legal.ReviewMatrix',
          artifact: {
            caseId: 'anchor-binding',
            questions: [{ id: 'q1', text: '付款期限如何约定' }],
            rows: [{
              documentId: 'V1-设备采购合同',
              answers: { q1: { answer: '验收后三十日内付清', quoteClaims: [claim], confidence: 'high' } },
            }],
          },
        },
      ];
      const stepMatch = text.match(/本次产出目标地址：\{\\"stepId\\":\\"([\w-]+)\\"/);
      const stepId = stepMatch ? stepMatch[1] : '';
      const picked = script.find((entry) => entry.stepId === stepId) ?? script[script.length - 1];
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: input.modelRoute.providerId,
        modelId: input.modelRoute.modelId,
        usage: { inputTokens: 1, outputTokens: 1 },
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({
          target: { stepId: picked.stepId, artifactType: picked.artifactType },
          artifact: picked.artifact,
        }),
        finishReason: 'stop',
        completedAt: '2026-08-09T00:00:00.000Z',
      };
    });
  }, { clause: PRIMARY_CLAUSE, bogus: options.bogusFileId === true });
}

async function prepareCase(page: Page, options: { bogusFileId?: boolean } = {}) {
  await openWorkbench(page);
  await resetHooks(page);
  await setScriptedTurnStub(page, options);

  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByTestId('new-case-pack-legal').check();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
  await page.getByTestId('segment-work').click();

  const bytes = Array.from(new Uint8Array(compileDraftToDocx({
    title: '设备采购合同',
    paragraphs: [PRIMARY_CLAUSE, SECOND_CLAUSE],
  })));
  await page.evaluate(({ grantId, path, data }) => {
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, path, new Uint8Array(data));
  }, { grantId: GRANT_ID, path: PRIMARY_FILE, data: bytes });
  await setNextAuthorize(page);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: PRIMARY_FILE })).toHaveAttribute('data-status', 'ready');
}

test('时间线与关系图谱：模型只交引语，回到原件按系统坐标打开原件并逐字高亮', async ({ page }) => {
  await prepareCase(page);
  await page.getByTestId('scene-legal.S1').click();

  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline).toBeVisible({ timeout: 15000 });
  await expect(timeline).toContainText('双方约定验收后三十日内付款');

  // ① 时间线面：按钮已从「回到原件 · 尚未接通」的死态转为可点。
  const timelineGoto = page.getByTestId('timeline-goto-source');
  await expect(timelineGoto).toBeEnabled();
  await expect(page.getByTestId('preview-host')).not.toContainText('尚未接通');
  await timelineGoto.click();

  const reader = page.getByTestId('reader-pane');
  await expect(reader).toBeVisible();
  await expect(reader).toContainText(PRIMARY_CLAUSE);
  // 高亮恰一处且逐字等于铸出的锚点切片——模型没写过一个坐标数字。
  const mark = page.getByTestId('reader-focus-anchor');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveText(PRIMARY_CLAUSE);
  await page.screenshot({ path: `${OUT_DIR}/01-timeline-goto-source.png` });

  // ② 关系图谱面：阅读面占住预览格，故先切回时间线页签（选页签即关阅读面）再确认门禁。
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '时间线' }).click();
  await expect(page.getByTestId('reader-pane')).toHaveCount(0);
  await page.getByTestId('gate-confirm-accept').click();
  await tabs.getByRole('tab', { name: '关系图谱' }).click();
  await expect(page.getByTestId('graph-panel')).toBeVisible({ timeout: 15000 });
  const graphGoto = page.getByTestId('graph-goto-source');
  await expect(graphGoto).toBeEnabled();
  await graphGoto.click();
  await expect(page.getByTestId('reader-focus-anchor')).toHaveText(PRIMARY_CLAUSE);
  await page.screenshot({ path: `${OUT_DIR}/02-graph-goto-source.png` });
});

test('矩阵审阅：格内引语经公证后可回跳，且面上不再宣称「尚未接通」', async ({ page }) => {
  await prepareCase(page);
  await page.getByTestId('scene-legal.S2').click();

  const matrix = page.getByTestId('matrix-panel');
  await expect(matrix).toBeVisible({ timeout: 15000 });
  await expect(matrix).not.toContainText('尚未接通');

  await matrix.getByTestId('matrix-source-v1-q1').click();
  const goto = matrix.getByTestId('matrix-goto-source-v1-q1');
  await expect(goto).toBeEnabled();
  await goto.click();

  await expect(page.getByTestId('reader-pane')).toContainText(PRIMARY_CLAUSE);
  await expect(page.getByTestId('reader-focus-anchor')).toHaveText(PRIMARY_CLAUSE);
  await page.screenshot({ path: `${OUT_DIR}/03-matrix-goto-source.png` });
});

test('伪锚 fail-closed：引语指向本案没有的文件时整条不落格，面上诚实说缺口', async ({ page }) => {
  await prepareCase(page, { bogusFileId: true });
  await page.getByTestId('scene-legal.S1').click();

  // 引语公证在 file_unavailable 上拒收，两轮后事件被剪枝——面上零事件、零锚，
  // 绝不出现一条「带着模型自报文件名」的时间线。
  const viewport = page.getByTestId('timeline-static-viewport');
  await expect(viewport).toContainText('暂无时间线事件', { timeout: 15000 });
  await expect(page.getByTestId('timeline-panel')).toHaveCount(0);
  await expect(page.getByTestId('timeline-goto-source')).toHaveCount(0);
  await expect(page.getByTestId('preview-host')).not.toContainText('not-in-this-case');
});
