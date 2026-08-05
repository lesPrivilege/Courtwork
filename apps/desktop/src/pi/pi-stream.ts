/**
 * `PI-LANE-UI-1` · 账本记录的**合帧**器。
 *
 * ADR-022 六-D 的两条行为判据落在这里：
 *
 * - 展示投影的流态更新至多每个 animation frame 合并一次；
 * - **任何 terminal 必须取消 pending frame 并立即 flush**。
 *
 * 合帧只作用于 React 展示投影：Rust 侧逐事件持久与发布顺序绝不合并（本模块只在收端排队，
 * 一枚记录都不丢、不重排、不改写）。
 *
 * 「立即 flush」的闭集比 ADR 明写的 terminal 多两族，各有由：
 * ① `tool_proposed`——它是要用户决定的那一枚，晚一帧就等于让人对着空白点「允许」；
 * ② 认不出的行——失败必须当场可见（总纲不变量 4）。
 * 两族都只是**提前**，不改变顺序，也不越过任何一枚在它之前排队的记录。
 */

/** 见到即当场交付的记录型。其余走合帧。 */
const IMMEDIATE_TYPES = new Set([
  'tool_proposed',
  'prompt_completed',
  'prompt_failed',
  'prompt_canceled',
  'prompt_budget_stopped',
  'session_completed',
  'session_budget_stopped',
  'session_failed',
  'session_interrupted',
]);

export interface RecordCoalescerOptions {
  /** 交付一批已排好序的原始记录行。 */
  deliver(lines: string[]): void;
  /** 帧调度。生产传 `requestAnimationFrame`，测试传假帧钟。 */
  schedule(callback: () => void): number;
  cancel(handle: number): void;
}

export interface RecordCoalescer {
  push(line: string): void;
  dispose(): void;
}

/**
 * 判「这一行要不要当场交付」。
 *
 * 只做一次浅解析取 `type`：解不出即当场交付（认不出的行属立即族），故这里的宽松
 * **不会**让一枚坏记录被静默吞掉——真正的 fail-closed 判据在 `foldPiRecords` 里。
 */
function isImmediate(line: string): boolean {
  try {
    const parsed = JSON.parse(line) as { type?: unknown };
    return typeof parsed.type === 'string' ? IMMEDIATE_TYPES.has(parsed.type) : true;
  } catch {
    return true;
  }
}

export function createRecordCoalescer(options: RecordCoalescerOptions): RecordCoalescer {
  let queued: string[] = [];
  let frame: number | null = null;
  let disposed = false;

  const flush = () => {
    if (frame !== null) {
      options.cancel(frame);
      frame = null;
    }
    if (queued.length === 0) return;
    const batch = queued;
    queued = [];
    options.deliver(batch);
  };

  return {
    push(line) {
      if (disposed) return;
      queued.push(line);
      if (isImmediate(line)) {
        flush();
        return;
      }
      if (frame === null) {
        frame = options.schedule(() => {
          frame = null;
          flush();
        });
      }
    },
    dispose() {
      disposed = true;
      queued = [];
      if (frame !== null) {
        options.cancel(frame);
        frame = null;
      }
    },
  };
}
