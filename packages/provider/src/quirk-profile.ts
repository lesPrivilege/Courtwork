import type { ProviderUsageSlots } from './types.js';

export type ResponseFormatTier = 'json_schema_strict' | 'json_schema' | 'json_object' | 'unsupported';
export type ReasoningLevel = 'standard' | 'deep';
export type ReasoningRoute =
  | { readonly kind: 'model_switch'; readonly models: Readonly<Record<ReasoningLevel, string>> }
  | { readonly kind: 'request_field'; readonly field: string; readonly values: Readonly<Record<ReasoningLevel, unknown>> };

export const OPENAI_COMPATIBLE_REASONING_ROUTE: ReasoningRoute = {
  kind: 'request_field', field: 'reasoning_effort', values: { standard: 'low', deep: 'high' },
};

export interface ProviderQuirkProfile {
  /** provider 的展示/日志用标识（不是 wire 层字段，wire 层的 model 走 modelId 单独配置）。 */
  readonly providerId: string;
  /**
   * Chat Completions 端点的完整 base URL，含各家自己的路径前缀。客户端只做
   * `${baseUrl}/chat/completions` 拼接，不额外假设 /v1 前缀。非 DeepSeek provider
   * 由后续插件/上游适配器提供完整 base URL，不在 core 猜测路径。
   */
  readonly baseUrl: string;
  /** 本 provider 对 response_format 的已知支持档位（docs/architecture/system.md provider 兼容边界）：静态声明，不是
   * 运行时探测——docs/architecture/system.md 本身就是逐家核对官方文档得出的结论，可信度高于臆测式探测。 */
  readonly responseFormat: { tier: ResponseFormatTier };
  /** 响应体 delta 里 reasoning 内容字段名候选，按数组顺序检查，命中第一个即归一化进
   * GenerationResponse.reasoningContent（docs/architecture/system.md quirk③）。只收录有文档依据的字段名，
   * 未证实的 provider 不在 core 编造额外候选。 */
  readonly reasoningFieldCandidates: readonly string[];
  /** 用户自配所需元数据与标准/深思 wire 映射。调用方只解释 kind，不按 providerId 分支。 */
  readonly recommendedModels: readonly string[];
  readonly reasoningRoute: ReasoningRoute;
  /** 已知参数互斥表：结构化输出要求优先，需要时显式降为 standard。 */
  readonly parameterCompatibility: {
    readonly structuredOutputWithDeepReasoning: 'supported' | 'downgrade_to_standard';
  };
  /**
   * provider 专属 usage 槽位映射（USAGE-LEDGER-1）：把 provider 原始 usage 对象投影为
   * cache hit/miss、reasoning 槽位。input/output 走通用归一，不在此列。缺省（无此字段）
   * 表示该 provider 只有通用 input/output 计量。provider 语义校验（如 hit+miss 与 prompt_tokens
   * 的关系）只住这里，校验不符时不投影不可信槽位（保持 unknown），rawUsage 由上游原样留存。
   */
  readonly mapUsage?: (rawUsage: unknown) => ProviderUsageSlots;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * DeepSeek 原始 usage → provider 专属归一化槽位。语义校验（hit+miss 与 prompt_tokens 的关系）
 * 只住此处：校验不符时不投影不可信的缓存分账（诚实保持 unknown），rawUsage 在上游原样留存，
 * 此处不修改任何原始数字，也不折叠缺失为 0。
 */
export function mapDeepSeekUsage(rawUsage: unknown): ProviderUsageSlots {
  if (!rawUsage || typeof rawUsage !== 'object' || Array.isArray(rawUsage)) return {};
  const record = rawUsage as Record<string, unknown>;
  const slots: {
    cacheHitInputTokens?: number;
    cacheMissInputTokens?: number;
    reasoningOutputTokens?: number;
  } = {};

  const details = record.completion_tokens_details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const reasoning = (details as Record<string, unknown>).reasoning_tokens;
    if (isNonNegativeInteger(reasoning)) slots.reasoningOutputTokens = reasoning;
  }

  const hit = record.prompt_cache_hit_tokens;
  const miss = record.prompt_cache_miss_tokens;
  const hitOk = isNonNegativeInteger(hit);
  const missOk = isNonNegativeInteger(miss);
  const prompt = record.prompt_tokens;
  // 只有 hit 与 miss 都在场才能做和值校验；对不上 prompt_tokens 就整体不投影缓存分账。
  if (hitOk && missOk && isNonNegativeInteger(prompt) && hit + miss !== prompt) {
    return slots;
  }
  if (hitOk) slots.cacheHitInputTokens = hit;
  if (missOk) slots.cacheMissInputTokens = miss;
  return slots;
}

export function applyReasoningRoute(
  profile: ProviderQuirkProfile,
  model: string,
  level: ReasoningLevel,
): { model: string; extraBody: Record<string, unknown> } {
  return resolveReasoningRoute(profile.reasoningRoute, model, level);
}

export function resolveReasoningRoute(
  route: ReasoningRoute,
  model: string,
  level: ReasoningLevel,
): { model: string; extraBody: Record<string, unknown> } {
  if (route.kind === 'model_switch') return { model: route.models[level], extraBody: {} };
  const value = route.values[level];
  // undefined 声明为"该档不发此字段"（缺省即 provider 默认），不产生 wire 键
  if (value === undefined) return { model, extraBody: {} };
  return { model, extraBody: { [route.field]: value } };
}

export const DEEPSEEK_QUIRK_PROFILE: ProviderQuirkProfile = {
  providerId: DEEPSEEK_CATALOG.id,
  baseUrl: DEEPSEEK_CATALOG.baseUrl,
  responseFormat: { tier: 'json_object' },
  reasoningFieldCandidates: ['reasoning_content'],
  recommendedModels: DEEPSEEK_CATALOG.models,
  // 架构裁决：V4 思考模式经 thinking 请求字段控制，与 flash/pro 档位解耦；
  // V4 缺省即 enabled——standard 档必须显式 disabled，否则 UI 档位被 provider 默认静默升级。
  // 模型名由用户所选直通，路由不再覆盖（#40 路由侧保证）。
  reasoningRoute: { kind: 'request_field', field: 'thinking', values: { standard: { type: 'disabled' }, deep: { type: 'enabled' } } },
  parameterCompatibility: { structuredOutputWithDeepReasoning: 'supported' },
  mapUsage: mapDeepSeekUsage,
};
import { DEEPSEEK_CATALOG } from './catalog.generated.js';
