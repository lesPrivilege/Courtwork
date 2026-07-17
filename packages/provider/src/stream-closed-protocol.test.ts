import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { createOpenAICompatibleProvider } from './openai-compatible-provider.js';
import { DEEPSEEK_QUIRK_PROFILE } from './quirk-profile.js';
import { clearStreamEvidence, readStreamEvidence } from './stream-evidence.js';
import type { ProviderStreamEvent } from './types.js';

/**
 * PROVIDER-STREAM-1（真机第四轮 I，P0）：结构化分支（responseSchema → generateStructured 聚合）
 * 此前对底层异常零收编——任何真流失败（HTTP 错误/校验耗尽/中断/未知异常）直接抛穿异步生成器，
 * 打到 core turn-runner 的协议外守卫（「Provider stream threw outside the closed failure protocol」
 * 裸透 UI）。本册红证：注入协议外异常反例，断言 stream() 恒以闭合失败协议收尾（failed 事件携
 * kind/retryable），绝不抛出；证据留证脱敏（零案件内容/密钥入证）。
 */

const SCHEMA = z.object({ ok: z.boolean() }).strict();

function structuredProvider(fetchImpl: typeof fetch, extra: { maxValidationRetries?: number } = {}) {
  return createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, {
    auth: { kind: 'api_key', apiKey: 'sk-test' },
    billing: { kind: 'metered' },
    modelId: 'deepseek-v4-flash',
    fetchImpl,
    maxTransportRetries: 0,
    maxValidationRetries: extra.maxValidationRetries ?? 0,
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

describe('结构化分支闭合失败协议（异常零抛穿）', () => {
  it('HTTP 400（如 json_object×thinking 组合被拒）→ failed(kind=model) 事件，不抛出', async () => {
    clearStreamEvidence();
    const fetchImpl: typeof fetch = async () =>
      new Response('{"error":{"message":"SECRET-CASE-CONTENT-9X bad request"}}', { status: 400 });
    const events = await collect(structuredProvider(fetchImpl));
    expect(events[0]).toMatchObject({ type: 'started' });
    const failed = events.at(-1);
    expect(failed).toMatchObject({ type: 'failed', kind: 'model', retryable: false });
    // 报文产品语（中文），不裸透英文技术措辞。
    expect((failed as { message: string }).message).not.toMatch(/Provider |protocol/);
  });

  it('校验耗尽（模型只回自由文本）→ failed(kind=invalid_response) 事件，不抛出', async () => {
    const fetchImpl: typeof fetch = async () => sseResponse('这不是 JSON 只是自由文本');
    const events = await collect(structuredProvider(fetchImpl, { maxValidationRetries: 0 }));
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'invalid_response', retryable: false });
  });

  it('已中止信号 → failed(kind=canceled) 事件（结构化分支此前整体无视 signal）', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: typeof fetch = async () => sseResponse('{"ok":true}');
    const events = await collect(structuredProvider(fetchImpl), controller.signal);
    expect(events.at(-1)).toMatchObject({ type: 'failed', kind: 'canceled' });
  });

  it('未知底层异常 → failed(kind=network) 事件兜底，不抛出', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('weird transport boom SECRET-CASE-CONTENT-9X');
    };
    const events = await collect(structuredProvider(fetchImpl));
    expect(events.at(-1)).toMatchObject({ type: 'failed' });
    expect(['network', 'endpoint']).toContain((events.at(-1) as { kind: string }).kind);
  });

  it('证据留证脱敏：错误信封级元数据在册，案件内容/响应正文零入证', async () => {
    clearStreamEvidence();
    const fetchImpl: typeof fetch = async () =>
      new Response('{"error":{"message":"SECRET-CASE-CONTENT-9X"}}', { status: 400 });
    await collect(structuredProvider(fetchImpl));
    const evidence = readStreamEvidence();
    expect(evidence.length).toBeGreaterThan(0);
    const last = evidence.at(-1);
    expect(last).toMatchObject({ phase: 'structured', errorName: 'ProviderHttpError', kind: 'model' });
    expect(JSON.stringify(evidence)).not.toContain('SECRET-CASE-CONTENT-9X');
  });
});
