import * as z from 'zod';

/**
 * 通用起草产物（ADR-023 决定一，场景 `generic.draft` 的唯一产出）。
 *
 * 形制与 `@courtwork/output` 的 `DraftDocxInput` **同构**（`{title, paragraphs}`）——通用起草
 * 的落盘链复用既有自研 `compileDraftToDocx`，不另立第二套编译输入形状。
 *
 * 零锚点设计（票面「不变量二边界」）：本产物不携引语与坐标，故不声明 `citationBinding`。
 * 若日后出现引语需求，属另立票的 schema 变更——模型永不出坐标。
 */
export const DraftDocumentSchema = z
  .object({
    title: z.string().min(1),
    paragraphs: z.array(z.string().min(1)),
  })
  .strict()
  .meta({
    title: 'generic.DraftDocument',
    description: '通用起草文稿：标题 + 正文段落序列。与 compileDraftToDocx 输入同构，零锚点。',
  });

export type DraftDocument = z.infer<typeof DraftDocumentSchema>;
