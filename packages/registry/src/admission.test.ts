import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { ResolvedSourceAnchorSchema, SourceAnchorSchema } from '@courtwork/schemas';
import type { VerticalPackageManifest } from './package-manifest.js';
import { admitPackages } from './admission.js';

type TestInteractionTemplate = {
  id: string;
  kind: string;
  question: string;
  options: Array<{ id: string; label: string; description?: string }>;
  skippable: boolean;
  anchorPolicy: string;
  uiTemplateId: string;
};

const VALID_INTERACTION_TEMPLATE: TestInteractionTemplate = {
  id: 'legal.review-position',
  kind: 'single_choice',
  question: '本次审查应以哪一方立场展开？',
  options: [
    { id: 'buyer', label: '买方' },
    { id: 'seller', label: '卖方' },
  ],
  skippable: false,
  anchorPolicy: 'none',
  uiTemplateId: 'question-card',
};

function withInteractionTemplates(
  manifest: VerticalPackageManifest,
  templates: TestInteractionTemplate[],
): VerticalPackageManifest {
  (manifest as unknown as { interactionTemplates?: TestInteractionTemplate[] }).interactionTemplates = templates;
  return manifest;
}

function makeManifest(overrides: Partial<VerticalPackageManifest> = {}): VerticalPackageManifest {
  return {
    abiVersion: 1,
    identity: { packageId: 'legal', version: '0.1.0', schemaVersion: 1 },
    artifacts: [
      {
        typeId: 'legal.RiskList',
        title: '风险清单',
        schemaId: 'legal.RiskList',
        rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '案件' }], rowBudget: 3 },
        uiTemplateId: 'risk-review-panel',
        vocabulary: { enumLabels: { level: { high: '高', medium: '中', low: '低' } } },
      },
      {
        typeId: 'legal.CaseFile',
        title: '卷宗清单',
        schemaId: 'legal.CaseFile',
        rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '案件' }], rowBudget: 2 },
        uiTemplateId: 'case-file-panel',
      },
    ],
    scenarios: [
      {
        id: 'legal.S3',
        name: '合同审查',
        trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
        inputArtifacts: ['legal.CaseFile'],
        toolIds: ['party-verify'],
        outputArtifacts: ['legal.RiskList'],
        uiTemplateId: 'risk-review-panel',
        confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'legal.RiskList', label: '确认风险清单' }] },
        promptSegmentRef: 'contract-review',
      },
    ],
    promptSegments: [{ id: 'contract-review', body: '你是合同审查执行器。只输出符合 schema 的 JSON。' }],
    renderers: [
      { uiTemplateId: 'risk-review-panel', kind: 'workspace', title: '风险审阅' },
      { uiTemplateId: 'case-file-panel', kind: 'workspace', title: '卷宗' },
    ],
    vocabulary: { 'container.noun': '卷宗', 'stage.noun': '阶段', 'material.noun': '卷宗材料' },
    bindings: {
      schemas: new Map([
        [
          'legal.RiskList',
          z.object({
            caseId: z.string(),
            risks: z.array(z.object({ level: z.enum(['high', 'medium', 'low']) })),
          }),
        ],
        ['legal.CaseFile', z.object({ caseId: z.string() })],
      ]),
    },
    ...overrides,
  };
}

type TestPresentation = {
  collectionPointer?: string;
  fields: Array<{
    pointer: string;
    label: string;
    format: string;
    valueLabels?: Record<string, string>;
  }>;
};

function setRiskPresentation(
  manifest: VerticalPackageManifest,
  presentation: TestPresentation,
): VerticalPackageManifest {
  (manifest.artifacts[0] as unknown as { presentation: TestPresentation }).presentation = presentation;
  return manifest;
}

const ESTIMATE_RANGE_SCHEMA = z.object({ low: z.number(), high: z.number() });
const ESTIMATE_STATUS_LABELS = { filled: '已填充', out_of_coverage: '未覆盖·需补材料' };

function makeEstimateManifest(
  estimateSchema: z.ZodType,
  valueLabels?: Record<string, string>,
): VerticalPackageManifest {
  const manifest = makeManifest();
  manifest.bindings = {
    schemas: new Map([
      [
        'legal.RiskList',
        z.object({
          caseId: z.string(),
          risks: z.array(z.object({ estimate: estimateSchema })),
        }),
      ],
      ['legal.CaseFile', z.object({ caseId: z.string() })],
    ]),
  };
  return setRiskPresentation(manifest, {
    collectionPointer: '/risks',
    fields: [{ pointer: '/estimate', label: '估值', format: 'estimate', ...(valueLabels ? { valueLabels } : {}) }],
  });
}

