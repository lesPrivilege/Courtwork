import { describe, it, expect } from 'vitest';
import { factConsistency } from './fact-consistency.js';

const expectedAnswer = {
  facts: {
    caseNumber: '(2025)云章03民初472号',
    contractNumber: 'LJJZ-CY-2024-0817',
    totalAmount: '3,800,000',
  },
};

describe('factConsistency', () => {
  it('passes when every checked fact appears verbatim in the candidate output', () => {
    const candidate = {
      text: '本案案号为(2025)云章03民初472号，标的合同编号LJJZ-CY-2024-0817，总价3,800,000元。',
    };

    const result = factConsistency(candidate, expectedAnswer, ['caseNumber', 'contractNumber']);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('flags a checkField whose expected fact does not appear in the candidate output', () => {
    const candidate = { text: '本案案号为(2025)云章03民初472号。' };

    const result = factConsistency(candidate, expectedAnswer, ['caseNumber', 'totalAmount']);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.reason).toMatch(/totalAmount/);
  });

  it('fails cleanly when the expected answer has no facts companion object', () => {
    const result = factConsistency({ text: 'x' }, { risks: [] }, ['caseNumber']);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toMatch(/facts/);
  });

  it('flags a checkField that the dataset itself never defined a fact for', () => {
    const result = factConsistency({ text: 'x' }, expectedAnswer, ['notARealFact']);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/notARealFact/);
  });
});
