import type {
  InteractionActor,
  InteractionAnswer,
  InteractionEvent,
  InteractionRequestedEvent,
  InteractionRequestedEventInput,
  InteractionResolvedEvent,
  PersistedTurn,
  ResolveInteractionInput,
  TurnJournalBackend,
  TurnJournalEntry,
  TurnReplay,
} from './types.js';
import { ResolvedSourceAnchorSchema } from '@courtwork/schemas';

export interface TurnStore {
  save(turn: PersistedTurn): void;
  get(turnId: string): PersistedTurn | undefined;
  list(): PersistedTurn[];
  appendInteractionRequested(input: InteractionRequestedEventInput): InteractionRequestedEvent;
  resolveInteraction(input: ResolveInteractionInput): InteractionResolvedEvent;
  events(turnId: string): InteractionEvent[];
  replayTurn(turnId: string): TurnReplay;
}

export class TurnAlreadyExistsError extends Error {
  constructor(readonly turnId: string) {
    super(`Turn ${turnId} already exists`);
    this.name = 'TurnAlreadyExistsError';
  }
}

export class DuplicateInteractionRequestError extends Error {
  constructor(readonly requestId: string) {
    super(`Interaction request ${requestId} already exists`);
    this.name = 'DuplicateInteractionRequestError';
  }
}

export class TurnInteractionStateError extends Error {
  constructor(readonly turnId: string, readonly state: TurnReplay['state']) {
    super(`Turn ${turnId} cannot request an interaction while state is ${state}`);
    this.name = 'TurnInteractionStateError';
  }
}

export class UnknownInteractionRequestError extends Error {
  constructor(readonly requestId: string) {
    super(`Interaction request ${requestId} is unknown, expired, or already resolved`);
    this.name = 'UnknownInteractionRequestError';
  }
}

export class InvalidInteractionActorError extends Error {
  constructor() {
    super('Interaction actor requires non-empty channelId and actorId');
    this.name = 'InvalidInteractionActorError';
  }
}

export class InvalidInteractionAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInteractionAnswerError';
  }
}

export class TurnPendingInteractionError extends Error {
  constructor(readonly turnId: string) {
    super(`Turn ${turnId} has a pending interaction`);
    this.name = 'TurnPendingInteractionError';
  }
}

export class TurnJournalContentionError extends Error {
  constructor() {
    super('Turn journal changed repeatedly while appending');
    this.name = 'TurnJournalContentionError';
  }
}

export class TurnJournalCorruptionError extends Error {
  constructor(message = 'Turn journal is corrupt') {
    super(message);
    this.name = 'TurnJournalCorruptionError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).every((key) => expected.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInteractionActor(value: unknown): value is InteractionActor {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ['channelId', 'actorId', 'role'])) return false;
  return isNonEmptyString(value.channelId)
    && isNonEmptyString(value.actorId)
    && (value.role === undefined || isNonEmptyString(value.role));
}

function isInteractionAnswer(value: unknown): value is InteractionAnswer {
  if (!isRecord(value) || !isNonEmptyString(value.kind)) return false;
  if (value.kind === 'option') {
    return hasOnlyKeys(value, ['kind', 'optionId']) && isNonEmptyString(value.optionId);
  }
  return value.kind === 'skip' && hasOnlyKeys(value, ['kind']);
}

function isUsage(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, ['inputTokens', 'outputTokens'])
    && Number.isInteger(value.inputTokens)
    && Number(value.inputTokens) >= 0
    && Number.isInteger(value.outputTokens)
    && Number(value.outputTokens) >= 0;
}

function isReasoning(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ['status', 'content'])) return false;
  return value.status === 'absent'
    ? !('content' in value)
    : value.status === 'present' && isNonEmptyString(value.content);
}

