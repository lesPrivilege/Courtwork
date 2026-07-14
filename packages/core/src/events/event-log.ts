import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

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

/**
 * 落盘实现：append 追加一行 JSONL，list()/append() 每次都从磁盘重新读取整段历史——
 * 用一个指向同一文件的新实例，就是"另一个进程接续同一 session"的忠实模拟，
 * 覆盖异步确认预留要求的"事件流不隐含单进程/单机/单客户端假设"。
 */
export function createFileEventLog(
  sessionId: string,
  filePath: string,
  now: () => string = () => new Date().toISOString(),
): EventLog {
  mkdirSync(dirname(filePath), { recursive: true });
  const readAll = (): SessionEvent[] => {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SessionEvent);
  };
  return {
    sessionId,
    append(input) {
      const seq = readAll().length;
      const event = { ...input, sessionId, seq, emittedAt: now() } as SessionEvent;
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf-8');
      return event;
    },
    list() {
      return readAll();
    },
  };
}

export interface ReplaySummary {
  artifacts: Partial<Record<string, unknown>>;
  confirmations: Record<string, { actor: ConfirmationActor; decision: 'confirm' | 'reject' }>;
  revisionEventIds: string[];
  completed: boolean;
  linkedTurns: LinkedTurn[];
  failedSteps: FailedStep[];
  latestTodoSnapshot?: TodoStep[];
}

/** 纯函数：只靠事件流本身重建产出与确认结果，证明"事件流可回放"不是一句空话。 */
export function replaySession(events: SessionEvent[]): ReplaySummary {
  const summary: ReplaySummary = {
    artifacts: {},
    confirmations: {},
    revisionEventIds: [],
    completed: false,
    linkedTurns: [],
    failedSteps: [],
  };
  for (const event of events) {
    if (event.type === 'artifact_produced') {
      summary.artifacts[event.artifactType] = event.artifact;
    } else if (event.type === 'confirmation_resolved') {
      summary.confirmations[event.requestId] = { actor: event.actor, decision: event.decision };
    } else if (event.type === 'revision_recorded') {
      summary.revisionEventIds.push(event.revisionEventId);
    } else if (event.type === 'scenario_completed') {
      summary.completed = true;
    } else if (event.type === 'turn_linked') {
      summary.linkedTurns.push({
        stepId: event.stepId,
        artifactType: event.artifactType,
        attempt: event.attempt,
        turnId: event.turnId,
        providerRequestId: event.providerRequestId,
      });
    } else if (event.type === 'step_failed') {
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
    } else if (event.type === 'todo_snapshot') {
      summary.latestTodoSnapshot = event.steps;
    }
  }
  return summary;
}
