import type { TodoStep } from '../scenario-executor/todo-snapshot.js';
import type { ConfirmationActor, SessionEvent, SessionEventInput } from './types.js';

export type LinkedTurn = Omit<Extract<SessionEvent, { type: 'turn_linked' }>, 'type' | 'sessionId' | 'seq' | 'emittedAt'>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, Extract<K, keyof T>> : never;
export type FailedStep = DistributiveOmit<
  Extract<SessionEvent, { type: 'step_failed' }>,
  'type' | 'sessionId' | 'seq' | 'emittedAt'
>;

export interface EventLog {
  readonly sessionId: string;
  append(event: SessionEventInput): SessionEvent;
  list(): SessionEvent[];
}

export function createEventLog(sessionId: string, now: () => string = () => new Date().toISOString()): EventLog {
  const events: SessionEvent[] = [];
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

export type ModelToolResult = Omit<
  Extract<SessionEvent, { type: 'model_tool_result' }>,
  'type' | 'sessionId' | 'seq' | 'emittedAt'
>;

/**
 * 未识别账本条目登记（TOOL-READ-1 裁定七 · 运行期层）。
 *
 * 本通道无 zod schema、无版本号、无运行时校验（票面侦察事实①），故真正未识别的 type
 * 只可能来自外来行或损坏行。**不取整份 fail-closed**——硬失败会把既有档一次性变成不可读，
 * 与「扩员后旧档续 valid」相悖；取「登记 + 可见」，使不变量四（静默降级零容忍）在此成立。
 */
export interface UnrecognizedLedgerEntry {
  seq: number;
  type: string;
}

export interface ReplaySummary {
  artifacts: Partial<Record<string, unknown>>;
  confirmations: Record<string, { actor: ConfirmationActor; decision: 'confirm' | 'reject' }>;
  revisionEventIds: string[];
  completed: boolean;
  linkedTurns: LinkedTurn[];
  failedSteps: FailedStep[];
  /** 模型请求的只读工具结果（TOOL-READ-1 裁定一）：按账本序回放。 */
  modelToolResults: ModelToolResult[];
  /** 未识别账本条目（外来/损坏行）；恒在场，闭集内条目一枚不进。 */
  unrecognizedEntries: UnrecognizedLedgerEntry[];
  latestTodoSnapshot?: TodoStep[];
  /** 场景级终局失败（scenario_failed）：与 completed 互斥的终态，供投影据此收敛为 failed。 */
  scenarioFailure?: { reason: 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal'; message: string };
}

/** 未识别行的 type 取值提取：外来行未必有 type 字段，缺失时如实登记为 '(缺 type 字段)'。 */
function describeUnrecognized(event: SessionEvent): UnrecognizedLedgerEntry {
  const raw = event as unknown as { seq?: unknown; type?: unknown };
  return {
    seq: typeof raw.seq === 'number' ? raw.seq : -1,
    type: typeof raw.type === 'string' ? raw.type : '(缺 type 字段)',
  };
}

/**
 * 纯函数：只靠事件流本身重建产出与确认结果，证明"事件流可回放"不是一句空话。
 *
 * TOOL-READ-1 裁定七：本函数是 Work 账本两处读侧之一，取「编译期穷举 + 运行期显式登记」两层——
 * `SessionEvent` 加员而漏改本处即编译失败（下方 `_exhaustive` 赋值），故闭集缺口不可能再生；
 * 编译期已穷举后仍走到 default 的只有外来/损坏行，它们进未识别登记而非静默跳过。
 */
export function replaySession(events: SessionEvent[]): ReplaySummary {
  const summary: ReplaySummary = {
    artifacts: {},
    confirmations: {},
    revisionEventIds: [],
    completed: false,
    linkedTurns: [],
    failedSteps: [],
    modelToolResults: [],
    unrecognizedEntries: [],
  };
  for (const event of events) {
    switch (event.type) {
      case 'artifact_produced':
        summary.artifacts[event.artifactType] = event.artifact;
        break;
      case 'confirmation_resolved':
        summary.confirmations[event.requestId] = { actor: event.actor, decision: event.decision };
        break;
      case 'revision_recorded':
        summary.revisionEventIds.push(event.revisionEventId);
        break;
      case 'scenario_completed':
        summary.completed = true;
        break;
      case 'scenario_failed':
        summary.scenarioFailure = { reason: event.reason, message: event.message };
        break;
      case 'turn_linked':
        summary.linkedTurns.push({
          stepId: event.stepId,
          artifactType: event.artifactType,
          attempt: event.attempt,
          turnId: event.turnId,
          providerRequestId: event.providerRequestId,
        });
        break;
      case 'step_failed':
        if (event.scope === 'tool') {
          summary.failedSteps.push({ scope: 'tool', toolId: event.toolId, reason: event.reason, message: event.message });
        } else {
          summary.failedSteps.push({
            scope: 'model',
            stepId: event.stepId,
            artifactType: event.artifactType,
            attempt: event.attempt,
            turnId: event.turnId,
            providerRequestId: event.providerRequestId,
            reason: event.reason,
            message: event.message,
            retryable: event.retryable,
          });
        }
        break;
      case 'todo_snapshot':
        summary.latestTodoSnapshot = event.steps;
        break;
      case 'model_tool_result':
        summary.modelToolResults.push({
          stepId: event.stepId,
          artifactType: event.artifactType,
          round: event.round,
          toolId: event.toolId,
          verified: event.verified,
          content: event.content,
          truncated: event.truncated,
        });
        break;
      case 'progress':
        break;
      case 'confirmation_requested':
        break;
      default: {
        // 编译期穷举：闭集加员而漏改本处，此行立即编译失败（结构性杜绝缺口再生）。
        const _exhaustive: never = event;
        summary.unrecognizedEntries.push(describeUnrecognized(_exhaustive));
        break;
      }
    }
  }
  return summary;
}
