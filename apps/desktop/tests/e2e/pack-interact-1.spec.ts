import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

/**
 * PACK-INTERACT-1（解耦相）专用 e2e：加载动作（建案/设置）、全局可用集呈现、
 * 加载/卸载往返全链、准入失败 fail-closed 显式、卸载退化视图产品面全链。
 *
 * 全部经**真实加载动作**（建案时选包 / MatterPackDialog）取证——不再是测试构造点写持久。
 * 模型回合由 DEV/E2E turn 樁承载（真 key 回合属 external-validated，本票不宣称）。
 */

const CASE_LIST_KEY = 'courtwork.case-list.v1';
const GRANT_ID = 'grant-pack-interact';
const PRIMARY_FILE = '设备采购合同.docx';

/** 建案时选包：直接命名 + 选 legal（不绑定文件夹，非 grant）。 */
async function createCaseWithLegal(page: Page, name: string) {
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByTestId('new-case-pack-legal').check();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill(name);
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' }).catch(() => undefined);
}

/** 打开当前选中案的包设置弹层（matter 设置处，展开区「管理包」）。 */
async function openMatterPackDialog(page: Page) {
  await page.locator('[data-testid^="rail-pack-manage-"]').first().click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeVisible();
}

/** 在包设置弹层中选「不加载」并保存（卸载）。 */
async function unloadAllPacks(page: Page) {
  await openMatterPackDialog(page);
  await page.getByTestId('matter-pack-option-none').check();
  await page.getByTestId('matter-pack-apply').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeHidden();
}

test('① 加载/卸载往返全链：建案选 legal → 面在 → 卸载 → 通用面 → 重载 → 面回', async ({ page }) => {
  await openWorkbench(page);
  await createCaseWithLegal(page, '往返链案');

  // 加载态：场景条有 legal 场景按钮、无卸载起手引导；设置处状态行「已加载」。
  await expect(page.getByTestId('scene-legal.S3')).toBeVisible();
  await expect(page.getByTestId('scene-unloaded-hint')).toHaveCount(0);
  await expect(page.locator('[data-testid^="rail-pack-state-"]').first()).toContainText('已加载：法律包');

  // 卸载（真实加载动作：matter 设置处弹层 → 不加载 → 保存）。
  await unloadAllPacks(page);

  // 卸载态：起手引导回归、零垂类场景按钮、设置处状态行「未加载」。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状']) {
    await expect(page.getByTestId('scene-strip').getByRole('button', { name: legalCopy, exact: true })).toHaveCount(0);
  }
  await expect(page.locator('[data-testid^="rail-pack-state-"]').first()).toContainText('未加载垂类包');

  // 重载（再经设置处弹层 → 法律包 → 保存）：面回。
  await openMatterPackDialog(page);
  await page.getByTestId('matter-pack-option-legal').check();
  await page.getByTestId('matter-pack-apply').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeHidden();
  await expect(page.getByTestId('scene-legal.S3')).toBeVisible();
  await expect(page.getByTestId('scene-unloaded-hint')).toHaveCount(0);
  await expect(page.locator('[data-testid^="rail-pack-state-"]').first()).toContainText('已加载：法律包');
});

