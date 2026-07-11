import { afterEach, describe, expect, it } from 'vitest';
import {
  __setModelConfigStoreForTests,
  DEFAULT_MODEL_CONFIG,
  loadModelConfig,
  modelDisplayName,
  reasoningLabel,
  saveModelConfig,
  withProvider,
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

  it('persists provider/model/reasoning round-trip', () => {
    const next = { providerId: 'qwen' as const, modelId: 'qwen-max', reasoning: 'deep' as const };
    saveModelConfig(next);
    expect(loadModelConfig()).toEqual(next);
  });

  it('withProvider falls back to first model of new provider', () => {
    const switched = withProvider(DEFAULT_MODEL_CONFIG, 'doubao');
    expect(switched.providerId).toBe('doubao');
    expect(switched.modelId).toBe('doubao-seed-1.6');
  });

  it('presets fill URL/models while custom keeps an editable URL and discovered models', () => {
    expect(effectiveBaseUrl(DEFAULT_MODEL_CONFIG)).toBe('https://api.deepseek.com/v1');
    const custom = withProvider(DEFAULT_MODEL_CONFIG, 'custom');
    expect(custom.baseUrl).toBe('');
    expect(effectiveBaseUrl({ ...custom, baseUrl: 'https://gateway.example' })).toBe('https://gateway.example/v1');
    expect(modelOptions({ ...custom, modelId: 'local-law', discoveredModels: ['local-law', 'other'] }))
      .toEqual(['local-law', 'other']);
  });

  it('reasoning request delegates to the declared quirk route', () => {
    // #41：DeepSeek deep 档经 thinking 请求字段；模型名 = 用户所选，路由不覆盖（#40）
    expect(reasoningRequest({ ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' })).toEqual({
      model: 'deepseek-v4-flash', extraBody: { thinking: { type: 'enabled' } },
    });
    expect(reasoningRequest({ ...withProvider(DEFAULT_MODEL_CONFIG, 'qwen'), reasoning: 'deep' }))
      .toMatchObject({ extraBody: { enable_thinking: true } });
    expect(reasoningRequest({ ...withProvider(DEFAULT_MODEL_CONFIG, 'custom'), modelId: 'law-local', reasoning: 'deep' }))
      .toEqual({ model: 'law-local', extraBody: { reasoning_effort: 'high' } });
  });
});
