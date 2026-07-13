import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { createTurnStore, type TurnStore } from './turn-store.js';
import type { TurnJournalBackend, TurnJournalEntry } from './types.js';

/** Node-only append-only JSONL adapter. Browser consumers must inject their own TurnJournalBackend. */
export function createFileTurnStore(
  filePath: string,
  now: () => string = () => new Date().toISOString(),
): TurnStore {
  mkdirSync(dirname(filePath), { recursive: true });
  const readAll = (): TurnJournalEntry[] => {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as TurnJournalEntry);
  };
  const backend: TurnJournalBackend = {
    read: readAll,
    append(entry, expectedLength) {
      if (readAll().length !== expectedLength) return false;
      appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf-8');
      return true;
    },
  };
  return createTurnStore(backend, now);
}