const PROVIDER_FAILURE_KINDS = new Set([
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

function isFailure(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, ['kind', 'message', 'retryable'])
    && typeof value.kind === 'string'
    && PROVIDER_FAILURE_KINDS.has(value.kind)
    && typeof value.message === 'string'
    && typeof value.retryable === 'boolean';
}

function isPersistedTurn(value: unknown): value is PersistedTurn {
  if (!isRecord(value)) return false;
  const baseValid = isNonEmptyString(value.turnId)
    && isNonEmptyString(value.providerRequestId)
    && isNonEmptyString(value.providerId)
    && isNonEmptyString(value.modelId)
    && isReasoning(value.reasoning)
    && (value.usage === undefined || isUsage(value.usage));
  if (!baseValid) return false;
  if (value.status === 'completed') {
    return hasOnlyKeys(value, [
      'status', 'turnId', 'providerRequestId', 'providerId', 'modelId', 'reasoning', 'usage',
      'assistantMessage', 'finishReason', 'completedAt',
    ])
      && isNonEmptyString(value.assistantMessage)
      && typeof value.finishReason === 'string'
      && ['stop', 'length', 'content_filter', 'unknown'].includes(value.finishReason)
      && isNonEmptyString(value.completedAt);
  }
  if (value.status === 'failed') {
    return hasOnlyKeys(value, [
      'status', 'turnId', 'providerRequestId', 'providerId', 'modelId', 'reasoning', 'usage',
      'assistantMessage', 'failure', 'failedAt',
    ])
      && (value.assistantMessage === undefined || typeof value.assistantMessage === 'string')
      && isFailure(value.failure)
      && isNonEmptyString(value.failedAt);
  }
  return false;
}

function isEventBase(value: Record<string, unknown>): boolean {
  return isNonEmptyString(value.turnId)
    && Number.isInteger(value.seq)
    && Number(value.seq) >= 0
    && isNonEmptyString(value.emittedAt);
}

function isInteractionRequested(value: unknown): value is InteractionRequestedEvent {
  if (!isRecord(value) || value.type !== 'interaction_requested' || !isEventBase(value)) return false;
  if (!hasOnlyKeys(value, [
    'type', 'turnId', 'seq', 'emittedAt', 'requestId', 'packageId', 'templateId', 'kind',
    'question', 'options', 'skippable', 'anchorPolicy', 'uiTemplateId', 'sourceAnchors',
  ])) return false;
  if (
    !isNonEmptyString(value.requestId)
    || !isNonEmptyString(value.packageId)
    || !isNonEmptyString(value.templateId)
    || !isNonEmptyString(value.question)
    || (value.kind !== 'single_choice' && value.kind !== 'confirmation')
    || typeof value.skippable !== 'boolean'
    || !['none', 'optional', 'required'].includes(String(value.anchorPolicy))
    || value.uiTemplateId !== 'question-card'
    || !Array.isArray(value.options)
    || value.options.length === 0
    || !Array.isArray(value.sourceAnchors)
  ) return false;
  const optionIds = new Set<string>();
  for (const option of value.options) {
    if (
      !isRecord(option)
      || !hasOnlyKeys(option, ['id', 'label', 'description'])
      || !isNonEmptyString(option.id)
      || !isNonEmptyString(option.label)
      || (option.description !== undefined && !isNonEmptyString(option.description))
      || optionIds.has(option.id)
    ) return false;
    optionIds.add(option.id);
  }
  for (const anchor of value.sourceAnchors) {
    if (
      !isRecord(anchor)
      || !hasOnlyKeys(anchor, ['fileId', 'page', 'bbox', 'textRange', 'textLayerVersion', 'quote'])
      || (anchor.bbox !== undefined && (
        !isRecord(anchor.bbox) || !hasOnlyKeys(anchor.bbox, ['x', 'y', 'width', 'height'])
      ))
      || (anchor.textRange !== undefined && (
        !isRecord(anchor.textRange) || !hasOnlyKeys(anchor.textRange, ['start', 'end'])
      ))
      || !ResolvedSourceAnchorSchema.safeParse(anchor).success
    ) return false;
  }
  if (value.anchorPolicy === 'none' && value.sourceAnchors.length > 0) return false;
  return value.anchorPolicy !== 'required' || value.sourceAnchors.length > 0;
}

function isInteractionResolved(value: unknown): value is InteractionResolvedEvent {
  return isRecord(value)
    && value.type === 'interaction_resolved'
    && isEventBase(value)
    && hasOnlyKeys(value, ['type', 'turnId', 'seq', 'emittedAt', 'requestId', 'actor', 'answer'])
    && isNonEmptyString(value.requestId)
    && isInteractionActor(value.actor)
    && isInteractionAnswer(value.answer);
}

function corrupt(message: string): never {
  throw new TurnJournalCorruptionError(message);
}

function validateJournalEntries(rawEntries: unknown): TurnJournalEntry[] {
  if (!Array.isArray(rawEntries)) return corrupt('Turn journal backend did not return an array');
  const entries = rawEntries.map((entry) => {
    if (isPersistedTurn(entry) || isInteractionRequested(entry) || isInteractionResolved(entry)) {
      return clone(entry);
    }
    return corrupt('Turn journal contains an unknown or malformed entry');
  });
  const states = new Map<string, 'idle' | 'pending' | 'resolved' | 'terminal'>();
  const expectedSeq = new Map<string, number>();
  const requests = new Map<string, InteractionRequestedEvent>();
  for (const entry of entries) {
    const state = states.get(entry.turnId) ?? 'idle';
    if (isPersistedTurn(entry)) {
      if (state === 'pending' || state === 'terminal') {
        corrupt('Turn journal contains an invalid terminal transition');
      }
      states.set(entry.turnId, 'terminal');
      continue;
    }
    if (state === 'terminal') corrupt('Turn journal contains an event after a terminal snapshot');
    const seq = expectedSeq.get(entry.turnId) ?? 0;
    if (entry.seq !== seq) corrupt('Turn journal contains a non-contiguous interaction seq');
    expectedSeq.set(entry.turnId, seq + 1);
    if (entry.type === 'interaction_requested') {
      if (state !== 'idle' || requests.has(entry.requestId)) {
        corrupt('Turn journal contains an invalid interaction request transition');
      }
      requests.set(entry.requestId, entry);
      states.set(entry.turnId, 'pending');
      continue;
    }
    const request = requests.get(entry.requestId);
    if (!request || request.turnId !== entry.turnId || state !== 'pending') {
      corrupt('Turn journal contains an invalid interaction resolution transition');
    }
    if (entry.answer.kind === 'option') {
      const optionId = entry.answer.optionId;
      if (!request.options.some((option) => option.id === optionId)) {
        corrupt('Turn journal resolution selects an unknown option');
      }
    } else if (!request.skippable) {
      corrupt('Turn journal resolution skips a non-skippable interaction');
    }
    states.set(entry.turnId, 'resolved');
  }
  return entries;
}

function interactionEvents(entries: readonly TurnJournalEntry[], turnId: string): InteractionEvent[] {
  return entries
    .filter((entry): entry is InteractionEvent => !isPersistedTurn(entry) && entry.turnId === turnId)
    .sort((left, right) => left.seq - right.seq);
}

export function replayTurnEntries(entries: readonly TurnJournalEntry[], turnId: string): TurnReplay {
  const events = interactionEvents(entries, turnId);
  const terminal = entries.find((entry): entry is PersistedTurn => isPersistedTurn(entry) && entry.turnId === turnId);
  if (terminal) {
    return { turnId, state: terminal.status, events: clone(events), terminal: clone(terminal) };
  }
  const pendingInteraction = [...events]
    .reverse()
    .find((event): event is InteractionRequestedEvent => event.type === 'interaction_requested');
  if (!pendingInteraction) return { turnId, state: 'idle', events: clone(events) };
  const resolvedInteraction = events.find(
    (event): event is InteractionResolvedEvent =>
      event.type === 'interaction_resolved' && event.requestId === pendingInteraction.requestId,
  );
  if (!resolvedInteraction) {
    return {
      turnId,
      state: 'pending_interaction',
      events: clone(events),
      pendingInteraction: clone(pendingInteraction),
    };
  }
  return {
    turnId,
    state: 'resolved_waiting_resume',
    events: clone(events),
    resolvedInteraction: clone(resolvedInteraction),
  };
}

function nextSeq(entries: readonly TurnJournalEntry[], turnId: string): number {
  const events = interactionEvents(entries, turnId);
  return events.length === 0 ? 0 : Math.max(...events.map((event) => event.seq)) + 1;
}

function copyRequestedInput(
  input: InteractionRequestedEventInput,
  seq: number,
  emittedAt: string,
): InteractionRequestedEvent {
  return {
    type: 'interaction_requested',
    turnId: input.turnId,
    seq,
    emittedAt,
    requestId: input.requestId,
    packageId: input.packageId,
    templateId: input.templateId,
    kind: input.kind,
    question: input.question,
    options: input.options.map((option) => ({
      id: option.id,
      label: option.label,
      ...(option.description === undefined ? {} : { description: option.description }),
    })),
    skippable: input.skippable,
    anchorPolicy: input.anchorPolicy,
    uiTemplateId: input.uiTemplateId,
    sourceAnchors: input.sourceAnchors.map((anchor) => ({
      fileId: anchor.fileId,
      ...(anchor.page === undefined ? {} : { page: anchor.page }),
      ...(anchor.bbox === undefined ? {} : { bbox: { ...anchor.bbox } }),
      ...(anchor.textRange === undefined ? {} : { textRange: { ...anchor.textRange } }),
      ...(anchor.textLayerVersion === undefined ? {} : { textLayerVersion: anchor.textLayerVersion }),
      ...(anchor.quote === undefined ? {} : { quote: anchor.quote }),
    })),
  };
}

function appendWithRetry<T extends TurnJournalEntry>(
  backend: TurnJournalBackend,
  prepare: (entries: readonly TurnJournalEntry[]) => T,
): T {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const entries = validateJournalEntries(backend.read());
    const entry = prepare(entries);
    validateJournalEntries([...entries, entry]);
    if (backend.append(clone(entry), entries.length)) return clone(entry);
  }
  throw new TurnJournalContentionError();
}

