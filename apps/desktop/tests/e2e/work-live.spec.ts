import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * WORK-LIVE-1：grant（真实）案的 production 合同审查全链——run → 真实 RiskList → live gate 逐条审阅
 * → resume → docx 落盘，零 recording/demo 原文。
 *
 * 浏览器 E2E 无原生 picker / 文件系统 / provider：授权由 `window.__courtworkHostAuth`、
 * 就地原件由 `window.__courtworkMaterialHost`、Work turn 由 `window.__courtworkWorkHooks` 樁承载
 * （DEV+E2E only，绝不进正式 Tauri composition）。真机真实材料链的人工试点属 Stage 0 退出证据（见 SPEC）。
 */

const GRANT_ID = 'grant-wl1';
const CONTRACT = '# 设备采购合同\n\n第一条 付款：买方应于验收后三十日内付清全部款项。\n\n第二条 交付：卖方逾期交付的，按日承担违约金。';
const QUOTE = '买方应于验收后三十日内付清全部款项。';
const NO_ABSOLUTE_PATH = /[/\\]Users[/\\]|[/\\]private[/\\]|[A-Za-z]:\\/;

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

async function setNextAuthorize(page: Page, result: unknown) {
  await page.evaluate((next) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(next);
  }, result);
}

async function setFile(page: Page, relativePath: string, text: string) {
  await page.evaluate(
    ({ grantId, path, content }) => {
      const bytes = new TextEncoder().encode(content);
      (window as unknown as { __courtworkMaterialHost: MaterialHooks }).__courtworkMaterialHost.setFile(grantId, path, bytes);
    },
    { grantId: GRANT_ID, path: relativePath, content: text },
  );
}

/** 樁化一次成功的合同审查 turn：从组装请求提取材料 fileId，产出引语可解析的 RiskListDraft（1 高风险）。 */
async function setSuccessTurnStub(page: Page, quote: string) {
  await page.evaluate((exactQuote) => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; request: unknown; modelRoute: { providerId: string; modelId: string } }) => {
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
        providerId: input.modelRoute.providerId,
        modelId: input.modelRoute.modelId,
        usage: { inputTokens: 1, outputTokens: 1 },
        reasoning: { status: 'absent' },
        assistantMessage: JSON.stringify({ target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' }, artifact }),
        finishReason: 'stop',
        completedAt: '2026-07-17T00:00:00.000Z',
      };
    });
  }, quote);
}

/** 樁化一次挂起到取消的 turn：barrier② 已落盘 turn_linked 后阻塞，abort 时收敛为 canceled 终态。 */
async function setHangingTurnStub(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkWorkHooks: WorkHooks }).__courtworkWorkHooks;
    hooks.setTurnStub((input: { turnId: string; providerRequestId: string; signal?: AbortSignal; modelRoute: { providerId: string; modelId: string } }) =>
      new Promise((resolve) => {
        const onAbort = () => resolve({
          status: 'failed',
          turnId: input.turnId,
          providerRequestId: input.providerRequestId,
          providerId: input.modelRoute.providerId,
          modelId: input.modelRoute.modelId,
          reasoning: { status: 'absent' },
          failure: { kind: 'canceled', message: '已取消', retryable: false },
          failedAt: '2026-07-17T00:00:00.000Z',
        });
        if (input.signal?.aborted) onAbort();
        else input.signal?.addEventListener('abort', onAbort);
      }),
    );
  });
}

async function createGrantCase(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
  await setNextAuthorize(page, { status: 'granted', grant: { grantId: GRANT_ID, label: '合同案卷夹' } });
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);
}

async function ingestContract(page: Page) {
  await setFile(page, '设备采购合同.md', CONTRACT);
  await setNextAuthorize(page, { status: 'granted', grant: { grantId: GRANT_ID, label: '合同案卷夹' } });
  await page.getByTestId('composer-plus').first().click();
  await page.getByTestId('composer-plus-folder').first().click();
  await expect(page.getByTestId('material-item').filter({ hasText: '设备采购合同.md' })).toHaveAttribute('data-status', 'ready');
}

