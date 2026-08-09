import type { PackageRegistries } from '@courtwork/registry';
import { NEUTRAL_ARTIFACT_TITLE, resolveHostArtifact } from './ArtifactHostView.js';
import type { HostRendererRegistry, HostWorkbenchView } from './HostRendererRegistry.js';

/**
 * 产出页签 id 前缀（PREVIEW-TAB-1 · ADR-014 决定一）。
 *
 * 页签身份**就是 artifact type 本身**（带包命名空间），不另立一套页签编号：ADR-014 决定二
 * 「混包 tab 栏内不同垂类 artifact 共存靠 namespaced artifact type 天然隔离，不引入第二套
 * 命名空间机制」。前缀只用来把产出页签与具名工作面 id 分在两个空间里。
 */
const ARTIFACT_TAB_PREFIX = 'artifact:';

export type ArtifactTabId = `${typeof ARTIFACT_TAB_PREFIX}${string}`;
/** 页签 id：具名/通用工作面 id，或一枚产出的页签 id。 */
export type WorkbenchTabId = HostWorkbenchView | ArtifactTabId;

export function artifactTabId(artifactType: string): ArtifactTabId {
  return `${ARTIFACT_TAB_PREFIX}${artifactType}`;
}

/** 页签 id → artifact type；非产出页签返回 undefined（不猜）。 */
export function artifactTypeOfTab(tab: string): string | undefined {
  return tab.startsWith(ARTIFACT_TAB_PREFIX) ? tab.slice(ARTIFACT_TAB_PREFIX.length) : undefined;
}

export interface WorkbenchViewEntry {
  id: WorkbenchTabId;
  label: string;
}

/**
 * 产出席位的一枚页签＝一枚已产出 artifact。
 *
 * 三态是**渲染归属**而非成熟度：`ready` 有本 matter 的 schema 表可渲；`unloaded` 产物在册
 * 但生成它的包此刻未加载（ADR-015 决定四的显式退化面）；`unsupported` 连全局准入集也认不出
 * （零泄漏 fallback）。三态都占一张页签——产物是宿主资产，不因包的加载与否从页签条上消失。
 */
export type ArtifactSeatTab =
  | { id: ArtifactTabId; label: string; artifactType: string; status: 'ready' }
  | { id: ArtifactTabId; label: string; artifactType: string; status: 'unloaded'; packageId: string }
  | { id: ArtifactTabId; label: string; artifactType: string; status: 'unsupported' };

/**
 * 通用工作面：**不随垂类加载与否变化**，故住壳、由壳命名（ADR-015 决定一「schema 以外的
 * 所有 UI 住 agent」）。
 *
 * `draft` 恒在——它是 ADR-015 成品律点名的通用主工作面。它与 Legal 的 `draft-review-panel`
 * blueprint 无从属关系：那枚 blueprint 只是把 `legal.RevisionInstructionSet` 路由到同一张
 * 通用画布，卸垂类后画布照在。
 */
export const GENERIC_DRAFT_VIEW = { id: 'draft', label: '起草画布' } as const satisfies WorkbenchViewEntry;

/**
 * 通用产出席位的 blueprint 标记（PREVIEW-TAB-1 后**不再是一张页签**）。
 *
 * blueprint 声明 `view: 'artifact'` 的含义由「住通用那一张聚合页签」改为「不认领具名工作面，
 * 按产出逐枚开页签」。ADR-014 决定一退役的正是那枚多对一席位——席位内自持产出选择意味着
 * 同时在册的多枚产出里只有末位者在页签条上存在。
 */
export const GENERIC_ARTIFACT_SEAT_VIEW = 'artifact' as const satisfies HostWorkbenchView;

/**
 * 可见工作面集：**具名工作面由「已准入的 artifact × 在册 blueprint」派生**，不再是壳里的
 * 固定枚举（GENERIC-PACK-1 ①）。
 *
 * 这是零泄漏的运行时半边（静态半边是 import 门）：未加载垂类时，`artifactSchemas.list()`
 * 为空 ⇒ 零具名工作面 ⇒ 页签条只剩通用面，零垂类词表、零入口渲染（ADR-015 决定三）。
 * 加载后逐枚回来，且**顺序与标题都取自宿主注册表的声明**——壳不再另抄一份垂类词。
 *
 * 顺序律：具名面按宿主注册表的声明次序（受信组合根是唯一排序真源），随后是通用面，
 * 末尾是产出页签（按产出到达次序，见 `resolveArtifactSeat`）。
 * 卸载态与加载态共用同一条派生路径，不存在「未加载时走另一套」的第二分支。
 */
export function resolveWorkbenchViews(
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
  artifactSeat: readonly ArtifactSeatTab[],
): WorkbenchViewEntry[] {
  const claimed = new Set(
    packageRegistries.artifactSchemas.list().map((entry) => entry.descriptor.uiTemplateId),
  );
  const named: WorkbenchViewEntry[] = [];
  for (const blueprint of hostRenderers.list()) {
    if (blueprint.kind === 'passive') continue;
    if (blueprint.view === GENERIC_DRAFT_VIEW.id || blueprint.view === GENERIC_ARTIFACT_SEAT_VIEW) continue;
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
    ...artifactSeat.map((tab) => ({ id: tab.id, label: tab.label })),
  ];
}

