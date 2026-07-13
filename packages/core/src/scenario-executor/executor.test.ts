import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as z from 'zod';
import type { ArtifactSchemaRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { ArtifactDescriptor } from '@courtwork/schemas';
import { RevisionEventSchema } from '@courtwork/schemas';
import { createMockPartyVerifyAdapter, createPartyVerifyTool, createQccPartyVerifyAdapter, createToolExecutor } from '@courtwork/tools';
import { createEventLog, createFileEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createFileConfirmationStore, createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '@courtwork/provider/scripted';
import type { GenerationResponse } from '@courtwork/provider/types';
import { RuntimeLimitExceededError } from './runtime-limits.js';
import {
  GenerationValidationError,
  resumeScenario,
  runScenario,
  UnknownConfirmationRequestError,
  UnknownToolError,
  type ScenarioExecutorDeps,
} from './executor.js';

// 迁 ABI 后 core 域盲：执行器测试全部使用合成 test.* 类型与注入式 registry——
// 法律语义不再是夹具来源，这本身就是"跑得动包、读不懂包"的自证。
const TEST_RISK_SCHEMA = z.object({
  caseId: z.string().min(1),
  risks: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(1),
      level: z.enum(['high', 'medium', 'low']),
      basis: z.array(z.object({ citation: z.string().min(1), sourceAnchors: z.array(z.unknown()).min(1) })).min(1),
      dispositionStatus: z.enum(['pending', 'confirmed', 'rejected']),
    }),
  ),
});
const TEST_DOC_SCHEMA = z.object({ caseId: z.string().min(1), files: z.array(z.unknown()) });
const TEST_ALPHA_SCHEMA = z.object({ caseId: z.string().min(1), events: z.array(z.unknown()) });
const TEST_BETA_SCHEMA = z.object({ caseId: z.string().min(1), nodes: z.array(z.unknown()), edges: z.array(z.unknown()) });

function testDescriptor(typeId: string, schema: z.ZodTypeAny): ArtifactDescriptor {
  return {
    typeId,
    title: typeId,
    schema,
    rehydrationProjection: { ops: [{ kind: 'field', path: '/caseId', label: '案件' }], rowBudget: 2 },
    uiTemplateId: 'test-panel',
  };
}

const TEST_ARTIFACTS: ArtifactSchemaRegistry = (() => {
  const entries = new Map<string, { descriptor: ArtifactDescriptor; packageId: string }>(
    (
      [
        ['test.Risk', TEST_RISK_SCHEMA],
        ['test.Doc', TEST_DOC_SCHEMA],
        ['test.Alpha', TEST_ALPHA_SCHEMA],
        ['test.Beta', TEST_BETA_SCHEMA],
      ] as [string, z.ZodTypeAny][]
    ).map(([typeId, schema]) => [typeId, { descriptor: testDescriptor(typeId, schema), packageId: 'test' }]),
  );
  return {
    get: (typeId: string) => entries.get(typeId),
    normalizeTypeId: (value: string) => (entries.has(value) ? value : undefined),
    list: () => [...entries.values()],
  };
})();

const SINGLE_GATE_SCENARIO: ScenarioRuntime = {
  id: 'test.Single',
  packageId: 'test',
  name: '单产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: ['test.Doc'],
  toolIds: ['party-verify'],
  outputArtifacts: ['test.Risk'],
  uiTemplateId: 'test-panel',
  confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'test.Risk', label: '确认风险清单' }] },
  promptBody: '测试声明段正文',
  steps: [{ id: 'produce-test.Risk', title: '产出 test.Risk', artifact: 'test.Risk' }],
};

const VALID_RISK_LIST = {
  caseId: 'c1',
  risks: [
    {
      id: 'risk-01',
      description: 'x',
      level: 'low',
      basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f1', textRange: { start: 0, end: 1 } }] }],
      dispositionStatus: 'pending',
    },
  ],
};

/** 寻址信封（四知·知输出）：脚本响应按址交货，与真管线过同一道校验门。 */
function envelope(stepId: string, artifactType: string, artifact: unknown): string {
  return JSON.stringify({ target: { stepId, artifactType }, artifact });
}

