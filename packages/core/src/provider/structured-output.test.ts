import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { generateStructured } from './structured-output.js';
import { ProviderInvalidResponseError, ProviderResponseFormatUnsupportedError } from './errors.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import type { HttpClientConfig } from './http-client.js';

const TestSchema = z.object({ greeting: z.string(), count: z.number() });

function profile(tier: ProviderQuirkProfile['responseFormat']['tier']): ProviderQuirkProfile {
  return { providerId: 'test-provider', baseUrl: 'https://example.invalid/v1', responseFormat: { tier }, reasoningFieldCandidates: ['reasoning_content'] };
}

function sseBody(payload: unknown): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(payload) } }] })}\n\ndata: [DONE]\n\n`;
}

function rawSseBody(rawContent: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: rawContent } }] })}\n\ndata: [DONE]\n\n`;
}

function httpConfig(fetchImpl: typeof fetch, overrides: Partial<HttpClientConfig> = {}): HttpClientConfig {
  return { apiKey: 'sk-test', timeoutMs: 5_000, maxTransportRetries: 0, fetchImpl, delay: async () => {}, ...overrides };
}

describe('generateStructured — no responseSchema (plain generation)', () => {
  it('passes content through untouched and never sets response_format on the request body', async () => {
    let capturedBody: unknown;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init!.body as string);
      return new Response(rawSseBody('plain free text, not json at all'), { status: 200 });
    });
    const result = await generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl as unknown as typeof fetch),
    });
    expect(result.content).toBe('plain free text, not json at all');
    expect((capturedBody as { response_format?: unknown }).response_format).toBeUndefined();
  });
});

describe('generateStructured — json_object tier (DeepSeek-like)', () => {
  it('sets response_format:{type:"json_object"} and augments the system prompt with a structure hint', async () => {
    let capturedBody: { response_format?: unknown; messages: { role: string; content: string }[] } | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init!.body as string);
      return new Response(sseBody({ greeting: 'hi', count: 1 }), { status: 200 });
    });
    const result = await generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl as unknown as typeof fetch),
    });
    expect(result.content).toBe(JSON.stringify({ greeting: 'hi', count: 1 }));
    expect(capturedBody?.response_format).toEqual({ type: 'json_object' });
    expect(capturedBody?.messages[0]).toMatchObject({ role: 'system' });
    expect(capturedBody?.messages[0].content).toMatch(/json/i);
  });
});

describe('generateStructured — json_schema_strict tier (Qwen-like)', () => {
  it('sends response_format:{type:"json_schema", json_schema:{strict:true, schema: <converted from zod>}}', async () => {
    let capturedBody: { response_format?: { type: string; json_schema?: { strict?: boolean; schema?: unknown } } } | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init!.body as string);
      return new Response(sseBody({ greeting: 'hi', count: 1 }), { status: 200 });
    });
    await generateStructured({
      profile: profile('json_schema_strict'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl as unknown as typeof fetch),
    });
    expect(capturedBody?.response_format?.type).toBe('json_schema');
    expect(capturedBody?.response_format?.json_schema?.strict).toBe(true);
    expect(capturedBody?.response_format?.json_schema?.schema).toMatchObject({
      type: 'object',
      properties: { greeting: { type: 'string' }, count: { type: 'number' } },
    });
  });
});

describe('generateStructured — retry with feedback on invalid JSON', () => {
  it('retries with the previous output + a correction message when the first attempt is not valid JSON, and succeeds on the second', async () => {
    let call = 0;
    let secondCallMessages: unknown;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      call += 1;
      const body = JSON.parse(init!.body as string);
      if (call === 1) return new Response(rawSseBody('not json at all'), { status: 200 });
      secondCallMessages = body.messages;
      return new Response(sseBody({ greeting: 'fixed', count: 2 }), { status: 200 });
    });
    const result = await generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl as unknown as typeof fetch),
    });
    expect(call).toBe(2);
    expect(JSON.parse(result.content)).toEqual({ greeting: 'fixed', count: 2 });
    const messages = secondCallMessages as { role: string; content: string }[];
    expect(messages.some((m) => m.role === 'assistant' && m.content === 'not json at all')).toBe(true);
    expect(messages.some((m) => m.role === 'user' && m.content.includes('上一次输出未通过校验'))).toBe(true);
  });
});

