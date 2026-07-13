import { describe, expect, it } from 'vitest';

import type { GenerationResponse, Provider } from '@courtwork/provider/types';

import { runTurn } from './turn-runner.js';
import { TurnPendingInteractionError, createMemoryTurnStore } from './turn-store.js';
import type { InteractionRequestedEventInput, TurnEvent } from './types.js';

const requested: InteractionRequestedEventInput = {
  type: 'interaction_requested',
  turnId: 'turn-1',
  requestId: 'interaction-1',
  packageId: 'pkg',
  templateId: 'pkg.review',
  kind: 'confirmation',
  question: '是否继续',
  options: [{ id: 'yes', label: '继续' }],
  skippable: false,
  anchorPolicy: 'none',
  uiTemplateId: 'question-card',
  sourceAnchors: [],
};

function countingProvider(counter: { calls: number; providerRequestId?: string }): Provider {
  return {
    id: 'provider-a',
    modelId: 'model-a',
    async *stream(_request, options) {
      counter.calls += 1;
      counter.providerRequestId = options?.requestId;
      const requestId = options?.requestId ?? 'missing';
      yield { type: 'started', requestId, seq: 0, providerId: 'provider-a', modelId: 'model-a' };
      yield { type: 'content_delta', requestId, seq: 1, delta: '正文' };
      yield { type: 'completed', requestId, seq: 2, finishReason: 'stop' };
    },
    async generate(): Promise<GenerationResponse> {
      throw new Error('not used');
    },
  };
}

describe('runTurn interaction gate and identity split', () => {
  it('rejects pending interaction before provider call or lifecycle publication', async () => {
    const store = createMemoryTurnStore();
    store.appendInteractionRequested(requested);
    const counter = { calls: 0 };
    const published: TurnEvent[] = [];

    await expect(runTurn({
      turnId: 'turn-1',
      providerRequestId: 'provider-1',
      provider: countingProvider(counter),
      request: { messages: [{ role: 'user', content: 'continue' }] },
      store,
      onEvent: (event) => published.push(event),
    })).rejects.toBeInstanceOf(TurnPendingInteractionError);
    expect(counter.calls).toBe(0);
    expect(published).toEqual([]);
    expect(store.replayTurn('turn-1').state).toBe('pending_interaction');
  });

  it('allows resolved_waiting_resume, continues turn seq, and uses providerRequestId only for provider lifecycle', async () => {
    const store = createMemoryTurnStore(() => '2026-07-14T00:00:00.000Z');
    store.appendInteractionRequested(requested);
    store.resolveInteraction({
      requestId: 'interaction-1', actor: { channelId: 'cli', actorId: 'user-1' },
      answer: { kind: 'option', optionId: 'yes' },
    });
    const counter = { calls: 0, providerRequestId: undefined as string | undefined };
    const published: TurnEvent[] = [];

    const record = await runTurn({
      turnId: 'turn-1',
      providerRequestId: 'provider-1',
      provider: countingProvider(counter),
      request: { messages: [{ role: 'user', content: 'continue' }] },
      store,
      onEvent: (event) => published.push(event),
    });

    expect(counter).toEqual({ calls: 1, providerRequestId: 'provider-1' });
    expect(published[0]).toMatchObject({ type: 'turn_started', turnId: 'turn-1', seq: 2, providerRequestId: 'provider-1' });
    expect(published.every((event) => 'providerRequestId' in event)).toBe(true);
    expect(published.some((event) => 'requestId' in event)).toBe(false);
    expect(record).toMatchObject({
      status: 'completed', turnId: 'turn-1', providerRequestId: 'provider-1', assistantMessage: '正文',
    });
    expect(record).not.toHaveProperty('requestId');
    expect(store.replayTurn('turn-1')).toMatchObject({ state: 'completed', terminal: record });
    expect(store.events('turn-1').map((event) => event.type)).toEqual([
      'interaction_requested', 'interaction_resolved',
    ]);
  });
});
