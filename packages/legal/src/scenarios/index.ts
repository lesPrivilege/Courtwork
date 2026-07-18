import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

const S3_CONTRACT_REVIEW_PROMPT = [
  '你正在执行「合同审查」场景。任务：通读卷宗中的合同文本，识别对委托方不利或存在法律风险的条款，逐项产出风险条目。',
  '',
  '审查要求：',
  '1. 每个风险条目给出：风险描述、等级、依据。',
  '2. 依据必须引用合同原文：给出文件、页码与逐字引语——引语必须与原文一字不差，系统将对原文精确匹配校验；给不出原文引语的判断不要写入。',
  '3. 等级标准：high＝可能直接造成重大经济损失或败诉风险；medium＝条款失衡但可协商修订；low＝表述瑕疵或合规提示。',
  '4. 只依据材料作答：材料中没有的事实不推断、不补写；材料不足以判断时，明确说出缺什么。',
  '5. dispositionStatus 一律填 pending——处置决定属于律师，不属于你。',
].join('\n');

const S1_CASE_INTAKE_PROMPT = [
  '你正在执行「卷宗阅卷」场景。任务：通读卷宗材料，登记文件清单，梳理案件事件时间线，构建当事人关系图谱。',
  '事件与关系必须逐项给出材料依据引语；日期不明确时用模糊日期形态如实标注，不编造精确日期。',
].join('\n');

const S2_MATRIX_REVIEW_PROMPT = [
  '你正在执行「矩阵审阅」场景。任务：按给定的审查问题清单逐文档作答，构成问题×文档矩阵。',
  '每格回答必须附材料依据引语与置信度；材料未覆盖的问题如实标注，不填补空白。',
].join('\n');

const S4_PLEADING_DRAFT_PROMPT = [
  '你正在执行「文书起草」场景。任务：基于已确认的卷宗、时间线与当事人图谱，起草文书修订指令集（含批注与依据引用）。',
  '每条修订指令必须携带定位引语与依据；法条引用给出法名与条号。产出是待确认草稿，定稿权属于律师。',
].join('\n');

const S6_FILE_OPS_PROMPT = [
  '你正在执行「卷宗整理」场景。任务：对未归类文件生成整理计划（移动/重命名/复制/建目录），逐项给出理由。',
  '计划是待确认清单：不执行任何操作，执行发生在用户确认之后、由确定性执行器完成。目标路径一律相对案件文件夹根。',
].join('\n');

export const LEGAL_SCENARIOS: VerticalPackageDescriptorV1['scenarios'] = [
    {
      id: 'legal.S1',
      name: '卷宗阅卷',
      trigger: {
        fileTypes: ['docx', 'md', 'txt', 'pdf', 'jpg', 'png'],
        userActions: ['upload-case-files'],
        classifierTags: [],
      },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['legal.CaseFile', 'legal.Timeline', 'legal.PartyGraph'],
      uiTemplateId: 'case-intake-panel',
      confirmationPolicy: {
        mode: 'gates',
        gates: [
          { artifact: 'legal.Timeline', label: '确认事件时间线后再据此生成其他产物' },
          { artifact: 'legal.PartyGraph', label: '确认当事人关系图谱' },
        ],
      },
      promptSegmentRef: 'case-intake',
      steps: [
        { id: 'intake-files', title: '登记卷宗清单', artifact: 'legal.CaseFile' },
        { id: 'build-timeline', title: '梳理事件时间线', artifact: 'legal.Timeline' },
        { id: 'build-party-graph', title: '构建当事人图谱', artifact: 'legal.PartyGraph' },
      ],
    },
    {
      id: 'legal.S2',
      name: '矩阵审阅',
      trigger: { fileTypes: [], userActions: ['start-matrix-review'], classifierTags: [] },
      inputArtifacts: ['legal.CaseFile'],
      toolIds: [],
      outputArtifacts: ['legal.ReviewMatrix'],
      uiTemplateId: 'matrix-review-panel',
      confirmationPolicy: {
        mode: 'gates',
        gates: [{ artifact: 'legal.ReviewMatrix', label: '确认矩阵审阅结果' }],
      },
      promptSegmentRef: 'matrix-review',
      steps: [{ id: 'produce-review-matrix', title: '生成矩阵审阅', artifact: 'legal.ReviewMatrix' }],
    },
    {
      id: 'legal.S3',
      name: '合同审查',
      trigger: {
        fileTypes: ['docx', 'pdf'],
        userActions: ['start-contract-review'],
        classifierTags: ['contract'],
      },
      inputArtifacts: ['legal.CaseFile'],
      toolIds: ['party-verify'],
      outputArtifacts: ['legal.RiskList'],
      uiTemplateId: 'risk-review-panel',
      confirmationPolicy: {
        mode: 'gates',
        gates: [{ artifact: 'legal.RiskList', label: '确认风险清单后再生成修订与批注文书' }],
      },
      promptSegmentRef: 'contract-review',
      steps: [
        { id: 'verify-parties', title: '核验合同主体' },
        { id: 'produce-risk-list', title: '产出风险清单', artifact: 'legal.RiskList' },
      ],
    },
    {
      id: 'legal.S4',
      name: '文书起草',
      trigger: { fileTypes: [], userActions: ['start-drafting'], classifierTags: [] },
      inputArtifacts: ['legal.CaseFile', 'legal.Timeline', 'legal.PartyGraph'],
      toolIds: [],
      outputArtifacts: ['legal.RevisionInstructionSet'],
      uiTemplateId: 'draft-review-panel',
      confirmationPolicy: {
        mode: 'gates',
        gates: [
          {
            artifact: 'legal.RevisionInstructionSet',
            label: '确认起诉状/答辩状草稿的修订指令集内容（含批注与依据引用）',
          },
        ],
      },
      promptSegmentRef: 'pleading-draft',
      steps: [{ id: 'draft-revision-set', title: '起草修订指令集', artifact: 'legal.RevisionInstructionSet' }],
    },
    {
      id: 'legal.S6',
      name: '卷宗整理',
      trigger: {
        fileTypes: ['pdf', 'docx', 'md', 'txt', 'jpg', 'png'],
        userActions: ['drop-unsorted-files', 'open-file-ops-scene'],
        classifierTags: [],
      },
      inputArtifacts: ['legal.CaseFile'],
      toolIds: ['copy-file', 'mkdir'],
      outputArtifacts: ['legal.FileOpsPlan'],
      uiTemplateId: 'file-ops-plan-panel',
      confirmationPolicy: {
        mode: 'gates',
        gates: [
          {
            artifact: 'legal.FileOpsPlan',
            label: '确认整理计划后再执行移形操作（单文件也需轻确认；大批量强制抽看）',
          },
        ],
      },
      promptSegmentRef: 'file-ops-organize',
      steps: [{ id: 'plan-file-ops', title: '生成整理计划', artifact: 'legal.FileOpsPlan' }],
    },
];

export const LEGAL_PROMPT_SEGMENTS: VerticalPackageDescriptorV1['promptSegments'] = [
    { id: 'case-intake', body: S1_CASE_INTAKE_PROMPT },
    { id: 'matrix-review', body: S2_MATRIX_REVIEW_PROMPT },
    { id: 'contract-review', body: S3_CONTRACT_REVIEW_PROMPT },
    { id: 'pleading-draft', body: S4_PLEADING_DRAFT_PROMPT },
    { id: 'file-ops-organize', body: S6_FILE_OPS_PROMPT },
];
