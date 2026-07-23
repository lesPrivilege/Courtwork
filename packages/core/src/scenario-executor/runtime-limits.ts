import type { WorkRuntimeBudget } from '../work-state/envelope.js';

/** 长任务运行时保护四件套；阈值全可选、缺省即不限制。 */
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

export class RuntimeBudgetConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeBudgetConfigurationError';
  }
}

/** production 由 WorkStateStore 拥有；stage 只更新下一次 whole-envelope CAS 的待提交快照。 */
export interface RuntimeBudgetPort {
  snapshot(): WorkRuntimeBudget;
  stageConsumed(next: WorkRuntimeBudget['consumed']): void;
}

export interface RuntimeGuard {
  checkStep(): void;
  checkToolCall(): void;
  /** 异步工作返回后复核 wall-clock，避免单次长调用绕过 maxSeconds。 */
  checkTime(): void;
  /** 累加一次 generate() 调用的估算美元成本；超过 maxUsd 立即中断。 */
  checkUsd(costUsd: number): void;
  /** paid terminal usage/price 不完整：保留已知估算，覆盖状态单向降为 partial。 */
  markCostCoveragePartial(): void;
  /** 当前 staged budget 的防御性快照。 */
  snapshot(): WorkRuntimeBudget;
}

function assertLimit(value: number | undefined, kind: keyof RuntimeLimits): void {
  if (value === undefined) return;
  const valid = kind === 'maxSteps' || kind === 'maxToolCalls'
    ? Number.isSafeInteger(value) && value >= 0
    : Number.isFinite(value) && value >= 0;
  if (!valid) {
    throw new RuntimeBudgetConfigurationError(`${kind} 必须是有限非负${kind === 'maxSteps' || kind === 'maxToolCalls' ? '安全整数' : '数'}`);
  }
}

function assertRuntimeLimits(limits: RuntimeLimits): void {
  assertLimit(limits.maxSteps, 'maxSteps');
  assertLimit(limits.maxSeconds, 'maxSeconds');
  assertLimit(limits.maxToolCalls, 'maxToolCalls');
  assertLimit(limits.maxUsd, 'maxUsd');
}

function isRuntimeBudgetPort(value: RuntimeLimits | RuntimeBudgetPort): value is RuntimeBudgetPort {
  return typeof (value as Partial<RuntimeBudgetPort>).snapshot === 'function'
    && typeof (value as Partial<RuntimeBudgetPort>).stageConsumed === 'function';
}

function cloneBudget(budget: WorkRuntimeBudget): WorkRuntimeBudget {
  return {
    limits: { ...budget.limits },
    costBasis: { ...budget.costBasis, assumptions: [...budget.costBasis.assumptions] },
    consumed: { ...budget.consumed },
  };
}

function inMemoryBudgetPort(
  limits: RuntimeLimits,
  costBasis?: WorkRuntimeBudget['costBasis'],
): RuntimeBudgetPort {
  assertRuntimeLimits(limits);
  let budget: WorkRuntimeBudget = {
    limits: { ...limits },
    costBasis: costBasis
      ? { ...costBasis, assumptions: [...costBasis.assumptions] }
      : { currency: 'USD', assumptions: [] },
    consumed: {
      steps: 0,
      toolCalls: 0,
      executionMs: 0,
      estimatedUsd: 0,
      costCoverage: costBasis?.priceTableVersion && costBasis.priceTableEffectiveAt ? 'complete' : 'partial',
    },
  };
  return {
    snapshot: () => cloneBudget(budget),
    stageConsumed(next) {
      budget = { ...budget, consumed: { ...next } };
    },
  };
}

/**
 * elapsedSeconds 返回本 leg 自 guard 创建以来的实际执行秒数；seed 来自 port，因此新 resume leg
 * 不会把停门等待墙钟算进 executionMs。RuntimeLimits overload 只为无持久 store 的纯测试/demo
 * 兼容，先归一成内存 port，后续走完全相同的算法。
 */
export function createRuntimeGuard(
  source: RuntimeLimits | RuntimeBudgetPort,
  elapsedSeconds: () => number,
  legacyCostBasis?: WorkRuntimeBudget['costBasis'],
): RuntimeGuard {
  const port = isRuntimeBudgetPort(source) ? source : inMemoryBudgetPort(source, legacyCostBasis);
  const initial = port.snapshot();
  assertRuntimeLimits(initial.limits);
  const seedExecutionMs = initial.consumed.executionMs;

  function stageLegTime(): WorkRuntimeBudget {
    const seconds = elapsedSeconds();
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new RuntimeBudgetConfigurationError('运行时预算时钟必须返回有限非负秒数');
    }
    const current = port.snapshot();
    const executionMs = Math.max(current.consumed.executionMs, seedExecutionMs + seconds * 1000);
    if (!Number.isFinite(executionMs)) {
      throw new RuntimeBudgetConfigurationError('累计 executionMs 失去有限数约束');
    }
    if (executionMs !== current.consumed.executionMs) {
      port.stageConsumed({ ...current.consumed, executionMs });
    }
    const staged = port.snapshot();
    if (
      staged.limits.maxSeconds !== undefined
      && staged.consumed.executionMs / 1000 > staged.limits.maxSeconds
    ) {
      throw new RuntimeLimitExceededError('maxSeconds', staged.limits.maxSeconds);
    }
    return staged;
  }

  return {
    checkStep() {
      const current = stageLegTime();
      const prospective = current.consumed.steps + 1;
      if (!Number.isSafeInteger(prospective)) {
        throw new RuntimeBudgetConfigurationError('累计 steps 失去非负安全整数约束');
      }
      if (current.limits.maxSteps !== undefined && prospective > current.limits.maxSteps) {
        throw new RuntimeLimitExceededError('maxSteps', current.limits.maxSteps);
      }
      port.stageConsumed({ ...current.consumed, steps: prospective });
    },
    checkToolCall() {
      const current = stageLegTime();
      const prospective = current.consumed.toolCalls + 1;
      if (!Number.isSafeInteger(prospective)) {
        throw new RuntimeBudgetConfigurationError('累计 toolCalls 失去非负安全整数约束');
      }
      if (current.limits.maxToolCalls !== undefined && prospective > current.limits.maxToolCalls) {
        throw new RuntimeLimitExceededError('maxToolCalls', current.limits.maxToolCalls);
      }
      port.stageConsumed({ ...current.consumed, toolCalls: prospective });
    },
    checkTime() {
      stageLegTime();
    },
    checkUsd(costUsd: number) {
      if (!Number.isFinite(costUsd) || costUsd < 0) {
        throw new RuntimeBudgetConfigurationError('单次成本估算必须是有限非负数');
      }
      const current = port.snapshot();
      const estimatedUsd = current.consumed.estimatedUsd + costUsd;
      if (!Number.isFinite(estimatedUsd)) {
        throw new RuntimeBudgetConfigurationError('累计 estimatedUsd 失去有限数约束');
      }
      port.stageConsumed({ ...current.consumed, estimatedUsd });
      if (current.limits.maxUsd !== undefined && estimatedUsd > current.limits.maxUsd) {
        throw new RuntimeLimitExceededError('maxUsd', current.limits.maxUsd);
      }
    },
    markCostCoveragePartial() {
      const current = port.snapshot();
      if (current.consumed.costCoverage !== 'partial') {
        port.stageConsumed({ ...current.consumed, costCoverage: 'partial' });
      }
    },
    snapshot() {
      return cloneBudget(port.snapshot());
    },
  };
}
