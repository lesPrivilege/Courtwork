import { createContext, useContext } from 'react';
import type { EvidenceGradeAnnotation } from '@courtwork/core';

/**
 * 具名工作面 renderer 的宿主渲染上下文（GENERIC-PACK-1 新增概念，唯一一枚）。
 *
 * **为何非加不可**：component blueprint 的入参契约恒为 `{descriptor, payload}`（ADR-012 决定四），
 * 而时间线/图谱/修订三面除 payload 外还要读**宿主会话派生量**（证据等级台账）。矩阵首枚之所以
 * 能零上下文迁完，只因它恰好不需要；其余三面若不给通道，迁移债结构性无法偿还。
 *
 * 边界三条：①本上下文是**宿主侧** React context，不入 Package ABI——垂类包仍只声明
 * `uiTemplateId`，`HostRendererComponentProps` 一字未动；②载荷必须领域无关（此处
 * `evidenceGrades` 是 core 的 `WorkSessionProjection` 字段，非垂类语义）；③无 Provider 即抛，
 * 不给默认空值——缺装配是显式失败，不是「渲染成没有等级」的静默降级。
 */
export interface WorkbenchRenderContextValue {
  readonly evidenceGrades: readonly EvidenceGradeAnnotation[];
}

const WorkbenchRenderContext = createContext<WorkbenchRenderContextValue | undefined>(undefined);

export const WorkbenchRenderProvider = WorkbenchRenderContext.Provider;

export function useWorkbenchRenderContext(): WorkbenchRenderContextValue {
  const value = useContext(WorkbenchRenderContext);
  if (value === undefined) {
    throw new Error('workbench render context is not mounted: a named-view renderer rendered outside WorkbenchRenderProvider');
  }
  return value;
}
