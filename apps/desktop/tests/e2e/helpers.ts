import type { Page } from '@playwright/test';

/**
 * 打开工作台并移开光标。
 * D-1 验收根因：openWorkbench 点「先查看演示」后光标停在面板中心，
 * 后续打开的浮层（命令面板等）若带 onMouseEnter 高亮，会抢占初始选中态。
 * 凡依赖键盘导航 / 初始 aria-selected 的用例，必须先 mouse.move(0,0)。
 */
export async function openWorkbench(page: Page) {
  await page.goto('/');
  const setup = page.getByTestId('provider-setup');
  if (await setup.isVisible()) {
    await setup.getByRole('button', { name: '先查看演示' }).click();
  }
  const welcomeDemo = page.getByTestId('welcome-demo-start');
  if (await welcomeDemo.isVisible()) {
    await welcomeDemo.click();
    const onboarding = page.getByTestId('provider-setup');
    if (await onboarding.isVisible()) await page.getByTestId('provider-skip').click();
    await page.getByTestId('event-stream').waitFor();
  }
  // 加固：点击后光标可能仍悬在中心区域
  await page.mouse.move(0, 0);
}

/**
 * 走完 S3 六项风险处置，停在编译前。
 * CONFIRM-GRANULARITY-1：批量确认入口 feature-off，原「批量 4 项」一键流程改为
 * risk-02/04/05/06 逐条确认——这四项 mode='batch'，App.tsx individualReady 对非
 * individual mode 短路为 true，无需先展开依据即可直接「确认此项」（既有行为，
 * 与 workbench.spec.ts 既存「法理之线」用例同构）；risk-03/risk-01 仍为 individual
 * mode，须先展开依据。
 */
export async function disposeAllDemoRisks(page: Page) {
  const panel = page.getByTestId('revision-panel');
  for (const riskId of ['risk-02', 'risk-04', 'risk-05', 'risk-06']) {
    await panel.locator(`[data-risk-id="${riskId}"]`).click();
    await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  }
  await panel.locator('[data-risk-id="risk-03"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  await panel.locator('[data-risk-id="risk-01"]').click();
  await panel.getByRole('button', { name: /查看引语/ }).click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
}

/**
 * OUTPUT-CONFIRM-UI-1：确认全部风险后，risk-02/risk-06 的批注未能落到文书上，
 * 逐条确认后才生成产物（不再静默阻断在落盘门禁处，也不静默跳过交付）。
 */
export async function confirmNonAppliedRevisions(page: Page) {
  const nonApplied = page.getByTestId('nonapplied-confirm');
  await nonApplied.waitFor();
  const confirmButtons = nonApplied.getByTestId('confirm-nonapplied');
  const count = await confirmButtons.count();
  for (let i = 0; i < count; i += 1) {
    await confirmButtons.nth(i).click();
  }
}

/** LAUNCH-FIX：走完 S3 六项门禁，逐条确认未落点修订，等待真实 output 写入桥回报产物存在。 */
export async function confirmDemoReview(page: Page) {
  await disposeAllDemoRisks(page);
  await confirmNonAppliedRevisions(page);
  await page.getByTestId('output-docx-card').waitFor();
}

/** 十四章：从浏览器态返回四模块列（模块级断言前调用）。 */
export async function openModuleList(page: Page) {
  const back = page.getByTestId('preview-back');
  if (await back.isVisible()) await back.click();
  await page.getByTestId('utility-rail').waitFor();
}

export async function createNamedCase(page: Page, name: string) {
  await page.getByTestId('new-case-open').click();
  const dialog = page.getByTestId('new-case-dialog');
  await dialog.getByRole('button', { name: '不使用文件夹，直接命名' }).click();
  await dialog.getByRole('textbox', { name: '案件名称' }).fill(name);
  await dialog.getByRole('button', { name: '创建案件' }).click();
  await dialog.waitFor({ state: 'hidden' }).catch(() => undefined);
}

/** 需要真实发送/model-config 的旧回归须先显式授权；冷启动本身保持安静。 */
export async function connectProvider(page: Page) {
  const trigger = page.getByTestId('composer-provider');
  if (await trigger.getAttribute('data-phase') === 'ready') return;
  // 2026-07-12 connect 路由：非首启一律 Settings 内嵌凭证面（首启引导卡另测于 rp29/goal1）
  await trigger.click();
  const embed = page.getByTestId('settings-credential-embed');
  await embed.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
  await embed.getByTestId('settings-credential-validate').click();
  await page.getByTestId('settings-credential-verified').waitFor();
  await page.keyboard.press('Escape');
  await page.getByTestId('settings-page').waitFor({ state: 'hidden' });
}

export async function installChatStream(page: Page, script: {
  content?: string;
  chunks?: string[];
  reasoning?: string;
  failure?: { kind: 'auth' | 'network' | 'rate_limit' | 'invalid_response'; message: string; retryable?: boolean };
  usage?: { inputTokens: number; outputTokens: number };
}) {
  await page.evaluate((input) => {
    type StreamContext = { requestId: string; providerId: string; modelId: string };
    type StreamFactory = (context: StreamContext) => AsyncIterable<unknown>;
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setStreamFactory(factory: StreamFactory | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat stream hooks missing');
    hooks.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
      let seq = 0;
      yield { type: 'started', requestId, seq: seq++, providerId, modelId };
      if (input.reasoning) yield { type: 'reasoning_delta', requestId, seq: seq++, delta: input.reasoning };
      if (input.failure) {
        yield { type: 'failed', requestId, seq, ...input.failure, retryable: input.failure.retryable ?? false };
        return;
      }
      for (const delta of input.chunks ?? [input.content ?? '完成']) {
        yield { type: 'content_delta', requestId, seq: seq++, delta };
      }
      if (input.usage) yield { type: 'usage', requestId, seq: seq++, usage: input.usage };
      yield { type: 'completed', requestId, seq, finishReason: 'stop' };
    });
  }, script);
}

/** RP-2.7：工作稿/整理等通用文件动作只保留在 Working folders 单一宿主。 */
export async function openWorkingFolders(page: Page) {
  const tree = page.getByTestId('working-folders-tree');
  if (await tree.isVisible().catch(() => false)) return;
  await openModuleList(page);
  await page.getByTestId('module-working-folders-toggle').click();
  await tree.waitFor();
}

/**
 * 读 :root 设计 token 并归一为 computed color 形态（`rgb(r, g, b)`），供颜色断言消费。
 *
 * 皮层迁移纪律（B1 色阶批）：颜色断言一律走 token 相对读取，不写字面值——字面值把断言
 * 钉死在某一版皮层上，换色即全线误红，掩盖真实回归。判例同 chrome-in-card.spec.ts:48 与
 * pilot-layout.spec.ts:185 的 measure token 读取。
 *
 * 归一走临时探针元素而非手工解析：token 值可能是 hex、rgb() 或 color-mix()，只有交给
 * 浏览器求值才能与 toHaveCSS 返回的 computed 形态精确对齐。
 */
export async function tokenColor(page: Page, name: string): Promise<string> {
  return page.evaluate((token) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    if (!raw) throw new Error(`设计 token ${token} 未定义`);
    const probe = document.createElement('span');
    probe.style.color = raw;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, name);
}
