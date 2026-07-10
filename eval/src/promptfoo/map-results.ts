import type { EvalRunResult, ScoredCheck } from '../results.js';
import type { PromptfooResultRow, PromptfooResultsFile } from './raw-results.js';

function mapComponentResults(row: PromptfooResultRow, assertionType: string): ScoredCheck[] {
  return (row.gradingResult?.componentResults ?? [])
    .filter((component) => component.assertion?.type === assertionType)
    .map((component) => ({ pass: component.pass, score: component.score, reason: component.reason }));
}

/**
 * 把 promptfoo `-o results.json` 的原始输出翻译成中性的 EvalRunResult[]——本文件是
 * 全仓库唯一知道 componentResults/assertion.type 这类 promptfoo 输出结构的地方，
 * 其余消费方（report.ts/regression.ts/scripts/**）只看得到映射后的中性形状。
 */
export function mapResultsFileToRunResults(resultsFile: PromptfooResultsFile): EvalRunResult[] {
  const runId = resultsFile.evalId;

  return resultsFile.results.results.map((row) => {
    const caseId = row.vars?.caseId;
    if (!caseId) {
      throw new Error(`结果行缺少 vars.caseId，无法映射为中性格式（provider=${row.provider.id}）`);
    }

    return {
      runId,
      caseId,
      provider: row.provider.id,
      pass: row.success,
      score: row.score,
      ruleResults: mapComponentResults(row, 'javascript'),
      judgeResults: mapComponentResults(row, 'llm-rubric'),
      timings: { latencyMs: row.latencyMs },
      cost: row.cost || 0,
      tokensUsed: row.tokenUsage?.total || 0,
    };
  });
}
