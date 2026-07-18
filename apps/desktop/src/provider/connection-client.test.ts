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

  it('builds a provider/model probe with no URL, header, or key', () => {
    const input = buildProbeInput({ ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' });
    expect(input).toMatchObject({ providerId: 'deepseek', reasoningBody: { thinking: { type: 'enabled' } } });
    expect(input).not.toHaveProperty('baseUrl');
    expect(JSON.stringify(input)).not.toMatch(/authorization|apiKey/i);
  });

  it('only a successful probe transitions connection to ready', async () => {
    installProviderConnectionTestHooks().setResult({
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'ready', models: ['model-a'], modelDiscovery: 'available' },
    });
    await expect(providerConnectionClient.validate(DEFAULT_MODEL_CONFIG)).resolves.toMatchObject({
      credential: { phase: 'stored' }, connection: { phase: 'ready', models: ['model-a'] },
    });
  });

  it('reuses a just-read stored readiness during startup instead of reading Keychain status twice', async () => {
    installCredentialTestHooks().clearOverride();
    installProviderConnectionTestHooks().setResult({
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'ready' },
    });

    await expect(providerConnectionClient.validate(DEFAULT_MODEL_CONFIG, {
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'unverified' },
    })).resolves.toMatchObject({
      credential: { phase: 'stored' }, connection: { phase: 'ready' },
    });
  });

  it('maps a typed endpoint failure to user copy', async () => {
    installProviderConnectionTestHooks().setResult({
      credential: { phase: 'stored', source: 'pasted' }, connection: { phase: 'failed', failKind: 'endpoint' },
    });
    const result = await providerConnectionClient.validate(DEFAULT_MODEL_CONFIG);
    expect(result.connection.phase).toBe('failed');
    expect(result.connection.failureMessage).toContain('DeepSeek');
    expect(result.connection.failureMessage).not.toContain('Base URL');
  });
});
