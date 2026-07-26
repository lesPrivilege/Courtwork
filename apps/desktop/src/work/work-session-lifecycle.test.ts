import { describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '@courtwork/core';

import { WorkReplayError, type WorkCommandOutcome, type WorkReplayResult } from '../protocol/client';
import type { WorkSessionRecord } from './work-session-store';
import {
  applyWorkPointer,
  createStartPointerTracker,
  planCandidateReplay,
  planWorkRecovery,
  readWorkReplay,
} from './work-session-lifecycle';

/**
 * CONTRACT-TRACE-1：pointer 生命周期矩阵。
 *
 * 立测的理由是**不对称**：pointer 写错只是多一条恢复入口，pointer 清错则是把用户的审查从
 * 界面上抹掉。故每条清除路径都必须有一个「已换成另一 session」的反例守着——
 * blanket clear 与 compare-and-clear 在 happy path 上长得一模一样。
 */

const CASE = 'case-x';
const CANDIDATE = 'session-new';
const OLD: WorkSessionRecord = { sessionId: 'session-old', contractMaterialId: 'mat-old' };
const CONTRACT = 'mat-new';
const REF = { caseId: CASE, sessionId: CANDIDATE };

function event(seq: number): SessionEvent {
  return {
    type: 'scenario_progress',
    sessionId: CANDIDATE,
    seq,
    emittedAt: '2026-07-26T00:00:00.000Z',
    message: 'probe',
  } as unknown as SessionEvent;
}

function found(overrides: Partial<Extract<WorkReplayResult, { found: true }>> = {}): WorkReplayResult {
  return {
    found: true,
    ref: REF,
    phase: 'paused',
    events: [event(1)],
    materialRefs: [CONTRACT],
    sessionCreatedAt: '2026-07-26T11:22:33.444Z',
    ...overrides,
  };
}

function storeStub(initial: WorkSessionRecord | null) {
  let current = initial;
  return {
    read: vi.fn(() => current),
    persist: vi.fn((_caseId: string, record: WorkSessionRecord) => { current = record; }),
    clear: vi.fn(() => { current = null; }),
    get value() { return current; },
  };
}

const tracker = (previous: WorkSessionRecord | null) => createStartPointerTracker({
  candidateSessionId: CANDIDATE,
  contractMaterialId: CONTRACT,
  previous,
});

const rejected = (reason: Extract<WorkCommandOutcome, { status: 'rejected' }>['reason']): WorkCommandOutcome =>
  ({ status: 'rejected', reason, message: '未就绪' });

describe('applyWorkPointer · compare-and-set/clear，永不 blanket clear', () => {
  it('clear_if_matches 只清「当前存储值恰为该 session」的记录', () => {
    const store = storeStub({ sessionId: CANDIDATE, contractMaterialId: CONTRACT });
    applyWorkPointer(CASE, { kind: 'clear_if_matches', sessionId: CANDIDATE }, store);
    expect(store.clear).toHaveBeenCalledWith(CASE);
    expect(store.value).toBeNull();
  });

  it('存储值已换成另一 session 时不动它（反例：blanket clear 在此必红）', () => {
    const store = storeStub(OLD);
    applyWorkPointer(CASE, { kind: 'clear_if_matches', sessionId: CANDIDATE }, store);
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.value).toEqual(OLD);
  });

  it('无记录时 clear_if_matches 不写不清', () => {
    const store = storeStub(null);
    applyWorkPointer(CASE, { kind: 'clear_if_matches', sessionId: CANDIDATE }, store);
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.persist).not.toHaveBeenCalled();
  });

  it('keep 一律零写零清', () => {
    const store = storeStub(OLD);
    applyWorkPointer(CASE, { kind: 'keep' }, store);
    expect(store.persist).not.toHaveBeenCalled();
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.value).toEqual(OLD);
  });
});

