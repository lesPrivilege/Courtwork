import { describe, expect, it } from 'vitest';

import type {
  GenerationRequest,
  GenerationResponse,
  Provider,
  ProviderStreamEvent,
} from '@courtwork/provider/types';
import type { InteractionTemplateRegistry, InteractionTemplateSnapshot } from '@courtwork/registry';
import type { QuoteClaim } from '@courtwork/schemas';

import type { MaterialTextLayer } from '../citation/resolver.js';
import {
  InteractionAnchorResolutionError,
  UnknownInteractionTemplateError,
  requestInteraction,
} from './interaction-coordinator.js';
import { createTurnHarnessRuntime } from './turn-harness-runtime.js';
import { createTurnRunner } from './turn-runner.js';
import {
  TurnPendingInteractionError,
  UnknownInteractionRequestError,
  createMemoryTurnStore,
} from './turn-store.js';
import type { TurnEvent } from './types.js';

const NOW = '2026-07-14T00:00:00.000Z';
const REQUEST: GenerationRequest = { messages: [{ role: 'user', content: 'test' }] };
const TEMPLATE: InteractionTemplateSnapshot = {
  id: 'pkg.review',
  kind: 'single_choice',
  question: '请选择处理方式',
  options: [
    { id: 'accept', label: '接受' },
    { id: 'revise', label: '修正' },
  ],
  skippable: false,
  anchorPolicy: 'required',
  uiTemplateId: 'question-card',
};
const MATERIALS: readonly MaterialTextLayer[] = [{
  fileId: 'file-1',
  blocks: [{
    blockId: 'block-1',
    page: 1,
    text: '前文。需要确认的原句。后文。',
    rangeBase: 0,
    textLayerVersion: 'sha256:text-v1',
  }],
}];
const CLAIM: QuoteClaim = {
  fileId: 'file-1',
  page: 1,
  blockId: 'block-1',
  exactQuote: '需要确认的原句',
};

function registry(): InteractionTemplateRegistry {
  return {
    get(packageId, templateId) {
      return packageId === 'pkg' && templateId === TEMPLATE.id ? TEMPLATE : undefined;
    },
  };
}

function interactionInput() {
  return {
    turnId: 'turn-interaction',
    requestId: 'interaction-1',
    packageId: 'pkg',
    templateId: TEMPLATE.id,
    anchorRefs: [CLAIM],
  };
}

function providerFrom(
  events: readonly ProviderStreamEvent[],
  onStream: (request: GenerationRequest) => void = () => undefined,
): Provider {
  return {
    id: 'provider-a',
    modelId: 'model-a',
    async *stream(request) {
      onStream(request);
      for (const event of events) yield event;
    },
    async generate(): Promise<GenerationResponse> {
      throw new Error('Harness runtime must use the existing TurnRunnerPort');
    },
  };
}

function completedEvents(requestId: string): ProviderStreamEvent[] {
  return [
    { type: 'started', requestId, seq: 0, providerId: 'provider-a', modelId: 'model-a' },
    { type: 'reasoning_delta', requestId, seq: 1, delta: '核对' },
    { type: 'content_delta', requestId, seq: 2, delta: '结论' },
    { type: 'completed', requestId, seq: 3, finishReason: 'stop' },
  ];
}