test('grant 案合同审查全链：真实材料 → 门禁审阅 → docx 落盘（零 recording）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await createGrantCase(page);
  await ingestContract(page);

  // 打开合同审查工作面 → 显式主体 preflight → 运行
  await page.getByTestId('scene-work-review').click();
  const launcher = page.getByTestId('s3-launcher');
  await expect(launcher).toBeVisible();
  // 缺主体时运行钮禁用（不默认补全，ADR-010 决定五）
  await expect(page.getByTestId('s3-run')).toBeDisabled();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  // 真实执行器产出的 RiskList 落审阅面（非 recording）
  const panel = page.getByTestId('revision-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('付款期限较长');

  // live gate 逐条审阅：高风险逐条确认（展开引语 → 确认此项）
  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();

  // resume → docx 终链落盘（写入走 grant 授权命令）
  const output = page.getByTestId('work-output-docx');
  await expect(output).toBeVisible({ timeout: 15000 });
  await expect(output).toContainText('合同审查报告.docx');
  await expect(output).toContainText('已写入本案「产出」目录');
  // 全程 source-neutral：工作面绝无绝对路径
  expect(await page.getByTestId('materials-zone').innerText()).not.toMatch(NO_ABSOLUTE_PATH);
});

test('grant 案运行中取消：canceled 终态，无 docx 落盘', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setHangingTurnStub(page);
  await createGrantCase(page);
  await ingestContract(page);

  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  // 运行中出现取消控件（run/cancel 控件接线）→ 取消
  const cancel = page.getByTestId('work-cancel');
  await expect(cancel).toBeVisible();
  await cancel.click();

  // 取消后无 docx 落盘（终态无残留 pending，产物零落盘）
  await expect(page.getByTestId('system-open-feedback')).toContainText('已停止合同审查');
  await expect(page.getByTestId('work-output-docx')).toHaveCount(0);
  await expect(page.getByTestId('work-cancel')).toHaveCount(0);
});

/** 切到演示案再切回目标 grant 案：清空 workSessionId（React 态），持久指针（localStorage）与会话内宿主信封存活。 */
async function switchAwayAndBack(page: Page, grantCaseId: string) {
  await page.getByTestId('case-card-demo-linjiang').locator('button.case-card-main').click();
  await page.getByTestId(`case-card-${grantCaseId}`).locator('button.case-card-main').click();
  // 重新打开审查工作面（切案后 grant 案 preview 关闭）——恢复入口据持久指针在此重现。
  await page.getByTestId('scene-work-review').click();
}

test('grant 案跨切案恢复：暂停态切走再回 → 恢复审查 → 水合投影等价 → 续行 resolve → docx（把跨重启试点变自动化用例）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await createGrantCase(page);
  await ingestContract(page);
  const grantCaseId = await page.evaluate(() => localStorage.getItem('courtwork.selected-case-id'));
  expect(grantCaseId).toBeTruthy();

  // 运行到暂停门禁（run→gate 中途）——run 启动即持久化恢复指针。
  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  const panel = page.getByTestId('revision-panel');
  await expect(panel).toContainText('付款期限较长');

  // 切走再回（workSessionId 清空；信封仍在会话内宿主，镜像真机 Tauri 跨重启耐久）。
  await switchAwayAndBack(page, grantCaseId as string);

  // 恢复入口据持久指针重现（此前「全 App 对 workCommand.replay 零消费点」是 WORK-HOST-1 驳回根因）。
  const recover = page.getByTestId('work-recover');
  await expect(recover).toBeVisible();
  await page.getByTestId('work-recover-run').click();

  // 水合后审阅面重现（与重启前等价：同一风险条目）+ 恢复入口消失（riskList 已水合）。
  await expect(panel).toContainText('付款期限较长');
  await expect(recover).toHaveCount(0);

  // 续行 resolve → docx 终链落盘（与不切案路径等价）。
  await panel.locator('[data-risk-id="risk-1"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  const output = page.getByTestId('work-output-docx');
  await expect(output).toBeVisible({ timeout: 15000 });
  await expect(output).toContainText('已写入本案「产出」目录');
});

