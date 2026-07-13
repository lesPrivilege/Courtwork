import * as z from 'zod';

/**
 * 字段渲染类型（docs/36 五级封闭模型的字段位）：
 *   text   自由文本            mono  专业编码（id/ref/日期/得分，tabular-nums）
 *   number 数值               enum  机器枚举，须词表映射
 *   status 门禁/处置三态，须词表映射（审阅语义色白名单）
 *   grade  信源分级 A/B/C      anchor SourceAnchor[]（行尾角标 + 溯源 hover）
 *   tags   枚举数组，逐元素词表映射（如跨纪要标记 unclosed/reassigned）
 */
export const FieldKindEnum = z.enum([
  'text',
  'mono',
  'number',
  'enum',
  'status',
  'grade',
  'anchor',
  'tags',
]);
export type FieldKind = z.infer<typeof FieldKindEnum>;

const DescriptorFieldSchema = z.object({
  /** 字段在条目对象内的取值路径（点分，如 "params.reach.value"）。 */
  key: z.string().min(1),
  /** 显示名——零编码暴露律：wire 字段名永不直出，一律词表映射为专业名（docs/36 §五①）。 */
  label: z.string().min(1),
  kind: FieldKindEnum,
});
export type DescriptorField = z.infer<typeof DescriptorFieldSchema>;

/**
 * Artifact 描述符——字段级话语宿主（docs/53 文案归宿律"字段级随 artifact descriptor"）。
 * 领域无关宿主（PreviewHost）据此把一份 artifact JSON 渲染为可读工作面：
 * 字段名、枚举值、分级角标全部经词表映射，宿主代码零领域字面量。
 * 这就是"换垂类=换声明"的字段面——同一渲染逻辑换 descriptor 即另一行业。
 */
export const ArtifactDescriptorSchema = z
  .object({
    /** 带命名空间的 artifact 类型 id（如 "pm.FeedbackDigest"）——双命名空间准入（docs/24）。 */
    artifactType: z.string().regex(/^[a-z]+\.[A-Za-z]+$/, 'artifactType 必须形如 "<namespace>.<Name>"'),
    /** 工作面标题显示名。 */
    title: z.string().min(1),
    /** 主条目集合在 artifact 内的路径（如 "items" / "findings" / "rows"）。 */
    primaryCollection: z.string().min(1),
    fields: z.array(DescriptorFieldSchema).min(1),
    /** 枚举/状态字段的词表：enumVocab[字段 key][wire 值] = 显示名。 */
    enumVocab: z.record(z.string(), z.record(z.string(), z.string())).default({}),
    /** 信源分级词表（存在 grade 字段时必填）。 */
    gradeVocab: z.record(z.enum(['A', 'B', 'C']), z.string()).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    // 必填字段齐全（docs/69 C2.2）：每个 enum/status 字段必须在 enumVocab 备有映射表；
    // grade 字段必须有 gradeVocab。缺映射 = 包 lint 错误，非运行时惊吓（docs/53 文案归宿律）。
    const keys = new Set(d.fields.map((f) => f.key));
    if (new Set(d.fields.map((f) => f.key)).size !== d.fields.length) {
      ctx.addIssue({ code: 'custom', message: 'fields 存在重复 key', path: ['fields'] });
    }
    d.fields.forEach((field, index) => {
      if (
        (field.kind === 'enum' || field.kind === 'status' || field.kind === 'tags') &&
        !d.enumVocab[field.key]
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `字段 "${field.key}"（${field.kind}）缺 enumVocab 映射表`,
          path: ['fields', index],
        });
      }
      if (field.kind === 'grade' && !d.gradeVocab) {
        ctx.addIssue({
          code: 'custom',
          message: `字段 "${field.key}"（grade）缺 gradeVocab`,
          path: ['fields', index],
        });
      }
    });
    // enumVocab 不得声明不存在的字段（防漂移）。
    Object.keys(d.enumVocab).forEach((k) => {
      if (!keys.has(k)) {
        ctx.addIssue({ code: 'custom', message: `enumVocab 键 "${k}" 不对应任何字段`, path: ['enumVocab'] });
      }
    });
  })
  .meta({
    title: 'ArtifactDescriptor',
    description: '字段级词表：领域无关宿主据此渲染 artifact；换垂类=换 descriptor，渲染逻辑零 diff。',
  });

export type ArtifactDescriptor = z.infer<typeof ArtifactDescriptorSchema>;

/** 解析并校验一份描述符；非法即抛（准入校验，docs/24）。 */
export function parseArtifactDescriptor(raw: unknown): ArtifactDescriptor {
  return ArtifactDescriptorSchema.parse(raw);
}

/**
 * 断言描述符的枚举词表完整覆盖某 zod 枚举的全部 wire 值（映射表完备性，docs/36 §五）。
 * 供包上架校验/测试调用：漏一个枚举值 → 断言失败（变异全红的抓手）。
 */
export function assertVocabCoversEnum(
  descriptor: ArtifactDescriptor,
  fieldKey: string,
  enumValues: readonly string[],
): void {
  const vocab = descriptor.enumVocab[fieldKey];
  if (!vocab) {
    throw new Error(`descriptor ${descriptor.artifactType} 字段 "${fieldKey}" 无 enumVocab`);
  }
  const missing = enumValues.filter((v) => !(v in vocab));
  if (missing.length > 0) {
    throw new Error(
      `descriptor ${descriptor.artifactType} 字段 "${fieldKey}" 词表缺值：${missing.join(', ')}`,
    );
  }
}
