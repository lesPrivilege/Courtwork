import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('schema preview exposes a self-contained tab-to-panel relation', async ({ page }) => {
  await openWorkbench(page);

  const host = page.getByTestId('preview-host');
  await expect(host).toHaveAttribute('data-schema-self-contained', 'true');

  const activeTab = page.getByRole('tablist', { name: '结构化工作面' }).getByRole('tab', { selected: true });
  const panelId = await activeTab.getAttribute('aria-controls');
  const tabId = await activeTab.getAttribute('id');
  expect(panelId).toBeTruthy();
  expect(tabId).toBeTruthy();

  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute('aria-labelledby', tabId ?? '');
});

test('schema rejection feedback keeps the neutral disposition tone', async ({ page }) => {
  await openWorkbench(page);

  const panel = page.getByTestId('revision-panel');
  const risk = panel.locator('[data-risk-id="risk-04"]');
  await risk.click();
  await panel.getByRole('button', { name: '驳回', exact: true }).click();

  const flash = risk.getByTestId('settle-flash-risk-04');
  await expect(flash).toHaveAttribute('data-kind', 'rejected');
  await expect.poll(async () => flash.evaluate((element) => getComputedStyle(element).getPropertyValue('--settle-color').trim())).toBe('#64748b');
});
