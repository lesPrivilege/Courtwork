import * as z from 'zod';
import { OutOfCoverageEntrySchema, QuoteClaimSchema, SourceAnchorSchema } from '@courtwork/schemas';

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
    /**
     * 引用闭环缺口（LEGAL-ANCHOR-BINDING-1）：覆盖单元是**边**——关系是携证据的断言，
     * 节点不携锚故不入剪枝面。仍不收敛的边移入本表，图谱其余部分照常呈现。
     */
    outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
  })
  .meta({
    title: 'PartyGraph',
    description: '当事人关系图谱：节点（自然人/法人 + 别名数组）+ 边（关系类型 + 证据锚点）+ 引用闭环缺口表。',
  });

export type PartyGraph = z.infer<typeof PartyGraphSchema>;

/** 草稿侧关系边（「模型出引语，系统出坐标」）：携 QuoteClaim，坐标字段结构性不存在。 */
const PartyEdgeDraftSchema = z.object({
  id: z.string().min(1),
  sourcePartyId: z.string().min(1),
  targetPartyId: z.string().min(1),
  relationType: z.string().min(1),
  /** 一条关系断言至少要有一条引语支撑（同最终形 min(1)）。 */
  quoteClaims: z.array(QuoteClaimSchema).min(1),
  markers: z.array(z.string().min(1)).optional(),
});
export type PartyEdgeDraft = z.infer<typeof PartyEdgeDraftSchema>;

export const PartyGraphDraftSchema = z
  .object({
    caseId: z.string().min(1),
    nodes: z.array(PartyNodeSchema),
    edges: z.array(PartyEdgeDraftSchema),
  })
  .meta({
    title: 'PartyGraphDraft',
    description: '当事人关系图谱草稿（模型侧）：边只携文件+页/块+逐字引语；坐标由 resolver 公证铸造。',
  });
export type PartyGraphDraft = z.infer<typeof PartyGraphDraftSchema>;
