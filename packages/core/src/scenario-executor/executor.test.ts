import { describe, expect, it } from 'vitest';
import type { ScenarioDefinition } from '@courtwork/registry';
import { createMockPartyVerifyAdapter, createPartyVerifyTool, createToolExecutor } from '@courtwork/tools';
import { createEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
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
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested']);
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
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested', 'confirmation_resolved', 'scenario_completed']);
    expect(events[2]).toMatchObject({
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
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested', 'confirmation_resolved', 'scenario_completed']);
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
});
