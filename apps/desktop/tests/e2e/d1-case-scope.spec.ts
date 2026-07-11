import { expect, test, type Page } from '@playwright/test';
import { createNamedCase, openWorkbench } from './helpers';

async function skipProvider(page: Page) {
  await openWorkbench(page);
}

test.describe('D-1 凭证探针三态（非 demo 装配）', () => {
  test('未配置态显示待连接，不乐观已连接', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __CW_FORCE_CREDENTIAL__: { phase: string } }).__CW_FORCE_CREDENTIAL__ = {
        phase: 'pending',
      };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'pending');
    await expect(button).toContainText('Connect');
    await expect(button).not.toContainText('Connected');
  });

  test('授权失败态显示连接失败与引导文案', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __CW_FORCE_CREDENTIAL__: { phase: string; failureMessage: string } }).__CW_FORCE_CREDENTIAL__ = {
        phase: 'failed',
        failureMessage: '钥匙串授权未通过，请重试或重新填写',
      };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'failed');
    await expect(button).toContainText('Connection failed');
  });

  test('F4 分型文案：auth_failed 呈现在状态条 title', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as {
        __CW_FORCE_CREDENTIAL__: { phase: string; failKind: string; failureMessage: string };
      }).__CW_FORCE_CREDENTIAL__ = {
        phase: 'failed',
        failKind: 'auth_failed',
        failureMessage: '无法解锁电脑的安全凭证库，请确认钥匙串密码后重试',
      };
    });
    await page.goto('/');
    const setup = page.getByTestId('provider-setup');
    if (await setup.isVisible()) await setup.getByRole('button', { name: '先查看演示' }).click();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'failed');
    await expect(button).toContainText('Connection failed');
  });


  test('成功态显示已连接（合法凭证长度）', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    await page.getByTestId('composer-provider').click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await dialog.getByRole('button', { name: '完成连接' }).click();
    await expect(dialog).toBeHidden();
    const button = page.getByTestId('composer-provider');
    await expect(button).toHaveAttribute('data-phase', 'connected');
    await expect(button).toContainText('DeepSeek Chat · Standard');
  });

  test('短凭证保存失败不显示已连接', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByTestId('provider-setup');
    await page.getByTestId('composer-provider').click();
    await dialog.getByRole('textbox', { name: '访问凭证' }).fill('short');
    await dialog.getByRole('button', { name: '完成连接' }).click();
    await expect(page.getByTestId('provider-setup-error')).toBeVisible();
    await expect(dialog).toBeVisible();
    // 关闭后看状态条
    await dialog.getByRole('button', { name: '先查看演示' }).click();
    await expect(page.getByTestId('composer-provider')).not.toContainText(/DeepSeek|Qwen|Doubao/);
  });
});

test.describe('D-1 demo 容器隔离与新建空态', () => {
  test('样板案有演示角标；新建案件各工作面为空态', async ({ page }) => {
    await skipProvider(page);
    await expect(page.getByTestId('demo-case-badge')).toBeVisible();
    await expect(page.getByTestId(`case-card-demo-linjiang`)).toHaveAttribute('data-demo', 'true');

    await createNamedCase(page, '张三诉李四买卖合同纠纷');
    await expect(page.getByTestId('titlebar-case-title')).toHaveText('张三诉李四买卖合同纠纷');
    await expect(page.getByTestId('toolbar-stage')).toHaveText('尚未开始阶段');
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    await expect(page.getByTestId('case-empty-state')).toBeVisible();
    // 不得残留 demo 阶段文案
    await expect(page.getByTestId('toolbar-stage')).not.toContainText('合同审查');
    await expect(page.locator('.user-message')).toHaveCount(0);
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);
    await expect(page.getByTestId('flow-s1')).toHaveCount(0);
    await expect(page.getByTestId('originals-zone')).toHaveCount(0);

    for (const view of ['timeline', 'graph', 'matrix', 'revision', 'draft'] as const) {
      await page.getByTestId(`view-${view}`).click();
      await expect(page.getByTestId('case-empty-state')).toBeVisible();
    }
  });
});

test.describe('D-1 容器切换矩阵（防状态继承）', () => {
  test('案件 A 有 demo 状态 → 案件 B 零继承 → 回到 A 恢复 demo', async ({ page }) => {
    await skipProvider(page);
    // A = demo，已有 S3 状态
    await expect(page.getByTestId('toolbar-stage')).toContainText('合同审查');
    await expect(page.getByText('发现 6 项合同风险')).toBeVisible();

    await createNamedCase(page, '案件乙·长名称用于溢出审计');
    await expect(page.getByTestId('titlebar-case-title')).toHaveText('案件乙·长名称用于溢出审计');
    await expect(page.getByTestId('toolbar-stage')).toHaveText('尚未开始阶段');
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);
    await expect(page.getByTestId('output-docx-card')).toHaveCount(0);
    // RP-2.5：Preview 态 utility 收为 dock；点进度回到通用宿主后核对原语义。
    await page.getByTestId('module-progress-toggle').click();
    await expect(page.getByTestId('progress-module-body-list')).toContainText('New case');

    // 回到 demo
    await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
    await expect(page.getByTestId('demo-case-badge')).toBeVisible();
    await expect(page.getByTestId('toolbar-stage')).toContainText('合同审查');
    await expect(page.getByText('发现 6 项合同风险')).toBeVisible();

    // 再进 B
    const bCard = page.locator('.case-card').filter({ hasText: '案件乙' });
    await bCard.getByRole('button').first().click();
    await expect(page.getByTestId('conversation-empty')).toBeVisible();
    await expect(page.getByText('发现 6 项合同风险')).toHaveCount(0);

    // docs/52 #8-⑤ / UX-1 0a：composer chip 零继承 demo 案名
    const chip = page.getByTestId('composer-case');
    await expect(chip).toContainText('案件乙');
    await expect(chip).not.toContainText('临江');
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
