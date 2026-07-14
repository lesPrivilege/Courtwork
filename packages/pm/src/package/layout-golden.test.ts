import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeRicePoint, computeRowScore } from '../domain/score-calc.js';
import { PM_PACKAGE_DESCRIPTOR } from './index.js';

function sha256(value: unknown): string {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(bytes).digest('hex');
}

const filled = (value: number) => ({
  fill: 'manual' as const,
  value,
  range: null,
  sourceAnchors: [],
  status: 'filled' as const,
});
const ranged = (low: number, high: number) => ({
  fill: 'auto' as const,
  value: null,
  range: { low, high },
  sourceAnchors: [],
  status: 'filled' as const,
});
const outOfCoverage = () => ({
  fill: 'auto' as const,
  value: null,
  range: null,
  sourceAnchors: [],
  status: 'out_of_coverage' as const,
});

describe('VPKG-LAYOUT-1 PM content golden', () => {
  it('descriptor 保持纯 JSON 深等价、整面 hash 与 catalog-only 空 prompt blob 不漂移', () => {
    expect(structuredClone(PM_PACKAGE_DESCRIPTOR)).toStrictEqual(PM_PACKAGE_DESCRIPTOR);
    expect(sha256(PM_PACKAGE_DESCRIPTOR)).toBe('4513f726e00907ac53bb929585ef6e69535f319a170edf28e1405ac2e05e8ef5');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(PM_PACKAGE_DESCRIPTOR.promptSegments).toEqual([]);
  });

  it('确定性计算 golden 保持单点、区间传播与 OOC 缺口语义', () => {
    const result = {
      point: computeRicePoint(1200, 2, 0.8, 3),
      range: computeRowScore({
        reach: filled(1000),
        impact: ranged(1, 3),
        confidence: filled(1),
        effort: ranged(2, 4),
      }),
      ooc: computeRowScore({
        reach: filled(1),
        impact: outOfCoverage(),
        confidence: filled(1),
        effort: filled(1),
      }),
    };
    expect(result).toStrictEqual({ point: 640, range: { low: 250, high: 1500 }, ooc: null });
    expect(sha256(result)).toBe('de65c331d104d4b1d36608b1671ebaba9e2226405e6019cbbb8dc3cb59fa870c');
  });

  it('守卫自检：descriptor 变异会改变整面 hash', () => {
    const drifted = structuredClone(PM_PACKAGE_DESCRIPTOR);
    drifted.identity.version = '9.9.9';
    expect(sha256(drifted)).not.toBe(sha256(PM_PACKAGE_DESCRIPTOR));
  });
});
