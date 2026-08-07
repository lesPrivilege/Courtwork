import type { PackageRegistries } from '@courtwork/registry';
import type { HostRendererRegistry, HostWorkbenchView } from './HostRendererRegistry.js';

export interface WorkbenchViewEntry {
  id: HostWorkbenchView;
  label: string;
}

/**
 * 通用工作面：**不随垂类加载与否变化**，故住壳、由壳命名（ADR-015 决定一「schema 以外的
 * 所有 UI 住 agent」）。
 *
 * `draft` 恒在——它是 ADR-015 成品律点名的通用主工作面。它与 Legal 的 `draft-review-panel`
 * blueprint 无从属关系：那枚 blueprint 只是把 `legal.RevisionInstructionSet` 路由到同一张
 * 通用画布，卸垂类后画布照在。
 * `artifact` 是通用「结构化产出」页签，有产出才出现（唯一的多对一席位，自持产出选择）。
 */
export const GENERIC_DRAFT_VIEW = { id: 'draft', label: '起草画布' } as const satisfies WorkbenchViewEntry;
export const GENERIC_ARTIFACT_VIEW = { id: 'artifact', label: '结构化产出' } as const satisfies WorkbenchViewEntry;

/**
 * 可见工作面集：**具名工作面由「已准入的 artifact × 在册 blueprint」派生**，不再是壳里的
 * 固定枚举（GENERIC-PACK-1 ①）。
 *
 * 这是零泄漏的运行时半边（静态半边是 import 门）：未加载垂类时，`artifactSchemas.list()`
 * 为空 ⇒ 零具名工作面 ⇒ 页签条只剩通用面，零垂类词表、零入口渲染（ADR-015 决定三）。
 * 加载后逐枚回来，且**顺序与标题都取自宿主注册表的声明**——壳不再另抄一份垂类词。
 *
 * 顺序律：具名面按宿主注册表的声明次序（受信组合根是唯一排序真源），随后是通用面。
 * 卸载态与加载态共用同一条派生路径，不存在「未加载时走另一套」的第二分支。
 */
export function resolveWorkbenchViews(
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
  hasArtifactView: boolean,
): WorkbenchViewEntry[] {
  const claimed = new Set(
    packageRegistries.artifactSchemas.list().map((entry) => entry.descriptor.uiTemplateId),
  );
  const named: WorkbenchViewEntry[] = [];
  for (const blueprint of hostRenderers.list()) {
    if (blueprint.kind === 'passive') continue;
    if (blueprint.view === GENERIC_DRAFT_VIEW.id || blueprint.view === GENERIC_ARTIFACT_VIEW.id) continue;
    if (!claimed.has(blueprint.uiTemplateId)) continue;
    if (named.some((entry) => entry.id === blueprint.view)) continue;
    // 具名 blueprint 缺 label 是装配缺陷，不给「回落到 id」的静默降级：宿主注册表是唯一排序与
    // 标题真源，缺一枚即整条派生显式失败。
    if (blueprint.label === undefined) {
      throw new Error(`host renderer blueprint ${blueprint.uiTemplateId} declares view '${blueprint.view}' without a label`);
    }
    named.push({ id: blueprint.view, label: blueprint.label });
  }
  return [
    ...named,
    GENERIC_DRAFT_VIEW,
    ...(hasArtifactView ? [GENERIC_ARTIFACT_VIEW] : []),
  ];
}

/**
 * 首选工作面：blueprint 可声明 `preferred`，壳据此选默认落点，不在壳里写死某个垂类面的名字。
 * 无在册首选（例如未加载任何垂类）即落通用 `draft`——成品律要求默认形态本身完整。
 */
export function preferredWorkbenchView(
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): HostWorkbenchView {
  const views = resolveWorkbenchViews(packageRegistries, hostRenderers, false);
  for (const blueprint of hostRenderers.list()) {
    if (blueprint.kind === 'passive' || blueprint.preferred !== true) continue;
    if (views.some((entry) => entry.id === blueprint.view)) return blueprint.view;
  }
  return GENERIC_DRAFT_VIEW.id;
}

export function workbenchViewLabel(views: readonly WorkbenchViewEntry[], view: HostWorkbenchView): string {
  return views.find((entry) => entry.id === view)?.label ?? '';
}

/**
 * 面头 / 大纲的计数文案（LEGAL-FIVE-FACES-1 D8 外提）。
 *
 * 非 demo 案此前恒「尚无」——面上正渲着时间线、抬头却说没有，那是「production 只有 S3 会
 * 产出」时期的遗留断言。改按**本面此刻是否真有产物**说话；样板案展品计数仍由 demo 族注入
 * （`demoCount` 缺席即非 demo，宿主不认识展品数字）。
 */
export function workbenchViewMeta(input: {
  view: HostWorkbenchView;
  draftFrozen: boolean;
  hasArtifactView: boolean;
  namedViewReady: boolean;
  demoCount?: (view: HostWorkbenchView) => string | undefined;
}): string {
  const draftMeta = input.draftFrozen ? '已定稿' : '起草中';
  if (input.view === GENERIC_ARTIFACT_VIEW.id) return input.hasArtifactView ? '已生成' : '尚无';
  if (!input.demoCount) {
    return input.view === GENERIC_DRAFT_VIEW.id ? draftMeta : (input.namedViewReady ? '已生成' : '尚无');
  }
  return input.demoCount(input.view) ?? draftMeta;
}
