/**
 * 宿主包目录（PACK-INTERACT-1 ①）：加载 UX 的「全局可用集呈现」取词面。
 *
 * 呈现事实住受信组合根——Package ABI 无 displayName（改 ABI 属契约拍板，本票无权），
 * 按 GENERIC-PACK-1 ③ 先例「label 立在宿主侧而非 Package ABI：标题是宿主呈现事实」落地。
 * 本目录**不参与**准入/绑定解析/任何机制：机制真源仍是 `packageId`，目录只供用户文案取词，
 * 不是第二真源。准入包缺宿主呈现名即装配显式失败——静默回落到 packageId 字面量就是把
 * 装配缺陷藏进用户文案（核心不变量四）。
 */

export interface PackageCatalogEntry {
  packageId: string;
  /** 用户可见名（ADR-015 决定三「加载 X 包」的 X）。 */
  displayName: string;
  /** 取自准入 manifest 的版本（不是第二真源）。 */
  version: string;
}

/** 宿主呈现名表（准入包 id → 用户可见名）。加包须过评审，缺名即装配失败。 */
const PACKAGE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  legal: '法律包',
  pm: '产品管理包',
};

export function describePackage(manifest: { identity: { packageId: string; version: string } }): PackageCatalogEntry {
  const displayName = PACKAGE_DISPLAY_NAMES[manifest.identity.packageId];
  if (displayName === undefined) {
    throw new Error(`no host display name for admitted package: ${manifest.identity.packageId}`);
  }
  return {
    packageId: manifest.identity.packageId,
    displayName,
    version: manifest.identity.version,
  };
}
