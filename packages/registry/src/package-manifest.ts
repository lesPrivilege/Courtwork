import * as z from 'zod';
import {
  ArtifactTypeIdSchema,
  ConfirmationPolicySchema,
  type ArtifactDescriptor,
  type PackageIdentity,
} from '@courtwork/schemas';

/**
 * PACKAGE-ABI（施工序第 2 步，2026-07-13）：垂类包 manifest 与五 registry 的契约层。
 * 包域律：语义全部住包（本文件只定义装载形状），机制住底座（admission/registries）。
 */

/** 场景 id 双命名空间形制（docs/decisions/ADR-002-schema-workflow.md）：`包id.场景名`，如 legal.S3。 */
export const ScenarioIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*\.[A-Za-z][A-Za-z0-9-]*$/, '场景 id 必须是 namespaced 形制（如 legal.S3）');
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;

/** ADR-007：交互模板随垂类包命名，形制与场景 id 一致。 */
export const InteractionTemplateIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*\.[A-Za-z][A-Za-z0-9-]*$/,
    'interaction template id 必须是 namespaced 形制（如 legal.review-position）',
  );

export const InteractionTemplateOptionSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
  })
  .strict();
export type InteractionTemplateOption = z.infer<typeof InteractionTemplateOptionSchema>;

export const InteractionTemplateSchema = z
  .object({
    id: InteractionTemplateIdSchema,
    kind: z.enum(['single_choice', 'confirmation']),
    question: z.string().trim().min(1),
    options: z.array(InteractionTemplateOptionSchema).min(1),
    skippable: z.boolean(),
    anchorPolicy: z.enum(['none', 'optional', 'required']),
    uiTemplateId: z.literal('question-card'),
  })
  .strict()
  .refine((value) => unique(value.options.map((option) => option.id)), {
    message: 'interaction template 的 option id 必须唯一',
    path: ['options'],
  })
  .meta({
    title: 'InteractionTemplate',
    description: 'ADR-007 受控交互模板：垂类内容 + 锚点政策；不携带运行时锚点或 UI 样式。',
  });
export type InteractionTemplate = z.infer<typeof InteractionTemplateSchema>;

export const PackageTriggerSchema = z
  .object({
    fileTypes: z.array(z.string().min(1)).default([]),
    userActions: z.array(z.string().min(1)).default([]),
    classifierTags: z.array(z.string().min(1)).default([]),
  })
  .strict()
  .refine(
    (value) =>
      value.fileTypes.length > 0 || value.userActions.length > 0 || value.classifierTags.length > 0,
    { message: '触发条件至少提供一项，否则场景永远不会被触发', path: ['fileTypes'] },
  );
export type PackageTrigger = z.infer<typeof PackageTriggerSchema>;

/**
 * 声明的步骤树（docs/architecture/schema-engineering.md 输出即视图：step id 对齐声明步骤树，纲要与视图映射段共用）。
 * 缺省时注册期按 outputArtifacts 确定性派生。
 */
export const ScenarioStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    artifact: ArtifactTypeIdSchema.optional(),
  })
  .strict();
export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

const PackageScenarioObjectSchema = z
  .object({
    id: ScenarioIdSchema,
    name: z.string().min(1),
    trigger: PackageTriggerSchema,
    inputArtifacts: z.array(ArtifactTypeIdSchema).default([]),
    toolIds: z.array(z.string().min(1)).default([]),
    outputArtifacts: z.array(ArtifactTypeIdSchema).default([]),
    /** 场景级面板模板；artifact 级模板在各 descriptor 上。 */
    uiTemplateId: z.string().min(1),
    confirmationPolicy: ConfirmationPolicySchema,
    /** 指向本包 promptSegments 内的声明段正文；加载期解析闭合，ref 字面值不上 wire。 */
    promptSegmentRef: z.string().min(1),
    steps: z.array(ScenarioStepSchema).optional(),
  })
  .strict();

export const PackageScenarioSchema = PackageScenarioObjectSchema.refine(
  (value) => unique(value.toolIds),
  { message: 'toolIds 数组内存在重复的工具 id', path: ['toolIds'] },
)
  .refine(
    (value) =>
      value.confirmationPolicy.mode !== 'gates' ||
      value.confirmationPolicy.gates.every(
        (gate) => gate.artifact === undefined || value.outputArtifacts.includes(gate.artifact),
      ),
    { message: 'confirmationPolicy.gates 引用的 artifact 不在 outputArtifacts 声明范围内', path: ['confirmationPolicy'] },
  )
  .refine(
    (value) =>
      value.steps === undefined ||
      value.steps.every((step) => step.artifact === undefined || value.outputArtifacts.includes(step.artifact)),
    { message: 'steps 引用的 artifact 不在 outputArtifacts 声明范围内', path: ['steps'] },
  )
  .refine((value) => value.steps === undefined || unique(value.steps.map((step) => step.id)), {
    message: 'steps 的 id 必须唯一（纲要与视图映射按 id 对齐）',
    path: ['steps'],
  })
  .meta({
    title: 'PackageScenario',
    description:
      'ABI 场景声明：namespaced id + 触发 + artifact 引用 + confirmationPolicy + 声明段引用 + 步骤树。',
  });
export type PackageScenario = z.infer<typeof PackageScenarioSchema>;

/** 声明段正文载体：提示词正文随包（docs/decisions/ADR-001-package-abi.md）。 */
export const PromptSegmentSchema = z
  .object({ id: z.string().min(1), body: z.string().min(1) })
  .strict();
export type PromptSegmentDeclaration = z.infer<typeof PromptSegmentSchema>;

/** renderer 声明（宿主机制在通用包、renderer 按声明挂载、语义在垂类包）。 */
export const RendererDescriptorSchema = z
  .object({
    uiTemplateId: z.string().min(1),
    kind: z.enum(['workspace', 'document']),
    title: z.string().min(1),
  })
  .strict();
export type RendererDescriptor = z.infer<typeof RendererDescriptorSchema>;

/** 容器级词表（文案归宿律：容器级随包 manifest 词表节；租户可覆盖归 Stage 1）。 */
export type PackageVocabulary = Record<string, string>;

/**
 * 底座中性词表 = 词表必备键的兜底供词（包没给词，底座说中性话——永不留空、
 * 永不由底座编垂类语气）。必备键集即本表键集，准入按此查完备性。
 */
export const NEUTRAL_VOCABULARY: Readonly<Record<string, string>> = {
  'container.noun': '工作区',
  'stage.noun': '阶段',
  'material.noun': '资料',
};
export const REQUIRED_VOCABULARY_KEYS = Object.keys(NEUTRAL_VOCABULARY);

/**
 * 垂类包 manifest：一个垂类 = 一个依赖包，六面声明的装载单元。
 * zod schema 是运行时对象，manifest 因此是 TS 载体；结构与闭合校验走 admitPackages。
 */
export interface VerticalPackageManifest {
  identity: PackageIdentity;
  artifacts: ArtifactDescriptor[];
  scenarios: PackageScenario[];
  promptSegments: PromptSegmentDeclaration[];
  renderers: RendererDescriptor[];
  /** ADR-007：受控交互文案与政策随包；缺省表示本包不声明交互。 */
  interactionTemplates?: InteractionTemplate[];
  vocabulary: PackageVocabulary;
  /** 宣言配色席位：包可声明一个锚色，派生律不变。当期无消费方，席位先立。 */
  anchorColor?: string;
}
