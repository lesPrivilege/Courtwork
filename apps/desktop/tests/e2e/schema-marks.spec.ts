import { expect, test } from '@playwright/test';
import { openModuleList, openWorkbench } from './helpers';

/**
 * SKIN-B4 记号消费面。静态门（`assert-schema-parts.mjs`）锁的是「几何与站面逐字相等、
 * 件内零字面色、每枚记号的克制审计结论有留痕」；本谱锁运行时那一半——**色真的来自消费点、
 * 印真的只在落定那一帧出现、仪式真的可以被完全关掉**。
 *
 * 三条判例在此各出一次力：
 * ① 断效力不断声明，且每条效力断言旁跟一个必定无效的阴性对照；
 * ② 「只在某态出现」的裁定必须双向锁；
 * ③ 暂时验不了的写成前向红卫，世界跟上那天它自己会红。
 */

async function openRevision(page: import('@playwright/test').Page) {
  await openWorkbench(page);
  await page.getByTestId('flow-s3').click();
  await page.getByTestId('revision-panel').waitFor();
}

test('C-4 可验半：记号色由消费点的宗给，几何本身不带宗（带阴性对照）', async ({ page }) => {
  await openWorkbench(page);
  await openModuleList(page);
  await page.getByTestId('module-working-folders-toggle').click();
  await page.getByTestId('reader-entry').first().click();

  const fishtail = page.getByTestId('mark-fishtail').first();
  await fishtail.waitFor();

  // 记号渲染色 ≡ 消费点所指派的**那一枚 token 的现值**，而不是几何里烧死的某个色。
  // 注意不是「等于父元素的 color」：节标取 text.primary，鱼尾取 text.secondary/tertiary 一档，
  // 记号本就该比它所标的字轻——「不带宗」说的是几何不带值，不是消费点不许挑档。
  const bound = await page.evaluate(() => {
    const mark = document.querySelector<SVGElement>('[data-testid="mark-fishtail"]');
    const head = mark?.closest('h3');
    if (!mark || !head) throw new Error('鱼尾未落在 .reader-pane 的节标上');
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim();
    document.body.append(probe);
    const token = getComputedStyle(probe).color;
    probe.remove();
    return { mark: getComputedStyle(mark).color, head: getComputedStyle(head).color, token };
  });
  expect(bound.mark).toBe(bound.token);
  expect(bound.mark).not.toBe(bound.head);

  // 换宗即换色：运行时改写消费点所消费的那一枚 token，记号必须跟着走。
  const followed = await page.evaluate(() => {
    document.documentElement.style.setProperty('--text-tertiary', 'rgb(1, 2, 3)');
    const mark = document.querySelector<SVGElement>('[data-testid="mark-fishtail"]')!;
    const after = getComputedStyle(mark).color;
    document.documentElement.style.removeProperty('--text-tertiary');
    return after;
  });
  expect(followed).toBe('rgb(1, 2, 3)');

  // 阴性对照：改写一枚该消费点**不**消费的 token，记号必须纹丝不动。
  // 对照若也变了，说明上一条测的不是绑定关系而是别的什么，断言就不成立。
  const control = await page.evaluate(() => {
    document.documentElement.style.setProperty('--zhu-graphic', 'rgb(4, 5, 6)');
    const mark = document.querySelector<SVGElement>('[data-testid="mark-fishtail"]')!;
    const after = getComputedStyle(mark).color;
    document.documentElement.style.removeProperty('--zhu-graphic');
    return after;
  });
  expect(control).toBe(bound.mark);
});

test('C-4 前向红卫：双宗比对尚不可做——壳内 themes.dark 未上身（B5 范围）', async ({ page }) => {
  await openWorkbench(page);
  // C-4「记号不择纸温」的完整形态是 light/dark 两宗逐帧比对。壳侧当前**没有第二宗**：
  // 零 prefers-color-scheme、零 [data-theme] 选择器。故本谱只能验上一条的绑定关系，
  // 而把「验不了」本身写成断言——B5 一上身此条即红，逼着把 C-4 改写成真正的双宗比对。
  const themeHooks = await page.evaluate(() => {
    let colorScheme = 0;
    let themeAttr = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRule[];
      try { rules = Array.from(sheet.cssRules); } catch { continue; }
      const walk = (list: CSSRule[]) => {
        for (const rule of list) {
          if (rule instanceof CSSMediaRule) {
            if (rule.conditionText.includes('prefers-color-scheme')) colorScheme += 1;
            walk(Array.from(rule.cssRules));
          } else if (rule instanceof CSSStyleRule && rule.selectorText.includes('data-theme')) {
            themeAttr += 1;
          }
        }
      };
      walk(rules);
    }
    return { colorScheme, themeAttr };
  });
  expect(themeHooks).toEqual({ colorScheme: 0, themeAttr: 0 });
});

