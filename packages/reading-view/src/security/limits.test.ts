import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, resolveLimits } from './limits.js';

describe('resolveLimits', () => {
  it('无 options 时返回默认值', () => {
    expect(resolveLimits()).toEqual(DEFAULT_LIMITS);
  });

  it('部分覆盖时其余字段仍取默认值', () => {
    const resolved = resolveLimits({ maxFileSizeBytes: 1024 });
    expect(resolved.maxFileSizeBytes).toBe(1024);
    expect(resolved.timeoutMs).toBe(DEFAULT_LIMITS.timeoutMs);
    expect(resolved.maxDecompressionRatio).toBe(DEFAULT_LIMITS.maxDecompressionRatio);
    expect(resolved.maxUncompressedBytes).toBe(DEFAULT_LIMITS.maxUncompressedBytes);
  });

  it('全部覆盖时全部生效', () => {
    const resolved = resolveLimits({
      maxFileSizeBytes: 1,
      maxDecompressionRatio: 2,
      maxUncompressedBytes: 3,
      timeoutMs: 4,
    });
    expect(resolved).toEqual({ maxFileSizeBytes: 1, maxDecompressionRatio: 2, maxUncompressedBytes: 3, timeoutMs: 4 });
  });
});
