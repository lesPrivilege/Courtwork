import type {
  GenerationRequest,
  GenerationNotice,
  Provider,
  ProviderFailureKind,
  ProviderStreamEvent,
  ProviderUsage,
} from '@courtwork/provider/types';

import type { TurnStore } from './turn-store.js';
import { TurnPendingInteractionError } from './turn-store.js';
import type {
  PersistedTurn,
  ProviderTurnEventInput,
  TurnEvent,
  TurnFailure,
  TurnReasoning,
} from './types.js';

export type { TurnEvent } from './types.js';

export interface RunTurnOptions {
  turnId: string;
  providerRequestId: string;
  provider: Provider;
  request: GenerationRequest;
  store: TurnStore;
  signal?: AbortSignal;
  onEvent?: (event: TurnEvent) => void;
  now?: () => string;
}

/** Work/Chat composition boundary: callers receive one Turn engine, never Provider/TurnStore. */
export interface TurnRunnerPort {
  run(input: Omit<RunTurnOptions, 'provider' | 'store' | 'now'>): Promise<PersistedTurn>;
}

export function createTurnRunner(
  provider: Provider,
  store: TurnStore,
  now?: () => string,
): TurnRunnerPort {
  return {
    run(input) {
      return runTurn({ ...input, provider, store, ...(now ? { now } : {}) });
    },
  };
}

type ProviderTerminal = Extract<ProviderStreamEvent, { type: 'completed' | 'failed' }>;
const ABORTED = Symbol('aborted');

const CANCELED_FAILURE: TurnFailure = {
  kind: 'canceled',
  message: 'Turn canceled',
  retryable: false,
};

const PROVIDER_FAILURE_KINDS: ReadonlySet<ProviderFailureKind> = new Set([
  'auth',
  'rate_limit',
  'endpoint',
  'model',
  'timeout',
  'network',
  'protocol',
  'invalid_response',
  'canceled',
]);
const PROVIDER_FINISH_REASONS: ReadonlySet<string> = new Set([
  'stop',
  'length',
  'content_filter',
  'unknown',
]);

function protocolFailure(message: string): TurnFailure {
  return { kind: 'invalid_response', message, retryable: false };
}

function reasoningSnapshot(content: string): TurnReasoning {
  return content.length === 0 ? { status: 'absent' } : { status: 'present', content };
}

const USAGE_SLOT_KEYS: readonly string[] = [
  'inputTokens',
  'outputTokens',
  'cacheHitInputTokens',
  'cacheMissInputTokens',
  'reasoningOutputTokens',
  'rawUsage',
];

function validUsageSlot(value: unknown): boolean {
  // 全可选槽位：缺失（undefined）语义 unknown，合法；出现时必须是非负整数。
  return value === undefined || (Number.isInteger(value) && (value as number) >= 0);
}

function validUsage(event: Extract<ProviderStreamEvent, { type: 'usage' }>): boolean {
  const usage = event.usage;
  if (!isRecord(usage)) return false;
  // rawUsage 是任意 JSON 的计量真源（形状不校验），但顶层不得出现契约外字段。
  if (!Object.keys(usage).every((key) => USAGE_SLOT_KEYS.includes(key))) return false;
  return validUsageSlot(usage.inputTokens)
    && validUsageSlot(usage.outputTokens)
    && validUsageSlot(usage.cacheHitInputTokens)
    && validUsageSlot(usage.cacheMissInputTokens)
    && validUsageSlot(usage.reasoningOutputTokens);
}

