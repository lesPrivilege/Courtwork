import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * CASE-PERSIST-1（真机试点前置，WORK-LIVE-REPLAY-1 诚实留痕指出）：案件列表跨重启持久。
 *
 * 核心退出证据是**三层重建**——`page.reload()`（此前 WORK-LIVE-REPLAY-1 只能「切案」因案件列表不持久）后：
 *  1. grant 案回侧栏（案件列表元数据持久）；
 *  2. caseBinding 重建（grantId → grant 绑定，非 unbound）；
 *  3.（有持久 work session ref 时）恢复入口可达。
 *
 * 浏览器 E2E 无原生 picker / 文件系统 / provider：授权、原件、Work turn 均由 window 樁承载，重载即清空
 * （镜像真机耐久宿主的**对立面**）——故重载后须**重新播种 grant + 重新入库**，模拟真机跨重启仍在的
 * host-grants.json（host_auth）与 MaterialStore app-data。localStorage（案件列表 / 会话指针）是唯一跨重载存活面。
 */

const GRANT_ID = 'grant-cp1';
const LABEL = '合同案卷夹';
const CONTRACT = '# 设备采购合同\n\n第一条 付款：买方应于验收后三十日内付清全部款项。';
const QUOTE = '买方应于验收后三十日内付清全部款项。';
const CASE_LIST_KEY = 'courtwork.case-list.v1';

type HostAuthHooks = { reset(): void; setGrants(grants: Array<{ grantId: string; label: string }>): void; setNextAuthorize(result: unknown): void };
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

async function setGrants(page: Page) {
  await page.evaluate(({ grantId, label }) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setGrants([{ grantId, label }]);
  }, { grantId: GRANT_ID, label: LABEL });
}

async function setNextAuthorize(page: Page) {
  await page.evaluate(({ grantId, label }) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({ status: 'granted', grant: { grantId, label } });
  }, { grantId: GRANT_ID, label: LABEL });
}

async function setContractFile(page: Page) {
  await page.evaluate(({ grantId, content }) => {
    const bytes = new TextEncoder().encode(content);
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, '设备采购合同.md', bytes);
  }, { grantId: GRANT_ID, content: CONTRACT });
}

/** 樁化一次成功的合同审查 turn：产出引语可解析的 RiskList（1 高风险），run 停在暂停门禁（保留可恢复指针）。 */
async function setSuccessTurnStub(page: Page) {
  await page.evaluate((exactQuote) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown }) => {
      const text = JSON.stringify(input.request);
      const match = text.match(/材料:开始 fileId=([\w-]+)/);
      const fileId = match ? match[1] : 'unknown';
      const artifact = {
        caseId: 'contract-review',
        risks: [
          {
            id: 'risk-1',
            description: '付款期限较长，回款风险偏高',
            level: 'high',
            basis: [{ citation: '第一条 付款', quoteClaims: [{ fileId, exactQuote }] }],
            dispositionStatus: 'pending',
          },
        ],
      };
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: 'e2e-stub',
        modelId: 'e2e-stub',
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({ target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' }, artifact }),
        finishReason: 'stop',
        completedAt: '2026-07-17T00:00:00.000Z',
      };
    });
  }, QUOTE);
}

/** 经新建案对话 + 宿主授权建一枚 grant 案（renderer 只见 label，无绝对路径）。返回其 caseId。 */
async function createGrantCase(page: Page): Promise<string> {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
  const caseId = await page.evaluate(() => localStorage.getItem('courtwork.selected-case-id'));
  expect(caseId).toBeTruthy();
  return caseId as string;
}

/** 就地入库合同原件（Composer「Add folder」→ 宿主授权 + MaterialStore 入库）。 */
async function ingestContract(page: Page) {
  await setContractFile(page);
  await setNextAuthorize(page);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' })).toHaveAttribute('data-status', 'ready');
}

/** 重载后落回欢迎态并等侧栏就绪（不点 welcome-demo-start，避免选中 demo 案）。 */
async function settleAfterReload(page: Page) {
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible().catch(() => false)) {
    await setup.getByRole('button', { name: '先查看演示' }).click().catch(() => undefined);
  }
  await page.getByTestId('case-rail').waitFor();
  await page.mouse.move(0, 0);
}

