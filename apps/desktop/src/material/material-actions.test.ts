import { describe, expect, it, vi } from 'vitest';

import { MATERIAL_BLOCK_REASON_COPY, type MaterialBlock, type MaterialBlockReason } from './material-ref';
import {
  MATERIAL_READER_BLOCK_REASON_COPY,
  openMaterialReader,
  readMaterialAction,
  resolveReaderFocus,
  verifyMaterialAction,
  type MaterialReaderBlockReason,
} from './material-actions';

/**
 * CONTRACT-TRACE-1：canonical reader 单调用链（原 `material-reader.ts` 与 `material-actions.ts`
 * 合并，后者存活）。本文件同时承接被删模块的闭集穷举与冻结两谱——合并不得丢覆盖面。
 *
 * 坐标算法的立测理由：锚点定位是「无锚不落格」的落地形态。一旦退回 `indexOf(quote)`，
 * 重复引语就会落到错误位置，而用户看到的仍是一个「已定位」的高亮——那是最坏的一类假事实。
 */

const LAYER = 'reading-view-material@1:demo';

/** 非分页件文本层：三块连续，第二与第三块含同一句重复 quote（坐标才分得开）。 */
const FLAT_BLOCKS: MaterialBlock[] = [
  { blockId: 'b1', text: '第一条 标的与价款。', rangeBase: 0, textLayerVersion: LAYER },
  { blockId: 'b2', text: '逾期付款按未付金额计违约金。', rangeBase: 10, textLayerVersion: LAYER },
  { blockId: 'b3', text: '逾期付款按未付金额计违约金。', rangeBase: 24, textLayerVersion: LAYER },
];

/** 分页件文本层：两页各一块，rangeBase 按页内文本层解释（同值不同页）。 */
const PAGED_BLOCKS: MaterialBlock[] = [
  { blockId: 'p1b1', page: 1, text: '第一页的验收条款。', rangeBase: 0, textLayerVersion: LAYER },
  { blockId: 'p2b1', page: 2, text: '第二页的验收条款。', rangeBase: 0, textLayerVersion: LAYER },
];

const readyResult = (blocks: MaterialBlock[] = FLAT_BLOCKS) => ({
  status: 'ready' as const,
  material: {
    materialId: 'mat-1',
    fileName: '04-设备采购合同.md',
    readingMarkdown: '# 合同\n\n乙方逾期支付任何一期款项的……',
    blocks,
  },
});

const storeWith = (result: unknown) => ({
  resolveForProvider: vi.fn(async () => result as never),
});

const anchorAt = (start: number, end: number, quote: string, extra: Record<string, unknown> = {}) => ({
  fileId: 'mat-1',
  textRange: { start, end },
  textLayerVersion: LAYER,
  quote,
  ...extra,
});

describe('openMaterialReader · 阻断闭集（承 FILE-PREVIEW-1）', () => {
  it('ready 时给出 canonical 阅读文档：名称、markdown 与重验后 blocks 的防御性复制', async () => {
    const store = storeWith(readyResult());
    const outcome = await openMaterialReader(store, 'case-1', 'mat-1');
    expect(outcome.kind).toBe('reader');
    if (outcome.kind !== 'reader') return;
    expect(outcome.doc.name).toBe('04-设备采购合同.md');
    expect(outcome.doc.markdown).toBe(readyResult().material.readingMarkdown);
    expect(outcome.doc.blocks).toEqual(FLAT_BLOCKS);
    expect(outcome.doc.focus).toBeUndefined();
    // 防御性复制：读侧改 doc 不得回写 store 交出的数组元素。
    expect(outcome.doc.blocks[0]).not.toBe(FLAT_BLOCKS[0]);
    expect(store.resolveForProvider).toHaveBeenCalledWith('case-1', 'mat-1');
  });

  const reasons = Object.keys(MATERIAL_BLOCK_REASON_COPY) as MaterialBlockReason[];
  it.each(reasons)('blocked/%s 显式阻断且复用既有产品语言文案', async (reason) => {
    const outcome = await openMaterialReader(storeWith({ status: 'blocked', reason }), 'case-1', 'mat-1');
    expect(outcome).toEqual({ kind: 'blocked', reason, message: MATERIAL_BLOCK_REASON_COPY[reason] });
  });

  // 闭集**冻结**（承被删模块的同名谱）：期望写成字面量，不从被测表反向派生。
  it('材料阻断闭集冻结：reason 集合变动时先红', () => {
    expect(new Set(reasons)).toEqual(new Set([
      'content_drift', 'reading_drift', 'unavailable', 'revoked',
      'out_of_scope', 'needs_ocr', 'rejected', 'not_found',
    ]));
  });

  // reader-local 闭集同样冻结：本票新增两个 reader 侧 reason，不许悄悄再长第三个。
  it('reader 闭集冻结：材料八态 + anchor_invalid/anchor_unsupported 恰十', () => {
    const readerReasons = Object.keys(MATERIAL_READER_BLOCK_REASON_COPY) as MaterialReaderBlockReason[];
    expect(new Set(readerReasons)).toEqual(new Set([
      'content_drift', 'reading_drift', 'unavailable', 'revoked',
      'out_of_scope', 'needs_ocr', 'rejected', 'not_found',
      'anchor_invalid', 'anchor_unsupported',
    ]));
  });

  it('两个 anchor 文案逐字冻结（产品语，不出现工程词）', () => {
    expect(MATERIAL_READER_BLOCK_REASON_COPY.anchor_unsupported).toBe('当前阅读面暂不支持该定位');
    expect(MATERIAL_READER_BLOCK_REASON_COPY.anchor_invalid)
      .toBe('这处引证已无法与当前原件逐字对齐 · 请重新运行合同审查');
  });

  it('宿主抛错时不静默吞：转为显式阻断，不返回空阅读面', async () => {
    const store = { resolveForProvider: vi.fn(async () => { throw new Error('host exploded'); }) };
    const outcome = await openMaterialReader(store as never, 'case-1', 'mat-1');
    expect(outcome).toEqual({
      kind: 'blocked',
      reason: 'unavailable',
      message: MATERIAL_BLOCK_REASON_COPY.unavailable,
    });
  });
});

