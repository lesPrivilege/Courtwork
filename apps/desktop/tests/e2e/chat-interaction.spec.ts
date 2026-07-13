import { expect, test, type Page } from '@playwright/test';
import { openWorkbench } from './helpers';

async function openInteraction(page: Page) {
  await openWorkbench(page);
  const card = page.getByTestId('turn-card-question');
  await expect(card).toBeVisible();
  return card;
}

test('pending interaction survives refresh without duplicate request/card', async ({ page }) => {
  await openInteraction(page);
  await page.reload();
  await openWorkbench(page);
  const card = page.getByTestId('turn-card-question');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-state', 'pending');
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('courtwork.turn-journal.v1') ?? '{}')) as { entries?: unknown[] };
  expect(journal.entries).toHaveLength(1);
});

test('Recorded appears only after core accepts interaction_resolved', async ({ page }) => {
  const card = await openInteraction(page);
  await card.getByTestId('question-option-confirm').click();
  await expect(card).toHaveAttribute('data-state', 'resolved');
  await expect(card).toHaveAttribute('data-answer', 'confirm');
  await expect(card).toContainText('Recorded');
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('courtwork.turn-journal.v1') ?? '{}')) as { entries?: Array<{ type?: string }> };
  expect(journal.entries?.map((entry) => entry.type)).toEqual(['interaction_requested', 'interaction_resolved']);
});

test('validated source opens original, preserves emphasis, focuses and scrolls exact quote', async ({ page }) => {
  await openInteraction(page);
  await page.evaluate(() => {
    const original = HTMLElement.prototype.scrollIntoView;
    const scope = window as typeof window & { __sourceScrollBehavior?: ScrollBehavior; __restoreScrollIntoView?: () => void };
    scope.__restoreScrollIntoView = () => { HTMLElement.prototype.scrollIntoView = original; };
    HTMLElement.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      if (typeof options === 'object') scope.__sourceScrollBehavior = options.behavior;
    };
  });
  await page.getByTestId('interaction-source-0').click();
  const mark = page.getByTestId('reader-focus-anchor');
  await expect(mark).toBeVisible();
  await expect(mark).toContainText('每逾期一日应按未付金额的1%');
  await expect(mark.locator('xpath=ancestor::strong')).toHaveCount(1);
  await expect.poll(async () => mark.evaluate((element) => document.activeElement === element)).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { __sourceScrollBehavior?: ScrollBehavior }).__sourceScrollBehavior)).toBe('smooth');
  expect(await page.getByTestId('reader-pane').textContent()).not.toContain('**');
  await page.evaluate(() => (window as typeof window & { __restoreScrollIntoView?: () => void }).__restoreScrollIntoView?.());
});

test('pointer press uses scoped .98 feedback', async ({ page }) => {
  const card = await openInteraction(page);
  const option = card.getByTestId('question-option-confirm');
  const box = await option.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(160);
  expect(await option.evaluate((element) => getComputedStyle(element).transform)).toContain('0.98');
  await page.mouse.move(0, 0);
  await page.mouse.up();
});

test('keyboard activation never scales the focused option', async ({ page }) => {
  const card = await openInteraction(page);
  const option = card.getByTestId('question-option-confirm');
  await option.focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(160);
  await expect(option).toHaveCSS('transform', 'none');
  await page.keyboard.up('Enter');
});

test('corrupt journal fails closed with visible recovery and preserves raw storage', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('courtwork.turn-journal.v1', '{broken-json'));
  await openWorkbench(page);
  await expect(page.getByTestId('turn-recovery-error')).toBeVisible();
  await expect(page.getByTestId('turn-card-question')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('courtwork.turn-journal.v1'))).toBe('{broken-json');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('pointer press has no scale and source scroll uses auto', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const card = await openInteraction(page);
    const option = card.getByTestId('question-option-confirm');
    const box = await option.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(40);
    await expect(option).toHaveCSS('transform', 'none');
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await page.evaluate(() => {
      const original = HTMLElement.prototype.scrollIntoView;
      const scope = window as typeof window & { __sourceScrollBehavior?: ScrollBehavior; __restoreScrollIntoView?: () => void };
      scope.__restoreScrollIntoView = () => { HTMLElement.prototype.scrollIntoView = original; };
      HTMLElement.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
        if (typeof options === 'object') scope.__sourceScrollBehavior = options.behavior;
      };
    });
    await page.getByTestId('interaction-source-0').click();
    await expect(page.getByTestId('reader-focus-anchor')).toBeVisible();
    expect(await page.evaluate(() => (window as typeof window & { __sourceScrollBehavior?: ScrollBehavior }).__sourceScrollBehavior)).toBe('auto');
    await page.evaluate(() => (window as typeof window & { __restoreScrollIntoView?: () => void }).__restoreScrollIntoView?.());
  });
});