test('三层重建：重载后 grant 案回侧栏 → 绑定重建 → 恢复入口可达', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page);
  const grantCaseId = await createGrantCase(page);
  await ingestContract(page);

  // 运行到暂停门禁——run 启动即持久化最小恢复指针（work-session.v1）。
  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  await expect(page.getByTestId('revision-panel')).toContainText('付款期限较长');

  // 真跨重载（WORK-LIVE-REPLAY-1 只能「切案」，本单使之成真）——内存樁宿主全部清空。
  await page.reload();
  await settleAfterReload(page);
  // 镜像真机跨重启仍在的耐久面：host-grants.json（授权）+ MaterialStore（原件）。
  await setGrants(page);

  // 层一：grant 案回侧栏（案件列表元数据持久，非恒挂 demo）。
  const card = page.getByTestId(`case-card-${grantCaseId}`);
  await expect(card).toBeVisible();
  await expect(page.getByTestId('case-card-demo-linjiang')).toBeVisible();

  // 选中该案。
  await card.locator('button.case-card-main').click();
  // 层二：caseBinding 重建为 grant（宿主授权仍在 → 非失效态；grantId 解析成立）。
  await expect(card).toHaveAttribute('data-grant-invalid', 'false');

  // 重新入库（镜像 MaterialStore app-data 跨重启存活），使合同审查启动器重现。
  await ingestContract(page);
  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('s3-launcher')).toBeVisible();

  // 层三：恢复入口可达——恢复指针从存活的 localStorage 复读，恢复控件呈现（reachable）。
  await expect(page.getByTestId('work-recover')).toBeVisible();
  await expect(page.getByTestId('work-recover-run')).toBeVisible();
});

test('失效 grant 显式态：重载后宿主查无授权 → 案不静默消失，显式失效可移除', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  const grantCaseId = await createGrantCase(page);

  // 真跨重载：内存樁宿主清空且**不重新播种** grant——模拟真机文件夹被移动/删除、卷卸载或撤权。
  await page.reload();
  await settleAfterReload(page);

  // 案未静默消失：仍在侧栏，且显式失效态（宿主查无该 grantId）。
  const card = page.getByTestId(`case-card-${grantCaseId}`);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-grant-invalid', 'true');
  const invalid = page.getByTestId(`case-grant-invalid-${grantCaseId}`);
  await expect(invalid).toBeVisible();
  await expect(invalid).toContainText('授权已失效');

  // 可移除：移除后案从侧栏消失，且持久层同步清出（创建写入/移除清除对称）。
  await page.getByTestId(`case-remove-${grantCaseId}`).click();
  await expect(card).toHaveCount(0);
  const persisted = await page.evaluate((key) => localStorage.getItem(key) ?? '', CASE_LIST_KEY);
  expect(persisted).not.toContain(grantCaseId);
});

test('demo 恒挂不入持久 + 归档即清除：重载后归档案不回侧栏，仅 demo 恒在', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  const grantCaseId = await createGrantCase(page);

  // 归档该 grant 案（轻确认）——归档即从持久投影剔除（与创建写入对称）。
  const card = page.getByTestId(`case-card-${grantCaseId}`);
  await card.hover();
  await card.getByTestId('archive-trigger').click();
  await page.getByRole('button', { name: /归档/ }).last().click();
  await expect(card).toHaveClass(/archived/);

  await page.reload();
  await settleAfterReload(page);

  // 归档案不回侧栏（持久层已清）；demo 恒挂案由 App 固定注入（非来自持久层），始终在场。
  await expect(page.getByTestId(`case-card-${grantCaseId}`)).toHaveCount(0);
  await expect(page.getByTestId('case-card-demo-linjiang')).toBeVisible();
  // 持久层不含 demo（恒挂语义不变），也不含已归档案。
  const persisted = await page.evaluate((key) => localStorage.getItem(key) ?? '', CASE_LIST_KEY);
  expect(persisted).not.toContain(grantCaseId);
  expect(persisted).not.toContain('demo-linjiang');
});
