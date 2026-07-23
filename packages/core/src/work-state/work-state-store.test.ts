import { describe, expect, it, vi } from 'vitest';

import {
  CorruptEnvelopeError,
  HARD_ENVELOPE_LIMIT_BYTES,
  SOFT_ENVELOPE_LIMIT_BYTES,
  UnknownEnvelopeVersionError,
  type WorkSessionRef,
  type WorkStateEnvelopeV1,
} from './envelope.js';
import {
  WorkStateConflictError,
  WorkStateTooLargeError,
  createInMemoryWorkStateHost,
  loadWorkStateStore,
  type WorkStateHeader,
  type WorkStateHostPort,
} from './work-state-store.js';
import type { PendingConfirmation } from '../session/confirmation-store.js';
import type { PersistedTurn, TurnJournalEntry } from '../turn/types.js';

const REF: WorkSessionRef = { caseId: 'case-1', sessionId: 'session-1' };

function header(overrides: Partial<WorkStateHeader> = {}): WorkStateHeader {
  return {
    caseId: 'case-1',
    sessionId: 'session-1',
    chainId: 'session-1',
    scenarioId: 'legal.S3',
    packageId: 'legal',
    packageVersion: '0.1.0',
    schemaVersion: 1,
    scenarioFingerprint: 'legal.S3@1+' + '0'.repeat(64),
    modelRoute: { providerId: 'p', modelId: 'm', reasoning: 'standard' },
    materialRefs: ['a.pdf'],
    createdAt: '2026-07-15T00:00:00.000Z',
    runtimeBudget: {
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    },
    ...overrides,
  };
}

function pending(requestId: string): PendingConfirmation {
  return {
    requestId,
    sessionId: 'session-1',
    scenarioId: 'legal.S3',
    gateLabel: '风险确认',
    artifactType: 'legal.RiskList',
    producedArtifacts: { 'legal.RiskList': { risks: [] } },
    remainingArtifactTypes: [],
    toolResults: {},
    evidenceLedgerSnapshot: [],
    createdAt: '2026-07-15T00:00:00.000Z',
  };
}

async function freshStore(host: WorkStateHostPort, opts: Partial<Parameters<typeof loadWorkStateStore>[0]> = {}) {
  return loadWorkStateStore({ host, ref: REF, header: header(), now: () => '2026-07-15T00:00:00.000Z', ...opts });
}

