import * as z from 'zod';
import { ARTIFACT_TYPE_ID_PATTERN, type ArtifactTypeId } from './artifact-type-id.js';

/**
 * 续行投影（ABI 拍板②：归 artifact descriptor）的声明词表——封闭三种 op，禁自由代码：
 * 投影是确定性契约（golden 可测），不是模型运气，也不是任意函数（docs/58 七节）。
 * - field：取标量字段值一行；
 * - count：数组计数（可带单字段等值谓词，如「已处置 N」）；
 * - list：数组前 N 项的单字段罗列。
 */
const FieldOpSchema = z
  .object({ kind: z.literal('field'), path: z.string().regex(/^\//), label: z.string().min(1) })
  .strict();
const CountOpSchema = z
  .object({
    kind: z.literal('count'),
    path: z.string().regex(/^\//),
    label: z.string().min(1),
    where: z
      .object({ field: z.string().min(1), equals: z.union([z.string(), z.number(), z.boolean()]) })
      .strict()
      .optional(),
  })
  .strict();
const ListOpSchema = z
  .object({
    kind: z.literal('list'),
    path: z.string().regex(/^\//),
    itemField: z.string().min(1),
    label: z.string().min(1),
    limit: z.number().int().positive(),
  })
  .strict();

export const ProjectionOpSchema = z.discriminatedUnion('kind', [FieldOpSchema, CountOpSchema, ListOpSchema]);
export type ProjectionOp = z.infer<typeof ProjectionOpSchema>;

export const RehydrationProjectionSchema = z
  .object({
    ops: z.array(ProjectionOpSchema),
    /** 行预算：投影入续行块的最大行数，op 序即优先序（易变项由声明者排尾）。 */
    rowBudget: z.number().int().positive(),
  })
  .strict()
  .meta({
    title: 'RehydrationProjection',
    description: '续行块投影声明：闭词表 op 序列 + 行预算。确定性执行、golden 可测、禁 LLM 压缩。',
  });
export type RehydrationProjection = z.infer<typeof RehydrationProjectionSchema>;

/** 简版 JSON Pointer 求值（仅对象键路径；不支持数组索引转义——投影声明用不到）。 */
function resolvePointer(root: unknown, pointer: string): unknown {
  if (pointer === '/') return root;
  let current: unknown = root;
  for (const segment of pointer.slice(1).split('/')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function formatScalar(value: unknown): string {
  if (value === undefined || value === null) return '(未提供)';
  if (typeof value === 'string') return value === '' ? '(未提供)' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '(未提供)';
}

/**
 * 确定性投影执行器：op 序即输出序，同输入同字节；行预算截断。
 * 路径未命中诚实落「(未提供)」——投影永不编造（诚实降级的投影层形态）。
 */
export function projectArtifact(artifact: unknown, projection: RehydrationProjection): string[] {
  const rows: string[] = [];
  for (const op of projection.ops) {
    if (rows.length >= projection.rowBudget) break;
    const value = resolvePointer(artifact, op.path);
    if (op.kind === 'field') {
      rows.push(`${op.label}: ${formatScalar(value)}`);
    } else if (op.kind === 'count') {
      const items = Array.isArray(value) ? value : [];
      const matched = op.where
        ? items.filter(
            (item) =>
              item !== null &&
              typeof item === 'object' &&
              (item as Record<string, unknown>)[op.where!.field] === op.where!.equals,
          )
        : items;
      rows.push(`${op.label}: ${matched.length}`);
    } else {
      const items = Array.isArray(value) ? value : [];
      const picks = items
        .slice(0, op.limit)
        .map((item) =>
          item !== null && typeof item === 'object'
            ? formatScalar((item as Record<string, unknown>)[op.itemField])
            : '(未提供)',
        );
      rows.push(`${op.label}: ${picks.length > 0 ? picks.join('；') : '(未提供)'}`);
    }
  }
  return rows;
}

/**
 * 引语绑定声明：descriptor 选择加入引用闭环时的回填映射（包域律：映射住包声明，
 * 机器住底座）。resolver 以约定字段名深走草稿，零垂类语义：
 * - draftField/anchorField：草稿中 QuoteClaim[] 的字段名 / 最终形中公证锚点的字段名；
 * - itemScope：覆盖单元数组的 JSON Pointer（如 /risks）——单元内任一引语不收敛，
 *   整单元移入 outOfCoverageField（整 artifact 部分成功呈现）；
 * - itemSummaryField：单元的人读摘要字段（out_of_coverage 条目的 summary 来源）。
 */
export interface CitationBinding {
  draftField: string;
  anchorField: string;
  itemScope: string;
  itemSummaryField: string;
  outOfCoverageField: string;
}

/** 字段级词表（文案归宿律：字段级文案随 artifact descriptor）。 */
export interface ArtifactVocabulary {
  fieldLabels?: Record<string, string>;
  enumLabels?: Record<string, Record<string, string>>;
}

/**
 * artifact descriptor（SCHEMA-SPEC-1 新载体）：一类 artifact 的三位一体声明——
 * schema（推理限定与校验权威）、uiTemplateId（呈现绑定）、rehydrationProjection（记忆投影）、
 * 词表（人端读取）。zod schema 是运行时对象，descriptor 因此是 TS 载体而非 wire 格式；
 * 结构自检走 validateArtifactDescriptor（ABI 准入调用）。
 */
export interface ArtifactDescriptor {
  typeId: ArtifactTypeId;
  /** 人端显示名（词表根条目）。 */
  title: string;
  /** 最终 artifact 校验权威。 */
  schema: z.ZodTypeAny;
  /** 模型侧草稿形状（引用闭环：草稿带 QuoteClaim，经 resolver 铸锚后成为最终形）。缺省 = schema 即模型侧。 */
  draftSchema?: z.ZodTypeAny;
  citationBinding?: CitationBinding;
  rehydrationProjection: RehydrationProjection;
  uiTemplateId: string;
  /** 本类 artifact 被确认/应用后引发的副作用类（confirmationPolicy none 的准入判据之一）。缺省 pure_read。 */
  sideEffect?: 'pure_read' | 'file_write' | 'external_send' | 'mcp_side_effect' | 'authoritative_mutation';
  vocabulary?: ArtifactVocabulary;
}

/** descriptor 结构自检：返回问题清单（空数组 = 合法）。ABI 准入与包自测共用。 */
export function validateArtifactDescriptor(descriptor: ArtifactDescriptor): string[] {
  const issues: string[] = [];
  if (!ARTIFACT_TYPE_ID_PATTERN.test(descriptor.typeId)) {
    issues.push(`typeId "${descriptor.typeId}" 不是 namespaced 形制（如 legal.RiskList）`);
  }
  if (descriptor.title.trim() === '') issues.push('title 不得为空（人端显示名是词表义务）');
  if (descriptor.uiTemplateId.trim() === '') issues.push('uiTemplateId 不得为空');
  const projection = RehydrationProjectionSchema.safeParse(descriptor.rehydrationProjection);
  if (!projection.success) {
    issues.push(`rehydrationProjection 不合法：${projection.error.issues.map((i) => i.message).join('；')}`);
  }
  if (descriptor.citationBinding !== undefined && descriptor.draftSchema === undefined) {
    issues.push('声明 citationBinding 时必须提供 draftSchema（模型侧草稿形状是引用闭环的入口）');
  }
  return issues;
}
