/**
 * 所有规则评分函数的统一返回形状，与任何跑分器无关——promptfoo 适配层
 * （src/promptfoo/generate-tests.ts）负责把它翻译成 promptfoo 的 GradingResult。
 */
export interface RuleResult {
  pass: boolean;
  /** 0..1，供跨规则加权聚合与对比报告使用。 */
  score: number;
  reason: string;
}
