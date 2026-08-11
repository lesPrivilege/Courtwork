import { describe, expect, it } from 'vitest';
import { PM_PACKAGE_DESCRIPTOR } from '@courtwork/pm';
import { PrdReviewSchema } from '@courtwork/pm/schemas';
import { createDesktopPackageRuntime } from './package-runtime.js';

const packageIdsOf = (registries: { artifactSchemas: { list(): { packageId: string }[] } }) =>
  [...new Set(registries.artifactSchemas.list().map((entry) => entry.packageId))].sort();

describe('desktop package composition', () => {
  it('同次准入 Legal + catalog-only PM + baseline 基线包，PM 不注入 scenario 或 prompt/demo 入口', () => {
    const runtime = createDesktopPackageRuntime();
    expect(runtime.packageIds).toEqual(['legal', 'pm', 'generic']);
    expect(runtime.packageRegistries.artifactSchemas.list()).toHaveLength(13);
    expect(runtime.packageRegistries.artifactSchemas.get('pm.PrdReview')?.packageId).toBe('pm');
    expect(runtime.packageRegistries.scenarios.list().every((scenario) => scenario.packageId !== 'pm')).toBe(true);
    expect(runtime.packageRegistries.scenarios.list()).toHaveLength(7);
    expect(runtime.hostRenderers.get('courtwork.artifact-table.v1')).toBeDefined();
    expect(PM_PACKAGE_DESCRIPTOR.identity.packageId).toBe('pm');
    expect(typeof PrdReviewSchema.safeParse).toBe('function');
  });

  /**
   * ADR-023 决定三：`registriesForCase` 的返回语义＝**基线 registry 与该 matter 垂类绑定所解析
   * registry 的并集**；零绑定 matter 的生效 registry 即基线 registry 本身。
   *
   * 这一条正是成品律得以成立的机制：卸载态不再是「空 registry ＋ 零可启动场景」。
   */
  describe('registriesFor 并集语义（基线恒在）', () => {
    const runtime = createDesktopPackageRuntime();

    it('零绑定 matter → 生效 registry 即基线 registry（零垂类、非零场景）', () => {
      const registries = runtime.registriesFor([]);
      expect(packageIdsOf(registries)).toEqual(['generic']);
      expect(registries.scenarios.list().map((scenario) => scenario.id)).toEqual(['generic.draft', 'generic.batch']);
    });

    it('绑定 Legal → 基线 ∪ Legal（垂类加载是加法，基线是地）', () => {
      const registries = runtime.registriesFor(['legal']);
      expect(packageIdsOf(registries)).toEqual(['generic', 'legal']);
      expect(registries.scenarios.get('legal.S3')).toBeDefined();
      expect(registries.scenarios.get('generic.draft')).toBeDefined();
    });

    it('绑定 PM（catalog-only）→ 基线 ∪ PM；PM 零场景，基线场景照在', () => {
      const registries = runtime.registriesFor(['pm']);
      expect(packageIdsOf(registries)).toEqual(['generic', 'pm']);
      expect(registries.scenarios.list().map((scenario) => scenario.id)).toEqual(['generic.draft', 'generic.batch']);
    });

    /** 垂类 fail-closed 判据零削弱：并集只加基线，绝不把「别的垂类包」也一并放进来。 */
    it('绑定 PM 的 matter 仍拒 Legal 场景（他包绑定不因并集被放行）', () => {
      expect(runtime.registriesFor(['pm']).scenarios.get('legal.S3')).toBeUndefined();
      expect(runtime.registriesFor(['pm']).artifactSchemas.get('legal.RiskList')).toBeUndefined();
    });

    it('零绑定的 matter 仍拒一切垂类场景与产物', () => {
      const registries = runtime.registriesFor([]);
      expect(registries.scenarios.get('legal.S3')).toBeUndefined();
      expect(registries.artifactSchemas.get('legal.RiskList')).toBeUndefined();
      expect(registries.artifactSchemas.get('pm.PrdReview')).toBeUndefined();
    });

    it('绑定本制品未准入的包仍 throw（拒载契约一字不动，不因基线并集变成静默降级）', () => {
      expect(() => runtime.registriesFor(['tender'])).toThrow(/not admitted/);
    });

    it('基线包不占绑定席位：显式绑定它不是产品路径，但仍走同一拒载/准入判据', () => {
      // `packBinding` 自 ADR-023 起显式限定为**垂类**绑定；基线恒在，重复声明也只得一份。
      expect(packageIdsOf(runtime.registriesFor(['generic']))).toEqual(['generic']);
    });
  });
});
