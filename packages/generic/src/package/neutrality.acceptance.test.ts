import { describe, expect, it } from 'vitest';
import { GENERIC_PACKAGE_DESCRIPTOR } from './descriptor.js';

/**
 * GENERIC-SCENARIOS-1 独立验收探针。
 *
 * 期望表独立于实现会话的 `neutrality.test.ts`，专门防止「从原守卫删一枚 token，同时把该词
 * 注入 descriptor」的双改假绿。受检值直接取源码 descriptor，不依赖先行 build 的 dist 快照。
 */
describe('独立验收探针：基线 descriptor 中性词表', () => {
  it('prompt／vocabulary／launch 全面零垂类词', () => {
    const surface = JSON.stringify(GENERIC_PACKAGE_DESCRIPTOR);
    const frozenVerticalTokens = [
      '合同审查', '风险', '当事人', '主合同', '核验', '律师', '答辩', '诉讼', '批注', '修订',
    ];
    for (const token of frozenVerticalTokens) {
      expect(surface, `独立验收探针捕获基线 descriptor 垂类词「${token}」`).not.toContain(token);
    }
  });
});
