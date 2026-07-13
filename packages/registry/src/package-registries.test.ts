import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { VerticalPackageManifest } from './package-manifest.js';
import { admitPackages } from './admission.js';
import { buildPackageRegistries, NEUTRAL_VOCABULARY } from './package-registries.js';

function manifest(): VerticalPackageManifest {
  return {
    identity: { packageId: 'legal', version: '0.1.0', schemaVersion: 1, legacyTypeAliases: { RiskList: 'legal.RiskList' } },
    artifacts: [
      {
        typeId: 'legal.RiskList',
        title: '风险清单',
        schema: z.object({ caseId: z.string() }),
        draftSchema: z.object({ caseId: z.string(), quoteClaims: z.array(z.unknown()) }),
        citationBinding: {
          draftField: 'quoteClaims',
          anchorField: 'sourceAnchors',
          itemScope: '/risks',
          itemSummaryField: 'description',
          outOfCoverageField: 'outOfCoverage',
        },
        rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '案件' }], rowBudget: 3 },
        uiTemplateId: 'risk-review-panel',
      },
    ],
    scenarios: [
      {
        id: 'legal.S3',
        name: '合同审查',
        trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
        inputArtifacts: [],
        toolIds: [],
        outputArtifacts: ['legal.RiskList'],
        uiTemplateId: 'risk-review-panel',
        confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'legal.RiskList', label: '确认' }] },
        promptSegmentRef: 'contract-review',
      },
    ],
    promptSegments: [{ id: 'contract-review', body: '审查执行正文。' }],
    renderers: [{ uiTemplateId: 'risk-review-panel', kind: 'workspace', title: '风险审阅' }],
    interactionTemplates: [
      {
        id: 'legal.review-position',
        kind: 'single_choice',
        question: '本次审查应以哪一方立场展开？',
        options: [
          { id: 'buyer', label: '买方', description: '以买方风险与履约目标为审查基准' },
          { id: 'seller', label: '卖方' },
        ],
        skippable: false,
        anchorPolicy: 'none',
        uiTemplateId: 'question-card',
      },
    ],
    vocabulary: { 'container.noun': '卷宗', 'stage.noun': '阶段', 'material.noun': '卷宗材料' },
  };
}

describe('buildPackageRegistries（包运行时 registries）', () => {
  const { admitted } = admitPackages([manifest()]);
  const registries = buildPackageRegistries(admitted);

  it('① artifact schema registry：typeId → descriptor（注入式，F-4 穷尽性由准入闭合接位）', () => {
    const entry = registries.artifactSchemas.get('legal.RiskList');
    expect(entry?.descriptor.title).toBe('风险清单');
    expect(registries.artifactSchemas.get('legal.Nope')).toBeUndefined();
  });

  it('② scenario registry：promptSegmentRef 已闭合为正文，ref 字面值不出 runtime 形状', () => {
    const runtime = registries.scenarios.get('legal.S3');
    expect(runtime?.promptBody).toBe('审查执行正文。');
    expect(runtime && 'promptSegmentRef' in runtime).toBe(false);
  });

  it('② scenario steps 缺省派生：每个 output artifact 一步，步 id 确定性', () => {
    const runtime = registries.scenarios.get('legal.S3');
    expect(runtime?.steps).toEqual([
      { id: 'produce-legal.RiskList', title: '产出风险清单', artifact: 'legal.RiskList' },
    ]);
  });

  it('③ renderer registry：uiTemplateId → descriptor；未声明返回 undefined（渲染兜底接手）', () => {
    expect(registries.renderers.get('risk-review-panel')?.kind).toBe('workspace');
    expect(registries.renderers.get('ghost-panel')).toBeUndefined();
  });

  it('④ projection registry：typeId → 投影声明', () => {
    expect(registries.projections.get('legal.RiskList')?.rowBudget).toBe(3);
  });

  it('⑤ vocabulary registry：包词优先，缺词落底座中性话（永不留空）', () => {
    expect(registries.vocabulary.lookup('legal', 'container.noun')).toBe('卷宗');
    expect(registries.vocabulary.lookup('pm', 'container.noun')).toBe(NEUTRAL_VOCABULARY['container.noun']);
    expect(registries.vocabulary.lookup('legal', 'nonexistent.key')).toBe('');
  });

  it('legacy 别名归一入口：旧账本类型名 → namespaced', () => {
    expect(registries.artifactSchemas.normalizeTypeId('RiskList')).toBe('legal.RiskList');
    expect(registries.artifactSchemas.normalizeTypeId('legal.RiskList')).toBe('legal.RiskList');
    expect(registries.artifactSchemas.normalizeTypeId('Ghost')).toBeUndefined();
  });

  it('场景 id 跨包唯一（同 id 拒载在准入层，此处防御性复核）', () => {
    expect(registries.scenarios.list().map((s) => s.id)).toEqual(['legal.S3']);
  });

  it('interaction template registry 必须同时按 packageId + namespaced templateId 查询', () => {
    expect(
      registries.interactionTemplates.get('legal', 'legal.review-position')?.question,
    ).toBe('本次审查应以哪一方立场展开？');
    expect(registries.interactionTemplates.get('pm', 'legal.review-position')).toBeUndefined();
    expect(registries.interactionTemplates.get('legal', 'legal.missing')).toBeUndefined();
  });

  it('interaction template 查询返回与 manifest 脱钩的深冻结只读快照', () => {
    const source = manifest();
    const local = buildPackageRegistries(admitPackages([source]).admitted);
    const snapshot = local.interactionTemplates.get('legal', 'legal.review-position')!;
    const sourceTemplate = source.interactionTemplates![0]!;

    expect(snapshot).not.toBe(sourceTemplate);
    expect(snapshot.options).not.toBe(sourceTemplate.options);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.options)).toBe(true);
    expect(Object.isFrozen(snapshot.options[0])).toBe(true);

    expect(() => {
      (snapshot as { question: string }).question = '调用方篡改';
    }).toThrow(TypeError);
    expect(() => {
      (snapshot.options[0] as { label: string }).label = '调用方篡改';
    }).toThrow(TypeError);
    sourceTemplate.question = 'manifest 后改';
    sourceTemplate.options[0]!.label = 'manifest 后改';

    expect(local.interactionTemplates.get('legal', 'legal.review-position')).toEqual({
      id: 'legal.review-position',
      kind: 'single_choice',
      question: '本次审查应以哪一方立场展开？',
      options: [
        { id: 'buyer', label: '买方', description: '以买方风险与履约目标为审查基准' },
        { id: 'seller', label: '卖方' },
      ],
      skippable: false,
      anchorPolicy: 'none',
      uiTemplateId: 'question-card',
    });
  });
});
