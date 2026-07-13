import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { PersistedTurn } from './types.js';

export interface TurnStore {
  save(turn: PersistedTurn): void;
  get(turnId: string): PersistedTurn | undefined;
  list(): PersistedTurn[];
}

export class TurnAlreadyExistsError extends Error {
  constructor(readonly turnId: string) {
    super(`Turn ${turnId} already exists`);
    this.name = 'TurnAlreadyExistsError';
  }
}

function assertNewTurn(records: readonly PersistedTurn[], turnId: string): void {
  if (records.some((record) => record.turnId === turnId)) {
    throw new TurnAlreadyExistsError(turnId);
  }
}

export function createMemoryTurnStore(): TurnStore {
  const records: PersistedTurn[] = [];
  return {
    save(turn) {
      assertNewTurn(records, turn.turnId);
      records.push(turn);
    },
    get(turnId) {
      return records.find((record) => record.turnId === turnId);
    },
    list() {
      return [...records];
    },
  };
}

/** Append-only JSONL store. A fresh instance can rebuild the terminal state without transient deltas. */
export function createFileTurnStore(filePath: string): TurnStore {
  mkdirSync(dirname(filePath), { recursive: true });
  const readAll = (): PersistedTurn[] => {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as PersistedTurn);
  };

  return {
    save(turn) {
      assertNewTurn(readAll(), turn.turnId);
      appendFileSync(filePath, `${JSON.stringify(turn)}\n`, 'utf-8');
    },
    get(turnId) {
      return readAll().find((record) => record.turnId === turnId);
    },
    list() {
      return readAll();
    },
  };
}
