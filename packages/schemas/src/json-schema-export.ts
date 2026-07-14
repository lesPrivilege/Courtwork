import * as z from 'zod';

/**
 * ABI-2A 唯一 Zod → wire schema 出口。
 *
 * target 与 fail-closed 策略必须显式写出，避免 Zod 默认值变更或不可表达节点
 * 被放宽成任意 JSON 后悄悄进入 IPC/跨语言契约。
 */
export function toDraft202012JsonSchema(schema: z.ZodType): z.core.JSONSchema.BaseSchema {
  return z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'throw',
  });
}
