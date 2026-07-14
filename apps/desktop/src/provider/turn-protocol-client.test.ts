import { describe, expect, it, vi } from 'vitest';
import type {
  TurnEvent,
  TurnJournalEntry,
} from '@courtwork/core/turn-protocol';
import type { Provider, ProviderStreamEvent } from '@courtwork/provider/types';

import {
  TurnProtocolClient,
  createEmptyTurnProjection,
  createLocalStorageTurnJournalBackend,
  projectTurn,
} from './turn-protocol-client';
import { sendChatTurn } from './chat-client';
import { DEFAULT_MODEL_CONFIG } from './model-config';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function memoryClient(storage = new MemoryStorage()) {
  return { storage, client: new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage)) };
}

function providerFrom(
  stream: (requestId: string, signal?: AbortSignal) => AsyncIterable<ProviderStreamEvent>,
  generate = vi.fn(async () => { throw new Error('generate must not be called'); }),
): Provider {
  return {
    id: 'deepseek',
    modelId: DEFAULT_MODEL_CONFIG.modelId,
    stream(_request, options) {
      return stream(options?.requestId ?? 'missing', options?.signal);
    },
    generate,
  };
}

async function* successfulEvents(requestId: string, reasoning = ''): AsyncIterable<ProviderStreamEvent> {
  let seq = 0;
  yield { type: 'started', requestId, seq: seq++, providerId: 'deepseek', modelId: DEFAULT_MODEL_CONFIG.modelId };
  if (reasoning) yield { type: 'reasoning_delta', requestId, seq: seq++, delta: reasoning };
  yield { type: 'content_delta', requestId, seq: seq++, delta: '第一段' };
  yield { type: 'content_delta', requestId, seq: seq++, delta: '第二段' };
  yield { type: 'usage', requestId, seq: seq++, inputTokens: 7, outputTokens: 5 };
  yield { type: 'completed', requestId, seq, finishReason: 'stop' };
}

describe('projectTurn', () => {
  it('机械覆盖 started/reasoning/content/completed/usage 且正文按 delta 累积', () => {
    const base = { turnId: 'turn-1', providerRequestId: 'provider-1', seq: 0, emittedAt: '2026-07-14T00:00:00.000Z' } as const;
    const events: TurnEvent[] = [
      { ...base, type: 'turn_started', providerId: 'deepseek', modelId: 'deepseek-chat' },
      { ...base, seq: 1, type: 'assistant_message_started' },
      { ...base, seq: 2, type: 'reasoning_started' },
      { ...base, seq: 3, type: 'reasoning_delta', delta: '核对' },
      { ...base, seq: 4, type: 'assistant_message_delta', delta: '正文' },
      {
        ...base, seq: 5, type: 'provider_notice',
        notice: { code: 'reasoning_downgraded_for_structured_output', message: '已降为标准模式', requested: 'deep', applied: 'standard' },
      },
      { ...base, seq: 6, type: 'reasoning_completed', content: '核对' },
      { ...base, seq: 7, type: 'assistant_message_completed', content: '正文' },
      {
        ...base, seq: 8, type: 'turn_completed', assistantMessage: '正文',
        reasoning: { status: 'present', content: '核对' }, usage: { inputTokens: 3, outputTokens: 2 },
        notices: [{ code: 'reasoning_downgraded_for_structured_output', message: '已降为标准模式', requested: 'deep', applied: 'standard' }],
        finishReason: 'stop',
      },
    ];
    const result = events.reduce(projectTurn, createEmptyTurnProjection('turn-1'));
    expect(result).toMatchObject({
      status: 'completed', assistantMessage: '正文',
      reasoning: { status: 'present', content: '核对' }, usage: { inputTokens: 3, outputTokens: 2 },
      notices: [expect.objectContaining({ code: 'reasoning_downgraded_for_structured_output' })],
    });
  });

  it('覆盖 failed/canceled 与 absent reasoning，不把失败伪装成正文', () => {
    const failed = projectTurn(createEmptyTurnProjection('turn-failed'), {
      type: 'turn_failed', turnId: 'turn-failed', providerRequestId: 'provider-failed', seq: 0,
      emittedAt: '2026-07-14T00:00:00.000Z', failure: { kind: 'canceled', message: 'Turn canceled', retryable: false },
      reasoning: { status: 'absent' },
    });
    expect(failed).toMatchObject({ status: 'failed', assistantMessage: '', reasoning: { status: 'absent' }, failure: { kind: 'canceled' } });
  });
});

