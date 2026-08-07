import { describe, expect, it } from 'vitest';
import { describeMatterPackState } from './matter-pack-state.js';

const CATALOG = [
  { packageId: 'legal', displayName: '法律包', version: '0.1.0' },
  { packageId: 'pm', displayName: '产品管理包', version: '0.1.1' },
];

describe('describeMatterPackState（PACK-INTERACT-1 ② 状态语义取词）', () => {
  it('显式零绑定 → 未加载', () => {
    expect(describeMatterPackState([], ['legal', 'pm'], CATALOG)).toEqual({
      loadedIds: [],
      loadedLabels: [],
      undeclared: false,
    });
  });

  it('显式单枚 → 已加载该包', () => {
    expect(describeMatterPackState(['legal'], ['legal', 'pm'], CATALOG)).toEqual({
      loadedIds: ['legal'],
      loadedLabels: ['法律包'],
      undeclared: false,
    });
  });

  it('未声明 → 跟随全部可用包（诚实读法）', () => {
    const state = describeMatterPackState(undefined, ['legal', 'pm'], CATALOG);
    expect(state.undeclared).toBe(true);
    expect(state.loadedIds).toEqual(['legal', 'pm']);
    expect(state.loadedLabels).toEqual(['法律包', '产品管理包']);
  });

  it('绑定指向非准入包 → 失效态（invalidId 显式，不静默回落）', () => {
    const state = describeMatterPackState(['tender'], ['legal', 'pm'], CATALOG);
    expect(state.undeclared).toBe(false);
    expect(state.loadedIds).toEqual(['tender']);
    expect(state.invalidId).toBe('tender');
    // 禁裸 id 伪装正常态：标签必须自带不可用标记，不能与「已加载 X 包」同形。
    expect(state.loadedLabels).toEqual(['tender · 本版本不可用']);
    expect(state.loadedLabels).not.toEqual(['tender']);
  });
});
