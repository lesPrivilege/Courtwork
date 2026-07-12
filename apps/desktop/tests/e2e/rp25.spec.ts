import { expect, test, type Page } from '@playwright/test';
import { connectProvider, openWorkbench } from './helpers';

async function openApp(page: Page) {
  await openWorkbench(page);
}

for (const width of [1180, 1240, 1440, 1600]) {
  test(`RP-2.5 ${width}px 无横向溢出且三列边界不重叠`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openApp(page);
    const metrics = await page.evaluate(() => {
      const chat = document.querySelector<HTMLElement>('[data-testid="conversation-canvas"]')!;
      const right = document.querySelector<HTMLElement>('[data-testid="right-module-stack"]')!;
      const composer = document.querySelector<HTMLElement>('[data-testid="composer"]')!;
      const send = document.querySelector<HTMLElement>('[data-testid="composer-send"]')!;
      const provider = document.querySelector<HTMLElement>('[data-testid="model-config-trigger"]')!;
      const edge = (node: HTMLElement) => node.getBoundingClientRect().right;
      return {
        root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
        body: [document.body.scrollWidth, document.body.clientWidth],
        gap: right.getBoundingClientRect().left - chat.getBoundingClientRect().right,
        chatRight: chat.getBoundingClientRect().right,
        composerRight: edge(composer),
        sendRight: edge(send),
        providerRight: edge(provider),
      };
    });
    expect(metrics.root[0]).toBeLessThanOrEqual(metrics.root[1]);
    expect(metrics.body[0]).toBeLessThanOrEqual(metrics.body[1]);
    expect(metrics.gap).toBeCloseTo(28, 1); // 2026-07-12 三拍 12→16→20→24（终值）
    expect(metrics.composerRight).toBeLessThanOrEqual(metrics.chatRight);
    expect(metrics.sendRight).toBeLessThanOrEqual(metrics.chatRight);
    expect(metrics.providerRight).toBeLessThanOrEqual(metrics.chatRight);
    if (width === 1600) await expect(page.getByTestId('composer-disclaimer')).toHaveCSS('white-space', 'nowrap');
  });
}

test('十四章浏览器态：Preview 唯一卡,back 回四模块列', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('preview-close')).toHaveCount(0);
  await expect(page.getByTestId('preview-open')).toHaveCount(0);
  await page.getByTestId('preview-back').click();
  await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'modules');
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
});

test('RP-2.5.1 artifact_produced：preview 常驻下自动跟随新场景视图', async ({ page }) => {
  await openApp(page);
  const before = Number(await page.getByTestId('right-module-stack').getAttribute('data-artifact-revision'));
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('right-module-stack')).not.toHaveAttribute('data-artifact-revision', String(before));
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('view-timeline')).toHaveAttribute('aria-selected', 'true');
});

test('十四章：同场景再产 artifact，浏览器态 preview 不弹跳、视图跟随', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
  const before = Number(await page.getByTestId('right-module-stack').getAttribute('data-artifact-revision'));
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('right-module-stack')).not.toHaveAttribute('data-artifact-revision', String(before));
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

test('RP-2.5.1 model-config 单实例、无遮挡并持久化配置', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await openApp(page);
  await connectProvider(page);
  await page.getByTestId('model-config-trigger').click();
  await expect(page.getByTestId('model-config-popover')).toHaveCount(1);
  const bounds = await page.evaluate(() => {
    const chat = document.querySelector<HTMLElement>('[data-testid="conversation-canvas"]')!.getBoundingClientRect();
    const popover = document.querySelector<HTMLElement>('[data-testid="model-config-popover"]')!.getBoundingClientRect();
    return { chatLeft: chat.left, chatRight: chat.right, popoverLeft: popover.left, popoverRight: popover.right };
  });
  expect(bounds.popoverLeft).toBeGreaterThanOrEqual(bounds.chatLeft);
  expect(bounds.popoverRight).toBeLessThanOrEqual(bounds.chatRight);
  await page.getByTestId('model-config-model').fill('deepseek-v4-pro');
  await page.getByRole('radio', { name: 'Deep' }).check();
  await page.getByTestId('model-config-close').click();
  await page.reload();
  await openApp(page);
  await connectProvider(page);
  await page.getByTestId('model-config-trigger').click();
  await expect(page.getByTestId('model-config-popover')).toHaveCount(1);
  await expect(page.getByTestId('model-config-model')).toHaveValue('deepseek-v4-pro');
  await expect(page.getByRole('radio', { name: 'Deep' })).toBeChecked();
});

test('RP-2.5 场景动作不越界，免责声明链接保持原子', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await openApp(page);
  const scene = page.getByTestId('scene-strip');
  const sceneBox = await scene.boundingBox();
  const moreBox = await page.getByTestId('scene-more').boundingBox();
  expect(sceneBox && moreBox && moreBox.x + moreBox.width <= sceneBox.x + sceneBox.width).toBeTruthy();
  await expect(page.getByTestId('composer-disclaimer').locator('a')).toHaveCSS('white-space', 'nowrap');
});

test('RP-2.5 设置为居中 L2 modal，1180 无溢出', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await openApp(page);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  const box = await page.getByTestId('settings-page').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(0);
  expect(box!.y).toBeGreaterThan(0);
  const overflow = await page.getByTestId('settings-page').evaluate((node) => node.scrollWidth <= node.clientWidth);
  expect(overflow).toBe(true);
});
