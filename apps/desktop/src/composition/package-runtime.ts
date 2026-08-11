import { GENERIC_PACKAGE } from '@courtwork/generic/package';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { PM_PACKAGE } from '@courtwork/pm/package';
import {
  admitPackages,
  buildPackageRegistries,
  type PackageRegistries,
  type VerticalPackageManifest,
} from '@courtwork/registry';
import { createCourtworkHostRendererRegistry } from '../preview/courtwork-host-renderers.js';
import type { HostRendererRegistry } from '../preview/HostRendererRegistry.js';
import { describePackage, isBaselinePackage, type PackageCatalogEntry } from './package-catalog.js';

export interface DesktopPackageRuntime {
  /** 全局可用集：随制品分发并通过准入的包（ADR-015 决定三「全局 registry 只决定可用集」）。 */
  packageIds: string[];
  /** 全局可用集的宿主呈现目录（PACK-INTERACT-1 ①：加载 UX 取词面，只供文案，不参与机制）。 */
  packageCatalog: readonly PackageCatalogEntry[];
  packageRegistries: PackageRegistries;
  /** 已准入包的身份表（packageId → version/schemaVersion）：账本头与 ArtifactEnvelope 版本源的唯一取处。 */
  packageIdentities: Readonly<Record<string, { version: string; schemaVersion: number }>>;
  hostRenderers: HostRendererRegistry;
  /**
   * 逐 matter 取生效 registry。`packageIds` 是该 matter 的**垂类**绑定（零或一枚）。
   *
   * 返回语义是**基线 registry 与该绑定所解析 registry 的并集**（ADR-023 决定三）：基线包恒在，
   * 与绑定态无关；零绑定 matter 的生效 registry 即基线 registry 本身。垂类侧 fail-closed 判据
   * 一字不动——并集只加基线，绝不把别的垂类包一并放进来。
   *
   * 绑定里出现不在可用集内的 id 一律**拒载**（不静默忽略）：那意味着这枚 matter 绑的是本制品
   * 没有的包，静默降级成「加载了别的」正是 ADR-015 决定四禁止的伪装。消费侧把该 throw 收进
   * 显式态（`resolveMatterRegistries`，PACK-INTERACT-1 ③）。
   */
  registriesFor(packageIds: readonly string[]): PackageRegistries;
  describePackage(packageId: string): PackageCatalogEntry | undefined;
}

export function createDesktopPackageRuntime(): DesktopPackageRuntime {
  const admission = admitPackages([LEGAL_PACKAGE, PM_PACKAGE, GENERIC_PACKAGE]);
  if (admission.rejected.length > 0) {
    const details = admission.rejected
      .map((item) => `${item.packageId}: ${item.issues.join('; ')}`)
      .join(' | ');
    throw new Error(`desktop package admission failed: ${details}`);
  }
  const byId = new Map<string, VerticalPackageManifest>(
    admission.admitted.map((manifest) => [manifest.identity.packageId, manifest]),
  );
  // 逐 matter 的 registry 按绑定现算；同一绑定复用同一枚，避免每次渲染重建投影表。
  const cache = new Map<string, PackageRegistries>();
  const packageCatalog = admission.admitted.map(describePackage);
  /**
   * 基线底座（ADR-023 决定三）：恒进每一枚生效 registry。次序上排在垂类**之后**——
   * 场景条按注册表序渲染，垂类是这枚 matter 被显式加载的能力，理应排在通用能力前面。
   */
  const baseline = admission.admitted.filter((manifest) => isBaselinePackage(manifest.identity.packageId));
  return {
    packageIds: [...byId.keys()],
    packageCatalog,
    packageRegistries: buildPackageRegistries(admission.admitted),
    packageIdentities: Object.fromEntries(
      admission.admitted.map((manifest) => [
        manifest.identity.packageId,
        { version: manifest.identity.version, schemaVersion: manifest.identity.schemaVersion },
      ]),
    ),
    hostRenderers: createCourtworkHostRendererRegistry(),
    registriesFor: (packageIds) => {
      const key = [...packageIds].join(' ');
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const manifests = packageIds.map((packageId) => {
        const manifest = byId.get(packageId);
        if (manifest === undefined) {
          throw new Error(`matter is bound to a package that is not admitted in this build: ${packageId}`);
        }
        return manifest;
      });
      // 并集（ADR-023 决定三）：拒载判据先跑完，基线才并进来——失效绑定仍在基线之前 throw。
      // 去重按 packageId：显式把基线写进 packBinding 也只得一份（同 id 拒载是准入机器的既有律）。
      const bound = new Set(manifests.map((manifest) => manifest.identity.packageId));
      const registries = buildPackageRegistries([
        ...manifests,
        ...baseline.filter((manifest) => !bound.has(manifest.identity.packageId)),
      ]);
      cache.set(key, registries);
      return registries;
    },
    describePackage: (packageId) => packageCatalog.find((entry) => entry.packageId === packageId),
  };
}

/**
 * matter 的生效绑定（ADR-015 决定三）。
 *
 * 三态输入、二态输出——**未声明**（字段缺席）取全局可用集，**已声明**逐字取该绑定。
 * 「未声明取全部」不是「默认加载全部」的产品裁定，只是本字段落地前既有 matter 的诚实读法；
 * 新建 matter 默认零绑定（`[]`）由加载 UX 拍板（PACK-INTERACT-1 ⑤，ADR-015 决定三销条）。
 */
export function resolveMatterPackBinding(
  packBinding: readonly string[] | undefined,
  availablePackageIds: readonly string[],
): { status: 'undeclared' | 'declared'; packageIds: readonly string[] } {
  if (packBinding === undefined) return { status: 'undeclared', packageIds: availablePackageIds };
  return { status: 'declared', packageIds: packBinding };
}
