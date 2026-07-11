import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

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
      return {
        root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
        body: [document.body.scrollWidth, document.body.clientWidth],
        gap: right.getBoundingClientRect().left - chat.getBoundingClientRect().right,
      };
    });
    expect(metrics.root[0]).toBeLessThanOrEqual(metrics.root[1]);
    expect(metrics.body[0]).toBeLessThanOrEqual(metrics.body[1]);
    expect(metrics.gap).toBeGreaterThanOrEqual(8);
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
  await page.getByTestId('open-settings').click();
  const box = await page.getByTestId('settings-page').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(0);
  expect(box!.y).toBeGreaterThan(0);
  const overflow = await page.getByTestId('settings-page').evaluate((node) => node.scrollWidth <= node.clientWidth);
  expect(overflow).toBe(true);
});
