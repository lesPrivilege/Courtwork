import * as z from 'zod';
import { createInMemoryCacheStore, cacheKeyFor, type ToolCacheStore } from './cache.js';

export const ToolFailureReasonEnum = z.enum([
  'timeout',
  'not_configured',
  'not_implemented',
  'out_of_coverage',
  'adapter_error',
  'invalid_response',
]);
export type ToolFailureReason = z.infer<typeof ToolFailureReasonEnum>;

/**
 * 判别联合：失败分支结构上不存在 data 字段（不是"data 为空"，是类型上不存在）。
 * 这是"失败降级只许标记未核验，绝不静默回退到模型生成"这条纪律的结构化落点。
 */
export function createToolEnvelopeSchema<DataSchema extends z.ZodTypeAny>(dataSchema: DataSchema) {
  return z.discriminatedUnion('verified', [
    z.object({
      verified: z.literal(true),
      data: dataSchema,
      source: z.string().min(1),
      checkedAt: z.string().min(1),
    }),
    z.object({
      verified: z.literal(false),
      reason: ToolFailureReasonEnum,
      message: z.string().min(1),
      checkedAt: z.string().min(1),
    }),
  ]);
}

export type ToolEnvelope<Data> =
  | { verified: true; data: Data; source: string; checkedAt: string }
  | { verified: false; reason: ToolFailureReason; message: string; checkedAt: string };

export interface ToolRunContext {
  signal: AbortSignal;
}

/**
 * 适配器：契约里可插拔的部分。同一个工具契约下 mock / demo-fixture / 真实适配器结构相同、
 * 互不知晓对方存在。
 *
 * sourceId 是该适配器的固定身份标识（如 'mock' / 'demo-fixture' / 'qcc'），在适配器构造时
 * 一次性声明，不是每次调用各自返回——这比"每次调用自报 source"更强：
 * 1）同一个 tool.id 在共享缓存下可能先后接入不同适配器（如 eval 对比 mock/demo-fixture/真实
 *    三种配置），缓存 key 需要把 sourceId 纳入才能不互相顶替（见 cache.ts 的 cacheKeyFor）；
 * 2）单次 run() 的实现不再可能"手滑"漏标或标错 source——没有每次调用重复声明的字段，
 *    自然没有和固定身份"对不上"的空间。
 */
export interface ToolAdapter<Input, Data> {
  readonly sourceId: string;
  run(input: Input, ctx: ToolRunContext): Promise<Data>;
}

export interface ToolDefinition<Input, Data> extends ToolAdapter<Input, Data> {
  id: string;
  inputSchema: z.ZodType<Input>;
  dataSchema: z.ZodType<Data>;
  timeoutMs: number;
  /** 未声明 = 不缓存。只有 verified:true 的结果会被缓存，失败/降级结果从不缓存。 */
  cacheTtlMs?: number;
}

/**
 * 组装工具契约（固定部分）与适配器（可插拔部分）。调用方必须显式传入 adapter——没有默认值，
 * 不存在"未配置时静默换成别的适配器"的路径。适配器的 sourceId 必须非空，否则在这里立刻
 * 抛错（构造期失败），不拖到运行期才发现"结果没法自我标识"。
 */
export function defineTool<Input, Data>(
  meta: Omit<ToolDefinition<Input, Data>, 'run' | 'sourceId'>,
  adapter: ToolAdapter<Input, Data>,
): ToolDefinition<Input, Data> {
  if (adapter.sourceId.trim().length === 0) {
    throw new Error(`工具 ${meta.id} 的适配器未声明 sourceId：结果必须自我标识来源（如 'mock' / 'qcc'），不允许匿名适配器`);
  }
  return { ...meta, sourceId: adapter.sourceId, run: (input, ctx) => adapter.run(input, ctx) };
}

export class ToolInputValidationError extends Error {
  constructor(
    public readonly toolId: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(
      `工具 ${toolId} 输入未通过 schema 校验：\n${issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n')}`,
    );
    this.name = 'ToolInputValidationError';
  }
}

/** 适配器在凭证/配置缺失时应抛出的错误，执行器将其降级为 reason: 'not_configured'。 */
export class ToolNotConfiguredError extends Error {
  constructor(
    public readonly toolId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ToolNotConfiguredError';
  }
}

