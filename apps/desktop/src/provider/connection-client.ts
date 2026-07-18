import { invoke } from '@tauri-apps/api/core';
import { credentialClient, messageForFailKind, type CredentialFailKind, type ProviderReadiness } from '../credentials/client';
import { modelOptions, reasoningRequest, type ModelConfig } from './model-config';

export type ProviderConnectionFailKind = CredentialFailKind;
export type ProviderConnectionResult = ProviderReadiness;

type ProbeInput = { requestId: string; providerId: string; modelId: string; reasoningBody: Record<string, unknown> };

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function buildProbeInput(config: ModelConfig): ProbeInput {
  const route = reasoningRequest(config);
  return {
    requestId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `probe-${Date.now()}`,
    providerId: config.providerId, modelId: route.model, reasoningBody: route.extraBody,
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
  const connection = result.connection;
  if (connection.phase !== 'failed' || connection.failureMessage || !connection.failKind) return result;
  return { ...result, connection: { ...connection, failureMessage: messageForFailKind(connection.failKind) } };
}

export const providerConnectionClient = {
  async validate(config: ModelConfig, knownReadiness?: ProviderReadiness): Promise<ProviderConnectionResult> {
    const readiness = knownReadiness ?? await credentialClient.status();
    if (readiness.credential.phase !== 'stored') return readiness;
    if (!config.modelId.trim()) {
      return { ...readiness, connection: { phase: 'failed', failureMessage: '请选择模型', failKind: 'model' } };
    }
    if (!isTauriRuntime()) {
      if (browserOverride) return normalize(browserOverride);
      return {
        credential: readiness.credential,
        connection: { phase: 'ready', models: modelOptions(config), modelDiscovery: 'available' },
      };
    }
    try {
      return normalize(await invoke<ProviderConnectionResult>('validate_provider_connection', { input: buildProbeInput(config) }));
    } catch {
      return { ...readiness, connection: { phase: 'failed', failureMessage: messageForFailKind('platform'), failKind: 'platform' } };
    }
  },
};
