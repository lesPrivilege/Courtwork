import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactType } from '@courtwork/schemas';
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
  artifactType?: ArtifactType;
  producedArtifacts: Partial<Record<ArtifactType, unknown>>;
  remainingArtifactTypes: ArtifactType[];
  toolResults: Record<string, unknown>;
  evidenceLedgerSnapshot: EvidenceGradeAnnotation[];
  createdAt: string;
}

export interface ConfirmationStore {
  save(pending: PendingConfirmation): void;
  /** 读取并移除——一次性消费，防止同一确认请求被 resume 两次。 */
  take(requestId: string): PendingConfirmation | undefined;
}

export function createInMemoryConfirmationStore(): ConfirmationStore {
  const pending = new Map<string, PendingConfirmation>();
  return {
    save(p) {
      pending.set(p.requestId, p);
    },
    take(requestId) {
      const found = pending.get(requestId);
      if (found) pending.delete(requestId);
      return found;
    },
  };
}

/**
 * 落盘实现：证明"确认响应可在任意更晚时间、任意别的进程回流"不是类型层面的
 * 空话——新构造一个指向同一目录的 ConfirmationStore 实例（模拟另一个进程）
 * 依然能 take() 到（SPEC TODO 异步确认预留）。
 */
export function createFileConfirmationStore(dir: string): ConfirmationStore {
  mkdirSync(dir, { recursive: true });
  const pathFor = (requestId: string) => join(dir, `${requestId}.json`);
  return {
    save(p) {
      writeFileSync(pathFor(p.requestId), JSON.stringify(p), 'utf-8');
    },
    take(requestId) {
      const filePath = pathFor(requestId);
      if (!existsSync(filePath)) return undefined;
      const raw = readFileSync(filePath, 'utf-8');
      rmSync(filePath);
      return JSON.parse(raw) as PendingConfirmation;
    },
  };
}
