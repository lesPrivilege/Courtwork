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
  test('预设自动填 URL/推荐模型，自定义档才露 Base URL', async ({ page }) => {
    const guide = await openGuide(page);
    await expect(guide.getByTestId('provider-preset-url')).toContainText('api.deepseek.com/v1');
    await expect(guide.getByTestId('provider-setup-base-url')).toHaveCount(0);
    await expect(guide.getByTestId('provider-setup-model')).toHaveValue('deepseek-v4-flash');
    await guide.getByTestId('provider-setup-provider').selectOption('custom');
    await expect(guide.getByTestId('provider-setup-base-url')).toBeVisible();
    await expect(guide.getByTestId('provider-preset-url')).toHaveCount(0);
  });

  test('校验成功把发现模型写入下拉并以真冒烟标 connected', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { phase: 'connected', models: ['law-model-a', 'law-model-b'], modelDiscovery: 'available' });
    await guide.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: '验证连接' }).click();
    // #44：成功就地绿徽 + 显式关闭
    await expect(guide.getByTestId('provider-setup-verified')).toBeVisible();
    await guide.getByTestId('provider-setup-done').click();
    await expect(guide).toHaveCount(0);
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'connected');
    await expect(page.getByTestId('composer-provider')).toContainText('law-model-a');
  });

  test('模型发现不支持时诚实降级但不阻塞连接', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { phase: 'connected', modelDiscovery: 'unsupported' });
    await guide.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: '验证连接' }).click();
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'connected');
  });

  test('真实请求失败按分型呈现且不得误报 connected', async ({ page }) => {
    const guide = await openGuide(page);
    await mockProbe(page, { phase: 'failed', failKind: 'endpoint' });
    await guide.getByRole('textbox', { name: '访问凭证' }).fill('cw-valid-secret-key');
    await guide.getByRole('button', { name: '验证连接' }).click();
    await expect(guide.getByTestId('provider-setup-error')).toContainText('Base URL');
    await expect(page.getByTestId('composer-provider')).toHaveAttribute('data-phase', 'failed');
  });
});