function validProviderFailure(event: Extract<ProviderStreamEvent, { type: 'failed' }>): boolean {
  return PROVIDER_FAILURE_KINDS.has(event.kind)
    && typeof event.message === 'string'
    && typeof event.retryable === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validGenerationNotice(value: unknown): value is GenerationNotice {
  return isRecord(value)
    && hasExactKeys(value, ['code', 'message', 'requested', 'applied'])
    && value.code === 'reasoning_downgraded_for_structured_output'
    && typeof value.message === 'string'
    && value.message.trim().length > 0
    && value.requested === 'deep'
    && value.applied === 'standard';
}

function validNoticeEvent(event: Extract<ProviderStreamEvent, { type: 'notice' }>): boolean {
  return hasExactKeys(event as unknown as Record<string, unknown>, ['type', 'requestId', 'seq', 'notice'])
    && validGenerationNotice(event.notice);
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
    providerRequestId,
    provider,
    request,
    store,
    signal,
    onEvent = () => undefined,
    now = () => new Date().toISOString(),
  } = options;

  if (turnId.trim().length === 0 || providerRequestId.trim().length === 0) {
    throw new Error('turnId and providerRequestId must be non-empty');
  }
  const replay = store.replayTurn(turnId);
  if (replay.state === 'pending_interaction') {
    throw new TurnPendingInteractionError(turnId);
  }
  if (replay.state === 'completed' || replay.state === 'failed') {
    throw new Error(`Turn ${turnId} already exists`);
  }

  let turnSeq = replay.events.length === 0
    ? 0
    : Math.max(...replay.events.map((event) => event.seq)) + 1;
  const emit = (input: ProviderTurnEventInput): TurnEvent => {
    const event = {
      ...input,
      turnId,
      providerRequestId,
      seq: turnSeq++,
      emittedAt: now(),
    } as TurnEvent;
    onEvent(event);
    return event;
  };

  let assistantMessage = '';
  let reasoningContent = '';
  let pendingReasoning = '';
  let reasoningStarted = false;
  let usage: ProviderUsage | undefined;
  const notices: GenerationNotice[] = [];
  const noticeCodes = new Set<GenerationNotice['code']>();
  let providerTerminal: ProviderTerminal | undefined;
  let providerStarted = false;
  let expectedProviderSeq = 0;
  let failure: TurnFailure | undefined;

  const fail = (turnFailure: TurnFailure): PersistedTurn => {
    const failedAt = now();
    const record: PersistedTurn = {
      status: 'failed',
      turnId,
      providerRequestId,
      providerId: provider.id,
      modelId: provider.modelId,
      ...(assistantMessage.length > 0 ? { assistantMessage } : {}),
      reasoning: reasoningSnapshot(reasoningContent),
      ...(usage ? { usage } : {}),
      ...(notices.length > 0 ? { notices: [...notices] } : {}),
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
      ...(notices.length > 0 ? { notices: [...notices] } : {}),
    });
    return record;
  };

  if (signal?.aborted) return fail(CANCELED_FAILURE);

  let iterator: AsyncIterator<ProviderStreamEvent> | undefined;
  try {
    iterator = provider.stream(request, { requestId: providerRequestId, signal })[Symbol.asyncIterator]();
    while (true) {
      const next = await nextProviderEvent(iterator, signal);
      if (next === ABORTED) {
        failure = CANCELED_FAILURE;
        break;
      }
      if (next.done) break;
      const event = next.value;
      if (providerTerminal) {
        failure = protocolFailure('Provider emitted an event after its terminal event');
        break;
      }
      if (event.requestId !== providerRequestId) {
        failure = protocolFailure(
          `Provider requestId drift: expected ${providerRequestId}, received ${event.requestId}`,
        );
        break;
      }
      if (event.seq !== expectedProviderSeq) {
        failure = protocolFailure(`Provider seq violation: expected ${expectedProviderSeq}, received ${event.seq}`);
        break;
      }
      expectedProviderSeq += 1;

      if (!providerStarted && event.type !== 'started') {
        failure = protocolFailure('Provider stream must start with a valid started event');
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
          if (typeof event.delta !== 'string') {
            failure = protocolFailure('Provider emitted an invalid reasoning delta');
          } else if (event.delta.length > 0) {
            if (!reasoningStarted) {
              pendingReasoning += event.delta;
              if (pendingReasoning.trim().length > 0) {
                reasoningStarted = true;
                reasoningContent = pendingReasoning;
                pendingReasoning = '';
                emit({ type: 'reasoning_started' });
                emit({ type: 'reasoning_delta', delta: reasoningContent });
              }
            } else {
              reasoningContent += event.delta;
              emit({ type: 'reasoning_delta', delta: event.delta });
            }
          }
          break;
        case 'content_delta':
          if (typeof event.delta !== 'string') {
            failure = protocolFailure('Provider emitted an invalid content delta');
          } else if (event.delta.length > 0) {
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
            usage = event.usage;
          }
          break;
        case 'notice':
          if (!validNoticeEvent(event)) {
            failure = protocolFailure('Provider emitted an invalid notice');
          } else if (noticeCodes.has(event.notice.code)) {
            failure = protocolFailure(`Provider emitted duplicate notice code: ${event.notice.code}`);
          } else {
            noticeCodes.add(event.notice.code);
            notices.push(event.notice);
            emit({ type: 'provider_notice', notice: event.notice });
          }
          break;
        case 'completed':
          if (!PROVIDER_FINISH_REASONS.has(event.finishReason)) {
            failure = protocolFailure('Provider emitted an invalid completion reason');
          } else {
            providerTerminal = event;
          }
          break;
        case 'failed':
          if (!validProviderFailure(event)) {
            failure = protocolFailure('Provider emitted an invalid failure terminal');
          } else {
            providerTerminal = event;
          }
          break;
        default:
          failure = protocolFailure('Provider emitted an unknown stream event');
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
    providerRequestId,
    providerId: provider.id,
    modelId: provider.modelId,
    assistantMessage,
    reasoning,
    ...(usage ? { usage } : {}),
    ...(notices.length > 0 ? { notices: [...notices] } : {}),
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
    ...(notices.length > 0 ? { notices: [...notices] } : {}),
    finishReason: providerTerminal.finishReason,
  });
  return record;
}
