import type { EventLog } from '../events/event-log.js';
import type { SessionEvent } from '../events/types.js';
import type {
  ConfirmationStore,
  PendingConfirmation,
  PendingConfirmationSnapshot,
} from '../session/confirmation-store.js';
import { DuplicateConfirmationRequestError } from '../session/confirmation-store.js';
import { serializePending } from '../session/confirmation-store-shared.js';
import type { RevisionEventStore } from '../revision/revision-store.js';
import { assertPersistableRevisionEvent } from '../revision/revision-store-shared.js';
import type { RevisionEvent } from '@courtwork/schemas';
import type { PersistedTurn, TurnJournalEntry } from '../turn/types.js';
import {
  HARD_ENVELOPE_LIMIT_BYTES,
  SOFT_ENVELOPE_LIMIT_BYTES,
  readWorkStateEnvelope,
  serializeWorkStateEnvelope,
  type WorkStateEnvelopeV1,
} from './envelope.js';
import {
  encodeStoredEvents,
  hydrateStoredEvents,
  type ArtifactEnvelopeCodec,
  type IsolatedArtifact,
} from './artifact-envelope.js';

// WorkModelRoute / WorkSessionRef 的唯一属主是 ./envelope.js（wire 形状层）；本模块只引用不转售，
// 避免 barrel `export *` 双属主歧义。store/port 类型（WorkStateStore、WorkStateHostPort、WorkStateHeader…）由本模块拥有。
import type { WorkSessionRef } from './envelope.js';

/**
 * WORK-STORE-1 · 概念二：异步 whole-envelope CAS 的持久权威。
 *
 * host 只提供 case-scoped opaque blob 的 read/CAS（ADR-010 决定二）；`version` 由 host 在 CAS
 * 成功时铸造为不透明、单调递增的 generation，与信封内 `revision` 相互独立。TS 侧独占信封校验、
 * 事件状态机与 CAS——commit() 在把 bytes 交给 host 前完成大小闸与序列化，落盘成功才推进本地
 * generation 与 revision。真实宿主（Tauri/Rust）与本模块 host adapter 各自实现同一 port。
 */
export interface WorkStateHostPort {
  read(ref: WorkSessionRef): Promise<
    | { found: false }
    | { found: true; version: string; bytes: Uint8Array }
  >;
  compareAndSwap(input: {
    ref: WorkSessionRef;
    expectedVersion: string | null;
    bytes: Uint8Array;
  }): Promise<{ applied: boolean; version: string }>;
}

/** 会话头：fresh 会话由 composition 提供；resume 时从已持久信封回读，不接受 UI 改传。 */
export type WorkStateHeader = Omit<
  WorkStateEnvelopeV1,
  'storageVersion' | 'revision' | 'events' | 'turnEntries' | 'pendingConfirmations' | 'revisionEvents'
>;

export interface SoftLimitWarning {
  ref: WorkSessionRef;
  bytes: number;
  softLimitBytes: number;
}

export interface WorkStateCommitResult {
  version: string;
  revision: number;
  bytes: number;
  softLimitWarning: boolean;
}

export interface InterruptedTurn {
  turnId: string;
  stepId: string;
  artifactType: string;
  attempt: number;
}

export interface WorkStateStore {
  readonly ref: WorkSessionRef;
  readonly eventLog: EventLog;
  readonly confirmationStore: ConfirmationStore;
  readonly revisionStore: RevisionEventStore;
  /** durable 屏障：装配当前信封 → 大小闸 → 序列化 → whole-envelope CAS。落盘成功前不返回。 */
  commit(): Promise<WorkStateCommitResult>;
  /** 当前工作信封快照（含最后一次成功 commit 的 revision）。 */
  snapshot(): WorkStateEnvelopeV1;
  /**
   * turn_linked 已持久但对应 Turn terminal 尚未持久的 attempt（ADR-010 第 209–211 行）：
   * 恢复时必须标 interrupted，由用户以全新 Turn/attempt 身份重启，不得自动重放同一 provider 调用。
   */
  interruptedTurns(): InterruptedTurn[];
}

