import { expect, type Locator, type Page } from '@playwright/test';

/**
 * UI-RESIDUE-1（批一）· 可逆交互零残留门原语。
 *
 * 本模块只提供检验原语，不含 test()：
 *  - captureAnimationBaseline：开合前采集在跑动画指纹（基线；如 breathe/chip-glow 等常驻装饰动画）。
 *  - expectNoOverlayResidue：DOM 级残留门（新增在跑动画/孤儿浮层/背板/背景禁用态/body 卡死/焦点归还）。
 *  - captureClosureShot：确定性像素快照（Chromium 闭环参数 + 鼠标停靠安全位），供 A≡B 逐字节比对。
 *  - suppressFocusRing：把焦点轮廓从像素层中和（焦点“位置”由残留门断言，焦点“轮廓”不计入 A≡B）。
 *
 * 设计口径（调研 interaction-visual-regression §1/§3、WAI-ARIA APG dialog）：
 *  - A≡B 采用同一次运行内的运行时缓冲比对（非提交 golden），天然同机同环境，规避基线宿主依赖。
 *  - 动画检验用“基线差集”而非“绝对归零”：工作台常驻装饰动画（breathe/chip-glow/brand-line-write，
 *    styles.css:519/626/743/1488）本就 infinite 在跑；残留门只追问“开合后是否新增了本不在跑的动画”，
 *    即动画维度的开→关闭合等价，正是自证注入（多起一个 infinite 动画）能被接住的判据。
 *  - Courtwork 浮层是条件渲染的 React 节点，收起即卸载；当前无 inert/背景 aria-hidden/body 锁，
 *    故 inert / aria-hidden 容器 / body.pointerEvents 三项为“前向守卫”（现绿，接住未来引入的浮层库回归）。
 */

/** app 外壳与 root：模态若把背景 inert/aria-hidden，必然落在这两个容器上。 */
const APP_BACKGROUND_SELECTORS = ['#root', '.app-shell', '[data-testid="workbench"]'];

/** 截图/快照前把鼠标停靠到左上安全位，消除触发元素 :hover 造成的 A≠B 抖动（调研 §1）。 */
const MOUSE_PARK: readonly [number, number] = [0, 0];

export interface ResidueOptions {
  /** 若给出，断言 activeElement 已归还该触发元素（WAI-ARIA APG：关闭后焦点回到触发点）。 */
  trigger?: Locator;
  /**
   * 合法仍在场的浮层 testid 白名单。
   * 例：modal-over-modal 收起上层后，底层 settings-page 仍应在场，不算孤儿。
   */
  allowedDialogTestIds?: string[];
  /**
   * 开合前采集的在跑动画基线指纹（captureAnimationBaseline 的返回）。
   * 残留门只对“基线之外新增的在跑动画”触红；缺省视作空基线（等同绝对归零）。
   */
  baselineAnimations?: string[];
  /** 断言语境标签，便于失败定位（如 "user-menu"）。 */
  label?: string;
}

/** 在浏览器上下文里采集当前在跑动画的指纹集合（动画名 + 目标节点描述）。 */
async function collectRunningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const describe = (el: Element | null): string => {
      if (!el) return 'none';
      const tag = el.tagName ? el.tagName.toLowerCase() : 'node';
      const id = el.id ? `#${el.id}` : '';
      const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort().join('.');
      const tid = el.getAttribute('data-testid') ?? '';
      return `${tag}${id}${cls ? '.' + cls : ''}${tid ? `[${tid}]` : ''}`;
    };
    return document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => {
        const css = a as Animation & { animationName?: string; transitionProperty?: string };
        const name = css.animationName || (css.transitionProperty ? `transition:${css.transitionProperty}` : 'waapi');
        const target = (a.effect as KeyframeEffect | null)?.target ?? null;
        return `${name}@${describe(target)}`;
      });
  });
}

/** 采集当前在跑动画的指纹集合（开合前作基线）。 */
export async function captureAnimationBaseline(page: Page): Promise<string[]> {
  return collectRunningAnimations(page);
}

/** running 指纹 − baseline 指纹（按重数作差，只保留“新增”项）。 */
function animationsBeyondBaseline(running: string[], baseline: string[]): string[] {
  const counts = new Map<string, number>();
  for (const fp of baseline) counts.set(fp, (counts.get(fp) ?? 0) + 1);
  const added: string[] = [];
  for (const fp of running) {
    const left = counts.get(fp) ?? 0;
    if (left > 0) counts.set(fp, left - 1);
    else added.push(fp);
  }
  return added;
}

interface DomResidueReport {
  orphanOverlays: string[];
  residualBackdrops: string[];
  disabledBackground: string[];
  bodyLock: string[];
}

