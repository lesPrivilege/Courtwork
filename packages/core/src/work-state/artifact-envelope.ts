/**
 * LEGAL-S3-BINDING-1 · 概念一：持久 artifact 的版本信封（ADR-010 决定三）。
 *
 * 生产 `StoredSessionEvent` 的 `artifact_produced` 只存本 `ArtifactEnvelope`，不并存第二份裸
 * artifact payload 真源（payload 只出现在 envelope.payload 一处）。读侧先按 package/schema 版本
 * 迁移并校验，再投影成 UI `SessionEvent`；未知版本、缺 migration、迁移后不合 schema 均**隔离**该
 * contribution，**禁止 raw JSON fallback**。
 *
 * 本模块是 browser-safe 的纯逻辑（零 node:*、零垂类语义——只认注入的 `ArtifactVersioningSource`）；
 * 真实 (packageId, schemaVersion, schema) 由装配点从已准入包构造，core 机器层不理解 legal.*。
 */

import type { SessionEvent } from '../events/types.js';

/** ADR-010 决定三逐字形状。schemaVersion 取归属包的 identity.schemaVersion（v1 单版本）。 */
export interface ArtifactEnvelope {
  packageId: string;
  typeId: string;
  schemaVersion: number;
  payload: unknown;
}

/** 读侧隔离原因闭集（每一类都 fail-closed，绝不 raw payload 兜底）。 */
export type ArtifactIsolationReason =
  /** 信封结构本身不符 ArtifactEnvelope 形状。 */
  | 'malformed'
  /** typeId 未在装配点登记（包未准入或类型漂移）。 */
  | 'unknown_type'
  /** packageId 与登记归属不符（跨包串源）。 */
  | 'package_mismatch'
  /** schemaVersion 与当前版本不符，且 v1 无迁移阶梯。 */
  | 'unknown_version'
  /** 迁移后 payload 不过当前 schema。 */
  | 'schema_mismatch';

/** 读侧迁移结果：ready 给出校验后的 artifact；isolated 只给类型与原因，绝不携原始 payload 供回落。 */
export type ArtifactMigrationOutcome =
  | { status: 'ready'; typeId: string; artifact: unknown }
  | { status: 'isolated'; typeId: string; reason: ArtifactIsolationReason; detail: string };

/** 某 artifactType 的版本与校验器（装配点从已准入包 descriptor 派生）。 */
export interface ArtifactTypeVersioning {
  packageId: string;
  schemaVersion: number;
  validate(payload: unknown): { ok: true; value: unknown } | { ok: false; issues: string };
}

/** 装配点提供的版本源：typeId → 归属包/当前版本/payload 校验器；未登记 → undefined（拒收不猜）。 */
export interface ArtifactVersioningSource {
  resolve(typeId: string): ArtifactTypeVersioning | undefined;
}

/** encode 遇未登记类型（装配缺漏或包准入被绕过）→ 抛，绝不静默封一个占位版本。 */
export class UnregisteredArtifactTypeError extends Error {
  constructor(readonly typeId: string) {
    super(`artifact 类型 "${typeId}" 未在版本源登记——无法封版本信封（装配缺漏或包准入被绕过）`);
    this.name = 'UnregisteredArtifactTypeError';
  }
}

/** 写侧封装 + 读侧迁移的双向编解码器。 */
export interface ArtifactEnvelopeCodec {
  /** 写侧：内存 artifact_produced 的 (typeId, artifact) → 版本信封。未登记类型抛 UnregisteredArtifactTypeError。 */
  encode(typeId: string, artifact: unknown): ArtifactEnvelope;
  /** 读侧：版本信封 → 迁移+校验结果（隔离型 fail-closed）。 */
  decode(envelope: ArtifactEnvelope): ArtifactMigrationOutcome;
}

function isWellFormedEnvelope(value: unknown): value is ArtifactEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const env = value as Partial<ArtifactEnvelope>;
  return (
    typeof env.packageId === 'string'
    && env.packageId.length > 0
    && typeof env.typeId === 'string'
    && env.typeId.length > 0
    && typeof env.schemaVersion === 'number'
    && Number.isInteger(env.schemaVersion)
    && 'payload' in (value as object)
  );
}

