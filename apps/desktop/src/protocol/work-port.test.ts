import { describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { DEMO_CASE_ID } from '../case/case-scope.js';
import {
  DEMO_S1_SESSION_ID,
  DEMO_S3_SESSION_ID,
  createDemoWorkFixture,
} from '../demo/client.js';
import type { WorkProjectionPort } from './client.js';
import { replayWorkProjection } from './work-replay.js';

describe('WORK-PORT-1 fixture boundary', () => {
  it('accepts only the fixed demo case/session pairs and carries the full session ref', async () => {
    const fixture = createDemoWorkFixture({ replayDelayMs: 0 });

    const s3 = await fixture.projection.replay({ caseId: DEMO_CASE_ID, sessionId: DEMO_S3_SESSION_ID });
    expect(s3.ref).toEqual({ caseId: DEMO_CASE_ID, sessionId: DEMO_S3_SESSION_ID });
    expect(s3.phase).toBe('paused');
    expect(s3.events.map((event) => event.sessionId)).toEqual(
      Array.from({ length: s3.events.length }, () => DEMO_S3_SESSION_ID),
    );

    const s1Tail = await fixture.projection.replay({
      caseId: DEMO_CASE_ID,
      sessionId: DEMO_S1_SESSION_ID,
      afterSeq: 5,
    });
    expect(s1Tail.events.every((event) => event.seq > 5)).toBe(true);

    await expect(fixture.projection.replay({
      caseId: 'case-real',
      sessionId: DEMO_S3_SESSION_ID,
    })).rejects.toThrow(/demo fixture/i);
    await expect(fixture.projection.replay({
      caseId: DEMO_CASE_ID,
      sessionId: 'session-from-another-case',
    })).rejects.toThrow(/demo fixture/i);
  });

  it('keeps paced publication in the fixture adapter while accepting an injected projection', async () => {
    const events: SessionEvent[] = [{
      type: 'progress',
      sessionId: DEMO_S3_SESSION_ID,
      seq: 1,
      emittedAt: '2026-07-14T00:00:00.000Z',
      message: 'fake projection event',
    }];
    const projection: WorkProjectionPort = {
      replay: vi.fn(async (query) => ({
        ref: { caseId: query.caseId, sessionId: query.sessionId },
        phase: 'running' as const,
        events,
      })),
    };
    const publish = vi.fn<(event: SessionEvent) => void>();
    const presenter = vi.fn(async (projected: SessionEvent[], sink: (event: SessionEvent) => void) => {
      projected.forEach((event) => sink(event));
    });

    const result = await replayWorkProjection(
      projection,
      presenter,
      { caseId: DEMO_CASE_ID, sessionId: DEMO_S3_SESSION_ID },
      publish,
    );

    expect(projection.replay).toHaveBeenCalledWith({ caseId: DEMO_CASE_ID, sessionId: DEMO_S3_SESSION_ID });
    expect(presenter).toHaveBeenCalledWith(events, publish);
    expect(publish).toHaveBeenCalledWith(events[0]);
    expect(result.phase).toBe('running');
  });

  it('rejects review, continuation, telemetry and artifact lookup outside the demo ref', async () => {
    const fixture = createDemoWorkFixture({ replayDelayMs: 0 });
    const realRef = { caseId: 'case-real', sessionId: DEMO_S3_SESSION_ID };

    await expect(fixture.review.getGateProjection({
      ...realRef,
      requestId: 'demo-s3-risk-gate',
    })).rejects.toThrow(/demo fixture/i);
    await expect(fixture.continuation.continueSession(realRef)).rejects.toThrow(/demo fixture/i);
    expect(() => fixture.telemetry.emit(realRef, {
      type: 'review_item_opened',
      sessionId: DEMO_S3_SESSION_ID,
      itemRef: 'risk-01',
      emittedAt: '2026-07-14T00:00:00.000Z',
    })).toThrow(/demo fixture/i);
    expect(() => fixture.artifactFor(realRef, 'legal.RiskList')).toThrow(/demo fixture/i);
  });
});
