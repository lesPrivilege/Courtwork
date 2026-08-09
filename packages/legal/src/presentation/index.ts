import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

/**
 * 缺口表 `failures[].reason` 的引语拒收理由词条（`CitationFailureReasonEnum`，`@courtwork/schemas`）。
 * 凡声明 `citationBinding` 的 artifact 都会因缺口表带上这枚 wire 枚举——零编码暴露律要求它经词表映射。
 * 逐处 spread 而非共享引用：descriptor 是可序列化声明面，不在包内制造跨条目的对象别名。
 */
const CITATION_FAILURE_REASON_LABELS = {
  not_found: '未命中',
  ambiguous: '多义命中',
  file_unavailable: '文件不可达',
} as const;

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
      /**
       * 引用闭环（LEGAL-ANCHOR-BINDING-1 · LEGAL-FIVE-FACES-1 D10 裁定）：模型出 `quoteClaims`、
       * citation resolver 铸 `sourceAnchors`。覆盖单元＝事件；不收敛的事件移入 `outOfCoverage`。
       */
      draftSchemaId: 'legal.TimelineDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/events',
        itemSummaryField: 'description',
        outOfCoverageField: 'outOfCoverage',
      },
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/events', label: '事件' },
          { kind: 'list', path: '/events', itemField: 'description', label: '近期事件', limit: 3 },
        ],
        rowBudget: 4,
      },
      uiTemplateId: 'courtwork.timeline.v1',
      vocabulary: {
        enumLabels: { reason: { ...CITATION_FAILURE_REASON_LABELS } },
      },
    },
    {
      typeId: 'legal.PartyGraph',
      title: '当事人图谱',
      schemaId: 'legal.PartyGraph',
      /** 引用闭环：覆盖单元＝关系边（节点不携锚）；不收敛的边移入 `outOfCoverage`。 */
      draftSchemaId: 'legal.PartyGraphDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/edges',
        itemSummaryField: 'relationType',
        outOfCoverageField: 'outOfCoverage',
      },
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/nodes', label: '主体' },
          { kind: 'count', path: '/edges', label: '关系' },
          { kind: 'list', path: '/nodes', itemField: 'primaryName', label: '当事人', limit: 3 },
        ],
        rowBudget: 5,
      },
      uiTemplateId: 'courtwork.party-graph.v1',
      vocabulary: {
        enumLabels: {
          kind: { individual: '自然人', organization: '机构' },
          reason: { ...CITATION_FAILURE_REASON_LABELS },
        },
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
      uiTemplateId: 'courtwork.risk-review.v1',
      vocabulary: {
        enumLabels: {
          level: { high: '高', medium: '中', low: '低' },
          dispositionStatus: { pending: '待处置', confirmed: '已确认', rejected: '已驳回' },
          /**
           * ADMISSION-ENUM-1 受控外溢：缺口表 failures[].reason 的引语拒收理由枚举
           * （not_found/ambiguous/file_unavailable，@courtwork/schemas CitationFailureReasonEnum）
           * 经 walker 补 ZodDefault 后首次被准入发现——wire 枚举必须经词表映射。
           */
          reason: { ...CITATION_FAILURE_REASON_LABELS },
        },
      },
    },
    {
      typeId: 'legal.ReviewMatrix',
      title: '矩阵审阅',
      schemaId: 'legal.ReviewMatrix',
      /** 引用闭环：覆盖单元＝行（一份文书整行作答）；行内任一格不收敛即整行移入 `outOfCoverage`。 */
      draftSchemaId: 'legal.ReviewMatrixDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/rows',
        itemSummaryField: 'documentId',
        outOfCoverageField: 'outOfCoverage',
      },
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/questions', label: '审查问题' },
          { kind: 'count', path: '/rows', label: '审查文档' },
        ],
        rowBudget: 3,
      },
      uiTemplateId: 'courtwork.review-matrix.v1',
      vocabulary: {
        enumLabels: {
          confidence: { high: '高', medium: '中', low: '低' },
          reason: { ...CITATION_FAILURE_REASON_LABELS },
        },
      },
    },
    {
      typeId: 'legal.RevisionInstructionSet',
      title: '修订指令集',
      schemaId: 'legal.RevisionInstructionSet',
      /** 确认后编译为 docx 修订写入——文件级副作用，confirmationPolicy 不得为 none。 */
      sideEffect: 'file_write',
      /**
       * 引用闭环（LEGAL-ANCHOR-BINDING-2 · 2026-08-09 裁定一）：模型出 `quoteClaims`、
       * citation resolver 铸 `sourceAnchors`。覆盖单元＝修订指令；指令内任一依据引语不收敛，
       * 整条指令移入 `outOfCoverage`——半条指令（改了字却丢了依据）比缺一条更危险。
       * 摘要取 `id`：四支指令（replace/insert/delete/commentOnly）的共有标量键之一（共有标量键为 id/kind，另有共有对象键 locator/annotation；取 id 因其为身份键，2026-08-10 验收订正），
       * `text` 只在两支上有、`locator` 是对象（String() 会落 [object Object]）。
       */
      draftSchemaId: 'legal.RevisionInstructionSetDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/instructions',
        itemSummaryField: 'id',
        outOfCoverageField: 'outOfCoverage',
      },
      rehydrationProjection: {
        ops: [
          { kind: 'field', path: '/caseId', label: '案件' },
          { kind: 'count', path: '/instructions', label: '修订指令' },
        ],
        rowBudget: 3,
      },
      uiTemplateId: 'draft-review-panel',
      vocabulary: {
        enumLabels: { reason: { ...CITATION_FAILURE_REASON_LABELS } },
      },
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
    { uiTemplateId: 'courtwork.timeline.v1', kind: 'workspace', title: '事件时间线' },
    { uiTemplateId: 'courtwork.party-graph.v1', kind: 'workspace', title: '当事人图谱' },
    { uiTemplateId: 'courtwork.risk-review.v1', kind: 'workspace', title: '风险审阅' },
    { uiTemplateId: 'courtwork.review-matrix.v1', kind: 'workspace', title: '矩阵审阅' },
    { uiTemplateId: 'draft-review-panel', kind: 'document', title: '文书修订' },
    { uiTemplateId: 'file-ops-plan-panel', kind: 'workspace', title: '卷宗整理' },
];
