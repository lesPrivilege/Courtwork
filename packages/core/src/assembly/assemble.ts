import * as z from 'zod';
import type { ArtifactSchemaRegistry, ProjectionRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { GenerationRequest } from '../provider/types.js';
import {
  buildContractSegment,
  buildDeclarationSegment,
  buildProjectionSegment,
  buildSessionCorpusSegment,
  buildTenantSegment,
  buildViewMappingSegment,
  type MaterialInput,
  type ProjectionInput,
  type PromptSegment,
  type ViewMappingInput,
} from './segments.js';

export interface AssembleScenarioRequestInput {
  scenario: ScenarioRuntime;
  /** 本次产出目标（寻址制地址源）。 */
  stepId: string;
  artifactType: string;
  /** 模型侧校验 schema（descriptor.draftSchema ?? descriptor.schema，调用方从 registry 取）。 */
  modelSchema: z.ZodTypeAny;
  projection: ProjectionInput;
  materials: MaterialInput[];
  /** 任务指令（会话段尾）：executor 组装的结构化任务描述。 */
  taskInstruction: string;
  todo: ViewMappingInput['todo'];
  registries: { projections: ProjectionRegistry; artifacts: ArtifactSchemaRegistry };
}

export interface AssembledRequest {
  /** 六段全量（组装序即数组序）——golden 与审计的第一对象。 */
  segments: PromptSegment[];
  /** wire 形态（注入位置为实现细节，quirk 层可移；段的内容与序是契约）。 */
  request: GenerationRequest;
  /** 寻址信封 schema：executor 以此为 responseSchema 并按址收货。 */
  envelopeSchema: z.ZodTypeAny;
}

/**
 * 寻址信封（四知条款·知输出/知回填的机器形态）：模型输出必须携目标地址，
 * 地址以 literal 锁死——错址在 schema 校验层即拒收，回填靠地址不靠位置。
 */
export function buildEnvelopeSchema(stepId: string, artifactType: string, artifactSchema: z.ZodTypeAny): z.ZodTypeAny {
  return z
    .object({
      target: z.object({ stepId: z.literal(stepId), artifactType: z.literal(artifactType) }).strict(),
      artifact: artifactSchema,
    })
    .strict();
}

/**
 * 六段组装器（HARNESS-1 正戏）：确定性组装，同输入同字节。
 * 默认注入位置：契约/声明/租户/投影 → systemPrompt；语料与任务 → user 消息；
 * 视图映射段（含 todo 复述）→ user 消息尾。位置差异归 quirk 层，六段内容与序是契约。
 */
export function assembleScenarioRequest(input: AssembleScenarioRequestInput): AssembledRequest {
  const segments: PromptSegment[] = [
    buildContractSegment(),
    buildDeclarationSegment(input.scenario),
    buildTenantSegment(),
    buildProjectionSegment(input.scenario, input.projection, input.registries.projections, input.registries.artifacts),
    buildSessionCorpusSegment(input.materials, input.taskInstruction),
    buildViewMappingSegment({ stepId: input.stepId, artifactType: input.artifactType, todo: input.todo }),
  ];

  const [contract, declaration, tenant, projection, sessionCorpus, viewMapping] = segments;
  const request: GenerationRequest = {
    systemPrompt: [contract.body, declaration.body, tenant.body, projection.body].join('\n\n'),
    messages: [{ role: 'user', content: `${sessionCorpus.body}\n\n${viewMapping.body}` }],
    responseSchema: buildEnvelopeSchema(input.stepId, input.artifactType, input.modelSchema),
  };

  return { segments, request, envelopeSchema: request.responseSchema! };
}
