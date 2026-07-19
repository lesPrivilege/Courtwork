import { expect, test } from '@playwright/test';
import { openWorkbench } from './helpers';

/** 字栈比较必须先归一引号：浏览器会把 'MiSans' 一类无需引号的标识符去引号后再回报。 */
const sameStack = (a: string, b: string) => a.replace(/['"]/g, '').replace(/\s+/g, ' ').trim()
  === b.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();

/**
 * 字体是懒加载的：没有元素真的用它，就不会 load，canvas 量到的是回退字。
 * 故所有度量前必须先把三件都推上真实渲染树再 await——这也是「量的是不是回退字」的前置条件。
 */
async function warmFonts(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.id = 'b2-warm';
    host.style.cssText = 'position:fixed;left:-9999px;top:0';
    host.innerHTML = '<span style="font:400 16px var(--font-body)">合同甲乙</span>'
      + '<span style="font:400 20px var(--font-title)">合同甲乙</span>'
      + '<span style="font:600 20px var(--font-title)">合同甲乙</span>';
    document.body.append(host);
    await document.fonts.ready;
  });
}

/** CJK 字面宽在各字体间一律 1em，量宽分不出字体——只能量墨（B2-0 判例）。 */
const INK = `(font, text) => {
  const c = document.createElement('canvas'); c.width = 480; c.height = 60;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 480, 60);
  x.fillStyle = '#000'; x.font = font; x.textBaseline = 'middle'; x.fillText(text, 4, 30);
  const d = x.getImageData(0, 0, 480, 60).data;
  let ink = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 128) ink += 1;
  return ink;
}`;

// —— B2-1 消费面置换 · 真渲义务（docs/design/typography-density.md 发凡一/四 + B2 票面①）——
//
// B2-0 测的是「定值本身」，本谱测的是「值真的上身了」。三条纪律贯穿：
//   · 至少一条断言依赖应用真实渲染——读 :root token，取不到即抛（死页假绿判例在案）。
//   · 阴性对照必须落零——每个「有效力」的断言旁边都跟一个必定无效的对照，
//     对照若也显出差异，说明测量本身没有区分力，该断言即不成立。
//   · 引擎限制如实登记，不谎称已验。

/** 在真实 DOM 里挂一块文书面，量它的 computed 值——不是量 token，是量元素身上的结果。 */
async function documentSurface(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px';
    host.innerHTML = '<div class="reader-pane"><p id="b2p">甲方应于本协议签署之日起十个工作日内交付图纸 ABC 12345。</p>'
      + '<h3 id="b2h">第三节 · 违约责任</h3></div>';
    document.body.append(host);
    await document.fonts.ready;
    const body = getComputedStyle(document.getElementById('b2p')!);
    const title = getComputedStyle(document.getElementById('b2h')!);
    const snapshot = {
      bodyFamily: body.fontFamily,
      bodySize: body.fontSize,
      bodyLineHeight: body.lineHeight,
      titleFamily: title.fontFamily,
      titleWeight: title.fontWeight,
      rootFamily: getComputedStyle(document.documentElement).fontFamily,
      tokenBody: getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim(),
      tokenTitle: getComputedStyle(document.documentElement).getPropertyValue('--font-title').trim(),
      tokenUi: getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim(),
    };
    host.remove(); // 注意：必须先取完值再移除——computed style 是活对象，元素离开渲染树后全变空串
    return snapshot;
  });
}

test('三轨上身：文书面吃文书轨（16/1.75）、章节题吃标题轨轻端、chrome 留在功能轨', async ({ page }) => {
  await openWorkbench(page);
  const surface = await documentSurface(page);

  // 依赖应用真实渲染：token 取不到即空串，下面每一条都会连带失败。
  expect(surface.tokenBody, ':root 未渲染出 --font-body（应用可能是死页）').not.toBe('');
  expect(surface.tokenTitle).not.toBe('');
  expect(surface.tokenUi).not.toBe('');

  // 文书面：按名消费文书轨，且带上墨量补偿定值 16px / 1.75。
  expect(sameStack(surface.bodyFamily, surface.tokenBody), '文书面未按名消费文书轨').toBe(true);
  expect(surface.bodySize).toBe('16px');
  expect(Number.parseFloat(surface.bodyLineHeight) / Number.parseFloat(surface.bodySize)).toBeCloseTo(1.75, 2);

  // 章节题：标题轨轻字重一端（400），与视图标题 600 构成梯度。
  expect(sameStack(surface.titleFamily, surface.tokenTitle), '章节题未按名消费标题轨').toBe(true);
  expect(surface.titleWeight).toBe('400');

  // 功能轨：chrome 仍是系统栈，且是按名消费而非另起炉灶——三轨互不串味。
  expect(sameStack(surface.rootFamily, surface.tokenUi), 'chrome 未按名消费功能轨').toBe(true);
  expect(surface.rootFamily).not.toContain('Zhuque');
  expect(surface.rootFamily).not.toContain('Source Han Serif');
});

