import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMeasurements, requestTiming, requestDuration, renderRequestMeasurements } from '../web/telemetry-view.mjs';
import { withTinyDom } from './tiny-dom.mjs';
const measurement=(id,extra={})=>({schemaVersion:1,requestId:id,source:'host-semantic-stream',startedAt:'2026-09-10T12:00:00.000Z',requestedEffort:null,effectiveEffort:null,contextWindow:null,providerTtftMs:null,decodeTokensPerSecond:null,missing:['provider_token_timing','token_deltas'],phase:'completed',purpose:'agent',requestedModel:{provider:'local',model:'test',api:'test'},observedModel:null,elapsedMs:1000,firstOutputMs:200,firstTextMs:500,context:null,usage:{input:3,output:null,cacheRead:0,cacheWrite:0},...extra});
test('host timing has independent request origins and preserves missing versus measured zero',()=>{
  const rows=requestTiming([measurement(1),measurement(2,{elapsedMs:500,firstOutputMs:0,firstTextMs:null})]);
  assert.deepEqual(rows.map(r=>[r.width,r.firstOutput,r.firstText]),[[100,20,50],[50,0,null]]);
  assert.deepEqual(requestTiming([measurement(1,{elapsedMs:0,firstOutputMs:0,firstTextMs:null})])[0],{requestId:1,duration:0,width:0,firstOutput:null,firstText:null});
  assert.equal(requestDuration(null),'Not observed');assert.equal(requestDuration(0),'0 ms');assert.equal(requestDuration(5),'5 ms');
});
test('out-of-interval observations stay in detail and do not become clamped chart marks',()=>{
  assert.equal(requestTiming([measurement(1,{firstOutputMs:1100})])[0].firstOutput,null);
});
test('default request view folds exact records, preserves lower-level facts and restores open sections',async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const events=[{type:'runtime.request.telemetry',runId:'r',data:measurement(1)}];
  const box=renderRequestMeasurements(events,'r');
  assert.equal(box.querySelector('.request-detail').open,false);
  assert.match(box.textContent,/Not reported/);assert.match(box.textContent,/no token deltas/);
  assert.match(box.querySelector('[role="img"]').getAttribute('aria-label'),/first output 200 ms; first text 500 ms/);
  const reopened=renderRequestMeasurements(events,'r',{opened:new Set(['request-1','request-definitions'])});
  assert.equal(reopened.querySelector('.request-detail').open,true);
  assert.equal(reopened.querySelector('.request-definitions').open,true);
}));

test('malformed v1 metadata is rejected while out-of-interval timing remains inspectable',()=>{
 for(const mutate of [r=>r.purpose={},r=>r.source=4,r=>r.requestedModel.model='',r=>r.observedModel={model:{},provider:42,api:null},r=>r.effectiveEffort={},r=>r.startedAt='bad',r=>r.contextWindow=-1,r=>r.context={estimatedTokens:20},r=>r.providerTtftMs=1]){
  const row=measurement(1);mutate(row);assert.equal(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:row}],'r').length,0);
 }
 const row=measurement(1,{firstTextMs:2000});assert.equal(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:row}],'r').length,1);assert.equal(requestTiming([row])[0].firstText,null);
});

test('request detail distinguishes runtime and provider aliases while retaining historical records',async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const base=measurement(1,{requestedModel:{provider:'deepseek',model:'deepseek-v4-flash',api:'openai-completions'},
    observedModel:{provider:'deepseek',model:'deepseek-v4-flash',api:'openai-completions'}});
  const render=data=>renderRequestMeasurements([{type:'runtime.request.telemetry',runId:'r',data}],'r');
  const historical=render(base);
  assert.match(historical.textContent,/Runtime model/);assert.doesNotMatch(historical.textContent,/Provider-reported model/);
  const current=render({...base,providerResponse:{source:'sdk-response-metadata',model:'deepseek-flash',id:'response-123'}});
  const fields=current.querySelectorAll('dt').map((dt,i)=>[dt.textContent,current.querySelectorAll('dd')[i].textContent]);
  assert.deepEqual(fields.filter(([label])=>['Runtime model','Provider-reported model','Provider response ID'].includes(label)),
    [['Runtime model','deepseek · deepseek-v4-flash'],['Provider-reported model','deepseek-flash'],['Provider response ID','response-123']]);
  assert.match(current.textContent,/Unavailable · no token deltas/);
  for(const providerResponse of [null,{source:'guess',model:'alias',id:null},{source:'sdk-response-metadata',model:'a\nb',id:null},{source:'sdk-response-metadata',model:null,id:'x'.repeat(257)}])
    assert.equal(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:{...base,providerResponse}}],'r').length,0);
}));


test('effort detail separates requested intent, SDK settings and unobserved provider behavior', async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const data=measurement(1,{requestedEffort:null,effectiveEffort:'medium',sdkEffectiveEffort:'medium',effectiveEffortSource:'sdk-setting',providerEffectiveEffort:null});
  const box=renderRequestMeasurements([{type:'runtime.request.telemetry',runId:'r',data}],'r');
  const fields=box.querySelectorAll('dt').map((dt,i)=>[dt.textContent,box.querySelectorAll('dd')[i].textContent]);
  assert.deepEqual(fields.filter(([label])=>['Requested effort','SDK setting','Provider effort'].includes(label)),
    [['Requested effort','Provider default'],['SDK setting','medium'],['Provider effort','Not reported']]);
  assert.equal(requestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:{...data,providerEffectiveEffort:'medium'}}],'r').length,0,'a setting without a supported provider observation source cannot be displayed as effective');
}));
