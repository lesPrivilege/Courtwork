import type { ArtifactType } from '@courtwork/schemas';
import type { ScenarioDefinition } from '@courtwork/registry';

export type TodoStepStatus = 'pending' | 'awaiting_confirmation' | 'done';

export interface TodoStep {
  artifactType: ArtifactType;
  label: string;
  status: TodoStepStatus;
}

/**
 * 进度快照的生成方式是纯函数：场景声明的执行计划 → todo 快照，LLM 不参与撰写/增删
 * 这份清单（docs/12 长任务架构调研，5.2 节核心裁定）。todo 本质是执行计划的可视化
 * 投影——MVP 四场景的步骤集合在注册表加载时已是已知有限集，不存在"步骤集合本身
 * 需要模型运行中决定"的问题，因此不开放"LLM 可写"的 todo 工具。
 */
export function deriveTodoSnapshot(
  scenario: ScenarioDefinition,
  producedSoFar: Partial<Record<ArtifactType, unknown>>,
  currentGateArtifactType?: ArtifactType,
): TodoStep[] {
  return scenario.outputArtifacts.map((artifactType) => {
    const gate = scenario.confirmationGates.find((g) => g.artifact === artifactType);
    const label = gate?.label ?? artifactType;
    if (artifactType === currentGateArtifactType) {
      return { artifactType, label, status: 'awaiting_confirmation' };
    }
    if (producedSoFar[artifactType] !== undefined) {
      return { artifactType, label, status: 'done' };
    }
    return { artifactType, label, status: 'pending' };
  });
}
