import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { observeRequestStream, reasoningCapabilitySnapshot } from '../runtime/request-telemetry.mjs';
import { composeReasoningPayloadHook, createIsolatedModelRuntime, createReasoningPayloadHook, registerConnectionProvider } from '../runtime/pi-session-runtime.mjs';
import { describeReasoning } from '../runtime/model-capabilities.mjs';
import { registrationInput } from '../server/provider-connections.mjs';
import { requestMeasurements } from '../web/telemetry-view.mjs';
import { boot } from './helpers.mjs';
import { rm, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RuntimeStore } from '../server/store.mjs';
import { randomUUID } from 'node:crypto';

test('host stream observation separates first output/text and preserves terminal identity without claiming TPS',async()=>{
  let clock=0; const records=[];
  const message={model:'observed',provider:'fixture',api:'fixture',usage:{input:10,output:4,cacheRead:2,cacheWrite:0}};
  const events=[{type:'thinking_delta',delta:'x'},{type:'text_delta',delta:'ok'},{type:'done',message}];
  const stream=await observeRequestStream({model:{id:'requested',provider:'fixture',api:'fixture',contextWindow:1000},context:{messages:[{content:'hidden content'}]},requestId:1,now:()=>clock,record:r=>records.push(r),start:async()=>({result:async()=>message,async *[Symbol.asyncIterator](){for(const e of events){clock+=100;yield e;}}})});
  assert.deepEqual(await Array.fromAsync(stream),events);assert.equal(await stream.result(),message);
  assert.equal(records.at(-1).firstOutputMs,100);assert.equal(records.at(-1).firstTextMs,200);assert.equal(records.at(-1).elapsedMs,300);
  assert.equal(records.at(-1).decodeTokensPerSecond,null);assert.equal(records.at(-1).providerTtftMs,null);
  assert.equal(records.at(-1).observedModel.model,'observed');assert(!JSON.stringify(records).includes('hidden content'));
  assert.equal(requestMeasurements(records.map(data=>({type:'runtime.request.telemetry',runId:'r',data})),'r').length,1);
});

test('provider-default payload omits generated reasoning controls after the existing callback', async () => {
  const payload = {
    model: 'fixture-model',
    messages: [{ role: 'user', content: 'keep this input' }],
    tools: [{ type: 'function', function: { name: 'fixture_tool', parameters: {} } }],
    max_tokens: 91,
    stream: true,
    reasoning: { effort: 'none', summary: 'auto' },
    reasoning_effort: 'none',
    thinking: { type: 'disabled' },
  };
  const original = structuredClone(payload);
  let priorPayload;
  const onPayload = composeReasoningPayloadHook(async (received) => {
    priorPayload = received;
    return {
      ...received,
      reasoning: { effort: 'high' },
      reasoning_effort: 'high',
      thinking: { type: 'enabled' },
    };
  }, { requestedEffort: undefined });

  const sanitized = await onPayload(payload, { api: 'openai-completions', provider: 'fixture' });
  assert.deepEqual(priorPayload, original);
  assert.deepEqual(sanitized, {
    model: 'fixture-model',
    messages: [{ role: 'user', content: 'keep this input' }],
    tools: [{ type: 'function', function: { name: 'fixture_tool', parameters: {} } }],
    max_tokens: 91,
    stream: true,
  });
  assert.deepEqual(payload, original, 'the callback must not mutate the SDK-owned request');
});

test('explicit effort uses the declared adapter mapping and provider identity, not endpoint hostname', () => {
  const payload = {
    model: 'fixture-model', messages: [{ role: 'user', content: 'keep' }], max_tokens: 91,
    reasoning: { effort: 'old', summary: 'auto' }, reasoning_effort: 'old', thinking: { type: 'disabled' },
  };
  const completionHook = createReasoningPayloadHook({
    requestedEffort: 'high', reasoningCapability: { values: ['high'] },
  });
  const completion = completionHook(payload, {
    api: 'openai-completions', provider: 'custom-gateway', baseUrl: 'https://proxy.deepseek.com/v1',
    thinkingLevelMap: { high: 'provider-high' },
  });
  assert.equal(completion.reasoning_effort, 'provider-high');
  assert.equal('reasoning' in completion, false);
  assert.equal('thinking' in completion, false);

  const responses = createReasoningPayloadHook({
    requestedEffort: 'high', reasoningCapability: { values: ['high'] },
  })({ ...payload }, {
    api: 'openai-responses', provider: 'openai', thinkingLevelMap: { high: 'provider-high' },
  });
  assert.deepEqual(responses.reasoning, { effort: 'provider-high', summary: 'auto' });
  assert.equal('reasoning_effort' in responses, false);
  assert.equal('thinking' in responses, false);

  const deepseekOff = createReasoningPayloadHook({
    requestedEffort: 'off', reasoningCapability: { values: ['off'] },
  })({ ...payload }, {
    api: 'openai-completions', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1',
    compat: { thinkingFormat: 'deepseek', supportsReasoningEffort: true },
    thinkingLevelMap: { off: 'none' },
  });
  assert.deepEqual(deepseekOff.thinking, { type: 'disabled' });
  assert.equal('reasoning' in deepseekOff, false);
  assert.equal('reasoning_effort' in deepseekOff, false);
});

