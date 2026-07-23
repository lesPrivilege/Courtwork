import type { SessionEvent } from '../events/types.js';
import type { PendingConfirmation } from '../session/confirmation-store.js';
import type { TurnJournalEntry } from '../turn/types.js';
import type { RevisionEvent } from '@courtwork/schemas';

/**
 * WORK-STORE-1 · 概念一：Work 状态信封持久格式 v1（ADR-010 决定二）。
 *
 * 这只是既有 Work 账本的可序列化持久容器，不是第二套 Work journal——`events`、`turnEntries`、
 * `pendingConfirmations`、`revisionEvents` 都是既有账本的四段，metadata 是接近常量的会话头。
 * 整份信封是一次 whole-envelope CAS 的权威值（measurement 已证明尺寸远未触阈，不上 snapshot+tail/WAL）。
 *
 * 不得保存 secret、endpoint、provider 实例、AbortSignal、流式 delta 或 UI 临时处置态（ADR-010 第 170 行）。
 */

/** 冻结后的模型路由（start 时冻结，resume 不接受 UI 改传）。核心侧自持形状，与 desktop UI port 结构对应。 */
export interface WorkModelRoute {
  providerId: string;
  modelId: string;
  reasoning: 'standard' | 'deep';
}

/** case-scoped 会话引用；host blob 以它寻址（不含绝对路径，路径与授权只住宿主）。 */
export interface WorkSessionRef {
  caseId: string;
  sessionId: string;
}

/** session 累计 runtime budget 的唯一持久真源（ADR-010「session 累计 runtime budget」）。 */
export interface WorkRuntimeBudget {
  limits: {
    maxSteps?: number;
    maxSeconds?: number;
    maxToolCalls?: number;
    maxUsd?: number;
  };
  costBasis: {
    currency: 'USD';
    priceTableVersion?: string;
    priceTableEffectiveAt?: string;
    assumptions: string[];
  };
  consumed: {
    steps: number;
    toolCalls: number;
    executionMs: number;
    estimatedUsd: number;
    costCoverage: 'complete' | 'partial';
  };
}

/**
 * 持久事件形态。v1 等同于内存 `SessionEvent`。ADR-010 决定三的 `artifact_produced` 只存
 * `ArtifactEnvelope` 的版本化 artifact 形态与读侧迁移不在本单分派范围（见 SPEC `[需架构拍板]`），
 * 故此处以别名保留 ADR 字段名，v1 直存 SessionEvent。
 */
export type StoredSessionEvent = SessionEvent;

export interface WorkStateEnvelopeV1 {
  storageVersion: 1;
  /** 由 TS 状态机维护的信封内修订号，与 host 铸造的 opaque generation version 相互独立。 */
  revision: number;
  caseId: string;
  sessionId: string;
  chainId: string;
  predecessorSessionId?: string;
  scenarioId: string;
  packageId: string;
  packageVersion: string;
  schemaVersion: number;
  scenarioFingerprint: string;
  modelRoute: WorkModelRoute;
  materialRefs: string[];
  createdAt: string;
  runtimeBudget: WorkRuntimeBudget;
  events: StoredSessionEvent[];
  turnEntries: TurnJournalEntry[];
  pendingConfirmations: PendingConfirmation[];
  revisionEvents: RevisionEvent[];
}

/** 软告警上限（4 MiB）：越过发显式警示，但继续工作。measurement 已钉死尺寸阈值，照用不重议。 */
export const SOFT_ENVELOPE_LIMIT_BYTES = 4 * 1024 * 1024;
/** 硬上限（16 MiB）：越过 fail-closed 拒写，结构化错误（ADR-010 第 217 行的触发闸）。 */
export const HARD_ENVELOPE_LIMIT_BYTES = 16 * 1024 * 1024;

/** 读入未知/缺失 storageVersion 时 fail-closed；不得静默按 v1 解读（ADR-010 迁移契约）。 */
export class UnknownEnvelopeVersionError extends Error {
  constructor(readonly seen: unknown) {
    super(`Work 状态信封 storageVersion 未知或缺失（读到 ${JSON.stringify(seen)}）——缺迁移，拒绝读取`);
    this.name = 'UnknownEnvelopeVersionError';
  }
}

/** 字节损坏/结构不符 v1 形状时 fail-closed；不得 raw JSON fallback。 */
export class CorruptEnvelopeError extends Error {
  constructor(message: string) {
    super(`Work 状态信封损坏：${message}`);
    this.name = 'CorruptEnvelopeError';
  }
}

/** 紧凑 JSON → UTF-8 bytes（确定性：同一输入同一字节序列）。 */
export function serializeWorkStateEnvelope(envelope: WorkStateEnvelopeV1): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(envelope));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonNegativeSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new CorruptEnvelopeError(`${label} 必须是非负安全整数`);
  }
}

function assertNonNegativeFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new CorruptEnvelopeError(`${label} 必须是有限非负数`);
  }
}

function assertOptionalNonNegativeSafeInteger(value: unknown, label: string): void {
  if (value !== undefined) assertNonNegativeSafeInteger(value, label);
}

function assertOptionalNonNegativeFinite(value: unknown, label: string): void {
  if (value !== undefined) assertNonNegativeFinite(value, label);
}