/** 采集一次 DOM 残留快照（纯读取，无副作用）。 */
async function collectDomResidue(page: Page, allowedDialogTestIds: string[]): Promise<DomResidueReport> {
  return page.evaluate(
    ({ allowed, backgroundSelectors }) => {
      const describe = (el: Element): string => {
        const role = el.getAttribute('role') ?? el.tagName.toLowerCase();
        const testid = el.getAttribute('data-testid') ?? '';
        const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).join('.');
        return `${role}[testid=${testid}]${cls ? '.' + cls : ''}`;
      };
      const isVisible = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
      };

      // 1) 孤儿浮层：可见的 dialog/menu/listbox，排除白名单 testid。
      const orphanOverlays = Array.from(
        document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"]'),
      )
        .filter((el) => !allowed.includes(el.getAttribute('data-testid') ?? ''))
        .filter(isVisible)
        .map(describe);

      // 2) 残留背板 / portal 容器（常见浮层背板类名）。
      const backdropClasses = ['modal-backdrop', 'palette-backdrop', 'settings-confirm-backdrop'];
      const residualBackdrops: string[] = [];
      for (const cls of backdropClasses) {
        for (const el of Array.from(document.getElementsByClassName(cls))) {
          if (isVisible(el)) residualBackdrops.push(cls);
        }
      }

      // 3) 背景禁用态残留：inert 任意存在即残留；aria-hidden 只查 app 背景容器。
      const disabledBackground: string[] = [];
      for (const el of Array.from(document.querySelectorAll('[inert]'))) {
        disabledBackground.push(`inert:${describe(el)}`);
      }
      for (const sel of backgroundSelectors) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          if (el.getAttribute('aria-hidden') === 'true') disabledBackground.push(`aria-hidden:${sel}`);
        }
      }

      // 4) body 交互卡死：pointer-events:none。
      const bodyLock: string[] = [];
      if (window.getComputedStyle(document.body).pointerEvents === 'none') {
        bodyLock.push('body.pointerEvents=none');
      }

      return { orphanOverlays, residualBackdrops, disabledBackground, bodyLock };
    },
    { allowed: allowedDialogTestIds, backgroundSelectors: APP_BACKGROUND_SELECTORS },
  );
}

/**
 * 残留门：断言浮层收起后无任何残留。
 * 任一子项非空即触红；焦点未归还触发元素亦触红（若给出 trigger）。
 */
export async function expectNoOverlayResidue(page: Page, options: ResidueOptions = {}): Promise<void> {
  const tag = options.label ? `[${options.label}] ` : '';
  const baseline = options.baselineAnimations ?? [];

  // 有界落定轮询：焦点归还触发元素等引发的瞬时 transition 会很快落定；
  // 真正残留（无限动画 / 未卸载浮层的 enter 动画）不会落定 → 超时后由断言逐条列出。
  const deadline = Date.now() + 1500;
  let newAnimations = animationsBeyondBaseline(await collectRunningAnimations(page), baseline);
  while (newAnimations.length > 0 && Date.now() < deadline) {
    await page.waitForTimeout(50);
    newAnimations = animationsBeyondBaseline(await collectRunningAnimations(page), baseline);
  }
  expect(newAnimations, `${tag}残留门·动画未归零：开合后新增了在跑动画（落定超时）`).toEqual([]);

  const report = await collectDomResidue(page, options.allowedDialogTestIds ?? []);
  expect(report.orphanOverlays, `${tag}残留门·孤儿浮层：关闭后仍有 dialog/menu/listbox 可见`).toEqual([]);
  expect(report.residualBackdrops, `${tag}残留门·背板残留：浮层背板未随关闭移除`).toEqual([]);
  expect(report.disabledBackground, `${tag}残留门·背景禁用态残留：inert / aria-hidden 未回收`).toEqual([]);
  expect(report.bodyLock, `${tag}残留门·body 交互卡死：pointer-events 未复原`).toEqual([]);

  if (options.trigger) {
    await expect(options.trigger, `${tag}残留门·焦点未归还触发元素`).toBeFocused();
  }
}

/**
 * 把焦点轮廓从像素层中和：焦点“归还位置”由残留门断言，焦点“可见轮廓”不计入 A≡B。
 * （styles.css:111 焦点指示为 outline；此处仅在截图比对语境下抹平，UI 行为不改。）
 */
export async function suppressFocusRing(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*:focus, *:focus-visible, *:focus-within { outline: none !important; }\n' +
      '.reader-focus-anchor:focus { outline: none !important; }\n' +
      // PILOT-LIVE-1-FIX #2 墙钟归一：相对时间戳按设计随墙钟翻字（just now→1m ago→…，且等宽字体下
      // 文本变宽会牵动自身 bbox），跨分钟界落在 A→B 窗口内即破像素等同（收割实证 274/275 于
      // model-config 例，「墙钟自证」用例确定性重演；掩蔽矩形方案因 bbox 随文本变宽已证不可行）。
      // visibility:hidden 保留盒占位、消除全部绘制——与焦点轮廓归一同族：时间「语义」不属像素域，
      // 时间元素的存在/位置仍受 DOM 层残留门与全域比对约束。
      '[data-testid="message-relative-time"] { visibility: hidden !important; }',
  });
}

