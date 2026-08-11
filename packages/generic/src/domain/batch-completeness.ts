import * as z from 'zod';
import { BatchReportSchema, type BatchReportItem } from '../schemas/batch-report.js';

/**
 * 逐项完整性裁决（ADR-023 决定六 · 票面新增概念三）。
 *
 * 「每份就绪材料恰一行」是**系统**的判断，不是模型的自述。三条判据：
 *   1. 闭集外 materialId → 整面拒（模型不选择地址，ADR-016 决定二同族）；
 *   2. 同一 materialId 多行 → 整面拒（一份材料只能有一条结论）；
 *   3. 缺行 → 系统补一行 `missing`，`summary` 留空——「没做」必须在账面上看得见，
 *      且绝不由系统代写摘要（伪造比缺失更危险）。
 *
 * 行序恒按就绪材料闭集序：同一次运行的账面次序不随模型的输出次序漂移。
 */

/** 模型写了闭集外的 materialId（编造地址）。 */
export class UnknownBatchMaterialError extends Error {
  constructor(readonly materialId: string) {
    super(`批处理报告引用了不在本次就绪材料闭集内的 materialId "${materialId}"——地址由系统注入，模型不得自造`);
    this.name = 'UnknownBatchMaterialError';
  }
}

/** 同一份材料被写了多行。 */
export class DuplicateBatchRowError extends Error {
  constructor(readonly materialId: string) {
    super(`材料 ${materialId} 在批处理报告里出现多行——每份就绪材料恰一行`);
    this.name = 'DuplicateBatchRowError';
  }
}

/**
 * 闭集 × 模型行 → 完整的逐材料行。抛错即整面拒（调用方不得吞掉后半张表）。
 */
export function completeBatchItems(
  readyMaterialIds: readonly string[],
  items: readonly BatchReportItem[],
): BatchReportItem[] {
  const ready = new Set(readyMaterialIds);
  const byId = new Map<string, BatchReportItem>();
  for (const item of items) {
    if (!ready.has(item.materialId)) throw new UnknownBatchMaterialError(item.materialId);
    if (byId.has(item.materialId)) throw new DuplicateBatchRowError(item.materialId);
    byId.set(item.materialId, item);
  }
  return readyMaterialIds.map((materialId) =>
    byId.get(materialId) ?? { materialId, summary: '', status: 'missing' as const },
  );
}

/**
 * 会话作用域的 `generic.BatchReport` schema：把上面的裁决落在 **schema 边界**上，于是
 * 裁决发生在产物成形之前——补齐的 `missing` 行进的是产物本体与账本，不是读侧投影。
 *
 * 只用 Zod 4 的 `.check()`，**不用 `.transform()`**：`z.toJSONSchema` 对 transform 抛错，
 * 而 provider 侧对该异常有无声兜底（退回 json_object 档位、零 notice）——那是不变量四
 * 禁止的静默降档。`.check()` 的谓词不进 JSON Schema，形状原样保留，模型看见的仍是完整声明。
 */
export function batchReportSchemaFor(readyMaterialIds: readonly string[]): z.ZodType {
  const frozen = [...readyMaterialIds];
  return BatchReportSchema.check((ctx) => {
    let completed: BatchReportItem[];
    try {
      completed = completeBatchItems(frozen, ctx.value.items);
    } catch (error) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value,
        path: ['items'],
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    ctx.value.items = completed;
  });
}