/**
 * 产出席位（PREVIEW-TAB-1 · ADR-014 决定一「tab = 一张 schema 表」）。
 *
 * 会话里每一枚**没有具名工作面收留**的产出各得一张页签，次序即产出到达次序。落具名面的
 * （时间线/图谱/矩阵/修订）由自己那张面承载，不在此重复；`passive` blueprint 的产出
 * （卷宗清单在加载态）本就没有工作面，也不在此——它没有可渲的 schema 表。
 *
 * 标题的取处分三层且**都不是壳自己起的名**：本 matter 准入即取本 matter 的 descriptor；
 * 包未加载则取全局准入集的 descriptor（产物是宿主资产，标题是产物自己的身份，不是垂类词表
 * 泄漏——同 `VerticalArtifactUnloadedView`）；全局也认不出才落中性标题。
 */
export function resolveArtifactSeat(input: {
  artifacts: Readonly<Record<string, unknown>>;
  /** 本 matter 生效的准入集（决定能否渲结构化视图）。 */
  matterRegistries: PackageRegistries;
  /** 全局准入集：只用于给未加载包的产出取回它自己的标题与生成方。 */
  globalRegistries: PackageRegistries;
  hostRenderers: HostRendererRegistry;
}): ArtifactSeatTab[] {
  const seat: ArtifactSeatTab[] = [];
  for (const artifactType of Object.keys(input.artifacts)) {
    const id = artifactTabId(artifactType);
    const resolved = resolveHostArtifact(artifactType, input.matterRegistries, input.hostRenderers);
    if (resolved.status === 'ready') {
      // 具名工作面与 passive 面各有归宿，不占产出席位。
      if (resolved.renderer.kind !== 'component' || resolved.renderer.view !== GENERIC_ARTIFACT_SEAT_VIEW) continue;
      seat.push({ id, label: resolved.title, artifactType, status: 'ready' });
      continue;
    }
    const globalEntry = input.globalRegistries.artifactSchemas.get(artifactType);
    if (globalEntry !== undefined && input.matterRegistries.artifactSchemas.get(artifactType) === undefined) {
      seat.push({
        id,
        label: globalEntry.descriptor.title || NEUTRAL_ARTIFACT_TITLE,
        artifactType,
        status: 'unloaded',
        packageId: globalEntry.packageId,
      });
      continue;
    }
    seat.push({ id, label: resolved.title, artifactType, status: 'unsupported' });
  }
  return seat;
}

/**
 * 首选工作面：blueprint 可声明 `preferred`，壳据此选默认落点，不在壳里写死某个垂类面的名字。
 * 无在册首选（例如未加载任何垂类）即落通用 `draft`——成品律要求默认形态本身完整。
 */
export function preferredWorkbenchView(
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): HostWorkbenchView {
  const views = resolveWorkbenchViews(packageRegistries, hostRenderers, []);
  for (const blueprint of hostRenderers.list()) {
    if (blueprint.kind === 'passive' || blueprint.preferred !== true) continue;
    if (views.some((entry) => entry.id === blueprint.view)) return blueprint.view;
  }
  return GENERIC_DRAFT_VIEW.id;
}

export function workbenchViewLabel(views: readonly WorkbenchViewEntry[], view: WorkbenchTabId): string {
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
  view: WorkbenchTabId;
  draftFrozen: boolean;
  namedViewReady: boolean;
  demoCount?: (view: string) => string | undefined;
}): string {
  const draftMeta = input.draftFrozen ? '已定稿' : '起草中';
  // 产出页签只在产物在册时存在，故它恒「已生成」——不必再问「有没有」。
  if (artifactTypeOfTab(input.view) !== undefined) return '已生成';
  if (!input.demoCount) {
    return input.view === GENERIC_DRAFT_VIEW.id ? draftMeta : (input.namedViewReady ? '已生成' : '尚无');
  }
  return input.demoCount(input.view) ?? draftMeta;
}

/**
 * 活动面与对照面的**同步**收口（PACK-INTERACT-1 2R · C，ADR-015 决定三 2026-08-08 补记
 * 「首个可见帧也属零泄漏」）。
 *
 * 用户所选 ∩ 本 matter 生效视图集：所选面不在集内就落回在册默认，对照面不在集内就直接消失。
 * 必须在**渲染里**收口而不是 `useEffect` 里回落——effect 只在提交之后才跑，先按上一枚 matter
 * 的选择提交一帧、再回落通用面，那一帧是真的进过 DOM 的：切到零绑定/仅目录包/失效绑定的
 * matter 时，读屏与视觉拿到的活动面身份就是垂类面。同步派生使这一帧结构上不可能存在。
 */
export function resolveActiveWorkbenchViews(input: {
  views: readonly WorkbenchViewEntry[];
  requestedView: WorkbenchTabId;
  requestedSecondaryView?: WorkbenchTabId;
  fallbackView: HostWorkbenchView;
}): { activeView: WorkbenchTabId; secondaryView?: WorkbenchTabId } {
  const inViews = (view: WorkbenchTabId) => input.views.some((entry) => entry.id === view);
  const activeView = inViews(input.requestedView) ? input.requestedView : input.fallbackView;
  return input.requestedSecondaryView !== undefined && inViews(input.requestedSecondaryView)
    ? { activeView, secondaryView: input.requestedSecondaryView }
    : { activeView };
}