test('production compatible registration pins generic reasoning on heuristic-looking loopback paths', async () => {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      requests.push({
        host: request.headers.host,
        path: request.url,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      });
      const chunk = (delta, finishReason = null, usage) => ({
        id: 'chatcmpl-loopback', object: 'chat.completion.chunk', created: 1,
        model: 'declared-high-model', choices: [{ index: 0, delta, finish_reason: finishReason }],
        ...(usage ? { usage } : {}),
      });
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      response.end([
        `data: ${JSON.stringify(chunk({ role: 'assistant', content: 'ok' }))}\n\n`,
        `data: ${JSON.stringify(chunk({}, 'stop', { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }))}\n\n`,
        'data: [DONE]\n\n',
      ].join(''));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.equal(typeof address, 'object');
  const modelRuntime = await createIsolatedModelRuntime();
  try {
    for (const marker of ['api.z.ai', 'deepseek.com']) {
      const connection = {
        id: `conn-wire-${marker.replaceAll('.', '-')}`,
        api: 'openai-completions',
        baseUrl: `http://127.0.0.1:${address.port}/v1/${marker}`,
        models: [{ id: 'declared-high-model', reasoningEfforts: ['high'] }],
      };
      const config = registrationInput(connection);
      assert.deepEqual(config.models[0].compat, {
        thinkingFormat: 'openai', supportsReasoningEffort: true,
        requiresThinkingAsText: false, requiresReasoningContentOnAssistantMessages: false,
      });
      registerConnectionProvider(modelRuntime, connection.id, config);
      await modelRuntime.setRuntimeApiKey(connection.id, 'loopback-test-key');

      const model = modelRuntime.getModel(connection.id, 'declared-high-model');
      assert.equal(model.compat.thinkingFormat, 'openai');
      const capability = describeReasoning(model, { entry: connection.models[0] });
      assert.deepEqual(capability.values, ['high']);
      const message = await modelRuntime.complete(model, {
        messages: [
          { role: 'user', content: 'prior question', timestamp: Date.now() - 2 },
          {
            role: 'assistant', api: model.api, provider: model.provider, model: model.id,
            timestamp: Date.now() - 1, stopReason: 'stop',
            usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
            content: [
              { type: 'thinking', thinking: 'private prior reasoning' },
              { type: 'text', text: 'prior visible answer' },
            ],
          },
          { role: 'user', content: 'synthetic request', timestamp: Date.now() },
        ],
      }, {
        maxTokens: 32,
        onPayload: createReasoningPayloadHook({ requestedEffort: 'high', reasoningCapability: capability }),
      });
      assert.equal(message.stopReason, 'stop', message.errorMessage);
    }

    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.match(request.host, /^127\.0\.0\.1:\d+$/);
      assert.match(request.path, /^\/v1\/(?:api\.z\.ai|deepseek\.com)\/chat\/completions$/);
      assert.equal(request.body.reasoning_effort, 'high');
      assert.equal(Object.hasOwn(request.body, 'thinking'), false);
      const assistantHistory = request.body.messages.find(message => message.role === 'assistant');
      assert.ok(assistantHistory);
      assert.equal(assistantHistory.content, 'prior visible answer');
      assert.equal(Object.hasOwn(assistantHistory, 'reasoning_content'), false);
      assert.equal(JSON.stringify(assistantHistory).includes('private prior reasoning'), false);
    }
  } finally {
    for (const marker of ['api.z.ai', 'deepseek.com']) {
      modelRuntime.unregisterProvider(`conn-wire-${marker.replaceAll('.', '-')}`);
    }
    await new Promise(resolve => server.close(resolve));
  }
});

