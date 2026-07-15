import { describe, expect, it } from 'vitest';
import { sumUsage } from './executor.js';

describe('sumUsage (USAGE-LEDGER-1 unknown propagation)', () => {
  it('sums matching known slots across all numeric channels', () => {
    expect(sumUsage(
      { inputTokens: 10, outputTokens: 5, cacheHitInputTokens: 8, cacheMissInputTokens: 2, reasoningOutputTokens: 3 },
      { inputTokens: 20, outputTokens: 7, cacheHitInputTokens: 1, cacheMissInputTokens: 19, reasoningOutputTokens: 4 },
    )).toEqual({
      inputTokens: 30,
      outputTokens: 12,
      cacheHitInputTokens: 9,
      cacheMissInputTokens: 21,
      reasoningOutputTokens: 7,
    });
  });

  it('propagates unknown: known + unknown slot yields unknown, never the lone known value, never 0', () => {
    const summed = sumUsage(
      { inputTokens: 10, outputTokens: 5 },
      { outputTokens: 7 }, // inputTokens unknown
    );
    expect(summed?.inputTokens).toBeUndefined();
    expect(summed?.outputTokens).toBe(12);
  });

  it('returns the sole present operand when the other is entirely absent', () => {
    const only = { inputTokens: 3, outputTokens: 4 };
    expect(sumUsage(only, undefined)).toEqual(only);
    expect(sumUsage(undefined, only)).toEqual(only);
    expect(sumUsage(undefined, undefined)).toBeUndefined();
  });

  it('does not fabricate a rawUsage for a derived aggregate (no single raw source of truth)', () => {
    const summed = sumUsage(
      { inputTokens: 1, outputTokens: 1, rawUsage: { a: 1 } },
      { inputTokens: 2, outputTokens: 2, rawUsage: { b: 2 } },
    );
    expect(summed?.rawUsage).toBeUndefined();
  });
});
