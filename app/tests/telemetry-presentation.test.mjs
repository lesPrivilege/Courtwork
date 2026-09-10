import test from 'node:test';
import assert from 'node:assert/strict';
import { requestTiming, requestDuration, renderRequestMeasurements } from '../web/telemetry-view.mjs';
import { withTinyDom } from './tiny-dom.mjs';
const measurement=(id,extra={})=>({schemaVersion:1,requestId:id,phase:'completed',purpose:'agent',requestedModel:{provider:'local',model:'test',api:'test'},observedModel:null,elapsedMs:1000,firstOutputMs:200,firstTextMs:500,context:null,usage:{input:3,output:null,cacheRead:0,cacheWrite:0},...extra});
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
