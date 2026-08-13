// TOOL-READ-1 裁定七：Work 账本第二处读侧（projectSession）的闭集收口谱。
// 编译期穷举由 tsc 把守（新增 SessionEvent 成员漏改本读侧即编译失败）；本谱守运行期一层——
// 真正未识别的 type（外来/损坏行）不得静默返回原状态，须落显式登记并可在 trace 面看见。
import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { EMPTY_SESSION, projectSession } from './client';

describe('projectSession 未识别账本条目登记（TOOL-READ-1 裁定七）', () => {
  it('未识别 type 显式登记，不静默返回原状态', () => {
    const foreign = { type: 'from_a_newer_build', sessionId: 's', seq: 3, emittedAt: 't3' } as unknown as SessionEvent;
    const next = projectSession(EMPTY_SESSION, foreign);
    expect(next.unrecognizedEntries).toEqual([{ seq: 3, type: 'from_a_newer_build' }]);
    // 不取整份 fail-closed：其余投影字段照常推进（lastSeq 仍前进，旧档续可读）。
    expect(next.lastSeq).toBe(3);
  });

  it('闭集内条目（含新增 model_tool_result）一枚都不进未识别登记', () => {
    const events: SessionEvent[] = [
      { type: 'turn_linked', stepId: 's1', artifactType: 'a', attempt: 1, turnId: 't', providerRequestId: 'p', sessionId: 's', seq: 1, emittedAt: 't1' },
      { type: 'revision_recorded', revisionEventId: 'r1', sessionId: 's', seq: 2, emittedAt: 't2' },
      {
        type: 'model_tool_result', stepId: 's1', artifactType: 'a', round: 1, toolId: 'dossier-list',
        verified: true, content: '{"items":[]}', truncated: false, sessionId: 's', seq: 3, emittedAt: 't3',
      },
    ];
    const projected = events.reduce(projectSession, EMPTY_SESSION);
    expect(projected.unrecognizedEntries).toEqual([]);
    expect(projected.modelToolResults).toEqual([events[2]]);
  });
});
