import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * GENERIC-SCENARIOS-1 · 卸载态冒烟（票面五节第三条）。
 *
 * ADR-023 决定五的验收律「只装通用包时产品是合格 work agent」在**产品面**上的取证：
 * 零垂类绑定 matter 上，两枚基线场景各走一条全链——
 *   ① `generic.draft`：场景条 → 宿主通用起跑面填「起草要求」→ 产出席位见文稿 → 「送入起草
 *      画布」→ 画布里是模型给的那份文稿（收尾件一的产品级红证）；
 *   ② `generic.batch`：场景条无表单直启 → 产出席位逐份材料成行，模型漏掉的那份由系统补
 *      `缺行·系统补记`（逐项完整性裁决在产品面上看得见）。
 *
 * 模型回合由 DEV/E2E turn 樁承载（真 key 属 external-validated，本票显式登记不宣称）。
 * 全程零垂类词表泄漏断言逐链各一道。
 */

const GRANT_ID = 'grant-generic-scenarios';
const NOTES_FILE = '周会纪要.md';
const PROGRESS_FILE = '进度说明.md';

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = { reset(): void; setTurnStub(stub: unknown): void };

/**
 * 零垂类词表（与 `work-context.test.ts` ①附 describe 同源，取其可在 DOM 上判定的一支）。
 *
 * 判在 `innerText` 上而非 `textContent`：隐藏格（非活动产出页签常驻 DOM 只加 hidden）不属
 * 用户此刻看见的东西，把它算进来会让断言测的是 DOM 存量而非可见面。
 */
const VERTICAL_TOKENS = [
  '合同审查', '审查合同', '整理卷宗', '卷宗整理', '起草答辩状', '答辩', '诉讼', '律师',
  '风险', '主合同', '当事人', '批注', '修订', '时间线', '关系图谱', '矩阵审阅',
];

async function expectNoVerticalVocabulary(page: Page) {
  const visible = await page.evaluate(() => document.body.innerText);
  for (const token of VERTICAL_TOKENS) {
    expect(visible, `卸载态可见面泄漏垂类词「${token}」`).not.toContain(token);
  }
}

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks; __courtworkWorkHooks: WorkHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
  });
}

/** 建案：grant 文件夹 ＋ **不选任何垂类包**（持久面 packBinding []）。 */
async function createUnboundGrantCase(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth
      .setNextAuthorize({ status: 'granted', grant: { grantId, label: '通用工作区 · 冒烟' } });
  }, GRANT_ID);
  await page.getByTestId('new-case-authorize').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
}

async function ingestNotes(page: Page) {
  const files: Array<{ path: string; text: string }> = [
    { path: NOTES_FILE, text: '# 周会纪要\n\n本周确认三项待办，责任人已分派。\n' },
    { path: PROGRESS_FILE, text: '# 进度说明\n\n主体工作已到七成，余下两项等外部反馈。\n' },
  ];
  await page.evaluate(({ grantId, entries }) => {
    const host = (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost;
    for (const entry of entries) host.setFile(grantId, entry.path, new TextEncoder().encode(entry.text));
  }, { grantId: GRANT_ID, entries: files });
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth
      .setNextAuthorize({ status: 'granted', grant: { grantId, label: '通用工作区 · 冒烟' } });
  }, GRANT_ID);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  for (const file of files) {
    await expect(page.getByTestId('material-item').filter({ hasText: file.path })).toHaveAttribute('data-status', 'ready');
  }
}

/**
 * 按**本次产出目标地址**应答的 turn 樁（同 LEGAL-FIVE-FACES-1 的选法，不按调用计数）。
 *
 * 批处理只回**第一份**材料的行：漏掉的那份由系统的逐项完整性裁决补成 `missing`——这正是
 * 「模型漏行 → 显式缺行」在产品面上的反例注入。
 */
async function setScriptedTurnStub(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown; modelRoute: { providerId: string; modelId: string } }) => {
      const text = JSON.stringify(input.request);
      // 材料段逐份带 `fileId=<materialId>`：闭集由系统注入，樁只照抄，不自造地址。
      const materialIds = [...text.matchAll(/材料:开始 fileId=([^\s\\"]+)/g)].map((match) => match[1]!);
      const stepMatch = text.match(/本次产出目标地址：\{\\"stepId\\":\\"([\w-]+)\\"/);
      const stepId = stepMatch ? stepMatch[1] : '';
      const picked = stepId === 'produce-draft'
        ? {
            target: { stepId: 'produce-draft', artifactType: 'generic.DraftDocument' },
            artifact: {
              title: '第三季度工作说明',
              paragraphs: ['本季度主体工作已完成七成。', '余下两项在等外部反馈。', '下一步先补齐待办的责任人。'],
            },
          }
        : {
            target: { stepId: 'produce-batch-report', artifactType: 'generic.BatchReport' },
            artifact: {
              items: materialIds.slice(0, 1).map((materialId) => ({
                materialId,
                summary: '本篇记了三项待办与责任人。',
                status: 'summarized',
              })),
            },
          };
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: input.modelRoute.providerId,
        modelId: input.modelRoute.modelId,
        usage: { inputTokens: 1, outputTokens: 1 },
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify(picked),
        finishReason: 'stop',
        completedAt: '2026-08-11T00:00:00.000Z',
      };
    });
  });
}

