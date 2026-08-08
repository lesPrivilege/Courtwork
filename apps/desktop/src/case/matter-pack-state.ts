import type { PackageCatalogEntry } from '../composition/package-catalog';
import { resolveMatterPackBinding } from '../composition/package-runtime';

/**
 * matter 包状态的宿主呈现派生（PACK-INTERACT-1 ②）：设置处状态行与弹层共用的取词面。
 *
 * 输入是**已声明的绑定**（`packBinding`，可缺席）＋全局可用集＋宿主目录；输出是用户可见的
 * 状态片段。语义照 `resolveMatterPackBinding` 三态：缺席＝跟随全部可用包；`[]`＝显式零；
 * `['<id>']`＝显式单枚（可指向非准入包＝失效态）。
 */
export interface MatterPackState {
  /** 已加载包的 id（失效/未知 id 也在内）。空＝未加载。 */
  loadedIds: readonly string[];
  /**
   * 已加载包的展示名。宿主目录缺条目时**不回落裸 id**——裸 id 与正常已加载态同形，
   * 等于把装配缺陷伪装成正常态（核心不变量四）；一律带显式不可用标记。
   */
  loadedLabels: readonly string[];
  /** 未声明态（跟随全部可用包）。 */
  undeclared: boolean;
  /** 绑定指向本制品未准入的包（失效态，ADR-015 fail-closed 显式）。 */
  invalidId?: string;
  /**
   * 绑定指向已准入但当期只上架目录的包（`catalog-only`，ADR-015 决定三 2026-08-08 补记）。
   *
   * 既不是「已加载」也不是失效：历史绑定不迁移、不清空、不判未准入，既有产物照读，
   * 但零场景/prompt/production 入口。呈现必须与完整加载态可区分。
   */
  catalogOnlyId?: string;
}

/** 宿主目录缺条目时的用户可见标记：带 id 便于定位，但明写不可用，绝不与正常已加载态同形。 */
export function unavailablePackLabel(packageId: string): string {
  return `${packageId} · 本版本不可用`;
}

export function describeMatterPackState(
  packBinding: readonly string[] | undefined,
  availablePackageIds: readonly string[],
  catalog: readonly PackageCatalogEntry[],
): MatterPackState {
  const resolved = resolveMatterPackBinding(packBinding, availablePackageIds);
  const loadedLabels = resolved.packageIds.map((id) => {
    const entry = catalog.find((item) => item.packageId === id);
    return entry === undefined ? unavailablePackLabel(id) : entry.displayName;
  });
  const invalidId = resolved.packageIds.find((id) => !catalog.some((entry) => entry.packageId === id));
  // 显式单枚绑定才谈 catalog-only：未声明态（跟随全部可用包）由 undeclared 自己说话。
  const catalogOnlyId = resolved.status === 'declared'
    ? resolved.packageIds.find(
      (id) => catalog.some((entry) => entry.packageId === id && entry.availability === 'catalog-only'),
    )
    : undefined;
  return {
    loadedIds: [...resolved.packageIds],
    loadedLabels,
    undeclared: resolved.status === 'undeclared',
    ...(invalidId !== undefined ? { invalidId } : {}),
    ...(catalogOnlyId !== undefined ? { catalogOnlyId } : {}),
  };
}
