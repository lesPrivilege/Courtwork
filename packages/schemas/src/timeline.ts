import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

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
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineSchema = z
  .object({
    caseId: z.string().min(1),
    events: z.array(TimelineEventSchema),
  })
  .meta({
    title: 'Timeline',
    description: '事件时间线：事件 + 日期（含模糊日期表达）+ 当事人关联 + 来源锚点。',
  });

export type Timeline = z.infer<typeof TimelineSchema>;
