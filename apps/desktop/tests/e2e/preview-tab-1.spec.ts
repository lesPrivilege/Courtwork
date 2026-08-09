import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * PREVIEW-TAB-1 专用 e2e（ADR-014 决定一/二）。
 *
 * 只证**只有真跑才成立**的两件事：
 * ① 页签集按已产出 artifact 动态生成——同一 matter 里三枚产出各得一张页签，逐张切换各显其身
 *    （此前是一张「结构化产出」聚合席位，席位内自持选择、末位者胜，另外两枚在页签条上不存在）；
 * ② D11（LEGAL-FIVE-FACES-1 转挂）：一个 matter 内多场景产物并存——跑完 S1 再跑 S2，
 *    时间线面仍带着 S1 的产物（此前起新场景整本清空投影，回到「事件时间线尚未生成」）。
 *
 * 模型回合由 DEV/E2E turn 樁承载；真 key 真模型回合 external-validated blocked
 * （承 `LEGAL-FIVE-FACES-1` / `LEGAL-ANCHOR-BINDING-1` 同一条边界）。
 */

const GRANT_ID = 'grant-preview-tab';
const PRIMARY_FILE = '设备采购合同.docx';
const PRIMARY_CLAUSE = '第一条 付款：买方应于验收后三十日内付清全部款项。';
const TIMELINE_EVENT = '双方约定验收后三十日内付款';
const MATRIX_ANSWER = '验收后三十日内付清';

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
      grant: { grantId, label: '合成卷宗 · 产出页签' },
    });
  }, GRANT_ID);
}

/** 樁按「本次产出目标地址」的 stepId 交对应产物；S1 三步与 S2 一步同表。 */
async function setScriptedTurnStub(page: Page) {
  await page.evaluate(({ clause, timelineEvent, matrixAnswer }) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown; modelRoute: { providerId: string; modelId: string } }) => {
      const text = JSON.stringify(input.request);
      const fileMatch = text.match(/材料:开始 fileId=([\w-]+)/);
      const realFileId = fileMatch ? fileMatch[1] : 'unknown';
      const claim = { fileId: realFileId, exactQuote: clause };
      const script: Array<{ stepId: string; artifactType: string; artifact: unknown }> = [
        {
          stepId: 'intake-files',
          artifactType: 'legal.CaseFile',
          artifact: {
            caseId: 'preview-tab',
            files: [{ fileId: realFileId, fileName: '设备采购合同.docx', documentType: 'supporting', ingestStatus: 'done', contentHash: 'sha' }],
          },
        },
        {
          stepId: 'build-timeline',
          artifactType: 'legal.Timeline',
          artifact: {
            caseId: 'preview-tab',
            events: [{
              id: 'evt-01',
              description: timelineEvent,
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
            caseId: 'preview-tab',
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
            caseId: 'preview-tab',
            questions: [{ id: 'q1', text: '付款期限如何约定' }],
            rows: [{
              documentId: 'V1-设备采购合同',
              answers: { q1: { answer: matrixAnswer, quoteClaims: [claim], confidence: 'high' } },
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
        completedAt: '2026-08-10T00:00:00.000Z',
      };
    });
  }, { clause: PRIMARY_CLAUSE, timelineEvent: TIMELINE_EVENT, matrixAnswer: MATRIX_ANSWER });
}

async function prepareCase(page: Page) {
  await openWorkbench(page);
  await resetHooks(page);
  await setScriptedTurnStub(page);

  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByTestId('new-case-pack-legal').check();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();

  const bytes = Array.from(new Uint8Array(compileDraftToDocx({
    title: '设备采购合同',
    paragraphs: [PRIMARY_CLAUSE],
  })));
  await page.evaluate(({ grantId, path, data }) => {
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, path, new Uint8Array(data));
  }, { grantId: GRANT_ID, path: PRIMARY_FILE, data: bytes });
  await setNextAuthorize(page);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: PRIMARY_FILE })).toHaveAttribute('data-status', 'ready');
}

