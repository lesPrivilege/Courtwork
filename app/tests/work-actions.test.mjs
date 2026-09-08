import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {boot} from './helpers.mjs';
import {buildReview} from '../domains/inbound-nda/index.mjs';
import {NORMAL_FACTS,SYNTHETIC_SOURCES} from '../domains/inbound-nda/fixtures.mjs';
import {workProjection} from '../core/owner.mjs';

async function surface(h,id) {return (await h.api('GET',`/sessions/${id}/surface`)).json;}
async function seeded(h,facts=NORMAL_FACTS) {
  await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
  const session=await h.createSession();
  assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{title:'Action contract fixture',sourceText:SYNTHETIC_SOURCES[0].text,facts}})).status,200);
  const initial=await surface(h,session.id);
  const domain=buildReview({sources:initial.projection.sources,facts});
  const made=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'propose',input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain}}])});
  assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
  return {session,domain,packet:await surface(h,session.id)};
}
function action(packet,name,candidateId=packet.projection.candidates[0].id) {
  return packet.projection.humanActions.find(item=>item.action===name&&item.payloadSchema.properties.candidate_id.const===candidateId);
}
function revision(packet,domain,newId,parent) {
  const declared=action(packet,'revise_candidate',parent);
  assert(declared,'the server must advertise revision before the UI offers it');
  assert.equal(declared.schemaVersion,1);
  assert.deepEqual(declared.payloadSchema.properties.proposal.required,['domain']);
  assert.equal(declared.payloadSchema.properties.proposal.additionalProperties,false);
  assert.equal(declared.payloadSchema.additionalProperties,false);
  assert(!('actor' in declared.payloadSchema.properties));
  const fields=declared.payloadSchema.properties;
  return {extensionId:'inbound-nda',generation:packet.extension.generation,action:declared.action,payload:{candidate_id:fields.candidate_id.const,new_candidate_id:newId,base_version:fields.base_version.const,proposal:{domain}}};
}

test('versioned revision action executes after acceptance, preserves history, and rejects stale or forged actions',async()=>{
  const h=await boot();
  try {
    const {session,domain,packet}=await seeded(h);
    assert.deepEqual(packet.projection.humanActions.map(a=>a.action),['decide','revise_candidate']);
    assert(packet.projection.humanActions.every(a=>a.schemaVersion===1));
    const candidateId=packet.projection.candidates[0].id;
    const accept=await h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'inbound-nda',generation:packet.extension.generation,action:'decide',payload:{request_id:'accept-before-revision',candidate_id:candidateId,base_version:0,action:'accept',reason:'Synthetic human review'}});
    assert.equal(accept.status,200);
    const accepted=await surface(h,session.id);
    assert.equal(action(accepted,'decide'),undefined);
    const request=revision(accepted,domain,'revised-on-v1');
    assert.equal(request.payload.base_version,1,'revision uses current Matter version, not parent candidate base');
    const result=await h.api('POST',`/sessions/${session.id}/actions`,request);
    assert.equal(result.status,200,JSON.stringify(result.json));
    const replay=await h.api('POST',`/sessions/${session.id}/actions`,request);
    assert.deepEqual(replay.json.result,result.json.result);
    const p=result.json.projection;
    assert.deepEqual(p.artifact,accepted.projection.artifact);
    assert.deepEqual(p.decisions,accepted.projection.decisions);
    assert.deepEqual(p.candidates.find(c=>c.id===candidateId),accepted.projection.candidates[0]);
    assert.equal(p.candidates.find(c=>c.id==='revised-on-v1').supersedes,candidateId);
    assert.deepEqual(p.candidates.find(c=>c.id==='revised-on-v1').provenance,{kind:'human_revision',actor:'local-user'});
    const stale=await h.api('POST',`/sessions/${session.id}/actions`,{...request,payload:{...request.payload,new_candidate_id:'stale-new',base_version:0}});
    assert.equal(stale.json.error.code,'VERSION_CONFLICT');
    const spoof=await h.api('POST',`/sessions/${session.id}/actions`,{...request,actor:'local-user'});
    assert.equal(spoof.status,400);
    const conflict=await h.api('POST',`/sessions/${session.id}/actions`,{...request,payload:{...request.payload,candidate_id:'revised-on-v1'}});
    assert.equal(conflict.json.error.code,'IDEMPOTENCY_CONFLICT');
    assert.equal((await surface(h,session.id)).projection.candidates.length,2);
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('unresolved and source-stale parents can be revised only with currently verified NDA input',async()=>{
  const h=await boot();
  try {
    const {session,packet}=await seeded(h);
    const old=packet.projection.sources[0];
    const text=old.text.split('\n').filter(line=>!line.startsWith('4. Term.')).join('\n');
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'inbound-nda',generation:packet.extension.generation,action:'replace_sources',payload:{revision:2,sources:[{...old,version:2,text,digest:createHash('sha256').update(text).digest('hex')}]}})).status,200);
    const current=await surface(h,session.id);
    assert.equal(action(current,'decide'),undefined,'old source set has no legal fresh decision');
    const domain=buildReview({sources:current.projection.sources,facts:current.projection.domain.facts});
    assert.equal(domain.reconciliation.complete,false);
    const submitted=await h.api('POST',`/sessions/${session.id}/actions`,revision(current,domain,'new-source-revision'));
    assert.equal(submitted.status,200,JSON.stringify(submitted.json));
    const updated=await surface(h,session.id);
    assert.deepEqual(action(updated,'decide','new-source-revision').payloadSchema.properties.action.enum,['reject','request_evidence']);
    assert(action(updated,'revise_candidate','new-source-revision'));
    const revised=updated.projection.candidates.find(c=>c.id==='new-source-revision');
    assert.equal(revised.source_version,2);
    const query=new URLSearchParams({kind:'source',candidateId:packet.projection.candidates[0].id,sourceId:old.id,version:'1'});
    assert.equal((await h.api('GET',`/sessions/${session.id}/work-query?${query}`)).json.source.text,old.text);
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('host active Run, producer unload, incompatible packet, and stale generation offer no usable mutation',async()=>{
  const h=await boot();
  try {
    const {session,domain,packet}=await seeded(h);
    const request=revision(packet,domain,'blocked-revision');
    const ordinary=await h.createSession();
    const made=await h.api('POST',`/sessions/${ordinary.id}/runs`,{commandId:'ordinary-active',input:'/fixture question'});
    await h.pollRun(made.json.run.id,{until:s=>s==='waiting_user'});
    const active=await surface(h,session.id);
    assert.equal(active.projection.readOnly,true);assert.deepEqual(active.projection.humanActions,[]);
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,request)).json.error.code,'active_run');
    await h.api('POST',`/runs/${made.json.run.id}/cancel`,{});
    assert(action(await surface(h,session.id),'revise_candidate'));
    await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'unload'});
    const absent=await surface(h,session.id);
    assert.equal(absent.projection.readOnly,true);assert.deepEqual(absent.projection.humanActions,[]);
    await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,request)).json.error.code,'generation_mismatch');
    const raw=await h.runtime.service.workCore.snapshot(packet.projection.matter.id);
    assert.deepEqual(workProjection(raw,{writable:true,contractVersion:'future'}).humanActions,[]);
    const incompatible=structuredClone(raw);incompatible.domain.schemaVersion=2;
    assert.equal(workProjection(incompatible,{writable:true,contractVersion:raw.matter.contract_version}).readOnly,true);
    assert.deepEqual(workProjection(incompatible,{writable:true,contractVersion:raw.matter.contract_version}).humanActions,[]);
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
