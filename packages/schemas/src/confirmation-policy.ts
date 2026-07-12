import * as z from 'zod';
import { ArtifactTypeIdSchema } from './artifact-type-id.js';

/**
 * 能力副作用分级（ABI 拍板③配套新契约，docs/68 施工输入）：confirmationPolicy 为
 * none 的准入判据。封闭枚举——工具绑定与 artifact descriptor 各自声明其副作用类，
 * core/ABI 据此双门强制：任一非 pure_read 即禁 none，包无权放宽。
 */
export const SideEffectClassEnum = z.enum([
  'pure_read',
  'file_write',
  'external_send',
  'mcp_side_effect',
  'authoritative_mutation',
]);
export type SideEffectClass = z.infer<typeof SideEffectClassEnum>;

/** 全 pure_read（含空集）才允许场景声明 confirmationPolicy: none。 */
export function sideEffectsPermitNoGate(effects: readonly SideEffectClass[]): boolean {
  return effects.every((effect) => effect === 'pure_read');
}

export const ConfirmationGateSchema = z
  .object({
    /** 存在时必须 ⊆ 场景 outputArtifacts（跨字段校验在场景声明层做）。 */
    artifact: ArtifactTypeIdSchema.optional(),
    label: z.string().min(1),
  })
  .strict();
export type ConfirmationGate = z.infer<typeof ConfirmationGateSchema>;

/**
 * 确认策略（ABI 拍板③）：none 仅限纯读取分析零外部写入的场景；写文件/MCP 副作用/
 * 对外发送/改权威态一律强制 gates——该约束不在本 schema 内判定（需要与工具/能力
 * 声明联判），由 PACKAGE-ABI 准入 + executor 运行时双门执行。
 */
export const ConfirmationPolicySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z.object({ mode: z.literal('gates'), gates: z.array(ConfirmationGateSchema).min(1) }).strict(),
]);
export type ConfirmationPolicy = z.infer<typeof ConfirmationPolicySchema>;
