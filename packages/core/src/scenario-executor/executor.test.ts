import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ScenarioDefinition } from '@courtwork/registry';
import { RevisionEventSchema } from '@courtwork/schemas';
import { createMockPartyVerifyAdapter, createPartyVerifyTool, createQccPartyVerifyAdapter, createToolExecutor } from '@courtwork/tools';
import { createEventLog, createFileEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createFileConfirmationStore, createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import { RuntimeLimitExceededError } from './runtime-limits.js';
import {
  GenerationValidationError,
  resumeScenario,
  runScenario,
  UnknownConfirmationRequestError,
  UnknownToolError,
  type ScenarioExecutorDeps,
} from './executor.js';

const SINGLE_GATE_SCENARIO: ScenarioDefinition = {
  id: 'S-test-single',
  name: '单产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: ['CaseFile'],
  toolIds: ['party-verify'],
  outputArtifacts: ['RiskList'],
  uiTemplateId: 'test-panel',
  confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单' }],
  promptTemplateRef: 'test-v0',
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

function buildDeps(providerScript: { content: string }[]): ScenarioExecutorDeps {
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
  };
}

describe('runScenario', () => {
  it('runs the declared tool, records its evidence grade, generates the sole output artifact, and pauses at its gate', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const result = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(result).toEqual({ status: 'paused', sessionId: 'session-1', requestId: expect.any(String) });
    expect(deps.ledger.get('party-verify')).toEqual({ grade: 'A', sourceId: 'mock', confirmed: false });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'todo_snapshot', 'confirmation_requested']);
    expect(events[0]).toMatchObject({ type: 'artifact_produced', artifactType: 'RiskList', artifact: VALID_RISK_LIST });
    expect(events[0]).toMatchObject({ evidenceGrades: [{ key: 'party-verify', grade: 'A', sourceId: 'mock', confirmed: false }] });
  });

  it('throws UnknownToolError when a scenario references a toolId absent from the tool registry', async () => {
    const deps = buildDeps([]);
    const scenario: ScenarioDefinition = { ...SINGLE_GATE_SCENARIO, toolIds: ['nonexistent-tool'] };
    await expect(
      runScenario(scenario, { inputArtifacts: {}, toolInputs: {} }, deps),
    ).rejects.toThrow(UnknownToolError);
  });

  it('throws GenerationValidationError when the provider returns content that fails the target artifact schema', async () => {
    const deps = buildDeps([{ content: JSON.stringify({ notARiskList: true }) }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });

  it('throws GenerationValidationError when the provider returns content that is not valid JSON', async () => {
    const deps = buildDeps([{ content: 'not json at all' }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });
});

describe('resumeScenario', () => {
  it('confirming a single-gate scenario with no revisions completes it and returns the produced artifacts', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' }, decision: 'confirm' },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(result).toEqual({ status: 'completed', sessionId: 'session-1', artifacts: { CaseFile: { caseId: 'c1', files: [] }, RiskList: VALID_RISK_LIST } });

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
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
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
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    await resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps);

    await expect(
      resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).rejects.toThrow(UnknownConfirmationRequestError);
  });

  it('applies a field-level revision before confirming, records it via RevisionEventStore, and emits revision_recorded', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
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
            artifactType: 'RiskList',
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
    const finalRiskList = result.artifacts.RiskList as typeof VALID_RISK_LIST;
    expect(finalRiskList.risks[0].dispositionStatus).toBe('confirmed');

    const recorded = deps.revisionStore.list();
    expect(recorded).toHaveLength(1);
    expect(RevisionEventSchema.safeParse(recorded[0]).success).toBe(true);
    expect(recorded[0]).toMatchObject({
      artifactType: 'RiskList',
      artifactId: 'c1',
      fieldPath: '/risks/0/dispositionStatus',
      previousValue: 'pending',
      newValue: 'confirmed',
      actor: { userId: 'demo-lawyer', role: '主办律师' },
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
    expect(events[5]).toMatchObject({ type: 'artifact_produced', artifactType: 'RiskList' });
    expect((events[5] as { artifact: typeof VALID_RISK_LIST }).artifact.risks[0].dispositionStatus).toBe('confirmed');
  });

  it('re-emits artifact_produced for a revised artifact, so replaySession reflects the post-revision state, not the original', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    await resumeScenario(
      paused.requestId,
      {
        actor: { channelId: 'cli', actorId: 'demo-lawyer' },
        decision: 'confirm',
        revisions: [
          { artifactType: 'RiskList', artifactId: 'c1', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed' },
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
    const deps = buildDeps([{ content: JSON.stringify(twoRiskList) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    await resumeScenario(
      paused.requestId,
      {
        actor: { channelId: 'cli', actorId: 'demo-lawyer' },
        decision: 'confirm',
        revisions: [
          { artifactType: 'RiskList', artifactId: 'c1', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed' },
          { artifactType: 'RiskList', artifactId: 'c1', fieldPath: '/risks/1/dispositionStatus', previousValue: 'pending', newValue: 'rejected' },
        ],
      },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(deps.revisionStore.list()).toHaveLength(2);
  });
});

const MULTI_GATE_SCENARIO: ScenarioDefinition = {
  id: 'S-test-multi',
  name: '多产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
  uiTemplateId: 'test-panel',
  confirmationGates: [
    { artifact: 'Timeline', label: '确认事件时间线' },
    { artifact: 'PartyGraph', label: '确认当事人关系图谱' },
  ],
  promptTemplateRef: 'test-v0',
};

const CASE_FILE_RESPONSE = { caseId: 'c1', files: [] };
const TIMELINE_RESPONSE = { caseId: 'c1', events: [] };
const PARTY_GRAPH_RESPONSE = { caseId: 'c1', nodes: [], edges: [] };

describe('runScenario / resumeScenario — multi-artifact sequential gates (S1 shape)', () => {
  it('produces CaseFile ungated, pauses at Timeline, then pauses at PartyGraph after Timeline is confirmed, matching declared order', async () => {
    const deps = buildDeps([
      { content: JSON.stringify(CASE_FILE_RESPONSE) },
      { content: JSON.stringify(TIMELINE_RESPONSE) },
      { content: JSON.stringify(PARTY_GRAPH_RESPONSE) },
    ]);

    const firstPause = await runScenario(MULTI_GATE_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    if (firstPause.status !== 'paused') throw new Error('expected pause at Timeline');
    expect(deps.eventLog.list().map((e) => e.type)).toEqual([
      'artifact_produced', // CaseFile, ungated
      'artifact_produced', // Timeline
      'todo_snapshot',
      'confirmation_requested',
    ]);
    expect(deps.eventLog.list()[3]).toMatchObject({ gateLabel: '确认事件时间线', artifactType: 'Timeline' });

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
      artifactType: 'PartyGraph',
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
      artifacts: { CaseFile: CASE_FILE_RESPONSE, Timeline: TIMELINE_RESPONSE, PartyGraph: PARTY_GRAPH_RESPONSE },
    });
  });
});

describe('runScenario — label-only confirmation gate (no artifact anchor)', () => {
  const LABEL_ONLY_SCENARIO: ScenarioDefinition = {
    id: 'S-test-label-only',
    name: '无锚点门禁测试场景',
    trigger: { fileTypes: [], userActions: ['x'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['CaseFile'],
    uiTemplateId: 'test-panel',
    confirmationGates: [{ label: '整体确认（无产物锚点）' }],
    promptTemplateRef: 'test-v0',
  };

  it('produces the sole output artifact ungated, then pauses on the label-only gate at the end of the sequence', async () => {
    const deps = buildDeps([{ content: JSON.stringify(CASE_FILE_RESPONSE) }]);
    const result = await runScenario(LABEL_ONLY_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    expect(result.status).toBe('paused');
    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'todo_snapshot', 'confirmation_requested']);
    expect(events[2]).toMatchObject({ gateLabel: '整体确认（无产物锚点）', artifactType: undefined });
  });
});

describe('resumeScenario — genuinely fresh dependency instances (simulated cross-process resume)', () => {
  it('a resume using brand-new EventLog/ConfirmationStore/EvidenceLedger instances pointed at the same durable state completes correctly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-executor-crossproc-'));
    try {
      const eventsPath = join(dir, 'events.jsonl');
      const pendingDir = join(dir, 'pending');
      const tools = createToolRegistry();
      tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });

      const firstDeps: ScenarioExecutorDeps = {
        tools,
        toolExecutor: createToolExecutor(),
        provider: createScriptedProvider('p', 'v1', [{ content: JSON.stringify(VALID_RISK_LIST) }]),
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        revisionStore: createInMemoryRevisionEventStore(),
        ledger: createEvidenceLedger(),
      };
      const paused = await runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        firstDeps,
      );
      if (paused.status !== 'paused') throw new Error('expected pause');

      // 模拟"另一个进程"：全新构造的 eventLog/confirmationStore/ledger 实例，只共享磁盘路径。
      const secondDeps: ScenarioExecutorDeps = {
        ...firstDeps,
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        ledger: createEvidenceLedger(),
      };
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

describe('docs/12 长任务协议 ①②: todo_snapshot + step_failed emission', () => {
  it('emits a step_failed event (without throwing) when a declared tool degrades to unverified, and still proceeds to generate the artifact', async () => {
    const tools = createToolRegistry();
    tools.register('party-verify', { tool: createPartyVerifyTool(createQccPartyVerifyAdapter(undefined)), grade: 'A' });
    const deps: ScenarioExecutorDeps = {
      tools,
      toolExecutor: createToolExecutor(),
      provider: createScriptedProvider('p', 'v1', [{ content: JSON.stringify(VALID_RISK_LIST) }]),
      eventLog: createEventLog('session-1', () => '2026-07-10T00:00:00.000Z'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
    };

    const result = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
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
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    const snapshots = deps.eventLog.list().filter((e) => e.type === 'todo_snapshot');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      type: 'todo_snapshot',
      steps: [{ artifactType: 'RiskList', label: '确认风险清单', status: 'awaiting_confirmation' }],
    });
  });

  it('emits a final todo_snapshot marking every step done when the scenario completes', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    await resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps);

    const snapshots = deps.eventLog.list().filter((e) => e.type === 'todo_snapshot');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toMatchObject({ type: 'todo_snapshot', steps: [{ artifactType: 'RiskList', status: 'done' }] });
  });
});

describe('docs/12 长任务协议 ③: runtime protection limits', () => {
  it('does not throw when no limits are configured (default MVP behavior unchanged)', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'paused' });
  });

  it('throws RuntimeLimitExceededError when maxToolCalls is exceeded by the declared tool phase', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    deps.limits = { maxToolCalls: 0 };
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(RuntimeLimitExceededError);
  });

  it('throws RuntimeLimitExceededError when maxSteps is exceeded by the artifact-generation phase', async () => {
    const deps = buildDeps([{ content: JSON.stringify(CASE_FILE_RESPONSE) }, { content: JSON.stringify(TIMELINE_RESPONSE) }]);
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
        return { content: JSON.stringify(VALID_RISK_LIST) };
      },
    };
    deps.limits = { maxSeconds: 5 };
    deps.nowMs = () => nowMs;

    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(RuntimeLimitExceededError);
  });

  it('a fresh runScenario/resumeScenario call gets a fresh budget (limits are scoped per call, not persisted across resume)', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    deps.limits = { maxSteps: 1 };
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
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

describe('Manus "todo 复述进上下文末尾" 抗注意力漂移技巧（docs/12，套在声明式步骤上）', () => {
  it('appends the current todo snapshot to the end of the generation request content', async () => {
    const capturedRequests: { content: string }[] = [];
    const capturingProvider = {
      id: 'capture',
      modelId: 'capture-v1',
      async generate(request: { messages: { content: string }[] }) {
        capturedRequests.push({ content: request.messages[request.messages.length - 1].content });
        return { content: JSON.stringify(VALID_RISK_LIST) };
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
    };

    await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(capturedRequests).toHaveLength(1);
    const parsedTail = JSON.parse(capturedRequests[0].content).todo;
    expect(parsedTail).toEqual([{ artifactType: 'RiskList', label: '确认风险清单', status: 'pending' }]);
  });
});
