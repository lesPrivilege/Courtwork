import { afterEach, describe, expect, it } from 'vitest';
import {
  __setModelConfigStoreForTests,
  DEFAULT_MODEL_CONFIG,
  loadModelConfig,
  modelDisplayName,
  reasoningLabel,
  saveModelConfig,
  withProvider,
} from './model-config';

afterEach(() => {
  __setModelConfigStoreForTests(null);
});

describe('model-config', () => {
  it('defaults and labels', () => {
    expect(loadModelConfig()).toEqual(DEFAULT_MODEL_CONFIG);
    expect(modelDisplayName(DEFAULT_MODEL_CONFIG)).toBe('DeepSeek Chat');
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
    expect(switched.modelId).toBe('doubao-pro');
  });
});
