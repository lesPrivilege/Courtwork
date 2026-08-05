import { describe, expect, it } from 'vitest';

import { createRecordCoalescer } from './pi-stream';

/** 可手动推进的假帧钟：帧不会自己来，故「合并了几次」是可断言的事实而非时序赌博。 */
function fakeFrames() {
  let next = 1;
  const queued = new Map<number, () => void>();
  return {
    schedule(callback: () => void) {
      const handle = next;
      next += 1;
      queued.set(handle, callback);
      return handle;
    },
    cancel(handle: number) {
      queued.delete(handle);
    },
    pending() {
      return queued.size;
    },
    tick() {
      const entries = [...queued.entries()];
      queued.clear();
      for (const [, callback] of entries) callback();
    },
  };
}

function record(seq: number, type: string, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    eventId: `event_${seq}`,
    seq,
    containerId: 'cnt-1',
    sessionId: 'sess-1',
    leg: 1,
    requestId: 'req-1',
    type,
    recordedAt: seq,
    payload,
  });
}

const DELTA = (seq: number, delta: string) =>
  record(seq, 'agent_event', { kind: 'assistant_text_delta', delta });

describe('createRecordCoalescer', () => {
  it('一帧内到达的多枚记录合并成一次交付', () => {
    const frames = fakeFrames();
    const deliveries: string[][] = [];
    const coalescer = createRecordCoalescer({
      deliver: (lines) => deliveries.push(lines),
      schedule: frames.schedule,
      cancel: frames.cancel,
    });

    coalescer.push(DELTA(1, '甲'));
    coalescer.push(DELTA(2, '乙'));
    coalescer.push(DELTA(3, '丙'));
    expect(deliveries, '帧还没到，一次都不该交付').toEqual([]);
    expect(frames.pending()).toBe(1);

    frames.tick();
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toEqual([DELTA(1, '甲'), DELTA(2, '乙'), DELTA(3, '丙')]);
  });

  it('终态取消待发帧并立即 flush——不等下一帧', () => {
    const frames = fakeFrames();
    const deliveries: string[][] = [];
    const coalescer = createRecordCoalescer({
      deliver: (lines) => deliveries.push(lines),
      schedule: frames.schedule,
      cancel: frames.cancel,
    });

    coalescer.push(DELTA(1, '甲'));
    expect(frames.pending()).toBe(1);
    const terminal = record(2, 'prompt_completed', { status: 'completed' });
    coalescer.push(terminal);

    expect(deliveries, '终态必须当场交付').toHaveLength(1);
    expect(deliveries[0]).toEqual([DELTA(1, '甲'), terminal]);
    expect(frames.pending(), '待发帧必须被取消，不留一枚空帧').toBe(0);

    frames.tick();
    expect(deliveries, '取消掉的帧不该再交付一次').toHaveLength(1);
  });

  it('每一种终态都立即 flush，不只是 completed', () => {
    for (const type of [
      'prompt_failed',
      'prompt_canceled',
      'prompt_budget_stopped',
      'session_completed',
      'session_budget_stopped',
      'session_failed',
      'session_interrupted',
    ]) {
      const frames = fakeFrames();
      const deliveries: string[][] = [];
      const coalescer = createRecordCoalescer({
        deliver: (lines) => deliveries.push(lines),
        schedule: frames.schedule,
        cancel: frames.cancel,
      });
      coalescer.push(DELTA(1, '甲'));
      coalescer.push(record(2, type));
      expect(deliveries, `${type} 必须立即 flush`).toHaveLength(1);
      expect(frames.pending()).toBe(0);
    }
  });

  it('提案立即 flush——看不见的提案没有可授权的对象', () => {
    const frames = fakeFrames();
    const deliveries: string[][] = [];
    const coalescer = createRecordCoalescer({
      deliver: (lines) => deliveries.push(lines),
      schedule: frames.schedule,
      cancel: frames.cancel,
    });
    coalescer.push(DELTA(1, '甲'));
    coalescer.push(record(2, 'tool_proposed', { toolCallId: 'tc_1_1' }));
    expect(deliveries).toHaveLength(1);
    expect(frames.pending()).toBe(0);
  });

  it('认不出的行立即 flush——失败要当场可见', () => {
    const frames = fakeFrames();
    const deliveries: string[][] = [];
    const coalescer = createRecordCoalescer({
      deliver: (lines) => deliveries.push(lines),
      schedule: frames.schedule,
      cancel: frames.cancel,
    });
    coalescer.push(DELTA(1, '甲'));
    coalescer.push('{半行');
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0][1]).toBe('{半行');
  });

  it('dispose 之后既不交付也不留待发帧', () => {
    const frames = fakeFrames();
    const deliveries: string[][] = [];
    const coalescer = createRecordCoalescer({
      deliver: (lines) => deliveries.push(lines),
      schedule: frames.schedule,
      cancel: frames.cancel,
    });
    coalescer.push(DELTA(1, '甲'));
    coalescer.dispose();
    expect(frames.pending()).toBe(0);
    coalescer.push(DELTA(2, '乙'));
    frames.tick();
    expect(deliveries).toEqual([]);
  });
});
