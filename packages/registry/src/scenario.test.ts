import { describe, expect, it } from 'vitest';
import { ScenarioDefinitionSchema } from './scenario.js';

describe('ScenarioDefinitionSchema', () => {
  it('accepts a scenario with one output artifact and an artifact-tied gate', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S3',
      name: '合同审查',
      trigger: { fileTypes: ['docx', 'pdf'], userActions: [], classifierTags: [] },
      inputArtifacts: ['CaseFile'],
      toolIds: ['party-verify'],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'risk-review-panel',
      confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单后再生成修订文书' }],
      promptTemplateRef: 'S3-contract-review-v0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a scenario with multiple output artifacts and no input artifacts', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S1',
      name: '卷宗阅卷',
      trigger: { fileTypes: ['pdf', 'jpg', 'png'], userActions: ['upload-case-files'], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
      uiTemplateId: 'case-intake-panel',
      confirmationGates: [
        { artifact: 'Timeline', label: '确认时间线事件' },
        { artifact: 'PartyGraph', label: '确认当事人关系图谱' },
      ],
      promptTemplateRef: 'S1-case-intake-v0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a label-only confirmation gate with no artifact reference', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S4',
      name: '文书起草',
      trigger: { fileTypes: [], userActions: ['start-drafting'], classifierTags: [] },
      inputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
      toolIds: [],
      outputArtifacts: [],
      uiTemplateId: 'draft-review-panel',
      confirmationGates: [{ label: '确认起诉状/答辩状草稿内容' }],
      promptTemplateRef: 'S4-pleading-draft-v0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a trigger with all three dimensions empty', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-1',
      name: '无触发条件场景',
      trigger: { fileTypes: [], userActions: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an inputArtifacts entry that is not a known ArtifactType', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-2',
      name: '非法输入引用场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: ['ContradictionList'],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a confirmationGates artifact not present in outputArtifacts', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-3',
      name: '门禁引用越界场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ artifact: 'Timeline', label: '确认时间线' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty confirmationGates array', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-4',
      name: '无确认节点场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate toolIds', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-5',
      name: '工具重复场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: ['party-verify', 'party-verify'],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scenario missing uiTemplateId', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-6',
      name: '缺少 UI 模板场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown top-level key (W2.1: strict declaration loading)', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-7',
      name: '未知顶层字段场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
      priority: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown key nested inside trigger (W2.1)', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-8',
      name: '触发条件未知字段场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [], fileTyps: ['pdf'] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown key nested inside a confirmationGates entry (W2.1)', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-9',
      name: '确认门禁未知字段场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认', artfact: 'RiskList' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });
});