/** S1 全程：整理卷宗起跑 → 时间线门禁 → 图谱门禁 → 终局。跑完三枚产出在册。 */
async function runIntakeScenario(page: Page) {
  await page.getByTestId('scene-legal.S1').click();
  await expect(page.getByTestId('timeline-panel')).toContainText(TIMELINE_EVENT, { timeout: 15000 });
  await page.getByTestId('gate-confirm').getByTestId('gate-confirm-accept').click();
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '关系图谱' }).click();
  await expect(page.getByTestId('gate-confirm')).toContainText('确认当事人关系图谱', { timeout: 15000 });
  await page.getByTestId('gate-confirm-accept').click();
  await expect(page.getByTestId('gate-confirm')).toHaveCount(0, { timeout: 15000 });
}

test('① 页签集按已产出 artifact 动态生成：三枚产出三张页签，逐张切换各显其身', async ({ page }) => {
  await prepareCase(page);
  await runIntakeScenario(page);

  // 卸载本 matter 的包：三枚产出没有了具名工作面，落回通用产出席位——这是产品里
  // 唯一一处「多枚产出同时争同一席位」的可达状态，也正是聚合席位末位者胜的原形。
  await page.locator('[data-testid^="rail-pack-manage-"]').first().click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeVisible();
  await page.getByTestId('matter-pack-option-none').check();
  await page.getByTestId('matter-pack-apply').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeHidden();

  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  // 三枚各得一张页签（此前只有一张聚合「结构化产出」，另外两枚在页签条上不存在）。
  for (const label of ['卷宗清单', '事件时间线', '当事人图谱']) {
    await expect(tabs.getByRole('tab', { name: label })).toHaveCount(1);
  }
  await expect(tabs.getByRole('tab', { name: '结构化产出' })).toHaveCount(0);
  // 垂类具名工作面随卸载消失（零泄漏不因产出页签松动）。
  await expect(tabs.getByRole('tab', { name: '时间线', exact: true })).toHaveCount(0);
  await expect(tabs.getByRole('tab', { name: '修订预览' })).toHaveCount(0);

  // 逐张切换：每张页签打开的是**它自己**那枚产出的退化面，不是末位者。
  for (const [label, artifactType] of [
    ['事件时间线', 'legal.Timeline'],
    ['当事人图谱', 'legal.PartyGraph'],
    ['卷宗清单', 'legal.CaseFile'],
  ] as const) {
    await tabs.getByRole('tab', { name: label }).click();
    const pane = page.getByTestId(`artifact-pane-${artifactType}`);
    await expect(pane).toBeVisible();
    await expect(pane.getByTestId('vertical-artifact-unloaded').locator('h3')).toHaveText(label);
    await expect(pane.getByTestId('vertical-artifact-unloaded-hint')).toContainText('法律包');
  }

  // 切换不销毁彼此：三格恒在 DOM，非活动格只是 hidden（切走那一格没有被卸载）。
  await expect(page.locator('[data-testid^="artifact-pane-"]')).toHaveCount(3);
  await expect(page.getByTestId('artifact-pane-legal.Timeline')).toBeHidden();
  await expect(page.getByTestId('artifact-pane-legal.CaseFile')).toBeVisible();
});

test('② D11：一个 matter 内多场景产物并存（跑完 S1 再跑 S2，时间线仍在）', async ({ page }) => {
  await prepareCase(page);
  await runIntakeScenario(page);

  // 起第二个场景：此前这一步 dispatch `__clear__` 整本清空投影，S1 的产物随之从面上消失。
  // 工作面开着时场景条进窄态，宽态按钮收进「更多」——走弹层是这一刻真实可达的那条路。
  await page.getByTestId('scene-more').click();
  await page.getByTestId('scene-more-popover').getByRole('button', { name: '矩阵审阅' }).click();
  await expect(page.getByTestId('matrix-panel')).toContainText(MATRIX_ANSWER, { timeout: 15000 });

  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '时间线' }).click();
  await expect(page.getByTestId('timeline-panel')).toContainText(TIMELINE_EVENT);
  await expect(page.getByTestId('case-empty-state')).toHaveCount(0);

  await tabs.getByRole('tab', { name: '关系图谱' }).click();
  await expect(page.getByTestId('graph-panel')).toBeVisible({ timeout: 15000 });

  // 回到矩阵面：第二个场景自己的产物没有被第一个场景的留存挤掉。
  await tabs.getByRole('tab', { name: '矩阵审阅' }).click();
  await expect(page.getByTestId('matrix-panel')).toContainText(MATRIX_ANSWER);
});