describe('WorkStateStore whole-envelope CAS', () => {
  it('first commit writes with expectedVersion=null and mints a host generation', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host);
    store.eventLog.append({ type: 'progress', message: 'header' });
    const result = await store.commit();
    expect(result.revision).toBe(1);
    const read = await host.read(REF);
    expect(read.found).toBe(true);
    if (read.found) expect(read.version).toBe(result.version);
  });

  it('bumps envelope.revision monotonically per successful commit', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host);
    const a = await store.commit();
    store.eventLog.append({ type: 'progress', message: 'x' });
    const b = await store.commit();
    expect(a.revision).toBe(1);
    expect(b.revision).toBe(2);
  });

  it('restores all four ledger sections after a simulated restart (load from host)', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host);
    store.eventLog.append({ type: 'progress', message: 'p0' });
    store.confirmationStore.save(pending('req-1'));
    store.revisionStore.record({
      id: 'rev-1',
      timestamp: '2026-07-15T00:00:00.000Z',
      actor: { userId: 'u' },
      artifactType: 'legal.RiskList',
      artifactId: 'rl-1',
      fieldPath: '/risks/0/level',
      previousValue: 'low',
      newValue: 'high',
      sessionId: 'session-1',
    });
    await store.commit();

    const revived = await loadWorkStateStore({ host, ref: REF, header: header() });
    expect(revived.eventLog.list().map((e) => e.type)).toEqual(['progress']);
    expect(revived.confirmationStore.peek('req-1')?.pending.requestId).toBe('req-1');
    expect(revived.revisionStore.list().map((r) => r.id)).toEqual(['rev-1']);
    expect(revived.snapshot().sessionId).toBe('session-1');
  });

  it('lets a revived store continue committing on the persisted generation', async () => {
    const host = createInMemoryWorkStateHost();
    const first = await freshStore(host);
    await first.commit();
    const revived = await loadWorkStateStore({ host, ref: REF, header: header() });
    revived.eventLog.append({ type: 'scenario_completed' });
    const result = await revived.commit();
    expect(result.revision).toBe(2);
  });

  it('stages runtime consumption into the same envelope and restores it after reload', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host);
    store.runtimeBudget.stageConsumed({
      steps: 2,
      toolCalls: 1,
      executionMs: 1250,
      estimatedUsd: 0.25,
      costCoverage: 'partial',
    });
    await store.commit();
    const revived = await loadWorkStateStore({ host, ref: REF, header: header() });
    expect(revived.runtimeBudget.snapshot().consumed).toEqual({
      steps: 2,
      toolCalls: 1,
      executionMs: 1250,
      estimatedUsd: 0.25,
      costCoverage: 'partial',
    });
  });

  it('defensively copies header and returned budget snapshots', async () => {
    const host = createInMemoryWorkStateHost();
    const mutableHeader = header({
      runtimeBudget: {
        limits: { maxSteps: 3 },
        costBasis: {
          currency: 'USD',
          priceTableVersion: 'v1',
          priceTableEffectiveAt: '2026-07-24T00:00:00Z',
          assumptions: ['frozen'],
        },
        consumed: {
          steps: 0,
          toolCalls: 0,
          executionMs: 0,
          estimatedUsd: 0,
          costCoverage: 'complete',
        },
      },
    });
    const store = await loadWorkStateStore({ host, ref: REF, header: mutableHeader });
    mutableHeader.runtimeBudget.limits.maxSteps = 99;
    mutableHeader.runtimeBudget.costBasis.assumptions.push('mutated');
    mutableHeader.runtimeBudget.consumed.steps = 99;
    const leaked = store.runtimeBudget.snapshot();
    leaked.limits.maxSteps = 88;
    leaked.costBasis.assumptions.push('leaked');
    leaked.consumed.steps = 88;
    expect(store.runtimeBudget.snapshot()).toEqual({
      limits: { maxSteps: 3 },
      costBasis: {
        currency: 'USD',
        priceTableVersion: 'v1',
        priceTableEffectiveAt: '2026-07-24T00:00:00Z',
        assumptions: ['frozen'],
      },
      consumed: {
        steps: 0,
        toolCalls: 0,
        executionMs: 0,
        estimatedUsd: 0,
        costCoverage: 'complete',
      },
    });
  });

  it('rejects regression, partial-to-complete recovery, and invalid numbers before CAS', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host);
    expect(() => store.runtimeBudget.stageConsumed({
      ...store.runtimeBudget.snapshot().consumed,
      steps: -1,
    })).toThrow(CorruptEnvelopeError);
    store.runtimeBudget.stageConsumed({
      steps: 1,
      toolCalls: 0,
      executionMs: 1,
      estimatedUsd: 0,
      costCoverage: 'partial',
    });
    expect(() => store.runtimeBudget.stageConsumed({
      steps: 0,
      toolCalls: 0,
      executionMs: 1,
      estimatedUsd: 0,
      costCoverage: 'partial',
    })).toThrow(CorruptEnvelopeError);
    expect(() => store.runtimeBudget.stageConsumed({
      steps: 1,
      toolCalls: 0,
      executionMs: 1,
      estimatedUsd: 0,
      costCoverage: 'complete',
    })).toThrow(CorruptEnvelopeError);
  });
});

describe('concurrent CAS — loser fails explicitly, no silent overwrite', () => {
  it('two writers on the same generation: second commit throws WorkStateConflictError', async () => {
    const host = createInMemoryWorkStateHost();
    const seed = await freshStore(host);
    await seed.commit(); // generation g1 exists

    const writerA = await loadWorkStateStore({ host, ref: REF, header: header() });
    const writerB = await loadWorkStateStore({ host, ref: REF, header: header() });
    writerA.eventLog.append({ type: 'progress', message: 'A' });
    writerB.eventLog.append({ type: 'progress', message: 'B' });

    await writerA.commit();
    await expect(writerB.commit()).rejects.toBeInstanceOf(WorkStateConflictError);

    // the winner's bytes survive; the loser did not clobber
    const read = await host.read(REF);
    expect(read.found).toBe(true);
    if (read.found) {
      const persisted = JSON.parse(new TextDecoder().decode(read.bytes)) as WorkStateEnvelopeV1;
      expect(persisted.events.some((e) => e.type === 'progress' && e.message === 'A')).toBe(true);
      expect(persisted.events.some((e) => e.type === 'progress' && e.message === 'B')).toBe(false);
    }
  });

  it('two fresh writers racing the first write: only one applies', async () => {
    const host = createInMemoryWorkStateHost();
    const a = await freshStore(host);
    const b = await freshStore(host);
    a.eventLog.append({ type: 'progress', message: 'A' });
    b.eventLog.append({ type: 'progress', message: 'B' });
    await a.commit();
    await expect(b.commit()).rejects.toBeInstanceOf(WorkStateConflictError);
  });

  it('rolls staged consumption back to the last durable baseline when CAS loses', async () => {
    const host = createInMemoryWorkStateHost();
    const seed = await freshStore(host);
    await seed.commit();
    const winner = await loadWorkStateStore({ host, ref: REF, header: header() });
    const loser = await loadWorkStateStore({ host, ref: REF, header: header() });
    loser.runtimeBudget.stageConsumed({
      steps: 1,
      toolCalls: 0,
      executionMs: 10,
      estimatedUsd: 0,
      costCoverage: 'partial',
    });
    await winner.commit();
    await expect(loser.commit()).rejects.toBeInstanceOf(WorkStateConflictError);
    expect(loser.runtimeBudget.snapshot().consumed).toEqual(header().runtimeBudget.consumed);
  });
});

