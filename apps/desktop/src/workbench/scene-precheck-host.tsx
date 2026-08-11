import type { PackageRegistries } from '@courtwork/registry';
import { inferFileKind } from '../composer/file-kind';
import type { StoredMaterial } from '../material/material-ref';
import { ScenarioPrecheckForm, type ScenarioStartParams } from './scenario-precheck-form';
import { resolveSceneLaunchRoute, type SceneStripEntry } from './scene-strip';

/**
 * 宿主通用起跑面（GENERIC-SCENARIOS-1 二批裁定二）。
 *
 * 带预检表单的场景此前一律指望**目标视图 renderer** 自渲表单（当期唯一这么做的是 S3 的
 * 修订预览面）。于是没有面收留的场景——例如产物到来前只有产出席位的基线场景——点了什么
 * 也不会发生。本件把承载面搬到宿主：scene-strip 触发即渲，提交即 start，不依赖任何 renderer
 * 在场；产出席位维持既有显式指引空态。
 *
 * 零垂类语义：标题、说明、字段文案全部取自 registry 冻结的 `launch` 声明；`select` 选项按声明
 * 的 `source`/`mediaType` 做领域无关的材料查询。
 */

export interface ScenePrecheckHostProps {
  /** 正在承载的场景 id；null＝不在起跑面。 */
  readonly scenarioId: string | null;
  readonly registries: PackageRegistries;
  readonly caseMaterials: readonly StoredMaterial[];
  readonly onStart: (scenarioId: string, params: ScenarioStartParams) => void;
  readonly onCancel: () => void;
}

export function ScenePrecheckHost(props: ScenePrecheckHostProps) {
  const { scenarioId, registries, caseMaterials, onStart, onCancel } = props;
  const scenario = scenarioId === null ? undefined : registries.scenarios.get(scenarioId);
  const launch = scenario?.launch;
  // 场景或其 launch 声明取不回来即不渲染：起跑面不替 registry 编一份声明出来。
  if (scenarioId === null || scenario === undefined || launch === undefined) return null;

  const resolveOptions = (fieldId: string): ReadonlyArray<{ value: string; label: string }> => {
    const field = launch.formFields?.find((candidate) => candidate.id === fieldId);
    if (field === undefined || field.kind !== 'select') return [];
    return caseMaterials
      .filter((material) => material.status === 'ready')
      .filter((material) => field.mediaType === undefined || inferFileKind(material.fileName) === field.mediaType)
      .map((material) => ({ value: material.materialId, label: material.fileName }));
  };

  return (
    <section className="scene-precheck-host surface-card" data-testid="scene-precheck-host">
      <ScenarioPrecheckForm
        title={scenario.name}
        launch={launch}
        resolveOptions={resolveOptions}
        onSubmit={(params) => onStart(scenarioId, params)}
      />
      <button type="button" className="quiet-button" data-testid="scene-precheck-cancel" onClick={onCancel}>取消</button>
    </section>
  );
}

/**
 * 场景条起跑的三态路由落地（判据纯函数在 `scene-strip.tsx`，此处只做接线）。
 * 返回下一枚起跑面场景 id（`null`＝不进起跑面）；`start` 路由的实际起跑由调用方在此之前完成。
 */
export function routeSceneLaunch(input: {
  entry: SceneStripEntry;
  targetHandlesEmpty: boolean;
  startScenario: (scenarioId: string) => void;
}): string | null {
  const route = resolveSceneLaunchRoute(input.entry, input.targetHandlesEmpty);
  if (route === 'start') { input.startScenario(input.entry.scenarioId); return null; }
  if (route === 'renderer') return null;
  return input.entry.scenarioId;
}
