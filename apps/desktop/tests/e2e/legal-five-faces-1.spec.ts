import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * LEGAL-FIVE-FACES-1：合成卷宗（grant 真实案）上五面的全链走查证据。
 *
 * 每张面各一条链，从**场景条按钮的真实调用**走到**面内交互**：
 * ①②时间线／关系图谱 ← S1 整理卷宗（一次运行两枚产物、两道门禁）；
 * ③矩阵审阅 ← S2 矩阵审阅；④修订预览 ← S3 审查合同（对照基线，全链另见 work-live.spec）；
 * ⑤起草画布 ← S4 起草答辩状（视图入口，此前被「暂不适用」拦死）。
 *
 * 模型回合由 DEV/E2E turn 樁承载（真 key 真模型回合属 external-validated，本票显式登记 blocked，
 * 见 `apps/desktop/specs/LEGAL-FIVE-FACES-1.md` 五节）。截图链落 release/evidence。
 */

const GRANT_ID = 'grant-5faces';
const PRIMARY_FILE = '设备采购合同.docx';
const OUT_DIR = '../../release/evidence/legal-five-faces-1-2026-08-07';

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = { reset(): void; setTurnStub(stub: unknown): void };

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks; __courtworkWorkHooks: WorkHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
  });
}

async function createGrantCase(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId, label: '合成卷宗 · 晨曦印务设备纠纷' } });
  }, GRANT_ID);
  await page.getByTestId('new-case-authorize').click();
  // PACK-INTERACT-1 ⑤：过渡默认已销，需 legal 场景的 grant 案在建案时显式选包。
  await page.getByTestId('new-case-dialog').getByTestId('new-case-pack-legal').check();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
}

async function ingestContract(page: Page) {
  const bytes = Array.from(new Uint8Array(compileDraftToDocx({
    title: '设备采购合同',
    paragraphs: ['第一条 付款：买方应于验收后三十日内付清全部款项。'],
  })));
  await page.evaluate(({ grantId, path, data }) => {
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, path, new Uint8Array(data));
  }, { grantId: GRANT_ID, path: PRIMARY_FILE, data: bytes });
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId, label: '合成卷宗 · 晨曦印务设备纠纷' } });
  }, GRANT_ID);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: PRIMARY_FILE })).toHaveAttribute('data-status', 'ready');
}

/**
 * 按**本次目标地址**逐步应答的 turn 樁：六段组装的输出通道段逐字写着
 * `本次产出目标地址：{"stepId":…}`，樁据此选脚本产物。
 *
 * 两条如实登记：①不按调用计数选——失败重试会让计数错位，那种樁把假绿伪装成通过；
 * ②不按「请求里出现过 legal.Timeline」选——步骤树段把三枚 artifactType 全列了出来，
 * 那种匹配会让每一步都回同一枚产物（本轮实测：首步即 target 不符被拒收）。
 */
async function setScriptedTurnStub(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown; modelRoute: { providerId: string; modelId: string } }) => {
      const text = JSON.stringify(input.request);
      const fileMatch = text.match(/材料:开始 fileId=([\w-]+)/);
      const fileId = fileMatch ? fileMatch[1] : 'unknown';
      const anchor = { fileId, exactQuote: '第一条 付款：买方应于验收后三十日内付清全部款项。' };
      const script: Array<{ stepId: string; artifactType: string; artifact: unknown }> = [
        {
          stepId: 'build-timeline',
          artifactType: 'legal.Timeline',
          artifact: {
            caseId: 'five-faces',
            events: [{
              id: 'evt-01',
              description: '双方签署设备采购合同',
              date: { kind: 'exact', date: '2024-03-11' },
              partyIds: [],
              quoteClaims: [anchor],
            }],
          },
        },
        {
          stepId: 'build-party-graph',
          artifactType: 'legal.PartyGraph',
          artifact: {
            caseId: 'five-faces',
            nodes: [
              { id: 'p1', kind: 'organization', primaryName: '晨曦印务有限公司', aliases: [] },
              { id: 'p2', kind: 'organization', primaryName: '起云智能装备股份有限公司', aliases: [] },
            ],
            edges: [{
              id: 'e1',
              sourcePartyId: 'p1',
              targetPartyId: 'p2',
              relationType: '买卖合同相对方',
              quoteClaims: [anchor],
            }],
          },
        },
        {
          stepId: 'intake-files',
          artifactType: 'legal.CaseFile',
          artifact: {
            caseId: 'five-faces',
            files: [{ fileId, fileName: '设备采购合同.docx', documentType: 'supporting', ingestStatus: 'done', contentHash: 'sha' }],
          },
        },
        {
          stepId: 'produce-review-matrix',
          artifactType: 'legal.ReviewMatrix',
          artifact: {
            caseId: 'five-faces',
            questions: [{ id: 'q1', text: '是否约定验收标准' }],
            rows: [{
              documentId: '设备采购合同',
              answers: { q1: { answer: '约定为验收后三十日内付款', quoteClaims: [anchor], confidence: 'medium' } },
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
        completedAt: '2026-08-07T00:00:00.000Z',
      };
    });
  });
}

