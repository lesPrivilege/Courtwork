import { describe, it, expect } from 'vitest';
import { PriorityScoreSchema } from './priority-score.js';
import { computeRicePoint, computeRowScore } from '../domain/score-calc.js';

const filled = (value: number) => ({ fill: 'manual' as const, value, range: null, sourceAnchors: [], status: 'filled' as const });
const ranged = (low: number, high: number) => ({ fill: 'auto' as const, value: null, range: { low, high }, sourceAnchors: [], status: 'filled' as const });
const ooc = () => ({ fill: 'auto' as const, value: null, range: null, sourceAnchors: [], status: 'out_of_coverage' as const });

function validSheet() {
  return {
    projectId: 'demo-qiwu-3.0',
    formula: 'RICE',
    formulaVersion: 'rice-v1',
    rows: [
      {
        id: 'pr-1',
        item: '离线推送修复',
        requirementRef: null,
        params: { reach: filled(1200), impact: filled(2), confidence: filled(0.8), effort: filled(3) },
        score: 640,
        rank: 1,
        band: 'P0',
      },
    ],
  };
}

describe('PriorityScoreSchema', () => {
  it('接受合法打分表', () => {
    expect(PriorityScoreSchema.safeParse(validSheet()).success).toBe(true);
  });

  it('接受裁量区间参数（低置信出区间不出单值）', () => {
    const s = validSheet();
    s.rows[0].params.impact = ranged(1, 3) as never;
    s.rows[0].score = { low: 320, high: 960 } as never;
    expect(PriorityScoreSchema.safeParse(s).success).toBe(true);
  });

  it('拒绝 filled 参数同时给 value 与 range', () => {
    const s = validSheet();
    (s.rows[0].params.reach as { range: unknown }).range = { low: 1, high: 2 };
    expect(PriorityScoreSchema.safeParse(s).success).toBe(false);
  });

  it('拒绝 OOC 参数却带了值（诚实置空，不编数）', () => {
    const s = validSheet();
    s.rows[0].params.confidence = { ...ooc(), value: 0.5 } as never;
    expect(PriorityScoreSchema.safeParse(s).success).toBe(false);
  });

  it('接受 OOC 参数（value/range 均 null）', () => {
    const s = validSheet();
    s.rows[0].params.confidence = ooc() as never;
    expect(PriorityScoreSchema.safeParse(s).success).toBe(true);
  });
});

describe('score-calc（确定性 RICE，零 LLM）', () => {
  it('RICE 单点：R×I×C÷E', () => {
    expect(computeRicePoint(1200, 2, 0.8, 3)).toBe(640);
  });

  it('effort 为零抛错（分母保护）', () => {
    expect(() => computeRicePoint(1, 1, 1, 0)).toThrow();
  });

  it('全单值参数 → 得分单值', () => {
    expect(computeRowScore({ reach: filled(1200), impact: filled(2), confidence: filled(0.8), effort: filled(3) })).toBe(640);
  });

  it('含裁量区间 → 得分传导为区间（分母反向）', () => {
    const score = computeRowScore({ reach: filled(1000), impact: ranged(1, 3), confidence: filled(1), effort: ranged(2, 4) });
    // high = 1000×3×1 ÷ 2 = 1500；low = 1000×1×1 ÷ 4 = 250
    expect(score).toEqual({ low: 250, high: 1500 });
  });

  it('任一参数 OOC → 得分缺口 null（不伪造）', () => {
    expect(computeRowScore({ reach: filled(1), impact: ooc(), confidence: filled(1), effort: filled(1) })).toBeNull();
  });

  it('考点二：RICE 逆转"按嗓门排序"——高声量低价值 < 低声量高价值', () => {
    // 换皮肤：Reach 高(3000)、Impact 低(0.25)；老人模式：Reach 低(300)、Impact 高(3)
    const skin = computeRowScore({ reach: filled(3000), impact: filled(0.25), confidence: filled(0.9), effort: filled(2) }) as number;
    const elder = computeRowScore({ reach: filled(300), impact: filled(3), confidence: filled(0.8), effort: filled(2) }) as number;
    expect(elder).toBeGreaterThan(skin);
  });
});
