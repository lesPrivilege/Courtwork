import { describe, it, expect } from 'vitest';
import { summarizeByProvider, formatComparisonReportMarkdown } from './report.js';
import type { PromptfooResultsFile } from './report.js';

function fixture(): PromptfooResultsFile {
  return {
    results: {
      results: [
        { provider: { id: 'mock-thorough' }, success: true, score: 1, latencyMs: 300, cost: 0.02, tokenUsage: { total: 2000 } },
        { provider: { id: 'mock-thorough' }, success: true, score: 1, latencyMs: 320, cost: 0.02, tokenUsage: { total: 2000 } },
        { provider: { id: 'mock-fast' }, success: true, score: 1, latencyMs: 40, cost: 0.002, tokenUsage: { total: 300 } },
        { provider: { id: 'mock-fast' }, success: false, score: 0.5, latencyMs: 45, cost: 0.002, tokenUsage: { total: 300 } },
      ],
    },
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

  it('returns an empty array for an empty results file', () => {
    const summaries = summarizeByProvider({ results: { results: [] } });

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