async function prepareCase(page: Page) {
  await openWorkbench(page);
  await resetHooks(page);
  await setScriptedTurnStub(page);
  await createGrantCase(page);
  await ingestContract(page);
}

test('①② 时间线与关系图谱：整理卷宗一键起跑 → 两面各自门禁确认 → 场景终局', async ({ page }) => {
  await prepareCase(page);

  // 缺陷 D5 的正面判据：无预检表单的场景按钮点击即起跑，并落到它产出的那张面。
  await page.getByTestId('scene-legal.S1').click();

  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline).toBeVisible({ timeout: 15000 });
  await expect(timeline).toContainText('双方签署设备采购合同');
  // 缺陷 D8：面上真有产物时抬头不得再写「尚无」。
  await expect(page.getByTestId('preview-host')).toContainText('已生成');
  await page.screenshot({ path: `${OUT_DIR}/01-timeline-live.png` });

  // 缺陷 D6：门禁确认条在产出它的那张面上，文案取账本 gateLabel。
  const gate = page.getByTestId('gate-confirm');
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('确认事件时间线');
  await gate.getByTestId('gate-confirm-accept').click();

  // 续行产出关系图谱 → 切到该面，第二道门禁在图谱面上等着。
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '关系图谱' }).click();
  await expect(page.getByTestId('gate-confirm')).toContainText('确认当事人关系图谱', { timeout: 15000 });
  // g6 懒载块解析后才是真渲的一帧——载入态截图证不了图谱渲得出来。
  await expect(page.getByTestId('graph-panel')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/02-graph-live.png` });
  await page.getByTestId('gate-confirm-accept').click();

  // 终局判据：门禁确认条消失（不再有待确认），且两面产物仍在册、零失败反馈——
  // 「条消失」单独不足以证明走完（失败也会消失），故与产物在册联判。
  await expect(page.getByTestId('gate-confirm')).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByTestId('graph-panel')).toBeVisible();
  await tabs.getByRole('tab', { name: '时间线' }).click();
  await expect(page.getByTestId('timeline-panel')).toContainText('双方签署设备采购合同');
  await expect(page.getByTestId('case-empty-state')).toHaveCount(0);
});

test('③ 矩阵审阅：场景条按钮 → 矩阵真渲 → 门禁确认', async ({ page }) => {
  await prepareCase(page);

  // 缺陷 D1：S2 此前零 launch 声明，场景条上根本没有这枚按钮。
  await page.getByTestId('scene-legal.S2').click();
  const matrix = page.getByTestId('matrix-panel');
  await expect(matrix).toBeVisible({ timeout: 15000 });
  await expect(matrix).toContainText('是否约定验收标准');
  await page.screenshot({ path: `${OUT_DIR}/03-matrix-live.png` });

  const gate = page.getByTestId('gate-confirm');
  await expect(gate).toContainText('确认矩阵审阅结果');
  await gate.getByTestId('gate-confirm-accept').click();
  await expect(page.getByTestId('gate-confirm')).toHaveCount(0, { timeout: 15000 });
});

test('⑤ 起草画布：起草答辩状不再是死钮（此前恒显「暂不适用」）', async ({ page }) => {
  await prepareCase(page);

  await page.getByTestId('scene-more').click();
  await page.getByTestId('scene-more-popover').getByRole('button', { name: '起草答辩状' }).click();

  const draft = page.getByTestId('draft-panel');
  await expect(draft).toBeVisible();
  await expect(page.getByTestId('preview-host')).not.toContainText('暂不适用');
  // 面内交互：画布可编辑（contentEditable 画布，非只读展板）。
  const canvas = draft.getByRole('textbox', { name: '文书起草画布' });
  await expect(canvas).toBeVisible();
  await canvas.click();
  await page.keyboard.type('被答辩人主张的违约金计算基数有误。');
  await expect(canvas).toContainText('被答辩人主张的违约金计算基数有误。');
  await page.screenshot({ path: `${OUT_DIR}/05-draft-canvas.png` });
});

test('空面指引：尚未生成的面说得出产出者与启动方式（缺陷 D4）', async ({ page }) => {
  await prepareCase(page);

  // 先落到一张尚无产物的具名面：矩阵审阅（未跑 S2）。
  await page.getByTestId('scene-legal.S1').click();
  await expect(page.getByTestId('timeline-panel')).toBeVisible({ timeout: 15000 });
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '矩阵审阅' }).click();
  const empty = page.getByTestId('case-empty-state');
  await expect(empty).toContainText('矩阵审阅尚未生成');
  await expect(empty).toContainText('由「矩阵审阅」场景产出，在下方场景条启动');
  await page.screenshot({ path: `${OUT_DIR}/04-empty-face-guidance.png` });
});
