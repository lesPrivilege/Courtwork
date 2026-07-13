/**
 * Provider / 模型 / 推理强度配置（docs/design/principles.md ①组）。
 * 读写本地配置；接真实流式时 UI 零改动——配置即路由输入。
 * 无假活开关：每一项都写入同一配置对象。
 */

import {
  PROVIDER_DESCRIPTORS,
  getProviderDescriptor,
  isProviderId,
  resolveReasoningRoute,
  type ReasoningRoute,
  type ProviderId,
} from '@courtwork/provider';

export type { ProviderId } from '@courtwork/provider';
export type ReasoningLevel = 'standard' | 'deep';

export interface ModelConfig {
  providerId: ProviderId;
  modelId: string;
  reasoning: ReasoningLevel;
  discoveredModels?: string[];
}

export const PROVIDER_OPTIONS: ReadonlyArray<{
  id: ProviderId;
  label: string;
  models: ReadonlyArray<{ id: string; label: string }>;
  reasoningRoute: ReasoningRoute;
}> = PROVIDER_DESCRIPTORS.map((descriptor) => ({
  id: descriptor.id,
  label: descriptor.label,
  models: descriptor.recommendedModels.map((id) => ({ id, label: id })),
  reasoningRoute: descriptor.reasoningRoute,
}));

export const REASONING_OPTIONS: ReadonlyArray<{ id: ReasoningLevel; label: string }> = [
  { id: 'standard', label: '标准' },
  { id: 'deep', label: '深思' },
] as const;

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  providerId: 'deepseek',
  modelId: 'deepseek-v4-flash',
  reasoning: 'standard',
};

const STORAGE_KEY = 'courtwork.model-config.v1';

/** 可注入存储，便于 Node 单测；浏览器默认用 localStorage。 */
export type ConfigStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

const memoryStore = new Map<string, string>();
const defaultStore: ConfigStore = {
  getItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        return localStorage.getItem(key);
      } catch {
        /* fall through */
      }
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      try {
        localStorage.removeItem(key);
      } catch {
        /* fall through */
      }
    }
    memoryStore.delete(key);
  },
};

let activeStore: ConfigStore = defaultStore;

/** 测试钩：替换/重置存储后端。 */
export function __setModelConfigStoreForTests(store?: ConfigStore | null) {
  if (store === null || store === undefined) {
    memoryStore.clear();
    activeStore = defaultStore;
    return;
  }
  activeStore = store;
}

export function reasoningLabel(level: ReasoningLevel): string {
  return REASONING_OPTIONS.find((item) => item.id === level)?.label ?? '标准';
}

export function modelDisplayName(config: ModelConfig): string {
  const provider = PROVIDER_OPTIONS.find((item) => item.id === config.providerId);
  const model = provider?.models.find((item) => item.id === config.modelId);
  return model?.label ?? config.modelId;
}

export function effectiveBaseUrl(config: ModelConfig): string {
  return getProviderDescriptor(config.providerId).baseUrl;
}

export function modelOptions(config: ModelConfig): string[] {
  const provider = PROVIDER_OPTIONS.find((item) => item.id === config.providerId) ?? PROVIDER_OPTIONS[0]!;
  return [...new Set([...(config.discoveredModels ?? []), ...provider.models.map((item) => item.id), config.modelId].filter(Boolean))];
}

export function reasoningRequest(config: ModelConfig): { model: string; extraBody: Record<string, unknown> } {
  return resolveReasoningRoute(getProviderDescriptor(config.providerId).reasoningRoute, config.modelId, config.reasoning);
}

export function loadModelConfig(): ModelConfig {
  try {
    const raw = activeStore.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODEL_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ModelConfig>;
    if (typeof parsed.providerId !== 'string' || !isProviderId(parsed.providerId)) return { ...DEFAULT_MODEL_CONFIG };
    const provider = PROVIDER_OPTIONS.find((item) => item.id === parsed.providerId)!;
    const discoveredModels = Array.isArray(parsed.discoveredModels)
      ? parsed.discoveredModels.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : undefined;
    const modelId = typeof parsed.modelId === 'string' && parsed.modelId.length > 0
      ? parsed.modelId : provider.models[0]!.id;
    const reasoning: ReasoningLevel =
      parsed.reasoning === 'deep' || parsed.reasoning === 'standard' ? parsed.reasoning : 'standard';
    return { providerId: provider.id, modelId, reasoning, discoveredModels };
  } catch {
    return { ...DEFAULT_MODEL_CONFIG };
  }
}

export function saveModelConfig(config: ModelConfig): void {
  activeStore.setItem(STORAGE_KEY, JSON.stringify(config));
}
