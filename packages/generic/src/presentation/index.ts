import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

/**
 * 基线包的呈现声明。两枚产物都走既有宿主 blueprint `courtwork.artifact-table.v1`——
 * ADR-023 决定六「不新增第二套 renderer 注册或命名空间机制」，故本包零新 uiTemplateId。
 *
 * 词表与标题承担**零垂类语义义务**（ADR-023 决定四），且该义务机器可验：
 * 见 `src/package/neutrality.test.ts`。
 */

const BATCH_STATUS_LABELS = {
  summarized: '已归纳',
  skipped: '已跳过',
  missing: '缺行·系统补记',
} as const;

export const GENERIC_ARTIFACTS: VerticalPackageDescriptorV1['artifacts'] = [
  {
    typeId: 'generic.DraftDocument',
    title: '起草文稿',
    schemaId: 'generic.DraftDocument',
    rehydrationProjection: {
      ops: [
        { kind: 'field', path: '/title', label: '标题' },
        { kind: 'count', path: '/paragraphs', label: '正文段落' },
      ],
      rowBudget: 2,
    },
    uiTemplateId: 'courtwork.artifact-table.v1',
    /**
     * 段落逐条成行：`collectionPointer` 命中字符串数组，字段 pointer 取空串即 item 根本身
     * （RFC 6901 的整文档指针）。文稿标题不入列——它是**整份产物的身份**而非某一行的字段，
     * 由 `descriptor.title` 与宿主「送入起草画布」动作面承载。
     */
    presentation: {
      collectionPointer: '/paragraphs',
      fields: [{ pointer: '', label: '正文段落', format: 'text' }],
    },
  },
  {
    typeId: 'generic.BatchReport',
    title: '批处理报告',
    schemaId: 'generic.BatchReport',
    rehydrationProjection: {
      ops: [
        { kind: 'count', path: '/items', label: '材料行' },
        { kind: 'count', path: '/items', label: '缺行', where: { field: 'status', equals: 'missing' } },
        { kind: 'list', path: '/items', itemField: 'materialId', label: '材料', limit: 3 },
      ],
      rowBudget: 4,
    },
    uiTemplateId: 'courtwork.artifact-table.v1',
    presentation: {
      collectionPointer: '/items',
      fields: [
        { pointer: '/materialId', label: '材料', format: 'mono' },
        { pointer: '/summary', label: '摘要', format: 'text' },
        { pointer: '/status', label: '状态', format: 'status', valueLabels: { ...BATCH_STATUS_LABELS } },
      ],
    },
    vocabulary: {
      enumLabels: { status: { ...BATCH_STATUS_LABELS } },
    },
  },
];

export const GENERIC_RENDERERS: VerticalPackageDescriptorV1['renderers'] = [
  { uiTemplateId: 'courtwork.artifact-table.v1', kind: 'workspace', title: '通用产物表' },
];