test('capability projection admits only values the selected adapter can encode', () => {
  const declared = { reasoningEfforts: ['high', 'off'] };
  const model = {
    api: 'openai-completions', baseUrl: 'https://gateway.example.test/v1', reasoning: true,
    thinkingLevelMap: { high: 'provider-high', off: null },
  };
  assert.deepEqual(describeReasoning(model, { entry: declared }).values, ['high']);
  assert.deepEqual(describeReasoning({
    ...model,
    thinkingLevelMap: { high: null, off: 'none' },
  }, { entry: { reasoningEfforts: ['high'] } }).values, [], 'a declaration cannot make a missing Pi wire mapping encodable');
  assert.deepEqual(describeReasoning({
    ...model, compat: { supportsReasoningEffort: false },
  }, { entry: declared }).values, [], 'an adapter that disables the reasoning field cannot advertise mapped effort');
  assert.deepEqual(describeReasoning({
    ...model, compat: { thinkingFormat: 'zai' },
  }, { entry: declared }).values, [], 'an unimplemented compatibility shape remains unknown');
});

test('request telemetry keeps SDK setting provenance and a safe capability snapshot', async () => {
  const records = [];
  const stream = await observeRequestStream({
    model: { id: 'm', provider: 'fixture', api: 'openai-completions', contextWindow: 1000 },
    context: { messages: [] }, requestId: 1, requestedEffort: 'low', sdkEffectiveEffort: 'high',
    reasoningCapability: {
      kind: 'enum', source: 'user-declared', values: ['low', 'high'], defaultMode: 'omit',
      adapterVersion: 'adapter-1', configVersion: 7, notice: 'private-sentinel', arbitrary: 'private-sentinel',
    },
    record: row => records.push(row),
    start: () => ({ result: () => null, async *[Symbol.asyncIterator]() { yield { type: 'done', message: { model: 'm' } }; } }),
  });
  await Array.fromAsync(stream);
  const row = records.at(-1);
  assert.equal(row.requestedEffort, 'low');
  assert.equal(row.sdkEffectiveEffort, 'high');
  assert.equal(row.effectiveEffort, 'high', 'the legacy alias remains the SDK setting');
  assert.equal(row.effectiveEffortSource, 'sdk-setting');
  assert.equal(row.providerEffectiveEffort, null, 'no provider-applied setting is inferred from the SDK level');
  assert.deepEqual(row.reasoningCapability, {
    kind: 'enum', source: 'user-declared', values: ['low', 'high'], defaultMode: 'omit',
    adapterVersion: 'adapter-1', configVersion: 7,
  });
  assert.equal(JSON.stringify(row).includes('private-sentinel'), false);
  assert.deepEqual(reasoningCapabilitySnapshot({ kind: 'unknown', source: 'unknown', values: [] }), {
    kind: 'unknown', source: 'unknown', values: [], defaultMode: 'unknown', adapterVersion: null, configVersion: null,
  });
});

test('interrupted stream and dispatch error do not report successful usage',async()=>{
  const records=[];
  const stream=await observeRequestStream({model:{id:'m'},context:{},requestId:1,record:r=>records.push(r),start:()=>({result:()=>null,async *[Symbol.asyncIterator](){yield {type:'text_delta',delta:'a'};}})});
  await Array.fromAsync(stream);assert.equal(records.at(-1).phase,'interrupted');assert.equal(records.at(-1).usage,null);
  await assert.rejects(observeRequestStream({model:{id:'m'},context:{},requestId:2,record:r=>records.push(r),start:()=>{throw new Error('failed');}}));
  assert.equal(records.at(-1).phase,'failed');
});

test('result-only SDK calls still emit a terminal request measurement exactly once', async () => {
  let clock = 0;
  const records = [];
  const message = { model: 'm', provider: 'fixture', api: 'openai-completions', usage: { input: 3, output: 2, cacheRead: 0, cacheWrite: 0 }, stopReason: 'stop' };
  const stream = await observeRequestStream({
    model: { id: 'm', provider: 'fixture', api: 'openai-completions' }, context: {}, requestId: 1,
    now: () => clock, record: row => records.push(row),
    start: () => ({
      result: async () => { clock += 25; return message; },
      async *[Symbol.asyncIterator]() { throw new Error('result-only call must not iterate'); },
    }),
  });
  assert.equal(await stream.result(), message);
  assert.equal(records.filter(row => row.phase === 'completed').length, 1);
  assert.equal(records.at(-1).elapsedMs, 25);
  assert.deepEqual(records.at(-1).usage, { input: 3, output: 2, cacheRead: 0, cacheWrite: 0 });
});