describe('createStartPointerTracker · candidate 不是建立成功', () => {
  it('首枚 post-CAS event 才是建立时点；此前 candidate 零持久', () => {
    const track = tracker(OLD);
    expect(track.established).toBe(false);
    const action = track.observeDurableEvent();
    expect(action).toEqual({ kind: 'persist', record: { sessionId: CANDIDATE, contractMaterialId: CONTRACT } });
    expect(track.established).toBe(true);
  });

  it('第二枚及以后的 event 不重复写', () => {
    const track = tracker(null);
    track.observeDurableEvent();
    expect(track.observeDurableEvent()).toEqual({ kind: 'keep' });
  });

  it.each(['command_conflict', 'case_busy', 'invalid_scope', 'not_configured'] as const)(
    'rejected/%s：旧记录逐字不变，临时 candidate 零持久',
    (reason) => {
      const store = storeStub(OLD);
      const track = tracker(OLD);
      const plan = track.planOutcome(rejected(reason));
      expect(plan).toEqual({ kind: 'pointer', action: { kind: 'keep' } });
      applyWorkPointer(CASE, { kind: 'keep' }, store);
      expect(store.value).toEqual(OLD);
      expect(store.persist).not.toHaveBeenCalled();
      expect(store.clear).not.toHaveBeenCalled();
    },
  );

  it('rejected 且**无**旧记录：仍为空', () => {
    const store = storeStub(null);
    const track = tracker(null);
    const plan = track.planOutcome(rejected('case_busy'));
    if (plan.kind !== 'pointer') throw new Error('unreachable');
    applyWorkPointer(CASE, plan.action, store);
    expect(store.value).toBeNull();
  });

  it('canceled：只清「恰为 candidate」的 pointer；candidate 从未建立则旧 pointer 原样', () => {
    const track = tracker(OLD);
    const plan = track.planOutcome({ status: 'canceled', ref: REF });
    expect(plan).toEqual({ kind: 'pointer', action: { kind: 'clear_if_matches', sessionId: CANDIDATE } });
    const store = storeStub(OLD);
    if (plan.kind !== 'pointer') throw new Error('unreachable');
    applyWorkPointer(CASE, plan.action, store);
    expect(store.value).toEqual(OLD);
  });

  it('failed：无论是否观察过事件都 replay candidate（不凭瞬时 outcome 定持久事实）', () => {
    const observed = tracker(OLD);
    observed.observeDurableEvent();
    const failure: WorkCommandOutcome = {
      status: 'failed', ref: REF, reason: 'provider', message: 'x', retryable: true,
    };
    expect(observed.planOutcome(failure)).toEqual({ kind: 'verify_by_replay' });
    expect(tracker(OLD).planOutcome(failure)).toEqual({ kind: 'verify_by_replay' });
  });

  it.each(['paused', 'completed'] as const)('%s 且本进程未观察到事件 → 先 replay candidate 再补持久', (status) => {
    const outcome = (status === 'paused'
      ? { status: 'paused', ref: REF, requestId: 'req-1' }
      : { status: 'completed', ref: REF }) as WorkCommandOutcome;
    expect(tracker(OLD).planOutcome(outcome)).toEqual({ kind: 'verify_by_replay' });
    const observed = tracker(OLD);
    observed.observeDurableEvent();
    expect(observed.planOutcome(outcome)).toEqual({ kind: 'pointer', action: { kind: 'keep' } });
  });
});

describe('planCandidateReplay · found=true 才可补持久', () => {
  it.each(['paused', 'failed', 'completed'] as const)('found=true/%s → 建立或保留', (phase) => {
    expect(planCandidateReplay(
      { status: 'replayed', replay: found({ phase }) },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    )).toEqual({ kind: 'persist', record: { sessionId: CANDIDATE, contractMaterialId: CONTRACT } });
  });

  it.each(['canceled', 'interrupted', 'running'] as const)('found=true/%s → 只清 matching candidate', (phase) => {
    expect(planCandidateReplay(
      { status: 'replayed', replay: found({ phase }) },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    )).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });

  it('found=false → 只清 matching candidate，不删尚存的旧 pointer', () => {
    const action = planCandidateReplay(
      { status: 'replayed', replay: { found: false, ref: REF, phase: 'interrupted', events: [] } },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    );
    expect(action).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
    const store = storeStub(OLD);
    applyWorkPointer(CASE, action, store);
    expect(store.value).toEqual(OLD);
  });

  it.each(['corrupt', 'ref_mismatch'] as const)('typed %s → 只清 matching candidate', (reason) => {
    expect(planCandidateReplay(
      { status: 'failed', error: new WorkReplayError(reason, 'x') },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    )).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });

  it.each(['unavailable', 'unsupported_version'] as const)('typed %s → 保留（读不到 ≠ 不存在）', (reason) => {
    expect(planCandidateReplay(
      { status: 'failed', error: new WorkReplayError(reason, 'x') },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    )).toEqual({ kind: 'keep' });
  });

  it('未分类 rejection → 保留', () => {
    expect(planCandidateReplay(
      { status: 'failed', error: new TypeError('意外') },
      { sessionId: CANDIDATE, contractMaterialId: CONTRACT },
    )).toEqual({ kind: 'keep' });
  });
});