function buildDeps(providerScript: GenerationResponse[]): ScenarioExecutorDeps {
  const tools = createToolRegistry();
  tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
  return {
    tools,
    toolExecutor: createToolExecutor(),
    provider: createScriptedProvider('test-provider', 'fake-v1', providerScript),
    eventLog: createEventLog('session-1', () => '2026-07-10T00:00:00.000Z'),
    confirmationStore: createInMemoryConfirmationStore(),
    revisionStore: createInMemoryRevisionEventStore(),
    ledger: createEvidenceLedger(),
    artifacts: TEST_ARTIFACTS,
    projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
  };
}

describe('runScenario', () => {
  it('runs the declared tool, records its evidence grade, generates the sole output artifact, and pauses at its gate', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const result = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(result).toEqual({ status: 'paused', sessionId: 'session-1', requestId: expect.any(String) });
    expect(deps.ledger.get('party-verify')).toEqual({ grade: 'A', sourceId: 'mock', confirmed: false });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'todo_snapshot', 'confirmation_requested']);
    expect(events[0]).toMatchObject({ type: 'artifact_produced', artifactType: 'test.Risk', artifact: VALID_RISK_LIST });
    expect(events[0]).toMatchObject({ evidenceGrades: [{ key: 'party-verify', grade: 'A', sourceId: 'mock', confirmed: false }] });
  });

  it('publishes provider compatibility notices with artifact_produced so a downgrade cannot stay silent', async () => {
    const deps = buildDeps([{
      content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST),
      notices: [{
        code: 'reasoning_downgraded_for_structured_output',
        message: '结构化输出已使用标准模式',
        requested: 'deep',
        applied: 'standard',
      }],
    }]);
    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    expect(deps.eventLog.list()[0]).toMatchObject({
      type: 'artifact_produced',
      providerNotices: [expect.objectContaining({ code: 'reasoning_downgraded_for_structured_output' })],
    });
  });

  it('throws UnknownToolError when a scenario references a toolId absent from the tool registry', async () => {
    const deps = buildDeps([]);
    const scenario: ScenarioRuntime = { ...SINGLE_GATE_SCENARIO, toolIds: ['nonexistent-tool'] };
    await expect(
      runScenario(scenario, { inputArtifacts: {}, toolInputs: {} }, deps),
    ).rejects.toThrow(UnknownToolError);
  });

  it('throws GenerationValidationError when the provider returns content that fails the target artifact schema', async () => {
    const deps = buildDeps([{ content: JSON.stringify({ notARiskList: true }) }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });

  it('throws GenerationValidationError when the provider returns content that is not valid JSON', async () => {
    const deps = buildDeps([{ content: 'not json at all' }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });
});

describe('resumeScenario', () => {
  it('confirming a single-gate scenario with no revisions completes it and returns the produced artifacts', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' }, decision: 'confirm' },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(result).toEqual({ status: 'completed', sessionId: 'session-1', artifacts: { 'test.Doc': { caseId: 'c1', files: [] }, 'test.Risk': VALID_RISK_LIST } });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual([
      'artifact_produced',
      'todo_snapshot',
      'confirmation_requested',
      'confirmation_resolved',
      'todo_snapshot',
      'scenario_completed',
    ]);
    expect(events[3]).toMatchObject({
      type: 'confirmation_resolved',
      requestId: paused.requestId,
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
    });
  });

  it('rejecting a gate completes the scenario immediately without producing further artifacts', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'cli', actorId: 'demo-lawyer' }, decision: 'reject' },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(result.status).toBe('completed');
    const events = deps.eventLog.list();
    // reject 分支不再跑 produceSequence，所以只有暂停那一刻的一份 todo_snapshot，
    // 没有"全部完成"那份——这是诚实的：reject 之后并没有真的把剩余步骤走完。
    expect(events.map((e) => e.type)).toEqual([
      'artifact_produced',
      'todo_snapshot',
      'confirmation_requested',
      'confirmation_resolved',
      'scenario_completed',
    ]);
  });

  it('resuming an unknown or already-consumed requestId throws UnknownConfirmationRequestError', async () => {
    const deps = buildDeps([]);
    await expect(
      resumeScenario('never-issued', { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).rejects.toThrow(UnknownConfirmationRequestError);
  });

  it('a confirmation request can only be resumed once — the second resume on the same requestId throws', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    await resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps);

    await expect(
      resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).rejects.toThrow(UnknownConfirmationRequestError);
  });

  it('applies a field-level revision before confirming, records it via RevisionEventStore, and emits revision_recorded', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      {
        actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
        decision: 'confirm',
        revisions: [
          {
            artifactType: 'test.Risk',
            artifactId: 'c1',
            fieldPath: '/risks/0/dispositionStatus',
            previousValue: 'pending',
            newValue: 'confirmed',
            reason: '与主办律师电话确认，风险属实',
            caseId: 'c1',
          },
        ],
        instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] },
      },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    if (result.status !== 'completed') throw new Error('unreachable');
    const finalRiskList = result.artifacts['test.Risk'] as typeof VALID_RISK_LIST;
    expect(finalRiskList.risks[0].dispositionStatus).toBe('confirmed');

    const recorded = deps.revisionStore.list();
    expect(recorded).toHaveLength(1);
    expect(RevisionEventSchema.safeParse(recorded[0]).success).toBe(true);
    expect(recorded[0]).toMatchObject({
      artifactType: 'test.Risk',
      artifactId: 'c1',
      fieldPath: '/risks/0/dispositionStatus',
      previousValue: 'pending',
      newValue: 'confirmed',
      actor: { userId: 'demo-lawyer', role: '主办律师' },
      sessionId: 'session-1',
    });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual([
      'artifact_produced',
      'todo_snapshot',
      'confirmation_requested',
      'confirmation_resolved',
      'revision_recorded',
      'artifact_produced',
      'todo_snapshot',
      'scenario_completed',
    ]);
    expect(events[3]).toMatchObject({ instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] } });
    expect(events[4]).toMatchObject({ type: 'revision_recorded', revisionEventId: recorded[0].id });
    // 修正后的 artifact 重新发了一次 artifact_produced——事件流可回放才能真正
    // 重建出修正后的状态，而不是只重建出确认门禁触发时那一刻的原始产出。
    expect(events[5]).toMatchObject({ type: 'artifact_produced', artifactType: 'test.Risk' });
    expect((events[5] as { artifact: typeof VALID_RISK_LIST }).artifact.risks[0].dispositionStatus).toBe('confirmed');
  });

  it('re-emits artifact_produced for a revised artifact, so replaySession reflects the post-revision state, not the original', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    await resumeScenario(
      paused.requestId,
      {
        actor: { channelId: 'cli', actorId: 'demo-lawyer' },
        decision: 'confirm',
        revisions: [
          { artifactType: 'test.Risk', artifactId: 'c1', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed' },
        ],
      },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    const events = deps.eventLog.list();
    const artifactProducedEvents = events.filter((e) => e.type === 'artifact_produced');
    expect(artifactProducedEvents).toHaveLength(2);
    const last = artifactProducedEvents[artifactProducedEvents.length - 1];
    if (last.type !== 'artifact_produced') throw new Error('unreachable');
    expect((last.artifact as typeof VALID_RISK_LIST).risks[0].dispositionStatus).toBe('confirmed');
  });

  it('applies multiple revisions in order and records each independently', async () => {
    const twoRiskList = { caseId: 'c1', risks: [VALID_RISK_LIST.risks[0], { ...VALID_RISK_LIST.risks[0], id: 'risk-02' }] };
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', twoRiskList) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    await resumeScenario(
      paused.requestId,
      {
        actor: { channelId: 'cli', actorId: 'demo-lawyer' },
        decision: 'confirm',
        revisions: [
          { artifactType: 'test.Risk', artifactId: 'c1', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed' },
          { artifactType: 'test.Risk', artifactId: 'c1', fieldPath: '/risks/1/dispositionStatus', previousValue: 'pending', newValue: 'rejected' },
        ],
      },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(deps.revisionStore.list()).toHaveLength(2);
  });
});

