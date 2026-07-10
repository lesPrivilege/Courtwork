import type { ConvertOptions } from '../types.js';

export interface ResolvedLimits {
  maxFileSizeBytes: number;
  maxDecompressionRatio: number;
  maxUncompressedBytes: number;
  timeoutMs: number;
}

export const DEFAULT_LIMITS: ResolvedLimits = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxDecompressionRatio: 100,
  maxUncompressedBytes: 200 * 1024 * 1024,
  timeoutMs: 30_000,
};

export function resolveLimits(options?: ConvertOptions): ResolvedLimits {
  return {
    maxFileSizeBytes: options?.maxFileSizeBytes ?? DEFAULT_LIMITS.maxFileSizeBytes,
    maxDecompressionRatio: options?.maxDecompressionRatio ?? DEFAULT_LIMITS.maxDecompressionRatio,
    maxUncompressedBytes: options?.maxUncompressedBytes ?? DEFAULT_LIMITS.maxUncompressedBytes,
    timeoutMs: options?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
  };
}
