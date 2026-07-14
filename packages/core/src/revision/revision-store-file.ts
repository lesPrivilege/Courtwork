import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RevisionEvent } from '@courtwork/schemas';

import type { RevisionEventStore } from './revision-store.js';
import { assertPersistableRevisionEvent } from './revision-store-shared.js';

/** Node-only 追加写 JSONL adapter；browser-safe Work 协议不得导入本模块。 */
export function createFileRevisionEventStore(filePath: string): RevisionEventStore {
  mkdirSync(dirname(filePath), { recursive: true });
  return {
    record(event) {
      assertPersistableRevisionEvent(event);
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf-8');
    },
    list() {
      if (!existsSync(filePath)) return [];
      return readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as RevisionEvent);
    },
  };
}