const MULTI_GATE_SCENARIO: ScenarioRuntime = {
  id: 'test.Multi',
  packageId: 'test',
  name: '多产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['test.Doc', 'test.Alpha', 'test.Beta'],
  uiTemplateId: 'test-panel',
  confirmationPolicy: {
    mode: 'gates',
    gates: [
      { artifact: 'test.Alpha', label: '确认事件时间线' },
      { artifact: 'test.Beta', label: '确认当事人关系图谱' },
    ],
  },
  promptBody: '测试声明段正文',
  steps: [
    { id: 'produce-test.Doc', title: '产出 test.Doc', artifact: 'test.Doc' },
    { id: 'produce-test.Alpha', title: '产出 test.Alpha', artifact: 'test.Alpha' },
    { id: 'produce-test.Beta', title: '产出 test.Beta', artifact: 'test.Beta' },
  ],
};

const CASE_FILE_RESPONSE = { caseId: 'c1', files: [] };
const TIMELINE_RESPONSE = { caseId: 'c1', events: [] };
const PARTY_GRAPH_RESPONSE = { caseId: 'c1', nodes: [], edges: [] };

describe('runScenario / resumeScenario — multi-artifact sequential gates (S1 shape)', () => {
  it('produces CaseFile ungated, pauses at Timeline, then pauses at PartyGraph after Timeline is confirmed, matching declared order', async () => {
    const deps = buildDeps([
      { content: envelope('produce-test.Doc', 'test.Doc', CASE_FILE_RESPONSE) },
      { content: envelope('produce-test.Alpha', 'test.Alpha', TIMELINE_RESPONSE) },
      { content: envelope('produce-test.Beta', 'test.Beta', PARTY_GRAPH_RESPONSE) },
    ]);

    const firstPause = await runScenario(MULTI_GATE_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    if (firstPause.status !== 'paused') throw new Error('expected pause at Timeline');
    expect(deps.eventLog.list().map((e) => e.type)).toEqual([
      'artifact_produced', // CaseFile, ungated
      'artifact_produced', // Timeline
      'todo_snapshot',
      'confirmation_requested',
    ]);
    expect(deps.eventLog.list()[3]).toMatchObject({ gateLabel: '确认事件时间线', artifactType: 'test.Alpha' });

    const secondPause = await resumeScenario(
      firstPause.requestId,
      { actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' },
      MULTI_GATE_SCENARIO,
      deps,
    );
    if (secondPause.status !== 'paused') throw new Error('expected pause at PartyGraph');
    const eventsAfterSecondPause = deps.eventLog.list();
    expect(eventsAfterSecondPause[eventsAfterSecondPause.length - 1]).toMatchObject({
      gateLabel: '确认当事人关系图谱',
      artifactType: 'test.Beta',
    });

    const done = await resumeScenario(
      secondPause.requestId,
      { actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' },
      MULTI_GATE_SCENARIO,
      deps,
    );
    expect(done).toEqual({
      status: 'completed',
      sessionId: 'session-1',
      artifacts: { 'test.Doc': CASE_FILE_RESPONSE, 'test.Alpha': TIMELINE_RESPONSE, 'test.Beta': PARTY_GRAPH_RESPONSE },
    });
  });
});

describe('runScenario — label-only confirmation gate (no artifact anchor)', () => {
  const LABEL_ONLY_SCENARIO: ScenarioRuntime = {
    id: 'test.LabelOnly',
    packageId: 'test',
    name: '无锚点门禁测试场景',
    trigger: { fileTypes: [], userActions: ['x'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['test.Doc'],
    uiTemplateId: 'test-panel',
    confirmationPolicy: { mode: 'gates', gates: [{ label: '整体确认（无产物锚点）' }] },
    promptBody: '测试声明段正文',
    steps: [{ id: 'produce-test.Doc', title: '产出 test.Doc', artifact: 'test.Doc' }],
  };

  it('produces the sole output artifact ungated, then pauses on the label-only gate at the end of the sequence', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Doc', 'test.Doc', CASE_FILE_RESPONSE) }]);
    const result = await runScenario(LABEL_ONLY_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    expect(result.status).toBe('paused');
    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'todo_snapshot', 'confirmation_requested']);
    expect(events[2]).toMatchObject({ gateLabel: '整体确认（无产物锚点）', artifactType: undefined });
  });
});

describe('resumeScenario — genuinely fresh dependency instances (simulated cross-process resume)', () => {
  it('a resume using brand-new dependency instances pointed at the same durable state completes correctly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-executor-crossproc-'));
    try {
      const eventsPath = join(dir, 'events.jsonl');
      const pendingDir = join(dir, 'pending');
      const tools = createToolRegistry();
      tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });

      const firstDeps: ScenarioExecutorDeps = {
        tools,
        toolExecutor: createToolExecutor(),
        provider: createScriptedProvider('p', 'v1', [{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]),
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        revisionStore: createInMemoryRevisionEventStore(),
        ledger: createEvidenceLedger(),
        artifacts: TEST_ARTIFACTS,
        projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
      };
      const paused = await runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        firstDeps,
      );
      if (paused.status !== 'paused') throw new Error('expected pause');

      // 模拟"另一个进程"：所有依赖都重新构造，只共享磁盘路径与可序列化配置。
      const secondTools = createToolRegistry();
      secondTools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
      const secondDeps: ScenarioExecutorDeps = {
        tools: secondTools,
        toolExecutor: createToolExecutor(),
        provider: createScriptedProvider('p-fresh', 'v1', []),
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        revisionStore: createInMemoryRevisionEventStore(),
        ledger: createEvidenceLedger(),
        artifacts: TEST_ARTIFACTS,
        projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
      };
      expect(secondDeps.tools).not.toBe(firstDeps.tools);
      expect(secondDeps.toolExecutor).not.toBe(firstDeps.toolExecutor);
      expect(secondDeps.provider).not.toBe(firstDeps.provider);
      expect(secondDeps.eventLog).not.toBe(firstDeps.eventLog);
      expect(secondDeps.confirmationStore).not.toBe(firstDeps.confirmationStore);
      expect(secondDeps.revisionStore).not.toBe(firstDeps.revisionStore);
      expect(secondDeps.ledger).not.toBe(firstDeps.ledger);
      const done = await resumeScenario(
        paused.requestId,
        { actor: { channelId: 'wecom', actorId: 'lawyer-42' }, decision: 'confirm' },
        SINGLE_GATE_SCENARIO,
        secondDeps,
      );

      expect(done.status).toBe('completed');
      // ledger 从 pending.evidenceLedgerSnapshot 重建，而不是继承 firstDeps 的内存实例：
      expect(secondDeps.ledger.get('party-verify')).toEqual({ grade: 'A', sourceId: 'mock', confirmed: false });
      // 完整历史（含 firstDeps 阶段写入的事件，加两份 todo_snapshot：暂停时一份、
      // 完成时一份）在全新 eventLog 实例里依然可读：
      expect(secondDeps.eventLog.list()).toHaveLength(6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('docs/architecture/system.md 长任务协议 ①②: todo_snapshot + step_failed emission', () => {
  it('emits a step_failed event (without throwing) when a declared tool degrades to unverified, and still proceeds to generate the artifact', async () => {
    const tools = createToolRegistry();
    tools.register('party-verify', { tool: createPartyVerifyTool(createQccPartyVerifyAdapter(undefined)), grade: 'A' });
    const deps: ScenarioExecutorDeps = {
      tools,
      toolExecutor: createToolExecutor(),
      provider: createScriptedProvider('p', 'v1', [{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]),
      eventLog: createEventLog('session-1', () => '2026-07-10T00:00:00.000Z'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
      artifacts: TEST_ARTIFACTS,
      projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
    };

    const result = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(result.status).toBe('paused');
    // 工具降级不进证据台账（只有 verified:true 才记账，见 D4）：
    expect(deps.ledger.get('party-verify')).toBeUndefined();
    const stepFailedEvents = deps.eventLog.list().filter((e) => e.type === 'step_failed');
    expect(stepFailedEvents).toHaveLength(1);
    expect(stepFailedEvents[0]).toMatchObject({ type: 'step_failed', scope: 'tool', toolId: 'party-verify', reason: 'not_configured' });
  });

  it('emits a todo_snapshot right before pausing, reflecting the scenario declaration with the paused artifact as awaiting_confirmation', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    const snapshots = deps.eventLog.list().filter((e) => e.type === 'todo_snapshot');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      type: 'todo_snapshot',
      steps: [{ artifactType: 'test.Risk', label: '确认风险清单', status: 'awaiting_confirmation' }],
    });
  });

  it('emits a final todo_snapshot marking every step done when the scenario completes', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    await resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps);

    const snapshots = deps.eventLog.list().filter((e) => e.type === 'todo_snapshot');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toMatchObject({ type: 'todo_snapshot', steps: [{ artifactType: 'test.Risk', status: 'done' }] });
  });
});

describe('docs/architecture/system.md 长任务协议 ③: runtime protection limits', () => {
  it('does not throw when no limits are configured (default MVP behavior unchanged)', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'paused' });
  });

  it('throws RuntimeLimitExceededError when maxToolCalls is exceeded by the declared tool phase', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    deps.limits = { maxToolCalls: 0 };
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(RuntimeLimitExceededError);
  });

  it('throws RuntimeLimitExceededError when maxSteps is exceeded by the artifact-generation phase', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Doc', 'test.Doc', CASE_FILE_RESPONSE) }, { content: envelope('produce-test.Alpha', 'test.Alpha', TIMELINE_RESPONSE) }]);
    deps.limits = { maxSteps: 1 };
    await expect(runScenario(MULTI_GATE_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps)).rejects.toThrow(
      RuntimeLimitExceededError,
    );
  });

  it('throws when one provider call itself crosses maxSeconds before returning', async () => {
    let nowMs = 0;
    const deps = buildDeps([]);
    deps.provider = {
      id: 'slow-provider',
      modelId: 'configured-model',
      async generate() {
        nowMs = 6_000;
        return { content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) };
      },
    };
    deps.limits = { maxSeconds: 5 };
    deps.nowMs = () => nowMs;

    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(RuntimeLimitExceededError);
  });

  it('a fresh runScenario/resumeScenario call gets a fresh budget (limits are scoped per call, not persisted across resume)', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    deps.limits = { maxSteps: 1 };
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    // 恢复时 remainingArtifactTypes 已空（S3 只有一个产出），不会再触发生成步骤，
    // 因此即使 maxSteps=1 也不会在 resume 阶段报错——这条测试确认的是"限额不会
    // 因为跨越了暂停边界而被污染成 0"，不是测试恢复阶段本身还有额度可用。
    await expect(
      resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).resolves.toMatchObject({ status: 'completed' });
  });
});

