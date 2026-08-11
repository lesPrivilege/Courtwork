import * as z from 'zod';
import type { ScenarioRuntime } from '@courtwork/registry';
import type { GradedToolBinding, ToolRegistry } from '../tools/tool-registry.js';
import { UnknownToolError } from './unknown-tool-error.js';

/**
 * 模型向系统请求白名单内只读工具的通道原语（TOOL-READ-1 · ADR-011 修订二）。
 *
 * 通道是 **turn 间**模式，与 interaction/confirmation 同族：模型在结构化输出里携 `request_tool`
 * 意图 → 本 turn 终结 → 系统解析意图并落既有 `deterministic_tool` 步执行 → 结果回喂下一 turn。
 * 回合内不循环：`runTurn` 不加多请求流，provider 层零 tools 字段。
 */

/**
 * 每 artifact 的 `request_tool` 轮次上界（裁定四）。
 *
 * 上界是**系统裁决**，写死在判据、不是 descriptor 可调项——需求实证后再议开放。达界显式
 * `step_failed`（reason 具名「工具请求超限」），既不静默截断也不无界循环。
 */
export const REQUEST_TOOL_MAX_ROUNDS = 3;

/**
 * 单枚工具结果回喂字节上界（裁定九）。
 *
 * 现行链路零截断，而 `material-read` 可拉入整份材料正文、轮次上界 3、且结果经
 * `context.toolResults` 贯穿后续每一次请求——无界会让 prompt 随轮次线性膨胀。
 * 同为系统常量，非 descriptor 可调项。
 */
export const MODEL_TOOL_RESULT_MAX_CHARS = 20_000;

/** 截断标记：同时进账本条目与 trace 呈现——截断这件事本身必须可见（不变量四）。 */
export const MODEL_TOOL_RESULT_TRUNCATION_MARK =
  '\n〔系统截断：本次工具结果超过 20000 字符上界，尾部已丢弃〕';

/**
 * 可请求白名单违反 `pure_read` 约束（ADR-011 修订二条件 3）。
 *
 * 比 `ConfirmationPolicyViolationError` 把守的确认前置门**更严**：那里放行 ADR-004 无损级
 * `copy-file`/`mkdir`，因为它们是场景声明期由人拍板的步；这里的调用方是模型，任何 effect
 * 都不在白名单内。
 */
export class RequestableToolPolicyError extends Error {
  constructor(scenarioId: string, toolId: string, sideEffect: string) {
    super(
      `场景 ${scenarioId} 的可请求工具白名单包含 "${toolId}"，其副作用类为 ${sideEffect}——`
      + '模型可点名的工具只允许 pure_read，core 强制、包无权放宽（ADR-011 修订二扩集条件 3）',
    );
    this.name = 'RequestableToolPolicyError';
  }
}

/** 模型请求超限（裁定四）：达轮次上界后第 4 次请求不执行，显式失败而非静默截断。 */
export class ToolRequestLimitExceededError extends Error {
  constructor(scenarioId: string, artifactType: string, toolId: string) {
    super(
      `场景 ${scenarioId} 产出 ${artifactType} 时的工具请求超限：`
      + `每件产出至多 ${REQUEST_TOOL_MAX_ROUNDS} 轮 request_tool，第 ${REQUEST_TOOL_MAX_ROUNDS + 1} 轮请求 "${toolId}" 不予执行`,
    );
    this.name = 'ToolRequestLimitExceededError';
  }
}

/** `step_failed{scope:'tool'}` 的具名 reason（裁定四）：与工具契约自身的失败族区分。 */
export const TOOL_REQUEST_LIMIT_REASON = '工具请求超限';

/**
 * 场景执行准入判定（裁定二）：白名单引用必解析、仅 `pure_read`。
 *
 * 在任何 provider 调用之前一次性判定——不合规的白名单结构上进不了执行路径，而不是等到
 * 模型真点名了才发现。`sideEffect` 缺省视同 `pure_read`（与 ToolRegistry 契约一致）。
 */
export function resolveRequestableTools(
  scenario: ScenarioRuntime,
  tools: ToolRegistry,
): Map<string, GradedToolBinding> {
  const resolved = new Map<string, GradedToolBinding>();
  for (const toolId of scenario.requestableToolIds ?? []) {
    const binding = tools.get(toolId);
    // UnknownToolError 与声明期 toolIds 共用——「引用必解析」是同一条律，不为本通道另造错误族。
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    const sideEffect = binding.sideEffect ?? 'pure_read';
    if (sideEffect !== 'pure_read') {
      throw new RequestableToolPolicyError(scenario.id, toolId, sideEffect);
    }
    resolved.set(toolId, binding);
  }
  return resolved;
}

/**
 * 当次注入的请求闭集（ADR-011 修订二条件 1）：`toolId` 以 `z.literal` 锁死。
 *
 * 闭集外的取值是普通不可信文本，校验层拒收，结构上进不了执行路径；空白名单返回 undefined
 * ——模型 schema 里根本没有这个通道，既不可发现也不可点名。
 */
export function buildRequestToolClosedSet(toolIds: readonly string[]): z.ZodTypeAny | undefined {
  if (toolIds.length === 0) return undefined;
  const literals = toolIds.map((id) => z.literal(id));
  const toolIdSchema: z.ZodTypeAny = literals.length === 1
    ? literals[0]
    // 单元素时不能走 z.union（zod 要求至少两支）；上面已按长度分流，此处必 ≥2。
    : z.union(literals as unknown as readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  return z
    .object({
      toolId: toolIdSchema,
      /** 工具入参交给该工具自己的 inputSchema 在执行边界校验；此处只保证不夹带别的键。 */
      input: z.unknown().optional(),
    })
    .strict();
}

/**
 * 工具信封 → 回喂折叠文本（裁定一/九）。
 *
 * 失败信封**原样透出**（verified:false + reason + message），不降级成空结果、不改写成成功态；
 * 超上界者尾部截断并附系统标记，标记同时进账本条目与 trace 呈现。
 */
export function foldToolResult(envelope: unknown): { content: string; truncated: boolean } {
  const raw = JSON.stringify(envelope) ?? 'null';
  if (raw.length <= MODEL_TOOL_RESULT_MAX_CHARS) return { content: raw, truncated: false };
  return {
    content: raw.slice(0, MODEL_TOOL_RESULT_MAX_CHARS) + MODEL_TOOL_RESULT_TRUNCATION_MARK,
    truncated: true,
  };
}

/**
 * 回喂键（裁定八）：模型请求所得结果与场景声明期工具结果同属会话作用域事实，合并进同一份
 * `context.toolResults`。轮次入键以免同一工具多轮互相顶替——同工具不同轮是不同事实。
 */
export function modelToolResultKey(toolId: string, round: number): string {
  return `${toolId}#request-${round}`;
}
