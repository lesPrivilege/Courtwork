import { describe, it, expect } from 'vitest';
import { evaluateCase } from './evaluate.js';

describe('evaluateCase', () => {
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
    const scoringRules = [
      { type: 'schemaValid' as const, schemaName: 'RiskList' },
      { type: 'riskListMatch' as const },
      { type: 'citationExists' as const },
    ];

    const result = evaluateCase(candidateOutput, { scoringRules, expectedAnswer, input: {} });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('passes vacuously when all scoring rules are llmJudge (handled natively by the scorer adapter, not this dispatcher)', () => {
    const scoringRules = [{ type: 'llmJudge' as const, judgePromptFile: 'x', weight: 1 }];

    const result = evaluateCase({}, { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(true);
    expect(result.reason).toMatch(/无规则评分项/);
  });

  it('fails and names the failing rule type when a rule-based check fails', () => {
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];

    const result = evaluateCase({ not: 'valid' }, { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/schemaValid/);
  });

  it('dispatches factConsistency using checkFields from the rule config', () => {
    const scoringRules = [{ type: 'factConsistency' as const, checkFields: ['caseNumber'] }];
    const expectedAnswer = { facts: { caseNumber: '(2025)云章03民初472号' } };

    const result = evaluateCase(
      { text: '案号(2025)云章03民初472号' },
      { scoringRules, expectedAnswer, input: {} },
    );

    expect(result.pass).toBe(true);
  });

  it('parses candidateOutput as JSON when the provider hands it over as a raw string', () => {
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
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];
    const expectedAnswer = { caseId: 'x', risks: [risk] };
    const rawStringOutput = JSON.stringify({ caseId: 'x', risks: [risk] });

    const result = evaluateCase(rawStringOutput, { scoringRules, expectedAnswer, input: {} });

    expect(result.pass).toBe(true);
  });

  it('fails with a clear reason (not a crash) when candidateOutput is a string that is not valid JSON', () => {
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];

    const result = evaluateCase('not json at all {{{', { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });

  it('dispatches revisionSetMatch using sourceDocumentText carried in the case input', () => {
    const scoringRules = [{ type: 'revisionSetMatch' as const }];
    const input = { sourceDocumentText: '乙方逾期支付违约金1%' };
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

    const result = evaluateCase(candidate, { scoringRules, expectedAnswer: {}, input });

    expect(result.pass).toBe(true);
  });
});
