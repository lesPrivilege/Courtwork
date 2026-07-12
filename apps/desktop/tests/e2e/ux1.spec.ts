import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectProvider, createNamedCase, openWorkbench } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureMd = path.resolve(here, '../fixtures/sample-brief.md');

test.describe('UX-1 批次一', () => {
  test('0a：composer folder 仅在未绑定新对话出现', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('composer-case')).toContainText('Choose case');
    await page.getByTestId('welcome-demo-start').click();
    await page.getByTestId('provider-skip').click();
    await expect(page.getByTestId('composer-case')).toHaveCount(0);

    await createNamedCase(page, 'UX一号案·买卖合同');
    await expect(page.getByTestId('titlebar-case-title')).toHaveText('UX一号案·买卖合同');
    await expect(page.getByTestId('composer-case')).toHaveCount(0);

    // 回 demo 再进 B，容器名只在案件头切换。
    await page.getByTestId('case-card-demo-linjiang').getByRole('button').first().click();
    await expect(page.getByTestId('titlebar-case-title')).toContainText('临江');
    const bCard = page.locator('.case-card').filter({ hasText: 'UX一号案' });
    await bCard.getByRole('button').first().click();
    await expect(page.getByTestId('titlebar-case-title')).toContainText('UX一号案');
    await expect(page.getByTestId('composer-case')).toHaveCount(0);
  });

  test('#1/#2：卷宗计数降为元信息；双词表案件用卷宗', async ({ page }) => {
    await openWorkbench(page);
    const count = page.getByTestId('case-file-count').first();
    await expect(count).toContainText('卷宗');
    await expect(count).toContainText('件');
    const zone = page.getByTestId('originals-zone');
    await expect(zone).toBeVisible();

    // RP-2.7：计数不再重复承担导航，展开动词只有 chevron。
    await page.getByTestId('rail-expand-demo-linjiang').click();
    await expect(page.getByTestId('originals-zone')).toHaveCount(0);
    await page.getByTestId('rail-expand-demo-linjiang').click();
    await expect(page.getByTestId('originals-zone')).toBeVisible();
  });

  test('#3：先聊后建 — 无容器存入弹出容器化仪式', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('composer-case')).toContainText('Choose case');

    await page.getByTestId('composer-file-input').setInputFiles(fixtureMd);
    const chip = page.locator('[data-testid^="attachment-chip-"]').first();
    await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
    await page.locator('[data-testid^="attachment-scope-"]').first().click();
    await page.locator('[data-testid^="scope-confirm-"]').first().click();
    await expect(page.getByTestId('containerize-popover')).toBeVisible();
    await page.getByTestId('containerize-case').click();
    await expect(page.getByTestId('containerize-popover')).toHaveCount(0);
    await expect(page.getByTestId('titlebar-case-title')).toContainText('案件');
  });

  test('#4/#5：附件来源统一收进 + 菜单', async ({ page }) => {
    await openWorkbench(page);
    await expect(page.getByTestId('composer-upload')).toHaveCount(0);
    await expect(page.getByTestId('composer-case')).toHaveCount(0);
    await expect(page.getByTestId('composer-send')).toBeVisible();
    await expect(page.getByTestId('composer-plus')).toBeVisible();
    // 平铺区不再直接放相机/语音
    await expect(page.getByTestId('composer-camera')).toHaveCount(0);
    await page.getByTestId('composer-plus').click();
    const menu = page.getByTestId('composer-plus-menu');
    await expect(menu).toBeVisible();
    await expect(page.getByTestId('composer-upload')).toHaveText('Attach files');
    await expect(page.getByTestId('composer-plus-folder')).toBeVisible();
    const camera = page.getByTestId('composer-camera');
    await expect(camera).toHaveAttribute('aria-disabled', 'true');
    await expect(camera).toHaveAttribute('title', /Coming soon/);
    const voice = page.getByTestId('composer-voice');
    await expect(voice).toHaveAttribute('aria-disabled', 'true');
    await expect(voice).toHaveAttribute('title', /Coming soon/);
  });

  test('#7/#26/#26.1：静默锚留在原 turn，点开可回看', async ({ page }) => {
    await openWorkbench(page);
    const stream = page.getByTestId('thinking-stream');
    await expect(stream).toBeVisible();
    const turn = page.getByTestId('assistant-turn-demo');
    await expect(turn).toBeVisible();
    await expect(turn.getByTestId('thinking-stream')).toHaveCount(1);
    await expect(page.locator('.conversation-scroll > [data-testid="thinking-stream"]')).toHaveCount(0);
    await expect(stream).toHaveAttribute('data-state', 'settled');
    await expect(stream).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('thinking-stream-body')).toHaveCount(0);
    await expect(page.getByTestId('thinking-stream-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('thinking-stream-toggle')).toHaveAttribute('aria-label', 'Show reasoning');
    // RP-2.11 改判：静默锚为字符版（竖线光标 + 标签），非 SVG 图标——原「toggle 无 span」断言属 brand-mark 时代。
    await expect(page.getByTestId('thinking-stream-toggle').locator('.thinking-cursor')).toHaveCount(1);
    await page.getByTestId('thinking-stream-toggle').click();
    await expect(stream).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('thinking-stream-body')).toContainText('正在核对合同条款');
  });

  test('#10/#18′：composer 模型位可配置，pending 不冒充已连接', async ({ page }) => {
    await openWorkbench(page);
    await connectProvider(page);
    await page.getByTestId('model-config-trigger').click();
    const popover = page.getByTestId('model-config-popover');
    await expect(popover).toBeVisible();
    await page.getByTestId('model-config-model').fill('deepseek-v4-pro');
    await page.getByRole('radio', { name: 'Deep' }).check();
    await expect(page.getByTestId('model-config-summary')).toContainText('deepseek-v4-pro');
    await expect(page.getByTestId('model-config-summary')).toContainText('Deep');
    await page.getByTestId('model-config-close').click();
    await expect(page.getByTestId('model-config-trigger')).toContainText('deepseek-v4-pro');
  });

  test('#9：图谱 minimap 使用 courtwork-minimap 类（无库蓝渗出约定）', async ({ page }) => {
    await openWorkbench(page);
    await page.getByTestId('view-graph').click();
    await expect(page.getByTestId('graph-panel')).toBeVisible();
    // minimap 由 G6 注入 DOM；class 由 GraphPanel 传入
    await expect(page.locator('.courtwork-minimap')).toBeVisible({ timeout: 15_000 });
  });
});
