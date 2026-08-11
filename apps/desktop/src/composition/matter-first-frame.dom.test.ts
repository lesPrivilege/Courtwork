// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * PACK-INTERACT-1 2R · C：首个 committed render 零泄漏。
 *
 * ADR-015 决定三（2026-08-08 补记）：首屏与切 matter 的**第一次 committed render** 必须由目标
 * matter 的生效 registry 同步派生——先提交一帧全局垂类 view、再靠 `useEffect` 回落不合格，
 * 因为那一帧是真的进过 DOM 的。
 *
 * 故本谱不看「最终稳定态」——稳定态在「先提交再 effect 回落」的实现里也是绿的，零区分力。
 * 取样点是**第一次 committed render 本身**：`flushSync` 把切案的渲染与 layout effect 同步跑完
 * 就返回，passive effect（`useEffect` 回落）此刻尚未执行；那一刻 DOM 里有什么，用户就可能看见
 * 什么。撤掉同步收口即在此复红。
 *
 * （试过 `MutationObserver`：它的回调是微任务，React 在同一次 act 冲刷里把两次提交都做完了才
 * 轮到它，读到的只有终态——对「回落实现」零区分力，故不采。）
 */

const CASE_LIST_KEY = 'courtwork.case-list.v1';

/** Legal 面在 DOM 上的可观察记号：页签与面板 testid、页签/标题文案。 */
const LEGAL_MARK_TESTIDS = ['view-revision', 'view-timeline', 'view-graph', 'view-matrix', 'timeline-panel', 'graph-panel', 'review-matrix-panel', 'risk-review-panel'];
const LEGAL_MARK_COPY = ['修订预览', '时间线', '关系图谱', '审阅矩阵', '风险清单'];
/**
 * 活动面身份也在 DOM 上：预览宿主用 `aria-labelledby="preview-tab-<渲染器>-<活动面 id>"`
 * 声明当前是哪一面。停在 Legal 面上时这里就写着垂类面 id（且标题取不到词、渲染成空 h2）——
 * 页签集虽已随 matter 收窄，活动面身份仍泄漏，读屏读到的就是它。
 */
const LEGAL_ACTIVE_VIEW = /aria-labelledby="preview-tab-[^"]*-(revision|timeline|graph|matrix)"/g;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

function installBrowserStubs() {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
  const noopObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= noopObserver;
  (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver ??= noopObserver;
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  return store;
}

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  installBrowserStubs();
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

/** 装配一枚与组合根同形的 App（同一批端口、同一枚 package runtime）。 */
async function mountApp(cases: Array<Record<string, unknown>>) {
  window.localStorage.setItem(CASE_LIST_KEY, JSON.stringify({ version: 1, cases }));
  const [
    { App },
    { createDesktopPackageRuntime },
    { createCaseRegistriesResolver },
    { readCaseList },
    { createDemoWorkFixture },
    { MaterialStore, createBrowserMaterialHost },
    { createBrowserHostAuth },
    { createBrowserPiLane },
    { createLegalWorkSurface },
    { createDesktopWorkCommand },
    { loadSettings },
  ] = await Promise.all([
    import('../App'),
    import('./package-runtime'),
    import('./matter-registries'),
    import('../case/case-store'),
    import('../demo/client'),
    import('../material/material-store'),
    import('../host/browser-host-auth'),
    import('../pi/browser-pi-lane'),
    import('../verticals/legal/legal-work-surface'),
    import('../work/work-runtime'),
    import('../settings/settings-store'),
  ]);
  const runtime = createDesktopPackageRuntime();
  const fixture = createDemoWorkFixture({});
  const materialStore = new MaterialStore(createBrowserMaterialHost());
  const workCommand = createDesktopWorkCommand({
    registries: runtime.packageRegistries,
    registriesForCase: createCaseRegistriesResolver({
      readCases: () => readCaseList(),
      availablePackageIds: runtime.packageIds,
      registriesFor: runtime.registriesFor,
    }),
    materialResolver: materialStore,
    packageIdentities: {},
    launchableScenarioIds: [],
    verticalScenarioIds: [],
    loadRuntimeLimits: () => loadSettings().runtimeGuard,
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(App, {
    packageRegistries: runtime.packageRegistries,
    hostRenderers: runtime.hostRenderers,
    registriesFor: runtime.registriesFor,
    availablePackageIds: runtime.packageIds,
    packCatalog: runtime.packageCatalog,
    workProjection: fixture.projection,
    workFixture: fixture,
    verticalWorkSurface: createLegalWorkSurface({ workCommand }),
    hostAuth: createBrowserHostAuth(),
    materialStore,
    piLane: createBrowserPiLane(),
  })));
  return container;
}

function click(host: HTMLElement, testId: string) {
  const node = host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!node) throw new Error(`missing ${testId}`);
  const button = node.tagName === 'BUTTON' ? node : node.querySelector<HTMLElement>('button') ?? node;
  act(() => button.click());
}

