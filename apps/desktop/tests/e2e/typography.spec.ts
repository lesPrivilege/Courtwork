import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { openWorkbench } from './helpers';

// 槽位表即测点清单：从 tokens 读，加一槽自动多一个测点，不靠人记得来补断言。
const TOKENS = JSON.parse(readFileSync(path.resolve('../../docs/design/tokens.json'), 'utf8')) as {
  typography: { slot: Record<string, { color?: string; aaTarget?: number; aaStatus?: string; track?: string }> };
  color: { bg: Record<string, { value: string }> };
  themes: { dark: { bg: Record<string, { value: string }> } };
};
const SLOTS = TOKENS.typography.slot;

// —— 门④ AA 四元联测（docs/design/typography-density.md 发凡三 · B2 票面④）——
//
// 「字体 × 字号 × 字重 × 色」四元同测，且**以仿宋实际度量为准，不得沿黑体度量宣称**。
// B2-0 是定值批（消费面置换归 B2-1），故本谱不测产品页面，测的是**定值本身**：
// 把 tokens 声明的轨位值真装到浏览器里渲染，看它是否兑现凡例的承诺。
//
// 防假绿第一条：先证字体真的加载了。若 woff2 取不到，浏览器会静默回退系统衬线，
// 后面每一条度量都会变成「量了黑体却宣称量了仿宋」——正是票面④点名要防的事。

const FONTS = {
  body: { family: 'Zhuque Fangsong', file: 'zhuque-fangsong-gbk.woff2', weight: 400 },
  title400: { family: 'Source Han Serif SC', file: 'source-han-serif-sc-400-gb2312.woff2', weight: 400 },
  title600: { family: 'Source Han Serif SC', file: 'source-han-serif-sc-600-gb2312.woff2', weight: 600 },
};

async function installFonts(page: import('@playwright/test').Page) {
  // 必须走 openWorkbench 而非裸 goto：Vite dev 由 JS 注入样式表，页面 load 事件早于 :root
  // 自定义属性可读之时——裸 goto 下 getPropertyValue 全取空串，对比度会算成 1:1 的假数据。
  await openWorkbench(page);
  // SKIN-B2-1 起壳内自带 @font-face，字体由**产品自己**供给，不再由本谱手工注入 FontFace。
  // 这既去掉了重复 face（重复项会让 document.fonts.check 因其中一份懒加载而返回 false），
  // 也让本谱从「模拟装字」升级为「验产品真的装了字」——测的是出厂机制，不是测试脚手架。
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.id = 'b20-warm';
    host.style.cssText = 'position:fixed;left:-9999px';
    host.innerHTML = '<span style="font:400 16px var(--font-body)">合同甲乙</span>'
      + '<span style="font:400 20px var(--font-title)">合同甲乙</span>'
      + '<span style="font:600 20px var(--font-title)">合同甲乙</span>';
    document.body.append(host);
    await document.fonts.ready;
    host.remove();
  });
}

/** 在离屏 canvas 上渲染同一串，回报墨量（着墨像素占比）与横向字面宽——仿宋实际度量的取法。 */
const INK_PROBE = `(font, size, text, weight) => {
  const c = document.createElement('canvas');
  c.width = 900; c.height = Math.ceil(size * 2.5);
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#000'; x.font = (weight ? weight + ' ' : '') + size + 'px ' + font; x.textBaseline = 'middle';
  x.fillText(text, 4, c.height / 2);
  const w = Math.ceil(x.measureText(text).width);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let ink = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 128) ink += 1;
  return { ink, width: w };
}`;