describe('Manus "todo 复述进上下文末尾" 抗注意力漂移技巧（docs/architecture/system.md，套在声明式步骤上）', () => {
  it('appends the current todo snapshot to the end of the generation request content', async () => {
    const capturedRequests: { content: string }[] = [];
    const capturingProvider = {
      id: 'capture',
      modelId: 'capture-v1',
      async generate(request: { messages: { content: string }[] }) {
        capturedRequests.push({ content: request.messages[request.messages.length - 1].content });
        return { content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) };
      },
    };
    const tools = createToolRegistry();
    tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
    const deps: ScenarioExecutorDeps = {
      tools,
      toolExecutor: createToolExecutor(),
      provider: capturingProvider,
      eventLog: createEventLog('session-1'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
      artifacts: TEST_ARTIFACTS,
      projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
    };

    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(capturedRequests).toHaveLength(1);
    // 视图映射段（六段之尾）承载 todo 复述：断言其位于消息末段且逐条在场。
    const content = capturedRequests[0].content;
    const tail = content.slice(content.indexOf('[todo 复述]'));
    expect(tail).toContain('[produce-test.Risk] 确认风险清单：pending');
    expect(content.indexOf('[输出通道]')).toBeGreaterThan(content.indexOf('<<<材料:')  === -1 ? 0 : content.indexOf('<<<材料:'));
  });
});

