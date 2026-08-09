import { describe, expect, it } from 'vitest';
import { describeMatterPackState } from './matter-pack-state.js';

const CATALOG = [
  { packageId: 'legal', displayName: '法律包', version: '0.1.0', availability: 'loadable' as const },
  { packageId: 'pm', displayName: '产品管理包', version: '0.1.1', availability: 'catalog-only' as const },
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

  /**
   * ADR-015 决定三 2026-08-08：`catalog-only` 包已准入（能识别与读取既有产物），但当期不开放
   * 交互加载。历史绑定不迁移、不清空、不判未准入——诚实降级为「仅目录与既有产物可用」。
   */
  it('绑定 catalog-only 包 → 既非「已加载」也非失效，显式标出仅目录可用', () => {
    const state = describeMatterPackState(['pm'], ['legal', 'pm'], CATALOG);
    expect(state.undeclared).toBe(false);
    expect(state.loadedIds).toEqual(['pm']);
    expect(state.loadedLabels).toEqual(['产品管理包']);
    expect(state.invalidId).toBeUndefined();
    expect(state.catalogOnlyId).toBe('pm');
  });

  it('绑定 loadable 包 → 无 catalog-only 标记', () => {
    expect(describeMatterPackState(['legal'], ['legal', 'pm'], CATALOG).catalogOnlyId).toBeUndefined();
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
