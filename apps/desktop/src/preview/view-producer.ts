import type { PackageRegistries } from '@courtwork/registry';
import type { HostRendererRegistry, HostWorkbenchView } from './HostRendererRegistry.js';

/**
 * LEGAL-FIVE-FACES-1 · 具名工作面的产出者派生（宿主侧纯函数，零垂类字面量）。
 *
 * **为何非加不可**：空着的工作面此前只会说「X 尚未生成」或「暂不适用」——两句都不告诉用户
 * 「这面由哪个场景产出、现在怎么开始」（真机试点收尾拍板第四条点名的缺口）。指引所需的三段
 * 事实全在 registry 里：场景声明 `outputArtifacts`、artifact 声明 `uiTemplateId`、宿主 blueprint
 * 声明 `view`。把这条链接起来即可，壳不必认识任何垂类 id 或文案。
 *
 * 「可启动闭集」是必带入参而非可选：说不出「怎么开始」的场景不配作指引——那只会把死路
 * 写得更长（本票要消灭的正是死钮与死面）。
 */
export interface ViewProducer {
  readonly scenarioId: string;
  /** 场景条上那枚按钮的文案（包冻结的 `launch.label`，与用户看见的逐字一致）。 */
  readonly launchLabel: string;
}

export function describeViewProducer(
  view: HostWorkbenchView,
  registries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
  launchableScenarioIds: readonly string[],
): ViewProducer | undefined {
  const blueprint = hostRenderers.list().find((entry) => entry.kind !== 'passive' && entry.view === view);
  if (!blueprint) return undefined;
  const claimedTypes = registries.artifactSchemas
    .list()
    .filter((entry) => entry.descriptor.uiTemplateId === blueprint.uiTemplateId)
    .map((entry) => entry.descriptor.typeId);
  if (claimedTypes.length === 0) return undefined;
  for (const scenario of registries.scenarios.list()) {
    const launch = scenario.launch;
    if (launch === undefined || launch.kind !== 'scenario') continue;
    if (!launchableScenarioIds.includes(scenario.id)) continue;
    if (!scenario.outputArtifacts.some((artifactType) => claimedTypes.includes(artifactType))) continue;
    return { scenarioId: scenario.id, launchLabel: launch.label };
  }
  return undefined;
}

/**
 * 场景启动后该落到哪张面：先认场景自己的 `uiTemplateId`（S3→修订预览、S4→起草画布），
 * 认不出（如 S1 的 `case-intake-panel` 是 passive 面）再落它首枚有在册工作面的产出物。
 * 全部 registry 派生——壳里不写「S1 跑完看时间线」这类垂类知识。
 */
export function resolveLaunchTargetView(
  scenarioId: string,
  uiTemplateId: string,
  registries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): HostWorkbenchView | undefined {
  const viewOf = (templateId: string): HostWorkbenchView | undefined => {
    const blueprint = hostRenderers.get(templateId);
    return blueprint && blueprint.kind !== 'passive' ? blueprint.view : undefined;
  };
  const direct = viewOf(uiTemplateId);
  if (direct) return direct;
  const scenario = registries.scenarios.get(scenarioId);
  for (const artifactType of scenario?.outputArtifacts ?? []) {
    const entry = registries.artifactSchemas.get(artifactType);
    if (!entry) continue;
    const view = viewOf(entry.descriptor.uiTemplateId);
    if (view) return view;
  }
  return undefined;
}
