import type { ScenarioRuntime } from '@courtwork/registry';

export type TodoStepStatus = 'pending' | 'awaiting_confirmation' | 'done';

export interface TodoStep {
  /** 声明步骤树的步 id（docs/53 输出即视图：纲要父行按此对齐）。 */
  stepId: string;
  /** 本步产出的 artifact 类型（namespaced）；纯过程步（如工具核验）无产出。 */
  artifactType?: string;
  label: string;
  status: TodoStepStatus;
}

/**
 * 进度快照的生成方式是纯函数：场景声明的步骤树 → todo 快照，LLM 不参与撰写/增删
 * 这份清单（docs/12 长任务架构调研，5.2 节核心裁定）。迁 ABI 后快照源从
 * outputArtifacts 派生升级为声明步骤树（registry 已在装载期把缺省 steps 派生齐）。
 */
export function deriveTodoSnapshot(
  scenario: ScenarioRuntime,
  producedSoFar: Partial<Record<string, unknown>>,
  currentGateArtifactType?: string,
): TodoStep[] {
  // 工具全部先于产出序列执行（executor 语义）：任一产出已落或正停在门禁，
  // 即证明过程步（无 artifact 的步）已经走过——按此确定性推导，不猜。
  const produceSequenceStarted =
    currentGateArtifactType !== undefined ||
    scenario.outputArtifacts.some((typeId) => producedSoFar[typeId] !== undefined);

  return scenario.steps.map((step) => {
    const gate =
      scenario.confirmationPolicy.mode === 'gates'
        ? scenario.confirmationPolicy.gates.find((g) => g.artifact !== undefined && g.artifact === step.artifact)
        : undefined;
    const label = gate?.label ?? step.title;
    if (step.artifact === undefined) {
      return { stepId: step.id, label, status: produceSequenceStarted ? 'done' : 'pending' };
    }
    if (step.artifact === currentGateArtifactType) {
      return { stepId: step.id, artifactType: step.artifact, label, status: 'awaiting_confirmation' };
    }
    if (producedSoFar[step.artifact] !== undefined) {
      return { stepId: step.id, artifactType: step.artifact, label, status: 'done' };
    }
    return { stepId: step.id, artifactType: step.artifact, label, status: 'pending' };
  });
}
