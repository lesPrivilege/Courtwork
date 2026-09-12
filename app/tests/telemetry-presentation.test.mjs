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
test('request view uses one on-demand disclosure, preserves semantic gaps and restores its open state',async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const events=[{type:'runtime.request.telemetry',runId:'r',data:measurement(1)}];
  const opened=new Set(),changes=[];
  const box=renderRequestMeasurements(events,'r',{opened,onDisclosureChange:value=>changes.push(value)});
  const disclosures=box.querySelectorAll('details');
  assert.equal(disclosures.length,1);
  assert.equal(disclosures[0].getAttribute('data-section'),'request-measurements');
  assert.equal(disclosures[0].open,false);
  assert.match(box.textContent,/Not reported/);assert.match(box.textContent,/no token deltas/);
  assert.match(box.textContent,/Host elapsed time/);assert.match(box.textContent,/not provider TTFT/);
  assert.match(box.querySelector('[role="img"]').getAttribute('aria-label'),/first output 200 ms; first text 500 ms/);
  disclosures[0].open=true;disclosures[0].dispatchEvent({type:'toggle'});
  assert.equal(opened.has('request-measurements'),true);
  assert.deepEqual(changes,[true]);
  const reopened=renderRequestMeasurements(events,'r',{opened,onDisclosureChange:value=>changes.push(value)});
  assert.equal(reopened.querySelector('details').open,true);
  reopened.querySelector('details').open=false;reopened.querySelector('details').dispatchEvent({type:'toggle'});
  const closed=renderRequestMeasurements(events,'r',{opened});
  assert.equal(closed.querySelector('details').open,false);
  assert.deepEqual(changes,[true,false]);
}));

test('missing usage stays unknown and a reported request estimate keeps its method',async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const absent=measurement(1,{context:{method:'serialized-request-utf16-chars-divided-by-4',exact:false,characters:101,estimatedTokens:26}});
  delete absent.usage;
  const unknown=[absent,measurement(2,{usage:null})];
  const box=renderRequestMeasurements(unknown.map(data=>({type:'runtime.request.telemetry',runId:'r',data})),'r');
  const labels=['Input tokens','Output tokens','Cache read','Cache write'];
  for(const record of box.querySelectorAll('.request-detail')) {
    const fields=record.querySelectorAll('dt').map((dt,i)=>[dt.textContent,record.querySelectorAll('dd')[i].textContent]);
    assert.deepEqual(fields.filter(([label])=>labels.includes(label)),labels.map(label=>[label,'Not reported']));
  }
  const estimateFields=box.querySelectorAll('.request-detail')[0].querySelectorAll('dt').map((dt,i)=>[dt.textContent,box.querySelectorAll('.request-detail')[0].querySelectorAll('dd')[i].textContent]);
  assert.deepEqual(estimateFields.find(([label])=>label==='Request context estimate'),['Request context estimate','~26 tokens · serialized UTF-16 chars ÷ 4']);

  const zero=measurement(3,{usage:{input:0,output:0,cacheRead:0,cacheWrite:0}});
  const zeroBox=renderRequestMeasurements([{type:'runtime.request.telemetry',runId:'r',data:zero}],'r');
  const zeroFields=zeroBox.querySelectorAll('dt').map((dt,i)=>[dt.textContent,zeroBox.querySelectorAll('dd')[i].textContent]);
  assert.deepEqual(zeroFields.filter(([label])=>labels.includes(label)),labels.map(label=>[label,'0']));
}));

test('all historical requests share the same outer disclosure while compact views select only the latest',async()=>withTinyDom(()=>{
  const create=document.createElement.bind(document);document.createElement=tag=>Object.assign(create(tag),{style:{}});
  const events=[
    {type:'runtime.request.telemetry',runId:'r',data:measurement(1,{elapsedMs:900})},
    {type:'runtime.request.telemetry',runId:'r',data:measurement(2,{elapsedMs:1200})},
  ];
  const history=renderRequestMeasurements(events,'r');
  assert.equal(history.querySelectorAll('details').length,1);
  assert.equal(history.querySelectorAll('.request-detail').length,2);
  assert.match(history.querySelector('summary').textContent,/2 model requests · latest request: Completed · 1\.20 s/);
  const compact=renderRequestMeasurements(events,'r',{compact:true});
  assert.equal(compact.querySelectorAll('details').length,1);
  assert.equal(compact.querySelectorAll('.request-detail').length,1);
  assert.match(compact.querySelector('summary').textContent,/Latest request · Completed · 1\.20 s/);
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
