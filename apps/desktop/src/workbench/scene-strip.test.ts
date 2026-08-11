import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { BASELINE_SCENARIO_IDS } from '../composition/production-scenarios.js';
import {
  isVerticalCapabilityUnloaded,
  resolveSceneLaunchRoute,
  resolveSceneStripEntries,
  SceneStrip,
  type SceneStripEntry,
} from './scene-strip';

/**
 * GENERIC-PACK-1 裁定二：场景条改 registry 派生——按钮/预检表单由包 descriptor 声明、
 * registry 冻结、宿主以有限元素集通用渲染；加载态四钮零视觉回归为证，卸载态起手引导
 * 为通用开场（matter 规范文件提示＋Draft 入口）零垂类兜底。
 */

const runtime = createDesktopPackageRuntime();

const LEGAL_ENTRIES: readonly SceneStripEntry[] = [
  { scenarioId: 'legal.S1', packageId: 'legal', uiTemplateId: 'case-intake-panel', label: '整理卷宗', tone: 'primary', kind: 'scenario', hasPrecheckForm: false },
  { scenarioId: 'legal.S3', packageId: 'legal', uiTemplateId: 'courtwork.risk-review.v1', label: '审查合同', tone: 'primary', kind: 'scenario', hasPrecheckForm: true },
  { scenarioId: 'legal.S6', packageId: 'legal', uiTemplateId: 'file-ops-plan-panel', label: '卷宗整理', tone: 'wide', kind: 'scenario', hasPrecheckForm: false },
  { scenarioId: 'legal.S4', packageId: 'legal', uiTemplateId: 'draft-review-panel', label: '起草答辩状', tone: 'draft-wide', kind: 'view', hasPrecheckForm: false },
];

/** 零垂类绑定 matter 的真实条目集（基线恒在生效 registry 内，ADR-023 决定三）。 */
const BASELINE_ENTRIES: readonly SceneStripEntry[] = resolveSceneStripEntries(
  runtime.registriesFor([]),
  { productionScenarioIds: BASELINE_SCENARIO_IDS },
  'production',
);

describe('resolveSceneStripEntries（registry 冻结 launch 声明的宿主投影）', () => {
  it('零垂类 registry → 空集（卸载态起手引导的判定入口）', () => {
    expect(resolveSceneStripEntries(
      createDesktopPackageRuntime().registriesFor([]),
      { productionScenarioIds: [] },
      'production',
    )).toEqual([]);
  });

  it('demo 态：demo 可启动的 scenario 条目 + view 条目全量；呈现序＝scenario 先、view 后', () => {
    const entries = resolveSceneStripEntries(runtime.packageRegistries, {
      demoLaunchable: (id) => id === 'legal.S1' || id === 'legal.S3' || id === 'legal.S6',
      productionScenarioIds: [],
    }, 'demo');
    expect(entries).toEqual(LEGAL_ENTRIES);
  });

  it('demo 态：demo 不可启动的 scenario 条目不出现（不渲染死按钮）', () => {
    const entries = resolveSceneStripEntries(runtime.packageRegistries, {
      demoLaunchable: (id) => id === 'legal.S3',
      productionScenarioIds: [],
    }, 'demo');
    expect(entries.map((entry) => entry.scenarioId)).toEqual(['legal.S3', 'legal.S4']);
  });

  it('production 态：scenario 条目按驱动声明的闭集过滤，view 条目恒在', () => {
    const entries = resolveSceneStripEntries(runtime.packageRegistries, {
      productionScenarioIds: ['legal.S3'],
    }, 'production');
    expect(entries.map((entry) => entry.scenarioId)).toEqual(['legal.S3', 'legal.S4']);
  });
});

