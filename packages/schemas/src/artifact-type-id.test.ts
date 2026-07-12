import { describe, expect, it } from 'vitest';
import {
  ArtifactTypeIdSchema,
  parseArtifactTypeId,
  normalizeArtifactTypeId,
} from './artifact-type-id.js';

describe('ArtifactTypeIdSchema（namespaced 迁移，ABI 拍板①）', () => {
  it('接受 namespace.TypeName 形制', () => {
    expect(ArtifactTypeIdSchema.safeParse('legal.RiskList').success).toBe(true);
    expect(ArtifactTypeIdSchema.safeParse('pm.PrdReview').success).toBe(true);
    expect(ArtifactTypeIdSchema.safeParse('tender-response.CheckMatrix').success).toBe(true);
  });

  it('拒绝裸类型名（防旧形制回流）', () => {
    expect(ArtifactTypeIdSchema.safeParse('RiskList').success).toBe(false);
  });

  it('拒绝命名空间大写/类型名小写/空段/多点', () => {
    expect(ArtifactTypeIdSchema.safeParse('Legal.RiskList').success).toBe(false);
    expect(ArtifactTypeIdSchema.safeParse('legal.riskList').success).toBe(false);
    expect(ArtifactTypeIdSchema.safeParse('legal.').success).toBe(false);
    expect(ArtifactTypeIdSchema.safeParse('.RiskList').success).toBe(false);
    expect(ArtifactTypeIdSchema.safeParse('a.b.C').success).toBe(false);
  });

  it('parseArtifactTypeId 拆出 namespace 与 name', () => {
    expect(parseArtifactTypeId('legal.RiskList')).toEqual({ namespace: 'legal', name: 'RiskList' });
  });
});

describe('normalizeArtifactTypeId（账本读侧映射：旧名→namespaced，历史不改写）', () => {
  const aliases = { RiskList: 'legal.RiskList', CaseFile: 'legal.CaseFile' } as const;

  it('已 namespaced 的值原样通过', () => {
    expect(normalizeArtifactTypeId('legal.RiskList', aliases)).toBe('legal.RiskList');
  });

  it('登记过的旧名映射为 namespaced', () => {
    expect(normalizeArtifactTypeId('RiskList', aliases)).toBe('legal.RiskList');
  });

  it('未登记的旧名返回 undefined（拒收，不猜）', () => {
    expect(normalizeArtifactTypeId('Timeline', aliases)).toBeUndefined();
    expect(normalizeArtifactTypeId('', aliases)).toBeUndefined();
  });
});
