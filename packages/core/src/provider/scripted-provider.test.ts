import { describe, expect, it } from 'vitest';
import { createScriptedProvider, ScriptedProviderExhaustedError } from './scripted-provider.js';

describe('createScriptedProvider', () => {
  it('exposes the given id and modelId', () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', []);
    expect(provider.id).toBe('demo-provider');
    expect(provider.modelId).toBe('fake-v1');
  });

  it('returns scripted responses in call order', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [
      { content: 'first' },
      { content: 'second' },
    ]);
    const first = await provider.generate({ messages: [{ role: 'user', content: 'a' }] });
    const second = await provider.generate({ messages: [{ role: 'user', content: 'b' }] });
    expect(first.content).toBe('first');
    expect(second.content).toBe('second');
  });

  it('throws ScriptedProviderExhaustedError once the script runs out', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'only-one' }]);
    await provider.generate({ messages: [] });
    await expect(provider.generate({ messages: [] })).rejects.toThrow(ScriptedProviderExhaustedError);
  });

  it('does not require the request content to match anything (opaque passthrough)', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x' }]);
    const response = await provider.generate({ systemPrompt: 'irrelevant', messages: [{ role: 'user', content: 'anything at all' }] });
    expect(response.content).toBe('x');
  });
});
