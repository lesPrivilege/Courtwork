/**
 * 预算面（ADR-022 决定三：pi loop 原生无上限——`while(true)` 无计数器，
 * 上限必须由扩展或 sidecar 层补齐）。
 *
 * 语义边界，必须如实说出：usd 只能**事后**知道。一个回合的开销在该回合结束前无法确定，
 * 故本预算是「越限即停」，不是「永不越限」——最后一个回合总是可能压线越过上限。
 * 要做到「永不越限」需要请求前的开销预估，那是另一层能力，本票不做。
 */

export interface BudgetLimits {
  /** 回合上限（一次 prompt 内的 assistant 回合数）。 */
  readonly maxTurns?: number;
  /** 累计开销上限，美元。 */
  readonly maxUsd?: number;
}

export interface BudgetSnapshot {
  readonly turns: number;
  readonly usd: number;
  readonly exceeded: boolean;
  /** 越限理由；未越限时为 undefined。 */
  readonly reason?: string;
}

export interface Budget {
  snapshot(): BudgetSnapshot;
  /** 记一个回合的开销，返回记后的快照。 */
  recordTurn(costUsd: number): BudgetSnapshot;
  /** 归零，供同一会话开始新一轮 prompt 时复用。 */
  reset(): void;
}

export function createBudget(limits: BudgetLimits = {}): Budget {
  let turns = 0;
  let usd = 0;
  let reason: string | undefined;

  function evaluate(): BudgetSnapshot {
    // 已越限则不再改写理由：判定不回摆，先到的那条才是停下来的原因。
    if (reason === undefined) {
      if (limits.maxUsd !== undefined && usd >= limits.maxUsd) {
        reason = `累计开销 $${usd.toFixed(4)} 已达上限 $${limits.maxUsd}`;
      } else if (limits.maxTurns !== undefined && turns >= limits.maxTurns) {
        reason = `已用 ${turns} 个回合，达上限 ${limits.maxTurns} 回合`;
      }
    }
    return { turns, usd, exceeded: reason !== undefined, reason };
  }

  return {
    snapshot: evaluate,
    recordTurn(costUsd) {
      turns += 1;
      usd += Number.isFinite(costUsd) ? costUsd : 0;
      return evaluate();
    },
    reset() {
      turns = 0;
      usd = 0;
      reason = undefined;
    },
  };
}
