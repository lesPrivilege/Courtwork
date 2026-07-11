import { invoke } from '@tauri-apps/api/core';
import { credentialClient, type CredentialStatus } from '../credentials/client';
import { effectiveBaseUrl, modelOptions, reasoningRequest, type ModelConfig } from './model-config';

export type ProviderConnectionFailKind =
  | 'auth_failed' | 'rate_limited' | 'endpoint' | 'model' | 'timeout' | 'network' | 'invalid_response' | 'platform';

export interface ProviderConnectionResult extends Omit<CredentialStatus, 'failKind'> {
  models?: string[];
  modelDiscovery?: 'available' | 'unsupported';
  failKind?: CredentialStatus['failKind'] | ProviderConnectionFailKind;
}

export const PROVIDER_CONNECTION_MESSAGES: Record<ProviderConnectionFailKind, string> = {
  auth_failed: '访问凭证未通过服务商验证，请检查后重试',
  rate_limited: '服务商暂时限制了请求，请稍后重试',
  endpoint: '服务地址无法完成请求，请检查 Base URL',
  model: '当前模型不可用，请从模型列表选择或手动填写',
  timeout: '服务商响应超时，请稍后重试',
  network: '暂时无法连接服务商，请检查网络后重试',
  invalid_response: '服务商返回了无法识别的响应，请稍后重试',
  platform: '暂时无法验证连接，请重试',
};

type ProbeInput = {
  providerId: string;
  baseUrl: string;
  modelId: string;
  reasoningBody: Record<string, unknown>;
};

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function buildProbeInput(config: ModelConfig): ProbeInput {
  const route = reasoningRequest(config);
  return {
    providerId: config.providerId,
    baseUrl: effectiveBaseUrl(config),
    modelId: route.model,
    reasoningBody: route.extraBody,
  };
}

let browserOverride: ProviderConnectionResult | null = null;

export function installProviderConnectionTestHooks() {
  const hooks = {
    setResult(result: ProviderConnectionResult) { browserOverride = result; },
    clear() { browserOverride = null; },
  };
  if (typeof window !== 'undefined') {
    (window as unknown as { __courtworkProviderConnection?: typeof hooks }).__courtworkProviderConnection = hooks;
  }
  return hooks;
}

function normalize(result: ProviderConnectionResult): ProviderConnectionResult {
  if (result.phase !== 'failed' || result.failureMessage) return result;
  const kind = result.failKind as ProviderConnectionFailKind | undefined;
  return { ...result, failureMessage: kind ? PROVIDER_CONNECTION_MESSAGES[kind] : PROVIDER_CONNECTION_MESSAGES.platform };
}

export const providerConnectionClient = {
  async validate(config: ModelConfig): Promise<ProviderConnectionResult> {
    const credential = await credentialClient.status();
    if (credential.phase !== 'connected') return credential;
    if (!effectiveBaseUrl(config) || !config.modelId.trim()) {
      return { phase: 'failed', failureMessage: '请填写 Base URL 和模型名', failKind: 'endpoint' };
    }
    if (!isTauriRuntime()) {
      if (browserOverride) return normalize(browserOverride);
      return {
        phase: 'connected', source: credential.source,
        models: modelOptions(config), modelDiscovery: 'available',
      };
    }
    try {
      return normalize(await invoke<ProviderConnectionResult>('validate_provider_connection', { input: buildProbeInput(config) }));
    } catch {
      return { phase: 'failed', failureMessage: PROVIDER_CONNECTION_MESSAGES.platform, failKind: 'platform' };
    }
  },
};
