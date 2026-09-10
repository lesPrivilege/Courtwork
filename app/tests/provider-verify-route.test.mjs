import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './helpers.mjs';
import { FAKE_MODEL_ID, FAKE_PROVIDER_ID } from '../runtime/pi-session-runtime.mjs';

test('verify resolves active identity API/endpoint overrides without leaking them to another connection', async () => {
  const h = await boot();
  const runtime = h.runtime.service.modelRuntime;
  const complete = runtime.complete;
  const observed = [];
  // Capture the exact dispatch model. No provider/network is called.
  runtime.complete = async (model) => {
    observed.push(model);
    return { role: 'assistant', content: [{ type: 'text', text: 'synthetic answer' }], stopReason: 'stop' };
  };
  try {
    assert.equal((await h.api('PUT', '/provider-credential', {
      connectionId: 'catalog-openai', apiKey: 'synthetic-route-key',
    })).status, 200);
    const models = (await h.api('GET', '/provider-models')).json.models.filter(m => m.provider === 'openai');
    assert.ok(models.length >= 2);
    const [selected, other] = models;
    const baseUrl = 'http://127.0.0.1:1/synthetic-only';
    assert.equal((await h.api('PUT', '/provider-config', {
      provider: 'openai', model: selected.id, api: 'openai-completions', baseUrl,
    })).status, 200);
    for (const entry of [selected, other]) {
      assert.equal((await h.api('POST', '/provider-connections/catalog-openai/verify', { model: entry.id })).status, 200);
      assert.equal(observed.at(-1).id, entry.id);
      assert.equal(observed.at(-1).api, 'openai-completions');
      assert.equal(observed.at(-1).baseUrl, baseUrl);
    }
    assert.equal((await h.api('POST', `/provider-connections/catalog-${FAKE_PROVIDER_ID}/verify`, { model: FAKE_MODEL_ID })).status, 200);
    assert.notEqual(observed.at(-1).baseUrl, baseUrl);
    assert.equal(observed.at(-1).provider, FAKE_PROVIDER_ID);
    // Once another identity is active, OpenAI uses its own catalog route.
    assert.equal((await h.api('PUT', '/provider-config', {
      provider: FAKE_PROVIDER_ID, model: FAKE_MODEL_ID, api: 'openai-completions',
    })).status, 200);
    assert.equal((await h.api('POST', '/provider-connections/catalog-openai/verify', { model: selected.id })).status, 200);
    assert.equal(observed.at(-1).baseUrl, runtime.getModel('openai', selected.id).baseUrl);
    assert.equal(observed.at(-1).api, runtime.getModel('openai', selected.id).api);
  } finally {
    runtime.complete = complete;
    await h.runtime.close();
  }
});
