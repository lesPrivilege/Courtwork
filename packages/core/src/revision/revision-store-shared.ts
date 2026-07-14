import type { RevisionEvent } from '@courtwork/schemas';

export class MissingSessionIdError extends Error {
  constructor(eventId: string) {
    super(
      `RevisionEvent "${eventId}" 缺少 sessionId，落盘前必须补齐（core 的持久化契约比 schema 更严格，见 packages/core/SPEC.md W6.2 整改记录）`,
    );
    this.name = 'MissingSessionIdError';
  }
}

/** @internal shared validation; browser-safe and free of persistence concerns. */
export function assertPersistableRevisionEvent(event: RevisionEvent): void {
  if (!event.sessionId) throw new MissingSessionIdError(event.id);
}
