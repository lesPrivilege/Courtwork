import type { ScoreParam, PriorityRow } from './priority-score.js';

/**
 * 确定性打分核心——零 LLM（docs/62 §三）。RICE = Reach × Impact × Confidence ÷ Effort。
 * LLM 只做填表员从语料抽参数；此处纯算术，得分不经模型。
 * 计算器族机制的第二租户（法律包 S10 为第一租户）。
 */

const PRECISION = 2;

function round(n: number): number {
  const factor = 10 ** PRECISION;
  return Math.round(n * factor) / factor;
}

/** RICE 单点计算。effort 必须为正（分母）。 */
export function computeRicePoint(
  reach: number,
  impact: number,
  confidence: number,
  effort: number,
): number {
  if (effort <= 0) {
    throw new Error('effort 必须为正数（RICE 分母）');
  }
  return round((reach * impact * confidence) / effort);
}

/** 取参数的点值边界：单值 → {min,max} 相等；区间 → {low,high}。OOC 参数返回 null。 */
function paramBounds(param: ScoreParam): { min: number; max: number } | null {
  if (param.status === 'out_of_coverage') return null;
  if (param.value !== null) return { min: param.value, max: param.value };
  if (param.range !== null) return { min: param.range.low, max: param.range.high };
  return null;
}

/**
 * 行得分：全参数确定 → 单值；任一参数为裁量区间 → 得分传导为区间（敏感度标注）。
 * 单调性：分子参数（reach/impact/confidence）同向，分母 effort 反向——
 * 故 scoreHigh 取分子上界 ÷ effort 下界，scoreLow 取分子下界 ÷ effort 上界。
 * 任一参数 OOC（无可算点值）→ 返回 null（得分缺口，不伪造）。
 */
export function computeRowScore(params: PriorityRow['params']): number | { low: number; high: number } | null {
  const reach = paramBounds(params.reach);
  const impact = paramBounds(params.impact);
  const confidence = paramBounds(params.confidence);
  const effort = paramBounds(params.effort);
  if (!reach || !impact || !confidence || !effort) return null;

  const high = computeRicePoint(reach.max, impact.max, confidence.max, effort.min);
  const low = computeRicePoint(reach.min, impact.min, confidence.min, effort.max);
  if (low === high) return low;
  return { low, high };
}
