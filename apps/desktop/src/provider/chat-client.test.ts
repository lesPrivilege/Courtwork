import { describe, expect, it } from 'vitest';
import { createKeychainChatFetch, sendChatTurn } from './chat-client';
import { DEFAULT_MODEL_CONFIG, type ModelConfig } from './model-config';

function sseResponse(lines: string[], status = 200): Response {
  return new Response(lines.join('\n'), {
    status,
    headers: { 'content-type': 'text/event-stream' },
  });
}

describe('chat 面真 API 客户端（Rust 窄面代理 + core 组装复用）', () => {
  it('全链：quirk 组装进请求体，SSE 增量归一为 content/reasoning', async () => {
    const captured: { url?: string; body?: Record<string, unknown>; auth?: string | null } = {};
    const fetchImpl: typeof fetch = async (input, init) => {
      captured.url = String(input);
      captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      captured.auth = new Headers(init?.headers).get('authorization');
      return sseResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"想"}}]}',
        'data: {"choices":[{"delta":{"content":"好"}}]}',
        'data: {"choices":[{"delta":{"content":"的"}}],"usage":{"prompt_tokens":3,"completion_tokens":2}}',
        'data: [DONE]',
      ]);
    };

    const config = { ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' as const };
    const result = await sendChatTurn(config, [{ role: 'user', content: '你好' }], { fetchImpl });

    expect(result.content).toBe('好的');
    expect(result.reasoningContent).toBe('想');
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 2 });
    expect(captured.url).toBe('https://api.deepseek.com/v1/chat/completions');
    // #41：deep 档经 thinking 请求字段，模型名 = 用户所选（不被路由覆盖）
    expect(captured.body).toMatchObject({
      model: 'deepseek-v4-flash',
      stream: true,
      thinking: { type: 'enabled' },
    });
    // 占位 Authorization 只存在于 core→桥之间；真 key 由 Rust 注入
    expect(captured.auth).toBe('Bearer __keychain__');
  });

  it('standard 档显式发 thinking:disabled，不依赖 DeepSeek 默认思考态', async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl: typeof fetch = async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return sseResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]']);
    };
    await sendChatTurn(DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'hi' }], { fetchImpl });
    expect(body.thinking).toEqual({ type: 'disabled' });
  });

  it('rejects a forged custom provider id instead of guessing OpenAI-compatible capabilities', async () => {
    const forged = { ...DEFAULT_MODEL_CONFIG, providerId: 'custom', modelId: 'internal-model' } as unknown as ModelConfig;
    const fetchImpl: typeof fetch = async () => sseResponse(['data: [DONE]']);
    await expect(sendChatTurn(forged, [{ role: 'user', content: 'hi' }], { fetchImpl }))
      .rejects.toThrow(/未登记|not registered/i);
  });

  it('鉴权失败原样进入 core 分型（401 → 拒绝并携带 provider 语义）', async () => {
    const fetchImpl: typeof fetch = async () => sseResponse(['data: [DONE]'], 401);
    await expect(
      sendChatTurn(DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'hi' }], { fetchImpl }),
    ).rejects.toThrow(/deepseek/);
  });

  it('keychain 桥窄面：拒绝非对话补全请求（与 Rust 侧双侧同宽）', async () => {
    const bridge = createKeychainChatFetch();
    await expect(bridge('https://api.deepseek.com/v1/models', { method: 'POST' })).rejects.toThrow(TypeError);
    await expect(bridge('https://api.deepseek.com/v1/chat/completions', { method: 'GET' })).rejects.toThrow(TypeError);
  });
});