describe('sendChatTurn through core runTurn', () => {
  it('在 provider terminal 前发布真实 content delta，并且从不调用 generate 聚合', async () => {
    const { client } = memoryClient();
    let releaseTerminal!: () => void;
    const terminalGate = new Promise<void>((resolve) => { releaseTerminal = resolve; });
    const generate = vi.fn(async () => { throw new Error('generate must not be called'); });
    const provider = providerFrom(async function* (requestId) {
      yield { type: 'started', requestId, seq: 0, providerId: 'deepseek', modelId: DEFAULT_MODEL_CONFIG.modelId };
      yield { type: 'content_delta', requestId, seq: 1, delta: '终态前可见' };
      await terminalGate;
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    }, generate);
    const projections: string[] = [];
    let settled = false;
    const pending = sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: '问题' }], {
      providerFactory: () => provider,
      onProjection: (projection) => projections.push(`${projection.status}:${projection.assistantMessage}`),
    }).finally(() => { settled = true; });

    await vi.waitFor(() => expect(projections).toContain('running:终态前可见'));
    expect(settled).toBe(false);
    expect(generate).not.toHaveBeenCalled();
    releaseTerminal();
    const result = await pending;
    expect(result.projection).toMatchObject({ status: 'completed', assistantMessage: '终态前可见', reasoning: { status: 'absent' } });
    expect(client.replayTurn(result.turnId).terminal).toMatchObject({ status: 'completed', assistantMessage: '终态前可见' });
  });

  it.each([
    { label: 'reasoning present', reasoning: '真实推理', expected: { status: 'present', content: '真实推理' } },
    { label: 'reasoning absent', reasoning: '', expected: { status: 'absent' } },
  ])('投影 $label', async ({ reasoning, expected }) => {
    const { client } = memoryClient();
    const result = await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: '问题' }], {
      providerFactory: () => providerFrom((requestId) => successfulEvents(requestId, reasoning)),
    });
    expect(result.projection.reasoning).toEqual(expected);
    expect(result.projection.usage).toEqual({ inputTokens: 7, outputTokens: 5 });
  });

  it.each([
    {
      label: 'provider failure',
      stream: async function* (requestId: string): AsyncIterable<ProviderStreamEvent> {
        yield { type: 'started', requestId, seq: 0, providerId: 'deepseek', modelId: DEFAULT_MODEL_CONFIG.modelId };
        yield { type: 'failed', requestId, seq: 1, kind: 'network', message: 'offline', retryable: true };
      },
      kind: 'network',
    },
    {
      label: 'empty body',
      stream: async function* (requestId: string): AsyncIterable<ProviderStreamEvent> {
        yield { type: 'started', requestId, seq: 0, providerId: 'deepseek', modelId: DEFAULT_MODEL_CONFIG.modelId };
        yield { type: 'completed', requestId, seq: 1, finishReason: 'stop' };
      },
      kind: 'invalid_response',
    },
  ])('终态诚实处理 $label', async ({ stream, kind }) => {
    const { client } = memoryClient();
    const result = await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: '问题' }], {
      providerFactory: () => providerFrom(stream),
    });
    expect(result.projection).toMatchObject({ status: 'failed', failure: { kind }, reasoning: { status: 'absent' } });
  });

  it('AbortController 只通过 core 产生 turn_failed(canceled)', async () => {
    const { client } = memoryClient();
    const controller = new AbortController();
    const published: TurnEvent[] = [];
    const provider = providerFrom(async function* (requestId, signal) {
      yield { type: 'started', requestId, seq: 0, providerId: 'deepseek', modelId: DEFAULT_MODEL_CONFIG.modelId };
      await new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve(), { once: true }));
    });
    const pending = sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: '停止' }], {
      providerFactory: () => provider, signal: controller.signal, onEvent: (event) => published.push(event),
    });
    await vi.waitFor(() => expect(published.some((event) => event.type === 'turn_started')).toBe(true));
    controller.abort();
    const result = await pending;
    expect(result.projection).toMatchObject({ status: 'failed', failure: { kind: 'canceled' } });
    expect(published.at(-1)).toMatchObject({ type: 'turn_failed', failure: { kind: 'canceled' } });
  });
});

describe('localStorage TurnJournalBackend', () => {
  it('同一 envelope 维护已知 turnId 索引，刷新后可 replay pending interaction', () => {
    const storage = new MemoryStorage();
    const first = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    first.store.appendInteractionRequested({
      type: 'interaction_requested', turnId: 'turn-pending', requestId: 'request-pending', packageId: 'pkg', templateId: 'pkg.question',
      kind: 'confirmation', question: '快照问题', options: [{ id: 'yes', label: '确认' }], skippable: false,
      anchorPolicy: 'none', uiTemplateId: 'question-card', sourceAnchors: [],
    });
    const refreshed = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    expect(refreshed.knownTurnIds()).toEqual(['turn-pending']);
    expect(refreshed.replayTurn('turn-pending')).toMatchObject({ state: 'pending_interaction', pendingInteraction: { requestId: 'request-pending' } });
  });

  it('journal corruption fail closed 且不清除原始历史', () => {
    const storage = new MemoryStorage();
    storage.setItem('courtwork.turn-journal.v1', '{broken-json');
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    expect(() => client.knownTurnIds()).toThrow(/corrupt/i);
    expect(storage.getItem('courtwork.turn-journal.v1')).toBe('{broken-json');
  });

  it('localStorage 写入失败直接抛出，不伪装成 CAS contention', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    expect(() => client.store.appendInteractionRequested({
      type: 'interaction_requested', turnId: 'turn-quota', requestId: 'request-quota', packageId: 'pkg', templateId: 'pkg.question',
      kind: 'confirmation', question: '快照问题', options: [{ id: 'yes', label: '确认' }], skippable: false,
      anchorPolicy: 'none', uiTemplateId: 'question-card', sourceAnchors: [],
    })).toThrow(/quota/i);
  });

  it('持久内容不含 user prompt、secret 或 transport 配置', async () => {
    const { storage, client } = memoryClient();
    const secretPrompt = 'secret-user-prompt-should-not-persist';
    await sendChatTurn(client, DEFAULT_MODEL_CONFIG, [{ role: 'user', content: secretPrompt }], {
      providerFactory: () => providerFrom((requestId) => successfulEvents(requestId)),
    });
    const persisted = storage.getItem('courtwork.turn-journal.v1') ?? '';
    expect(persisted).not.toContain(secretPrompt);
    expect(persisted).not.toMatch(/apiKey|authorization|transport|systemPrompt/);
    const parsed = JSON.parse(persisted) as { entries: TurnJournalEntry[]; turnIds: string[] };
    expect(parsed.turnIds).toHaveLength(1);
    expect(parsed.entries).toHaveLength(1);
  });
});
