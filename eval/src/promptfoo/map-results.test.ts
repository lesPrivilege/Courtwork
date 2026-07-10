import { describe, it, expect } from 'vitest';
import { mapResultsFileToRunResults } from './map-results.js';
import type { PromptfooResultsFile } from './raw-results.js';

function fixture(): PromptfooResultsFile {
  return {
    evalId: 'eval-test-2026-07-10',
    results: {
      results: [
        {
          provider: { id: 'mock-thorough', label: 'mock-thorough' },
          success: true,
          score: 1,
          latencyMs: 300,
          cost: 0.02,
          tokenUsage: { total: 2000 },
          vars: { caseId: 'main-risk-01' },
          gradingResult: {
            pass: true,
            score: 1,
            reason: 'combined',
            componentResults: [
              { pass: true, score: 1, reason: 'rule ok', assertion: { type: 'javascript', value: 'x' } },
              { pass: true, score: 1, reason: 'judge ok', assertion: { type: 'llm-rubric', value: 'y' } },
            ],
          },
        },
        {
          provider: { id: 'mock-fast', label: 'mock-fast' },
          success: false,
          score: 0.5,
          latencyMs: 40,
          cost: 0.002,
          tokenUsage: { total: 300 },
          vars: { caseId: 'main-risk-02' },
          gradingResult: {
            pass: false,
            score: 0.5,
            reason: 'combined',
            componentResults: [
              { pass: false, score: 0.5, reason: 'rule half', assertion: { type: 'javascript', value: 'x' } },
            ],
          },
        },
      ],
    },
  };
}

describe('mapResultsFileToRunResults', () => {
  it('maps provider id, caseId, pass, score, cost, tokens, and latency to the neutral shape', () => {
    const [first] = mapResultsFileToRunResults(fixture());

    expect(first.runId).toBe('eval-test-2026-07-10');
    expect(first.caseId).toBe('main-risk-01');
    expect(first.provider).toBe('mock-thorough');
    expect(first.pass).toBe(true);
    expect(first.score).toBe(1);
    expect(first.cost).toBe(0.02);
    expect(first.tokensUsed).toBe(2000);
    expect(first.timings).toEqual({ latencyMs: 300 });
  });

  it('splits componentResults into ruleResults (javascript assertions) and judgeResults (llm-rubric assertions)', () => {
    const [first, second] = mapResultsFileToRunResults(fixture());

    expect(first.ruleResults).toEqual([{ pass: true, score: 1, reason: 'rule ok' }]);
    expect(first.judgeResults).toEqual([{ pass: true, score: 1, reason: 'judge ok' }]);
    expect(second.ruleResults).toEqual([{ pass: false, score: 0.5, reason: 'rule half' }]);
    expect(second.judgeResults).toEqual([]);
  });

  it('shares the same runId (evalId) across every row from one results file', () => {
    const results = mapResultsFileToRunResults(fixture());

    expect(results.every((r) => r.runId === 'eval-test-2026-07-10')).toBe(true);
  });

  it('throws a clear error when a row is missing vars.caseId', () => {
    const broken = fixture();
    broken.results.results[0].vars = {};

    expect(() => mapResultsFileToRunResults(broken)).toThrow(/caseId/);
  });

  it('defaults cost and tokensUsed to 0 when the row omits them', () => {
    const minimal = fixture();
    minimal.results.results[0].cost = undefined as unknown as number;
    minimal.results.results[0].tokenUsage = undefined;

    const [first] = mapResultsFileToRunResults(minimal);

    expect(first.cost).toBe(0);
    expect(first.tokensUsed).toBe(0);
  });
});
