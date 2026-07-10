import type { EvalRunResult, EvalRunResultSet } from './results.js';

export interface RegressionFinding {
  caseId: string;
  providerId: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  regressed: boolean;
}

function keyOf(result: EvalRunResult): string {
  return `${result.provider}::${result.caseId}`;
}

/**
 * 回归模式：core / 提示词 / 场景定义变更后，把新跑分结果与之前存的基线结果对比，
 * 按 (provider, caseId) 匹配同一个用例——只有两边都存在的用例才有得比；新增用例
 * 没有基线可比，不计入回归发现（不是"通过"，是"跳过"）。
 */
export function findRegressions(
  baseline: EvalRunResultSet,
  current: EvalRunResultSet,
  threshold = 0.05,
): RegressionFinding[] {
  const baselineByKey = new Map<string, EvalRunResult>();
  for (const result of baseline.runResults) {
    baselineByKey.set(keyOf(result), result);
  }

  const findings: RegressionFinding[] = [];
  for (const result of current.runResults) {
    const baselineResult = baselineByKey.get(keyOf(result));
    if (!baselineResult) continue;

    const delta = result.score - baselineResult.score;
    findings.push({
      caseId: result.caseId,
      providerId: result.provider,
      baselineScore: baselineResult.score,
      currentScore: result.score,
      delta,
      regressed: delta <= -threshold,
    });
  }
  return findings;
}
