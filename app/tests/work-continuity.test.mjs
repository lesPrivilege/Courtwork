import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
import {createRuntime} from '../server/runtime.mjs';

test('same Matter in new Session, project isolation, detach to chat, producer absent restart history',async()=>{
 const h=await boot();let absent;
 try {
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const a=await h.createSession();const b=await h.createSession();
  const binding=(await h.api('POST',`/sessions/${a.id}/extension`,{extensionId:'evidence-memo',input:{title:'Work',sourceText:'Continuity source'}})).json.session.extensionBinding.binding;
  const p=(await h.api('GET',`/sessions/${a.id}/surface`)).json.projection;
  const s=p.sources[0];
  const created=await h.api('POST',`/sessions/${a.id}/runs`,{commandId:'propose',input:h.scriptInput([{name:'se_submit_candidate',arguments:{artifact_text:'A memo',evidence:[{source_id:s.id,source_version:s.version,start:0,end:s.text.length,quote:s.text,digest:s.digest}],obligations:[]}}])});
  assert.equal((await h.pollRun(created.json.run.id)).status,'completed');
  const pending=(await h.api('GET',`/sessions/${a.id}/surface`)).json.projection;
  assert.equal(pending.runs[0].providerConfig.executionMode,'simulation');
  const decision={extensionId:'evidence-memo',generation:0,action:'decide',payload:{request_id:'human-1',candidate_id:pending.candidates[0].id,base_version:0,action:'accept',reason:'Reviewed'}};
  assert.equal((await h.api('POST',`/sessions/${a.id}/actions`,{...decision,actor:'local-user'})).status,400);
  const result=await h.api('POST',`/sessions/${a.id}/actions`,decision);assert.equal(result.status,200,JSON.stringify(result.json));
  const attach=await h.api('POST',`/sessions/${b.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:binding.matterId}});assert.equal(attach.status,200,JSON.stringify(attach.json));
  const otherProject=(await h.api('POST','/projects',{name:'Other'})).json.project;
  const outside=await h.createSession({projectId:otherProject.id});
  assert.equal((await h.api('POST',`/sessions/${outside.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:binding.matterId}})).status,409);
  assert.equal((await h.api('GET',`/projects/${h.projectId}/work`)).json.matters.length,1);
  assert.deepEqual((await h.api('GET',`/sessions/${b.id}/work-query?kind=request&requestId=human-1`)).json.result,result.json.result);
  assert.equal((await h.api('POST',`/sessions/${a.id}/extension`,{extensionId:'evidence-memo',input:{detach:true}})).status,200);
  const chat=await h.api('POST',`/sessions/${a.id}/runs`,{commandId:'chat',input:h.scriptInput([{name:'se_submit_candidate',arguments:{artifact_text:'Forged',evidence:[],obligations:[]}}])});
  await h.pollRun(chat.json.run.id);
  const events=(await h.api('GET',`/sessions/${a.id}/events`)).json.events;
  assert(events.some(e=>e.runId===chat.json.run.id && e.type==='tool.result' && e.data.isError));
  const before=(await h.api('GET',`/sessions/${b.id}/surface`)).json.projection;
  await h.runtime.close();
  absent=await createRuntime({dataDir:h.dataDir,extensionCatalog:{}});
  assert.equal(absent.registry.instances.size,0);
  const history=await absent.service.getSurface(b.id);
  assert.equal(history.extension,null);assert.equal(history.projection.readOnly,true);assert.deepEqual(history.projection.humanActions,[]);
  assert.deepEqual(history.projection.artifact,before.artifact);assert.deepEqual(history.projection.decisions,before.decisions);
  assert.equal((await absent.service.queryWork(b.id,new URLSearchParams({kind:'source',candidateId:pending.candidates[0].id,sourceId:s.id,version:'1'}))).source.text,s.text);
  await assert.rejects(absent.service.humanAction(b.id,decision),{code:'generation_mismatch'});
 } finally {await absent?.close();await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
