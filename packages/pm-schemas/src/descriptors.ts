import { parseArtifactDescriptor, type ArtifactDescriptor } from './descriptor.js';

/**
 * PM 四场景的 artifact 描述符——字段级词表（docs/architecture/schema-engineering.md 文案归宿律）。
 * 每个枚举 wire 值都映射为可读专业词（零编码暴露律 docs/architecture/schema-engineering.md §五）；
 * 领域无关的 view-resolver 消费本表即可渲染，宿主零领域字面量。
 * 全部经 parseArtifactDescriptor 校验（必填齐全 / 无漂移键）。
 */

const SEVERITY_VOCAB = { high: '高', mid: '中', low: '低' } as const;

export const feedbackDigestDescriptor: ArtifactDescriptor = parseArtifactDescriptor({
  artifactType: 'pm.FeedbackDigest',
  title: '反馈归集',
  primaryCollection: 'items',
  fields: [
    { key: 'id', label: '编号', kind: 'mono' },
    { key: 'quote', label: '用户原声', kind: 'text' },
    { key: 'channel', label: '渠道', kind: 'enum' },
    { key: 'rootCause', label: '根因', kind: 'text' },
    { key: 'volume', label: '声量', kind: 'number' },
    { key: 'severity', label: '严重度', kind: 'enum' },
    { key: 'status', label: '状态', kind: 'status' },
    { key: 'sourceAnchors', label: '溯源', kind: 'anchor' },
  ],
  enumVocab: {
    channel: {
      'app-review': '应用商店评价',
      'support-ticket': '客服工单',
      interview: '用户访谈',
      nps: 'NPS 开放题',
      community: '社区反馈',
    },
    severity: SEVERITY_VOCAB,
    status: { new: '新增', triaged: '已归类', out_of_coverage: '未覆盖·需补材料' },
  },
});

export const prdReviewDescriptor: ArtifactDescriptor = parseArtifactDescriptor({
  artifactType: 'pm.PrdReview',
  title: '需求文档评审',
  primaryCollection: 'findings',
  fields: [
    { key: 'id', label: '编号', kind: 'mono' },
    { key: 'section', label: '章节', kind: 'mono' },
    { key: 'clause', label: '条款', kind: 'text' },
    { key: 'defectType', label: '缺陷维度', kind: 'enum' },
    { key: 'severity', label: '严重度', kind: 'enum' },
    { key: 'issue', label: '问题', kind: 'text' },
    { key: 'suggestion', label: '修改建议', kind: 'text' },
    { key: 'status', label: '处置', kind: 'status' },
    { key: 'sourceAnchors', label: '定位', kind: 'anchor' },
  ],
  enumVocab: {
    defectType: {
      'vague-metric': '模糊指标',
      'missing-acceptance': '缺验收标准',
      'undefined-boundary': '未定义边界',
      'missing-dependency': '依赖缺失',
      'conflicting-requirement': '冲突需求',
      untestable: '不可测表述',
    },
    severity: SEVERITY_VOCAB,
    // 与法律包 DispositionStatus 同构的三态处置词（S3 换皮的字面证据）。
    status: { pending: '待确认', confirmed: '已确认', rejected: '已驳回' },
  },
});

export const priorityScoreDescriptor: ArtifactDescriptor = parseArtifactDescriptor({
  artifactType: 'pm.PriorityScore',
  title: '需求优先级',
  primaryCollection: 'rows',
  fields: [
    { key: 'id', label: '编号', kind: 'mono' },
    { key: 'item', label: '需求', kind: 'text' },
    { key: 'params.reach.value', label: 'Reach', kind: 'number' },
    { key: 'params.impact.value', label: 'Impact', kind: 'number' },
    { key: 'params.confidence.value', label: 'Confidence', kind: 'number' },
    { key: 'params.effort.value', label: 'Effort', kind: 'number' },
    // 得分为单值时直显；裁量区间行的格式化属渲染器职责（Stage），golden 行均为确定单值。
    { key: 'score', label: '得分', kind: 'mono' },
    { key: 'rank', label: '排序建议', kind: 'mono' },
    { key: 'band', label: '分档', kind: 'enum' },
  ],
  enumVocab: {
    band: { P0: '立即启动', P1: '本迭代', P2: '排队', P3: '暂搁' },
  },
});

export const actionItemsDescriptor: ArtifactDescriptor = parseArtifactDescriptor({
  artifactType: 'pm.ActionItems',
  title: '纪要行动项',
  primaryCollection: 'items',
  fields: [
    { key: 'id', label: '编号', kind: 'mono' },
    { key: 'action', label: '行动项', kind: 'text' },
    { key: 'owner', label: '负责人', kind: 'text' },
    { key: 'due', label: '截止日', kind: 'mono' },
    { key: 'markers', label: '核对标记', kind: 'tags' },
    { key: 'status', label: '状态', kind: 'status' },
    { key: 'sourceAnchors', label: '溯源', kind: 'anchor' },
  ],
  enumVocab: {
    markers: { unclosed: '未闭环', reassigned: '换负责人' },
    status: { open: '未闭环', done: '已完成', out_of_coverage: '未覆盖·需补材料' },
  },
});

/** 全部 PM 描述符，按 artifactType 索引——宿主据 uiTemplateId/artifactType 选表。 */
export const pmArtifactDescriptors: Record<string, ArtifactDescriptor> = {
  [feedbackDigestDescriptor.artifactType]: feedbackDigestDescriptor,
  [prdReviewDescriptor.artifactType]: prdReviewDescriptor,
  [priorityScoreDescriptor.artifactType]: priorityScoreDescriptor,
  [actionItemsDescriptor.artifactType]: actionItemsDescriptor,
};