test('③ 准入失败 fail-closed 显式：绑定非准入包 → 显式失效面 + 零垂类入口 → 清绑恢复', async ({ page }) => {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: CASE_LIST_KEY,
    payload: {
      version: 1,
      cases: [{ id: 'invalid-bound', title: '失效绑定案', kind: 'case', packBinding: ['tender'] }],
    },
  });
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
  await page.getByTestId('case-card-invalid-bound').getByRole('button', { name: '失效绑定案', exact: true }).click();

  // 显式失效面（发生了什么＋下一步），场景条被替换（零入口、零卸载起手引导伪装）。
  const failure = page.getByTestId('matter-binding-failure');
  await expect(failure).toBeVisible();
  await expect(failure).toContainText('tender');
  await expect(page.getByTestId('scene-strip')).toHaveCount(0);
  await expect(page.getByTestId('scene-unloaded-hint')).toHaveCount(0);
  for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状']) {
    await expect(page.getByRole('button', { name: legalCopy, exact: true })).toHaveCount(0);
  }

  // 宿主目录缺该条目时的呈现契约：状态行禁裸 id 伪装正常已加载态。
  const packStateRow = page.getByTestId('rail-pack-state-invalid-bound');
  await expect(packStateRow).toContainText('绑定不可用');
  await expect(packStateRow).toContainText('本版本不可用');
  await expect(packStateRow).not.toContainText('已加载');

  // 下一步：管理此案的包 → 弹层显式标注失效绑定。
  await failure.getByTestId('matter-binding-failure-manage').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeVisible();
  await expect(page.getByTestId('matter-pack-invalid')).toContainText('tender');

  // 清绑恢复：保存「不加载」→ 失效面消失、卸载态通用开场回归。
  await page.getByTestId('matter-pack-apply').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeHidden();
  await expect(page.getByTestId('matter-binding-failure')).toHaveCount(0);
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
});

// ── ⑥ 卸载退化视图产品面全链（承 GENERIC-PACK-1 追认⑤转挂）──────────────
// 真实加载动作使「已有垂类产物＋包未加载」产品可达：建案选 legal → 场景运行产出 legal
// artifact → 卸载 → 结构化产出页签见显式退化面 → 重载 → 结构化视图恢复。

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = {
  reset(): void;
  setTurnStub(stub: unknown): void;
  readState(ref: { caseId: string; sessionId: string }): Promise<{ found: false } | { found: true; bytes: Uint8Array }>;
  listSessions(): Array<{ caseId: string; sessionId: string }>;
};

/**
 * 取当前案已写账的 work 会话坐标（store 层直证的坐标，不经 UI）。
 *
 * 不走 `courtwork.work-session.v1` 恢复指针：那是**可续/中断态**的指针，跑完即
 * compare-and-clear（work-session-lifecycle 的 clear_if_matches），因此完成态会话无坐标可取。
 */
async function durableWorkRef(page: Page) {
  const caseId = await page.evaluate(() => localStorage.getItem('courtwork.selected-case-id'));
  if (!caseId) throw new Error('missing selected case');
  const refs = await page.evaluate(() => (
    (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks.listSessions()
  ));
  const ref = refs.find((item) => item.caseId === caseId);
  if (!ref) throw new Error(`no durable work session for ${caseId}`);
  return ref;
}

/** 读 WorkState 宿主的原始字节（不是 UI 投影）。 */
async function readWorkStateText(page: Page, ref: { caseId: string; sessionId: string }) {
  return page.evaluate(async (target) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    const result = await hooks.readState(target);
    if (!result.found) throw new Error('missing durable work state');
    return new TextDecoder().decode(result.bytes);
  }, ref);
}

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __courtworkHostAuth: HostAuthHooks; __courtworkMaterialHost: MaterialHooks; __courtworkWorkHooks: WorkHooks };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
  });
}

/** 建案时选包：grant 文件夹 + legal 包。 */
async function createGrantCaseWithLegal(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await page.evaluate((grantId) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId, label: '演示文件夹 · 包交互' } });
  }, GRANT_ID);
  await page.getByTestId('new-case-authorize').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByTestId('new-case-pack-legal').check();
  await dialog.getByRole('button', { name: '创建案件' }).click();
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
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId, label: '演示文件夹 · 包交互' } });
  }, GRANT_ID);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: PRIMARY_FILE })).toHaveAttribute('data-status', 'ready');
}

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
              { id: 'p1', kind: 'organization', primaryName: '合川器材有限公司', aliases: [] },
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

async function prepareLoadedCase(page: Page) {
  await openWorkbench(page);
  await resetHooks(page);
  await setScriptedTurnStub(page);
  await createGrantCaseWithLegal(page);
  await ingestContract(page);
}

