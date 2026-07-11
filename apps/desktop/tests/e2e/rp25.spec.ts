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
    expect(metrics.gap).toBeCloseTo(12, 1); // RP-2.11 ②：三栏间距 8→12（Cowork 参照解锁 RP-2.9 锁）
    expect(metrics.composerRight).toBeLessThanOrEqual(metrics.chatRight);
    expect(metrics.sendRight).toBeLessThanOrEqual(metrics.chatRight);
    expect(metrics.providerRight).toBeLessThanOrEqual(metrics.chatRight);
    if (width === 1600) await expect(page.getByTestId('composer-disclaimer')).toHaveCSS('white-space', 'nowrap');
  });
}

test('RP-2.5 Utility 与 Preview 双宿主互斥切换', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'dock');
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await page.getByTestId('preview-close').click();
  await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'base');
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
  await page.getByTestId('preview-open').click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

test('RP-2.5.1 artifact_produced 自动打开新场景 Preview', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('preview-close').click();
  const before = Number(await page.getByTestId('right-module-stack').getAttribute('data-artifact-revision'));
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('right-module-stack')).not.toHaveAttribute('data-artifact-revision', String(before));
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('view-timeline')).toHaveAttribute('aria-selected', 'true');
});

test('RP-2.5.1 同场景再产 artifact 尊重手动关闭 Preview', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await page.getByTestId('preview-close').click();
  const before = Number(await page.getByTestId('right-module-stack').getAttribute('data-artifact-revision'));
  await page.getByTestId('flow-s1').click();
  await expect(page.getByTestId('right-module-stack')).not.toHaveAttribute('data-artifact-revision', String(before));
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
  await expect(page.getByTestId('utility-rail')).toHaveAttribute('data-mode', 'base');
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
  await page.getByTestId('model-config-provider').selectOption('qwen');
  await page.getByTestId('model-config-model').fill('qwen3.5-plus');
  await page.getByRole('radio', { name: 'Deep' }).check();
  await page.getByTestId('model-config-close').click();
  await page.reload();
  await openApp(page);
  await connectProvider(page);
  await page.getByTestId('model-config-trigger').click();
  await expect(page.getByTestId('model-config-popover')).toHaveCount(1);
  await expect(page.getByTestId('model-config-provider')).toHaveValue('qwen');
  await expect(page.getByTestId('model-config-model')).toHaveValue('qwen3.5-plus');
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
