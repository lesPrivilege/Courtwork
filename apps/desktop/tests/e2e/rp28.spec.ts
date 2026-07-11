import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('bound dossier removes the duplicate composer folder picker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('composer-case')).toBeVisible();
  await expect(page.getByTestId('composer-case')).toContainText('Choose case');

  await page.getByTestId('welcome-demo-start').click();
  await expect(page.getByTestId('assistant-turn-demo')).toBeVisible();
  await expect(page.getByTestId('composer-case')).toHaveCount(0);
});

test('artifact turn card is a light summary route back to Preview', async ({ page }) => {
  await openWorkbench(page);
  const artifact = page.getByTestId('turn-card-artifact');
  await expect(artifact).toBeVisible();
  await expect(artifact).toContainText('发现 6 项合同风险');
  await expect(artifact).not.toContainText('高危 2 项、中危 3 项');

  await page.getByTestId('preview-close').click();
  await expect(page.getByTestId('preview-host')).toHaveCount(0);
  await artifact.click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('view-revision')).toHaveAttribute('aria-selected', 'true');
});

test('tool call row is collapsed by default and expands auditable mono details', async ({ page }) => {
  await openWorkbench(page);
  const tool = page.getByTestId('tool-call-row');
  await expect(tool).toBeVisible();
  await expect(tool).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('tool-call-details')).toHaveCount(0);
  await tool.locator('summary').click();
  await expect(tool).toHaveAttribute('open', '');
  await expect(page.getByTestId('tool-call-details')).toContainText('args');
  await expect(page.getByTestId('tool-call-details')).toContainText('result');
  await expect(page.getByTestId('tool-call-details')).toHaveCSS('font-family', /mono/i);
});

test('utility dock opens an L2 dropdown without replacing Preview and closes outside', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.getByTestId('utility-rail')).toHaveCSS('box-shadow', 'none');
  await expect(page.getByTestId('view-revision')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('module-working-folders-toggle').click();
  const dropdown = page.getByTestId('utility-dock-popover');
  await expect(dropdown).toBeVisible();
  await expect(dropdown).toContainText('Working folders');
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('view-revision')).toHaveAttribute('aria-selected', 'true');

  await page.getByTestId('chat-case-title').click();
  await expect(dropdown).toHaveCount(0);
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

test('question turn card records a closed enum answer without blocking the workbench', async ({ page }) => {
  await openWorkbench(page);
  const question = page.getByTestId('turn-card-question');
  await expect(question).toBeVisible();
  await expect(question.getByTestId('question-option-focus-payment-acceptance')).toBeVisible();
  await expect(question.getByTestId('question-skip')).toBeVisible();
  await expect(page.getByTestId('preview-host')).toBeVisible();

  await question.getByTestId('question-option-focus-payment-acceptance').click();
  await expect(question).toHaveAttribute('data-answer', 'focus-payment-acceptance');
  await expect(question).toContainText('Recorded');
  await expect(page.getByTestId('preview-host')).toBeVisible();
  await expect(page.getByTestId('composer-input')).toBeEnabled();
});
