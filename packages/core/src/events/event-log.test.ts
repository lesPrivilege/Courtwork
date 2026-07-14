import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEventLog, createFileEventLog, replaySession } from './event-log.js';
import type { SessionEvent } from './types.js';

describe('createEventLog (in-memory)', () => {
  it('assigns a monotonic seq starting at 0 and stamps sessionId/emittedAt', () => {
    const log = createEventLog('session-1', () => '2026-07-10T00:00:00.000Z');
    const first = log.append({ type: 'progress', message: 'starting' });
    const second = log.append({ type: 'progress', message: 'still going' });
    expect(first).toEqual({ type: 'progress', message: 'starting', sessionId: 'session-1', seq: 0, emittedAt: '2026-07-10T00:00:00.000Z' });
    expect(second.seq).toBe(1);
  });

  it('list() returns a defensive copy', () => {
    const log = createEventLog('session-1');
    log.append({ type: 'progress', message: 'a' });
    const snapshot = log.list();
    snapshot.push({ type: 'progress', message: 'injected', sessionId: 'x', seq: 99, emittedAt: 'x' });
    expect(log.list()).toHaveLength(1);
  });
});

describe('createFileEventLog (durable, simulates cross-process resume)', () => {
  it('a fresh instance pointed at the same file sees everything a prior instance appended', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-eventlog-'));
    const filePath = join(dir, 'events.jsonl');
    try {
      const first = createFileEventLog('session-1', filePath, () => '2026-07-10T00:00:00.000Z');
      first.append({ type: 'progress', message: 'from first instance' });

      const second = createFileEventLog('session-1', filePath, () => '2026-07-10T00:01:00.000Z');
      second.append({ type: 'scenario_completed' });

      const events = second.list();
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({ type: 'progress', message: 'from first instance', seq: 0 });
      expect(events[1]).toMatchObject({ type: 'scenario_completed', seq: 1 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('replaySession', () => {
  it('reconstructs produced artifacts, confirmation outcomes, revision ids, and completion purely from events', () => {
    const summary = replaySession([
      { type: 'artifact_produced', artifactType: 'RiskList', artifact: { caseId: 'c1', risks: [] }, evidenceGrades: [], sessionId: 's', seq: 0, emittedAt: 't0' },
      { type: 'confirmation_requested', requestId: 'req-1', gateLabel: '确认', artifactType: 'RiskList', sessionId: 's', seq: 1, emittedAt: 't1' },
      {
        type: 'confirmation_resolved',
        requestId: 'req-1',
        actor: { channelId: 'cli', actorId: 'u1' },
        decision: 'confirm',
        sessionId: 's',
        seq: 2,
        emittedAt: 't2',
      },
      { type: 'revision_recorded', revisionEventId: 'rev-1', sessionId: 's', seq: 3, emittedAt: 't3' },
      { type: 'scenario_completed', sessionId: 's', seq: 4, emittedAt: 't4' },
    ]);
    expect(summary.artifacts.RiskList).toEqual({ caseId: 'c1', risks: [] });
    expect(summary.confirmations['req-1']).toEqual({ actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' });
    expect(summary.revisionEventIds).toEqual(['rev-1']);
    expect(summary.completed).toBe(true);
  });

  it('collects step_failed events and tracks the latest todo_snapshot', () => {
    const summary = replaySession([
      {
        type: 'todo_snapshot',
        steps: [{ stepId: 'produce-RiskList', artifactType: 'RiskList', label: '确认风险清单', status: 'pending' }],
        sessionId: 's',
        seq: 0,
        emittedAt: 't0',
      },
      { type: 'step_failed', scope: 'tool', toolId: 'party-verify', reason: 'timeout', message: '超时', sessionId: 's', seq: 1, emittedAt: 't1' },
      {
        type: 'todo_snapshot',
        steps: [{ stepId: 'produce-RiskList', artifactType: 'RiskList', label: '确认风险清单', status: 'awaiting_confirmation' }],
        sessionId: 's',
        seq: 2,
        emittedAt: 't2',
      },
    ]);
    expect(summary.failedSteps).toEqual([{ scope: 'tool', toolId: 'party-verify', reason: 'timeout', message: '超时' }]);
    expect(summary.latestTodoSnapshot).toEqual([{ stepId: 'produce-RiskList', artifactType: 'RiskList', label: '确认风险清单', status: 'awaiting_confirmation' }]);
  });

  it('completed is false when no scenario_completed event is present', () => {
    const summary = replaySession([{ type: 'progress', message: 'x', sessionId: 's', seq: 0, emittedAt: 't0' }]);
    expect(summary.completed).toBe(false);
  });

  it('replays ordered linked turns and both legacy tool and model failures', () => {
    const events: SessionEvent[] = [
      { type: 'turn_linked', stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 1, turnId: 'turn-1', providerRequestId: 'provider-1', sessionId: 's', seq: 0, emittedAt: 't0' },
      { type: 'step_failed', scope: 'tool', toolId: 'party-verify', reason: 'timeout', message: '超时', sessionId: 's', seq: 1, emittedAt: 't1' },
      { type: 'turn_linked', stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 2, turnId: 'turn-2', providerRequestId: 'provider-2', sessionId: 's', seq: 2, emittedAt: 't2' },
      { type: 'step_failed', scope: 'model', stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 2, turnId: 'turn-2', providerRequestId: 'provider-2', reason: 'rate_limit', message: '稍后重试', retryable: true, sessionId: 's', seq: 3, emittedAt: 't3' },
    ];

    expect(replaySession(events)).toMatchObject({
      linkedTurns: [
        { stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 1, turnId: 'turn-1', providerRequestId: 'provider-1' },
        { stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 2, turnId: 'turn-2', providerRequestId: 'provider-2' },
      ],
      failedSteps: [
        { scope: 'tool', toolId: 'party-verify', reason: 'timeout', message: '超时' },
        { scope: 'model', stepId: 'produce-risk', artifactType: 'legal.RiskList', attempt: 2, turnId: 'turn-2', providerRequestId: 'provider-2', reason: 'rate_limit', message: '稍后重试', retryable: true },
      ],
    });
  });
});
