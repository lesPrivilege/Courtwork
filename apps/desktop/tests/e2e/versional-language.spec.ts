import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

test('VERSIONAL-LANG · Agent routine 线退场但 composer 与交互外框仍在', async ({ page }) => {
  await openWorkbench(page);
  const metrics = await page.evaluate(() => {
    const border = (selector: string, side: 'Top' | 'Right' | 'Bottom' | 'Left' = 'Bottom') =>
      Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>(selector) ?? document.body)[`border${side}Width`]);
    return {
      sceneTop: border('.scene-strip', 'Top'),
      disabledReason: border('.composer-disabled-reason', 'Top'),
      decisionTop: border('.visual-decision-actions', 'Top'),
      optionBottom: border('.visual-decision-actions .question-option', 'Bottom'),
      composerFrame: border('.composer-shell', 'Top'),
      previewFrame: border('.preview-host', 'Top'),
    };
  });

  expect(metrics).toMatchObject({
    sceneTop: 0,
    disabledReason: 0,
    decisionTop: 0,
    optionBottom: 0,
    composerFrame: 1,
    previewFrame: 1,
  });

  await page.getByTestId('segment-chat').click();
  const composer = page.locator('.composer-shell');
  await expect(page.getByTestId('composer-input')).toBeEnabled();
  await page.getByTestId('composer-input').focus();
  const [focusColor, expectedFocusColor] = await Promise.all([
    composer.evaluate((node) => getComputedStyle(node).borderTopColor),
    page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--text-tertiary)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }),
  ]);
  expect(focusColor).toBe(expectedFocusColor);
  expect(focusColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('VERSIONAL-LANG · schema 逐行线与四格竖线退场，主从界和整组界保留', async ({ page }) => {
  await openWorkbench(page);
  await page.getByTestId('revision-panel').locator('[data-risk-id="risk-03"]').click();
  const metrics = await page.evaluate(() => {
    const width = (selector: string, side: 'Top' | 'Right' | 'Bottom' | 'Left') =>
      Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>(selector)!)[`border${side}Width`]);
    return {
      rowBottom: width('.dense-row', 'Bottom'),
      ledgerCellRight: width('.risk-status-ledger > div', 'Right'),
      ledgerTop: width('.risk-status-ledger', 'Top'),
      ledgerBottom: width('.risk-status-ledger', 'Bottom'),
      masterDetail: width('.risk-list', 'Right') + width('.risk-list', 'Bottom'),
    };
  });

  expect(metrics).toEqual({ rowBottom: 0, ledgerCellRight: 0, ledgerTop: 1, ledgerBottom: 1, masterDetail: 1 });
});

test('VERSIONAL-LANG · 低频案件题走标题轨，中性标签退为 mono 文字', async ({ page }) => {
  await openWorkbench(page);
  const values = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector<HTMLElement>('.chat-case-title')!);
    const badge = getComputedStyle(document.querySelector<HTMLElement>('.demo-badge')!);
    return {
      titleFamily: title.fontFamily,
      titleWeight: title.fontWeight,
      badgeFamily: badge.fontFamily,
      badgeBorder: Number.parseFloat(badge.borderTopWidth),
      badgeBackground: badge.backgroundColor,
    };
  });

  expect(values.titleFamily).toContain('Source Han Serif SC');
  expect(values.titleWeight).toBe('600');
  expect(values.badgeFamily).toContain('SF Mono');
  expect(values.badgeBorder).toBe(0);
  expect(values.badgeBackground).toBe('rgba(0, 0, 0, 0)');
});

test('VERSIONAL-LANG · Settings 靠组距分段，真实输入边界不退', async ({ page }) => {
  await openWorkbench(page);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings' }).click();
  await page.getByTestId('settings-nav-appearance').click();
  const values = await page.evaluate(() => {
    const row = getComputedStyle(document.querySelector<HTMLElement>('.settings-row')!);
    const input = getComputedStyle(document.querySelector<HTMLElement>('[data-testid="settings-theme-mode"]')!);
    return {
      rowBottom: Number.parseFloat(row.borderBottomWidth),
      rowPaddingTop: Number.parseFloat(row.paddingTop),
      inputBorder: Number.parseFloat(input.borderTopWidth),
    };
  });

  expect(values.rowBottom).toBe(0);
  expect(values.rowPaddingTop).toBeGreaterThanOrEqual(14);
  expect(values.inputBorder).toBe(1);
});
