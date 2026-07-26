import type { SessionEvent } from '@courtwork/core';
import {
  WorkReplayError,
  workReplayFailureCopy,
  type WorkReplayResult,
  type WorkSessionRef,
} from '../protocol/client';

/**
 * CONTRACT-OUTPUT-TRUTH-1「过手即拆」外提：恢复入口的**判定**离开 `App.tsx`，只留应用动作。
 *
 * 本单新增概念：零。这是既有 `recoverWorkRun` 内联分支的平移——判别联合的每个分支原样保留，
 * 只是把「读什么 → 判成什么」与「React 该 set 什么」切开，让分支矩阵可以脱离 React 直接测。
 *
 * **不含** pointer compare-and-clear 矩阵：那属 `CONTRACT-TRACE-1`。本模块只把既有的
 * 「found:false / 非 paused 即清、typed 失败即保留」照搬，不新增也不收紧清除条件。
 */
export type WorkRecoveryPlan =
  /** typed 读取失败：**保留** pointer，给可重试反馈。「暂时读不到」不等于「不存在」。 */
  | { kind: 'retryable'; message: string }
  /** 宿主明确确认没有，或账本已终结：清 pointer 并说明下一步。 */
  | { kind: 'clear'; message: string }
  /** 持久 failed：只读回放，pointer 由既有分支清除。 */
  | { kind: 'hydrate_failed'; events: SessionEvent[] }
  /** 停在门禁：水合后续行。 */
  | { kind: 'hydrate_paused'; events: SessionEvent[] };

/**
 * 把一次 replay 的结果（或 typed 失败）翻译成恢复动作。纯函数、零 React、零 IO。
 *
 * `outcome` 用判别联合而不是 try/catch 参数，是为了让「抛错」这一路也能被同一张表覆盖——
 * 调用方一旦漏掉某个分支，TypeScript 会在此报缺。
 */
export function planWorkRecovery(
  outcome: { status: 'replayed'; replay: WorkReplayResult } | { status: 'failed'; error: unknown },
): WorkRecoveryPlan {
  if (outcome.status === 'failed') {
    return { kind: 'retryable', message: workReplayFailureCopy(outcome.error) };
  }
  const { replay } = outcome;
  if (!replay.found) {
    return { kind: 'clear', message: '未找到可继续的合同审查进度，请重新开始审查' };
  }
  if (replay.phase === 'failed' && replay.events.length > 0) {
    return { kind: 'hydrate_failed', events: replay.events };
  }
  if (replay.phase !== 'paused' || replay.events.length === 0) {
    return {
      kind: 'clear',
      message:
        replay.phase === 'completed'
          ? '上次的合同审查已办结，如需重做请重新开始审查'
          : '未找到可继续的合同审查进度，请重新开始审查',
    };
  }
  return { kind: 'hydrate_paused', events: replay.events };
}

/** 调 replay 并把抛出的 typed 失败收进同一判别联合，供 `planWorkRecovery` 统一分流。 */
export async function readWorkRecovery(
  replay: (query: WorkSessionRef) => Promise<WorkReplayResult>,
  query: WorkSessionRef,
): Promise<{ status: 'replayed'; replay: WorkReplayResult } | { status: 'failed'; error: unknown }> {
  try {
    return { status: 'replayed', replay: await replay(query) };
  } catch (error) {
    // 非 typed 的意外异常同样不吞：交给 planWorkRecovery 走可重试兜底文案，绝不当作「不存在」。
    return { status: 'failed', error: error instanceof WorkReplayError ? error : error };
  }
}
