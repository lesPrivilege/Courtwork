/**
 * 所有规则评分函数的统一返回形状，与任何跑分器无关——跑分器适配层负责把它
 * 翻译成跑分器原生的评分结果结构。
 */
export interface RuleResult {
  pass: boolean;
  /** 0..1，供跨规则加权聚合与对比报告使用。 */
  score: number;
  reason: string;
}