test('⑥ 卸载退化视图产品面全链：建案选 legal → S1 产出时间线 → 卸载 → 显式退化面 → 重载恢复', async ({ page }) => {
  await prepareLoadedCase(page);

  // ① 加载态：S1 真实起跑，产出 legal.Timeline，落到时间线结构化面；两面门禁逐一确认（跑完）。
  await page.getByTestId('scene-legal.S1').click();
  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline).toBeVisible({ timeout: 15000 });
  await expect(timeline).toContainText('双方签署设备采购合同');
  // 取 durable 会话坐标：此刻运行停在门禁上、指针在册；跑完即 compare-and-clear，故须在此取。
  const ref = await durableWorkRef(page);
  const before = await readWorkStateText(page, ref);
  expect(before, '卸载前 work 账本须已有 durable 产物字节').toContain('双方签署设备采购合同');
  await page.getByTestId('gate-confirm').getByTestId('gate-confirm-accept').click();
  // 第二道门禁（当事人关系图谱）——切到图谱面门禁才渲染，跑完再卸载（避免在途运行与卸载态交互）。
  const tabs = page.getByRole('tablist', { name: '结构化工作面' });
  await tabs.getByRole('tab', { name: '关系图谱' }).click();
  await expect(page.getByTestId('gate-confirm')).toContainText('确认当事人关系图谱', { timeout: 15000 });
  await page.getByTestId('gate-confirm-accept').click();
  await expect(page.getByTestId('gate-confirm')).toHaveCount(0, { timeout: 15000 });

  // ② 卸载（真实加载动作）：包设置弹层 → 不加载。卸载前后各取一次 store 层原始字节。
  const beforeUnload = await readWorkStateText(page, ref);
  await unloadAllPacks(page);

  // ②' store 层直证：案件账本记下显式零绑定，而 durable 产物字节逐字未动（零迁移零重算）——
  //     「卸载不删除已有产出」不能只由 UI 退化面与重载恢复间接观察。
  const persistedCase = await page.evaluate(({ key, grantId }) => {
    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw as string) as { cases: Array<{ grantId?: string; packBinding?: string[] }> };
    return parsed.cases.find((item) => item.grantId === grantId) ?? null;
  }, { key: CASE_LIST_KEY, grantId: GRANT_ID });
  expect(persistedCase?.packBinding).toEqual([]);
  const after = await readWorkStateText(page, ref);
  expect(after).toBe(beforeUnload);
  expect(after).toContain('双方签署设备采购合同');

  // ③ 卸载态：活动视图落回在册默认（通用面），结构化产出页签承载已有产物 → 显式退化面。
  //    退化文案用宿主目录 displayName（法律包），不泄漏 packageId 字面量；
  //    标题是 S1 已产出的宿主资产（卷宗清单/事件时间线/当事人图谱之一，不随包走）。
  await expect(tabs.getByRole('tab', { name: '修订预览' })).toHaveCount(0);
  await tabs.getByRole('tab', { name: '结构化产出' }).click();
  const degraded = page.getByTestId('vertical-artifact-unloaded');
  await expect(degraded).toBeVisible();
  const degradedTitle = await degraded.locator('h3').innerText();
  expect(['卷宗清单', '事件时间线', '当事人图谱']).toContain(degradedTitle);
  await expect(degraded.getByTestId('vertical-artifact-unloaded-hint')).toContainText('法律包');
  await expect(degraded.getByTestId('vertical-artifact-unloaded-hint')).not.toContainText('legal 包');

  // ④ 重载（真实加载动作）：结构化视图恢复（零迁移——产物在册，宿主资产不随包走）。
  await openMatterPackDialog(page);
  await page.getByTestId('matter-pack-option-legal').check();
  await page.getByTestId('matter-pack-apply').click();
  await expect(page.getByTestId('matter-pack-dialog')).toBeHidden();
  await tabs.getByRole('tab', { name: '时间线' }).click();
  await expect(timeline).toBeVisible({ timeout: 15000 });
  await expect(timeline).toContainText('双方签署设备采购合同');
});

