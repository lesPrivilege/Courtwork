import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { createOpenAICompatibleProvider } from './openai-compatible-provider.js';
import { DEEPSEEK_QUIRK_PROFILE, type ProviderQuirkProfile } from './quirk-profile.js';
import {
  clearStreamEvidence,
  readStreamEvidence,
  recordStreamEvidence,
  type StreamEvidenceEntry,
} from './stream-evidence.js';
import type { ProviderStreamEvent, ProviderTransport } from './types.js';

/**
 * PROVIDER-STREAM-1（真机第四轮 I，P0）：结构化分支（responseSchema → generateStructured 聚合）
 * 此前对底层异常零收编——任何真流失败（HTTP 错误/校验耗尽/中断/未知异常）直接抛穿异步生成器，
 * 打到 core turn-runner 的协议外守卫（「Provider stream threw outside the closed failure protocol」
 * 裸透 UI）。本册红证：注入协议外异常反例，断言 stream() 恒以闭合失败协议收尾（failed 事件携
 * kind/retryable），绝不抛出；证据留证脱敏（零案件内容/密钥入证）。
 */

const SCHEMA = z.object({ ok: z.boolean() }).strict();

function structuredProvider(
  fetchImpl: typeof fetch,
  extra: {
    maxValidationRetries?: number;
    timeoutMs?: number;
    transport?: ProviderTransport;
    profile?: ProviderQuirkProfile;
  } = {},
) {
  return createOpenAICompatibleProvider(extra.profile ?? DEEPSEEK_QUIRK_PROFILE, {
    auth: { kind: 'api_key', apiKey: 'sk-test' },
    billing: { kind: 'metered' },
    modelId: 'deepseek-v4-flash',
    fetchImpl,
    maxTransportRetries: 0,
    maxValidationRetries: extra.maxValidationRetries ?? 0,
    ...(extra.timeoutMs !== undefined ? { timeoutMs: extra.timeoutMs } : {}),
    ...(extra.transport ? { transport: extra.transport } : {}),
  });
}

async function collect(provider: ReturnType<typeof structuredProvider>, signal?: AbortSignal) {
  const events: ProviderStreamEvent[] = [];
  const request = {
    systemPrompt: 'sys',
    messages: [{ role: 'user' as const, content: '生成结构化结果' }],
    responseSchema: SCHEMA,
  };
  for await (const event of provider.stream(request, { requestId: 'req-closed', ...(signal ? { signal } : {}) })) {
    events.push(event);
  }
  return events;
}

function sse(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
}

function sseResponse(content: string): Response {
  return new Response(sse(content), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const UNUSED_FETCH: typeof fetch = async () => {
  throw new Error('fetch should not be reached');
};

const TIMEOUT_TRANSPORT: ProviderTransport = {
  async *stream(request) {
    yield {
      type: 'failed',
      requestId: request.requestId,
      kind: 'timeout',
      message: 'provider timed out before completion',
      retryable: true,
    };
  },
};

const UNSUPPORTED_PROFILE: ProviderQuirkProfile = {
  ...DEEPSEEK_QUIRK_PROFILE,
  responseFormat: { tier: 'unsupported' },
};

describe('五类已知错误族均收编为 failed 终态', () => {
  it('ProviderAuthError 不抛穿', async () => {
    const events = await collect(structuredProvider(async () => new Response('', { status: 401 })));
    expect(events[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'auth', retryable: false });
  });

  it('ProviderHttpError 不抛穿', async () => {
    clearStreamEvidence();
    const events = await collect(structuredProvider(async () =>
      new Response('{"error":{"message":"SECRET-CASE-CONTENT-9X"}}', { status: 400 })));
    expect(events[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'model', retryable: false });
    expect(readStreamEvidence().at(-1)).toMatchObject({ errorName: 'ProviderHttpError', kind: 'model' });
    expect(JSON.stringify(readStreamEvidence())).not.toContain('SECRET-CASE-CONTENT-9X');
  });

  it('ProviderTimeoutError 不抛穿', async () => {
    const events = await collect(structuredProvider(UNUSED_FETCH, { transport: TIMEOUT_TRANSPORT }));
    expect(events[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'timeout', retryable: true });

    const controller = new AbortController();
    controller.abort();
    const canceled = await collect(structuredProvider(async () => sseResponse('{"ok":true}')), controller.signal);
    expect(canceled[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(canceled.at(-1)).toMatchObject({ type: 'failed', kind: 'canceled', retryable: false });
  });

  it('ProviderInvalidResponseError 不抛穿', async () => {
    clearStreamEvidence();
    const events = await collect(structuredProvider(async () => sseResponse('CASE-FRAGMENT-INVALID-9X')));
    expect(events[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'invalid_response', retryable: false });
    expect(JSON.stringify(events)).not.toContain('CASE-FRAGMENT-INVALID-9X');
    expect(JSON.stringify(readStreamEvidence())).not.toContain('CASE-FRAGMENT-INVALID-9X');

    const baseEntry: StreamEvidenceEntry = {
      phase: 'structured',
      providerId: 'deepseek',
      modelId: 'deepseek-chat',
      errorName: 'ProviderInvalidResponseError',
      kind: 'invalid_response',
      retryable: false,
      attempts: 1,
    };
    const compileOnlyFreeTextInjection = () => {
      recordStreamEvidence({
        ...baseEntry,
        // @ts-expect-error evidence 信封禁止自由文本 message 字段。
        message: 'CASE-FRAGMENT-INVALID-9X',
      });
    };
    expect(compileOnlyFreeTextInjection).toBeTypeOf('function');
    const injected = { ...baseEntry, message: 'CASE-FRAGMENT-INVALID-9X' } as StreamEvidenceEntry;
    expect(() => recordStreamEvidence(injected)).toThrow();
    expect(JSON.stringify(readStreamEvidence())).not.toContain('CASE-FRAGMENT-INVALID-9X');

    class CaseFragmentError extends Error {}
    clearStreamEvidence();
    await collect(structuredProvider(async () => {
      throw new CaseFragmentError('SECRET-CASE-CONTENT-9X');
    }));
    expect(readStreamEvidence().at(-1)).toMatchObject({ errorName: 'UnknownError', kind: 'network' });
    expect(JSON.stringify(readStreamEvidence())).not.toMatch(/CaseFragment|SECRET-CASE/);
  });

  it('ProviderResponseFormatUnsupportedError 不抛穿', async () => {
    const events = await collect(structuredProvider(UNUSED_FETCH, { profile: UNSUPPORTED_PROFILE }));
    expect(events[0]).toMatchObject({ type: 'started', seq: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'model', retryable: false });
  });
});