export interface LoadWorkStateStoreOptions {
  host: WorkStateHostPort;
  ref: WorkSessionRef;
  /** fresh 会话的会话头；resume（host 已有 blob）时忽略，改用已持久信封的头。 */
  header: WorkStateHeader;
  readTurnEntries?: () => readonly TurnJournalEntry[];
  onSoftLimitWarning?: (warning: SoftLimitWarning) => void;
  now?: () => string;
  /**
   * ArtifactEnvelope 编解码器（LEGAL-S3-BINDING-1 / ADR-010 决定三）：注入即生产装配——
   * commit 时把 `artifact_produced.artifact` 封为版本信封（payload 唯一真源），reload 时按包/版本
   * 迁移并校验回裸 artifact。缺省（纯逻辑单测/非生产）保持 WORK-STORE-1 直存行为。见 `artifact-envelope.ts`。
   */
  artifactCodec?: ArtifactEnvelopeCodec;
}

/** 超硬上限 fail-closed；结构化错误，绝不静默丢历史或换设计（ADR-010 第 217 行触发闸）。 */
export class WorkStateTooLargeError extends Error {
  constructor(readonly bytes: number, readonly ref: WorkSessionRef) {
    super(
      `Work 状态信封 ${bytes} 字节超过硬上限 ${HARD_ENVELOPE_LIMIT_BYTES} 字节（case ${ref.caseId} / session ${ref.sessionId}）——拒写，另立 ADR 前不得换设计`,
    );
    this.name = 'WorkStateTooLargeError';
  }
}

/** 并发 CAS 败者显式失败，不静默覆盖赢者的落盘信封。 */
export class WorkStateConflictError extends Error {
  constructor(readonly ref: WorkSessionRef, readonly expectedVersion: string | null, readonly actualVersion: string) {
    super(
      `Work 状态信封 CAS 失败：期望 generation ${JSON.stringify(expectedVersion)}，宿主当前为 ${JSON.stringify(actualVersion)}（case ${ref.caseId} / session ${ref.sessionId}）——并发写者，拒绝覆盖`,
    );
    this.name = 'WorkStateConflictError';
  }
}

export class WorkStateRefMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkStateRefMismatchError';
  }
}

/**
 * reload 持久 artifact 信封时有 contribution 无法迁移（未知包/类型/版本或 payload 不合 schema）→
 * 恢复自身会话必须 fail-closed（不能续行一个连自家 artifact 都迁移不了的会话，更禁 raw payload fallback）。
 * UI 投影侧不走本路径——它以 `hydrateStoredEvents` 优雅隔离显示（见 ADR-010 决定三）。
 */
export class StoredArtifactIsolatedError extends Error {
  constructor(readonly isolated: readonly IsolatedArtifact[]) {
    super(
      `持久 artifact 无法迁移，拒绝续行（fail-closed）：${isolated
        .map((entry) => `seq ${entry.seq} ${entry.typeId} → ${entry.reason}`)
        .join('；')}`,
    );
    this.name = 'StoredArtifactIsolatedError';
  }
}

/** 参考实现：进程内 opaque blob CAS。生产由 Tauri/Rust host 或 Node file host 实现同一 port。 */
export function createInMemoryWorkStateHost(): WorkStateHostPort {
  const store = new Map<string, { generation: number; bytes: Uint8Array }>();
  const keyOf = (ref: WorkSessionRef): string => `${ref.caseId}\u0000${ref.sessionId}`;
  return {
    async read(ref) {
      const current = store.get(keyOf(ref));
      if (!current) return { found: false };
      return { found: true, version: String(current.generation), bytes: new Uint8Array(current.bytes) };
    },
    async compareAndSwap({ ref, expectedVersion, bytes }) {
      const key = keyOf(ref);
      const current = store.get(key);
      const currentVersion = current ? String(current.generation) : null;
      if (currentVersion !== expectedVersion) {
        return { applied: false, version: currentVersion ?? '' };
      }
      const generation = (current?.generation ?? 0) + 1;
      store.set(key, { generation, bytes: new Uint8Array(bytes) });
      return { applied: true, version: String(generation) };
    },
  };
}

