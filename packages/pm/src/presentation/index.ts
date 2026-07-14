import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

const SEVERITY_LABELS = { high: '高', mid: '中', low: '低' } as const;
const ESTIMATE_STATUS_LABELS = {
  filled: '已填充',
  out_of_coverage: '未覆盖·需补材料',
} as const;

export const PM_ARTIFACTS: VerticalPackageDescriptorV1['artifacts'] = [
    {
      typeId: 'pm.FeedbackDigest',
      title: '反馈归集',
      schemaId: 'pm.FeedbackDigest',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/projectId', label: '项目' },
          { kind: 'count', path: '/items', label: '反馈条目' },
          { kind: 'count', path: '/items', label: '已归类', where: { field: 'status', equals: 'triaged' } },
          { kind: 'list', path: '/items', itemField: 'quote', label: '用户原声', limit: 3 },
        ],
        rowBudget: 5,
      },
      uiTemplateId: 'courtwork.artifact-table.v1',
      presentation: {
        collectionPointer: '/items',
        fields: [
          { pointer: '/id', label: '编号', format: 'mono' },
          { pointer: '/quote', label: '用户原声', format: 'text' },
          {
            pointer: '/channel',
            label: '渠道',
            format: 'enum',
            valueLabels: {
              'app-review': '应用商店评价',
              'support-ticket': '客服工单',
              interview: '用户访谈',
              nps: 'NPS 开放题',
              community: '社区反馈',
            },
          },
          { pointer: '/rootCause', label: '根因', format: 'text' },
          { pointer: '/volume', label: '声量', format: 'number' },
          { pointer: '/severity', label: '严重度', format: 'enum', valueLabels: SEVERITY_LABELS },
          {
            pointer: '/status',
            label: '状态',
            format: 'status',
            valueLabels: { new: '新增', triaged: '已归类', out_of_coverage: '未覆盖·需补材料' },
          },
          { pointer: '/sourceAnchors', label: '溯源', format: 'anchor' },
        ],
      },
    },
    {
      typeId: 'pm.PrdReview',
      title: '需求文档评审',
      schemaId: 'pm.PrdReview',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/projectId', label: '项目' },
          { kind: 'field', path: '/documentId', label: '文档' },
          { kind: 'count', path: '/findings', label: '评审发现' },
          { kind: 'count', path: '/findings', label: '待确认', where: { field: 'status', equals: 'pending' } },
          { kind: 'list', path: '/findings', itemField: 'issue', label: '问题', limit: 3 },
        ],
        rowBudget: 6,
      },
      uiTemplateId: 'courtwork.artifact-table.v1',
      presentation: {
        collectionPointer: '/findings',
        fields: [
          { pointer: '/id', label: '编号', format: 'mono' },
          { pointer: '/section', label: '章节', format: 'mono' },
          { pointer: '/clause', label: '条款原文', format: 'text' },
          {
            pointer: '/defectType',
            label: '缺陷维度',
            format: 'enum',
            valueLabels: {
              'vague-metric': '模糊指标',
              'missing-acceptance': '缺验收标准',
              'undefined-boundary': '未定义边界',
              'missing-dependency': '依赖缺失',
              'conflicting-requirement': '冲突需求',
              untestable: '不可测表述',
            },
          },
          { pointer: '/severity', label: '严重度', format: 'enum', valueLabels: SEVERITY_LABELS },
          { pointer: '/issue', label: '问题', format: 'text' },
          { pointer: '/suggestion', label: '修改建议', format: 'text' },
          {
            pointer: '/status',
            label: '处置',
            format: 'status',
            valueLabels: { pending: '待确认', confirmed: '已确认', rejected: '已驳回' },
          },
          { pointer: '/sourceAnchors', label: '定位', format: 'anchor' },
        ],
      },
    },
    {
      typeId: 'pm.PriorityScore',
      title: '需求优先级',
      schemaId: 'pm.PriorityScore',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/projectId', label: '项目' },
          { kind: 'field', path: '/formula', label: '公式' },
          { kind: 'count', path: '/rows', label: '需求条目' },
          { kind: 'list', path: '/rows', itemField: 'item', label: '需求', limit: 3 },
        ],
        rowBudget: 5,
      },
      uiTemplateId: 'courtwork.artifact-table.v1',
      presentation: {
        collectionPointer: '/rows',
        fields: [
          { pointer: '/id', label: '编号', format: 'mono' },
          { pointer: '/item', label: '需求', format: 'text' },
          { pointer: '/params/reach', label: 'Reach', format: 'estimate', valueLabels: ESTIMATE_STATUS_LABELS },
          { pointer: '/params/reach/sourceAnchors', label: 'Reach 来源', format: 'anchor' },
          { pointer: '/params/impact', label: 'Impact', format: 'estimate', valueLabels: ESTIMATE_STATUS_LABELS },
          { pointer: '/params/impact/sourceAnchors', label: 'Impact 来源', format: 'anchor' },
          { pointer: '/params/confidence', label: 'Confidence', format: 'estimate', valueLabels: ESTIMATE_STATUS_LABELS },
          { pointer: '/params/confidence/sourceAnchors', label: 'Confidence 来源', format: 'anchor' },
          { pointer: '/params/effort', label: 'Effort', format: 'estimate', valueLabels: ESTIMATE_STATUS_LABELS },
          { pointer: '/params/effort/sourceAnchors', label: 'Effort 来源', format: 'anchor' },
          { pointer: '/score', label: '得分', format: 'estimate' },
          { pointer: '/rank', label: '排序建议', format: 'number' },
          {
            pointer: '/band',
            label: '分档',
            format: 'enum',
            valueLabels: { P0: '立即启动', P1: '本迭代', P2: '排队', P3: '暂搁' },
          },
        ],
      },
    },
    {
      typeId: 'pm.ActionItems',
      title: '纪要行动项',
      schemaId: 'pm.ActionItems',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/projectId', label: '项目' },
          { kind: 'count', path: '/items', label: '行动项' },
          { kind: 'count', path: '/items', label: '未闭环', where: { field: 'status', equals: 'open' } },
          { kind: 'list', path: '/items', itemField: 'action', label: '下一步', limit: 3 },
        ],
        rowBudget: 5,
      },
      uiTemplateId: 'courtwork.artifact-table.v1',
      presentation: {
        collectionPointer: '/items',
        fields: [
          { pointer: '/id', label: '编号', format: 'mono' },
          { pointer: '/action', label: '行动项', format: 'text' },
          { pointer: '/owner', label: '负责人', format: 'text' },
          { pointer: '/due', label: '截止日', format: 'mono' },
          {
            pointer: '/markers',
            label: '核对标记',
            format: 'tags',
            valueLabels: { unclosed: '未闭环', reassigned: '换负责人' },
          },
          {
            pointer: '/status',
            label: '状态',
            format: 'status',
            valueLabels: { open: '未闭环', done: '已完成', out_of_coverage: '未覆盖·需补材料' },
          },
          { pointer: '/sourceAnchors', label: '溯源', format: 'anchor' },
        ],
      },
    },
];

export const PM_RENDERERS: VerticalPackageDescriptorV1['renderers'] = [
    {
      uiTemplateId: 'courtwork.artifact-table.v1',
      kind: 'workspace',
      title: '通用产物表',
    },
];
