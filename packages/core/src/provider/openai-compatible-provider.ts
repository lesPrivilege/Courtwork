import type { GenerationRequest, GenerationResponse, Provider, ProviderAuth, ProviderBilling } from './types.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import { DEEPSEEK_QUIRK_PROFILE, DOUBAO_QUIRK_PROFILE, QWEN_QUIRK_PROFILE } from './quirk-profile.js';
import { generateStructured } from './structured-output.js';
import { ProviderNotConfiguredError, ProviderNotImplementedError } from './errors.js';

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
    throw new ProviderNotImplementedError(
      profile.providerId,
      `provider "${profile.providerId}" 的 auth.kind 是 "${config.auth.kind}"：当前实现只支持 "api_key"，` +
        `"oauth_subscription" 是为未来订阅制 provider 预留的类型占位（T-provider.2 工单），尚未实现。`,
    );
  }
  if (config.billing.kind !== 'metered') {
    throw new ProviderNotImplementedError(
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
