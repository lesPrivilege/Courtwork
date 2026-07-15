import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * HOST-AUTH-LITE：经注入宿主樁驱动，断言四类失败与 happy 授权的可见呈现。
 * 浏览器 E2E 无原生 picker，全部结果由 `window.__courtworkHostAuth` 逐类设定；
 * 断言只认结构化 `data-reason`/`data-testid` 与可见文案，且面内绝无绝对路径。
 */

type HostAuthHooks = {
  reset(): void;
  setGrants(grants: Array<{ grantId: string; label: string }>): void;
  setNextAuthorize(result: unknown): void;
  setNextRead(result: unknown): void;
  setNextWrite(result: unknown): void;
};

async function openHostAccess(page: Page) {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await page.getByTestId('settings-nav-output').click();
  await expect(page.getByTestId('host-access-row')).toBeVisible();
}

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.reset();
  });
}

test('授权前呈现空态，可见宿主授权入口', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openHostAccess(page);
  await expect(page.getByTestId('host-access-empty')).toBeVisible();
  await expect(page.getByTestId('host-access-authorize')).toBeVisible();
  // 空态不出现 Verify（无授权目录）
  await expect(page.getByTestId('host-access-verify')).toHaveCount(0);
});

test('用户取消/TCC 拒绝 → denied 显式可见', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openHostAccess(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'failed',
      reason: 'denied',
    });
  });
  await page.getByTestId('host-access-authorize').click();
  const failure = page.getByTestId('host-access-failure');
  await expect(failure).toBeVisible();
  await expect(failure).toHaveAttribute('data-reason', 'denied');
  await expect(failure).toContainText('未获得');
});

test('happy path：授权成立 + 读写探针验证通过，仅显示 label 无绝对路径', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openHostAccess(page);
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-e2e-1', label: '临江案卷' },
    });
  });
  await page.getByTestId('host-access-authorize').click();
  await expect(page.getByTestId('host-access-authorized')).toHaveAttribute('data-label', '临江案卷');
  await expect(page.getByTestId('host-access-grant')).toHaveAttribute('data-grant-id', 'grant-e2e-1');

  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth;
    hooks.setNextWrite({ status: 'wrote', byteLength: 24 });
    hooks.setNextRead({ status: 'read', bytes: [1, 2, 3] });
  });
  await page.getByTestId('host-access-verify').click();
  await expect(page.getByTestId('host-access-verified')).toHaveAttribute('data-label', '临江案卷');

  // 绝对路径绝不进入 renderer 可见状态
  const rowText = await page.getByTestId('host-access-row').innerText();
  expect(rowText).not.toMatch(/[/\\]Users[/\\]|[/\\]private[/\\]|[A-Za-z]:\\/);
});

test('撤权/卷卸载/越权：读写探针三类失败逐一显式 fail-closed', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openHostAccess(page);
  // 先取得一个授权，露出 Verify 入口
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-e2e-2', label: '设备采购案' },
    });
  });
  await page.getByTestId('host-access-authorize').click();
  await expect(page.getByTestId('host-access-verify')).toBeVisible();

  // revoked（写路径失败）
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth;
    hooks.setNextWrite({ status: 'failed', reason: 'revoked' });
  });
  await page.getByTestId('host-access-verify').click();
  await expect(page.getByTestId('host-access-failure')).toHaveAttribute('data-reason', 'revoked');
  await expect(page.getByTestId('host-access-failure')).toContainText('已失效');

  // unavailable（写路径失败，卷卸载/路径不存在）
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth;
    hooks.setNextWrite({ status: 'failed', reason: 'unavailable' });
  });
  await page.getByTestId('host-access-verify').click();
  await expect(page.getByTestId('host-access-failure')).toHaveAttribute('data-reason', 'unavailable');
  await expect(page.getByTestId('host-access-failure')).toContainText('找不到');

  // out_of_scope（写成功后读路径越权失败，验证读侧也 fail-closed）
  await page.evaluate(() => {
    const hooks = (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth;
    hooks.setNextWrite({ status: 'wrote', byteLength: 24 });
    hooks.setNextRead({ status: 'failed', reason: 'out_of_scope' });
  });
  await page.getByTestId('host-access-verify').click();
  await expect(page.getByTestId('host-access-failure')).toHaveAttribute('data-reason', 'out_of_scope');
  await expect(page.getByTestId('host-access-failure')).toContainText('超出');
});
