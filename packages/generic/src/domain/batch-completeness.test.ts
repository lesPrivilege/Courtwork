import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  batchReportSchemaFor,
  completeBatchItems,
  DuplicateBatchRowError,
  UnknownBatchMaterialError,
} from './batch-completeness.js';

/**
 * 新增概念三（票面四·3）：`BatchReport` 逐项完整性校验。
 *
 * 系统裁决「每份就绪材料恰一行」——不加则「逐项报告与失败显式」退化为模型自证。
 * 三条判据各带反例：
 *   - 模型漏行 → 系统补 `missing` 行（显式落格，不伪造摘要）；
 *   - 模型重复行 → 整面拒；
 *   - 模型编造闭集外 materialId → 整面拒（ADR-016 决定二同族：模型不选择地址）。
 */

const READY = ['mat-1', 'mat-2', 'mat-3'] as const;

describe('completeBatchItems（纯裁决）', () => {
  it('模型漏行 → 系统补一行 missing（summary 留空，绝不伪造摘要）', () => {
    const completed = completeBatchItems(READY, [
      { materialId: 'mat-1', summary: '第一份材料讲了三件事。', status: 'summarized' },
      { materialId: 'mat-3', summary: '内容不可读。', status: 'skipped' },
    ]);
    expect(completed).toEqual([
      { materialId: 'mat-1', summary: '第一份材料讲了三件事。', status: 'summarized' },
      { materialId: 'mat-2', summary: '', status: 'missing' },
      { materialId: 'mat-3', summary: '内容不可读。', status: 'skipped' },
    ]);
  });

  it('行序恒按就绪材料闭集序（确定性：模型乱序不改账面次序）', () => {
    const completed = completeBatchItems(READY, [
      { materialId: 'mat-3', summary: 'c', status: 'summarized' },
      { materialId: 'mat-1', summary: 'a', status: 'summarized' },
      { materialId: 'mat-2', summary: 'b', status: 'summarized' },
    ]);
    expect(completed.map((item) => item.materialId)).toEqual(['mat-1', 'mat-2', 'mat-3']);
  });

  it('零行输入 → 全闭集补 missing（模型整体失灵也不丢材料）', () => {
    expect(completeBatchItems(READY, []).map((item) => item.status)).toEqual(['missing', 'missing', 'missing']);
  });

  it('同一 materialId 多行 → 整面拒（DuplicateBatchRowError）', () => {
    expect(() => completeBatchItems(READY, [
      { materialId: 'mat-1', summary: 'a', status: 'summarized' },
      { materialId: 'mat-1', summary: 'a2', status: 'summarized' },
    ])).toThrow(DuplicateBatchRowError);
  });

  it('闭集外 materialId → 整面拒（UnknownBatchMaterialError，不静默丢弃该行）', () => {
    expect(() => completeBatchItems(READY, [
      { materialId: 'mat-9', summary: '编造的地址', status: 'summarized' },
    ])).toThrow(UnknownBatchMaterialError);
  });

  it('模型自报 missing 同样进闭集裁决（不因状态名豁免地址检查）', () => {
    expect(() => completeBatchItems(READY, [
      { materialId: 'mat-9', summary: '', status: 'missing' },
    ])).toThrow(UnknownBatchMaterialError);
  });
});

describe('batchReportSchemaFor（会话作用域 schema：裁决落在 schema 边界）', () => {
  it('漏行经 schema 解析后已补齐 missing 行（裁决进产物本体，不留在读侧）', () => {
    const parsed = batchReportSchemaFor(READY).safeParse({
      items: [{ materialId: 'mat-2', summary: 'b', status: 'summarized' }],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      items: [
        { materialId: 'mat-1', summary: '', status: 'missing' },
        { materialId: 'mat-2', summary: 'b', status: 'summarized' },
        { materialId: 'mat-3', summary: '', status: 'missing' },
      ],
    });
  });

  it('编造地址 / 重复行经 schema 解析即整面拒（safeParse 不成功）', () => {
    const schema = batchReportSchemaFor(READY);
    expect(schema.safeParse({ items: [{ materialId: 'mat-9', summary: '', status: 'summarized' }] }).success).toBe(false);
    expect(schema.safeParse({
      items: [
        { materialId: 'mat-1', summary: 'a', status: 'summarized' },
        { materialId: 'mat-1', summary: 'b', status: 'summarized' },
      ],
    }).success).toBe(false);
  });

  /**
   * 静默降级零容忍的机器判据：会话作用域 schema 必须仍能转成 JSON Schema。
   * `.transform()` 会让 `z.toJSONSchema` 抛错，而 provider 侧对该异常有**无声**兜底
   * （退回 json_object 档位、零 notice）——那正是不变量四禁止的静默降档。
   * 故本裁决只用 Zod 4 的 `.check()`（谓词不进 JSON Schema，形状原样保留）。
   */
  it('会话作用域 schema 仍可转 JSON Schema（禁 transform：provider 侧降档是无声的）', () => {
    expect(() => z.toJSONSchema(batchReportSchemaFor(READY))).not.toThrow();
  });
});
