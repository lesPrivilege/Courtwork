import { describe, expect, it } from 'vitest';
import {
  SESSION_WINDOW_MS,
  continuationHistory,
  partitionSessions,
  withinWindow,
} from './session-window';

/**
 * CHAT-SESSION-1（ADR-013 §1）：会话以「距最近一次用户请求 ≤ 1 小时」的连续性窗口自动划界。
 * 窗口是纯时间戳比较，无状态机、无用户开关；这里锁死边界与跨窗不回灌语义。
 */

const T0 = 1_700_000_000_000; // 任意固定基准，避免依赖真实时钟
const MIN = 60_000;

describe('session-window：窗口常量与边界', () => {
  it('窗口固定为 1 小时（协议层判定的唯一阈值）', () => {
    expect(SESSION_WINDOW_MS).toBe(60 * 60 * 1000);
  });

  it('withinWindow：59 分钟延续、61 分钟新开、60 分整含边界', () => {
    expect(withinWindow(T0, T0 + 59 * MIN)).toBe(true);
    expect(withinWindow(T0, T0 + 61 * MIN)).toBe(false);
    // 「≤ 1 小时」含边界：恰好 60 分仍延续
    expect(withinWindow(T0, T0 + 60 * MIN)).toBe(true);
    expect(withinWindow(T0, T0 + 60 * MIN + 1)).toBe(false);
  });
});

describe('session-window：partitionSessions 按 >1h 间隔切分', () => {
  it('空输入得空分组', () => {
    expect(partitionSessions([])).toEqual([]);
  });

  it('单条自成一个会话', () => {
    const items = [{ createdAt: T0 }];
    expect(partitionSessions(items)).toEqual([[{ createdAt: T0 }]]);
  });

  it('组内相邻间隔均 ≤ 窗口时归同一会话', () => {
    const items = [{ createdAt: T0 }, { createdAt: T0 + 30 * MIN }, { createdAt: T0 + 55 * MIN }];
    const sessions = partitionSessions(items);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toHaveLength(3);
  });

  it('相邻间隔 > 窗口处断开为新会话', () => {
    const items = [
      { createdAt: T0 },
      { createdAt: T0 + 30 * MIN },
      { createdAt: T0 + 30 * MIN + 61 * MIN }, // 与上一条间隔 61 分 → 新会话
      { createdAt: T0 + 30 * MIN + 61 * MIN + 10 * MIN },
    ];
    const sessions = partitionSessions(items);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toHaveLength(2);
    expect(sessions[1]).toHaveLength(2);
    // 会话边界依据相邻请求间隔，而非距首条累计
    expect(sessions[1][0].createdAt).toBe(T0 + 30 * MIN + 61 * MIN);
  });
});

describe('session-window：continuationHistory 跨窗不回灌历史全文', () => {
  it('空历史 → 空续行', () => {
    expect(continuationHistory([], T0)).toEqual([]);
  });

  it('最近一条距 now ≤ 窗口 → 携当前会话全部消息（59 分延续）', () => {
    const items = [{ createdAt: T0 }, { createdAt: T0 + 20 * MIN }];
    const history = continuationHistory(items, T0 + 20 * MIN + 59 * MIN);
    expect(history).toHaveLength(2);
    expect(history[0].createdAt).toBe(T0);
  });

  it('最近一条距 now > 窗口 → 空续行（61 分新开，不回灌）', () => {
    const items = [{ createdAt: T0 }, { createdAt: T0 + 20 * MIN }];
    const history = continuationHistory(items, T0 + 20 * MIN + 61 * MIN);
    expect(history).toEqual([]);
  });

  it('只携当前会话，排除已跨窗的上一会话（捕获请求断言的纯函数底座）', () => {
    const items = [
      { createdAt: T0, tag: 'prev' }, // 上一会话
      { createdAt: T0 + 90 * MIN, tag: 'curr-1' }, // 与上一条间隔 90 分 → 新会话开端
      { createdAt: T0 + 90 * MIN + 10 * MIN, tag: 'curr-2' },
    ];
    const history = continuationHistory(items, T0 + 90 * MIN + 10 * MIN + 5 * MIN);
    expect(history.map((item) => item.tag)).toEqual(['curr-1', 'curr-2']);
    // 上一会话内容不得出现在续行里（跨窗不回灌）
    expect(history.some((item) => item.tag === 'prev')).toBe(false);
  });
});