describe('T-provider: generateArtifact passes responseSchema through to provider.generate()', () => {
  it('the request reaching provider.generate() carries responseSchema matching the injected artifact schema registry entry', async () => {
    let capturedResponseSchema: unknown;
    const capturingProvider = {
      id: 'capture-schema',
      modelId: 'v1',
      async generate(request: { responseSchema?: unknown }) {
        capturedResponseSchema = request.responseSchema;
        return { content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) };
      },
    };
    const tools = createToolRegistry();
    tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
    const deps: ScenarioExecutorDeps = {
      tools,
      toolExecutor: createToolExecutor(),
      provider: capturingProvider,
      eventLog: createEventLog('session-1'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
      artifacts: TEST_ARTIFACTS,
      projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
    };

    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(capturedResponseSchema).toBeDefined();
    const parse = (v: unknown) => (capturedResponseSchema as { safeParse: (x: unknown) => { success: boolean } }).safeParse(v);
    // 信封 schema：裸 artifact 不再合法；携正确地址的信封合法；错址信封拒收（按址收货）。
    expect(parse(VALID_RISK_LIST).success).toBe(false);
    expect(parse({ target: { stepId: 'produce-test.Risk', artifactType: 'test.Risk' }, artifact: VALID_RISK_LIST }).success).toBe(true);
    expect(parse({ target: { stepId: 'wrong-step', artifactType: 'test.Risk' }, artifact: VALID_RISK_LIST }).success).toBe(false);
  });
});

