import { describe, expect, it } from 'vitest';
import {
  DEEPSEEK_PROVIDER_DESCRIPTOR,
  PRODUCT_PROVIDER_IDS,
  getProviderDescriptor,
  isProviderId,
} from './registry.js';

describe('provider product registry', () => {
  it('registers only DeepSeek with its verified official endpoint and declared capabilities', () => {
    expect(PRODUCT_PROVIDER_IDS).toEqual(['deepseek']);
    expect(DEEPSEEK_PROVIDER_DESCRIPTOR).toMatchObject({
      id: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      responseFormat: { tier: 'json_object' },
      reasoningFieldCandidates: ['reasoning_content'],
    });
    expect(getProviderDescriptor('deepseek')).toBe(DEEPSEEK_PROVIDER_DESCRIPTOR);
  });

  it('rejects custom and arbitrary provider ids instead of guessing OpenAI-compatible capabilities', () => {
    expect(isProviderId('custom')).toBe(false);
    expect(isProviderId('https://llm.example.internal/v1')).toBe(false);
    expect(() => getProviderDescriptor('custom')).toThrow(/未登记|not registered/i);
  });
});
