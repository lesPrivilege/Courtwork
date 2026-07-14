import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import {
  createDeepSeekProvider,
  createOpenAICompatibleProvider,
} from './openai-compatible-provider.js';
import * as providerFactories from './openai-compatible-provider.js';
import { ProviderNotConfiguredError, ProviderNotImplementedError } from './errors.js';
import { DEEPSEEK_QUIRK_PROFILE } from './quirk-profile.js';
import type { ProviderTransport } from './types.js';

function sseBody(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
}

describe('createOpenAICompatibleProvider — construction-time credential discipline', () => {
  it('throws ProviderNotConfiguredError immediately when apiKey is missing', () => {
    expect(() =>
      createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
        auth: { kind: 'api_key', apiKey: '' },
        billing: { kind: 'metered' },
        modelId: 'x',
      }),
    ).toThrow(ProviderNotConfiguredError);
  });

  it('throws ProviderNotConfiguredError immediately when apiKey is whitespace-only', () => {
    expect(() =>
      createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
        auth: { kind: 'api_key', apiKey: '   ' },
        billing: { kind: 'metered' },
        modelId: 'x',
      }),
    ).toThrow(ProviderNotConfiguredError);
  });
});

describe('createOpenAICompatibleProvider — auth.kind / billing.kind 判别（架构拍板 2026-07-10）', () => {
  it('throws ProviderNotImplementedError immediately for auth.kind:"oauth_subscription" (not yet implemented)', () => {
    expect(() =>
      createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
        auth: { kind: 'oauth_subscription' },
        billing: { kind: 'metered' },
        modelId: 'x',
      }),
    ).toThrow(ProviderNotImplementedError);
  });

  it('throws ProviderNotImplementedError immediately for billing.kind:"plan" (not yet implemented)', () => {
    expect(() =>
      createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
        auth: { kind: 'api_key', apiKey: 'sk-x' },
        billing: { kind: 'plan' },
        modelId: 'x',
      }),
    ).toThrow(ProviderNotImplementedError);
  });
});

describe('createOpenAICompatibleProvider — generate() end-to-end', () => {
  it('publishes a structured-output downgrade notice on stream and generate aggregates that same notice', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('{"a":1}'), {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));
    const downgradeProfile = {
      ...DEEPSEEK_QUIRK_PROFILE,
      providerId: 'synthetic-downgrade',
      parameterCompatibility: { structuredOutputWithDeepReasoning: 'downgrade_to_standard' as const },
    };
    const create = () => createOpenAICompatibleProvider(downgradeProfile, {
      auth: { kind: 'api_key' as const, apiKey: 'sk-x' },
      billing: { kind: 'metered' as const },
      modelId: 'deepseek-v4-pro',
      reasoningLevel: 'deep' as const,
      fetchImpl,
      delay: async () => {},
    });
    const request = { messages: [{ role: 'user' as const, content: 'hi' }], responseSchema: z.object({ a: z.number() }) };
    const events = [];
    for await (const event of create().stream(request, { requestId: 'structured-1' })) events.push(event);

    const notice = {
      code: 'reasoning_downgraded_for_structured_output',
      requested: 'deep',
      applied: 'standard',
    };
    expect(events.map((event) => event.type)).toEqual(['started', 'notice', 'content_delta', 'completed']);
    expect(events[1]).toMatchObject({ type: 'notice', requestId: 'structured-1', seq: 1, notice });
    await expect(create().generate(request)).resolves.toMatchObject({ notices: [notice] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('generate() aggregates the same public stream and opens exactly one transport request', async () => {
    let calls = 0;
    const encoder = new TextEncoder();
    const transport: ProviderTransport = {
      async *stream(request) {
        calls += 1;
        yield { type: 'response_started', requestId: request.requestId, status: 200, contentType: 'text/event-stream' };
        yield { type: 'chunk', requestId: request.requestId, bytes: Array.from(encoder.encode('data: {"choices":[{"delta":{"content":"one-path"}}]}\n\ndata: [DONE]\n\n')) };
        yield { type: 'end', requestId: request.requestId };
      },
    };
    const provider = createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
      auth: { kind: 'api_key', apiKey: 'placeholder' }, billing: { kind: 'metered' },
      modelId: 'deepseek-v4-pro', transport,
    });
    const originalStream = provider.stream.bind(provider);
    let streamConsumptions = 0;
    provider.stream = (request, options) => {
      streamConsumptions += 1;
      return originalStream(request, options);
    };
    await expect(provider.generate({ messages: [{ role: 'user', content: 'hi' }] })).resolves.toMatchObject({ content: 'one-path' });
    expect(streamConsumptions).toBe(1);
    expect(calls).toBe(1);
  });

  it('assembles a GenerationResponse from the underlying SSE call, including usage and reasoningContent', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        [
          `data: ${JSON.stringify({ choices: [{ delta: { content: '{"a":1}', reasoning_content: 'because' } }] })}`,
          `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } })}`,
          'data: [DONE]',
        ].join('\n\n') + '\n\n',
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      ),
    );
    const provider = createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
      auth: { kind: 'api_key', apiKey: 'sk-x' },
      billing: { kind: 'metered' },
      modelId: 'deepseek-v4-pro',
      fetchImpl,
      delay: async () => {},
    });
    expect(provider.id).toBe('deepseek');
    expect(provider.modelId).toBe('deepseek-v4-pro');

    const response = await provider.generate({ messages: [{ role: 'user', content: 'hi' }], responseSchema: z.object({ a: z.number() }) });
    expect(response.content).toBe('{"a":1}');
    expect(response.reasoningContent).toBe('because');
    expect(response.usage).toEqual({ inputTokens: 3, outputTokens: 2 });
  });

  it('propagates plain-text generation (no responseSchema) without attempting to parse JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('just a sentence, no json'), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    const provider = createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
      auth: { kind: 'api_key', apiKey: 'sk-x' },
      billing: { kind: 'metered' },
      modelId: 'm',
      fetchImpl,
      delay: async () => {},
    });
    const response = await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(response.content).toBe('just a sentence, no json');
  });
});

describe('DeepSeek named factory wires the supported 0.1 profile', () => {
  it('createDeepSeekProvider posts to the DeepSeek base URL, and forwards modelId/id correctly', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('ok'), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    const provider = createDeepSeekProvider({ apiKey: 'sk-x', modelId: 'deepseek-v4-pro', fetchImpl, delay: async () => {} });
    expect(provider.id).toBe('deepseek');
    expect(provider.modelId).toBe('deepseek-v4-pro');
    await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.deepseek.com/v1/chat/completions', expect.anything());
  });

  it('不再导出 Qwen/豆包具名工厂', () => {
    expect(providerFactories).not.toHaveProperty('createQwenProvider');
    expect(providerFactories).not.toHaveProperty('createDoubaoProvider');
  });
});

describe('credential discipline — apiKey never reaches a thrown error end-to-end', () => {
  it('a runtime failure never echoes the real key', async () => {
    const secretKey = 'sk-e2e-secret-canary-5f4e3d2c';
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
    const provider = createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
      auth: { kind: 'api_key', apiKey: secretKey },
      billing: { kind: 'metered' },
      modelId: 'm',
      fetchImpl,
      delay: async () => {},
      maxTransportRetries: 0,
    });
    let caught: unknown;
    try {
      await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    } catch (error) {
      caught = error;
    }
    const serialized = `${(caught as Error).message}\n${(caught as Error).stack ?? ''}\n${JSON.stringify(caught)}`;
    expect(serialized).not.toContain(secretKey);
  });
});
