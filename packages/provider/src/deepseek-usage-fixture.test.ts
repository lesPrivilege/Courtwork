import { describe, expect, it } from 'vitest';
import { normalizeProviderTransport, type ProviderStreamContext } from './provider-stream.js';
import { DEEPSEEK_QUIRK_PROFILE } from './quirk-profile.js';
import type { ProviderStreamEvent, ProviderTransportEvent } from './types.js';

/**
 * DeepSeek 原始 usage wire fixture。
 *
 * 这些 fixture 是**构造**的，字段形状照 DeepSeek 官方 OpenAI 兼容 usage 结构手写
 * （prompt_tokens / completion_tokens / prompt_cache_hit_tokens / prompt_cache_miss_tokens /
 * completion_tokens_details.reasoning_tokens）。它们只证明"给定这种形状的 raw usage，具名
 * profile 的映射与语义校验是否正确"，**不构成 external-validated**——真实响应捕获需要
 * DEEPSEEK_API_KEY，本环境缺 key，捕获步骤在 SPEC 标记为阻塞待架构师安排。
 */

const encoder = new TextEncoder();
const bytes = (text: string): number[] => [...encoder.encode(text)];

const context: ProviderStreamContext = {
  requestId: 'req-1',
  providerId: DEEPSEEK_QUIRK_PROFILE.providerId,
  modelId: 'deepseek-v4-pro',
  reasoningFieldCandidates: DEEPSEEK_QUIRK_PROFILE.reasoningFieldCandidates,
  mapUsage: DEEPSEEK_QUIRK_PROFILE.mapUsage,
};

function transports(...events: ProviderTransportEvent[]): AsyncIterable<ProviderTransportEvent> {
  return { async *[Symbol.asyncIterator]() { yield* events; } };
}

async function normalizeWire(usageBlock: Record<string, unknown>) {
  const events: ProviderStreamEvent[] = [];
  for await (const event of normalizeProviderTransport(transports(
    { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
    { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[{"delta":{"content":"结论"}}]}\n\n') },
    { type: 'chunk', requestId: 'req-1', bytes: bytes(`data: ${JSON.stringify({ choices: [], usage: usageBlock })}\n\ndata: [DONE]\n\n`) },
    { type: 'end', requestId: 'req-1' },
  ), context)) {
    events.push(event);
  }
  const usage = events.find((e) => e.type === 'usage');
  if (!usage || usage.type !== 'usage') throw new Error('no usage event');
  return usage.usage;
}

describe('DeepSeek usage wire fixture (constructed, not external-validated)', () => {
  it('type ①: cache hit/miss + reasoning present and consistent → all slots projected, raw preserved', async () => {
    const usage = await normalizeWire({
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      prompt_cache_hit_tokens: 80,
      prompt_cache_miss_tokens: 20,
      completion_tokens_details: { reasoning_tokens: 30 },
    });
    expect(usage).toMatchObject({
      inputTokens: 100,
      outputTokens: 50,
      cacheHitInputTokens: 80,
      cacheMissInputTokens: 20,
      reasoningOutputTokens: 30,
    });
    expect(usage.rawUsage).toMatchObject({ prompt_cache_hit_tokens: 80, prompt_cache_miss_tokens: 20 });
  });

  it('type ②: reasoning present, no cache fields → reasoning projected, cache slots stay unknown', async () => {
    const usage = await normalizeWire({
      prompt_tokens: 40,
      completion_tokens: 60,
      total_tokens: 100,
      completion_tokens_details: { reasoning_tokens: 12 },
    });
    expect(usage.inputTokens).toBe(40);
    expect(usage.outputTokens).toBe(60);
    expect(usage.reasoningOutputTokens).toBe(12);
    expect(usage.cacheHitInputTokens).toBeUndefined();
    expect(usage.cacheMissInputTokens).toBeUndefined();
  });

  it('type ③: only prompt/completion present → provider slots all unknown, raw still preserved', async () => {
    const usage = await normalizeWire({ prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 });
    expect(usage.inputTokens).toBe(7);
    expect(usage.outputTokens).toBe(3);
    expect(usage.cacheHitInputTokens).toBeUndefined();
    expect(usage.cacheMissInputTokens).toBeUndefined();
    expect(usage.reasoningOutputTokens).toBeUndefined();
    expect(usage.rawUsage).toEqual({ prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 });
  });

  it('semantic mismatch: hit+miss ≠ prompt_tokens → cache split declines to unknown, raw kept, numbers unmodified', async () => {
    // 校验不符（80 + 30 ≠ 100）：归一化槽位诚实置 unknown（不投影不可信分账），
    // rawUsage 原样留存原始数字（不修数）。
    const usage = await normalizeWire({
      prompt_tokens: 100,
      completion_tokens: 50,
      prompt_cache_hit_tokens: 80,
      prompt_cache_miss_tokens: 30,
    });
    expect(usage.inputTokens).toBe(100);
    expect(usage.cacheHitInputTokens).toBeUndefined();
    expect(usage.cacheMissInputTokens).toBeUndefined();
    expect(usage.rawUsage).toMatchObject({ prompt_cache_hit_tokens: 80, prompt_cache_miss_tokens: 30 });
  });
});

describe('DEEPSEEK_QUIRK_PROFILE.mapUsage (named-profile mapping unit)', () => {
  // 具名 profile 必须携带 usage 映射（provider 专属映射只住 profile）。
  const mapUsage = DEEPSEEK_QUIRK_PROFILE.mapUsage;
  if (!mapUsage) throw new Error('DEEPSEEK_QUIRK_PROFILE.mapUsage must be defined');

  it('maps cache hit/miss and reasoning from a consistent raw usage object', () => {
    expect(mapUsage({
      prompt_tokens: 100,
      completion_tokens: 50,
      prompt_cache_hit_tokens: 80,
      prompt_cache_miss_tokens: 20,
      completion_tokens_details: { reasoning_tokens: 30 },
    })).toEqual({ cacheHitInputTokens: 80, cacheMissInputTokens: 20, reasoningOutputTokens: 30 });
  });

  it('drops the cache split when hit+miss disagree with prompt_tokens (keeps raw upstream, projects nothing)', () => {
    expect(mapUsage({
      prompt_tokens: 100,
      completion_tokens: 50,
      prompt_cache_hit_tokens: 80,
      prompt_cache_miss_tokens: 30,
    })).toEqual({});
  });

  it('returns an empty projection for a non-object raw usage', () => {
    expect(mapUsage(null)).toEqual({});
    expect(mapUsage('nonsense')).toEqual({});
  });
});