describe('SceneStrip（宿主有限元素集通用渲染）', () => {
  function render(props: Partial<Parameters<typeof SceneStrip>[0]> = {}): string {
    return renderToStaticMarkup(createElement(SceneStrip, {
      entries: LEGAL_ENTRIES,
      running: false,
      runningControlLabel: undefined,
      onLaunch: () => undefined,
      onCancelRun: () => undefined,
      onOpenDraft: () => undefined,
      ...props,
    }));
  }

  it('加载态四钮零视觉回归：序与变体逐字一致（整理卷宗/审查合同/卷宗整理/起草答辩状/更多）', () => {
    const html = render();
    const order = ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状'];
    let cursor = -1;
    for (const label of order) {
      const at = html.indexOf(label);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(html).toContain('class="scene-primary"');
    expect(html).toContain('class="scene-wide-only"');
    expect(html).toContain('class="scene-draft-wide"');
    expect(html).toContain('data-testid="scene-more"');
    // 弹层是交互态（moreOpen 才渲染内容），其锚定与内容序由既有 e2e（ui-residue/file-ops）覆盖。
  });

  it('运行中：scenario 条目由取消控件顶替（驱动声明文案），view 条目保留', () => {
    const html = render({ running: true, runningControlLabel: '停止审查' });
    expect(html).toContain('data-testid="work-cancel"');
    expect(html).toContain('停止审查');
    expect(html).not.toContain('审查合同');
    expect(html).toContain('起草答辩状');
  });

  it('卸载态＋基线场景在册：起手引导与基线按钮同框（引导不因基线到场消失）', () => {
    const html = render({ entries: BASELINE_ENTRIES });
    expect(html).toContain('data-testid="scene-unloaded-hint"');
    expect(html).toContain('data-testid="scene-unloaded-draft"');
    expect(html).toContain('data-testid="scene-generic.draft"');
    expect(html).toContain('data-testid="scene-generic.batch"');
    for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状', '合同']) {
      expect(html).not.toContain(legalCopy);
    }
  });

  it('加载态：起手引导不出现（垂类在册即非卸载态）', () => {
    const html = render({ entries: [...LEGAL_ENTRIES, ...BASELINE_ENTRIES] });
    expect(html).not.toContain('data-testid="scene-unloaded-hint"');
    expect(html).not.toContain('data-testid="scene-unloaded-draft"');
  });

  it('卸载态：起手引导＝matter 规范文件提示＋Draft 入口，零垂类文案、无更多', () => {
    const html = render({ entries: [] });
    expect(html).toContain('data-testid="scene-unloaded-hint"');
    expect(html).toContain('《场景规范.md》');
    expect(html).toContain('data-testid="scene-unloaded-draft"');
    expect(html).toContain('起草画布');
    expect(html).not.toContain('data-testid="scene-more"');
    for (const legalCopy of ['整理卷宗', '审查合同', '卷宗整理', '起草答辩状', '合同']) {
      expect(html).not.toContain(legalCopy);
    }
  });
});

/**
 * GENERIC-SCENARIOS-1 收尾段：**卸载态判据被基线顶穿**的追修。
 *
 * ADR-023 决定三让基线 registry 恒在，于是「场景条零条目」不再等价于「这枚 matter 没有加载
 * 垂类能力」——零绑定 matter 上基线两枚场景照样在册。判据必须改问包的成熟度：条目里有没有
 * 一枚来自**非基线**包。
 */
describe('isVerticalCapabilityUnloaded（卸载态判据）', () => {
  it('零条目 → 卸载（旧判据的行为逐字保留）', () => {
    expect(isVerticalCapabilityUnloaded([])).toBe(true);
  });

  it('只有基线场景在册 → 仍是卸载态（基线不是被加载的垂类能力）', () => {
    expect(BASELINE_ENTRIES.length).toBeGreaterThan(0);
    expect(isVerticalCapabilityUnloaded(BASELINE_ENTRIES)).toBe(true);
  });

  it('任一垂类条目在册 → 非卸载态（含只有 view 条目的情形）', () => {
    expect(isVerticalCapabilityUnloaded([...BASELINE_ENTRIES, ...LEGAL_ENTRIES])).toBe(false);
    expect(isVerticalCapabilityUnloaded([LEGAL_ENTRIES[3]!])).toBe(false);
  });
});

describe('resolveSceneStripEntries 携出包身份（卸载态判据的取处）', () => {
  it('条目逐枚带 packageId，且与 registry 冻结的场景归属一致', () => {
    const entries = resolveSceneStripEntries(runtime.packageRegistries, {
      demoLaunchable: () => true,
      productionScenarioIds: [],
    }, 'demo');
    for (const entry of entries) {
      expect(runtime.packageRegistries.scenarios.get(entry.scenarioId)?.packageId).toBe(entry.packageId);
    }
    expect(entries.some((entry) => entry.packageId === 'generic')).toBe(true);
  });
});

/**
 * GENERIC-SCENARIOS-1 二批裁定二：预检承载面改宿主通用承载——**不依赖任何目标视图 renderer 在场**。
 * 此前带预检表单的场景一律指望目标视图自渲表单，故没有面收留的场景点了什么也不会发生。
 */
describe('resolveSceneLaunchRoute', () => {
  it('无预检表单 → 直接起跑（与目标面自渲能力无关）', () => {
    expect(resolveSceneLaunchRoute({ hasPrecheckForm: false }, true)).toBe('start');
    expect(resolveSceneLaunchRoute({ hasPrecheckForm: false }, false)).toBe('start');
  });

  it('有预检表单 ＋ 目标 blueprint 自声明 handlesEmpty → 沿既有自渲路径（S3）', () => {
    expect(resolveSceneLaunchRoute({ hasPrecheckForm: true }, true)).toBe('renderer');
  });

  it('有预检表单但没有面收留它 → 宿主通用容器承载（此前是死钮）', () => {
    expect(resolveSceneLaunchRoute({ hasPrecheckForm: true }, false)).toBe('host-form');
  });
});