/** 事件段视图：内存 append-only，seq/emittedAt/sessionId 由 store 补齐（同 createEventLog 语义）。 */
function createEnvelopeEventLog(sessionId: string, events: SessionEvent[], now: () => string): EventLog {
  return {
    sessionId,
    append(input) {
      const event = { ...input, sessionId, seq: events.length, emittedAt: now() } as SessionEvent;
      events.push(event);
      return event;
    },
    list() {
      return [...events];
    },
  };
}

/** 修订段视图：内存 append-only，落盘前强制 sessionId 存在（同 in-memory revision store 语义）。 */
function createEnvelopeRevisionStore(events: RevisionEvent[]): RevisionEventStore {
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

/**
 * pending 段视图：不透明 version + 已见 request id 拒覆盖（CONFIRM-CAS-1 语义），并暴露 snapshot 供
 * 装配信封。跨 reload 由 seed 从信封 pendingConfirmations 重建；已消费的 pending 在信封中已移除，
 * requestId 为每次暂停铸造的 UUID，不复用——故不再单独保留 consumed tombstone（同内存 store 保证）。
 */
function createEnvelopePendingLedger(seed: readonly PendingConfirmation[]): {
  store: ConfirmationStore;
  snapshot: () => PendingConfirmation[];
} {
  const pending = new Map<string, PendingConfirmationSnapshot>();
  const seenRequestIds = new Set<string>();
  let versionSequence = 0;
  const seal = (p: PendingConfirmation): void => {
    versionSequence += 1;
    const serialized = serializePending(p);
    seenRequestIds.add(p.requestId);
    pending.set(p.requestId, { pending: serialized.pending, version: `pending-${versionSequence}` });
  };
  for (const p of seed) seal(p);
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
    store: {
      save(p) {
        if (seenRequestIds.has(p.requestId)) throw new DuplicateConfirmationRequestError(p.requestId);
        seal(p);
      },
      peek,
      consume,
    },
    snapshot: () => [...pending.values()].map((entry) => serializePending(entry.pending).pending),
  };
}

function isPersistedTurn(entry: TurnJournalEntry): entry is PersistedTurn {
  return 'status' in entry;
}

function assertRefMatchesHeader(ref: WorkSessionRef, caseId: string, sessionId: string): void {
  if (ref.caseId !== caseId || ref.sessionId !== sessionId) {
    throw new WorkStateRefMismatchError(
      `Work 状态信封身份不匹配：ref ${ref.caseId}/${ref.sessionId} 与信封 ${caseId}/${sessionId} 不一致——跨案/跨会话读取 fail closed`,
    );
  }
}

/**
 * 单一入口：读取 host。已有 blob → 校验并回读（未知版本 fail-closed），种入四段账本续行；
 * 无 blob → 用 options.header 起新会话，首个 commit 以 expectedVersion=null 落 header。
 */
