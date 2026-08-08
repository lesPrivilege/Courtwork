/**
 * 宿主包目录（PACK-INTERACT-1 ①）：加载 UX 的「全局可用集呈现」取词面。
 *
 * 呈现事实住受信组合根——Package ABI 无 displayName（改 ABI 属契约拍板，本票无权），
 * 按 GENERIC-PACK-1 ③ 先例「label 立在宿主侧而非 Package ABI：标题是宿主呈现事实」落地。
 * 本目录**不参与**准入/绑定解析/任何机制：机制真源仍是 `packageId`，目录只供用户文案取词，
 * 不是第二真源。准入包缺宿主呈现名即装配显式失败——静默回落到 packageId 字面量就是把
 * 装配缺陷藏进用户文案（核心不变量四）。
 */

/**
 * 发行成熟度（ADR-015 决定三 2026-08-08 补记）：**准入**与**可交互加载**分层。
 *
 *  - `loadable`：当期产品允许用户在 matter 建立/设置处激活。
 *  - `catalog-only`：descriptor/schema/renderer 已过构建期准入（故能识别与读取既有产物），
 *    但当期不开放交互加载——渲染成普通「加载 X 包」就是以 UI 承诺不存在的场景与 prompt。
 *
 * 闭集只此两枚。该字段是**宿主发行事实**：只住受信组合根，不进 Package ABI、不进
 * `packBinding`/case store/wire/journal，也不另立第二持久开关。
 */
export type PackageAvailability = 'loadable' | 'catalog-only';

export interface PackageCatalogEntry {
  packageId: string;
  /** 用户可见名（ADR-015 决定三「加载 X 包」的 X）。 */
  displayName: string;
  /** 取自准入 manifest 的版本（不是第二真源）。 */
  version: string;
  /** 宿主发行成熟度（见 {@link PackageAvailability}）。 */
  availability: PackageAvailability;
}

/** 宿主呈现表（准入包 id → 用户可见名 + 发行成熟度）。加包须过评审，缺条目即装配失败。 */
const PACKAGE_PRESENTATION: Readonly<Record<string, { displayName: string; availability: PackageAvailability }>> = {
  legal: { displayName: '法律包', availability: 'loadable' },
  // PM descriptor 明写 `scenarios: []`、`promptSegments: []`——只上架 schema/catalog。
  pm: { displayName: '产品管理包', availability: 'catalog-only' },
};

export function describePackage(manifest: { identity: { packageId: string; version: string } }): PackageCatalogEntry {
  const presentation = PACKAGE_PRESENTATION[manifest.identity.packageId];
  if (presentation === undefined) {
    throw new Error(`no host display name for admitted package: ${manifest.identity.packageId}`);
  }
  return {
    packageId: manifest.identity.packageId,
    displayName: presentation.displayName,
    version: manifest.identity.version,
    availability: presentation.availability,
  };
}

/** 可交互加载子集（建案处与 matter 设置处的选择面只可取这一枚）。 */
export function loadablePackages(catalog: readonly PackageCatalogEntry[]): readonly PackageCatalogEntry[] {
  return catalog.filter((entry) => entry.availability === 'loadable');
}
