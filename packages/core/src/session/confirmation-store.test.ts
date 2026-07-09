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
  it('save then take round-trips the pending confirmation', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    expect(store.take('req-1')).toEqual(samplePending('req-1'));
  });

  it('take() removes the entry — a second take() returns undefined', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    store.take('req-1');
    expect(store.take('req-1')).toBeUndefined();
  });

  it('take() on an unknown requestId returns undefined', () => {
    const store = createInMemoryConfirmationStore();
    expect(store.take('never-saved')).toBeUndefined();
  });
});

describe('createFileConfirmationStore (durable, simulates cross-process resume)', () => {
  it('a fresh instance pointed at the same directory can take() what a prior instance saved', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));

      const reader = createFileConfirmationStore(dir);
      expect(reader.take('req-1')).toEqual(samplePending('req-1'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('take() deletes the backing file so a second take() (even via a new instance) returns undefined', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));
      writer.take('req-1');
      const reader = createFileConfirmationStore(dir);
      expect(reader.take('req-1')).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
