import { expect, test, type Page } from '@playwright/test';
import { createNamedCase, openModuleList, openWorkbench } from './helpers';

type ForcedReadinessWindow = typeof window & {
  __CW_FORCE_CREDENTIAL__: {
    credential: { phase: string; source?: string };
    connection: { phase: string; failKind?: string; failureMessage?: string };
  };
};

async function skipProvider(page: Page) {
  await openWorkbench(page);
}

test.describe('D-1 凭证探针三态（非 demo 装配）', () => {
  test('未配置态显示待连接，不乐观已连接', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'unverified' } };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'unverified');
    await expect(button).toContainText('Connect');
    await expect(button).not.toContainText('Connected');
  });

  test('授权失败态显示连接失败与引导文案', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'failed', failureMessage: '钥匙串授权未通过，请重试或重新填写' } };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await button.click();
    await expect(button).toHaveAttribute('data-phase', 'failed');
    await expect(button).toContainText('Connection failed');
  });

  test('F4 分型文案：auth_failed 呈现在状态条 title', async ({ page }) => {
    await page.addInitScript(() => {
      (window as ForcedReadinessWindow).__CW_FORCE_CREDENTIAL__ = { credential: { phase: 'absent' }, connection: { phase: 'failed', failKind: 'platform', failureMessage: '无法解锁电脑的安全凭证库，请确认钥匙串密码后重试' } };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await button.click();
    await expect(button).toHaveAttribute('data-phase', 'failed');
    await expect(button).toContainText('Connection failed');
  });


  test('成功态显示已连接（合法凭证长度）', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    await page.getByTestId('composer-provider').click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await dialog.getByRole('button', { name: 'Verify connection' }).click();
    // #44：成功就地绿徽，不自动关闭；显式「开始使用」后收卡
    await expect(dialog.getByTestId('provider-setup-verified')).toBeVisible();
    await dialog.getByTestId('provider-setup-done').click();
    await expect(dialog).toBeHidden();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'ready');
    // 收敛令②：chip 主显档位（标准/深思），生效模型退为小字（单源取声明路由）
    await expect(button).toContainText('Standard');
    await expect(button.locator('.composer-provider-model')).toHaveText('deepseek-v4-flash');
  });

  test('短凭证保存失败不显示已连接', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    await page.getByTestId('composer-provider').click();
    await dialog.getByRole('textbox', { name: 'Access credential' }).fill('short');
    await dialog.getByRole('button', { name: 'Verify connection' }).click();
    await expect(page.getByTestId('provider-setup-error')).toBeVisible();
    await expect(dialog).toBeVisible();
    // 关闭后看状态条
    await dialog.getByRole('button', { name: '先查看演示' }).click();
    await expect(page.getByTestId('composer-provider')).not.toContainText(/DeepSeek/);
  });
});

test.describe('D-1 demo 容器隔离与新建空态', () => {
  test('样板案有演示角标；新建案件各工作面为空态', async ({ page }) => {
    await skipProvider(page);
    await expect(page.getByTestId('demo-case-badge')).toBeVisible();
    await expect(page.getByTestId(`case-card-demo-linjiang`)).toHaveAttribute('data-demo', 'true');

    await createNamedCase(page, '张三诉李四买卖合同纠纷');
    await expect(page.getByTestId('titlebar-case-title')).toHaveText('张三诉李四买卖合同纠纷');
    // 非 demo 空案停四模块列（无浏览器态）——等 back 钮消失确认切案落定
    await expect(page.getByTestId('preview-back')).toHaveCount(0);
    await expect(page.getByTestId('toolbar-stage')).toHaveText('尚未开始阶段');
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    // 十四章：空案右列停四模块列（无浏览器态空卡）
    await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'modules');
    // 不得残留 demo 阶段文案
    await expect(page.getByTestId('toolbar-stage')).not.toContainText('合同审查');
    await expect(page.locator('.user-message')).toHaveCount(0);
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);
    await expect(page.getByTestId('flow-s1')).toHaveCount(0);
    await expect(page.getByTestId('originals-zone')).toHaveCount(0);

    // 十四章：空案右列停四模块列,Preview 大纲五工作面条目在场（点开即浏览器态,无 demo 数据）
    await expect(page.getByTestId('preview-outline')).toBeVisible();
    for (const view of ['timeline', 'graph', 'matrix', 'revision', 'draft'] as const) {
      await expect(page.getByTestId(`outline-${view}`)).toBeVisible();
    }
  });
});

