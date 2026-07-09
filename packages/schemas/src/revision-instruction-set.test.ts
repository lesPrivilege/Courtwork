import { describe, expect, it } from 'vitest';
import { RevisionInstructionSetSchema } from './revision-instruction-set.js';

describe('RevisionInstructionSetSchema', () => {
  it('accepts a replace instruction with a citation grounded in case evidence', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-001',
      caseId: 'case-001',
      targetDocument: { fileId: 'file-001' },
      instructions: [
        {
          id: 'ins-01',
          kind: 'replace',
          locator: { strategy: 'text', quote: '百分之十的违约金', paragraphHint: '第六条 违约责任' },
          text: '百分之十五的违约金',
          annotation: {
            text: '违约金比例建议上调，与本所同类合同模板对齐。',
            citations: [
              {
                citation: '《民法典》第五百八十五条',
                sourceAnchors: [{ fileId: 'file-002', page: 3, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
              },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an insert instruction with a citation grounded only in a structured statuteRef (no sourceAnchors)', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-002',
      caseId: 'case-002',
      targetDocument: { fileId: 'file-003' },
      instructions: [
        {
          id: 'ins-02',
          kind: 'insert',
          locator: { strategy: 'text', quote: '提交甲方所在地人民法院诉讼解决。' },
          text: '第七条之一 保密条款\n双方对本合同履行过程中知悉的对方商业秘密负有保密义务。',
          annotation: {
            text: '补充保密条款，原合同缺失该项约定。',
            citations: [
              {
                citation: '《反不正当竞争法》第九条',
                sourceAnchors: [],
                statuteRef: { law: '中华人民共和国反不正当竞争法', article: '第九条' },
              },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a delete instruction on a table row with no annotation', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-003',
      caseId: 'case-003',
      targetDocument: { fileId: 'file-004' },
      instructions: [
        {
          id: 'ins-03',
          kind: 'delete',
          locator: { strategy: 'tableRow', rowContains: '第三期' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a commentOnly instruction on a table cell', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-004',
      caseId: 'case-004',
      targetDocument: { fileId: 'file-005' },
      instructions: [
        {
          id: 'ins-04',
          kind: 'commentOnly',
          locator: { strategy: 'tableCell', rowContains: '第一期', columnHeader: '支付比例', quote: '30%' },
          annotation: { text: '请核实该比例是否与主合同一致。', citations: [] },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a replace instruction missing the required text field', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-005',
      caseId: 'case-005',
      targetDocument: { fileId: 'file-006' },
      instructions: [
        {
          id: 'ins-05',
          kind: 'replace',
          locator: { strategy: 'text', quote: '违约金' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a commentOnly instruction missing annotation', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-006',
      caseId: 'case-006',
      targetDocument: { fileId: 'file-007' },
      instructions: [
        {
          id: 'ins-06',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '质保期' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid kind literal', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-007',
      caseId: 'case-007',
      targetDocument: { fileId: 'file-008' },
      instructions: [
        {
          id: 'ins-07',
          kind: 'reformat',
          locator: { strategy: 'text', quote: '违约金' },
          text: '新文本',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid locator strategy literal', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-008',
      caseId: 'case-008',
      targetDocument: { fileId: 'file-009' },
      instructions: [
        {
          id: 'ins-08',
          kind: 'delete',
          locator: { strategy: 'paragraphIndex', index: 3 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty instructions array', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-009',
      caseId: 'case-009',
      targetDocument: { fileId: 'file-010' },
      instructions: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a citation with neither sourceAnchors nor statuteRef (unverifiable prose-only reference)', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-011',
      caseId: 'case-011',
      targetDocument: { fileId: 'file-012' },
      instructions: [
        {
          id: 'ins-11',
          kind: 'replace',
          locator: { strategy: 'text', quote: '质保期为交付之日起壹年' },
          text: '质保期为交付之日起贰年',
          annotation: {
            text: '质保期建议延长至两年。',
            citations: [{ citation: '《产品质量法》第四十条', sourceAnchors: [] }],
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a citation with both sourceAnchors and statuteRef present', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-012',
      caseId: 'case-012',
      targetDocument: { fileId: 'file-013' },
      instructions: [
        {
          id: 'ins-12',
          kind: 'replace',
          locator: { strategy: 'text', quote: '质保期为交付之日起壹年' },
          text: '质保期为交付之日起贰年',
          annotation: {
            text: '质保期建议延长至两年，且与卷内同类合同条款一致。',
            citations: [
              {
                citation: '《产品质量法》第四十条',
                sourceAnchors: [{ fileId: 'file-014', page: 1, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
                statuteRef: { law: '中华人民共和国产品质量法', article: '第四十条', effectiveVersion: '2018' },
              },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a citation missing the citation text field', () => {
    const result = RevisionInstructionSetSchema.safeParse({
      id: 'ris-010',
      caseId: 'case-010',
      targetDocument: { fileId: 'file-011' },
      instructions: [
        {
          id: 'ins-10',
          kind: 'replace',
          locator: { strategy: 'text', quote: '甲方' },
          text: '甲方（股份有限公司）',
          annotation: {
            text: '更正甲方全称。',
            citations: [{ sourceAnchors: [] }],
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
