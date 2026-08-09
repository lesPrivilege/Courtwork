import { describe, expect, it } from 'vitest';
import { ReviewMatrixDraftSchema, ReviewMatrixSchema } from './review-matrix.js';

describe('ReviewMatrixSchema', () => {
  it('accepts a matrix with questions and no rows yet', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-001',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a row with an answered cell backed by sourceAnchors', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-002',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-001',
          answers: {
            q1: {
              answer: '人民币100万元',
              sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.3, height: 0.05 } }],
              confidence: 'high',
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a cell with empty sourceAnchors for a "not mentioned" answer', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-003',
      questions: [{ id: 'q2', text: '是否约定违约金？' }],
      rows: [
        {
          documentId: 'doc-002',
          answers: {
            q2: { answer: '该文档未提及此问题', sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a matrix with zero questions', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-004',
      questions: [],
      rows: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a cell with an invalid confidence value', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-005',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-003',
          answers: {
            q1: { answer: '人民币100万元', sourceAnchors: [], confidence: 'certain' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a cell missing answer', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-006',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-004',
          answers: {
            q1: { sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a row missing documentId', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-007',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          answers: {
            q1: { answer: '人民币100万元', sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

/** LEGAL-ANCHOR-BINDING-1：模型侧只出引语，坐标字段结构性不存在。 */
describe('ReviewMatrixDraftSchema（模型侧草稿）', () => {
  const questions = [{ id: 'q1', text: '合同金额是多少？' }];
  const draftRow = (cell: Record<string, unknown>) => ({ documentId: 'doc-001', answers: { q1: cell } });

  it('接受携逐字引语的格', () => {
    const result = ReviewMatrixDraftSchema.safeParse({
      caseId: 'case-101',
      questions,
      rows: [draftRow({
        answer: '人民币100万元',
        quoteClaims: [{ fileId: 'file-001', exactQuote: '合同总价为人民币100万元' }],
        confidence: 'high',
      })],
    });
    expect(result.success).toBe(true);
  });

  it('接受零引语的格：「该文档未提及此问题」是合法答案（与最终形一致地不强制 min(1)）', () => {
    const result = ReviewMatrixDraftSchema.safeParse({
      caseId: 'case-102',
      questions,
      rows: [draftRow({ answer: '该文档未提及此问题', quoteClaims: [], confidence: 'low' })],
    });
    expect(result.success).toBe(true);
  });

  it('引语内不得携坐标：QuoteClaim 是 strict 形状，textLayerVersion 直接拒收', () => {
    const result = ReviewMatrixDraftSchema.safeParse({
      caseId: 'case-103',
      questions,
      rows: [draftRow({
        answer: 'x',
        quoteClaims: [{ fileId: 'f', exactQuote: '合同', textLayerVersion: 'v1' }],
        confidence: 'medium',
      })],
    });
    expect(result.success).toBe(false);
  });

  it('模型自报的 sourceAnchors 不进草稿形（伪坐标到不了 resolver）', () => {
    const result = ReviewMatrixDraftSchema.safeParse({
      caseId: 'case-104',
      questions,
      rows: [draftRow({
        answer: 'x',
        quoteClaims: [],
        confidence: 'low',
        sourceAnchors: [{ fileId: 'f', textRange: { start: 0, end: 1 } }],
      })],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rows[0]?.answers.q1).not.toHaveProperty('sourceAnchors');
  });
});

describe('ReviewMatrixSchema 缺口表', () => {
  it('outOfCoverage 缺省为空表', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-105',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outOfCoverage).toEqual([]);
  });
});