test.describe('D-1 容器切换矩阵（防状态继承）', () => {
  test('案件 A 有 demo 状态 → 案件 B 零继承 → 回到 A 恢复 demo', async ({ page }) => {
    await skipProvider(page);
    // A = demo，已有 S3 状态
    await expect(page.getByTestId('toolbar-stage')).toContainText('合同审查');
    await expect(page.getByText('发现 6 项合同风险')).toBeVisible();

    // WORK-TURN-2：场景运行中不接收自由输入、也不引入排队机制。
    await page.getByRole('button', { name: '审查合同', exact: true }).click();
    await page.getByTestId('turn-event-progress-0').waitFor();
    await expect(page.getByTestId('composer-input')).toBeDisabled();
    await expect(page.getByTestId('composer-disabled-reason')).toContainText('等待当前步骤完成后再继续提问');

    await createNamedCase(page, '案件乙·长名称用于溢出审计');
    await expect(page.getByTestId('titlebar-case-title')).toHaveText('案件乙·长名称用于溢出审计');
    await expect(page.getByTestId('toolbar-stage')).toHaveText('尚未开始阶段');
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);
    await expect(page.getByTestId('output-docx-card')).toHaveCount(0);
    await expect(page.getByTestId('queued-message')).toHaveCount(0);
    // 十四章：非 demo 案停四模块列;保险回目录（防前序 demo 的 replay 残留浏览器态）后展开 Progress
    await openModuleList(page);
    const bProgress = page.getByTestId('module-progress');
    if ((await bProgress.getAttribute('data-open')) !== 'true') await page.getByTestId('module-progress-toggle').click();
    await expect(bProgress).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('progress-module-body-list')).toContainText('尚无任务进展 · 开始一项工作后在此查看');

    // 回到 demo（等浏览器态 preview 落定确认切回）
    await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
    await expect(page.getByTestId('preview-host')).toBeVisible();
    await expect(page.getByTestId('demo-case-badge')).toBeVisible();
    await expect(page.getByTestId('toolbar-stage')).toContainText('合同审查');
    await expect(page.getByText('发现 6 项合同风险')).toBeVisible();
    await expect(page.getByTestId('queued-message')).toHaveCount(0);

    // 再进 B
    const bCard = page.locator('.case-card').filter({ hasText: '案件乙' });
    await bCard.getByRole('button').first().click();
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);
    await expect(page.getByTestId('queued-message')).toHaveCount(0);

    // RP-2.8：已绑定案件的容器身份在左栏/案件头声明，composer 不重复显示。
    await expect(page.getByTestId('composer-case')).toHaveCount(0);
    await expect(page.getByTestId('chat-case-title')).toContainText('案件乙');
  });

  test('归档按钮对长案名不溢出并可打开确认', async ({ page }) => {
    await skipProvider(page);
    const longName = '某某科技有限公司诉某某智能设备股份有限公司买卖合同纠纷及财产保全申请';
    await createNamedCase(page, longName);
    const card = page.locator('.case-card').filter({ hasText: '某某科技' });
    await card.hover();
    await card.getByTestId('archive-trigger').click();
    const popover = page.locator('.archive-popover');
    await expect(popover).toBeVisible();
    await expect(popover.locator('.archive-case-title')).toHaveAttribute('title', longName);
    // 截断存在
    await expect(popover.locator('.archive-case-title')).toHaveCSS('text-overflow', 'ellipsis');
  });
});
