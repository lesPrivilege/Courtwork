import test from 'node:test';
import assert from 'node:assert/strict';
import { observeRequestStream } from '../runtime/request-telemetry.mjs';
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

test('interrupted stream and dispatch error do not report successful usage',async()=>{
  const records=[];
  const stream=await observeRequestStream({model:{id:'m'},context:{},requestId:1,record:r=>records.push(r),start:()=>({result:()=>null,async *[Symbol.asyncIterator](){yield {type:'text_delta',delta:'a'};}})});
  await Array.fromAsync(stream);assert.equal(records.at(-1).phase,'interrupted');assert.equal(records.at(-1).usage,null);
  await assert.rejects(observeRequestStream({model:{id:'m'},context:{},requestId:2,record:r=>records.push(r),start:()=>{throw new Error('failed');}}));
  assert.equal(records.at(-1).phase,'failed');
});

test('effort is capability checked and recorded by real local SDK requests',async()=>{
  const h=await boot();
  try {
    const catalog=(await h.api('GET','/provider-models')).json;
    assert(catalog.models.every(m=>Array.isArray(m.supportedEfforts)&&m.supportedEfforts.includes(m.defaultEffort)));
    const config=(await h.api('GET','/provider-config')).json.config;
    assert.equal((await h.api('PUT','/provider-config',{...config,reasoningEffort:'high'})).status,400);
    assert.equal((await h.api('PUT','/provider-config',{...config,reasoningEffort:'off'})).status,200);
    const session=await h.createSession(); const receipt=(await h.api('POST',`/sessions/${session.id}/runs`,{input:'synthetic telemetry',commandId:randomUUID()})).json;
    await h.pollRun(receipt.run.id);
    const snapshot=(await h.api('GET',`/sessions/${session.id}`)).json;
    const measurements=requestMeasurements(snapshot.events,receipt.run.id);
    assert(measurements.length>=1);assert.equal(measurements[0].phase,'completed');assert.equal(measurements[0].effectiveEffort,'off');
    assert.equal(snapshot.runs[0].provider.reasoningEffort,'off');assert(measurements[0].usage.output>0);
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
    state.schemaVersion=6;delete state.coordination;await writeFile(file,JSON.stringify(state));
    store=await new RuntimeStore({dataDir}).open();assert.equal(store.state.schemaVersion,8);
    assert.equal(store.getSession(a.id).scope,'project');assert.equal(store.getSession(b.id).scope,'global');assert.equal(store.getSession(b.id).projectId,null);
  } finally{await store?.close();await rm(dataDir,{recursive:true,force:true});}
});