test('门④-1 字体真加载：三件子集就位，度量不是回退字的度量', async ({ page }) => {
  await installFonts(page);
  // SKIN-B2-1 起壳内自带 @font-face：document.fonts.check() 会把**所有**同名 face 计入，
  // 其中 CSS 声明的那一份是懒加载的，没人用就永远 unloaded，check 便返回 false。
  // 故须先让三件真的被用上——这不是放宽断言，是让它问对问题（字真的能上身吗）。
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px';
    host.innerHTML = '<span style="font:400 16px var(--font-body)">合同</span>'
      + '<span style="font:400 20px var(--font-title)">合同</span>'
      + '<span style="font:600 20px var(--font-title)">合同</span>';
    document.body.append(host);
    await document.fonts.ready;
    host.remove();
  });
  const loaded = await page.evaluate((fonts) => ({
    body: document.fonts.check(`400 16px "${fonts.body.family}"`),
    title400: document.fonts.check(`400 20px "${fonts.title400.family}"`),
    title600: document.fonts.check(`600 20px "${fonts.title600.family}"`),
  }), FONTS);
  expect(loaded).toEqual({ body: true, title400: true, title600: true });

  // 与系统衬线渲染必须可区分——同名同号若度量一致，说明根本没换字。
  const probe = await page.evaluate(([fn, fonts]) => {
    const measure = new Function('return ' + fn)();
    const text = '甲方应于本协议签署之日起十个工作日内交付';
    return {
      zhuque: measure(`"${(fonts as typeof FONTS).body.family}"`, 16, text),
      fallback: measure('serif', 16, text),
    };
  }, [INK_PROBE, FONTS] as const);
  expect(probe.zhuque.ink).toBeGreaterThan(0);
  expect(probe.zhuque.ink).not.toBe(probe.fallback.ink);
});

// —— SKIN-DYSTOPIA-1 项 C：AA 四元联测由「单宗单面」扩为「宗×面」二维 ——
//
// 原门只跑浅宗、且每槽只测一张底面，故深宗四槽从上身（SKIN-R2 P4）起从未被这条判据看过一眼。
// 扩宽两维（§12 辖面澄清 2026-08-09：既有判据门的取样面扩宽不属「数值零新增」之禁）：
//   ① 宗维：{刻本印页宗, 磁青宗} 各跑一条，取样面由 data-theme 真切换给出（不是读 tokens 算数）；
//   ② 面维：每槽在**它真的落座的那些面**上逐面实算，取最严面判定。
//
// 面集为何按轨取而不是一律三面：§2「对比度必须配对声明所对底面」——测一张该轨结构上
// 不落座的底面，等于给门喂一个不存在的消费点。功能/数据轨（chrome 文字）三面皆坐；
// 文书/标题轨只坐文书纸面/白卡（--bg-raised）。原门的 backdrop() 已是这条规则的单面版，
// 此处只把功能/数据轨从「只测竖栏底」扩到「三面取最严」，文书/标题轨维持白卡。
//
// 如实登记（SKIN-DYSTOPIA-1 回执 · 待架构裁）：若把面集无条件放成三面，浅宗 line.settled
// (#BE4B2F) 在 --bg-surface 上实算 4.4983 < 4.5——贴阈 0.0017。该面不在文书轨的落座面内，
// 故本门不判它；但这是「浅宗朱的文字轨值是否应按三面复算」的真实提问，已上浮票面。
const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];
const THEME_LABEL: Record<Theme, string> = { light: '刻本印页宗', dark: '磁青宗' };

// 色槽 → CSS 变量名的显式登记，按宗分列。不用正则推名：line.settled 在壳里叫 --zhu-fg
// （文字轨；记号轨另有 --zhu-graphic，B1 命名遗留），推名会推错；缺登记即抛错，好过静默跳过一个测点。
const COLOR_VARS: Record<Theme, Record<string, string>> = {
  light: {
    'text.primary': '--text-primary',
    'text.secondary': '--text-secondary',
    'text.tertiary': '--text-tertiary',
    // 项 D 轨位切分后：sealNote 是**文字**槽，故吃文字轨 --zhu-fg，不再借记号轨 --zhu-graphic。
    // 浅宗 fg==graphic（Q3），故本宗数值不动；深宗此处正是从 3.42 走到 4.98 的那一步。
    'line.settled': '--zhu-fg',
  },
  dark: {
    'text.primary': '--text-primary',
    'text.secondary': '--text-secondary',
    'text.tertiary': '--text-tertiary',
    'line.settled': '--zhu-fg',
  },
};

// 三面全测（证据面：双宗×三面全槽 AA 表），判定面按轨的真实落座面取。
const ALL_FACES = ['--bg-app', '--bg-surface', '--bg-raised'] as const;
const judgedFaces = (track?: string): readonly string[] =>
  (track === 'document' || track === 'title' ? (['--bg-raised'] as const) : ALL_FACES);

