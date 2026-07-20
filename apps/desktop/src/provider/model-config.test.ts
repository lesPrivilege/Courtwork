import { afterEach, describe, expect, it } from 'vitest';
import {
  __setModelConfigStoreForTests,
  DEFAULT_MODEL_CONFIG,
  loadModelConfig,
  modelDisplayName,
  reasoningLabel,
  saveModelConfig,
  effectiveBaseUrl,
  modelOptions,
  reasoningRequest,
  isUserVisibleDegradation,
  stripDegradation,
} from './model-config';

afterEach(() => {
  __setModelConfigStoreForTests(null);
});

describe('model-config', () => {
  it('defaults and labels（无值走默认，但降级显式——不再静默落默认）', () => {
    // MODEL-CONFIG-EXPLICIT-1 票面 #4：原断言为「静默落默认」的正向锁，已按架构授权改写为反例。
    const loaded = loadModelConfig();
    expect(loaded.degradation?.reasons).toEqual(['no_stored_value']);
    expect(stripDegradation(loaded)).toEqual({ ...DEFAULT_MODEL_CONFIG, discoveredModels: undefined });
    expect(modelDisplayName(DEFAULT_MODEL_CONFIG)).toBe('deepseek-v4-flash');
    expect(reasoningLabel('deep')).toBe('深思');
    expect(reasoningLabel('standard')).toBe('标准');
  });

  it('persists DeepSeek model/reasoning and discovered models round-trip', () => {
    const next = { ...DEFAULT_MODEL_CONFIG, modelId: 'deepseek-v4-pro', reasoning: 'deep' as const, discoveredModels: ['deepseek-v4-pro'] };
    saveModelConfig(next);
    expect(loadModelConfig()).toEqual(next);
  });

  it('uses the registered DeepSeek endpoint and never accepts an editable base URL', () => {
    expect(effectiveBaseUrl(DEFAULT_MODEL_CONFIG)).toBe('https://api.deepseek.com/v1');
    expect(modelOptions({ ...DEFAULT_MODEL_CONFIG, modelId: 'deepseek-v4-pro', discoveredModels: ['deepseek-v4-pro'] }))
      .toEqual(['deepseek-v4-pro', 'deepseek-v4-flash']);
  });

  it('reasoning request delegates to the declared quirk route', () => {
    // #41：DeepSeek deep 档经 thinking 请求字段；模型名 = 用户所选，路由不覆盖（#40）
    expect(reasoningRequest({ ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' })).toEqual({
      model: 'deepseek-v4-flash', extraBody: { thinking: { type: 'enabled' } },
    });
  });

  it('0.1 product registry exposes only DeepSeek', async () => {
    const { PROVIDER_OPTIONS } = await import('./model-config');
    expect(PROVIDER_OPTIONS.map((provider) => provider.id)).toEqual(['deepseek']);
  });

  it('migrates legacy custom/baseUrl storage back to the DeepSeek default', () => {
    const store = new Map<string, string>();
    store.set('courtwork.model-config.v1', JSON.stringify({
      providerId: 'custom', modelId: 'law-local', reasoning: 'deep', baseUrl: 'https://gateway.example/v1',
    }));
    __setModelConfigStoreForTests({
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    });
    const loaded = loadModelConfig();
    // 同属票面 #4 授权改写：providerId 非法整份退默认，须显式而非静默。
    expect(loaded.degradation?.reasons).toContain('provider_invalid');
    expect(stripDegradation(loaded)).toEqual({ ...DEFAULT_MODEL_CONFIG, discoveredModels: undefined });
  });
});

describe('model-config 降级显式化（MODEL-CONFIG-EXPLICIT-1）', () => {
  const storeOf = (raw: string | null) => {
    const map = new Map<string, string>();
    if (raw !== null) map.set('courtwork.model-config.v1', raw);
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, value),
      __map: map,
    };
  };

  it('路径①存储无值：返回值显式携 no_stored_value', () => {
    __setModelConfigStoreForTests(storeOf(null));
    expect(loadModelConfig().degradation?.reasons).toContain('no_stored_value');
  });

  it('路径②providerId 非法：显式携 provider_invalid，整份退默认', () => {
    __setModelConfigStoreForTests(storeOf(JSON.stringify({ providerId: 'custom', modelId: 'x', reasoning: 'deep' })));
    const loaded = loadModelConfig();
    expect(loaded.degradation?.reasons).toContain('provider_invalid');
    expect(loaded.providerId).toBe(DEFAULT_MODEL_CONFIG.providerId);
  });

  it('路径③modelId 损坏：显式携 model_invalid', () => {
    __setModelConfigStoreForTests(storeOf(JSON.stringify({ providerId: 'deepseek', modelId: '', reasoning: 'standard' })));
    expect(loadModelConfig().degradation?.reasons).toContain('model_invalid');
  });

  it('路径④reasoning 非法：显式携 reasoning_invalid（本票核心路径）', () => {
    __setModelConfigStoreForTests(storeOf(JSON.stringify({ providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'ultra' })));
    const loaded = loadModelConfig();
    expect(loaded.degradation?.reasons).toContain('reasoning_invalid');
    expect(loaded.reasoning).toBe('standard');
  });

  it('路径⑤读取/解析抛异常：显式携 unreadable，不再裸 catch 丢弃', () => {
    __setModelConfigStoreForTests(storeOf('{ 这不是 JSON'));
    expect(loadModelConfig().degradation?.reasons).toContain('unreadable');
  });

  it('路径⑥存储不可用：显式携 storage_unavailable（配置跨会话蒸发不再无痕）', () => {
    __setModelConfigStoreForTests({
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    });
    expect(loadModelConfig().degradation?.reasons).toContain('storage_unavailable');
  });

  it('核心反例：deep 档因 reasoning 损坏静默降为 standard 的路径，降级对消费者可见', () => {
    __setModelConfigStoreForTests(storeOf(JSON.stringify({ providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'deep-ish' })));
    const loaded = loadModelConfig();
    // 降档确实发生，且随后进入 modelRoute / reasoningRequest 发出
    expect(loaded.reasoning).toBe('standard');
    // 降档确实抵达 wire：走 standard 路由（disabled）而非用户原选的 deep（enabled）。
    expect(reasoningRequest(loaded).extraBody).toEqual({ thinking: { type: 'disabled' } });
    expect(reasoningRequest({ ...loaded, reasoning: 'deep' }).extraBody).toEqual({ thinking: { type: 'enabled' } });
    // 关键：该降档不再无痕——消费者可据此提示用户
    expect(isUserVisibleDegradation(loaded.degradation)).toBe(true);
  });

  it('首次运行的「无值」不算须提示的降级（避免假警报）', () => {
    __setModelConfigStoreForTests(storeOf(null));
    const loaded = loadModelConfig();
    expect(loaded.degradation?.reasons).toEqual(['no_stored_value']);
    expect(isUserVisibleDegradation(loaded.degradation)).toBe(false);
  });

  it('未降级路径逐字等同：返回值不得多出任何可枚举字段', () => {
    const next = { ...DEFAULT_MODEL_CONFIG, modelId: 'deepseek-v4-pro', reasoning: 'deep' as const };
    __setModelConfigStoreForTests(storeOf(JSON.stringify(next)));
    const loaded = loadModelConfig();
    expect(Object.keys(loaded).sort()).toEqual(Object.keys({ ...next, discoveredModels: undefined }).sort());
    expect(loaded.degradation).toBeUndefined();
  });

  it('降级标记永不写回存储（saveModelConfig 显式剔除）', () => {
    const store = storeOf(JSON.stringify({ providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'bogus' }));
    __setModelConfigStoreForTests(store);
    const loaded = loadModelConfig();
    expect(loaded.degradation).toBeDefined();
    saveModelConfig(loaded);
    expect(store.__map.get('courtwork.model-config.v1')).not.toContain('degradation');
  });
});
