import type { ToolDefinition } from '@courtwork/tools';
import type { SideEffectClass } from '@courtwork/schemas';
import type { EvidenceGrade } from '../evidence/grade.js';

export interface GradedToolBinding {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: ToolDefinition<any, any>;
  grade: EvidenceGrade;
  /**
   * 副作用分级（AUDIT-SEAL-1 运行时门）：toolIds 不论 confirmationPolicy 模式都在
   * gate 前核对；只允许 pure_read 与 ADR-004 无损级 copy/mkdir。缺省 pure_read——
   * 装配点为文件执行器/外发/MCP 等副作用工具显式声明，core 强制、包无权放宽。
   */
  sideEffect?: SideEffectClass;
}

/**
 * toolId → {ToolDefinition, EvidenceGrade} 绑定。等级判定在这里声明(由装配点填充)，
 * 不是工具契约本身的一部分——tools 包保持不认识"等级"这个概念。
 */
export interface ToolRegistry {
  register(toolId: string, binding: GradedToolBinding): void;
  get(toolId: string): GradedToolBinding | undefined;
}

export function createToolRegistry(): ToolRegistry {
  const bindings = new Map<string, GradedToolBinding>();
  return {
    register(toolId, binding) {
      bindings.set(toolId, binding);
    },
    get(toolId) {
      return bindings.get(toolId);
    },
  };
}
