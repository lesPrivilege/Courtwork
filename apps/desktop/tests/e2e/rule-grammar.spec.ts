import { expect, test } from '@playwright/test';
import { openWorkbench, ruleScale, tokenColor } from './helpers';

// —— 线级语法 · 运行时不变式（docs/design/courtwork-design.md §10 / SKIN-B3）——
//
// 静态门（scripts/assert-rule-grammar.mjs）管「每条线的归属与写法」，本谱管「浏览器真渲染
// 出来是不是两档」。两者不重叠：静态门读 CSS 文本，此处读 computed style，字面量一个不钉。

test('P1 逐界裁决：保留主界层级，高频场景带回单线', async ({ page }) => {
  await openWorkbench(page);

  const rule = await ruleScale(page);
  expect(rule.major).toBeGreaterThan(rule.minor);
  expect(rule.minor).toBeGreaterThan(0);
  expect(rule.gap).toBeGreaterThan(0);

  const panel = page.locator('.panel-head').first();
  const strip = page.locator('.scene-strip');
  await expect(panel).toBeVisible();
  await expect(strip).toBeVisible();
  const measured = await page.evaluate(() => {
    const panelElement = document.querySelector('.panel-head');
    const stripElement = document.querySelector('.scene-strip');
    if (!(panelElement instanceof HTMLElement) || !(stripElement instanceof HTMLElement)) throw new Error('线级测点缺失');
    const probe = document.createElement('span');
    probe.style.color = 'var(--border)';
    document.body.append(probe);
    const border = getComputedStyle(probe).color;
    probe.remove();
    return {
      border,
      panel: {
        major: Number.parseFloat(getComputedStyle(panelElement).borderBottomWidth),
        majorColor: getComputedStyle(panelElement).borderBottomColor,
        hairline: Number.parseFloat(getComputedStyle(panelElement, '::after').borderBottomWidth),
        hairlineColor: getComputedStyle(panelElement, '::after').borderBottomColor,
        offset: Number.parseFloat(getComputedStyle(panelElement, '::after').bottom),
      },
      strip: {
        width: Number.parseFloat(getComputedStyle(stripElement).borderTopWidth),
        color: getComputedStyle(stripElement).borderTopColor,
        hairline: Number.parseFloat(getComputedStyle(stripElement, '::after').borderTopWidth),
        pseudoContent: getComputedStyle(stripElement, '::after').content,
      },
    };
  });

  // M01：层级仍在，文武线只退对比；粗细几何不动、两线同落普通 border 色。
  expect(measured.panel.major).toBe(rule.major);
  expect(measured.panel.hairline).toBe(rule.minor);
  expect(measured.panel.hairline).toBeLessThan(measured.panel.major);
  expect(measured.panel.offset).toBe(rule.gap);
  expect(measured.panel.majorColor).toBe(measured.border);
  expect(measured.panel.hairlineColor).toBe(measured.border);

  // M07：高频 composer 上界回单线；旧文武线伪元素必须真实退场，而非透明占位。
  expect(measured.strip.width).toBe(rule.minor);
  expect(measured.strip.color).toBe(measured.border);
  expect(measured.strip.hairline).toBe(0);
  expect(measured.strip.pseudoContent).toBe('none');
});

test('P1 签署消费值：减薄只退色槽，回单线只走 minor 且撤伴生线', async ({ page }) => {
  await openWorkbench(page);

  const [border, ruleInk] = await Promise.all([
    tokenColor(page, '--border'),
    tokenColor(page, '--rule-ink'),
  ]);
  expect(border).not.toBe(ruleInk);

  const signed = await page.evaluate(() => {
    const read = (selector: string, side: 'Top' | 'Bottom' | '') => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`缺少 P1 运行时消费点：${selector}`);
      const style = getComputedStyle(element);
      return {
        width: Number.parseFloat(side === 'Top' ? style.borderTopWidth : side === 'Bottom' ? style.borderBottomWidth : style.borderWidth),
        color: side === 'Top' ? style.borderTopColor : side === 'Bottom' ? style.borderBottomColor : style.borderColor,
      };
    };
    const panel = document.querySelector('.panel-head');
    const scene = document.querySelector('.scene-strip');
    if (!(panel instanceof HTMLElement) || !(scene instanceof HTMLElement)) throw new Error('缺少 P1 运行时主测点');
    return {
      panel: read('.panel-head', 'Bottom'),
      panelHairline: {
        width: Number.parseFloat(getComputedStyle(panel, '::after').borderBottomWidth),
        color: getComputedStyle(panel, '::after').borderBottomColor,
      },
      scene: read('.scene-strip', 'Top'),
      sceneHairline: Number.parseFloat(getComputedStyle(scene, '::after').borderTopWidth),
      sampleTour: read('.sample-tour', ''),
    };
  });
  const rule = await ruleScale(page);

  expect(signed.panel).toEqual({ width: rule.major, color: border });
  expect(signed.panelHairline).toEqual({ width: rule.minor, color: border });
  expect(signed.scene).toEqual({ width: rule.minor, color: border });
  expect(signed.sceneHairline).toBe(0);
  expect(signed.sampleTour).toEqual({ width: rule.minor, color: border });
});

test('线重不参与动画：主界与其细线均不把 border-width 挂进 transition', async ({ page }) => {
  await openWorkbench(page);

  // §10：层级变化随语义状态 0ms 硬切。动效门在 CSS 文本侧封白名单，此处核真渲染的兜底。
  const transitions = await page.locator('.panel-head').first().evaluate((element) => [
    getComputedStyle(element).transitionProperty,
    getComputedStyle(element, '::after').transitionProperty,
  ]);
  for (const property of transitions) expect(property).not.toContain('border-width');
});