test('@font-face 别名生效：三件随包子集真上身，不是静默穿透系统衬线', async ({ page }) => {
  await openWorkbench(page);
  await warmFonts(page);
  const loaded = await page.evaluate((inkFn) => {
    const ink = new Function('return ' + inkFn)();
    const out = {
      zhuque: document.fonts.check('400 16px "Zhuque Fangsong"'),
      shs400: document.fonts.check('400 20px "Source Han Serif SC"'),
      shs600: document.fonts.check('600 20px "Source Han Serif SC"'),
      // CJK 字面宽各字体一律 1em，量宽分不出字体——改量墨。
      bundledBody: ink('16px "Zhuque Fangsong"', '甲乙丙丁戊'),
      bundledTitle: ink('16px "Source Han Serif SC"', '甲乙丙丁戊'),
      systemSerif: ink('16px serif', '甲乙丙丁戊'),
      titleLight: ink('400 20px "Source Han Serif SC"', '合同审查'),
      titleHeavy: ink('600 20px "Source Han Serif SC"', '合同审查'),
    };
    document.getElementById('b2-warm')?.remove();
    return out;
  }, INK);

  expect(loaded.zhuque, '朱雀未加载——@font-face 漏挂或路径错').toBe(true);
  expect(loaded.shs400, '思源 400 未加载——上游内名 Source Han Serif CN 未挂到别名').toBe(true);
  expect(loaded.shs600, '思源 600 未加载——SemiBold 自成一族，须单独挂同别名').toBe(true);
  // 真的换了字：文书轨墨量显著轻于系统衬线（仿宋细笔画）。
  expect(loaded.bundledBody).toBeLessThan(loaded.systemSerif * 0.95);
  // 双字重别名真的分开生效：同族同号，600 比 400 明显重。
  expect(loaded.titleHeavy).toBeGreaterThan(loaded.titleLight * 1.15);
});

test('数字对齐律：文书面数字走配衬字等宽，不漂到仿宋的比例数字', async ({ page }) => {
  await openWorkbench(page);
  await warmFonts(page);
  const digits = await page.evaluate(() => {
    const canvas = document.createElement('canvas').getContext('2d')!;
    const widths = (font: string) => [...'0123456789'].map((d) => { canvas.font = `20px ${font}`; return +canvas.measureText(d).width.toFixed(2); });
    const stack = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim();
    return { viaStack: widths(stack), viaCjkOnly: widths('"Zhuque Fangsong"') };
  });
  // 走整条字栈：拉丁配衬在前位接手，十数字齐宽——对齐律成立。
  expect(new Set(digits.viaStack).size).toBe(1);
  // 阴性对照：单用 CJK 子集时数字确实参差（B2-0 实测 7.08–10.66）。
  // 这一条证明上面的「齐宽」不是因为量不出差异，而是配衬字真的接手了。
  expect(new Set(digits.viaCjkOnly).size).toBeGreaterThan(1);
});

test('排印光学：视觉字距确有效力（阴性对照落零）；标点悬挂的引擎限制如实登记', async ({ page }) => {
  await openWorkbench(page);
  const optics = await page.evaluate(() => {
    const span = document.createElement('span');
    document.body.append(span);
    const measure = (css: string) => {
      span.style.cssText = `position:fixed;left:-9999px;white-space:nowrap;font:16px/1.75 var(--font-body);${css}`;
      span.textContent = '甲方应交付图纸ABC12345等材料';
      return +span.getBoundingClientRect().width.toFixed(2);
    };
    const out = {
      base: measure(''),
      autospace: measure('text-autospace: normal'),
      negativeControl: measure('text-autospace: __bogus_value__'),
      hangingSupported: CSS.supports('hanging-punctuation', 'allow-end'),
    };
    span.remove();
    return out;
  });

  // 有效力：中西文混排间隙真的被插入。
  expect(optics.autospace).toBeGreaterThan(optics.base);
  // 阴性对照落零：伪值必须与 base 逐位相等——否则说明量到的是噪声不是效力。
  expect(optics.negativeControl).toBe(optics.base);

  // P3-H01 已由真实 Tauri WKWebView 正负 fixture 取得排印放行证据；Chromium 在此只作
  // 跨引擎阴性守卫，不冒充 WebKit。哪天 Chromium 跟上，这条会红，逼着把阴性守卫
  // 改为同款实效断言，而不是继续把“未支持”烧成永久事实。
  expect(optics.hangingSupported, 'Chromium 已支持 hanging-punctuation——请升级本条为真实效力断言').toBe(false);
});
