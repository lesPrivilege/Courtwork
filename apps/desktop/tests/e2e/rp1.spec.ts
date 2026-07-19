import { expect, test } from '@playwright/test';
import { connectProvider, createNamedCase, openWorkbench, openModuleList, tokenColor } from './helpers';

type ForcedReadinessWindow = typeof window & {
  __CW_FORCE_CREDENTIAL__: {
    credential: { phase: string; source?: string };
    connection: { phase: string; failKind?: string; failureMessage?: string };
  };
};

test.describe('RP-1 最终重排', () => {
  test('混排列表：类型图标 + 案件摘要选中 + 展开分区', async ({ page }) => {
    await openWorkbench(page);
    // RP-2.11：Recents 纯容器——mixed-list 只承非置顶容器，唯一 demo 置顶时为空（存在但无高度）。
    await expect(page.getByTestId('rail-mixed-list')).toHaveCount(1);
    await expect(page.getByTestId('rail-pinned')).toBeVisible();
    await expect(page.getByTestId('rail-icon-case').first()).toBeVisible();
    // RP-2.11：气泡行退场，Recents 纯容器（docs/decisions/ADR-005-data-security.md 修正二）——不再有 unfiled 行图标。
    await expect(page.getByTestId('rail-icon-unfiled')).toHaveCount(0);

    const expand = page.getByTestId('rail-expand-demo-linjiang');
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('case-expand-demo-linjiang')).toBeVisible();
    await expect(page.getByTestId('flow-s1')).toBeVisible();
    await expect(page.getByTestId('flow-s3')).toBeVisible();
    await expect(page.getByTestId('originals-zone')).toBeVisible();
    const demo = page.getByTestId('case-card-demo-linjiang');
    await expect(page.getByText('卷宗原件 · 只读', { exact: true })).toBeVisible();
    await expect(demo.locator('.rail-row-main')).toHaveCSS('background-color', await tokenColor(page, '--bg-selected'));
    await expect(demo.locator('.rail-case-expand')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('open-work-drafts')).toHaveCount(0);

    await expand.click();
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('case-expand-demo-linjiang')).toHaveCount(0);
    await expand.click();
    await expect(page.getByTestId('flow-s3')).toBeVisible();
  });

  // RP-2.11：气泡行退场后，「存入」桥接迁至 chat 面（docs/decisions/ADR-005-data-security.md 修正二）——旧 unfiled-store 流由 chat 面 store-chat 替代，仪式与选名词不变。
  test('chat 面「存入」→ 容器化 popover → 选案件', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('segment-chat').click();
    await connectProvider(page);
    await page.getByTestId('composer-input').fill('先聊后建的对话');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('chat-user-message')).toContainText('先聊后建的对话');
    await page.getByTestId('store-chat').click();
    const popover = page.getByTestId('store-chat-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId('store-chat-case').click();
    await expect(popover).toHaveCount(0);
    // 存入后切 work 面，新容器标题居顶栏
    await expect(page.getByTestId('titlebar-case-title')).toContainText('案件');
  });

  test('chat 面「存入」→ 容器化 popover → 选工作区', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('segment-chat').click();
    await connectProvider(page);
    await page.getByTestId('composer-input').fill('先聊后建的对话');
    await page.getByTestId('composer-send').click();
    await page.getByTestId('store-chat').click();
    await expect(page.getByTestId('store-chat-popover')).toBeVisible();
    await page.getByTestId('store-chat-workspace').click();
    await expect(page.getByTestId('store-chat-popover')).toHaveCount(0);
    await expect(page.getByTestId('titlebar-case-title')).toContainText('项目');
    // 工作区行图标
    await expect(page.getByTestId('rail-icon-workspace').first()).toBeVisible();
  });

  test('progress 面板头计数 frontier 形制；状态条只迁不清', async ({ page }) => {
    await openWorkbench(page);
    // 运行态归事件流（chat 面）
    await expect(page.getByTestId('event-stream')).toContainText('正在核对');
    await expect(page.getByTestId('nav-artifacts')).toBeVisible();
    // 计数权威位 = Progress 模块；用量归 Context（十四章四模块列）
    await openModuleList(page);
    const count = page.getByTestId('progress-module-count');
    await expect(count).toBeVisible();
    await expect(count).toHaveText('0/6');
    await expect(page.getByTestId('module-context')).toContainText('91%');
  });

  test('artifact 自动进浏览器态 revision 视图（demo RiskList,十四章）', async ({ page }) => {
    await openWorkbench(page);
    // 样板案 S3 回落 RiskList → 自动进浏览器态、revision 视图选中
    await expect(page.getByTestId('preview-host')).toBeVisible();
    await expect(page.getByTestId('view-revision')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('发现 6 项合同风险')).toBeVisible();
  });

  test('模型异常只在 composer 唯一声明位显示', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'unverified' } };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) {
      await setup.getByRole('button', { name: '先查看演示' }).click();
    }
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('composer-provider')).toHaveText('Connect');

    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'failed', failureMessage: '钥匙串授权未通过，请重试或重新填写' } };
    });
    await page.goto('/');
    const setup2 = page.getByTestId('provider-setup');
    if (await setup2.isVisible()) {
      await setup2.getByRole('button', { name: '先查看演示' }).click();
    }
    await page.mouse.move(0, 0);
    // 需重新探针 failed：通过自定义事件或直接 force
    await page.evaluate(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'failed', failureMessage: '钥匙串授权未通过，请重试或重新填写' } };
      window.dispatchEvent(new Event('courtwork-credential-probe'));
    });
    const warn = page.getByTestId('composer-provider');
    await expect(warn).toBeVisible();
    await expect(warn).toHaveAttribute('data-phase', 'failed');
    await expect(warn).toContainText('Connection failed');
    await expect(page.getByTestId('titlebar-credential-warn')).toHaveCount(0);
  });

  test('收缩态：左栏折叠 + 右栏全折 + 折叠按钮', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('collapse-left-rail').click();
    await page.getByTestId('collapse-right-rail').click();
    await expect(page.getByTestId('workspace')).toHaveAttribute('data-left-collapsed', 'true');
    // chatbot 形态：收敛即撤卡（无窄条），底纸直露
    await expect(page.getByTestId('case-rail')).toHaveCount(0);
    // chatbot 形态：收敛撤窄卡，展开钮=chrome 同位钮（位置守恒）
    await expect(page.getByTestId('collapse-left-rail')).toBeVisible();
    await expect(page.getByTestId('module-progress')).toHaveCount(0);
    await expect(page.getByTestId('expand-right-rail')).toBeVisible();
    await expect(page.getByTestId('conversation-canvas')).toBeVisible();
    await expect(page.locator('.composer-float')).toBeVisible();
    await page.getByTestId('collapse-left-rail').click();
    await expect(page.getByTestId('case-rail')).toHaveAttribute('data-collapsed', 'false');
  });

  test('#17/#25 demo persona 只在用户位；#16 model-config 关闭动词', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('user-menu-trigger')).toContainText('林律师 · Sample lead');

    await createNamedCase(page, 'RP非演示案');
    await expect(page.getByTestId('user-menu-trigger')).toContainText('Owner');
    await expect(page.getByTestId('user-menu-trigger')).not.toContainText('林律师');

    await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
    await connectProvider(page);
    await page.getByTestId('model-config-trigger').click();
    await expect(page.getByTestId('model-config-close')).toHaveText('Close');
  });

  test('导航骨架：产出真路由；定时/派发禁用+tooltip', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('nav-artifacts')).toBeVisible();
    const scheduled = page.getByTestId('nav-scheduled');
    await expect(scheduled).toHaveAttribute('aria-disabled', 'true');
    await expect(scheduled).toHaveAttribute('title', /Coming soon/);
    const dispatch = page.getByTestId('nav-dispatch');
    await expect(dispatch).toHaveAttribute('aria-disabled', 'true');
    await expect(dispatch).toHaveAttribute('title', /Coming soon/);
  });

  test('#18′：context/状态条撤模型，仅 composer 保留唯一 model-config', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'ready' } };
    });
    // connected 态 allowSkip=false，无「先查看演示」——关引导用取消
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) {
      const skip = setup.getByRole('button', { name: '先查看演示' });
      if (await skip.isVisible().catch(() => false)) await skip.click();
      else await setup.getByRole('button', { name: '取消' }).click();
    }
    await page.mouse.move(0, 0);

    await expect(page.getByTestId('context-model-chip')).toHaveCount(0);
    await page.getByTestId('model-config-trigger').click();
    await expect(page.getByTestId('model-config-popover')).toHaveCount(1);
    await page.getByTestId('model-config-model').fill('deepseek-v4-pro');
    await page.getByRole('radio', { name: 'Deep' }).check();
    await page.getByTestId('model-config-close').click();
    // PROVIDER-2：换模型/推理档必须撤销旧 probe，显式重探后才重新开放配置。
    await expect(page.getByTestId('model-config-trigger')).toHaveAttribute('data-phase', 'unverified');
    await expect(page.getByTestId('model-config-trigger')).toContainText('Connect');
    await page.getByTestId('model-config-trigger').click();
    await expect(page.getByTestId('model-config-popover')).toHaveCount(1);
    await expect(page.getByTestId('model-config-summary')).toContainText('deepseek-v4-pro');
  });
});