for (const theme of THEMES) {
  test(`门④-2 四元联测 · ${THEME_LABEL[theme]}：槽位表逐槽在其落座面实算 AA，取最严面`, async ({ page }) => {
    // 本例不装字体：WCAG 对比度是纯色对的函数，与字体无关；字体相关的度量由 ④-1/③/④ 承担。
    // 防假绿仍在——read() 读不到 :root token 即抛错，应用没渲染出来这条立刻红。
    await openWorkbench(page);
    const slots = Object.entries(SLOTS).filter(([key]) => !key.startsWith('$'));
    expect(slots.length).toBeGreaterThanOrEqual(9);

    const measured = await page.evaluate(({ probes, mode }) => {
      // 取样面切换：宗维不是靠读 tokens 算数得来的，是把宗真的切过去再量。
      document.documentElement.setAttribute('data-theme', mode);
      const read = (token: string) => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
        if (!raw) throw new Error(`设计 token ${token} 未定义`);
        const el = document.createElement('span');
        el.style.color = raw;
        document.body.append(el);
        const [r, g, b] = getComputedStyle(el).color.match(/\d+/g)!.map(Number);
        el.remove();
        return [r, g, b] as [number, number, number];
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (fg: string, bg: string) => {
        const [la, lb] = [lum(read(fg)), lum(read(bg))];
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const rows = probes.map(({ key, fg, faces, judged }) => ({
        key,
        fg,
        faces: faces.map((face) => ({ face, ratio: ratio(fg, face), judged: judged.includes(face) })),
      }));
      return { bgApp: read('--bg-app').join(','), rows };
    }, {
      mode: theme,
      probes: slots.map(([key, slot]) => {
        const color = slot.color ?? 'text.primary';
        const cssVar = COLOR_VARS[theme][color];
        if (!cssVar) throw new Error(`槽位 ${key} 的色槽 ${color} 在 ${theme} 宗未登记 CSS 变量名——补进 COLOR_VARS，不许静默跳过`);
        return { key, fg: cssVar, faces: [...ALL_FACES], judged: [...judgedFaces(slot.track)] };
      }),
    });

    // 取样面自证（防「扩门未扩到取样面」零区分力自伤）：宗切过去之后，底纸必须真的是该宗的底纸。
    // 撤掉上面那句 setAttribute，深宗这条立刻红——门才真的看见了第二宗。
    const expectedBgApp = theme === 'dark' ? TOKENS.themes.dark.bg.app.value : TOKENS.color.bg.app.value;
    const [er, eg, eb] = [1, 3, 5].map((i) => parseInt(expectedBgApp.slice(i, i + 2), 16));
    expect(measured.bgApp, `${THEME_LABEL[theme]}取样面未落到本宗底纸（data-theme 未生效即整条量的是另一宗）`)
      .toBe(`${er},${eg},${eb}`);

    // 证据行：逐槽逐面原始比值进跑动输出（判定面带 *），供 craft-evidence 的双宗×三面 AA 表如实抄录。
    for (const row of measured.rows) {
      console.log(`AA[${theme}] ${row.key} ${row.fg} ${row.faces.map((f) => `${f.face}=${f.ratio.toFixed(4)}${f.judged ? '*' : ''}`).join(' ')}`);
    }

    // 逐槽用 soft 断言：一宗之内多槽同时不达标时要一次全现，不能被第一条抛断截住。
    for (const { key, faces } of measured.rows) {
      const slot = SLOTS[key];
      const target = slot.aaTarget ?? 4.5;
      const judged = faces.filter((f) => f.judged);
      const strictest = judged.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
      const detail = faces.map((f) => `${f.face}=${f.ratio.toFixed(4)}${f.judged ? '*' : ''}`).join(' ');
      if (slot.aaStatus === 'gap') {
        // 缺口登记不是豁免：断言它**确实**还没达标。哪天真闭合了，这条会红，
        // 逼着实现者同步改 tokens 的 aaStatus 与 color.text.tertiary 描述——不许悄悄溜过。
        // 2026-07-19：meta 槽经值面复审闭合，aaStatus 已摘，此分支当期无槽命中——
        // 机制保留是为下一个缺口，不是空转：摘/加 aaStatus 双向可红。
        expect.soft(strictest.ratio, `${key}@${theme} 已登记为缺口槽（${detail}）`).toBeLessThan(target);
        expect.soft(strictest.ratio, `${key}@${theme} 不得低于 AA-large 3:1（${detail}）`).toBeGreaterThan(3);
      } else {
        expect.soft(strictest.ratio, `${key}@${theme} 最严面 ${strictest.face} 四元联测未达 AA ${target}（${detail}）`)
          .toBeGreaterThanOrEqual(target);
      }
    }
  });
}

test('门④-3 仿宋补偿实测：差在墨不在面，补偿后墨量差收窄而字面不臃肿', async ({ page }) => {
  await installFonts(page);
  const m = await page.evaluate(([fn, fonts]) => {
    const measure = new Function('return ' + fn)();
    const text = '甲方应于本协议签署之日起十个工作日内交付全部技术文档';
    const ui = getComputedStyle(document.documentElement).fontFamily;
    return {
      sans15: measure(ui, 15, text),
      zhuque15: measure(`"${(fonts as typeof FONTS).body.family}"`, 15, text),
      zhuque16: measure(`"${(fonts as typeof FONTS).body.family}"`, 16, text),
    };
  }, [INK_PROBE, FONTS] as const);

  // 差在墨：同号下仿宋着墨显著少于功能轨。
  expect(m.zhuque15.ink).toBeLessThan(m.sans15.ink * 0.9);
  // 不在面：同号下字面宽与功能轨相当（±8%），故不可当「偏窄」大幅升字号。
  expect(m.zhuque15.width).toBeGreaterThan(m.sans15.width * 0.92);
  expect(m.zhuque15.width).toBeLessThan(m.sans15.width * 1.08);
  // 补偿有效且克制：16px 把墨量差收窄，字面仍不超功能轨基准 10%。
  expect(m.zhuque16.ink).toBeGreaterThan(m.zhuque15.ink);
  expect(m.zhuque16.width).toBeLessThan(m.sans15.width * 1.1);
});

test('门④-4 标题轨定阶：400→600 梯度可辨，且拉丁由配衬字承接不裸回退', async ({ page }) => {
  await installFonts(page);
  const m = await page.evaluate(([fn, fonts]) => {
    const measure = new Function('return ' + fn)();
    const f = (fonts as typeof FONTS);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const widthOf = (font: string, glyph: string) => { ctx.font = `20px ${font}`; return ctx.measureText(glyph).width; };
    return {
      w400: measure(`"${f.title400.family}"`, 20, '合同审查工作台', 400),
      w600: measure(`"${f.title600.family}"`, 20, '合同审查工作台', 600),
      // 裸用 CJK 子集的拉丁 vs 经配衬字栈的拉丁：前者是宽体，后者应明显收窄。
      bareLatin: widthOf(`"${f.title400.family}"`, 'M'),
      companionLatin: widthOf(`"Times New Roman"`, 'M'),
      // 中文必须仍由 CJK 子集承接（配衬字无中文，穿透即正确）。
      cjkViaStack: widthOf(`"Times New Roman", "${f.title400.family}"`, '合'),
      cjkBare: widthOf(`"${f.title400.family}"`, '合'),
    };
  }, [INK_PROBE, FONTS] as const);

  // 梯度须一眼可辨：600 的着墨明显多于 400（字形墨量比实测 1.49 : 1.15）。
  expect(m.w600.ink).toBeGreaterThan(m.w400.ink * 1.15);
  // 配衬字确有必要且确已生效：思源 CN 子集的拉丁 M 近乎全角（实测 0.975em），
  // 前置 Times 后同字明显收窄——这一条守的是「不得裸回退」，抽掉配衬字它立刻红。
  expect(m.bareLatin).toBeGreaterThan(20 * 0.95);
  expect(m.companionLatin).toBeLessThan(m.bareLatin * 0.95);
  // 栈序正确：拉丁走配衬字，中文仍穿透到 CJK 子集，宽度与裸用一致。
  expect(m.cjkViaStack).toBeCloseTo(m.cjkBare, 1);
});