describe('resolveReaderFocus · 坐标是权威，quote 只作切片等式', () => {
  it('重复 quote 只落坐标指定处（第三块），不落数组首个命中', () => {
    const resolution = resolveReaderFocus(FLAT_BLOCKS, anchorAt(24, 38, '逾期付款按未付金额计违约金。'));
    expect(resolution).toEqual({
      status: 'focus',
      focus: { blockId: 'b3', page: undefined, localStart: 0, localEnd: 14 },
    });
  });

  it('块内偏移正确换算为 block-local 坐标', () => {
    const resolution = resolveReaderFocus(FLAT_BLOCKS, anchorAt(12, 16, '付款按未'));
    expect(resolution).toEqual({
      status: 'focus',
      focus: { blockId: 'b2', page: undefined, localStart: 2, localEnd: 6 },
    });
  });

  it('分页件先以 page 选页，同 rangeBase 不串页', () => {
    const resolution = resolveReaderFocus(PAGED_BLOCKS, anchorAt(0, 3, '第二页', { page: 2 }));
    expect(resolution).toEqual({
      status: 'focus',
      focus: { blockId: 'p2b1', page: 2, localStart: 0, localEnd: 3 },
    });
  });

  it('分页件 page 不匹配 → anchor_invalid', () => {
    expect(resolveReaderFocus(PAGED_BLOCKS, anchorAt(0, 3, '第二页', { page: 7 })))
      .toEqual({ status: 'blocked', reason: 'anchor_invalid' });
  });

  it('分页件缺 page → anchor_invalid（不静默按全文层解释）', () => {
    expect(resolveReaderFocus(PAGED_BLOCKS, anchorAt(0, 3, '第一页')))
      .toEqual({ status: 'blocked', reason: 'anchor_invalid' });
  });

  it.each([
    ['缺 textLayerVersion', anchorAt(24, 38, '逾期付款按未付金额计违约金。', { textLayerVersion: undefined })],
    ['文本层版本漂移', anchorAt(24, 38, '逾期付款按未付金额计违约金。', { textLayerVersion: 'other@2' })],
    ['缺 quote', anchorAt(24, 38, undefined as unknown as string)],
    ['空 quote', anchorAt(24, 38, '')],
    ['切片不等', anchorAt(24, 38, '别的引语别的引语别的引语别的')],
    ['越界', anchorAt(24, 999, '逾期付款按未付金额计违约金。')],
    ['跨块非唯一', anchorAt(8, 20, '款。逾期付款按未付')],
    ['零长区间', anchorAt(24, 24, '逾期付款按未付金额计违约金。')],
  ])('%s → anchor_invalid', (_label, anchor) => {
    expect(resolveReaderFocus(FLAT_BLOCKS, anchor as never))
      .toEqual({ status: 'blocked', reason: 'anchor_invalid' });
  });

  // 合法 bbox-only **独占** unsupported——不得先被「缺 textRange」分支吞成 invalid。
  it.each([
    ['带 quote', { fileId: 'mat-1', page: 2, bbox: { x: 1, y: 2, width: 3, height: 4 }, quote: '图上一句' }],
    ['缺 quote', { fileId: 'mat-1', page: 2, bbox: { x: 1, y: 2, width: 3, height: 4 } }],
  ])('合法 bbox-only（%s）→ anchor_unsupported', (_label, anchor) => {
    expect(resolveReaderFocus(FLAT_BLOCKS, anchor as never))
      .toEqual({ status: 'blocked', reason: 'anchor_unsupported' });
  });

  it.each([
    ['bbox 与 textRange 均缺', { fileId: 'mat-1', quote: '无锚' }],
    ['bbox 畸形（零宽）', { fileId: 'mat-1', page: 2, bbox: { x: 1, y: 2, width: 0, height: 4 } }],
    ['bbox 缺 page', { fileId: 'mat-1', bbox: { x: 1, y: 2, width: 3, height: 4 } }],
    ['bbox page 非正整数', { fileId: 'mat-1', page: 0, bbox: { x: 1, y: 2, width: 3, height: 4 } }],
  ])('%s → anchor_invalid（不冒充 unsupported）', (_label, anchor) => {
    expect(resolveReaderFocus(FLAT_BLOCKS, anchor as never))
      .toEqual({ status: 'blocked', reason: 'anchor_invalid' });
  });
});

