import * as z from 'zod';

/**
 * 逐项处理状态（ADR-023 决定六 fan-out 形制）：失败必须**显式落格**，不允许以缺行表达。
 *
 *   summarized = 该材料已产出摘要；
 *   skipped    = 模型明确交代未处理该材料（如内容不可读），summary 承载理由；
 *   missing    = 模型整条漏报，由**系统**补齐的缺行（模型永远写不出这一枚，见
 *                `completeBatchReport`）——「没做」与「做了但没说」在账面上不同形。
 */
export const BatchItemStatusEnum = z.enum(['summarized', 'skipped', 'missing']);
export type BatchItemStatus = z.infer<typeof BatchItemStatusEnum>;

export const BatchReportItemSchema = z
  .object({
    /** 取值域＝系统注入的就绪材料闭集（ADR-016 决定二同族：模型不选择地址）。 */
    materialId: z.string().min(1),
    /** 纯文本摘要，零引语零坐标（票面「不变量二边界」：本产物零锚点设计）。 */
    summary: z.string(),
    status: BatchItemStatusEnum,
  })
  .strict();
export type BatchReportItem = z.infer<typeof BatchReportItemSchema>;

/**
 * 多文件批处理报告（场景 `generic.batch` 的唯一产出）。
 *
 * 单枚 artifact 携数组 payload——ADR-023 决定六点名的**唯一合法** fan-out 形状：不新增步骤
 * 种类、不做运行期动态步骤。逐项完整性（每份在册就绪材料恰一行）由系统确定性校验
 * （`completeBatchReport`），不由模型自证。
 */
export const BatchReportSchema = z
  .object({
    items: z.array(BatchReportItemSchema),
  })
  .strict()
  .meta({
    title: 'generic.BatchReport',
    description: '通用批处理报告：单枚 artifact 携逐材料行数组，每行自带状态承载失败显式。零锚点。',
  });

export type BatchReport = z.infer<typeof BatchReportSchema>;
