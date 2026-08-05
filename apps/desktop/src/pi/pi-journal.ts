/**
 * `PI-LANE-UI-1` · pi 线账本记录的 **fail-closed 解码器**。
 *
 * 界面读到的是宿主 durable 到盘上的**同一份字节**（Rust `encode_record`），本模块只负责把
 * 那一行 JSON 认成闭集里的一枚，认不出就**显式拒**——不跳过、不猜测、不留部分状态。
 * 这条纪律不是洁癖：`tool_proposed` 认不出就意味着一次待授权的写入在界面上消失了，
 * 而账本上它仍在等回执（总纲不变量 4：静默降级零容忍）。
 *
 * 闭集恰十九型，与 Rust `JournalType` 同源；此处的 `PI_JOURNAL_TYPES` 是对端表的**镜像**，
 * 任一侧加员而另一侧未跟上，`pi-journal.test.ts` 的对表用例即红。
 */

/** journal 记录的十九型闭集（ADR-022 六-B.1；Rust `JournalType` 的镜像）。 */
export const PI_JOURNAL_TYPES = [
  'session_started',
  'session_resumed',
  'user_prompted',
  'agent_event',
  'tool_proposed',
  'authorization_decided',
  'effect_started',
  'effect_succeeded',
  'effect_failed',
  'effect_uncertain',
  'turn_usage_recorded',
  'prompt_completed',
  'prompt_failed',
  'prompt_canceled',
  'prompt_budget_stopped',
  'session_completed',
  'session_budget_stopped',
  'session_failed',
  'session_interrupted',
] as const;

export type PiJournalType = (typeof PI_JOURNAL_TYPES)[number];

/** 模型工具恰四件（ADR-022 六-0）。第五件在这里认不出来，故不会静默出现在界面上。 */
export const PI_TOOL_NAMES = ['read', 'glob', 'grep', 'write'] as const;
export type PiToolName = (typeof PI_TOOL_NAMES)[number];

export const PI_AGENT_EVENT_KINDS = [
  'assistant_text_delta',
  'assistant_reasoning_delta',
  'tool_started',
  'tool_progress',
  'tool_finished',
  'turn_finished',
] as const;
export type PiAgentEventKind = (typeof PI_AGENT_EVENT_KINDS)[number];

export interface PiBudgetView {
  readonly turns: number;
  readonly usd: number | null;
  readonly turnLimit: string;
  readonly usdLimit: string;
  readonly stopReason?: string;
}

export interface PiJournalRecord {
  readonly schemaVersion: number;
  readonly eventId: string;
  readonly seq: number;
  readonly containerId: string;
  readonly sessionId: string;
  readonly leg: number;
  readonly requestId: string | null;
  readonly operationId?: string;
  readonly type: PiJournalType;
  readonly recordedAt: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type PiDecodeResult =
  | { readonly ok: true; readonly record: PiJournalRecord }
  | { readonly ok: false; readonly reason: PiDecodeReason };

/** 拒绝理由闭集。每一枚都对应一种**认不出**，不是一种降级。 */
export type PiDecodeReason =
  | 'not_json'
  | 'not_object'
  | 'unknown_schema_version'
  | 'unknown_type'
  | 'missing_field'
  | 'bad_field_type';

const JOURNAL_SCHEMA_VERSION = 1;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 解一行账本记录。**只认闭集**：schemaVersion 不是 1、type 不在十九型内、envelope 字段缺失
 * 或类型不符，一律具名拒绝。
 *
 * payload 不在此处逐型细解——它按型分叉，读点各自取自己要的字段并各自兜底（见
 * `pi-projection.ts` 的取值器）。envelope 是所有型共有的那一层，故门开在这里。
 */
export function decodePiJournalRecord(line: string): PiDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  if (!isObject(parsed)) return { ok: false, reason: 'not_object' };
  if (parsed.schemaVersion !== JOURNAL_SCHEMA_VERSION) {
    return { ok: false, reason: 'unknown_schema_version' };
  }
  const type = parsed.type;
  if (typeof type !== 'string') return { ok: false, reason: 'missing_field' };
  if (!(PI_JOURNAL_TYPES as readonly string[]).includes(type)) {
    return { ok: false, reason: 'unknown_type' };
  }
  for (const key of ['eventId', 'containerId', 'sessionId'] as const) {
    if (typeof parsed[key] !== 'string') return { ok: false, reason: 'bad_field_type' };
  }
  for (const key of ['seq', 'leg', 'recordedAt'] as const) {
    if (typeof parsed[key] !== 'number') return { ok: false, reason: 'bad_field_type' };
  }
  if (parsed.requestId !== null && typeof parsed.requestId !== 'string') {
    return { ok: false, reason: 'bad_field_type' };
  }
  if (parsed.operationId !== undefined && typeof parsed.operationId !== 'string') {
    return { ok: false, reason: 'bad_field_type' };
  }
  if (!isObject(parsed.payload)) return { ok: false, reason: 'bad_field_type' };
  return {
    ok: true,
    record: {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      eventId: parsed.eventId as string,
      seq: parsed.seq as number,
      containerId: parsed.containerId as string,
      sessionId: parsed.sessionId as string,
      leg: parsed.leg as number,
      requestId: (parsed.requestId as string | null) ?? null,
      ...(typeof parsed.operationId === 'string' ? { operationId: parsed.operationId } : {}),
      type: type as PiJournalType,
      recordedAt: parsed.recordedAt as number,
      payload: parsed.payload,
    },
  };
}

// ── payload 取值器 ──────────────────────────────────────────────────────────
//
// 逐枚只取自己要的那几个字段，取不到就 `undefined`——**不**造默认值。投影侧据此把
// 「账上没有」与「账上是 0」分开：把缺失填成 0 会让一次未知开销显示成免费。

export function readString(
  payload: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

export function readNumber(
  payload: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === 'number' ? value : undefined;
}

export function readBoolean(
  payload: Readonly<Record<string, unknown>>,
  key: string,
): boolean | undefined {
  const value = payload[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function readObject(
  payload: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, unknown>> | undefined {
  const value = payload[key];
  return isObject(value) ? value : undefined;
}

export function readToolName(
  payload: Readonly<Record<string, unknown>>,
  key: string,
): PiToolName | undefined {
  const value = payload[key];
  return typeof value === 'string' && (PI_TOOL_NAMES as readonly string[]).includes(value)
    ? (value as PiToolName)
    : undefined;
}

export function readBudget(
  payload: Readonly<Record<string, unknown>>,
): PiBudgetView | undefined {
  const budget = readObject(payload, 'budget');
  if (!budget) return undefined;
  const turns = readNumber(budget, 'turns');
  const turnLimit = readString(budget, 'turnLimit');
  const usdLimit = readString(budget, 'usdLimit');
  if (turns === undefined || turnLimit === undefined || usdLimit === undefined) return undefined;
  const usd = budget.usd;
  const stopReason = readString(budget, 'stopReason');
  return {
    turns,
    usd: typeof usd === 'number' ? usd : null,
    turnLimit,
    usdLimit,
    ...(stopReason ? { stopReason } : {}),
  };
}
