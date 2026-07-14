import * as z from 'zod';
import { SourceAnchorSchema } from '@courtwork/schemas';

/** 反馈来源渠道（wire 值；中文显示名走 descriptor 词表）。 */
export const FeedbackChannelEnum = z.enum([
  'app-review',
  'support-ticket',
  'interview',
  'nps',
  'community',
]);
export type FeedbackChannel = z.infer<typeof FeedbackChannelEnum>;

/** 严重度档位——审阅语义（docs/architecture/schema-engineering.md 语义色白名单），出档位不出小数分。 */
export const FeedbackSeverityEnum = z.enum(['high', 'mid', 'low']);
export type FeedbackSeverity = z.infer<typeof FeedbackSeverityEnum>;

/**
 * 条目处置态。out_of_coverage = 无法归类的诚实置出（docs/product/pm-vertical.md §一），
 * 不硬塞进任一聚类——渐进完备性的兜底三态在归集域的表达（docs/architecture/schema-engineering.md §四）。
 */
export const FeedbackStatusEnum = z.enum(['new', 'triaged', 'out_of_coverage']);
export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>;

const FeedbackItemSchema = z.object({
  id: z.string().min(1),
  /** 逐字摘录的用户原声，与 sourceAnchors 一同构成"证据引语"（provenance 双通道的 verified 通道）。 */
  quote: z.string().min(1),
  /** 无锚不落格：任何落格条目至少一个溯源锚，OOC 噪声条目亦须锚回其原始语料行。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
  channel: FeedbackChannelEnum,
  /** 所属根因聚类 id；OOC 条目为 null（未归类，不硬塞）。 */
  clusterId: z.string().min(1).nullable(),
  /** AI 归纳的根因（generated 通道，可 amend）；OOC 条目为 null。 */
  rootCause: z.string().min(1).nullable(),
  /** 所属根因簇的声量（确定性计数，denormalized 至条目便于"聚类×渠道"矩阵格渲染）。 */
  volume: z.number().int().nonnegative(),
  severity: FeedbackSeverityEnum,
  status: FeedbackStatusEnum,
});
export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;

const FeedbackClusterSchema = z.object({
  id: z.string().min(1),
  /** 主题命名（generated 通道，可 amend）。 */
  name: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(1),
  /** 代表原声引语的锚（无锚不落格在聚类层的表达）。 */
  evidence: z.array(SourceAnchorSchema).min(1),
});
export type FeedbackCluster = z.infer<typeof FeedbackClusterSchema>;

export const FeedbackDigestSchema = z
  .object({
    projectId: z.string().min(1),
    items: z.array(FeedbackItemSchema),
    clusters: z.array(FeedbackClusterSchema),
  })
  .superRefine((value, ctx) => {
    const clusterIds = new Set(value.clusters.map((c) => c.id));
    const itemIds = new Set(value.items.map((i) => i.id));

    value.items.forEach((item, index) => {
      // OOC ⟺ 未归类：状态与聚类引用必须自洽，杜绝"标 OOC 却挂了簇"或"已归类却无根因"。
      const isOoc = item.status === 'out_of_coverage';
      if (isOoc && (item.clusterId !== null || item.rootCause !== null)) {
        ctx.addIssue({
          code: 'custom',
          message: 'out_of_coverage 条目必须 clusterId 与 rootCause 均为 null（诚实置出，不硬塞聚类）',
          path: ['items', index, 'clusterId'],
        });
      }
      if (!isOoc && (item.clusterId === null || item.rootCause === null)) {
        ctx.addIssue({
          code: 'custom',
          message: '非 out_of_coverage 条目必须已归类（clusterId 与 rootCause 非 null）',
          path: ['items', index, 'clusterId'],
        });
      }
      if (item.clusterId !== null && !clusterIds.has(item.clusterId)) {
        ctx.addIssue({
          code: 'custom',
          message: `条目 clusterId "${item.clusterId}" 在 clusters 中不存在`,
          path: ['items', index, 'clusterId'],
        });
      }
    });

    value.clusters.forEach((cluster, index) => {
      cluster.memberIds.forEach((memberId, memberIndex) => {
        if (!itemIds.has(memberId)) {
          ctx.addIssue({
            code: 'custom',
            message: `聚类 memberId "${memberId}" 在 items 中不存在`,
            path: ['clusters', index, 'memberIds', memberIndex],
          });
        }
      });
    });
  })
  .meta({
    title: 'pm.FeedbackDigest',
    description:
      'PM-1 反馈归集：跨渠道反馈条目 × 根因聚类 × 声量/严重度 × 逐条溯源锚。模型只归纳不裁决，无锚不落格，OOC 诚实置出。',
  });

export type FeedbackDigest = z.infer<typeof FeedbackDigestSchema>;