describe('createTurnHarnessRuntime', () => {
  it('returns only frozen narrow ports and ignores arbitrary lifecycle hooks', async () => {
    const store = createMemoryTurnStore(() => NOW);
    let providerCalls = 0;
    let injectedHookCalls = 0;
    const seenRequests: GenerationRequest[] = [];
    const runtime = createTurnHarnessRuntime({
      provider: providerFrom(completedEvents('provider-request-1'), (request) => {
        providerCalls += 1;
        seenRequests.push(structuredClone(request));
      }),
      store,
      templateRegistry: registry(),
      now: () => NOW,
      beforeProviderRequest: () => { injectedHookCalls += 1; },
      rewriteEvent: () => { injectedHookCalls += 1; },
    } as Parameters<typeof createTurnHarnessRuntime>[0]);

    expect(Object.keys(runtime).sort()).toEqual(['interactions', 'turns']);
    expect(Object.keys(runtime.turns)).toEqual(['run']);
    expect(Object.keys(runtime.interactions).sort()).toEqual(['replay', 'request', 'resolve']);
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(runtime.turns)).toBe(true);
    expect(Object.isFrozen(runtime.interactions)).toBe(true);
    expect(runtime).not.toHaveProperty('provider');
    expect(runtime).not.toHaveProperty('store');
    expect(runtime).not.toHaveProperty('templateRegistry');
    expect(runtime.interactions).not.toHaveProperty('events');

    await runtime.turns.run({
      turnId: 'turn-1',
      providerRequestId: 'provider-request-1',
      request: REQUEST,
    });

    expect(providerCalls).toBe(1);
    expect(seenRequests).toEqual([REQUEST]);
    expect(injectedHookCalls).toBe(0);
  });

  it('is mechanically equivalent to direct Turn runner construction', async () => {
    const directEvents: TurnEvent[] = [];
    const facadeEvents: TurnEvent[] = [];
    const directStore = createMemoryTurnStore(() => NOW);
    const facadeStore = createMemoryTurnStore(() => NOW);
    const direct = createTurnRunner(
      providerFrom(completedEvents('provider-request-1')),
      directStore,
      () => NOW,
    );
    const runtime = createTurnHarnessRuntime({
      provider: providerFrom(completedEvents('provider-request-1')),
      store: facadeStore,
      templateRegistry: registry(),
      now: () => NOW,
    });
    const baseInput = {
      turnId: 'turn-1',
      providerRequestId: 'provider-request-1',
      request: REQUEST,
    };

    const directTerminal = await direct.run({ ...baseInput, onEvent: (event) => directEvents.push(event) });
    const facadeTerminal = await runtime.turns.run({ ...baseInput, onEvent: (event) => facadeEvents.push(event) });

    expect(facadeTerminal).toEqual(directTerminal);
    expect(facadeEvents).toEqual(directEvents);
    expect(runtime.interactions.replay('turn-1')).toEqual(directStore.replayTurn('turn-1'));
  });

  it('delegates request, resolve and replay to the same interaction algorithms with first-wins', () => {
    const directStore = createMemoryTurnStore(() => NOW);
    const facadeStore = createMemoryTurnStore(() => NOW);
    const templateRegistry = registry();
    const runtime = createTurnHarnessRuntime({
      provider: providerFrom([]),
      store: facadeStore,
      templateRegistry,
      now: () => NOW,
    });

    const directRequested = requestInteraction(interactionInput(), {
      templateRegistry,
      materials: MATERIALS,
      store: directStore,
    });
    const facadeRequested = runtime.interactions.request(interactionInput(), { materials: MATERIALS });
    expect(facadeRequested).toEqual(directRequested);
    expect(runtime.interactions.replay('turn-interaction')).toEqual(directStore.replayTurn('turn-interaction'));

    const answer = {
      requestId: 'interaction-1',
      actor: { channelId: 'desktop', actorId: 'user-1' },
      answer: { kind: 'option' as const, optionId: 'accept' },
    };
    const directResolved = directStore.resolveInteraction(answer);
    const facadeResolved = runtime.interactions.resolve(answer);
    expect(facadeResolved).toEqual(directResolved);
    expect(runtime.interactions.replay('turn-interaction')).toEqual(directStore.replayTurn('turn-interaction'));

    expect(() => directStore.resolveInteraction(answer)).toThrow(UnknownInteractionRequestError);
    expect(() => runtime.interactions.resolve(answer)).toThrow(UnknownInteractionRequestError);
    expect(runtime.interactions.replay('turn-interaction')).toEqual(directStore.replayTurn('turn-interaction'));
  });

  it('cannot bypass the injected template registry or the system anchor resolver', () => {
    const missingTemplateStore = createMemoryTurnStore(() => NOW);
    const missingTemplateRuntime = createTurnHarnessRuntime({
      provider: providerFrom([]),
      store: missingTemplateStore,
      templateRegistry: { get: () => undefined },
      now: () => NOW,
    });

    expect(() => missingTemplateRuntime.interactions.request(
      interactionInput(),
      { materials: MATERIALS },
    )).toThrow(UnknownInteractionTemplateError);
    expect(missingTemplateRuntime.interactions.replay('turn-interaction')).toMatchObject({
      state: 'idle',
      events: [],
    });

    const unresolvedAnchorStore = createMemoryTurnStore(() => NOW);
    const unresolvedAnchorRuntime = createTurnHarnessRuntime({
      provider: providerFrom([]),
      store: unresolvedAnchorStore,
      templateRegistry: registry(),
      now: () => NOW,
    });

    expect(() => unresolvedAnchorRuntime.interactions.request(
      interactionInput(),
      { materials: [] },
    )).toThrow(InteractionAnchorResolutionError);
    expect(unresolvedAnchorRuntime.interactions.replay('turn-interaction')).toMatchObject({
      state: 'idle',
      events: [],
    });
  });

  it('does not let request extras inject context or journal events', () => {
    const store = createMemoryTurnStore(() => NOW);
    let injectedHookCalls = 0;
    const runtime = createTurnHarnessRuntime({
      provider: providerFrom([]),
      store,
      templateRegistry: registry(),
      now: () => NOW,
    });

    expect(() => runtime.interactions.request({
      ...interactionInput(),
      emittedAt: 'forged',
      rewriteContext: () => { injectedHookCalls += 1; },
    } as ReturnType<typeof interactionInput>, {
      materials: MATERIALS,
      rewriteEvent: () => { injectedHookCalls += 1; },
    } as { materials: readonly MaterialTextLayer[] })).toThrow(/unknown or missing fields/);

    expect(injectedHookCalls).toBe(0);
    expect(runtime.interactions.replay('turn-interaction')).toMatchObject({ state: 'idle', events: [] });
  });

  it('preserves pending-interaction fail-closed semantics before provider invocation', async () => {
    const store = createMemoryTurnStore(() => NOW);
    let providerCalls = 0;
    const runtime = createTurnHarnessRuntime({
      provider: providerFrom(completedEvents('provider-request-pending'), () => { providerCalls += 1; }),
      store,
      templateRegistry: registry(),
      now: () => NOW,
    });
    runtime.interactions.request(interactionInput(), { materials: MATERIALS });

    await expect(runtime.turns.run({
      turnId: 'turn-interaction',
      providerRequestId: 'provider-request-pending',
      request: REQUEST,
    })).rejects.toThrow(TurnPendingInteractionError);

    expect(providerCalls).toBe(0);
    expect(runtime.interactions.replay('turn-interaction').state).toBe('pending_interaction');
  });
});
