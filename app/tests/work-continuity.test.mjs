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
  assert.equal((await h.api('DELETE',`/sessions/${a.id}`)).status,200);
  assert.equal((await h.api('GET',`/sessions/${a.id}`)).status,404);
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

test('provider provenance is host-derived and preserves prior simulation records (real-route protocol uses loopback fixture)',async()=>{
 const h=await boot();
 try {
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const s=await h.createSession();await h.api('POST',`/sessions/${s.id}/extension`,{extensionId:'evidence-memo',input:{title:'Provenance',sourceText:'Synthetic source'}});
  const first=await h.api('POST',`/sessions/${s.id}/runs`,{commandId:'simulation',input:'Read the current work'});await h.pollRun(first.json.run.id);
  await h.api('PUT','/provider-credential',{connectionId:'catalog-openai',apiKey:'synthetic-protocol-only'});
  const configured=await h.api('PUT','/provider-config',{provider:'openai',model:'gpt-4.1-mini',api:'openai-completions',baseUrl:h.runtime.fakeProvider.baseUrl});assert.equal(configured.status,200);
  const second=await h.api('POST',`/sessions/${s.id}/runs`,{commandId:'protocol-real-route',input:'Read the current work again'});assert.equal((await h.pollRun(second.json.run.id)).status,'completed');
  const p=(await h.api('GET',`/sessions/${s.id}/surface`)).json.projection;
  assert.deepEqual(p.runs.map(r=>r.providerConfig.executionMode),['simulation','real']);
  assert.equal(p.runs[1].provider,'openai');assert.equal(p.runs[1].providerConfig.credentialStatus,'configured');
  assert.equal(JSON.stringify(p.runs).includes('synthetic-protocol-only'),false);
  assert(p.runs[1].workContext.provenance.runtimeProfile.hash);
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('concurrent Session admission is serialized before either execution starts',async()=>{
 const h=await boot();
 try {
  const a=await h.createSession();const b=await h.createSession();
  const results=await Promise.all([a,b].map(s=>h.api('POST',`/sessions/${s.id}/runs`,{commandId:'race',input:'/fixture slow'})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  await h.pollRun(results.find(r=>r.status===200).json.run.id);
 } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
