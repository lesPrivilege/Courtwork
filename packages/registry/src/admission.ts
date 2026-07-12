import * as z from 'zod';
import {
  PackageIdentitySchema,
  parseArtifactTypeId,
  validateArtifactDescriptor,
  sideEffectsPermitNoGate,
  type ArtifactDescriptor,
  type SideEffectClass,
} from '@courtwork/schemas';
import {
  PackageScenarioSchema,
  PromptSegmentSchema,
  RendererDescriptorSchema,
  REQUIRED_VOCABULARY_KEYS,
  type VerticalPackageManifest,
} from './package-manifest.js';

export interface RejectedPackage {
  packageId: string;
  issues: string[];
}

export interface AdmissionResult {
  admitted: VerticalPackageManifest[];
  rejected: RejectedPackage[];
  /** 非阻断观察（如 uiTemplateId 未声明 renderer——渲染兜底是设计态）。 */
  warnings: string[];
}

/**
 * 枚举字段收集（零编码暴露律机器化的准入端）：best-effort 走 object/array/optional/
 * nullable/union 结构，收集 `{字段名 → 枚举值集}`。未覆盖的 zod 节点静默停走（lazy/
 * record/intersection 等——当期包 schema 用不到；用到时扩 walker，不误报）。
 */
function collectEnumFields(schema: z.ZodTypeAny, fieldName: string | undefined, out: Map<string, Set<string>>): void {
  if (schema instanceof z.ZodEnum) {
    if (fieldName !== undefined) {
      const bucket = out.get(fieldName) ?? new Set<string>();
      for (const option of schema.options as string[]) bucket.add(String(option));
      out.set(fieldName, bucket);
    }
    return;
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    collectEnumFields(schema.unwrap() as z.ZodTypeAny, fieldName, out);
    return;
  }
  if (schema instanceof z.ZodArray) {
    collectEnumFields(schema.element as z.ZodTypeAny, fieldName, out);
    return;
  }
  if (schema instanceof z.ZodObject) {
    for (const [key, value] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
      collectEnumFields(value, key, out);
    }
    return;
  }
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    for (const option of schema.options as z.ZodTypeAny[]) collectEnumFields(option, fieldName, out);
  }
}

function checkEnumVocabulary(descriptor: ArtifactDescriptor): string[] {
  const issues: string[] = [];
  const found = new Map<string, Set<string>>();
  collectEnumFields(descriptor.schema, undefined, found);
  for (const [field, options] of found) {
    const labels = descriptor.vocabulary?.enumLabels?.[field];
    if (labels === undefined) {
      issues.push(`descriptor ${descriptor.typeId} 枚举字段 "${field}" 缺 enumLabels（零编码暴露律：wire 枚举必须经词表映射）`);
      continue;
    }
    for (const option of options) {
      if (labels[option] === undefined || labels[option].trim() === '') {
        issues.push(`descriptor ${descriptor.typeId} 枚举字段 "${field}" 的取值 "${option}" 缺 enumLabels 词条`);
      }
    }
  }
  return issues;
}