describe('size limits (measurement-pinned thresholds)', () => {
  it('soft 4 MiB: emits an explicit warning but the commit still applies', async () => {
    const onSoftLimitWarning = vi.fn();
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host, { onSoftLimitWarning });
    store.eventLog.append({ type: 'progress', message: 'x'.repeat(SOFT_ENVELOPE_LIMIT_BYTES + 1024) });
    const result = await store.commit();
    expect(result.softLimitWarning).toBe(true);
    expect(onSoftLimitWarning).toHaveBeenCalledTimes(1);
    expect(onSoftLimitWarning.mock.calls[0][0]).toMatchObject({ softLimitBytes: SOFT_ENVELOPE_LIMIT_BYTES });
    expect((await host.read(REF)).found).toBe(true); // applied despite warning
  });

  it('hard 16 MiB: fail-closed structured error and NO CAS reaches the host', async () => {
    const host = createInMemoryWorkStateHost();
    const casSpy = vi.spyOn(host, 'compareAndSwap');
    const store = await freshStore(host);
    await store.commit(); // one legit generation exists
    const casCallsBefore = casSpy.mock.calls.length;

    store.eventLog.append({ type: 'progress', message: 'y'.repeat(HARD_ENVELOPE_LIMIT_BYTES + 1024) });
    await expect(store.commit()).rejects.toBeInstanceOf(WorkStateTooLargeError);
    expect(casSpy.mock.calls.length).toBe(casCallsBefore); // no additional CAS attempted
  });

  it('does not warn below the soft limit', async () => {
    const onSoftLimitWarning = vi.fn();
    const host = createInMemoryWorkStateHost();
    const store = await freshStore(host, { onSoftLimitWarning });
    store.eventLog.append({ type: 'progress', message: 'small' });
    const result = await store.commit();
    expect(result.softLimitWarning).toBe(false);
    expect(onSoftLimitWarning).not.toHaveBeenCalled();
  });
});

describe('migration fail-closed on load', () => {
  it('refuses to load an unknown-version blob from the host', async () => {
    const host = createInMemoryWorkStateHost();
    await host.compareAndSwap({
      ref: REF,
      expectedVersion: null,
      bytes: new TextEncoder().encode(JSON.stringify({ storageVersion: 99 })),
    });
    await expect(loadWorkStateStore({ host, ref: REF, header: header() })).rejects.toBeInstanceOf(
      UnknownEnvelopeVersionError,
    );
  });
});

describe('interrupted attempts (turn_linked persisted, terminal absent)', () => {
  it('reports a linked turn with no matching terminal in turnEntries', async () => {
    const host = createInMemoryWorkStateHost();
    let entries: TurnJournalEntry[] = [];
    const store = await freshStore(host, { readTurnEntries: () => entries });
    store.eventLog.append({
      type: 'turn_linked',
      stepId: 'produce-legal.RiskList',
      artifactType: 'legal.RiskList',
      attempt: 1,
      turnId: 'turn-A',
      providerRequestId: 'req-A',
    });
    // no terminal for turn-A yet
    expect(store.interruptedTurns().map((t) => t.turnId)).toEqual(['turn-A']);

    // once the terminal lands in the turn journal, it is no longer interrupted
    const terminal: PersistedTurn = {
      turnId: 'turn-A',
      providerRequestId: 'req-A',
      providerId: 'p',
      modelId: 'm',
      reasoning: { status: 'absent' },
      status: 'completed',
      assistantMessage: '{}',
      finishReason: 'stop',
      completedAt: '2026-07-15T00:00:00.000Z',
    };
    entries = [terminal];
    expect(store.interruptedTurns()).toEqual([]);
  });
});
