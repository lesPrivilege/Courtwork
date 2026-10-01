import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {boot} from './helpers.mjs';
import {SYNTHETIC_SOURCES,NORMAL_FACTS} from '../domains/inbound-nda/fixtures.mjs';
import {buildReview} from '../domains/inbound-nda/index.mjs';

const digest=text=>createHash('sha256').update(text).digest('hex');
const surface=async(h,session)=>(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
const anchor=s=>({source_id:s.id,source_version:s.version,start:0,end:s.text.length,quote:s.text,digest:s.digest});
async function memo(h,title){
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const session=await h.createSession();
  assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title,sourceText:'Synthetic dated source'}})).status,200);
  let p=await surface(h,session);
  const run=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'proposal',input:h.scriptInput([{name:'se_submit_candidate',arguments:{artifact_text:'Synthetic artifact',evidence:[anchor(p.sources[0])],obligations:[]}}])});
  assert.equal((await h.pollRun(run.json.run.id)).status,'completed');
  p=await surface(h,session);assert.equal(p.candidates.length,1);
  return {session,p};
}

test('HTTP revision whose acknowledgement was lost replays after the sources moved; changed content conflicts; a fresh id meets current sources',async()=>{
  const h=await boot();
  try{
    const {session,p}=await memo(h,'Replay');
    const s1=p.sources[0],parent=p.candidates[0].id;
    const act=(action,payload,to=session)=>h.api('POST',`/sessions/${to.id}/actions`,{extensionId:'evidence-memo',generation:0,action,payload});
    const revision={candidate_id:parent,new_candidate_id:'revision-lost-ack',base_version:0,proposal:{artifact_text:'Revised under the first sources',evidence:[anchor(s1)],obligations:[]}};
    // The first response is the acknowledgement the client never saw.
    const original=await act('revise_candidate',revision);
    assert.equal(original.status,200,JSON.stringify(original.json));
    const s2={...s1,version:2,text:'Updated dated source'};s2.digest=digest(s2.text);
    assert.equal((await act('replace_sources',{sources:[s2],revision:2})).status,200);
    const before=await surface(h,session);
    assert.equal(before.matter.source_version,2);

    const replay=await act('revise_candidate',revision);
    assert.equal(replay.status,200,`the identical revision replays instead of meeting the new sources: ${JSON.stringify(replay.json.error)}`);
    assert.deepEqual(replay.json.result,original.json.result);
    assert.deepEqual(replay.json.result,{candidate_id:'revision-lost-ack',status:'pending'});
    const stored=replay.json.projection.candidates.find(c=>c.id==='revision-lost-ack');
    assert.equal(stored.source_version,1,'the stored revision keeps the sources it was made under');
    assert.equal(stored.basis.current,false);assert.deepEqual(stored.basis.reasons,['source_version_changed']);

    const changed=await act('revise_candidate',{...revision,proposal:{...revision.proposal,artifact_text:'Different words under the same id'}});
    assert.equal(changed.status,409);assert.equal(changed.json.error.code,'IDEMPOTENCY_CONFLICT');
    // Evidence that never matched any source is still only a different payload.
    const forged=await act('revise_candidate',{...revision,proposal:{...revision.proposal,evidence:[{...anchor(s1),quote:'not in the source'}]}});
    assert.equal(forged.status,409);assert.equal(forged.json.error.code,'IDEMPOTENCY_CONFLICT');
    const otherBase=await act('revise_candidate',{...revision,base_version:1});
    assert.equal(otherBase.status,409);assert.equal(otherBase.json.error.code,'IDEMPOTENCY_CONFLICT');

    const fresh=await act('revise_candidate',{...revision,new_candidate_id:'revision-fresh-id'});
    assert.equal(fresh.status,409);assert.equal(fresh.json.error.code,'BINDING_MISMATCH','a new id citing the replaced source is validated against current sources');
    const drifted=await act('revise_candidate',{...revision,new_candidate_id:'revision-fresh-quote',proposal:{...revision.proposal,evidence:[{...anchor(s2),quote:s1.text}]}});
    assert.equal(drifted.status,409);assert.equal(drifted.json.error.code,'EVIDENCE_INVALID');

    // An id that exists only in another Matter is not a replay here: it is
    // validated as new against this Matter's sources and the Core refuses it.
    const other=await memo(h,'Other Matter');
    const foreign={...revision,new_candidate_id:other.p.candidates[0].id};
    const crossStale=await act('revise_candidate',foreign);
    assert.equal(crossStale.status,409);assert.equal(crossStale.json.error.code,'BINDING_MISMATCH');
    const crossCurrent=await act('revise_candidate',{...foreign,proposal:{...foreign.proposal,evidence:[anchor(s2)]}});
    assert.equal(crossCurrent.status,409);assert.equal(crossCurrent.json.error.code,'IDEMPOTENCY_CONFLICT');
    assert.deepEqual(await surface(h,other.session),other.p,'the other Matter is unchanged');

    // No replay or refusal stored anything.
    const after=await surface(h,session);
    assert.equal(after.stateVersion,before.stateVersion);
    assert.deepEqual(after.candidates.map(c=>c.id).sort(),[parent,'revision-lost-ack'].sort());
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('NDA revision replays after the sources moved without the domain re-verifying it; new content is still verified',async()=>{
  const h=await boot();
  try{
    await h.api('POST','/extensions/inbound-nda/lifecycle',{action:'load'});
    const session=await h.createSession();
    assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'inbound-nda',input:{title:'Synthetic NDA',sourceText:SYNTHETIC_SOURCES[0].text,facts:NORMAL_FACTS}})).status,200);
    let p=await surface(h,session);
    const review=buildReview({sources:p.sources,facts:p.domain.facts});
    const run=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'review',input:h.scriptInput([{name:'se_submit_candidate',arguments:{domain:review}}])});
    assert.equal((await h.pollRun(run.json.run.id,{timeoutMs:15000})).status,'completed');
    p=await surface(h,session);assert.equal(p.candidates.length,1);
    const act=(action,payload)=>h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'inbound-nda',generation:0,action,payload});
    const revision={candidate_id:p.candidates[0].id,new_candidate_id:'nda-revision-lost-ack',base_version:0,proposal:{domain:review}};
    const original=await act('revise_candidate',revision);
    assert.equal(original.status,200,JSON.stringify(original.json));
    const s2={...p.sources[0],version:2,text:`${p.sources[0].text}\nAmended after the revision.`};s2.digest=digest(s2.text);
    assert.equal((await act('replace_sources',{sources:[s2],revision:2})).status,200);
    const before=await surface(h,session);

    const replay=await act('revise_candidate',revision);
    assert.equal(replay.status,200,`the identical NDA revision replays: ${JSON.stringify(replay.json.error)}`);
    assert.deepEqual(replay.json.result,original.json.result);

    const edited=structuredClone(review);edited.findings[0].reason=`${edited.findings[0].reason} (edited)`;
    const changed=await act('revise_candidate',{...revision,proposal:{domain:edited}});
    assert.equal(changed.status,409);assert.equal(changed.json.error.code,'IDEMPOTENCY_CONFLICT');
    const extra=await act('revise_candidate',{...revision,proposal:{domain:review,artifact_text:'smuggled'}});
    assert.equal(extra.status,409);assert.equal(extra.json.error.code,'INVALID_INPUT');
    const fresh=await act('revise_candidate',{...revision,new_candidate_id:'nda-revision-fresh'});
    assert.equal(fresh.status,409);assert.equal(fresh.json.error.code,'REVIEW_INVALID','a new id is verified by the domain against current sources');

    const after=await surface(h,session);
    assert.equal(after.stateVersion,before.stateVersion);assert.equal(after.candidates.length,2);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('a file-memo Matter refuses generic revise, also under an id it already holds',async()=>{
  const h=await boot();
  try{
    await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
    const session=await h.createSession({permissionMode:'draft'});
    assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'File memo',sourceText:'Approved source.',profile:'file-memo-v1'}})).status,200);
    let p=await surface(h,session);
    const evidence=[{...anchor(p.sources[0]),end:Array.from(p.sources[0].text).length}];
    const run=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'files',input:h.scriptInput([{name:'ws_write',arguments:{path:'out/memo.txt',text:'A\n'}},{name:'se_submit_candidate',arguments:{artifact_text:'Source-backed memo.',evidence,obligations:[],recordedFiles:[{path:'out/memo.txt',sha256:digest('A\n')}]}}])});
    assert.equal((await h.pollRun(run.json.run.id)).status,'completed');
    p=await surface(h,session);assert.equal(p.candidates.length,1);
    const held=p.candidates[0].id;
    for(const id of ['file-revision-new',held]){
      const refused=await h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'evidence-memo',generation:0,fileCapabilityVersion:1,action:'revise_candidate',payload:{candidate_id:held,new_candidate_id:id,base_version:0,proposal:{artifact_text:'Text revision',evidence,obligations:[]}}});
      assert.equal(refused.status,409,id);assert.equal(refused.json.error.code,'CONTRACT_UNSUPPORTED',id);
    }
    assert.equal((await surface(h,session)).stateVersion,p.stateVersion);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
