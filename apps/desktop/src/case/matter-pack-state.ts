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
  /** 已加载包的展示名（失效/未知 id 回落原 id）。 */
  loadedLabels: readonly string[];
  /** 未声明态（跟随全部可用包）。 */
  undeclared: boolean;
  /** 绑定指向本制品未准入的包（失效态，ADR-015 fail-closed 显式）。 */
  invalidId?: string;
}

export function describeMatterPackState(
  packBinding: readonly string[] | undefined,
  availablePackageIds: readonly string[],
  catalog: readonly PackageCatalogEntry[],
): MatterPackState {
  const resolved = resolveMatterPackBinding(packBinding, availablePackageIds);
  const loadedLabels = resolved.packageIds.map(
    (id) => catalog.find((entry) => entry.packageId === id)?.displayName ?? id,
  );
  const invalidId = resolved.packageIds.find((id) => !catalog.some((entry) => entry.packageId === id));
  return {
    loadedIds: [...resolved.packageIds],
    loadedLabels,
    undeclared: resolved.status === 'undeclared',
    ...(invalidId !== undefined ? { invalidId } : {}),
  };
}