export function createTurnStore(
  backend: TurnJournalBackend,
  now: () => string = () => new Date().toISOString(),
): TurnStore {
  return {
    save(turn) {
      appendWithRetry(backend, (entries) => {
        if (entries.some((entry) => isPersistedTurn(entry) && entry.turnId === turn.turnId)) {
          throw new TurnAlreadyExistsError(turn.turnId);
        }
        const replay = replayTurnEntries(entries, turn.turnId);
        if (replay.state === 'pending_interaction') {
          throw new TurnPendingInteractionError(turn.turnId);
        }
        return clone(turn);
      });
    },
    get(turnId) {
      const found = validateJournalEntries(backend.read()).find(
        (entry): entry is PersistedTurn => isPersistedTurn(entry) && entry.turnId === turnId,
      );
      return found ? clone(found) : undefined;
    },
    list() {
      return validateJournalEntries(backend.read()).filter(isPersistedTurn).map(clone);
    },
    appendInteractionRequested(input) {
      if (input.turnId.trim().length === 0 || input.requestId.trim().length === 0) {
        throw new Error('turnId and interaction requestId must be non-empty');
      }
      return appendWithRetry(backend, (entries) => {
        if (entries.some((entry) => !isPersistedTurn(entry) && entry.requestId === input.requestId)) {
          throw new DuplicateInteractionRequestError(input.requestId);
        }
        const replay = replayTurnEntries(entries, input.turnId);
        if (replay.state !== 'idle') throw new TurnInteractionStateError(input.turnId, replay.state);
        return copyRequestedInput(input, nextSeq(entries, input.turnId), now());
      });
    },
    resolveInteraction(input) {
      const rawActor: unknown = input.actor;
      if (!isInteractionActor(rawActor)) {
        throw new InvalidInteractionActorError();
      }
      const rawAnswer: unknown = input.answer;
      if (!isRecord(rawAnswer)) {
        throw new InvalidInteractionAnswerError('Interaction answer must be an object');
      }
      const answer = rawAnswer;
      const answerKeys = Object.keys(answer).sort();
      const expectedAnswerKeys = answer.kind === 'option' ? ['kind', 'optionId'] : ['kind'];
      if (
        answerKeys.length !== expectedAnswerKeys.length
        || answerKeys.some((key, index) => key !== expectedAnswerKeys[index])
        || !isInteractionAnswer(rawAnswer)
      ) {
        throw new InvalidInteractionAnswerError('Interaction answer contains unknown or missing fields');
      }
      return appendWithRetry(backend, (entries) => {
        const request = entries.find(
          (entry): entry is InteractionRequestedEvent =>
            !isPersistedTurn(entry)
            && entry.type === 'interaction_requested'
            && entry.requestId === input.requestId,
        );
        const alreadyResolved = entries.some(
          (entry) => !isPersistedTurn(entry)
            && entry.type === 'interaction_resolved'
            && entry.requestId === input.requestId,
        );
        if (!request || alreadyResolved) throw new UnknownInteractionRequestError(input.requestId);
        const replay = replayTurnEntries(entries, request.turnId);
        if (replay.state !== 'pending_interaction') throw new UnknownInteractionRequestError(input.requestId);

        if (input.answer.kind === 'option') {
          const optionId = input.answer.optionId;
          if (!request.options.some((option) => option.id === optionId)) {
            throw new InvalidInteractionAnswerError(`Unknown option ${optionId}`);
          }
        } else if (input.answer.kind === 'skip') {
          if (!request.skippable) throw new InvalidInteractionAnswerError('Interaction is not skippable');
        } else {
          throw new InvalidInteractionAnswerError('Unknown interaction answer kind');
        }

        return {
          type: 'interaction_resolved',
          turnId: request.turnId,
          seq: nextSeq(entries, request.turnId),
          emittedAt: now(),
          requestId: request.requestId,
          actor: {
            channelId: input.actor.channelId,
            actorId: input.actor.actorId,
            ...(input.actor.role === undefined ? {} : { role: input.actor.role }),
          },
          answer: clone(input.answer),
        } satisfies InteractionResolvedEvent;
      });
    },
    events(turnId) {
      return clone(interactionEvents(validateJournalEntries(backend.read()), turnId));
    },
    replayTurn(turnId) {
      return replayTurnEntries(validateJournalEntries(backend.read()), turnId);
    },
  };
}

export function createMemoryTurnStore(
  now: () => string = () => new Date().toISOString(),
): TurnStore {
  const entries: TurnJournalEntry[] = [];
  const backend: TurnJournalBackend = {
    read: () => clone(entries),
    append(entry, expectedLength) {
      if (entries.length !== expectedLength) return false;
      entries.push(clone(entry));
      return true;
    },
  };
  return createTurnStore(backend, now);
}
