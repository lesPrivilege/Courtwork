import type { PendingConfirmation } from './confirmation-store.js';

/** @internal browser-safe JSON clone shared by memory and Node-only adapters. */
export function serializePending(pending: PendingConfirmation): { raw: string; pending: PendingConfirmation } {
  if (typeof pending.requestId !== 'string' || pending.requestId.trim().length === 0) {
    throw new Error('确认请求必须携带非空 requestId');
  }
  const raw = JSON.stringify(pending);
  const cloned = JSON.parse(raw) as PendingConfirmation;
  if (cloned.requestId !== pending.requestId) {
    throw new Error('确认请求必须携带可序列化的 requestId');
  }
  return { raw, pending: cloned };
}
