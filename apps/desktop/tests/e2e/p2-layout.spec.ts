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

test('P2-L19：detached chrome 为交通灯与应用按钮留出标题安全区', async ({ page }) => {
  await openComparison(page, 1600);

  const geometry = await page.evaluate(() => {
    const chrome = document.querySelector<HTMLElement>('.window-chrome.is-detached')!;
    const actions = [...chrome.querySelectorAll<HTMLElement>('.window-chrome-button')];
    const title = document.querySelector<HTMLElement>('[data-testid="chat-case-title"]')!;
    const chromeRight = Math.max(...actions.map((action) => action.getBoundingClientRect().right));
    return {
      chromeRight,
      titleLeft: title.getBoundingClientRect().left,
      titleRight: title.getBoundingClientRect().right,
      titleScrollWidth: title.scrollWidth,
      titleClientWidth: title.clientWidth,
    };
  });

  expect(geometry.titleLeft).toBeGreaterThanOrEqual(geometry.chromeRight + 8);
  expect(geometry.titleRight).toBeGreaterThan(geometry.titleLeft);
  expect(geometry.titleScrollWidth).toBeGreaterThanOrEqual(geometry.titleClientWidth);
});

test('P2-L20：窄对话列免责声明按自身容器换行且不跨入右工作面', async ({ page }) => {
  await openComparison(page, 1600);

  const geometry = await page.evaluate(() => {
    const conversation = document.querySelector<HTMLElement>('[data-testid="conversation-canvas"]')!.getBoundingClientRect();
    const stack = document.querySelector<HTMLElement>('.composer-stack')!.getBoundingClientRect();
    const disclaimer = document.querySelector<HTMLElement>('.composer-disclaimer')!;
    const disclaimerRect = disclaimer.getBoundingClientRect();
    const right = document.querySelector<HTMLElement>('[data-testid="right-module-stack"]')!.getBoundingClientRect();
    return {
      conversationRight: conversation.right,
      stackLeft: stack.left,
      stackRight: stack.right,
      disclaimerLeft: disclaimerRect.left,
      disclaimerRight: disclaimerRect.right,
      disclaimerScrollWidth: disclaimer.scrollWidth,
      disclaimerClientWidth: disclaimer.clientWidth,
      rightLeft: right.left,
      whiteSpace: getComputedStyle(disclaimer).whiteSpace,
    };
  });

  expect(geometry.disclaimerLeft).toBeGreaterThanOrEqual(geometry.stackLeft);
  expect(geometry.disclaimerRight).toBeLessThanOrEqual(geometry.stackRight + 1);
  expect(geometry.disclaimerRight).toBeLessThanOrEqual(geometry.conversationRight + 1);
  expect(geometry.disclaimerRight).toBeLessThanOrEqual(geometry.rightLeft);
  expect(geometry.disclaimerScrollWidth).toBeLessThanOrEqual(geometry.disclaimerClientWidth + 1);
  expect(geometry.whiteSpace).toBe('normal');
});

test('P2-L21：1440×900 焦点态预览标题避让 AppKit 与应用按钮安全区', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkbench(page);
  await page.getByTestId('focus-toggle').click();

  const workspace = page.getByTestId('workspace');
  await expect(workspace).toHaveAttribute('data-focus-mode', 'true');

  const geometry = await page.evaluate(() => {
    const chrome = document.querySelector<HTMLElement>('.window-chrome.is-detached')!;
    const actions = [...chrome.querySelectorAll<HTMLElement>('.window-chrome-button')];
    const back = document.querySelector<HTMLElement>('.preview-host-head .preview-back')!;
    const title = document.querySelector<HTMLElement>('.preview-host-title')!;
    const meta = document.querySelector<HTMLElement>('.preview-host-meta')!;
    const chromeRight = Math.max(...actions.map((action) => action.getBoundingClientRect().right));
    const backRect = back.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const metaRect = meta.getBoundingClientRect();
    return {
      chromeRight,
      backLeft: backRect.left,
      backRight: backRect.right,
      titleLeft: titleRect.left,
      titleRight: titleRect.right,
      metaLeft: metaRect.left,
    };
  });

  expect(geometry.backLeft).toBeGreaterThanOrEqual(geometry.chromeRight + 8);
  expect(geometry.titleLeft).toBeGreaterThanOrEqual(geometry.backRight + 2);
  expect(geometry.metaLeft).toBeGreaterThanOrEqual(geometry.titleRight + 8);
});
