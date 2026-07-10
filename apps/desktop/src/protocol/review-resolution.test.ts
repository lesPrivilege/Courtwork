import { describe, expect, it } from 'vitest';
import { buildReviewResolution } from './review-resolution';

describe('确认门禁逐条处置', () => {
  it('保留每个条目的确认、驳回与修正结果，不合并为统一 confirm', () => {
    const response = buildReviewResolution(
      [
        { itemRef: 'risk-01', mode: 'individual', evidenceKeys: ['contract'] },
        { itemRef: 'risk-02', mode: 'batch', evidenceKeys: ['contract'] },
        { itemRef: 'risk-03', mode: 'individual', evidenceKeys: ['open-reference'] },
      ],
      { 'risk-01': 'rejected', 'risk-02': 'confirmed', 'risk-03': 'revision' },
      { dwellMs: 4200, expandedEvidenceKeys: ['contract', 'open-reference'] },
    );

    expect(response.items).toEqual([
      { itemRef: 'risk-01', disposition: 'reject' },
      { itemRef: 'risk-02', disposition: 'confirm' },
      { itemRef: 'risk-03', disposition: 'revise' },
    ]);
    expect(response.instrumentation).toEqual({ dwellMs: 4200, expandedEvidenceKeys: ['contract', 'open-reference'] });
  });

  it('未处置完整时拒绝生成响应', () => {
    expect(() => buildReviewResolution(
      [{ itemRef: 'risk-01', mode: 'individual', evidenceKeys: [] }],
      {},
    )).toThrow('风险条目 risk-01 尚未处置');
  });
});