/**
 * 切案并录下**每一次提交后**的 DOM（含首个 committed render）。
 *
 * 关键在于**不进 `act`**：`act` 会把渲染提交与 passive effect 一并同步冲刷完，只剩终态可读
 * （对「先提交再回落」的实现零区分力）。脱开 act 之后，React 的提交与 passive effect 分处两个
 * 宏任务，而 `MutationObserver` 的回调是微任务——它恰好落在两者之间，读到的就是首帧。
 */
async function switchCaseRecordingFrames(host: HTMLElement, testId: string): Promise<string[]> {
  const node = host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!node) throw new Error(`missing ${testId}`);
  const button = node.tagName === 'BUTTON' ? node : node.querySelector<HTMLElement>('button') ?? node;
  const frames: string[] = [];
  const observer = new MutationObserver(() => frames.push(host.innerHTML));
  observer.observe(host, { childList: true, subtree: true, attributes: true, characterData: true });
  const actEnv = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  actEnv.IS_REACT_ACT_ENVIRONMENT = false;
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  observer.disconnect();
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  return frames;
}

function legalLeaks(html: string): string[] {
  const hits = new Set<string>();
  for (const testId of LEGAL_MARK_TESTIDS) {
    if (html.includes(`data-testid="${testId}"`)) hits.add(testId);
  }
  for (const copy of LEGAL_MARK_COPY) {
    if (html.includes(copy)) hits.add(copy);
  }
  for (const match of html.matchAll(LEGAL_ACTIVE_VIEW)) hits.add(`active-view:${match[1]}`);
  return [...hits];
}

/** 首帧的活动面标题（预览宿主的 h2）。垂类面被 matter 收窄掉时它取不到词，渲成空串。 */
function activeViewTitle(html: string): string {
  return (html.match(/<h2[^>]*>([^<]*)<\/h2>/) ?? ['', ''])[1];
}

const LEGAL_CASE = { id: 'case-legal', title: '已加载法律包案', kind: 'case', packBinding: ['legal'] };

const TARGETS: Array<[string, Record<string, unknown>]> = [
  ['零绑定', { id: 'case-target', title: '通用工作区案', kind: 'case', packBinding: [] }],
  ['只绑 catalog-only 包（PM）', { id: 'case-target', title: '产品管理绑定案', kind: 'case', packBinding: ['pm'] }],
  ['失效绑定（未准入）', { id: 'case-target', title: '失效绑定案', kind: 'case', packBinding: ['tender'] }],
];

describe('切 matter 的首个 committed render 零垂类泄漏', () => {
  it.each(TARGETS)('Legal 修订面活动态 → %s：第一次 committed render 就零 Legal tab/panel/文案', async (_label, target) => {
    const host = await mountApp([LEGAL_CASE, target]);

    // 前提：先真的把 Legal 面点成活动态（否则「切过去没有 Legal」是空判据）。
    click(host, 'case-card-case-legal');
    click(host, 'outline-revision');
    expect(host.querySelector('[data-testid="view-revision"]')).not.toBeNull();
    expect(host.innerHTML).toContain('修订预览');

    // 第一次 committed render 起：还没轮到任何 useEffect，DOM 里就必须已经零垂类。
    const frames = await switchCaseRecordingFrames(host, 'case-card-case-target');
    expect(frames.length, '切案须真的引起提交，否则本判据没被验到').toBeGreaterThan(0);
    for (const frame of frames) expect(legalLeaks(frame)).toEqual([]);
    // 且首帧的活动面是**说得出名字的通用面**——不是一张连标题都取不到词的空壳。
    expect(activeViewTitle(frames[0])).toBe('起草画布');

    // 稳定态同样零垂类，页签只剩通用起草面（同步收口不是把泄漏挪到后面一帧）。
    act(() => {});
    expect(
      host.querySelector('[data-testid="view-draft"]') ?? host.querySelector('[data-testid="outline-draft"]'),
      '稳定态须留下通用起草面的入口',
    ).not.toBeNull();
    expect(legalLeaks(host.innerHTML)).toEqual([]);
  // 首例要冷装配整张 App（模块图 + 组合根端口）；并行满载下 5s 缺省超时不够用，
  // 与判据无关，故只放宽时限本身。GENERIC-SCENARIOS-1：基线包入准入后冷装配再涨一档
  // （三包准入 + 第三张 registry），并行满载下越过 30s；隔离下同例约 3s，故是**冷装配时长**
  // 不是挂起——上界随之抬到 90s，判据一字不动。
  }, 90_000);
});
