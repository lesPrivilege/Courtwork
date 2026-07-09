import { describe, expect, it } from 'vitest';
import { RiskListSchema } from './risk-list.js';

describe('RiskListSchema', () => {
  it('accepts a risk list with no risks', () => {
    const result = RiskListSchema.safeParse({ caseId: 'case-001', risks: [] });
    expect(result.success).toBe(true);
  });

  it('accepts a high risk item pending confirmation', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-002',
      risks: [
        {
          id: 'risk-001',
          description: '合同条款存在重大违约风险',
          level: 'high',
          basis: [
            {
              citation: '《民法典》第577条',
              sourceAnchors: [{ fileId: 'file-001', page: 2, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
            },
          ],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a confirmed risk with multiple basis entries', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-003',
      risks: [
        {
          id: 'risk-002',
          description: '管辖条款可能无效',
          level: 'medium',
          basis: [
            { citation: '《民事诉讼法》第35条', sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 20 } }] },
            { citation: '（2023）某民终123号', sourceAnchors: [{ fileId: 'file-003', textRange: { start: 5, end: 30 } }] },
          ],
          dispositionStatus: 'confirmed',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid risk level', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-004',
      risks: [
        {
          id: 'risk-003',
          description: '非法等级',
          level: 'critical',
          basis: [{ citation: '某条款', sourceAnchors: [{ fileId: 'file-004', textRange: { start: 0, end: 5 } }] }],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a risk with an empty basis array', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-005',
      risks: [
        {
          id: 'risk-004',
          description: '无依据风险',
          level: 'low',
          basis: [],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid dispositionStatus', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-006',
      risks: [
        {
          id: 'risk-005',
          description: '非法处置状态',
          level: 'low',
          basis: [{ citation: '某条款', sourceAnchors: [{ fileId: 'file-005', textRange: { start: 0, end: 5 } }] }],
          dispositionStatus: 'ignored',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a basis entry with zero sourceAnchors', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-007',
      risks: [
        {
          id: 'risk-006',
          description: '依据无锚点',
          level: 'low',
          basis: [{ citation: '某条款', sourceAnchors: [] }],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
