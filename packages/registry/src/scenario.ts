import * as z from 'zod';
import { ArtifactTypeEnum } from '@courtwork/schemas';

const TriggerConditionSchema = z
  .object({
    fileTypes: z.array(z.string().min(1)).default([]),
    userActions: z.array(z.string().min(1)).default([]),
    classifierTags: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (value) =>
      value.fileTypes.length > 0 || value.userActions.length > 0 || value.classifierTags.length > 0,
    {
      message: '触发条件（文件类型/用户动作/分类器标签）至少提供一项，否则场景永远不会被触发',
      path: ['fileTypes'],
    },
  );
export type TriggerCondition = z.infer<typeof TriggerConditionSchema>;

/**
 * artifact 可选：存在时必须 ⊆ outputArtifacts（见下方跨字段 refine），
 * 缺席时仅凭 label 独立成立——用于产物尚无对应 schema 类型的场景（如 S4 文书起草，
 * 真实产物类型 RevisionInstructionSet 待 W4 在 packages/schemas 提案落地）。
 */
const ConfirmationGateSchema = z.object({
  artifact: ArtifactTypeEnum.optional(),
  label: z.string().min(1),
});
export type ConfirmationGate = z.infer<typeof ConfirmationGateSchema>;

function uniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

const ScenarioDefinitionObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: TriggerConditionSchema,
  inputArtifacts: z.array(ArtifactTypeEnum).default([]),
  /** 结构校验 only：不针对具体 id 做白名单限制。packages/tools（W5）尚未开工，
   * 硬编码工具 id 会违背"注册表不用改代码就能上新场景/工具"的设计初衷。 */
  toolIds: z.array(z.string().min(1)).default([]),
  outputArtifacts: z.array(ArtifactTypeEnum).default([]),
  uiTemplateId: z.string().min(1),
  /** 非空：把"留人确认是产品纪律"落到校验层，场景定义漏掉确认节点在加载时即报错。 */
  confirmationGates: z.array(ConfirmationGateSchema).min(1),
  promptTemplateRef: z.string().min(1),
});

export const ScenarioDefinitionSchema = ScenarioDefinitionObjectSchema.refine(
  (value) => uniqueStrings(value.toolIds),
  {
    message: 'toolIds 数组内存在重复的工具 id',
    path: ['toolIds'],
  },
)
  .refine(
    (value) =>
      value.confirmationGates.every(
        (gate) => gate.artifact === undefined || value.outputArtifacts.includes(gate.artifact),
      ),
    {
      message: 'confirmationGates 中某一项引用了 artifact 字段，但该类型不在 outputArtifacts 声明范围内',
      path: ['confirmationGates'],
    },
  )
  .meta({
    title: 'ScenarioDefinition',
    description:
      '场景注册表的场景声明：触发条件 + 输入/产出 artifact 类型引用 + 工具集 + UI 模板标识 + 确认节点 + 提示词模板引用。',
  });

export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