test('grant 案恢复失效诚实：信封已不存在 → 中性失效反馈 + 清残 ref，零静默、零 docx', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await createGrantCase(page);
  await ingestContract(page);
  const grantCaseId = await page.evaluate(() => localStorage.getItem('courtwork.selected-case-id'));

  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  await expect(page.getByTestId('revision-panel')).toContainText('付款期限较长');

  // 模拟信封跨重启丢失：重置内存参考宿主（持久指针 localStorage 仍在，模拟 ref 存活而信封缺失）。
  await page.evaluate(() => (window as unknown as { __courtworkWorkHooks: { reset(): void } }).__courtworkWorkHooks.reset());

  await switchAwayAndBack(page, grantCaseId as string);

  const recover = page.getByTestId('work-recover');
  await expect(recover).toBeVisible();
  await page.getByTestId('work-recover-run').click();

  // 显式失效（info 中性态，非错误红条）+ 恢复入口消失（残 ref 已清）+ 零 docx。
  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toContainText('未找到可继续的合同审查进度');
  await expect(feedback).toHaveClass(/\binfo\b/);
  await expect(feedback).not.toHaveClass(/\berror\b/);
  await expect(recover).toHaveCount(0);
  await expect(page.getByTestId('work-output-docx')).toHaveCount(0);
});

test('grant 案未装配（无 transport 且无 stub）：start → rejected/not_configured 中性反馈，非错误红条', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  // 刻意不 setTurnStub：浏览器 E2E 无 provider transport，isConfigured=false → production composition 未装配。
  await createGrantCase(page);
  await ingestContract(page);

  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();

  // ADR-010 决定一：未装配 → rejected/not_configured 的中性「未就绪」产品语言反馈（不是 failed/internal 错误红条）。
  const feedback = page.getByTestId('system-open-feedback');
  await expect(feedback).toContainText('合同审查暂未就绪');
  await expect(feedback).toHaveClass(/\binfo\b/);
  await expect(feedback).not.toHaveClass(/\berror\b/);
  // 未装配即拒绝：零 docx 落盘、启动器仍在（未进入审阅面）。
  await expect(page.getByTestId('work-output-docx')).toHaveCount(0);
  await expect(page.getByTestId('s3-launcher')).toBeVisible();
});

/**
 * PILOT-LIVE-1 B：grant 案的显式导航必须打开工作面。真机首轮试点缺陷——「起草答辩状」「更多」
 * 等场景入口点击零变化（previewOpen 在 choosePrimaryView 内按 demo 判定，grant 案恒 false），
 * 命令链自始至终未被触达；未开通工作面的显式提示也因此永不可达。
 */
test('grant 案点「起草答辩状」打开工作面并显式提示未适用（非零反应）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await createGrantCase(page);

  // 新建 grant 案初始停四模块列（十四章：非 demo 空案停大纲引导）
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
  // 与真机操作同径：窄容器下「起草答辩状」驻「更多」popover（真机反馈原话即「起草答辩状/更多」）
  await page.getByTestId('scene-more').click();
  await page.getByTestId('scene-more-popover').getByRole('button', { name: '起草答辩状' }).click();

  // 点击必须有可观察结果：工作面打开，且是显式「未适用」提示而非伪装可用
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('preview-host')).toContainText('该工作面暂不适用于合同审查');
});

test('grant 案审阅面板内切换 tab 不关闭工作面', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await setSuccessTurnStub(page, QUOTE);
  await createGrantCase(page);
  await ingestContract(page);

  await page.getByTestId('scene-work-review').click();
  await page.getByTestId('s3-subject').fill('起云智能装备股份有限公司');
  await page.getByTestId('s3-run').click();
  await expect(page.getByTestId('revision-panel')).toBeVisible();

  // 面板内切 tab（起草）不得把整个工作面闪回大纲列——切到的面未适用时显式提示
  await page.getByTestId('view-draft').click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('preview-host')).toContainText('该工作面暂不适用于合同审查');

  // 切回审阅 tab，审阅面完整回归（状态未被销毁）
  await page.getByTestId('view-revision').click();
  await expect(page.getByTestId('revision-panel')).toBeVisible();
  await expect(page.getByTestId('revision-panel')).toContainText('付款期限较长');
});