/** 真实适配器骨架尚未接入具体请求/响应逻辑时应抛出的错误，执行器将其降级为 reason: 'not_implemented'。 */
export class ToolNotImplementedError extends Error {
  constructor(
    public readonly toolId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ToolNotImplementedError';
  }
}

/**
 * B 级信源（自建/演示库）查不到对应条目时应抛出的错误，执行器将其降级为 reason: 'out_of_coverage'。
 * 语义上"库里没有" ≠ "不存在"：禁止把覆盖缺口当成否定性结论，这条错误类型把这个区分类型化，
 * 不依赖调用方自己记得"查不到要报 unverified 而不是报'不存在'"。
 */
export class ToolOutOfCoverageError extends Error {
  constructor(
    public readonly toolId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ToolOutOfCoverageError';
  }
}

class ToolTimeoutError extends Error {
  constructor(toolId: string, timeoutMs: number) {
    super(`工具 ${toolId} 在 ${timeoutMs}ms 内未返回结果，判定超时`);
    this.name = 'ToolTimeoutError';
  }
}

export interface ToolExecutor {
  execute<Input, Data>(tool: ToolDefinition<Input, Data>, rawInput: unknown): Promise<ToolEnvelope<Data>>;
}

export function createToolExecutor(deps?: { cacheStore?: ToolCacheStore; now?: () => number }): ToolExecutor {
  const cacheStore = deps?.cacheStore ?? createInMemoryCacheStore(deps?.now);
  const now = deps?.now ?? Date.now;

  return {
    async execute<Input, Data>(tool: ToolDefinition<Input, Data>, rawInput: unknown): Promise<ToolEnvelope<Data>> {
      const parsedInput = tool.inputSchema.safeParse(rawInput);
      if (!parsedInput.success) {
        throw new ToolInputValidationError(tool.id, parsedInput.error.issues);
      }
      const input = parsedInput.data;

      const cacheKey = cacheKeyFor(tool.id, tool.sourceId, input);
      if (tool.cacheTtlMs !== undefined) {
        const cached = cacheStore.get<ToolEnvelope<Data>>(cacheKey);
        if (cached !== undefined) {
          return cached;
        }
      }

      const envelope = await runOnce(tool, input, now);

      if (envelope.verified && tool.cacheTtlMs !== undefined) {
        cacheStore.set(cacheKey, envelope, tool.cacheTtlMs);
      }

      return envelope;
    },
  };
}

async function runOnce<Input, Data>(
  tool: ToolDefinition<Input, Data>,
  input: Input,
  now: () => number,
): Promise<ToolEnvelope<Data>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ToolTimeoutError(tool.id, tool.timeoutMs));
    }, tool.timeoutMs);
  });

  try {
    const data = await Promise.race([tool.run(input, { signal: controller.signal }), timeout]);

    const parsedData = tool.dataSchema.safeParse(data);
    if (!parsedData.success) {
      return degrade('invalid_response', `工具 ${tool.id} 返回的 data 未通过输出 schema 校验：${parsedData.error.message}`, now);
    }

    return {
      verified: true,
      data: parsedData.data,
      source: tool.sourceId,
      checkedAt: new Date(now()).toISOString(),
    };
  } catch (error) {
    if (error instanceof ToolTimeoutError) {
      return degrade('timeout', error.message, now);
    }
    if (error instanceof ToolNotConfiguredError) {
      return degrade('not_configured', error.message, now);
    }
    if (error instanceof ToolNotImplementedError) {
      return degrade('not_implemented', error.message, now);
    }
    if (error instanceof ToolOutOfCoverageError) {
      return degrade('out_of_coverage', error.message, now);
    }
    const message = error instanceof Error ? error.message : String(error);
    return degrade('adapter_error', message, now);
  } finally {
    clearTimeout(timer);
  }
}

function degrade(
  reason: ToolFailureReason,
  message: string,
  now: () => number,
): { verified: false; reason: ToolFailureReason; message: string; checkedAt: string } {
  return { verified: false, reason, message, checkedAt: new Date(now()).toISOString() };
}
