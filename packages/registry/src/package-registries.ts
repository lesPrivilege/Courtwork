import {
  normalizeArtifactTypeId,
  type ArtifactDescriptor,
  type ArtifactTypeId,
  type RehydrationProjection,
} from '@courtwork/schemas';
import type * as z from 'zod';
import {
  NEUTRAL_VOCABULARY,
  type ArtifactDescriptorDataV1,
  type InteractionTemplate,
  type PackageScenario,
  type RendererDescriptor,
  type ScenarioStep,
  type VerticalPackageManifest,
} from './package-manifest.js';

export { NEUTRAL_VOCABULARY };

/**
 * 运行时场景：promptSegmentRef 已在加载期解析闭合为正文（ref 字面值不上 wire），
 * steps 已派生为具体步骤树。executor 与组装器只见本形状。
 */
export interface ScenarioRuntime {
  id: string;
  packageId: string;
  name: string;
  trigger: PackageScenario['trigger'];
  inputArtifacts: ArtifactTypeId[];
  toolIds: string[];
  outputArtifacts: ArtifactTypeId[];
  uiTemplateId: string;
  confirmationPolicy: PackageScenario['confirmationPolicy'];
  promptBody: string;
  steps: ScenarioStep[];
}

export interface ArtifactSchemaRegistryEntry {
  /** ABI-2A compatibility 只读面；data plane 另由 package descriptor 查询。 */
  descriptor: ArtifactDescriptor;
  packageId: string;
}

/**
 * ABI-2A 迁移期唯一 compatibility 形状：既保留 data plane 字段，又把 binding 重新接成
 * core 现有的 descriptor.schema/draftSchema 只读消费面。不得在别处再造第二套重绑定。
 */
export type RuntimeArtifactDescriptor = ArtifactDescriptorDataV1 & {
  schema: z.ZodType;
  draftSchema?: z.ZodType;
};

export function bindArtifactDescriptorCompatibility(
  descriptor: ArtifactDescriptorDataV1,
  schemas: ReadonlyMap<string, z.ZodType>,
): RuntimeArtifactDescriptor {
  const schema = schemas.get(descriptor.schemaId);
  if (schema === undefined) throw new Error(`schema binding missing after admission: ${descriptor.schemaId}`);
  const draftSchema = descriptor.draftSchemaId === undefined ? undefined : schemas.get(descriptor.draftSchemaId);
  if (descriptor.draftSchemaId !== undefined && draftSchema === undefined) {
    throw new Error(`draft schema binding missing after admission: ${descriptor.draftSchemaId}`);
  }
  return Object.freeze({
    ...descriptor,
    schema,
    ...(draftSchema === undefined ? {} : { draftSchema }),
  });
}

/** ① artifact schema registry（注入式，替换中央 ARTIFACT_SCHEMAS——F-4 编译期穷尽性由准入闭合接位）。 */
export interface ArtifactSchemaRegistry {
  get(typeId: string): ArtifactSchemaRegistryEntry | undefined;
  /** 账本读侧归一：旧裸类型名经各包迁移别名表映射；未登记返回 undefined（拒收不猜）。 */
  normalizeTypeId(value: string): ArtifactTypeId | undefined;
  list(): ArtifactSchemaRegistryEntry[];
}

export interface ScenarioRegistryV2 {
  get(id: string): ScenarioRuntime | undefined;
  list(): ScenarioRuntime[];
  findByTrigger(context: { fileType?: string; userAction?: string; classifierTags?: string[] }): ScenarioRuntime[];
}

export interface RendererRegistry {
  get(uiTemplateId: string): RendererDescriptor | undefined;
}

export interface ProjectionRegistry {
  get(typeId: string): RehydrationProjection | undefined;
}

export interface VocabularyRegistry {
  /** 包词优先；必备键缺词落底座中性话；未登记的自由键返回空串（消费方义务是只查已声明键）。 */
  lookup(packageId: string, key: string): string;
}

export type InteractionTemplateSnapshot = Readonly<
  Omit<InteractionTemplate, 'options'> & {
    options: readonly Readonly<InteractionTemplate['options'][number]>[];
  }
>;

export interface InteractionTemplateRegistry {
  /** packageId 与 namespaced templateId 双键查询；返回装载时复制并深冻结的快照。 */
  get(packageId: string, templateId: string): InteractionTemplateSnapshot | undefined;
}

export interface PackageRegistries {
  artifactSchemas: ArtifactSchemaRegistry;
  scenarios: ScenarioRegistryV2;
  renderers: RendererRegistry;
  projections: ProjectionRegistry;
  vocabulary: VocabularyRegistry;
  interactionTemplates: InteractionTemplateRegistry;
}

function snapshotInteractionTemplate(template: InteractionTemplate): InteractionTemplateSnapshot {
  const options = Object.freeze(
    template.options.map((option) => Object.freeze({ ...option })),
  );
  return Object.freeze({ ...template, options });
}

