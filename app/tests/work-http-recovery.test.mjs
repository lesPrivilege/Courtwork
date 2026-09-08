import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {boot,reopen} from './helpers.mjs';

async function prepare(h) {
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const session=await h.createSession();
  await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'Recovery',sourceText:'Synthetic dated source'}});
  let p=(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
  const s=p.sources[0];
  const evidence=[{source_id:s.id,source_version:s.version,start:0,end:s.text.length,quote:s.text,digest:s.digest}];
  const obligations=[{id:'follow-up',text:'Confirm the owner',status:'open',blocking:false,evidence_refs:[]}];
  const run=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'proposal',input:h.scriptInput([{name:'se_submit_candidate',arguments:{artifact_text:'Synthetic artifact',evidence,obligations}}])});
  assert.equal((await h.pollRun(run.json.run.id)).status,'completed');
  p=(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
  assert.equal(p.candidates.length,1);
  return {session,p,evidence,obligations};
}
test('Core SIGKILL before commit / after commit before ACK, followed by HTTP receipt reconciliation and continuation',async t=>{
  for(const stage of ['before_commit','after_commit_before_ack']) {
    const h=await boot();let resumed;
    try {
      const {session,p,obligations}=await prepare(h);
      const payload={request_id:'crash-request',candidate_id:p.candidates[0].id,base_version:0,action:'accept',reason:'Synthetic review'};
      await h.runtime.close();
      const child=spawnSync(process.env.WORK_AGENT_PYTHON ?? 'python3',[fileURLToPath(new URL('./fixtures/work-core/decision-crash.py',import.meta.url)),path.join(h.dataDir,'extensions/evidence-memo/state.db'),stage,JSON.stringify({...payload,matter_id:p.matter.id})],{encoding:'utf8',timeout:10000});
      assert.equal(child.signal,'SIGKILL',child.stderr);
      assert.match(child.stdout,new RegExp('BARRIER '+stage));
      resumed=await reopen(h.dataDir);
      const receipt=(await resumed.api('GET',`/sessions/${session.id}/work-query?kind=request&requestId=crash-request`)).json.result;
      const before=(await resumed.api('GET',`/sessions/${session.id}/surface`)).json.projection;
      assert.equal(receipt!==null,stage==='after_commit_before_ack');
      assert.equal(before.artifact!==null,stage==='after_commit_before_ack');
      const action={extensionId:'evidence-memo',generation:0,action:'decide',payload};
      assert.equal((await resumed.api('POST',`/sessions/${session.id}/actions`,action)).status,200);
      assert.equal((await resumed.api('POST',`/sessions/${session.id}/actions`,action)).status,200);
      const after=(await resumed.api('GET',`/sessions/${session.id}/surface`)).json.projection;
      assert.equal(after.artifact.content,'Synthetic artifact');assert.equal(after.decisions.length,1);
      assert.deepEqual(after.matter.obligations,obligations);
      const session2=(await resumed.api('POST','/sessions',{projectId:h.projectId,title:'Resumed'})).json.session;
      assert.equal((await resumed.api('POST',`/sessions/${session2.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:p.matter.id}})).status,200);
      const revised=await resumed.api('POST',`/sessions/${session2.id}/actions`,{extensionId:'evidence-memo',generation:0,action:'revise_candidate',payload:{candidate_id:p.candidates[0].id,new_candidate_id:'continued',base_version:1,proposal:{artifact_text:'Continued after recovery',evidence:p.candidates[0].evidence,obligations}}});
      assert.equal(revised.status,200);
      const next=await resumed.api('POST',`/sessions/${session2.id}/actions`,{...action,payload:{...payload,request_id:'continue-accept',candidate_id:'continued',base_version:1}});
      assert.equal(next.status,200);
      assert.equal(next.json.projection.artifact.content,'Continued after recovery');
      assert.equal(next.json.projection.decisions.length,2);
      t.diagnostic(JSON.stringify({stage,signal:child.signal,receiptBeforeRetry:receipt,artifactBeforeRetry:before.artifact,afterRetry:after.artifact,obligations:after.matter.obligations,continued:next.json.projection.artifact}));
    } finally {await resumed?.runtime.close();await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
  }
});
test('HTTP stale source refusal, producer unload/read-only/reload and legal revised completion',async()=>{
  const h=await boot();
  try {
    const {session,p,obligations}=await prepare(h);
    const s={...p.sources[0],version:2,text:'Updated dated source'};s.digest=createHash('sha256').update(s.text).digest('hex');
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'evidence-memo',generation:0,action:'replace_sources',payload:{sources:[s],revision:2}})).status,200);
    const old={extensionId:'evidence-memo',generation:0,action:'decide',payload:{request_id:'stale',candidate_id:p.candidates[0].id,base_version:0,action:'accept',reason:'review'}};
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,old)).json.error.code,'STALE_INPUT');
    const unloaded=await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'unload'});
    const readOnly=(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
    assert.equal(readOnly.readOnly,true);assert.deepEqual(readOnly.humanActions,[]);
    assert.equal((await h.api('POST',`/sessions/${session.id}/actions`,{...old,generation:unloaded.json.extension.generation})).status,409);
    const historical=(await h.api('GET',`/sessions/${session.id}/work-query?kind=source&candidateId=${p.candidates[0].id}&sourceId=${s.id}&version=1`)).json.source;
    assert.equal(historical.text,p.sources[0].text);
    const loaded=await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'reload'});
    assert.equal(loaded.status,200);
    const generation=loaded.json.extension.generation;
    const revision=await h.api('POST',`/sessions/${session.id}/actions`,{extensionId:'evidence-memo',generation,action:'revise_candidate',payload:{candidate_id:p.candidates[0].id,new_candidate_id:'fresh',base_version:0,proposal:{artifact_text:'Updated memo',evidence:[{source_id:s.id,source_version:2,start:0,end:s.text.length,quote:s.text,digest:s.digest}],obligations}}});
    assert.equal(revision.status,200,JSON.stringify(revision.json));
    const accepted=await h.api('POST',`/sessions/${session.id}/actions`,{...old,generation,payload:{...old.payload,request_id:'fresh-accept',candidate_id:'fresh'}});
    assert.equal(accepted.status,200);assert.equal(accepted.json.projection.artifact.content,'Updated memo');
    assert.deepEqual(accepted.json.projection.matter.obligations,obligations);
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
