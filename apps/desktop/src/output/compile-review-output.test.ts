import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/legal';
import { preflightDocx } from '@courtwork/reading-view/docx-security';
import { compileConfirmedReviewToDocx } from './compile-review-output';

const decode = new TextDecoder();

const RISK_LIST: RiskList = {
  caseId: 'case-demo',
  outOfCoverage: [],
  risks: [
    {
      id: 'risk-confirmed',
      description: '验收标准需要补强',
      level: 'high',
      dispositionStatus: 'pending',
      basis: [{
        citation: '《民法典》第六百二十一条',
        sourceAnchors: [{ fileId: 'contract.md', quote: '验收标准以卖方提供的技术参数为准', textRange: { start: 0, end: 17 } }],
      }],
    },
    {
      id: 'risk-rejected',
      description: '不应进入产物',
      level: 'low',
      dispositionStatus: 'pending',
      basis: [{
        citation: '《民法典》第五百九十条',
        sourceAnchors: [{ fileId: 'contract.md', quote: '不可抗力', textRange: { start: 0, end: 4 } }],
      }],
    },
  ],
};

describe('compileConfirmedReviewToDocx', () => {
  it('复用 LEGAL-DEMO-RUN 同链，把确认项写成 tracked/comment 产物并排除驳回项', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: RISK_LIST,
      dispositions: { 'risk-confirmed': 'confirmed', 'risk-rejected': 'rejected' },
      sourceMarkdown: '# 设备采购合同\n\n第四条 验收标准以卖方提供的技术参数为准。\n\n第八条 不可抗力。',
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-13T00:00:00.000Z'),
    });

    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]).toMatchObject({ id: 'instr-risk-confirmed', status: 'applied' });
    const files = preflightDocx(result.docx).files;
    expect(decode.decode(files['word/comments.xml'])).toContain('验收标准需要补强');
    expect(decode.decode(files['word/comments.xml'])).not.toContain('不应进入产物');
  });
});
