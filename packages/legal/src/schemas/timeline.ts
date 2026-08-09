import * as z from 'zod';
import { OutOfCoverageEntrySchema, QuoteClaimSchema, SourceAnchorSchema } from '@courtwork/schemas';

const EventDateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('exact'), date: z.iso.date() }),
  z.object({
    kind: z.literal('fuzzy'),
    text: z.string().min(1),
    rangeStart: z.iso.date().optional(),
    rangeEnd: z.iso.date().optional(),
  }),
]);
export type EventDate = z.infer<typeof EventDateSchema>;

const TimelineEventSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  date: EventDateSchema,
  partyIds: z.array(z.string().min(1)).default([]),
  /** 事件必须至少有一个来源锚点：没有证据支撑的"事件"在法律审阅场景下不可信。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
  /**
   * 结构化事件标记，供 UI 消费判定（如高亮矛盾事件），替代此前靠 description
   * 文本匹配关键词做判断的做法（违反"UI 零推断"原则）。
   * 当前词表仅 "contradiction"；词表将随 ContradictionList 类型正式落地后收编、
   * 不再是本字段自由字符串的隐性约定。
   */
  markers: z.array(z.string().min(1)).optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineSchema = z
  .object({
    caseId: z.string().min(1),
    events: z.array(TimelineEventSchema),
    /**
     * 引用闭环缺口（LEGAL-ANCHOR-BINDING-1，循 `legal.RiskList` 先例）：受限修复重试后仍
     * 无法唯一锚定的事件移入本表——缺口如实呈现并携原判与失败原因。缺省空表，存量最终形
     * 夹具零迁移。
     */
    outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
  })
  .meta({
    title: 'Timeline',
    description: '事件时间线：事件 + 日期（含模糊日期表达）+ 当事人关联 + 来源锚点 + 引用闭环缺口表。',
  });

export type Timeline = z.infer<typeof TimelineSchema>;

/**
 * 草稿侧事件（「模型出引语，系统出坐标」）：与最终形唯一的差别是携 QuoteClaim 而非
 * SourceAnchor——坐标字段在模型侧结构性不存在，resolver 唯一精确匹配后铸造坐标与文本层版本。
 */
const TimelineEventDraftSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  date: EventDateSchema,
  partyIds: z.array(z.string().min(1)).default([]),
  /** 事件必须至少有一条引语：没有证据支撑的"事件"在法律审阅场景下不可信（同最终形 min(1)）。 */
  quoteClaims: z.array(QuoteClaimSchema).min(1),
  markers: z.array(z.string().min(1)).optional(),
});
export type TimelineEventDraft = z.infer<typeof TimelineEventDraftSchema>;

export const TimelineDraftSchema = z
  .object({
    caseId: z.string().min(1),
    events: z.array(TimelineEventDraftSchema),
  })
  .meta({
    title: 'TimelineDraft',
    description: '事件时间线草稿（模型侧）：事件只携文件+页/块+逐字引语；坐标由 resolver 公证铸造。',
  });
export type TimelineDraft = z.infer<typeof TimelineDraftSchema>;
