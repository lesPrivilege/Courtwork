import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

test('cold start is probe-free and routes welcome → provider guide → Skip → sample tour', async ({ page }) => {
  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('workbench')).toHaveAttribute('data-credential-probed', 'false');
  await page.getByTestId('welcome-demo-start').click();
  await expect(page.getByTestId('provider-setup')).toBeVisible();
  await expect(page.getByTestId('provider-security-note')).toContainText('安全凭证库');
  await page.getByTestId('provider-skip').click();
  await expect(page.getByTestId('demo-case-badge')).toBeVisible();
  await expect(page.getByTestId('sample-tour')).toBeVisible();
});

test('active provider entry is the first credential probe point', async ({ page }) => {
  await expect(page.getByTestId('workbench')).toHaveAttribute('data-credential-probed', 'false');
  await page.getByTestId('model-config-trigger').click();
  await expect(page.getByTestId('workbench')).toHaveAttribute('data-credential-probed', 'true');
});

test('home density tokens stay on welcome and rail while schema remains dense', async ({ page }) => {
  const welcome = page.getByTestId('welcome-state');
  await expect(welcome).toHaveCSS('max-width', '560px');
  await expect(welcome).toHaveCSS('border-radius', '16px');
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();
  await expect(page.getByTestId('case-rail')).toHaveCSS('--home-row-height', '36px');
  await expect(page.getByTestId('preview-host')).not.toHaveCSS('border-radius', '16px');
});

test('frontier composer order exposes paste, add, provider and send on the bottom row', async ({ page }) => {
  const composer = page.getByTestId('composer');
  const order = await composer.locator('[data-composer-slot]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-composer-slot')));
  // RP-2.11 ⑤：add-folder 提为独立沉底钮 + workmode（chat|work 同源）插入底排。
  expect(order).toEqual(['add', 'paste', 'add-folder', 'workmode', 'scope', 'provider', 'send']);
});

test('welcome continuation rows route explicitly without sticky default scope', async ({ page }) => {
  await expect(page.getByTestId('composer')).not.toHaveAttribute('data-active-case');
  const rows = page.getByTestId('welcome-continuations').locator('button');
  await expect(rows).toHaveCount(1);
  await rows.first().click();
  await expect(page.getByTestId('demo-case-badge')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('welcome-state')).toBeVisible();
  await expect(page.getByTestId('composer')).not.toHaveAttribute('data-active-case');
});

test('message actions freeze absolute time and record thumbs feedback locally', async ({ page }) => {
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();
  const actions = page.getByTestId('message-actions-assistant-demo');
  await expect(actions.getByTestId('message-relative-time')).toHaveAttribute('datetime', /T/);
  await actions.getByRole('button', { name: 'Helpful', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('courtwork.message-feedback-ledger'))).toContain('assistant-demo');
  await expect(actions.getByRole('button', { name: 'Read aloud' })).toBeDisabled();
  await expect(actions.getByRole('button', { name: 'More message actions' })).toBeDisabled();
});
