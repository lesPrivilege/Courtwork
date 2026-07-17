import { describe, expect, it } from 'vitest';
import { sendChatTurn } from './chat-client';
import { DEFAULT_MODEL_CONFIG, type ModelConfig } from './model-config';
import { TurnProtocolClient, createLocalStorageTurnJournalBackend } from './turn-protocol-client';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function protocolClient() {
  return new TurnProtocolClient(createLocalStorageTurnJournalBackend(new MemoryStorage()));
}

function sseResponse(lines: string[], status = 200): Response {
  return new Response(`${lines.join('\n\n')}\n\n`, {
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
    const result = await sendChatTurn(protocolClient(), config, [{ role: 'user', content: '你好' }], { fetchImpl });

    expect(result.projection.assistantMessage).toBe('好的');
    expect(result.projection.reasoning).toEqual({ status: 'present', content: '想' });
    expect(result.projection.usage).toEqual({ inputTokens: 3, outputTokens: 2, rawUsage: { prompt_tokens: 3, completion_tokens: 2 } });
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
    await sendChatTurn(protocolClient(), DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'hi' }], { fetchImpl });
    expect(body.thinking).toEqual({ type: 'disabled' });
  });

  it('rejects a forged custom provider id instead of guessing OpenAI-compatible capabilities', async () => {
    const forged = { ...DEFAULT_MODEL_CONFIG, providerId: 'custom', modelId: 'internal-model' } as unknown as ModelConfig;
    const fetchImpl: typeof fetch = async () => sseResponse(['data: [DONE]']);
    await expect(sendChatTurn(protocolClient(), forged, [{ role: 'user', content: 'hi' }], { fetchImpl }))
      .rejects.toThrow(/未登记|not registered/i);
  });

  it('鉴权失败原样进入 core 分型（401 → 拒绝并携带 provider 语义）', async () => {
    const fetchImpl: typeof fetch = async () => sseResponse(['data: [DONE]'], 401);
    const result = await sendChatTurn(protocolClient(), DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'hi' }], { fetchImpl });
    expect(result.projection).toMatchObject({ status: 'failed', failure: { kind: 'auth', message: expect.stringMatching(/HTTP 401/) } });
  });
});

/** CHAT-MEMORY-1：memory 段作为 generic-chat 低频前缀段注入 system——基身份仍是稳定前缀。 */
describe('chat 面 memory 注入', () => {
  function systemContent(body: Record<string, unknown>): string {
    const messages = (body.messages ?? []) as Array<{ role: string; content: string }>;
    return messages.find((m) => m.role === 'system')?.content ?? '';
  }

  it('无 memory 段：system 仅基身份（前缀不漂移）', async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl: typeof fetch = async (_i, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return sseResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]']);
    };
    await sendChatTurn(protocolClient(), DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'hi' }], { fetchImpl });
    const system = systemContent(body);
    expect(system).toContain('Courtwork 的协作助手');
    expect(system).not.toContain('[长期记忆]');
  });

  it('有 memory 段：追加于基身份之后，基前缀逐字节不动', async () => {
    const captured: string[] = [];
    const fetchImpl: typeof fetch = async (_i, init) => {
      captured.push(systemContent(JSON.parse(String(init?.body)) as Record<string, unknown>));
      return sseResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]']);
    };
    const memorySegment = '[长期记忆]\n- 偏好：简短回答';
    const client = protocolClient();
    await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'a' }], { fetchImpl });
    await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'b' }], { fetchImpl, memorySegment });
    const [withoutMemory, withMemory] = captured;
    expect(withMemory).toContain('[长期记忆]');
    expect(withMemory).toContain('简短回答');
    // 基身份是 with-memory 的严格前缀——账本推进/注入 memory 都不动前缀字节。
    expect(withMemory.startsWith(withoutMemory)).toBe(true);
  });

  it('WORK-TURN-1 H：workContextSegment 排 memory 之后进系统提示；缺省字节等同（稳定前缀律）', async () => {
    const captured: string[] = [];
    const fetchImpl: typeof fetch = async (_i, init) => {
      captured.push(systemContent(JSON.parse(String(init?.body)) as Record<string, unknown>));
      return sseResponse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]']);
    };
    const memorySegment = '[长期记忆]\n- 偏好：简短回答';
    const workContextSegment = '[案件语境]\n案根：《合成卷宗案》\n卷宗材料（2 件）';
    const client = protocolClient();
    await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'a' }], { fetchImpl, memorySegment });
    await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: 'b' }], {
      fetchImpl,
      memorySegment,
      workContextSegment,
    });
    const [memoryOnly, withWork] = captured;
    expect(withWork).toContain('[案件语境]');
    expect(withWork).toContain('卷宗材料（2 件）');
    // 案语境段排 memory 之后：memory-only 系统提示是 with-work 的严格前缀（更易变段靠尾）。
    expect(withWork.startsWith(memoryOnly)).toBe(true);
    // 缺省不传 = 与 memory-only 逐字节相同（第一轮已证），无悬垂差异。
    expect(memoryOnly).not.toContain('[案件语境]');
  });
});
