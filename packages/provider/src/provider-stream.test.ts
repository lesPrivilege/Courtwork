import { describe, expect, it } from 'vitest';
import { normalizeProviderTransport } from './provider-stream.js';
import type { ProviderStreamEvent, ProviderTransportEvent } from './types.js';

const encoder = new TextEncoder();
const context = {
  requestId: 'req-1',
  providerId: 'deepseek',
  modelId: 'deepseek-v4-flash',
  reasoningFieldCandidates: ['reasoning_content'] as const,
};

async function collect(events: AsyncIterable<ProviderStreamEvent>) {
  const output: ProviderStreamEvent[] = [];
  for await (const event of events) output.push(event);
  return output;
}

function transports(...events: ProviderTransportEvent[]): AsyncIterable<ProviderTransportEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      yield* events;
    },
  };
}

function bytes(text: string): number[] {
  return [...encoder.encode(text)];
}

describe('incremental provider transport normalization', () => {
  it('publishes the first delta before the transport releases its terminal frames', async () => {
    let releaseTerminal!: () => void;
    const terminalGate = new Promise<void>((resolve) => { releaseTerminal = resolve; });
    const raw: AsyncIterable<ProviderTransportEvent> = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' };
        yield { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[{"delta":{"content":"首"}}]}\n\n') };
        await terminalGate;
        yield { type: 'chunk', requestId: 'req-1', bytes: bytes('data: [DONE]\n\n') };
        yield { type: 'end', requestId: 'req-1' };
      },
    };
    const iterator = normalizeProviderTransport(raw, context)[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'started', seq: 0 } });
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'content_delta', delta: '首', seq: 1 } });
    releaseTerminal();
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'completed' } });
  });

  it('preserves a Han character split across UTF-8 transport chunks and keeps seq monotonic', async () => {
    const payload = encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"想","content":"法"}}]}\n\n');
    const split = payload.indexOf(0xe6) + 1;
    const events = await collect(normalizeProviderTransport(transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream; charset=utf-8' },
      { type: 'chunk', requestId: 'req-1', bytes: [...payload.slice(0, split)] },
      { type: 'chunk', requestId: 'req-1', bytes: [...payload.slice(split)] },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}\n\ndata: [DONE]\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), context));
    expect(events.map((event) => event.type)).toEqual(['started', 'reasoning_delta', 'content_delta', 'usage', 'completed']);
    expect(events.map((event) => event.seq)).toEqual([0, 1, 2, 3, 4]);
    expect(events[1]).toMatchObject({ delta: '想' });
    expect(events[2]).toMatchObject({ delta: '法' });
  });

  it('rejects invalid UTF-8 bytes instead of replacing them inside successful content', async () => {
    const prefix = bytes('data: {"choices":[{"delta":{"content":"');
    const suffix = bytes('"}}]}\n\ndata: [DONE]\n\n');
    const events = await collect(normalizeProviderTransport(transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: [...prefix, 0xff, ...suffix] },
      { type: 'end', requestId: 'req-1' },
    ), context));
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'protocol' });
    expect(events.some((event) => event.type === 'completed')).toBe(false);
  });

  it.each([
    ['EOF before [DONE]', transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[{"delta":{"content":"x"}}]}\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), 'protocol'],
    ['empty final content', transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: [DONE]\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), 'invalid_response'],
    ['invalid SSE JSON', transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {not-json}\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), 'protocol'],
  ] as const)('closes %s with the declared failure kind', async (_name, raw, kind) => {
    const events = await collect(normalizeProviderTransport(raw, context));
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind });
    expect(events.filter((event) => event.type === 'completed' || event.type === 'failed')).toHaveLength(1);
  });

  it.each([
    ['HTTP auth failure', transports(
      { type: 'response_started', requestId: 'req-1', status: 401, contentType: 'application/json' },
    ), 'auth'],
    ['transport network failure', transports(
      { type: 'failed', requestId: 'req-1', kind: 'network', message: 'offline', retryable: true },
    ), 'network'],
  ] as const)('publishes lifecycle started before %s terminal', async (_name, raw, kind) => {
    const events = await collect(normalizeProviderTransport(raw, context));
    expect(events).toEqual([
      expect.objectContaining({ type: 'started', seq: 0, requestId: 'req-1' }),
      expect.objectContaining({ type: 'failed', seq: 1, kind }),
    ]);
  });

  it('keeps exactly one canceled terminal when end wins the same race afterward', async () => {
    const events = await collect(normalizeProviderTransport(transports(
      { type: 'failed', requestId: 'req-1', kind: 'canceled', message: '请求已取消', retryable: false },
      { type: 'end', requestId: 'req-1' },
    ), context));
    expect(events).toEqual([
      expect.objectContaining({ type: 'started', seq: 0 }),
      expect.objectContaining({ type: 'failed', seq: 1, kind: 'canceled' }),
    ]);
  });
});

function usageEventOf(events: ProviderStreamEvent[]): Extract<ProviderStreamEvent, { type: 'usage' }> {
  const event = events.find((candidate) => candidate.type === 'usage');
  if (!event || event.type !== 'usage') throw new Error('no usage event');
  return event;
}

describe('usage normalization preserves raw metering and provider slots', () => {
  it('preserves the raw usage object verbatim and maps generic input/output', async () => {
    // rawUsage 是计量真源：即便 context 未提供 provider 槽位映射，wire 里的 cache 分账字段
    // 也必须原样留存在 rawUsage（现行归一化把它们丢弃 → 本测先红）。
    const events = await collect(normalizeProviderTransport(transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[{"delta":{"content":"x"}}]}\n\n') },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"prompt_cache_hit_tokens":8,"prompt_cache_miss_tokens":2}}\n\ndata: [DONE]\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), context));
    const usageEvent = usageEventOf(events);
    expect(usageEvent.usage).toMatchObject({ inputTokens: 10, outputTokens: 5 });
    expect(usageEvent.usage.rawUsage).toEqual({
      prompt_tokens: 10, completion_tokens: 5, prompt_cache_hit_tokens: 8, prompt_cache_miss_tokens: 2,
    });
  });

  it('applies the provider usage mapper to project cache/reasoning slots (no longer discarded)', async () => {
    const mapUsage = (raw: unknown) => {
      const record = raw as Record<string, number> & { completion_tokens_details?: { reasoning_tokens?: number } };
      return {
        cacheHitInputTokens: record.prompt_cache_hit_tokens,
        cacheMissInputTokens: record.prompt_cache_miss_tokens,
        reasoningOutputTokens: record.completion_tokens_details?.reasoning_tokens,
      };
    };
    const events = await collect(normalizeProviderTransport(transports(
      { type: 'response_started', requestId: 'req-1', status: 200, contentType: 'text/event-stream' },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[{"delta":{"content":"x"}}]}\n\n') },
      { type: 'chunk', requestId: 'req-1', bytes: bytes('data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"prompt_cache_hit_tokens":8,"prompt_cache_miss_tokens":2,"completion_tokens_details":{"reasoning_tokens":3}}}\n\ndata: [DONE]\n\n') },
      { type: 'end', requestId: 'req-1' },
    ), { ...context, mapUsage }));
    const usageEvent = usageEventOf(events);
    expect(usageEvent.usage).toMatchObject({
      inputTokens: 10, outputTokens: 5, cacheHitInputTokens: 8, cacheMissInputTokens: 2, reasoningOutputTokens: 3,
    });
  });
});
