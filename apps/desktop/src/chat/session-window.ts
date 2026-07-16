/**
 * CHAT-SESSION-1（ADR-013 §1）：Chat 会话以连续性窗口自动划界。
 *
 * 「距最近一次用户请求 ≤ 1 小时的新请求延续当前 session，超窗后新请求开启新 session。」
 * 复杂度上限（工单）：窗口就是一个时间戳比较——本文件只做纯函数，不引状态机、不加持久化、
 * 无用户开关。真源仍是既有 Turn journal 与内存态会话，本模块只对其时间戳做划界推导。
 */

/** 唯一阈值：1 小时连续性窗口，由系统在协议层判定。 */
export const SESSION_WINDOW_MS = 60 * 60 * 1000;

/** 划界只需要一个毫秒时间戳（用户请求发生时刻）。 */
export interface WindowItem {
  createdAt: number;
}

/**
 * 两条相邻请求是否属于同一会话：间隔 ≤ 窗口即延续。
 * 「≤ 1 小时」含边界，故用 `<=`：59 分延续、60 分整延续、61 分新开。
 */
export function withinWindow(earlierMs: number, laterMs: number, windowMs = SESSION_WINDOW_MS): boolean {
  return laterMs - earlierMs <= windowMs;
}

/**
 * 把一段按 createdAt 升序的条目按「相邻间隔 > 窗口」切分成若干会话。
 * 会话边界依据相邻请求间隔，而非距首条累计——长会话不会因总时长超窗而误断。
 */
export function partitionSessions<T extends WindowItem>(
  items: readonly T[],
  windowMs = SESSION_WINDOW_MS,
): T[][] {
  const sessions: T[][] = [];
  for (const item of items) {
    const current = sessions[sessions.length - 1];
    const previous = current?.[current.length - 1];
    if (current && previous && withinWindow(previous.createdAt, item.createdAt, windowMs)) {
      current.push(item);
    } else {
      sessions.push([item]);
    }
  }
  return sessions;
}

/**
 * 在 nowMs 发起新请求时，应携带的续行历史：
 * - 最近一条距 now ≤ 窗口 → 返回当前会话的全部消息（完整上下文保留）；
 * - 否则（超窗或空历史）→ 返回空数组：新 session 不回灌历史全文。
 */
export function continuationHistory<T extends WindowItem>(
  items: readonly T[],
  nowMs: number,
  windowMs = SESSION_WINDOW_MS,
): T[] {
  if (items.length === 0) return [];
  const last = items[items.length - 1];
  if (!withinWindow(last.createdAt, nowMs, windowMs)) return [];
  const sessions = partitionSessions(items, windowMs);
  return [...sessions[sessions.length - 1]];
}
