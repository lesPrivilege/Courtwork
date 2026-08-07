import { expect, test, type Page } from '@playwright/test';
import { compileDraftToDocx } from '@courtwork/output';
import { openWorkbench } from './helpers';

const GRANT_ID = 'grant-budget';
/**
 * CONTRACT-OUTPUT-TRUTH-1 机械迁移：主合同必须是**真实 DOCX**（mediaType 精确判据）且由用户显式选定。
 * 在 Node 侧用 output 既有 draft 编译器铸真 docx 再喂宿主樁——不拿 Markdown 冒充 Word。
 */
const PRIMARY_FILE = '合同.docx';
const CONTRACT_DOCX = Array.from(new Uint8Array(compileDraftToDocx({
  title: '合同',
  paragraphs: ['第一条 买方应于验收后三十日内付款。'],
})));

/** 显式选定主合同：默认不选，未选时起跑钮禁用。 */
async function selectPrimaryContract(page: Page) {
  const select = page.getByTestId('precheck-field-primaryContractId');
  await expect(select).toBeEnabled();
  await select.selectOption({ label: PRIMARY_FILE });
}
const QUOTE = '买方应于验收后三十日内付款。';

type HostAuthHooks = { reset(): void; setNextAuthorize(result: unknown): void };
type MaterialHooks = { reset(): void; setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
type WorkHooks = {
  reset(): void;
  setTurnStub(stub: unknown): void;
  readState(ref: { caseId: string; sessionId: string }): Promise<{ found: false } | { found: true; bytes: Uint8Array }>;
};

async function prepare(page: Page, maxUsd: number, mode: 'known' | 'mismatch' | 'missing-usage' | 'repair') {
  await page.addInitScript((limit) => {
    localStorage.setItem('courtwork.settings.v1', JSON.stringify({
      runtimeGuard: { maxUsd: limit },
      privacy: { telemetryEnabled: true, behaviorDataOptIn: false },
      appearance: { themeMode: 'system' },
    }));
    (window as unknown as { __budgetCalls: number }).__budgetCalls = 0;
  }, maxUsd);
  await openWorkbench(page);
  await page.evaluate(({ exactQuote, stubMode }) => {
    const w = window as unknown as {
      __courtworkHostAuth: HostAuthHooks;
      __courtworkMaterialHost: MaterialHooks;
      __courtworkWorkHooks: WorkHooks;
      __budgetCalls: number;
    };
    w.__courtworkHostAuth.reset();
    w.__courtworkMaterialHost.reset();
    w.__courtworkWorkHooks.reset();
    w.__courtworkWorkHooks.setTurnStub((input: {
      turnId: string;
      providerRequestId: string;
      request: unknown;
      modelRoute: { providerId: string; modelId: string };
    }) => {
      w.__budgetCalls += 1;
      const call = w.__budgetCalls;
      const text = JSON.stringify(input.request);
      const fileId = text.match(/材料:开始 fileId=([\w-]+)/)?.[1] ?? 'unknown';
      const quote = stubMode === 'repair' && call === 1
        ? '无法定位的引语'
        : stubMode === 'missing-usage'
          ? '无法定位的引语'
          : exactQuote;
      const artifact = {
        caseId: 'contract-review',
        risks: [{
          id: 'risk-1',
          description: '付款风险',
          level: 'high',
          basis: [{ citation: '第一条', quoteClaims: [{ fileId, exactQuote: quote }] }],
          dispositionStatus: 'pending',
        }],
      };
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: stubMode === 'mismatch' ? 'wrong-provider' : input.modelRoute.providerId,
        modelId: stubMode === 'mismatch' ? 'wrong-model' : input.modelRoute.modelId,
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({
          target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
          artifact,
        }),
        ...(stubMode === 'missing-usage' ? {} : { usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } }),
        finishReason: 'stop',
        completedAt: '2026-07-24T00:00:00.000Z',
      };
    });
  }, { exactQuote: QUOTE, stubMode: mode });

  const authorize = { status: 'granted', grant: { grantId: GRANT_ID, label: '预算案卷' } };
  await page.getByTestId('new-case-open').click();
  await page.evaluate((result) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(result);
  }, authorize);
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await page.evaluate(({ grantId, fileName, data }) => {
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost
      .setFile(grantId, fileName, new Uint8Array(data));
  }, { grantId: GRANT_ID, fileName: PRIMARY_FILE, data: CONTRACT_DOCX });
  await page.evaluate((result) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(result);
  }, authorize);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: PRIMARY_FILE })).toHaveAttribute('data-status', 'ready');
  await page.getByTestId('scene-legal.S3').click();
  await selectPrimaryContract(page);
  await page.getByTestId('precheck-field-subject').fill('测试相对方');
  await page.getByTestId('precheck-submit').click();
}