export async function loadWorkStateStore(options: LoadWorkStateStoreOptions): Promise<WorkStateStore> {
  const { host, ref, readTurnEntries, onSoftLimitWarning } = options;
  const now = options.now ?? (() => new Date().toISOString());

  const existing = await host.read(ref);
  let header: WorkStateHeader;
  let revision: number;
  let cachedVersion: string | null;
  const events: SessionEvent[] = [];
  const revisionEvents: RevisionEvent[] = [];
  let pendingSeed: readonly PendingConfirmation[] = [];

  if (existing.found) {
    const envelope = readWorkStateEnvelope(existing.bytes);
    assertRefMatchesHeader(ref, envelope.caseId, envelope.sessionId);
    header = {
      caseId: envelope.caseId,
      sessionId: envelope.sessionId,
      chainId: envelope.chainId,
      ...(envelope.predecessorSessionId !== undefined ? { predecessorSessionId: envelope.predecessorSessionId } : {}),
      scenarioId: envelope.scenarioId,
      packageId: envelope.packageId,
      packageVersion: envelope.packageVersion,
      schemaVersion: envelope.schemaVersion,
      scenarioFingerprint: envelope.scenarioFingerprint,
      modelRoute: envelope.modelRoute,
      materialRefs: envelope.materialRefs,
      createdAt: envelope.createdAt,
      runtimeBudget: envelope.runtimeBudget,
    };
    revision = envelope.revision;
    cachedVersion = existing.version;
    if (options.artifactCodec) {
      // 读侧迁移（ADR-010 决定三）：持久信封 → 裸 artifact。恢复自身会话时任一 isolated 即 fail-closed。
      const hydrated = hydrateStoredEvents(envelope.events, options.artifactCodec);
      if (hydrated.isolated.length > 0) throw new StoredArtifactIsolatedError(hydrated.isolated);
      events.push(...hydrated.events);
    } else {
      events.push(...envelope.events);
    }
    revisionEvents.push(...envelope.revisionEvents);
    pendingSeed = envelope.pendingConfirmations;
  } else {
    assertRefMatchesHeader(ref, options.header.caseId, options.header.sessionId);
    header = options.header;
    revision = 0;
    cachedVersion = null;
  }

  const eventLog = createEnvelopeEventLog(header.sessionId, events, now);
  const revisionStore = createEnvelopeRevisionStore(revisionEvents);
  const pendingLedger = createEnvelopePendingLedger(pendingSeed);

  const buildEnvelope = (rev: number): WorkStateEnvelopeV1 => ({
    storageVersion: 1,
    revision: rev,
    ...header,
    // 写侧封版本信封（ADR-010 决定三）：注入 codec 即生产装配；缺省保持 WORK-STORE-1 直存。
    events: options.artifactCodec ? encodeStoredEvents(eventLog.list(), options.artifactCodec) : eventLog.list(),
    turnEntries: [...(readTurnEntries?.() ?? [])],
    pendingConfirmations: pendingLedger.snapshot(),
    revisionEvents: revisionStore.list(),
  });

  return {
    ref,
    eventLog,
    confirmationStore: pendingLedger.store,
    revisionStore,
    async commit() {
      const nextRevision = revision + 1;
      const bytes = serializeWorkStateEnvelope(buildEnvelope(nextRevision));
      if (bytes.length > HARD_ENVELOPE_LIMIT_BYTES) {
        throw new WorkStateTooLargeError(bytes.length, ref);
      }
      const softLimitWarning = bytes.length > SOFT_ENVELOPE_LIMIT_BYTES;
      if (softLimitWarning) {
        onSoftLimitWarning?.({ ref, bytes: bytes.length, softLimitBytes: SOFT_ENVELOPE_LIMIT_BYTES });
      }
      const outcome = await host.compareAndSwap({ ref, expectedVersion: cachedVersion, bytes });
      if (!outcome.applied) {
        throw new WorkStateConflictError(ref, cachedVersion, outcome.version);
      }
      cachedVersion = outcome.version;
      revision = nextRevision;
      return { version: cachedVersion, revision, bytes: bytes.length, softLimitWarning };
    },
    snapshot() {
      return buildEnvelope(revision);
    },
    interruptedTurns() {
      const terminals = new Set(
        (readTurnEntries?.() ?? []).filter(isPersistedTurn).map((turn) => turn.turnId),
      );
      const interrupted: InterruptedTurn[] = [];
      for (const event of eventLog.list()) {
        if (event.type === 'turn_linked' && !terminals.has(event.turnId)) {
          interrupted.push({
            turnId: event.turnId,
            stepId: event.stepId,
            artifactType: event.artifactType,
            attempt: event.attempt,
          });
        }
      }
      return interrupted;
    },
  };
}
