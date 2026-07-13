import { expect, test } from '@playwright/test';
import { connectProvider, installChatStream, openWorkbench } from './helpers';

/** GOAL-1 壳与链路：#35/36 dock 底纸与贯通、#37 五钮、#39 空态三态、#43/44 凭证内嵌与就地呈现、popover 收敛、chat 真 API。 */

test.describe('GOAL-1 · #43/#44 凭证面', () => {
  test('#43+#44a Settings 内嵌凭证面：验证全程 settings 稳定在场，结果就地呈现', async ({ page }) => {
    await openWorkbench(page);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('option', { name: 'Settings' }).click();
    await expect(page.getByTestId('settings-page')).toBeVisible();

    await page.getByTestId('settings-open-credentials').click();
    const embed = page.getByTestId('settings-credential-embed');
    await expect(embed).toBeVisible();
    await embed.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await embed.getByTestId('settings-credential-validate').click();

    // #44 契约：宿主稳定在场 + 就地绿徽；无任何浮层置换
    await expect(page.getByTestId('settings-credential-verified')).toBeVisible();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'ready');
  });

  test('#44b 引导卡（首启专属）：验证成功不自动关闭——绿徽 + 显式「开始使用」', async ({ page }) => {
    // connect 路由改判后引导卡只在首启出现；非首启一律 Settings 内嵌（#44a 已覆盖）
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    if (!(await dialog.isVisible())) await page.getByTestId('composer-provider').click();
    await dialog.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await dialog.getByRole('button', { name: 'Verify connection' }).click();
    await expect(dialog.getByTestId('provider-setup-verified')).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('provider-setup-done').click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('GOAL-1 · #35/#36 三卡一纸位形', () => {
  test('十四章双态：浏览器态右列唯一 Preview（back 回目录）；模块列四序含大纲', async ({ page }) => {
    await openWorkbench(page);
    // demo replay 自动进浏览器态：preview 唯一,模块列不在,back 在场
    await expect(page.getByTestId('preview-host')).toBeVisible();
    await expect(page.getByTestId('utility-rail')).toHaveCount(0);
    await expect(page.getByTestId('preview-close')).toHaveCount(0);
    // back → 模块列：Progress→Preview(大纲)→Working folders→Context 四序
    await page.getByTestId('preview-back').click();
    await expect(page.getByTestId('preview-host')).toHaveCount(0);
    const rail = page.getByTestId('utility-rail');
    await expect(rail).toHaveAttribute('data-mode', 'modules');
    const heads = rail.locator('.rail-module-head');
    await expect(heads.nth(0)).toContainText('Progress');
    await expect(heads.nth(1)).toContainText('Preview');
    await expect(heads.nth(2)).toContainText('Working folders');
    await expect(heads.nth(3)).toContainText('Context');
    // 大纲行（schema 编排声明渲染）→ 点击回浏览器态并落对应视图
    await expect(page.getByTestId('preview-outline')).toBeVisible();
    await page.getByTestId('outline-graph').click();
    await expect(page.getByTestId('preview-host')).toBeVisible();
    await expect(page.getByTestId('view-graph')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('GOAL-1 · #37/#39 composer 与空态', () => {
  test('#37 composer 沉底排恰五槽位；paste 收纳进 + 菜单', async ({ page }) => {
    await openWorkbench(page);
    const slots = page.locator('[data-composer-slot]');
    const slotNames = await slots.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-composer-slot')));
    // scope chip 为作用域信任件，不计钮排（拍板）；有绑定容器时不出现
    const buttons = slotNames.filter((name) => name !== 'scope');
    // 2026-07-12 省并：add-folder 撤（归「+」菜单）;底排四钮 + scope chip（不计）
    expect(buttons.sort()).toEqual(['add', 'provider', 'send', 'workmode']);
    await page.getByTestId('composer-plus').click();
    await expect(page.getByTestId('composer-paste')).toBeVisible();
  });

  test('#39 空态是引导面而非虚线占位框（断裂律三态）', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('segment-chat').click();
    const empty = page.getByTestId('chat-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveCSS('border-style', 'none');
  });
});

test.describe('GOAL-1 · popover 收敛纪律', () => {
  test('model-config 点别处自动收敛；Esc 同理', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('model-config-trigger').click();
    await expect(page.getByTestId('model-config-popover')).toBeVisible();
    await page.mouse.click(500, 260);
    await expect(page.getByTestId('model-config-popover')).toHaveCount(0);
    await page.getByTestId('model-config-trigger').click();
    await expect(page.getByTestId('model-config-popover')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('model-config-popover')).toHaveCount(0);
  });
});

test.describe('GOAL-1 · chat 面真 API 端到端', () => {
  test('发送 → 在途指示 → assistant 落格（含思考折叠）', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await installChatStream(page, { content: '已收到，这是真实链路的回复。', reasoning: '先梳理请求要点。' });
    await page.getByTestId('composer-input').fill('给我一句确认');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-assistant-message')).toBeVisible();
    await expect(page.getByTestId('chat-assistant-message')).toContainText('真实链路的回复');
    await expect(page.getByTestId('chat-reasoning')).toBeVisible();
    await expect(page.getByTestId('chat-pending')).toHaveCount(0);
  });

  test('失败轮诚实落格：分型文案 + 失败态，不假装成功', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await installChatStream(page, { failure: { kind: 'auth', message: '访问凭证未通过服务商验证，请检查后重试' } });
    await page.getByTestId('composer-input').fill('触发失败');
    await page.getByTestId('composer-send').click();
    const failed = page.getByTestId('chat-assistant-failed');
    await expect(failed).toBeVisible();
    await expect(failed).toContainText('访问凭证未通过服务商验证');
  });

  test('单飞行：同一渲染帧双击发送只产生一条在途请求', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await page.evaluate(() => {
      const scope = window as typeof window & {
        __courtworkChatHooks?: { setStreamFactory(factory: ((context: { requestId: string; providerId: string; modelId: string }) => AsyncIterable<unknown>) | null): void };
        __resolveHarnessFlight?: () => void;
        __harnessFlightCalls?: number;
      };
      scope.__harnessFlightCalls = 0;
      scope.__courtworkChatHooks?.setStreamFactory(async function* ({ requestId, providerId, modelId }) {
        scope.__harnessFlightCalls = (scope.__harnessFlightCalls ?? 0) + 1;
        yield { type: 'started', requestId, seq: 0, providerId, modelId };
        await new Promise<void>((resolve) => { scope.__resolveHarnessFlight = resolve; });
        yield { type: 'content_delta', requestId, seq: 1, delta: '完成' };
        yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
      });
    });

    await page.getByTestId('composer-input').fill('第一轮');
    await page.getByTestId('composer-send').evaluate((button) => {
      // 同一 JS task 内派发两次，第二次发生在 React 把 disabled 提交到 DOM 之前；
      // 只有 handleChatSend 的同步 ref 守卫能挡住它。
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.getByTestId('chat-pending')).toBeVisible();
    await expect(page.getByTestId('composer-send')).toBeDisabled();
    expect(await page.evaluate(() => (window as typeof window & { __harnessFlightCalls?: number }).__harnessFlightCalls)).toBe(1);

    await page.evaluate(() => (window as typeof window & { __resolveHarnessFlight?: () => void }).__resolveHarnessFlight?.());
    await expect(page.getByTestId('chat-assistant-message')).toContainText('完成');
  });

  test('Stop 经 AbortController 只收敛为 core canceled，并保留已到达正文', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await page.evaluate(() => {
      type Context = { requestId: string; providerId: string; modelId: string; signal?: AbortSignal };
      const hooks = (window as typeof window & {
        __courtworkChatHooks?: { setStreamFactory(factory: ((context: Context) => AsyncIterable<unknown>) | null): void };
      }).__courtworkChatHooks;
      hooks?.setStreamFactory(async function* ({ requestId, providerId, modelId, signal }) {
        yield { type: 'started', requestId, seq: 0, providerId, modelId };
        yield { type: 'content_delta', requestId, seq: 1, delta: '已经到达的部分正文' };
        await new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve(), { once: true }));
      });
    });
    await page.getByTestId('composer-input').fill('停止验证');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-stream-content')).toContainText('已经到达');
    await page.getByTestId('chat-stop').click();
    const failed = page.getByTestId('chat-assistant-failed');
    await expect(failed).toHaveAttribute('data-status', 'failed');
    await expect(failed).toContainText('已经到达的部分正文');
    await expect(failed.getByTestId('chat-turn-failure')).toHaveText('已停止');
    await expect(failed.getByTestId('chat-reasoning-absent')).toBeVisible();
    await expect(page.getByTestId('chat-pending')).toHaveCount(0);
  });
});
