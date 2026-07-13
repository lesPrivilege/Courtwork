/**
 * 长任务运行时保护四件套（docs/architecture/system.md 长任务协议③）：max_steps / max_seconds /
 * max_tool_calls / max_usd。具体阈值按 Courtwork 场景实测调整，不是照抄行业默认值——
 * 因此本模块不预置任何默认阈值，全部可选、缺省即不限制。
 *
 * maxUsd enforcement 现在是真实的（T-provider 工单接入真实 provider 后补齐）：
 * checkUsd() 按次 generate() 调用累加已花费美元，超过配置上限即中断。调用方（executor.ts）
 * 只在 provider 返回了 usage 且该 (providerId, modelId) 在价格表里有已知报价时才调用
 * checkUsd——usage 缺失（如 ScriptedProvider）或价格未知时诚实跳过，不是当作零成本。
 */
export interface RuntimeLimits {
  maxSteps?: number;
  maxSeconds?: number;
  maxToolCalls?: number;
  maxUsd?: number;
}

export class RuntimeLimitExceededError extends Error {
  constructor(
    public readonly limit: 'maxSteps' | 'maxSeconds' | 'maxToolCalls' | 'maxUsd',
    public readonly value: number,
  ) {
    super(`运行时保护触发：${limit} 已达到配置上限 ${value}`);
    this.name = 'RuntimeLimitExceededError';
  }
}

export interface RuntimeGuard {
  checkStep(): void;
  checkToolCall(): void;
  /** 异步工作返回后复核 wall-clock，避免单次长调用绕过 maxSeconds。 */
  checkTime(): void;
  /** 累加一次 generate() 调用的估算美元成本；超过 maxUsd 立即中断。 */
  checkUsd(costUsd: number): void;
}

/** nowSeconds 是可注入的时钟（测试用假时钟），返回"自 guard 创建以来经过的秒数"。 */
export function createRuntimeGuard(limits: RuntimeLimits, elapsedSeconds: () => number): RuntimeGuard {
  let steps = 0;
  let toolCalls = 0;
  let spentUsd = 0;

  function checkSeconds(): void {
    if (limits.maxSeconds !== undefined && elapsedSeconds() > limits.maxSeconds) {
      throw new RuntimeLimitExceededError('maxSeconds', limits.maxSeconds);
    }
  }

  return {
    checkStep() {
      steps += 1;
      if (limits.maxSteps !== undefined && steps > limits.maxSteps) {
        throw new RuntimeLimitExceededError('maxSteps', limits.maxSteps);
      }
      checkSeconds();
    },
    checkToolCall() {
      toolCalls += 1;
      if (limits.maxToolCalls !== undefined && toolCalls > limits.maxToolCalls) {
        throw new RuntimeLimitExceededError('maxToolCalls', limits.maxToolCalls);
      }
      checkSeconds();
    },
    checkTime() {
      checkSeconds();
    },
    checkUsd(costUsd: number) {
      spentUsd += costUsd;
      if (limits.maxUsd !== undefined && spentUsd > limits.maxUsd) {
        throw new RuntimeLimitExceededError('maxUsd', limits.maxUsd);
      }
    },
  };
}
