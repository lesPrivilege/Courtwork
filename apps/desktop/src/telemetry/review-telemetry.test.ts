import { describe, expect, it, vi } from 'vitest';
import type { ReviewTelemetryEvent } from '../protocol/client';
import { createReviewTelemetryEmitter } from './review-telemetry';

const EVENTS: ReviewTelemetryEvent[] = [
  { type: 'review_item_opened', sessionId: 's3', itemRef: 'risk-01', emittedAt: '2026-07-13T00:00:00.000Z' },
  {
    type: 'review_evidence_expanded',
    sessionId: 's3',
    itemRef: 'risk-01',
    evidenceRef: 'anchor-01',
    emittedAt: '2026-07-13T00:00:01.000Z',
  },
  {
    type: 'review_disposition_submitted',
    sessionId: 's3',
    itemRef: 'risk-01',
    disposition: 'confirm',
    emittedAt: '2026-07-13T00:00:02.000Z',
  },
];

describe('createReviewTelemetryEmitter', () => {
  it('关闭时三类发射点对真实 sink 都是零事件', () => {
    const sink = vi.fn<(event: ReviewTelemetryEvent) => void>();
    const emit = createReviewTelemetryEmitter(sink, () => false);

    for (const event of EVENTS) emit(event);

    expect(sink).not.toHaveBeenCalled();
  });

  it('每次发射都重读开关，关闭后立即断路且重新开启后恢复', () => {
    let enabled = true;
    const sink = vi.fn<(event: ReviewTelemetryEvent) => void>();
    const readEnabled = vi.fn(() => enabled);
    const emit = createReviewTelemetryEmitter(sink, readEnabled);

    emit(EVENTS[0]);
    enabled = false;
    emit(EVENTS[1]);
    enabled = true;
    emit(EVENTS[2]);

    expect(readEnabled).toHaveBeenCalledTimes(3);
    expect(sink.mock.calls.map(([event]) => event.type)).toEqual([
      'review_item_opened',
      'review_disposition_submitted',
    ]);
  });
});