function admitOne(
  manifest: VerticalPackageManifest,
  seenPackageIds: Set<string>,
  warnings: string[],
): string[] {
  const issues: string[] = [];

  const identity = PackageIdentitySchema.safeParse(manifest.identity);
  if (!identity.success) {
    issues.push(`包身份不合法：${identity.error.issues.map((i) => i.message).join('；')}`);
    return issues;
  }
  const packageId = identity.data.packageId;
  if (seenPackageIds.has(packageId)) {
    issues.push(`packageId "${packageId}" 已被先到的包占用（同 id 拒载）`);
    return issues;
  }

  const declaredTypes = new Set<string>();
  const declaredEffects = new Map<string, SideEffectClass>();
  for (const descriptor of manifest.artifacts) {
    for (const issue of validateArtifactDescriptor(descriptor)) {
      issues.push(`descriptor ${descriptor.typeId}：${issue}`);
    }
    const { namespace } = parseArtifactTypeId(descriptor.typeId);
    if (namespace !== packageId) {
      issues.push(`descriptor ${descriptor.typeId} 越出本包命名空间（命名空间所有权：${packageId}.*）`);
    }
    if (declaredTypes.has(descriptor.typeId)) {
      issues.push(`descriptor 类型 ${descriptor.typeId} 在包内重复声明`);
    }
    declaredTypes.add(descriptor.typeId);
    declaredEffects.set(descriptor.typeId, descriptor.sideEffect ?? 'pure_read');
    issues.push(...checkEnumVocabulary(descriptor));
  }

  const promptIds = new Set<string>();
  for (const segment of manifest.promptSegments) {
    const parsed = PromptSegmentSchema.safeParse(segment);
    if (!parsed.success) {
      issues.push(`promptSegment 不合法：${parsed.error.issues.map((i) => i.message).join('；')}`);
      continue;
    }
    if (promptIds.has(segment.id)) issues.push(`promptSegment id "${segment.id}" 重复`);
    promptIds.add(segment.id);
  }

  const rendererIds = new Set<string>();
  for (const renderer of manifest.renderers) {
    const parsed = RendererDescriptorSchema.safeParse(renderer);
    if (!parsed.success) {
      issues.push(`renderer 声明不合法：${parsed.error.issues.map((i) => i.message).join('；')}`);
      continue;
    }
    if (rendererIds.has(renderer.uiTemplateId)) issues.push(`renderer uiTemplateId "${renderer.uiTemplateId}" 重复`);
    rendererIds.add(renderer.uiTemplateId);
  }

  const scenarioIds = new Set<string>();
  for (const scenario of manifest.scenarios) {
    const parsed = PackageScenarioSchema.safeParse(scenario);
    if (!parsed.success) {
      issues.push(`场景 ${scenario.id ?? '(无 id)'} 声明不合法：${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('；')}`);
      continue;
    }
    const value = parsed.data;
    if (scenarioIds.has(value.id)) issues.push(`场景 id "${value.id}" 在包内重复`);
    scenarioIds.add(value.id);
    const scenarioNamespace = value.id.slice(0, value.id.indexOf('.'));
    if (scenarioNamespace !== packageId) {
      issues.push(`场景 ${value.id} 越出本包命名空间（命名空间所有权：${packageId}.*）`);
    }
    for (const ref of [...value.inputArtifacts, ...value.outputArtifacts]) {
      if (!declaredTypes.has(ref)) {
        issues.push(`场景 ${value.id} 引用了未声明的 artifact 类型 ${ref}（引用闭合：包间零横向依赖，引用必须在包内解析）`);
      }
    }
    if (!promptIds.has(value.promptSegmentRef)) {
      issues.push(`场景 ${value.id} 的 promptSegmentRef "${value.promptSegmentRef}" 未解析（模板引用必须在加载期闭合）`);
    }
    if (value.confirmationPolicy.mode === 'none') {
      const effects = value.outputArtifacts.map((ref) => declaredEffects.get(ref) ?? 'pure_read');
      if (!sideEffectsPermitNoGate(effects)) {
        issues.push(
          `场景 ${value.id} 声明 confirmationPolicy: none，但产出含副作用 artifact——none 仅限纯读取分析零外部写入，包无权放宽（工具侧副作用由 executor 运行时门复核）`,
        );
      }
    }
    if (!rendererIds.has(value.uiTemplateId)) {
      warnings.push(`场景 ${value.id} 的 uiTemplateId "${value.uiTemplateId}" 未声明 renderer——运行时将落通用结构视图（渲染兜底）`);
    }
  }

  for (const descriptor of manifest.artifacts) {
    if (!rendererIds.has(descriptor.uiTemplateId)) {
      warnings.push(`descriptor ${descriptor.typeId} 的 uiTemplateId "${descriptor.uiTemplateId}" 未声明 renderer——运行时将落通用结构视图（渲染兜底）`);
    }
  }

  for (const key of REQUIRED_VOCABULARY_KEYS) {
    const word = manifest.vocabulary[key];
    if (word === undefined || word.trim() === '') {
      issues.push(`词表缺必备键 "${key}"（缺词=包 lint 错误非运行时惊吓）`);
    }
  }

  return issues;
}

/**
 * 包准入（PACKAGE-ABI 核心机器）：引用闭合 + 同 id 拒载 + 命名空间所有权 + 词表完备性 +
 * confirmationPolicy 契约护栏。一包拒载不传染他包（兜底④：包可以缺、可以错、可以旧）。
 */
export function admitPackages(manifests: VerticalPackageManifest[]): AdmissionResult {
  const admitted: VerticalPackageManifest[] = [];
  const rejected: RejectedPackage[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const manifest of manifests) {
    const issues = admitOne(manifest, seen, warnings);
    const packageId = manifest.identity?.packageId ?? '(未知)';
    if (issues.length > 0) {
      rejected.push({ packageId, issues });
    } else {
      admitted.push(manifest);
      seen.add(packageId);
    }
  }

  return { admitted, rejected, warnings };
}
