import { describe, expect, it } from 'vitest';
import { createScriptedProvider, ScriptedProviderExhaustedError } from './scripted-provider.js';

describe('createScriptedProvider', () => {
  it('exposes the given id and modelId', () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', []);
    expect(provider.id).toBe('demo-provider');
    expect(provider.modelId).toBe('fake-v1');
  });

  it('returns scripted responses in call order', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [
      { content: 'first' },
      { content: 'second' },
    ]);
    const first = await provider.generate({ messages: [{ role: 'user', content: 'a' }] });
    const second = await provider.generate({ messages: [{ role: 'user', content: 'b' }] });
    expect(first.content).toBe('first');
    expect(second.content).toBe('second');
  });

  it('throws ScriptedProviderExhaustedError once the script runs out', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'only-one' }]);
    await provider.generate({ messages: [] });
    await expect(provider.generate({ messages: [] })).rejects.toThrow(ScriptedProviderExhaustedError);
  });

  it('does not require the request content to match anything (opaque passthrough)', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x' }]);
    const response = await provider.generate({ systemPrompt: 'irrelevant', messages: [{ role: 'user', content: 'anything at all' }] });
    expect(response.content).toBe('x');
  });

  it('publishes compatibility notices on the same public stream that generate aggregates', async () => {
    const notice = {
      code: 'reasoning_downgraded_for_structured_output' as const,
      message: '结构化输出已使用标准模式',
      requested: 'deep' as const,
      applied: 'standard' as const,
    };
    const streamed = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x', notices: [notice] }]);
    const events = [];
    for await (const event of streamed.stream({ messages: [] }, { requestId: 'request-stream' })) events.push(event);

    expect(events).toContainEqual({ type: 'notice', requestId: 'request-stream', seq: 1, notice });

    const aggregated = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x', notices: [notice] }]);
    const originalStream = aggregated.stream.bind(aggregated);
    let streamConsumptions = 0;
    aggregated.stream = (request, options) => {
      streamConsumptions += 1;
      return originalStream(request, options);
    };
    await expect(aggregated.generate({ messages: [] })).resolves.toMatchObject({ notices: [notice] });
    expect(streamConsumptions).toBe(1);
  });

  it('replays a complete usage projection (all slots + rawUsage) verbatim through stream and generate', async () => {
    const usage = {
      inputTokens: 100,
      outputTokens: 50,
      cacheHitInputTokens: 80,
      cacheMissInputTokens: 20,
      reasoningOutputTokens: 30,
      rawUsage: { prompt_tokens: 100, completion_tokens: 50, prompt_cache_hit_tokens: 80 },
    };
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x', usage }]);
    const events = [];
    for await (const event of provider.stream({ messages: [] }, { requestId: 'r' })) events.push(event);
    expect(events).toContainEqual({ type: 'usage', requestId: 'r', seq: 2, usage });

    const aggregated = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x', usage }]);
    await expect(aggregated.generate({ messages: [] })).resolves.toMatchObject({ usage });
  });

  it('replays a missing-field usage projection: unknown slots stay unknown, never coerced to 0', async () => {
    // 缺字段型 fixture：inputTokens/cache 未知，只有 outputTokens 与 reasoning。
    const usage = { outputTokens: 50, reasoningOutputTokens: 30 };
    const aggregated = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x', usage }]);
    const result = await aggregated.generate({ messages: [] });
    expect(result.usage).toEqual(usage);
    expect(result.usage?.inputTokens).toBeUndefined();
    expect(result.usage?.cacheHitInputTokens).toBeUndefined();
  });
});
