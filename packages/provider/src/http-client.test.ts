import { describe, expect, it, vi } from 'vitest';
import { sendChatCompletion, type ChatCompletionRequestBody, type HttpClientConfig } from './http-client.js';
import { ProviderAuthError, ProviderHttpError, ProviderTimeoutError } from './errors.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';

const TEST_PROFILE: ProviderQuirkProfile = {
  providerId: 'test-provider',
  baseUrl: 'https://example.invalid/v1',
  responseFormat: { tier: 'json_object' },
  reasoningFieldCandidates: ['reasoning_content'],
  recommendedModels: ['test-model'],
  reasoningRoute: { kind: 'request_field', field: 'reasoning_effort', values: { standard: 'low', deep: 'high' } },
  parameterCompatibility: { structuredOutputWithDeepReasoning: 'supported' },
};

function sseResponse(chunks: unknown[], status = 200): Response {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

function baseBody(): ChatCompletionRequestBody {
  return { model: 'test-model', messages: [{ role: 'user', content: 'hi' }], stream: true, stream_options: { include_usage: true } };
}

function noDelayConfig(overrides: Partial<HttpClientConfig> = {}): HttpClientConfig {
  return {
    apiKey: 'sk-test-key',
    timeoutMs: 5_000,
    maxTransportRetries: 2,
    fetchImpl: vi.fn(),
    delay: async () => {},
    ...overrides,
  };
}

describe('sendChatCompletion — happy path', () => {
  it('accumulates delta.content and delta.reasoning_content across SSE chunks, and captures usage from the final chunk', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse([
        { choices: [{ delta: { content: 'He', reasoning_content: 'thinking-' } }] },
        { choices: [{ delta: { content: 'llo', reasoning_content: 'more' } }] },
        { choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } },
      ]),
    );
    const result = await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }));
    expect(result).toEqual({
      content: 'Hello',
      reasoningContent: 'thinking-more',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
  });

  it('sends the Authorization header built from config.apiKey and POSTs to `${baseUrl}/chat/completions`', async () => {
    const fetchImpl = vi.fn(async () => sseResponse([{ choices: [{ delta: { content: 'ok' } }] }]));
    await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, apiKey: 'sk-abc123' }));
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.invalid/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer sk-abc123' }),
      }),
    );
  });

  it('returns reasoningContent as undefined (not empty string) when no reasoning delta ever appears', async () => {
    const fetchImpl = vi.fn(async () => sseResponse([{ choices: [{ delta: { content: 'x' } }] }]));
    const result = await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }));
    expect(result.reasoningContent).toBeUndefined();
  });
});

describe('sendChatCompletion — auth errors are not retried', () => {
  it('throws ProviderAuthError immediately on 401, without retrying', async () => {
    const fetchImpl = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    await expect(sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }))).rejects.toThrow(ProviderAuthError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderAuthError immediately on 403, without retrying', async () => {
    const fetchImpl = vi.fn(async () => new Response('forbidden', { status: 403 }));
    await expect(sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }))).rejects.toThrow(ProviderAuthError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('sendChatCompletion — non-retryable client errors fail fast', () => {
  it('throws ProviderHttpError immediately on 400, without retrying', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad request', { status: 400 }));
    await expect(sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }))).rejects.toThrow(ProviderHttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('sendChatCompletion — retryable transport failures', () => {
  it('retries on 503 and succeeds once a later attempt returns 200', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls < 3) return new Response('unavailable', { status: 503 });
      return sseResponse([{ choices: [{ delta: { content: 'recovered' } }] }]);
    });
    const result = await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, maxTransportRetries: 2 }));
    expect(result.content).toBe('recovered');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('throws ProviderHttpError after exhausting maxTransportRetries on persistent 500s', async () => {
    const fetchImpl = vi.fn(async () => new Response('server error', { status: 500 }));
    await expect(sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, maxTransportRetries: 2 }))).rejects.toThrow(
      ProviderHttpError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 次初始 + 2 次重试
  });

  it('retries on 429 (rate limit)', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response('rate limited', { status: 429 });
      return sseResponse([{ choices: [{ delta: { content: 'ok' } }] }]);
    });
    const result = await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl }));
    expect(result.content).toBe('ok');
  });

  it('uses the injected delay function between retries (proves backoff is exercised without real waiting)', async () => {
    const delaySpy = vi.fn(async () => {});
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response('unavailable', { status: 503 });
      return sseResponse([{ choices: [{ delta: { content: 'ok' } }] }]);
    });
    await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, delay: delaySpy }));
    expect(delaySpy).toHaveBeenCalledTimes(1);
  });

  it('does not retry an ambiguous network error because the provider may already be processing the request', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('connection reset after request write');
    });
    await expect(
      sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, maxTransportRetries: 2 })),
    ).rejects.toThrow('connection reset');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('sendChatCompletion — timeout', () => {
  it('throws ProviderTimeoutError when fetchImpl never settles within timeoutMs (simulated via abort-aware fake)', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    await expect(
      sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 5, maxTransportRetries: 2 })),
    ).rejects.toThrow(ProviderTimeoutError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderTimeoutError when the response body stream stalls after headers arrive (body-phase timeout, not just connection-phase)', async () => {
    // fetch() 立刻 resolve 一个 200 响应（头已到达），但响应体的 ReadableStream 从不
    // enqueue、从不 close——模拟"连上了、但模型迟迟不吐完整流"这个最常见的真实超时场景。
    // 增量 reader.read() 与统一超时 promise 竞争；即使头已到达，body 阶段仍会按时失败。
    const fetchImpl = vi.fn(async () => {
      const stallingBody = new ReadableStream<Uint8Array>({
        start() {},
      });
      return new Response(stallingBody, { status: 200 });
    });
    await expect(
      sendChatCompletion(
        TEST_PROFILE,
        baseBody(),
        noDelayConfig({ fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 5, maxTransportRetries: 0 }),
      ),
    ).rejects.toThrow(ProviderTimeoutError);
  });
});

describe('sendChatCompletion — credential discipline (docs/decisions/ADR-005-data-security.md 红线)', () => {
  it('never leaks apiKey into a thrown error message, stack, or serialized form, even on repeated failures', async () => {
    const secretKey = 'sk-super-secret-leak-canary-9f8e7d6c';
    const fetchImpl = vi.fn(async () => new Response('server exploded', { status: 500 }));
    let caught: unknown;
    try {
      await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, apiKey: secretKey, maxTransportRetries: 0 }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    const serialized = `${(caught as Error).message}\n${(caught as Error).stack ?? ''}\n${JSON.stringify(caught)}`;
    expect(serialized).not.toContain(secretKey);
  });

  it('never leaks apiKey on a 401 auth error', async () => {
    const secretKey = 'sk-another-secret-canary-1a2b3c';
    const fetchImpl = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    let caught: unknown;
    try {
      await sendChatCompletion(TEST_PROFILE, baseBody(), noDelayConfig({ fetchImpl, apiKey: secretKey }));
    } catch (error) {
      caught = error;
    }
    const serialized = `${(caught as Error).message}\n${(caught as Error).stack ?? ''}\n${JSON.stringify(caught)}`;
    expect(serialized).not.toContain(secretKey);
  });
});
