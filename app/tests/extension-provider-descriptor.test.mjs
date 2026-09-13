import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {FAKE_MODEL_ID} from '../runtime/pi-session-runtime.mjs';
import {NORMAL_FACTS, SYNTHETIC_SOURCES} from '../domains/inbound-nda/fixtures.mjs';

test('Inbound NDA reaches loopback with declared reasoning while Work metadata stays fixed', async () => {
  const h = await boot();
  try {
    const connected = await h.api('POST', '/provider-connections', {
      api: 'openai-completions',
      baseUrl: h.runtime.fakeProvider.baseUrl,
      apiKey: 'synthetic-extension-descriptor-key',
      models: [{id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ['high']}],
    });
    assert.equal(connected.status, 200, JSON.stringify(connected.json));
    const connection = connected.json.connection;
    const configured = await h.api('PUT', '/provider-config', {
      provider: connection.providerIdentity,
      model: FAKE_MODEL_ID,
      api: connection.api,
      reasoningEffort: 'high',
    });
    assert.equal(configured.status, 200, JSON.stringify(configured.json));

    const loaded = await h.api('POST', '/extensions/inbound-nda/lifecycle', {action: 'load'});
    assert.equal(loaded.status, 200, JSON.stringify(loaded.json));
    const session = await h.createSession();
    const bound = await h.api('POST', `/sessions/${session.id}/extension`, {
      extensionId: 'inbound-nda',
      input: {title: 'Descriptor regression', sourceText: SYNTHETIC_SOURCES[0].text, facts: NORMAL_FACTS},
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));

    const started = await h.api('POST', `/sessions/${session.id}/runs`, {
      commandId: 'provider-descriptor',
      input: 'Read the current NDA work and report that the synthetic review is ready.',
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const completed = await h.pollRun(started.json.run.id);
    assert.equal(completed.status, 'completed', JSON.stringify(completed.error ?? null));

    assert.equal(h.runtime.fakeProvider.requests.length, 1, 'the run must reach the local HTTP provider');
    const request = h.runtime.fakeProvider.requests[0].body;
    assert.equal(request.model, FAKE_MODEL_ID);
    assert.equal(request.reasoning_effort, 'high');

    assert.equal(completed.provider.provider, connection.providerIdentity);
    assert.equal(completed.provider.connectionId, connection.id);
    assert.equal(completed.provider.reasoningEffort, 'high');
    assert.deepEqual(completed.provider.reasoningBinding.values, ['high']);
    assert.equal(completed.provider.reasoningBinding.source, 'user-declared');
    assert.equal(completed.provider.reasoningBinding.configVersion, configured.json.version);

    const projection = (await h.api('GET', `/sessions/${session.id}/surface`)).json.projection;
    const workRun = projection.runs.find(run => run.id === completed.id);
    assert.ok(workRun);
    assert.deepEqual(workRun.providerConfig, {
      provider: connection.providerIdentity,
      model: FAKE_MODEL_ID,
      api: 'openai-completions',
      baseUrl: h.runtime.fakeProvider.baseUrl,
      executionMode: 'real',
      credentialStatus: 'configured',
    });
    assert.equal(JSON.stringify(projection.runs).includes('synthetic-extension-descriptor-key'), false);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, {recursive: true, force: true});
  }
});