/**
 * 起跑一枚场景条条目。`wide` 变体在窄容器下由 CSS 收进「更多」弹层（同一枚条目的两处呈现），
 * 故按**此刻可见与否**分流——容器宽窄随右栏开合变化，写死任一条路都会在另一态假红。
 */
async function launchScene(page: Page, scenarioId: string, label: string) {
  const direct = page.getByTestId(`scene-${scenarioId}`);
  if (await direct.isVisible()) {
    await direct.click();
    return;
  }
  await page.getByTestId('scene-more').click();
  await page.getByTestId('scene-more-popover').getByRole('button', { name: label }).click();
}

async function prepareUnboundCase(page: Page) {
  await openWorkbench(page);
  await resetHooks(page);
  await setScriptedTurnStub(page);
  await createUnboundGrantCase(page);
  await page.getByTestId('segment-work').click();
  await ingestNotes(page);
  // 卸载态判据（收尾追修）：基线场景在册**不等于**加载了垂类能力——起手引导与基线按钮同框。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  await expect(page.getByTestId('scene-generic.draft')).toBeVisible();
  // WORK-AGENT-GUI-1：Scenes 内 CTA 只切 Pi Work，不再进入 renderer 内存稿。
  await page.getByTestId('scene-unloaded-work').click();
  await expect(page.getByTestId('pi-panel')).toBeVisible();
  await page.getByTestId('segment-work').click();
}

test('① generic.draft 全链：宿主起跑面 → 产出席位 → 送入起草画布', async ({ page }) => {
  await prepareUnboundCase(page);

  await launchScene(page, 'generic.draft', '通用起草');
  const precheck = page.getByTestId('scene-precheck-host');
  await expect(precheck).toBeVisible();
  await precheck.getByRole('textbox', { name: '起草要求' }).fill('写一份三段的季度工作说明');
  await precheck.getByRole('button', { name: '开始起草' }).click();

  // 产出席位：产物到来即多一张页签（如实登记：活动面不自动跳过去，页签由用户选——
  // 见 SPEC §10.5 的登记项）。段落逐条成行，标题由页签身份承载、不入列。
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  const draftArtifactTab = tabs.getByRole('tab', { name: '起草文稿' });
  await expect(draftArtifactTab).toBeVisible({ timeout: 15000 });
  // 回执登记项抽核：产物到来只新增页签，不自动改活动面；用户显式点选后才进入产出格。
  await expect(draftArtifactTab).toHaveAttribute('aria-selected', 'false');
  await draftArtifactTab.click();
  const pane = page.getByTestId('artifact-pane-generic.DraftDocument');
  await expect(pane).toContainText('本季度主体工作已完成七成。', { timeout: 15000 });
  await expectNoVerticalVocabulary(page);

  // 收尾件一：显式移交 → 可编辑工作稿里就是模型给的那份文稿。
  await pane.getByTestId('artifact-handoff-action').click();
  const draft = page.getByTestId('draft-panel');
  await expect(draft).toBeVisible();
  await expect(draft.locator('h2')).toHaveText('第三季度工作说明');
  await expect(draft).toContainText('余下两项在等外部反馈。');
  // 画布可编辑（送进来的是工作稿不是只读展板），且落盘入口在场。
  await expect(draft.getByRole('textbox', { name: '文书起草画布' })).toBeVisible();
  await expect(draft.getByRole('button', { name: '编译为 Word 文档' })).toBeVisible();
  await expectNoVerticalVocabulary(page);
});

test('② generic.batch 全链：无表单直启 → 逐份材料成行，漏行由系统补记', async ({ page }) => {
  await prepareUnboundCase(page);

  await launchScene(page, 'generic.batch', '多文件批处理');

  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  const batchArtifactTab = tabs.getByRole('tab', { name: '批处理报告' });
  await expect(batchArtifactTab).toBeVisible({ timeout: 15000 });
  await expect(batchArtifactTab).toHaveAttribute('aria-selected', 'false');
  await batchArtifactTab.click();
  const pane = page.getByTestId('artifact-pane-generic.BatchReport');
  await expect(pane).toContainText('本篇记了三项待办与责任人。', { timeout: 15000 });
  // 模型只写了一行，两份就绪材料各占一行：缺的那份显式补记，不伪造摘要、不悄悄少一行。
  await expect(pane).toContainText('已归纳');
  await expect(pane).toContainText('缺行·系统补记');
  await expect(pane.locator('tbody tr')).toHaveCount(2);
  await expectNoVerticalVocabulary(page);
});
