/**
 * 长任务运行时保护四件套（docs/12 长任务协议③）：max_steps / max_seconds /
 * max_tool_calls / max_usd。具体阈值按 Courtwork 场景实测调整，不是照抄行业默认值——
 * 因此本模块不预置任何默认阈值，全部可选、缺省即不限制。maxUsd 目前只是类型层面
 * 的配置占位：MVP 的假 provider 不产生真实费用、真实 provider 尚未接入，没有成本
 * 信号可供核对，暂不做实际执行时校验——诚实记录为"配置字段已就位，enforcement
 * 待真实 provider 接入后补"，不假装已经在管这件事。
 */
export interface RuntimeLimits {
  maxSteps?: number;
  maxSeconds?: number;
  maxToolCalls?: number;
  maxUsd?: number;
}

export class RuntimeLimitExceededError extends Error {
  constructor(
    public readonly limit: 'maxSteps' | 'maxSeconds' | 'maxToolCalls',
    public readonly value: number,
  ) {
    super(`运行时保护触发：${limit} 已达到配置上限 ${value}`);
    this.name = 'RuntimeLimitExceededError';
  }
}

export interface RuntimeGuard {
  checkStep(): void;
  checkToolCall(): void;
}

/** nowSeconds 是可注入的时钟（测试用假时钟），返回"自 guard 创建以来经过的秒数"。 */
export function createRuntimeGuard(limits: RuntimeLimits, elapsedSeconds: () => number): RuntimeGuard {
  let steps = 0;
  let toolCalls = 0;

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
  };
}
