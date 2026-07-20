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

  // 闭集**冻结**：期望集合写成字面量，不从 COPY 表反向派生。
  //
  // 首版这条从 `Object.keys(COPY)` 取集合再断言「每个都有去向」——**它永远看不见「新增」**：
  // 独立验收三探针实证，往闭集里加 reason（补不补 copy 都算）一律绿，连把判别器掏空到只
  // 认一个 reason 时它也绿。那版的宣称「新增 reason 而忘记给去向时先红」不成立，是装饰。
  //
  // 现形态：任何人改动 reason 闭集，这里先红，逼他回来想「新 reason 的显示去向是什么」。
  // 真正逐条验去向的是上面的 `it.each`（判别器被掏空时它红 7 例）——两条分工，不重复。
  it('闭集冻结：reason 集合变动时先红，逼人回来想新态的显示去向', () => {
    expect(new Set(reasons)).toEqual(new Set([
      'content_drift', 'reading_drift', 'unavailable', 'revoked',
      'out_of_scope', 'needs_ocr', 'rejected', 'not_found',
    ]));
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
