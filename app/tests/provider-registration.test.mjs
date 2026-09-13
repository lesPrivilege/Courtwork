import assert from 'node:assert/strict';
import test from 'node:test';
import { PROVIDER_DEFINITIONS, providerDefinition, providerRouteError } from '../runtime/provider-definitions.mjs';
import { registrationInput, registrationExtras } from '../server/provider-connections.mjs';
import { providerFormatsOf } from '../web/settings-view.mjs';
import { createRuntimeView } from '../web/runtime-view.mjs';
import { withTinyDom } from './tiny-dom.mjs';
import { boot } from './helpers.mjs';
import { createReasoningPayloadHook } from '../runtime/pi-session-runtime.mjs';

test('Provider requirements stay separate from model declarations and endpoint names', () => {
  const model = { id: 'shared-model', reasoningEfforts: ['high'] };
  const deepseek = { kind: 'catalog', providerIdentity: 'deepseek', api: 'openai-completions', models: [model] };
  const openai = { ...deepseek, providerIdentity: 'openai' };
  const compatible = { ...deepseek, kind: 'compatible', id: 'conn-fixture', providerIdentity: 'conn-fixture', baseUrl: 'https://deepseek.example.invalid' };
  assert.equal(registrationExtras(deepseek)[0].compat.thinkingFormat, 'deepseek');
  assert.equal(registrationExtras(deepseek)[0].compat.requiresReasoningContentOnAssistantMessages, true);
  assert.equal(registrationExtras(openai)[0].compat.thinkingFormat, 'openai');
  assert.equal(registrationInput(compatible).models[0].compat.thinkingFormat, 'openai', 'hostname cannot change the explicit generic protocol');
  assert.deepEqual(registrationExtras(deepseek)[0].thinkingLevelMap, registrationExtras(openai)[0].thinkingLevelMap);
  assert.ok(PROVIDER_DEFINITIONS.every(entry => !('tools' in entry) && !('permissions' in entry)), 'protocol registration grants no Host tools');
  assert.match(providerRouteError(deepseek, { api: 'openai-responses' }), /explicit endpoint/);
  assert.equal(providerRouteError(openai, { api: 'openai-responses' }), null);
  assert.ok(providerRouteError({ kind: 'catalog', providerIdentity: 'unknown' }, { api: 'openai-responses' }));
});

test('Models uses only provider protocols advertised by the Host', () => {
  assert.deepEqual(providerFormatsOf({}, null, 'openai'), []);
  const catalog = { providerDefinitions: [providerDefinition('deepseek'), providerDefinition('openai-compatible')] };
  assert.equal(providerFormatsOf(catalog, null, 'deepseek')[1].endpoint, 'explicit');
  assert.deepEqual(providerFormatsOf(catalog, null, 'openai'), []);
  assert.equal(providerFormatsOf(catalog, { kind: 'compatible', providerIdentity: 'conn-fixture' }, 'conn-fixture')[0].reasoningFormat, 'openai');
});

test('Provider declaration read is harmless and DeepSeek route validation preserves saved configuration', async () => {
  const h = await boot();
  try {
    const before = (await h.api('GET', '/provider-config')).json;
    const catalog = (await h.api('GET', '/provider-models')).json;
    assert.deepEqual(catalog.providerDefinitions, PROVIDER_DEFINITIONS);
    const connections = (await h.api('GET', '/provider-connections')).json.connections;
    assert.equal(connections.find(entry => entry.providerIdentity === 'deepseek').definitionId, 'deepseek');
    const model = catalog.models.find(entry => entry.provider === 'deepseek');
    assert.ok(model);
    const result = await h.api('PUT', '/provider-config', { provider: 'deepseek', model: model.id, api: 'openai-responses' });
    assert.equal(result.status, 400);
    assert.match(result.json.error.message, /explicit endpoint/);
    assert.deepEqual((await h.api('GET', '/provider-config')).json.config, before.config);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); }
});

test('Models presents the reported harness and links tool configuration without inventing an adapter switch', () => withTinyDom(async body => {
  document.body = body;
  const environment = document.createElement('div'); body.append(environment);
  const view = createRuntimeView({ environment }, {
    getSessionId: () => null,
    request: async () => ({ revision: 1, adapterId: 'fixture-harness@1', scopes: [], resources: [] }),
  });
  await view.load();
  assert.match(environment.textContent, /Runtime adapter.*fixture-harness@1/);
  const links = [...environment.querySelectorAll('a')].map(node => node.getAttribute('href'));
  assert.deepEqual(links, ['#settings/tools', '#settings/permissions', '#settings/developer']);
  assert.equal(environment.querySelectorAll('select,input').length, 0);
}));

test('fixture no-reasoning protocol cannot gain a native effort field from extra model declarations', () => {
  const connection = { kind: 'catalog', providerIdentity: 'fake-openai-loopback', api: 'openai-completions', models: [{ id: 'fixture-extra', reasoningEfforts: ['high'] }] };
  const model = { ...registrationExtras(connection)[0], provider: connection.providerIdentity };
  assert.equal(model.compat.supportsReasoningEffort, false);
  assert.throws(() => createReasoningPayloadHook({ requestedEffort: 'high', reasoningCapability: { values: ['high'] } })({ model: model.id }, model), /no native field/);
  assert.deepEqual(createReasoningPayloadHook()({ model: model.id, reasoning_effort: 'high' }, model), { model: model.id });
});
