import { expect, test, type Page } from '@playwright/test';
import { openWorkbench, openWorkingFolders } from './helpers';

type HostAuthHooks = { setNextAuthorize(result: unknown): void };

async function createGrantedWorkspace(page: Page) {
  await openWorkbench(page);
  await page.getByTestId('new-case-open').click();
  await page.evaluate(() => {
    (window as unknown as { __courtworkHostAuth: HostAuthHooks }).__courtworkHostAuth.setNextAuthorize({
      status: 'granted',
      grant: { grantId: 'grant-work-agent-gui', label: '通用工作区 · 路由证据' },
    });
  });
  await page.getByTestId('new-case-authorize').click();
  await page.getByTestId('new-case-dialog').getByRole('button', { name: '创建案件' }).click();
  await expect(page.getByTestId('new-case-dialog')).toBeHidden();
}

async function expectPiWork(page: Page) {
  await expect(page.getByTestId('segment-draft')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('pi-panel')).toBeVisible();
}

test('顶层顺序与已授权工作区默认入口为 Chat | Work | Scenes，Work 落 Pi', async ({ page }) => {
  await createGrantedWorkspace(page);
  const labels = await page.getByTestId('view-segment').getByRole('tab').allTextContents();
  expect(labels).toEqual(['Chat', 'Work', 'Scenes']);
  await expectPiWork(page);
});

test('零垂类 CTA 只切 Pi Work；generic Scenes 仍同框', async ({ page }) => {
  await createGrantedWorkspace(page);
  await page.getByTestId('segment-work').click();
  await expect(page.getByTestId('scene-unloaded-hint')).toHaveText('通用 Work 可用，专业 Scenes 未加载。');
  await expect(page.getByTestId('scene-generic.draft')).toBeVisible();
  await page.getByTestId('scene-unloaded-work').click();
  await expectPiWork(page);
});

test('Working folders 工作稿入口只切 Pi Work', async ({ page }) => {
  await createGrantedWorkspace(page);
  await page.getByTestId('segment-work').click();
  await openWorkingFolders(page);
  await page.getByTestId('wf-open-pi-work').click();
  await expectPiWork(page);
});
