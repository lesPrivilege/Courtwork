import { beforeEach, describe, expect, it } from 'vitest';
import { credentialClient, installCredentialTestHooks } from '../credentials/client';
import { DEFAULT_MODEL_CONFIG } from './model-config';
import { buildProbeInput, installProviderConnectionTestHooks, providerConnectionClient } from './connection-client';

describe('provider connection smoke probe', () => {
  beforeEach(async () => {
    installCredentialTestHooks().clearOverride();
    installProviderConnectionTestHooks().clear();
    await credentialClient.save('pasted', 'valid-key-for-test');
  });

  it('builds the one-token route from declarative quirks', () => {
    const deepseek = { ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' as const };
    expect(buildProbeInput(deepseek)).toMatchObject({
      baseUrl: 'https://api.deepseek.com/v1',
      reasoningBody: { thinking: { type: 'enabled' } },
    });
  });

  it('accepts a mocked endpoint success and returns discovered models', async () => {
    installProviderConnectionTestHooks().setResult({
      phase: 'connected', models: ['model-a', 'model-b'], modelDiscovery: 'available',
    });
    await expect(providerConnectionClient.validate(DEFAULT_MODEL_CONFIG)).resolves.toMatchObject({
      phase: 'connected', models: ['model-a', 'model-b'],
    });
  });

  it('honestly degrades discovery while keeping a successful smoke connected', async () => {
    installProviderConnectionTestHooks().setResult({ phase: 'connected', modelDiscovery: 'unsupported' });
    await expect(providerConnectionClient.validate(DEFAULT_MODEL_CONFIG)).resolves.toMatchObject({
      phase: 'connected', modelDiscovery: 'unsupported',
    });
  });

  it('maps a typed endpoint failure to user copy', async () => {
    installProviderConnectionTestHooks().setResult({ phase: 'failed', failKind: 'endpoint' });
    const result = await providerConnectionClient.validate(DEFAULT_MODEL_CONFIG);
    expect(result.phase).toBe('failed');
    expect(result.failureMessage).toContain('DeepSeek');
    expect(result.failureMessage).not.toContain('Base URL');
  });
});
