import { expect, test } from '@playwright/test';
import { S3_RISK_LIST_RESPONSE } from '@courtwork/legal/testing';
import { createRealFixtureGallery, LEGAL_RISK_LIST_HASH, PM_PRD_REVIEW_HASH } from '../fixtures/visual-gallery.js';

test('VISUAL-KIT gallery 在四档视口原生绘制十二族并保留真实 fixture provenance', async ({ page }, testInfo) => {
  const gallery = createRealFixtureGallery(S3_RISK_LIST_RESPONSE);
  await page.addInitScript((view) => {
    window.__COURTWORK_VISUAL_GALLERY__ = view;
  }, gallery);

  for (const width of [1180, 1280, 1440, 1600]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/visual-gallery.html');
    const specimens = page.locator('[data-gallery-specimen]');
    await expect(specimens).toHaveCount(12);
    await expect(page.locator('[data-namespace="pm"]')).toContainText(PM_PRD_REVIEW_HASH);
    await expect(page.locator('[data-namespace="legal"]')).toContainText(LEGAL_RISK_LIST_HASH);
    await expect(page.locator('body')).not.toContainText('VISUAL SYSTEM / 01');
    await page.screenshot({ path: testInfo.outputPath(`visual-gallery-${width}.png`), fullPage: true });
  }
});

test('VERSIONAL-LANG-3 gallery 自然解析深宗，图谱总题泥金而正文保持冷白', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/visual-gallery.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const colors = await page.evaluate(() => ({
    title: getComputedStyle(document.querySelector<HTMLElement>('.gallery-header h1')!).color,
    body: getComputedStyle(document.body).color,
  }));
  expect(colors).toEqual({ title: 'rgb(217, 174, 106)', body: 'rgb(228, 233, 241)' });
});
