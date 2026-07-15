import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readWorkStateEnvelope, type WorkSessionRef, type WorkStateEnvelopeV1 } from './envelope.js';
import { createFileWorkStateHost } from './work-state-host-file.js';
import { loadWorkStateStore } from './work-state-store.js';

const REF: WorkSessionRef = { caseId: 'case-1', sessionId: 'session-1' };

function completeEnvelope(revision: number): WorkStateEnvelopeV1 {
  return {
    storageVersion: 1,
    revision,
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
    events: [{ type: 'progress', sessionId: 'session-1', seq: 0, emittedAt: '2026-07-15T00:00:00.000Z', message: 'x'.repeat(4096) }],
    turnEntries: [],
    pendingConfirmations: [],
    revisionEvents: [],
  };
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'courtwork-work-store-host-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('createFileWorkStateHost — atomic replace + F_FULLFSYNC round-trip', () => {
  it('CAS from null mints a generation and read returns the exact bytes', async () => {
    const host = createFileWorkStateHost(dir);
    const bytes = new TextEncoder().encode(JSON.stringify(completeEnvelope(1)));
    const cas = await host.compareAndSwap({ ref: REF, expectedVersion: null, bytes });
    expect(cas.applied).toBe(true);
    const read = await host.read(REF);
    expect(read.found).toBe(true);
    if (read.found) {
      expect(read.version).toBe(cas.version);
      expect(new TextDecoder().decode(read.bytes)).toBe(new TextDecoder().decode(bytes));
    }
  });

  it('rejects a stale expectedVersion (no clobber of the newer generation)', async () => {
    const host = createFileWorkStateHost(dir);
    const first = await host.compareAndSwap({ ref: REF, expectedVersion: null, bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(1))) });
    await host.compareAndSwap({ ref: REF, expectedVersion: first.version, bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(2))) });
    const stale = await host.compareAndSwap({ ref: REF, expectedVersion: first.version, bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(999))) });
    expect(stale.applied).toBe(false);
    const read = await host.read(REF);
    if (read.found) expect(readWorkStateEnvelope(read.bytes).revision).toBe(2);
  });

  it('generation persists across a fresh host instance on the same dir (monotonic, restart-safe)', async () => {
    const first = await createFileWorkStateHost(dir).compareAndSwap({ ref: REF, expectedVersion: null, bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(1))) });
    const revived = createFileWorkStateHost(dir);
    const read = await revived.read(REF);
    expect(read.found && read.version).toBe(first.version);
    const next = await revived.compareAndSwap({ ref: REF, expectedVersion: first.version, bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(2))) });
    expect(next.applied).toBe(true);
    expect(next.version).not.toBe(first.version);
  });

  it('encodes ref ids so a traversal-shaped id cannot escape the dir', async () => {
    const host = createFileWorkStateHost(dir);
    const evil: WorkSessionRef = { caseId: '../escape', sessionId: 'a/b' };
    await host.compareAndSwap({ ref: evil, expectedVersion: null, bytes: new TextEncoder().encode('{}') });
    // everything the host wrote stays inside dir: encoded filenames carry no path separator
    expect(readdirSync(dir).every((name) => !name.includes('/') && !name.includes('\\'))).toBe(true);
    expect((await host.read(evil)).found).toBe(true);
  });
});

