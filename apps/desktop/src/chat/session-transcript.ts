import type { PersistedTurn } from '@courtwork/core/turn-protocol';
import { SESSION_WINDOW_MS, partitionSessions } from './session-window';

/**
 * CHAT-SESSION-1（ADR-013 §1 / 后果 3）：历史 session 的只读 transcript 是既有 Turn journal 的派生视图。
 *
 * journal 是 transcript 真源，且按既有不变量（见 turn-protocol-client 持久内容不含 user prompt 一测）
 * 只持久化助手 turn 与 interaction 事件，不含用户请求正文——历史 transcript 因此是助手侧只读记录。
 * 本模块不新建持久化格式，只把持久 turn 的终态时间戳按 1 小时窗口分组。
 */

/** 只读 transcript 的一条助手 turn。 */
export interface TranscriptSessionTurn {
  turnId: string;
  status: 'completed' | 'failed';
  /** 终态毫秒时间戳（completedAt / failedAt）。 */
  at: number;
  /** completed 取最终正文；failed 取部分正文，无则空串。 */
  assistantMessage: string;
}

/** 一个只读历史会话。 */
export interface TranscriptSession {
  /** 稳定 id：会话首条 turn 的 turnId。 */
  id: string;
  startedAt: number;
  endedAt: number;
  turns: TranscriptSessionTurn[];
}

interface TimedTurn extends TranscriptSessionTurn {
  order: number;
}

function terminalIso(turn: PersistedTurn): string {
  return turn.status === 'completed' ? turn.completedAt : turn.failedAt;
}

function toTimedTurn(turn: PersistedTurn, order: number): TimedTurn {
  const at = Date.parse(terminalIso(turn));
  if (Number.isNaN(at)) {
    // fail closed：终态时间戳不可解析属篡改/损坏，不静默丢弃或误分组。
    throw new Error(`Turn journal contains an unparsable terminal timestamp for turn ${turn.turnId}`);
  }
  return {
    order,
    turnId: turn.turnId,
    status: turn.status,
    at,
    assistantMessage: turn.status === 'completed' ? turn.assistantMessage : turn.assistantMessage ?? '',
  };
}

/**
 * 把持久化的助手 turn 列表按 1 小时连续性窗口分组为只读会话。
 * 按终态时间戳升序（journal 追加序不作分组唯一依据），相邻间隔 > 窗口处断开。
 */
export function transcriptSessionsFromTurns(
  turns: readonly PersistedTurn[],
  windowMs = SESSION_WINDOW_MS,
): TranscriptSession[] {
  const timed = turns
    .map(toTimedTurn)
    .sort((left, right) => (left.at - right.at) || (left.order - right.order));
  return partitionSessions(
    timed.map((turn) => ({ createdAt: turn.at, turn })),
    windowMs,
  ).map((group) => {
    const sessionTurns = group.map(({ turn }): TranscriptSessionTurn => ({
      turnId: turn.turnId,
      status: turn.status,
      at: turn.at,
      assistantMessage: turn.assistantMessage,
    }));
    return {
      id: sessionTurns[0].turnId,
      startedAt: sessionTurns[0].at,
      endedAt: sessionTurns[sessionTurns.length - 1].at,
      turns: sessionTurns,
    };
  });
}

/** 只依赖持久 turn 列表的最小读取面（既有 Turn journal store 天然满足）。 */
export interface PersistedTurnLister {
  list(): PersistedTurn[];
}

/**
 * 读取并派生只读历史会话。store.list() 是唯一校验权威——journal 被涂改时在此 fail closed
 * 抛出（不静默修复、不清除原件）。
 */
export function readTranscriptSessions(store: PersistedTurnLister): TranscriptSession[] {
  return transcriptSessionsFromTurns(store.list());
}
