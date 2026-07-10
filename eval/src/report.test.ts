import { describe, it, expect } from 'vitest';
import { summarizeByProvider, formatComparisonReportMarkdown } from './report.js';
import type { EvalRunResultSet } from './results.js';

function fixture(): EvalRunResultSet {
  return {
    scenario: 'S3',
    runResults: [
      { runId: 'r1', caseId: 'c1', provider: 'mock-thorough', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 300 }, cost: 0.02, tokensUsed: 2000 },
      { runId: 'r1', caseId: 'c2', provider: 'mock-thorough', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 320 }, cost: 0.02, tokensUsed: 2000 },
      { runId: 'r1', caseId: 'c1', provider: 'mock-fast', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 40 }, cost: 0.002, tokensUsed: 300 },
      { runId: 'r1', caseId: 'c2', provider: 'mock-fast', pass: false, score: 0.5, ruleResults: [], judgeResults: [], timings: { latencyMs: 45 }, cost: 0.002, tokensUsed: 300 },
    ],
  };
}

describe('summarizeByProvider', () => {
  it('groups results by provider id and computes pass rate, average score, totals, and average latency', () => {
    const summaries = summarizeByProvider(fixture());

    const thorough = summaries.find((s) => s.providerId === 'mock-thorough')!;
    expect(thorough.totalTests).toBe(2);
    expect(thorough.passed).toBe(2);
    expect(thorough.passRate).toBe(1);
    expect(thorough.avgScore).toBe(1);
    expect(thorough.totalCost).toBeCloseTo(0.04);
    expect(thorough.totalTokens).toBe(4000);
    expect(thorough.avgLatencyMs).toBe(310);

    const fast = summaries.find((s) => s.providerId === 'mock-fast')!;
    expect(fast.totalTests).toBe(2);
    expect(fast.passed).toBe(1);
    expect(fast.passRate).toBe(0.5);
    expect(fast.avgScore).toBeCloseTo(0.75);
  });

  it('returns an empty array for an empty result set', () => {
    const summaries = summarizeByProvider({ scenario: 'S3', runResults: [] });

    expect(summaries).toEqual([]);
  });
});

describe('formatComparisonReportMarkdown', () => {
  it('renders one table row per provider with pass rate, score, cost, tokens, and latency', () => {
    const summaries = summarizeByProvider(fixture());

    const markdown = formatComparisonReportMarkdown(summaries, 'S3');

    expect(markdown).toMatch(/mock-thorough/);
    expect(markdown).toMatch(/mock-fast/);
    expect(markdown).toMatch(/S3/);
  });

  it('recommends the provider with the highest average score', () => {
    const summaries = summarizeByProvider(fixture());

    const markdown = formatComparisonReportMarkdown(summaries, 'S3');

    expect(markdown).toMatch(/mock-thorough/);
    const recommendationSection = markdown.slice(markdown.indexOf('选型建议'));
    expect(recommendationSection).toMatch(/mock-thorough/);
  });
});