describe('T-provider: RuntimeGuard.checkUsd wired into produceSequence via response.usage', () => {
  it('throws RuntimeLimitExceededError("maxUsd") when a priced provider/model returns usage that exceeds the configured budget', async () => {
    const expensiveProvider = {
      id: 'deepseek',
      modelId: 'deepseek-v4-pro', // 价格表里有真实报价的组合（pricing-table.ts）
      async generate() {
        return { content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST), usage: { inputTokens: 10_000_000, outputTokens: 10_000_000 } };
      },
    };
    const tools = createToolRegistry();
    tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
    const deps: ScenarioExecutorDeps = {
      tools,
      toolExecutor: createToolExecutor(),
      provider: expensiveProvider,
      eventLog: createEventLog('session-1'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
      artifacts: TEST_ARTIFACTS,
      projections: { get: (typeId: string) => TEST_ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
      limits: { maxUsd: 0.01 }, // 10M+10M token 在 deepseek-v4-pro 报价下远超这个预算
    };

    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(RuntimeLimitExceededError);
  });

  it('does not throw when usage is absent (ScriptedProvider case) even with a negative maxUsd — proves cost tracking is genuinely skipped, not computed-as-zero-then-compared', async () => {
    const deps = buildDeps([{ content: envelope('produce-test.Risk', 'test.Risk', VALID_RISK_LIST) }]);
    // maxUsd 设为负数是关键：如果实现有 bug、把缺失的 usage 悄悄当成 0 计价再调用
    // checkUsd(0)，0 > -1 为真会立刻抛错——用极小正数 maxUsd 时"跳过计价"与"算出 0
    // 然后侥幸没超预算"两种情况观测结果完全相同，测不出差异，这是 code review 抓到
    // 的真实测试强度缺口。负数预算下二者行为可观测地不同：真正跳过则安然无恙，
    // 静默按 0 计价则会撞上这个必然超限的负数预算而抛错。
    deps.limits = { maxUsd: -1 };
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { 'test.Doc': { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'paused' });
  });
});
