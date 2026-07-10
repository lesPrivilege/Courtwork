import type { GenerationRequest, GenerationResponse, Provider } from './types.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import { DEEPSEEK_QUIRK_PROFILE, DOUBAO_QUIRK_PROFILE, QWEN_QUIRK_PROFILE } from './quirk-profile.js';
import { generateStructured } from './structured-output.js';
import { ProviderNotConfiguredError } from './errors.js';

/**
 * 鉴权形态判别联合（架构拍板 2026-07-10，packages/core/SPEC.md "凭证与计费形态正交建模"）：
 * 当期只实现 api_key，oauth_subscription 分支现在落入类型是为了未来接入订阅制 provider
 * 时不需要对这个类型做破坏性变更。合规红线：订阅制只接官方明示允许第三方工具接入的
 * （开放 OpenAI 兼容端点型）；模拟官方客户端/借用会话 token 的灰色桥接永不做——这条红线
 * 在 OAuth 分支真正实现时（T-provider.2 工单）必须原样带过去，不因为"能跑"就绕过。
 */
export interface ApiKeyAuth {
  readonly kind: 'api_key';
  /** 凭证注入接口：调用方负责产出这个字符串（MVP 环境变量、桌面端钥匙串对接归 polish、
   * SaaS 后端代理场景由代理层持有），本模块不关心 key 的来源，只保证拿到手后不落日志/
   * 不进错误消息（docs/27 红线）。 */
  readonly apiKey: string;
}
/** 占位判别分支：OAuth 设备流 + refresh token 钥匙串存储是 T-provider.2 增量工单，
 * 待首个官方开放的 plan 类 provider 需求拉动，字段形状本身留待那时再定——现在不编造。 */
export interface OAuthSubscriptionAuth {
  readonly kind: 'oauth_subscription';
}
export type ProviderAuth = ApiKeyAuth | OAuthSubscriptionAuth;

/**
 * 计费形态判别联合，与 ProviderAuth 正交（同一拍板）：metered 下 RuntimeGuard.maxUsd
 * 生效（Task 9/10 落地）；plan 下护栏应切换为额度/次数而非美元（UI 用量圆盘显示套餐
 * 余量，UI 侧归 polish）——本工单不实现 plan 分支的护栏逻辑，字段现在落入类型防止未来
 * 破坏性变更。
 */
export interface MeteredBilling {
  readonly kind: 'metered';
}
export interface PlanBilling {
  readonly kind: 'plan';
}
export type ProviderBilling = MeteredBilling | PlanBilling;

export interface OpenAICompatibleProviderConfig {
  auth: ProviderAuth;
  billing: ProviderBilling;
  modelId: string;
  timeoutMs?: number;
  maxTransportRetries?: number;
  maxValidationRetries?: number;
  /** 测试用可注入 fetch；生产缺省用全局 fetch。 */
  fetchImpl?: typeof fetch;
  /** 测试用可注入退避延迟；生产缺省用真实 setTimeout。 */
  delay?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TRANSPORT_RETRIES = 2;
const DEFAULT_MAX_VALIDATION_RETRIES = 2;

function realDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOpenAICompatibleProvider(profile: ProviderQuirkProfile, config: OpenAICompatibleProviderConfig): Provider {
  if (config.auth.kind !== 'api_key') {
    throw new ProviderNotConfiguredError(
      profile.providerId,
      `provider "${profile.providerId}" 的 auth.kind 是 "${config.auth.kind}"：当前实现只支持 "api_key"，` +
        `"oauth_subscription" 是为未来订阅制 provider 预留的类型占位（T-provider.2 工单），尚未实现。`,
    );
  }
  if (config.billing.kind !== 'metered') {
    throw new ProviderNotConfiguredError(
      profile.providerId,
      `provider "${profile.providerId}" 的 billing.kind 是 "${config.billing.kind}"：当前实现只支持 "metered"，` +
        `"plan" 是为未来套餐制 provider 预留的类型占位（T-provider.2 工单），RuntimeGuard.maxUsd 的计价假设建立在 metered 之上，尚未实现。`,
    );
  }
  if (!config.auth.apiKey || config.auth.apiKey.trim().length === 0) {
    throw new ProviderNotConfiguredError(
      profile.providerId,
      `provider "${profile.providerId}" 缺少 apiKey 配置：凭证必须通过配置注入（docs/27 三形态），不允许硬编码或静默回退到无鉴权调用。`,
    );
  }

  const httpConfig = {
    apiKey: config.auth.apiKey,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxTransportRetries: config.maxTransportRetries ?? DEFAULT_MAX_TRANSPORT_RETRIES,
    fetchImpl: config.fetchImpl ?? fetch,
    delay: config.delay ?? realDelay,
  };
  const maxValidationRetries = config.maxValidationRetries ?? DEFAULT_MAX_VALIDATION_RETRIES;

  return {
    id: profile.providerId,
    modelId: config.modelId,
    async generate(request: GenerationRequest): Promise<GenerationResponse> {
      const result = await generateStructured({
        profile,
        model: config.modelId,
        systemPrompt: request.systemPrompt,
        messages: request.messages,
        responseSchema: request.responseSchema,
        maxValidationRetries,
        httpConfig,
      });
      return { content: result.content, reasoningContent: result.reasoningContent, usage: result.usage };
    },
  };
}

/** 三家首批具名工厂的精简配置——固定 auth.kind='api_key'/billing.kind='metered'
 * （架构拍板 2026-07-10：判别字段已在通用工厂/类型层落地防破坏性变更，具名工厂当前只需
 * 暴露调用方真正要填的两项，不强迫调用方拼 auth/billing 对象）。 */
export interface NamedProviderConfig {
  apiKey: string;
  modelId: string;
  timeoutMs?: number;
  maxTransportRetries?: number;
  maxValidationRetries?: number;
  fetchImpl?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
}

function toGenericConfig(config: NamedProviderConfig): OpenAICompatibleProviderConfig {
  return {
    auth: { kind: 'api_key', apiKey: config.apiKey },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    timeoutMs: config.timeoutMs,
    maxTransportRetries: config.maxTransportRetries,
    maxValidationRetries: config.maxValidationRetries,
    fetchImpl: config.fetchImpl,
    delay: config.delay,
  };
}

/** MVP 首批三家的具名工厂（docs/18 §6.4/packages/core/SPEC.md TODO）——只需调用方提供
 * apiKey/modelId，quirk 配置由本文件固定绑定，调用方不需要知道 base URL/response_format
 * 档位这些细节，也不需要知道 auth/billing 判别字段的存在。未来新增 provider（如 Kimi）
 * 只需在 quirk-profile.ts 加一份配置 + 这里加一个三行的具名工厂，不需要改传输/校验/
 * 重试任何一层逻辑。 */
export function createDeepSeekProvider(config: NamedProviderConfig): Provider {
  return createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, toGenericConfig(config));
}

export function createQwenProvider(config: NamedProviderConfig): Provider {
  return createOpenAICompatibleProvider(QWEN_QUIRK_PROFILE, toGenericConfig(config));
}

export function createDoubaoProvider(config: NamedProviderConfig): Provider {
  return createOpenAICompatibleProvider(DOUBAO_QUIRK_PROFILE, toGenericConfig(config));
}