// ── ④ 准入集与可交互加载集分层（ADR-015 决定三 2026-08-08 补记）──────────
// PM 只完成 schema/catalog（descriptor 零 scenario、零 promptSegment）：全局目录须诚实标注
// 「目录已收录，交互未开放」，建案处与包设置处都不得把它列成普通「加载」项；而历史上已经
// 绑了 PM 的 matter 不迁移、不清空、不判未准入——诚实显示且既有产物仍可读。

test('④ PM 分层：目录诚实标注、两处选择面均不可选、历史 PM 绑定诚实只读', async ({ page }) => {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: CASE_LIST_KEY,
    payload: {
      version: 1,
      cases: [{ id: 'pm-bound', title: '产品管理绑定案', kind: 'case', packBinding: ['pm'] }],
    },
  });
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();

  // 全局目录：两枚准入包都在册，但发行成熟度诚实可区分。
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await page.getByTestId('settings-nav-packages').click();
  const legalRow = page.getByTestId('settings-package-legal');
  const pmRow = page.getByTestId('settings-package-pm');
  await expect(legalRow).toHaveAttribute('data-availability', 'loadable');
  await expect(pmRow).toHaveAttribute('data-availability', 'catalog-only');
  await expect(pmRow).toContainText('目录已收录，交互未开放');
  await expect(pmRow).not.toContainText('可按工作区加载');
  await page.getByTestId('settings-close').click();

  // 建案处：只列 loadable，PM 不作为加载项、也不承诺场景随它出现。
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await expect(dialog.getByTestId('new-case-pack-legal')).toBeVisible();
  await expect(dialog.getByTestId('new-case-pack-pm')).toHaveCount(0);
  await expect(dialog).not.toContainText('加载产品管理包');
  await dialog.getByRole('button', { name: '取消' }).click();

  // 历史 PM 绑定：诚实显示「已绑定 · 仅目录与既有产物可用」，不判未准入、不冒充完整加载。
  await page.getByTestId('case-card-pm-bound').getByRole('button', { name: '产品管理绑定案', exact: true }).click();
  const stateRow = page.getByTestId('rail-pack-state-pm-bound');
  await expect(stateRow).toContainText('已绑定：产品管理包 · 仅目录与既有产物可用');
  await expect(stateRow).not.toContainText('已加载');
  await expect(page.getByTestId('matter-binding-failure')).toHaveCount(0);

  // 零 PM 场景入口；Legal 面也不因全局准入而漏进来。
  await expect(page.getByTestId('scene-unloaded-hint')).toBeVisible();
  await expect(page.getByTestId('scene-legal.S1')).toHaveCount(0);
  await expect(page.getByTestId('scene-legal.S3')).toHaveCount(0);

  // 包设置处：可保持、可清绑、可改绑 Legal，唯独不能新选 PM。
  await openMatterPackDialog(page);
  const packDialog = page.getByTestId('matter-pack-dialog');
  await expect(packDialog.getByTestId('matter-pack-state')).toContainText('仅目录与既有产物可用');
  await expect(packDialog.getByTestId('matter-pack-option-pm')).toHaveCount(0);
  await expect(packDialog.getByTestId('matter-pack-option-keep')).toBeChecked();
  // 3R ①：keep 态的说明文案对 catalog-only 诚实——零场景／结构化面承诺。
  const packNote = packDialog.getByTestId('matter-pack-note');
  await expect(packNote).toContainText('既有产物继续可读');
  await expect(packNote).toContainText('交互场景未开放');
  await expect(packNote).not.toContainText('结构化');
  await expect(packDialog).not.toContainText('结构化工作面与对应场景随包出现');
  // 不加载态只说资产不删除；Legal 态才恢复加载后能力说明。
  await packDialog.getByTestId('matter-pack-option-none').check();
  await expect(packNote).toContainText('不删除已有产出');
  await expect(packNote).not.toContainText('随包出现');
  await packDialog.getByTestId('matter-pack-option-legal').check();
  await expect(packNote).toContainText('结构化工作面与对应场景随包出现');
  await packDialog.getByTestId('matter-pack-apply').click();
  await expect(packDialog).toBeHidden();
  await expect(page.getByTestId('rail-pack-state-pm-bound')).toContainText('已加载：法律包');
});