test('provider response identifiers stay separate from runtime identity without forwarding extra metadata',async()=>{
  for (const extra of [
    {responseModel:'deepseek-flash',responseId:'response-123'},
    {},
    {responseModel:'bad\nmodel',responseId:'x'.repeat(257)},
  ]) {
    const records=[];
    const message={model:'deepseek-v4-flash',provider:'deepseek',api:'openai-completions',...extra,
      headers:{authorization:'private-sentinel'},content:[{type:'thinking',thinking:'private-sentinel'}]};
    const stream=await observeRequestStream({model:{id:'deepseek-v4-flash',provider:'deepseek',api:'openai-completions'},context:{},requestId:1,record:r=>records.push(r),
      start:()=>({result:()=>message,async *[Symbol.asyncIterator](){yield {type:'done',message};}})});
    await Array.fromAsync(stream);
    assert.equal(stream.result(),message);
    const row=records.at(-1);
    assert.equal(row.observedModel.model,'deepseek-v4-flash');
    assert.deepEqual(row.providerResponse,{source:'sdk-response-metadata',
      model:extra.responseModel==='deepseek-flash'?'deepseek-flash':null,
      id:extra.responseId==='response-123'?'response-123':null});
    assert.equal(JSON.stringify(records).includes('private-sentinel'),false);
    assert.equal(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:row}],'r').length,1);
  }
});

test('effort is capability checked and recorded by real local SDK requests',async()=>{
  const h=await boot();
  try {
    const catalog=(await h.api('GET','/provider-models')).json;
    assert(catalog.models.every(m=>m.defaultEffort===null&&m.reasoningCapability?.defaultMode==='omit'));
    const config=(await h.api('GET','/provider-config')).json.config;
    assert.equal((await h.api('PUT','/provider-config',{...config,reasoningEffort:'high'})).status,400);
    assert.equal((await h.api('PUT','/provider-config',{...config,reasoningEffort:'off'})).status,400,
      'the fixture has no exact declared effort ladder, including an invented off value');
    const session=await h.createSession(); const receipt=(await h.api('POST',`/sessions/${session.id}/runs`,{input:'synthetic telemetry',commandId:randomUUID()})).json;
    await h.pollRun(receipt.run.id);
    const snapshot=(await h.api('GET',`/sessions/${session.id}`)).json;
    const measurements=requestMeasurements(snapshot.events,receipt.run.id);
    assert(measurements.length>=1);assert.equal(measurements[0].phase,'completed');
    assert.equal(measurements[0].requestedEffort,null);
    assert.equal(measurements[0].effectiveEffort,measurements[0].sdkEffectiveEffort);
    assert.equal(measurements[0].effectiveEffortSource,'sdk-setting');
    assert.equal(measurements[0].providerEffectiveEffort,null);
    assert.equal(snapshot.runs[0].provider.reasoningEffort,undefined);
    assert.equal(Object.hasOwn(snapshot.runs[0].provider,'reasoningEffort'),false);
    assert(measurements[0].usage.output>0);
    const body=h.runtime.fakeProvider.requests.at(-1).body;
    assert.equal(body.model,config.model);assert.ok(Array.isArray(body.messages));
    for(const field of ['reasoning','reasoning_effort','thinking'])assert.equal(Object.hasOwn(body,field),false);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});


test('malformed measurement records are omitted before rendering',()=>{
  for(const data of [{schemaVersion:1}, {schemaVersion:1,requestId:1,phase:'completed',requestedModel:null}, {schemaVersion:99}])
    assert.deepEqual(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data}],'r'),[]);
});

test('schema6 migration preserves both global and project sessions',async()=>{
  const dataDir=await mkdtemp(path.join(tmpdir(),'cw-schema7-'));let store;
  try {
    store=await new RuntimeStore({dataDir}).open();const project=await store.createProject('synthetic');
    const a=await store.createSession({projectId:project.id,title:'project',workspaceDir:path.join(dataDir,'a')});
    const b=await store.createSession({projectId:null,scope:'global',title:'global',workspaceDir:path.join(dataDir,'b')});
    await store.close();const file=path.join(dataDir,'runtime-state.json');const state=JSON.parse(await readFile(file,'utf8'));
    state.schemaVersion=6;delete state.coordination; delete state.providerConnections; delete state.providerConfigurationPending; delete state.providerConfigVersion; delete state.providerVerifications;await writeFile(file,JSON.stringify(state));
    store=await new RuntimeStore({dataDir}).open();assert.equal(store.state.schemaVersion,13);
    assert.equal(store.getSession(a.id).scope,'project');assert.equal(store.getSession(b.id).scope,'global');assert.equal(store.getSession(b.id).projectId,null);
  } finally{await store?.close();await rm(dataDir,{recursive:true,force:true});}
});
