import { useRef, useState } from 'react';
import type { PackageRegistries } from '@courtwork/registry';
import { isBaselinePackage } from '../composition/package-catalog';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';

/**
 * 场景条（GENERIC-PACK-1 裁定二）：场景按钮由包 descriptor 的 `launch` 声明、registry 冻结、
 * 宿主以有限元素集通用渲染。壳零场景按钮字面量——文案/变体/启动目标全部来自冻结声明；
 * 卸载态（零条目）起手引导＝通用开场（matter 规范文件提示＋Draft 入口），零垂类兜底。
 */

export interface SceneStripEntry {
  readonly scenarioId: string;
  /** 声明这枚场景的包（registry 冻结的归属）。卸载态判据的取处，见 `isVerticalCapabilityUnloaded`。 */
  readonly packageId: string;
  readonly uiTemplateId: string;
  readonly label: string;
  readonly tone: 'primary' | 'wide' | 'draft-wide';
  readonly kind: 'view' | 'scenario';
  /**
   * 是否带预检表单（冻结声明里有 formFields）。壳据此分流：有表单的场景由面内表单起跑，
   * 无表单的场景点按钮即起跑——此前无表单的场景点了什么也不会发生。
   */
  readonly hasPrecheckForm: boolean;
}

export interface SceneStripEligibility {
  /** demo 态可启动判定（demo fixture 声明；缺省全部不启动——不渲染死按钮）。 */
  readonly demoLaunchable?: (scenarioId: string) => boolean;
  /** production 态可启动的场景 id 闭集（垂类工作面驱动声明）。 */
  readonly productionScenarioIds: readonly string[];
}

/**
 * registry 冻结 launch 声明的宿主投影。
 *
 * - scenario 条目：按模式过滤（demo＝fixture 可启动；production＝驱动声明闭集）；
 * - view 条目（如 S4 起草答辩状＝起草画布视图入口）：恒在（通用宿主视图）；
 * - 呈现次序是**壳的呈现规则**：scenario 条目按注册表序在前，view 条目在后——
 *   现有四钮序（整理卷宗/审查合同/卷宗整理/起草答辩状）即由此复现。
 */
export function resolveSceneStripEntries(
  registries: PackageRegistries,
  eligibility: SceneStripEligibility,
  mode: 'demo' | 'production',
): SceneStripEntry[] {
  const declared: SceneStripEntry[] = [];
  for (const scenario of registries.scenarios.list()) {
    const launch = scenario.launch;
    if (launch === undefined) continue;
    if (launch.kind === 'scenario') {
      const launchable = mode === 'demo'
        ? eligibility.demoLaunchable?.(scenario.id) === true
        : eligibility.productionScenarioIds.includes(scenario.id);
      if (!launchable) continue;
    }
    declared.push({
      scenarioId: scenario.id,
      packageId: scenario.packageId,
      uiTemplateId: scenario.uiTemplateId,
      label: launch.label,
      tone: launch.tone,
      kind: launch.kind,
      hasPrecheckForm: (launch.formFields?.length ?? 0) > 0,
    });
  }
  return [
    ...declared.filter((entry) => entry.kind === 'scenario'),
    ...declared.filter((entry) => entry.kind === 'view'),
  ];
}

/**
 * 卸载态判据（GENERIC-SCENARIOS-1 收尾段追修）。
 *
 * 此前壳以「场景条零条目」代指「这枚 matter 没有加载垂类能力」。ADR-023 决定三让基线 registry
 * **恒在**之后，那个代理判据被顶穿了：零绑定 matter 上基线场景照样在册，条目数不再为零，
 * 于是卸载态起手引导与卸载态起草面这两处显式呈现同时静默失效（PW 从未实跑，故三段门数都
 * 没照出来）。判据改问包的成熟度——条目里有没有一枚来自非基线包。
 *
 * 「基线不算加载」不是措辞取巧：`baseline` 的定义就是「用户不加载也不卸载它」（见
 * `composition/package-catalog.ts`）。用户面对的「有没有加载垂类能力」这个问题，答案与它无关。
 */
export function isVerticalCapabilityUnloaded(entries: readonly SceneStripEntry[]): boolean {
  return !entries.some((entry) => !isBaselinePackage(entry.packageId));
}

