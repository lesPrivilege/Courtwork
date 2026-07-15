import { describe, expect, it } from 'vitest';

import {
  CorruptEnvelopeError,
  HARD_ENVELOPE_LIMIT_BYTES,
  SOFT_ENVELOPE_LIMIT_BYTES,
  UnknownEnvelopeVersionError,
  readWorkStateEnvelope,
  serializeWorkStateEnvelope,
  type WorkStateEnvelopeV1,
} from './envelope.js';

function baseEnvelope(overrides: Partial<WorkStateEnvelopeV1> = {}): WorkStateEnvelopeV1 {
  return {
    storageVersion: 1,
    revision: 3,
    caseId: 'case-1',
    sessionId: 'session-1',
    chainId: 'session-1',
    scenarioId: 'legal.S3',
    packageId: 'legal',
    packageVersion: '0.1.0',
    schemaVersion: 1,
    scenarioFingerprint: 'legal.S3@1+' + '0'.repeat(64),
    modelRoute: { providerId: 'p', modelId: 'm', reasoning: 'standard' },
    materialRefs: ['a.pdf', 'b.md'],
    createdAt: '2026-07-15T00:00:00.000Z',
    runtimeBudget: {
      limits: { maxSteps: 32 },
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 1, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    },
    events: [{ type: 'progress', sessionId: 'session-1', seq: 0, emittedAt: '2026-07-15T00:00:00.000Z', message: 'hi' }],
    turnEntries: [],
    pendingConfirmations: [],
    revisionEvents: [],
    ...overrides,
  };
}

describe('WorkStateEnvelopeV1 serialize/read', () => {
  it('round-trips a whole envelope byte-for-byte and value-for-value', () => {
    const env = baseEnvelope();
    const bytes = serializeWorkStateEnvelope(env);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const back = readWorkStateEnvelope(bytes);
    expect(back).toEqual(env);
    // deterministic: same input → identical bytes
    expect(serializeWorkStateEnvelope(env)).toEqual(bytes);
  });

  it('preserves optional predecessorSessionId when present', () => {
    const env = baseEnvelope({ predecessorSessionId: 'session-0' });
    expect(readWorkStateEnvelope(serializeWorkStateEnvelope(env)).predecessorSessionId).toBe('session-0');
  });
});

describe('migration fail-closed (versioned envelope old-version read-in path)', () => {
  it('rejects an unknown future storageVersion instead of reading it', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...baseEnvelope(), storageVersion: 2 }));
    expect(() => readWorkStateEnvelope(bytes)).toThrow(UnknownEnvelopeVersionError);
  });

  it('rejects a missing storageVersion (no silent default to v1)', () => {
    const withoutVersion: Record<string, unknown> = { ...baseEnvelope() };
    delete withoutVersion.storageVersion;
    const bytes = new TextEncoder().encode(JSON.stringify(withoutVersion));
    expect(() => readWorkStateEnvelope(bytes)).toThrow(UnknownEnvelopeVersionError);
  });
});

describe('corruption fail-closed', () => {
  it('rejects non-JSON bytes', () => {
    const bytes = new TextEncoder().encode('{not json at all');
    expect(() => readWorkStateEnvelope(bytes)).toThrow(CorruptEnvelopeError);
  });

  it('rejects a v1 envelope whose ledger sections are not arrays', () => {
    const broken = { ...baseEnvelope(), events: { nope: true } as unknown };
    const bytes = new TextEncoder().encode(JSON.stringify(broken));
    expect(() => readWorkStateEnvelope(bytes)).toThrow(CorruptEnvelopeError);
  });

  it('rejects a v1 envelope missing required metadata (sessionId)', () => {
    const broken: Record<string, unknown> = { ...baseEnvelope() };
    delete broken.sessionId;
    const bytes = new TextEncoder().encode(JSON.stringify(broken));
    expect(() => readWorkStateEnvelope(bytes)).toThrow(CorruptEnvelopeError);
  });
});

describe('size limit constants (ADR-010 measurement thresholds)', () => {
  it('pins soft 4 MiB and hard 16 MiB', () => {
    expect(SOFT_ENVELOPE_LIMIT_BYTES).toBe(4 * 1024 * 1024);
    expect(HARD_ENVELOPE_LIMIT_BYTES).toBe(16 * 1024 * 1024);
  });
});
