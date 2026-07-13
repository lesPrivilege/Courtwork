import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('bound dossier removes the duplicate composer folder picker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('composer-case')).toBeVisible();
  await expect(page.getByTestId('composer-case')).toContainText('Choose case');

  await page.getByTestId('welcome-demo-start').click();
  await page.getByTestId('provider-skip').click();
  await expect(page.getByTestId('assistant-turn-demo')).toBeVisible();
  await expect(page.getByTestId('composer-case')).toHaveCount(0);
});

test('artifact turn card is a light summary route back to Preview', async ({ page }) => {
  await openWorkbench(page);
  const artifact = page.getByTestId('turn-card-artifact');
  await expect(artifact).toBeVisible();
  await expect(artifact).toContainText('发现 6 项合同风险');
  await expect(artifact).not.toContainText('高危 2 项、中危 3 项');

  // 2026-07-12 改判：preview 常驻——artifact 卡 = 轻摘要路由（切视图），无关闭往返
  await page.getByTestId('view-timeline').click();
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

test('module body opens inline in the rail list and folds back (十四章手风琴)', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('preview-back').click();
  await page.getByTestId('module-working-folders-toggle').click();
  const body = page.getByTestId('module-working-folders');
  await expect(body).toHaveAttribute('data-open', 'true');
  await expect(body).toContainText('原件阅读');
  // 再点折回；大纲行进浏览器态恢复 preview
  await page.getByTestId('module-working-folders-toggle').click();
  await expect(body).toHaveAttribute('data-open', 'false');
  await page.getByTestId('outline-revision').click();
  await expect(page.getByTestId('preview-host')).toBeVisible();
});

test('interaction turn card exposes manifest options without local skip or blocking workbench', async ({ page }) => {
  await openWorkbench(page);
  const question = page.getByTestId('turn-card-question');
  await expect(question).toBeVisible();
  await expect(question.getByTestId('question-option-confirm')).toBeVisible();
  await expect(question.getByTestId('question-option-revise')).toBeVisible();
  await expect(question.getByTestId('question-skip')).toHaveCount(0);
  await expect(page.getByTestId('preview-host')).toBeVisible();

  await expect(question).toHaveAttribute('data-answer', 'unanswered');
  await expect(page.getByTestId('composer-input')).toBeEnabled();
});
