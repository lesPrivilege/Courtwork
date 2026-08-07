import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from './package-runtime.js';
import { resolveMatterRegistries } from './matter-registries.js';

/**
 * 逐 matter registry 的显式态解析（PACK-INTERACT-1 ③）。
 *
 * 既有 `registriesFor` 对「绑定到本制品未准入的包」throw（fail-closed，契约不动）；
 * 本函数把该 throw 收进显式态——生效 registry 落**零垂类**（不静默取全局集、不渲染半张垂类面），
 * 并交出 `bindingErrorId` 供壳渲染「发生了什么＋下一步」。
 */
describe('resolveMatterRegistries', () => {
  const runtime = createDesktopPackageRuntime();

  it('已声明合法绑定 → 成功 registry（只见绑定包，不见其余）', () => {
    const res = resolveMatterRegistries(
      { packBinding: ['legal'] },
      runtime.packageIds,
      runtime.registriesFor,
      runtime.packageRegistries,
    );
    expect(res.bindingErrorId).toBeUndefined();
    const packageIds = [...new Set(res.registries.artifactSchemas.list().map((entry) => entry.packageId))];
    expect(packageIds).toEqual(['legal']);
  });

  it('显式零绑定 → 零垂类 registry', () => {
    const res = resolveMatterRegistries(
      { packBinding: [] },
      runtime.packageIds,
      runtime.registriesFor,
      runtime.packageRegistries,
    );
    expect(res.bindingErrorId).toBeUndefined();
    expect(res.registries.artifactSchemas.list()).toEqual([]);
  });

  it('未声明（字段缺席）→ 全局可用集（既有 matter 的诚实读法）', () => {
    const res = resolveMatterRegistries(
      {} as { packBinding?: readonly string[] },
      runtime.packageIds,
      runtime.registriesFor,
      runtime.packageRegistries,
    );
    expect(res.bindingErrorId).toBeUndefined();
    const packageIds = [...new Set(res.registries.artifactSchemas.list().map((entry) => entry.packageId))].sort();
    expect(packageIds).toEqual(['legal', 'pm']);
  });

  it('无选中 matter → 全局可用集', () => {
    const res = resolveMatterRegistries(undefined, runtime.packageIds, runtime.registriesFor, runtime.packageRegistries);
    expect(res.bindingErrorId).toBeUndefined();
    expect(res.registries).toBe(runtime.packageRegistries);
  });

  it('绑定非准入包 → 显式失效 id + 零垂类 registry（fail-closed，不静默取全局集）', () => {
    const res = resolveMatterRegistries(
      { packBinding: ['tender'] },
      runtime.packageIds,
      runtime.registriesFor,
      runtime.packageRegistries,
    );
    expect(res.bindingErrorId).toBe('tender');
    expect(res.registries.artifactSchemas.list()).toEqual([]);
  });
});
