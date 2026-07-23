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

/**
 * 降级原因闭集（MODEL-CONFIG-EXPLICIT-1，裁决源 ARCH-SCOPE R-11 准全案）。
 * 不变量 4「静默降级零容忍」在配置面的落点：`loadModelConfig` 原有五条降级路径与
 * 存储层回落全部静默，其中 `reasoning_invalid` 最隐蔽——用户曾选「深思」，降级后
 * 静默变「标准」且随每次请求发出，账单与延迟特征随之改变，界面始终显示「标准」。
 */
export type ModelConfigDegradationReason =
  /** 存储中无值：首次运行的正常路径，或配置已丢失——两者在此不可区分，故不单独提示。 */
  | 'no_stored_value'
  /** localStorage 在场但读写抛异常，已回落内存：配置跨会话蒸发。宿主根本没有 localStorage 不属此列。 */
  | 'storage_unavailable'
  /** 存储有值但读取/解析抛异常。 */
  | 'unreadable'
  /** providerId 非法：整份配置退默认。 */
  | 'provider_invalid'
  /** modelId 缺失或非字符串：退该 provider 首个模型。 */
  | 'model_invalid'
  /** reasoning 档位非法：退 standard。 */
  | 'reasoning_invalid';

export interface ModelConfigDegradation {
  /** 闭集；可多因并发（如 modelId 与 reasoning 同时损坏）。 */
  readonly reasons: readonly ModelConfigDegradationReason[];
}

/**
 * 加法式扩展：**仅在确有降级时**携 `degradation`。未降级路径的返回值不多出任何可枚举
 * 字段，故既有消费者（含 `toEqual` round-trip 断言）语义逐字不变。
 */
export interface LoadedModelConfig extends ModelConfig {
  readonly degradation?: ModelConfigDegradation;
}

export type ModelConfigSaveResult =
  | { persisted: true }
  | { persisted: false; reason: 'storage_unavailable' };

/**
 * 是否值得向用户提示。`no_stored_value` 单独出现时**不提示**——它同时覆盖「首次运行」
 * 与「配置已丢失」，二者在本函数视角不可区分，对首次运行提示「配置已重置」是假警报。
 * 其余原因均意味着「确有存储内容却未能按其运行」，属真降级。
 */
export function isUserVisibleDegradation(degradation?: ModelConfigDegradation): boolean {
  if (!degradation) return false;
  return degradation.reasons.some((reason) => reason !== 'no_stored_value');
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

/**
 * localStorage 在场却抛异常、已回落内存（sticky）。原实现三处裸 catch 各自静默
 * fall through，配置跨会话蒸发无痕；此标记让 `loadModelConfig` 能报 `storage_unavailable`。
 * sticky 是有意的：localStorage 一旦开始抛，本次会话内不会自愈。
 * **只在 catch 内置位**——宿主根本没有 localStorage（如 Node 单测）是环境事实不是降级，
 * 若一并计入会让每次默认存储加载都误报，happy path 的字节等同随之破裂（本票实测踩过）。
 */
let storageFellBackToMemory = false;

function writeDefaultStoreItem(key: string, value: string): boolean {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      storageFellBackToMemory = true;
      memoryStore.set(key, value);
      return false;
    }
  }
  memoryStore.set(key, value);
  return true;
}

const defaultStore: ConfigStore = {
  getItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        return localStorage.getItem(key);
      } catch {
        storageFellBackToMemory = true;
      }
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key, value) => { void writeDefaultStoreItem(key, value); },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      try {
        localStorage.removeItem(key);
      } catch {
        storageFellBackToMemory = true;
      }
    }
    memoryStore.delete(key);
  },
};

let activeStore: ConfigStore = defaultStore;

