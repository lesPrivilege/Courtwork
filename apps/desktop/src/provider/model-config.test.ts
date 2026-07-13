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
} from './model-config';

afterEach(() => {
  __setModelConfigStoreForTests(null);
});

describe('model-config', () => {
  it('defaults and labels', () => {
    expect(loadModelConfig()).toEqual(DEFAULT_MODEL_CONFIG);
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
    expect(loadModelConfig()).toEqual(DEFAULT_MODEL_CONFIG);
  });
});
