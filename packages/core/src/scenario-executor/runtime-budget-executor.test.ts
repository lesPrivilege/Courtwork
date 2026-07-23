import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { ArtifactSchemaRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { ArtifactDescriptor } from '@courtwork/schemas';
import { createToolExecutor } from '@courtwork/tools';
import { PRICE_TABLE } from '@courtwork/provider/pricing';

import { createEvidenceLedger } from '../evidence/grade.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { createMemoryTurnStore, type TurnStore } from '../turn/turn-store.js';
import type { PersistedTurn } from '../turn/types.js';
import type { TurnRunnerPort } from '../turn/turn-runner.js';
import {
  createInMemoryWorkStateHost,
  loadWorkStateStore,
  type WorkStateHeader,
  type WorkStateHostPort,
  type WorkStateStore,
} from '../work-state/work-state-store.js';
import {
  readWorkStateEnvelope,
  type WorkRuntimeBudget,
  type WorkSessionRef,
} from '../work-state/envelope.js';
import {
  resumeScenario,
  runScenario,
  WorkTurnFailedError,
  type ScenarioExecutorDeps,
} from './executor.js';

const OUTPUT_SCHEMA = z.object({ value: z.string() });
const TYPES = ['test.One', 'test.Two'] as const;

function descriptor(typeId: string): ArtifactDescriptor {
  return {
    typeId,
    title: typeId,
    schema: OUTPUT_SCHEMA,
    rehydrationProjection: {
      ops: [{ kind: 'field', path: '/value', label: '值' }],
      rowBudget: 1,
    },
    uiTemplateId: 'test-panel',
  };
}

const ARTIFACTS: ArtifactSchemaRegistry = {
  get(typeId) {
    return TYPES.includes(typeId as typeof TYPES[number])
      ? { descriptor: descriptor(typeId), packageId: 'test' }
      : undefined;
  },
  normalizeTypeId(value) {
    return TYPES.includes(value as typeof TYPES[number]) ? value : undefined;
  },
  list() {
    return TYPES.map((typeId) => ({ descriptor: descriptor(typeId), packageId: 'test' }));
  },
};

function scenario(outputArtifacts: string[], gateAfterFirst = false): ScenarioRuntime {
  return {
    id: 'test.Budget',
    packageId: 'test',
    name: '预算测试',
    trigger: { fileTypes: [], userActions: [], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts,
    uiTemplateId: 'test-panel',
    confirmationPolicy: gateAfterFirst
      ? { mode: 'gates', gates: [{ artifact: outputArtifacts[0]!, label: '确认第一项' }] }
      : { mode: 'none' },
    promptBody: '预算测试',
    steps: outputArtifacts.map((artifact) => ({
      id: `produce-${artifact}`,
      title: `产出 ${artifact}`,
      artifact,
    })),
  };
}

function responseEnvelope(artifactType: string): string {
  return JSON.stringify({
    target: { stepId: `produce-${artifactType}`, artifactType },
    artifact: { value: artifactType },
  });
}

type TerminalSpec =
  | {
      status: 'completed';
      providerId?: string;
      modelId?: string;
      artifactType?: string;
      usage?: { inputTokens?: number; outputTokens?: number };
    }
  | {
      status: 'failed';
      providerId?: string;
      modelId?: string;
      artifactType?: string;
      usage?: { inputTokens?: number; outputTokens?: number };
    };

function queuedTurnRunner(
  store: TurnStore,
  specs: TerminalSpec[],
  onCall?: () => void,
): TurnRunnerPort {
  return {
    async run(input) {
      onCall?.();
      const spec = specs.shift();
      if (!spec) throw new Error('unexpected provider call');
      const common = {
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: spec.providerId ?? 'deepseek',
        modelId: spec.modelId ?? 'deepseek-v4-pro',
        reasoning: { status: 'absent' } as const,
        ...(spec.usage ? { usage: spec.usage } : {}),
      };
      const terminal: PersistedTurn = spec.status === 'completed'
        ? {
            ...common,
            status: 'completed',
            assistantMessage: responseEnvelope(spec.artifactType ?? 'test.One'),
            finishReason: 'stop',
            completedAt: '2026-07-24T00:00:00.000Z',
          }
        : {
            ...common,
            status: 'failed',
            failure: { kind: 'network', message: 'provider failed after usage', retryable: true },
            failedAt: '2026-07-24T00:00:00.000Z',
          };
      store.save(terminal);
      return terminal;
    },
  };
}

const REF: WorkSessionRef = { caseId: 'case-budget', sessionId: 'session-budget' };

function budget(
  limits: WorkRuntimeBudget['limits'] = {},
  overrides: Partial<WorkRuntimeBudget> = {},
): WorkRuntimeBudget {
  return {
    limits: { ...limits },
    costBasis: {
      currency: 'USD',
      priceTableVersion: PRICE_TABLE.version,
      priceTableEffectiveAt: PRICE_TABLE.effectiveAt,
      assumptions: [...PRICE_TABLE.assumptions],
    },
    consumed: {
      steps: 0,
      toolCalls: 0,
      executionMs: 0,
      estimatedUsd: 0,
      costCoverage: 'complete',
    },
    ...overrides,
  };
}

function header(runtimeBudget: WorkRuntimeBudget): WorkStateHeader {
  return {
    caseId: REF.caseId,
    sessionId: REF.sessionId,
    chainId: REF.sessionId,
    scenarioId: 'test.Budget',
    packageId: 'test',
    packageVersion: '0.1.0',
    schemaVersion: 1,
    scenarioFingerprint: 'test.Budget@1+' + '0'.repeat(64),
    modelRoute: { providerId: 'deepseek', modelId: 'deepseek-v4-pro', reasoning: 'standard' },
    materialRefs: [],
    createdAt: '2026-07-24T00:00:00.000Z',
    runtimeBudget,
  };
}

async function storeHarness(input: {
  host?: WorkStateHostPort;
  turnStore?: TurnStore;
  runtimeBudget?: WorkRuntimeBudget;
  terminalSpecs: TerminalSpec[];
  nowMs?: () => number;
  onCall?: () => void;
  onIdentity?: () => void;
}): Promise<{
  host: WorkStateHostPort;
  store: WorkStateStore;
  turnStore: TurnStore;
  deps: ScenarioExecutorDeps;
}> {
  const host = input.host ?? createInMemoryWorkStateHost();
  const turnStore = input.turnStore ?? createMemoryTurnStore();
  const store = await loadWorkStateStore({
    host,
    ref: REF,
    header: header(input.runtimeBudget ?? budget()),
    readTurnEntries: () => turnStore.list(),
    now: () => '2026-07-24T00:00:00.000Z',
  });
  const deps: ScenarioExecutorDeps = {
    tools: createToolRegistry(),
    toolExecutor: createToolExecutor(),
    turnRunner: queuedTurnRunner(turnStore, input.terminalSpecs, input.onCall),
    eventLog: store.eventLog,
    confirmationStore: store.confirmationStore,
    revisionStore: store.revisionStore,
    ledger: createEvidenceLedger(),
    artifacts: ARTIFACTS,
    projections: { get: (typeId) => ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
    runtimeBudget: store.runtimeBudget,
    expectedModelRoute: { providerId: 'deepseek', modelId: 'deepseek-v4-pro' },
    persistBarrier: async () => {
      await store.commit();
    },
    ...(input.onIdentity ? {
      createTurnIdentity: (context) => {
        input.onIdentity?.();
        return {
          turnId: `turn-${context.stepId}-${context.attempt}`,
          providerRequestId: `provider-${context.stepId}-${context.attempt}`,
        };
      },
    } : {}),
    ...(input.nowMs ? { nowMs: input.nowMs } : {}),
  };
  return { host, store, turnStore, deps };
}

async function persisted(host: WorkStateHostPort) {
  const found = await host.read(REF);
  if (!found.found) throw new Error('expected persisted envelope');
  return readWorkStateEnvelope(found.bytes);
}

describe('CORE-BUDGET-1 executor/store integration', () => {
  it('accumulates steps, execution time, and known cost across pause/resume without counting human wait', async () => {
    let nowMs = 10_000;
    const first = await storeHarness({
      runtimeBudget: budget({ maxSteps: 2, maxSeconds: 10, maxUsd: 10 }),
      terminalSpecs: [{
        status: 'completed',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      }],
      nowMs: () => nowMs,
      onCall: () => {
        nowMs += 2_000;
      },
    });
    const paused = await runScenario(scenario([...TYPES], true), { inputArtifacts: {}, toolInputs: {} }, first.deps);
    if (paused.status !== 'paused') throw new Error('expected pause');
    expect((await persisted(first.host)).runtimeBudget.consumed).toMatchObject({
      steps: 1,
      executionMs: 2_000,
      costCoverage: 'complete',
    });

    // 人工停门等待任意长；新 leg 的时钟只从 resume 调用时起算。
    nowMs = 10_000_000;
    const second = await storeHarness({
      host: first.host,
      turnStore: first.turnStore,
      runtimeBudget: budget(),
      terminalSpecs: [{
        status: 'completed',
        artifactType: 'test.Two',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      }],
      nowMs: () => nowMs,
      onCall: () => {
        nowMs += 3_000;
      },
    });
    const done = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'test', actorId: 'user' }, decision: 'confirm' },
      scenario([...TYPES], true),
      second.deps,
    );
    expect(done.status).toBe('completed');
    const final = await persisted(second.host);
    expect(final.runtimeBudget.consumed).toEqual({
      steps: 2,
      toolCalls: 0,
      executionMs: 5_000,
      estimatedUsd: 2 * (9 / 7.1),
      costCoverage: 'complete',
    });
  });

  it('persists an unknown paid terminal as partial, then blocks the next paid Turn before linking/calling it', async () => {
    let calls = 0;
    let identities = 0;
    const harness = await storeHarness({
      runtimeBudget: budget({ maxUsd: 5 }),
      terminalSpecs: [
        { status: 'completed' },
        { status: 'completed', artifactType: 'test.Two', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      onCall: () => {
        calls += 1;
      },
      onIdentity: () => {
        identities += 1;
      },
    });
    const result = await runScenario(scenario([...TYPES]), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration', retryable: false });
    expect(calls).toBe(1);
    expect(identities).toBe(1);
    const final = await persisted(harness.host);
    expect(final.runtimeBudget.consumed).toMatchObject({
      steps: 1,
      estimatedUsd: 0,
      costCoverage: 'partial',
    });
    expect(final.events.filter((event) => event.type === 'turn_linked')).toHaveLength(1);
    const failure = final.events.find((event) => event.type === 'scenario_failed');
    expect(failure).toMatchObject({ type: 'scenario_failed', reason: 'configuration' });
    expect(failure && 'message' in failure ? failure.message : '').toMatch(
      /已知估算.*覆盖.*partial.*冻结假设.*下一步/s,
    );
  });

  it('blocks a frozen price-table version-only mismatch before step/identity/turn_linked/provider', async () => {
    let calls = 0;
    let identities = 0;
    const stale = budget(
      { maxUsd: 5 },
      {
        costBasis: {
          currency: 'USD',
          priceTableVersion: 'older-price-table',
          priceTableEffectiveAt: PRICE_TABLE.effectiveAt,
          assumptions: ['old'],
        },
      },
    );
    const harness = await storeHarness({
      runtimeBudget: stale,
      terminalSpecs: [{ status: 'completed' }],
      onCall: () => {
        calls += 1;
      },
      onIdentity: () => {
        identities += 1;
      },
    });
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration' });
    expect(calls).toBe(0);
    expect(identities).toBe(0);
    const final = await persisted(harness.host);
    expect(final.runtimeBudget.consumed.steps).toBe(0);
    expect(final.turnEntries).toEqual([]);
    expect(final.events.some((event) => event.type === 'turn_linked')).toBe(false);
  });

  it('blocks a frozen price-table effectiveAt-only mismatch before step/identity/turn_linked/provider', async () => {
    let calls = 0;
    let identities = 0;
    const stale = budget(
      { maxUsd: 5 },
      {
        costBasis: {
          currency: 'USD',
          priceTableVersion: PRICE_TABLE.version,
          priceTableEffectiveAt: '2026-01-01T00:00:00Z',
          assumptions: ['old'],
        },
      },
    );
    const harness = await storeHarness({
      runtimeBudget: stale,
      terminalSpecs: [{ status: 'completed' }],
      onCall: () => {
        calls += 1;
      },
      onIdentity: () => {
        identities += 1;
      },
    });
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration' });
    expect(calls).toBe(0);
    expect(identities).toBe(0);
    const final = await persisted(harness.host);
    expect(final.runtimeBudget.consumed.steps).toBe(0);
    expect(final.turnEntries).toEqual([]);
    expect(final.events.some((event) => event.type === 'turn_linked')).toBe(false);
  });

  it('makes route mismatch configuration win over a paid failed terminal and commits terminal/budget/failures together', async () => {
    const harness = await storeHarness({
      runtimeBudget: budget({ maxUsd: 5 }),
      terminalSpecs: [{
        status: 'failed',
        providerId: 'other-provider',
        modelId: 'other-model',
        usage: { inputTokens: 1_000, outputTokens: 1_000 },
      }],
    });
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration' });
    const final = await persisted(harness.host);
    expect(final.revision).toBe(3); // header → turn_linked → terminal + budget + both failure events
    expect(final.turnEntries).toHaveLength(1);
    expect(final.runtimeBudget.consumed).toMatchObject({
      estimatedUsd: 0,
      costCoverage: 'partial',
    });
    expect(final.events.slice(-2).map((event) => event.type)).toEqual(['step_failed', 'scenario_failed']);
    expect(final.events.at(-1)).toMatchObject({ type: 'scenario_failed', reason: 'configuration' });
  });

  it('makes known maxUsd overflow win over a provider failure and persists failed paid usage', async () => {
    const harness = await storeHarness({
      runtimeBudget: budget({ maxUsd: 0.01 }),
      terminalSpecs: [{
        status: 'failed',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      }],
    });
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'runtime_limit' });
    const final = await persisted(harness.host);
    expect(final.revision).toBe(3);
    expect(final.runtimeBudget.consumed.estimatedUsd).toBeCloseTo(9 / 7.1, 10);
    expect(final.events.slice(-2).map((event) => event.type)).toEqual(['step_failed', 'scenario_failed']);
    expect(final.events.at(-1)).toMatchObject({ type: 'scenario_failed', reason: 'runtime_limit' });
  });

  it('persists known usage for an ordinary failed paid terminal before propagating provider failure', async () => {
    const harness = await storeHarness({
      runtimeBudget: budget({ maxUsd: 5 }),
      terminalSpecs: [{
        status: 'failed',
        usage: { inputTokens: 1_000, outputTokens: 1_000 },
      }],
    });
    await expect(
      runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps),
    ).rejects.toBeInstanceOf(WorkTurnFailedError);
    const final = await persisted(harness.host);
    expect(final.runtimeBudget.consumed.estimatedUsd).toBeGreaterThan(0);
    expect(final.events.at(-1)).toMatchObject({ type: 'step_failed' });
  });

  it('rejects simultaneous durable budget and legacy limits before provider effect', async () => {
    let calls = 0;
    const harness = await storeHarness({
      terminalSpecs: [{ status: 'completed' }],
      onCall: () => {
        calls += 1;
      },
    });
    harness.deps.limits = { maxSteps: 1 };
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration' });
    expect(calls).toBe(0);
    expect((await persisted(harness.host)).events.at(-1)).toMatchObject({
      type: 'scenario_failed',
      reason: 'configuration',
    });
  });

  it('rejects a production budget without the frozen expected route before provider effect', async () => {
    let calls = 0;
    const harness = await storeHarness({
      terminalSpecs: [{ status: 'completed' }],
      onCall: () => {
        calls += 1;
      },
    });
    delete harness.deps.expectedModelRoute;
    const result = await runScenario(scenario(['test.One']), { inputArtifacts: {}, toolInputs: {} }, harness.deps);
    expect(result).toMatchObject({ status: 'failed', reason: 'configuration' });
    expect(calls).toBe(0);
    expect((await persisted(harness.host)).events.at(-1)).toMatchObject({
      type: 'scenario_failed',
      reason: 'configuration',
    });
  });
});