/** 测试钩：替换/重置存储后端。 */
export function __setModelConfigStoreForTests(store?: ConfigStore | null) {
  storageFellBackToMemory = false;
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

/**
 * 剥去降级标记，得到可安全外传/持久的纯配置。两个消费点（App.tsx 与应用入口 main.tsx）
 * 共用此原语——票面 #5「降级只在本地 UI 与返回值显式」的单点落实，不靠各调用点自觉解构。
 */
export function stripDegradation(config: LoadedModelConfig): ModelConfig {
  const { providerId, modelId, reasoning, discoveredModels } = config;
  return { providerId, modelId, reasoning, discoveredModels };
}

/** 仅在 reasons 非空时挂 `degradation`——未降级路径返回值逐字等同于原实现。 */
function withDegradation(config: ModelConfig, reasons: ModelConfigDegradationReason[]): LoadedModelConfig {
  return reasons.length > 0 ? { ...config, degradation: { reasons } } : config;
}

export function loadModelConfig(): LoadedModelConfig {
  const reasons: ModelConfigDegradationReason[] = [];

  // 存储读取单独包一层：store 自身抛出（不可用）与载荷不可解析（unreadable）是两回事，
  // 原实现的单一裸 catch 把两者压成同一条静默路径。
  let raw: string | null;
  try {
    raw = activeStore.getItem(STORAGE_KEY);
  } catch {
    return withDegradation({ ...DEFAULT_MODEL_CONFIG }, ['storage_unavailable']);
  }
  if (storageFellBackToMemory) reasons.push('storage_unavailable');

  if (!raw) {
    reasons.push('no_stored_value');
    return withDegradation({ ...DEFAULT_MODEL_CONFIG }, reasons);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    reasons.push('unreadable');
    return withDegradation({ ...DEFAULT_MODEL_CONFIG }, reasons);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    reasons.push('unreadable');
    return withDegradation({ ...DEFAULT_MODEL_CONFIG }, reasons);
  }
  const candidate = parsed as Partial<ModelConfig>;

  if (typeof candidate.providerId !== 'string' || !isProviderId(candidate.providerId)) {
    reasons.push('provider_invalid');
    return withDegradation({ ...DEFAULT_MODEL_CONFIG }, reasons);
  }
  const provider = PROVIDER_OPTIONS.find((item) => item.id === candidate.providerId)!;
  const discoveredModels = Array.isArray(candidate.discoveredModels)
    ? candidate.discoveredModels.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : undefined;

  let modelId: string;
  if (typeof candidate.modelId === 'string' && candidate.modelId.length > 0) {
    modelId = candidate.modelId;
  } else {
    modelId = provider.models[0]!.id;
    reasons.push('model_invalid');
  }

  let reasoning: ReasoningLevel;
  if (candidate.reasoning === 'deep' || candidate.reasoning === 'standard') {
    reasoning = candidate.reasoning;
  } else {
    // 本票核心路径：用户曾选 deep，此处静默降为 standard 且随每次请求发出。
    reasoning = 'standard';
    reasons.push('reasoning_invalid');
  }

  return withDegradation({ providerId: provider.id, modelId, reasoning, discoveredModels }, reasons);
}

/**
 * 降级标记只属本次加载，**永不写回存储**——否则它会被下次读取当成配置内容，
 * 且违反「降级不携配置内容外流」。此处显式剔除而非依赖调用方自觉。
 */
export function saveModelConfig(config: ModelConfig | LoadedModelConfig): ModelConfigSaveResult {
  const { providerId, modelId, reasoning, discoveredModels } = config;
  const serialized = JSON.stringify({ providerId, modelId, reasoning, discoveredModels });
  try {
    if (activeStore === defaultStore) {
      return writeDefaultStoreItem(STORAGE_KEY, serialized)
        ? { persisted: true }
        : { persisted: false, reason: 'storage_unavailable' };
    }
    activeStore.setItem(STORAGE_KEY, serialized);
    return { persisted: true };
  } catch {
    return { persisted: false, reason: 'storage_unavailable' };
  }
}
