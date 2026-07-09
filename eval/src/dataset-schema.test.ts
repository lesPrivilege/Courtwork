import { describe, it, expect } from 'vitest';
import { EvalCaseSchema } from './dataset-schema.js';

describe('EvalCaseSchema', () => {
  it('accepts a minimal valid S3 case', () => {
    const valid = {
      id: 'main-risk-01',
      scenario: 'S3',
      caseType: 'core',
      task: {
        instruction: '审查以下合同条款，识别其中的法律风险。',
        input: { contractText: '...' },
      },
      expectedAnswer: { risks: [] },
      scoringRules: [{ type: 'schemaValid', schemaName: 'RiskList' }],
      sourceRefs: ['packages/demo-data/data/contracts/main-contract.md'],
    };
    const result = EvalCaseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a case with no scoring rules', () => {
    const invalid = {
      id: 'x',
      scenario: 'S3',
      caseType: 'core',
      task: { instruction: 'x', input: {} },
      expectedAnswer: {},
      scoringRules: [],
      sourceRefs: ['x'],
    };
    const result = EvalCaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown scoring rule type', () => {
    const invalid = {
      id: 'x',
      scenario: 'S3',
      caseType: 'core',
      task: { instruction: 'x', input: {} },
      expectedAnswer: {},
      scoringRules: [{ type: 'notARealRule' }],
      sourceRefs: ['x'],
    };
    const result = EvalCaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a case with no sourceRefs (traceability is mandatory)', () => {
    const invalid = {
      id: 'x',
      scenario: 'S4',
      caseType: 'draft',
      task: { instruction: 'x', input: {} },
      expectedAnswer: {},
      scoringRules: [{ type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md' }],
      sourceRefs: [],
    };
    const result = EvalCaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts an llmJudge scoring rule and defaults its weight to 1', () => {
    const valid = {
      id: 'draft-01',
      scenario: 'S4',
      caseType: 'draft',
      task: { instruction: 'x', input: {} },
      expectedAnswer: { instructions: [] },
      scoringRules: [{ type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md' }],
      sourceRefs: ['packages/demo-data/data/case-bible.md'],
    };
    const result = EvalCaseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scoringRules[0]).toMatchObject({ type: 'llmJudge', weight: 1 });
    }
  });

  it('rejects scenario values outside S3/S4', () => {
    const invalid = {
      id: 'x',
      scenario: 'S9',
      caseType: 'core',
      task: { instruction: 'x', input: {} },
      expectedAnswer: {},
      scoringRules: [{ type: 'schemaValid', schemaName: 'RiskList' }],
      sourceRefs: ['x'],
    };
    const result = EvalCaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
