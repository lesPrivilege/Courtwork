import type { CostEstimate, ProviderUsage } from './types.js';

export interface ModelPrice {
  /** 每百万 input token 价格，人民币元。 */
  inputPerMillionRmb: number;
  /** 每百万 output token 价格，人民币元。 */
  outputPerMillionRmb: number;
}

/**
 * 版本化价目表（USAGE-LEDGER-1）：价格数值与版本元数据、汇率、建模口径打包在一起。
 * version/effectiveAt 锁定一次估算所用的价格快照——历史 estimate 记住自己的版本，不被后续
 * 价目表版本静默重算（原始计量与派生估价分开、互不覆盖）。
 */
export interface PriceTable {
  /** 价目表版本标识：随每个 CostEstimate 一并留痕。 */
  readonly version: string;
  /** 该价目表版本的溯源标记（调研快照口径，不是 DeepSeek 峰谷/别名调价日）。 */
  readonly effectiveAt: string;
  /** RMB→USD 近似汇率；会漂移，只求量级正确。 */
  readonly rmbToUsdRate: number;
  /** 建模口径记录，随 estimate 一并留痕（缓存命中未单独计价、汇率近似等）。 */
  readonly assumptions: readonly string[];
  /** providerId → modelId → 双价；只收录有完整 input+output 价的型号，缺价不编造。 */
  readonly prices: Record<string, Record<string, ModelPrice>>;
}

/**
 * 当期 DeepSeek 官方价目静态快照（2026-07-24 核验）。effectiveAt 是仓库核验时点，不冒充
 * provider 调价生效日；运行时不联网刷新。缓存命中价不参与本版估算，因为现有 usage 尚不足以
 * 对全部 input token 可靠拆分 hit/miss，故统一采用缓存未命中价，保持 maxUsd 护栏估高不估低。
 */
export const PRICE_TABLE: PriceTable = {
  version: '2026-07-24-deepseek-pricing',
  effectiveAt: '2026-07-24T00:00:00+08:00',
  rmbToUsdRate: 1 / 7.1,
  assumptions: [
    '全部 input token 统一按缓存未命中价估算（估高不估低；当前 usage 不足以可靠拆分全部缓存命中/未命中输入）',
    'RMB→USD 按 1/7.1 近似汇率换算（DeepSeek 官网原始单位为人民币）',
  ],
  prices: {
    deepseek: {
      'deepseek-v4-flash': { inputPerMillionRmb: 1, outputPerMillionRmb: 2 },
      'deepseek-v4-pro': { inputPerMillionRmb: 3, outputPerMillionRmb: 6 },
    },
  },
};

/**
 * 从原始计量派生版本化估价。返回判别式 CostEstimate（而非裸数），把所用价目表版本、生效
 * 标记与建模假设一并锁进结果——同一原始计量在不同 priceTableVersion 下产生不同 estimate，
 * 已算出的 estimate 不被后续版本就地改写。
 *
 * 缺失 = unknown ≠ 0：input/output 任一槽位缺失都诚实返回 undefined（unknown 传染），不把缺失
 * 当作 0 去凑价。缓存命中/未命中分账保留在计量真源里，但估价只用总 input token 的未命中价，
 * 不凭空发明缓存命中折扣价。未收录的 provider/model 或 usage 缺失时返回 undefined，
 * 调用方据此跳过 RuntimeGuard.checkUsd（不计价，不是零成本）。
 */
export function estimateCostUsd(
  providerId: string,
  modelId: string,
  usage: ProviderUsage | undefined,
  table: PriceTable = PRICE_TABLE,
): CostEstimate | undefined {
  if (!usage) return undefined;
  if (usage.inputTokens === undefined || usage.outputTokens === undefined) return undefined;
  const price = table.prices[providerId]?.[modelId];
  if (!price) return undefined;
  const rmb =
    (usage.inputTokens / 1_000_000) * price.inputPerMillionRmb +
    (usage.outputTokens / 1_000_000) * price.outputPerMillionRmb;
  return {
    kind: 'estimate',
    usd: rmb * table.rmbToUsdRate,
    priceTableVersion: table.version,
    effectiveAt: table.effectiveAt,
    assumptions: [...table.assumptions],
  };
}
