import type { Launch, VerticalPackageDescriptorV1 } from '@courtwork/registry';

/**
 * 基线场景声明（ADR-023 决定一/五）。两枚场景都属**场景线**：经声明式场景执行器与 Turn
 * Engine 运行，不借 ADR-022 pi 线的任何例外（决定六）。
 *
 * 声明段正文承担零垂类语义义务——用词只到「材料 / 文稿 / 段落 / 摘要」这一层，
 * 不出现任何领域词。机器判据见 `src/package/neutrality.test.ts`。
 */

const DRAFT_PROMPT = [
  '你正在执行「通用起草」场景。任务：按用户给出的起草要求，产出一份文稿。',
  '',
  '产出要求：',
  '1. 给出一个标题，和若干条正文段落；段落之间彼此独立成段，不要在段内塞入编号目录。',
  '2. 只依据用户给出的要求与已提供的材料作答：没有的事实不推断、不补写；信息不足以下笔时，明确说出缺什么。',
  '3. 这是待确认草稿——是否采用、如何改写、何时定稿，都属于用户。',
].join('\n');

const BATCH_PROMPT = [
  '你正在执行「多文件批处理」场景。任务：对系统给出的每一份材料各写一条摘要。',
  '',
  '产出要求：',
  '1. 材料清单由系统给定，逐份都有一个 materialId。只使用清单里的 materialId，不要自造、不要改写、不要合并。',
  '2. 每份材料恰写一行；同一份材料不要写两行。',
  '3. 能归纳的填 summarized 并给出摘要；确实无法处理的填 skipped，并在摘要位置如实说明原因。',
  '4. 摘要是纯文本转述，不要写引语、页码、字符区间一类的定位信息——那些字段在你的输出格式里不存在。',
].join('\n');

/** 场景①的预检表单（票面裁定 B1：launch 元素集不扩员，只用一枚 `text`）。 */
const DRAFT_LAUNCH: Launch = {
  label: '通用起草',
  tone: 'primary',
  kind: 'scenario',
  description: '说明你想要的文稿：写什么、给谁看、要几段、有哪些必须写到的点。产出是待确认草稿，可再送入起草画布继续编辑。',
  submitLabel: '开始起草',
  footnote: '本工作区已入库的材料会一并送入作为背景。',
  formFields: [
    {
      kind: 'text',
      id: 'requirement',
      label: '起草要求',
      required: true,
      placeholder: '例如：写一份三段的季度工作说明，交代进度、阻碍与下一步',
    },
  ],
};

/** 场景③：无预检直启（循 LEGAL-FIVE-FACES-1 无表单场景由场景条按钮直接起跑的路由）。 */
const BATCH_LAUNCH: Launch = {
  label: '多文件批处理',
  tone: 'wide',
  kind: 'scenario',
};

export const GENERIC_SCENARIOS: VerticalPackageDescriptorV1['scenarios'] = [
  {
    id: 'generic.draft',
    name: '通用起草',
    trigger: { fileTypes: [], userActions: ['start-generic-draft'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['generic.DraftDocument'],
    uiTemplateId: 'courtwork.artifact-table.v1',
    // 产出本身零副作用：留人确认发生在「送入起草画布」与既有 confirmDraftCompile 两处显式动作上，
    // 不在场景内另立一道门（多一道门只会让用户对同一件事确认两次）。
    confirmationPolicy: { mode: 'none' },
    promptSegmentRef: 'generic-draft',
    steps: [{ id: 'produce-draft', title: '产出文稿', artifact: 'generic.DraftDocument' }],
    launch: DRAFT_LAUNCH,
  },
  {
    id: 'generic.batch',
    name: '多文件批处理',
    trigger: { fileTypes: [], userActions: ['start-generic-batch'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['generic.BatchReport'],
    uiTemplateId: 'courtwork.artifact-table.v1',
    confirmationPolicy: { mode: 'none' },
    promptSegmentRef: 'generic-batch',
    steps: [{ id: 'produce-batch-report', title: '逐份归纳材料', artifact: 'generic.BatchReport' }],
    launch: BATCH_LAUNCH,
  },
];

export const GENERIC_PROMPT_SEGMENTS: VerticalPackageDescriptorV1['promptSegments'] = [
  { id: 'generic-draft', body: DRAFT_PROMPT },
  { id: 'generic-batch', body: BATCH_PROMPT },
];
