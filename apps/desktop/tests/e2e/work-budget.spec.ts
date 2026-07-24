import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

const GRANT_ID = 'grant-budget';
const CONTRACT = '# 合同\n\n第一条 买方应于验收后三十日内付款。';
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
  await page.evaluate(({ grantId, contract }) => {
    (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost
      .setFile(grantId, '合同.md', new TextEncoder().encode(contract));
  }, { grantId: GRANT_ID, contract: CONTRACT });
  await page.evaluate((result) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(result);
  }, authorize);
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: '合同.md' })).toHaveAttribute('data-status', 'ready');
  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('测试相对方');
  await page.getByTestId('s3-run').click();
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
  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('work-recover')).toBeVisible();
  await page.getByTestId('work-recover-run').click();
  const failure = page.getByTestId('progress-scenario-failure');
  await expect(failure).toContainText(expected);
  await expect(failure.getByRole('button')).toHaveCount(0);
  await expect(page.getByTestId('work-recover')).toHaveCount(0);
  await page.getByRole('button', { name: '起草答辩状', exact: true }).click();
  await page.getByTestId('scene-work-review').click();
  await expect(page.getByTestId('work-recover')).toHaveCount(0);
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
