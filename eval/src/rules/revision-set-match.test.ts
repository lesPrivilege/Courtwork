import { describe, it, expect } from 'vitest';
import { revisionSetMatch } from './revision-set-match.js';

const sourceDocumentText = '乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。争议提交甲方所在地有管辖权的人民法院管辖。';

describe('revisionSetMatch', () => {
  it('passes when every text/tableCell locator quote is found verbatim in the source document', () => {
    const candidate = {
      id: 'rev-01',
      caseId: 'case-linjiang-qiyun-2025',
      targetDocument: { fileId: '01-起诉状-draft.md' },
      instructions: [
        {
          id: 'ins-01',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '每逾期一日应按未付金额的1%' },
          annotation: { text: '建议核实该违约金比例', citations: [] },
        },
      ],
    };

    const result = revisionSetMatch(candidate, sourceDocumentText);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('flags an instruction whose locator quote is not found in the source document (hallucinated anchor)', () => {
    const candidate = {
      id: 'rev-01',
      caseId: 'case-linjiang-qiyun-2025',
      targetDocument: { fileId: '01-起诉状-draft.md' },
      instructions: [
        {
          id: 'ins-01',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '这句话不存在于源文档中' },
          annotation: { text: 'x', citations: [] },
        },
      ],
    };

    const result = revisionSetMatch(candidate, sourceDocumentText);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toMatch(/ins-01/);
  });

  it('fails cleanly when candidate output is not a valid RevisionInstructionSet', () => {
    const result = revisionSetMatch({ not: 'valid' }, sourceDocumentText);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('does not require a quote check for tableRow-strategy locators', () => {
    const candidate = {
      id: 'rev-01',
      caseId: 'case-linjiang-qiyun-2025',
      targetDocument: { fileId: '01-起诉状-draft.md' },
      instructions: [
        {
          id: 'ins-01',
          kind: 'commentOnly',
          locator: { strategy: 'tableRow', rowContains: '这行内容源文档里没有，但 tableRow 不核验 quote' },
          annotation: { text: 'x', citations: [] },
        },
      ],
    };

    const result = revisionSetMatch(candidate, sourceDocumentText);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });
});
