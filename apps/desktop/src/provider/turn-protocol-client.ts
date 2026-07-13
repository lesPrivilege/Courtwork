import {
  TurnJournalCorruptionError,
  createTurnStore,
  type ResolveInteractionInput,
  type TurnEvent,
  type TurnFailure,
  type TurnJournalBackend,
  type TurnJournalEntry,
  type TurnReasoning,
  type TurnReplay,
  type TurnStore,
} from '@courtwork/core/turn-protocol';
import type { GenerationUsage } from '@courtwork/provider/types';

export const TURN_JOURNAL_STORAGE_KEY = 'courtwork.turn-journal.v1';

export interface TurnProjection {
  turnId: string;
  providerRequestId?: string;
  providerId?: string;
  modelId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  assistantMessage: string;
  reasoning: { status: 'pending' } | TurnReasoning;
  usage?: GenerationUsage;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'unknown';
  failure?: TurnFailure;
}

export function createEmptyTurnProjection(turnId: string): TurnProjection {
  return {
    turnId,
    status: 'idle',
    assistantMessage: '',
    reasoning: { status: 'pending' },
  };
}

/** UI projection is deliberately mechanical: terminal truth remains the core event. */
export function projectTurn(state: TurnProjection, event: TurnEvent): TurnProjection {
  if (event.turnId !== state.turnId) return state;
  switch (event.type) {
    case 'turn_started':
      return {
        ...state,
        status: 'running',
        providerRequestId: event.providerRequestId,
        providerId: event.providerId,
        modelId: event.modelId,
      };
    case 'assistant_message_started':
    case 'reasoning_started':
      return { ...state, status: 'running', providerRequestId: event.providerRequestId };
    case 'assistant_message_delta':
      return {
        ...state,
        status: 'running',
        providerRequestId: event.providerRequestId,
        assistantMessage: state.assistantMessage + event.delta,
      };
    case 'reasoning_delta':
      return {
        ...state,
        status: 'running',
        providerRequestId: event.providerRequestId,
        reasoning: {
          status: 'present',
          content: `${state.reasoning.status === 'present' ? state.reasoning.content : ''}${event.delta}`,
        },
      };
    case 'assistant_message_completed':
      return { ...state, providerRequestId: event.providerRequestId, assistantMessage: event.content };
    case 'reasoning_completed':
      return { ...state, providerRequestId: event.providerRequestId, reasoning: { status: 'present', content: event.content } };
    case 'turn_completed':
      return {
        ...state,
        status: 'completed',
        providerRequestId: event.providerRequestId,
        assistantMessage: event.assistantMessage,
        reasoning: event.reasoning,
        ...(event.usage ? { usage: event.usage } : {}),
        finishReason: event.finishReason,
      };
    case 'turn_failed':
      return {
        ...state,
        status: 'failed',
        providerRequestId: event.providerRequestId,
        assistantMessage: event.partialAssistantMessage ?? state.assistantMessage,
        reasoning: event.reasoning,
        ...(event.usage ? { usage: event.usage } : {}),
        failure: event.failure,
      };
    case 'interaction_requested':
    case 'interaction_resolved':
      return state;
  }
}

interface TurnJournalEnvelope {
  version: 1;
  revision: number;
  entries: TurnJournalEntry[];
  turnIds: string[];
}

export interface IndexedTurnJournalBackend extends TurnJournalBackend {
  knownTurnIds(): readonly string[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function corrupt(message: string): never {
  throw new TurnJournalCorruptionError(`Turn journal is corrupt: ${message}`);
}

function entryTurnIds(entries: readonly unknown[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) corrupt('entry is not an object');
    const turnId = (raw as { turnId?: unknown }).turnId;
    if (typeof turnId !== 'string' || turnId.trim().length === 0) corrupt('entry has no turnId');
    if (!seen.has(turnId)) {
      seen.add(turnId);
      ids.push(turnId);
    }
  }
  return ids;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function parseEnvelope(raw: string | null): TurnJournalEnvelope {
  if (raw === null) return { version: 1, revision: 0, entries: [], turnIds: [] };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return corrupt('invalid JSON');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) corrupt('invalid envelope');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'entries,revision,turnIds,version') corrupt('unknown or missing envelope fields');
  if (record.version !== 1 || !Number.isInteger(record.revision) || Number(record.revision) < 0) {
    corrupt('unsupported version or revision');
  }
  if (!Array.isArray(record.entries) || !Array.isArray(record.turnIds)) corrupt('entries/index must be arrays');
  const turnIds = record.turnIds;
  if (turnIds.some((id) => typeof id !== 'string' || id.trim().length === 0) || new Set(turnIds).size !== turnIds.length) {
    corrupt('invalid turnId index');
  }
  const derived = entryTurnIds(record.entries);
  if (!sameIds(turnIds as string[], derived)) corrupt('turnId index drift');
  return {
    version: 1,
    revision: Number(record.revision),
    entries: clone(record.entries) as TurnJournalEntry[],
    turnIds: [...turnIds] as string[],
  };
}

/**
 * Single-WebView synchronous CAS. Storage/quota failures throw; only an actual
 * expectedLength mismatch is reported as contention to core.
 */
export function createLocalStorageTurnJournalBackend(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key = TURN_JOURNAL_STORAGE_KEY,
): IndexedTurnJournalBackend {
  const readEnvelope = () => parseEnvelope(storage.getItem(key));
  return {
    read: () => clone(readEnvelope().entries),
    knownTurnIds: () => [...readEnvelope().turnIds],
    append(entry, expectedLength) {
      const envelope = readEnvelope();
      if (envelope.entries.length !== expectedLength) return false;
      const entries = [...envelope.entries, clone(entry)];
      const next: TurnJournalEnvelope = {
        version: 1,
        revision: envelope.revision + 1,
        entries,
        turnIds: entryTurnIds(entries),
      };
      storage.setItem(key, JSON.stringify(next));
      return true;
    },
  };
}

export class TurnProtocolClient {
  readonly store: TurnStore;

  constructor(private readonly backend: IndexedTurnJournalBackend) {
    this.store = createTurnStore(backend);
  }

  knownTurnIds(): string[] {
    const ids = [...this.backend.knownTurnIds()];
    // The index is navigation only. Core replay remains the validation authority.
    for (const id of ids) this.store.replayTurn(id);
    return ids;
  }

  replayTurn(turnId: string): TurnReplay {
    return this.store.replayTurn(turnId);
  }

  resolveInteraction(input: ResolveInteractionInput): TurnReplay {
    const resolved = this.store.resolveInteraction(input);
    return this.store.replayTurn(resolved.turnId);
  }
}
