import { describe, it, expect } from 'vitest';
import { findRegressions } from './regression.js';
import type { EvalRunResult, EvalRunResultSet } from './results.js';

function result(caseId: string, providerId: string, score: number): EvalRunResult {
  return {
    runId: 'r1',
    caseId,
    provider: providerId,
    pass: score >= 0.7,
    score,
    ruleResults: [],
    judgeResults: [],
    timings: { latencyMs: 100 },
    cost: 0.01,
    tokensUsed: 100,
  };
}

function set(runResults: EvalRunResult[]): EvalRunResultSet {
  return { scenario: 'S3', runResults };
}

describe('findRegressions', () => {
  it('flags a case whose score dropped by more than the threshold', () => {
    const baseline = set([result('main-risk-01', 'anthropic:messages:claude-opus-4-8', 0.95)]);
    const current = set([result('main-risk-01', 'anthropic:messages:claude-opus-4-8', 0.6)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      caseId: 'main-risk-01',
      providerId: 'anthropic:messages:claude-opus-4-8',
      regressed: true,
    });
    expect(findings[0].delta).toBeCloseTo(-0.35);
  });

  it('does not flag a case whose score moved within the threshold', () => {
    const baseline = set([result('main-risk-01', 'p', 0.9)]);
    const current = set([result('main-risk-01', 'p', 0.87)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings.filter((f) => f.regressed)).toHaveLength(0);
  });

  it('does not flag an improvement', () => {
    const baseline = set([result('main-risk-01', 'p', 0.6)]);
    const current = set([result('main-risk-01', 'p', 0.95)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings.filter((f) => f.regressed)).toHaveLength(0);
  });

  it('matches rows independently per provider, not just per case id', () => {
    const baseline = set([result('main-risk-01', 'provider-a', 0.9), result('main-risk-01', 'provider-b', 0.9)]);
    const current = set([result('main-risk-01', 'provider-a', 0.5), result('main-risk-01', 'provider-b', 0.9)]);

    const findings = findRegressions(baseline, current, 0.05);
    const regressed = findings.filter((f) => f.regressed);

    expect(regressed).toHaveLength(1);
    expect(regressed[0].providerId).toBe('provider-a');
  });

  it('skips a current case with no matching baseline row (new case, nothing to regress against)', () => {
    const baseline = set([]);
    const current = set([result('brand-new-case', 'p', 0.4)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings).toHaveLength(0);
  });
});