describe('openMaterialReader · 带锚开面', () => {
  it('锚点可验证时携 focus 开面', async () => {
    const outcome = await openMaterialReader(
      storeWith(readyResult()),
      'case-1',
      'mat-1',
      anchorAt(24, 38, '逾期付款按未付金额计违约金。') as never,
    );
    expect(outcome.kind).toBe('reader');
    if (outcome.kind !== 'reader') return;
    expect(outcome.doc.focus).toEqual({ blockId: 'b3', page: undefined, localStart: 0, localEnd: 14 });
  });

  it('锚点不可验证时**不开阅读面**，只给显式阻断', async () => {
    const outcome = await openMaterialReader(
      storeWith(readyResult()),
      'case-1',
      'mat-1',
      anchorAt(24, 38, '漂移引语漂移引语漂移引语漂移') as never,
    );
    expect(outcome).toEqual({
      kind: 'blocked',
      reason: 'anchor_invalid',
      message: MATERIAL_READER_BLOCK_REASON_COPY.anchor_invalid,
    });
  });

  it('材料级阻断先于锚点判定：不因带锚就把 content_drift 报成 anchor_invalid', async () => {
    const outcome = await openMaterialReader(
      storeWith({ status: 'blocked', reason: 'content_drift' }),
      'case-1',
      'mat-1',
      anchorAt(24, 38, '逾期付款按未付金额计违约金。') as never,
    );
    expect(outcome).toEqual({
      kind: 'blocked',
      reason: 'content_drift',
      message: MATERIAL_BLOCK_REASON_COPY.content_drift,
    });
  });
});

describe('readMaterialAction / verifyMaterialAction', () => {
  it('阅读：通过即开面，锚点透传到 focus', async () => {
    const openReader = vi.fn();
    const feedback = vi.fn();
    await readMaterialAction(
      storeWith(readyResult()),
      'case-1',
      'mat-1',
      { feedback, openReader },
      anchorAt(24, 38, '逾期付款按未付金额计违约金。') as never,
    );
    expect(feedback).not.toHaveBeenCalled();
    expect(openReader).toHaveBeenCalledTimes(1);
    expect(openReader.mock.calls[0]![0].focus).toEqual({ blockId: 'b3', page: undefined, localStart: 0, localEnd: 14 });
  });

  it('阅读：锚点阻断走显式反馈，绝不开空白阅读面', async () => {
    const openReader = vi.fn();
    const feedback = vi.fn();
    await readMaterialAction(
      storeWith(readyResult()),
      'case-1',
      'mat-1',
      { feedback, openReader },
      { fileId: 'mat-1', page: 2, bbox: { x: 1, y: 2, width: 3, height: 4 } } as never,
    );
    expect(openReader).not.toHaveBeenCalled();
    expect(feedback).toHaveBeenCalledWith(MATERIAL_READER_BLOCK_REASON_COPY.anchor_unsupported, false);
  });

  it('核验：通过与阻断都说话，宿主异常亦显式', async () => {
    const feedback = vi.fn();
    await verifyMaterialAction(storeWith(readyResult()), 'case-1', 'mat-1', { feedback });
    expect(feedback).toHaveBeenCalledWith('原件校验通过：04-设备采购合同.md 可用于生成', true);

    const boom = { resolveForProvider: vi.fn(async () => { throw new Error('host exploded'); }) };
    const feedback2 = vi.fn();
    await verifyMaterialAction(boom as never, 'case-1', 'mat-1', { feedback: feedback2 });
    expect(feedback2).toHaveBeenCalledWith(MATERIAL_BLOCK_REASON_COPY.unavailable, false);
  });
});
