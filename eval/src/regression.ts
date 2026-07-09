import type { PromptfooResultsFile, PromptfooResultRow } from './report.js';

export interface RegressionFinding {
  caseId: string;
  providerId: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  regressed: boolean;
}

function keyOf(row: PromptfooResultRow): string | undefined {
  const caseId = row.vars?.caseId;
  return caseId ? `${row.provider.id}::${caseId}` : undefined;
}

/**
 * 回归模式：core / 提示词 / 场景定义变更后，把新跑分结果与之前存的基线结果对比，
 * 按 (provider, caseId) 匹配同一个用例——只有两边都存在的用例才有得比；新增用例
 * 没有基线可比，不计入回归发现（不是"通过"，是"跳过"）。
 */
export function findRegressions(
  baseline: PromptfooResultsFile,
  current: PromptfooResultsFile,
  threshold = 0.05,
): RegressionFinding[] {
  const baselineByKey = new Map<string, PromptfooResultRow>();
  for (const row of baseline.results.results) {
    const key = keyOf(row);
    if (key) baselineByKey.set(key, row);
  }

  const findings: RegressionFinding[] = [];
  for (const row of current.results.results) {
    const key = keyOf(row);
    if (!key) continue;
    const baselineRow = baselineByKey.get(key);
    if (!baselineRow) continue;

    const delta = row.score - baselineRow.score;
    findings.push({
      caseId: row.vars!.caseId!,
      providerId: row.provider.id,
      baselineScore: baselineRow.score,
      currentScore: row.score,
      delta,
      regressed: delta <= -threshold,
    });
  }
  return findings;
}
