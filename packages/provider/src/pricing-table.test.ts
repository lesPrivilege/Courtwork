import { describe, expect, it } from 'vitest';
import { estimateCostUsd, PRICE_TABLE, type PriceTable } from './pricing-table.js';

const usd = (providerId: string, modelId: string, usage: Parameters<typeof estimateCostUsd>[2], table?: PriceTable) =>
  estimateCostUsd(providerId, modelId, usage, table)?.usd;

describe('estimateCostUsd', () => {
  it('returns a versioned estimate discriminant, not a bare number', () => {
    const estimate = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1, outputTokens: 1 });
    expect(estimate).toBeDefined();
    expect(estimate).toMatchObject({
      kind: 'estimate',
      priceTableVersion: PRICE_TABLE.version,
      effectiveAt: PRICE_TABLE.effectiveAt,
    });
    expect(typeof estimate?.usd).toBe('number');
    expect(Array.isArray(estimate?.assumptions)).toBe(true);
    expect(estimate?.assumptions.length).toBeGreaterThan(0);
  });

  it('computes USD cost for a known (providerId, modelId) pair from RMB per-million-token rates', () => {
    // deepseek-v4-pro: 输入 ¥3/M、输出 ¥6/M（docs/architecture/system.md 2026-07 快照）
    const cost = usd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(cost).toBeDefined();
    // (3 + 6) 元 / 7.1 汇率 ≈ 1.267 美元，允许浮点误差
    expect(cost).toBeCloseTo(9 / 7.1, 5);
  });

  it('scales linearly with token counts', () => {
    const full = usd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 0 });
    const half = usd('deepseek', 'deepseek-v4-pro', { inputTokens: 500_000, outputTokens: 0 });
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
    const cost = usd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 0 });
    expect(cost).toBeCloseTo(3 / 7.1, 5);
  });

  it('returns a real 0 (not undefined) for a known price with legitimately zero usage', () => {
    const estimate = estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 0, outputTokens: 0 });
    expect(estimate?.usd).toBe(0);
  });

  // 缺失 = unknown ≠ 0：任一计价必需槽位缺失都必须诚实返回 undefined（unknown 传染），
  // 绝不把缺失的 input/output token 当作 0 去凑出一个"看起来能算"的价格。
  it('propagates unknown: missing inputTokens yields undefined, not a zero-input price', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-pro', { outputTokens: 1_000_000 })).toBeUndefined();
  });

  it('propagates unknown: missing outputTokens yields undefined, not a zero-output price', () => {
    expect(estimateCostUsd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000 })).toBeUndefined();
  });

  it('prices only total input tokens; cache split slots never fabricate a separate cache rate', () => {
    // cache hit/miss 是计量真源里的分账，但价目表未收录缓存命中价——估算只用总 input token 的未命中价，
    // 不得凭空发明一个缓存命中折扣价。带 cache 槽位与不带 cache 槽位、input 总量相同 → 同价。
    const withCache = usd('deepseek', 'deepseek-v4-pro', {
      inputTokens: 1_000_000, outputTokens: 0, cacheHitInputTokens: 900_000, cacheMissInputTokens: 100_000,
    });
    const withoutCache = usd('deepseek', 'deepseek-v4-pro', { inputTokens: 1_000_000, outputTokens: 0 });
    expect(withCache).toBeCloseTo(withoutCache ?? -1, 10);
  });

  // 估算不覆盖：同一原始计量在不同 priceTableVersion 下产生不同 estimate，
  // 且先算出的 estimate 对象不被后一次计算就地改写（原始计量与派生价格分开、互不覆盖）。
  it('versions the estimate: same usage under two table versions yields different usd and version, no in-place overwrite', () => {
    const usageSnapshot = { inputTokens: 1_000_000, outputTokens: 1_000_000 } as const;
    const tableV1: PriceTable = {
      version: 'test-v1',
      effectiveAt: '2000-01-01T00:00:00Z',
      rmbToUsdRate: 1,
      assumptions: ['test'],
      prices: { deepseek: { 'deepseek-v4-pro': { inputPerMillionRmb: 1, outputPerMillionRmb: 1 } } },
    };
    const tableV2: PriceTable = {
      ...tableV1,
      version: 'test-v2',
      effectiveAt: '2001-01-01T00:00:00Z',
      prices: { deepseek: { 'deepseek-v4-pro': { inputPerMillionRmb: 2, outputPerMillionRmb: 2 } } },
    };
    const first = estimateCostUsd('deepseek', 'deepseek-v4-pro', usageSnapshot, tableV1);
    const second = estimateCostUsd('deepseek', 'deepseek-v4-pro', usageSnapshot, tableV2);
    expect(first?.usd).toBe(2);
    expect(second?.usd).toBe(4);
    expect(first?.priceTableVersion).toBe('test-v1');
    expect(second?.priceTableVersion).toBe('test-v2');
    // 先算出的 V1 记录未被 V2 计算污染（历史记录不被新价目重算）。
    expect(first?.usd).toBe(2);
    expect(first?.priceTableVersion).toBe('test-v1');
  });
});
