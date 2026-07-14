import type { RevisionEvent } from '@courtwork/schemas';
import { assertPersistableRevisionEvent } from './revision-store-shared.js';

export { MissingSessionIdError } from './revision-store-shared.js';

export interface RevisionEventStore {
  record(event: RevisionEvent): void;
  list(): RevisionEvent[];
}

export function createInMemoryRevisionEventStore(): RevisionEventStore {
  const events: RevisionEvent[] = [];
  return {
    record(event) {
      assertPersistableRevisionEvent(event);
      events.push(event);
    },
    list() {
      return [...events];
    },
  };
}
