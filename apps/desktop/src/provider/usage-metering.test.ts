import { describe, expect, it } from 'vitest';
import { formatUsageMetering } from './usage-metering';

describe('formatUsageMetering (USAGE-LEDGER-1)', () => {
  it('renders missing input/output slots as unknown instead of zero', () => {
    expect(formatUsageMetering({ outputTokens: 50, reasoningOutputTokens: 30 }))
      .toBe('Input 未知 · Output 50 · Reasoning 30');
  });

  it('keeps a legitimate zero distinct from an unknown slot', () => {
    expect(formatUsageMetering({ inputTokens: 0, outputTokens: 0 }))
      .toBe('Input 0 · Output 0');
  });
});