export function createArtifactEnvelopeCodec(source: ArtifactVersioningSource): ArtifactEnvelopeCodec {
  return {
    encode(typeId, artifact) {
      const versioning = source.resolve(typeId);
      if (!versioning) throw new UnregisteredArtifactTypeError(typeId);
      return { packageId: versioning.packageId, typeId, schemaVersion: versioning.schemaVersion, payload: artifact };
    },
    decode(envelope) {
      if (!isWellFormedEnvelope(envelope)) {
        const typeId = typeof (envelope as { typeId?: unknown })?.typeId === 'string'
          ? ((envelope as { typeId: string }).typeId)
          : '(未知)';
        return { status: 'isolated', typeId, reason: 'malformed', detail: '信封结构不符 ArtifactEnvelope 形状' };
      }
      const versioning = source.resolve(envelope.typeId);
      if (!versioning) {
        return { status: 'isolated', typeId: envelope.typeId, reason: 'unknown_type', detail: `类型 ${envelope.typeId} 未登记` };
      }
      if (versioning.packageId !== envelope.packageId) {
        return {
          status: 'isolated',
          typeId: envelope.typeId,
          reason: 'package_mismatch',
          detail: `包归属不符：登记 ${versioning.packageId}，信封 ${envelope.packageId}`,
        };
      }
      if (versioning.schemaVersion !== envelope.schemaVersion) {
        return {
          status: 'isolated',
          typeId: envelope.typeId,
          reason: 'unknown_version',
          detail: `schemaVersion 不符：当前 ${versioning.schemaVersion}，信封 ${envelope.schemaVersion}（无迁移阶梯）`,
        };
      }
      const validated = versioning.validate(envelope.payload);
      if (!validated.ok) {
        return { status: 'isolated', typeId: envelope.typeId, reason: 'schema_mismatch', detail: validated.issues };
      }
      return { status: 'ready', typeId: envelope.typeId, artifact: validated.value };
    },
  };
}

/** 被隔离的持久 artifact contribution（读侧登记，供上报/fail-closed，绝不 raw payload 兜底）。 */
export interface IsolatedArtifact {
  seq: number;
  typeId: string;
  reason: ArtifactIsolationReason;
  detail: string;
}

/**
 * 写侧事件转换：`SessionEvent[]` → 持久事件[]（`artifact_produced.artifact` 替换为版本信封，其余原样）。
 * 未登记类型抛 `UnregisteredArtifactTypeError`（装配缺漏 fail-closed）。返回值仍是 `SessionEvent` 形（artifact: unknown
 * 容纳信封），持久字节里 payload 只出现在 envelope.payload 一处。
 */
export function encodeStoredEvents(events: readonly SessionEvent[], codec: ArtifactEnvelopeCodec): SessionEvent[] {
  return events.map((event) =>
    event.type === 'artifact_produced'
      ? { ...event, artifact: codec.encode(event.artifactType, event.artifact) }
      : event,
  );
}

/**
 * 读侧事件迁移：持久事件[] → `{ events, isolated }`。`artifact_produced` 的信封经 codec 迁移+校验：
 * ready 复原裸 artifact 保留事件；isolated 从 events **剔除**并登记到 `isolated`（禁 raw payload fallback）。
 * 非 artifact 事件原样透传。UI 投影侧据此优雅隔离；resume 侧对非空 isolated fail-closed（见 store）。
 */
export function hydrateStoredEvents(
  events: readonly SessionEvent[],
  codec: ArtifactEnvelopeCodec,
): { events: SessionEvent[]; isolated: IsolatedArtifact[] } {
  const out: SessionEvent[] = [];
  const isolated: IsolatedArtifact[] = [];
  for (const event of events) {
    if (event.type !== 'artifact_produced') {
      out.push(event);
      continue;
    }
    const outcome = codec.decode(event.artifact as ArtifactEnvelope);
    if (outcome.status === 'ready') {
      out.push({ ...event, artifact: outcome.artifact });
    } else {
      isolated.push({ seq: event.seq, typeId: outcome.typeId, reason: outcome.reason, detail: outcome.detail });
    }
  }
  return { events: out, isolated };
}
