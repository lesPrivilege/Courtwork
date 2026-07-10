import { describe, expect, it } from 'vitest';
import { resolveSmokeTargets, SMOKE_TARGETS } from './smoke.js';

describe('resolveSmokeTargets', () => {
  it('lists all three MVP first-batch providers', () => {
    expect(SMOKE_TARGETS.map((t) => t.name)).toEqual(['DeepSeek', 'Qwen（阿里百炼）', '豆包（火山方舟）']);
  });

  it('reports apiKey as undefined for a provider whose env var is not set', () => {
    const resolved = resolveSmokeTargets({});
    expect(resolved.every((r) => r.apiKey === undefined)).toBe(true);
  });

  it('reads the apiKey from the provider-specific env var when present', () => {
    const resolved = resolveSmokeTargets({ DEEPSEEK_API_KEY: 'sk-abc' });
    const deepseek = resolved.find((r) => r.target.name === 'DeepSeek');
    expect(deepseek?.apiKey).toBe('sk-abc');
    const qwen = resolved.find((r) => r.target.name.startsWith('Qwen'));
    expect(qwen?.apiKey).toBeUndefined();
  });

  it('falls back to each target default model id when no override env var is set', () => {
    const resolved = resolveSmokeTargets({});
    const deepseek = resolved.find((r) => r.target.name === 'DeepSeek');
    expect(deepseek?.modelId).toBe('deepseek-v4-pro');
  });

  it('honors a *_MODEL_ID override env var', () => {
    const resolved = resolveSmokeTargets({ DEEPSEEK_MODEL_ID: 'deepseek-v4-flash' });
    const deepseek = resolved.find((r) => r.target.name === 'DeepSeek');
    expect(deepseek?.modelId).toBe('deepseek-v4-flash');
  });
});
