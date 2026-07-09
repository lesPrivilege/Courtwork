import { describe, it, expect } from 'vitest';
import { runRules } from './run-rules.js';

function ctx(vars: Record<string, string>) {
  return { vars };
}

describe('runRules', () => {
  it('aggregates multiple rule-based scoring rules into one pass/score/reason', () => {
    const risk = {
      id: 'r',
      description: 'd',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    };
    const candidateOutput = { caseId: 'x', risks: [{ ...risk, id: 'candidate-id' }] };
    const expectedAnswer = { caseId: 'x', risks: [{ ...risk, id: 'risk-01' }] };
    const context = ctx({
      scoringRulesJson: JSON.stringify([
        { type: 'schemaValid', schemaName: 'RiskList' },
        { type: 'riskListMatch' },
        { type: 'citationExists' },
      ]),
      expectedAnswerJson: JSON.stringify(expectedAnswer),
      input: JSON.stringify({}),
    });

    const result = runRules(candidateOutput, context);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('ignores llmJudge rules (handled natively by promptfoo, not this dispatcher) and passes vacuously', () => {
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'llmJudge', judgePromptFile: 'x', weight: 1 }]),
      expectedAnswerJson: JSON.stringify({}),
      input: JSON.stringify({}),
    });

    const result = runRules({}, context);

    expect(result.pass).toBe(true);
    expect(result.reason).toMatch(/无规则评分项/);
  });

  it('fails and names the failing rule type when a rule-based check fails', () => {
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
      expectedAnswerJson: JSON.stringify({}),
      input: JSON.stringify({}),
    });

    const result = runRules({ not: 'valid' }, context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/schemaValid/);
  });

  it('dispatches factConsistency using checkFields from the rule config', () => {
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'factConsistency', checkFields: ['caseNumber'] }]),
      expectedAnswerJson: JSON.stringify({ facts: { caseNumber: '(2025)云章03民初472号' } }),
      input: JSON.stringify({}),
    });

    const result = runRules({ text: '案号(2025)云章03民初472号' }, context);

    expect(result.pass).toBe(true);
  });

  it('parses candidateOutput as JSON when promptfoo hands it over as a raw string (the real callApi shape)', () => {
    const risk = {
      id: 'r',
      description: 'd',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    };
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
      expectedAnswerJson: JSON.stringify({ caseId: 'x', risks: [risk] }),
      input: JSON.stringify({}),
    });
    const rawStringOutput = JSON.stringify({ caseId: 'x', risks: [risk] });

    const result = runRules(rawStringOutput, context);

    expect(result.pass).toBe(true);
  });

  it('fails with a clear reason (not a crash) when candidateOutput is a string that is not valid JSON', () => {
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
      expectedAnswerJson: JSON.stringify({}),
      input: JSON.stringify({}),
    });

    const result = runRules('not json at all {{{', context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });

  it('dispatches revisionSetMatch using sourceDocumentText carried in the case input', () => {
    const context = ctx({
      scoringRulesJson: JSON.stringify([{ type: 'revisionSetMatch' }]),
      expectedAnswerJson: JSON.stringify({}),
      input: JSON.stringify({ sourceDocumentText: '乙方逾期支付违约金1%' }),
    });
    const candidate = {
      id: 'r',
      caseId: 'c',
      targetDocument: { fileId: 'x' },
      instructions: [
        {
          id: 'i1',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '违约金1%' },
          annotation: { text: 'x', citations: [] },
        },
      ],
    };

    const result = runRules(candidate, context);

    expect(result.pass).toBe(true);
  });
});
