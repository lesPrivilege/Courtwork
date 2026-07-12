import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

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
    await embed.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await embed.getByTestId('settings-credential-validate').click();

    // #44 契约：宿主稳定在场 + 就地绿徽；无任何浮层置换
    await expect(page.getByTestId('settings-credential-verified')).toBeVisible();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'connected');
  });

  test('#44b 引导卡（首启专属）：验证成功不自动关闭——绿徽 + 显式「开始使用」', async ({ page }) => {
    // connect 路由改判后引导卡只在首启出现；非首启一律 Settings 内嵌（#44a 已覆盖）
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    if (!(await dialog.isVisible())) await page.getByTestId('composer-provider').click();
    await dialog.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await dialog.getByRole('button', { name: '验证连接' }).click();
    await expect(dialog.getByTestId('provider-setup-verified')).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('provider-setup-done').click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('GOAL-1 · #35/#36 三卡一纸位形', () => {
  test('#35 dock 三 tap 坐右列底纸；#36 schema 卡贯通到顶', async ({ page }) => {
    await openWorkbench(page);
    const rail = page.getByTestId('right-module-stack');
    const dock = page.getByTestId('utility-rail');
    const railBox = (await rail.boundingBox())!;
    const dockBox = (await dock.boundingBox())!;
    // dock 底缘贴右列底缘（坐底纸）
    expect(Math.abs(dockBox.y + dockBox.height - (railBox.y + railBox.height))).toBeLessThanOrEqual(2);
    // preview 卡顶缘即右列顶缘（贯通到顶，无顶部横条占位）
    const preview = page.getByTestId('preview-host');
    const previewBox = (await preview.boundingBox())!;
    expect(previewBox.y - railBox.y).toBeLessThanOrEqual(2);
    // dock 在卡之下
    expect(dockBox.y).toBeGreaterThan(previewBox.y + previewBox.height - 2);
    // dock 弹层向上展开：打开一项，弹层底缘在 taps 顶缘之上
    await page.getByTestId('module-progress-toggle').click();
    const popover = page.getByTestId('utility-dock-popover');
    const popBox = (await popover.boundingBox())!;
    expect(popBox.y + popBox.height).toBeLessThanOrEqual(dockBox.y + 2);
  });
});

test.describe('GOAL-1 · #37/#39 composer 与空态', () => {
  test('#37 composer 沉底排恰五槽位；paste 收纳进 + 菜单', async ({ page }) => {
    await openWorkbench(page);
    const slots = page.locator('[data-composer-slot]');
    const slotNames = await slots.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-composer-slot')));
    // scope chip 为作用域信任件，不计钮排（拍板）；有绑定容器时不出现
    const buttons = slotNames.filter((name) => name !== 'scope');
    expect(buttons.sort()).toEqual(['add', 'add-folder', 'provider', 'send', 'workmode']);
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

async function installChatResponder(page: Page, mode: 'ok' | 'fail') {
  await page.evaluate((kind) => {
    const hooks = (window as typeof window & {
      __courtworkChatHooks?: { setResponder(r: ((m: unknown) => Promise<unknown>) | null): void };
    }).__courtworkChatHooks;
    if (!hooks) throw new Error('chat hooks missing');
    hooks.setResponder(kind === 'ok'
      ? async () => ({ content: '已收到，这是真实链路的回复。', reasoningContent: '先梳理请求要点。' })
      : async () => { throw new Error('访问凭证未通过服务商验证，请检查后重试'); });
  }, mode);
}

test.describe('GOAL-1 · chat 面真 API 端到端', () => {
  test('发送 → 在途指示 → assistant 落格（含思考折叠）', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await installChatResponder(page, 'ok');
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
    await installChatResponder(page, 'fail');
    await page.getByTestId('composer-input').fill('触发失败');
    await page.getByTestId('composer-send').click();
    const failed = page.getByTestId('chat-assistant-failed');
    await expect(failed).toBeVisible();
    await expect(failed).toContainText('访问凭证未通过服务商验证');
  });

  test('单飞行：一轮在途时禁止第二次发送', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('segment-chat').click();
    await page.evaluate(() => {
      const scope = window as typeof window & {
        __courtworkChatHooks?: { setResponder(r: ((m: unknown) => Promise<unknown>) | null): void };
        __resolveHarnessFlight?: () => void;
        __harnessFlightCalls?: number;
      };
      scope.__harnessFlightCalls = 0;
      scope.__courtworkChatHooks?.setResponder(async () => {
        scope.__harnessFlightCalls = (scope.__harnessFlightCalls ?? 0) + 1;
        await new Promise<void>((resolve) => { scope.__resolveHarnessFlight = resolve; });
        return { content: '完成' };
      });
    });

    await page.getByTestId('composer-input').fill('第一轮');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-pending')).toBeVisible();
    await page.getByTestId('composer-input').fill('第二轮');
    await expect(page.getByTestId('composer-send')).toBeDisabled();
    await page.getByTestId('composer-input').press('Enter');
    expect(await page.evaluate(() => (window as typeof window & { __harnessFlightCalls?: number }).__harnessFlightCalls)).toBe(1);

    await page.evaluate(() => (window as typeof window & { __resolveHarnessFlight?: () => void }).__resolveHarnessFlight?.());
    await expect(page.getByTestId('chat-assistant-message')).toContainText('完成');
  });
});
