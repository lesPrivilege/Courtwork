import { expect, test, type Page } from '@playwright/test';

async function openGuide(page: Page) {
  await page.goto('/');
  const guide = page.getByTestId('provider-setup');
  if (!await guide.isVisible()) await page.getByTestId('welcome-demo-start').click();
  await expect(guide).toBeVisible();
  return guide;
}

async function mockProbe(page: Page, result: Record<string, unknown>) {
  await page.evaluate((value) => {
    (window as unknown as { __courtworkProviderConnection: { setResult: (result: unknown) => void } })
      .__courtworkProviderConnection.setResult(value);
  }, result);
}

test.describe('PRV-1 provider 自配闭环', () => {
  test('产品配置只显示 DeepSeek key/model/reasoning，不显示 custom 或可编辑 Base URL', async ({ page }) => {
    const guide = await openGuide(page);
    await expect(guide).toContainText('DeepSeek');
    await expect(guide.getByTestId('provider-setup-provider')).toHaveCount(0);
    await expect(guide.getByTestId('provider-setup-base-url')).toHaveCount(0);
    await expect(guide.getByTestId('provider-setup-model')).toHaveValue('deepseek-v4-flash');
    await expect(guide.getByText(/custom|自定义/i)).toHaveCount(0);
  });

  test('校验成功把发现模型写入下拉并以真冒烟标 connected', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'ready', models: ['law-model-a', 'law-model-b'], modelDiscovery: 'available' } });
    await guide.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: 'Verify connection' }).click();
    // #44：成功就地绿徽 + 显式关闭
    await expect(guide.getByTestId('provider-setup-verified')).toBeVisible();
    await guide.getByTestId('provider-setup-done').click();
    await expect(guide).toHaveCount(0);
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'ready');
    await expect(page.getByTestId('composer-provider')).toContainText('law-model-a');
  });

  test('模型发现不支持时诚实降级但不阻塞连接', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'ready', modelDiscovery: 'unsupported' } });
    await guide.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: 'Verify connection' }).click();
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'ready');
  });

  test('真实请求失败按分型呈现且不得误报 connected', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'failed', failKind: 'endpoint' } });
    await guide.getByRole('textbox', { name: 'Access credential' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: 'Verify connection' }).click();
    await expect(guide.getByTestId('provider-setup-error')).toContainText('DeepSeek');
    await expect(guide.getByTestId('provider-setup-error')).not.toContainText('Base URL');
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'failed');
  });
});