describe('admitPackages（PACKAGE-ABI 准入：引用闭合 + 同 id 拒载 + 词表完备性）', () => {
  it('合法包准入，零错误', () => {
    const result = admitPackages([makeManifest()]);
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it('合法 InteractionTemplate 随包准入', () => {
    const result = admitPackages([withInteractionTemplates(makeManifest(), [VALID_INTERACTION_TEMPLATE])]);
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it('非对象 interaction template 必须形成拒载结果而不是击穿准入边界', () => {
    const malformed = makeManifest();
    (malformed as unknown as { interactionTemplates: unknown[] }).interactionTemplates = [null];

    const result = admitPackages([malformed]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]!.issues.join()).toContain('interaction template');
  });

  it('非数组 interactionTemplates 必须形成拒载结果而不是击穿准入边界', () => {
    const malformed = makeManifest();
    (malformed as unknown as { interactionTemplates: unknown }).interactionTemplates = {};

    const result = admitPackages([malformed]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]!.issues.join()).toContain('interactionTemplates');
  });

  it('先到拒载包的 interaction template id 不占用后到合法包', () => {
    const rejected = withInteractionTemplates(makeManifest(), [VALID_INTERACTION_TEMPLATE]);
    rejected.vocabulary = { 'container.noun': '卷宗' };
    const valid = withInteractionTemplates(makeManifest(), [VALID_INTERACTION_TEMPLATE]);

    const result = admitPackages([rejected, valid]);

    expect(result.rejected.map((entry) => entry.packageId)).toEqual(['legal']);
    expect(result.admitted).toEqual([valid]);
    expect(result.rejected[0]!.issues.join()).not.toContain('跨包重复');
  });

  it('interaction template id 必须归本包命名空间', () => {
    const alien = { ...VALID_INTERACTION_TEMPLATE, id: 'pm.review-position' };
    const result = admitPackages([withInteractionTemplates(makeManifest(), [alien])]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('interaction template');
    expect(result.rejected[0]!.issues.join()).toContain('命名空间');
  });

  it('interaction template 空选项与重复 option id 均拒载', () => {
    const empty = admitPackages([
      withInteractionTemplates(makeManifest(), [{ ...VALID_INTERACTION_TEMPLATE, options: [] }]),
    ]);
    expect(empty.admitted).toEqual([]);
    expect(empty.rejected[0]!.issues.join()).toContain('options');

    const duplicate = admitPackages([
      withInteractionTemplates(makeManifest(), [
        {
          ...VALID_INTERACTION_TEMPLATE,
          options: [
            { id: 'same', label: '一' },
            { id: 'same', label: '二' },
          ],
        },
      ]),
    ]);
    expect(duplicate.admitted).toEqual([]);
    expect(duplicate.rejected[0]!.issues.join()).toContain('option id 必须唯一');
  });

  it('interaction template 非 question-card uiTemplateId 拒载', () => {
    const invalidUi = { ...VALID_INTERACTION_TEMPLATE, uiTemplateId: 'legal-question-card' };
    const result = admitPackages([withInteractionTemplates(makeManifest(), [invalidUi])]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('uiTemplateId');
  });

  it('launch formFields id 重复拒载（字段 id 是启动参数键，重复即静默覆盖）', () => {
    const manifest = makeManifest();
    manifest.scenarios[0] = {
      ...manifest.scenarios[0]!,
      launch: {
        label: '审查合同',
        tone: 'primary',
        kind: 'scenario',
        formFields: [
          { kind: 'select', id: 'primaryContractId', label: '主合同', source: 'ready-materials' },
          { kind: 'text', id: 'primaryContractId', label: '重复键', required: true },
        ],
      },
    };
    const result = admitPackages([manifest]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('form field id');
  });

  it('跨包重复 interaction template id 拒绝后到包，不污染先到包', () => {
    const first = withInteractionTemplates(makeManifest(), [VALID_INTERACTION_TEMPLATE]);
    first.artifacts = [];
    first.scenarios = [];
    first.promptSegments = [];
    first.renderers = [];
    first.bindings = { schemas: new Map() };

    const second = withInteractionTemplates(makeManifest(), [VALID_INTERACTION_TEMPLATE]);
    second.identity = { packageId: 'pm', version: '0.1.0', schemaVersion: 1 };
    second.artifacts = [];
    second.scenarios = [];
    second.promptSegments = [];
    second.renderers = [];
    second.bindings = { schemas: new Map() };

    const result = admitPackages([first, second]);
    expect(result.admitted.map((manifest) => manifest.identity.packageId)).toEqual(['legal']);
    expect(result.rejected[0]!.issues.join()).toContain('跨包重复');
  });

  it('同 packageId 拒载后到者，先到者存活', () => {
    const result = admitPackages([makeManifest(), makeManifest()]);
    expect(result.admitted).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]!.issues.join()).toContain('packageId');
  });

  it('命名空间所有权：descriptor typeId 不属本包即拒载', () => {
    const alien = makeManifest();
    alien.artifacts = [
      { ...alien.artifacts[0]!, typeId: 'pm.RiskList' },
      alien.artifacts[1]!,
    ];
    const result = admitPackages([alien]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('命名空间');
  });

  it('场景 outputArtifacts 引用未声明类型即拒载（引用闭合）', () => {
    const dangling = makeManifest();
    dangling.scenarios = [
      { ...dangling.scenarios[0]!, outputArtifacts: ['legal.Timeline'], confirmationPolicy: { mode: 'none' } },
    ];
    const result = admitPackages([dangling]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('legal.Timeline');
  });

  it('promptSegmentRef 未解析即拒载（模板引用加载期闭合）', () => {
    const dangling = makeManifest({ promptSegments: [] });
    const result = admitPackages([dangling]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('promptSegmentRef');
  });

  it('confirmationPolicy none + 副作用 artifact 即拒载（契约护栏，包无权放宽）', () => {
    const sneaky = makeManifest();
    sneaky.artifacts = [
      { ...sneaky.artifacts[0]!, sideEffect: 'file_write' },
      sneaky.artifacts[1]!,
    ];
    sneaky.scenarios = [{ ...sneaky.scenarios[0]!, confirmationPolicy: { mode: 'none' } }];
    const result = admitPackages([sneaky]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('none');
  });

  it('词表缺必备键即拒载（缺词=包 lint 错误非运行时惊吓）', () => {
    const wordless = makeManifest({ vocabulary: { 'container.noun': '卷宗' } });
    const result = admitPackages([wordless]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('stage.noun');
  });

  it('schema 内枚举字段缺 enumLabels 即拒载（零编码暴露律机器化）', () => {
    const bare = makeManifest();
    const withoutVocabulary = { ...bare.artifacts[0]! };
    delete withoutVocabulary.vocabulary;
    bare.artifacts = [
      withoutVocabulary,
      bare.artifacts[1]!,
    ];
    const result = admitPackages([bare]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('enumLabels');
  });

  it('presentation 以 RFC 6901 pointer 命中 collection/item，值词表成为该工作面的唯一显示权威', () => {
    const presented = makeManifest();
    delete presented.artifacts[0]!.vocabulary;
    setRiskPresentation(presented, {
      collectionPointer: '/risks',
      fields: [
        {
          pointer: '/level',
          label: '风险等级',
          format: 'enum',
          valueLabels: { high: '高', medium: '中', low: '低' },
        },
      ],
    });

    const result = admitPackages([presented]);

    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it.each([
    ['dot-path', 'level'],
    ['wildcard', '/*'],
    ['pointer drift', '/missing'],
  ])('presentation 拒绝 %s 字段路径且不把缺值显示为空', (_name, pointer) => {
    const invalid = setRiskPresentation(makeManifest(), {
      collectionPointer: '/risks',
      fields: [
        {
          pointer,
          label: '风险等级',
          format: 'enum',
          valueLabels: { high: '高', medium: '中', low: '低' },
        },
      ],
    });

    const result = admitPackages([invalid]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toMatch(/pointer|通配符|命中/);
  });

  it('enum/status/tags/grade 缺任一 valueLabels 值即拒载，禁止 wire fallback', () => {
    const incomplete = setRiskPresentation(makeManifest(), {
      collectionPointer: '/risks',
      fields: [
        {
          pointer: '/level',
          label: '风险等级',
          format: 'enum',
          valueLabels: { high: '高', medium: '中' },
        },
      ],
    });

    const result = admitPackages([incomplete]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('low');
    expect(result.rejected[0]!.issues.join()).toContain('valueLabels');
  });

  it('普通 presentation 字段不得携带无消费意义的 valueLabels', () => {
    const redundant = setRiskPresentation(makeManifest(), {
      collectionPointer: '/risks',
      fields: [
        {
          pointer: '/level',
          label: '风险等级',
          format: 'text',
          valueLabels: { high: '高' },
        },
      ],
    });

    const result = admitPackages([redundant]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('valueLabels');
  });

  it.each([
    ['finite number', z.number(), undefined],
    ['low-high range', ESTIMATE_RANGE_SCHEMA, undefined],
    ['number-or-range union', z.union([z.number(), ESTIMATE_RANGE_SCHEMA]), undefined],
    [
      'value/range/status envelope',
      z.object({
        value: z.number().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.enum(['filled', 'out_of_coverage']),
        note: z.string().optional(),
      }),
      ESTIMATE_STATUS_LABELS,
    ],
  ])('estimate 静态接受 %s', (_name, estimateSchema, labels) => {
    const result = admitPackages([makeEstimateManifest(estimateSchema, labels)]);
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it.each([
    ['string', z.string(), undefined],
    ['coerced number', z.coerce.number(), undefined],
    ['number with labels', z.number(), ESTIMATE_STATUS_LABELS],
    ['range with labels', ESTIMATE_RANGE_SCHEMA, ESTIMATE_STATUS_LABELS],
    [
      'envelope without labels',
      z.object({
        value: z.number().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.enum(['filled', 'out_of_coverage']),
      }),
      undefined,
    ],
    [
      'envelope incomplete labels',
      z.object({
        value: z.number().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.enum(['filled', 'out_of_coverage']),
      }),
      { filled: '已填充' },
    ],
    [
      'envelope contains extra label',
      z.object({
        value: z.number().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.enum(['filled', 'out_of_coverage']),
      }),
      { ...ESTIMATE_STATUS_LABELS, future: '未来状态' },
    ],
    [
      'envelope status is not enum',
      z.object({
        value: z.number().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.string(),
      }),
      ESTIMATE_STATUS_LABELS,
    ],
    [
      'envelope value is not nullable number',
      z.object({
        value: z.string().nullable(),
        range: ESTIMATE_RANGE_SCHEMA.nullable(),
        status: z.enum(['filled', 'out_of_coverage']),
      }),
      ESTIMATE_STATUS_LABELS,
    ],
    ['union includes unknown shape', z.union([z.number(), z.string()]), undefined],
  ])('estimate 非法静态形状逐包拒载：%s', (_name, estimateSchema, labels) => {
    const result = admitPackages([makeEstimateManifest(estimateSchema, labels)]);
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toMatch(/estimate|valueLabels|枚举/);
  });

  it('含 anchor presentation 的 artifact 未声明 draftSchemaId + citationBinding 时不得成为模型输出', () => {
    const unsafe = makeManifest();
    unsafe.bindings = {
      schemas: new Map([
        [
          'legal.RiskList',
          z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                level: z.enum(['high', 'medium', 'low']),
                sourceAnchors: z.array(z.object({ fileId: z.string() })),
              }),
            ),
          }),
        ],
        ['legal.CaseFile', z.object({ caseId: z.string() })],
      ]),
    };
    setRiskPresentation(unsafe, {
      collectionPointer: '/risks',
      fields: [{ pointer: '/sourceAnchors', label: '原文依据', format: 'anchor' }],
    });

    const result = admitPackages([unsafe]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toMatch(/draftSchemaId.*citationBinding|citationBinding.*draftSchemaId/);
  });

  it('含 anchor presentation 的模型输出在 final/draft 与 citation binding 独立闭合后可准入', () => {
    const safe = makeManifest();
    const finalSchema = z.object({
      caseId: z.string(),
      risks: z.array(
        z.object({
          description: z.string(),
          level: z.enum(['high', 'medium', 'low']),
          sourceAnchors: z.array(z.object({ fileId: z.string() })),
        }),
      ),
      outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
    });
    safe.artifacts[0] = {
      ...safe.artifacts[0]!,
      draftSchemaId: 'legal.RiskListDraft',
      citationBinding: {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/risks',
        itemSummaryField: 'description',
        outOfCoverageField: 'outOfCoverage',
      },
    };
    safe.bindings = {
      schemas: new Map([
        ['legal.RiskList', finalSchema],
        [
          'legal.RiskListDraft',
          z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                level: z.enum(['high', 'medium', 'low']),
                quoteClaims: z.array(z.object({ fileId: z.string(), exactQuote: z.string() })),
              }),
            ),
          }),
        ],
        ['legal.CaseFile', z.object({ caseId: z.string() })],
      ]),
    };
    setRiskPresentation(safe, {
      collectionPointer: '/risks',
      fields: [{ pointer: '/sourceAnchors', label: '原文依据', format: 'anchor' }],
    });

    const result = admitPackages([safe]);

    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it('uiTemplateId 未声明 renderer 仅记警告（渲染兜底是设计态，不是准入失败）', () => {
    const noRenderer = makeManifest({ renderers: [] });
    const result = admitPackages([noRenderer]);
    expect(result.admitted).toHaveLength(1);
    expect(result.warnings.join()).toContain('risk-review-panel');
  });

  it('一包拒载不传染他包', () => {
    const good = makeManifest();
    const bad = makeManifest({ promptSegments: [] });
    bad.identity = { ...bad.identity, packageId: 'pm' };
    bad.artifacts = [];
    bad.bindings = { schemas: new Map() };
    bad.scenarios = [
      {
        id: 'pm.S1',
        name: 'x',
        trigger: { fileTypes: ['md'], userActions: [], classifierTags: [] },
        inputArtifacts: [],
        toolIds: [],
        outputArtifacts: [],
        uiTemplateId: 'x-panel',
        confirmationPolicy: { mode: 'none' },
        promptSegmentRef: 'missing',
      },
    ];
    const result = admitPackages([good, bad]);
    expect(result.admitted.map((p) => p.identity.packageId)).toEqual(['legal']);
    expect(result.rejected.map((r) => r.packageId)).toEqual(['pm']);
    expect(result.warnings.join()).not.toContain('x-panel');
  });

  it('未知 abiVersion 显式拒载', () => {
    const future = makeManifest();
    (future as unknown as { abiVersion: number }).abiVersion = 2;

    const result = admitPackages([future]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('abiVersion');
  });

  it('schemaId 与 draftSchemaId 必须独立闭合到 bindings.schemas', () => {
    const missingFinal = makeManifest();
    missingFinal.bindings = { schemas: new Map([['legal.CaseFile', z.object({})]]) };
    expect(admitPackages([missingFinal]).rejected[0]!.issues.join()).toContain('legal.RiskList');

    const missingDraft = makeManifest();
    missingDraft.artifacts[0] = {
      ...missingDraft.artifacts[0]!,
      draftSchemaId: 'legal.RiskListDraft',
    };
    expect(admitPackages([missingDraft]).rejected[0]!.issues.join()).toContain('legal.RiskListDraft');
  });

  it('schema id 重复引用与越出包命名空间均拒载', () => {
    const duplicate = makeManifest();
    duplicate.artifacts[1] = { ...duplicate.artifacts[1]!, schemaId: 'legal.RiskList' };
    expect(admitPackages([duplicate]).rejected[0]!.issues.join()).toContain('schema id');

    const alien = makeManifest();
    alien.artifacts[0] = { ...alien.artifacts[0]!, schemaId: 'pm.RiskList' };
    alien.bindings = {
      schemas: new Map([...alien.bindings.schemas, ['pm.RiskList', z.object({})]]),
    };
    expect(admitPackages([alien]).rejected[0]!.issues.join()).toContain('schema id');
    expect(admitPackages([alien]).rejected[0]!.issues.join()).toContain('命名空间');
  });

  it('恶意 ReadonlyMap 迭代出重复 binding id 时也拒载，不依赖 Map 构造器去重', () => {
    const duplicateBinding = makeManifest();
    const riskSchema = duplicateBinding.bindings.schemas.get('legal.RiskList')!;
    const caseSchema = duplicateBinding.bindings.schemas.get('legal.CaseFile')!;
    duplicateBinding.bindings = {
      schemas: {
        *entries() {
          yield ['legal.RiskList', riskSchema] as [string, z.ZodType];
          yield ['legal.RiskList', riskSchema] as [string, z.ZodType];
          yield ['legal.CaseFile', caseSchema] as [string, z.ZodType];
        },
      } as unknown as ReadonlyMap<string, z.ZodType>,
    };

    const result = admitPackages([duplicateBinding]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toContain('binding schema id legal.RiskList 重复');
  });

  it('descriptor 递归拒绝 function、Zod 与 React-like 执行对象', () => {
    const executable = makeManifest();
    (executable.artifacts[0] as unknown as { schema: unknown }).schema = z.object({});
    (executable as unknown as { component: unknown }).component = () => null;
    (executable.artifacts[1] as unknown as { reactElement: unknown }).reactElement = {
      $$typeof: Symbol.for('react.element'),
      type: 'div',
    };

    const result = admitPackages([executable]);

    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]!.issues.join()).toMatch(/function|Zod|symbol|纯 JSON|未知/);
  });

  it('抛错 accessor 只拒载当前包，不执行或击穿后到合法包', () => {
    const trapped = makeManifest();
    Object.defineProperty(trapped, 'identity', {
      enumerable: true,
      get() {
        throw new Error('不应执行的 getter');
      },
    });
    const good = makeManifest();

    const result = admitPackages([trapped, good]);

    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]!.issues.join()).toContain('accessor');
    expect(result.admitted.map((item) => item.identity.packageId)).toEqual(['legal']);
  });

  describe('ADMISSION-ENUM-1：枚举收集 walker 扩宽（record/default 等不再静默跳过）', () => {
    /** artifacts[0] 换成仅携 level 词表的 RiskList，绑定 schema 由用例注入。 */
    function withBinding(schema: z.ZodType): VerticalPackageManifest {
      const manifest = makeManifest();
      manifest.bindings = {
        schemas: new Map([
          ['legal.RiskList', schema],
          ['legal.CaseFile', z.object({ caseId: z.string() })],
        ]),
      };
      return manifest;
    }

    it('z.record 内嵌枚举缺 enumLabels 必拒载（零编码暴露律机器化）', () => {
      const manifest = withBinding(
        z.object({
          caseId: z.string(),
          rows: z.array(
            z.object({
              answers: z.record(
                z.string(),
                z.object({ confidence: z.enum(['high', 'medium', 'low']) }),
              ),
            }),
          ),
        }),
      );

      const result = admitPackages([manifest]);

      expect(result.admitted).toEqual([]);
      expect(result.rejected[0]!.issues.join()).toContain('confidence');
      expect(result.rejected[0]!.issues.join()).toContain('enumLabels');
    });

    it('z.record 内嵌枚举携完整 enumLabels 照常准入', () => {
      const manifest = withBinding(
        z.object({
          caseId: z.string(),
          rows: z.array(
            z.object({
              answers: z.record(
                z.string(),
                z.object({ confidence: z.enum(['high', 'medium', 'low']) }),
              ),
            }),
          ),
        }),
      );
      manifest.artifacts[0] = {
        ...manifest.artifacts[0]!,
        vocabulary: { enumLabels: { confidence: { high: '高', medium: '中', low: '低' } } },
      };

      const result = admitPackages([manifest]);

      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it.each([
      ['直接包裹枚举', z.enum(['alpha', 'beta']).default('alpha')],
      ['包裹枚举数组', z.array(z.enum(['alpha', 'beta'])).default([])],
    ])('.default() %s 内嵌枚举缺 enumLabels 必拒载', (_name, fieldSchema) => {
      const manifest = withBinding(
        z.object({ caseId: z.string(), scope: fieldSchema as z.ZodTypeAny }),
      );

      const result = admitPackages([manifest]);

      expect(result.admitted).toEqual([]);
      expect(result.rejected[0]!.issues.join()).toContain('scope');
      expect(result.rejected[0]!.issues.join()).toContain('enumLabels');
    });

    it('未识别 zod 节点必拒载（fail-closed：合成节点注入，不得静默跳过）', () => {
      const manifest = withBinding(
        z.object({ caseId: z.string(), mapping: z.map(z.string(), z.enum(['x'])) }),
      );

      const result = admitPackages([manifest]);

      expect(result.admitted).toEqual([]);
      expect(result.rejected[0]!.issues.join()).toContain('ZodMap');
      expect(result.rejected[0]!.issues.join()).toMatch(/未识别|fail-closed|fail closed/);
    });

    it.each([
      ['z.email()', z.email()],
      ['z.uuid()', z.uuid()],
      ['z.url()', z.url()],
    ])('zod 格式类 %s 是标量叶子，不误判为未识别节点', (_name, fieldSchema) => {
      const manifest = withBinding(
        z.object({ caseId: z.string(), contact: fieldSchema as z.ZodTypeAny }),
      );

      const result = admitPackages([manifest]);

      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });
  });

  describe('ADMISSION-ENUM-1：citationBinding 五字段与 draft/final schema 对账', () => {
    /** 合法对账基准：draft item 声明 quoteClaims/description，final item 声明 sourceAnchors/description，final 根声明 outOfCoverage。 */
    function makeCitationManifest(overrides: {
      binding?: Partial<VerticalPackageManifest['artifacts'][number]['citationBinding']>;
      finalSchema?: z.ZodType;
      draftSchema?: z.ZodType;
    } = {}): VerticalPackageManifest {
      const manifest = makeManifest();
      const finalSchema =
        overrides.finalSchema ??
        z.object({
          caseId: z.string(),
          risks: z.array(
            z.object({
              description: z.string(),
              sourceAnchors: z.array(z.object({ fileId: z.string() })),
            }),
          ),
          outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
        });
      const draftSchema =
        overrides.draftSchema ??
        z.object({
          caseId: z.string(),
          risks: z.array(
            z.object({
              description: z.string(),
              quoteClaims: z.array(z.object({ fileId: z.string(), exactQuote: z.string() })),
            }),
          ),
        });
      manifest.bindings = {
        schemas: new Map([
          ['legal.RiskList', finalSchema],
          ['legal.RiskListDraft', draftSchema],
          ['legal.CaseFile', z.object({ caseId: z.string() })],
        ]),
      };
      const binding = {
        draftField: 'quoteClaims',
        anchorField: 'sourceAnchors',
        itemScope: '/risks',
        itemSummaryField: 'description',
        outOfCoverageField: 'outOfCoverage',
        ...overrides.binding,
      };
      manifest.artifacts[0] = {
        ...manifest.artifacts[0]!,
        draftSchemaId: 'legal.RiskListDraft',
        citationBinding: binding,
      };
      setRiskPresentation(manifest, {
        collectionPointer: '/risks',
        fields: [{ pointer: '/sourceAnchors', label: '原文依据', format: 'anchor' }],
      });
      return manifest;
    }

    it('五字段全部对账命中时准入', () => {
      const result = admitPackages([makeCitationManifest()]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it.each([
      ['outOfCoverageField 误名一字符', { outOfCoverageField: 'outOfCoveragee' }],
      ['anchorField 在 final item 不存在', { anchorField: 'sourceAnchorz' }],
      ['draftField 在 draft item 不存在', { draftField: 'quoteClaimz' }],
      ['itemSummaryField 在 draft item 不存在', { itemSummaryField: 'descriptio' }],
    ])('%s 必拒载', (_name, bindingPatch) => {
      const result = admitPackages([makeCitationManifest({ binding: bindingPatch })]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('citationBinding');
      expect(joined).toContain(Object.values(bindingPatch)[0]!);
    });

    it('itemScope 指向非数组（/caseId）必拒载', () => {
      const result = admitPackages([
        makeCitationManifest({ binding: { itemScope: '/caseId' } }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('itemScope');
      expect(joined).toContain('数组');
    });

    it('itemScope 深路径未命中草稿 schema 必拒载', () => {
      const result = admitPackages([
        makeCitationManifest({ binding: { itemScope: '/risks/0' } }),
      ]);
      expect(result.admitted).toEqual([]);
      expect(result.rejected[0]!.issues.join()).toContain('itemScope');
    });

    it('outOfCoverageField 只活在元素内层必拒载（必须是 final 根对象直接键）', () => {
      const result = admitPackages([
        makeCitationManifest({
          finalSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                sourceAnchors: z.array(z.object({ fileId: z.string() })),
                extra: z.object({ nestedOnlyKey: z.string() }),
              }),
            ),
            outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
          }),
          binding: { outOfCoverageField: 'nestedOnlyKey' },
        }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('outOfCoverageField');
      expect(joined).toContain('nestedOnlyKey');
    });

    it('anchorField 只活在数组元素内层必拒载（误拼撞深层同名键不得静默过门）', () => {
      const result = admitPackages([
        makeCitationManifest({
          finalSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                sourceAnchors: z.array(z.object({ fileId: z.string() })),
                meta: z.array(z.object({ deepAnchorKey: z.string() })),
              }),
            ),
            outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
          }),
          binding: { anchorField: 'deepAnchorKey' },
        }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('anchorField');
      expect(joined).toContain('deepAnchorKey');
    });

    it('draftField 只活在数组元素内层必拒载（误拼撞深层同名键不得静默过门）', () => {
      const result = admitPackages([
        makeCitationManifest({
          draftSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                basis: z.array(z.object({ citation: z.string(), deepDraftKey: z.string() })),
              }),
            ),
          }),
          binding: { draftField: 'deepDraftKey' },
        }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('draftField');
      expect(joined).toContain('deepDraftKey');
    });

    it('itemSummaryField 只活在数组元素内层必拒载（必须是草稿 item 根对象直接键）', () => {
      const result = admitPackages([
        makeCitationManifest({
          draftSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                quoteClaims: z.array(z.object({ fileId: z.string() })),
                sub: z.array(z.object({ deepSummaryKey: z.string() })),
              }),
            ),
          }),
          binding: { itemSummaryField: 'deepSummaryKey' },
        }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('itemSummaryField');
      expect(joined).toContain('deepSummaryKey');
    });

    it('draft 与 final 绑同一 schema 对象时五字段对账仍准入（visited 不得跨 collect 共享）', () => {
      const shared = z.object({
        caseId: z.string(),
        risks: z.array(
          z.object({
            description: z.string(),
            quoteClaims: z.array(z.object({ fileId: z.string() })),
            sourceAnchors: z.array(z.object({ fileId: z.string() })),
          }),
        ),
        outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
      });
      const result = admitPackages([
        makeCitationManifest({ finalSchema: shared, draftSchema: shared }),
      ]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it('anchorField 与 draftField 不在同一对象节点必拒载（位置轴：resolver 把锚写在 draftField 命中节点）', () => {
      const result = admitPackages([
        makeCitationManifest({
          draftSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                basis: z.array(
                  z.object({
                    citation: z.string(),
                    quoteClaims: z.array(z.object({ fileId: z.string(), exactQuote: z.string() })),
                  }),
                ),
              }),
            ),
          }),
          finalSchema: z.object({
            caseId: z.string(),
            risks: z.array(
              z.object({
                description: z.string(),
                topAnchors: z.array(z.object({ fileId: z.string() })),
                basis: z.array(
                  z.object({ citation: z.string(), sourceAnchors: z.array(z.object({ fileId: z.string() })).default([]) }),
                ),
              }),
            ),
            outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
          }),
          binding: { anchorField: 'topAnchors' },
        }),
      ]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('anchorField');
      expect(joined).toContain('topAnchors');
    });
  });

  /**
   * LEGAL-ANCHOR-BINDING-2（2026-08-09 裁定一）：引用闭环的准入判据上收。
   *
   * BINDING-1 上呈的连带事实：既有守卫只在 `presentation.fields.format==='anchor'` 时要求
   * 闭环，而走 `rehydrationProjection` 路径的 artifact（legal 全族）**结构上照不到**——
   * 一个携系统坐标却不声明闭环的模型输出可以从那条缝里过门。本节把判据改按
   * **最终 schema 的结构事实**收：凡最终 schema 里出现 `@courtwork/schemas` 的系统铸造锚
   * （`SYSTEM_MINTED_ANCHOR_TITLES`），该 artifact 作模型输出时必须声明闭环，与呈现声明无关。
   */
  describe('rehydrationProjection 路径的引用闭环上收（LEGAL-ANCHOR-BINDING-2）', () => {
    function makeRehydrationAnchorManifest(
      overrides: { closed?: boolean; anchorSchema?: z.ZodType } = {},
    ): VerticalPackageManifest {
      const manifest = makeManifest();
      const anchorSchema = overrides.anchorSchema ?? SourceAnchorSchema;
      manifest.bindings = {
        schemas: new Map<string, z.ZodType>([
          [
            'legal.RiskList',
            z.object({
              caseId: z.string(),
              risks: z.array(
                z.object({
                  description: z.string(),
                  level: z.enum(['high', 'medium', 'low']),
                  sourceAnchors: z.array(anchorSchema),
                }),
              ),
              outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
            }),
          ],
          [
            'legal.RiskListDraft',
            z.object({
              caseId: z.string(),
              risks: z.array(
                z.object({
                  description: z.string(),
                  level: z.enum(['high', 'medium', 'low']),
                  quoteClaims: z.array(z.object({ fileId: z.string(), exactQuote: z.string() })),
                }),
              ),
            }),
          ],
          ['legal.CaseFile', z.object({ caseId: z.string() })],
        ]),
      };
      if (overrides.closed === true) {
        manifest.artifacts[0] = {
          ...manifest.artifacts[0]!,
          draftSchemaId: 'legal.RiskListDraft',
          citationBinding: {
            draftField: 'quoteClaims',
            anchorField: 'sourceAnchors',
            itemScope: '/risks',
            itemSummaryField: 'description',
            outOfCoverageField: 'outOfCoverage',
          },
        };
      }
      // 关键：**不设** presentation——这正是 BINDING-1 上呈的那条结构性盲区。
      return manifest;
    }

    it('携系统铸造锚的模型输出走 rehydrationProjection 路径也必须声明闭环（旧守卫照不到的缝）', () => {
      const result = admitPackages([makeRehydrationAnchorManifest()]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toMatch(/draftSchemaId.*citationBinding|citationBinding.*draftSchemaId/);
      expect(joined).toContain('legal.RiskList');
    });

    it('自检：同一枚包补齐 draftSchemaId + citationBinding 后照常准入（拒载不是恒真）', () => {
      const result = admitPackages([makeRehydrationAnchorManifest({ closed: true })]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it('自检：判据认的是系统铸造锚本身——把锚换成不携该 title 的同形对象即不再触发', () => {
      // 如实登记的判据上界：包内自造的同形对象（无 meta title）不在轴上。它不构成
      // 静默洞——那样的对象不是 resolver 的写回目标，本就没有引用闭环契约可言；
      // 但准入层确实照不到它，此处以正向反例把这条边界钉住。
      const lookAlike = z.object({
        fileId: z.string(),
        textRange: z.object({ start: z.number(), end: z.number() }),
        quote: z.string(),
      });
      const result = admitPackages([makeRehydrationAnchorManifest({ anchorSchema: lookAlike })]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it('resolver 铸造的公证锚（ResolvedSourceAnchor）同族同判据', () => {
      const result = admitPackages([
        makeRehydrationAnchorManifest({ anchorSchema: ResolvedSourceAnchorSchema }),
      ]);
      expect(result.admitted).toEqual([]);
      expect(result.rejected[0]!.issues.join()).toMatch(/draftSchemaId|citationBinding/);
    });

    /**
     * 覆盖单元是判别联合时的 item 级判据（`legal.RevisionInstructionSet` 的四支修订指令）：
     * resolver 逐单元读的是运行时对象，任一分支都可能成为那个单元，故按**每一支都须满足**收。
     */
    function makeUnionItemManifest(overrides: { summaryOnEveryBranch: boolean }): VerticalPackageManifest {
      const manifest = makeManifest();
      const draftBranch = (kind: string, extra: Record<string, z.ZodType>) =>
        z.object({
          kind: z.literal(kind),
          quoteClaims: z.array(z.object({ fileId: z.string(), exactQuote: z.string() })),
          ...extra,
        });
      const finalBranch = (kind: string, extra: Record<string, z.ZodType>) =>
        z.object({
          kind: z.literal(kind),
          sourceAnchors: z.array(SourceAnchorSchema),
          ...extra,
        });
      const summary = { description: z.string() };
      manifest.bindings = {
        schemas: new Map<string, z.ZodType>([
          [
            'legal.RiskList',
            z.object({
              caseId: z.string(),
              risks: z.array(
                z.discriminatedUnion('kind', [finalBranch('note', summary), finalBranch('edit', summary)]),
              ),
              outOfCoverage: z.array(z.object({ summary: z.string() })).default([]),
            }),
          ],
          [
            'legal.RiskListDraft',
            z.object({
              caseId: z.string(),
              risks: z.array(
                z.discriminatedUnion('kind', [
                  draftBranch('note', summary),
                  draftBranch('edit', overrides.summaryOnEveryBranch ? summary : {}),
                ]),
              ),
            }),
          ],
          ['legal.CaseFile', z.object({ caseId: z.string() })],
        ]),
      };
      manifest.artifacts[0] = {
        ...manifest.artifacts[0]!,
        draftSchemaId: 'legal.RiskListDraft',
        citationBinding: {
          draftField: 'quoteClaims',
          anchorField: 'sourceAnchors',
          itemScope: '/risks',
          itemSummaryField: 'description',
          outOfCoverageField: 'outOfCoverage',
        },
        vocabulary: { enumLabels: {} },
      };
      return manifest;
    }

    it('覆盖单元是判别联合时准入（四支指令那一形：全分支皆对象且各自闭合）', () => {
      const result = admitPackages([makeUnionItemManifest({ summaryOnEveryBranch: true })]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });

    it('判别联合里只要一支缺 itemSummaryField 即拒载（缺口摘要会静默回落「(无摘要)」）', () => {
      const result = admitPackages([makeUnionItemManifest({ summaryOnEveryBranch: false })]);
      expect(result.admitted).toEqual([]);
      const joined = result.rejected[0]!.issues.join();
      expect(joined).toContain('itemSummaryField');
      expect(joined).toContain('description');
    });

    it('非模型输出的 artifact 携锚不受本判据约束（判据只管场景 outputArtifacts）', () => {
      const manifest = makeRehydrationAnchorManifest();
      // 把携锚的 RiskList 从模型输出改为输入：它不再是模型要出格的东西，闭环无从谈起。
      manifest.scenarios = [
        {
          ...manifest.scenarios[0]!,
          inputArtifacts: ['legal.RiskList'],
          outputArtifacts: ['legal.CaseFile'],
          confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'legal.CaseFile', label: '确认卷宗清单' }] },
        },
      ];
      const result = admitPackages([manifest]);
      expect(result.rejected).toEqual([]);
      expect(result.admitted).toHaveLength(1);
    });
  });

  it('成功准入返回与源对象脱钩的递归深冻结 descriptor', () => {
    const source = makeManifest();
    const admitted = admitPackages([source]).admitted[0]!;

    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.identity)).toBe(true);
    expect(Object.isFrozen(admitted.artifacts)).toBe(true);
    expect(Object.isFrozen(admitted.artifacts[0])).toBe(true);
    expect(Object.isFrozen(admitted.artifacts[0]!.rehydrationProjection.ops)).toBe(true);
    expect(() => {
      (admitted.artifacts[0] as { title: string }).title = '篡改';
    }).toThrow(TypeError);
    source.artifacts[0]!.title = '源对象后改';
    expect(admitted.artifacts[0]!.title).toBe('风险清单');
  });
});
