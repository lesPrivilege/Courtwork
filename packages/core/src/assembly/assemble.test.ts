import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { ArtifactSchemaRegistry, ProjectionRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { ArtifactDescriptor } from '@courtwork/schemas';
import { assembleScenarioRequest, buildEnvelopeSchema, type AssembleScenarioRequestInput } from './assemble.js';

const SCENARIO: ScenarioRuntime = {
  id: 'test.Single',
  packageId: 'test',
  name: '单产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['test.Risk'],
  uiTemplateId: 'test-panel',
  confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'test.Risk', label: '确认清单' }] },
  promptBody: '声明段正文。',
  steps: [{ id: 'produce-test.Risk', title: '产出清单', artifact: 'test.Risk' }],
};

const RISK_SCHEMA = z.object({ caseId: z.string() }).strict();

const DESCRIPTOR: ArtifactDescriptor = {
  typeId: 'test.Risk',
  title: '清单面板',
  schema: RISK_SCHEMA,
  rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '容器' }], rowBudget: 2 },
  uiTemplateId: 'test-panel',
};

const ARTIFACTS: ArtifactSchemaRegistry = {
  get: (typeId) => (typeId === 'test.Risk' ? { descriptor: DESCRIPTOR, packageId: 'test' } : undefined),
  normalizeTypeId: (v) => v,
  list: () => [],
};
const PROJECTIONS: ProjectionRegistry = { get: (typeId) => ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection };

function baseInput(): AssembleScenarioRequestInput {
  return {
    scenario: SCENARIO,
    stepId: 'produce-test.Risk',
    artifactType: 'test.Risk',
    modelSchema: RISK_SCHEMA,
    projection: { ledgerSeq: 2, artifacts: {}, pendingGateLabels: [] },
    materials: [{ fileId: 'contract.pdf', sha256: 'cafebabe', readingMarkdown: '第一条 材料正文。' }],
    taskInstruction: '{"task":"fill"}',
    todo: [{ stepId: 'produce-test.Risk', artifactType: 'test.Risk', label: '产出清单', status: 'pending' }],
    registries: { projections: PROJECTIONS, artifacts: ARTIFACTS },
  };
}

const GOLDEN_PATH = join(import.meta.dirname, '__golden__', 'assembled-request.golden.txt');

function renderWire(input: AssembleScenarioRequestInput): string {
  const { segments, request } = assembleScenarioRequest(input);
  return [
    '=== SEGMENTS（组装序） ===',
    ...segments.map((s) => `--- ${s.id} ---\n${s.body}`),
    '=== WIRE systemPrompt ===',
    request.systemPrompt ?? '(none)',
    '=== WIRE messages ===',
    ...request.messages.map((m) => `[${m.role}]\n${m.content}`),
    '',
  ].join('\n');
}

