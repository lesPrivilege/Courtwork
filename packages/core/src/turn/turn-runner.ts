import type {
  GenerationRequest,
  GenerationUsage,
  Provider,
  ProviderStreamEvent,
} from '@courtwork/provider/types';

import type { TurnStore } from './turn-store.js';
import type {
  PersistedTurn,
  TurnEvent,
  TurnEventInput,
  TurnFailure,
  TurnReasoning,
} from './types.js';

export type { TurnEvent } from './types.js';

export interface RunTurnOptions {
  turnId: string;
  requestId: string;
  provider: Provider;
  request: GenerationRequest;
  store: TurnStore;
  signal?: AbortSignal;
  onEvent?: (event: TurnEvent) => void;
  now?: () => string;
}

type ProviderTerminal = Extract<ProviderStreamEvent, { type: 'completed' | 'failed' }>;
const ABORTED = Symbol('aborted');

const CANCELED_FAILURE: TurnFailure = {
  kind: 'canceled',
  message: 'Turn canceled',
  retryable: false,
};

function protocolFailure(message: string): TurnFailure {
  return { kind: 'invalid_response', message, retryable: false };
}

function reasoningSnapshot(content: string): TurnReasoning {
  return content.length === 0 ? { status: 'absent' } : { status: 'present', content };
}

function validUsage(event: Extract<ProviderStreamEvent, { type: 'usage' }>): boolean {
  return Number.isInteger(event.inputTokens)
    && event.inputTokens >= 0
    && Number.isInteger(event.outputTokens)
    && event.outputTokens >= 0;
}

