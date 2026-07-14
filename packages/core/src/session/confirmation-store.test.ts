import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileConfirmationStore, createInMemoryConfirmationStore, type PendingConfirmation } from './confirmation-store.js';

function samplePending(requestId: string): PendingConfirmation {
  return {
    requestId,
    sessionId: 'session-1',
    scenarioId: 'S3',
    gateLabel: '确认风险清单',
    artifactType: 'RiskList',
    producedArtifacts: { RiskList: { caseId: 'c1', risks: [] } },
    remainingArtifactTypes: [],
    toolResults: { 'party-verify': { verified: true, source: 'demo-fixture' } },
    evidenceLedgerSnapshot: [{ key: 'party-verify', grade: 'B', sourceId: 'demo-fixture', confirmed: false }],
    createdAt: '2026-07-10T00:00:00.000Z',
  };
}

describe('createInMemoryConfirmationStore', () => {
  it('save then peek/consume round-trips the pending confirmation without consuming during peek', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    const snapshot = store.peek('req-1');
    expect(snapshot?.pending).toEqual(samplePending('req-1'));
    expect(store.peek('req-1')).toEqual(snapshot);
    expect(snapshot && store.consume('req-1', snapshot.version)).toEqual(samplePending('req-1'));
  });

  it('consume() is expected-version conditional and first-wins', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    const snapshot = store.peek('req-1');
    if (!snapshot) throw new Error('expected pending snapshot');

    expect(store.consume('req-1', 'stale-version')).toBeUndefined();
    expect(store.peek('req-1')).toEqual(snapshot);
    expect(store.consume('req-1', snapshot.version)).toEqual(samplePending('req-1'));
    expect(store.consume('req-1', snapshot.version)).toBeUndefined();
    expect(store.peek('req-1')).toBeUndefined();
  });

  it('rejects a duplicate requestId without replacing the original pending value', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    const replacement = { ...samplePending('req-1'), sessionId: 'replacement-session' };

    expect(() => store.save(replacement)).toThrow(/req-1/);
    expect(store.peek('req-1')?.pending).toEqual(samplePending('req-1'));

    const snapshot = store.peek('req-1');
    if (!snapshot) throw new Error('expected pending snapshot');
    store.consume('req-1', snapshot.version);
    expect(() => store.save(samplePending('req-1'))).toThrow(/req-1/);
    expect(store.peek('req-1')).toBeUndefined();
  });

  it('peek()/consume() on an unknown requestId returns undefined', () => {
    const store = createInMemoryConfirmationStore();
    expect(store.peek('never-saved')).toBeUndefined();
    expect(store.consume('never-saved', 'any-version')).toBeUndefined();
  });
});

describe('createFileConfirmationStore (durable, simulates cross-process resume)', () => {
  it('a fresh instance pointed at the same directory can peek/consume what a prior instance saved', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));

      const reader = createFileConfirmationStore(dir);
      const snapshot = reader.peek('req-1');
      expect(snapshot?.pending).toEqual(samplePending('req-1'));
      expect(snapshot && reader.consume('req-1', snapshot.version)).toEqual(samplePending('req-1'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('expected-version consumption is first-wins across fresh instances', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));
      const firstReader = createFileConfirmationStore(dir);
      const secondReader = createFileConfirmationStore(dir);
      const snapshot = firstReader.peek('req-1');
      if (!snapshot) throw new Error('expected pending snapshot');

      expect(secondReader.consume('req-1', 'stale-version')).toBeUndefined();
      expect(secondReader.peek('req-1')).toEqual(snapshot);
      expect(firstReader.consume('req-1', snapshot.version)).toEqual(samplePending('req-1'));
      expect(secondReader.consume('req-1', snapshot.version)).toBeUndefined();
      expect(createFileConfirmationStore(dir).peek('req-1')).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate saves before and after consumption without replacing or resurrecting the request', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));
      expect(() => createFileConfirmationStore(dir).save({ ...samplePending('req-1'), sessionId: 'replacement-session' })).toThrow(/req-1/);
      expect(writer.peek('req-1')?.pending).toEqual(samplePending('req-1'));

      const snapshot = writer.peek('req-1');
      if (!snapshot) throw new Error('expected pending snapshot');
      writer.consume('req-1', snapshot.version);
      expect(() => createFileConfirmationStore(dir).save(samplePending('req-1'))).toThrow(/req-1/);
      expect(createFileConfirmationStore(dir).peek('req-1')).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
