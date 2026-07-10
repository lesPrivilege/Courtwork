/**
 * Provider / 模型 / 推理强度配置（docs/52 #10 ①组）。
 * 读写本地配置；接真实流式时 UI 零改动——配置即路由输入。
 * 无假活开关：每一项都写入同一配置对象。
 */

export type ProviderId = 'deepseek' | 'qwen' | 'doubao';
export type ReasoningLevel = 'standard' | 'deep';

export interface ModelConfig {
  providerId: ProviderId;
  modelId: string;
  reasoning: ReasoningLevel;
}

export const PROVIDER_OPTIONS: ReadonlyArray<{
  id: ProviderId;
  label: string;
  models: ReadonlyArray<{ id: string; label: string }>;
}> = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
  },
  {
    id: 'qwen',
    label: '通义千问',
    models: [
      { id: 'qwen-plus', label: 'Qwen Plus' },
      { id: 'qwen-max', label: 'Qwen Max' },
    ],
  },
  {
    id: 'doubao',
    label: '豆包',
    models: [
      { id: 'doubao-pro', label: '豆包 Pro' },
      { id: 'doubao-lite', label: '豆包 Lite' },
    ],
  },
] as const;

export const REASONING_OPTIONS: ReadonlyArray<{ id: ReasoningLevel; label: string }> = [
  { id: 'standard', label: '标准' },
  { id: 'deep', label: '深思' },
] as const;

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  providerId: 'deepseek',
  modelId: 'deepseek-chat',
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

export function loadModelConfig(): ModelConfig {
  try {
    const raw = activeStore.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODEL_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ModelConfig>;
    const provider = PROVIDER_OPTIONS.find((item) => item.id === parsed.providerId);
    if (!provider) return { ...DEFAULT_MODEL_CONFIG };
    const modelId = provider.models.some((item) => item.id === parsed.modelId)
      ? (parsed.modelId as string)
      : provider.models[0]!.id;
    const reasoning: ReasoningLevel =
      parsed.reasoning === 'deep' || parsed.reasoning === 'standard' ? parsed.reasoning : 'standard';
    return { providerId: provider.id, modelId, reasoning };
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
  return { ...config, providerId: provider.id, modelId };
}
