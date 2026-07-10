/**
 * 跑分器无关的中性评测结果格式：任何消费方（报告、回归对比、脚本）都只应该依赖
 * 这份形状，不知道任何具体跑分器的存在。跑分器绑定层单向负责把它自己的原始输出
 * 翻译成这份形状；换跑分器只需要重写那一层的映射代码，本文件与所有消费方原样
 * 不变。
 */
export interface ScoredCheck {
  pass: boolean;
  score: number;
  reason: string;
}

export interface EvalTimings {
  latencyMs: number;
}

export interface EvalRunResult {
  /** 产出这条结果的那一次跑分的标识，同一次跑分产出的所有结果共享同一个 runId。 */
  runId: string;
  caseId: string;
  /** 产出候选输出的模型/provider 标识（不透明字符串），与任何具体跑分器的 provider
   *  对象形状无关。 */
  provider: string;
  pass: boolean;
  score: number;
  ruleResults: ScoredCheck[];
  judgeResults: ScoredCheck[];
  timings: EvalTimings;
  cost: number;
  tokensUsed: number;
}

export interface EvalRunResultSet {
  scenario: 'S3' | 'S4';
  runResults: EvalRunResult[];
}
