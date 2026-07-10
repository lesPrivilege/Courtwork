/**
 * promptfoo `-o results.json` 输出的原始形状（仅取本层用得到的字段的最小切片）。
 * 只有 map-results.ts 允许把这份形状翻译成中性的 EvalRunResult——其余任何文件
 * 都不应该直接依赖这个类型。
 */
export interface PromptfooAssertionResult {
  pass: boolean;
  score: number;
  reason: string;
  assertion?: { type: string; value?: string };
}

export interface PromptfooGradingResult {
  pass: boolean;
  score: number;
  reason: string;
  componentResults?: PromptfooAssertionResult[];
}

export interface PromptfooResultRow {
  provider: { id: string; label?: string };
  success: boolean;
  score: number;
  latencyMs: number;
  cost: number;
  tokenUsage?: { total: number };
  /** generate-tests.ts 里塞进去的 vars，按 vars.caseId 把结果行找回对应 case。 */
  vars?: { caseId?: string; [key: string]: unknown };
  gradingResult?: PromptfooGradingResult;
}

export interface PromptfooResultsFile {
  evalId: string;
  results: { results: PromptfooResultRow[] };
}
