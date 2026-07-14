import type { EvidenceGradeAnnotation } from '../evidence/grade.js';
import { serializePending } from './confirmation-store-shared.js';

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

export function createInMemoryConfirmationStore(): ConfirmationStore {
  const pending = new Map<string, PendingConfirmationSnapshot>();
  const seenRequestIds = new Set<string>();
  let versionSequence = 0;
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
      versionSequence += 1;
      pending.set(p.requestId, { pending: serialized.pending, version: `memory-${versionSequence}` });
    },
    peek,
    consume,
    take(requestId) {
      const snapshot = peek(requestId);
      return snapshot ? consume(requestId, snapshot.version) : undefined;
    },
  };
}
