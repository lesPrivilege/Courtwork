import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInMemoryConfirmationStore, type PendingConfirmation } from './confirmation-store.js';
import { createFileConfirmationStore } from './confirmation-store-file.js';

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

  it('reads and consumes a legacy pending JSON file that has no version field or tombstone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      writeFileSync(join(dir, 'req-legacy.json'), JSON.stringify(samplePending('req-legacy')), 'utf-8');

      const freshStore = createFileConfirmationStore(dir);
      const snapshot = freshStore.peek('req-legacy');
      expect(snapshot?.pending).toEqual(samplePending('req-legacy'));
      expect(snapshot && freshStore.consume('req-legacy', snapshot.version)).toEqual(samplePending('req-legacy'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a payload-free tombstone, masks a crash-window pending file, and blocks deprecated take() resurrection', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const store = createFileConfirmationStore(dir);
      const pending = {
        ...samplePending('req-1'),
        materials: [{ fileId: 'secret-file', sha256: 'secret-sha', readingMarkdown: 'TOP-SECRET-ARTIFACT' }],
      };
      store.save(pending);
      expect(store.take('req-1')).toEqual(pending);

      const tombstonePath = join(dir, 'req-1.consumed');
      const tombstone = readFileSync(tombstonePath, 'utf-8');
      expect(tombstone).not.toContain('TOP-SECRET-ARTIFACT');
      expect(tombstone).not.toContain('secret-file');
      expect(Object.keys(JSON.parse(tombstone) as Record<string, unknown>).sort()).toEqual(['requestId', 'version']);
      expect(existsSync(join(dir, 'req-1.json'))).toBe(false);

      // 模拟 marker 已提交、pending 清理前崩溃：旧载荷即使仍在，也不能重新可见或被覆盖。
      writeFileSync(join(dir, 'req-1.json'), JSON.stringify(pending), 'utf-8');
      const afterCrash = createFileConfirmationStore(dir);
      expect(afterCrash.peek('req-1')).toBeUndefined();
      expect(afterCrash.take('req-1')).toBeUndefined();
      expect(() => afterCrash.save(pending)).toThrow(/req-1/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