test('落定章只在落定那一帧出现（双向锁：未处置无印、驳回无印、确认才钤）', async ({ page }) => {
  await openRevision(page);
  const panel = page.getByTestId('revision-panel');

  // ① 缺席半之一：未处置。朱是印记色——没人按下去就没有印。
  await panel.locator('[data-risk-id="risk-02"]').click();
  await expect(page.getByTestId('settle-seal-risk-02')).toHaveCount(0);

  // ② 缺席半之二：驳回。驳回同是人工裁决，但它留的是退场记录不是钤印。
  await panel.getByRole('button', { name: '驳回', exact: true }).click();
  await expect(page.getByTestId('settle-seal-risk-02')).toHaveCount(0);
  await expect(panel.locator('[data-risk-id="risk-02"] .signature-line')).toHaveAttribute('data-tone', 'neutral');

  // ③ 在场半：确认。此时且仅此时钤印，且落在详情卡（列表行不铺开，仪式不做装饰）。
  await panel.locator('[data-risk-id="risk-04"]').click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  const seal = page.getByTestId('settle-seal-risk-04');
  await expect(seal).toHaveCount(1);
  await expect(page.locator('.risk-list .settle-seal')).toHaveCount(0);
  // 印取朱：色来自 --zhu-graphic 而非几何自带（件库零字面色由静态门锁，此处锁运行时归属）。
  const sealColor = await seal.evaluate((node) => getComputedStyle(node).color);
  const zhu = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--zhu-graphic').trim());
  const probe = await page.evaluate((raw) => {
    const span = document.createElement('span');
    span.style.color = raw;
    document.body.append(span);
    const resolved = getComputedStyle(span).color;
    span.remove();
    return resolved;
  }, zhu);
  expect(sealColor).toBe(probe);
});

test('仪式在 reduce 下完全停摆（计算态实测，非「媒体查询在场」）', async ({ page }) => {
  await openRevision(page);
  const panel = page.getByTestId('revision-panel');
  await panel.locator('[data-risk-id="risk-05"]').click();
  await panel.getByRole('button', { name: '确认此项', exact: true }).click();
  const seal = page.getByTestId('settle-seal-risk-05');
  await expect(seal).toHaveCount(1);

  // 常态：仪式在跑。这一条是下一条的对照——没有它，reduce 下的 none 可能只是它从来没跑过。
  expect(await seal.evaluate((node) => getComputedStyle(node).animationName)).toBe('seal-press');
  const keyframes = await page.evaluate(() => {
    for (const sheet of [...document.styleSheets]) {
      for (const rule of [...sheet.cssRules]) {
        if (rule instanceof CSSKeyframesRule && rule.name === 'seal-press') {
          return [...rule.cssRules].map((frame) => ({
            key: frame.keyText,
            opacity: frame.style.opacity,
            transform: frame.style.transform,
          }));
        }
      }
    }
    return [];
  });
  expect(keyframes, 'P3-S01：朱印仪式须含获签的 58% 回弹段，且只改 opacity/transform').toEqual([
    { key: '0%', opacity: '0', transform: 'rotate(-4deg) scale(1.16)' },
    { key: '58%', opacity: '0.62', transform: 'rotate(-4deg) scale(0.96)' },
    { key: '100%', opacity: '0.5', transform: 'rotate(-4deg) scale(1)' },
  ]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  // 全局兜底把动效压到 .01ms，那是「演得极快」不是「不演」。仪式必须是后者，
  // 故断计算态的 animationName 而不是 animationDuration。
  expect(await seal.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  // 印本身不随仪式消失——它是处置留痕，不是动效产物。
  await expect(seal).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});
