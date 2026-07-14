import { describe, expect, it } from 'vitest';
import * as z from 'zod';
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