/** load/start 共用的 runtimeBudget 深校验；拒绝把脏值送入预算比较或算术。 */
export function assertWorkRuntimeBudget(value: unknown): asserts value is WorkRuntimeBudget {
  if (!isRecord(value) || !isRecord(value.limits) || !isRecord(value.costBasis) || !isRecord(value.consumed)) {
    throw new CorruptEnvelopeError('runtimeBudget 的 limits / costBasis / consumed 必须是对象');
  }
  const { limits, costBasis, consumed } = value;
  assertOptionalNonNegativeSafeInteger(limits.maxSteps, 'runtimeBudget.limits.maxSteps');
  assertOptionalNonNegativeSafeInteger(limits.maxToolCalls, 'runtimeBudget.limits.maxToolCalls');
  assertOptionalNonNegativeFinite(limits.maxSeconds, 'runtimeBudget.limits.maxSeconds');
  assertOptionalNonNegativeFinite(limits.maxUsd, 'runtimeBudget.limits.maxUsd');

  if (costBasis.currency !== 'USD') {
    throw new CorruptEnvelopeError('runtimeBudget.costBasis.currency 只能是 USD');
  }
  const version = costBasis.priceTableVersion;
  const effectiveAt = costBasis.priceTableEffectiveAt;
  if ((version === undefined) !== (effectiveAt === undefined)) {
    throw new CorruptEnvelopeError('runtimeBudget 成本价目 version/effectiveAt 必须成对出现');
  }
  if (
    version !== undefined
    && (typeof version !== 'string' || version.trim().length === 0
      || typeof effectiveAt !== 'string' || effectiveAt.trim().length === 0)
  ) {
    throw new CorruptEnvelopeError('runtimeBudget 成本价目 version/effectiveAt 必须是非空字符串');
  }
  if (!Array.isArray(costBasis.assumptions) || !costBasis.assumptions.every((entry) => typeof entry === 'string')) {
    throw new CorruptEnvelopeError('runtimeBudget.costBasis.assumptions 必须是字符串数组');
  }

  assertNonNegativeSafeInteger(consumed.steps, 'runtimeBudget.consumed.steps');
  assertNonNegativeSafeInteger(consumed.toolCalls, 'runtimeBudget.consumed.toolCalls');
  assertNonNegativeFinite(consumed.executionMs, 'runtimeBudget.consumed.executionMs');
  assertNonNegativeFinite(consumed.estimatedUsd, 'runtimeBudget.consumed.estimatedUsd');
  if (consumed.costCoverage !== 'complete' && consumed.costCoverage !== 'partial') {
    throw new CorruptEnvelopeError('runtimeBudget.consumed.costCoverage 只能是 complete 或 partial');
  }
  if (consumed.costCoverage === 'complete' && version === undefined) {
    throw new CorruptEnvelopeError('runtimeBudget 完整成本覆盖必须携带价目版本与核验时点');
  }
}

/**
 * bytes → 校验后的 WorkStateEnvelopeV1。顺序即 fail-closed 优先级：
 * 不可解析 → CorruptEnvelopeError；version≠1（含缺失）→ UnknownEnvelopeVersionError；
 * v1 但结构不符 → CorruptEnvelopeError。事件级深校验由写入侧负责，读侧只保证容器完整。
 */
export function readWorkStateEnvelope(bytes: Uint8Array): WorkStateEnvelopeV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new CorruptEnvelopeError(`字节不是合法 JSON：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) {
    throw new CorruptEnvelopeError('顶层不是对象');
  }
  if (parsed.storageVersion !== 1) {
    throw new UnknownEnvelopeVersionError(parsed.storageVersion);
  }
  const requiredStrings = [
    'caseId',
    'sessionId',
    'chainId',
    'scenarioId',
    'packageId',
    'packageVersion',
    'scenarioFingerprint',
    'createdAt',
  ] as const;
  for (const key of requiredStrings) {
    if (typeof parsed[key] !== 'string' || (parsed[key] as string).length === 0) {
      throw new CorruptEnvelopeError(`缺少或非法的字符串字段 "${key}"`);
    }
  }
  assertNonNegativeSafeInteger(parsed.revision, 'revision');
  assertNonNegativeSafeInteger(parsed.schemaVersion, 'schemaVersion');
  if (!isRecord(parsed.modelRoute) || !isRecord(parsed.runtimeBudget)) {
    throw new CorruptEnvelopeError('modelRoute / runtimeBudget 必须是对象');
  }
  if (
    typeof parsed.modelRoute.providerId !== 'string'
    || parsed.modelRoute.providerId.trim().length === 0
    || typeof parsed.modelRoute.modelId !== 'string'
    || parsed.modelRoute.modelId.trim().length === 0
    || (parsed.modelRoute.reasoning !== 'standard' && parsed.modelRoute.reasoning !== 'deep')
  ) {
    throw new CorruptEnvelopeError('modelRoute 必须携带非空 provider/model 与合法 reasoning');
  }
  assertWorkRuntimeBudget(parsed.runtimeBudget);
  for (const key of ['materialRefs', 'events', 'turnEntries', 'pendingConfirmations', 'revisionEvents'] as const) {
    if (!Array.isArray(parsed[key])) {
      throw new CorruptEnvelopeError(`账本段 "${key}" 必须是数组`);
    }
  }
  return parsed as unknown as WorkStateEnvelopeV1;
}
