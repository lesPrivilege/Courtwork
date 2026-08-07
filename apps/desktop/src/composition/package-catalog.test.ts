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
    expect(legal).toEqual({ packageId: 'legal', displayName: '法律包', version: '0.1.0' });

    const pm = describePackage({ identity: { packageId: 'pm', version: '0.1.1' } });
    expect(pm).toEqual({ packageId: 'pm', displayName: '产品管理包', version: '0.1.1' });
  });

  it('准入包缺宿主呈现名 → 装配显式失败（不回落到 packageId 字面量）', () => {
    expect(() => describePackage({ identity: { packageId: 'tender', version: '0.1.0' } })).toThrow(/no host display name/);
  });
});
