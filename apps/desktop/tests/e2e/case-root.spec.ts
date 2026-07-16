import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

/**
 * CASE-ROOT-1：新建案件的文件夹绑定经宿主原生 picker（hostAuth port）。
 * 浏览器 E2E 无原生 picker，授权结果由 `window.__courtworkHostAuth` 设定；
 * 断言只认结构化 `data-reason`/`data-*` 与可见文案，且面内绝无绝对路径。
 */

type HostAuthHooks = {
  reset(): void;
  setNextAuthorize(result: unknown): void;
};

const NO_ABSOLUTE_PATH = /[/\\]Users[/\\]|[/\\]private[/\\]|[A-Za-z]:\\/;

async function resetHooks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.reset();
  });
}

async function setNextAuthorize(page: Page, result: unknown) {
  await page.evaluate((next) => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize(next);
  }, result);
}

async function openNewCaseDialog(page: Page) {
  await page.getByTestId('new-case-open').click();
  await expect(page.getByTestId('new-case-dialog')).toBeVisible();
}

test('新建案件：取消 / TCC 拒绝授权 → denied 结构化可见，不推进命名', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openNewCaseDialog(page);

  await setNextAuthorize(page, { status: 'failed', reason: 'denied' });
  await page.getByTestId('new-case-authorize').click();

  const failure = page.getByTestId('new-case-auth-failure');
  await expect(failure).toBeVisible();
  await expect(failure).toHaveAttribute('data-reason', 'denied');
  await expect(failure).toContainText('未获得');
  // 失败不推进：仍在选择步，命名输入未出现
  await expect(page.getByRole('textbox', { name: '案件名称' })).toHaveCount(0);
});

test('新建案件：授权成立 → 绑定文件夹并建案；renderer 只见 label，无绝对路径', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openNewCaseDialog(page);

  await setNextAuthorize(page, {
    status: 'granted',
    grant: { grantId: 'grant-case-e2e', label: '设备采购案卷' },
  });
  await page.getByTestId('new-case-authorize').click();

  const dialog = page.getByTestId('new-case-dialog');
  await expect(dialog.getByTestId('new-case-folder-label')).toHaveAttribute('data-label', '设备采购案卷');
  // 名称建议 = 文件夹 label
  await expect(page.getByRole('textbox', { name: '案件名称' })).toHaveValue('设备采购案卷');
  // 面内只见 label（opaque grant），绝无绝对路径
  expect(await dialog.innerText()).not.toMatch(NO_ABSOLUTE_PATH);

  await dialog.getByRole('button', { name: '创建案件' }).click();
  await expect(dialog).toBeHidden();
  // 建成真实案（非 demo），标题即案名
  await expect(page.getByTestId('titlebar-case-title')).toHaveText('设备采购案卷');
  await expect(page.getByTestId('demo-case-badge')).toHaveCount(0);
});

test('新建案件：重授权 → 重选文件夹显式换新 grant（旧引用不粘滞）', async ({ page }) => {
  await openWorkbench(page);
  await resetHooks(page);
  await openNewCaseDialog(page);

  await setNextAuthorize(page, {
    status: 'granted',
    grant: { grantId: 'grant-old', label: '旧文件夹' },
  });
  await page.getByTestId('new-case-authorize').click();
  await expect(page.getByTestId('new-case-folder-label')).toHaveAttribute('data-grant-id', 'grant-old');

  await setNextAuthorize(page, {
    status: 'granted',
    grant: { grantId: 'grant-new', label: '新文件夹' },
  });
  await page.getByTestId('new-case-reauthorize').click();
  await expect(page.getByTestId('new-case-folder-label')).toHaveAttribute('data-grant-id', 'grant-new');
  await expect(page.getByTestId('new-case-folder-label')).toHaveAttribute('data-label', '新文件夹');
});
