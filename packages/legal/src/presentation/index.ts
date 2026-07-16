import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

export const LEGAL_ARTIFACTS: VerticalPackageDescriptorV1['artifacts'] = [
    {
      typeId: 'legal.CaseFile',
      title: '卷宗清单',
      schemaId: 'legal.CaseFile',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/files', label: '卷宗文件' },
          { kind: 'list', path: '/files', itemField: 'fileName', label: '文件', limit: 3 },
        ],
        rowBudget: 4,
      },
      uiTemplateId: 'case-intake-panel',
      vocabulary: {
        enumLabels: {
          ingestStatus: { pending: '待摄取', processing: '摄取中', done: '已完成', failed: '摄取失败', needs_ocr: '需文字识别' },
        },
      },
    },
    {
      typeId: 'legal.Timeline',
      title: '事件时间线',
      schemaId: 'legal.Timeline',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/events', label: '事件' },
          { kind: 'list', path: '/events', itemField: 'description', label: '近期事件', limit: 3 },
        ],
        rowBudget: 4,
      },
      uiTemplateId: 'timeline-panel',
    },
    {
      typeId: 'legal.PartyGraph',
      title: '当事人图谱',
      schemaId: 'legal.PartyGraph',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/nodes', label: '主体' },
          { kind: 'count', path: '/edges', label: '关系' },
          { kind: 'list', path: '/nodes', itemField: 'primaryName', label: '当事人', limit: 3 },
        ],
        rowBudget: 5,
      },
      uiTemplateId: 'party-graph-panel',
      vocabulary: {
        enumLabels: { kind: { individual: '自然人', organization: '机构' } },
      },
    },
    {
      typeId: 'legal.RiskList',
      title: '风险清单',
      schemaId: 'legal.RiskList',
      /** 引用闭环（拍板一）：模型侧草稿出引语，resolver 铸坐标；回填映射随包声明。 */
      draftSchemaId: 'legal.RiskListDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/risks',
        itemSummaryField: 'description',
        outOfCoverageField: 'outOfCoverage',
      },
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/risks', label: '风险点' },
          { kind: 'count', path: '/risks', label: '已确认', where: { field: 'dispositionStatus', equals: 'confirmed' } },
          { kind: 'count', path: '/risks', label: '待处置', where: { field: 'dispositionStatus', equals: 'pending' } },
          { kind: 'list', path: '/risks', itemField: 'description', label: '风险要点', limit: 3 },
        ],
        rowBudget: 6,
      },
      uiTemplateId: 'risk-review-panel',
      vocabulary: {
        enumLabels: {
          level: { high: '高', medium: '中', low: '低' },
          dispositionStatus: { pending: '待处置', confirmed: '已确认', rejected: '已驳回' },
        },
      },
    },
    {
      typeId: 'legal.ReviewMatrix',
      title: '矩阵审阅',
      schemaId: 'legal.ReviewMatrix',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/questions', label: '审查问题' },
          { kind: 'count', path: '/rows', label: '审查文档' },
        ],
        rowBudget: 3,
      },
      uiTemplateId: 'matrix-review-panel',
      vocabulary: {
        enumLabels: { confidence: { high: '高', medium: '中', low: '低' } },
      },
    },
    {
      typeId: 'legal.RevisionInstructionSet',
      title: '修订指令集',
      schemaId: 'legal.RevisionInstructionSet',
      /** 确认后编译为 docx 修订写入——文件级副作用，confirmationPolicy 不得为 none。 */
      sideEffect: 'file_write',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/instructions', label: '修订指令' },
        ],
        rowBudget: 3,
      },
      uiTemplateId: 'draft-review-panel',
    },
    {
      typeId: 'legal.FileOpsPlan',
      title: '整理计划',
      schemaId: 'legal.FileOpsPlan',
      /** 确认后由确定性执行器移形文件——文件级副作用。 */
      sideEffect: 'file_write',
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/entries', label: '整理操作' },
          { kind: 'count', path: '/entries', label: '已勾选', where: { field: 'selected', equals: true } },
        ],
        rowBudget: 3,
      },
      uiTemplateId: 'file-ops-plan-panel',
      vocabulary: {
        enumLabels: { verb: { move: '移动', rename: '重命名', copy: '复制', mkdir: '新建目录' } },
      },
    },
];

export const LEGAL_RENDERERS: VerticalPackageDescriptorV1['renderers'] = [
    { uiTemplateId: 'case-intake-panel', kind: 'workspace', title: '卷宗阅卷' },
    { uiTemplateId: 'timeline-panel', kind: 'workspace', title: '事件时间线' },
    { uiTemplateId: 'party-graph-panel', kind: 'workspace', title: '当事人图谱' },
    { uiTemplateId: 'risk-review-panel', kind: 'workspace', title: '风险审阅' },
    { uiTemplateId: 'matrix-review-panel', kind: 'workspace', title: '矩阵审阅' },
    { uiTemplateId: 'draft-review-panel', kind: 'document', title: '文书修订' },
    { uiTemplateId: 'file-ops-plan-panel', kind: 'workspace', title: '卷宗整理' },
];
