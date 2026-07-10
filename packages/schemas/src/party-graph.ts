import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const PartyKindEnum = z.enum(['individual', 'organization']);
export type PartyKind = z.infer<typeof PartyKindEnum>;

const PartyNodeSchema = z.object({
  id: z.string().min(1),
  kind: PartyKindEnum,
  primaryName: z.string().min(1),
  /** 别名数组：服务跨文档实体对齐（同一当事人在不同文书中的不同写法归一）。 */
  aliases: z.array(z.string().min(1)).default([]),
});
export type PartyNode = z.infer<typeof PartyNodeSchema>;

const PartyEdgeSchema = z.object({
  id: z.string().min(1),
  sourcePartyId: z.string().min(1),
  targetPartyId: z.string().min(1),
  /** 关系类型：开放字符串，法律关系类型繁多，不在 schema 层预设枚举。 */
  relationType: z.string().min(1),
  /** 关系必须至少有一个来源锚点：一条关系断言应当有证据支撑。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
  /**
   * 结构化关系标记，供 UI 消费判定（如高亮矛盾边），避免靠 relationType 文案/边 ID
   * 猜测做判断（违反"UI 零推断"原则）。
   * 当前词表仅 "contradiction"；词表将随 ContradictionList 类型正式落地后收编、
   * 不再是本字段自由字符串的隐性约定。
   */
  markers: z.array(z.string().min(1)).optional(),
});
export type PartyEdge = z.infer<typeof PartyEdgeSchema>;

export const PartyGraphSchema = z
  .object({
    caseId: z.string().min(1),
    nodes: z.array(PartyNodeSchema),
    edges: z.array(PartyEdgeSchema),
  })
  .meta({
    title: 'PartyGraph',
    description: '当事人关系图谱：节点（自然人/法人 + 别名数组）+ 边（关系类型 + 证据锚点）。',
  });

export type PartyGraph = z.infer<typeof PartyGraphSchema>;
