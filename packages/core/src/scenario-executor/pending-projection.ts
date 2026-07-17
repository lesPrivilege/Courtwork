import type { SessionEvent } from '../events/types.js';
import type { ProjectionPendingInput } from '../assembly/segments.js';

/**
 * PROJECTION-RESUME-1：从既有 step_failed 事件确定性归并「未产出/待执行」子节输入
 * （session-handoff 调研的最大诚实性缺口：续行会话分不清上次是失败中断还是没开始）。
 *
 * 真源边界：本函数只归并会话事件能诚实回答的部分——模型/工具失败（每步/每工具取最新一条，
 * Map 插入序保持首见顺序）。interrupted 相态的真源是 Turn journal 终态
 * （work-state-store.interruptedTurns()）：仅凭会话事件把「无 artifact_produced 的 turn_linked」
 * 推定为中断，会在引语修复窗口（attempt-1 已完成、attempt-2 组装中）误判，故 interruptedSteps
 * 由持有 Turn 终态的调用方供给，本函数恒回空；awaitingConfirmation 同理（生成时刻无停门，
 * 与 pendingGateLabels 生产供给同源同窄）。散文 message 留账本，不入投影。
 */
export function derivePendingProjection(events: readonly SessionEvent[]): ProjectionPendingInput {
  const model = new Map<string, ProjectionPendingInput['failedModelSteps'][number]>();
  const tool = new Map<string, ProjectionPendingInput['failedToolSteps'][number]>();
  for (const event of events) {
    if (event.type !== 'step_failed') continue;
    if (event.scope === 'model') {
      model.set(`${event.stepId}\u0000${event.artifactType}`, {
        stepId: event.stepId,
        artifactType: event.artifactType,
        attempt: event.attempt,
        reason: event.reason,
        retryable: event.retryable,
      });
    } else {
      tool.set(event.toolId, { toolId: event.toolId, reason: event.reason });
    }
  }
  return { failedModelSteps: [...model.values()], failedToolSteps: [...tool.values()], interruptedSteps: [] };
}