describe('planWorkRecovery · replay/typed failure 矩阵', () => {
  const decide = (outcome: Parameters<typeof planWorkRecovery>[0], hasActiveOwner = false) =>
    planWorkRecovery(outcome, { sessionId: CANDIDATE, hasActiveOwner });

  it.each(['unavailable', 'unsupported_version'] as const)('typed %s → 可重试且保留 pointer', (reason) => {
    const decision = decide({ status: 'failed', error: new WorkReplayError(reason, 'x') });
    expect(decision.plan.kind).toBe('retryable');
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it('未分类 rejection → 可重试且保留 pointer', () => {
    const decision = decide({ status: 'failed', error: new TypeError('意外') });
    expect(decision.plan.kind).toBe('retryable');
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it.each(['corrupt', 'ref_mismatch'] as const)('typed %s → 清 matching pointer', (reason) => {
    const decision = decide({ status: 'failed', error: new WorkReplayError(reason, 'x') });
    expect(decision.plan.kind).toBe('unrecoverable');
    expect(decision.pointer).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });

  it('四种 typed 失败的文案各不相同，且都不暗示进度已丢失', () => {
    const messages = (['unavailable', 'corrupt', 'unsupported_version', 'ref_mismatch'] as const).map((reason) => {
      const { plan } = decide({ status: 'failed', error: new WorkReplayError(reason, 'x') });
      if (plan.kind === 'hydrate') throw new Error('unreachable');
      return plan.message;
    });
    expect(new Set(messages).size).toBe(4);
    for (const message of messages) expect(message).not.toContain('未找到');
  });

  it('found:false → 清 matching pointer', () => {
    const decision = decide({
      status: 'replayed',
      replay: { found: false, ref: REF, phase: 'interrupted', events: [] },
    });
    expect(decision.plan.kind).toBe('unrecoverable');
    expect(decision.pointer).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });

  it('paused 且有事件 → 水合续行，事件原样透传，pointer 保留', () => {
    const events = [event(1), event(2)];
    const decision = decide({ status: 'replayed', replay: found({ phase: 'paused', events }) });
    expect(decision.plan).toEqual({ kind: 'hydrate', phase: 'paused', events });
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it('paused 但零事件不算可续行（水合不出任何账本）', () => {
    const decision = decide({ status: 'replayed', replay: found({ phase: 'paused', events: [] }) });
    expect(decision.plan.kind).toBe('unrecoverable');
  });

  it('durable failed → 只读水合且**保留** pointer', () => {
    const decision = decide({ status: 'replayed', replay: found({ phase: 'failed' }) });
    expect(decision.plan).toMatchObject({ kind: 'hydrate', phase: 'failed' });
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it('completed → 只读重开且**保留** pointer（不因已办结而抹掉账本入口）', () => {
    const decision = decide({ status: 'replayed', replay: found({ phase: 'completed' }) });
    expect(decision.plan).toMatchObject({ kind: 'hydrate', phase: 'completed' });
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it.each(['canceled', 'interrupted'] as const)('phase %s → 清 matching pointer', (phase) => {
    const decision = decide({ status: 'replayed', replay: found({ phase }) });
    expect(decision.pointer).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });

  it('running 且同进程有 ref 一致的 active owner → 保留', () => {
    const decision = decide({ status: 'replayed', replay: found({ phase: 'running' }) }, true);
    expect(decision.pointer).toEqual({ kind: 'keep' });
  });

  it('running 但无 active owner → 按 interrupted 清除', () => {
    const decision = decide({ status: 'replayed', replay: found({ phase: 'running' }) }, false);
    expect(decision.pointer).toEqual({ kind: 'clear_if_matches', sessionId: CANDIDATE });
  });
});

describe('readWorkReplay', () => {
  it('成功即 replayed 分支', async () => {
    const replay = vi.fn(async () => found());
    await expect(readWorkReplay(replay, REF)).resolves.toMatchObject({ status: 'replayed' });
    expect(replay).toHaveBeenCalledWith(REF);
  });

  it('抛错收进 failed 分支而不是外泄——调用方永远只面对一张分支表', async () => {
    const replay = vi.fn(async () => { throw new WorkReplayError('unavailable', '宿主拒绝'); });
    const outcome = await readWorkReplay(replay, REF);
    expect(outcome.status).toBe('failed');
    expect(planWorkRecovery(outcome, { sessionId: CANDIDATE, hasActiveOwner: false }).plan.kind).toBe('retryable');
  });
});
