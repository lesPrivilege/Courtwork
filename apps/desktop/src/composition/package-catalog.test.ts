import { describe, expect, it } from 'vitest';
import { describePackage } from './package-catalog.js';

/**
 * 宿主包目录（PACK-INTERACT-1 ①/②）：加载 UX 的「全局可用集呈现」取词。
 *
 * 呈现事实住受信组合根（GENERIC-PACK-1 ③「label 立在宿主侧而非 Package ABI」先例）；
 * 不参与准入/绑定/机制，只供文案取词。准入包缺宿主呈现名即装配显式失败（静默降级零容忍）。
 */
describe('host package catalog', () => {
  it('准入序 + 用户可见名 + 版本（版本取自 manifest，非第二真源）', () => {
    const legal = describePackage({ identity: { packageId: 'legal', version: '0.1.0' } });
    expect(legal).toEqual({ packageId: 'legal', displayName: '法律包', version: '0.1.0', availability: 'loadable' });

    const pm = describePackage({ identity: { packageId: 'pm', version: '0.1.1' } });
    expect(pm).toEqual({ packageId: 'pm', displayName: '产品管理包', version: '0.1.1', availability: 'catalog-only' });
  });

  /**
   * ADR-015 决定三 2026-08-08 补记：准入（识别与读取既有产物）与可交互加载（用户可在 matter
   * 建立/设置处激活）分层。发行成熟度是**宿主发行事实**——只住受信组合根，不进 Package ABI、
   * 不进 `packBinding`/case store/wire/journal，也不另立持久开关。
   */
  it('发行成熟度是两枚闭集：Legal=loadable，PM=catalog-only', () => {
    for (const packageId of ['legal', 'pm']) {
      const entry = describePackage({ identity: { packageId, version: '0.1.0' } });
      expect(['loadable', 'catalog-only']).toContain(entry.availability);
    }
    expect(describePackage({ identity: { packageId: 'legal', version: '0.1.0' } }).availability).toBe('loadable');
    expect(describePackage({ identity: { packageId: 'pm', version: '0.1.0' } }).availability).toBe('catalog-only');
  });

  it('准入包缺宿主呈现名 → 装配显式失败（不回落到 packageId 字面量）', () => {
    expect(() => describePackage({ identity: { packageId: 'tender', version: '0.1.0' } })).toThrow(/no host display name/);
  });
});
