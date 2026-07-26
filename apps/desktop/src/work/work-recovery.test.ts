import { describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { WorkReplayError, type WorkReplayResult } from '../protocol/client';
import { planWorkRecovery, readWorkRecovery } from './work-recovery';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O3「过手即拆」外提件的分支矩阵。
 * 判定脱离 React 直接测——这正是外提的收益。
 */
const REF = { caseId: 'case-x', sessionId: 'session-1' };

function event(seq: number): SessionEvent {
  return {
    type: 'scenario_progress',
    sessionId: REF.sessionId,
    seq,
    emittedAt: '2026-07-20T00:00:00.000Z',
    message: 'probe',
  } as unknown as SessionEvent;
}

function found(overrides: Partial<Extract<WorkReplayResult, { found: true }>>): WorkReplayResult {
  return {
    found: true,
    ref: REF,
    phase: 'paused',
    events: [event(1)],
    materialRefs: ['mat-primary'],
    sessionCreatedAt: '2026-07-20T11:22:33.444Z',
    ...overrides,
  };
}

describe('planWorkRecovery', () => {
  it('typed 读取失败一律可重试，且**不**要求清 pointer', () => {
    for (const reason of ['unavailable', 'corrupt', 'unsupported_version', 'ref_mismatch'] as const) {
      const plan = planWorkRecovery({ status: 'failed', error: new WorkReplayError(reason, '读不到') });
      expect(plan.kind, `${reason} 不应被判成 clear`).toBe('retryable');
    }
  });

  it('四种 reason 的文案各不相同，且都不暗示进度已丢失', () => {
    const messages = (['unavailable', 'corrupt', 'unsupported_version', 'ref_mismatch'] as const).map((reason) => {
      const plan = planWorkRecovery({ status: 'failed', error: new WorkReplayError(reason, 'x') });
      if (plan.kind !== 'retryable') throw new Error('unreachable');
      return plan.message;
    });
    expect(new Set(messages).size).toBe(4);
    for (const message of messages) expect(message).not.toContain('未找到');
  });

  it('非 typed 的意外异常同样走可重试兜底，绝不当作「不存在」', () => {
    const plan = planWorkRecovery({ status: 'failed', error: new TypeError('意外') });
    expect(plan.kind).toBe('retryable');
  });

  it('found:false 才清 pointer', () => {
    const plan = planWorkRecovery({
      status: 'replayed',
      replay: { found: false, ref: REF, phase: 'interrupted', events: [] },
    });
    expect(plan).toMatchObject({ kind: 'clear' });
  });

  it('持久 failed 且有事件 → 只读水合', () => {
    const plan = planWorkRecovery({ status: 'replayed', replay: found({ phase: 'failed' }) });
    expect(plan).toMatchObject({ kind: 'hydrate_failed' });
  });

  it('completed 与其他非 paused 相位 → 清 pointer，文案分流', () => {
    const completed = planWorkRecovery({ status: 'replayed', replay: found({ phase: 'completed' }) });
    if (completed.kind !== 'clear') throw new Error('unreachable');
    expect(completed.message).toContain('已办结');

    const running = planWorkRecovery({ status: 'replayed', replay: found({ phase: 'running' }) });
    if (running.kind !== 'clear') throw new Error('unreachable');
    expect(running.message).toContain('未找到');
  });

  it('paused 但零事件不算可续行（水合不出任何账本）', () => {
    const plan = planWorkRecovery({ status: 'replayed', replay: found({ phase: 'paused', events: [] }) });
    expect(plan.kind).toBe('clear');
  });

  it('paused 且有事件 → 水合续行，事件原样透传', () => {
    const events = [event(1), event(2)];
    const plan = planWorkRecovery({ status: 'replayed', replay: found({ phase: 'paused', events }) });
    expect(plan).toMatchObject({ kind: 'hydrate_paused' });
    if (plan.kind !== 'hydrate_paused') throw new Error('unreachable');
    expect(plan.events).toEqual(events);
  });
});

describe('readWorkRecovery', () => {
  it('成功即 replayed 分支', async () => {
    const replay = vi.fn(async () => found({}));
    await expect(readWorkRecovery(replay, REF)).resolves.toMatchObject({ status: 'replayed' });
    expect(replay).toHaveBeenCalledWith(REF);
  });

  it('抛错收进 failed 分支而不是外泄——调用方永远只面对一张分支表', async () => {
    const replay = vi.fn(async () => {
      throw new WorkReplayError('unavailable', '宿主拒绝');
    });
    const outcome = await readWorkRecovery(replay, REF);
    expect(outcome.status).toBe('failed');
    expect(planWorkRecovery(outcome).kind).toBe('retryable');
  });
});
