import { describe, expect, it } from 'vitest';
import {
  InteractionTemplateSchema,
  PackageScenarioSchema,
  RendererDescriptorSchema,
  ScenarioIdSchema,
} from './package-manifest.js';

const VALID_SCENARIO = {
  id: 'legal.S3',
  name: '合同审查',
  trigger: { fileTypes: ['pdf'], userActions: ['start-contract-review'], classifierTags: ['contract'] },
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
    { id: 'produce-risklist', title: '产出风险清单', artifact: 'legal.RiskList' },
  ],
} as const;

describe('PackageScenarioSchema（ABI 场景声明 v2）', () => {
  it('namespaced id + confirmationPolicy + promptSegmentRef + 步骤树', () => {
    expect(PackageScenarioSchema.safeParse(VALID_SCENARIO).success).toBe(true);
  });

  it('场景 id 必须 namespaced（双命名空间，docs/decisions/ADR-002-schema-workflow.md）', () => {
    expect(ScenarioIdSchema.safeParse('S3').success).toBe(false);
    expect(ScenarioIdSchema.safeParse('legal.S3').success).toBe(true);
    expect(PackageScenarioSchema.safeParse({ ...VALID_SCENARIO, id: 'S3' }).success).toBe(false);
  });

  it('artifact 引用必须 namespaced', () => {
    expect(
      PackageScenarioSchema.safeParse({ ...VALID_SCENARIO, outputArtifacts: ['RiskList'] }).success,
    ).toBe(false);
  });

  it('gates 引用的 artifact 必须 ⊆ outputArtifacts（跨字段闭合）', () => {
    const bad = {
      ...VALID_SCENARIO,
      confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'legal.Timeline', label: 'x' }] },
    };
    expect(PackageScenarioSchema.safeParse(bad).success).toBe(false);
  });

  it('steps 的 artifact 引用必须 ⊆ outputArtifacts、id 唯一', () => {
    expect(
      PackageScenarioSchema.safeParse({
        ...VALID_SCENARIO,
        steps: [{ id: 'a', title: 'x', artifact: 'legal.Timeline' }],
      }).success,
    ).toBe(false);
    expect(
      PackageScenarioSchema.safeParse({
        ...VALID_SCENARIO,
        steps: [
          { id: 'a', title: 'x' },
          { id: 'a', title: 'y' },
        ],
      }).success,
    ).toBe(false);
  });

  it('steps 缺省合法（由注册期按 outputArtifacts 派生）', () => {
    const withoutSteps = { ...VALID_SCENARIO, steps: undefined };
    expect(PackageScenarioSchema.safeParse(withoutSteps).success).toBe(true);
  });

  it('none 策略在形状层合法（准入层再联判副作用）', () => {
    const withoutSteps = { ...VALID_SCENARIO, steps: undefined };
    expect(
      PackageScenarioSchema.safeParse({ ...withoutSteps, confirmationPolicy: { mode: 'none' } }).success,
    ).toBe(true);
  });
});

describe('RendererDescriptorSchema', () => {
  it('uiTemplateId + kind + title', () => {
    expect(
      RendererDescriptorSchema.safeParse({ uiTemplateId: 'risk-review-panel', kind: 'workspace', title: '风险审阅' }).success,
    ).toBe(true);
    expect(RendererDescriptorSchema.safeParse({ uiTemplateId: '', kind: 'workspace', title: 'x' }).success).toBe(false);
    expect(RendererDescriptorSchema.safeParse({ uiTemplateId: 'a', kind: 'popup', title: 'x' }).success).toBe(false);
  });
});

const VALID_INTERACTION_TEMPLATE = {
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
} as const;

describe('InteractionTemplateSchema（ADR-007 垂类受控交互模板）', () => {
  it('只接受 namespaced id、两种 kind、锚点政策与固定 question-card', () => {
    expect(InteractionTemplateSchema.safeParse(VALID_INTERACTION_TEMPLATE).success).toBe(true);
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, id: 'review-position' }).success,
    ).toBe(false);
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, kind: 'free_text' }).success,
    ).toBe(false);
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, anchorPolicy: 'runtime' }).success,
    ).toBe(false);
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, uiTemplateId: 'legal-card' }).success,
    ).toBe(false);
  });

  it('拒绝空选项与重复 option id', () => {
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, options: [] }).success,
    ).toBe(false);
    expect(
      InteractionTemplateSchema.safeParse({
        ...VALID_INTERACTION_TEMPLATE,
        options: [
          { id: 'buyer', label: '买方' },
          { id: 'buyer', label: '重复买方' },
        ],
      }).success,
    ).toBe(false);
  });

  it('顶层与 option 均 strict，运行时 anchor/bbox/textRange 不得混入模板', () => {
    expect(
      InteractionTemplateSchema.safeParse({ ...VALID_INTERACTION_TEMPLATE, anchorRefs: ['source-1'] }).success,
    ).toBe(false);
    expect(
      InteractionTemplateSchema.safeParse({
        ...VALID_INTERACTION_TEMPLATE,
        options: [{ id: 'buyer', label: '买方', bbox: [0, 0, 1, 1], textRange: [0, 8] }],
      }).success,
    ).toBe(false);
  });
});