/**
 * 起跑路由（GENERIC-SCENARIOS-1 二批裁定二）：scene-strip 触发后这枚场景该走哪条路。
 *
 * 三态闭集，纯函数、零垂类字面量：
 *  - `start`      无预检表单 → 直接起跑；
 *  - `renderer`   有预检表单**且**目标视图 blueprint 自声明 `handlesEmpty` → 沿既有自渲路径
 *                 （当期唯一这么做的是 S3 的修订预览面，挂过手即拆）；
 *  - `host-form`  有预检表单但没有任何面收留它 → **宿主通用容器**承载 `scenario-precheck-form`。
 *
 * 判据取 blueprint 的既有 `handlesEmpty` 声明，不新立第二处开关：产物到来前那一格是不是
 * 场景起跑面，本来就由它说了算。
 */
export type SceneLaunchRoute = 'start' | 'renderer' | 'host-form';

export function resolveSceneLaunchRoute(
  entry: Pick<SceneStripEntry, 'hasPrecheckForm'>,
  targetHandlesEmpty: boolean,
): SceneLaunchRoute {
  if (!entry.hasPrecheckForm) return 'start';
  return targetHandlesEmpty ? 'renderer' : 'host-form';
}

function toneClass(tone: SceneStripEntry['tone']): string {
  if (tone === 'primary') return 'scene-primary';
  if (tone === 'wide') return 'scene-wide-only';
  return 'scene-draft-wide';
}

export interface SceneStripProps {
  readonly entries: readonly SceneStripEntry[];
  /** grant 运行中：scenario 条目由取消控件顶替（驱动声明的运行态文案）。 */
  readonly running: boolean;
  readonly runningControlLabel?: string;
  readonly onLaunch: (entry: SceneStripEntry) => void;
  readonly onCancelRun: () => void;
  /** 卸载态起手引导的 Draft 入口（通用开场）。 */
  readonly onOpenDraft: () => void;
}

export function SceneStrip(props: SceneStripProps) {
  const { entries, running, runningControlLabel, onLaunch, onCancelRun, onOpenDraft } = props;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useDismissOnOutside(moreOpen, () => setMoreOpen(false), moreRef);
  const scenarioEntries = entries.filter((entry) => entry.kind === 'scenario');
  const viewEntries = entries.filter((entry) => entry.kind === 'view');
  // 弹层副本：view 条目恒在（当前唯一 view 条目＝起草答辩状），wide 变体窄屏副本。
  const popoverEntries = [...scenarioEntries.filter((entry) => entry.tone === 'wide'), ...viewEntries];

  return (
    <div className="scene-strip" data-testid="scene-strip">
      {/* 卸载态起手引导（裁定二）：通用开场——matter 规范文件提示＋Draft 入口，零垂类兜底。
          基线场景到场后引导**不再顶替**按钮而是与之同框：两者说的是两件事，一件是这枚 matter
          缺什么能力，一件是它此刻能起什么活。 */}
      {isVerticalCapabilityUnloaded(entries) && (
        <>
          <p className="scene-unloaded-hint" data-testid="scene-unloaded-hint">
            本工作区未加载垂类能力。可在工作区根目录撰写《场景规范.md》描述任务目标与材料分工，模型跨会话遵循；或直接进入起草画布开始工作。
          </p>
          <button type="button" className="scene-primary" data-testid="scene-unloaded-draft" onClick={onOpenDraft}>起草画布</button>
        </>
      )}
      {running && runningControlLabel !== undefined ? (
        <button type="button" className="scene-primary" data-testid="work-cancel" onClick={onCancelRun}>{runningControlLabel}</button>
      ) : scenarioEntries.map((entry) => (
        <button key={entry.scenarioId} type="button" className={toneClass(entry.tone)} data-testid={`scene-${entry.scenarioId}`} onClick={() => onLaunch(entry)}>{entry.label}</button>
      ))}
      {viewEntries.map((entry) => (
        <button key={entry.scenarioId} type="button" className={toneClass(entry.tone)} onClick={() => onLaunch(entry)}>{entry.label}</button>
      ))}
      {popoverEntries.length > 0 && (
        <div className="scene-more-wrap" ref={moreRef}>
          <button type="button" data-testid="scene-more" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>更多</button>
          {moreOpen && <div className="scene-more-popover surface-card" data-testid="scene-more-popover">
            {popoverEntries.map((entry) => (
              <button
                key={entry.scenarioId}
                type="button"
                className={entry.kind === 'view' ? undefined : 'scene-more-narrow-only'}
                onClick={() => { onLaunch(entry); setMoreOpen(false); }}
              >{entry.label}</button>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
}
