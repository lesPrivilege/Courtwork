import type {
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPersistedTurn(entry: TurnJournalEntry): entry is PersistedTurn {
  return 'status' in entry;
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
    const entries = backend.read();
    const entry = prepare(entries);
    if (backend.append(entry, entries.length)) return clone(entry);
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
      const found = backend.read().find(
        (entry): entry is PersistedTurn => isPersistedTurn(entry) && entry.turnId === turnId,
      );
      return found ? clone(found) : undefined;
    },
    list() {
      return backend.read().filter(isPersistedTurn).map(clone);
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
      if (
        !isRecord(rawActor)
        || typeof rawActor.channelId !== 'string'
        || typeof rawActor.actorId !== 'string'
        || rawActor.channelId.trim().length === 0
        || rawActor.actorId.trim().length === 0
      ) {
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
      return clone(interactionEvents(backend.read(), turnId));
    },
    replayTurn(turnId) {
      return replayTurnEntries(backend.read(), turnId);
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
