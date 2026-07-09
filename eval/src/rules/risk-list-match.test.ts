import { describe, it, expect } from 'vitest';
import { riskListMatch } from './risk-list-match.js';

const expected = {
  caseId: 'case-linjiang-qiyun-2025',
  risks: [
    {
      id: 'risk-01',
      description: '违约金约定畸高',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-02',
      description: '管辖条款单方倾斜',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百九十六条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
  ],
};

function candidateWithCitations(citations: string[]) {
  return {
    caseId: 'case-linjiang-qiyun-2025',
    risks: citations.map((citation, i) => ({
      id: `candidate-${i}`,
      description: '模型自述的风险描述',
      level: 'medium',
      basis: [{ citation, sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }] }],
      dispositionStatus: 'pending',
    })),
  };
}

describe('riskListMatch', () => {
  it('matches by citation overlap regardless of candidate risk ids, ignoring 《》and whitespace', () => {
    const candidate = candidateWithCitations([
      '中华人民共和国民法典 第五百八十五条',
      '《中华人民共和国民法典》第四百九十六条',
    ]);

    const result = riskListMatch(candidate, expected);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('reports partial score and names the missed risk id when only some risks are covered', () => {
    const candidate = candidateWithCitations(['《中华人民共和国民法典》第五百八十五条']);

    const result = riskListMatch(candidate, expected);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.reason).toMatch(/risk-02/);
  });

  it('scores 0 when the candidate output is not a valid RiskList', () => {
    const result = riskListMatch({ not: 'a risk list' }, expected);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('passes a true-negative case when the standard answer expects no risks and the candidate also finds none', () => {
    const noRiskExpected = { caseId: 'case-linjiang-qiyun-2025', risks: [] };
    const candidate = candidateWithCitations([]);

    const result = riskListMatch(candidate, noRiskExpected);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('flags a false positive when the standard answer expects no risks but the candidate invents one', () => {
    const noRiskExpected = { caseId: 'case-linjiang-qiyun-2025', risks: [] };
    const candidate = candidateWithCitations(['《中华人民共和国民法典》第五百八十五条']);

    const result = riskListMatch(candidate, noRiskExpected);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toMatch(/误报|虚构/);
  });
});
