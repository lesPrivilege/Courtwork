export interface ModelPrice {
  /** 每百万 input token 价格，人民币元。 */
  inputPerMillionRmb: number;
  /** 每百万 output token 价格，人民币元。 */
  outputPerMillionRmb: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * 价格表：数据与计价逻辑分离，价格变动只改这个文件（deliverable 4："价格表走配置文件
 * 可更新"）。数字来源 docs/18（2026-07 调研快照），只收录该报告给出完整 input+output
 * 双价的型号——未给全价格的型号（如 DeepSeek V4-Flash 只公开缓存命中价、Qwen-Flash
 * 未公开输出价）不编造数字，直接不收录；estimateCostUsd 对未收录组合诚实返回
 * undefined（不计价，不是"零成本"，调用方应据此跳过 RuntimeGuard.checkUsd）。
 * 不区分缓存命中/未命中——统一按未命中价估算，估高不估低，对 maxUsd 预算护栏更安全。
 * 生产使用前应对照各家官网价格页刷新此表，此处数字有过期风险。
 */
export const PRICE_TABLE: Record<string, Record<string, ModelPrice>> = {
  deepseek: {
    'deepseek-v4-pro': { inputPerMillionRmb: 3, outputPerMillionRmb: 6 },
  },
  qwen: {
    'qwen3.5-plus': { inputPerMillionRmb: 0.8, outputPerMillionRmb: 4.8 },
  },
  doubao: {
    // doubao-seed-1.6 短输入区间（128–256 tokens）报价；豆包按输入长度分段计价，
    // 这里取文档给出的具体型号价，不是"旗舰版"那个无具体型号 id 的定性数字。
    // 注意：这是该型号最便宜的档位，不是本模块其余部分"估高不估低"的保守估计——
    // 本产品真实工作负载（长合同审查）远超 128–256 token 输入，真实成本大概率高于
    // 此估算，eval 阶段需按真实文档长度测算校准（docs/18 已点名此风险）。
    'doubao-seed-1.6': { inputPerMillionRmb: 2.4, outputPerMillionRmb: 24 },
  },
};

/** RMB→USD 近似汇率（2026-07 量级），仅用于满足 RuntimeLimits.maxUsd 既有字段的美元单位——
 * 三家首批 provider 官网报价原始单位均为人民币。汇率会漂移，这里只求量级正确。 */
const RMB_TO_USD_RATE = 1 / 7.1;

export function estimateCostUsd(providerId: string, modelId: string, usage: TokenUsage | undefined): number | undefined {
  if (!usage) return undefined;
  const price = PRICE_TABLE[providerId]?.[modelId];
  if (!price) return undefined;
  const rmb = (usage.inputTokens / 1_000_000) * price.inputPerMillionRmb + (usage.outputTokens / 1_000_000) * price.outputPerMillionRmb;
  return rmb * RMB_TO_USD_RATE;
}
