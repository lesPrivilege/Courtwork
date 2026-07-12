/**
 * Provider / 模型 / 推理强度配置（docs/52 #10 ①组）。
 * 读写本地配置；接真实流式时 UI 零改动——配置即路由输入。
 * 无假活开关：每一项都写入同一配置对象。
 */

import {
  OPENAI_COMPATIBLE_REASONING_ROUTE,
  DEEPSEEK_QUIRK_PROFILE,
  resolveReasoningRoute,
  type ReasoningRoute,
  type ProviderQuirkProfile,
} from '@courtwork/core/provider-quirks';

export type ProviderId = 'deepseek' | 'custom';
export type ReasoningLevel = 'standard' | 'deep';

export interface ModelConfig {
  providerId: ProviderId;
  modelId: string;
  reasoning: ReasoningLevel;
  /** 预设档由 quirk 自动给出；custom 才允许用户编辑。 */
  baseUrl?: string;
  discoveredModels?: string[];
}

export const PROVIDER_OPTIONS: ReadonlyArray<{
  id: ProviderId;
  label: string;
  models: ReadonlyArray<{ id: string; label: string }>;
  profile?: ProviderQuirkProfile;
  reasoningRoute: ReasoningRoute;
}> = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: DEEPSEEK_QUIRK_PROFILE.recommendedModels.map((id) => ({ id, label: id })),
    profile: DEEPSEEK_QUIRK_PROFILE,
    reasoningRoute: DEEPSEEK_QUIRK_PROFILE.reasoningRoute,
  },
  {
    id: 'custom', label: '自定义（OpenAI 兼容）', models: [{ id: '', label: '手动填写模型名' }],
    reasoningRoute: OPENAI_COMPATIBLE_REASONING_ROUTE,
  },
] as const;

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
  const option = PROVIDER_OPTIONS.find((item) => item.id === config.providerId);
  if (option?.profile) return option.profile.baseUrl;
  const raw = config.baseUrl?.trim() ?? '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.pathname === '/' || url.pathname === '') url.pathname = '/v1';
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw.replace(/\/$/, '');
  }
}

export function modelOptions(config: ModelConfig): string[] {
  const provider = PROVIDER_OPTIONS.find((item) => item.id === config.providerId) ?? PROVIDER_OPTIONS[0]!;
  return [...new Set([...(config.discoveredModels ?? []), ...provider.models.map((item) => item.id), config.modelId].filter(Boolean))];
}

export function reasoningRequest(config: ModelConfig): { model: string; extraBody: Record<string, unknown> } {
  const option = PROVIDER_OPTIONS.find((item) => item.id === config.providerId) ?? PROVIDER_OPTIONS[0]!;
  return resolveReasoningRoute(option.reasoningRoute, config.modelId, config.reasoning);
}

export function loadModelConfig(): ModelConfig {
  try {
    const raw = activeStore.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODEL_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ModelConfig>;
    const provider = PROVIDER_OPTIONS.find((item) => item.id === parsed.providerId);
    if (!provider) return { ...DEFAULT_MODEL_CONFIG };
    const discoveredModels = Array.isArray(parsed.discoveredModels)
      ? parsed.discoveredModels.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : undefined;
    const modelId = typeof parsed.modelId === 'string' && parsed.modelId.length > 0
      ? parsed.modelId : provider.models[0]!.id;
    const reasoning: ReasoningLevel =
      parsed.reasoning === 'deep' || parsed.reasoning === 'standard' ? parsed.reasoning : 'standard';
    return { providerId: provider.id, modelId, reasoning, baseUrl: parsed.baseUrl, discoveredModels };
  } catch {
    return { ...DEFAULT_MODEL_CONFIG };
  }
}

export function saveModelConfig(config: ModelConfig): void {
  activeStore.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** 切换 provider 时若当前 model 不属于新 provider，落到该 provider 首个模型。 */
export function withProvider(config: ModelConfig, providerId: ProviderId): ModelConfig {
  const provider = PROVIDER_OPTIONS.find((item) => item.id === providerId) ?? PROVIDER_OPTIONS[0]!;
  const modelId = provider.models.some((item) => item.id === config.modelId)
    ? config.modelId
    : provider.models[0]!.id;
  return { ...config, providerId: provider.id, modelId, baseUrl: provider.id === 'custom' ? '' : undefined, discoveredModels: undefined };
}
