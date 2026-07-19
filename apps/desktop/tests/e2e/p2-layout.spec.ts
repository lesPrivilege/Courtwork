import { expect, test, type Page } from '@playwright/test';

import { openWorkbench } from './helpers';

async function openComparison(page: Page, width: number) {
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
  await openWorkbench(page);
  await page.getByTestId('split-start').click();
  const workspace = page.getByTestId('workspace');
  await expect(workspace).toHaveAttribute('data-comparing', 'true');
  return workspace;
}

test('P2-L18：1600×900 比较态收栏撤卡且零 48px 幽灵轨', async ({ page }) => {
  const workspace = await openComparison(page, 1600);

  await expect(workspace).toHaveAttribute('data-left-collapsed', 'true');
  await expect(page.getByTestId('case-rail')).toHaveCount(0);
  await expect(page.getByTestId('collapse-left-rail')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const ws = document.querySelector<HTMLElement>('[data-testid="workspace"]')!;
    const conversation = document.querySelector<HTMLElement>('[data-testid="conversation-canvas"]')!;
    return {
      tracks: getComputedStyle(ws).gridTemplateColumns.split(' '),
      workspaceLeft: ws.getBoundingClientRect().left,
      conversationLeft: conversation.getBoundingClientRect().left,
    };
  });
  expect(geometry.tracks).toHaveLength(2);
  expect(geometry.tracks[0]).not.toBe('48px');
  expect(geometry.conversationLeft - geometry.workspaceLeft).toBeLessThanOrEqual(9);
});

test('P2-L17：1600×900 比较态 composer 不越过对话列右界', async ({ page }) => {
  await openComparison(page, 1600);

  const geometry = await page.evaluate(() => {
    const conversation = document.querySelector<HTMLElement>('[data-testid="conversation-canvas"]')!.getBoundingClientRect();
    const composer = document.querySelector<HTMLElement>('.composer-shell')!.getBoundingClientRect();
    const composerFloat = document.querySelector<HTMLElement>('.composer-float')!.getBoundingClientRect();
    const right = document.querySelector<HTMLElement>('[data-testid="right-module-stack"]')!.getBoundingClientRect();
    return {
      conversationLeft: conversation.left,
      conversationRight: conversation.right,
      composerLeft: composer.left,
      composerRight: composer.right,
      composerFloatRight: composerFloat.right,
      rightLeft: right.left,
      rootScrollWidth: document.documentElement.scrollWidth,
      rootClientWidth: document.documentElement.clientWidth,
    };
  });

  expect(geometry.composerLeft).toBeGreaterThanOrEqual(geometry.conversationLeft);
  expect(geometry.composerRight).toBeLessThanOrEqual(geometry.conversationRight + 1);
  expect(geometry.composerRight).toBeLessThanOrEqual(geometry.rightLeft);
  expect(geometry.composerFloatRight).toBeLessThanOrEqual(geometry.conversationRight + 1);
  expect(geometry.rootScrollWidth).toBeLessThanOrEqual(geometry.rootClientWidth);
});
