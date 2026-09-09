import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveUsageDetails,selectUsageRuns} from '../server/usage-details.mjs';
import {modelSeries,quantileLevels,validUsageDetails,usageValue} from '../web/usage-projection.mjs';
import {boot} from './helpers.mjs';
import {rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const observed='2026-09-10T12:00:00.000Z';
const usage=(input=0,output=0,missing=false)=>({input,output,cacheRead:2,cacheWrite:0,missing,turns:1});
const fixture=()=>({sessions:[{id:'a',projectId:'p',title:'A'},{id:'g',projectId:null,title:'Global'}],runs:[
  {id:'a1',sessionId:'a',startedAt:'2026-09-10T00:30:00+08:00',status:'completed',provider:{provider:'p',model:'m',api:'one'},usage:usage(10,5)},
  {id:'g1',sessionId:'g',startedAt:'2026-09-10T01:00:00Z',status:'cancelled',provider:{provider:'p',model:'m',api:'two'},usage:usage(4,2,true)},
  {id:'a2',sessionId:'a',startedAt:'2026-09-10T02:00:00Z',status:'running',provider:null,usage:usage(0,0,true)}
]});

test('Usage keeps UTC start-day, route identity, partial/zero/unknown and global scope',()=>{
  const state=fixture();state.runs.push(structuredClone(state.runs[0]));
  const {overview}=deriveUsageDetails(state,{days:2},observed);
  assert(validUsageDetails(overview));assert.equal(overview.recordedRunCount,3);assert.equal(overview.models.length,3);
  assert.equal(overview.buckets[0].date,'2026-09-09');assert.equal(overview.buckets[0].tokens.input,10);
  assert.equal(overview.buckets[1].missingRunCount,2);assert.equal(overview.models.find(m=>m.key==='unknown').tokens.input,0);
  assert.equal(overview.tokens.input,14);assert.equal(overview.tokens.cacheRead,6);
  assert.equal(deriveUsageDetails(state,{days:2,projectId:'p'},observed).overview.recordedRunCount,2);
  assert.equal(deriveUsageDetails(state,{days:2,projectId:'absent'},observed).overview.recordedRunCount,0);
});

test('model route keys include exact endpoint without leaking endpoint in overview',()=>{
  const state=fixture();state.runs=[state.runs[0],{...state.runs[0],id:'different',provider:{...state.runs[0].provider,baseUrl:'https://synthetic.example/private-route'}}];
  const {overview}=deriveUsageDetails(state,{days:2},observed);assert.equal(overview.models.length,2);assert(!JSON.stringify(overview).includes('private-route'));
});

test('chart series and Other membership sum exactly and ties never split heatmap levels',()=>{
  const state=fixture();state.runs=Array.from({length:7},(_,i)=>({...state.runs[0],id:'r'+i,provider:{provider:'fixture',api:'test',model:'m'+i},usage:usage(i+1,2)}));
  const {overview}=deriveUsageDetails(state,{days:2},observed);const series=modelSeries(overview);assert.equal(series.length,5);assert.equal(series.at(-1).modelKeys.length,3);
  const exact=selectUsageRuns(deriveUsageDetails(state,{days:2},observed),{snapshotId:overview.snapshotId,modelKeys:series.at(-1).modelKeys});
  assert.equal(exact.total,3);assert(exact.items.every(run=>series.at(-1).modelKeys.includes(run.modelKey)));
  for(let i=0;i<overview.buckets.length;i++)assert.equal(series.reduce((sum,s)=>sum+s.values[i],0),usageValue(overview.buckets[i]));
  assert.deepEqual(quantileLevels([0,0]).levels,[0,0]);const {levels}=quantileLevels([0,1,1,1,100]);assert.equal(levels[1],levels[2]);assert.equal(levels[2],levels[3]);
});

test('matching runs require same snapshot and preserve model/date filter through pagination',()=>{
  const snapshot=deriveUsageDetails(fixture(),{days:2},observed),snapshotId=snapshot.overview.snapshotId;
  const first=selectUsageRuns(snapshot,{snapshotId,date:'2026-09-10',limit:1});assert.equal(first.total,2);assert.equal(first.nextOffset,1);
  const second=selectUsageRuns(snapshot,{snapshotId,date:'2026-09-10',limit:1,offset:1});assert.notEqual(first.items[0].id,second.items[0].id);
  const changed=fixture();changed.runs[1].usage.input++;
  assert.equal(selectUsageRuns(deriveUsageDetails(changed,{days:2},observed),{snapshotId}).conflict,true);
  assert.equal(selectUsageRuns(snapshot,{snapshotId,modelKeys:['unknown']}).items[0].id,'a2');
});

test('combined token overflow fails closed and malformed frontend DTOs are rejected',()=>{
  const state=fixture();state.runs[0].usage=usage(Number.MAX_SAFE_INTEGER,1);
  assert.throws(()=>deriveUsageDetails(state,{days:2},observed),/safe integer/);
  for(const value of [null,{}, {schemaVersion:1,snapshotId:'x'}])assert.equal(validUsageDetails(value),false);
});

test('HTTP Usage scope, strict input and changed-snapshot rejection use actual retained Runs',async()=>{
  const h=await boot();try{
    const session=await h.createSession();const run=(await h.api('POST',`/sessions/${session.id}/runs`,{input:'usage fixture',commandId:randomUUID()})).json.run;await h.pollRun(run.id);
    const data=(await h.api('GET','/work-usage-details?days=7')).json;assert(validUsageDetails(data));
    const query={days:7,snapshotId:data.snapshotId};let result=await h.api('POST','/work-usage-runs',query);assert.equal(result.status,200);assert.equal(result.json.items[0].id,run.id);
    assert.equal((await h.api('POST','/work-usage-runs',{...query,limit:101})).status,400);
    assert.equal((await h.api('GET','/work-usage-details?days=7&days=7')).status,400);
    await h.api('DELETE',`/sessions/${session.id}`);
    assert.equal((await h.api('POST','/work-usage-runs',query)).status,409);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
