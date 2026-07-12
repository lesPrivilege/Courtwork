import type { GenerationUsage } from './types.js';

export interface ModelPrice {
  /** 每百万 input token 价格，人民币元。 */
  inputPerMillionRmb: number;
  /** 每百万 output token 价格，人民币元。 */
  outputPerMillionRmb: number;
}

/**
 * 价格表：数据与计价逻辑分离，价格变动只改这个文件（deliverable 4："价格表走配置文件
 * 可更新"）。数字来源 docs/18（2026-07 调研快照），只收录该报告给出完整 input+output
 * 双价的型号——未给全价格的型号（如 DeepSeek V4-Flash 只公开缓存命中价）
 * 不编造数字，直接不收录；estimateCostUsd 对未收录组合诚实返回
 * undefined（不计价，不是"零成本"，调用方应据此跳过 RuntimeGuard.checkUsd）。
 * 不区分缓存命中/未命中——统一按未命中价估算，估高不估低，对 maxUsd 预算护栏更安全。
 * 生产使用前应对照各家官网价格页刷新此表，此处数字有过期风险。
 */
export const PRICE_TABLE: Record<string, Record<string, ModelPrice>> = {
  deepseek: {
    'deepseek-v4-pro': { inputPerMillionRmb: 3, outputPerMillionRmb: 6 },
  },
};

/** RMB→USD 近似汇率（2026-07 量级），仅用于满足 RuntimeLimits.maxUsd 既有字段的美元单位——
 * DeepSeek 官网报价原始单位为人民币。汇率会漂移，这里只求量级正确。 */
const RMB_TO_USD_RATE = 1 / 7.1;

export function estimateCostUsd(providerId: string, modelId: string, usage: GenerationUsage | undefined): number | undefined {
  if (!usage) return undefined;
  const price = PRICE_TABLE[providerId]?.[modelId];
  if (!price) return undefined;
  const rmb = (usage.inputTokens / 1_000_000) * price.inputPerMillionRmb + (usage.outputTokens / 1_000_000) * price.outputPerMillionRmb;
  return rmb * RMB_TO_USD_RATE;
}
