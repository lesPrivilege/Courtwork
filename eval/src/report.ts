import type { EvalRunResult, EvalRunResultSet } from './results.js';

export interface ProviderSummary {
  providerId: string;
  totalTests: number;
  passed: number;
  passRate: number;
  avgScore: number;
  totalCost: number;
  totalTokens: number;
  avgLatencyMs: number;
}

export function summarizeByProvider(resultSet: EvalRunResultSet): ProviderSummary[] {
  const byProvider = new Map<string, EvalRunResult[]>();
  for (const row of resultSet.runResults) {
    const rows = byProvider.get(row.provider) ?? [];
    rows.push(row);
    byProvider.set(row.provider, rows);
  }

  return Array.from(byProvider.entries()).map(([providerId, rows]) => {
    const totalTests = rows.length;
    const passed = rows.filter((r) => r.pass).length;
    return {
      providerId,
      totalTests,
      passed,
      passRate: passed / totalTests,
      avgScore: rows.reduce((sum, r) => sum + r.score, 0) / totalTests,
      totalCost: rows.reduce((sum, r) => sum + (r.cost || 0), 0),
      totalTokens: rows.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      avgLatencyMs: rows.reduce((sum, r) => sum + r.timings.latencyMs, 0) / totalTests,
    };
  });
}

/** 质量 × 成本 × 延迟对比报告（Markdown），末尾给出按平均分排序的选型建议。 */
export function formatComparisonReportMarkdown(summaries: ProviderSummary[], scenario: string): string {
  const header = `# ${scenario} 多 Provider 对比报告\n\n`;
  const tableHeader =
    '| Provider | 用例数 | 通过率 | 平均分 | 总成本 (USD) | 总 tokens | 平均延迟 (ms) |\n' +
    '|---|---|---|---|---|---|---|\n';
  const rows = summaries
    .map(
      (s) =>
        `| ${s.providerId} | ${s.totalTests} | ${(s.passRate * 100).toFixed(1)}% | ${s.avgScore.toFixed(3)} | ` +
        `${s.totalCost.toFixed(4)} | ${s.totalTokens} | ${s.avgLatencyMs.toFixed(0)} |`,
    )
    .join('\n');

  const ranked = [...summaries].sort((a, b) => b.avgScore - a.avgScore);
  const recommendation =
    ranked.length === 0
      ? '（无可比较的 provider 结果）'
      : `平均分最高：**${ranked[0].providerId}**（${ranked[0].avgScore.toFixed(3)}）。` +
        (ranked.length > 1
          ? ` 如更看重成本/延迟，可对比 ${ranked
              .slice(1)
              .map((s) => s.providerId)
              .join('、')} 的质量降幅是否在可接受范围内。`
          : '');

  return `${header}${tableHeader}${rows}\n\n## 选型建议\n\n${recommendation}\n`;
}
