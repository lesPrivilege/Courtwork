import { describe, expect, it } from 'vitest';
import { PackageIdentitySchema } from './package-identity.js';

describe('PackageIdentity（ABI 拍板：packageId+version+schemaVersion+迁移协议）', () => {
  const valid = {
    packageId: 'legal',
    version: '0.1.0',
    schemaVersion: 1,
    legacyTypeAliases: { RiskList: 'legal.RiskList' },
  };

  it('合法身份通过', () => {
    expect(PackageIdentitySchema.safeParse(valid).success).toBe(true);
  });

  it('packageId 必须是小写命名空间形制', () => {
    expect(PackageIdentitySchema.safeParse({ ...valid, packageId: 'Legal' }).success).toBe(false);
    expect(PackageIdentitySchema.safeParse({ ...valid, packageId: 'legal.pkg' }).success).toBe(false);
  });

  it('version 必须是 semver', () => {
    expect(PackageIdentitySchema.safeParse({ ...valid, version: 'v1' }).success).toBe(false);
  });

  it('schemaVersion 必须是正整数', () => {
    expect(PackageIdentitySchema.safeParse({ ...valid, schemaVersion: 0 }).success).toBe(false);
  });

  it('迁移别名的目标必须是 namespaced id（读侧映射，禁改写历史）', () => {
    expect(
      PackageIdentitySchema.safeParse({ ...valid, legacyTypeAliases: { RiskList: 'RiskList' } }).success,
    ).toBe(false);
  });

  it('legacyTypeAliases 缺省合法（新包无历史）', () => {
    const { legacyTypeAliases: _omit, ...rest } = valid;
    expect(PackageIdentitySchema.safeParse(rest).success).toBe(true);
  });
});
