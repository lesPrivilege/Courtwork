import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  createArtifactEnvelopeCodec,
  type ArtifactEnvelope,
  type ArtifactVersioningSource,
} from './artifact-envelope.js';
import { readWorkStateEnvelope, type WorkSessionRef, type WorkStateEnvelopeV1 } from './envelope.js';
import {
  StoredArtifactIsolatedError,
  createInMemoryWorkStateHost,
  loadWorkStateStore,
  type WorkStateHeader,
} from './work-state-store.js';

const REF: WorkSessionRef = { caseId: 'case-1', sessionId: 'session-1' };
const RiskSchema = z.object({ caseId: z.string().min(1), risks: z.array(z.unknown()) });

function versioning(): ArtifactVersioningSource {
  return {
    resolve(typeId) {
      if (typeId !== 'legal.RiskList') return undefined;
      return {
        packageId: 'legal',
        schemaVersion: 1,
        validate(payload) {
          const parsed = RiskSchema.safeParse(payload);
          return parsed.success ? { ok: true, value: parsed.data } : { ok: false, issues: parsed.error.message };
        },
      };
    },
  };
}

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

const RISK = { caseId: 'c1', risks: [{ id: 'risk-01' }] };

describe('WorkStateStore · ArtifactEnvelope 生产装配（ADR-010 决定三）', () => {
  it('注入 codec → commit 把 artifact_produced 持久为版本信封（payload 唯一真源）', async () => {
    const host = createInMemoryWorkStateHost();
    const codec = createArtifactEnvelopeCodec(versioning());
    const store = await loadWorkStateStore({ host, ref: REF, header: header(), artifactCodec: codec, now: () => '2026-07-15T00:00:00.000Z' });
    store.eventLog.append({ type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: RISK, evidenceGrades: [] });
    await store.commit();

    const read = await host.read(REF);
    expect(read.found).toBe(true);
    if (!read.found) return;
    const persisted = readWorkStateEnvelope(read.bytes);
    const produced = persisted.events.find((e) => e.type === 'artifact_produced');
    expect(produced?.type).toBe('artifact_produced');
    if (produced?.type !== 'artifact_produced') return;
    // 持久 artifact 字段是版本信封，不是裸 payload。
    expect(produced.artifact).toEqual({ packageId: 'legal', typeId: 'legal.RiskList', schemaVersion: 1, payload: RISK });
    // payload 只出现一次（信封内），持久字节里没有第二份裸 artifact 真源。
    const bytesText = new TextDecoder().decode(read.bytes);
    expect(bytesText.split('"risk-01"').length - 1).toBe(1);
  });

  it('write→reload round-trip（同 codec）复原原始 artifact', async () => {
    const host = createInMemoryWorkStateHost();
    const codec = createArtifactEnvelopeCodec(versioning());
    const store = await loadWorkStateStore({ host, ref: REF, header: header(), artifactCodec: codec });
    store.eventLog.append({ type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: RISK, evidenceGrades: [] });
    await store.commit();

    const revived = await loadWorkStateStore({ host, ref: REF, header: header(), artifactCodec: codec });
    const produced = revived.eventLog.list().find((e) => e.type === 'artifact_produced');
    expect(produced?.type).toBe('artifact_produced');
    if (produced?.type !== 'artifact_produced') return;
    expect(produced.artifactType).toBe('legal.RiskList');
    expect(produced.artifact).toEqual(RISK);
  });

  it('reload 未知 schemaVersion 信封 → fail-closed 抛 StoredArtifactIsolatedError（禁 raw fallback）', async () => {
    // 直接构造一份 artifact_produced.artifact 是未来版本信封的持久信封，模拟版本漂移。
    const host = createInMemoryWorkStateHost();
    const drifted: ArtifactEnvelope = { packageId: 'legal', typeId: 'legal.RiskList', schemaVersion: 999, payload: RISK };
    const envelope: WorkStateEnvelopeV1 = {
      storageVersion: 1,
      revision: 1,
      ...header(),
      events: [
        { sessionId: 'session-1', seq: 0, emittedAt: 't', type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: drifted, evidenceGrades: [] },
      ],
      turnEntries: [],
      pendingConfirmations: [],
      revisionEvents: [],
    };
    await host.compareAndSwap({ ref: REF, expectedVersion: null, bytes: new TextEncoder().encode(JSON.stringify(envelope)) });

    const codec = createArtifactEnvelopeCodec(versioning());
    await expect(loadWorkStateStore({ host, ref: REF, header: header(), artifactCodec: codec })).rejects.toBeInstanceOf(StoredArtifactIsolatedError);
  });

  it('不注入 codec → artifact 直存裸形（WORK-STORE-1 默认行为不变）', async () => {
    const host = createInMemoryWorkStateHost();
    const store = await loadWorkStateStore({ host, ref: REF, header: header() });
    store.eventLog.append({ type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: RISK, evidenceGrades: [] });
    await store.commit();
    const read = await host.read(REF);
    if (!read.found) throw new Error('unreachable');
    const persisted = readWorkStateEnvelope(read.bytes);
    const produced = persisted.events.find((e) => e.type === 'artifact_produced');
    if (produced?.type !== 'artifact_produced') throw new Error('unreachable');
    expect(produced.artifact).toEqual(RISK);
  });
});
