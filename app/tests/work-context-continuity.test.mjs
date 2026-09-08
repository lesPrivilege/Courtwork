import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {compileWorkContext,workProjection} from '../core/owner.mjs';
import {boot} from './helpers.mjs';

const synthetic = () => ({matter:{id:'m',version:0,source_version:2,contract_version:'contract',active_artifact:null,obligations:[]},
  artifact:null,sources:[],candidates:[{id:'c',base_version:0,source_version:2,contract_version:'contract',status:'pending',evidence:[],domain:null}],decisions:[],runs:[]});
test('model and human projections preserve source/contract/base applicability without granting authority',()=>{
  const current=synthetic();
  const options={writable:true,contractVersion:'contract'};
  const fresh=compileWorkContext(current);
  assert.equal(JSON.parse(fresh.text).pending[0].basis.current,true);
  for(const [field,value,reason] of [['source_version',1,'source_version_changed'],['contract_version','old','contract_version_changed'],['base_version',1,'base_version_changed']]) {
    const stale=structuredClone(current);stale.candidates[0][field]=value;
    const compiled=compileWorkContext(stale);
    assert.notEqual(compiled.text,fresh.text);
    assert.deepEqual(JSON.parse(compiled.text).pending[0].basis,{current:false,reasons:[reason]});
    assert(!workProjection(stale,options).humanActions.some(a=>a.action==='decide'));
  }
  current.matter.obligations=[{id:'large-required',text:'x'.repeat(25000),status:'open'}];
  assert.throws(()=>compileWorkContext(current),{code:'CONTEXT_BUDGET'});
});

test('HTTP accepted short/25k/100k text resumes in new Session with scoped artifact pages; URLs are content',async()=>{
  const h=await boot();
  try {
    await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
    for(const length of [100,25000,100000]) {
      const a=await h.createSession();
      const bound=await h.api('POST',`/sessions/${a.id}/extension`,{extensionId:'evidence-memo',input:{title:'Long memo',sourceText:'Approved source'}});
      assert.equal(bound.status,200);
      let p=(await h.api('GET',`/sessions/${a.id}/surface`)).json.projection;
      const s=p.sources[0];
      const evidence=[{source_id:s.id,source_version:s.version,start:0,end:s.text.length,quote:s.text,digest:s.digest}];
      const first=await h.api('POST',`/sessions/${a.id}/runs`,{commandId:'seed',input:h.scriptInput([{name:'se_submit_candidate',arguments:{artifact_text:'See https://example.invalid/reference without fetching it',evidence,obligations:[]}}])});
      assert.equal((await h.pollRun(first.json.run.id,{timeoutMs:15000})).status,'completed');
      p=(await h.api('GET',`/sessions/${a.id}/surface`)).json.projection;
      assert.equal(p.candidates.length,1);
      const prefix='/report ../notes https://example.invalid/reference 😀 ';
      const content=prefix+'x'.repeat(length-prefix.length-4)+'TAIL';
      assert.equal(content.length,length);
      const revision=await h.api('POST',`/sessions/${a.id}/actions`,{extensionId:'evidence-memo',generation:0,action:'revise_candidate',payload:{candidate_id:p.candidates[0].id,new_candidate_id:'long-'+length,base_version:0,proposal:{artifact_text:content,evidence,obligations:[]}}});
      assert.equal(revision.status,200,JSON.stringify(revision.json));
      const decision={extensionId:'evidence-memo',generation:0,action:'decide',payload:{request_id:'accept-'+length,candidate_id:'long-'+length,base_version:0,action:'accept',reason:'Synthetic review'}};
      assert.equal((await h.api('POST',`/sessions/${a.id}/actions`,{...decision,actor:'model'})).status,400);
      const accepted=await h.api('POST',`/sessions/${a.id}/actions`,decision);
      assert.equal(accepted.status,200,JSON.stringify(accepted.json));
      const artifact=accepted.json.projection.artifact;
      assert.equal(artifact.content,content);
      const b=await h.createSession();
      assert.equal((await h.api('POST',`/sessions/${b.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:p.matter.id}})).status,200);
      const offset=Array.from(content).length-4;
      const next=await h.api('POST',`/sessions/${b.id}/runs`,{commandId:'continue',input:h.scriptInput([{name:'se_read_artifact',arguments:{artifactId:artifact.id,offset,limit:4}}])});
      assert.equal(next.status,200,JSON.stringify(next.json));
      assert.equal((await h.pollRun(next.json.run.id,{timeoutMs:15000})).status,'completed');
      const view=(await h.api('GET',`/sessions/${b.id}/surface`)).json.projection;
      const context=view.runs.find(r=>r.id===next.json.run.id).workContext;
      const projected=JSON.parse(context.text);
      assert.equal(projected.schemaVersion,2);
      assert.equal(projected.artifact.id,artifact.id);
      assert.equal(projected.artifact.contentDigest,artifact.content_digest);
      assert.equal(projected.artifact.lengthCodePoints,Array.from(content).length);
      assert.equal(projected.artifact.basis.current,true);
      assert.equal(Object.hasOwn(projected.artifact,'content'),false);
      assert(context.provenance.characters < 24000);
      const events=(await h.api('GET',`/sessions/${b.id}/events`)).json.events;
      assert(events.some(e=>e.runId===next.json.run.id && e.type==='tool.result' && !e.data.isError && JSON.stringify(e.data).includes('TAIL')));
      assert.equal((await h.api('POST',`/sessions/${b.id}/actions`,decision)).json.result.active_artifact,artifact.id);
      const after=(await h.api('GET',`/sessions/${b.id}/surface`)).json.projection;
      assert.equal(after.artifact.content,content);assert.equal(after.decisions.length,1);
    }
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
