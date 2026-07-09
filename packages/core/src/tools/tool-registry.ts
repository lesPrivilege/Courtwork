import type { ToolDefinition } from '@courtwork/tools';
import type { EvidenceGrade } from '../evidence/grade.js';

export interface GradedToolBinding {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: ToolDefinition<any, any>;
  grade: EvidenceGrade;
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
