import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from './pricing-table.js';

describe('estimateCostUsd', () => {
  it('computes USD cost for a known (providerId, modelId) pair from RMB per-million-token rates', () => {
    // deepseek-v4-pro: 输入 ¥3/M、输出 ¥6/M（docs/18 2026-07 快照）
    const cost = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(cost).toBeDefined();
    // (3 + 6) 元 / 7.1 汇率 ≈ 1.267 美元，允许浮点误差
    expect(cost).toBeCloseTo(9 / 7.1, 5);
  });

  it('scales linearly with token counts', () => {
    const full = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 0 });
    const half = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 500_000, outputTokens: 0 });
    expect(full).toBeCloseTo((half ?? 0) * 2, 5);
  });

  it('returns undefined for an unknown providerId (no fabricated price)', () => {
    expect(estimateCostUsd('unknown-provider', 'whatever', { inputTokens: 100, outputTokens: 100 })).toBeUndefined();
  });

  it('returns undefined for a known provider but unknown/unpriced modelId', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-flash-unpriced', { inputTokens: 100, outputTokens: 100 })).toBeUndefined();
  });

  it('returns undefined when usage is undefined (no signal to price)', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-pro', undefined)).toBeUndefined();
  });

  it('0.1 只为 DeepSeek 主路径提供价格；roadmap provider 不伪造计价', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1, outputTokens: 1 })).toBeDefined();
    expect(estimateCostUsd('qwen', 'qwen3.5-plus', { inputTokens: 1, outputTokens: 1 })).toBeUndefined();
    expect(estimateCostUsd('doubao', 'doubao-seed-1.6', { inputTokens: 1, outputTokens: 1 })).toBeUndefined();
  });

  it('applies the input rate to input tokens and the output rate to output tokens (not swapped)', () => {
    const cost = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 0 });
    expect(cost).toBeCloseTo(3 / 7.1, 5);
  });

  it('returns a real 0 (not undefined) for a known price with legitimately zero usage', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });
});
