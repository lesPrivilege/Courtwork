import { describe, expect, it } from 'vitest';
import { buildReviewResolution } from './review-resolution';

describe('确认门禁逐条处置', () => {
  it('保留每个条目的确认、驳回与修正结果；修正携带 trim 后的新结论', () => {
    const response = buildReviewResolution(
      [
        { itemRef: 'risk-01', mode: 'individual', evidenceKeys: ['contract'] },
        { itemRef: 'risk-02', mode: 'batch', evidenceKeys: ['contract'] },
        { itemRef: 'risk-03', mode: 'individual', evidenceKeys: ['open-reference'] },
      ],
      { 'risk-01': 'rejected', 'risk-02': 'confirmed', 'risk-03': 'revision' },
      {
        originalDescriptions: { 'risk-03': '原风险结论' },
        correctedDescriptions: { 'risk-03': '  修正后的风险结论  ' },
        instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['contract', 'open-reference'] },
      },
    );

    expect(response.items).toEqual([
      { itemRef: 'risk-01', disposition: 'reject' },
      { itemRef: 'risk-02', disposition: 'confirm' },
      { itemRef: 'risk-03', disposition: 'revise', correctedDescription: '修正后的风险结论' },
    ]);
    expect(response.instrumentation).toEqual({ dwellMs: 4200, expandedEvidenceKeys: ['contract', 'open-reference'] });
  });

  it('未处置完整时拒绝生成响应', () => {
    expect(() => buildReviewResolution(
      [{ itemRef: 'risk-01', mode: 'individual', evidenceKeys: [] }],
      {},
    )).toThrow('风险条目 risk-01 尚未处置');
  });

  it('修正仍在编辑或已取消（没有已提交的新结论）时拒绝生成响应', () => {
    expect(() => buildReviewResolution(
      [{ itemRef: 'risk-01', mode: 'individual', evidenceKeys: [] }],
      { 'risk-01': 'revision' },
      { originalDescriptions: { 'risk-01': '原风险结论' }, correctedDescriptions: {} },
    )).toThrow('风险条目 risk-01 的修正尚未提交');
  });

  it('空白修正不得成为终态处置', () => {
    expect(() => buildReviewResolution(
      [{ itemRef: 'risk-01', mode: 'individual', evidenceKeys: [] }],
      { 'risk-01': 'revision' },
      {
        originalDescriptions: { 'risk-01': '原风险结论' },
        correctedDescriptions: { 'risk-01': '   ' },
      },
    )).toThrow('风险条目 risk-01 的修正结论不能为空');
  });

  it('trim 后与原结论相同的修正不得成为终态处置', () => {
    expect(() => buildReviewResolution(
      [{ itemRef: 'risk-01', mode: 'individual', evidenceKeys: [] }],
      { 'risk-01': 'revision' },
      {
        originalDescriptions: { 'risk-01': '原风险结论' },
        correctedDescriptions: { 'risk-01': '  原风险结论  ' },
      },
    )).toThrow('风险条目 risk-01 的修正结论必须不同于原结论');
  });
});
