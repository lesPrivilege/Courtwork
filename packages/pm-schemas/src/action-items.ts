import * as z from 'zod';
import { SourceAnchorSchema } from '@courtwork/schemas';

/**
 * 跨纪要闭环核对标记（docs/62 §四）——与 S1 矛盾标记同构：
 *   unclosed  = 跨多份纪要仍未闭环
 *   reassigned = 负责人在纪要间被更换
 * 中文（未闭环/换负责人）走 descriptor。
 */
export const ActionMarkerEnum = z.enum(['unclosed', 'reassigned']);
export type ActionMarker = z.infer<typeof ActionMarkerEnum>;

export const ActionStatusEnum = z.enum(['open', 'done', 'out_of_coverage']);
export type ActionStatus = z.infer<typeof ActionStatusEnum>;

/**
 * 跨纪要接续记录（carryOvers）——同一行动项在历史纪要中的出现轨迹。
 * 演示亮点"上周说好的埋点谁跟了"（docs/61 §3.4）：负责人更迭在此留痕。
 * 纯文本跨文档接续，≈ 法律包跨文书实体对齐的轻量版（无实体核验）。
 */
const CarryOverSchema = z.object({
  /** 该次出现所属的纪要文件 id。 */
  minutesRef: z.string().min(1),
  /** 当时登记的负责人（提案态；null=当时亦未指派）。 */
  owner: z.string().min(1).nullable(),
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
});
export type CarryOver = z.infer<typeof CarryOverSchema>;

const ActionItemSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  /** 负责人**提案**——系统永不替 PM 向他人派活（协作者非数字员工）。null=未指派。 */
  owner: z.string().min(1).nullable(),
  /** 截止日**提案**（ISO date）。null=未定。 */
  due: z.iso.date().nullable(),
  /** 无锚不落格。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
  markers: z.array(ActionMarkerEnum).default([]),
  /** 跨纪要接续轨迹（可选）；reassigned 标记必须有接续记录佐证。 */
  carryOvers: z.array(CarryOverSchema).default([]),
  status: ActionStatusEnum,
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const ActionItemsSchema = z
  .object({
    projectId: z.string().min(1),
    items: z.array(ActionItemSchema),
  })
  .superRefine((value, ctx) => {
    value.items.forEach((item, index) => {
      // reassigned 必须有接续佐证（跨纪要负责人更迭的证据链）。
      if (item.markers.includes('reassigned') && item.carryOvers.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'reassigned 标记必须携 carryOvers 接续记录佐证（负责人更迭需可溯源）',
          path: ['items', index, 'carryOvers'],
        });
      }
      // OOC 行动项：owner/due 置空（抽取失败的诚实态）。
      if (item.status === 'out_of_coverage' && (item.owner !== null || item.due !== null)) {
        ctx.addIssue({
          code: 'custom',
          message: 'out_of_coverage 行动项必须 owner 与 due 均为 null',
          path: ['items', index, 'status'],
        });
      }
    });
  })
  .meta({
    title: 'pm.ActionItems',
    description:
      'PM-4 纪要行动项：谁/做什么/何时（各带锚）+ 跨纪要闭环核对（unclosed/reassigned）+ carryOvers 接续轨迹。负责人与截止日永为提案。',
  });

export type ActionItems = z.infer<typeof ActionItemsSchema>;
