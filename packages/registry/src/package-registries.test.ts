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
        citationBinding: { draftField: 'quoteClaims', anchorField: 'sourceAnchors' },
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
    vocabulary: { 'container.noun': '卷宗', 'stage.noun': '阶段', 'material.noun': '卷宗材料' },
  };
}

describe('buildPackageRegistries（五 registry）', () => {
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
});