describe('六段组装器（byte-stable golden + 变异敏感）', () => {
  it('六段序恒定：契约→声明→租户→投影→会话与语料→视图映射', () => {
    const { segments } = assembleScenarioRequest(baseInput());
    expect(segments.map((s) => s.id)).toEqual([
      'contract',
      'declaration',
      'tenant',
      'projection',
      'session_corpus',
      'view_mapping',
    ]);
  });

  it('byte-stable：同输入两次组装逐字节相同', () => {
    expect(renderWire(baseInput())).toBe(renderWire(baseInput()));
  });

  it('PROJECTION-RESUME-1 稳定前缀：投影段携 pending 与否，前三段（契约/声明/租户）逐字节不变', () => {
    const withoutPending = assembleScenarioRequest(baseInput());
    const withPending = assembleScenarioRequest({
      ...baseInput(),
      projection: {
        ledgerSeq: 2,
        artifacts: {},
        pendingGateLabels: [],
        pending: {
          failedModelSteps: [{ stepId: 'produce-test.Risk', artifactType: 'test.Risk', attempt: 1, reason: 'timeout', retryable: true }],
          failedToolSteps: [],
          interruptedSteps: [],
        },
      },
    });
    for (const index of [0, 1, 2]) {
      expect(withPending.segments[index].body).toBe(withoutPending.segments[index].body);
      expect(withPending.segments[index].id).toBe(withoutPending.segments[index].id);
    }
    // 子节确实进了第四段（投影段）而非渗入前缀——变更只失效投影段及其后的缓存。
    expect(withPending.segments[3].body).toContain('■ 未产出/待执行');
    expect(withoutPending.segments[3].body).not.toContain('■ 未产出/待执行');
  });

  it('golden 对照（COURTWORK_UPDATE_GOLDEN=1 重铸；DIFF 即红）', () => {
    const rendered = renderWire(baseInput());
    if (process.env.COURTWORK_UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_PATH, rendered, 'utf-8');
    }
    const golden = readFileSync(GOLDEN_PATH, 'utf-8');
    expect(rendered).toBe(golden);
  });

  it('ref 字面值禁上 wire：wire 全文不得出现 promptSegmentRef 形态的引用串', () => {
    const wire = renderWire(baseInput());
    expect(wire).not.toContain('promptSegmentRef');
    expect(wire).not.toContain('-v0'); // 旧 ref 命名形态（S3-contract-review-v0 族）
  });

  it('段来源正交：改声明正文只动声明段；改材料只动会话段（切分切中真关节）', () => {
    const base = assembleScenarioRequest(baseInput());
    const promptChanged = assembleScenarioRequest({
      ...baseInput(),
      scenario: { ...SCENARIO, promptBody: '改过的正文。' },
    });
    const materialChanged = assembleScenarioRequest({
      ...baseInput(),
      materials: [{ fileId: 'contract.pdf', sha256: 'cafebabe', readingMarkdown: '第二条 换了材料。' }],
    });
    for (let i = 0; i < 6; i += 1) {
      const id = base.segments[i].id;
      const promptDiff = base.segments[i].body !== promptChanged.segments[i].body;
      const materialDiff = base.segments[i].body !== materialChanged.segments[i].body;
      expect(promptDiff, `promptBody 变更只许动 declaration，实际动了 ${id}`).toBe(id === 'declaration');
      expect(materialDiff, `材料变更只许动 session_corpus，实际动了 ${id}`).toBe(id === 'session_corpus');
    }
  });

  it('稳定前缀：账本推进（投影版本变化）不动前三段字节', () => {
    const base = assembleScenarioRequest(baseInput());
    const advanced = assembleScenarioRequest({
      ...baseInput(),
      projection: { ledgerSeq: 9, artifacts: { 'test.Risk': { caseId: 'c1' } }, pendingGateLabels: [] },
    });
    for (const id of ['contract', 'declaration', 'tenant'] as const) {
      const a = base.segments.find((s) => s.id === id)!.body;
      const b = advanced.segments.find((s) => s.id === id)!.body;
      expect(a).toBe(b);
    }
    expect(base.segments[3].body).not.toBe(advanced.segments[3].body);
  });
});

describe('寻址信封 schema（按址收货）', () => {
  const schema = buildEnvelopeSchema('produce-test.Risk', 'test.Risk', RISK_SCHEMA);

  it('正确地址 + 合法 artifact 通过', () => {
    expect(
      schema.safeParse({ target: { stepId: 'produce-test.Risk', artifactType: 'test.Risk' }, artifact: { caseId: 'c1' } })
        .success,
    ).toBe(true);
  });

  it('错步/错类型/裸 artifact/多余键全部拒收', () => {
    expect(schema.safeParse({ target: { stepId: 'x', artifactType: 'test.Risk' }, artifact: { caseId: 'c1' } }).success).toBe(false);
    expect(schema.safeParse({ target: { stepId: 'produce-test.Risk', artifactType: 'test.Doc' }, artifact: { caseId: 'c1' } }).success).toBe(false);
    expect(schema.safeParse({ caseId: 'c1' }).success).toBe(false);
    expect(
      schema.safeParse({
        target: { stepId: 'produce-test.Risk', artifactType: 'test.Risk' },
        artifact: { caseId: 'c1' },
        extra: 1,
      }).success,
    ).toBe(false);
  });
});
