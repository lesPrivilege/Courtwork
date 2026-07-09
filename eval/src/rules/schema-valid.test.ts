import { describe, it, expect } from 'vitest';
import { schemaValid } from './schema-valid.js';

describe('schemaValid', () => {
  it('passes when candidate output matches the named schema', () => {
    const candidate = {
      caseId: 'case-linjiang-qiyun-2025',
      risks: [
        {
          id: 'risk-01',
          description: '违约金约定畸高',
          level: 'high',
          basis: [
            {
              citation: '《中华人民共和国民法典》第五百八十五条',
              sourceAnchors: [
                { fileId: '04-设备采购合同.md', textRange: { start: 0, end: 36 } },
              ],
            },
          ],
          dispositionStatus: 'pending',
        },
      ],
    };

    const result = schemaValid(candidate, 'RiskList');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('fails when candidate output does not match the named schema', () => {
    const result = schemaValid({ caseId: 'x' }, 'RiskList');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toMatch(/RiskList/);
  });

  it('fails gracefully for an unknown schema name', () => {
    const result = schemaValid({}, 'NotARealSchema');

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/NotARealSchema/);
  });

  it('validates against RevisionInstructionSet too', () => {
    const candidate = {
      id: 'rev-01',
      caseId: 'case-linjiang-qiyun-2025',
      targetDocument: { fileId: '01-起诉状-draft.md' },
      instructions: [
        {
          id: 'ins-01',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '违约金' },
          annotation: { text: '建议核实违约金比例是否畸高', citations: [] },
        },
      ],
    };

    const result = schemaValid(candidate, 'RevisionInstructionSet');

    expect(result.pass).toBe(true);
  });
});
