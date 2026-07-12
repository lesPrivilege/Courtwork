import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('schema hard-cut keeps the chat canvas opaque at the work-surface seam', async ({ page }) => {
  await openWorkbench(page);

  const conversation = page.locator('.conversation.canvas-layer');
  const canvasBackground = 'rgb(246, 249, 252)';
  await expect(conversation).toHaveCSS('background-color', canvasBackground);

  await page.getByTestId('view-matrix').click();
  await expect(conversation).toHaveCSS('background-color', canvasBackground);
  await expect(page.locator('.view-content')).toHaveCSS('transition-duration', '0s');
});

test('comparison keeps a readable middle lane beside the collapsed rail', async ({ page }) => {
  await openWorkbench(page);

  await page.getByTestId('split-start').click();
  const rail = await page.locator('.case-rail').boundingBox();
  const conversation = await page.locator('.conversation.canvas-layer').boundingBox();

  expect(rail?.width ?? 0).toBeLessThanOrEqual(50);
  expect(conversation?.width ?? 0).toBeGreaterThanOrEqual(280);
});
