import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '../events/types.js';
import { derivePendingProjection } from './pending-projection.js';

/**
 * PROJECTION-RESUME-1：从既有 step_failed 事件确定性归并「未产出/待执行」子节输入。
 * 只归并会话事件能诚实回答的部分（模型/工具失败）；interrupted 归属 Turn journal 终态
 * 真源（会话事件裸推会在引语修复窗口误判 attempt-1 的 turn_linked 为中断），本函数恒回空。
 */

const BASE = { sessionId: 's1', emittedAt: '2026-07-17T00:00:00.000Z' } as const;

function modelFailed(seq: number, stepId: string, artifactType: string, attempt: number, reason: string, retryable: boolean): SessionEvent {
  return {
    ...BASE,
    seq,
    type: 'step_failed',
    scope: 'model',
    stepId,
    artifactType,
    attempt,
    turnId: `turn-${seq}`,
    providerRequestId: `req-${seq}`,
    reason: reason as never,
    message: `失败原文-${seq}`,
    retryable,
  } as SessionEvent;
}

function toolFailed(seq: number, toolId: string, reason: string): SessionEvent {
  return { ...BASE, seq, type: 'step_failed', scope: 'tool', toolId, reason, message: `工具失败-${seq}` } as SessionEvent;
}

function produced(seq: number, artifactType: string): SessionEvent {
  return { ...BASE, seq, type: 'artifact_produced', artifactType, artifact: { caseId: 'c1' }, evidenceGrades: [] } as SessionEvent;
}

describe('derivePendingProjection', () => {
  it('模型级失败按（stepId,artifactType）取最新一条（携 reason/attempt/retryable，不携散文 message）', () => {
    const out = derivePendingProjection([
      modelFailed(1, 'produce-a', 'test.A', 1, 'timeout', true),
      modelFailed(2, 'produce-a', 'test.A', 2, 'provider_http', false),
      modelFailed(3, 'produce-b', 'test.B', 1, 'timeout', true),
    ]);
    expect(out.failedModelSteps).toEqual([
      { stepId: 'produce-a', artifactType: 'test.A', attempt: 2, reason: 'provider_http', retryable: false },
      { stepId: 'produce-b', artifactType: 'test.B', attempt: 1, reason: 'timeout', retryable: true },
    ]);
  });

  it('工具级失败按 toolId 取最新一条', () => {
    const out = derivePendingProjection([
      toolFailed(1, 'party-verify', 'unavailable'),
      toolFailed(2, 'party-verify', 'not_configured'),
      toolFailed(3, 'doc-hash', 'mismatch'),
    ]);
    expect(out.failedToolSteps).toEqual([
      { toolId: 'party-verify', reason: 'not_configured' },
      { toolId: 'doc-hash', reason: 'mismatch' },
    ]);
  });

  it('非 step_failed 事件不参与归并；干净账本回全空且 interrupted/awaiting 恒缺省（真源边界）', () => {
    const out = derivePendingProjection([produced(1, 'test.A')]);
    expect(out).toEqual({ failedModelSteps: [], failedToolSteps: [], interruptedSteps: [] });
    expect(out.awaitingConfirmation).toBeUndefined();
  });

  it('确定性：同事件序两次归并深等', () => {
    const events = [modelFailed(1, 'produce-a', 'test.A', 1, 'timeout', true), toolFailed(2, 'party-verify', 'unavailable')];
    expect(derivePendingProjection(events)).toEqual(derivePendingProjection(events));
  });
});
