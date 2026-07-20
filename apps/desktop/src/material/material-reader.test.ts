import { describe, expect, it, vi } from 'vitest';

import { MATERIAL_BLOCK_REASON_COPY, type MaterialBlockReason } from './material-ref';
import { openMaterialReader } from './material-reader';

/**
 * FILE-PREVIEW-1 · 非 demo 案原件阅读的判别逻辑。
 *
 * 立此单测的理由（也是本单唯一新增模块的理由）：判别本身只有三种去向，但它必须
 * **穷举** `resolveForProvider` 的阻断闭集——漏一个 reason 就是一处静默降级（不变量 4）。
 * 内联在 App.tsx 里既测不到，又会把那个正被高水位门压缩的文件继续撑大（「过手即拆」）。
 */

const readyResult = {
  status: 'ready' as const,
  material: {
    materialId: 'mat-1',
    fileName: '04-设备采购合同.md',
    readingMarkdown: '# 合同\n\n乙方逾期支付任何一期款项的……',
  },
};

const storeWith = (result: unknown) => ({
  resolveForProvider: vi.fn(async () => result as never),
});

describe('openMaterialReader', () => {
  it('ready 时给出可渲染的阅读文档，名称取原件文件名', async () => {
    const store = storeWith(readyResult);
    const outcome = await openMaterialReader(store, 'case-1', 'mat-1');
    expect(outcome).toEqual({
      kind: 'reader',
      doc: { name: '04-设备采购合同.md', markdown: readyResult.material.readingMarkdown },
    });
    expect(store.resolveForProvider).toHaveBeenCalledWith('case-1', 'mat-1');
  });

  // 闭集穷举：每个 reason 都必须有显式去向，且文案取既有产品语言表——本单不造第二套错误形态。
  const reasons = Object.keys(MATERIAL_BLOCK_REASON_COPY) as MaterialBlockReason[];
  it.each(reasons)('blocked/%s 显式阻断且复用既有产品语言文案', async (reason) => {
    const outcome = await openMaterialReader(storeWith({ status: 'blocked', reason }), 'case-1', 'mat-1');
    expect(outcome).toEqual({ kind: 'blocked', reason, message: MATERIAL_BLOCK_REASON_COPY[reason] });
  });

  it('闭集完整性：阻断去向覆盖 resolveForProvider 的全部 reason，无遗漏', async () => {
    // 这条是防「新增 reason 却忘了给去向」——那会让新阻断态静默落进兜底文案。
    for (const reason of reasons) {
      const outcome = await openMaterialReader(storeWith({ status: 'blocked', reason }), 'case-1', 'mat-1');
      expect(outcome.kind).toBe('blocked');
      if (outcome.kind === 'blocked') expect(outcome.message).toBeTruthy();
    }
    expect(reasons.length).toBeGreaterThanOrEqual(8);
  });

  it('demo 案不经本路径：调用方须先分流，此处仅以 out_of_scope 兜底不静默通过', async () => {
    const outcome = await openMaterialReader(storeWith({ status: 'blocked', reason: 'out_of_scope' }), 'demo-linjiang', 'mat-1');
    expect(outcome).toEqual({
      kind: 'blocked',
      reason: 'out_of_scope',
      message: MATERIAL_BLOCK_REASON_COPY.out_of_scope,
    });
  });

  it('宿主抛错时不静默吞：转为显式阻断，不返回空阅读面', async () => {
    const store = { resolveForProvider: vi.fn(async () => { throw new Error('host exploded'); }) };
    const outcome = await openMaterialReader(store as never, 'case-1', 'mat-1');
    expect(outcome.kind).toBe('blocked');
    if (outcome.kind === 'blocked') expect(outcome.message).toBeTruthy();
  });
});
