import { expect, test } from '@playwright/test';
import { openWorkbench, ruleScale } from './helpers';

// —— 线级语法 · 运行时不变式（docs/design/courtwork-design.md §10 / SKIN-B3）——
//
// 静态门（scripts/assert-rule-grammar.mjs）管「每条线的归属与写法」，本谱管「浏览器真渲染
// 出来是不是两档」。两者不重叠：静态门读 CSS 文本，此处读 computed style，字面量一个不钉。

test('线重即层级：主界文武线严格粗于次界乌丝细线', async ({ page }) => {
  await openWorkbench(page);

  const rule = await ruleScale(page);
  expect(rule.major).toBeGreaterThan(rule.minor);
  expect(rule.minor).toBeGreaterThan(0);
  expect(rule.gap).toBeGreaterThan(0);

  // 主界取场景带上界：正文列 ↔ 页脚场景带的区段分隔。
  const strip = page.locator('.scene-strip');
  await expect(strip).toBeVisible();
  const measured = await strip.evaluate((element) => ({
    major: Number.parseFloat(getComputedStyle(element).borderTopWidth),
    hairline: Number.parseFloat(getComputedStyle(element, '::after').borderTopWidth),
    offset: Number.parseFloat(getComputedStyle(element, '::after').top),
  }));

  // 文武线＝两线俱在，且粗细错落：细线不得与粗线同重，也不得贴着粗线画成一条。
  expect(measured.major).toBe(rule.major);
  expect(measured.hairline).toBe(rule.minor);
  expect(measured.hairline).toBeLessThan(measured.major);
  expect(measured.offset).toBe(rule.gap);
});

test('线重不参与动画：主界与其细线均不把 border-width 挂进 transition', async ({ page }) => {
  await openWorkbench(page);

  // §10：层级变化随语义状态 0ms 硬切。动效门在 CSS 文本侧封白名单，此处核真渲染的兜底。
  const transitions = await page.locator('.scene-strip').evaluate((element) => [
    getComputedStyle(element).transitionProperty,
    getComputedStyle(element, '::after').transitionProperty,
  ]);
  for (const property of transitions) expect(property).not.toContain('border-width');
});
