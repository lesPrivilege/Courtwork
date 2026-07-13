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
  // RP-2.12 待机主屏：非卡片（品牌 icon+slogan+居中 composer），welcome 内含 composer
  const welcome = page.getByTestId('welcome-state');
  await expect(welcome.locator('.welcome-slogan')).toBeVisible();
  await expect(welcome.getByTestId('composer')).toBeVisible();
  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();
  await expect(page.getByTestId('case-rail')).toHaveCSS('--home-row-height', '36px');
  await expect(page.getByTestId('preview-host')).not.toHaveCSS('border-radius', '16px');
});

test('frontier composer order keeps the five-slot bottom row (paste folded into +)', async ({ page }) => {
  const composer = page.getByTestId('composer');
  const order = await composer.locator('[data-composer-slot]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-composer-slot')));
  // RP-2.11 ⑤ + 交接拍板：撤 paste 独立钮（⌘V + 「+」收纳）；
  // 2026-07-12 省并：add-folder 撤（重复,归「+」菜单）;底排 add/workmode/provider/send + scope chip。
  expect(order).toEqual(['add', 'workmode', 'scope', 'provider', 'send']);
});

test('welcome continuation rows route explicitly without sticky default scope', async ({ page }) => {
  await expect(page.getByTestId('composer')).not.toHaveAttribute('data-active-case');
  const rows = page.getByTestId('welcome-continuations').locator('button');
  await expect(rows).toHaveCount(2);
  await rows.nth(1).click();
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
