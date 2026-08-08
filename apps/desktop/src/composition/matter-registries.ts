import type { PackageRegistries } from '@courtwork/registry';
import { resolveMatterPackBinding } from './package-runtime.js';

/** canonical case store 里与绑定解析相关的字段（读侧只取这两枚，不夹带案件内容）。 */
export interface MatterBindingRecord {
  id: string;
  packBinding?: readonly string[];
}

export interface MatterRegistriesResolution {
  registries: PackageRegistries;
  /** 绑定指向本制品未准入的包（ADR-015 fail-closed 显式态；见 GENERIC-PACK-1 ④ `registriesFor` throw 契约）。 */
  bindingErrorId?: string;
}

/**
 * 逐 matter registry 的显式态解析（PACK-INTERACT-1 ③）。
 *
 * 既有 `registriesFor` 对「绑定到本制品未准入的包」throw（fail-closed，契约一字不动）；
 * 本函数把该 throw 收进显式态：生效 registry 落**零垂类**（`registriesFor([])`——与显式零绑定
 * 同形，不静默取全局集、不渲染半张垂类面），并交出 `bindingErrorId` 供壳渲染「发生了什么＋
 * 下一步」。非法绑定由「陈旧持久数据」可达（旧构建绑了后续构建删掉的包），必须显式可恢复。
 */
export function resolveMatterRegistries(
  selected: { packBinding?: readonly string[] } | undefined,
  availablePackageIds: readonly string[],
  registriesFor: (packageIds: readonly string[]) => PackageRegistries,
  globalRegistries: PackageRegistries,
): MatterRegistriesResolution {
  if (selected === undefined) return { registries: globalRegistries };
  const resolved = resolveMatterPackBinding(selected.packBinding, availablePackageIds);
  try {
    return { registries: registriesFor(resolved.packageIds) };
  } catch {
    // 绑定指向本制品未准入的包：fail-closed 落零垂类 registry，显式失效交由调用方渲染。
    return { registries: registriesFor([]), bindingErrorId: resolved.packageIds[0] };
  }
}

/**
 * production execution seam 的 matter 授权解析器（ADR-015 决定三 2026-08-08 补记）。
 *
 * 每次调用都**现读** canonical case store：绑定是可变的，缓存一份就等于让执行授权停在
 * 卸载之前的世界。案件不在账本里（如 demo 恒挂案、已归档案）→ 零垂类 registry，
 * 与显式零绑定同形：fail-closed 而不是「找不到就放行」。
 */
export function createCaseRegistriesResolver(input: {
  readCases: () => readonly MatterBindingRecord[];
  availablePackageIds: readonly string[];
  registriesFor: (packageIds: readonly string[]) => PackageRegistries;
}): (caseId: string) => PackageRegistries {
  const empty = () => input.registriesFor([]);
  return (caseId) => {
    const record = input.readCases().find((item) => item.id === caseId);
    if (record === undefined) return empty();
    return resolveMatterRegistries(record, input.availablePackageIds, input.registriesFor, empty()).registries;
  };
}
