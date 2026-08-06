import { useRef, useState } from 'react';
import type { PackageRegistries } from '@courtwork/registry';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';

/**
 * 场景条（GENERIC-PACK-1 裁定二）：场景按钮由包 descriptor 的 `launch` 声明、registry 冻结、
 * 宿主以有限元素集通用渲染。壳零场景按钮字面量——文案/变体/启动目标全部来自冻结声明；
 * 卸载态（零条目）起手引导＝通用开场（matter 规范文件提示＋Draft 入口），零垂类兜底。
 */

export interface SceneStripEntry {
  readonly scenarioId: string;
  readonly uiTemplateId: string;
  readonly label: string;
  readonly tone: 'primary' | 'wide' | 'draft-wide';
  readonly kind: 'view' | 'scenario';
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
      uiTemplateId: scenario.uiTemplateId,
      label: launch.label,
      tone: launch.tone,
      kind: launch.kind,
    });
  }
  return [
    ...declared.filter((entry) => entry.kind === 'scenario'),
    ...declared.filter((entry) => entry.kind === 'view'),
  ];
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

  if (entries.length === 0) {
    // 卸载态起手引导（裁定二）：通用开场——matter 规范文件提示＋Draft 入口，零垂类兜底。
    return (
      <div className="scene-strip" data-testid="scene-strip">
        <p className="scene-unloaded-hint" data-testid="scene-unloaded-hint">
          本工作区未加载垂类能力。可在工作区根目录撰写《场景规范.md》描述任务目标与材料分工，模型跨会话遵循；或直接进入起草画布开始工作。
        </p>
        <button type="button" className="scene-primary" data-testid="scene-unloaded-draft" onClick={onOpenDraft}>起草画布</button>
      </div>
    );
  }

  return (
    <div className="scene-strip" data-testid="scene-strip">
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
