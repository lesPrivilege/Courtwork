import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import {
  createDeepSeekProvider,
  createDoubaoProvider,
  createOpenAICompatibleProvider,
  createQwenProvider,
} from './openai-compatible-provider.js';
import { ProviderNotConfiguredError, ProviderNotImplementedError } from './errors.js';
import { DEEPSEEK_QUIRK_PROFILE } from './quirk-profile.js';

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
  it('assembles a GenerationResponse from the underlying SSE call, including usage and reasoningContent', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        [
          `data: ${JSON.stringify({ choices: [{ delta: { content: '{"a":1}', reasoning_content: 'because' } }] })}`,
          `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } })}`,
          'data: [DONE]',
        ].join('\n\n') + '\n\n',
        { status: 200 },
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
    const fetchImpl = vi.fn(async () => new Response(sseBody('just a sentence, no json'), { status: 200 }));
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

describe('named factories wire the correct per-provider quirk profile (flat config shape, auth/billing fixed internally)', () => {
  it('createDeepSeekProvider posts to the DeepSeek base URL, and forwards modelId/id correctly', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('ok'), { status: 200 }));
    const provider = createDeepSeekProvider({ apiKey: 'sk-x', modelId: 'deepseek-v4-pro', fetchImpl, delay: async () => {} });
    expect(provider.id).toBe('deepseek');
    expect(provider.modelId).toBe('deepseek-v4-pro');
    await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.deepseek.com/v1/chat/completions', expect.anything());
  });

  it('createQwenProvider posts to the DashScope compatible-mode base URL, and forwards modelId/id correctly', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('ok'), { status: 200 }));
    const provider = createQwenProvider({ apiKey: 'sk-x', modelId: 'qwen3.5-plus', fetchImpl, delay: async () => {} });
    expect(provider.id).toBe('qwen');
    expect(provider.modelId).toBe('qwen3.5-plus');
    await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(fetchImpl).toHaveBeenCalledWith('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', expect.anything());
  });

  it('createDoubaoProvider posts to the Volcengine Ark base URL (/api/v3, not /v1), and forwards modelId/id correctly', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody('ok'), { status: 200 }));
    const provider = createDoubaoProvider({ apiKey: 'sk-x', modelId: 'doubao-seed-1.6', fetchImpl, delay: async () => {} });
    expect(provider.id).toBe('doubao');
    expect(provider.modelId).toBe('doubao-seed-1.6');
    await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
    expect(fetchImpl).toHaveBeenCalledWith('https://ark.cn-beijing.volces.com/api/v3/chat/completions', expect.anything());
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
