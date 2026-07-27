import { describe, expect, it } from 'vitest';

import { createBudget } from './budget.js';

/**
 * 预算面（ADR-022 决定三：pi loop 原生无上限，`while(true)` 无计数器，
 * 上限必须由扩展或 sidecar 层补齐）。
 *
 * 语义要点：usd 只能**事后**知道——一个回合的开销在该回合结束前无法确定，
 * 故本预算是「越限即停」，不是「永不越限」。这条差别必须写进快照理由，不得含糊。
 */

describe('预算计量', () => {
  it('绿证一：不设限额时永不越限', () => {
    const budget = createBudget();
    for (let turn = 0; turn < 100; turn += 1) budget.recordTurn(1.5);
    expect(budget.snapshot().exceeded).toBe(false);
  });

  it('绿证二：快照如实累计回合与开销', () => {
    const budget = createBudget({ maxTurns: 10 });
    budget.recordTurn(0.01);
    budget.recordTurn(0.02);
    const snapshot = budget.snapshot();
    expect(snapshot.turns).toBe(2);
    expect(snapshot.usd).toBeCloseTo(0.03, 10);
  });

  it('红证一：回合数达上限即越限，理由点名回合', () => {
    const budget = createBudget({ maxTurns: 2 });
    expect(budget.recordTurn(0).exceeded).toBe(false);
    const second = budget.recordTurn(0);
    expect(second.exceeded).toBe(true);
    expect(second.reason).toContain('回合');
  });

  it('红证二：累计开销达上限即越限，理由点名金额', () => {
    const budget = createBudget({ maxUsd: 0.05 });
    expect(budget.recordTurn(0.03).exceeded).toBe(false);
    const second = budget.recordTurn(0.03);
    expect(second.exceeded).toBe(true);
    expect(second.reason).toContain('0.05');
  });

  it('红证三：越限后继续记录仍保持越限（判定不回摆）', () => {
    const budget = createBudget({ maxTurns: 1 });
    budget.recordTurn(0);
    budget.recordTurn(0);
    expect(budget.snapshot().exceeded).toBe(true);
  });

  it('红证四：两项同设时，先到者触发并写进理由', () => {
    const budget = createBudget({ maxTurns: 100, maxUsd: 0.01 });
    const snapshot = budget.recordTurn(0.02);
    expect(snapshot.exceeded).toBe(true);
    expect(snapshot.reason).toContain('0.01');
    expect(snapshot.reason).not.toContain('回合');
  });
});
