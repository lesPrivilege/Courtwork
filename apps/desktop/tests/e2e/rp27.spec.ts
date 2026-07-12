import { expect, test } from '@playwright/test';
import { openModuleList, openWorkbench } from './helpers';

test('generic chrome is English on the first-run surface', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('new-case-open')).toHaveAttribute('aria-label', 'New case');
  await expect(page.getByTestId('nav-artifacts')).toHaveText(/Output/);
  await expect(page.getByTestId('nav-scheduled')).toHaveText(/Scheduled/);
  await expect(page.getByTestId('nav-dispatch')).toHaveText(/Dispatch/);
  await expect(page.getByTestId('welcome-state')).toContainText('Start a task');
  await expect(page.getByTestId('welcome-demo-start')).toHaveText('Get started with the sample case');
  await expect(page.getByTestId('composer-input')).toHaveAttribute('placeholder', 'Describe a task or ask anything…');
  await expect(page.getByTestId('composer-send')).toHaveAttribute('aria-label', 'Send');
});

test('schema and container semantics remain Chinese behind English chrome', async ({ page }) => {
  await openWorkbench(page);

  await expect(page.getByTestId('demo-origin-label')).toHaveText('样板案');
  await expect(page.getByTestId('flow-s1')).toContainText('阅卷整理');
  await expect(page.getByTestId('flow-s3')).toContainText('合同审查');
  await expect(page.getByTestId('view-revision')).toHaveText(/修订预览/);
  await expect(page.getByTestId('case-file-count')).toContainText('卷宗');
  await expect(page.getByRole('button', { name: '确认', exact: true })).toBeVisible();
});

test('composer keeps four primary positions and consolidates attachment actions under plus', async ({ page }) => {
  await page.goto('/');
  const composer = page.getByTestId('composer');

  await expect(composer.getByTestId('composer-plus')).toBeVisible();
  await expect(composer.getByTestId('composer-case')).toBeVisible();
  await expect(composer.getByTestId('model-config-trigger')).toBeVisible();
  await expect(composer.getByTestId('composer-send')).toBeVisible();
  await expect(composer.getByTestId('composer-upload')).toHaveCount(0);

  await composer.getByTestId('composer-plus').click();
  await expect(composer.getByTestId('composer-upload')).toHaveText('Attach files');
  await expect(composer.getByTestId('composer-plus-folder')).toHaveText('Add folder');
});

test('utility dock and settings stay within the English chrome layer', async ({ page }) => {
  await openWorkbench(page);
  await openModuleList(page);

  await expect(page.getByTestId('module-progress')).toContainText('Progress');
  await expect(page.getByTestId('module-working-folders')).toContainText('Working folders');
  await expect(page.getByTestId('module-context')).toContainText('Context');

  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await expect(page.getByTestId('settings-page')).toContainText('Settings');
  await expect(page.getByTestId('settings-nav-model')).toHaveText('Model');
  await expect(page.getByTestId('settings-close')).toContainText('Close');
});

test('left rail metadata stays compact without duplicate demo or route labels', async ({ page }) => {
  await openWorkbench(page);
  const demo = page.getByTestId('case-card-demo-linjiang');

  await expect(demo.getByTestId('demo-origin-label')).toHaveCount(1);
  await expect(demo.getByTestId('case-file-count')).toHaveCount(1);
  await expect(page.getByTestId('user-menu')).toHaveCount(0);
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('user-menu').getByRole('menuitem', { name: 'Settings & updates' })).toHaveCount(1);
});
