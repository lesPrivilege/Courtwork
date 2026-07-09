import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateTests } from './generate-tests.js';
import type { EvalCase } from '../dataset-schema.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const baseCase: EvalCase = {
  id: 'main-risk-01',
  scenario: 'S3',
  caseType: 'core',
  task: { instruction: '审查合同条款', input: { contractText: 'x' } },
  expectedAnswer: { risks: [] },
  scoringRules: [{ type: 'schemaValid', schemaName: 'RiskList' }],
  sourceRefs: ['x'],
};

describe('generateTests', () => {
  it('carries instruction and input into vars for prompt templating', () => {
    const [test] = generateTests([baseCase], { evalRoot });

    expect(test.vars.instruction).toBe('审查合同条款');
    expect(JSON.parse(test.vars.input)).toEqual({ contractText: 'x' });
  });

  it('carries the case id into vars so results can be matched back to a case across runs (e.g. for regression diffing)', () => {
    const [test] = generateTests([baseCase], { evalRoot });

    expect(test.vars.caseId).toBe('main-risk-01');
  });

  it('carries expectedAnswer and scoringRules into vars for the rule dispatcher, never into the prompt template vars used above', () => {
    const [test] = generateTests([baseCase], { evalRoot });

    expect(JSON.parse(test.vars.expectedAnswerJson)).toEqual({ risks: [] });
    expect(JSON.parse(test.vars.scoringRulesJson)).toEqual([{ type: 'schemaValid', schemaName: 'RiskList' }]);
  });

  it('adds exactly one javascript assertion pointing at the rule dispatcher when rule-based rules exist', () => {
    const [test] = generateTests([baseCase], { evalRoot });

    const jsAsserts = test.assert.filter((a) => a.type === 'javascript');
    expect(jsAsserts).toHaveLength(1);
    expect(jsAsserts[0].value).toMatch(/run-rules/);
  });

  it('adds no javascript assertion when the case has only an llmJudge rule', () => {
    const judgeOnlyCase: EvalCase = {
      ...baseCase,
      scoringRules: [{ type: 'llmJudge', judgePromptFile: 'judges/s3-risk-quality.judge.md', weight: 1 }],
    };

    const [test] = generateTests([judgeOnlyCase], { evalRoot });

    expect(test.assert.filter((a) => a.type === 'javascript')).toHaveLength(0);
  });

  it('adds one llm-rubric assertion per llmJudge rule, embedding the judge prompt file content directly', () => {
    const judgeCase: EvalCase = {
      ...baseCase,
      scoringRules: [{ type: 'llmJudge', judgePromptFile: 'judges/s3-risk-quality.judge.md', weight: 1 }],
    };

    const [test] = generateTests([judgeCase], { evalRoot });

    const rubricAsserts = test.assert.filter((a) => a.type === 'llm-rubric');
    expect(rubricAsserts).toHaveLength(1);
    expect(rubricAsserts[0].value).toMatch(/S3 风险分析质量/);
  });

  it('generates one PromptfooTestCase per input case, in order', () => {
    const second: EvalCase = { ...baseCase, id: 'main-risk-02' };

    const tests = generateTests([baseCase, second], { evalRoot });

    expect(tests).toHaveLength(2);
  });
});