/**
 * 确定性像素快照（Chromium 闭环）：鼠标停靠安全位、animations 快进/取消、隐藏光标、CSS 像素比例、掩动态区。
 * 启动参数 srgb/lcd/hinting 与 deviceScaleFactor:1 由 residue Playwright project 提供。
 * 返回 PNG 缓冲，供开合闭合门作 A≡B 逐字节比对。
 */
export async function captureClosureShot(page: Page, mask: Locator[] = []): Promise<Buffer> {
  await page.mouse.move(MOUSE_PARK[0], MOUSE_PARK[1]);
  return page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    mask,
    maskColor: '#FF00FF',
  });
}

/**
 * A≡B 比对：默认逐字节相等；不等时退到亚感知容差判据。
 *
 * 为何要容差：React 重渲染（浮层开合会重渲触发元素所在容器）会让 Chromium 对同一内容重栅格化，
 * 圆角描边等 AA 边缘可能产生 ±1/255 的舍入差（同帧连拍仍逐字节相等，证明非随机抖动）。
 * 这类差 <2/255 人眼不可辨、非应用缺陷、不可在应用侧消除。真正的残留（滞留浮层/元素偏移/焦点环）
 * 单像素通道差达数十，必然被 maxChannelDelta 判据接住——故此容差不掩盖真实回归（调研 §1 口径）。
 */
export async function expectClosureShotsMatch(
  page: Page,
  shotA: Buffer,
  shotB: Buffer,
  opts: { maxChannelDelta?: number; maxDiffPixels?: number; label?: string } = {},
): Promise<void> {
  const tag = opts.label ? `[${opts.label}] ` : '';
  if (shotB.equals(shotA)) return; // 逐字节相等：快路径
  const maxChannelDelta = opts.maxChannelDelta ?? 2;
  const maxDiffPixels = opts.maxDiffPixels ?? 800;

  // 用一张空白页做 PNG 解码/比对，规避应用页 CSP 对 data: 图源的限制。
  const scratch = await page.context().newPage();
  try {
    const diff = await scratch.evaluate(
      async ({ a, b, delta }) => {
        const load = (d: string): Promise<HTMLImageElement> =>
          new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error('image decode failed'));
            img.src = 'data:image/png;base64,' + d;
          });
        const ia = await load(a);
        const ib = await load(b);
        if (ia.width !== ib.width || ia.height !== ib.height) {
          return { dimsMismatch: true, total: -1, significant: -1, sample: [] as string[] };
        }
        const w = ia.width;
        const h = ia.height;
        const ca = new OffscreenCanvas(w, h);
        const cb = new OffscreenCanvas(w, h);
        const xa = ca.getContext('2d')!;
        const xb = cb.getContext('2d')!;
        xa.drawImage(ia, 0, 0);
        xb.drawImage(ib, 0, 0);
        const da = xa.getImageData(0, 0, w, h).data;
        const db = xb.getImageData(0, 0, w, h).data;
        let total = 0;
        let significant = 0;
        const sample: string[] = [];
        for (let i = 0; i < da.length; i += 4) {
          const md = Math.max(
            Math.abs(da[i] - db[i]),
            Math.abs(da[i + 1] - db[i + 1]),
            Math.abs(da[i + 2] - db[i + 2]),
            Math.abs(da[i + 3] - db[i + 3]),
          );
          if (md > 0) {
            total++;
            if (md > delta) {
              significant++;
              if (sample.length < 6) {
                const px = (i / 4) | 0;
                sample.push(`(${px % w},${(px / w) | 0}) Δ=${md}`);
              }
            }
          }
        }
        return { dimsMismatch: false, total, significant, sample };
      },
      { a: shotA.toString('base64'), b: shotB.toString('base64'), delta: maxChannelDelta },
    );

    expect(diff.dimsMismatch, `${tag}A≡B 截图尺寸不一致（疑似布局残留）`).toBeFalsy();
    expect(
      diff.significant,
      `${tag}A≡B 存在超阈像素差（通道差 > ${maxChannelDelta}/255，疑似真实残留）：${JSON.stringify(diff.sample)}`,
    ).toBe(0);
    expect(diff.total, `${tag}A≡B 亚感知像素差过多（疑似大面积偏移）：${diff.total}`).toBeLessThanOrEqual(
      maxDiffPixels,
    );
  } finally {
    await scratch.close();
  }
}

/**
 * 等待页面视觉静止：连续两帧逐字节相等即认为静止，供开合闭合门取稳定基线 A。
 * 演示回放推进到终点前会持续变帧；此处轮询直到两帧相等或超时（超时不静默，交由后续 A≡B 暴露）。
 */
export async function waitForVisualQuiescence(
  page: Page,
  mask: Locator[] = [],
  opts: { settleMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  const settleMs = opts.settleMs ?? 250;
  const deadline = Date.now() + (opts.timeoutMs ?? 8000);
  let prev = await captureClosureShot(page, mask);
  while (Date.now() < deadline) {
    await page.waitForTimeout(settleMs);
    const next = await captureClosureShot(page, mask);
    if (next.equals(prev)) return;
    prev = next;
  }
}
