import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {workReviewSummary} from '../core/owner.mjs';
import {SYNTHETIC_SOURCES,NORMAL_FACTS} from '../domains/inbound-nda/fixtures.mjs';
import {buildReview} from '../domains/inbound-nda/index.mjs';

async function summary(h,id) {
 const response=await h.api('GET',`/sessions/${id}/review-summary`);
 assert.equal(response.status,200,JSON.stringify(response.json));return response.json;
}
async function surface(h,id) {return (await h.api('GET',`/sessions/${id}/surface`)).json.projection;}
async function bind(h,facts=NORMAL_FACTS) {
 assert.equal((await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'})).status,200);
 const session=await h.createSession();
 assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{title:'Synthetic NDA summary',sourceText:SYNTHETIC_SOURCES[0].text,facts}})).status,200);
 return session;
}
async function propose(h,id) {
 const p=await surface(h,id), domain=buildReview({sources:p.sources,facts:p.domain.facts});
 const created=await h.api('POST',`/sessions/${id}/runs`,{commandId:'summary-candidate',input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain}}])});
 assert.equal(created.status,200,JSON.stringify(created.json));
 assert.equal((await h.pollRun(created.json.run.id,{timeoutMs:15000})).status,'completed');
 return surface(h,id);
}

test('Core review summary follows pending, decision, new Session and lifecycle without returning bodies',async()=>{
 const h=await boot();
 try {
  const module=await fetch(h.runtime.url+'/web/work-review-summary.mjs');
  assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  assert.match(await module.text(),/export function createWorkReviewSummary/);
  const plain=await h.createSession();
  assert.deepEqual(await summary(h,plain.id),{schemaVersion:1,sessionId:plain.id,extensionId:null,status:'unbound',summary:null});
  assert.equal((await h.api('GET','/sessions/missing/review-summary')).status,404);
  const a=await bind(h);
  assert.equal((await summary(h,a.id)).summary.pendingCount,0);
  const p=await propose(h,a.id), first=(await summary(h,a.id)).summary;
  assert.deepEqual(first,workReviewSummary(p));
  assert.equal(first.pendingCount,1);assert.equal(first.reviewableCount,1);assert.equal(first.stalePendingCount,0);
  assert.deepEqual(Object.keys(first).sort(),['matterId','title','version','sourceVersion','contractVersion','stateVersion','readOnly','pendingCount','stalePendingCount','reviewableCount','acceptedArtifactId'].sort());
  assert(!JSON.stringify(first).includes(p.sources[0].text));
  assert.equal(first.acceptedArtifactId,null);
  const b=await h.createSession();
  assert.equal((await h.api('POST',`/sessions/${b.id}/extension`,{extensionId:'inbound-nda',input:{existingMatterId:p.matter.id}})).status,200);
  assert.deepEqual((await summary(h,b.id)).summary,first);
  const request={extensionId:'inbound-nda',generation:0,action:'decide',payload:{request_id:'summary-accept',candidate_id:p.candidates[0].id,base_version:0,action:'accept',reason:'Synthetic human review'}};
  const accepted=await h.api('POST',`/sessions/${a.id}/actions`,request);
  assert.equal(accepted.status,200,JSON.stringify(accepted.json));
  const after=(await summary(h,b.id)).summary;
  assert.equal(after.pendingCount,0);assert.equal(after.reviewableCount,0);
  assert.equal(after.acceptedArtifactId,accepted.json.projection.artifact.id);
  assert.notEqual(after.stateVersion,first.stateVersion);
  assert.deepEqual((await h.api('POST',`/sessions/${a.id}/actions`,request)).json.result,accepted.json.result);
  assert.deepEqual((await summary(h,b.id)).summary,after);
  assert.equal((await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'unload'})).status,200);
  const readOnly=(await summary(h,b.id)).summary;
  assert.equal(readOnly.readOnly,true);assert.equal(readOnly.reviewableCount,0);assert.equal(readOnly.acceptedArtifactId,after.acceptedArtifactId);
  assert.equal((await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'})).status,200);
  assert.equal((await summary(h,b.id)).summary.readOnly,false);
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('Core review summary keeps stale pending and domain review separate from authority to accept',async()=>{
 const h=await boot();
 try {
  const facts=structuredClone(NORMAL_FACTS);facts.term={years:'unknown'};
  const a=await bind(h,facts), p=await propose(h,a.id);
  assert(!p.humanActions.find(action=>action.action==='decide').payloadSchema.properties.action.enum.includes('accept'));
  let s=(await summary(h,a.id)).summary;
  assert.equal(s.pendingCount,1);assert.equal(s.reviewableCount,1,'review may still reject or request evidence');
  const old=p.sources[0],text=old.text+'\nSynthetic source revision.';
  const replaced=await h.api('POST',`/sessions/${a.id}/actions`,{extensionId:'inbound-nda',generation:0,action:'replace_sources',payload:{revision:2,sources:[{...old,version:2,text,digest:createHash('sha256').update(text).digest('hex')}]}});
  assert.equal(replaced.status,200,JSON.stringify(replaced.json));
  s=(await summary(h,a.id)).summary;
  assert.equal(s.pendingCount,1);assert.equal(s.stalePendingCount,1);assert.equal(s.reviewableCount,0);
  const denied=await h.api('POST',`/sessions/${a.id}/actions`,{extensionId:'inbound-nda',generation:0,action:'decide',payload:{request_id:'stale-summary',candidate_id:p.candidates[0].id,base_version:0,action:'reject',reason:'Old view'}});
  assert.equal(denied.status,409);assert.equal(denied.json.error.code,'STALE_INPUT');
  assert.deepEqual((await summary(h,a.id)).summary,s);
  const original=h.runtime.store.hasActiveRun;
  h.runtime.store.hasActiveRun=()=>true;
  try {assert.equal((await summary(h,a.id)).summary.readOnly,true);} finally {h.runtime.store.hasActiveRun=original;}
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('Core review summary does not turn missing Core projections or failures into zero pending',async()=>{
 assert.equal(workReviewSummary({}),null);
 const h=await boot();
 try {
  const a=await bind(h);
  const original=h.runtime.service.getSurface;
  h.runtime.service.getSurface=async()=>({projection:null});
  assert.deepEqual(await summary(h,a.id),{schemaVersion:1,sessionId:a.id,extensionId:'inbound-nda',status:'unavailable',summary:null});
  h.runtime.service.getSurface=async()=>{throw new Error('synthetic Core unavailable');};
  assert.equal((await h.api('GET',`/sessions/${a.id}/review-summary`)).status,500);
  h.runtime.service.getSurface=original;
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
