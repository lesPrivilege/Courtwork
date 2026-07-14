import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EvidenceGradeAnnotation } from '../evidence/grade.js';

/**
 * 场景暂停时"继续所需的一切"：已产出 artifact、剩余产出序列、工具结果、
 * 证据台账快照（resume 时用它重建一个全新 EvidenceLedger 实例，见 executor.ts）。
 * 打包成一份可序列化数据，是 pause/resume 跨越磁盘边界而非内存边界的关键。
 */
export interface PendingConfirmation {
  requestId: string;
  sessionId: string;
  scenarioId: string;
  gateLabel: string;
  artifactType?: string;
  producedArtifacts: Partial<Record<string, unknown>>;
  remainingArtifactTypes: string[];
  toolResults: Record<string, unknown>;
  evidenceLedgerSnapshot: EvidenceGradeAnnotation[];
  createdAt: string;
  /** 容器材料随暂停封存（续行的生成步仍需材料在场；可序列化，跨进程 resume 语义不破）。 */
  materials?: { fileId: string; sha256: string; readingMarkdown: string }[];
}

export interface ConfirmationStore {
  save(pending: PendingConfirmation): void;
  /** 非破坏读：version 是后续条件消费的不透明 CAS token。 */
  peek(requestId: string): PendingConfirmationSnapshot | undefined;
  /** 只有 requestId 与 expectedVersion 同时命中才消费；竞争者只有第一笔成功。 */
  consume(requestId: string, expectedVersion: string): PendingConfirmation | undefined;
  /** @deprecated 兼容旧调用面；resumeScenario 不得用它跳过 validate-before-consume。 */
  take(requestId: string): PendingConfirmation | undefined;
}

export interface PendingConfirmationSnapshot {
  pending: PendingConfirmation;
  version: string;
}

export class DuplicateConfirmationRequestError extends Error {
  constructor(requestId: string) {
    super(`确认请求 "${requestId}" 已存在或已消费，不得覆盖或复用`);
    this.name = 'DuplicateConfirmationRequestError';
  }
}

function serializePending(pending: PendingConfirmation): { raw: string; pending: PendingConfirmation } {
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

function versionOf(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function createInMemoryConfirmationStore(): ConfirmationStore {
  const pending = new Map<string, PendingConfirmationSnapshot>();
  const seenRequestIds = new Set<string>();
  const peek = (requestId: string): PendingConfirmationSnapshot | undefined => {
    const found = pending.get(requestId);
    if (!found) return undefined;
    return { pending: serializePending(found.pending).pending, version: found.version };
  };
  const consume = (requestId: string, expectedVersion: string): PendingConfirmation | undefined => {
    const found = pending.get(requestId);
    if (!found || found.version !== expectedVersion) return undefined;
    pending.delete(requestId);
    return serializePending(found.pending).pending;
  };
  return {
    save(p) {
      if (seenRequestIds.has(p.requestId)) throw new DuplicateConfirmationRequestError(p.requestId);
      const serialized = serializePending(p);
      seenRequestIds.add(p.requestId);
      pending.set(p.requestId, { pending: serialized.pending, version: versionOf(serialized.raw) });
    },
    peek,
    consume,
    take(requestId) {
      const snapshot = peek(requestId);
      return snapshot ? consume(requestId, snapshot.version) : undefined;
    },
  };
}

/**
 * 落盘实现：证明"确认响应可在任意更晚时间、任意别的进程回流"不是类型层面的
 * 空话——新构造一个指向同一目录的 ConfirmationStore 实例（模拟另一个进程）
 * 依然能 peek()/consume() 到（SPEC TODO 异步确认预留）。
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
    // consumed marker 是跨实例的 first-wins 提交点；之后才清理 pending 载荷。
    rmSync(pathFor(requestId), { force: true });
    return snapshot.pending;
  };
  return {
    save(p) {
      if (existsSync(consumedPathFor(p.requestId))) throw new DuplicateConfirmationRequestError(p.requestId);
      const serialized = serializePending(p);
      try {
        writeFileSync(pathFor(p.requestId), serialized.raw, { encoding: 'utf-8', flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new DuplicateConfirmationRequestError(p.requestId);
        throw error;
      }
      // 消费者可能在 save 的首次检查后完成提交；不允许重生同一 requestId。
      if (existsSync(consumedPathFor(p.requestId))) {
        rmSync(pathFor(p.requestId), { force: true });
        throw new DuplicateConfirmationRequestError(p.requestId);
      }
    },
    peek,
    consume,
    take(requestId) {
      const snapshot = peek(requestId);
      return snapshot ? consume(requestId, snapshot.version) : undefined;
    },
  };
}
