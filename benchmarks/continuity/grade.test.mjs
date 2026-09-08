import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {grade} from './grade.mjs';
import {execute as courtwork} from './courtwork.mjs';
import {execute as standard} from './standard.mjs';
import {observeCourtwork,observeStandard} from './observe.mjs';

const spec = JSON.parse(await readFile(new URL('./cases.json',import.meta.url)));
const results = new Map();
for (const [name,execute] of Object.entries({E:courtwork,S:standard})) {
  for (const task of spec.cases) results.set(name+'/'+task.id,await execute(spec,task));
}
const taskOf = id=>spec.cases.find(t=>t.id === id);
function score(condition,id,mutate=()=>{},error=null) {
  const r=results.get(condition+'/'+id), o=structuredClone(r.observations);
  mutate(o);
  return grade(spec,taskOf(id),o,r.identities,error);
}
test('E and ordinary S both satisfy the same semantic protocol with different IDs and revisions',()=>{
  for (const [key,r] of results) assert.equal(grade(spec,taskOf(key.split('/')[1]),r.observations,r.identities,r.error).pass,true,key);
  assert.notEqual(results.get('E/normal').identities.workspaceId,results.get('S/normal').identities.workspaceId);
  assert.notEqual(results.get('E/normal').observations[1].revision,results.get('S/normal').observations[1].revision);
});
test('Pro M1-M5 observation corruptions are rejected in both conditions',()=>{
  const probes = [
    ['receipt-replay',o=>{o[2].artifact.content='CORRUPTED';}],
    ['receipt-replay',o=>{o[2].obligations=[];}],
    ['restart',o=>{o[2].artifact=null;o[2].obligations=[];}],
    ['normal',o=>{o[1].audits=[];}],
    ['actor-spoof',o=>{o[1].artifact=null;}],
  ];
  for (const condition of ['E','S']) for(const [id,mutate] of probes) assert.equal(score(condition,id,mutate).pass,false,condition+'/'+id);
});
test('all committed checkpoints protect content, obligations, authority, source, receipts and unique effect',()=>{
  const mutations = [
    o=>{o.artifact.content='WRONG';},o=>{o.artifact.digest='wrong';},o=>{o.artifact.proposalId='foreign';},
    o=>{o.obligations[0].text='Different work';},o=>{o.obligations[0].blocking=true;},o=>{o.obligations[0].status='closed';},
    o=>{o.decisions[0].actorId='outsider';},o=>{o.audits[0].scope.workspaceId='foreign';},
    o=>{o.receipts[0].artifactId='not-the-artifact';},o=>{o.receipts.push(o.receipts[0]);},
    o=>{o.source.digest='wrong';},o=>{o.proposal.sourceVersion='unknown';},o=>{o.historicalSource.text='changed';},
  ];
  for(const condition of ['E','S']) for(const task of spec.cases) {
    const base=results.get(condition+'/'+task.id);
    for(let i=0;i<base.observations.length;i++) if(base.observations[i].artifact) {
      for(const mutation of mutations) assert.equal(score(condition,task.id,obs=>mutation(obs[i])).pass,false,condition+'/'+task.id+'/'+i);
      for(const field of Object.keys(base.observations[i])) assert.equal(score(condition,task.id,obs=>{delete obs[i][field];}).pass,false,'missing '+field);
    }
  }
});
test('reject-all, wrong refusal, missing/extra/reordered checkpoints and run errors fail',()=>{
  for(const c of ['E','S']) {
    assert.equal(score(c,'normal',o=>{o[1]=structuredClone(o[0]);o[1].operation='authority_rejected';}).pass,false);
    assert.equal(score(c,'stale-source',o=>{o[1].operation='invalid_input';}).pass,false);
    assert.equal(score(c,'normal',o=>o.pop()).pass,false);
    assert.equal(score(c,'normal',o=>o.push(o[0])).pass,false);
    assert.equal(score(c,'normal',o=>o.reverse()).pass,false);
    for(const code of ['TIMEOUT','UNKNOWN','CORE_UNAVAILABLE']) assert.equal(score(c,'normal',()=>{},{code}).pass,false);
  }
});
test('raw observer maps actual facts and never reconstructs missing durable audit or content',()=>{
  for(const c of ['E','S']) {
    const r=results.get(c+'/normal'), entry=structuredClone(r.trace[1]);
    let observation;
    if(c==='E') {entry.state.audits=[];entry.state.artifact.content='raw corruption';observation=observeCourtwork(entry.state,entry.historicalSource,entry.operation);}
    else {entry.raw.auditLog=[];entry.raw.document.content='raw corruption';observation=observeStandard(entry.raw,entry.operation);}
    assert.equal(observation.audits.length,0);
    assert.equal(observation.artifact.content,'raw corruption');
    assert.equal(grade(spec,taskOf('normal'),[r.observations[0],observation],r.identities).pass,false);
  }
});
