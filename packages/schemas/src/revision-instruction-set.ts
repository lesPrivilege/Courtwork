import * as z from 'zod';
import { OutOfCoverageEntrySchema, QuoteClaimSchema } from './citation.js';
import { SourceAnchorSchema } from './source-anchor.js';

const InstructionLocatorSchema = z.discriminatedUnion('strategy', [
  z.object({
    strategy: z.literal('text'),
    /** 精确匹配用的原文片段。W4 的模糊锚点匹配（文档轻改后仍可定位）以此为基础做容错，本 schema 只约束契约形状，不约束匹配算法。 */
    quote: z.string().min(1),
    /** 消歧上下文：quote 在文档中出现多次时，用于辅助判断改的是哪一处（如条款标题）。 */
    paragraphHint: z.string().optional(),
  }),
  z.object({
    strategy: z.literal('tableCell'),
    rowContains: z.string().min(1),
    columnHeader: z.string().min(1),
    quote: z.string().min(1),
  }),
  z.object({
    strategy: z.literal('tableRow'),
    rowContains: z.string().min(1),
  }),
]);
export type InstructionLocator = z.infer<typeof InstructionLocatorSchema>;

const StatuteRefSchema = z.object({
  /** 法律/法规名称，如"中华人民共和国民法典"。故意用开放字符串而非枚举——法律体系本身在变，提前锁定会在新法出台时构成 breaking change（同 CaseFile.documentType 的设计取舍）。 */
  law: z.string().min(1),
  /** 条文定位，如"第五百八十五条第二款"，不拆分款/项子字段——同样是避免过早锁定结构。 */
  article: z.string().min(1),
  /** 法律修订/生效版本标记；法条文本随修法变化，缺省视为引用时最新有效版本。 */
  effectiveVersion: z.string().optional(),
});
export type StatuteRef = z.infer<typeof StatuteRefSchema>;

const CitationObjectSchema = z.object({
  /** 人类可读的依据引用（法条/判例/合同条款编号），批注气泡里直接展示的文本。 */
  citation: z.string().min(1),
  /**
   * 依据在卷宗材料里的锚点，可选而非必填（与 RiskList.basis 的 sourceAnchors 不同）：
   * 引用法条本身是对外部权威文本的引用，不天然要求挂在已入卷的文件上；
   * 若该依据同时也由卷宗内的具体证据支撑（如某页合同条款），才在此处附加锚点。
   */
  sourceAnchors: z.array(SourceAnchorSchema).default([]),
  /** 结构化法条引用，供 packages/tools 的 cite-check（W5）核验存在性。 */
  statuteRef: StatuteRefSchema.optional(),
  /**
   * 不透明的证据台账键，由 core 的信源台账在编译本指令集时签发（W6.2 整改）。
   * 门禁校验只按这个 key 查台账，不解析、不依赖 citation 展示文本——citation
   * 文本此后无论怎么编辑都不影响门禁结论。缺失 evidenceKey 的引用一律按 C 级
   * 未确认证据处理（fail closed）。并非每条引用都会有它：非工具来源的引用
   * （如直接的法条原文）不适用信源分级，不会被要求携带这个字段。
   */
  evidenceKey: z.string().min(1).optional(),
});

export const CitationSchema = CitationObjectSchema.refine(
  (value) => value.sourceAnchors.length > 0 || value.statuteRef !== undefined,
  {
    message:
      'sourceAnchors 与 statuteRef 至少提供一个：纯散文依据引用不可核验（docs/decisions/ADR-003-evidence-and-anchors.md，C 级事实不得未经确认流入 docx 批注依据）',
    path: ['sourceAnchors'],
  },
);
export type Citation = z.infer<typeof CitationSchema>;

const AnnotationSchema = z.object({
  text: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const RevisionInstructionSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('replace'),
    locator: InstructionLocatorSchema,
    text: z.string().min(1),
    annotation: AnnotationSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('insert'),
    /** insert 的 locator 语义是"插入点之后"，不是"替换目标"：quote/rowContains 定位到锚点本身，新内容插在其后。 */
    locator: InstructionLocatorSchema,
    text: z.string().min(1),
    annotation: AnnotationSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('delete'),
    locator: InstructionLocatorSchema,
    annotation: AnnotationSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    /** commentOnly 不改文字，存在的唯一目的是留批注，因此 annotation 在这一支是必填的（其余三支可选）。 */
    kind: z.literal('commentOnly'),
    locator: InstructionLocatorSchema,
    annotation: AnnotationSchema,
  }),
]);
export type RevisionInstruction = z.infer<typeof RevisionInstructionSchema>;

