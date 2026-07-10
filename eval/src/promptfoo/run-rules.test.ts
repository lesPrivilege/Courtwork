import { describe, it, expect } from 'vitest';
import { runRules } from './run-rules.js';

describe('runRules', () => {
  it('unwraps context.vars JSON strings and delegates to evaluateCase', () => {
    const context = {
      vars: {
        scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
        expectedAnswerJson: JSON.stringify({}),
        input: JSON.stringify({}),
      },
    };

    const result = runRules({ not: 'valid' }, context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/schemaValid/);
  });

  it('forwards a raw string candidateOutput through to evaluateCase unparsed', () => {
    const context = {
      vars: {
        scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
        expectedAnswerJson: JSON.stringify({}),
        input: JSON.stringify({}),
      },
    };

    const result = runRules('not json at all {{{', context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });
});