describe('generateStructured — retry with feedback on schema mismatch', () => {
  it('retries with the zod issue message when JSON is valid but fails schema validation, and succeeds on the second attempt', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) return new Response(sseBody({ greeting: 'hi' /* missing count */ }), { status: 200 });
      return new Response(sseBody({ greeting: 'hi', count: 1 }), { status: 200 });
    });
    const result = await generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl),
    });
    expect(call).toBe(2);
    expect(JSON.parse(result.content)).toEqual({ greeting: 'hi', count: 1 });
  });
});

describe('generateStructured — retries exhausted', () => {
  it('throws ProviderInvalidResponseError with suspectedSilentParamSwallow=true when every attempt fails to produce syntactically valid JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response(rawSseBody('still not json'), { status: 200 }));
    const promise = generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 1,
      httpConfig: httpConfig(fetchImpl),
    });
    await expect(promise).rejects.toThrow(ProviderInvalidResponseError);
    await expect(promise).rejects.toMatchObject({ suspectedSilentParamSwallow: true, attempts: 2 });
  });

  it('throws ProviderInvalidResponseError with suspectedSilentParamSwallow=false when at least one attempt parsed as JSON but never matched the schema', async () => {
    const fetchImpl = vi.fn(async () => new Response(sseBody({ greeting: 'hi' /* missing count, every time */ }), { status: 200 }));
    const promise = generateStructured({
      profile: profile('json_object'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: TestSchema,
      maxValidationRetries: 1,
      httpConfig: httpConfig(fetchImpl),
    });
    await expect(promise).rejects.toMatchObject({ suspectedSilentParamSwallow: false, attempts: 2 });
  });
});

describe('generateStructured — unsupported tier refuses immediately (MiniMax 判例的通用机制)', () => {
  it('throws ProviderResponseFormatUnsupportedError without making any HTTP call when tier is "unsupported" and responseSchema is requested', async () => {
    const fetchImpl = vi.fn();
    await expect(
      generateStructured({
        profile: profile('unsupported'),
        model: 'known-bad-model',
        messages: [{ role: 'user', content: 'go' }],
        responseSchema: TestSchema,
        maxValidationRetries: 2,
        httpConfig: httpConfig(fetchImpl),
      }),
    ).rejects.toThrow(ProviderResponseFormatUnsupportedError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does NOT throw for an "unsupported" tier profile when no responseSchema is requested (plain text generation is unaffected)', async () => {
    const fetchImpl = vi.fn(async () => new Response(rawSseBody('free text is fine'), { status: 200 }));
    const result = await generateStructured({
      profile: profile('unsupported'),
      model: 'known-bad-model',
      messages: [{ role: 'user', content: 'go' }],
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl),
    });
    expect(result.content).toBe('free text is fine');
  });
});

describe('generateStructured — zod→JSON Schema conversion failure falls back gracefully', () => {
  it('falls back to json_object + textual hint (does not throw) when the schema cannot be converted to JSON Schema', async () => {
    // z.custom() 是刻意选来触发 toJSONSchema 抛错的构造（无法表示为 JSON Schema）。
    const UnconvertableSchema = z.custom<{ weird: symbol }>(() => true);
    let capturedBody: { response_format?: unknown } | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init!.body as string);
      return new Response(sseBody({ ok: true }), { status: 200 });
    });
    const result = await generateStructured({
      profile: profile('json_schema_strict'),
      model: 'm',
      messages: [{ role: 'user', content: 'go' }],
      responseSchema: UnconvertableSchema as unknown as z.ZodTypeAny,
      maxValidationRetries: 2,
      httpConfig: httpConfig(fetchImpl as unknown as typeof fetch),
    });
    expect(capturedBody?.response_format).toEqual({ type: 'json_object' });
    expect(JSON.parse(result.content)).toEqual({ ok: true });
  });
});
