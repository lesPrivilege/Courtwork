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
      providerRequestId: 'request-1',
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
    expect(new Set(published.map((event) => (
      'providerRequestId' in event ? event.providerRequestId : undefined
    )))).toEqual(new Set(['request-1']));
    expect(record).toEqual({
      status: 'completed',
      turnId: 'turn-1',
      providerRequestId: 'request-1',
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

  it('does not publish success or persist a snapshot until EOF follows the provider completed event', async () => {
    const published: TurnEvent[] = [];
    const store = createMemoryTurnStore();
    let releaseEof!: () => void;
    let markTerminalYielded!: () => void;
    const eofGate = new Promise<void>((resolve) => {
      releaseEof = resolve;
    });
    const terminalYielded = new Promise<void>((resolve) => {
      markTerminalYielded = resolve;
    });
    const provider = providerFrom(async function* () {
      yield { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' };
      yield { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '正文' };
      yield { type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'stop' };
      markTerminalYielded();
      await eofGate;
    });

    const running = runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });
    await terminalYielded;

    expect(terminalEvents(published)).toEqual([]);
    expect(store.list()).toEqual([]);

    releaseEof();
    await expect(running).resolves.toMatchObject({ status: 'completed', assistantMessage: '正文' });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_completed' })]);
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record.reasoning).toEqual({ status: 'absent' });
    expect(published.some((event) => event.type.startsWith('reasoning_'))).toBe(false);
    expect(published.at(-1)).toMatchObject({ type: 'turn_completed', reasoning: { status: 'absent' } });
  });

  it('treats whitespace-only reasoning as absent instead of publishing a blank reasoning lifecycle', async () => {
    const published: TurnEvent[] = [];
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
      { type: 'reasoning_delta', requestId: 'request-1', seq: 1, delta: '  \n\t' },
      { type: 'content_delta', requestId: 'request-1', seq: 2, delta: '正文' },
      { type: 'completed', requestId: 'request-1', seq: 3, finishReason: 'stop' },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request,
      store: createMemoryTurnStore(), onEvent: (event) => published.push(event),
    });

    expect(record.reasoning).toEqual({ status: 'absent' });
    expect(published.some((event) => event.type.startsWith('reasoning_'))).toBe(false);
    expect(published.at(-1)).toMatchObject({ type: 'turn_completed', reasoning: { status: 'absent' } });
  });

  it('preserves buffered leading whitespace once reasoning becomes substantive', async () => {
    const published: TurnEvent[] = [];
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
      { type: 'reasoning_delta', requestId: 'request-1', seq: 1, delta: ' \n' },
      { type: 'reasoning_delta', requestId: 'request-1', seq: 2, delta: '分析' },
      { type: 'content_delta', requestId: 'request-1', seq: 3, delta: '正文' },
      { type: 'completed', requestId: 'request-1', seq: 4, finishReason: 'stop' },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request,
      store: createMemoryTurnStore(), onEvent: (event) => published.push(event),
    });

    expect(record.reasoning).toEqual({ status: 'present', content: ' \n分析' });
    expect(published.filter((event) => event.type === 'reasoning_started')).toHaveLength(1);
    expect(published.filter((event) => event.type === 'reasoning_delta')).toEqual([
      expect.objectContaining({ delta: ' \n分析' }),
    ]);
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(published.some((event) => event.type === 'assistant_message_completed')).toBe(false);
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
  });

  it('maps provider EOF without a terminal event to one invalid_response failure', async () => {
    const published: TurnEvent[] = [];
    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', request,
      provider: providerFrom([
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '未完成正文' },
      ]),
      store: createMemoryTurnStore(), onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
  });

  it('maps an out-of-band provider exception to one scrubbed invalid_response failure', async () => {
    const published: TurnEvent[] = [];
    const provider = providerFrom(async function* () {
      yield { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' };
      throw new Error('Authorization: Bearer acceptance-secret');
    });

    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request,
      store: createMemoryTurnStore(), onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(JSON.stringify({ record, published })).not.toContain('acceptance-secret');
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request, store,
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider: providerFrom([]), request,
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request,
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
      turnId: 'turn-1', providerRequestId: 'request-1', provider: providerFrom(events), request, store,
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
    expect(published.some((event) => event.type === 'turn_completed')).toBe(false);
  });

  it.each([
    {
      label: 'negative usage',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'usage', requestId: 'request-1', seq: 1, inputTokens: -1, outputTokens: 1 },
        { type: 'content_delta', requestId: 'request-1', seq: 2, delta: '正文' },
        { type: 'completed', requestId: 'request-1', seq: 3, finishReason: 'stop' },
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'duplicate usage',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'usage', requestId: 'request-1', seq: 1, inputTokens: 1, outputTokens: 1 },
        { type: 'usage', requestId: 'request-1', seq: 2, inputTokens: 1, outputTokens: 1 },
        { type: 'content_delta', requestId: 'request-1', seq: 3, delta: '正文' },
        { type: 'completed', requestId: 'request-1', seq: 4, finishReason: 'stop' },
      ] satisfies ProviderStreamEvent[],
    },
  ])('rejects $label as invalid_response', async ({ events }) => {
    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider: providerFrom(events), request,
      store: createMemoryTurnStore(),
    });
    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
  });

  it.each([
    {
      label: 'unknown stream event',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        {
          type: 'transport_debug', requestId: 'request-1', seq: 1,
          rawBody: 'acceptance-transport-secret', authorization: 'Bearer acceptance-api-key',
        } as unknown as ProviderStreamEvent,
        { type: 'content_delta', requestId: 'request-1', seq: 2, delta: '不得成功' },
        { type: 'completed', requestId: 'request-1', seq: 3, finishReason: 'stop' },
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'unknown completion reason',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '不得成功' },
        {
          type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'tool_calls',
        } as unknown as ProviderStreamEvent,
      ] satisfies ProviderStreamEvent[],
    },
    {
      label: 'unknown failure kind',
      events: [
        { type: 'started', requestId: 'request-1', seq: 0, providerId: 'provider-a', modelId: 'model-a' },
        {
          type: 'failed', requestId: 'request-1', seq: 1,
          kind: 'tool_error', message: 'unexpected', retryable: false,
        } as unknown as ProviderStreamEvent,
      ] satisfies ProviderStreamEvent[],
    },
  ])('rejects runtime $label outside the closed provider protocol without leaking transport fields', async ({ events }) => {
    const published: TurnEvent[] = [];
    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider: providerFrom(events), request,
      store: createMemoryTurnStore(), onEvent: (item) => published.push(item),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(terminalEvents(published)).toEqual([expect.objectContaining({ type: 'turn_failed' })]);
    expect(JSON.stringify({ record, published })).not.toContain('acceptance-transport-secret');
    expect(JSON.stringify({ record, published })).not.toContain('acceptance-api-key');
  });

  it.each([
    { providerId: 'provider-b', modelId: 'model-a' },
    { providerId: 'provider-a', modelId: 'model-b' },
  ])('rejects a provider stream whose started identity is $providerId/$modelId', async ({ providerId, modelId }) => {
    const published: TurnEvent[] = [];
    const provider = providerFrom([
      { type: 'started', requestId: 'request-1', seq: 0, providerId, modelId },
    ]);

    const record = await runTurn({
      turnId: 'turn-1', providerRequestId: 'request-1', provider, request, store: createMemoryTurnStore(),
      onEvent: (event) => published.push(event),
    });

    expect(record).toMatchObject({ status: 'failed', failure: { kind: 'invalid_response' } });
    expect(published).toEqual([expect.objectContaining({ type: 'turn_failed', seq: 0 })]);
  });
});