function nextProviderEvent(
  iterator: AsyncIterator<ProviderStreamEvent>,
  signal?: AbortSignal,
): Promise<IteratorResult<ProviderStreamEvent> | typeof ABORTED> {
  if (!signal) return Promise.resolve(iterator.next());
  if (signal.aborted) return Promise.resolve(ABORTED);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: (value: IteratorResult<ProviderStreamEvent> | typeof ABORTED) => void, value: IteratorResult<ProviderStreamEvent> | typeof ABORTED) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => finish(resolve, ABORTED);
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve(iterator.next()).then(
      (result) => finish(resolve, result),
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export async function runTurn(options: RunTurnOptions): Promise<PersistedTurn> {
  const {
    turnId,
    requestId,
    provider,
    request,
    store,
    signal,
    onEvent = () => undefined,
    now = () => new Date().toISOString(),
  } = options;

  if (turnId.trim().length === 0 || requestId.trim().length === 0) {
    throw new Error('turnId and requestId must be non-empty');
  }
  if (store.get(turnId)) {
    throw new Error(`Turn ${turnId} already exists`);
  }

  let turnSeq = 0;
  const emit = (input: TurnEventInput): TurnEvent => {
    const event = { ...input, turnId, requestId, seq: turnSeq++, emittedAt: now() } as TurnEvent;
    onEvent(event);
    return event;
  };

  let assistantMessage = '';
  let reasoningContent = '';
  let usage: GenerationUsage | undefined;
  let providerTerminal: ProviderTerminal | undefined;
  let providerStarted = false;
  let expectedProviderSeq = 0;
  let failure: TurnFailure | undefined;

  const fail = (turnFailure: TurnFailure): PersistedTurn => {
    const failedAt = now();
    const record: PersistedTurn = {
      status: 'failed',
      turnId,
      requestId,
      providerId: provider.id,
      modelId: provider.modelId,
      ...(assistantMessage.length > 0 ? { assistantMessage } : {}),
      reasoning: reasoningSnapshot(reasoningContent),
      ...(usage ? { usage } : {}),
      failure: turnFailure,
      failedAt,
    };
    store.save(record);
    emit({
      type: 'turn_failed',
      failure: turnFailure,
      ...(assistantMessage.length > 0 ? { partialAssistantMessage: assistantMessage } : {}),
      reasoning: record.reasoning,
      ...(usage ? { usage } : {}),
    });
    return record;
  };

  if (signal?.aborted) return fail(CANCELED_FAILURE);

  let iterator: AsyncIterator<ProviderStreamEvent> | undefined;
  try {
    iterator = provider.stream(request, { requestId, signal })[Symbol.asyncIterator]();
    while (true) {
      const next = await nextProviderEvent(iterator, signal);
      if (next === ABORTED) {
        failure = CANCELED_FAILURE;
        break;
      }
      if (next.done) break;
      const event = next.value;
      if (providerTerminal) {
        failure = protocolFailure(`Provider event ${event.type} arrived after terminal event ${providerTerminal.type}`);
        break;
      }
      if (event.requestId !== requestId) {
        failure = protocolFailure(`Provider requestId drift: expected ${requestId}, received ${event.requestId}`);
        break;
      }
      if (event.seq !== expectedProviderSeq) {
        failure = protocolFailure(`Provider seq violation: expected ${expectedProviderSeq}, received ${event.seq}`);
        break;
      }
      expectedProviderSeq += 1;

      if (!providerStarted && event.type !== 'started') {
        failure = protocolFailure(`Provider stream must start with started, received ${event.type}`);
        break;
      }

      switch (event.type) {
        case 'started':
          if (providerStarted) {
            failure = protocolFailure('Provider emitted started more than once');
          } else if (event.providerId !== provider.id || event.modelId !== provider.modelId) {
            failure = protocolFailure('Provider started identity does not match the configured provider');
          } else {
            providerStarted = true;
            emit({ type: 'turn_started', providerId: event.providerId, modelId: event.modelId });
            emit({ type: 'assistant_message_started' });
          }
          break;
        case 'reasoning_delta':
          if (event.delta.length > 0) {
            if (reasoningContent.length === 0) emit({ type: 'reasoning_started' });
            reasoningContent += event.delta;
            emit({ type: 'reasoning_delta', delta: event.delta });
          }
          break;
        case 'content_delta':
          if (event.delta.length > 0) {
            assistantMessage += event.delta;
            emit({ type: 'assistant_message_delta', delta: event.delta });
          }
          break;
        case 'usage':
          if (usage) {
            failure = protocolFailure('Provider emitted usage more than once');
          } else if (!validUsage(event)) {
            failure = protocolFailure('Provider emitted invalid token usage');
          } else {
            usage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
          }
          break;
        case 'completed':
        case 'failed':
          providerTerminal = event;
          break;
      }

      if (failure) break;
    }
  } catch {
    failure = signal?.aborted
      ? CANCELED_FAILURE
      : protocolFailure('Provider stream threw outside the closed failure protocol');
  } finally {
    if (failure && iterator?.return) {
      try {
        void Promise.resolve(iterator.return()).catch(() => undefined);
      } catch {
        // The turn already has a deterministic failure; iterator cleanup cannot replace that terminal.
      }
    }
  }

  if (failure) return fail(failure);
  if (!providerTerminal) {
    return fail(signal?.aborted ? CANCELED_FAILURE : protocolFailure('Provider stream ended without a terminal event'));
  }
  if (providerTerminal.type === 'failed') {
    return fail({
      kind: providerTerminal.kind,
      message: providerTerminal.message,
      retryable: providerTerminal.retryable,
    });
  }
  if (assistantMessage.trim().length === 0) {
    return fail(protocolFailure('Provider completed without non-empty assistant content'));
  }

  const completedAt = now();
  const reasoning = reasoningSnapshot(reasoningContent);
  const record: PersistedTurn = {
    status: 'completed',
    turnId,
    requestId,
    providerId: provider.id,
    modelId: provider.modelId,
    assistantMessage,
    reasoning,
    ...(usage ? { usage } : {}),
    finishReason: providerTerminal.finishReason,
    completedAt,
  };
  store.save(record);

  if (reasoning.status === 'present') emit({ type: 'reasoning_completed', content: reasoning.content });
  emit({ type: 'assistant_message_completed', content: assistantMessage });
  emit({
    type: 'turn_completed',
    assistantMessage,
    reasoning,
    ...(usage ? { usage } : {}),
    finishReason: providerTerminal.finishReason,
  });
  return record;
}
