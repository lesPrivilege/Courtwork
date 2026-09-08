import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {createRuntime} from '../server/runtime.mjs';
import {SYNTHETIC_SOURCES,NORMAL_FACTS} from '../domains/inbound-nda/fixtures.mjs';
import {buildReview,PLAYBOOK_VERSION} from '../domains/inbound-nda/index.mjs';

async function bind(h,facts=NORMAL_FACTS) {
 await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
 const session=await h.createSession();
 const res=await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{title:'Synthetic NDA',sourceText:SYNTHETIC_SOURCES[0].text,facts}});
 assert.equal(res.status,200,JSON.stringify(res.json));
 return session;
}
async function surface(h,id) {return (await h.api('GET',`/sessions/${id}/surface`)).json.projection;}
async function propose(h,session,domain,commandId='review') {
 const created=await h.api('POST',`/sessions/${session.id}/runs`,{commandId,input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain}}])});
 assert.equal(created.status,200,JSON.stringify(created.json));
 await h.pollRun(created.json.run.id,{timeoutMs:15000});
 return created.json.run.id;
}
test('NDA through Pi: verified proposal, trusted decision, revised candidate, source history and new Session context',async()=>{
 const h=await boot();let absent;
 try {
  const a=await bind(h);const ordinary=await h.createSession();
  let captured;
  const begin=h.runtime.registry.begin.bind(h.runtime.registry);
  h.runtime.registry.begin=async(input)=>{const out=await begin(input);captured=out.run;return out;};
  let p=await surface(h,a.id);const review=buildReview({sources:p.sources,facts:p.domain.facts});
  await propose(h,a,review);
  p=await surface(h,a.id);assert.equal(p.candidates.length,1);assert.equal(p.artifact,null);assert.equal(p.candidates[0].domain.playbookVersion,PLAYBOOK_VERSION);
  assert.equal(p.runs[0].preset_version,PLAYBOOK_VERSION);
  const seen=h.runtime.fakeProvider.requests.at(-1).body;
  assert(seen.tools.some(t=>t.function?.name==='se_submit_candidate'));
  assert(JSON.stringify(seen.messages).includes(PLAYBOOK_VERSION));
  await assert.rejects(captured.tools.find(t=>t.name==='se_submit_candidate').execute({domain:review}),{code:'CANDIDATE_CLOSED'});
  const request={extensionId:'inbound-nda',generation:0,action:'decide',payload:{request_id:'nda-accept',candidate_id:p.candidates[0].id,base_version:0,action:'accept',reason:'Synthetic human review'}};
  const accepted=await h.api('POST',`/sessions/${a.id}/actions`,request);assert.equal(accepted.status,200,JSON.stringify(accepted.json));
  assert(accepted.json.projection.artifact);
  assert.deepEqual((await h.api('POST',`/sessions/${a.id}/actions`,request)).json.result,accepted.json.result);
  const revision=await h.api('POST',`/sessions/${a.id}/actions`,{extensionId:'inbound-nda',generation:0,action:'revise_candidate',payload:{candidate_id:p.candidates[0].id,new_candidate_id:'nda-revision',base_version:1,proposal:{domain:review}}});
  assert.equal(revision.status,200,JSON.stringify(revision.json));assert.equal(revision.json.projection.candidates.length,2);assert.equal(revision.json.projection.candidates.find(c=>c.id==='nda-revision').supersedes,p.candidates[0].id);
  const b=await h.createSession();assert.equal((await h.api('POST',`/sessions/${b.id}/extension`,{extensionId:'inbound-nda',input:{existingMatterId:p.matter.id}})).status,200);
  const next=await h.api('POST',`/sessions/${b.id}/runs`,{commandId:'continue',input:'Continue reviewing the current work.'});await h.pollRun(next.json.run.id);
  const context=JSON.stringify(h.runtime.fakeProvider.requests.at(-1).body.messages);assert(context.includes(accepted.json.projection.artifact.id));assert(context.includes('nda-revision'));
  const plain=await h.api('POST',`/sessions/${ordinary.id}/runs`,{commandId:'plain',input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain:review}}])});await h.pollRun(plain.json.run.id);
  const plainWire=h.runtime.fakeProvider.requests.at(-1).body;assert(!plainWire.tools.some(t=>t.function?.name==='se_submit_candidate'));
  // Only the user's synthetic attempted call mentions review; system context remains unbound.
  assert(!plainWire.messages.filter(m=>m.role==='system').some(m=>JSON.stringify(m).includes(p.matter.id)));
  const events=(await h.api('GET',`/sessions/${ordinary.id}/events`)).json.events;assert(events.some(e=>e.type==='tool.result'&&e.data.isError));
  const oldSource=p.sources[0];const changedText=oldSource.text.split('\n').filter(line=>!line.startsWith('4. Term.')).join('\n');
  const replaced=await h.api('POST',`/sessions/${b.id}/actions`,{extensionId:'inbound-nda',generation:0,action:'replace_sources',payload:{revision:2,sources:[{...oldSource,version:2,text:changedText,digest:createHash('sha256').update(changedText).digest('hex')}]}});assert.equal(replaced.status,200);
  const changed=await surface(h,b.id);const missing=buildReview({sources:changed.sources,facts:changed.domain.facts});assert.equal(missing.findings.find(f=>f.ruleId==='term-duration').status,'missing');
  await propose(h,b,missing,'missing-clause');
  const oldAck=await h.api('POST',`/sessions/${b.id}/actions`,request);assert.deepEqual(oldAck.json.result,accepted.json.result);
  const stale=await h.api('POST',`/sessions/${b.id}/actions`,{...request,payload:{...request.payload,request_id:'stale-source',candidate_id:'nda-revision',base_version:1}});assert.equal(stale.json.error.code,'STALE_INPUT');
  const sourceQuery=new URLSearchParams({kind:'source',candidateId:p.candidates[0].id,sourceId:oldSource.id,version:'1'});
  assert.equal((await h.api('GET',`/sessions/${b.id}/work-query?${sourceQuery}`)).json.source.text,oldSource.text);
  const before=await surface(h,b.id);await h.runtime.close();
  absent=await createRuntime({dataDir:h.dataDir,extensionCatalog:{}});
  const historical=(await absent.service.getSurface(b.id)).projection;assert.deepEqual(historical.candidates,before.candidates);assert.deepEqual(historical.artifact,before.artifact);assert.equal(historical.readOnly,true);
 } finally {await absent?.close();await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
test('NDA unresolved facts remain reviewable; forged pass and attempted acceptance fail',async()=>{
 const h=await boot();
 try {
  const facts=structuredClone(NORMAL_FACTS);facts.term={years:'unknown'};
  const a=await bind(h,facts);let p=await surface(h,a.id);const review=buildReview({sources:p.sources,facts});
  await propose(h,a,review);
  p=await surface(h,a.id);assert.equal(p.candidates.length,1);assert.equal(p.candidates[0].domain.reconciliation.complete,false);
  assert(!p.humanActions[0].payloadSchema.properties.action.enum.includes('accept'));
  const rejected=await h.api('POST',`/sessions/${a.id}/actions`,{extensionId:'inbound-nda',generation:0,action:'decide',payload:{request_id:'invalid-accept',candidate_id:p.candidates[0].id,base_version:0,action:'accept',reason:'Try to accept unknown'}});
  assert.equal(rejected.status,409);assert.equal(rejected.json.error.code,'OBLIGATION_OPEN');
  const forged=structuredClone(review);forged.findings.forEach(f=>f.status='pass');forged.reconciliation.complete=true;
  await propose(h,a,forged,'forged');assert.equal((await surface(h,a.id)).candidates.length,1);
  assert.equal((await surface(h,a.id)).artifact,null);
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