async function calls(page: Page) {
  return page.evaluate(() => (window as unknown as { __budgetCalls: number }).__budgetCalls);
}

async function persistedRef(page: Page) {
  const caseId = await page.evaluate(() => localStorage.getItem('courtwork.selected-case-id'));
  if (!caseId) throw new Error('missing selected case');
  const raw = await page.evaluate(() => localStorage.getItem('courtwork.work-session.v1'));
  if (!raw) throw new Error('missing durable pointer');
  const parsed = JSON.parse(raw) as { sessions: Record<string, { sessionId: string }> };
  return { caseId, sessionId: parsed.sessions[caseId]!.sessionId };
}

async function replayFailureAfterCaseSwitch(page: Page, expected: RegExp) {
  const ref = await persistedRef(page);
  await page.getByTestId('case-card-demo-linjiang').locator('button.case-card-main').click();
  await page.getByTestId(`case-card-${ref.caseId}`).locator('button.case-card-main').click();
  await page.getByTestId('scene-legal.S3').click();
  await expect(page.getByTestId('precheck-recover')).toBeVisible();
  await page.getByTestId('precheck-recover-run').click();
  const failure = page.getByTestId('progress-scenario-failure');
  await expect(failure).toContainText(expected);
  await expect(failure.getByRole('button')).toHaveCount(0);
  // 恢复后工作面呈现失败进度、起跑面整体不在场，故恢复入口此刻结构性缺席（与指针无关）。
  await expect(page.getByTestId('precheck-recover')).toHaveCount(0);
  await page.getByRole('button', { name: '起草答辩状', exact: true }).click();
  await page.getByTestId('scene-legal.S3').click();
  // CONTRACT-TRACE-1：durable failed **保留**指针（「读不到 ≠ 不存在」的对称面：失败的账本仍是
  // 账本）。旧断言在这里写 0，编码的是「指针在、入口却不显示」——恢复入口不随指针刷新的陈旧 UI，
  // 与下一行自己断言的「pointer 仍在」互相矛盾。按本意改写为二者一致。
  await expect(page.getByTestId('precheck-recover')).toBeVisible();
  const pointer = await page.evaluate(() => localStorage.getItem('courtwork.work-session.v1'));
  expect(JSON.parse(pointer!).sessions[ref.caseId]).toBeTruthy();
  return ref;
}

test('known-price 首 Turn 超金额只调用一次并持久显示 runtime_limit', async ({ page }) => {
  await prepare(page, 0.01, 'known');
  expect(await calls(page)).toBe(1);
  await replayFailureAfterCaseSwitch(page, /金额上限/);
});

test('首 Turn route mismatch 只调用一次并以 configuration 同批终止', async ({ page }) => {
  await prepare(page, 5, 'mismatch');
  expect(await calls(page)).toBe(1);
  await expect(page.getByTestId('work-cancel')).toHaveCount(0);
  const ref = await persistedRef(page);
  const envelope = await page.evaluate(async (target) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    const result = await hooks.readState(target);
    if (!result.found) throw new Error('missing state');
    return JSON.parse(new TextDecoder().decode(result.bytes)) as {
      revision: number;
      turnEntries: Array<{ providerId: string; modelId: string }>;
      runtimeBudget: { consumed: { costCoverage: string } };
      events: Array<{ type: string; reason?: string }>;
    };
  }, ref);
  // S3 真链：header → party-verify tool budget → turn_linked+step → terminal+budget+configuration。
  expect(envelope.revision).toBe(4);
  expect(envelope.turnEntries.at(-1)).toMatchObject({ providerId: 'wrong-provider', modelId: 'wrong-model' });
  expect(envelope.runtimeBudget.consumed.costCoverage).toBe('partial');
  expect(envelope.events.at(-1)).toMatchObject({ type: 'scenario_failed', reason: 'configuration' });
  await replayFailureAfterCaseSwitch(page, /预算配置无法继续/);
});

test('不可解析引用且 usage 缺失时 repair attempt2 在 provider 前阻断', async ({ page }) => {
  await prepare(page, 5, 'missing-usage');
  expect(await calls(page)).toBe(1);
  await expect(page.getByTestId('revision-panel')).toHaveCount(0);
  await replayFailureAfterCaseSwitch(page, /成本覆盖不完整/);
});

test('正常 citation repair 携完整 usage 会调用两次并到达 RiskList gate', async ({ page }) => {
  await prepare(page, 50, 'repair');
  await expect(page.getByTestId('revision-panel')).toBeVisible();
  expect(await calls(page)).toBe(2);
  await expect(page.getByTestId('progress-scenario-failure')).toHaveCount(0);
});
