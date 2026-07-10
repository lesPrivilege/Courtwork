import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RevisionEvent } from '@courtwork/schemas';

export interface RevisionEventStore {
  record(event: RevisionEvent): void;
  list(): RevisionEvent[];
}

export class MissingSessionIdError extends Error {
  constructor(eventId: string) {
    super(
      `RevisionEvent "${eventId}" 缺少 sessionId，落盘前必须补齐（core 的持久化契约比 schema 更严格，见 packages/core/SPEC.md W6.2 整改记录）`,
    );
    this.name = 'MissingSessionIdError';
  }
}

function assertPersistable(event: RevisionEvent): void {
  if (!event.sessionId) throw new MissingSessionIdError(event.id);
}

export function createInMemoryRevisionEventStore(): RevisionEventStore {
  const events: RevisionEvent[] = [];
  return {
    record(event) {
      assertPersistable(event);
      events.push(event);
    },
    list() {
      return [...events];
    },
  };
}

/** 追加写 JSONL：SPEC 要求 RevisionEvent"捕获落盘"——每条修正独立一行，永不改写既有行。 */
export function createFileRevisionEventStore(filePath: string): RevisionEventStore {
  mkdirSync(dirname(filePath), { recursive: true });
  return {
    record(event) {
      assertPersistable(event);
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
