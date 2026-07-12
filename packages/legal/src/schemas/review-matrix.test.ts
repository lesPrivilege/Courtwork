import { describe, expect, it } from 'vitest';
import { ReviewMatrixSchema } from './review-matrix.js';

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