describe('restart recovery through the store (durable-before-effect, no kill)', () => {
  it('a paused envelope committed to disk is fully continuable from a fresh host', async () => {
    const host = createFileWorkStateHost(dir);
    const store = await loadWorkStateStore({
      host,
      ref: REF,
      header: {
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
        runtimeBudget: { limits: {}, costBasis: { currency: 'USD', assumptions: [] }, consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' } },
      },
      now: () => '2026-07-15T00:00:00.000Z',
    });
    store.eventLog.append({ type: 'confirmation_requested', requestId: 'req-1', gateLabel: 'g', artifactType: 'legal.RiskList' });
    store.confirmationStore.save({
      requestId: 'req-1',
      sessionId: 'session-1',
      scenarioId: 'legal.S3',
      gateLabel: 'g',
      artifactType: 'legal.RiskList',
      producedArtifacts: { 'legal.RiskList': { risks: [{ id: 'r-1' }] } },
      remainingArtifactTypes: [],
      toolResults: {},
      evidenceLedgerSnapshot: [],
      createdAt: '2026-07-15T00:00:00.000Z',
      materials: [{ fileId: 'f', sha256: 'h', readingMarkdown: 'body' }],
    });
    await store.commit();

    // fresh host + fresh store on the same dir == a new process reopening the case
    const revived = await loadWorkStateStore({ host: createFileWorkStateHost(dir), ref: REF, header: store.snapshot() as never });
    const peeked = revived.confirmationStore.peek('req-1');
    expect(peeked?.pending.materials?.[0].readingMarkdown).toBe('body');
    expect(revived.eventLog.list().map((e) => e.type)).toEqual(['confirmation_requested']);
  });
});

describe('crash window — in-flight CAS killed with SIGKILL leaves a complete prior version', () => {
  // child imports the real host from SOURCE, transpiled by tsx (no build dependency)
  const writerSrcPath = fileURLToPath(new URL('./work-state-host-file.ts', import.meta.url));
  const worktreeRoot = fileURLToPath(new URL('../../../../', import.meta.url));

  async function oneTrial(trial: number): Promise<{ complete: boolean; killedBySig: boolean }> {
    const trialDir = mkdtempSync(join(tmpdir(), `courtwork-host-crash-${trial}-`));
    try {
      // seed a complete v0 through the real host so the target exists before the hammering child
      await createFileWorkStateHost(trialDir).compareAndSwap({
        ref: REF,
        expectedVersion: null,
        bytes: new TextEncoder().encode(JSON.stringify(completeEnvelope(0))),
      });
      const child = spawn(process.execPath, ['--import', 'tsx', CHILD_SCRIPT, writerSrcPath, trialDir], {
        cwd: worktreeRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const killedBySig = await new Promise<boolean>((resolve) => {
        let buf = '';
        const delay = 3 + Math.floor(Math.random() * 28);
        const doKill = () => { try { process.kill(child.pid!, 'SIGKILL'); } catch { /* already gone */ } };
        child.stdout!.on('data', (d) => { buf += String(d); if (buf.includes('ready')) setTimeout(doKill, delay); });
        setTimeout(doKill, 400 + delay);
        child.on('exit', (_code, signal) => resolve(signal === 'SIGKILL'));
      });
      const read = await createFileWorkStateHost(trialDir).read(REF);
      let complete = false;
      if (read.found) {
        try {
          readWorkStateEnvelope(read.bytes); // throws CorruptEnvelopeError if torn
          complete = true;
        } catch { complete = false; }
      }
      return { complete, killedBySig };
    } finally {
      rmSync(trialDir, { recursive: true, force: true });
    }
  }

  it('never observes a torn envelope across repeated real SIGKILLs', async () => {
    const trials = 6;
    let killed = 0;
    for (let t = 0; t < trials; t += 1) {
      const { complete, killedBySig } = await oneTrial(t);
      expect(complete).toBe(true); // atomic replace: target is always some complete version
      if (killedBySig) killed += 1;
    }
    expect(killed).toBeGreaterThan(0); // the SIGKILLs actually landed at least sometimes
  }, 30000);
});

// Child hammering script (run via tsx). Imports the real host by absolute path and CAS-writes
// ever-larger complete envelopes in a tight loop until SIGKILL. Written to disk at import time.
const CHILD_SCRIPT = join(mkdtempSync(join(tmpdir(), 'courtwork-host-child-')), 'writer.mjs');
writeFileSync(
  CHILD_SCRIPT,
  `
import { pathToFileURL } from 'node:url';
const [hostPath, dir] = process.argv.slice(2);
const { createFileWorkStateHost } = await import(pathToFileURL(hostPath).href);
const ref = { caseId: 'case-1', sessionId: 'session-1' };
const host = createFileWorkStateHost(dir);
function envelope(rev) {
  return { storageVersion: 1, revision: rev, caseId: 'case-1', sessionId: 'session-1', chainId: 'session-1',
    scenarioId: 'legal.S3', packageId: 'legal', packageVersion: '0.1.0', schemaVersion: 1,
    scenarioFingerprint: 'legal.S3@1+' + '0'.repeat(64),
    modelRoute: { providerId: 'p', modelId: 'm', reasoning: 'standard' }, materialRefs: ['a.pdf'],
    createdAt: '2026-07-15T00:00:00.000Z',
    runtimeBudget: { limits: {}, costBasis: { currency: 'USD', assumptions: [] }, consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' } },
    events: [{ type: 'progress', sessionId: 'session-1', seq: 0, emittedAt: '2026-07-15T00:00:00.000Z', message: 'E'.repeat(4096 + rev * 32) }],
    turnEntries: [], pendingConfirmations: [], revisionEvents: [] };
}
let rev = 1;
process.stdout.write('ready\\n');
for (;;) {
  const cur = await host.read(ref);
  const bytes = new TextEncoder().encode(JSON.stringify(envelope(rev)));
  await host.compareAndSwap({ ref, expectedVersion: cur.found ? cur.version : null, bytes });
  rev += 1;
}
`,
  'utf-8',
);