export const RevisionInstructionSetSchema = z
  .object({
    id: z.string().min(1),
    caseId: z.string().min(1),
    targetDocument: z.object({ fileId: z.string().min(1) }),
    instructions: z.array(RevisionInstructionSchema).min(1),
    /**
     * 引用闭环缺口（LEGAL-ANCHOR-BINDING-2，循 `legal.RiskList` 先例）：受限修复重试后仍
     * 无法唯一锚定的**修订指令**移入本表——缺口如实呈现并携原判与失败原因。缺省空表，
     * 存量最终形夹具零迁移（additive-default 键不升版，2026-08-09 裁定二）。
     *
     * 与三面的差别如实登记：`instructions` 保留 `.min(1)`。全部指令都不收敛时剪枝后的
     * 最终形当场硬失败（`GenerationValidationError`），不产出零指令的修订指令集——
     * 它带 `file_write` 副作用，「什么都不改的批注稿」比显式失败更误导。
     */
    outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
  })
  .meta({
    title: 'RevisionInstructionSet',
    description:
      '修订指令集：驱动 packages/output 产出带 Word 原生修订痕迹与批注的 .docx。每条指令 = 定位（文本锚/表格单元格/表格行）+ 操作（替换/插入/删除/纯批注）+ 可选批注（含依据引用）+ 引用闭环缺口表。定位鲁棒性、生成引擎实现均由消费方负责，本 schema 只约束契约形状。',
  });
export type RevisionInstructionSet = z.infer<typeof RevisionInstructionSetSchema>;

/**
 * 模型侧草稿形（LEGAL-ANCHOR-BINDING-2·「模型出引语，系统出坐标」）。与最终形的差别恰两处，
 * 两处都是**系统裁决性事实退出模型输出面**：
 * ① 依据引用携 `quoteClaims`（QuoteClaim）而非 `sourceAnchors`——坐标字段结构性不存在，
 *    模型机制性失去伪造 offset 的能力，坐标由 citation resolver 唯一精确匹配后铸造；
 * ② `evidenceKey` 不在草稿面——它由 core 的信源台账签发（W6.2），不是模型可自报的字段。
 */
const CitationDraftObjectSchema = z.object({
  citation: z.string().min(1),
  /** 依据在卷宗材料里的引语（可空）：纯法条引用不天然挂在已入卷文件上，此时以 statuteRef 立据。 */
  quoteClaims: z.array(QuoteClaimSchema).default([]),
  statuteRef: StatuteRefSchema.optional(),
});

export const CitationDraftSchema = CitationDraftObjectSchema.refine(
  (value) => value.quoteClaims.length > 0 || value.statuteRef !== undefined,
  {
    message:
      'quoteClaims 与 statuteRef 至少提供一个：纯散文依据引用不可核验（docs/decisions/ADR-003-evidence-and-anchors.md，C 级事实不得未经确认流入 docx 批注依据）',
    path: ['quoteClaims'],
  },
);
export type CitationDraft = z.infer<typeof CitationDraftSchema>;

const AnnotationDraftSchema = z.object({
  text: z.string().min(1),
  citations: z.array(CitationDraftSchema).default([]),
});
export type AnnotationDraft = z.infer<typeof AnnotationDraftSchema>;

export const RevisionInstructionDraftSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('replace'),
    locator: InstructionLocatorSchema,
    text: z.string().min(1),
    annotation: AnnotationDraftSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('insert'),
    locator: InstructionLocatorSchema,
    text: z.string().min(1),
    annotation: AnnotationDraftSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('delete'),
    locator: InstructionLocatorSchema,
    annotation: AnnotationDraftSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('commentOnly'),
    locator: InstructionLocatorSchema,
    annotation: AnnotationDraftSchema,
  }),
]);
export type RevisionInstructionDraft = z.infer<typeof RevisionInstructionDraftSchema>;

export const RevisionInstructionSetDraftSchema = z
  .object({
    id: z.string().min(1),
    caseId: z.string().min(1),
    targetDocument: z.object({ fileId: z.string().min(1) }),
    instructions: z.array(RevisionInstructionDraftSchema).min(1),
  })
  .meta({
    title: 'RevisionInstructionSetDraft',
    description:
      '修订指令集草稿（模型侧）：依据引用只携文件+页/块+逐字引语；坐标由 resolver 公证铸造，证据台账键由 core 签发，两者在本形状里都不存在。',
  });
export type RevisionInstructionSetDraft = z.infer<typeof RevisionInstructionSetDraftSchema>;