function deriveSteps(scenario: PackageScenario, descriptors: Map<string, RuntimeArtifactDescriptor>): ScenarioStep[] {
  if (scenario.steps !== undefined && scenario.steps.length > 0) return scenario.steps;
  return scenario.outputArtifacts.map((typeId) => ({
    id: `produce-${typeId}`,
    title: `产出${descriptors.get(typeId)?.title ?? typeId}`,
    artifact: typeId,
  }));
}

function scenarioMatches(
  scenario: ScenarioRuntime,
  context: { fileType?: string; userAction?: string; classifierTags?: string[] },
): boolean {
  const { trigger } = scenario;
  const fileTypeMatches = context.fileType !== undefined && trigger.fileTypes.includes(context.fileType);
  const userActionMatches = context.userAction !== undefined && trigger.userActions.includes(context.userAction);
  const classifierTagMatches =
    context.classifierTags !== undefined && context.classifierTags.some((tag) => trigger.classifierTags.includes(tag));
  return fileTypeMatches || userActionMatches || classifierTagMatches;
}

/**
 * 运行时 registries 装配（准入通过的包 → 查询面）。纯函数：同输入同结构；
 * 加载期解析闭合在此完成（promptSegmentRef → promptBody、steps 派生）。
 */
export function buildPackageRegistries(admitted: VerticalPackageManifest[]): PackageRegistries {
  const artifactEntries = new Map<string, ArtifactSchemaRegistryEntry>();
  const scenarioEntries = new Map<string, ScenarioRuntime>();
  const rendererEntries = new Map<string, RendererDescriptor>();
  const legacyAliases: Record<string, string> = {};
  const vocabularies = new Map<string, Record<string, string>>();
  const interactionEntries = new Map<string, Map<string, InteractionTemplateSnapshot>>();

  for (const manifest of admitted) {
    const packageId = manifest.identity.packageId;
    const descriptorIndex = new Map<string, RuntimeArtifactDescriptor>();
    for (const descriptorData of manifest.artifacts) {
      const descriptor = bindArtifactDescriptorCompatibility(descriptorData, manifest.bindings.schemas);
      descriptorIndex.set(descriptor.typeId, descriptor);
      artifactEntries.set(descriptor.typeId, { descriptor, packageId });
    }
    const prompts = new Map(manifest.promptSegments.map((segment) => [segment.id, segment.body]));
    for (const scenario of manifest.scenarios) {
      const { promptSegmentRef, ...rest } = scenario;
      delete (rest as { steps?: unknown }).steps;
      scenarioEntries.set(scenario.id, {
        ...(rest as Omit<typeof rest, 'steps'>),
        packageId,
        // 准入已保证引用闭合；此处的 fallback 仅为类型完备，不可达。
        promptBody: prompts.get(promptSegmentRef) ?? '',
        steps: deriveSteps(scenario, descriptorIndex),
      });
    }
    for (const renderer of manifest.renderers) {
      rendererEntries.set(renderer.uiTemplateId, renderer);
    }
    const packageInteractionEntries = new Map<string, InteractionTemplateSnapshot>();
    for (const template of manifest.interactionTemplates ?? []) {
      packageInteractionEntries.set(template.id, snapshotInteractionTemplate(template));
    }
    interactionEntries.set(packageId, packageInteractionEntries);
    for (const [legacy, target] of Object.entries(manifest.identity.legacyTypeAliases ?? {})) {
      // 先到者持有别名（准入层同 id 拒载使跨包撞名不可达；防御性不覆写）。
      if (legacyAliases[legacy] === undefined) legacyAliases[legacy] = target;
    }
    vocabularies.set(packageId, manifest.vocabulary);
  }

  return {
    artifactSchemas: {
      get: (typeId) => artifactEntries.get(typeId),
      normalizeTypeId: (value) => normalizeArtifactTypeId(value, legacyAliases),
      list: () => [...artifactEntries.values()],
    },
    scenarios: {
      get: (id) => scenarioEntries.get(id),
      list: () => [...scenarioEntries.values()],
      findByTrigger: (context) => [...scenarioEntries.values()].filter((scenario) => scenarioMatches(scenario, context)),
    },
    renderers: {
      get: (uiTemplateId) => rendererEntries.get(uiTemplateId),
    },
    projections: {
      get: (typeId) => artifactEntries.get(typeId)?.descriptor.rehydrationProjection,
    },
    vocabulary: {
      lookup: (packageId, key) => vocabularies.get(packageId)?.[key] ?? NEUTRAL_VOCABULARY[key] ?? '',
    },
    interactionTemplates: {
      get: (packageId, templateId) => interactionEntries.get(packageId)?.get(templateId),
    },
  };
}
