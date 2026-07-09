/** promptfoo `-o results.json` 输出里，本文件与 regression.ts 共用的最小切片。 */
export interface PromptfooResultRow {
  provider: { id: string; label?: string };
  success: boolean;
  score: number;
  latencyMs: number;
  cost: number;
  tokenUsage?: { total: number };
  /** generate-tests.ts 里塞进去的 vars，回归对比按 vars.caseId 匹配同一个 case。 */
  vars?: { caseId?: string; [key: string]: unknown };
}

export interface PromptfooResultsFile {
  results: { results: PromptfooResultRow[] };
}

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

export function summarizeByProvider(resultsFile: PromptfooResultsFile): ProviderSummary[] {
  const byProvider = new Map<string, PromptfooResultRow[]>();
  for (const row of resultsFile.results.results) {
    const rows = byProvider.get(row.provider.id) ?? [];
    rows.push(row);
    byProvider.set(row.provider.id, rows);
  }

  return Array.from(byProvider.entries()).map(([providerId, rows]) => {
    const totalTests = rows.length;
    const passed = rows.filter((r) => r.success).length;
    return {
      providerId,
      totalTests,
      passed,
      passRate: passed / totalTests,
      avgScore: rows.reduce((sum, r) => sum + r.score, 0) / totalTests,
      totalCost: rows.reduce((sum, r) => sum + (r.cost || 0), 0),
      totalTokens: rows.reduce((sum, r) => sum + (r.tokenUsage?.total || 0), 0),
      avgLatencyMs: rows.reduce((sum, r) => sum + r.latencyMs, 0) / totalTests,
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
