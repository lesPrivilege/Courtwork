import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  RehydrationProjectionSchema,
  projectArtifact,
  validateArtifactDescriptor,
  type ArtifactDescriptor,
  type RehydrationProjection,
} from './artifact-descriptor.js';

const SAMPLE_PROJECTION: RehydrationProjection = {
  ops: [
    { kind: 'field', path: '/caseId', label: '案件' },
    { kind: 'count', path: '/risks', label: '风险点' },
    { kind: 'count', path: '/risks', label: '已处置', where: { field: 'dispositionStatus', equals: 'confirmed' } },
    { kind: 'list', path: '/risks', itemField: 'description', label: '要点', limit: 2 },
  ],
  rowBudget: 6,
};

describe('RehydrationProjection（ABI 拍板②：投影归 descriptor，声明式闭词表）', () => {
  it('闭词表三种 op：field/count/list', () => {
    expect(RehydrationProjectionSchema.safeParse(SAMPLE_PROJECTION).success).toBe(true);
  });

  it('拒绝自由代码型 op（投影禁 LLM/禁函数，docs/58 七节）', () => {
    expect(
      RehydrationProjectionSchema.safeParse({
        ops: [{ kind: 'custom', render: 'x => x' }],
        rowBudget: 3,
      }).success,
    ).toBe(false);
  });

  it('rowBudget 必须为正整数', () => {
    expect(RehydrationProjectionSchema.safeParse({ ops: [], rowBudget: 0 }).success).toBe(false);
  });
});

describe('projectArtifact（确定性投影执行器：同输入同字节）', () => {
  const artifact = {
    caseId: 'case-1',
    risks: [
      { description: '违约金畸高', dispositionStatus: 'confirmed' },
      { description: '管辖不利', dispositionStatus: 'pending' },
      { description: '质保期起算模糊', dispositionStatus: 'confirmed' },
    ],
  };

  it('按 op 序输出、byte-stable、行预算截断', () => {
    const a = projectArtifact(artifact, SAMPLE_PROJECTION);
    const b = projectArtifact(artifact, SAMPLE_PROJECTION);
    expect(a).toEqual(b);
    expect(a.join('\n')).toBe(
      ['案件: case-1', '风险点: 3', '已处置: 2', '要点: 违约金畸高；管辖不利'].join('\n'),
    );
    expect(a.length).toBeLessThanOrEqual(SAMPLE_PROJECTION.rowBudget);
  });

  it('行预算小于 op 数时按序截断（易变项排尾原则由声明者负责）', () => {
    const rows = projectArtifact(artifact, { ...SAMPLE_PROJECTION, rowBudget: 2 });
    expect(rows).toEqual(['案件: case-1', '风险点: 3']);
  });

  it('路径未命中时诚实落「未提供」而非编造', () => {
    const rows = projectArtifact({}, { ops: [{ kind: 'field', path: '/missing', label: '缺席' }], rowBudget: 2 });
    expect(rows).toEqual(['缺席: (未提供)']);
  });
});

describe('validateArtifactDescriptor（descriptor 载体自检）', () => {
  const base: ArtifactDescriptor = {
    typeId: 'legal.RiskList',
    title: '风险清单',
    schema: z.object({ caseId: z.string() }),
    rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '案件' }], rowBudget: 3 },
    uiTemplateId: 'risk-review-panel',
  };

  it('合法 descriptor 通过', () => {
    expect(validateArtifactDescriptor(base)).toEqual([]);
  });

  it('裸类型名 typeId 报错', () => {
    expect(validateArtifactDescriptor({ ...base, typeId: 'RiskList' })).not.toEqual([]);
  });

  it('citationBinding 要求 draftSchema 成对出现（有引语声明必有模型侧草稿形状）', () => {
    const issues = validateArtifactDescriptor({
      ...base,
      citationBinding: { draftField: 'quoteClaims', anchorField: 'sourceAnchors' },
    });
    expect(issues.some((i) => i.includes('draftSchema'))).toBe(true);
  });
});
