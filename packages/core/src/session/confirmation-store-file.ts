import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DuplicateConfirmationRequestError,
  type ConfirmationStore,
  type PendingConfirmation,
  type PendingConfirmationSnapshot,
} from './confirmation-store.js';
import { serializePending } from './confirmation-store-shared.js';

function versionOf(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Node-only 落盘实现：新构造一个指向同一目录的实例仍能 peek()/consume()，
 * 并保持 CONFIRM-CAS-1 的 SHA-256 version 与 tombstone 字节形状不变。
 */
export function createFileConfirmationStore(dir: string): ConfirmationStore {
  mkdirSync(dir, { recursive: true });
  const pathFor = (requestId: string) => join(dir, `${requestId}.json`);
  const consumedPathFor = (requestId: string) => join(dir, `${requestId}.consumed`);
  const peek = (requestId: string): PendingConfirmationSnapshot | undefined => {
    const filePath = pathFor(requestId);
    if (existsSync(consumedPathFor(requestId)) || !existsSync(filePath)) return undefined;
    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    const parsed = JSON.parse(raw) as PendingConfirmation;
    if (parsed.requestId !== requestId) {
      throw new Error(`确认存储身份不匹配：请求 "${requestId}" 的文件内携带 "${parsed.requestId}"`);
    }
    if (existsSync(consumedPathFor(requestId))) return undefined;
    return { pending: parsed, version: versionOf(raw) };
  };
  const consume = (requestId: string, expectedVersion: string): PendingConfirmation | undefined => {
    const snapshot = peek(requestId);
    if (!snapshot || snapshot.version !== expectedVersion) return undefined;
    try {
      writeFileSync(
        consumedPathFor(requestId),
        JSON.stringify({ requestId, version: expectedVersion }),
        { encoding: 'utf-8', flag: 'wx' },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return undefined;
      throw error;
    }
    rmSync(pathFor(requestId), { force: true });
    return snapshot.pending;
  };
  return {
    save(pending) {
      if (existsSync(consumedPathFor(pending.requestId))) {
        throw new DuplicateConfirmationRequestError(pending.requestId);
      }
      const serialized = serializePending(pending);
      try {
        writeFileSync(pathFor(pending.requestId), serialized.raw, { encoding: 'utf-8', flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          throw new DuplicateConfirmationRequestError(pending.requestId);
        }
        throw error;
      }
      if (existsSync(consumedPathFor(pending.requestId))) {
        rmSync(pathFor(pending.requestId), { force: true });
        throw new DuplicateConfirmationRequestError(pending.requestId);
      }
    },
    peek,
    consume,
  };
}
