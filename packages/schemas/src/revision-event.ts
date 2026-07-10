import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const ArtifactTypeEnum = z.enum([
  'CaseFile',
  'Timeline',
  'PartyGraph',
  'RiskList',
  'ReviewMatrix',
  'RevisionInstructionSet',
]);
export type ArtifactType = z.infer<typeof ArtifactTypeEnum>;

const RevisionActorSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
});
export type RevisionActor = z.infer<typeof RevisionActorSchema>;

export const RevisionEventSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.iso.datetime(),
    actor: RevisionActorSchema,
    /**
     * 训练管线按案件维度切分/脱敏时需要——只靠 artifactId 反查案件会让
     * 下游多背一个依赖。可选是因为部分修正事件不必然挂在具体案件下。
     */
    caseId: z.string().min(1).optional(),
    artifactType: ArtifactTypeEnum,
    artifactId: z.string().min(1),
    /** JSON Pointer（RFC 6901），定位到被修正的具体字段，使训练管线可程序化重放/应用这条修正。 */
    fieldPath: z.string().regex(/^\//, 'fieldPath 必须是 JSON Pointer（以 / 开头）'),
    previousValue: z.unknown(),
    newValue: z.unknown(),
    /** 人工修正理由：训练信号里价值很高，但不是每次修正都会填写，故可选。 */
    reason: z.string().optional(),
    /** 本次修正依据的证据锚点。 */
    sourceAnchors: z.array(SourceAnchorSchema).optional(),
    /**
     * 关联产生本次修正的会话。schema 层保持可选以兼容尚未回填 sessionId 的历史
     * 数据与既有测试样例；core 落盘（RevisionEventStore.record）时强制要求
     * 存在，缺失即拒绝写入（W6.2 整改，见 packages/core/SPEC.md 验收记录）。
     */
    sessionId: z.string().min(1).optional(),
  })
  .meta({
    title: 'RevisionEvent',
    description:
      'schema 级修正事件：反馈标注的统一记录格式。字段设计假设本类型未来直接进训练管线消费，因此不依赖会话上下文即可独立使用。',
  });

export type RevisionEvent = z.infer<typeof RevisionEventSchema>;
