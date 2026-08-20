import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { EMPTY_SESSION, projectSession, resetSessionForNewRun } from './client.js';

/**
 * PREVIEW-TAB-1 · D11（LEGAL-FIVE-FACES-1 转挂）：一个 matter 内多场景产物必须并存。
 *
 * 此前起新场景一律 `__clear__` 整本投影——跑完 S1 再跑 S2，时间线/图谱面回到空态，
 * 产物「只活在自己 session 的投影里」。durable 账本从未丢过它们（该前提已由 LEGAL-FIVE-FACES-1
 * 验收实测），丢的只是投影，故修在投影这一层：**运行态归零、已产出物留在 matter 上**。
 */
const event = (sessionId: string, seq: number, body: Record<string, unknown>) => ({
  sessionId,
  seq,
  emittedAt: '2026-08-10T00:00:00.000Z',
  ...body,
}) as unknown as SessionEvent;

function afterFirstScenario() {
  let state = EMPTY_SESSION;
  state = projectSession(state, event('s1', 1, {
    type: 'todo_snapshot',
    steps: [{ stepId: 'build-timeline', artifactType: 'legal.Timeline', label: '生成时间线', status: 'pending' }],
  }));
  state = projectSession(state, event('s1', 2, { type: 'progress', message: '正在整理卷宗' }));
  state = projectSession(state, event('s1', 3, {
    type: 'artifact_produced',
    artifactType: 'legal.Timeline',
    artifact: { caseId: 'c1', events: [{ id: 'e1' }] },
    evidenceGrades: [{ ref: 'e1', grade: 'verified' }],
  }));
  return projectSession(state, event('s1', 4, { type: 'scenario_completed' }));
}

describe('resetSessionForNewRun：起新场景不再清空已产出物', () => {
  it('已产出物与其证据等级留在 matter 上', () => {
    const next = resetSessionForNewRun(afterFirstScenario());

    expect(next.artifacts).toEqual({ 'legal.Timeline': { caseId: 'c1', events: [{ id: 'e1' }] } });
    expect(next.evidenceGrades).toEqual([{ ref: 'e1', grade: 'verified' }]);
  });

  it('运行态整体归零：进度/待办/终局/序号都不带进新场景', () => {
    const previous = afterFirstScenario();
    expect(previous.completed).toBe(true);

    const next = resetSessionForNewRun(previous);

    expect(next.progress).toEqual([]);
    expect(next.todo).toBeUndefined();
    expect(next.completed).toBe(false);
    expect(next.failures).toEqual([]);
    expect(next.confirmation).toBeUndefined();
    expect(next.scenarioFailure).toBeUndefined();
    expect(next.lastSeq).toBe(0);
  });

  it('第二个场景的产出与第一个并存，同 type 才覆盖', () => {
    const second = projectSession(resetSessionForNewRun(afterFirstScenario()), event('s2', 1, {
      type: 'artifact_produced',
      artifactType: 'legal.ReviewMatrix',
      artifact: { caseId: 'c1', rows: [] },
      evidenceGrades: [],
    }));

    expect(Object.keys(second.artifacts).sort()).toEqual(['legal.ReviewMatrix', 'legal.Timeline']);
  });

  it('离开 matter 仍是整本清空——`EMPTY_SESSION` 与本函数是两件事', () => {
    expect(EMPTY_SESSION.artifacts).toEqual({});
    expect(resetSessionForNewRun(afterFirstScenario())).not.toEqual(EMPTY_SESSION);
  });

  it('todo snapshot 逐字保留稳定身份、标签、产物类型与闭集状态', () => {
    const steps = [
      { stepId: 'read-materials', label: '读取材料', status: 'done' as const },
      { stepId: 'write-draft', artifactType: 'generic.DraftDocument', label: '产出文稿', status: 'awaiting_confirmation' as const },
    ];
    const projected = projectSession(EMPTY_SESSION, event('s1', 1, { type: 'todo_snapshot', steps }));

    expect(projected.todo).toEqual(steps);
    expect(projected.todo?.map(({ stepId, artifactType, label, status }) => ({ stepId, artifactType, label, status }))).toEqual(steps);
  });
});
