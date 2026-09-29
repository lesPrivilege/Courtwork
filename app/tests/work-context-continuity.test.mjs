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

const decision=(version,action,candidate,reason,artifact=null)=>({request_id:'r'+version,matter_id:'m',candidate_id:candidate,action,reason,result:{version,active_artifact:artifact}});
const withArtifact=view=>({...view,matter:{...view.matter,version:3,active_artifact:'a1'},
  artifact:{id:'a1',candidate_id:'ca',content:'Body',content_digest:'d'},
  candidates:[{id:'ca',base_version:0,source_version:2,contract_version:'contract',status:'accepted',evidence:[],domain:null},...view.candidates]});
test('required context carries reject and evidence decisions after the active accept, newest first, by Matter version',()=>{
  const view=withArtifact(synthetic());
  // The Core lists decisions by request id, not by version; the accept and an earlier reject are history.
  view.decisions=[decision(5,'request_evidence','c2','need the annex'),decision(1,'reject','c0','old wrong clause'),
    decision(2,'accept','ca','ties to source','a1'),decision(4,'reject','c1','cites the wrong clause'),decision(3,'accept','cx','superseded accept','a0')];
  view.decisions[3].result.active_artifact='a1';
  const context=compileWorkContext(view);
  const projected=JSON.parse(context.text);
  assert.equal(projected.schemaVersion,3);
  assert.equal(projected.artifact.acceptedVersion,2);
  assert.deepEqual(projected.decisions,[
    {candidateId:'c2',action:'request_evidence',reason:'need the annex',matterVersion:5},
    {candidateId:'c1',action:'reject',reason:'cites the wrong clause',matterVersion:4}]);
  assert.equal(projected.decisionsOmitted,0);
  assert.equal(context.provenance.decisionsOmitted,0);
  assert(!context.text.includes('ties to source')&&!context.text.includes('old wrong clause'));
  assert(context.provenance.selected.some(item=>item.includes('decisions')));
  assert(!context.provenance.omitted.includes('closed candidates and execution trace'));
});
test('without an active artifact every reject and evidence decision is listed',()=>{
  const view=synthetic();
  view.decisions=[decision(2,'request_evidence','c','second'),decision(1,'reject','c','first')];
  assert.deepEqual(JSON.parse(compileWorkContext(view).text).decisions.map(d=>d.matterVersion),[2,1]);
  assert.deepEqual(JSON.parse(compileWorkContext(synthetic()).text).decisions,[]);
});
test('over budget the oldest decisions are dropped whole and counted; decisions alone never refuse',()=>{
  const view=synthetic();
  const reasons=[1,2,3,4,5].map(n=>`REASON-${n} `+'x'.repeat(400));
  view.decisions=reasons.map((reason,index)=>decision(index+1,'reject','c',reason));
  const full=compileWorkContext(view);
  const size=full.text.length;
  assert.equal(JSON.parse(full.text).decisionsOmitted,0);
  const limit=size-300; // room for four of the five, so the oldest goes
  const trimmed=compileWorkContext(view,limit);
  const projected=JSON.parse(trimmed.text);
  assert(trimmed.text.length<=limit);
  assert.deepEqual(projected.decisions.map(d=>d.matterVersion),[5,4,3,2]);
  assert.deepEqual(projected.decisions.map(d=>d.reason),reasons.slice(1).reverse(),'a reason is kept whole or not at all');
  assert.equal(projected.decisionsOmitted,1);
  assert.equal(trimmed.provenance.decisionsOmitted,1);
  assert.equal(trimmed.provenance.characters,trimmed.text.length);
  // The mandatory parts alone still fit: no decision fits, none is listed, none refuses.
  const mandatory=JSON.stringify(JSON.parse(compileWorkContext({...view,decisions:[]}).text)).length;
  const none=compileWorkContext(view,mandatory+30);
  assert.deepEqual(JSON.parse(none.text).decisions,[]);
  assert.equal(JSON.parse(none.text).decisionsOmitted,5);
  // A newest decision that does not fit ends the list; older ones are not skipped into it.
  view.decisions[4].reason='y'.repeat(5000);
  assert.deepEqual(JSON.parse(compileWorkContext(view,size-300).text).decisions,[]);
  assert.equal(JSON.parse(compileWorkContext(view,size-300).text).decisionsOmitted,5);
});
test('obligations, artifact, source refs and pending candidates stay mandatory when decisions exist',()=>{
  const view=synthetic();
  view.decisions=[decision(1,'reject','c','a reason')];
  view.matter.obligations=[{id:'large-required',text:'x'.repeat(25000),status:'open'}];
  assert.throws(()=>compileWorkContext(view),{code:'CONTEXT_BUDGET'});
  const small=synthetic();small.decisions=[decision(1,'reject','c','a reason')];
  assert.throws(()=>compileWorkContext(small,10),{code:'CONTEXT_BUDGET'});
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
      assert.equal(projected.schemaVersion,3);
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
