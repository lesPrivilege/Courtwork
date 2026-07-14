import type { GenerationRequest, GenerationResponse, Provider, ProviderAuth, ProviderBilling, ProviderStreamEvent, ProviderStreamOptions, ProviderTransport } from './types.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import { DEEPSEEK_QUIRK_PROFILE } from './quirk-profile.js';
import { generateStructured } from './structured-output.js';
import { ProviderNotConfiguredError, ProviderNotImplementedError } from './errors.js';
import { applyReasoningRoute } from './quirk-profile.js';
import { streamChatCompletion } from './http-client.js';

export interface OpenAICompatibleProviderConfig {
  auth: ProviderAuth;
  billing: ProviderBilling;
  modelId: string;
  timeoutMs?: number;
  maxTransportRetries?: number;
  maxValidationRetries?: number;
  reasoningLevel?: 'standard' | 'deep';
  /** 测试用可注入 fetch；生产缺省用全局 fetch。 */
  fetchImpl?: typeof fetch;
  /** 测试用可注入退避延迟；生产缺省用真实 setTimeout。 */
  delay?: (ms: number) => Promise<void>;
  /** Desktop 生产路径注入 Rust Channel transport。 */
  transport?: ProviderTransport;
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
      `provider "${profile.providerId}" 缺少 apiKey 配置：凭证必须通过配置注入（docs/decisions/ADR-005-data-security.md 三形态），不允许硬编码或静默回退到无鉴权调用。`,
    );
  }

  const httpConfig = {
    apiKey: config.auth.apiKey,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxTransportRetries: config.maxTransportRetries ?? DEFAULT_MAX_TRANSPORT_RETRIES,
    fetchImpl: config.fetchImpl ?? fetch,
    delay: config.delay ?? realDelay,
    transport: config.transport,
  };
  const maxValidationRetries = config.maxValidationRetries ?? DEFAULT_MAX_VALIDATION_RETRIES;

  const provider: Provider = {
    id: profile.providerId,
    modelId: config.modelId,
    async *stream(request: GenerationRequest, options: ProviderStreamOptions = {}): AsyncIterable<ProviderStreamEvent> {
      if (request.responseSchema) {
        const result = await generateStructured({
          profile,
          model: config.modelId,
          systemPrompt: request.systemPrompt,
          messages: request.messages,
          responseSchema: request.responseSchema,
          maxValidationRetries,
          reasoningLevel: config.reasoningLevel,
          httpConfig,
        });
        const requestId = options.requestId ?? `provider-${Date.now()}`;
        let seq = 0;
        yield { type: 'started', requestId, seq: seq++, providerId: profile.providerId, modelId: config.modelId };
        for (const notice of result.notices ?? []) {
          yield { type: 'notice', requestId, seq: seq++, notice };
        }
        if (result.reasoningContent) yield { type: 'reasoning_delta', requestId, seq: seq++, delta: result.reasoningContent };
        if (result.content) yield { type: 'content_delta', requestId, seq: seq++, delta: result.content };
        if (result.usage) yield { type: 'usage', requestId, seq: seq++, ...result.usage };
        yield { type: 'completed', requestId, seq, finishReason: 'stop' };
        return;
      }
      const routed = config.reasoningLevel
        ? applyReasoningRoute(profile, config.modelId, config.reasoningLevel)
        : { model: config.modelId, extraBody: {} };
      const messages = [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        ...request.messages,
      ];
      yield* streamChatCompletion(profile, {
        model: routed.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...routed.extraBody,
      }, httpConfig, options);
    },
    async generate(request: GenerationRequest): Promise<GenerationResponse> {
      let content = '';
      let reasoningContent = '';
      let usage: GenerationResponse['usage'];
      const notices: NonNullable<GenerationResponse['notices']> = [];
      for await (const event of provider.stream(request)) {
        if (event.type === 'content_delta') content += event.delta;
        else if (event.type === 'reasoning_delta') reasoningContent += event.delta;
        else if (event.type === 'usage') usage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
        else if (event.type === 'notice') notices.push(event.notice);
        else if (event.type === 'failed') throw new Error(event.message);
      }
      return {
        content,
        reasoningContent: reasoningContent || undefined,
        usage,
        ...(notices.length > 0 ? { notices } : {}),
      };
    },
  };
  return provider;
}

/** DeepSeek 具名工厂的精简配置——固定 auth.kind='api_key'/billing.kind='metered'
 * （架构拍板 2026-07-10：判别字段已在通用工厂/类型层落地防破坏性变更，具名工厂当前只需
 * 暴露调用方真正要填的两项，不强迫调用方拼 auth/billing 对象）。 */
export interface NamedProviderConfig {
  apiKey: string;
  modelId: string;
  timeoutMs?: number;
  maxTransportRetries?: number;
  maxValidationRetries?: number;
  reasoningLevel?: 'standard' | 'deep';
  fetchImpl?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
  transport?: ProviderTransport;
}

function toGenericConfig(config: NamedProviderConfig): OpenAICompatibleProviderConfig {
  return {
    auth: { kind: 'api_key', apiKey: config.apiKey },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    timeoutMs: config.timeoutMs,
    maxTransportRetries: config.maxTransportRetries,
    maxValidationRetries: config.maxValidationRetries,
    reasoningLevel: config.reasoningLevel,
    fetchImpl: config.fetchImpl,
    delay: config.delay,
    transport: config.transport,
  };
}

/** 0.1 主路径只提供 DeepSeek 具名工厂——调用方只需提供
 * apiKey/modelId，quirk 配置由本文件固定绑定，调用方不需要知道 base URL/response_format
 * 档位这些细节，也不需要知道 auth/billing 判别字段的存在。未来新增 provider（如 Kimi）
 * 只需在 quirk-profile.ts 加一份配置 + 这里加一个三行的具名工厂，不需要改传输/校验/
 * 重试任何一层逻辑。 */
export function createDeepSeekProvider(config: NamedProviderConfig): Provider {
  return createOpenAICompatibleProvider(DEEPSEEK_QUIRK_PROFILE, toGenericConfig(config));
}
