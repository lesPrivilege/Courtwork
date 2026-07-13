import { describe, expect, it } from 'vitest';

import type {
  GenerationRequest,
  GenerationResponse,
  Provider,
  ProviderStreamEvent,
  ProviderStreamOptions,
} from '@courtwork/provider/types';

import { createMemoryTurnStore } from './turn-store.js';
import { runTurn, type TurnEvent } from './turn-runner.js';

const request: GenerationRequest = { messages: [{ role: 'user', content: 'test' }] };

function providerFrom(events: readonly ProviderStreamEvent[] | ((options?: ProviderStreamOptions) => AsyncIterable<ProviderStreamEvent>)): Provider {
  return {
    id: 'provider-a',
    modelId: 'model-a',
    async *stream(_request, options) {
      const source = typeof events === 'function' ? events(options) : fromEvents(events);
      yield* source;
    },
    async generate(): Promise<GenerationResponse> {
      throw new Error('TURN-1 only consumes Provider.stream');
    },
  };
}

async function* fromEvents(events: readonly ProviderStreamEvent[]): AsyncIterable<ProviderStreamEvent> {
  for (const event of events) yield event;
}

function baseEvents(requestId = 'request-1'): ProviderStreamEvent[] {
  return [
    { type: 'started', requestId, seq: 0, providerId: 'provider-a', modelId: 'model-a' },
    { type: 'reasoning_delta', requestId, seq: 1, delta: '先核对' },
    { type: 'content_delta', requestId, seq: 2, delta: '结' },
    { type: 'content_delta', requestId, seq: 3, delta: '论' },
    { type: 'usage', requestId, seq: 4, inputTokens: 12, outputTokens: 5 },
    { type: 'completed', requestId, seq: 5, finishReason: 'stop' },
  ];
}

function terminalEvents(events: readonly TurnEvent[]) {
  return events.filter((event) => event.type === 'turn_completed' || event.type === 'turn_failed');
}

describe('runTurn', () => {
  it('projects a valid provider stream into a strongly correlated lifecycle and persists its replayable final state', async () => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();

    const record = await runTurn({
      turnId: 'turn-1',
      requestId: 'request-1',
      provider: providerFrom(baseEvents()),
      request,
      store,
      onEvent: (event) => published.push(event),
      now: () => '2026-07-13T00:00:00.000Z',
    });

    expect(published.map((event) => event.type)).toEqual([
      'turn_started',
      'assistant_message_started',
      'reasoning_started',
      'reasoning_delta',
      'assistant_message_delta',
      'assistant_message_delta',
      'reasoning_completed',
      'assistant_message_completed',
      'turn_completed',
    ]);
    expect(published.map((event) => event.seq)).toEqual(published.map((_, index) => index));
    expect(new Set(published.map((event) => event.turnId))).toEqual(new Set(['turn-1']));
    expect(new Set(published.map((event) => event.requestId))).toEqual(new Set(['request-1']));
    expect(record).toEqual({
      status: 'completed',
      turnId: 'turn-1',
      requestId: 'request-1',
      providerId: 'provider-a',
      modelId: 'model-a',
      assistantMessage: '结论',
      reasoning: { status: 'present', content: '先核对' },
      usage: { inputTokens: 12, outputTokens: 5 },
      finishReason: 'stop',
      completedAt: '2026-07-13T00:00:00.000Z',
    });
    expect(store.get('turn-1')).toEqual(record);
    expect(terminalEvents(published)).toHaveLength(1);
  });

  it('records reasoning as explicitly absent and never fabricates reasoning events', async () => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
      { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '正文' },
      { type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'stop' },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record.reasoning).toEqual({ status: 'absent' });
    expect(published.some((event) => event.type.startsWith('reasoning_'))).toBe(false);
    expect(published.at(-1)).toMatchObject({ type: 'turn_completed', reasoning: { status: 'absent' } });
  });

  it.each([
    { label: 'empty', delta: '' },
    { label: 'whitespace-only', delta: '  \n ' },
  ])('refuses $label assistant content instead of reporting success', async ({ delta }) => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
      { type: 'content_delta', requestId: 'request-1', seq: 1, delta },
      { type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'stop' },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(published.some((event) => event.type === 'assistant_message_completed')).toBe(false);
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
  });

  it('converges provider cancellation to the sole terminal event and persists the failure', async () => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
      { type: 'content_delta', requestId: 'request-1', seq: 1, delta: 'partial' },
      { type: 'failed', requestId: 'request-1', seq: 2, kind: 'canceled', message: '用户取消', retryable: false },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({
      status: 'failed',
      assistantMessage: 'partial',
      reasoning: { status: 'absent' },
      failure: { kind: 'canceled', message: '用户取消', retryable: false },
    });
    expect(terminalEvents(published)).toEqual([
      expect.objectContaining({
        type: 'turn_failed',
        failure: expect.objectContaining({ kind: 'canceled' }),
      }),
    ]);
    expect(store.get('turn-1')).toEqual(record);
  });

  it('turns an AbortSignal into a deterministic canceled terminal even before provider start', async () => {
    const controller = new AbortController();
    controller.abort();
    const published: TurnEvent[] = [];

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider: providerFrom([]), request,
      store: createMemoryTurnStore(), signal: controller.signal,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'canceled' } });
    expect(terminalEvents(published)).toHaveLength(1);
  });

  it('does not hang when an in-flight provider ignores AbortSignal cancellation', async () => {
    const controller = new AbortController();
    const published: TurnEvent[] = [];
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const provider = providerFrom(async function* () {
      yield { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' };
      await new Promise<never>(() => undefined);
    });

    const running = runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider, request,
      store: createMemoryTurnStore(), signal: controller.signal,
      onEvent: (event) => {
        published.push(event);
        if (event.type === 'turn_started') markStarted();
      },
    });
    await started;
    controller.abort();

    const record = await Promise.race([
      running,
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('turn cancellation hung')), 50)),
    ]);
    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'canceled' } });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
  });

  it.each([
    {
      label: 'requestId drift',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'other-request', seq: 1, delta: '正文' },
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'duplicate seq',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'request-1', seq: 0, delta: '正文' },
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'out-of-order seq',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'request-1', seq: 2, delta: '正文' },
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'event after terminal',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '正文' },
        { type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'stop' },
        { type: 'content_delta', requestId: 'request-1', seq: 3, delta: '不得接纳' },
      ] satisfies ProviderStreamEvent[],
    },
  ])('rejects $label with one protocol failure terminal', async ({ events }) => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider: providerFrom(events), request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
    expect(published.some((event) => event.type === 'turn_completed')).toBe(false);
  });

  it('rejects a provider stream whose started identity disagrees with the configured provider', async () => {
    const published: TurnEvent[] = [];
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-b', modelId: 'model-a' },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', requestId: 'request-1', provider, request, store: createMemoryTurnStore(),
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(published).toEqual([expect.objectContaining({ type: 'turn_failed', seq: 0 })]);
  });
});
