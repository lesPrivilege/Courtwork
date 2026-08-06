import * as z from 'zod';
import {
  ArtifactTypeIdSchema,
  parseArtifactTypeId,
  sideEffectsPermitNoGate,
  type SideEffectClass,
} from '@courtwork/schemas';
import {
  InteractionTemplateSchema,
  PackageScenarioSchema,
  PromptSegmentSchema,
  RendererDescriptorSchema,
  REQUIRED_VOCABULARY_KEYS,
  VerticalPackageDescriptorV1Schema,
  type ArtifactDescriptorDataV1,
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
 * 准入检查收集器：一次遍历同时产出两样东西——
 * ① 枚举字段集 `{字段名 → 枚举值集}`（零编码暴露律机器化的收集端）；
 * ② 全部对象节点已声明键集（citationBinding 五字段对账用）。
 *
 * walker 覆盖 zod 4.4.3 全部可能携带子 schema 的容器类型；纯标量叶子（string/number/
 * 日期/字面量等）结构性不可能含枚举或子键，静默停走。**未识别节点 fail-closed**：
 * 无法证明 wire 枚举/字段已全量覆盖即 push issue，绝不允许静默跳过（判例「名字清单
 * 换材质仍是白名单」：unknown → 跳过 的病根）。新增 zod 容器类必须先扩 walker 再准入。
 */
interface CollectedSchemaInfo {
  enums: Map<string, Set<string>>;
  keys: Set<string>;
  /** 值为数组（unwrap 后 ZodArray）的对象直接键——citationBinding 的 draftField/anchorField 公证面（resolver 只公证数组键）。 */
  arrayKeys: Set<string>;
  /** 数组键 → 命中节点路径集合（从收集根开始的 shape 键序列，数组元素以 `[]` 占位；JSON 序列化防键名歧义）——
   *  G-3 同位判据：resolver 把锚写在 draftField 命中的那个节点，anchorField 必须与 draftField 同路径命中。 */
  arrayKeyPaths: Map<string, Set<string>>;
}

/** 结构性不可能含枚举/子键的标量叶子（zod 4.4.3 全量）。
 * 注意：格式类（z.email()/z.uuid()/z.url() 等）在 4.4.3 是 ZodStringFormat 子类而非
 * ZodString 子类，须经基类检查覆盖（实测：ZodEmail/ZodUUID/ZodURL instanceof ZodString === false）。 */
function isScalarLeaf(schema: z.ZodTypeAny): boolean {
  return (
    schema instanceof z.ZodString
    || schema instanceof z.ZodStringFormat
    || schema instanceof z.ZodNumber
    || schema instanceof z.ZodBigInt
    || schema instanceof z.ZodBoolean
    || schema instanceof z.ZodDate
    || schema instanceof z.ZodISODate
    || schema instanceof z.ZodISODateTime
    || schema instanceof z.ZodISOTime
    || schema instanceof z.ZodISODuration
    || schema instanceof z.ZodSymbol
    || schema instanceof z.ZodUndefined
    || schema instanceof z.ZodNull
    || schema instanceof z.ZodAny
    || schema instanceof z.ZodUnknown
    || schema instanceof z.ZodNever
    || schema instanceof z.ZodVoid
    || schema instanceof z.ZodLiteral
    || schema instanceof z.ZodNaN
  );
}

function collectSchemaInfo(
  schema: z.ZodTypeAny,
  fieldName: string | undefined,
  info: CollectedSchemaInfo,
  descriptorTypeId: string,
  issues: string[],
  visited: Map<object, Set<string | undefined>>,
  path: readonly string[] = [],
): void {
  const seenFields = visited.get(schema);
  if (seenFields !== undefined && seenFields.has(fieldName)) return;
  if (seenFields === undefined) visited.set(schema, new Set());
  visited.get(schema)!.add(fieldName);

  if (schema instanceof z.ZodEnum) {
    if (fieldName !== undefined) {
      const bucket = info.enums.get(fieldName) ?? new Set<string>();
      for (const option of schema.options as string[]) bucket.add(String(option));
      info.enums.set(fieldName, bucket);
    }
    return;
  }
  if (schema instanceof z.ZodObject) {
    for (const [key, value] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
      info.keys.add(key);
      if (unwrapSchema(value) instanceof z.ZodArray) {
        info.arrayKeys.add(key);
        const nodePath = JSON.stringify(path);
        const paths = info.arrayKeyPaths.get(key) ?? new Set<string>();
        paths.add(nodePath);
        info.arrayKeyPaths.set(key, paths);
      }
      collectSchemaInfo(value, key, info, descriptorTypeId, issues, visited, [...path, key]);
    }
    return;
  }
  if (
    schema instanceof z.ZodOptional
    || schema instanceof z.ZodNullable
    || schema instanceof z.ZodDefault
    || schema instanceof z.ZodReadonly
    || schema instanceof z.ZodCatch
  ) {
    collectSchemaInfo(schema.unwrap() as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    return;
  }
  if (schema instanceof z.ZodArray) {
    collectSchemaInfo(schema.element as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, [...path, '[]']);
    return;
  }
  if (schema instanceof z.ZodRecord) {
    // keyType 亦可能携枚举（enum-keyed record），一并收集；当期包 keyType 均为 string，无行为变化。
    // 路径不推进：record 键动态，valueType 命中节点路径记到 record 所在路径（同位判据对两侧同构 record 仍成立）。
    collectSchemaInfo(schema.def.keyType as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    collectSchemaInfo(schema.def.valueType as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    return;
  }
  if (schema instanceof z.ZodTuple) {
    for (const item of schema.def.items as z.ZodTypeAny[]) {
      collectSchemaInfo(item, fieldName, info, descriptorTypeId, issues, visited, path);
    }
    return;
  }
  if (schema instanceof z.ZodIntersection) {
    collectSchemaInfo(schema.def.left as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    collectSchemaInfo(schema.def.right as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    return;
  }
  if (schema instanceof z.ZodLazy) {
    try {
      collectSchemaInfo(schema.def.getter() as z.ZodTypeAny, fieldName, info, descriptorTypeId, issues, visited, path);
    } catch {
      issues.push(
        `descriptor ${descriptorTypeId} 准入检查遇到无法求值的 z.lazy 节点（fail-closed：不能证明 wire 枚举/字段已全量覆盖）`,
      );
    }
    return;
  }
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    for (const option of schema.options as z.ZodTypeAny[]) {
      collectSchemaInfo(option, fieldName, info, descriptorTypeId, issues, visited, path);
    }
    return;
  }
  if (isScalarLeaf(schema)) return;
  issues.push(
    `descriptor ${descriptorTypeId} 准入检查遇到未识别 zod 节点 ${schema.constructor?.name ?? '(未知类型)'}（fail-closed：不能证明 wire 枚举/字段已全量覆盖，须扩 walker 或调整 schema）`,
  );
}

function checkEnumVocabulary(descriptor: ArtifactDescriptorDataV1, schema: z.ZodType): string[] {
  const issues: string[] = [];
  const info: CollectedSchemaInfo = { enums: new Map(), keys: new Set(), arrayKeys: new Set(), arrayKeyPaths: new Map() };
  collectSchemaInfo(schema, undefined, info, descriptor.typeId, issues, new Map());
  for (const [field, options] of info.enums) {
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

/**
 * citationBinding 五字段与 draft/final schema 静态对账（ADMISSION-ENUM-1 / 1R）：
 * 写错一字不再被 zod strip 静默吞——不命中即拒载。判据按**消费面位置**收紧为直接键
 * （1R F-B，实证三形：只活在嵌套/数组元素内层的键误拼即静默过门）：
 * - outOfCoverageField：final schema **根对象直接键**（rebuildFromSurvivors 的 root[field] 落点）；
 * - itemSummaryField：draft item **根对象直接键**（resolveDraftArtifactWithPruning 的 outcome.item[field] 读面）；
 * - draftField：draft item 树中**某对象节点的直接键且值为数组**（resolveItem 深走公证面：
 *   key === draftField && Array.isArray(value)——string 形深层同名键不会被公证，误拼即静默丢引语）；
 * - anchorField：final item 树中**某对象节点的直接键且值为数组**（与 draftField 同位的写回点）。
 */
function checkCitationBinding(
  descriptor: ArtifactDescriptorDataV1,
  finalSchema: z.ZodType,
  draftSchema: z.ZodType,
): string[] {
  const binding = descriptor.citationBinding;
  if (binding === undefined) return [];
  const issues: string[] = [];
  // 1R F-C：visited 每次 collect() 内新建——draft/final 绑同一 ZodType 对象时共享 visited 会让
  // 后续 collect 漏收键（假拒且拒因与事实相反）。环保护仍由单次 collect 内的 visited 承担。
  const collect = (schema: z.ZodTypeAny): CollectedSchemaInfo => {
    const info: CollectedSchemaInfo = { enums: new Map(), keys: new Set(), arrayKeys: new Set(), arrayKeyPaths: new Map() };
    collectSchemaInfo(schema, undefined, info, descriptor.typeId, issues, new Map());
    return info;
  };

  const finalRoot = unwrapSchema(finalSchema as z.ZodTypeAny);
  if (!(finalRoot instanceof z.ZodObject)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding 对账：最终 schema 根不是对象，无法核对 outOfCoverageField`,
    );
  } else if (!(binding.outOfCoverageField in (finalRoot.shape as object))) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.outOfCoverageField "${binding.outOfCoverageField}" 不是最终 schema 根对象直接键（缺口条目落根后将被 strip 静默吞）`,
    );
  }

  const scopeSchema = resolveSchemaPointer(draftSchema as z.ZodTypeAny, binding.itemScope);
  if (!(scopeSchema instanceof z.ZodArray)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.itemScope "${binding.itemScope}" 未命中草稿 schema 的数组（回填映射必须指向数组单元）`,
    );
    return issues;
  }
  const draftItem = unwrapSchema(scopeSchema.element as z.ZodTypeAny);
  if (!(draftItem instanceof z.ZodObject)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.itemScope "${binding.itemScope}" 的草稿元素不是对象，无法核对 item 级字段`,
    );
    return issues;
  }
  if (!(binding.itemSummaryField in (draftItem.shape as object))) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.itemSummaryField "${binding.itemSummaryField}" 不是草稿 item 根对象直接键（缺口摘要将回落 (无摘要)）`,
    );
  }
  const draftInfo = collect(draftItem);
  if (!draftInfo.arrayKeys.has(binding.draftField)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.draftField "${binding.draftField}" 不是草稿 item 树中任何对象节点的数组直接键（resolver 深走只公证数组键，误拼将静默丢引语）`,
    );
  }

  const finalScopeSchema = resolveSchemaPointer(finalSchema as z.ZodTypeAny, binding.itemScope);
  if (!(finalScopeSchema instanceof z.ZodArray)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.itemScope "${binding.itemScope}" 未命中最终 schema 的数组`,
    );
    return issues;
  }
  const finalItem = unwrapSchema(finalScopeSchema.element as z.ZodTypeAny);
  if (!(finalItem instanceof z.ZodObject)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.itemScope "${binding.itemScope}" 的最终元素不是对象，无法核对 item 级字段`,
    );
    return issues;
  }
  const finalInfo = collect(finalItem);
  if (!finalInfo.arrayKeys.has(binding.anchorField)) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.anchorField "${binding.anchorField}" 不是最终 item 树中任何对象节点的数组直接键（铸造坐标写回点不存在，将被 strip 静默吞）`,
    );
  }
  // G-3 位置轴：resolver（resolveItem）把铸出的锚写在 draftField 命中的那个对象节点上；
  // 键形轴之外还须同位——draftField 命中节点路径与 anchorField 命中节点路径存在交集。
  // 错位形（anchorField 指 item 根的其它数组键）会过键形轴，但 executor 的 final safeParse
  // 会把错位写入的锚 strip 掉、sourceAnchors 回落 []、success=true——成品零锚点零报错。
  const draftPaths = draftInfo.arrayKeyPaths.get(binding.draftField) ?? new Set<string>();
  const anchorPaths = finalInfo.arrayKeyPaths.get(binding.anchorField) ?? new Set<string>();
  const coLocated = [...draftPaths].some((nodePath) => anchorPaths.has(nodePath));
  if (!coLocated) {
    issues.push(
      `descriptor ${descriptor.typeId} citationBinding.anchorField "${binding.anchorField}" 与 draftField "${binding.draftField}" 不在同一对象节点（resolver 把锚写在 draftField 命中节点，错位锚会被 final parse strip——无锚落格）`,
    );
  }
  return issues;
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (
    current instanceof z.ZodOptional
    || current instanceof z.ZodNullable
    || current instanceof z.ZodDefault
    || current instanceof z.ZodReadonly
    || current instanceof z.ZodCatch
  ) {
    current = current.unwrap() as z.ZodTypeAny;
  }
  return current;
}

function decodePointerSegment(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function resolveSchemaPointer(
  schema: z.ZodTypeAny,
  pointer: string,
  unwrapTerminal = true,
): z.ZodTypeAny | undefined {
  let current = schema;
  if (pointer === '') return unwrapTerminal ? unwrapSchema(current) : current;
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = decodePointerSegment(rawSegment);
    current = unwrapSchema(current);
    if (current instanceof z.ZodObject) {
      const next = (current.shape as Record<string, z.ZodTypeAny>)[segment];
      if (next === undefined) return undefined;
      current = next;
      continue;
    }
    if (current instanceof z.ZodArray && /^(?:0|[1-9]\d*)$/.test(segment)) {
      current = current.element as z.ZodTypeAny;
      continue;
    }
    return undefined;
  }
  return unwrapTerminal ? unwrapSchema(current) : current;
}

function labelValuesForSchema(schema: z.ZodTypeAny, format: string): string[] | undefined {
  const target = unwrapSchema(schema);
  if (format === 'tags') {
    if (!(target instanceof z.ZodArray)) return undefined;
    const element = unwrapSchema(target.element as z.ZodTypeAny);
    return element instanceof z.ZodEnum ? (element.options as string[]).map(String) : undefined;
  }
  return target instanceof z.ZodEnum ? (target.options as string[]).map(String) : undefined;
}

function isEstimateNumberSchema(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodNumber && (schema as z.ZodNumber & { _zod: { def: { coerce?: boolean } } })._zod.def.coerce !== true;
}

function isEstimateRangeSchema(schema: z.ZodTypeAny): boolean {
  if (!(schema instanceof z.ZodObject)) return false;
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const keys = Object.keys(shape).sort();
  return keys.length === 2
    && keys[0] === 'high'
    && keys[1] === 'low'
    && isEstimateNumberSchema(shape.low!)
    && isEstimateNumberSchema(shape.high!);
}

function nullableInner(schema: z.ZodTypeAny): z.ZodTypeAny | undefined {
  if (schema instanceof z.ZodNullable) return schema.unwrap() as z.ZodTypeAny;
  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    if (options.length !== 2) return undefined;
    const nullIndex = options.findIndex((option) => option instanceof z.ZodNull);
    if (nullIndex === -1) return undefined;
    return options[nullIndex === 0 ? 1 : 0];
  }
  return undefined;
}

type EstimateSchemaShape =
  | { kind: 'direct' }
  | { kind: 'envelope'; statuses: string[] };

function classifyEstimateSchema(schema: z.ZodTypeAny): EstimateSchemaShape | undefined {
  if (isEstimateNumberSchema(schema) || isEstimateRangeSchema(schema)) return { kind: 'direct' };
  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    if (
      options.length > 0
      && options.every((option) => isEstimateNumberSchema(option) || isEstimateRangeSchema(option))
    ) {
      return { kind: 'direct' };
    }
    return undefined;
  }
  if (!(schema instanceof z.ZodObject)) return undefined;
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const value = shape.value === undefined ? undefined : nullableInner(shape.value);
  const range = shape.range === undefined ? undefined : nullableInner(shape.range);
  const status = shape.status;
  if (
    value === undefined
    || !isEstimateNumberSchema(value)
    || range === undefined
    || !isEstimateRangeSchema(range)
    || !(status instanceof z.ZodEnum)
  ) {
    return undefined;
  }
  return { kind: 'envelope', statuses: (status.options as string[]).map(String) };
}

function checkExactValueLabels(
  descriptor: ArtifactDescriptorDataV1,
  pointer: string,
  values: string[],
  labels: Record<string, string> | undefined,
): string[] {
  if (labels === undefined) {
    return [`descriptor ${descriptor.typeId} presentation pointer "${pointer}" 缺 valueLabels，禁止回落 wire 值`];
  }
  const issues: string[] = [];
  for (const value of values) {
    if (labels[value] === undefined || labels[value]!.trim() === '') {
      issues.push(
        `descriptor ${descriptor.typeId} presentation pointer "${pointer}" 的值 "${value}" 缺 valueLabels，禁止回落 wire 值`,
      );
    }
  }
  for (const value of Object.keys(labels)) {
    if (!values.includes(value)) {
      issues.push(
        `descriptor ${descriptor.typeId} presentation pointer "${pointer}" 的 valueLabels 含 schema 外取值 "${value}"`,
      );
    }
  }
  return issues;
}

function checkPresentation(descriptor: ArtifactDescriptorDataV1, schema: z.ZodType): string[] {
  const presentation = descriptor.presentation;
  if (presentation === undefined) return [];

  const issues: string[] = [];
  let itemSchema: z.ZodTypeAny = schema;
  if (presentation.collectionPointer !== undefined) {
    const collectionSchema = resolveSchemaPointer(schema, presentation.collectionPointer);
    if (!(collectionSchema instanceof z.ZodArray)) {
      issues.push(
        `descriptor ${descriptor.typeId} presentation.collectionPointer "${presentation.collectionPointer}" 未命中数组`,
      );
      return issues;
    }
    itemSchema = collectionSchema.element as z.ZodTypeAny;
  }

  for (const field of presentation.fields) {
    const rawFieldSchema = resolveSchemaPointer(itemSchema, field.pointer, false);
    if (rawFieldSchema === undefined) {
      issues.push(`descriptor ${descriptor.typeId} presentation pointer "${field.pointer}" 未命中 schema`);
      continue;
    }
    const fieldSchema = unwrapSchema(rawFieldSchema);

    if (field.format === 'estimate') {
      const shape = classifyEstimateSchema(rawFieldSchema);
      if (shape === undefined) {
        issues.push(
          `descriptor ${descriptor.typeId} presentation pointer "${field.pointer}" 的 estimate schema 形状不兼容`,
        );
        continue;
      }
      if (shape.kind === 'direct') {
        if (field.valueLabels !== undefined) {
          issues.push(
            `descriptor ${descriptor.typeId} presentation pointer "${field.pointer}" 的直接 number/range estimate 不得携 valueLabels`,
          );
        }
      } else {
        issues.push(...checkExactValueLabels(descriptor, field.pointer, shape.statuses, field.valueLabels));
      }
      continue;
    }

    const needsLabels = ['enum', 'status', 'tags', 'grade'].includes(field.format);
    if (!needsLabels) {
      if (field.valueLabels !== undefined) {
        issues.push(
          `descriptor ${descriptor.typeId} presentation pointer "${field.pointer}" 的 ${field.format} 字段不得携 valueLabels`,
        );
      }
      continue;
    }

    const values = labelValuesForSchema(fieldSchema, field.format);
    if (values === undefined) {
      issues.push(
        `descriptor ${descriptor.typeId} presentation pointer "${field.pointer}" 的 ${field.format} 字段无法确定枚举值，拒绝 wire fallback`,
      );
      continue;
    }
    issues.push(...checkExactValueLabels(descriptor, field.pointer, values, field.valueLabels));
  }
  return issues;
}

function inspectJsonData(
  value: unknown,
  path: string,
  seen: Set<object>,
  issues: string[],
): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) issues.push(`${path} 含非有限 number，不是合法 JSON`);
    return;
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    issues.push(`${path} 含 ${typeof value}，descriptor 必须是纯 JSON`);
    return;
  }
  if (seen.has(value)) {
    issues.push(`${path} 含循环引用，descriptor 必须可以 JSON stringify`);
    return;
  }
  seen.add(value);

  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    issues.push(`${path} 含 ${prototype?.constructor?.name ?? '非普通对象'}，descriptor 不得含 Zod/React/可执行对象`);
    seen.delete(value);
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      issues.push(`${path} 含 symbol key，descriptor 必须是纯 JSON`);
      continue;
    }
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (property === undefined) continue;
    if ('get' in property || 'set' in property) {
      issues.push(`${path}.${key} 是 accessor，descriptor 不得执行代码`);
      continue;
    }
    inspectJsonData(property.value, `${path}.${key}`, seen, issues);
  }
  seen.delete(value);
}

function descriptorCandidate(manifest: VerticalPackageManifest, issues: string[]): unknown {
  if (manifest === null || typeof manifest !== 'object') {
    issues.push('包声明必须是对象');
    return manifest;
  }
  const candidate: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(manifest)) {
    if (key === 'bindings') {
      const bindingProperty = Object.getOwnPropertyDescriptor(manifest, key);
      if (bindingProperty !== undefined && ('get' in bindingProperty || 'set' in bindingProperty)) {
        issues.push('bindings 是 accessor，准入边界拒绝执行 getter/setter');
      }
      continue;
    }
    if (typeof key === 'symbol') {
      issues.push('descriptor 根含 symbol key，必须是纯 JSON');
      continue;
    }
    const property = Object.getOwnPropertyDescriptor(manifest, key);
    if (property === undefined) continue;
    if ('get' in property || 'set' in property) {
      issues.push(`descriptor.${key} 是 accessor，descriptor 不得执行代码`);
      continue;
    }
    candidate[key] = property.value;
  }
  inspectJsonData(candidate, 'descriptor', new Set(), issues);
  return candidate;
}

function deepFreezeJson<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreezeJson(child);
    Object.freeze(value);
  }
  return value;
}

interface AdmitOneResult {
  manifest?: VerticalPackageManifest;
  issues: string[];
  warnings: string[];
}

function admitOne(
  source: VerticalPackageManifest,
  seenPackageIds: Set<string>,
  seenInteractionTemplateOwners: ReadonlyMap<string, string>,
): AdmitOneResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const candidate = descriptorCandidate(source, issues);
  if (issues.length > 0) return { issues, warnings };
  const descriptorResult = VerticalPackageDescriptorV1Schema.safeParse(candidate);
  if (!descriptorResult.success) {
    issues.push(
      `descriptor V1 不合法${descriptorResult.error.issues.some((issue) => issue.path[0] === 'interactionTemplates') ? '（interaction template）' : ''}：${descriptorResult.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('；')}`,
    );
    return { issues, warnings };
  }
  const descriptor = descriptorResult.data;
  const packageId = descriptor.identity.packageId;
  if (seenPackageIds.has(packageId)) {
    issues.push(`packageId "${packageId}" 已被先到的包占用（同 id 拒载）`);
    return { issues, warnings };
  }

  const schemaEntries: Array<[string, z.ZodType]> = [];
  const schemas = source.bindings?.schemas;
  if (schemas === undefined || typeof schemas.entries !== 'function') {
    issues.push('bindings.schemas 必须是 ReadonlyMap<schemaId, ZodType>');
  } else {
    try {
      for (const rawEntry of schemas.entries()) {
        if (!Array.isArray(rawEntry) || rawEntry.length !== 2) {
          issues.push('bindings.schemas 迭代项必须是 [schemaId, ZodType]');
          continue;
        }
        const [schemaId, schema] = rawEntry as [unknown, unknown];
        if (typeof schemaId !== 'string' || !ArtifactTypeIdSchema.safeParse(schemaId).success) {
          issues.push(`binding schema id "${String(schemaId)}" 不是 namespaced 逻辑 id`);
          continue;
        }
        if (parseArtifactTypeId(schemaId).namespace !== packageId) {
          issues.push(`binding schema id ${schemaId} 越出本包命名空间（命名空间所有权：${packageId}.*）`);
        }
        if (!(schema instanceof z.ZodType)) {
          issues.push(`binding schema id ${schemaId} 未绑定 ZodType`);
          continue;
        }
        if (schemaEntries.some(([seenId]) => seenId === schemaId)) {
          issues.push(`binding schema id ${schemaId} 重复`);
          continue;
        }
        schemaEntries.push([schemaId, schema]);
      }
    } catch (error) {
      issues.push(`bindings.schemas 无法安全迭代：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const schemaBindings = new Map(schemaEntries);

  const declaredTypes = new Set<string>();
  const declaredArtifacts = new Map<string, ArtifactDescriptorDataV1>();
  const declaredSchemaIds = new Set<string>();
  const declaredEffects = new Map<string, SideEffectClass>();
  for (const artifact of descriptor.artifacts) {
    const { namespace } = parseArtifactTypeId(artifact.typeId);
    if (namespace !== packageId) {
      issues.push(`descriptor ${artifact.typeId} 越出本包命名空间（命名空间所有权：${packageId}.*）`);
    }
    if (declaredTypes.has(artifact.typeId)) issues.push(`descriptor 类型 ${artifact.typeId} 在包内重复声明`);
    declaredTypes.add(artifact.typeId);
    declaredArtifacts.set(artifact.typeId, artifact);
    declaredEffects.set(artifact.typeId, artifact.sideEffect ?? 'pure_read');

    for (const schemaId of [artifact.schemaId, artifact.draftSchemaId].filter(
      (value): value is string => value !== undefined,
    )) {
      if (parseArtifactTypeId(schemaId).namespace !== packageId) {
        issues.push(`descriptor ${artifact.typeId} 的 schema id ${schemaId} 越出本包命名空间`);
      }
      if (declaredSchemaIds.has(schemaId)) issues.push(`schema id ${schemaId} 被重复引用`);
      declaredSchemaIds.add(schemaId);
      if (!schemaBindings.has(schemaId)) {
        issues.push(`descriptor ${artifact.typeId} 的 schema id ${schemaId} 缺 binding`);
      }
    }
    const finalSchema = schemaBindings.get(artifact.schemaId);
    if (finalSchema !== undefined) {
      if (artifact.presentation === undefined) issues.push(...checkEnumVocabulary(artifact, finalSchema));
      else issues.push(...checkPresentation(artifact, finalSchema));
      if (artifact.citationBinding !== undefined) {
        const draftSchema = schemaBindings.get(artifact.draftSchemaId as string);
        if (draftSchema !== undefined) {
          issues.push(...checkCitationBinding(artifact, finalSchema, draftSchema));
        }
      }
    }
  }

  const promptIds = new Set<string>();
  for (const segment of descriptor.promptSegments) {
    const parsed = PromptSegmentSchema.parse(segment);
    if (promptIds.has(parsed.id)) issues.push(`promptSegment id "${parsed.id}" 重复`);
    promptIds.add(parsed.id);
  }

  const rendererIds = new Set<string>();
  for (const renderer of descriptor.renderers) {
    const parsed = RendererDescriptorSchema.parse(renderer);
    if (rendererIds.has(parsed.uiTemplateId)) issues.push(`renderer uiTemplateId "${parsed.uiTemplateId}" 重复`);
    rendererIds.add(parsed.uiTemplateId);
  }

  const interactionTemplateIds = new Set<string>();
  for (const template of descriptor.interactionTemplates ?? []) {
    const value = InteractionTemplateSchema.parse(template);
    if (interactionTemplateIds.has(value.id)) issues.push(`interaction template id "${value.id}" 在包内重复`);
    interactionTemplateIds.add(value.id);
    const templateNamespace = value.id.slice(0, value.id.indexOf('.'));
    if (templateNamespace !== packageId) {
      issues.push(`interaction template ${value.id} 越出本包命名空间（命名空间所有权：${packageId}.*）`);
    }
    const existingOwner = seenInteractionTemplateOwners.get(value.id);
    if (existingOwner !== undefined && existingOwner !== packageId) {
      issues.push(`interaction template id "${value.id}" 与已准入包 ${existingOwner} 跨包重复（后到包拒载）`);
    }
  }

  const scenarioIds = new Set<string>();
  for (const scenario of descriptor.scenarios) {
    const value = PackageScenarioSchema.parse(scenario);
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
    for (const ref of value.outputArtifacts) {
      const artifact = declaredArtifacts.get(ref);
      const containsAnchor = artifact?.presentation?.fields.some((field) => field.format === 'anchor') ?? false;
      if (containsAnchor && (artifact?.draftSchemaId === undefined || artifact.citationBinding === undefined)) {
        issues.push(
          `场景 ${value.id} 将含 anchor presentation 的 ${ref} 列为模型输出时必须同时声明独立 draftSchemaId + citationBinding`,
        );
      }
    }
    if (!promptIds.has(value.promptSegmentRef)) {
      issues.push(`场景 ${value.id} 的 promptSegmentRef "${value.promptSegmentRef}" 未解析（模板引用必须在加载期闭合）`);
    }
    if (value.confirmationPolicy.mode === 'none') {
      const effects = value.outputArtifacts.map((ref) => declaredEffects.get(ref) ?? 'pure_read');
      if (!sideEffectsPermitNoGate(effects)) {
        issues.push(`场景 ${value.id} 声明 confirmationPolicy: none，但产出含副作用 artifact——none 仅限纯读取分析零外部写入，包无权放宽（工具侧副作用由 executor 运行时门复核）`);
      }
    }
    if (!rendererIds.has(value.uiTemplateId)) {
      warnings.push(`场景 ${value.id} 的 uiTemplateId "${value.uiTemplateId}" 未声明 renderer——运行时将落通用结构视图（渲染兜底）`);
    }
    if (value.launch?.formFields !== undefined) {
      const fieldIds = value.launch.formFields.map((field) => field.id);
      if (new Set(fieldIds).size !== fieldIds.length) {
        issues.push(`场景 ${value.id} 的 launch form field id 必须唯一（字段 id 是场景启动参数的键，重复即静默覆盖）`);
      }
    }
  }

  for (const artifact of descriptor.artifacts) {
    if (!rendererIds.has(artifact.uiTemplateId)) {
      warnings.push(`descriptor ${artifact.typeId} 的 uiTemplateId "${artifact.uiTemplateId}" 未声明 renderer——运行时将落通用结构视图（渲染兜底）`);
    }
  }
  for (const key of REQUIRED_VOCABULARY_KEYS) {
    const word = descriptor.vocabulary[key];
    if (word === undefined || word.trim() === '') {
      issues.push(`词表缺必备键 "${key}"（缺词=包 lint 错误非运行时惊吓）`);
    }
  }
  if (issues.length > 0) return { issues, warnings };

  const frozenDescriptor = deepFreezeJson(descriptor);
  const bindings = Object.freeze({
    schemas: new Map(schemaEntries),
    ...(source.bindings.migrations === undefined ? {} : { migrations: new Map(source.bindings.migrations) }),
  });
  const manifest = Object.freeze({ ...frozenDescriptor, bindings });
  return { manifest, issues, warnings };
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
  const seenInteractionTemplateOwners = new Map<string, string>();

  for (const source of manifests) {
    let packageId = '(未知)';
    try {
      const result = admitOne(source, seen, seenInteractionTemplateOwners);
      packageId = result.manifest?.identity.packageId ?? packageId;
      if (result.manifest === undefined) {
        const identityProperty =
          source !== null && typeof source === 'object'
            ? Object.getOwnPropertyDescriptor(source, 'identity')
            : undefined;
        const rawIdentity = identityProperty !== undefined && 'value' in identityProperty ? identityProperty.value : undefined;
        if (rawIdentity !== null && typeof rawIdentity === 'object') {
          const packageIdProperty = Object.getOwnPropertyDescriptor(rawIdentity, 'packageId');
          if (packageIdProperty !== undefined && 'value' in packageIdProperty && typeof packageIdProperty.value === 'string') {
            packageId = packageIdProperty.value;
          }
        }
        rejected.push({ packageId, issues: result.issues });
        continue;
      }
      admitted.push(result.manifest);
      warnings.push(...result.warnings);
      seen.add(packageId);
      for (const template of result.manifest.interactionTemplates ?? []) {
        seenInteractionTemplateOwners.set(template.id, packageId);
      }
    } catch (error) {
      rejected.push({
        packageId,
        issues: [`准入边界捕获异常：${error instanceof Error ? error.message : String(error)}`],
      });
    }
  }

  return { admitted, rejected, warnings };
}
